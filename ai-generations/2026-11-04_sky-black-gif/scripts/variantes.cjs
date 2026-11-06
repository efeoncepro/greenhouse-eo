// Variantes de mensaje de la grilla «popup y GIF por mercado» (Daniela, 2026-11-04).
// Parten de un KV ya corregido (src2) y cambian el antetítulo/título del bloque de destino;
// algunas suman el logo de la alianza (Chile Travel o PromPerú) o una lista de regiones.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const A = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/ALIANZAS/';
const ALZ = {
  chileTravel: A + 'SERNATURE/CHILE TRAVEL (FUERA DE CHILE).svg',
  promperuFuera: A + 'PROMPERU/OTROS HM FUERA DE PERU/LOGO_PROMPE_OTROS-HM_BLANCO.svg'
};
// Rutas foco de Perú (pedido de Daniela) agrupadas por zona para «Vuela por Perú».
const PERU = { NORTE: ['Tumbes', 'Piura', 'Chiclayo', 'Trujillo', 'Cajamarca', 'Tarapoto', 'Iquitos'], 'CENTRO Y SUR': ['Pucallpa', 'Jauja', 'Cusco', 'Arequipa', 'Juliaca', 'Tacna'] };
const V = {
  HM_AR_KV_SANTIAGO: { base: 'HM_AR_KV.svg', t: [['VOLÁ', 'VOLÁ A'], ['Internacional', 'Santiago']] },
  HM_AR_KV_LIMA: { base: 'HM_AR_KV.svg', t: [['VOLÁ', 'VOLÁ A'], ['Internacional', 'Lima']] },
  HM_BR_KV_SANTIAGO: { base: 'HM_BR_KV.svg', t: [['Internacional', 'Santiago']], alianza: 'chileTravel' },
  HM_BR_KV_PERU: { base: 'HM_BR_KV.svg', t: [['VOE A', 'VOE PARA'], ['Internacional', 'Peru']], alianza: 'promperuFuera' },
  HM_CL_KV_ENCUENTRA: { base: 'HM_CL_KV_INTER_CLUSTER.svg', t: [['VUELA', 'ENCUENTRA'], ['Internacional', 'Destinos']] },
  HM_PE_KV_ENCUENTRA: { base: 'HM_PE_KV_INTER_BANDERAS.svg', t: [['VUELA A', 'ENCUENTRA'], ['Calama', 'Destinos']] },
  HM_PE_KV_DOM_REGIONES: { base: 'HM_PE_KV_DOM.svg', t: [['VUELA A', 'VUELA POR'], ['Calama', 'Perú']], regiones: PERU }
};
(async () => {
  const b = await chromium.launch();
  const logo = {};
  for (const [k, f] of Object.entries(ALZ)) {
    const s = fs.readFileSync(f, 'utf8').replace(/^<\?xml[^>]*>/, '');
    const vb = s.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
    logo[k] = { b64: Buffer.from(s).toString('base64'), w: vb[2], h: vb[3] };
  }
  for (const [name, cfg] of Object.entries(V)) {
    const svg = fs.readFileSync(S2 + cfg.base, 'utf8');
    fs.writeFileSync(K + '/_v.html', `<!doctype html><meta charset="utf-8">${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_v.html');
    const res = await p.evaluate((t) => t.map(([de, a]) => {
      const el = [...document.querySelectorAll('text')].find((e) => e.textContent.trim() === de);
      if (!el) return de + ': NO';
      const ts = el.querySelectorAll('tspan');
      if (ts.length) { ts[0].textContent = a; for (let i = 1; i < ts.length; i++) ts[i].remove(); } else el.textContent = a;
      return de + ' → ' + a;
    }), cfg.t);
    let add = '';
    if (cfg.alianza) {
      // Logo de la alianza arriba a la derecha, sobre el cielo y lejos del avión y del rostro.
      // Chile Travel (Marca Chile) es una pestaña que cuelga del borde: va pegada a la esquina superior derecha,
      // alineada con los bordes de la imagen, en todas las aplicaciones (Daniela, 2026-11-05).
      const L = logo[cfg.alianza], pegado = cfg.alianza === 'chileTravel', h = pegado ? 150 : 104, w = L.w * h / L.h;
      add += `<image x="${(pegado ? 1080 - w : 1080 - 48 - w).toFixed(1)}" y="${pegado ? 0 : 52}" width="${w.toFixed(1)}" height="${h}" href="data:image/svg+xml;base64,${L.b64}"/>`;
    }
    if (cfg.regiones) {
      // Dos columnas bajo el logo, con el estilo de la lista de regiones de Chile (sin fotos: no hay de Perú).
      const cols = Object.entries(cfg.regiones);
      cols.forEach(([zona, ciudades], c) => {
        const x = 84 + c * 236, y0 = 372;
        add += `<text x="${x}" y="${y0}" fill="#fefefe" font-family="Metric-Bold, Metric" font-weight="700" font-size="22" letter-spacing="1">${zona}</text>`;
        add += `<rect x="${x}" y="${y0 + 10}" width="${c ? 150 : 82}" height="2" fill="#26de00"/>`;
        ciudades.forEach((ci, i) => {
          const y = y0 + 52 + i * 50;
          add += `<circle cx="${x + 9}" cy="${y - 9}" r="7" fill="#26de00"/><circle cx="${x + 9}" cy="${y - 9}" r="2.6" fill="#1f3550"/>`;
          add += `<text x="${x + 28}" y="${y}" fill="#fefefe" font-family="Metric-Semibold, Metric" font-weight="600" font-size="28">${ci}</text>`;
        });
      });
    }
    if (add) await p.evaluate((add) => document.querySelector('svg').insertAdjacentHTML('beforeend', `<g id="variante">${add}</g>`), add);
    const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(S2 + name + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    console.log(name, res.join(' | '));
  }
  await b.close();
})();
