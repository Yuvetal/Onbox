const puppeteer = require('puppeteer-core');
const path = require('path');

const DOCS_SCREENSHOTS = path.join(__dirname, '..', 'docs', 'screenshots');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const url1 = 'https://ethereal.email/message/apF.ukebeQl0y92japGHj2JrP7FcF7a1AAAAA.wNPybSTmi9vFiKenht17Y';
const url2 = 'https://ethereal.email/message/apF.ukebeQl0y92japGHj3n1E5GgeNz.AAAABJmXmVQudOLJPWnrGEr1JYs';

async function captureEthereal() {
  console.log('🚀 Navigating to live Ethereal Email Preview pages...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // 1. Capture Ethereal Preview 1
  console.log('📸 Capturing Ethereal Preview 1...');
  await page.goto(url1, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '04_ethereal_preview_email1.png') });

  // 2. Capture Ethereal Preview 2
  console.log('📸 Capturing Ethereal Preview 2...');
  await page.goto(url2, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(DOCS_SCREENSHOTS, '05_ethereal_preview_email2.png') });

  console.log('✅ Ethereal Preview Screenshots Captured!');
  await browser.close();
  process.exit(0);
}

captureEthereal().catch((err) => {
  console.error('❌ Ethereal capture failed:', err);
  process.exit(1);
});
