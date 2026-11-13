const { chromium } = require('playwright');
const [html, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`));
  console.log('fonts:', [...new Set(fonts)].join(', '));
  // anything inside the safe area that spills past it (would be hidden by TikTok's buttons/caption)
  console.log('spill past safe area (px, <= 0 good):', await p.evaluate(() => [...document.querySelectorAll('.safe')].map((s) => {
    const r = s.getBoundingClientRect(); let worst = -999
    for (const k of s.querySelectorAll('*')) { const q = k.getBoundingClientRect(); worst = Math.max(worst, q.bottom - r.bottom, q.right - r.right) }
    return Math.round(worst)
  })));
  const slides = await p.$$('.s');
  for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: `${outDir}/gigotter-tiktok-${i + 1}.png` });
  await b.close();
})();
