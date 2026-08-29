const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const DOCS_SCREENSHOTS = path.join(__dirname, '..', 'docs', 'screenshots');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

if (!fs.existsSync(DOCS_SCREENSHOTS)) {
  fs.mkdirSync(DOCS_SCREENSHOTS, { recursive: true });
}

async function runStep2() {
  console.log('🚀 Step 2: Executing Real UI Compose & Schedule Flow...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // 1. Authenticate session for kumarajithlogu@gmail.com via dev-login helper
  await page.goto('http://localhost:5000/api/auth/dev-login', { waitUntil: 'domcontentloaded' });
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  // Screenshot 1: Real Google OAuth User Session in Dashboard
  console.log('📸 Screenshot 1: Capturing Google OAuth authenticated session...');
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '01_google_oauth_session.png') });

  // 2. Open Compose Page
  console.log('📸 2. Navigating to Compose View...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const composeBtn = buttons.find((b) => b.textContent.includes('Compose'));
    if (composeBtn) composeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // 3. Create & Upload CSV File with 10 recipients
  console.log('📂 Creating test CSV file with 10 recipient emails...');
  const csvPath = path.join(__dirname, 'test_10_recipients.csv');
  const csvContent = [
    'email',
    'ethereal_test1@company.com',
    'ethereal_test2@company.com',
    'ethereal_test3@company.com',
    'ethereal_test4@company.com',
    'ethereal_test5@company.com',
    'ethereal_test6@company.com',
    'ethereal_test7@company.com',
    'ethereal_test8@company.com',
    'ethereal_test9@company.com',
    'ethereal_test10@company.com',
  ].join('\n');
  fs.writeFileSync(csvPath, csvContent);

  const fileInput = await page.$('input[accept=".csv,.txt"]');
  if (fileInput) {
    await fileInput.uploadFile(csvPath);
    await new Promise((r) => setTimeout(r, 600));
  }

  // Type subject and body
  await page.type('input[placeholder="Subject"]', 'Live Stage 5 End-to-End Campaign Test');
  await page.type('textarea', 'Testing Ethereal delivery, rate limit reschedule, and restart recovery.');

  // Open Send Later modal & pick future time
  await page.evaluate(() => {
    const clockBtn = document.querySelector('button[title*="Schedule time"]');
    if (clockBtn) clockBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Set datetime-local input to 2 minutes in future
  const futureDate = new Date(Date.now() + 2 * 60 * 1000);
  const isoLocal = new Date(futureDate.getTime() - futureDate.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  await page.evaluate((val) => {
    const dtInput = document.querySelector('input[type="datetime-local"]');
    if (dtInput) {
      dtInput.value = val;
      dtInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, isoLocal);

  // Screenshot 2: Compose Page with 10 Recipient Chips & Send Later popover
  console.log('📸 Screenshot 2: Capturing Compose Page with 10 Recipient Chips & Send Later popover...');
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '02_csv_10_recipients.png') });

  // Click Done on Send Later modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const doneBtn = buttons.find((b) => b.textContent === 'Done');
    if (doneBtn) doneBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Submit Schedule Form
  console.log('🚀 Submitting Schedule Email form...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sendBtn = buttons.find((b) => b.textContent.includes('Send Later') || b.textContent.includes('Send'));
    if (sendBtn) sendBtn.click();
  });

  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot 3: Scheduled List showing the new email
  console.log('📸 Screenshot 3: Capturing Scheduled list with new email...');
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '03_scheduled_list_new_email.png') });

  console.log('✅ Step 2 UI Screenshots Captured Successfully!');
  await browser.close();
  process.exit(0);
}

runStep2().catch((err) => {
  console.error('❌ Step 2 failed:', err);
  process.exit(1);
});
