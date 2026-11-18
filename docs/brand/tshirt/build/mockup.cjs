// Render the mockup sheet and the four single mockups. usage: node mockup.cjs WORK_DIR OUT_DIR
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3200, height: 2000 }, deviceScaleFactor: 1 });
  await p.goto(`file://${work}/mockups.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  await p.locator('#sheet').screenshot({ path: `${out}/mockup-sheet.png` });
  for (const c of ['green', 'white']) for (const s of ['front', 'back'])
    await p.locator(`#s-${c}-${s}`).screenshot({ path: `${out}/mockup-${c}-${s}.png` });
  console.log('mockups rendered');
  await b.close();
})();
