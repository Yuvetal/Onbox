const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/kumar/.gemini/antigravity-ide/brain/bc190a2a-bbf3-45a4-b46c-0358ae70edcc';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function capture() {
  console.log('🚀 Launching Edge with Puppeteer Core...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // 1. Capture Login Page
  console.log('📸 1. Capturing Login Page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  // Ensure we are logged out to show Login Page
  await page.evaluate(() => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'login_page.png') });

  // 2. Perform Dev Login to enter Dashboard
  console.log('🔑 Performing login to enter Dashboard...');
  await page.click('button:has-text("Instant Dev Session (Local Mode)")');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // 2b. Capture Dashboard Scheduled Tab
  console.log('📸 2. Capturing Dashboard (Scheduled Tab)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_scheduled.png') });

  // 3. Navigate to Sent Tab & capture
  console.log('📸 3. Capturing Dashboard (Sent Tab)...');
  const sentNavBtn = await page.$('button:has-text("Sent")');
  if (sentNavBtn) await sentNavBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_sent.png') });

  // 4. Open Compose View
  console.log('📸 4. Navigating to Compose View & opening Send Later popover...');
  const composeBtn = await page.$('button:has-text("Compose")');
  if (composeBtn) await composeBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // Type recipients, subject, body
  await page.type('input[placeholder*="recipient email"]', 'candidate@example.com');
  await page.keyboard.press('Enter');
  await page.type('input[placeholder="Subject"]', 'Stage 4 Comprehensive Verification');
  await page.type('textarea', 'This is a live end-to-end verification campaign test for Stage 4.');

  // Click Clock icon to open Send Later popover
  const clockBtn = await page.$('button[title*="Schedule time"]');
  if (clockBtn) await clockBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'compose_send_later.png') });

  // 5. Test CSV List Upload & Overflow chip in Compose
  console.log('📸 5. Capturing CSV Recipient Chip Overflow...');
  // Create a temporary CSV file with multiple emails
  const tempCsvPath = path.join(__dirname, 'test_recipients.csv');
  fs.writeFileSync(
    tempCsvPath,
    'email\nalice@company.com\nbob@company.com\ncharlie@company.com\ndavid@company.com\neve@company.com\nfrank@company.com\ngrace@company.com\n'
  );

  const fileInput = await page.$('input[accept=".csv,.txt"]');
  if (fileInput) {
    await fileInput.uploadFile(tempCsvPath);
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'csv_overflow.png') });

  // 6. Navigate back to list and open Email Detail View
  console.log('📸 6. Opening Email Detail View...');
  const backBtn = await page.$('button:has-text("Compose New Email")');
  if (backBtn) await backBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // Click first email row
  const firstRow = await page.$('div.group.px-6.py-4');
  if (firstRow) await firstRow.click();
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'email_detail.png') });

  console.log('✅ All screenshots captured successfully in artifacts directory!');
  await browser.close();
  process.exit(0);
}

capture().catch((err) => {
  console.error('❌ Screenshot capture failed:', err);
  process.exit(1);
});
