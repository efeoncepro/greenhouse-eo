// Exporta el logo BLACK corregido (fecha nueva) en PNG grande con fondo transparente, por idioma.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, OUT = process.argv[2];
const SRC = K + '/src2/KV X HM/LOGO BLACK/';
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('');
const MAP = { 'SKY_LOGO_BLACK_ESP.svg': 'ES', 'SKY-13.svg': 'PT', 'SKY_LOGO_BLACK_USA.svg': 'EN' };
const ANCHOS = [4000, 2000];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [f, lang] of Object.entries(MAP)) {
    let svg = fs.readFileSync(SRC + f, 'utf8').replace(/^<\?xml[^>]*>/, '');
    const [, w0, h0] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    // Margen: el avión y el resplandor pueden salir del viewBox (en ES el ala toca el borde).
    const M = 0.15 * w0, w = w0 + 2 * M, h = h0 + 2 * M;
    svg = svg.replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="${-M} ${-M} ${w} ${h}"`).replace(/<svg /, '<svg overflow="visible" ');
    fs.writeFileSync(K + '/tmp-logo.html', `<!doctype html><meta charset="utf-8"><style>${ff}html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    for (const A of ANCHOS) {
      const dpr = (A / w0) * 1.3; // render holgado; luego se recorta y se lleva al ancho exacto
      const p = await b.newPage({ viewport: { width: Math.ceil(w), height: Math.ceil(h) }, deviceScaleFactor: dpr });
      await p.goto('file://' + K + '/tmp-logo.html');
      await p.evaluate(() => document.fonts.ready);
      const bad = await p.evaluate(() => [...document.fonts].filter((x) => x.status === 'error').map((x) => x.family));
      await p.waitForTimeout(300);
      const buf = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
      await p.close();
      const name = `SKY_LOGO_BLACK_${lang}_${A}px.png`;
      const t = await sharp(buf).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
      const pad = Math.round(t.info.width * 0.03);
      const conMargen = await sharp(t.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      console.log('  recorte', t.info.width + 'x' + t.info.height, 'de', Math.round(w * dpr) + 'x' + Math.round(h * dpr));
      await sharp(conMargen).resize({ width: A, kernel: 'lanczos3' }).png().toFile(OUT + '/' + name);
      const m = await sharp(OUT + '/' + name).metadata();
      console.log(name, m.width + 'x' + m.height, bad.length ? 'FUENTES FALTAN ' + bad : 'fuentes ok');
    }
  }
  await b.close();
})();
