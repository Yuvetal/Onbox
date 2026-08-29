const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSlackRateLimitTest() {
  console.log('🚀 Running Live Rate Limit + Slack Notification Test...');

  // 1. Find user with Slack token
  const user = await prisma.user.findUnique({ where: { email: 'kumarajithlogu@gmail.com' } });
  if (!user || !user.slackAccessToken) {
    throw new Error('User with valid slackAccessToken not found in database.');
  }

  console.log(`👤 User: ${user.name} (${user.email}), Slack Team: ${user.slackTeamId}`);

  // 2. Create fresh sender for this live test run
  const senderEmail = `slack-test-${Date.now()}@onb.com`;
  const sender = await prisma.sender.create({
    data: { userId: user.id, email: senderEmail },
  });
  console.log(`📧 Test Sender Created: ${senderEmail}`);

  // 3. Post 3 emails simultaneously with hourlyLimit = 2
  const payload = {
    subject: '🚨 Live Rate Limit Breach Test Alert',
    body: 'This is a live test verifying that exceeding the sender hourly limit triggers BullMQ moveToDelayed and posts a real Slack alert to #all-yuve39s-space.',
    recipients: [
      'slack_target1@example.com',
      'slack_target2@example.com',
      'slack_target3@example.com',
    ],
    senderId: sender.id,
    senderEmail: sender.email,
    startTime: new Date().toISOString(),
    delayBetweenEmails: 0,
    hourlyLimit: 2,
  };

  console.log('📤 Submitting 3 emails with hourlyLimit = 2 to /api/schedule...');
  const res = await fetch('http://localhost:5000/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const resJson = await res.json();
  console.log('Schedule Response:', JSON.stringify(resJson, null, 2));

  // 4. Wait 4.5 seconds for worker to process emails and post Slack alert
  console.log('⏳ Waiting 4.5s for worker processing and Slack alert delivery...');
  await new Promise((r) => setTimeout(r, 4500));

  // 5. Inspect database for rescheduled email
  const rescheduledEmail = await prisma.email.findFirst({
    where: { senderId: sender.id, rescheduleCount: { gt: 0 } },
  });

  console.log('\n📊 DATABASE RESCHEDULED RECORD:');
  console.log(JSON.stringify(rescheduledEmail, null, 2));

  await prisma.$disconnect();
  console.log('\n✅ Test complete. Check worker logs and Slack channel #all-yuve39s-space for the alert.');
  process.exit(0);
}

runSlackRateLimitTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
