// Piezas «KV listo» de Chile (BLACK SKY CL 26): render 1x y 2x de las referencias de Daniela
// (Banner TikTok, DAT, PMAX precio+dcto) ya con el logo corregido (src2).
const fs = require('fs');
const { fotoBase } = require(__dirname + '/foto-base.cjs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, OUT = K + '/chile/';
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const FF = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('');
const FILES = ['FORMATOS BANNER TIKTOK/BANNER-TIKTOK_PRECIO_1920x1080.svg', 'FORMATOS BANNER TIKTOK/BANNER-TIKTOK_DCTO_1920x1080.svg', 'FORMATOS BANNER TIKTOK/BANNER-TIKTOK_PRECIO+DCTO_1920x1080.svg',
  'FORMATO DAT/KV BLACK-45-DAT_DOM.svg', 'FORMATO DAT/KV BLACK-45-DAT_INTER.svg',
  'FORMATO PMAX PRECIO+DCTO/PMAX_1080x1080.svg', 'FORMATO PMAX PRECIO+DCTO/PMAX_1080x1350.svg', 'FORMATO PMAX PRECIO+DCTO/PMAX_1080x1920.svg', 'FORMATO PMAX PRECIO+DCTO/PMAX_1200x628.svg'];
const NAME = (f) => f.split('/').pop().replace('.svg', '').replace('KV BLACK-45-', '').replace('+', '-').replace(/^/, 'CL_');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const f of FILES) {
    const svg = fotoBase(fs.readFileSync(K + '/src2/' + f, 'utf8').replace(/^<\?xml[^>]*>/, ''));
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number), W = Math.round(vb[2]), H = Math.round(vb[3]);
    fs.writeFileSync(K + '/_cr.html', `<!doctype html><meta charset="utf-8"><style>${FF}body{margin:0}svg{display:block}</style>${svg.replace('<svg ', `<svg width="${W}" height="${H}" `)}`);
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await p.goto('file://' + K + '/_cr.html');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const png = await p.screenshot();
    await p.close();
    const n = NAME(f);
    await sharp(png).png().toFile(OUT + n + '_2x.png');
    await sharp(png).resize(W, H, { kernel: 'lanczos3' }).png().toFile(OUT + n + '.png');
    console.log(n, W + 'x' + H);
  }
  await b.close();
})();
