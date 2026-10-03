// pnpm foto:isotipo <plate.png> --centro x,y --ancho w [--prenda oscura|clara] [--rotacion grados] [--acabado] [--out archivo.png]
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
//   4. Con `--acabado`, el modelo TERMINA la marca compuesta (regla del operador 2026-09-28: compuesto solo,
//      se ve pegado encima). Sólo pone materia y luz, y su edición vuelve a la placa sólo sobre la silueta
//      del isotipo. Detalle en la sección «Acabado», más abajo.
//
// NO decide dónde va: la caja la declaras tú mirando la foto (o la ficha la trae). Las coordenadas van
// en fracciones del ancho y del alto del plate, no en píxeles, para que sobrevivan a un reescalado.
// NO simula bordado: compone el emblema plano con una leve suavización. Si la pieza pide un bordado
// verosímil en primer plano, la foto se rehace con la prenda de espaldas o el emblema pequeño.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// Acabado (paso 4). Constantes del método probado en MC1h y MC4g el 2026-09-28; cada una está medida.
export const MODELO_ACABADO = 'gpt-image-2.5-sunburst'
const CALIDAD_ACABADO = 'high'
const LADO_MODELO = 1024
const LADO_RECORTE = 512
const UMBRAL_SILUETA = 10 // diferencia de luminancia compuesto − base que cuenta como marca
const DILATACION_SILUETA = 3
const SIGMA_ALFA = 1.6
const ANILLO_COLOR = 14 // anillo donde se mide el desplazamiento de color entre la edición y el compuesto

/**
 * La marca, para la verificación: la silueta más su dilatación y el alcance del alfa suavizado (3σ). Se mide
 * aparte del alfa de la mezcla, así que un desplazamiento del recorte o un halo aparecen como cambios fuera.
 */
export const ZONA_MARCA_PX = DILATACION_SILUETA + Math.ceil(3 * SIGMA_ALFA)

export const USO = `
pnpm foto:isotipo <plate.png> --centro x,y --ancho w [opciones]

  --centro x,y     centro del emblema en fracciones del plate (0–1), p. ej. 0.62,0.58
  --ancho w        ancho del emblema en fracción del ancho del plate, p. ej. 0.06
  --prenda         oscura (isotipo negativo, blanco) | clara (isotipo positivo, azul). Default: oscura
  --rotacion g     grados, positivo = horario (sigue la caída de la tela). Default: 0
  --brillo b       multiplica el color del emblema (0,5–1) para igualar la luz de la escena. Default: 0.85
  --umbral n       diferencia de luminancia (0–255) que cuenta como emblema inventado. Default: 38
  --sin-limpiar    no toca la tela; sólo compone el isotipo encima
  --acabado        después de componer, el modelo TERMINA la marca: sólo materia y luz, devuelta a la placa sólo
                   sobre la silueta del isotipo. Escribe <salida>-acabado.png, el recorte, su edición, la hoja
                   antes/después al 300 % y la procedencia en el .json. Falla si cambia un píxel fuera de la marca.
                   Gasta una edición de gpt-image-2.5-sunburst (high, 1024×1024): ≈ USD 0,05 por marca
  --marca m        isotipo (la nave sola, default) | logotipo (el logo completo «efeonce» con la nave en la «o»)
  --tecnica t      (con --acabado) cómo está aplicada la marca, en inglés, para el prompt. P. ej. "screen-printed
                   with a slightly metallic navy ink, as on an aerospace metal panel". Default: impresión fina al ras
  --superficie t   (con --acabado) qué superficie lleva la marca, en inglés, para el prompt. P. ej.
                   "a white armored chest plate of a futuristic suit". Default: la superficie al centro del recorte
  --lado px        (con --acabado) lado del recorte que ve el modelo. Default: 512
  --oclusion m.png máscara de lo que está DELANTE de la marca (formato canónico de pnpm ai:mask: blanco = delante).
                   La piel, el pelo y otros materiales se detectan solos por color; esta máscara es para lo que tiene
                   el color de la prenda (la manga de la misma chaqueta cruzando el pecho): sepáralo con pnpm ai:layers
                   y pnpm ai:mask --from-layer. La marca pasa por detrás y lo de delante no se limpia
  --pliegues n     0–1: cuánto tiñe la luz local de la tela a la marca (la sombra de un pliegue la oscurece). Default 1;
                   0 la compone plana como antes
  --relieve n      0–2: cuánto se desplaza la marca con el gradiente del pliegue. Default 1
  --escorzo f      0,15–1: compresión horizontal de la marca en un giro del torso (1 = de frente; ≈ 0,75 a 45°,
                   ≈ 0,5 a 70° del lado cercano, ≈ 0,3 del lejano). --ancho sigue siendo el ancho SIN escorzo
  --out archivo    salida. Default: <plate>-isotipo.png junto al plate

Antes: las referencias del kit en la ficha y pnpm foto:emblema. Después: pnpm foto:emblema <salida> para mirarlo al 100 %.
`

export class IsotipoError extends Error {
  /** `uso: false` cuando el error no es de argumentos: la ayuda del comando no aclara nada. */
  constructor(message, { uso = true } = {}) {
    super(message)
    this.name = 'IsotipoError'
    this.uso = uso
  }
}

