const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/kumar/.gemini/antigravity-ide/brain/bc190a2a-bbf3-45a4-b46c-0358ae70edcc';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5000/api/auth/dev-login', { waitUntil: 'domcontentloaded' });
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  // Type non-existent search term to trigger empty state
  await page.type('input[placeholder*="Search"]', 'nonexistent_query_999');
  await new Promise((r) => setTimeout(r, 800));

  console.log('📸 Capturing Empty State (empty_state.png)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'empty_state.png') });

  await browser.close();
  console.log('✅ empty_state.png captured!');
}

capture().catch(console.error);
