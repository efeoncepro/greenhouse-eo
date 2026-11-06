// Rutas foco de Chile y Perú internacional (Daniela, Teams y Notion 2026-11-06). Sólo popup y story (sin GIF).
// · HM Chile (Notion «Rutas foco (KV LISTO)»): «puede basarse en el KV de Perú pero sin el logo de PromPerú ni la
//   dirección ni la marca de agua». Se parte de los KV de Chile (precio en $, legales de Chile) con la foto del destino.
//   DOM (interior de Chile): DESDE / $000.000 / «Final tramo. Tasas e impuestos incluidos.»
//   INTER (fuera de Chile): IDA Y VUELTA DESDE / $000.000 / «Tasas e impuestos incluidos.» (ya es el de la plantilla).
// · HM Perú INTER (Notion BLACK SKY PE 26: SCL, GIG, GRU, PUJ y BUE): plantilla HM_PE_KV_INTER-RUTA,
//   IDA Y VUELTA DESDE / US$000 o S/0,000 / «Final ruta (origen)-(destino)-(origen)» + «Tasas e impuestos incluidos.»;
//   pie de la plantilla «Vuela inter» de Perú tal cual.
// Las fotos salen del banco (00_Banco Actualizado, sin generar); su origen queda en `nota` de fotos-destino.json.
// Origen: «DESDE LIMA» en Perú (como las rutas DOM) y «DESDE SANTIAGO» en Chile [inferido: Daniela no lo dio].
// Uso: node rutas-foco.cjs [HM_…]   → escribe src2/KV X HM/<pieza>.svg y suma/actualiza sus entradas en fotos-destino.json.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const { PAGE, FONTS } = require(K + '/rutas.cjs');
const slug = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');
const B = '00_Banco Actualizado/';
// [mercado, tipo, destino, IATA, foto { src, s, f? }, banco]
const RUTAS = [
  ['CL', 'DOM', 'Concepción', 'CCP', { src: 'RF_CCP.jpg', s: [0.33, 0.5], f: { story: { z: 1.2, t: [0.72, 0.58] } } }, '01_CHILE/(CENTRO Y SUR) CCP/sky-personas-concepcion-saltos-del-laja-4k'],
  ['CL', 'DOM', 'Calama', 'CJC', { src: 'RF_CJC.png', s: [0.45, 0.5], f: { kv: { z: 1.2, t: [0.66, 0.38] }, popup: { z: 1.25, t: [0.66, 0.36] } } }, '01_CHILE/(NORTE) CJC/ChatGPT Image 17 sept 2026, 09_55_42 (1) 1'],
  ['CL', 'DOM', 'Antofagasta', 'ANF', { src: 'RF_ANF.jpg', s: [0.6, 0.5] }, '01_CHILE/ANF/sky-antofagasta-acantilados-4k (sin personas: en las fotos con personas quedaban bajo el logo)'],
  ['CL', 'INTER', 'Cusco', 'CUZ', { src: 'PE_MACHU_PICCHU.jpg', s: [0.8, 0.5] }, '02_PERU/CUZ/sky-chica-vivencial-machu-picchu-4k (la misma de «Vuela por el Perú»)'],
  ['CL', 'INTER', 'Lima', 'LIM', { src: 'RF_LIM.jpg', s: [0.5, 0.5], f: { story: { s: [0.5, 0.3], z: 1.3, t: [0.66, 0.5] } } }, '../02_PERU/(COSTA) LIMA/shutterstock_2493383107 (Miraflores; la de AR cortaba a una de las dos mujeres y la de la Plaza Mayor quedaba bajo el logo)'],
  ['CL', 'INTER', 'Punta Cana', 'PUJ', { src: 'CL_PUNTA_CANA.png', s: [0.62, 0.55], f: { story: { z: 1.15, t: [0.75, 0.56] } } }, 'PUJ/Imagen de ChatGPT 29 sept 2026, 08_34_37 (la misma de CL «Vuela inter»)'],
  ['CL', 'INTER', 'São Paulo', 'GRU', { src: 'RF_GRU.png', s: [0.6, 0.45] }, '03_BRASIL/GRU/sky-personas-sao-paulo-couple-4k'],
  ['CL', 'INTER', 'Mendoza', 'MDZ', { src: 'RF_MDZ.png', s: [0.61, 0.5], f: { kv: { t: [0.5, 0.5] }, popup: { t: [0.5, 0.5] } } }, '03_ARGENTINA/MDZ/sky-personas-mendoza-friends-4k'],
  ['CL', 'INTER', 'Río de Janeiro', 'GIG', { src: 'RF_GIG.png', s: [0.37, 0.5], f: { kv: { t: [0.6, 0.5] }, popup: { t: [0.6, 0.5] }, story: { src: 'RF_GIG_V.png', s: [0.5, 0.5] } } }, '03_BRASIL/GIG/GIG-02 (story: GIG-01)'],
  ['CL', 'INTER', 'Bariloche', 'BRC', { src: 'RF_BRC.jpg', s: [0.75, 0.5] }, '../03_ARGENTINA/BARILOCHE (BRC)/shutterstock_2087048275 (sin personas: la del banco nuevo dejaba las cabezas bajo el logo y la del mirador no tenía aire arriba)'],
  ['CL', 'INTER', 'Florianópolis', 'FLN', { src: 'RF_FLN.png', s: [0.63, 0.5], f: { story: { src: 'RF_FLN_V.png', s: [0.6, 0.5] } } }, '03_BRASIL/FLN/FLN-01 (story: FLN-02)'],
  ['PE', 'INTER', 'Santiago', 'SCL', { src: 'RF_SCL.jpg', s: [0.66, 0.5], f: { kv: { t: [0.64, 0.5] }, popup: { t: [0.64, 0.5] }, story: { src: 'RF_SCL_V.jpg', s: [0.6, 0.5] } } }, '01_CHILE/SCL/santiago-679695892-1920x1080 (story: 1080x1920)'],
  ['PE', 'INTER', 'Buenos Aires', 'BUE', { src: 'RF_BUE.png', s: [0.62, 0.6] }, '03_ARGENTINA/BUE/Imagen de ChatGPT 29 sept 2026, 16_43_46 (Obelisco)'],
  ['PE', 'INTER', 'Punta Cana', 'PUJ', { src: 'CL_PUNTA_CANA.png', s: [0.62, 0.55], f: { story: { z: 1.15, t: [0.75, 0.56] } } }, 'PUJ/Imagen de ChatGPT 29 sept 2026, 08_34_37 (la misma de CL; la pareja de 08_34_56 quedaba bajo el logo)'],
  ['PE', 'INTER', 'Río de Janeiro', 'GIG', { src: 'RF_GIG.png', s: [0.37, 0.5], f: { kv: { t: [0.6, 0.5] }, popup: { t: [0.6, 0.5] }, story: { src: 'RF_GIG_V.png', s: [0.5, 0.5] } } }, '03_BRASIL/GIG/GIG-02 (story: GIG-01)'],
  ['PE', 'INTER', 'São Paulo', 'GRU', { src: 'RF_GRU.png', s: [0.6, 0.45] }, '03_BRASIL/GRU/sky-personas-sao-paulo-couple-4k']
].map(([mk, tipo, d, iata, foto, banco]) => ({ mk, tipo, d, iata, foto, banco, name: `HM_${mk}_${tipo}_RUTA_${slug(d)}` }));
const ORIGEN = { CL: 'Santiago', PE: 'Lima' };
const PLANTILLA = { 'CL DOM': 'HM_CL_KV_DOM', 'CL INTER': 'HM_CL_KV_INTER', 'PE INTER': 'HM_PE_KV_INTER-RUTA' };
module.exports = { RUTAS };

