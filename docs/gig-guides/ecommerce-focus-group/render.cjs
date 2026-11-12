const { chromium } = require('playwright');
const [html, png, pdf] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style}`));
  console.log('fonts:', [...new Set(fonts)].join(', '));
  // anything spilling past the bottom or the side margins?
  console.log('overflow (px, <= 0 good):', await p.evaluate(() => { const s = document.querySelector('.s').getBoundingClientRect(); let w = -999; for (const e of document.querySelectorAll('.s *')) { const r = e.getBoundingClientRect(); w = Math.max(w, r.bottom - s.bottom, r.right - s.right) } return Math.round(w) }));
  console.log('gap above privacy box (px):', await p.evaluate(() => { const box = [...document.querySelectorAll('.s > div')][2]; const prev = box.previousElementSibling; return Math.round(box.getBoundingClientRect().top - Math.max(...[...prev.querySelectorAll('*')].map((k) => k.getBoundingClientRect().bottom))) }));
  await (await p.$('.s')).screenshot({ path: png });
  await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await b.close();
})();
