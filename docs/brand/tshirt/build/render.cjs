// Render the back designs to transparent 300 dpi PNGs (and PDFs at physical size).
// usage: node render.cjs WORK_DIR OUT_DIR
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const name of ['green-shirt', 'white-shirt']) {
    const p = await b.newPage({ viewport: { width: 3400, height: 4600 }, deviceScaleFactor: 1 });
    await p.goto(`file://${work}/back-${name}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`));
    const box = await p.locator('#art').boundingBox();
    const headW = await p.evaluate(() => document.querySelector('.hl').getBoundingClientRect().width);
    await p.locator('#art').screenshot({ path: `${out}/dtf-back-${name}.png`, omitBackground: true });
    // PDF at the same physical size (300 px = 1 inch)
    const wIn = box.width / 300, hIn = box.height / 300;
    await p.addStyleTag({ content: `@page{size:${wIn}in ${hIn}in;margin:0} body{width:${box.width}px;zoom:${96 / 300}}` });
    await p.pdf({ path: `${out}/dtf-back-${name}.pdf`, width: `${wIn}in`, height: `${hIn}in`, printBackground: true, pageRanges: '1' });
    console.log(name, '| fonts:', [...new Set(fonts)].join(', '), '| px', Math.round(box.width), 'x', Math.round(box.height),
      '| cm', (box.width / 300 * 2.54).toFixed(1), 'x', (box.height / 300 * 2.54).toFixed(1), '| headline width cm', (headW / 300 * 2.54).toFixed(1));
    await p.close();
  }
  await b.close();
})();
