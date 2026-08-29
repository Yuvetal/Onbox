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
  
  // Inject mock state to force LoginPage rendering
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    // Clear localStorage / cookies and set mock state
    window.location.hash = '#login';
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'login_page.png') });
  await browser.close();
}

capture().catch(console.error);
