const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/kumar/.gemini/antigravity-ide/brain/bc190a2a-bbf3-45a4-b46c-0358ae70edcc';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function capture() {
  console.log('🚀 Launching Edge for unauthenticated Login Page capture...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // Clear session via logout API call
  await page.goto('http://localhost:5000/api/auth/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 800));

  console.log('📸 Capturing clean Login Page (login_page.png)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'login_page.png') });

  await browser.close();
  console.log('✅ login_page.png updated!');
}

capture().catch(console.error);