if (require.main === module) (async () => {
  const only = process.argv.slice(2);
  const dest = JSON.parse(fs.readFileSync(K + '/fotos-destino.json', 'utf8'));
  const b = await chromium.launch();
  for (const r of RUTAS.filter((x) => !only.length || only.includes(x.name))) {
    const svg = fs.readFileSync(S2 + PLANTILLA[r.mk + ' ' + r.tipo] + '.svg', 'utf8');
    fs.writeFileSync(K + '/_rf.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}</style>${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_rf.html');
    await p.evaluate(() => document.fonts.ready);
    const o = ORIGEN[r.mk], log = {};
    // Destino en lugar de «Calama» (Metric Bold 90; si pasa de 400 px se achica: a 430, como en rutas.cjs, nombres como
    // «Río de Janeiro» o «Florianópolis» entraban en la muesca de la flecha de precio).
    log.destino = await p.evaluate((d) => {
      const el = [...document.querySelectorAll('text')].find((e) => e.textContent.trim() === 'Calama');
      const ts = el.querySelector('tspan'); (ts || el).textContent = d;
      const w = el.getBBox().width; if (w > 400) { const nf = (90 * 400 / w).toFixed(2); el.setAttribute('font-size', nf); if (ts) ts.setAttribute('font-size', nf); }
      return Math.round(el.getBBox().width);
    }, r.d);
    log.origen = await p.evaluate(PAGE.origen, 'DESDE ' + o.toUpperCase());
    if (r.mk === 'CL') {
      // Legal bajo el precio (texto vivo en los KV de Chile) y pie «tramo [origen]–[destino]».
      log.legal = await p.evaluate(([tipo, o, d]) => {
        const txt = (s) => [...document.querySelectorAll('text')].find((e) => e.textContent.replace(/\s+/g, ' ').trim() === s);
        const out = [];
        if (tipo === 'DOM') { const e = txt('Por tramo. Tasas e impuestos incluidos.'); if (!e) return 'sin legal DOM'; (e.querySelector('tspan') || e).textContent = 'Final tramo. Tasas e impuestos incluidos.'; e.querySelectorAll('tspan').forEach((t, i) => i && t.remove()); out.push('legal'); }
        // El pie («Precio corresponde al tramo [origen]–[destino]. Vuela del [día]…») queda como en la plantilla, igual
        // que en las rutas DOM de Perú: sus fechas no están definidas y el texto viene kerneado letra a letra.
        return out.join('+') || 'sin cambios';
      }, [r.tipo, o, r.d]);
    } else {
      // Perú INTER: el legal de la plantilla está trazado; se oculta en su caja y se escribe en Metric Regular 26,
      // en dos líneas, achicando la primera si una ruta larga no cabe en la flecha (405 px).
      log.legal = await p.evaluate(([l1, l2]) => {
        const box = [530, 1122, 965, 1198];
        let n = 0;
        for (const e of document.querySelectorAll('svg path, svg text, svg polygon, svg rect, svg use')) {
          if (e.closest('defs, clipPath, mask, symbol, pattern')) continue;
          const q = e.getBoundingClientRect();
          if (q.width > 0 && q.left >= box[0] && q.top >= box[1] && q.right <= box[2] && q.bottom <= box[3]) { e.setAttribute('display', 'none'); n++; }
        }
        const NS = 'http://www.w3.org/2000/svg', svg = document.querySelector('svg');
        const mk = (s, y) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '541.22'); t.setAttribute('y', y); t.setAttribute('fill', '#fff'); t.setAttribute('font-family', 'Metric-Regular, Metric'); t.setAttribute('font-size', '26'); t.textContent = s; svg.appendChild(t); return t; };
        const a = mk(l1, 1152.09), w = a.getBBox().width; if (w > 405) a.setAttribute('font-size', (26 * 405 / w).toFixed(2));
        mk(l2, 1182.09);
        return n + ' ocultos, ' + Math.round(w) + ' px';
      }, [`Final ruta ${o}-${r.d}-${o}.`, 'Tasas e impuestos incluidos.']);
    }
    const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(S2 + r.name + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    dest[r.name] = { ...r.foto, nota: `Rutas foco ${r.mk} ${r.tipo} (Daniela, Teams y Notion 2026-11-06): foto del banco ${B}${r.banco}. Sin PromPerú, ubicación ni marca de agua.` };
    console.log(r.name, JSON.stringify(log));
  }
  await b.close();
  fs.writeFileSync(K + '/fotos-destino.json', JSON.stringify(dest, null, 2) + '\n');
})();
