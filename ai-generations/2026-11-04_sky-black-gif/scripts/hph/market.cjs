// HPH por mercado, genérico y sin precio: parte del SVG genérico de Chile, cambia la lista de banderas de Chile
// por la del mercado (referencias de Daniela 2026-11-04), traduce textos y cambia logo, puntualidad y URL del legal.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas';
const OUT = K + '/hph/out-mercados/';
const H = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/src2/FORMATO HPH/';
const BB = JSON.parse(fs.readFileSync(K + '/parts/bbox.json', 'utf8'));
const { fotoBase } = require(__dirname + '/../foto-base.cjs');
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const FONTS = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('')
  + `@font-face{font-family:"SourceSans3-Regular";src:url("file://${K}/hph/SourceSans3-Regular.otf")}@font-face{font-family:"Source Sans 3";src:url("file://${K}/hph/SourceSans3-Regular.otf")}`;
const S = 2;
// Cajas visibles (1x) medidas en los genéricos: lista de destinos con banderas, logo y bloque de puntualidad.
const FMT = {
  '1200x1200': { list: [90, 495, 620, 1020], logo: [100, 75, 640, 295], punt: [70, 1100, 365, 1155] },
  '300x600': { list: [20, 175, 295, 360], logo: [24, 25, 224, 106], punt: [85, 545, 215, 575] },
  '300x250': { list: [25, 98, 182, 216], logo: [30, 16, 142, 63], punt: [8, 226, 100, 248] },
  '728x90': { list: [140, 55, 266, 77], logo: [12, 18, 134, 68], punt: null }
};
// Textos por mercado. «Ver voos», «See flights», «COM GRANDES DESCONTOS» y «WITH BIG DISCOUNTS» son traducción
// propia (sin confirmar); el resto sale de los KV del mercado.
const M = {
  HM_PE_KV_INTER: { kv: 'HM_PE_KV_INTER', t: {}, tyc: 'Aplican TyC en www.skyairline.com/es/peru/terminos-y-condiciones.' },
  HM_AR_KV: { kv: 'HM_AR_KV', t: { VUELA: 'VOLÁ' }, tyc: 'Aplican TyC en skyairline.com/es/argentina/terminos-y-condiciones.' },
  HM_UY_KV: { kv: 'HM_UY_KV', t: { VUELA: 'VOLÁ' }, tyc: 'Aplican TyC en www.skyairline.com/es/otros/terminos-y-condiciones.' },
  HM_BR_KV: { kv: 'HM_BR_KV', swap: true, t: { VUELA: 'VOE A', 'CON GRANDES': 'COM GRANDES', DESCUENTOS: 'DESCONTOS', 'Ver vuelos': 'Ver voos' }, tyc: 'Veja T&C em www.skyairline.com/pt/brasil/terminos-y-condiciones.' },
  HM_US_KV: { kv: 'HM_US_KV', swap: true, t: { VUELA: 'FLY', Internacional: 'International', 'CON GRANDES': 'WITH BIG', DESCUENTOS: 'DISCOUNTS', 'Ver vuelos': 'See flights' }, tyc: 'T&Cs at skyairline.com/en/unitedstates/terminos-y-condiciones.' }
};
const CENTRADOS = ['CON GRANDES', 'DESCUENTOS', 'Ver vuelos'];
// Destinos con bandera por mercado (mismos textos que los KV con banderas). Uruguay va con fila de banderas sin texto.
const LISTA = {
  HM_PE_KV_INTER: [['PUJ', 'Punta Cana'], ['CL', 'Santiago y conexión', 'con 15 destinos'], ['AR', 'Buenos Aires'], ['BR', 'Río de Janeiro', 'y São Paulo'], ['US', 'Miami']],
  HM_AR_KV: [['PE', 'Perú y conexión', 'con 16 destinos'], ['CL', 'Santiago y conexión', 'con 15 destinos'], ['US', 'Miami'], ['BR', 'Río de Janeiro,', 'São Paulo y Florianópolis']],
  HM_UY_KV: { fila: ['PUJ', 'CL', 'BR', 'US'] },
  HM_BR_KV: [['CL', 'Santiago e conexões', 'para 15 destinos'], ['PE', 'Lima e conexões', 'para 16 destinos'], ['AR', 'Argentina'], ['US', 'Miami'], ['UY', 'Uruguai']],
  HM_US_KV: [['CL', 'Santiago and connect', 'to 15 destinations'], ['PE', 'Lima and connect', 'to 16 destinations']]
};
const flagImg = (k, x, y, d) => `<img src="file://${K}/flags-circ/${k}.png" style="position:absolute;left:${x}px;top:${y}px;width:${d}px;height:${d}px">`;
// Lista dentro de la caja de la lista de Chile: paso = alto de la caja / 6 (las 6 filas de Chile),
// bandera = 0,73 del paso y texto = 0,36 (proporciones del KV); con menos filas se centra en la caja.
function listaHTML(key, fmt, box) {
  const L = LISTA[key]; const [x0, y0, x1, y1] = box; const H = y1 - y0;
  if (fmt === '728x90' || L.fila) {
    const ks = L.fila || L.map((r) => r[0]);
    const d = fmt === '728x90' ? (y1 - y0) : Math.min(H / 6 * 0.95, 70);
    const gap = d * 0.28, y = fmt === '728x90' ? y0 : y0 + (H - d) / 2;
    return ks.map((k, i) => flagImg(k, x0 + i * (d + gap), y, d)).join('');
  }
  const pitch = H / 6, d = pitch * 0.73, fsz = pitch * 0.36, lh = pitch * 0.34;
  const top = y0 + (H - pitch * L.length) / 2;
  return L.map(([k, a, bb], i) => {
    const cy = top + pitch * (i + 0.5);
    const tx = x0 + d + pitch * 0.33;
    const t = bb ? `<div style="position:absolute;left:${tx}px;top:${cy - lh}px;font:500 ${fsz}px/${lh}px Metric;color:#fefefe;white-space:nowrap">${a}<br>${bb}</div>`
      : `<div style="position:absolute;left:${tx}px;top:${cy - lh / 2}px;font:500 ${fsz}px/${lh}px Metric;color:#fefefe;white-space:nowrap">${a}</div>`;
    return flagImg(k, x0, cy - d / 2, d) + t;
  }).join('');
}
const LEAF = 'svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline';
async function alphaBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0 / S, y0 / S, (x1 + 1) / S, (y1 + 1) / S];
}
const inside = (b, r) => b && r && b[0] >= r[0] - 3 && b[1] >= r[1] - 3 && b[2] <= r[2] + 3 && b[3] <= r[3] + 3; // 3 px de holgura por el antialias del 2x
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [fmt, F] of Object.entries(FMT)) {
    const svg = fotoBase(fs.readFileSync(H + `HPH_${fmt}_GENERICO.svg`, 'utf8').replace(/^<\?xml[^>]*>/, ''));
    const [W, Hh] = fmt.split('x').map(Number);
    fs.writeFileSync(K + '/hph/tmp-m.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}body{margin:0;background:transparent}#c{position:relative;width:${W}px;height:${Hh}px;overflow:hidden}svg{display:block;width:${W}px;height:${Hh}px}</style><div id="c">${svg}</div>`);
    const p = await b.newPage({ viewport: { width: W, height: Hh }, deviceScaleFactor: S });
    await p.goto('file://' + K + '/hph/tmp-m.html');
    await p.evaluate(() => document.fonts.ready);
    // 1) Caja visible de cada hoja (las imágenes enmascaradas sólo se miden por su alfa).
    const n = await p.evaluate((LEAF) => { const l = [...document.querySelectorAll(LEAF)].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern')); l.forEach((e, i) => { e.dataset.leaf = i; }); return l.length; }, LEAF);
    const boxes = [];
    for (let i = 0; i < n; i++) {
      await p.evaluate((i) => document.querySelectorAll('[data-leaf]').forEach((e) => { e.style.visibility = e.dataset.leaf == i ? 'visible' : 'hidden'; }), i);
      boxes.push(await alphaBox(await p.screenshot({ omitBackground: true })));
    }
    await p.evaluate(() => document.querySelectorAll('[data-leaf]').forEach((e) => { e.style.visibility = ''; }));
    const listIdx = boxes.map((bx, i) => (inside(bx, F.list) ? i : -1)).filter((i) => i >= 0);
    const logoIdx = boxes.map((bx, i) => (inside(bx, F.logo) ? i : -1)).filter((i) => i >= 0);
    const puntIdx = boxes.map((bx, i) => (inside(bx, F.punt) ? i : -1)).filter((i) => i >= 0);
    const base = await p.evaluate(() => document.getElementById('c').innerHTML);
    for (const [key, m] of Object.entries(M)) {
      await p.evaluate((html) => { document.getElementById('c').innerHTML = html; }, base);
      await p.evaluate((LEAF) => { const l = [...document.querySelectorAll(LEAF)].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern')); l.forEach((e, i) => { e.dataset.leaf = i; }); }, LEAF);
      const hide = [...listIdx, ...(m.swap ? [...logoIdx, ...puntIdx] : [])];
      // 2) Textos: traducción y URL del legal; los centrados conservan su centro.
      await p.evaluate(([hide, t, tyc, CENTRADOS, W]) => {
        for (const i of hide) document.querySelector(`[data-leaf="${i}"]`).style.display = 'none';
        for (const el of document.querySelectorAll('svg text')) {
          const txt = el.textContent.trim();
          let nuevo = null;
          if (t[txt] !== undefined) nuevo = t[txt];
          if (txt.startsWith('Aplican TyC')) nuevo = tyc;
          if (nuevo === null) continue;
          const before = el.getBBox();
          const ts = el.querySelectorAll('tspan');
          if (ts.length) { ts[0].textContent = nuevo; for (let k = 1; k < ts.length; k++) ts[k].remove(); } else el.textContent = nuevo;
          let after = el.getBBox();
          const centrado = CENTRADOS.includes(txt) || Math.abs(before.x + before.width / 2 - W / 2) < W * 0.08;
          const span = ts[0] || el;
          if (after.x + after.width > W - 6 && !centrado) {
            const fs0 = parseFloat(el.getAttribute('font-size') || getComputedStyle(el).fontSize);
            el.setAttribute('font-size', fs0 * (W - 6 - after.x) / after.width);
            after = el.getBBox();
          }
          if (centrado) {
            const dx = (before.x + before.width / 2) - (after.x + after.width / 2);
            span.setAttribute('x', (parseFloat(span.getAttribute('x') || 0) + dx).toFixed(2));
          }
        }
      }, [hide, m.t, m.tyc, CENTRADOS, W]);
      // 2b) Lista del mercado en la caja de la lista de Chile.
      await p.evaluate((h) => document.getElementById('c').insertAdjacentHTML('beforeend', h), listaHTML(key, fmt, F.list));
      // 3) Logo y puntualidad del mercado (BR y US), ajustados a la caja visible del genérico.
      if (m.swap) {
        const lb = boxes.filter((bx, i) => logoIdx.includes(i)).reduce((a, c) => [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])], [1e9, 1e9, -1e9, -1e9]);
        const [px, py, pw] = BB[`${m.kv}__logo`];
        const s = (lb[2] - lb[0]) / pw;
        let extra = `<img src="file://${K}/parts/${m.kv}__logo.png" style="position:absolute;left:${lb[0] - s * px}px;top:${lb[1] - s * py}px;width:${1080 * s}px;height:${1350 * s}px">`;
        if (F.punt && puntIdx.length) {
          const pb = boxes.filter((bx, i) => puntIdx.includes(i)).reduce((a, c) => [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])], [1e9, 1e9, -1e9, -1e9]);
          const crop = [45, 1244, 330, 64];
          const s2 = (pb[3] - pb[1]) / 58; // alto visible del bloque de puntualidad en el KV ≈ 58 px
          extra += `<div style="position:absolute;left:${pb[0]}px;top:${pb[1] - 3 * s2}px;width:${crop[2] * s2}px;height:${crop[3] * s2}px;overflow:hidden"><img src="file://${K}/parts/${m.kv}__pie.png" style="position:absolute;left:${-crop[0] * s2}px;top:${-crop[1] * s2}px;width:${1080 * s2}px;height:${1350 * s2}px"></div>`;
        }
        await p.evaluate((extra) => document.getElementById('c').insertAdjacentHTML('beforeend', extra), extra);
      }
      await p.waitForTimeout(250);
      const png = await p.screenshot();
      const name = `${key}__hph-${fmt}`;
      await sharp(png).png().toFile(OUT + name + '_2x.png');
      await sharp(png).resize(W, Hh, { kernel: 'lanczos3' }).png().toFile(OUT + name + '.png');
      console.log(name, 'lista', listIdx.length, 'logo', logoIdx.length, 'punt', puntIdx.length);
    }
    await p.close();
  }
  await b.close();
})();
