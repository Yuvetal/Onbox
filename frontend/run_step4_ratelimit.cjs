const puppeteer = require('puppeteer-core');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DOCS_SCREENSHOTS = path.join(__dirname, '..', 'docs', 'screenshots');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function runStep4() {
  console.log('🚀 Step 4: Executing Rate Limit + Slack Alert Test...');

  // 1. Find user kumarajithlogu@gmail.com
  const user = await prisma.user.findUnique({ where: { email: 'kumarajithlogu@gmail.com' } });
  if (!user) throw new Error('User not found');

  // 2. Create fresh sender for rate limit testing
  const senderEmail = `ratelimit-stage5-${Date.now()}@onb.com`;
  const sender = await prisma.sender.create({
    data: { userId: user.id, email: senderEmail },
  });

  console.log(`Created test sender: ${senderEmail}`);

  // 3. Post 3 emails simultaneously via API with hourlyLimit = 2
  const schedulePayload = {
    subject: 'Stage 5 Rate Limit Over-Quota Test',
    body: 'Testing atomic Redis rate limiter and BullMQ moveToDelayed reschedule.',
    recipients: ['rl_target1@example.com', 'rl_target2@example.com', 'rl_target3@example.com'],
    senderId: sender.id,
    senderEmail: sender.email,
    startTime: new Date().toISOString(),
    delayBetweenEmails: 0,
    hourlyLimit: 2,
  };

  const response = await fetch('http://localhost:5000/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schedulePayload),
  });

  const resJson = await response.json();
  console.log('Schedule Response:', JSON.stringify(resJson, null, 2));

  // Wait 3 seconds for worker to process first 2 and reschedule 3rd
  await new Promise((r) => setTimeout(r, 3500));

  // Inspect database for rescheduled email
  const rescheduledEmail = await prisma.email.findFirst({
    where: { senderId: sender.id, rescheduleCount: { gt: 0 } },
  });

  console.log('DB Rescheduled Record:', JSON.stringify(rescheduledEmail, null, 2));

  // Launch browser to capture Bull Board dashboard showing delayed job
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  console.log('📸 Capturing Bull Board Dashboard (06_bull_board_delayed.png)...');
  await page.goto('http://localhost:5000/admin/queues', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '06_bull_board_delayed.png') });

  await browser.close();
  await prisma.$disconnect();
  console.log('✅ Step 4 execution complete!');
  process.exit(0);
}

runStep4().catch((err) => {
  console.error('❌ Step 4 failed:', err);
  process.exit(1);
});
