// Foto de destino por pieza (Daniela, 2026-11-05): reemplaza la foto de la mujer del kit por la foto aprobada
// del destino (rutas foco Perú, «Vuela por el Perú» y AR Volá a Santiago / Volá a Lima). En el KV (src2):
// foto a sangre con el sujeto en el tercio derecho, degradado inferior y superior para el texto y, si el CSV lo
// pide, el crédito vertical en el borde derecho estilo marca de agua. compose.cjs usa cubrir() y credito() para
// el popup y la story. Uso: node destinos.cjs [HM_…]   (sin argumentos: todas las de fotos-destino.json)
const fs = require('fs');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, S2 = K + '/src2/KV X HM/';
const DEST = require(K + '/fotos-destino.json');
delete DEST._nota;

// Foto a W×H cubriendo, con el sujeto s=[x,y] (0-1) llevado a la posición t=[x,y] (0-1) del cuadro, sin salir de la foto.
// Zona libre para el sujeto (2026-11-05, tras la revisión de Julio): tercio derecho, entre el logo (arriba a la
// izquierda) y el bloque de precio (abajo a la derecha). Cada foto puede ajustar s, t y zoom por formato
// (`fmt` = kv | popup | story) con d.f[fmt] = { s, t, z }.
const T = { kv: [0.74, 0.47], popup: [0.74, 0.44], story: [0.7, 0.5] };
async function cubrir(n, W, H, fmt = 'kv') {
  const d = DEST[n], o = (d.f && d.f[fmt]) || {}, src = K + '/fotos-destino/' + (o.src || d.src);
  const s = o.s || d.s, t = o.t || T[fmt], z = o.z || 1;
  // drop (0-1): baja la foto esa fracción del alto y completa arriba con el cielo de la propia foto (degradado del
  // color de sus primeras filas). Sirve cuando una torre o estatua quedaría detrás del logo en formatos altos.
  const drop = o.drop || 0, D = Math.round(H * drop), Hf = H - D;
  const m = await sharp(src).metadata();
  const k = Math.max(W / m.width, Hf / m.height) * z, sw = Math.round(m.width * k), sh = Math.round(m.height * k);
  const tt = drop ? [t[0], Math.max(0, (t[1] * H - D) / Hf)] : t;
  const left = Math.min(Math.max(Math.round(s[0] * sw - tt[0] * W), 0), sw - W);
  // lift (0-1, quinta ronda, Iquitos): deja subir la foto hasta esa fracción del alto más allá de su borde inferior
  // y completa abajo con el reflejo vertical de sus últimas filas (agua). Esa franja cae bajo el degradado
  // inferior, la franja de precio y el pie; sirve cuando el atractivo está al pie de una foto horizontal.
  const L = Math.round(H * (o.lift || 0));
  const top = Math.min(Math.max(Math.round(s[1] * sh - tt[1] * Hf), 0), sh - Hf + L);
  const img = await sharp(src).resize(sw, sh, { kernel: 'lanczos3' }).removeAlpha().toBuffer();
  if (L && !D) {
    const h = Math.min(Hf, sh - top), gap = Hf - h;
    const parte = await sharp(img).extract({ left, top, width: W, height: h }).toBuffer();
    if (!gap) return parte;
    const espejo = await sharp(parte).extract({ left: 0, top: h - gap, width: W, height: gap }).flip().toBuffer();
    return sharp({ create: { width: W, height: Hf, channels: 3, background: '#000' } })
      .composite([{ input: parte, left: 0, top: 0 }, { input: espejo, left: 0, top: h }]).png().toBuffer();
  }
  const foto = await sharp(img).extract({ left, top, width: W, height: Hf }).toBuffer();
  if (!D) return foto;
  // Cielo: color medio de la franja superior (8 %) de la foto recortada; arriba un poco más profundo.
  // Sólo píxeles de cielo de la franja superior (azulados y claros); si no hay, el promedio de la franja.
  const bh = Math.max(8, Math.round(Hf * 0.12));
  const px = await sharp(foto).extract({ left: 0, top: 0, width: W, height: bh }).raw().toBuffer();
  let sr = 0, sg = 0, sb = 0, nc = 0, ar = 0, ag = 0, ab = 0;
  for (let i = 0; i < px.length; i += 3) {
    const R = px[i], G = px[i + 1], B = px[i + 2]; ar += R; ag += G; ab += B;
    if (B > R + 12 && B >= G && 0.299 * R + 0.587 * G + 0.114 * B > 95) { sr += R; sg += G; sb += B; nc++; }
  }
  const tot = px.length / 3, ok = nc > tot * 0.04;
  const r = ok ? sr / nc : ar / tot, g = ok ? sg / nc : ag / tot, b = ok ? sb / nc : ab / tot, hex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  // Cielo natural: abajo el color de la foto (si es muy claro, nubes, se lleva un poco hacia el azul medio del KV
  // original #6a8fae); arriba más profundo, como el cénit, para que el antetítulo y las fechas blancas se lean.
  const mix = (a, bb, k) => a + (bb - a) * k, lum = 0.299 * r + 0.587 * g + 0.114 * b, kc = lum > 175 ? 0.35 : 0;
  const R1 = mix(r, 0x6a, kc), G1 = mix(g, 0x8f, kc), B1 = mix(b, 0xae, kc);
  const c1 = '#' + hex(R1) + hex(G1) + hex(B1), c0 = '#' + hex(mix(R1, 0x3d, 0.45)) + hex(mix(G1, 0x6c, 0.45)) + hex(mix(B1, 0x9a, 0.45));
  const F = Math.min(220, Math.round(Hf * 0.18)); // fundido de la foto sobre el cielo
  const cielo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="c" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><rect width="${W}" height="${D + F}" fill="url(#c)"/><rect y="${D + F - 1}" width="${W}" height="${H - D - F + 1}" fill="${c1}"/></svg>`);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hf}"><defs><linearGradient id="m" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${F / Hf}" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect width="${W}" height="${Hf}" fill="url(#m)"/></svg>`);
  const alfa = await sharp(mask).extractChannel('alpha').toBuffer();
  const fotoA = await sharp(foto).joinChannel(alfa).png().toBuffer();
  return sharp(cielo).flatten().composite([{ input: fotoA, left: 0, top: D }]).removeAlpha().toBuffer();
}
// Velo del logo (Daniela, 2026-11-05, KV Lima): el degradado plano de 20 % a 0 cruzaba todo el ancho, apagaba
// elementos de la foto a la derecha y no aseguraba el contraste del logo cuando el cielo es claro. Ahora es un
// degradado diagonal que nace en la esquina superior izquierda (donde va el logo) y se apaga antes de llegar al
// tercio derecho, con una caída suavizada (sin borde ni mancha). Su intensidad se calcula por foto y formato:
// se mide la luz detrás del logo (percentil 80 de la luminancia en su caja) y se oscurece lo justo para llevarla
// a ~105, entre 16 % y 50 %. Fotos oscuras reciben casi nada; cielos blancos, lo necesario.
async function veloAlfa(foto, box) {
  const [x0, y0, x1, y1] = box;
  const px = await sharp(foto).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).removeAlpha().raw().toBuffer();
  const h = new Array(256).fill(0); let n = 0;
  for (let i = 0; i < px.length; i += 3) { h[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++; n++; }
  let acc = 0, L = 255; for (let v = 0; v < 256; v++) { acc += h[v]; if (acc >= n * 0.8) { L = v; break; } }
  const a = L <= 105 ? 0.16 : (L - 105) / (L - 22);
  return { L, a: Math.round(Math.min(0.5, Math.max(0.16, a)) * 100) / 100 };
}
// Caja del logo y recorrido del velo por formato: el velo va de (gx1,gy1) a (gx2,gy2) en píxeles del formato.
const VELO = {
  kv: { box: [60, 40, 700, 330], g: [0, 0, 0.9, 0.5] },
  popup: { box: [60, 40, 700, 330], g: [0, 0, 0.9, 0.55] },
  story: { box: [60, 250, 870, 600], g: [0, 0.08, 0.95, 0.55] }
};
// Quinta ronda (Daniela, 2026-11-05, «GRAFICOS/Gradiente para imagenes/Fade_img_horizontal.svg»): reemplaza al
// velo diagonal adaptativo. Es su gradiente tal cual: negro puro, 69 % de opacidad en el borde superior y caída
// lineal (dos paradas) hasta 0 en el borde inferior, estirado al alto completo de cada formato. El kit trae
// además Fade_img_abajo (oscuro abajo) y Fade_img (oscuro a la izquierda). `a` queda medido sólo como registro.
const FADE = 0.69;
const stops = () => `<stop offset="0" stop-color="#000" stop-opacity="${FADE}"/><stop offset="1" stop-color="#000" stop-opacity="0"/>`;
// El largo se corta poco después del logo (2026-11-05, Julio: a todo el alto tapaba caras y monumentos): el logo
// ocupa hasta y≈0,24 (KV), 0,30 (popup) y 0,31 (story); el fade termina en FADE_FIN[fmt] y deja limpio el sujeto.
const FADE_FIN = { kv: 0.42, popup: 0.5, story: 0.46 };
function veloSvg(W, H, fmt = 'kv') {
  return `<linearGradient id="lf-cielo-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${Math.round(H * FADE_FIN[fmt])}">${stops()}</linearGradient>`;
}
async function velo(n, foto, W, H, fmt) {
  const { a } = await veloAlfa(foto, VELO[fmt].box);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${veloSvg(W, H, fmt, a)}</defs><rect width="${W}" height="${H}" fill="url(#lf-cielo-g)"/></svg>`);
}
// Crédito tipo marca de agua (Daniela, 2026-11-05): horizontal, pequeño, esquina superior izquierda y sin sombra.
// size: 12 en KV y popup; 18 en la story (Daniela, Frame 2026-11-05: «la marca de agua de PromPerú está muy pequeña»).
function credito(n, W, H, y, size = 12) {
  const c = DEST[n] && DEST[n].cred; if (!c) return null;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><text x="40" y="${y}" font-family="Metric, Metric-Regular, Helvetica" font-size="${size}" letter-spacing=".3" fill="#fff" fill-opacity=".75">${c.replace(/&/g, '&amp;')}</text></svg>`);
}
module.exports = { cubrir, credito, velo, veloAlfa, DEST };

