import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITES = [
  { name: 'Gemini', url: 'https://gemini.google.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
];

async function openMultiTabs() {
  console.log('Launching Chromium browser...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Open each site in a separate tab
  for (const site of SITES) {
    console.log(`\nOpening ${site.name} (${site.url})...`);
    const page = await context.newPage();
    try {
      await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      const title = await page.title();
      console.log(`  Loaded! Title: "${title}"`);
      console.log(`  URL: ${page.url()}`);
    } catch (err) {
      console.log(`  Failed to load: ${err.message.split('\n')[0]}`);
    }

    // Take a screenshot of each tab
    const screenshotFile = `screenshot-${site.name.toLowerCase()}.png`;
    const screenshotPath = path.join(__dirname, screenshotFile);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotFile}`);
    } catch (err) {
      console.log(`  Screenshot failed: ${err.message.split('\n')[0]}`);
    }
  }

  // Summary
  const pages = context.pages();
  console.log(`\n=== Summary ===`);
  console.log(`Total tabs open: ${pages.length}`);
  for (let i = 0; i < pages.length; i++) {
    console.log(`  Tab ${i + 1}: ${pages[i].url()}`);
  }

  await browser.close();
  console.log('\nBrowser closed. Done.');
}

openMultiTabs().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
