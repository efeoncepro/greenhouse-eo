// Rutas foco Perú. 2026-11-04: por ruta, KV desde HM_PE_KV_DOM-RUTA con el destino, el logo de PromPerú
// (versión «solo HM Perú», PNG) y un texto pequeño con la ubicación de la foto.
// 2026-11-05 (Daniela): las rutas salen del CSV «Lote Plantilla Rutas Prompe» (15 destinos + «Vuela por el
// Perú», que va en HM_PE_KV_DOM_REGIONES vía destinos.cjs). Por ruta se aplican el legal bajo el precio, la
// ubicación de la foto y el origen «DESDE LIMA». La foto aprobada y el crédito los pone destinos.cjs.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const PP = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/ALIANZAS/PROMPERU/PROMPERU (SOLO HM PERU)@72x.png';
const DEST = require(K + '/fotos-destino.json');
const slug = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// CSV: DESTINO NOMBRE;LEGAL PRECIO;Ubicacion;Credito
const CSV = fs.readFileSync(K + '/rutas-prompe.csv', 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1)
  .map((l) => l.split(';')).map(([d, legal, ubic, cred]) => ({ d: d.trim(), legal: legal.trim(), ubic: ubic.trim(), cred: (cred || '').trim() }));
const RUTAS = CSV.filter((r) => r.d !== 'Vuela por el Perú');
const ORIGEN = 'DESDE LIMA';
const only = process.argv.slice(2);
const FONTS = `@font-face{font-family:"Metric-Bold";src:url("file://${K}/Metric-Bold.otf")}@font-face{font-family:"Metric";font-weight:700;src:url("file://${K}/Metric-Bold.otf")}`
  + `@font-face{font-family:"Metric-Regular";src:url("file://${K}/Metric-Regular.otf")}@font-face{font-family:"Metric";font-weight:400;src:url("file://${K}/Metric-Regular.otf")}`
  + `@font-face{font-family:"Metric-Semibold";src:url("file://${K}/Metric-Semibold.otf")}@font-face{font-family:"Metric";font-weight:600;src:url("file://${K}/Metric-Semibold.otf")}`;

