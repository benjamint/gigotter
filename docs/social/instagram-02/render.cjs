const { chromium } = require('playwright');
const [html, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style}`));
  console.log('fonts:', [...new Set(fonts)].join(', '));
  // anything poking past the 96px margin on any side
  console.log('overflow past margin (<= 0 good):', await p.evaluate(() => [...document.querySelectorAll('.in')].map((s) => {
    const r = s.getBoundingClientRect(); let w = -999
    for (const k of s.querySelectorAll('*')) { const q = k.getBoundingClientRect(); w = Math.max(w, q.bottom - r.bottom, q.right - r.right, r.left - q.left, r.top - q.top) }
    return Math.round(w)
  })));
  const s = await p.$$('.s');
  for (let i = 0; i < s.length; i++) await s[i].screenshot({ path: `${out}/gigotter-ig-02-${i + 1}.png` });
  await b.close();
})();
