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
// Rutas foco de Perú agrupadas por región para «Vuela por el Perú». Novena ronda (Daniela, 2026-11-06, referencia
// adjunta en Frame y Teams): tres columnas COSTA / SIERRA / SELVA, cada destino con su miniatura redonda (la foto
// aprobada de su ruta foco; Pto. Maldonado sale del banco de SKY) en vez del punto verde.
const PERU = {
  COSTA: [['Talara', 'TALARA_POCITAS.png'], ['Piura', 'PIURA_VICHAYITO.png'], ['Chiclayo', 'CHICLAYO.png'], ['Tumbes', 'TUMBES.png'], ['Trujillo', 'TRUJILLO.png'], ['Tacna', 'TACNA.png']],
  SIERRA: [['Cajamarca', 'CAJAMARCA.png'], ['Jauja', 'JAUJA.png'], ['Ayacucho', 'AYACUCHO.png'], ['Cusco', 'CUSCO.png'], ['Juliaca', 'JULIACA.png'], ['Arequipa', 'AREQUIPA.png']],
  SELVA: [['Iquitos', 'IQUITOS.png'], ['Pto Maldonado', 'PTO_MALDONADO.png'], ['Pucallpa', 'PUCALLPA.png'], ['Tarapoto', 'TARAPOTO.png']]
};
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const V = {
  // Novena ronda (Daniela, Frame): el genérico de Perú internacional dice «Vuela internacional» por ahora, no
  // «Vuela a Calama» (texto de relleno del kit). Va primero: HM_PE_KV_ENCUENTRA nace de este archivo.
  HM_PE_KV_INTER_BANDERAS: { base: 'HM_PE_KV_INTER_BANDERAS.svg', t: [['VUELA A', 'VUELA'], ['Calama', 'Internacional', 62], ['Internacional', 'Internacional', 62]] },
  // Novena ronda (Daniela, Frame): origen «Buenos Aires» provisorio en Volá a Santiago (popup y GIF); la píldora se
  // alarga hacia la derecha lo que crece el texto, con el mismo aire a cada lado.
  HM_AR_KV_SANTIAGO: { base: 'HM_AR_KV.svg', t: [['VOLÁ', 'VOLÁ A'], ['Internacional', 'Santiago']], origen: 'DESDE BUENOS AIRES' },
  HM_AR_KV_LIMA: { base: 'HM_AR_KV.svg', t: [['VOLÁ', 'VOLÁ A'], ['Internacional', 'Lima']] },
  HM_BR_KV_SANTIAGO: { base: 'HM_BR_KV.svg', t: [['Internacional', 'Santiago']], alianza: 'chileTravel' },
  HM_BR_KV_PERU: { base: 'HM_BR_KV.svg', t: [['VOE A', 'VOE PARA'], ['Internacional', 'Peru']], alianza: 'promperuFuera' },
  HM_CL_KV_ENCUENTRA: { base: 'HM_CL_KV_INTER_CLUSTER.svg', t: [['VUELA', 'ENCUENTRA'], ['Internacional', 'Destinos']] },
  HM_PE_KV_ENCUENTRA: { base: 'HM_PE_KV_INTER_BANDERAS.svg', t: [['VUELA', 'ENCUENTRA'], ['Internacional', 'Destinos', 90]] },
  HM_PE_KV_DOM_REGIONES: { base: 'HM_PE_KV_DOM.svg', t: [['VUELA A', 'VUELA POR EL'], ['Calama', 'Perú'], ['Precio final con tasas incluidas.', 'Final tramo [destino]–[origen].\nTasas e impuestos incluidos.']], regiones: PERU }
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
    const res = await p.evaluate((t) => t.map(([de, a, fs]) => {
      const el = [...document.querySelectorAll('text')].find((e) => e.textContent.trim() === de);
      if (!el) return de + ': NO';
      if (fs) el.setAttribute('font-size', fs); // tercer elemento opcional: cuerpo del texto nuevo
      const ts = el.querySelectorAll('tspan');
      if (a.includes('\n')) {
        // Dos líneas: se reescribe en tspans con interlineado 31 y el bloque sube 14 px para quedar centrado.
        el.innerHTML = a.split('\n').map((l, i) => `<tspan x="0" y="${i * 31}">${l}</tspan>`).join('');
        el.setAttribute('transform', el.getAttribute('transform').replace(/translate\(([\d.-]+)[ ,]+([\d.-]+)\)/, (m, x, y) => `translate(${x} ${(+y - 14).toFixed(2)})`));
        return de + ' → ' + a.replace('\n', ' / ');
      }
      if (ts.length) { ts[0].textContent = a; for (let i = 1; i < ts.length; i++) ts[i].remove(); } else el.textContent = a;
      return de + ' → ' + a;
    }), cfg.t);
    if (cfg.origen) res.push(await p.evaluate((txt) => {
      const el = [...document.querySelectorAll('text')].find((e) => e.textContent.replace(/\s+/g, ' ').trim() === 'DESDE [ORIGEN]');
      if (!el) return 'origen: NO';
      const w0 = el.getBBox().width; el.textContent = txt; el.setAttribute('font-size', '25'); const dw = el.getBBox().width - w0;
      const pill = [...document.querySelectorAll('path')].find((e) => /^M61\.83,1132\.41c0-17\.67,14\.33-32,32-32h231/.test(e.getAttribute('d') || ''));
      if (!pill) return 'origen: sin píldora';
      pill.setAttribute('d', pill.getAttribute('d').replace('h231', 'h' + (231 + dw).toFixed(2)));
      return 'origen → ' + txt + ' (+' + Math.round(dw) + ' px)';
    }, cfg.origen));
    let add = '';
    if (cfg.alianza) {
      // Logo de la alianza arriba a la derecha, sobre el cielo y lejos del avión y del rostro.
      // Chile Travel (Marca Chile) es una pestaña que cuelga del borde: va pegada a la esquina superior derecha,
      // alineada con los bordes de la imagen, en todas las aplicaciones (Daniela, 2026-11-05).
      const L = logo[cfg.alianza], pegado = cfg.alianza === 'chileTravel', h = pegado ? 150 : 104, w = L.w * h / L.h;
      add += `<image x="${(pegado ? 1080 - w : 1080 - 48 - w).toFixed(1)}" y="${pegado ? 0 : 52}" width="${w.toFixed(1)}" height="${h}" href="data:image/svg+xml;base64,${L.b64}"/>`;
    }
    if (cfg.regiones) {
      // Tres columnas bajo el logo (referencia de Daniela): encabezado con el ícono de flecha del antetítulo y, por
      // destino, una miniatura redonda con borde blanco fino y el nombre al lado.
      const icono = (x, y) => `<g transform="translate(${x - 84.09} ${y - 935.16})"><path d="M84.09,947.16c0-6.63,5.37-12,12-12h16c6.63,0,12,5.37,12,12v16c0,6.63-5.37,12-12,12h-16c-6.63,0-12-5.37-12-12v-16Z" fill="#c5fcba"/><path d="M114.54,954.41c.42,0,.75.34.75.75s-.33.75-.75.75h-20.89c-.41,0-.75-.34-.75-.75s.34-.75.75-.75h20.89Z" fill="#671e75"/><path d="M107.58,948.2c.29-.29.77-.29,1.06,0l6.43,6.43c.29.29.29.77,0,1.06l-6.43,6.43c-.29.29-.77.29-1.06,0-.29-.29-.29-.77,0-1.06l5.9-5.9-5.9-5.9c-.29-.29-.29-.77,0-1.06Z" fill="#671e75"/></g>`;
      const X = [84, 262, 446], Y0 = 368, R = 27, PITCH = 74;
      let c = 0;
      for (const [zona, destinos] of Object.entries(cfg.regiones)) {
        const x = X[c++];
        add += icono(x, Y0) + `<text x="${x + 54}" y="${Y0 + 30}" fill="#fefefe" font-family="Metric-Bold, Metric" font-weight="700" font-size="30" letter-spacing=".5">${zona}</text>`;
        for (const [i, [ci, foto]] of destinos.entries()) {
          const cy = Y0 + 96 + i * PITCH, cx = x + R;
          const th = (await sharp(K + '/fotos-destino/' + foto).resize(160, 160, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 86 }).toBuffer()).toString('base64');
          const id = 'lf-mini-' + ci.replace(/[^A-Za-z]/g, '');
          add += `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><image x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${2 * R}" clip-path="url(#${id})" href="data:image/jpeg;base64,${th}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6"/>`;
          add += `<text x="${x + 2 * R + 14}" y="${cy + 9}" fill="#fefefe" font-family="Metric-Semibold, Metric" font-weight="600" font-size="26">${ci}</text>`;
        }
      }
    }
    if (add) await p.evaluate((add) => document.querySelector('svg').insertAdjacentHTML('beforeend', `<g id="variante">${add}</g>`), add);
    const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(S2 + name + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    console.log(name, res.join(' | '));
  }
  await b.close();
})();
