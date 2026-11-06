const { chromium } = require('playwright');
const [html, pdf, prefix] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style));
  console.log('fonts loaded:', [...new Set(fonts)].join(', '));
  const broken = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src.slice(-40)));
  console.log('broken images:', broken.length ? broken : 'none');
  const overflow = await p.evaluate(() => [...document.querySelectorAll('.inner')].map(e => e.scrollHeight - e.clientHeight));
  console.log('panel overflow (px, should be <= 0):', overflow);
  await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const sheets = await p.$$('.sheet');
  for (let i = 0; i < sheets.length; i++) await sheets[i].screenshot({ path: `${prefix}-${i + 1}.png` });
  await b.close();
})();
