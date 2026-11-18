// Render the tote mockup and the merch sheet. usage: node mockup.cjs WORK_DIR OUT_DIR
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3600, height: 2400 }, deviceScaleFactor: 1 });
  await p.goto(`file://${work}/mockups.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  await p.locator('#tote-single').screenshot({ path: `${out}/mockup-tote-green.png` });
  await p.locator('#tote-single-canvas').screenshot({ path: `${out}/mockup-tote-canvas.png` });
  await p.locator('#sheet').screenshot({ path: `${out}/mockup-merch.png` });
  console.log('mockups rendered');
  await b.close();
})();