const validar = ({ centro, ancho, prenda, rotacion, brillo, umbral, acabado = false, superficie = null, lado = LADO_RECORTE, marca = 'isotipo', tecnica = null, pliegues = 1, relieve = 1, escorzo = 1 }) => {
  if (!['isotipo', 'logotipo'].includes(marca)) throw new IsotipoError('--marca es isotipo o logotipo.')
  if (!(pliegues >= 0 && pliegues <= 1)) throw new IsotipoError('--pliegues va entre 0 (apagado) y 1.')
  if (!(relieve >= 0 && relieve <= 2)) throw new IsotipoError('--relieve va entre 0 y 2.')
  if (!(escorzo >= 0.15 && escorzo <= 1)) throw new IsotipoError('--escorzo va entre 0,15 y 1 (1 = de frente).')
  if (!acabado && tecnica !== null) throw new IsotipoError('--tecnica sólo aplica con --acabado.')

  if (tecnica !== null && (typeof tecnica !== 'string' || tecnica.trim().length < 3 || tecnica.length > 300 || /[\r\n]/.test(tecnica))) {
    throw new IsotipoError('--tecnica es una frase de 3 a 300 caracteres, en una línea.')
  }

  if (centro.length !== 2 || centro.some(v => !(v >= 0 && v <= 1))) throw new IsotipoError('--centro debe ser x,y entre 0 y 1.')
  if (!(ancho > 0 && ancho < 0.5)) throw new IsotipoError('--ancho debe estar entre 0 y 0,5 del ancho del plate.')
  if (!['oscura', 'clara'].includes(prenda)) throw new IsotipoError('--prenda es oscura o clara.')
  if (!(brillo >= 0.5 && brillo <= 1)) throw new IsotipoError('--brillo va entre 0,5 y 1.')
  if (!Number.isFinite(rotacion) || Math.abs(rotacion) > 45) throw new IsotipoError('--rotacion va entre -45 y 45 grados.')
  if (!(umbral > 0 && umbral < 255)) throw new IsotipoError('--umbral va entre 1 y 254.')

  // Sin --acabado, --superficie y --lado no hacen nada: callarlo dejaría creer que se aplicaron.
  if (!acabado && (superficie !== null || lado !== LADO_RECORTE)) throw new IsotipoError('--superficie y --lado sólo aplican con --acabado.')
  if (!Number.isInteger(lado) || lado < 128 || lado > 2048) throw new IsotipoError('--lado va entre 128 y 2048 px, entero.')

  if (superficie !== null && (typeof superficie !== 'string' || superficie.trim().length < 3 || superficie.length > 300 || /[\r\n]/.test(superficie))) {
    throw new IsotipoError('--superficie es una frase de 3 a 300 caracteres, en una línea.')
  }
}

/** Lee y valida los argumentos del CLI. Lanza `IsotipoError` con el mensaje para el operador. */
const BANDERAS = new Set(['--sin-limpiar', '--acabado'])

export const parseArgs = argv => {
  const args = [...argv]

  const isValueOf = a => {
    const i = args.indexOf(a)

    return i > 0 && args[i - 1].startsWith('--') && !BANDERAS.has(args[i - 1])
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
    acabado: args.includes('--acabado'),
    superficie: opt('superficie', null),
    marca: opt('marca', 'isotipo'),
    tecnica: opt('tecnica', null),
    lado: Number(opt('lado', String(LADO_RECORTE))),
    oclusion: opt('oclusion', null),
    pliegues: Number(opt('pliegues', '1')),
    relieve: Number(opt('relieve', '1')),
    escorzo: Number(opt('escorzo', '1')),
    out: opt('out', plate.replace(/\.png$/i, '') + '-isotipo.png')
  }

  validar(opciones)

  return opciones
}

/** El SVG oficial del paquete de marca y su huella. */
export const isotipoOficial = async (prenda, marca = 'isotipo') => {
  const pkgJson = require.resolve('@efeoncepro/axis-brand-assets/package.json')
  const pkg = JSON.parse(await readFile(pkgJson, 'utf8'))
  const familia = marca === 'logotipo' ? 'efeonce-logo' : 'efeonce-isotype'
  const variante = `${familia}-${prenda === 'oscura' ? 'negative' : 'positive'}`
  const svg = await readFile(path.join(path.dirname(pkgJson), 'assets', `${variante}.svg`))
  // Las proporciones salen del viewBox del archivo oficial, no de una constante: isotipo 727,4 × 516,12, logo 837,07 × 196,68.
  const [, , vbW, vbH] = String(svg).match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

  return { svg, variante, marca, vbW, vbH, paquete: `${pkg.name}@${pkg.version}`, sha256: createHash('sha256').update(svg).digest('hex') }
}

// ─── Zona de la marca: tela, marca inventada y OCLUSORES [2026-10-03] ─────────────────────────────────────
//
// Antes la limpieza rellenaba con la tela TODO píxel que se apartara de su tono: una mano, un brazo o un objeto
// que tapara el pecho quedaban pintados de tela (EC2, la mano de Karo: un rectángulo navy sobre los dedos), y el
// isotipo se componía ENCIMA de lo que estuviera delante. Ahora cada píxel de la caja se clasifica:
//   · TELA: el tono del anillo, o el mismo matiz con otra luz (la sombra y el brillo de un pliegue). Se conserva:
//     antes la limpieza aplanaba también los pliegues que pasaban por la caja.
//   · MARCA INVENTADA: hilo — más claro que una tela oscura y casi neutro, o más oscuro que una tela clara y azul —.
//     Es lo único que se limpia.
//   · OCLUSOR: todo lo demás (piel, pelo, otro material) más lo que diga `--oclusion` (máscara canónica de
//     `pnpm ai:mask`, blanco = lo que está DELANTE: un brazo separado con `pnpm ai:layers` cuando tiene el mismo
//     color de la prenda y el color no alcanza). No se limpia y la marca pasa POR DETRÁS.
// La SUPERFICIE (tela + marca inventada) es donde puede ir la marca oficial.

