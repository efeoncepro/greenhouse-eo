// PMAX 1200x628 (12 KV) y HPH por mercado (PE INTER, AR, UY, BR, US × 1200x1200, 300x250, 728x90, 300x600).
// Compone en HTML desde las partes de cada KV (parts/) y la foto fuente; render a 2x con Metric y Source Sans 3.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname;
const OUT = K + '/banners/';
const BB = JSON.parse(fs.readFileSync(K + '/parts/bbox.json', 'utf8'));
const R = 2; // render a 2x; se entrega 1x y @2x
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const FONTS = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('')
  + `@font-face{font-family:"Source Sans 3";src:url("file://${K}/hph/SourceSans3-Regular.otf")}`;

const part = (n, l) => `file://${K}/parts/${n}__${l}.png`;
// Pone una parte (lienzo 1080x1350) con escala s y su caja visible en (x, y).
function item(n, l, s, x, y) {
  const [bx, by] = BB[`${n}__${l}`];
  return `<img src="${part(n, l)}" style="position:absolute;left:${x - s * bx}px;top:${y - s * by}px;width:${1080 * s}px;height:${1350 * s}px">`;
}
// Recorte de una parte: muestra [cx, cy, cw, ch] del lienzo 1080x1350 con escala s en (x, y).
function crop(n, l, [cx, cy, cw, ch], s, x, y) {
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw * s}px;height:${ch * s}px;overflow:hidden"><img src="${part(n, l)}" style="position:absolute;left:${-cx * s}px;top:${-cy * s}px;width:${1080 * s}px;height:${1350 * s}px"></div>`;
}
// Precio con su badge en la misma relación que en el KV.
function precio(n, s, x, y, badge = true) {
  const [px, py] = BB[`${n}__precio`], [bx, by] = BB[`${n}__badge`];
  return item(n, 'precio', s, x, y) + (badge ? item(n, 'badge', s, x + s * (bx - px), y + s * (by - py)) : '');
}
// Foto fuente espejada como en el SVG: escala sf, centro de la mujer (u=705) en xc, fila v0 arriba.
function foto(sf, xc, v0) {
  const X0 = xc + sf * 705;
  return `<img src="file://${K}/foto-fuente.png" style="position:absolute;left:${X0 - 1672 * sf}px;top:${-v0 * sf}px;width:${1672 * sf}px;height:${941 * sf}px;transform:scaleX(-1)">`;
}
const sombra = (a = 0.42) => `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,${a}) 0%,rgba(0,0,0,${a * 0.48}) 45%,rgba(0,0,0,0) 75%)"></div>`;
const piso = (y0, H, a) => `<div style="position:absolute;left:0;right:0;top:${y0}px;height:${H - y0}px;background:linear-gradient(180deg,rgba(42,22,8,0),rgba(42,22,8,${a}))"></div>`;
// Lista del clúster nacional en 3 columnas (Norte 6 · Sur 6 · Sur 3), como en el popup.
function lista3(n, s, X, Y) {
  return crop(n, 'lista', [80, 300, 200, 388], s, X, Y) + crop(n, 'lista', [282, 300, 210, 388], s, X + 202 * s, Y)
    + crop(n, 'lista', [282, 693, 210, 168], s, X + 404 * s, Y + 62 * s);
}
// Bloque de puntualidad (medalla + «#1 …») sin el legal largo.
const punt = (n, s, x, y) => crop(n, 'pie', [45, 1244, 330, 64], s, x, y);
const legal = (txt, x, y, w, size, align = 'left') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;font:400 ${size}px/1.25 Metric;color:#fff;text-align:${align}">${txt}</div>`;
const cta = (txt, x, y, w, h, size) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:#fff;border:2px solid #78028a;border-radius:${Math.round(h / 4)}px;display:flex;align-items:center;justify-content:center;font:400 ${size}px/1 'Source Sans 3';color:#671e75">${txt}</div>`;

const MERCADO = {
  'HM_PE_KV_INTER': { cta: 'Ver vuelos', tyc: 'Aplican TyC en www.skyairline.com/es/peru/terminos-y-condiciones.' },
  'HM_AR_KV': { cta: 'Ver vuelos', tyc: 'Aplican TyC en skyairline.com/es/argentina/terminos-y-condiciones.' },
  'HM_UY_KV': { cta: 'Ver vuelos', tyc: 'Aplican TyC en www.skyairline.com/es/otros/terminos-y-condiciones.' },
  'HM_BR_KV': { cta: 'Ver voos', tyc: 'Veja T&amp;C em www.skyairline.com/pt/brasil/terminos-y-condiciones.' },
  'HM_US_KV': { cta: 'See flights', tyc: 'T&amp;Cs at skyairline.com/en/unitedstates/terminos-y-condiciones.' }
};

