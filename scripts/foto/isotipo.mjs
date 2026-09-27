// pnpm foto:isotipo <plate.png> --centro x,y --ancho w [--prenda oscura|clara] [--rotacion grados] [--out archivo.png]
//
// Compone el isotipo OFICIAL de Efeonce sobre el pecho de una prenda generada. Existe porque el modelo
// no reproduce la marca con garantía: aun con las vistas del kit como referencia, cuando el emblema queda
// chico en el cuadro inventa una nave parecida, la mueve, la agranda o la espeja (caso fuente 2026-09-20,
// cinco piezas con una espiral en lugar del emblema).
//
// Orden de uso (canon de fotografía de marca): 1) las referencias del kit en la ficha (`objetos`) — el
// camino principal; 2) `pnpm foto:emblema` para mirar el bordado al 100 %; 3) este comando SÓLO si esa
// revisión muestra un emblema distinto del oficial. No es un atajo para saltarse las referencias.
//
// Qué hace, en orden:
//   1. Limpia la zona: los píxeles que se apartan del tono de la tela (medido en el anillo que rodea la
//      caja) se rellenan con la tela suavizada. Así desaparece el emblema inventado sin borrar la trama.
//   2. Rasteriza el isotipo oficial —negativo sobre prenda oscura, positivo sobre clara— al ancho pedido,
//      le da la luz de la escena (`brillo`) y lo compone en el centro de la caja con la rotación declarada.
//   3. Escribe `<plate>-isotipo.png` y un `.json` de procedencia (versión del paquete, SHA-256 del SVG,
//      caja, prenda) para que la pieza se pueda auditar después.
//
// NO decide dónde va: la caja la declaras tú mirando la foto (o la ficha la trae). Las coordenadas van
// en fracciones del ancho y del alto del plate, no en píxeles, para que sobrevivan a un reescalado.
// NO simula bordado: compone el emblema plano con una leve suavización. Si la pieza pide un bordado
// verosímil en primer plano, la foto se rehace con la prenda de espaldas o el emblema pequeño.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const require = createRequire(import.meta.url)

export const USO = `
pnpm foto:isotipo <plate.png> --centro x,y --ancho w [opciones]

  --centro x,y     centro del emblema en fracciones del plate (0–1), p. ej. 0.62,0.58
  --ancho w        ancho del emblema en fracción del ancho del plate, p. ej. 0.06
  --prenda         oscura (isotipo negativo, blanco) | clara (isotipo positivo, azul). Default: oscura
  --rotacion g     grados, positivo = horario (sigue la caída de la tela). Default: 0
  --brillo b       multiplica el color del emblema (0,5–1) para igualar la luz de la escena. Default: 0.85
  --umbral n       diferencia de luminancia (0–255) que cuenta como emblema inventado. Default: 38
  --sin-limpiar    no toca la tela; sólo compone el isotipo encima
  --out archivo    salida. Default: <plate>-isotipo.png junto al plate

Antes: las referencias del kit en la ficha y pnpm foto:emblema. Después: pnpm foto:emblema <salida> para mirarlo al 100 %.
`

export class IsotipoError extends Error {
  constructor(message) {
    super(message)
    this.name = 'IsotipoError'
  }
}

const validar = ({ centro, ancho, prenda, rotacion, brillo, umbral }) => {
  if (centro.length !== 2 || centro.some(v => !(v >= 0 && v <= 1))) throw new IsotipoError('--centro debe ser x,y entre 0 y 1.')
  if (!(ancho > 0 && ancho < 0.5)) throw new IsotipoError('--ancho debe estar entre 0 y 0,5 del ancho del plate.')
  if (!['oscura', 'clara'].includes(prenda)) throw new IsotipoError('--prenda es oscura o clara.')
  if (!(brillo >= 0.5 && brillo <= 1)) throw new IsotipoError('--brillo va entre 0,5 y 1.')
  if (!Number.isFinite(rotacion) || Math.abs(rotacion) > 45) throw new IsotipoError('--rotacion va entre -45 y 45 grados.')
  if (!(umbral > 0 && umbral < 255)) throw new IsotipoError('--umbral va entre 1 y 254.')
}