const lumDe = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** Clase de cada píxel de la caja: 0 tela · 1 marca inventada · 2 oclusor. Exportada para las pruebas. */
export const clasificarZona = (raw, { W, H, ch, box, umbral, prenda = 'oscura', oclusion = null }) => {
  const anillo = []
  const ring = 4

  for (let y = box.top - ring; y < box.top + box.height + ring; y++) {
    for (let x = box.left - ring; x < box.left + box.width + ring; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const dentro = x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height

      if (dentro) continue
      // Un oclusor declarado que cruza el anillo no es tela: no entra a la mediana.
      if (oclusion && oclusion[y * W + x]) continue
      const i = (y * W + x) * ch

      anillo.push([raw[i], raw[i + 1], raw[i + 2]])
    }
  }

  const med = k => {
    const v = anillo.map(p => p[k]).sort((a, b) => a - b)

    return v[Math.floor(v.length / 2)] ?? 0
  }

  const tela = [med(0), med(1), med(2)]
  const telaLum = lumDe(...tela)
  const sumaTela = Math.max(1, tela[0] + tela[1] + tela[2])
  const cromaTela = tela.map(v => v / sumaTela)
  const clase = new Uint8Array(box.width * box.height)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const p = (box.top + y) * W + (box.left + x)
      const i = p * ch
      const r = raw[i]
      const g = raw[i + 1]
      const b = raw[i + 2]
      const j = y * box.width + x

      if (oclusion && oclusion[p]) {
        clase[j] = 2
        continue
      }

      const l = lumDe(r, g, b)

      if (Math.abs(l - telaLum) <= umbral) continue // tela

      const suma = r + g + b
      const cd = suma ? Math.hypot(r / suma - cromaTela[0], g / suma - cromaTela[1], b / suma - cromaTela[2]) : 0

      // El mismo matiz con otra luz es tela: la sombra o el brillo de un pliegue. Lo muy oscuro también (el matiz
      // ahí es ruido) — un pelo negro sobre una prenda navy no se distingue por color: para eso está `--oclusion`.
      if (cd < 0.06 || suma < 75) continue

      const max = Math.max(r, g, b)
      const sat = max ? (max - Math.min(r, g, b)) / max : 0
      const calido = r > b + 12 && r >= g
      // Hilo blanco sobre tela oscura = una MEZCLA de los dos: su croma cae sobre la recta que va de la tela al
      // neutro (el borde antialiasado de un trazo blanco sobre navy es azul claro, con saturación alta). La piel,
      // aunque esté igual de clara, cae fuera de esa recta.
      const c = suma ? [r / suma, g / suma, b / suma] : cromaTela
      const eje = [1 / 3 - cromaTela[0], 1 / 3 - cromaTela[1], 1 / 3 - cromaTela[2]]
      const largo = Math.hypot(...eje) || 1
      const t = ((c[0] - cromaTela[0]) * eje[0] + (c[1] - cromaTela[1]) * eje[1] + (c[2] - cromaTela[2]) * eje[2]) / (largo * largo)
      const resto = Math.hypot(c[0] - cromaTela[0] - t * eje[0], c[1] - cromaTela[1] - t * eje[1], c[2] - cromaTela[2] - t * eje[2])
      const mezcla = t > 0 && t < 1.25 && resto < 0.035

      const hilo = prenda === 'clara'
        ? l < telaLum && b >= r && !calido
        : l > telaLum && (sat < 0.35 || mezcla) && !calido

      clase[j] = hilo ? 1 : 2
    }
  }

  // El oclusor CRECE hacia lo que se clasificó como hilo pero es más oscuro que el hilo: el borde en sombra de una mano
  // bajo luz fría queda gris azulado y pasa el test de color (EC2, la mano de Karo). El hilo real es lo más claro de
  // la caja; el umbral es el 55 % del camino entre la tela y el percentil 90 de lo clasificado como hilo.
  const lumsHilo = []

  for (let j = 0; j < clase.length; j++) {
    if (clase[j] !== 1) continue
    const i = ((box.top + Math.floor(j / box.width)) * W + box.left + (j % box.width)) * ch

    lumsHilo.push(lumDe(raw[i], raw[i + 1], raw[i + 2]))
  }

  if (lumsHilo.length && clase.includes(2)) {
    lumsHilo.sort((a, b) => a - b)
    const p90 = lumsHilo[Math.floor(lumsHilo.length * 0.9)]
    const nivel = prenda === 'clara' ? telaLum - 0.55 * (telaLum - lumsHilo[Math.floor(lumsHilo.length * 0.1)]) : telaLum + 0.55 * (p90 - telaLum)
    const pila = []

    for (let j = 0; j < clase.length; j++) if (clase[j] === 2) pila.push(j)

    while (pila.length) {
      const j = pila.pop()
      const x = j % box.width
      const y = (j - x) / box.width

      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const xx = x + ddx
        const yy = y + ddy

        if (xx < 0 || yy < 0 || xx >= box.width || yy >= box.height) continue
        const k = yy * box.width + xx

        if (clase[k] !== 1) continue
        const i = ((box.top + yy) * W + box.left + xx) * ch
        const l = lumDe(raw[i], raw[i + 1], raw[i + 2])

        if (prenda === 'clara' ? l > nivel : l < nivel) {
          clase[k] = 2
          pila.push(k)
        }
      }
    }
  }

  return { clase, tela, telaLum }
}

/** Máscara de oclusión desde un PNG canónico de `ai:mask` (blanco = delante), al tamaño del plate. */
export const leerOclusion = async (ruta, W, H) => {
  if (!existsSync(ruta)) throw new IsotipoError(`no existe la máscara de oclusión ${ruta}.`)
  const { data } = await sharp(ruta).flatten({ background: '#000000' }).resize(W, H, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const m = new Uint8Array(W * H)
  let n = 0

  for (let p = 0; p < W * H; p++) if (data[p] > 127) { m[p] = 1; n++ }

  return { mascara: m, pixeles: n, sha256: createHash('sha256').update(await readFile(ruta)).digest('hex') }
}

/**
 * Limpia SÓLO la marca inventada: la rellena con la tela suavizada (la trama, los pliegues y los oclusores quedan
 * intactos). Devuelve la placa limpia y la clasificación de la caja.
 */
const limpiarZona = async (raw, { W, H, ch, box, umbral, embW, prenda, oclusion }) => {
  const { clase, tela } = clasificarZona(raw, { W, H, ch, box, umbral, prenda, oclusion })
  const relleno = Buffer.alloc(box.width * box.height * 3)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const i = ((box.top + y) * W + (box.left + x)) * ch
      const j = y * box.width + x
      // El relleno se difumina desde la tela y la sombra vecinas; un oclusor no debe teñirlo.
      const src = clase[j] === 0 ? [raw[i], raw[i + 1], raw[i + 2]] : tela

      relleno[j * 3] = src[0]
      relleno[j * 3 + 1] = src[1]
      relleno[j * 3 + 2] = src[2]
    }
  }

  // Dilata la marca inventada 2 px (su borde antialiasado también se va), sin entrar nunca en un oclusor.
  const dil = new Uint8Array(clase.length)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      if (clase[y * box.width + x] !== 1) continue

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy
          const xx = x + dx

          if (yy >= 0 && xx >= 0 && yy < box.height && xx < box.width && clase[yy * box.width + xx] !== 2) dil[yy * box.width + xx] = 1
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

  return { limpio, clase }
}