// ---------- Especificaciones (coordenadas 1x) ----------
function pmax(n) {
  const W = 1200, H = 628;
  // Clúster nacional: logo 0,62, lista en 3 columnas a 0,56 a la derecha del logo, destino bajo el logo
  // y precio a 0,66 bajo la lista, con la mujer corrida a la derecha para que nada le tape la cara.
  if (n === 'HM_CL_KV_DOM_CLUSTER') return { W, H, html: foto(1.05, 1000, 160) + sombra() + piso(400, H, 0.78)
    + item(n, 'logo', 0.62, 40, 22) + lista3(n, 0.56, 430, 34) + item(n, 'destino', 0.66, 48, 205)
    + precio(n, 0.66, 380, 322) + item(n, 'pie', 0.8, 40, 570) };
  if (n === 'HM_CL_KV_INTER_CLUSTER') return { W, H, html: foto(1.05, 980, 160) + sombra() + piso(400, H, 0.78)
    + item(n, 'logo', 0.72, 40, 22) + item(n, 'lista', 0.47, 48, 212) + precio(n, 0.72, 330, 262) + item(n, 'pie', 0.8, 40, 570) };
  // La mujer va a la derecha (centro en x=960) para que el badge no le tape la cara.
  return { W, H, html: foto(1.0, 960, 160) + piso(400, H, 0.78)
    + item(n, 'logo', 0.8, 40, 26) + item(n, 'destino', 0.8, 48, 300) + precio(n, 0.8, 360, 252) + item(n, 'pie', 0.8, 40, 566) };
}
const HPH = {
  '1200x1200': (n, m) => ({ W: 1200, H: 1200, html: foto(2.0, 900, 268) + piso(820, 1200, 0.8)
    + item(n, 'logo', 0.87, 100, 80) + item(n, 'destino', 1.15, 100, 370) + precio(n, 1.0, 500, 700) + item(n, 'pie', 1.08, 60, 1100) }),
  '300x600': (n, m) => ({ W: 300, H: 600, html: foto(0.8, 230, 191) + piso(380, 600, 0.82)
    + item(n, 'logo', 0.32, 30, 28) + item(n, 'destino', 0.55, 25, 135) + precio(n, 0.42, 16, 335) + cta(m.cta, 85, 494, 130, 36, 16)
    + punt(n, 0.3, 101, 548) + legal(m.tyc, 10, 572, 280, 6.4, 'center') }),
  '300x250': (n, m) => ({ W: 300, H: 250, html: foto(0.6, 225, 316) + piso(150, 250, 0.82)
    + item(n, 'logo', 0.172, 35, 15) + item(n, 'destino', 0.22, 35, 72) + precio(n, 0.27, 122, 126)
    + punt(n, 0.21, 14, 229) + legal(m.tyc, 92, 231, 200, 5.6) }),
  // 728x90: el rostro llena el alto (frente arriba, mentón abajo) entre el badge y el botón, como en el genérico.
  '728x90': (n, m) => ({ W: 728, H: 90, html: foto(0.95, 565, 318)
    + item(n, 'logo', 0.21, 14, 16) + item(n, 'destino', 0.31, 152, 8) + precio(n, 0.222, 290, 6, false)
    + item(n, 'badge', 0.3, 437, 14) + cta(m.cta, 602, 30, 102, 29, 12.65) })
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const jobs = [];
  for (const n of ['HM_PE_KV_DOM', 'HM_PE_KV_DOM-RUTA', 'HM_PE_KV_INTER', 'HM_PE_KV_INTER-RUTA', 'HM_CL_KV_DOM', 'HM_CL_KV_INTER', 'HM_AR_KV', 'HM_UY_KV', 'HM_BR_KV', 'HM_US_KV', 'HM_CL_KV_DOM_CLUSTER', 'HM_CL_KV_INTER_CLUSTER'])
    jobs.push([`${n}__pmax-1200x628`, pmax(n)]);
  for (const [n, m] of Object.entries(MERCADO)) for (const [f, fn] of Object.entries(HPH)) jobs.push([`${n}__hph-${f}`, fn(n, m)]);
  const b = await chromium.launch();
  for (const [name, { W, H, html }] of jobs) {
    if (only.length && !only.some((o) => name.includes(o))) continue;
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: R });
    fs.writeFileSync(K + '/_banner.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}body{margin:0}#c{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#6a8fae}</style><div id="c">${html}</div>`);
    await p.goto('file://' + K + '/_banner.html');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    const png = await p.screenshot();
    await p.close();
    await sharp(png).png().toFile(OUT + name + '@2x.png');
    await sharp(png).resize(W, H, { kernel: 'lanczos3' }).png().toFile(OUT + name + '.png');
    console.log(name);
  }
  await b.close();
})();
