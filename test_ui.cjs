const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/ralph/');
    console.log('Page loaded');

    // Wait for the flow to render
    await page.waitForSelector('.react-flow__renderer');
    console.log('Flow renderer found');

    // Click Next repeatedly to reveal all nodes
    for (let i = 0; i < 9; i++) {
        await page.click('button:has-text("Next >")');
        await page.waitForTimeout(500); // Wait for animations
    }
    console.log('Clicked Next 9 times');

    // Take a screenshot to verify state
    await page.screenshot({ path: 'test-screenshot-all.png' });
    console.log('Screenshot taken');

  } catch (e) {
    console.error('Error during test:', e);
  } finally {
    await browser.close();
  }
})();
