// node render.cjs OUT.html OUTDIR -> gigotter-bN.png at 2160x2700
const { chromium } = require('playwright');
const [html, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await p.goto('file://' + html); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
  for (const s of await p.$$('section')) {
    const id = await s.getAttribute('id');
    const fs = await s.$eval('.words', (w) => w.style.fontSize);
    await s.screenshot({ path: `${outDir}/gigotter-${id}.png` }); console.log(id, fs);
  }
  await b.close();
})();
