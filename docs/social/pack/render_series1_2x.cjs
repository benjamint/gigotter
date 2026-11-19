// node r1.cjs PAGE.html OUTDIR : series 1 feed posts (p1..p9) at 2x
const { chromium } = require('playwright');
const [html, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  for (const s of await p.$$('section')) { const id = await s.getAttribute('id'); if (id.startsWith('p')) await s.screenshot({ path: `${outDir}/${id}.png` }) }
  await b.close();
})();
