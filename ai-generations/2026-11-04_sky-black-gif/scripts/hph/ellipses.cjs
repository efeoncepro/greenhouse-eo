const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const H = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/src2/FORMATO HPH/';
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
