import { prisma } from '../db/prisma';
import { emailQueue } from './emailQueue';

/**
 * Startup Reconciliation Routine:
 * Scans MySQL for all 'SCHEDULED' email records and ensures they exist in BullMQ.
 * 
 * Rule: Only re-enqueue if `emailQueue.getJob('email-' + email.id)` returns NULL.
 * If the job exists in BullMQ in ANY state (active, delayed, waiting, or stalled),
 * we skip re-enqueueing to allow BullMQ's native stalled-job watchdog to recover it,
 * preventing duplicate sends and race conditions across server restarts.
 */
export async function reconcileScheduledEmails(): Promise<{ checked: number; reenqueued: number }> {
  console.log('🔄 [Reconciliation] Starting startup reconciliation scan for SCHEDULED emails...');

  const scheduledEmails = await prisma.email.findMany({
    where: { status: 'SCHEDULED' },
  });

  let reenqueuedCount = 0;

  for (const email of scheduledEmails) {
    const jobId = `email-${email.id}`;

    // Check if job exists in BullMQ across active, delayed, waiting, or stalled states
    const existingJob = await emailQueue.getJob(jobId);

    if (!existingJob) {
      const now = Date.now();
      const scheduledTime = new Date(email.scheduledAt).getTime();
      const delay = Math.max(0, scheduledTime - now);

      await emailQueue.add(
        'send-email',
        { emailId: email.id },
        {
          jobId,
          delay,
        }
      );

      reenqueuedCount++;
      console.log(`➕ [Reconciliation] Re-enqueued missing job ${jobId} with delay ${delay}ms`);
    } else {
      console.log(`✓ [Reconciliation] Job ${jobId} already exists in BullMQ (state: ${await existingJob.getState()}). Skipping.`);
    }
  }

  console.log(
    `✅ [Reconciliation] Scan complete. Checked: ${scheduledEmails.length}, Re-enqueued: ${reenqueuedCount}`
  );

  return {
    checked: scheduledEmails.length,
    reenqueued: reenqueuedCount,
  };
}
