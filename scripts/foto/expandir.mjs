// Canon: efeonce-advertising-creative → references/paid-format-safe-zones-and-craft.md §0b (CMP-004, 2026-10-02).
// Zoom out por expansión: da aire de texto a un plate cuyo sujeto quedó alto, sin regenerar a la persona.
// 1) achica el plate a `escala`, centrado y apoyado abajo (o dejando `abajo` libre para un lecho nuevo de la firma); 2) el modelo SÓLO rellena el espacio nuevo
// (máscara); 3) los píxeles originales se vuelven a pegar encima con borde suavizado, así que la persona y la escena
// aprobadas no cambian. Uso: pnpm foto:expandir <plate.png> <salida.png> <escala> "<relleno>" [abajo 0–0.2]
//   [--lienzo WxH --ancla derecha|izquierda|centro]: cambia de formato (p. ej. de la escena 1:1 aprobada a la horizontal
//   1,91:1 2048x1072). La escena se apoya en el lado `ancla` con alto = escala × alto del lienzo y el modelo extiende
//   el resto (columna de texto). Caso fuente: horizontales de CMP-004, 2026-10-02.
//   [--reponer no]: entrega la salida del modelo sin volver a pegar el original (evita el recuadro al cambiar de lienzo).
//   [--fundido px]: franja del borde que se rehace y se funde (default 18; 80–140 si el borde corta objetos).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const argv = process.argv.slice(2)

const flag = name => {
  const i = argv.indexOf(`--${name}`)

  return i >= 0 ? argv.splice(i, 2)[1] : undefined
}

const lienzo = flag('lienzo')
// Ancho (px) de la franja del borde que el modelo rehace y que se funde al reponer el original. 18 basta para un
// borde de muro liso; cuando el borde corta objetos (soportes, mesas), 80–140 evita una costura visible.
const fundido = Math.max(18, Number(flag('fundido') ?? 18))
// `--reponer no`: entrega la salida del modelo tal cual (sin volver a pegar el original). Al cambiar de lienzo el modelo
// re-armoniza el borde de la escena; reponer el original deja un recuadro visible (CMP-004 S04, 2026-10-02). Exige
// revisar la cara al 100 % contra la aprobada.
const reponer = (flag('reponer') ?? 'si') !== 'no'
const ancla = flag('ancla') ?? 'centro'
const [plate, salida, escalaTxt, relleno, abajoTxt] = argv
const abajo = Number(abajoTxt ?? 0) // fracción del alto que queda libre ABAJO (lecho nuevo para la firma)
const escala = Number(escalaTxt)

if (!plate || !salida || !(escala > 0.5 && escala <= 1) || !relleno || (lienzo && !/^\d+x\d+$/.test(lienzo)) || !['derecha', 'izquierda', 'centro'].includes(ancla)) {
  console.error('Uso: pnpm foto:expandir <plate.png> <salida.png> <escala 0.5–1> "<relleno>" [abajo] [--lienzo WxH --ancla derecha|izquierda|centro]')
  process.exit(1)
}

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const tmp = path.resolve(salida).replace(/\.png$/, '')

mkdirSync(path.dirname(salida), { recursive: true })

const fuente = await sharp(plate).metadata()
const [W, H] = lienzo ? lienzo.split('x').map(Number) : [fuente.width, fuente.height]
const h = Math.round(H * escala)
const w = lienzo ? Math.round((fuente.width * h) / fuente.height) : Math.round(W * escala)

if (w > W) {
  console.error(`La escena (${w}px) no cabe en el lienzo (${W}px): baja la escala.`)
  process.exit(1)
}

const left = ancla === 'derecha' ? W - w : ancla === 'izquierda' ? 0 : Math.round((W - w) / 2)
const top = H - h - Math.round(H * abajo)
const pegado = await sharp(plate).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()

// Fondo de pista: el propio plate estirado y muy desenfocado, oscurecido, para que el modelo continúe la materia.
// Al cambiar de lienzo, la pista estira los bordes reales de la escena (mesas, lechos, luz) hacia el área nueva para que el
// modelo los continúe en vez de inventar un fondo distinto (CMP-004: con el plate desenfocado quedaba un recuadro).
const pista = lienzo
  ? await sharp(pegado)
      .extend({ left, right: W - left - w, top, bottom: H - top - h, extendWith: 'copy' })
      .blur(24)
      .png()
      .toBuffer()
  : await sharp(plate).resize(W, H).blur(60).modulate({ brightness: 0.6 }).png().toBuffer()

const base = await sharp(pista).composite([{ input: pegado, left, top }]).png().toBuffer()

writeFileSync(`${tmp}-base.png`, base)

// Máscara OpenAI: transparente = se edita. El contenido original queda opaco (con 6 px de margen hacia adentro).
// Con fundido ancho, el modelo rehace también una franja del borde interior (sólo en los lados que tocan área nueva).
const m = fundido > 18 ? Math.round(fundido * 0.7) : 6
const libre = { izq: left > 0, der: left + w < W, arr: top > 0, aba: top + h < H }
const mx0 = libre.izq ? m : 0
const mx1 = libre.der ? m : 0
const my0 = libre.arr ? m : 0
const my1 = libre.aba ? m : 0
const opaco = await sharp({ create: { width: w - mx0 - mx1, height: h - my0 - my1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()


const mascara = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: opaco, left: left + mx0, top: top + my0 }])
  .png()
  .toBuffer()

writeFileSync(`${tmp}-mascara.png`, mascara)

const lugar = ancla === 'derecha' ? 'right' : ancla === 'izquierda' ? 'left' : 'central lower'
const zonas = ancla === 'centro' ? `the top band, the side strips${abajo ? ' and the bottom band' : ''}` : `the ${ancla === 'derecha' ? 'left' : 'right'} side${h < H ? ' and the remaining bands' : ''}`

const prompt =
  `Outpainting. The ${lugar} part of the image is a finished photograph and must stay EXACTLY as it is. ` +
  `Only fill the transparent area (${zonas}) by continuing the same scene seamlessly: ${relleno}. ` +
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
const f = fundido
const fx0 = libre.izq ? f : 0
const fx1 = libre.der ? f : 0
const fy0 = libre.arr ? f : 0
const fy1 = libre.aba ? f : 0

const blanco = await sharp({ create: { width: w - fx0 - fx1, height: h - fy0 - fy1, channels: 3, background: '#ffffff' } }).png().toBuffer()

const alfa = await sharp({ create: { width: w, height: h, channels: 3, background: '#000000' } })
  .composite([{ input: blanco, left: fx0, top: fy0 }])
  .blur(f / 2)
  .extractChannel(0)

  .raw()
  .toBuffer()

const conAlfa = await sharp(pegado).removeAlpha().joinChannel(alfa, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
const relleno2 = await sharp(`${tmp}-relleno.png`).resize(W, H).png().toBuffer()

if (reponer) await sharp(relleno2).composite([{ input: conAlfa, left, top }]).png().toFile(salida)
else await sharp(relleno2).png().toFile(salida)
console.log(`✓ ${salida} · contenido original al ${Math.round(escala * 100)} % desde y=${(top / H).toFixed(3)}`)
