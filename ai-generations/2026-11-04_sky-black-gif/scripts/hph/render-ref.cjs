const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const SP = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas';
const H = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/src2/FORMATO HPH/';
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${SP}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${SP}/Metric-${n}.otf")}`).join('');
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync(H).filter((x) => x.endsWith('.svg'))) {
    const svg = fs.readFileSync(H + f, 'utf8').replace(/^<\?xml[^>]*>/, '');
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    fs.writeFileSync(SP + '/hph/tmp.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    const scale = Number(w) < 800 ? 2 : 1;
    const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: scale });
    await p.goto('file://' + SP + '/hph/tmp.html');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: SP + '/hph/ref-' + f.replace('.svg', '.png') });
    await p.close();
    console.log(f, w, h, '@' + scale + 'x');
  }
  await b.close();
})();
