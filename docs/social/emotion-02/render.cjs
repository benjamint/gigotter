// node render.cjs OUT.html OUTDIR -> gigotter-earned-aN.png at 2160x2700
const { chromium } = require('playwright');
const [html, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  for (const s of await p.$$('section')) { const id = await s.getAttribute('id'); await s.screenshot({ path: `${outDir}/gigotter-earned-${id}.png` }); console.log(id) }
  await b.close();
})();
