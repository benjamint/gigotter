// Render the tote design to a transparent 300 dpi PNG and a PDF at physical size.
// usage: node render.cjs WORK_DIR OUT_DIR
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3700, height: 5000 }, deviceScaleFactor: 1 });
  await p.goto(`file://${work}/tote.html`); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`));
  const box = await p.locator('#art').boundingBox();
  // anything wider than the print area?
  const spill = await p.evaluate(() => { const a = document.getElementById('art').getBoundingClientRect(); let w = -999
    for (const e of document.querySelectorAll('#art *')) { const r = e.getBoundingClientRect(); if (r.width) w = Math.max(w, a.left - r.left, r.right - a.right, r.bottom - a.bottom) } return Math.round(w) });
  await p.locator('#art').screenshot({ path: `${out}/dtf-tote-canvas.png`, omitBackground: true });
  const wIn = box.width / 300, hIn = box.height / 300;
  await p.addStyleTag({ content: `@page{size:${wIn}in ${hIn}in;margin:0} body{width:${box.width}px;zoom:${96 / 300}}` });
  await p.pdf({ path: `${out}/dtf-tote-canvas.pdf`, width: `${wIn}in`, height: `${hIn}in`, printBackground: true, pageRanges: '1' });
  console.log('fonts:', [...new Set(fonts)].join(', '), '| px', Math.round(box.width), 'x', Math.round(box.height),
    '| cm', (box.width / 300 * 2.54).toFixed(1), 'x', (box.height / 300 * 2.54).toFixed(1), '| spill past edges (px, <=0 good):', spill);
  await b.close();
})();
