// Extrae cuadros clave del atlas oficial de la mascota Codex (app ChatGPT 26.911, app.asar →
// webview/assets/codex-spritesheet-v6-51045ae208c0.webp; contrato V2: 8 columnas × 11 filas, celdas 192×208).
// Filas 9–10 = 16 direcciones de mirada (000 = arriba; horario, pasos de 22,5°). Salida: PNG nativo y ×4 nearest.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ATLAS = path.join(DIR, 'codex-spritesheet-v6-oficial.webp')
const FRAMES = {
  'frente-idle': [0, 0],
  'tranquilo': [0, 1],
  'saludo': [3, 1],
  'brazos-arriba': [5, 3],
  'pensando': [6, 1],
  'laptop': [7, 0],
  'feliz': [8, 1],
  'mirada-000-arriba': [9, 0],
  'mirada-090-derecha': [9, 4],
  'mirada-180-abajo': [10, 0],
  'mirada-270-izquierda': [10, 4]
}

for (const [name, [r, c]] of Object.entries(FRAMES)) {
  const cell = sharp(ATLAS).extract({ left: c * 192, top: r * 208, width: 192, height: 208 })
  await cell.clone().png().toFile(path.join(DIR, `codex-sprite-${name}-192x208.png`))
  await sharp(await cell.clone().png().toBuffer()).resize(768, 832, { kernel: 'nearest' }).png().toFile(path.join(DIR, `codex-sprite-${name}-x4.png`))
}
console.log(Object.keys(FRAMES).length, 'frames')