/**
 * Pliegues: la marca oficial se tiñe con la luz LOCAL de la tela (la sombra de un pliegue la oscurece, su brillo la
 * aclara) y se desplaza con el gradiente de esa luz, como se curva un bordado sobre una arruga. La luz local es la
 * luminancia de la placa limpia, suavizada para quedarse con la forma del pliegue y no con la trama.
 * Devuelve, por píxel de la caja, el factor de luz y el desplazamiento en px.
 */
export const campoDePliegues = async (limpio, { W, ch, box, telaLum, embW, intensidad = 1, relieve = 1 }) => {
  const lumBox = Buffer.alloc(box.width * box.height)

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const i = ((box.top + y) * W + (box.left + x)) * ch

      lumBox[y * box.width + x] = Math.round(lumDe(limpio[i], limpio[i + 1], limpio[i + 2]))
    }
  }

  const sigma = Math.max(1.2, embW * 0.05)
  // sharp devuelve 3 canales al desenfocar un buffer de 1: sin `extractChannel(0)` el índice se desalinea.
  const suave = await sharp(lumBox, { raw: { width: box.width, height: box.height, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer()
  const base = Math.max(8, telaLum)
  const luz = new Float32Array(box.width * box.height)
  const dx = new Float32Array(box.width * box.height)
  const dy = new Float32Array(box.width * box.height)
  const maxD = embW * 0.06 * relieve
  const k = embW * 0.35 * relieve

  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const j = y * box.width + x
      const f = suave[j] / base

      luz[j] = 1 + (Math.min(1.35, Math.max(0.55, f)) - 1) * intensidad
      const gx = (suave[y * box.width + Math.min(box.width - 1, x + 1)] - suave[y * box.width + Math.max(0, x - 1)]) / (2 * base)
      const gy = (suave[Math.min(box.height - 1, y + 1) * box.width + x] - suave[Math.max(0, y - 1) * box.width + x]) / (2 * base)

      dx[j] = Math.max(-maxD, Math.min(maxD, gx * k))
      dy[j] = Math.max(-maxD, Math.min(maxD, gy * k))
    }
  }

  return { luz, dx, dy }
}

/** Muestra bilineal RGBA de un buffer `w`×`h`. */
const muestrear = (buf, w, h, x, y) => {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return [0, 0, 0, 0]
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const fx = x - x0
  const fy = y - y0
  const out = [0, 0, 0, 0]

  for (let c = 0; c < 4; c++) {
    const a = buf[(y0 * w + x0) * 4 + c] * (1 - fx) + buf[(y0 * w + x1) * 4 + c] * fx
    const b = buf[(y1 * w + x0) * 4 + c] * (1 - fx) + buf[(y1 * w + x1) * 4 + c] * fx

    out[c] = a * (1 - fy) + b * fy
  }

  return out
}

/**
 * Compone la marca oficial sobre la placa: sólo sobre la SUPERFICIE (los oclusores quedan delante, con su borde
 * suavizado 1 px) y, con pliegues, teñida y desplazada por el campo de la tela.
 */
