import { Worker, Job, DelayedError } from 'bullmq';
import { redisConnection, checkAndIncrementSenderHourlyRateLimit } from './redis';
import { EmailJobData } from './emailQueue';
import { prisma } from '../db/prisma';
import { sendEmailViaEthereal } from '../services/ethereal';
import { notifySlackRateLimit } from '../services/slack';
import { indexEmailDocument } from '../services/elasticsearch';
import { env } from '../config/env';

/**
 * BullMQ Worker instance handling email delivery jobs with rate-limiting,
 * throttling delay, atomic rescheduling, and status updates.
 */
export const emailWorker = new Worker<EmailJobData>(
  'emailQueue',
  async (job: Job<EmailJobData>, token?: string) => {
    const { emailId } = job.data;
    console.log(`⚙️ [Worker] [${new Date().toISOString()}] Processing email job ${job.id} for email ID: ${emailId}`);

    // Fetch Email record with User and Sender relations from MySQL
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: {
        user: true,
        sender: true,
      },
    });

    if (!email) {
      console.warn(`⚠️ [Worker] Email record ${emailId} not found in database. Aborting job.`);
      return;
    }

    if (email.status === 'SENT') {
      console.log(`ℹ️ [Worker] Email ${emailId} is already SENT. Skipping.`);
      return;
    }

    // Atomic Redis rate limit check for the sender
    const rateLimitCheck = await checkAndIncrementSenderHourlyRateLimit(
      email.senderId,
      email.hourlyLimit
    );

    if (!rateLimitCheck.allowed) {
      console.warn(
        `🚨 [Worker] Rate limit exceeded for sender ${email.sender.email} (${rateLimitCheck.currentCount} emails sent this hour).`
      );

      const nextHourDate = new Date(rateLimitCheck.nextHourTimestamp);

      // Move job to delayed state in Redis using acquired lock token
      await job.moveToDelayed(rateLimitCheck.nextHourTimestamp, token!);

      // Update database status & audit trail
      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: {
          scheduledAt: nextHourDate,
          rescheduleCount: { increment: 1 },
          status: 'SCHEDULED',
        },
      });

      // Post Slack alert if user connected Slack
      await notifySlackRateLimit(email.user.slackAccessToken, {
        senderEmail: email.sender.email,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        hourlyLimit: email.hourlyLimit > 0 ? email.hourlyLimit : env.maxEmailsPerHour,
        rescheduledTo: nextHourDate,
      });

      // Index updated state in Elasticsearch
      await indexEmailDocument({
        id: updatedEmail.id,
        userId: updatedEmail.userId,
        senderId: updatedEmail.senderId,
        senderEmail: email.sender.email,
        recipientEmail: updatedEmail.recipientEmail,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: updatedEmail.status,
        scheduledAt: updatedEmail.scheduledAt,
        rescheduleCount: updatedEmail.rescheduleCount,
        createdAt: updatedEmail.createdAt,
      });

      console.log(
        `⏳ [Worker] Job ${job.id} rescheduled to ${nextHourDate.toISOString()} via moveToDelayed + DelayedError.`
      );

      // MUST throw DelayedError to halt BullMQ normal completion handling
      throw new DelayedError();
    }

    // Artificial test hook for crash simulation if email subject contains '[CRASH_SIMULATION]'
    if (email.subject.includes('[CRASH_SIMULATION]')) {
      console.log(`⏸️ [Worker] [${new Date().toISOString()}] Entering artificial 8-second delay for crash simulation on ${job.id}...`);
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }

    // Minimum inter-email delay throttling if configured
    if (email.delayBetweenEmails > 0 || env.minEmailDelay > 0) {
      const delayMs = Math.max(email.delayBetweenEmails, env.minEmailDelay) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      // Deliver email via Nodemailer / Ethereal SMTP
      const sendResult = await sendEmailViaEthereal({
        from: email.sender.email,
        to: email.recipientEmail,
        subject: email.subject,
        body: email.body,
      });

      const now = new Date();

      // Update Email record in MySQL to SENT
      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: now,
        },
      });

      // Synchronously index status change in Elasticsearch
      await indexEmailDocument({
        id: updatedEmail.id,
        userId: updatedEmail.userId,
        senderId: updatedEmail.senderId,
        senderEmail: email.sender.email,
        recipientEmail: updatedEmail.recipientEmail,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: updatedEmail.status,
        scheduledAt: updatedEmail.scheduledAt,
        sentAt: updatedEmail.sentAt,
        rescheduleCount: updatedEmail.rescheduleCount,
        createdAt: updatedEmail.createdAt,
      });

      console.log(`✅ [Worker] [${now.toISOString()}] Email ${email.id} delivered successfully! Ethereal URL: ${sendResult.previewUrl}`);
    } catch (sendErr: any) {
      console.error(`❌ [Worker] Email delivery failed for ${email.id}: ${sendErr.message}`);

      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          failedReason: sendErr.message,
        },
      });

      await indexEmailDocument({
        id: updatedEmail.id,
        userId: updatedEmail.userId,
        senderId: updatedEmail.senderId,
        senderEmail: email.sender.email,
        recipientEmail: updatedEmail.recipientEmail,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: updatedEmail.status,
        scheduledAt: updatedEmail.scheduledAt,
        rescheduleCount: updatedEmail.rescheduleCount,
        createdAt: updatedEmail.createdAt,
      });

      throw sendErr; // Let BullMQ log failed attempt
    }
  },
  {
    connection: redisConnection,
    concurrency: env.workerConcurrency,
    lockDuration: 10000, // 10s lock duration for fast, predictable stalled-job detection in dev/test
    stalledInterval: 3000, // Check for stalled jobs every 3 seconds
  }
);

emailWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] [${new Date().toISOString()}] Job ${job.id} completed.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] [${new Date().toISOString()}] Job ${job?.id} failed: ${err.message}`);
});

emailWorker.on('stalled', (jobId, prev) => {
  console.log(`⚠️ [Worker] [${new Date().toISOString()}] Stalled job detected! Job ID: ${jobId}, previous state: ${prev}`);
});
