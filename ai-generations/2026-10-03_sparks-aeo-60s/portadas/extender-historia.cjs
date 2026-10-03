// Historia 9:16 desde la escena 4:5 aprobada (ig-b), sin generar: extiende hacia arriba el cielo navy y hacia abajo el
// escritorio oscuro con el color promedio de cada columna en el borde, un degradado suave hacia el navy profundo y
// grano fino contra el bandeado. La escena original queda intacta (0 px cambiados en su zona).
//   node extender-historia.cjs <entrada 4:5> <salida 9:16>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [IN, OUT] = process.argv.slice(2)
;(async () => {
  const { data, info } = await sharp(IN).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H0 = info.height, H = Math.round(W * 16 / 9), TOP = Math.round((H - H0) * 0.6), BOT = H - H0 - TOP
  const out = Buffer.alloc(W * H * 3), DEEP = [6, 18, 52], band = 24
  const avg = (y0, y1, x) => { const c = [0, 0, 0]; for (let y = y0; y < y1; y++) for (let k = 0; k < 3; k++) c[k] += data[(y * W + x) * 3 + k]; return c.map(v => v / (y1 - y0)) }
  // Promedio horizontal suavizado del borde (ventana de 81 px) para que no se estiren detalles.
  const edge = (y0, y1) => { const raw = Array.from({ length: W }, (_, x) => avg(y0, y1, x)), r = 40
    return raw.map((_, x) => { const c = [0, 0, 0]; let n = 0; for (let d = -r; d <= r; d++) { const xx = Math.min(W - 1, Math.max(0, x + d)); for (let k = 0; k < 3; k++) c[k] += raw[xx][k]; n++ } return c.map(v => v / n) }) }
  const top = edge(0, band), bot = edge(H0 - band, H0)
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3
    if (y >= TOP && y < TOP + H0) { const i = ((y - TOP) * W + x) * 3; out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; continue }
    const isTop = y < TOP, t = isTop ? (TOP - y) / TOP : (y - TOP - H0 + 1) / BOT, e = isTop ? top[x] : bot[x], k = isTop ? Math.pow(t, 1.4) * 0.85 : Math.min(1, Math.pow(t, 0.7) * 1.1)
    const n = (rnd() - 0.5) * 3
    for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(e[c] * (1 - k) + DEEP[c] * k + n)))
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT)
  console.log('ok', OUT, `${W}x${H}`, 'arriba', TOP, 'abajo', BOT)
})()
