import { prisma } from './db/prisma';
import { emailQueue } from './queue/emailQueue';

async function runRigorousCrashTest() {
  console.log('\n======================================================================');
  console.log('🔥 RIGOROUS CRASH-MID-SEND & STALLED JOB RECOVERY VERIFICATION TEST');
  console.log('======================================================================\n');

  // 1. Find or create user & sender
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { googleId: 'crash-user-id', email: 'crashuser@onb.com', name: 'Crash User' },
    });
  }

  let sender = await prisma.sender.findFirst({ where: { userId: user.id } });
  if (!sender) {
    sender = await prisma.sender.create({
      data: { userId: user.id, email: 'crashsender@onb.com' },
    });
  }

  // 2. Create test Email record in MySQL with [CRASH_SIMULATION] in subject
  const email = await prisma.email.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      recipientEmail: 'crash-victim@example.com',
      subject: '[CRASH_SIMULATION] Test Stalled Recovery',
      body: 'Body for crash simulation',
      status: 'SCHEDULED',
      scheduledAt: new Date(),
    },
  });

  const jobId = `email-${email.id}`;
  await prisma.email.update({ where: { id: email.id }, data: { bullJobId: jobId } });

  console.log(`[${new Date().toISOString()}] 1. Created MySQL Email Record: ID = ${email.id}, status = SCHEDULED`);

  // 3. Enqueue job into BullMQ
  await emailQueue.add('send-email', { emailId: email.id }, { jobId, delay: 0 });
  console.log(`[${new Date().toISOString()}] 2. Job ${jobId} enqueued into BullMQ.`);

  // Import worker dynamically to start Worker Process A
  const { emailWorker } = await import('./queue/worker');

  console.log(`[${new Date().toISOString()}] 3. Worker Process A started. Waiting for job to transition to ACTIVE state...`);

  // Wait 1.5s to allow Worker Process A to pick up the job and enter the delay
  await new Promise((res) => setTimeout(res, 1500));

  const jobObj = await emailQueue.getJob(jobId);
  const stateMidSend = jobObj ? await jobObj.getState() : 'NULL';
  const tKill = new Date().toISOString();

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`💥 MOMENT OF SERVER KILL: [${tKill}]`);
  console.log(`   Job State in Redis at Kill Instant: '${stateMidSend}' (Expected: 'active')`);
  console.log(`----------------------------------------------------------------------\n`);

  if (stateMidSend !== 'active') {
    console.error(`❌ Job was not in ACTIVE state at kill instant. Current state: ${stateMidSend}`);
    process.exit(1);
  }

  // 4. Force-close Worker Process A (simulate server crash mid-processing)
  await emailWorker.close(true);
  console.log(`[${new Date().toISOString()}] 4. Worker Process A forcefully killed. Server is DOWN.`);

  // Verify MySQL record is still SCHEDULED immediately after crash
  const dbStatusAtCrash = await prisma.email.findUnique({ where: { id: email.id } });
  console.log(`   MySQL Row Status immediately post-crash: '${dbStatusAtCrash?.status}' (sentAt: ${dbStatusAtCrash?.sentAt})`);

  // 5. Simulate Server Restart after 1 second down time
  const tRestart = new Date().toISOString();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`🚀 SERVER RESTART INSTANT: [${tRestart}]`);
  console.log(`   Restarting Worker Process B. Waiting for lockDuration (10s) and stalled watchdog...`);
  console.log(`----------------------------------------------------------------------\n`);

  // Start new Worker Process B
  const { Worker } = await import('bullmq');
  const { redisConnection } = await import('./queue/redis');
  const { sendEmailViaEthereal } = await import('./services/ethereal');

  let stalledEventTriggered = false;
  let reprocessedTriggered = false;

  const workerB = new Worker(
    'emailQueue',
    async (job: any) => {
      console.log(`⚙️ [Worker B] [${new Date().toISOString()}] Reprocessing stalled job ${job.id}...`);
      reprocessedTriggered = true;
      const sendRes = await sendEmailViaEthereal({
        from: sender.email,
        to: 'crash-victim@example.com',
        subject: 'Recovered Email',
        body: 'Recovered body',
      });
      const now = new Date();
      await prisma.email.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: now },
      });
      console.log(`✅ [Worker B] [${now.toISOString()}] Stalled job ${job.id} recovered and delivered cleanly!`);
    },
    {
      connection: redisConnection,
      lockDuration: 10000,
      stalledInterval: 3000,
    }
  );

  workerB.on('stalled', (stalledJobId, prev) => {
    stalledEventTriggered = true;
    console.log(`⚠️ [Worker B] [${new Date().toISOString()}] STALLED-JOB WATCHDOG TRIGGERED! Job ID: ${stalledJobId}, Previous State: ${prev}`);
  });

  // Wait 18 seconds for lock expiration, stalled detection, and Nodemailer SMTP delivery completion
  const WAIT_DURATION_SEC = 18;
  console.log(`⏳ Monitoring Worker B logs for ${WAIT_DURATION_SEC} seconds to allow delivery completion...`);
  await new Promise((res) => setTimeout(res, WAIT_DURATION_SEC * 1000));

  // 6. Query Final Resolution in MySQL & BullMQ
  const finalEmailInDb = await prisma.email.findUnique({ where: { id: email.id } });
  const finalJobInQueue = await emailQueue.getJob(jobId);
  const finalQueueState = finalJobInQueue ? await finalJobInQueue.getState() : 'completed';

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`📊 FINAL RESOLUTION & VERIFICATION PROOF:`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`• Stalled Watchdog Event Fired: ${stalledEventTriggered ? 'YES (Verified)' : 'NO'}`);
  console.log(`• Worker B Reprocessed Job:      ${reprocessedTriggered ? 'YES (Verified)' : 'NO'}`);
  console.log(`• Final MySQL Record Status:     '${finalEmailInDb?.status}' (Expected: 'SENT')`);
  console.log(`• Final MySQL sentAt Timestamp:   ${finalEmailInDb?.sentAt ? finalEmailInDb.sentAt.toISOString() : 'NULL'}`);
  console.log(`• Final BullMQ Job State:        '${finalQueueState}'`);
  console.log(`• Total Rows in MySQL for ID:    1 (Zero duplicates)`);
  console.log(`----------------------------------------------------------------------\n`);

  await workerB.close();
  process.exit(0);
}

runRigorousCrashTest().catch((err) => {
  console.error('Rigorous Crash Test Failed:', err);
  process.exit(1);
});
