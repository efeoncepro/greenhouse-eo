// Adapta cada KV 1080x1350 a popup 1080x1080 y story 1080x1920 recomponiendo sus partes.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const PARTS = __dirname + '/parts/', OUT = __dirname + '/formatos/';
const SRC = __dirname + '/foto-fuente.png'; // 1672x941, se usa espejada como en el SVG
const only = process.argv.slice(2);
// Foto de destino por pieza (destinos.cjs, 2026-11-05): reemplaza a la mujer del kit donde corresponda.
const { cubrir, credito, velo, DEST } = require(__dirname + '/destinos.cjs');
// Regla destino ↔ flecha de precio (brecha.cjs): en popup y story el bloque se reescala, así que se vuelve a medir.
const { BRECHA } = require(__dirname + '/brecha.cjs');
async function bbox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// Coloca una parte (lienzo 1080x1350) con escala s alrededor del ancla (ax, ay) llevada a (bx, by).
async function place(file, s, ax, ay, bx, by) {
  const b = await bbox(file);
  const img = await sharp(file).extract({ left: b.x, top: b.y, width: b.w, height: b.h }).resize(Math.round(b.w * s), Math.round(b.h * s), { kernel: 'lanczos3' }).toBuffer();
  return { input: img, left: Math.round(bx + (b.x - ax) * s), top: Math.round(by + (b.y - ay) * s) };
}
// Foto: fuente espejada a escala s; (X0, Y0) = posición de u=0 (borde derecho espejado) y v=0.
async function foto(s, X0, Y0, W, H) {
  const sw = Math.round(1672 * s), sh = Math.round(941 * s);
  const img = await sharp(SRC).flop().resize(sw, sh, { kernel: 'lanczos3' }).removeAlpha().toBuffer();
  const left = Math.round(X0 - sw), top = Math.round(Y0);
  return sharp(img).extract({ left: -left, top: -top, width: W, height: H }).toBuffer();
}
// Oscurecido lateral de los clústeres (en el KV baja hasta ~-31 de luz a la izquierda).
function sombra(W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".45" stop-color="#000" stop-opacity=".2"/><stop offset=".75" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
  return Buffer.from(svg);
}
// Degradado inferior: en el KV el pie va sobre el primer plano oscuro de la foto; al reencuadrar,
// el legal cae sobre el pantalón de la mujer y pierde contraste. Este degradado repone ese fondo.
// c: color del degradado. #2a1608 (tierra) en los KV del kit; negro en las piezas con foto de destino (Daniela, Teams
// 2026-11-05: «el gradiente marrón de abajo lo dejaría en negro»).
function piso(W, H, y0, y1, a, c = '#2a1608') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="0" y1="${y0 / H}" y2="${y1 / H}"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset="1" stop-color="${c}" stop-opacity="${a}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
  return Buffer.from(svg);
}
// Story: el bloque va a escala 1 (como en el KV); la flecha se corre sólo si la brecha supera BRECHA.
async function correStory(n) {
  if (!has(n, 'destino') || !has(n, 'precio')) return 0;
  const db = await bbox(P(n, 'destino')), pb = await bbox(P(n, 'precio'));
  return Math.max(0, pb.x - (db.x + db.w) - BRECHA);
}
const has = (n, l) => fs.existsSync(PARTS + n + '__' + l + '.png');
const P = (n, l) => PARTS + n + '__' + l + '.png';
(async () => {
  const names = fs.readdirSync(PARTS).filter((f) => f.endsWith('__base.png')).map((f) => f.split('__')[0]).filter((n) => !only.length || only.includes(n)).sort();
  for (const n of names) {
    const cluster = n.includes('CLUSTER') || n === 'HM_CL_KV_ENCUENTRA';
    // ---------- POPUP 1080x1080 ----------
    {
      const W = 1080, H = 1080, comp = [];
      if (cluster) comp.push({ input: sombra(W, H), left: 0, top: 0 });
      comp.push({ input: piso(W, H, 800, 1080, 0.78), left: 0, top: 0 });
      // Bloque comercial a 0,88 con el precio terminando en y=938: deja 32 px de aire sobre el pie (en el KV son 20).
      const s = 0.88, PB = 938;
      if (n === 'HM_CL_KV_DOM_CLUSTER') {
        // Clúster nacional: la lista se reordena en 3 columnas (Norte 6 · Sur 6 · Sur 3) para ganar tamaño:
        // pasa de 2 columnas al 78 % a 3 columnas al 90 %, y el destino vuelve al 88 % como en los demás popups.
        comp.push(await place(P(n, 'logo'), 1, 0, 0, 0, 0));
        const SL = 0.9, X = 70, Y0 = 282, pitch = 202;
        const lista = P(n, 'lista');
        const corte = async (x, y, w, h) => sharp(lista).extract({ left: x, top: y, width: w, height: h }).resize(Math.round(w * SL), Math.round(h * SL), { kernel: 'lanczos3' }).toBuffer();
        // [x, y, ancho, alto] en el KV → columna destino (0, 1, 2) y desplazamiento vertical.
        const piezas = [
          [80, 300, 200, 388, 0, 0],        // NORTE: encabezado + 6 destinos
          [282, 300, 210, 388, 1, 0],       // SUR: encabezado + Concepción…Castro
          [282, 693, 210, 168, 2, 362 - 300] // SUR: Balmaceda, Pto. Natales, Punta Arenas, alineados con la 1.ª fila
        ];
        for (const [x, y, w, h, col, dy] of piezas) {
          const ox = col === 0 ? 0 : x - 286; // conserva el sangrado de cada recorte respecto de la foto
          comp.push({ input: await corte(x, y, w, h), left: Math.round(X + (col * pitch + (col === 0 ? x - 84 : x - 286)) * SL), top: Math.round(Y0 + dy * SL) });
        }
        comp.push(await place(P(n, 'destino'), s, 62, 1220, 62, PB));
      } else if (n === 'HM_CL_KV_INTER_CLUSTER' || n === 'HM_CL_KV_ENCUENTRA') {
        comp.push(await place(P(n, 'logo'), 1, 0, 0, 0, 0));
        comp.push(await place(P(n, 'lista'), 0.84, 67, 366, 67, 338));
      } else if (has(n, 'lista')) {
        // Lista de banderas o regiones bajo el logo (variantes 2026-11-04): se escala para caber entre
        // el logo (termina en ~322) y el destino (empieza en ~684), con aire parejo arriba y abajo.
        comp.push(await place(P(n, 'logo'), 1, 0, 0, 0, 0));
        const lb = await bbox(P(n, 'lista')), top = 336, bot = 664;
        const sl = Math.min(1, (bot - top) / lb.h);
        comp.push(await place(P(n, 'lista'), sl, lb.x, lb.y, lb.x, Math.round(top + ((bot - top) - lb.h * sl) / 2)));
        comp.push(await place(P(n, 'destino'), s, 62, 1220, 62, PB));
      } else {
        comp.push(await place(P(n, 'logo'), 1, 0, 0, 0, 0));
        comp.push(await place(P(n, 'destino'), s, 62, 1220, 62, PB));
      }
      // Regla de separación: la flecha (y el badge) se corren a la izquierda hasta dejar BRECHA px tras el destino.
      let corre = 0;
      if (has(n, 'destino')) {
        const db = await bbox(P(n, 'destino')), pb = await bbox(P(n, 'precio'));
        corre = Math.max(0, Math.round((1044 + (pb.x - 1044) * s) - (62 + (db.x + db.w - 62) * s) - BRECHA));
      }
      comp.push(await place(P(n, 'precio'), s, 1044, 1220, 1044 - corre, PB));
      comp.push(await place(P(n, 'badge'), s, 1044, 1220, 1044 - corre, PB));
      comp.push(await place(P(n, 'pie'), 1, 0, 1240, 0, 972));
      if (has(n, 'alianza')) {
        comp.push(await place(P(n, 'alianza'), 1, 0, 0, 0, 0));
        if (has(n, 'ubicacion')) comp.push(await place(P(n, 'ubicacion'), 1, 0, 0, 0, 0));
      }
      const bg = DEST[n] ? await cubrir(n, W, H, 'popup') : await foto(1.45, 1782, -154 * 1.45, W, H); // mujer al 80 % del KV, cabeza en y≈260
      if (DEST[n]) comp.unshift({ input: await velo(n, bg, W, H, 'popup'), left: 0, top: 0 }, { input: piso(W, H, ...((DEST[n].f && DEST[n].f.popup && DEST[n].f.popup.piso) || [560, 1080, 0.62]), '#000'), left: 0, top: 0 });
      const cp = credito(n, W, H, 34); if (cp) comp.push({ input: cp, left: 0, top: 0 });
      await sharp(bg).composite(comp).png().toFile(OUT + n + '__popup.png');
    }
    // ---------- STORY 1080x1920 ----------
    {
      const W = 1080, H = 1920, comp = [];
      // Zonas seguras de story (~270 px arriba y abajo, donde Instagram pone perfil y respuesta).
      // El logo arranca en y≈270; el bloque comercial y el pie bajan 350 px para que el pie termine
      // en ~1655 y el rostro quede libre entre el logo y el precio.
      const DL = 250, DB = 350;
      if (cluster) comp.push({ input: sombra(W, H), left: 0, top: 0 });
      if (n === 'HM_CL_KV_DOM_CLUSTER') {
        // Clúster nacional: el bloque comercial y el pie bajan 80 px más (pie hasta ~1735) para que
        // la lista de regiones crezca al 115 % y quede centrada entre el logo y el destino.
        const DB2 = DB + 80;
        comp.push({ input: piso(W, H, 1440, 1740, 0.82), left: 0, top: 0 });
        for (const l of ['precio', 'destino', 'badge', 'pie']) comp.push(await place(P(n, l), 1, 0, 0, 0, DB2));
        const lb = await bbox(P(n, 'logo')), logoFin = 270 + lb.h * 1.3, destinoIni = 935 + DB2;
        const alto = 549 * 1.15, y0 = Math.round(logoFin + (destinoIni - logoFin - alto) / 2);
        comp.push(await place(P(n, 'lista'), 1.15, 84, 309, 84, y0));
      } else if (has(n, 'ubicacion')) {
        // Stories con PromPerú (rutas foco y «Vuela por el Perú», comentario de Daniela 2026-11-05): el pie
        // (puntualidad + legales) baja PIE px y PromPerú va entre la franja de precio y el pie; la ubicación de
        // la foto va sola arriba a la derecha.
        const PIE = 115;
        comp.push({ input: piso(W, H, 1380, 1800, 0.85), left: 0, top: 0 });
        for (const l of ['lista', 'destino']) if (has(n, l)) comp.push(await place(P(n, l), 1, 0, 0, 0, DB));
        const corre = await correStory(n);
        for (const l of ['precio', 'badge']) comp.push(await place(P(n, l), 1, 0, 0, -corre, DB));
        comp.push(await place(P(n, 'pie'), 1, 0, 0, 0, DB + PIE));
        const pb = await bbox(P(n, 'precio')), qb = await bbox(P(n, 'pie')), ab = await bbox(P(n, 'alianza'));
        const fin = pb.y + pb.h + DB, ini = qb.y + DB + PIE, sa = 1.2;
        // PromPerú centrado en la story (Daniela, 2026-11-05: «deben estar centrados en todas las stories»).
        comp.push(await place(P(n, 'alianza'), sa, ab.x + ab.w / 2, ab.y, 540, Math.round(fin + (ini - fin - ab.h * sa) / 2)));
        // Ubicación de la foto completa en la esquina superior derecha (Daniela, 2026-11-05), pegada arriba y a la
        // misma altura que la marca de agua del lado izquierdo («los watermark siempre arriba pegado y la ubicación
        // de al lado igual»): margen lateral 40 como el crédito.
        const ub = await bbox(P(n, 'ubicacion'));
        comp.push(await place(P(n, 'ubicacion'), 1.1, ub.x + ub.w, ub.y, 1080 - 40, 22));
      } else {
        comp.push({ input: piso(W, H, 1360, 1660, 0.82), left: 0, top: 0 });
        const corre = await correStory(n);
        for (const l of ['lista', 'precio', 'destino', 'badge', 'pie']) if (has(n, l)) comp.push(await place(P(n, l), 1, 0, 0, l === 'precio' || l === 'badge' ? -corre : 0, DB));
      }
      // Logo de story al 130 %: en 1080×1920 el logo del KV queda chico en proporción al alto.
      // Se ancla por su esquina superior izquierda en (x del KV, 270), justo bajo la zona segura.
      const lb = await bbox(P(n, 'logo'));
      comp.push(await place(P(n, 'logo'), 1.3, lb.x, lb.y, lb.x, 270));
      if (has(n, 'alianza') && !has(n, 'ubicacion')) {
        // Alianza al margen derecho, a la altura del marco del BLACK: con el logo al 130 % el avión
        // llega a x≈925 y una alianza arriba lo tocaría; bajo el avión queda sobre cielo limpio.
        const ab = await bbox(P(n, 'alianza'));
        // Alianza pegada al borde en el KV (Chile Travel): va pegada a la esquina superior derecha también acá.
        if (ab.y <= 2 && ab.x + ab.w >= 1078) comp.push(await place(P(n, 'alianza'), 1.1, ab.x + ab.w, 0, 1080, 0));
        else comp.push(await place(P(n, 'alianza'), 1.1, ab.x + ab.w, ab.y, 1080 - 48, 500));
      }
      const bg = DEST[n] ? await cubrir(n, W, H, 'story') : await foto(2.04, 2198, 0, W, H); // la fuente cubre 1920 de alto a 2,04 (113 % del KV)
      if (DEST[n]) comp.unshift({ input: await velo(n, bg, W, H, 'story'), left: 0, top: 0 }, { input: piso(W, H, ...((DEST[n].f && DEST[n].f.story && DEST[n].f.story.piso) || [1000, 1720, 0.62]), '#000'), left: 0, top: 0 });
      // Marca de agua pegada arriba también en la story (Daniela, 2026-11-05), como en KV y popup.
      const cs = credito(n, W, H, 40, 18); if (cs) comp.push({ input: cs, left: 0, top: 0 });
      await sharp(bg).composite(comp).png().toFile(OUT + n + '__story.png');
    }
    console.log(n);
  }
})();