export const componerSobreSuperficie = async (limpio, { W, H, ch, box, clase, emb, ew, eh, left, top, pliegues = null }) => {
  // Superficie suavizada: el borde del oclusor no deja un escalón en la marca.
  const sup = Buffer.alloc(box.width * box.height)

  for (let j = 0; j < sup.length; j++) sup[j] = clase[j] === 2 ? 0 : 255
  const supSuave = await sharp(sup, { raw: { width: box.width, height: box.height, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer()

  const salida = Buffer.from(limpio)
  let tapados = 0

  for (let y = Math.max(0, top); y < Math.min(H, top + eh); y++) {
    for (let x = Math.max(0, left); x < Math.min(W, left + ew); x++) {
      const bx = x - box.left
      const by = y - box.top
      const enCaja = bx >= 0 && by >= 0 && bx < box.width && by < box.height
      const j = enCaja ? by * box.width + bx : -1
      const ddx = pliegues && enCaja ? pliegues.dx[j] : 0
      const ddy = pliegues && enCaja ? pliegues.dy[j] : 0
      const [r, g, b, a0] = muestrear(emb, ew, eh, x - left - ddx, y - top - ddy)

      if (a0 <= 0) continue
      const s = enCaja ? supSuave[j] / 255 : 1

      if (s < 1 && a0 > 127) tapados++
      const a = (a0 / 255) * s

      if (a <= 0) continue
      const luz = pliegues && enCaja ? pliegues.luz[j] : 1
      const i = (y * W + x) * ch

      salida[i] = Math.round(salida[i] * (1 - a) + Math.min(255, r * luz) * a)
      salida[i + 1] = Math.round(salida[i + 1] * (1 - a) + Math.min(255, g * luz) * a)
      salida[i + 2] = Math.round(salida[i + 2] * (1 - a) + Math.min(255, b * luz) * a)
    }
  }

  return { salida, tapados }
}

/**
 * @typedef {object} Acabado
 * @property {'aprobado' | 'rechazado'} veredicto
 * @property {string} out ruta del acabado
 * @property {string} comparar ruta de la hoja antes/después al 300 %
 * @property {{ solicitado: string, devuelto: string | null, calidad: string, tamano: string, costoEstimadoUsd?: number | null }} modelo
 * @property {{ zonaMarcaPx: number, cambiadosFueraDeLaMarca: number, cambiadosEnLaMarca: number }} verificacion
 */

/**
 * Compone el isotipo oficial sobre el plate y escribe la salida y su procedencia. Con `acabado: true`, además
 * el modelo termina la marca (paso 4) y el resultado trae `acabado`.
 * @returns {Promise<{ out: string, procedencia: object, embW: number, variante: string, acabado?: Acabado }>}
 */
export const componerIsotipo = async opciones => {
  const { plate, centro, ancho, prenda, rotacion, umbral, brillo, limpiar, out, acabado, superficie, lado, editar, zonaMarcaPx, marca, tecnica, oclusion, pliegues, relieve, escorzo } = {
    prenda: 'oscura',
    oclusion: null,
    pliegues: 1,
    relieve: 1,
    escorzo: 1,
    rotacion: 0,
    umbral: 38,
    brillo: 0.85,
    limpiar: true,
    acabado: false,
    superficie: null,
    lado: LADO_RECORTE,
    marca: 'isotipo',
    tecnica: null,
    ...opciones
  }

  validar({ centro, ancho, prenda, rotacion, brillo, umbral, acabado, superficie, lado, marca, tecnica, pliegues, relieve, escorzo })

  if (!plate || !existsSync(plate)) throw new IsotipoError(`no existe el plate ${plate ?? '(vacío)'}.`)

  const destino = out ?? plate.replace(/\.png$/i, '') + '-isotipo.png'

  // La procedencia se escribe junto a la salida cambiando la extensión: sin `.png`, el .json pisaba la imagen.
  if (!/\.png$/i.test(destino)) throw new IsotipoError('--out debe terminar en .png.')
  const oficial = await isotipoOficial(prenda, marca)

  const { data: raw, info } = await sharp(plate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const ch = info.channels

  const embW = Math.max(8, Math.round(ancho * W))
  const cx = Math.round(centro[0] * W)
  const cy = Math.round(centro[1] * H)

  // El isotipo es 727,4 × 516,12: la caja de limpieza toma el emblema con holgura para cubrir la marca
  // inventada, que suele ser más grande que la oficial.
  const embH = Math.round(embW * (oficial.vbH / oficial.vbW))
  const pad = Math.round(embW * 0.35)

  const box = {
    left: Math.max(0, cx - Math.round(embW / 2) - pad),
    top: Math.max(0, cy - Math.round(embH / 2) - pad)
  }

  box.width = Math.min(W - box.left, embW + pad * 2)
  box.height = Math.min(H - box.top, embH + pad * 2)

  const oclusionLeida = oclusion ? await leerOclusion(oclusion, W, H) : null

  const zona = limpiar
    ? await limpiarZona(raw, { W, H, ch, box, umbral, embW, prenda, oclusion: oclusionLeida?.mascara ?? null })
    : { limpio: raw, clase: clasificarZona(raw, { W, H, ch, box, umbral, prenda, oclusion: oclusionLeida?.mascara ?? null }).clase }

  const limpio = zona.limpio
  const telaLum = clasificarZona(limpio, { W, H, ch, box, umbral, prenda, oclusion: oclusionLeida?.mascara ?? null }).telaLum

  let emblema = sharp(oficial.svg, { density: 72 * Math.max(1, (embW * 2) / oficial.vbW) })
    .resize({ width: embW })
    .png()

  // ESCORZO [operador, 2026-10-03]: en un giro del torso la marca se COMPRIME en horizontal — no se rota en el
  // plano. Sin una referencia en esa perspectiva el modelo la rota (medido: hasta ~35° en las vistas puestas a 70°),
  // así que en un giro profundo la marca se compone con su escorzo y el modelo sólo la termina.
  if (escorzo < 1) {
    emblema = sharp(await emblema.toBuffer())
      .resize({ width: Math.max(4, Math.round(embW * escorzo)), height: embH, fit: 'fill' })
      .png()
  }

  if (rotacion) emblema = emblema.rotate(rotacion, { background: { r: 0, g: 0, b: 0, alpha: 0 } })

  // El hilo recibe la misma luz que la tela: el blanco puro de un archivo vectorial se lee pegado encima.
  // Y el emblema no puede quedar más nítido que la tela que lo lleva.
  const embBuf = await sharp(await emblema.toBuffer())
    .linear([brillo, brillo, brillo, 1], [0, 0, 0, 0])
    .blur(0.4)
    .png()
    .toBuffer()

  const { data: emb, info: embInfo } = await sharp(embBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const campo = pliegues > 0 ? await campoDePliegues(limpio, { W, ch, box, telaLum, embW, intensidad: pliegues, relieve }) : null

  const { salida: compuesta, tapados } = await componerSobreSuperficie(limpio, {
    W,
    H,
    ch,
    box,
    clase: zona.clase,
    emb,
    ew: embInfo.width,
    eh: embInfo.height,
    left: Math.round(cx - embInfo.width / 2),
    top: Math.round(cy - embInfo.height / 2),
    pliegues: campo
  })

  await sharp(compuesta, { raw: { width: W, height: H, channels: ch } }).png().toFile(destino)

  let oclusores = 0

  for (const c of zona.clase) if (c === 2) oclusores++

  const procedencia = {
    schema: 'efeonce.foto.isotipo.v2',
    plate: path.basename(plate),
    salida: path.basename(destino),
    paquete: oficial.paquete,
    archivo: `assets/${oficial.variante}.svg`,
    sha256: oficial.sha256,
    marca: oficial.marca,
    prenda,
    caja: { centro, ancho, rotacion, ...(escorzo < 1 ? { escorzo } : {}) },
    brillo,
    limpieza: limpiar ? { umbral } : null,
    // Lo que quedó DELANTE de la marca: detectado por color en la caja y, si se declaró, la máscara de `--oclusion`.
    oclusion: {
      pixelesEnCaja: oclusores,
      pixelesDeMarcaTapados: tapados,
      ...(oclusionLeida ? { mascara: path.basename(oclusion), sha256: oclusionLeida.sha256, pixeles: oclusionLeida.pixeles } : {})
    },
    pliegues: pliegues > 0 ? { intensidad: pliegues, relieve } : null,
    creado: new Date().toISOString()
  }

  const rutaProcedencia = destino.replace(/\.png$/i, '.json')

  await writeFile(rutaProcedencia, JSON.stringify(procedencia, null, 2) + '\n')

  const resultado = { out: destino, procedencia, embW, variante: oficial.variante }

  if (!acabado) return resultado

  // La silueta se mide contra la placa YA LIMPIA (antes de pegar el emblema), no contra el original: con la
  // limpieza encendida, la zona donde estaba el emblema inventado también difiere del original, y el acabado
  // del modelo caería ahí como un halo.
  const terminado = await terminarIsotipo({
    base: { data: limpio, width: W, height: H, channels: ch },
    compuesto: destino,
    rutaProcedencia,
    centro,
    ancho,
    prenda,
    superficie,
    lado,
    marca,
    tecnica,
    ...(editar ? { editar } : {}),
    ...(zonaMarcaPx !== undefined ? { zonaMarcaPx } : {})
  })

  return { ...resultado, procedencia: terminado.procedencia, acabado: terminado.acabado }
}

// ─── Acabado: el modelo TERMINA la marca compuesta ────────────────────────────────────────────────────────
//
// Regla del operador 2026-09-28 (`.claude/rules/brand-photography.md`, «Si compones el isotipo, el modelo lo
// TERMINA»): compuesto solo, el isotipo se ve pegado encima. Método probado en MC1h y MC4g:
//   1. recorte de 512 px alrededor de la marca compuesta, ampliado a 1024;
//   2. `pnpm ai:image` (gpt-image-2.5-sunburst, high, 1024×1024) con un prompt que declara la marca TERMINADA e
//      intacta y pide sólo materia y luz;
//   3. la edición vuelve a la placa SÓLO sobre la silueta del isotipo (diferencia compuesto − base > 10 de
//      luminancia, dilatada 3 px, alfa con blur 1,6), con el color corregido SÓLO por el desplazamiento de la
//      media por canal en un anillo de 14 px alrededor.
// Trampas medidas: mezclar el recorte entero o una elipse deja halo, porque el modelo aclara todo el recorte;
// escalar también el desvío de color vuelve la marca verde azulado o lavada; pedir que la marca «se asiente» dio
// en MC5g un relieve con borde claro, por eso el prompt la pide a ras, como impresión fina.

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]

/** Prompt de acabado. `superficie` nombra lo que muestra el recorte; el color de la marca sale de la prenda. */
export const promptAcabado = ({ prenda, superficie = null, marca = 'isotipo', tecnica = null }) => {
  const color = prenda === 'clara' ? 'navy' : 'white'
  const sobre = superficie?.trim() || 'the surface at the centre of this crop'

  return (
    `This is a crop of a real photograph: ${sobre}. A small ${color} Efeonce mark (` +
    (marca === 'logotipo'
      ? 'the full wordmark: the letters e-f-e-o-n-c-e where the o is a rocket with three round windows inside an elliptical orbit, with a small sphere on top'
      : 'a rocket with three round windows inside an elliptical orbit, with a small sphere on top') +
    ') was placed flat on it. It is finished, official artwork: ' +
    `keep its shape, every part, its proportions, its ${color} colour, its exact size and its exact position — do NOT ` +
    'redraw, restyle, re-letter, simplify, resize or move it. You are only adding MATERIAL and LIGHT so it reads as a ' +
    'real mark applied to that surface: let it follow the gentle curvature of the surface, pick up the same lighting ' +
    'gradient, the soft rim light and the faint reflections of the scene, lie perfectly flush with the surface as a ' +
    (tecnica?.trim() ? `mark ${tecnica.trim()}` : 'thin printed decal') +
    ' — NO relief, NO bevel, NO emboss, NO highlight rim around it — with only a tiny edge softness, ' +
    'and carry the same grain, softness and depth of field as the surface around it. Keep everything else in the ' +
    'image exactly as it is: same framing, same surface, same colours. No text, no extra marks.'
  )
}

const sha256 = buf => createHash('sha256').update(buf).digest('hex')

/** Dilatación circular de una máscara binaria de `lado`×`lado`. */
const dilatar = (mascara, lado, r) => {
  const d = new Uint8Array(mascara.length)

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (!mascara[y * lado + x]) continue

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const yy = y + dy
          const xx = x + dx

          if (yy >= 0 && xx >= 0 && yy < lado && xx < lado && dx * dx + dy * dy <= r * r) d[yy * lado + xx] = 1
        }
      }
    }
  }

  return d
}

