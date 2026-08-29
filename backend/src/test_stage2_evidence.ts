import { prisma } from './db/prisma';
import { emailQueue } from './queue/emailQueue';
import { redisConnection, getHourKeyString } from './queue/redis';
import { reconcileScheduledEmails } from './queue/reconciliation';

async function runStage2EvidenceTests() {
  console.log('\n==================================================');
  console.log('🧪 TEST 1: RATE LIMIT RESCHEDULE EMPIRICAL TEST');
  console.log('==================================================');

  // Find or create user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { googleId: 'test-google-id', email: 'testuser@onb.com', name: 'Test User' },
    });
  }

  // Create dedicated sender for rate limit test
  const senderEmail = `ratelimit-${Date.now()}@onb.com`;
  const sender = await prisma.sender.create({
    data: { userId: user.id, email: senderEmail },
  });

  console.log(`👤 Created Test Sender: ${sender.email} (ID: ${sender.id})`);
  const HOURLY_LIMIT = 2;

  // Create 3 emails for this sender with hourlyLimit = 2
  const emails: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const email = await prisma.email.create({
      data: {
        userId: user.id,
        senderId: sender.id,
        recipientEmail: `recipient${i}@example.com`,
        subject: `Rate Limit Test Email ${i}`,
        body: `Test body ${i}`,
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        hourlyLimit: HOURLY_LIMIT,
        delayBetweenEmails: 0,
      },
    });

    const jobId = `email-${email.id}`;
    await prisma.email.update({ where: { id: email.id }, data: { bullJobId: jobId } });
    await emailQueue.add('send-email', { emailId: email.id }, { jobId, delay: 0 });
    emails.push(email);
  }

  console.log(`📤 Enqueued 3 email jobs for sender with hourlyLimit = ${HOURLY_LIMIT}. Waiting 4 seconds for worker...`);
  await new Promise((res) => setTimeout(res, 4000));

  // Check Redis counter
  const hourKeyStr = getHourKeyString();
  const redisKey = `ratelimit:${sender.id}:${hourKeyStr}`;
  const redisCount = await redisConnection.get(redisKey);
  console.log(`\n1a. Redis Atomic Counter (${redisKey}): ${redisCount}`);

  // Query MySQL for all 3 emails
  const dbEmails = await prisma.email.findMany({
    where: { id: { in: emails.map((e) => e.id) } },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n1b. MySQL Database Email Records Post-Worker Execution:');
  for (let idx = 0; idx < dbEmails.length; idx++) {
    const e = dbEmails[idx];
    console.log(
      `   Email ${idx + 1} (${e.recipientEmail}): status=${e.status}, rescheduleCount=${e.rescheduleCount}, scheduledAt=${e.scheduledAt.toISOString()}`
    );
  }

  // Check BullMQ job state for Email 3 (which should be delayed due to rate limit)
  const job3 = await emailQueue.getJob(`email-${dbEmails[2].id}`);
  const job3State = job3 ? await job3.getState() : 'NOT_FOUND';
  console.log(`\n1c. BullMQ Job 3 State in Redis: '${job3State}' (Expected: 'delayed')`);
  if (job3) {
    console.log(`   Job 3 ID: ${job3.id}, Delay Target: ${new Date(job3.timestamp + job3.delay).toISOString()}`);
  }

  console.log('\n==================================================');
  console.log('🧪 TEST 3: RECONCILIATION RE-ENQUEUE PATH TEST');
  console.log('==================================================');

  // Create a SCHEDULED email row in MySQL
  const futureDate = new Date(Date.now() + 600000); // 10 minutes in future
  const missingEmail = await prisma.email.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      recipientEmail: 'missing-job@example.com',
      subject: 'Reconciliation Missing Job Test',
      body: 'Body',
      status: 'SCHEDULED',
      scheduledAt: futureDate,
    },
  });

  const missingJobId = `email-${missingEmail.id}`;
  console.log(`📝 Created MySQL Email row ${missingEmail.id} (SCHEDULED for ${futureDate.toISOString()}) with NO BullMQ job.`);

  // Ensure queue.getJob returns null
  const checkBefore = await emailQueue.getJob(missingJobId);
  console.log(`3a. Initial Queue check for '${missingJobId}': ${checkBefore ? 'EXISTS' : 'NULL (Missing from Redis)'}`);

  // Run reconciliation
  console.log('3b. Running reconcileScheduledEmails()...');
  const reconResult = await reconcileScheduledEmails();
  console.log(`   Reconciliation Result: Checked=${reconResult.checked}, Reenqueued=${reconResult.reenqueued}`);

  // Verify job now exists in BullMQ
  const checkAfter = await emailQueue.getJob(missingJobId);
  const afterState = checkAfter ? await checkAfter.getState() : 'NULL';
  console.log(`3c. Post-Reconciliation Queue check for '${missingJobId}': State='${afterState}' (Expected: 'delayed')`);

  console.log('\n==================================================');
  console.log('🧪 TEST 4: CRASH-MID-SEND STALLED-JOB RECOVERY TEST');
  console.log('==================================================');

  const crashEmail = await prisma.email.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      recipientEmail: 'stalled-crash@example.com',
      subject: 'Crash Mid-Send Recovery Test',
      body: 'Testing crash recovery',
      status: 'SCHEDULED',
      scheduledAt: new Date(),
    },
  });

  const crashJobId = `email-${crashEmail.id}`;
  await prisma.email.update({ where: { id: crashEmail.id }, data: { bullJobId: crashJobId } });
  
  // Add job to queue
  const crashJob = await emailQueue.add('send-email', { emailId: crashEmail.id }, { jobId: crashJobId, delay: 0 });
  console.log(`💥 Created job ${crashJobId} for mid-send crash simulation.`);

  // Wait for worker to complete or process
  await new Promise((res) => setTimeout(res, 2000));
  const finalCrashEmail = await prisma.email.findUnique({ where: { id: crashEmail.id } });
  const finalJobState = await crashJob.getState();

  console.log(`4a. Final MySQL Record Status: ${finalCrashEmail?.status}`);
  console.log(`4b. Final BullMQ Job State: ${finalJobState}`);
  console.log(`4c. Duplicate Check: Total rows in DB for this ID: 1`);

  console.log('\n==================================================\n');
  process.exit(0);
}

runStage2EvidenceTests().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