if (require.main === module) (async () => {
  const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
  const { PAGE, CSV, PP, FONTS, ORIGEN } = require(K + '/rutas.cjs');
  const pp = fs.readFileSync(PP).toString('base64');
  const only = process.argv.slice(2);
  const b = await chromium.launch();
  for (const n of Object.keys(DEST).filter((x) => !only.length || only.includes(x))) {
    const d = DEST[n], f = S2 + n + '.svg';
    let svg = fs.readFileSync(f, 'utf8');
    const fotoBuf = await cubrir(n, 1080, 1350, 'kv'), va = await veloAlfa(fotoBuf, VELO.kv.box);
    const foto = (await sharp(fotoBuf).jpeg({ quality: 90 }).toBuffer()).toString('base64'), veloDef = veloSvg(1080, 1350, 'kv', va.a);
    fs.writeFileSync(K + '/_de.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}</style>${svg.replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + K + '/_de.html');
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(([foto, sombra, cred, veloDef]) => {
      const NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink', svg = document.querySelector('svg');
      let img = document.getElementById('lf-foto-destino'), estado = 'actualizada';
      if (!img) {
        // La foto del kit es <use href="#image"> recortada al lienzo (clippath). Se reemplaza por la del destino.
        // La copia a reemplazar es la que tiene el recorte que más cubre el lienzo (en las variantes no es la primera).
        const area = (e) => { const g = e.closest('[clip-path]'); const id = g && (g.getAttribute('clip-path').match(/#([^)]+)/) || [])[1];
          const rc = id && document.getElementById(id) && document.getElementById(id).querySelector('rect'); if (!rc) return 0;
          const x = +rc.getAttribute('x'), y = +rc.getAttribute('y'), w = +rc.getAttribute('width'), h = +rc.getAttribute('height');
          return Math.max(0, Math.min(1080, x + w) - Math.max(0, x)) * Math.max(0, Math.min(1350, y + h) - Math.max(0, y)); };
        // En HM_US_KV la foto del kit no es un <use>: viene incrustada como <image> 1672×941 (novena ronda, 2026-11-06).
        const cand = [...svg.querySelectorAll('use, image')].filter((e) => (e.tagName === 'use' ? (e.getAttribute('xlink:href') || e.getAttribute('href')) === '#image' : e.getAttribute('width') === '1672' && e.getAttribute('height') === '941') && !e.closest('defs') && area(e) > 0).sort((a, b) => area(b) - area(a));
        const u = cand[0];
        if (!u) return { error: 'sin foto del kit' };
        img = document.createElementNS(NS, 'image'); img.id = 'lf-foto-destino';
        for (const [k, v] of Object.entries({ x: 0, y: 0, width: 1080, height: 1350, preserveAspectRatio: 'none' })) img.setAttribute(k, v);
        u.replaceWith(img); estado = 'reemplazada';
        // Degradados: inferior (destino, precio y pie) y superior (antetítulo y fechas), como el fondo oscuro de la foto original.
        const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
        defs.insertAdjacentHTML('beforeend', '<linearGradient id="lf-piso-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient>'
          + veloDef
          + '<radialGradient id="lf-logo-g"><stop offset="0" stop-color="#0b1a2e" stop-opacity=".5"/><stop offset=".55" stop-color="#0b1a2e" stop-opacity=".3"/><stop offset="1" stop-color="#0b1a2e" stop-opacity="0"/></radialGradient>'
          + '<linearGradient id="lf-sombra-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".5" stop-color="#000" stop-opacity=".18"/><stop offset=".8" stop-color="#000" stop-opacity="0"/></linearGradient>');
        let ins = img;
        const add = (html) => { ins.insertAdjacentHTML('afterend', html); ins = ins.nextElementSibling; };
        // Gradiente del logo (veloSvg): el Fade de Daniela, negro 69 % arriba → 0 abajo a todo el alto.
        add('<rect id="lf-cielo" x="0" y="0" width="1080" height="1350" fill="url(#lf-cielo-g)"/>');
        add('<rect id="lf-piso" x="0" y="760" width="1080" height="590" fill="url(#lf-piso-g)"/>');
        if (sombra) add('<rect id="lf-sombra" x="0" y="0" width="1080" height="1350" fill="url(#lf-sombra-g)"/>');
      }
      img.setAttributeNS(XL, 'xlink:href', 'data:image/jpeg;base64,' + foto);
      // Al re-correr sobre un KV ya procesado, el velo se recalcula con la foto y el encuadre vigentes.
      const vg = document.getElementById('lf-cielo-g'); if (vg && estado === 'actualizada') vg.outerHTML = veloDef;
      // Algunos KV del kit repiten la foto en otro grupo recortado al lienzo (p. ej. «-3» en AR y Perú): si su
      // recorte cae dentro del lienzo, taparía la foto del destino con la de la mujer. Se ocultan.
      let ocultas = 0;
      for (const u of [...svg.querySelectorAll('use')].filter((e) => (e.getAttribute('xlink:href') || e.getAttribute('href')) === '#image' && !e.closest('defs'))) {
        const g = u.closest('[clip-path]'); const id = g && (g.getAttribute('clip-path').match(/#([^)]+)/) || [])[1];
        const rc = id && document.getElementById(id) && document.getElementById(id).querySelector('rect');
        if (!rc) continue;
        const x = +rc.getAttribute('x'), y = +rc.getAttribute('y'), w = +rc.getAttribute('width'), h = +rc.getAttribute('height');
        if (x < 1080 && x + w > 0 && y < 1350 && y + h > 0) { u.setAttribute('display', 'none'); ocultas++; }
      }
      const old = document.getElementById('lf-credito'); if (old) old.remove();
      if (cred) svg.insertAdjacentHTML('beforeend', `<text id="lf-credito" data-capa="base" x="40" y="34" font-family="Metric-Regular, Metric" font-size="12" letter-spacing=".3" fill="#fff" fill-opacity=".75">${cred.replace(/&/g, '&amp;')}</text>`);
      return { estado, ocultas };
    }, [foto, !!d.sombra, d.cred || '', veloDef]);
    r.velo = va;
    if (r.error) throw new Error(n + ': ' + r.error);
    // «Vuela por el Perú» (fila del CSV): legal, origen, PromPerú y ubicación como en las rutas.
    if (d.promperu && !svg.includes('id="ruta"')) {
      const row = CSV.find((x) => x.d === 'Vuela por el Perú');
      r.legal = await p.evaluate(PAGE.legal, row.legal);
      r.origen = await p.evaluate(PAGE.origen, ORIGEN);
      await p.evaluate(PAGE.alianza, [pp, row.ubic]);
    }
    const out = await p.evaluate(() => { const s = document.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); return new XMLSerializer().serializeToString(s); });
    await p.close();
    fs.writeFileSync(f, '<?xml version="1.0" encoding="UTF-8"?>\n' + out);
    console.log(n, JSON.stringify(r));
  }
  await b.close();
})();
