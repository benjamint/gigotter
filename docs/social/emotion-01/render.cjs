// usage: node render.cjs OUT.html OUTDIR  -> one PNG per <section id>, and a check that the words stay inside the frame
const { chromium } = require('playwright');
const [html, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  console.log('fonts:', [...new Set(await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`)))].join(', '));
  for (const s of await p.$$('section')) {
    const id = await s.getAttribute('id');
    // words must stay 60px inside every edge; Story versions keep clear of the top 220px and bottom 320px (app buttons)
    const spill = await s.evaluate((el) => {
      const r = el.getBoundingClientRect(), tall = el.classList.contains('tall'), out = []
      for (const k of el.querySelectorAll('h1,h2,p,.earned,.mark,.note,.tag')) {
        const q = k.getBoundingClientRect()
        if (q.left < r.left + 60 || q.right > r.right - 60 || q.top < r.top + (tall ? 220 : 60) || q.bottom > r.bottom - (tall ? 320 : 60)) out.push(k.tagName + '.' + k.className)
      }
      return out
    });
    await s.screenshot({ path: `${outDir}/gigotter-earned-${id}.png` });
    console.log(id, spill.length ? 'OUTSIDE SAFE AREA: ' + spill.join(', ') : 'ok');
  }
  await b.close();
})();
