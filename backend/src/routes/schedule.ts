import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { emailQueue } from '../queue/emailQueue';
import { indexEmailDocument } from '../services/elasticsearch';

const router = Router();

/**
 * POST /api/schedule
 * Schedules batch email sends with deterministic BullMQ job IDs for strict idempotency.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      body,
      recipients, // array of strings or comma-separated string
      senderId,
      senderEmail,
      startTime,
      delayBetweenEmails = 0, // seconds
      hourlyLimit = 0,
    } = req.body;

    if (!subject || !body || !recipients) {
      return res.status(400).json({ error: 'subject, body, and recipients are required' });
    }

    // Process recipient list (support array or comma/newline separated string)
    let recipientList: string[] = [];
    if (Array.isArray(recipients)) {
      recipientList = recipients.map((r) => r.trim()).filter((r) => r.length > 0);
    } else if (typeof recipients === 'string') {
      recipientList = recipients
        .split(/[\n,]+/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    }

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one valid recipient email is required' });
    }

    // Resolve or find User and Sender
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'demo@onb.com',
          name: 'Demo User',
        },
      });
    }

    let targetSenderId = senderId;
    if (!targetSenderId) {
      const emailToUse = senderEmail || 'sender@onb.com';
      let sender = await prisma.sender.findUnique({
        where: {
          userId_email: {
            userId: user.id,
            email: emailToUse,
          },
        },
      });

      if (!sender) {
        sender = await prisma.sender.create({
          data: {
            userId: user.id,
            email: emailToUse,
          },
        });
      }
      targetSenderId = sender.id;
    }

    const baseStartTime = startTime ? new Date(startTime).getTime() : Date.now();
    const createdEmails: any[] = [];

    // Schedule each email row and enqueue BullMQ job
    for (let i = 0; i < recipientList.length; i++) {
      const recipientEmail = recipientList[i];
      // Calculate stagger time based on delayBetweenEmails (seconds)
      const scheduledTimeMs = baseStartTime + i * delayBetweenEmails * 1000;
      const scheduledAt = new Date(scheduledTimeMs);
      const delayMs = Math.max(0, scheduledTimeMs - Date.now());

      // 1. Create DB row in MySQL
      const emailRecord = await prisma.email.create({
        data: {
          userId: user.id,
          senderId: targetSenderId,
          recipientEmail,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt,
          delayBetweenEmails,
          hourlyLimit,
        },
        include: {
          sender: true,
        },
      });

      const jobId = `email-${emailRecord.id}`;

      // Update bullJobId on Email model
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { bullJobId: jobId },
      });

      // 2. Enqueue deterministic BullMQ job
      await emailQueue.add(
        'send-email',
        { emailId: emailRecord.id },
        {
          jobId,
          delay: delayMs,
        }
      );

      // 3. Index synchronously in Elasticsearch
      await indexEmailDocument({
        id: emailRecord.id,
        userId: emailRecord.userId,
        senderId: emailRecord.senderId,
        senderEmail: emailRecord.sender.email,
        recipientEmail: emailRecord.recipientEmail,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: emailRecord.status,
        scheduledAt: emailRecord.scheduledAt,
        rescheduleCount: 0,
        createdAt: emailRecord.createdAt,
      });

      createdEmails.push(emailRecord);
    }

    res.status(201).json({
      message: `Successfully scheduled ${createdEmails.length} email(s).`,
      count: createdEmails.length,
      emails: createdEmails,
    });
  } catch (err: any) {
    console.error('❌ Error scheduling emails:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
