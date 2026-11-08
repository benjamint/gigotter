const { chromium } = require('playwright');
const [html, pdf, png] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2.5 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style}`));
  console.log('fonts:', [...new Set(fonts)].join(', '));
  console.log('broken images:', await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length));
  // does anything run below the page or collide with the CTA box?
  console.log('page overflow px (<= 0 good):', await p.evaluate(() => { const pg = document.querySelector('.page'); const r = pg.getBoundingClientRect(); return Math.round(Math.max(...[...pg.querySelectorAll('*')].map((e) => e.getBoundingClientRect().bottom)) - r.bottom) }));
  console.log('gap above CTA (mm):', await p.evaluate(() => { const pads = document.querySelectorAll('.page > .pad'); const mid = pads[1], cta = pads[2]; return Math.round((cta.getBoundingClientRect().top - mid.getBoundingClientRect().bottom) / 3.78) }));
  await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await (await p.$('.page')).screenshot({ path: png });
  await b.close();
})();
