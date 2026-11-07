const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const H = require('path').resolve(__dirname, '..') + '/src2/FORMATO HPH/';
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync(H).filter((x) => x.endsWith('.svg'))) {
    const p = await b.newPage();
    await p.setContent(fs.readFileSync(H + f, 'utf8').replace(/^<\?xml[^>]*>/, ''));
    const r = await p.evaluate(() => [...document.querySelectorAll('[id^="Ellipse"]')].map((g) => { const bb = g.getBBox(); return [bb.x, bb.y, bb.width, bb.height].map((v) => Math.round(v * 100) / 100); }));
    console.log(f, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
