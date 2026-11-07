const { chromium } = require('playwright');
const [html, pdf, prefix] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`));
  console.log('fonts:', [...new Set(fonts)].join(', '));
  // how far the lowest element sits below the inner box's bottom padding edge (should be <= 0)
  const over = await p.evaluate(() => [...document.querySelectorAll('.inner')].map((e) => {
    const r = e.getBoundingClientRect(), pad = parseFloat(getComputedStyle(e).paddingBottom)
    const bottom = Math.max(...[...e.querySelectorAll('*')].map((k) => k.getBoundingClientRect().bottom))
    return Math.round(bottom - (r.bottom - pad))
  }));
  console.log('overflow px per page (<= 0 is good):', over);
  console.log('clipped boxes:', await p.evaluate(() => [...document.querySelectorAll('.inner *')].filter((e) => getComputedStyle(e).overflow === 'hidden' && e.scrollHeight > e.clientHeight + 1).map((e) => e.className)));
  console.log('gap above each page CTA (mm):', await p.evaluate(() => [...document.querySelectorAll('.cta')].map((c) => { const prev = c.previousElementSibling; return Math.round((c.getBoundingClientRect().top - Math.max(...[...prev.querySelectorAll('*')].map((k) => k.getBoundingClientRect().bottom), prev.getBoundingClientRect().bottom)) / 3.78) })));
  await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${prefix}-${i + 1}.png` });
  await b.close();
})();
