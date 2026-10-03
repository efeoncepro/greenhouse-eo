// Zoom out por expansión: da aire de texto a un plate cuyo sujeto quedó alto, sin regenerar a la persona.
// 1) achica el plate a `escala` y lo apoya en el borde inferior, centrado; 2) el modelo SÓLO rellena el espacio nuevo
// (máscara); 3) los píxeles originales se vuelven a pegar encima con borde suavizado, así que la persona y la escena
// aprobadas no cambian. Uso: node expandir.mjs <plate.png> <salida.png> <escala> "<qué hay en el espacio nuevo>"
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const [plate, salida, escalaTxt, relleno, abajoTxt] = process.argv.slice(2)
const abajo = Number(abajoTxt ?? 0) // fracción del alto que queda libre ABAJO (lecho nuevo para la firma)
const escala = Number(escalaTxt)

if (!plate || !salida || !(escala > 0.5 && escala < 1) || !relleno) {
  console.error('Uso: node expandir.mjs <plate.png> <salida.png> <escala 0.5–1> "<relleno>"')
  process.exit(1)
}

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..')
const tmp = path.resolve(salida).replace(/\.png$/, '')

mkdirSync(path.dirname(salida), { recursive: true })

const { width: W, height: H } = await sharp(plate).metadata()
const w = Math.round(W * escala)
const h = Math.round(H * escala)
const left = Math.round((W - w) / 2)
const top = H - h - Math.round(H * abajo)
const pegado = await sharp(plate).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()

// Fondo de pista: el propio plate estirado y muy desenfocado, oscurecido, para que el modelo continúe la materia.
const pista = await sharp(plate).resize(W, H).blur(60).modulate({ brightness: 0.6 }).png().toBuffer()
const base = await sharp(pista).composite([{ input: pegado, left, top }]).png().toBuffer()

writeFileSync(`${tmp}-base.png`, base)

// Máscara OpenAI: transparente = se edita. El contenido original queda opaco (con 6 px de margen hacia adentro).
const m = 6
const opaco = await sharp({ create: { width: w - 2 * m, height: h - (abajo ? 2 * m : m), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()
const mascara = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: opaco, left: left + m, top: top + m }])
  .png()
  .toBuffer()

writeFileSync(`${tmp}-mascara.png`, mascara)

const prompt =
  `Outpainting. The central lower part of the image is a finished photograph and must stay EXACTLY as it is. ` +
  `Only fill the transparent area around it (the top band, the side strips${abajo ? ' and the bottom band' : ''}) by continuing the same scene seamlessly: ${relleno}. ` +
  'Match the perspective, light, grain, depth of field and colour of the photograph exactly; no seams, no frame, no new people, ' +
  'no new objects, no light sources, no text and no logos in the new area.'

writeFileSync(`${tmp}-prompt.txt`, prompt)

if (!existsSync(`${tmp}-relleno.png`)) execFileSync(
  'pnpm',
  ['-s', 'ai:image', '--prompt-file', `${tmp}-prompt.txt`, '--image', `${tmp}-base.png`, '--mask', `${tmp}-mascara.png`,
    '--model', 'gpt-image-2.5-sunburst', '--quality', 'high', '--size', `${W}x${H}`, '--out', `${tmp}-relleno.png`],
  { cwd: raiz, stdio: 'inherit' }
)

// Repone los píxeles originales con borde suavizado de 18 px: lo aprobado no cambia.
const f = 18
const blanco = await sharp({ create: { width: w - 2 * f, height: h - (abajo ? 2 * f : f), channels: 3, background: '#ffffff' } }).png().toBuffer()
const alfa = await sharp({ create: { width: w, height: h, channels: 3, background: '#000000' } })
  .composite([{ input: blanco, left: f, top: f }])
  .blur(f / 2)
  .extractChannel(0)
  .raw()
  .toBuffer()
const conAlfa = await sharp(pegado).removeAlpha().joinChannel(alfa, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
const relleno2 = await sharp(`${tmp}-relleno.png`).resize(W, H).png().toBuffer()

await sharp(relleno2).composite([{ input: conAlfa, left, top }]).png().toFile(salida)
console.log(`✓ ${salida} · contenido original al ${Math.round(escala * 100)} % desde y=${(top / H).toFixed(3)}`)
