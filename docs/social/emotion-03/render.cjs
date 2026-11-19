// node render.cjs OUT.html OUTDIR -> gigotter-bN.png at 2160x2700
const { chromium } = require('playwright');
const [html, outDir, scale = 2] = process.argv.slice(2);  // scale 1 for TikTok stories (1080x1920 is TikTok's full size)
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: Number(scale) });
  await p.goto('file://' + html); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
  for (const s of await p.$$('section')) {
    const id = await s.getAttribute('id');
    const fs = await s.$eval('.words', (w) => w.style.fontSize);
    await s.screenshot({ path: `${outDir}/gigotter-${id}.png` }); console.log(id, fs);
  }
  await b.close();
})();
