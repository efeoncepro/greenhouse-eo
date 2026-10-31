// Máscara por cuadro de la lata BREAKR (blanco = nítido): píxeles naranjo o teal saturados dentro de la columna del
// teal (banda única de la lata), dilatados para cubrir la tapa plateada. Todo lo demás se desenfoca (profundidad de campo).
const sharp = require('sharp'), fs = require('fs')
const W = 270, H = 338 // se calcula en baja y se escala
;(async () => {
  for (const f of fs.readdirSync('dof/f').sort()) {
    const { data } = await sharp(`dof/f/${f}`).resize(W, H).raw().toBuffer({ resolveWithObject: true })
    const teal = [], hot = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) {
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
      const isTeal = g > 120 && b > 120 && r < 110 && g - r > 50
      const isOrange = r > 190 && g > 60 && g < 150 && b < 90
      if (isTeal) teal.push(i % W)
      if (isTeal || isOrange) hot[i] = 1
    }
    teal.sort((a, b) => a - b)
    const x0 = teal.length ? teal[Math.floor(teal.length * 0.03)] - 22 : 100, x1 = teal.length ? teal[Math.floor(teal.length * 0.97)] + 22 : 170
    // Filas con color de lata dentro de la columna; se parte del teal y se sube sólo por filas contiguas (gap <= 3),
    // así la piel y el pelo de Paula, separados por el suéter, quedan fuera.
    const rowHot = y => { let n = 0; for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) n += hot[y * W + x]; return n > 3 }
    const tealRows = []; for (let i = 0; i < W * H; i++) { const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; if (g > 120 && b > 120 && r < 110 && g - r > 50) tealRows.push(Math.floor(i / W)) }
    tealRows.sort((a, b) => a - b)
    let yt = tealRows.length ? tealRows[Math.floor(tealRows.length * 0.5)] : 200
    let y0 = yt, gap = 0
    for (let y = yt; y >= 0; y--) { if (rowHot(y)) { y0 = y; gap = 0 } else if (++gap > 3) break }
    let y1 = yt; gap = 0
    for (let y = yt; y < H; y++) { if (rowHot(y)) { y1 = y; gap = 0 } else if (++gap > 3) break }
    y0 = Math.max(0, y0 - 10); y1 = Math.min(H, y1 + 40)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${(x1 - x0) / 2.5}" fill="#fff"/></svg>`
    await sharp(Buffer.from(svg)).blur(6).resize(1080, 1350).greyscale().png().toFile(`dof/m/${f}`)
  }
})()