/** Silueta de la marca dentro de la caja: donde el compuesto se aparta de la base en más de UMBRAL_SILUETA. */
const siluetaEnCaja = ({ base, compuesto, caja }) => {
  const { lado, left, top } = caja
  const mascara = new Uint8Array(lado * lado)
  let pixeles = 0
  let x0 = lado
  let y0 = lado
  let x1 = -1
  let y1 = -1

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const p = (top + y) * base.width + left + x

      if (Math.abs(lum(base.data, p * base.channels) - lum(compuesto.data, p * compuesto.channels)) <= UMBRAL_SILUETA) continue

      mascara[y * lado + x] = 1
      pixeles++
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  }

  return { mascara, pixeles, bbox: { x0, y0, x1, y1 } }
}

/**
 * Cuenta los píxeles que cambiaron entre `antes` y `despues` (todos los canales, toda la imagen), separando los
 * que caen dentro de la zona de la marca (`zona`, máscara de la caja) de los que caen fuera.
 */
export const contarCambios = ({ antes, despues, zona, caja }) => {
  if (antes.width !== despues.width || antes.height !== despues.height || antes.channels !== despues.channels) {
    throw new IsotipoError('el acabado cambió el tamaño o los canales de la placa.', { uso: false })
  }

  const { width: W, height: H, channels: ch } = antes
  let fuera = 0
  let dentro = 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch
      let cambio = false

      for (let k = 0; k < ch; k++) {
        if (antes.data[i + k] !== despues.data[i + k]) {
          cambio = true
          break
        }
      }

      if (!cambio) continue

      const enCaja = x >= caja.left && x < caja.left + caja.lado && y >= caja.top && y < caja.top + caja.lado

      if (enCaja && zona[(y - caja.top) * caja.lado + (x - caja.left)]) dentro++
      else fuera++
    }
  }

  return { fuera, dentro }
}

/**
 * Pide el acabado a `pnpm ai:image`. `ai:image` atrapa el error de cada pieza, imprime `FAILED` y sale con
 * código 0: el código de salida NO prueba que haya edición, así que se exige el archivo.
 */
