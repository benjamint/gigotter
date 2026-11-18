// Render the front lockups (logo + www.gigotter.com) to transparent 300 dpi PNGs.
// usage: node render-front.cjs WORK_DIR OUT_DIR
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const shirt of ['green-shirt', 'white-shirt']) for (const w of [9, 12]) {
    const p = await b.newPage({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 1 });
    await p.goto(`file://${work}/front-${shirt}-${w}cm.html`); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(200);
    const box = await p.locator('#art').boundingBox();
    const urlW = await p.evaluate(() => document.querySelector('.url').getBoundingClientRect().width);
    await p.locator('#art').screenshot({ path: `${out}/dtf-front-${shirt}-${w}cm.png`, omitBackground: true });
    console.log(shirt, w + 'cm', '| cm', (box.width / 300 * 2.54).toFixed(1), 'x', (box.height / 300 * 2.54).toFixed(1), '| text width cm', (urlW / 300 * 2.54).toFixed(1));
    await p.close();
  }
  await b.close();
})();
