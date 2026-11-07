// HPH genérico (Chile internacional): render de las 4 referencias con Metric + Source Sans 3,
// a 2x, y reposición de las banderas del 728x90 (vienen en blanco) desde el 1200x1200.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = require('path').resolve(__dirname, '..');
const OUT = K + '/hph/out/';
const H = require('path').resolve(__dirname, '..') + '/src2/FORMATO HPH/';
const { fotoBase } = require(__dirname + '/../foto-base.cjs');
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('')
  + `@font-face{font-family:"SourceSans3-Regular";src:url("file://${K}/hph/SourceSans3-Regular.otf")}@font-face{font-family:"Source Sans 3";src:url("file://${K}/hph/SourceSans3-Regular.otf")}`;
const S = 2;
async function render(b, f) {
  const svg = fotoBase(fs.readFileSync(H + f, 'utf8').replace(/^<\?xml[^>]*>/, ''));
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  fs.writeFileSync(K + '/hph/tmp.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: S });
  await p.goto('file://' + K + '/hph/tmp.html');
  await p.evaluate(() => document.fonts.ready);
  const missing = await p.evaluate(() => [...document.fonts].filter((x) => x.status === 'error').map((x) => x.family));
  await p.waitForTimeout(300);
  const png = await p.screenshot();
  await p.close();
  return { png, w, h, missing };
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  // Banderas del 1200x1200 (orden de la lista: BR, PE, AR, DO, US, UY), en px del lienzo 1x.
  const big = await render(b, 'HPH_1200x1200_GENERICO.svg');
  const F1200 = [[107.88, 506.42], [108.26, 599.54], [105.22, 686.07], [105.22, 776.68], [105.22, 863.73], [105.22, 948.03]];
  const flags = await Promise.all(F1200.map(([x, y]) => sharp(big.png).extract({ left: Math.round(x * S), top: Math.round(y * S), width: Math.round(63.26 * S), height: Math.round(64.39 * S) }).toBuffer()));
  const F728 = [[145.04, 57.68], [164.43, 57.68], [184.45, 57.68], [205.29, 57.68], [225.19, 58.38], [246.61, 58.29]];
  for (const f of fs.readdirSync(H).filter((x) => x.endsWith('.svg'))) {
    const r = f.startsWith('HPH_1200') ? big : await render(b, f);
    let img = r.png;
    if (f.startsWith('HPH_728')) {
      const d = Math.round(14.55 * S);
      // Recorte circular (el recorte del 1200 trae foto en las esquinas).
      const circ = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`);
      const comp = await Promise.all(F728.map(async ([x, y], i) => ({ input: await sharp(flags[i]).resize(d, d, { kernel: 'lanczos3' }).ensureAlpha().composite([{ input: circ, blend: 'dest-in' }]).png().toBuffer(), left: Math.round(x * S), top: Math.round(y * S) })));
      img = await sharp(img).composite(comp).png().toBuffer();
    }
    const name = f.replace('.svg', '');
    await sharp(img).png().toFile(OUT + name + '@2x.png');
    await sharp(img).resize(r.w, r.h, { kernel: 'lanczos3' }).png().toFile(OUT + name + '.png');
    console.log(name, r.w + 'x' + r.h, r.missing.length ? 'fuentes con error: ' + r.missing : 'fuentes ok');
  }
  await b.close();
})();