export const editarConAiImage = async ({ recorte, edicion, prompt }) => {
  // `ai:image` corre en la raíz del repo: las rutas van absolutas para no depender del cwd de quien llama.
  const argv = ['-s', 'ai:image', '--model', MODELO_ACABADO, '--quality', CALIDAD_ACABADO, '--size', `${LADO_MODELO}x${LADO_MODELO}`, '--image', path.resolve(recorte), '--out', path.resolve(edicion), '--prompt', prompt]

  const { codigo, salida } = await new Promise((resolve, reject) => {
    const hijo = spawn('pnpm', argv, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] })
    let texto = ''

    hijo.stdout.on('data', d => {
      texto += d
      process.stdout.write(d)
    })
    hijo.stderr.on('data', d => {
      texto += d
      process.stderr.write(d)
    })
    hijo.on('error', reject)
    hijo.on('close', code => resolve({ codigo: code, salida: texto }))
  }).catch(error => {
    throw new IsotipoError(`no se pudo lanzar pnpm ai:image: ${error.message}`, { uso: false })
  })

  if (codigo !== 0) throw new IsotipoError(`pnpm ai:image terminó con código ${codigo}; no hay acabado.`, { uso: false })

  if (/FAILED|FATAL/.test(salida) || !existsSync(edicion)) {
    const motivo = salida.split('\n').find(l => /FAILED|FATAL/.test(l))?.trim()

    throw new IsotipoError(`pnpm ai:image no devolvió la edición${motivo ? ` (${motivo})` : ''}; no hay acabado.`, { uso: false })
  }

  const ok = salida.match(/✓ \S+ · (\S+) · (\S+) · (\S+)/)
  const uso = salida.match(/usage: in (\d+).*?out (\d+).*?total (\d+)/)
  const costo = salida.match(/costo estimado ≈ USD ([\d.]+)/)

  return {
    solicitado: MODELO_ACABADO,
    devuelto: ok?.[1] ?? null,
    calidad: ok?.[3] ?? CALIDAD_ACABADO,
    tamano: ok?.[2] ?? `${LADO_MODELO}x${LADO_MODELO}`,
    uso: uso ? { entrada: Number(uso[1]), salida: Number(uso[2]), total: Number(uso[3]) } : null,
    costoEstimadoUsd: costo ? Number(costo[1]) : null
  }
}

/** Hoja antes/después al 300 %: el compuesto a la izquierda, el acabado a la derecha, sin suavizar los píxeles. */
const hojaComparacion = async ({ antes, despues, cx, cy, embW, destino }) => {
  const { width: W, height: H } = await sharp(antes).metadata()
  const s = Math.min(W, H, Math.max(16, Math.round(embW * 3.2)))
  const left = Math.max(0, Math.min(W - s, Math.round(cx - s / 2)))
  const top = Math.max(0, Math.min(H - s, Math.round(cy - s / 2)))
  const panel = s * 3
  const ampliar = f => sharp(f).extract({ left, top, width: s, height: s }).removeAlpha().resize(panel, panel, { kernel: 'nearest' }).png().toBuffer()

  await sharp({ create: { width: panel * 2 + 10, height: panel, channels: 3, background: '#888888' } })
    .composite([
      { input: await ampliar(antes), left: 0, top: 0 },
      { input: await ampliar(despues), left: panel + 10, top: 0 }
    ])
    .png()
    .toFile(destino)
}

/**
 * Paso 4: el modelo termina la marca ya compuesta en `compuesto`. `base` es la placa justo antes de pegar el
 * emblema (raw), para aislar su silueta. Escribe el acabado, el recorte, su edición, la hoja al 300 % y la
 * procedencia; falla si cambió un píxel fuera de la marca (y deja el archivo como `.rechazado.png`).
 * `editar` y `zonaMarcaPx` existen para las pruebas; el comando usa los valores por defecto.
 */
