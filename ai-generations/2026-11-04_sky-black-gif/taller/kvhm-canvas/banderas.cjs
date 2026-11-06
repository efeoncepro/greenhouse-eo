// KV «Vuela internacional» con banderas por mercado (referencias de Daniela, 2026-11-04):
// toma el KV del mercado ya corregido (src2) y suma la lista de destinos con bandera bajo el logo,
// con el estilo de la lista del clúster internacional de Chile (círculo con borde blanco, Metric Medium 33).
// Uruguay lleva una fila de banderas bajo «Internacional» en lugar de la píldora de origen.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const B = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/GRAFICOS/BANDERAS/';
const FLAG = { AR: 'BANDERA CL (CIRCULO)_1.svg', BR: 'BANDERA BR (CIRCULO).svg', CL: 'BANDERA CL (CIRCULO).svg', PE: 'BANDERA PE(CIRCULO).svg', US: 'BANDERA USA (CIRCULO).svg', UY: 'BANDERA UY (CIRCULO).svg', PUJ: 'BANDERA PUJ (CIRCULO).svg' };
const KVS = {
  HM_AR_KV_BANDERAS: { base: 'HM_AR_KV.svg', lista: [['PE', 'Perú y conexión', 'con 16 destinos'], ['CL', 'Santiago y conexión', 'con 15 destinos'], ['US', 'Miami'], ['BR', 'Río de Janeiro,', 'São Paulo y Florianópolis']] },
  HM_PE_KV_INTER_BANDERAS: { base: 'HM_PE_KV_INTER.svg', lista: [['PUJ', 'Punta Cana'], ['CL', 'Santiago y conexión', 'con 15 destinos'], ['AR', 'Buenos Aires'], ['BR', 'Río de Janeiro', 'y São Paulo'], ['US', 'Miami']] },
  HM_BR_KV_BANDERAS: { base: 'HM_BR_KV.svg', lista: [['CL', 'Santiago e conexões', 'para 15 destinos'], ['PE', 'Lima e conexões', 'para 16 destinos'], ['AR', 'Argentina'], ['US', 'Miami'], ['UY', 'Uruguai']] },
  HM_US_KV_BANDERAS: { base: 'HM_US_KV.svg', lista: [['CL', 'Santiago and connect', 'to 15 destinations'], ['PE', 'Lima and connect', 'to 16 destinations']] },
  // Onceava ronda (Dianesty, Frame V3: «sumar los nombres de los destinos: Punta Cana, Chile y sus cnx, Salvador; les
  // confirmo si va Miami»): la fila de banderas bajo «Internacional» pasa a la lista con nombres bajo el logo, como en
  // los demás mercados; Chile con el mismo texto que el resto («Santiago y conexión con 15 destinos», Daniela). Miami queda hasta que Dianesty confirme. La píldora de origen vuelve (variantes.cjs la llena).
  HM_UY_KV_BANDERAS: { base: 'HM_UY_KV.svg', lista: [['PUJ', 'Punta Cana'], ['CL', 'Santiago y conexión', 'con 15 destinos'], ['BR', 'Salvador'], ['US', 'Miami']], sombraTexto: true }
};
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  const b = await chromium.launch();
  // Banderas circulares a PNG transparente 160 px (2,4x del diámetro de 67 px).
  // Borde (Daniela vía Julio, 2026-11-05: «la línea del círculo está muy gruesa»): antes se sumaban el disco blanco
  // de fondo, el aro propio del SVG (trazo 14) y otro aro de 2 px, ~5 px en total. Ahora se quita el aro del SVG,
  // se recorta la bandera a su círculo (caja de opacidad) y se dibuja un solo aro blanco de 2 px, como en la lista
  // del clúster internacional del kit.
  const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
  const png = {};
  for (const [k, f] of Object.entries(FLAG)) {
    const s = fs.readFileSync(B + f, 'utf8').replace(/^<\?xml[^>]*>/, '').replace(/stroke="#fff"/g, 'stroke="none"');
    const p = await b.newPage({ viewport: { width: 640, height: 640 } });
    await p.setContent(`<style>body{margin:0;background:transparent}svg{display:block;width:640px;height:640px}</style>${s.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ')}`);
    const shot = await p.screenshot({ omitBackground: true });
    await p.close();
    const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const d = Math.min(x1 - x0, y1 - y0) + 1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const out = await sharp(shot).extract({ left: Math.round(cx - d / 2), top: Math.round(cy - d / 2), width: d, height: d }).resize(160, 160, { kernel: 'lanczos3' }).png().toBuffer();
    fs.mkdirSync(K + '/flags-circ', { recursive: true });
    fs.writeFileSync(K + '/flags-circ/' + k + '.png', out);
    png[k] = out.toString('base64');
  }
  const flag = (k, cx, cy, r = 33.5) => `<image x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" clip-path="circle(50%)" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${png[k]}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="#fff" stroke-width="2"/>`;
  const solo = process.argv.slice(2); // sin argumentos: los cinco KV
  for (const [name, cfg] of Object.entries(KVS).filter(([n]) => !solo.length || solo.includes(n))) {
    let svg = fs.readFileSync(S2 + cfg.base, 'utf8');
    let add = '';
    if (cfg.lista) {
      const n = cfg.lista.length, pitch = n > 4 ? 92 : 98, y0 = 378;
      cfg.lista.forEach(([k, l1, l2], i) => {
        const cy = y0 + i * pitch;
        add += flag(k, 103, cy);
        add += l2
          ? `<text x="166.5" y="${cy - 3}" fill="#fefefe" font-family="Metric-Medium, Metric" font-weight="500" font-size="33">${esc(l1)}<tspan x="166.5" dy="31.35">${esc(l2)}</tspan></text>`
          : `<text x="166.5" y="${cy + 11}" fill="#fefefe" font-family="Metric-Medium, Metric" font-weight="500" font-size="33">${esc(l1)}</text>`;
      });
      // sombraTexto (Uruguay, onceava ronda): sombra fina pegada a las letras, no un velo detrás de la lista (Dianesty pidió
      // quitar el difuminado negro en USA). Hace legible «Salvador» sobre la nube clara del popup.
      add = cfg.sombraTexto !== false // todas las listas de banderas (onceava ronda: «Buenos Aires» se perdía sobre el puente blanco de Perú)
        ? `<filter id="lf-sombra-texto" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.6" flood-color="#000" flood-opacity=".8"/></filter><g id="lista-banderas">${add.replace(/<text /g, '<text filter="url(#lf-sombra-texto)" ')}</g>`
        : `<g id="lista-banderas">${add}</g>`;
    }
    fs.writeFileSync(K + '/_bd.html', `<!doctype html><meta charset="utf-8">${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_bd.html');
    if (cfg.fila) {
      // Píldora «DESDE [ORIGEN]»: se ocultan sus hojas y en su lugar va la fila de banderas.
      const box = await p.evaluate(() => {
        const t = [...document.querySelectorAll('text')].find((e) => /ORIGEN/.test(e.textContent));
        const r = t.getBoundingClientRect();
        const pad = { l: r.left - 90, t: r.top - 30, r: r.right + 40, b: r.bottom + 30 };
        let hid = 0;
        for (const e of document.querySelectorAll('svg path, svg rect, svg text, svg polygon, svg circle, svg ellipse, svg image, svg use')) {
          if (e.closest('defs, clipPath, mask, symbol')) continue;
          const q = e.getBoundingClientRect();
          if (q.width && q.left >= pad.l && q.top >= pad.t && q.right <= pad.r && q.bottom <= pad.b) { e.setAttribute('display', 'none'); hid++; }
        }
        return { hid, x: r.left, y: r.top, h: r.height };
      });
      const cy = box.y + box.h / 2;
      add = `<g id="fila-banderas">${cfg.fila.map((k, i) => flag(k, 92 + i * 66, cy, 26)).join('')}</g>`;
      console.log(name, 'píldora oculta', JSON.stringify(box));
    }
    await p.evaluate((add) => { const s = document.querySelector('svg'); s.insertAdjacentHTML('beforeend', add); }, add.replace(/xlink:href/g, 'href'));
    let out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(S2 + name + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    console.log(name, 'listo');
  }
  await b.close();
})();
