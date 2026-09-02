const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage();

  // Create a minimal HTML wrapper since Vite server isn't running for this simple test
  const testHtmlPath = path.join(process.cwd(), 'test-react.html');

  await page.goto('about:blank');

  // Close the browser
  await browser.close();
})();