export const terminarIsotipo = async ({ base, compuesto, rutaProcedencia, centro, ancho, prenda, superficie = null, marca = 'isotipo', tecnica = null, lado: ladoPedido = LADO_RECORTE, editar = editarConAiImage, zonaMarcaPx = ZONA_MARCA_PX }) => {
  const raiz = compuesto.replace(/\.png$/i, '') + '-acabado'
  const salida = `${raiz}.png`
  const rechazado = `${raiz}.rechazado.png`
  const recorte = `${raiz}-recorte.png`
  const edicion = `${raiz}-edicion.png`
  const comparar = `${raiz}-comparar.png`

  // Nada de una corrida anterior puede pasar por resultado de ésta.
  await Promise.all([salida, rechazado, recorte, edicion, comparar].map(f => rm(f, { force: true })))

  const { data, info } = await sharp(compuesto).raw().toBuffer({ resolveWithObject: true })
  const comp = { data, width: info.width, height: info.height, channels: info.channels }

  if (comp.width !== base.width || comp.height !== base.height) throw new IsotipoError('la base y el compuesto no miden lo mismo.', { uso: false })

  const W = comp.width
  const H = comp.height
  const lado = Math.min(ladoPedido, W, H)
  const cx = Math.round(centro[0] * W)
  const cy = Math.round(centro[1] * H)
  const embW = Math.max(8, Math.round(ancho * W))

  const caja = {
    lado,
    left: Math.max(0, Math.min(W - lado, Math.round(cx - lado / 2))),
    top: Math.max(0, Math.min(H - lado, Math.round(cy - lado / 2)))
  }

  // Antes de gastar: la marca tiene que estar en el recorte y con aire para el anillo de color.
  const silueta = siluetaEnCaja({ base, compuesto: comp, caja })

  if (silueta.pixeles < 20) throw new IsotipoError('no se encontró la marca compuesta en el recorte: nada que terminar.', { uso: false })

  const { x0, y0, x1, y1 } = silueta.bbox

  if (Math.min(x0, y0, lado - 1 - x1, lado - 1 - y1) < ANILLO_COLOR) {
    throw new IsotipoError(`la marca no cabe en un recorte de ${lado} px con ${ANILLO_COLOR} px de aire; sube --lado.`, { uso: false })
  }

  await sharp(compuesto)
    .extract({ left: caja.left, top: caja.top, width: lado, height: lado })
    .removeAlpha()
    .resize(LADO_MODELO, LADO_MODELO, { kernel: 'lanczos3' })
    .png()
    .toFile(recorte)

  const prompt = promptAcabado({ prenda, superficie, marca, tecnica })
  const modelo = await editar({ recorte, edicion, prompt })

  const metaEdicion = await sharp(edicion).metadata()

  if (metaEdicion.width !== metaEdicion.height) {
    throw new IsotipoError(`la edición volvió de ${metaEdicion.width}×${metaEdicion.height}, no cuadrada: no calza con el recorte.`, { uso: false })
  }

  const { data: F, info: infoF } = await sharp(edicion).resize(lado, lado, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  if (infoF.channels !== 3) throw new IsotipoError('la edición no volvió en RGB.', { uso: false })

  // 3. Mezcla sólo sobre la silueta. Color: sólo el desplazamiento de la media por canal en el anillo que la
  // rodea (fuera de la silueta dilatada); escalar también el desvío cambiaba el tono de la marca.
  const nucleo = dilatar(silueta.mascara, lado, DILATACION_SILUETA)
  const anillo = dilatar(silueta.mascara, lado, ANILLO_COLOR)
  const sumaF = [0, 0, 0]
  const sumaC = [0, 0, 0]
  let n = 0

  for (let p = 0; p < lado * lado; p++) {
    if (!anillo[p] || nucleo[p]) continue
    const i = ((caja.top + Math.floor(p / lado)) * W + caja.left + (p % lado)) * comp.channels

    n++

    for (let k = 0; k < 3; k++) {
      sumaF[k] += F[p * 3 + k]
      sumaC[k] += comp.data[i + k]
    }
  }

  if (!n) throw new IsotipoError('no hay entorno para igualar el color de la edición.', { uso: false })

  const desplazamiento = sumaC.map((c, k) => (c - sumaF[k]) / n)

  // El blur de sharp devuelve 3 canales aunque entre uno: se toma el primero.
  const alfa = await sharp(Buffer.from(nucleo.map(v => v * 255)), { raw: { width: lado, height: lado, channels: 1 } })
    .blur(SIGMA_ALFA)
    .extractChannel(0)
    .raw()
    .toBuffer()

  const final = Buffer.from(comp.data)

  for (let p = 0; p < lado * lado; p++) {
    if (!alfa[p]) continue
    const a = alfa[p] / 255
    const i = ((caja.top + Math.floor(p / lado)) * W + caja.left + (p % lado)) * comp.channels

    for (let k = 0; k < 3; k++) {
      const g = Math.max(0, Math.min(255, Math.round(F[p * 3 + k] + desplazamiento[k])))

      final[i + k] = Math.round(g * a + comp.data[i + k] * (1 - a))
    }
  }

  await sharp(final, { raw: { width: W, height: H, channels: comp.channels } }).png().toFile(salida)
  await hojaComparacion({ antes: compuesto, despues: salida, cx, cy, embW, destino: comparar })

  // Verificación sobre lo que quedó en disco, contra el compuesto en disco.
  const leido = await sharp(salida).raw().toBuffer({ resolveWithObject: true })
  const zona = dilatar(silueta.mascara, lado, zonaMarcaPx)

  const cambios = contarCambios({
    antes: comp,
    despues: { data: leido.data, width: leido.info.width, height: leido.info.height, channels: leido.info.channels },
    zona,
    caja
  })

  const veredicto = cambios.fuera === 0 ? 'aprobado' : 'rechazado'

  if (veredicto === 'rechazado') await rename(salida, rechazado)

  const [bRecorte, bEdicion, bFinal] = await Promise.all([readFile(recorte), readFile(edicion), readFile(veredicto === 'aprobado' ? salida : rechazado)])

  const acabado = {
    veredicto,
    salida: path.basename(veredicto === 'aprobado' ? salida : rechazado),
    sha256: sha256(bFinal),
    recorte: { archivo: path.basename(recorte), sha256: sha256(bRecorte), caja, ampliadoA: LADO_MODELO },
    edicion: { archivo: path.basename(edicion), sha256: sha256(bEdicion) },
    modelo,
    prompt,
    promptSha256: sha256(prompt),
    superficie,
    mezcla: {
      umbralSilueta: UMBRAL_SILUETA,
      siluetaPx: silueta.pixeles,
      dilatacionPx: DILATACION_SILUETA,
      sigmaAlfa: SIGMA_ALFA,
      anilloColorPx: ANILLO_COLOR,
      desplazamientoColor: desplazamiento.map(v => Math.round(v * 100) / 100)
    },
    verificacion: { zonaMarcaPx, cambiadosFueraDeLaMarca: cambios.fuera, cambiadosEnLaMarca: cambios.dentro },
    comparacion: path.basename(comparar),
    creado: new Date().toISOString()
  }

  const procedencia = { ...JSON.parse(await readFile(rutaProcedencia, 'utf8')), acabado }

  await writeFile(rutaProcedencia, JSON.stringify(procedencia, null, 2) + '\n')

  if (veredicto === 'rechazado') {
    throw new IsotipoError(
      `el acabado cambió ${cambios.fuera} píxel(es) fuera de la marca (silueta + ${zonaMarcaPx} px): se deja como ${path.basename(rechazado)} y no se usa.`,
      { uso: false }
    )
  }

  return { procedencia, acabado: { ...acabado, out: salida, comparar } }
}

const esCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (esCli) {
  try {
    const opciones = parseArgs(process.argv.slice(2))
    const { out, procedencia, embW, variante, acabado } = await componerIsotipo(opciones)

    console.log(`foto:isotipo → ${out}
  ${variante} de ${procedencia.paquete} (sha256 ${procedencia.sha256.slice(0, 12)}…), ${embW} px de ancho.`)

    if (acabado) {
      const { modelo, verificacion } = acabado
      const costo = modelo.costoEstimadoUsd === null ? '' : ` · ≈ USD ${modelo.costoEstimadoUsd}`

      console.log(`  acabado → ${acabado.out}
  ${modelo.devuelto ?? modelo.solicitado} · ${modelo.calidad} · ${modelo.tamano}${costo}
  fuera de la marca: ${verificacion.cambiadosFueraDeLaMarca} px cambiados · en la marca: ${verificacion.cambiadosEnLaMarca} px
  antes/después al 300 %: ${acabado.comparar} (izquierda el compuesto, derecha el acabado)
  Revisa al 100 %: pnpm foto:emblema ${acabado.out}`)
    } else {
      console.log(`  Revisa al 100 %: pnpm foto:emblema ${out}`)
    }
  } catch (error) {
    if (error instanceof IsotipoError) {
      console.error(`foto:isotipo — ${error.message}${error.uso ? `\n${USO}` : ''}`)
      process.exit(1)
    }

    throw error
  }
}
