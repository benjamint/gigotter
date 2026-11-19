// node render.cjs OUT.html FRAMEDIR [fps=30] [seconds=13.5]
const { chromium } = require('playwright');
const [html, dir, fps = 30, secs = 13.5] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const n = Math.round(fps * secs);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / fps);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.png` });
  }
  console.log('frames', n); await b.close();
})();
