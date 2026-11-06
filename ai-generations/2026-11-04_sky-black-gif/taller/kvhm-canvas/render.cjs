const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const SP = __dirname;
const D = __dirname + '/src2/KV X HM/';
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) =>
  `@font-face{font-family:"Metric-${n}";src:url("file://${SP}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${SP}/Metric-${n}.otf")}`).join('');
(async () => {
  const b = await chromium.launch();
  for (const f of (process.argv[2] ? process.argv.slice(2) : fs.readdirSync(D).filter((x) => x.endsWith('.svg')))) {
    let svg = fs.readFileSync(D + f, 'utf8').replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ').replace('<rect x="537.61" y="879.81" width="381.35" height="339.95" fill="#671e75"/>', '<rect x="536.61" y="879.81" width="383.35" height="339.95" fill="#671e75"/>');
    for (const [a, z] of (require(SP + '/patches.cjs')[f] || [])) { if (!svg.includes(a)) throw new Error(f + ' sin ' + a); svg = svg.replace(a, z); }
    fs.writeFileSync(SP + '/tmp.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0}svg{display:block}</style>${svg}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + SP + '/tmp.html');
    await p.evaluate(() => document.fonts.ready);
    const missing = await p.evaluate(() => [...document.fonts].filter((x) => x.status !== 'loaded').map((x) => x.family));
    await p.waitForTimeout(300);
    await p.screenshot({ path: SP + '/png/' + f.replace('.svg', '.png') });
    await p.close();
    console.log(f, missing.length ? 'NO CARGADAS: ' + [...new Set(missing)].join(',') : 'ok');
  }
  await b.close();
})();
