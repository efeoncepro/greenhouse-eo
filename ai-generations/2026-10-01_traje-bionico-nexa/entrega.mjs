// node ai-generations/2026-10-01_traje-bionico-nexa/entrega.mjs
//
// Arma la entrega del kit del traje biónico de Nexa (TASK-1940) en las medidas del canon de kits de prenda: vistas
// aisladas y lentes en 1600×1600, vistas puestas en 1200×1600, macro en 1600×1600. No genera nada: toma las vistas
// aprobadas de `out/` (ya con la marca armada y verificada al 100 %), las escala con lanczos3 y completa el lienzo
// estirando el fondo de estudio liso de los bordes (`extendWith: 'copy'`), así el sujeto no se reencuadra.
// Las versiones transparentes salen después con `pnpm ai:image:rmbg` (ver LEEME).
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const KIT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(KIT, 'out')
const FINAL = path.join(KIT, 'final')

const T = 'efeonce-traje-bionico-nexa'
const L = 'efeonce-lentes-bionicos-nexa'

export const ENTREGA = [
  ['01-frente-a-isotipo-b-acabado.png', `${T}-01-frente-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['02-espalda-b-logo-acabado.png', `${T}-02-espalda-1600x1600-v02-fondo-estudio.png`, 1600, 1600],
  ['03-tres-cuartos-izquierda-a-isotipo-c-acabado.png', `${T}-03-tres-cuartos-izquierda-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['04-tres-cuartos-derecha-a.png', `${T}-04-tres-cuartos-derecha-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['05-lateral-a.png', `${T}-05-lateral-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['10-detalle-placa-a-isotipo-b-acabado.png', `${T}-10-detalle-placa-isotipo-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['13-puesto-frente-a-isotipo-acabado.png', `${T}-13-puesto-frente-1200x1600-v01-fondo-estudio.png`, 1200, 1600],
  ['14-puesto-espalda-b.png', `${T}-14-puesto-espalda-1200x1600-v02-fondo-estudio.png`, 1200, 1600],
  ['20-lentes-frente-a.png', `${L}-20-frente-1600x1600-v01-fondo-estudio.png`, 1600, 1600],
  ['21-lentes-tres-cuartos-a.png', `${L}-21-tres-cuartos-1600x1600-v01-fondo-estudio.png`, 1600, 1600]
]

const lienzo = async (entrada, salida, W, H) => {
  const { width, height } = await sharp(entrada).metadata()
  const escala = Math.min(W / width, H / height)
  const w = Math.round(width * escala)
  const h = Math.round(height * escala)
  const izq = Math.floor((W - w) / 2)
  const arr = Math.floor((H - h) / 2)

  await sharp(entrada)
    .resize(w, h, { kernel: 'lanczos3' })
    .extend({ left: izq, right: W - w - izq, top: arr, bottom: H - h - arr, extendWith: 'copy' })
    .png()
    .toFile(salida)
}

// El matting de `ai:image:rmbg` confunde las placas blancas mate con el fondo de estudio gris claro y las deja
// semitransparentes (medido 2026-10-02 en 01 y 04: placa abdominal y antebrazo). `opacar` cierra eso sin tocar la
// silueta: el fondo es sólo lo casi transparente conectado al borde del lienzo (los huecos reales, como el espacio
// entre las piernas, siguen siéndolo); todo lo demás queda opaco salvo una banda de `BORDE` px junto al fondo, que
// conserva el alfa suave del matting. No aplica a los lentes: su vidrio SÍ es translúcido.
const BORDE = 2
const UMBRAL_FONDO = 16

export const opacar = async archivo => {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  const fondo = new Uint8Array(W * H)
  const pila = []
  const alfa = i => data[i * 4 + 3]

  for (let x = 0; x < W; x++) pila.push(x, (H - 1) * W + x)
  for (let y = 0; y < H; y++) pila.push(y * W, y * W + W - 1)

  while (pila.length) {
    const i = pila.pop()

    if (fondo[i] || alfa(i) >= UMBRAL_FONDO) continue
    fondo[i] = 1
    const x = i % W
    const y = (i - x) / W

    if (x > 0) pila.push(i - 1)
    if (x < W - 1) pila.push(i + 1)
    if (y > 0) pila.push(i - W)
    if (y < H - 1) pila.push(i + W)
  }

  let opacados = 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x

      if (fondo[i] || alfa(i) === 255) continue
      let cerca = false

      for (let dy = -BORDE; dy <= BORDE && !cerca; dy++) {
        for (let dx = -BORDE; dx <= BORDE; dx++) {
          const xx = x + dx
          const yy = y + dy

          if (xx >= 0 && yy >= 0 && xx < W && yy < H && fondo[yy * W + xx]) {
            cerca = true
            break
          }
        }
      }

      if (!cerca) {
        data[i * 4 + 3] = 255
        opacados++
      }
    }
  }

  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(archivo + '.tmp.png')
  const { rename } = await import('node:fs/promises')

  await rename(archivo + '.tmp.png', archivo)

  return opacados
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--opacar')) {
    // Después de `pnpm ai:image:rmbg` sobre las vistas aisladas del TRAJE (nunca los lentes).
    for (const v of ['01-frente-1600x1600-v01', '02-espalda-1600x1600-v02', '03-tres-cuartos-izquierda-1600x1600-v01', '04-tres-cuartos-derecha-1600x1600-v01', '05-lateral-1600x1600-v01']) {
      const n = await opacar(path.join(FINAL, `${T}-${v}-transparente.png`))

      console.log(`✓ ${v} · ${n} px opacados`)
    }
  } else {
    for (const [entrada, salida, W, H] of ENTREGA) {
      await lienzo(path.join(OUT, entrada), path.join(FINAL, salida), W, H)
      console.log(`✓ ${salida}`)
    }
  }
}
