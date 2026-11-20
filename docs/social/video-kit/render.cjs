// node render.cjs PAGE.html FRAMEDIR [fps] [seconds] : one PNG per frame, drawn with window.render(t)
const { chromium } = require('playwright');
const [html, dir, fps = 30, secs = 13.5, mode = ''] = process.argv.slice(2);  // mode 'alpha': transparent PNGs for compositing over footage
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const n = Math.round(fps * secs);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / fps);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.png`, omitBackground: mode === 'alpha' });
  }
  console.log('frames', n); await b.close();
})();
