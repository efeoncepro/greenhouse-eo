// Sprite de Clawd reconstruido desde el arte de bloques del binario oficial de Claude Code 2.1.x
// (" ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝") y el color de marca rgb(215,119,87) encontrado en el mismo binario.
// Cada carácter de cuarto de bloque = 2×2 píxeles. En la terminal la celda mide el doble de alto que de ancho, así que
// cada píxel es 1:2 (ancho:alto); renderizarlo cuadrado aplana a Clawd. Salida: referencia nítida para materializar en 3D.
import sharp from 'sharp'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const Q = { ' ': [0, 0, 0, 0], '▐': [0, 1, 0, 1], '▌': [1, 0, 1, 0], '▛': [1, 1, 1, 0], '▜': [1, 1, 0, 1], '█': [1, 1, 1, 1], '▝': [0, 1, 0, 0], '▘': [1, 0, 0, 0] }
const ROWS = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  ']
const W = ROWS[0].length * 2
const H = ROWS.length * 2
const grid = Array.from({ length: H }, () => Array(W).fill(0))

ROWS.forEach((row, r) => [...row].forEach((ch, c) => {
  const q = Q[ch]
  if (!q) throw new Error(`Carácter sin mapa: ${ch}`)
  grid[r * 2][c * 2] = q[0]; grid[r * 2][c * 2 + 1] = q[1]; grid[r * 2 + 1][c * 2] = q[2]; grid[r * 2 + 1][c * 2 + 1] = q[3]
}))

const CELL = 96
const CELL_H = CELL * 2
const PAD = 2
const cw = (W + PAD * 2) * CELL
const ch = (H + PAD * 2) * CELL_H
let rects = ''
grid.forEach((row, y) => row.forEach((v, x) => { if (v) rects += `<rect x="${(x + PAD) * CELL}" y="${(y + PAD) * CELL_H}" width="${CELL}" height="${CELL_H}"/>` }))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><rect width="100%" height="100%" fill="#ffffff"/><g fill="rgb(215,119,87)" shape-rendering="crispEdges">${rects}</g></svg>`

await sharp(Buffer.from(svg)).png().toFile(path.join(DIR, 'clawd-sprite-ref.png'))
console.log(grid.map(r => r.map(v => (v ? '█' : '·')).join('')).join('\n'), `\n${cw}x${ch}`)