// Funciones que corren en la página (se reusan en destinos.cjs para «Vuela por el Perú»).
const PAGE = {
  // Legal bajo el precio: oculta el legal del kit (texto o trazado) en su caja y escribe el del CSV.
  legal: (legal) => {
    const box = [530, 1122, 965, 1198];
    const leaves = [...document.querySelectorAll('svg path, svg text, svg polygon, svg rect, svg use')].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern'));
    let n = 0;
    for (const e of leaves) {
      if (e.closest('#ruta')) continue;
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.left >= box[0] && r.top >= box[1] && r.right <= box[2] && r.bottom <= box[3]) { e.setAttribute('display', 'none'); n++; }
    }
    const NS = 'http://www.w3.org/2000/svg', svg = document.querySelector('svg');
    const mk = (txt, y) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '541.22'); t.setAttribute('y', y); t.setAttribute('fill', '#fff'); t.setAttribute('font-family', 'Metric-Regular, Metric'); t.setAttribute('font-size', '26'); t.textContent = txt; svg.appendChild(t); return t; };
    const one = mk(legal, 1152.09);
    if (one.getBBox().width > 405) { // dos líneas, como el legal original del kit
      one.remove(); const i = legal.indexOf('. '); mk(legal.slice(0, i + 1), 1152.09); mk(legal.slice(i + 2), 1182.09);
    }
    return n;
  },
  // Píldora de origen: reemplaza «DESDE [ORIGEN]» y la recentra en el mismo espacio (doceava ronda: la píldora la ajusta
  // pildora.cjs después, con el avión fijo y 35 px tras la última letra). Sin contorno oscuro en la ubicación: Dianesty
  // pidió quitar las sombras de los textos.
  origen: (txt) => {
    const el = [...document.querySelectorAll('text')].find((e) => e.textContent.replace(/\s+/g, ' ').trim() === 'DESDE [ORIGEN]');
    if (!el) return 'sin origen';
    const b0 = el.getBBox(), m = el.getAttribute('transform').match(/translate\(([\d.-]+)[ ,]+([\d.-]+)\)/);
    el.textContent = txt; const b1 = el.getBBox();
    const x = +m[1] + (b0.x + b0.width / 2) - (b1.x + b1.width / 2);
    el.setAttribute('transform', `translate(${x.toFixed(2)} ${m[2]})`);
    return Math.round(b1.width);
  },
  // PromPerú arriba a la derecha; bajo él, la ubicación de la foto con un pin verde vectorial. Son capas aparte
  // (alianza / ubicacion) porque en la story van en lugares distintos (comentario de Daniela, 2026-11-05).
  alianza: ([pp, ubic]) => {
    const ppW = 1928, ppH = 724, h = 68, w = ppW * h / ppH, x = 1080 - 48 - w, y = 56;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const add = `<g id="ruta" data-capa="alianza"><image x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" href="data:image/png;base64,${pp}"/>`
      + `<g id="ruta-ubic" data-capa="ubicacion"><text id="ubicacion" x="${1080 - 48}" y="${y + h + 34}" text-anchor="end" fill="#fff" font-family="Metric-Bold, Metric" font-weight="700" font-size="18" letter-spacing=".5">${esc(ubic)}</text></g></g>`;
    document.querySelector('svg').insertAdjacentHTML('beforeend', add);
    const t = document.getElementById('ubicacion'), bb = t.getBBox(), cx = bb.x - 12, cy = bb.y + bb.height / 2;
    t.insertAdjacentHTML('beforebegin', `<path d="M${cx},${cy + 9} C${cx - 7},${cy + 1} ${cx - 7},${cy - 2} ${cx - 7},${cy - 3} a7,7 0 1 1 14,0 c0,1 0,4 -7,12z" fill="#26de00"/><circle cx="${cx}" cy="${cy - 3}" r="2.6" fill="#1f3550"/>`);
    return Math.round(bb.width);
  }
};
module.exports = { PAGE, CSV, PP, FONTS, ORIGEN, slug };

if (require.main === module) (async () => {
  const b = await chromium.launch();
  const pp = fs.readFileSync(PP).toString('base64');
  const svg = fs.readFileSync(S2 + 'HM_PE_KV_DOM-RUTA.svg', 'utf8');
  for (const r of RUTAS) {
    const name = 'HM_PE_RUTA_' + slug(r.d);
    if (only.length && !only.includes(name)) continue;
    // Sin foto aprobada (Chiclayo y Talara al 2026-11-05) la ubicación queda en placeholder: la foto del KV no es ese lugar.
    // `ubic` en fotos-destino.json manda sobre el CSV cuando la foto cambió de lugar (Daniela, 2026-11-05: Talara y Piura).
    const ubic = DEST[name] ? (DEST[name].ubic || r.ubic) : '[Ubicación de la foto]';
    fs.writeFileSync(K + '/_ru.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}</style>${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_ru.html');
    await p.evaluate(() => document.fonts.ready);
    const fit = await p.evaluate((r) => {
      const el = [...document.querySelectorAll('text')].find((e) => e.textContent.trim() === 'Calama');
      const ts = el.querySelector('tspan'); (ts || el).textContent = r;
      const max = 430; let w = el.getBBox().width; const fs0 = 90;
      if (w > max) { const nf = fs0 * max / w; el.setAttribute('font-size', nf.toFixed(2)); if (ts) ts.setAttribute('font-size', nf.toFixed(2)); }
      return el.getBBox().width;
    }, r.d);
    const nLegal = await p.evaluate(PAGE.legal, r.legal);
    const wOrigen = await p.evaluate(require(K + '/pildora.cjs').PILDORA, { txt: ORIGEN });
    await p.evaluate(PAGE.alianza, [pp, ubic]);
    const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(S2 + name + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    console.log(name, 'destino', Math.round(fit), 'legal ocultos', nLegal, 'origen', wOrigen, DEST[name] ? '' : '(sin foto aprobada)');
  }
  await b.close();
})();