/** Lee y valida los argumentos del CLI. Lanza `IsotipoError` con el mensaje para el operador. */
export const parseArgs = argv => {
  const args = [...argv]

  const isValueOf = a => {
    const i = args.indexOf(a)

    return i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--sin-limpiar'
  }

  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`)

    return i === -1 ? fallback : args[i + 1]
  }

  const plate = args.find(a => !a.startsWith('--') && !isValueOf(a))

  if (!plate) throw new IsotipoError('falta el plate.')

  const opciones = {
    plate,
    centro: (opt('centro', '') || '').split(',').map(Number),
    ancho: Number(opt('ancho', 'NaN')),
    prenda: opt('prenda', 'oscura'),
    rotacion: Number(opt('rotacion', '0')),
    umbral: Number(opt('umbral', '38')),
    brillo: Number(opt('brillo', '0.85')),
    limpiar: !args.includes('--sin-limpiar'),
    out: opt('out', plate.replace(/\.png$/i, '') + '-isotipo.png')
  }

  validar(opciones)

  return opciones
}

/** El SVG oficial del paquete de marca y su huella. */
export const isotipoOficial = async prenda => {
  const pkgJson = require.resolve('@efeoncepro/axis-brand-assets/package.json')
  const pkg = JSON.parse(await readFile(pkgJson, 'utf8'))
  const variante = prenda === 'oscura' ? 'efeonce-isotype-negative' : 'efeonce-isotype-positive'
  const svg = await readFile(path.join(path.dirname(pkgJson), 'assets', `${variante}.svg`))

  return { svg, variante, paquete: `${pkg.name}@${pkg.version}`, sha256: createHash('sha256').update(svg).digest('hex') }
}

/**
 * Tono de la tela: mediana del anillo de 4 px que rodea la caja. Los píxeles de la caja que se apartan de
 * ese tono (el emblema inventado) se rellenan con la tela suavizada; la trama del resto queda intacta.
 */
const limpiarZona = async (raw, { W, H, ch, box, umbral, embW }) => {
  const anillo = []
  const ring = 4

  for (let y = box.top - ring; y < box.top + box.height + ring; y++) {
    for (let x = box.left - ring; x < box.left + box.width + ring; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const dentro = x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height

      if (dentro) continue
      const i = (y * W + x) * ch

      anillo.push([raw[i], raw[i + 1], raw[i + 2]])
    }
  }

  const med = k => {
    const v = anillo.map(p => p[k]).sort((a, b) => a - b)

    return v[Math.floor(v.length / 2)]
  }

  const tela = [med(0), med(1), med(2)]
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  const telaLum = lum(...tela)

  const mask = new Uint8Array(box.width * box.height)
  const relleno = Buffer.alloc(box.width * box.height * 3)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const i = ((box.top + y) * W + (box.left + x)) * ch
      const j = y * box.width + x
      const d = Math.abs(lum(raw[i], raw[i + 1], raw[i + 2]) - telaLum)

      mask[j] = d > umbral ? 1 : 0
      const src = mask[j] ? tela : [raw[i], raw[i + 1], raw[i + 2]]

      relleno[j * 3] = src[0]
      relleno[j * 3 + 1] = src[1]
      relleno[j * 3 + 2] = src[2]
    }
  }

  // Dilata la máscara 2 px: el borde antialiasado del emblema inventado también se va.
  const dil = new Uint8Array(mask)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      if (!mask[y * box.width + x]) continue

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy
          const xx = x + dx

          if (yy >= 0 && xx >= 0 && yy < box.height && xx < box.width) dil[yy * box.width + xx] = 1
        }
      }
    }
  }

  const sigma = Math.max(1.5, embW * 0.06)

  const suave = await sharp(relleno, { raw: { width: box.width, height: box.height, channels: 3 } })
    .blur(sigma)
    .raw()
    .toBuffer()

  const limpio = Buffer.from(raw)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const j = y * box.width + x

      if (!dil[j]) continue
      const i = ((box.top + y) * W + (box.left + x)) * ch

      limpio[i] = suave[j * 3]
      limpio[i + 1] = suave[j * 3 + 1]
      limpio[i + 2] = suave[j * 3 + 2]
    }
  }

  return limpio
}

/**
 * Compone el isotipo oficial sobre el plate y escribe la salida y su procedencia.
 * @returns {Promise<{ out: string, procedencia: object, embW: number, variante: string }>}
 */
export const componerIsotipo = async opciones => {
  const { plate, centro, ancho, prenda, rotacion, umbral, brillo, limpiar, out } = {
    prenda: 'oscura',
    rotacion: 0,
    umbral: 38,
    brillo: 0.85,
    limpiar: true,
    ...opciones
  }

  validar({ centro, ancho, prenda, rotacion, brillo, umbral })

  if (!plate || !existsSync(plate)) throw new IsotipoError(`no existe el plate ${plate ?? '(vacío)'}.`)

  const destino = out ?? plate.replace(/\.png$/i, '') + '-isotipo.png'
  const oficial = await isotipoOficial(prenda)

  const { data: raw, info } = await sharp(plate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const ch = info.channels

  const embW = Math.max(8, Math.round(ancho * W))
  const cx = Math.round(centro[0] * W)
  const cy = Math.round(centro[1] * H)

  // El isotipo es 727,4 × 516,12: la caja de limpieza toma el emblema con holgura para cubrir la marca
  // inventada, que suele ser más grande que la oficial.
  const embH = Math.round(embW * (516.12 / 727.4))
  const pad = Math.round(embW * 0.35)

  const box = {
    left: Math.max(0, cx - Math.round(embW / 2) - pad),
    top: Math.max(0, cy - Math.round(embH / 2) - pad)
  }

  box.width = Math.min(W - box.left, embW + pad * 2)
  box.height = Math.min(H - box.top, embH + pad * 2)

  const limpio = limpiar ? await limpiarZona(raw, { W, H, ch, box, umbral, embW }) : raw

  let emblema = sharp(oficial.svg, { density: 72 * Math.max(1, (embW * 2) / 727.4) })
    .resize({ width: embW })
    .png()

  if (rotacion) emblema = emblema.rotate(rotacion, { background: { r: 0, g: 0, b: 0, alpha: 0 } })

  // El hilo recibe la misma luz que la tela: el blanco puro de un archivo vectorial se lee pegado encima.
  // Y el emblema no puede quedar más nítido que la tela que lo lleva.
  const embBuf = await sharp(await emblema.toBuffer())
    .linear([brillo, brillo, brillo, 1], [0, 0, 0, 0])
    .blur(0.4)
    .png()
    .toBuffer()

  const embMeta = await sharp(embBuf).metadata()

  await sharp(limpio, { raw: { width: W, height: H, channels: ch } })
    .composite([
      {
        input: embBuf,
        left: Math.round(cx - embMeta.width / 2),
        top: Math.round(cy - embMeta.height / 2),
        blend: 'over'
      }
    ])
    .png()
    .toFile(destino)

  const procedencia = {
    schema: 'efeonce.foto.isotipo.v1',
    plate: path.basename(plate),
    salida: path.basename(destino),
    paquete: oficial.paquete,
    archivo: `assets/${oficial.variante}.svg`,
    sha256: oficial.sha256,
    prenda,
    caja: { centro, ancho, rotacion },
    brillo,
    limpieza: limpiar ? { umbral } : null,
    creado: new Date().toISOString()
  }

  await writeFile(destino.replace(/\.png$/i, '.json'), JSON.stringify(procedencia, null, 2) + '\n')

  return { out: destino, procedencia, embW, variante: oficial.variante }
}

const esCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (esCli) {
  try {
    const opciones = parseArgs(process.argv.slice(2))
    const { out, procedencia, embW, variante } = await componerIsotipo(opciones)

    console.log(`foto:isotipo → ${out}
  ${variante} de ${procedencia.paquete} (sha256 ${procedencia.sha256.slice(0, 12)}…), ${embW} px de ancho.
  Revisa al 100 %: pnpm foto:emblema ${out}`)
  } catch (error) {
    if (error instanceof IsotipoError) {
      console.error(`foto:isotipo — ${error.message}\n${USO}`)
      process.exit(1)
    }

    throw error
  }
}
