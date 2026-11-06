// Regla de separación destino ↔ flecha de precio (Daniela, 2026-11-05, «es una regla»): cuando el destino es
// corto («Peru», «Lima», «Tacna») la flecha de precio queda lejos y el bloque se parte en dos. La flecha y el badge
// se corren a la izquierda hasta dejar BRECHA px entre el borde derecho del bloque de destino (título, antetítulo
// o píldora de origen, lo que llegue más lejos) y la esquina de la flecha. Nunca se corren a la derecha: con
// destinos largos («Internacional») queda la composición del kit. Los elementos movidos llevan data-capa para que
// parts.cjs y layers.cjs los sigan poniendo en su capa aunque ya no quepan en la región de precio.
// compose.cjs aplica la misma regla en popup y story, donde el bloque se reescala.
// Uso: node brecha.cjs HM_….svg [...]   (idempotente)
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const BRECHA = 40;
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('');
const REG = { badge: [785, 755, 1020, 995], precio: [400, 870, 1055, 1230], destino: [40, 920, 530, 1180] };
module.exports = { BRECHA };
if (require.main === module) (async () => {
  const b = await chromium.launch();
  for (const f of process.argv.slice(2)) {
    const svg = fs.readFileSync(S2 + f, 'utf8');
    fs.writeFileSync(K + '/_br.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0}</style>${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_br.html');
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(([REG, G]) => {
      const leaves = [...document.querySelectorAll('svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline')]
        .filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern') && !e.parentElement.closest('text'));
      const capa = { destino: [], precio: [], badge: [] }, box = {};
      for (const e of leaves) {
        const forz = e.closest('[data-capa]'), fc = forz && forz.getAttribute('data-capa');
        const r = e.getBoundingClientRect(); if (!(r.width > 0)) continue;
        let L = fc && capa[fc] ? fc : null;
        if (!L && !fc) for (const [k, [x0, y0, x1, y1]] of Object.entries(REG)) if (r.left >= x0 && r.top >= y0 && r.right <= x1 && r.bottom <= y1) { L = k; break; }
        if (!L) continue;
        capa[L].push(e);
        const o = (box[L] = box[L] || [1e9, -1e9]); o[0] = Math.min(o[0], r.left); o[1] = Math.max(o[1], r.right);
      }
      if (!box.destino || !box.precio) return { sin: true };
      const d = Math.round(box.precio[0] - box.destino[1] - G);
      if (d <= 0) return { brecha: Math.round(box.precio[0] - box.destino[1]), corrida: 0 };
      for (const L of ['precio', 'badge']) for (const e of capa[L]) {
        const m = e.parentElement.getScreenCTM(), dx = -d / m.a;
        e.setAttribute('transform', `translate(${dx.toFixed(2)} 0) ` + (e.getAttribute('transform') || ''));
        e.setAttribute('data-capa', L);
      }
      return { brecha: Math.round(box.precio[0] - box.destino[1]), corrida: d };
    }, [REG, BRECHA]);
    if (r.corrida) {
      const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
      fs.writeFileSync(S2 + f, '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    }
    await p.close();
    console.log(f, JSON.stringify(r));
  }
  await b.close();
})();
