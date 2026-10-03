// Separa el elenco 2D en piezas sin fondo desde las hojas transparentes (sin-fondo/, GPT Image 2.5 Sunburst con
// --background transparent, editadas desde las hojas aprobadas). Por hoja: componentes conexos del alfa; los trazos
// chicos (p. ej. las marcas de sorpresa) se asignan a la figura cuya caja los contiene; alfa ≥ 240 → 255 (el modelo
// entrega 253–254 en el cuerpo). Giro: frente, tres cuartos, perfil, espalda. Expresiones (orden del prompt de la hoja):
// neutral, curiosidad, sorpresa, concentracion, aprobacion, satisfaccion. Grupo: sólo los cuatro personajes (el Spark
// de la hoja lo dibujó el modelo; en piezas los Sparks salen siempre del SVG oficial). Uso: node separar-elenco.cjs
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const path = require('path'), fs = require('fs')
const D = __dirname, IN = path.join(D, 'sin-fondo'), OUT = path.join(D, 'piezas')
const GIRO = ['frente', 'tres-cuartos', 'perfil', 'espalda']
const EXPR = ['neutral', 'curiosidad', 'sorpresa', 'concentracion', 'aprobacion', 'satisfaccion']
const load = async f => { const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, H: info.height } }
const comps = ({ data, W, H }) => {
  const lab = new Int32Array(W * H), out = []; let id = 0
  for (let s = 0; s < W * H; s++) {
    if (data[s * 4 + 3] <= 16 || lab[s]) continue; id++; const st = [s]; lab[s] = id; let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0
    while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) { const X = x + dx, Y = y + dy, j = Y * W + X
        if (X >= 0 && Y >= 0 && X < W && Y < H && !lab[j] && data[j * 4 + 3] > 16) { lab[j] = id; st.push(j) } } }
    out.push({ ids: [id], x0, y0, x1, y1, n })
  }
  const big = out.filter(c => c.n >= 15000), small = out.filter(c => c.n < 15000 && c.n >= 30)
  for (const s of small) { const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2
    const host = big.find(b => cx >= b.x0 - 60 && cx <= b.x1 + 60 && cy >= b.y0 - 60 && cy <= b.y1 + 60)
    if (host) { host.ids.push(...s.ids); host.x0 = Math.min(host.x0, s.x0); host.y0 = Math.min(host.y0, s.y0); host.x1 = Math.max(host.x1, s.x1); host.y1 = Math.max(host.y1, s.y1) } }
  return { lab, big }
}
const cut = async (img, lab, c, file, pad = 10) => {
  const { data, W, H } = img, x0 = Math.max(0, c.x0 - pad), y0 = Math.max(0, c.y0 - pad), x1 = Math.min(W - 1, c.x1 + pad), y1 = Math.min(H - 1, c.y1 + pad)
  const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4), ids = new Set(c.ids)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y + y0) * W + (x + x0), o = (y * w + x) * 4, a = data[i * 4 + 3]
    const mine = ids.has(lab[i]) || (a > 0 && a <= 16)
    buf[o] = data[i * 4]; buf[o + 1] = data[i * 4 + 1]; buf[o + 2] = data[i * 4 + 2]; buf[o + 3] = mine ? (a >= 240 ? 255 : a) : 0
  }
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file)
  return `${path.basename(file)} ${w}×${h}`
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  for (const c of ['tomas', 'camila', 'renata', 'mateo']) {
    const g = await load(path.join(IN, `${c}-giro.png`)), cg = comps(g), giro = cg.big.sort((p, q) => p.x0 - q.x0)
    if (giro.length !== 4) throw new Error(`${c}: giro con ${giro.length} figuras`)
    for (const [k, comp] of giro.entries()) console.log(await cut(g, cg.lab, comp, path.join(OUT, `${c}-vista-${GIRO[k]}.png`)))
    const e = await load(path.join(IN, `${c}-expresiones.png`)), ce = comps(e)
    const ex = ce.big.sort((p, q) => (Math.abs(p.y0 - q.y0) > 150 ? p.y0 - q.y0 : p.x0 - q.x0))
    if (ex.length !== 6) throw new Error(`${c}: expresiones con ${ex.length} figuras`)
    for (const [k, comp] of ex.entries()) console.log(await cut(e, ce.lab, comp, path.join(OUT, `${c}-expresion-${EXPR[k]}.png`)))
  }
  const gr = await load(path.join(IN, 'elenco-2d-grupo.png')), cgr = comps(gr)
  // Personajes = las 4 figuras más altas; el Spark (flotante y chico) queda fuera.
  const people = cgr.big.sort((p, q) => (q.y1 - q.y0) - (p.y1 - p.y0)).slice(0, 4)
  const box = { ids: people.flatMap(p => p.ids), x0: Math.min(...people.map(p => p.x0)), y0: Math.min(...people.map(p => p.y0)), x1: Math.max(...people.map(p => p.x1)), y1: Math.max(...people.map(p => p.y1)) }
  console.log(await cut(gr, cgr.lab, box, path.join(OUT, 'elenco-2d-grupo.png')), '· figuras en la hoja:', cgr.big.length)
})()
