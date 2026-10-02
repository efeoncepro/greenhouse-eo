// Arma las capas del rig 2.5D v2 (Engine) a 1600 px, todas del mismo tamaño y alineadas, y mide los pivotes.
// Entradas: el recorte con alfa (../spark-engine-sin-cara.png), las máscaras de mascaras.cjs y el relleno de la banda
// que tapaba el anillo (_comp-banda-1.png). Salida: engine/<capa>.png + pivotes.json.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const D = __dirname
const W = 1600
const G = { cx: 794, cy: 716, rx: 417, ry: 410 }
const er = (x, y) => Math.sqrt(((x - G.cx) / G.rx) ** 2 + ((y - G.cy) / G.ry) ** 2)
const load = async (f, ch) => sharp(path.join(D, f)).toColourspace('srgb')[ch === 1 ? 'greyscale' : 'ensureAlpha']().raw().toBuffer()
;(async () => {
  const cut = await load('../spark-engine-sin-cara.png', 4)
  const band = await sharp(path.join(D, '_comp-banda-1.png')).removeAlpha().raw().toBuffer()
  // v2.1: el cuerpo completo (lo que tapaban anillo y brazos, con las articulaciones de hombro) y el anillo completo
  // regenerado y aislado (anillo-completo-1-alfa.png): reemplazan el relleno de banda y el anillo recortado del render.
  const full = await sharp(path.join(D, 'cuerpo-completo-b-1.png')).removeAlpha().raw().toBuffer()
  const fullZone = await sharp(path.join(D, 'm-zona-cuerpo-2.png')).extractChannel(0).raw().toBuffer()
  // borde de la zona difuminado 4 px: el relleno se funde con el original sin costura de color
  const zoneSoft = await sharp(fullZone, { raw: { width: W, height: W, channels: 1 } }).blur(4).extractChannel(0).raw().toBuffer()
  const ringFull = await sharp(path.join(D, 'anillo-completo-1-alfa.png')).ensureAlpha().raw().toBuffer()
  let gray = [0, 0, 0]; for (let y = 1350; y < 1450; y++) for (let x = 1400; x < 1500; x++) for (let k = 0; k < 3; k++) gray[k] += full[(y * W + x) * 3 + k] / 10000
  const lineY = (x) => 650 + (625 - 650) * (x - 230) / (1435 - 230)
  const inSphere = (x, y, r) => (x - 1320) ** 2 + (y - 530) ** 2 < r ** 2
  const m = {}
  for (const k of ['cuerpo', 'anillo-atras', 'anillo-adelante', 'antena', 'brazo-izq', 'brazo-der', 'mano-izq', 'mano-der']) m[k] = await load(`m-${k}.png`, 1)
  const zone = await sharp(path.join(D, 'm-relleno.png')).greyscale().blur(7).threshold(10).blur(3).raw().toBuffer()
  const layer = () => Buffer.alloc(W * W * 4)
  const L = {}
  for (const k of Object.keys(m)) L[k] = layer()
  const put = (buf, i, r, g, b, a) => { buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = a }
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = cut[i * 4 + 3]
    for (const k of Object.keys(m)) if (m[k][i] > 127 && k !== 'cuerpo' && !k.startsWith('anillo')) put(L[k], i, cut[i * 4], cut[i * 4 + 1], cut[i * 4 + 2], a)
    // Anillo: del anillo completo; mitades solapadas en el corte (5 px) y en el borde de la esfera (8 px).
    const ra = ringFull[i * 4 + 3]
    if (ra > 0) {
      if (inSphere(x, y, 103) || y > lineY(x) - 5) put(L['anillo-adelante'], i, ringFull[i * 4], ringFull[i * 4 + 1], ringFull[i * 4 + 2], ra)
      if (!inSphere(x, y, 87) && y < lineY(x) + 5) put(L['anillo-atras'], i, ringFull[i * 4], ringFull[i * 4 + 1], ringFull[i * 4 + 2], ra)
    }
    const r = er(x, y)
    // Cuerpo en la zona regenerada: color del relleno, alfa por distancia al gris del fondo (despremultiplicado).
    if (fullZone[i] > 127) {
      const d = Math.max(...[0, 1, 2].map((k) => Math.abs(full[i * 3 + k] - gray[k])))
      const fa = Math.max(0, Math.min(1, (d - 10) / 26))
      const zs = zoneSoft[i] / 255
      if (zs < 0.97 && m.cuerpo[i] > 127 && a > 200) put(L.cuerpo, i, ...[0, 1, 2].map((k) => Math.round(cut[i * 4 + k] * (1 - zs) + full[i * 3 + k] * zs)), 255)
      else if (fa > 0) put(L.cuerpo, i, ...[0, 1, 2].map((k) => Math.max(0, Math.min(255, Math.round((full[i * 3 + k] - gray[k] * (1 - fa)) / fa)))), Math.round(fa * 255))
    } else {
      // Cuerpo fuera de la zona: el recorte original (el relleno de banda queda como respaldo bajo el anillo).
      const z = zone[i] / 255
      if (r < 0.997 && z > 0.01) {
        const base = m.cuerpo[i] > 127 ? [cut[i * 4], cut[i * 4 + 1], cut[i * 4 + 2]] : [band[i * 3], band[i * 3 + 1], band[i * 3 + 2]]
        put(L.cuerpo, i, ...[0, 1, 2].map((k) => Math.round(base[k] * (1 - z) + band[i * 3 + k] * z)), 255)
      } else if (m.cuerpo[i] > 127) {
        const zs = zoneSoft[i] / 255
        put(L.cuerpo, i, ...[0, 1, 2].map((k) => Math.round(cut[i * 4 + k] * (1 - zs) + full[i * 3 + k] * zs)), a)
      }
    }
    // Brazos: suman la parte navy de la articulación que queda dentro del borde del cuerpo, para que al girar el
    // brazo no aparezca un hueco.
    // Sólo cerca del hombro (≤ 80 px del pivote): más lejos son paneles oscuros del cuerpo que girarían con el brazo.
    const nearShoulder = Math.hypot(x - (x < G.cx ? 406 : 1189), y - 896) < 80
    if (y > 780 && r >= 0.9 && r < 1.01 && nearShoulder && a > 128) {
      const lum = 0.3 * cut[i * 4] + 0.59 * cut[i * 4 + 1] + 0.11 * cut[i * 4 + 2]
      if (lum < 95) put(L[x < G.cx ? 'brazo-izq' : 'brazo-der'], i, cut[i * 4], cut[i * 4 + 1], cut[i * 4 + 2], a)
    }
  }
  // Mano y brazo se solapan 6 px en la banda de la muñeca, para que al girar la mano no se abra una ranura.
  for (let y = 0; y < W; y++) for (let x = 316; x < 322; x++) { const i = y * W + x; if (L['brazo-izq'][i * 4 + 3] > 0) put(L['mano-izq'], i, cut[i * 4], cut[i * 4 + 1], cut[i * 4 + 2], cut[i * 4 + 3]) }
  for (let y = 0; y < W; y++) for (let x = 1274; x <= 1280; x++) { const i = y * W + x; if (L['brazo-der'][i * 4 + 3] > 0) put(L['mano-der'], i, cut[i * 4], cut[i * 4 + 1], cut[i * 4 + 2], cut[i * 4 + 3]) }
  fs.mkdirSync(path.join(D, 'engine'), { recursive: true })
  for (const [k, buf] of Object.entries(L)) await sharp(buf, { raw: { width: W, height: W, channels: 4 } }).png().toFile(path.join(D, 'engine', `${k}.png`))
  // Pivotes
  const centroid = (buf, pred) => { let sx = 0, sy = 0, n = 0; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (buf[i * 4 + 3] > 128 && pred(x, y)) { sx += x; sy += y; n++ } } return n ? [Math.round(sx / n), Math.round(sy / n)] : null }
  const piv = {
    size: W,
    body: G,
    shoulderL: centroid(L['brazo-izq'], (x, y) => er(x, y) >= 0.98 && er(x, y) < 1.1),
    shoulderR: centroid(L['brazo-der'], (x, y) => er(x, y) >= 0.98 && er(x, y) < 1.1),
    wristL: centroid(L['brazo-izq'], (x) => x >= 316 && x < 328),
    wristR: centroid(L['brazo-der'], (x) => x > 1268 && x <= 1280),
    ring: centroid(L['anillo-atras'], () => true) && (() => { const a = centroid(L['anillo-adelante'], (x, y) => (x - 1320) ** 2 + (y - 530) ** 2 > 95 ** 2), b = centroid(L['anillo-atras'], () => true); return [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)] })(),
    antenna: [794, 292],
    visor: { cx: 496, cy: 414, rx: 252, ry: 96, viewBox: 1000 }
  }
  fs.writeFileSync(path.join(D, 'pivotes.json'), JSON.stringify(piv, null, 2))
  console.log(piv)
})()
