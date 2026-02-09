import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testChromeExtension() {
  console.log('Launching Chromium browser...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // First, try navigating to google.com
  console.log('Attempting to navigate to google.com...');
  let navigatedToGoogle = false;
  try {
    await page.goto('https://www.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    navigatedToGoogle = true;
    console.log(`Successfully loaded google.com. Title: "${await page.title()}"`);
    console.log(`URL: ${page.url()}`);
  } catch (err) {
    console.log(`Cannot reach google.com: ${err.message}`);
    console.log('This is expected in a sandboxed environment without external network access.');
    console.log('Falling back to local test page...\n');
  }

  // Fall back to local test page if google.com is unreachable
  if (!navigatedToGoogle) {
    const localPagePath = path.join(__dirname, 'test-page.html');
    const localUrl = `file://${localPagePath}`;
    console.log(`Navigating to local test page: ${localUrl}`);
    try {
      await page.goto(localUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      console.log(`Page loaded. Title: "${await page.title()}"`);
      console.log(`URL: ${page.url()}`);
    } catch (err) {
      console.error('Failed to load local page:', err.message);
    }
  }

  // Take a screenshot
  const screenshotPath = path.join(__dirname, 'screenshot-google.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\nScreenshot saved to: ${screenshotPath}`);

  // Check for any Claude extension indicators in the DOM
  const extensionIndicators = await page.evaluate(() => {
    const allElements = document.querySelectorAll('[id*="claude"], [class*="claude"], [data-claude]');
    const extensionScripts = Array.from(document.querySelectorAll('script[src*="chrome-extension"]'));
    const extensionStyles = Array.from(document.querySelectorAll('link[href*="chrome-extension"]'));
    const allScripts = Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
    const allLinks = Array.from(document.querySelectorAll('link')).map(l => l.href).filter(Boolean);

    return {
      claudeElements: allElements.length,
      extensionScripts: extensionScripts.map(s => s.src),
      extensionStyles: extensionStyles.map(l => l.href),
      allScriptSrcs: allScripts,
      allLinkHrefs: allLinks,
      bodyClasses: document.body.className,
      documentTitle: document.title,
    };
  });

  console.log('\n=== Extension Detection Results ===');
  console.log(`Claude-related DOM elements: ${extensionIndicators.claudeElements}`);
  console.log(`Chrome extension scripts: ${JSON.stringify(extensionIndicators.extensionScripts)}`);
  console.log(`Chrome extension styles: ${JSON.stringify(extensionIndicators.extensionStyles)}`);
  console.log(`All script sources: ${JSON.stringify(extensionIndicators.allScriptSrcs)}`);
  console.log(`All link hrefs: ${JSON.stringify(extensionIndicators.allLinkHrefs)}`);
  console.log(`Body classes: "${extensionIndicators.bodyClasses}"`);
  console.log(`Document title: "${extensionIndicators.documentTitle}"`);

  if (extensionIndicators.claudeElements > 0 || extensionIndicators.extensionScripts.length > 0) {
    console.log('\nRESULT: Claude for Chrome extension artifacts DETECTED');
  } else {
    console.log('\nRESULT: No Claude for Chrome extension artifacts detected.');
    console.log('\nThis is expected because:');
    console.log('  1. Playwright uses its own Chromium binary, not a user-installed Chrome.');
    console.log('  2. Chrome extensions are NOT loaded in Playwright by default.');
    console.log('  3. To test with extensions, you would need to:');
    console.log('     a. Have the extension .crx or unpacked directory available');
    console.log('     b. Use chromium.launchPersistentContext() with --load-extension and --disable-extensions-except flags');
    console.log('     c. Example:');
    console.log('        const context = await chromium.launchPersistentContext(userDataDir, {');
    console.log('          headless: false,');
    console.log('          args: [');
    console.log('            `--disable-extensions-except=${extensionPath}`,');
    console.log('            `--load-extension=${extensionPath}`,');
    console.log('          ],');
    console.log('        });');
  }

  await browser.close();
  console.log('\nBrowser closed. Test complete.');
}

testChromeExtension().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
