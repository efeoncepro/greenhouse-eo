// Corrige el logo BLACK en todas las fuentes del despliegue (pedido de Sky, 2026-11-04):
//   - fecha nueva «del 25 de noviembre al 2 de diciembre» (ES/PT/EN), más grande;
//   - la línea del marco se retrae lo necesario para el texto («flexible»);
//   - menos resplandor (se veía borroso).
// Vectorial (KV y logos): se reescriben texto, trazo del marco y filtros en el DOM y se serializa.
// Raster por capas (clústers, PMAX, TikTok, DAT, HPH): se quita la capa del logo viejo y se monta
// el logo vectorial corregido en la misma caja.
// Salida: src2/<misma ruta relativa>. Uso: node logofix.cjs [rutas relativas...]
const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname;
const SRC = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/';
const OUT = K + '/src2/';
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const FF = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('')
  + `@font-face{font-family:"SourceSans3-Regular";src:url("file://${K}/hph/SourceSans3-Regular.otf")}@font-face{font-family:"Source Sans 3";src:url("file://${K}/hph/SourceSans3-Regular.otf")}`;
const FECHA = {
  es: 'DEL 25 DE NOVIEMBRE AL 2 DE DICIEMBRE',
  pt: 'DE 25 DE NOVEMBRO A 2 DE DEZEMBRO',
  en: 'FROM NOVEMBER 25 TO DECEMBER 2'
};
const LOGO = { es: 'KV X HM/LOGO BLACK/SKY_LOGO_BLACK_ESP.svg', pt: 'KV X HM/LOGO BLACK/SKY-13.svg', en: 'KV X HM/LOGO BLACK/SKY_LOGO_BLACK_USA.svg' };
const GLOW = { blur: 0.5, opacity: 0.6 }; // factores sobre el resplandor original

// Corre dentro de la página: corrige el logo vectorial del documento.
function patchVector({ FECHA, GLOW }) {
  const svg = document.querySelector('svg');
  const frame = [...svg.querySelectorAll('path')].find((p) => /^M[\d.]+,[\d.]+[hH]-?[\d.]+c-10\.21,0-18\.49-8\.28-18\.49-18\.49v-[\d.]+c0-10\.21/.test(p.getAttribute('d') || ''));
  if (!frame) return { vector: false };
  const bb = frame.getBBox();
  const L = bb.x, R = bb.x + bb.width, T = bb.y, B = bb.y + bb.height, r = 18.49;
  const date = [...svg.querySelectorAll('text')].find((t) => /NOV/.test(t.textContent.replace(/\s/g, '')) && +(t.getAttribute('transform') || '').replace(/.*translate\([-\d.]+[ ,]+([-\d.]+).*/, '$1') > T + bb.height * 0.6);
  const raw = date.textContent.replace(/\s+/g, ' ');
  const lang = /NOVEMBRO/.test(raw.replace(/\s/g, '')) ? 'pt' : /NOVEMBER/.test(raw.replace(/\s/g, '')) ? 'en' : 'es';
  const cx = (L + R) / 2;
  const tr = date.getAttribute('transform').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
  const baseY = +tr[2];
  while (date.firstChild) date.removeChild(date.firstChild);
  date.textContent = FECHA[lang];
  date.setAttribute('transform', `translate(${cx} ${baseY})`);
  date.setAttribute('text-anchor', 'middle');
  date.removeAttribute('letter-spacing');
  // Tamaño: el mayor que cabe dejando un tramo de línea recta en cada esquina.
  const pad = 10, minStraight = 8;
  const maxW = (R - r - minStraight) - (L + r + minStraight) - 2 * pad;
  date.setAttribute('font-size', '30');
  const w30 = date.getComputedTextLength();
  const size = Math.min(32, 30 * maxW / w30);
  date.setAttribute('font-size', size.toFixed(2));
  const tw = date.getComputedTextLength();
  // Centrado vertical sobre la línea: la línea pasa por la mitad de la altura de mayúsculas.
  const capH = size * 0.7;
  date.setAttribute('transform', `translate(${cx} ${(B + capH / 2).toFixed(2)})`);
  const gL = cx - tw / 2 - pad, gR = cx + tw / 2 + pad;
  frame.setAttribute('d', `M${gL.toFixed(2)},${B}H${L + r}A${r},${r} 0 0 1 ${L},${B - r}V${T + r}A${r},${r} 0 0 1 ${L + r},${T}H${R - r}A${r},${r} 0 0 1 ${R},${T + r}V${B - r}A${r},${r} 0 0 1 ${R - r},${B}H${gR.toFixed(2)}`);
  // Brillo de la esquina inferior derecha: no puede invadir el hueco del texto.
  for (const p of svg.querySelectorAll('path')) {
    const d = p.getAttribute('d') || '';
    const m = d.match(/^M([\d.]+),[\d.]+v[\d.]+c0,10\.21-8\.28,18\.49-18\.49,18\.49h-([\d.]+)$/);
    if (m && Math.abs(+m[1] - R) < 1) { const end = R - r - +m[2]; if (end < gR) p.setAttribute('d', d.replace(/h-[\d.]+$/, `H${gR.toFixed(2)}`)); }
  }
  // Menos resplandor.
  for (const f of svg.querySelectorAll('filter[id^="outer-glow"]')) {
    for (const g of f.querySelectorAll('feGaussianBlur')) g.setAttribute('stdDeviation', (+g.getAttribute('stdDeviation') * GLOW.blur).toFixed(2));
    for (const g of f.querySelectorAll('feFlood')) g.setAttribute('flood-opacity', (+g.getAttribute('flood-opacity') * GLOW.opacity).toFixed(2));
  }
  return { vector: true, lang, size: +size.toFixed(2), tw: +tw.toFixed(1), gap: [+gL.toFixed(1), +gR.toFixed(1)], frame: [L, T, R, B] };
}

const html = (svg, w, h) => `<!doctype html><meta charset="utf-8"><style>${FF}body{margin:0}svg{display:block}</style>${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}`;
const vbOf = (s) => s.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);

async function load(b, svgText) {
  const [, , w, h] = vbOf(svgText);
  fs.writeFileSync(K + '/_lf.html', html(svgText.replace(/^<\?xml[^>]*>/, ''), Math.round(w), Math.round(h)));
  const p = await b.newPage({ viewport: { width: Math.round(w), height: Math.round(h) } });
  await p.goto('file://' + K + '/_lf.html');
  await p.evaluate(() => document.fonts.ready);
  return p;
}
const serialize = (p) => p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(s); });

// Caja visible (alfa) de un PNG crudo.
async function alphaBox(buf, thr = 40) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, green = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > thr) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; if (data[i + 1] > 170 && data[i] < 120 && data[i + 2] < 120) green++; }
  }
  return { x0, y0, x1, y1, green, w: info.width, h: info.height };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  // 1) Logos corregidos (también sirven de pieza para las fuentes raster).
  const logos = {};
  for (const [lang, rel] of Object.entries(LOGO)) {
    const src = fs.readFileSync(SRC + rel, 'utf8');
    const p0 = await load(b, src);
    const before = await alphaBox(await p0.screenshot({ omitBackground: true }));
    await p0.close();
    const p = await load(b, src);
    const info = await p.evaluate(patchVector, { FECHA, GLOW });
    const fixed = await serialize(p);
    await p.close();
    fs.mkdirSync(path.dirname(OUT + rel), { recursive: true });
    fs.writeFileSync(OUT + rel, fixed);
    logos[lang] = { svg: fixed, vb: vbOf(fixed), before };
    console.log('logo', lang, JSON.stringify(info), 'caja', before.x0, before.y0, before.x1, before.y1);
  }
  const files = process.argv.slice(2).length ? process.argv.slice(2) : [
    ...fs.readdirSync(SRC + 'KV X HM').filter((f) => f.endsWith('.svg')).map((f) => 'KV X HM/' + f),
    ...['FORMATO HPH', 'FORMATO PMAX PRECIO+DCTO', 'FORMATOS BANNER TIKTOK', 'FORMATO DAT'].flatMap((d) => fs.readdirSync(SRC + d).filter((f) => f.endsWith('.svg')).map((f) => d + '/' + f))
  ];
  for (const rel of files) {
    let src = fs.readFileSync(SRC + rel, 'utf8');
    fs.mkdirSync(path.dirname(OUT + rel), { recursive: true });
    const p = await load(b, src);
    const info = await p.evaluate(patchVector, { FECHA, GLOW });
    if (info.vector) { fs.writeFileSync(OUT + rel, await serialize(p)); await p.close(); console.log(rel, JSON.stringify(info)); continue; }
    await p.close();
    // Raster: capa del logo = la capa de contenido con más verde BLACK en el tercio superior.
    const [vx, vy, VW, VH] = vbOf(src);
    const re = /<image id="([^"]*_Imagen[^"]*)"[^>]*?xlink:href="data:image\/png;base64,([^"]+)"/g;
    let m, best = null;
    while ((m = re.exec(src))) {
      const box = await alphaBox(Buffer.from(m[2], 'base64'));
      if (box.x1 < 0 || box.w < VW * 0.9) continue;
      if (box.y0 > VH * 0.45 || box.green < 200) continue;
      if ((box.x1 - box.x0) > VW * 0.8) continue; // fondo o foto
      if (!best || box.green > best.box.green) best = { id: m[1], box };
    }
    if (!best) { console.log(rel, 'SIN LOGO DETECTADO'); fs.writeFileSync(OUT + rel, src); continue; }
    const txt = [...src.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((x) => x[1]).join(' ');
    const lang = /NOVEMBRO|VOE|IDA E VOLTA|Ver voos/.test(txt) ? 'pt' : /FLY|ROUND TRIP|See flights/.test(txt) ? 'en' : 'es';
    const L = logos[lang];
    const k = (best.box.x1 - best.box.x0 + 1) / (L.before.x1 - L.before.x0 + 1);
    const ox = best.box.x0 - L.before.x0 * k, oy = best.box.y0 - L.before.y0 * k;
    // Oculta la capa vieja (imagen en línea dentro de un grupo con máscara).
    const tag = `<image id="${best.id}"`;
    if (!src.includes(tag)) throw new Error(rel + ' sin ' + tag);
    src = src.replace(tag, `<image display="none" id="${best.id}"`);
    const uses = [1];
    // Monta el logo corregido (ids con prefijo para no chocar).
    const inner = L.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
      .replace(/id="([^"]+)"/g, 'id="lf-$1"').replace(/url\(#([^)]+)\)/g, 'url(#lf-$1)').replace(/href="#([^"]+)"/g, 'href="#lf-$1"');
    const nested = `<svg x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${(L.vb[2] * k).toFixed(2)}" height="${(L.vb[3] * k).toFixed(2)}" viewBox="${L.vb.join(' ')}" overflow="visible">${inner}</svg>`;
    src = src.replace(/<\/svg>\s*$/, nested + '</svg>\n');
    fs.writeFileSync(OUT + rel, src);
    console.log(rel, 'raster', best.id, 'usos', uses.length, 'caja', best.box.x0, best.box.y0, best.box.x1, best.box.y1, 'k', k.toFixed(3), lang);
  }
  await b.close();
})();
