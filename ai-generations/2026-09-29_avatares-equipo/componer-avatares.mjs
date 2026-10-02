// Avatares del equipo con el fondo nuevo (operador, 2026-09-29): navy de la línea «La órbita» con profundidad, sin halo
// (la firma y las tarjetas ya ponen la órbita del retrato al componer; el avatar no la lleva dentro).
// Colores desde el token `efeonceGraphicLine.color` (navy y dark), nunca transcritos.
// node ai-generations/2026-09-29_avatares-equipo/componer-avatares.mjs → recortes/ + avatares/<persona>.png (1080²)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const { removeBackground } = require('@imgly/background-removal-node')
const { efeonceGraphicLine } = require('@efeoncepro/axis-tokens')
const { orbitSvg } = require('@efeoncepro/axis-graphic-line')

const DIR = new URL('./', import.meta.url).pathname
const LADO = 1080

mkdirSync(DIR + 'recortes', { recursive: true })
mkdirSync(DIR + 'avatares', { recursive: true })

// Fuentes (todas 2304×1536) y medidas de Vision (`swift medir-rostro.swift`, avatares/_medidas.jsonl): ojos, mentón y
// centro de la cara. Todas las caras se llevan a la misma distancia ojos → mentón (OJOS_MENTON) con los ojos a la misma
// altura (OJOS_Y) y la cara centrada. Medir a ojo falló hasta 104 px de mentón (2026-09-29): nunca más a ojo.
const MEDIDAS = Object.fromEntries(readFileSync(DIR + 'avatares/_medidas.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l)).map(m => [m.archivo, m]))
const PERSONAS = {
  // desde su foto aprobada ap-01 (proporción real), extendida sólo hacia abajo: la extensión lateral cruzaba su brazo
  julio: { fuente: 'extendido/julio-ext-ok.png' },
  andres: { fuente: 'ancho/andres-ancho.png' },
  // Daniela y Humberly un poco más lejos del lente (operador, 2026-09-29): que se vea la chaqueta bajo el pelo largo
  daniela: { fuente: 'ancho/daniela-ancho.png', distancia: 0.86 },
  melkin: { fuente: 'ancho/melkin-ancho.png' },
  humberly: { fuente: 'ancho/humberly-ancho.png', distancia: 0.86 },
  valentina: { fuente: 'ancho/valentina-ancho-e.png' } // veta retocada y bordado movido al panel delantero del pecho
}
const OJOS_Y = 0.33
const OJOS_MENTON = 222
const SALIDA = process.env.SALIDA || 'avatares'


// Fondo (operador, 2026-09-29): el fondo oscuro de la línea con el HALO de la órbita, tal como lo pinta el paquete
// (`orbitSvg`, superficie oscura, línea growth): #001a33 + halo del acento con las paradas del token, radio
// haloRadiusRatio × la órbita de retrato (30 % del ancho), centrado en la cabeza. Se quitan el anillo, el arco y la
// esfera: la órbita la pone quien compone (la firma con portraitOrbitSvg). Grano fino contra el bandeado.
const fondo = async () => {
  const r = efeonceGraphicLine.orbit.radiusRatio.portraitOfWidth * LADO
  const { svg } = orbitSvg({ width: LADO, height: LADO, surface: 'dark', line: 'growth', circle: { cx: LADO / 2, cy: LADO * OJOS_Y, r }, halo: true, background: true, innerOrbits: false })
  const soloHalo = svg.replace(/<(circle|path)[^>]*data-axis-part="(ring|arc|sphere|sphere-ring|inner-orbit)"[^>]*\/>/g, '')

  if (/data-axis-part="(ring|arc|sphere)"/.test(soloHalo)) throw new Error('el fondo todavía trae partes de la órbita')
  const buf = await sharp(Buffer.from(soloHalo)).resize(LADO, LADO).removeAlpha().raw().toBuffer()
  let semilla = 7
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647 - 0.5

  for (let i = 0; i < buf.length; i++) buf[i] = Math.max(0, Math.min(255, Math.round(buf[i] + azar() * 2.2)))

  return buf
}

const recortar = async p => {
  const f = DIR + PERSONAS[p].fuente
  const salida = DIR + `recortes/${path.basename(f)}`

  if (existsSync(salida)) return readFileSync(salida)
  const blob = await removeBackground(new Blob([new Uint8Array(readFileSync(f))], { type: 'image/png' }), { model: 'medium', output: { format: 'image/png' } })
  const png = Buffer.from(await blob.arrayBuffer())

  writeFileSync(salida, png)

  return png
}

// Descontaminación del borde: en los píxeles semitransparentes el color es mezcla del sujeto y del fondo VIEJO.
// Se estima ese fondo (promedio del fondo cercano, por convolución normalizada) y se despeja el color del sujeto:
// F = (C − (1 − α)·B) / α. Así el pelo toma el navy nuevo en vez del morado, el naranja o el blanco de antes.
const descontaminar = async (fuente, recorte, yMenton, contraer = 18, peloBlanco = false) => {
  const { data: C, info } = await sharp(fuente).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const alfa = await sharp(recorte).resize(W, H).ensureAlpha().extractChannel(3).raw().toBuffer()

  // Del mentón hacia abajo sólo hay ropa sobre fondo: el alfa se vuelve firme. Un recorte indeciso ahí dejaba la chaqueta
  // semitransparente, en vetas (brazo de Julio, 2026-09-29). El pelo, arriba, conserva su borde suave.
  for (let i = W * Math.max(0, Math.round(yMenton)); i < W * H; i++) alfa[i] = alfa[i] >= 110 ? 255 : alfa[i] < 40 ? 0 : Math.round(((alfa[i] - 40) / 70) * 255)
  const fondoMask = Buffer.alloc(W * H), fondoPre = Buffer.alloc(W * H * 3)

  for (let i = 0; i < W * H; i++) {
    const b = alfa[i] < 20 ? 255 : 0

    fondoMask[i] = b
    for (let c = 0; c < 3; c++) fondoPre[i * 3 + c] = b ? C[i * 3 + c] : 0
  }

  const sig = 18
  const pre = await sharp(fondoPre, { raw: { width: W, height: H, channels: 3 } }).blur(sig).raw().toBuffer()
  const pes = await sharp(fondoMask, { raw: { width: W, height: H, channels: 1 } }).blur(sig).raw().toBuffer()
  const out = Buffer.alloc(W * H * 4)

  for (let i = 0; i < W * H; i++) {
    const a = alfa[i] / 255
    const w = pes[i] / 255

    for (let c = 0; c < 3; c++) {
      let v = C[i * 3 + c]

      if (a > 0.04 && a < 0.97 && w > 0.02) {
        const B = pre[i * 3 + c] / 255 / w * 255

        v = (v - (1 - a) * B) / a
      }

      out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)))
    }

    // contrae el alfa un poco: el filo semitransparente es donde más fondo viejo queda
    out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round((alfa[i] - contraer) * (255 / (255 - contraer)))))
  }

  // Filo del recorte (hasta ~3 px hacia adentro): se le quita el color y se oscurece un poco, para que ningún resto del
  // fondo viejo (morado, cian, blanco) quede como contorno. Y bajo el mentón, un resto de fondo viejo saturado y claro
  // (magenta/cian entre el brazo y el torso) se vuelve transparente. La cara no se toca.
  const erosion = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extractChannel(3).blur(2).raw().toBuffer()
  const bajoMenton = Math.round(yMenton)

  for (let i = 0; i < W * H; i++) {
    const r = out[i * 4], g = out[i * 4 + 1], b = out[i * 4 + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const s = mx ? (mx - mn) / mx : 0, v = mx / 255
    let h = 0

    if (mx !== mn) h = mx === r ? ((g - b) / (mx - mn)) * 60 : mx === g ? (2 + (b - r) / (mx - mn)) * 60 : (4 + (r - g) / (mx - mn)) * 60
    if (h < 0) h += 360
    const y = Math.floor(i / W)

    // el pelo nunca es morado: el morado/magenta que el fondo viejo dejó en los mechones se desatura en toda la imagen
    // (ni la piel ni el navy de la chaqueta caen en ese rango de tono)
    if (out[i * 4 + 3] > 0 && h >= 245 && h <= 335 && s > 0.18) {
      const l = 0.3 * r + 0.59 * g + 0.11 * b

      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(l * 0.92)
    }

    if (y > bajoMenton && out[i * 4 + 3] > 0 && h >= 160 && h <= 340 && v > 0.42 && s > 0.35) out[i * 4 + 3] = 0
    else if (out[i * 4 + 3] > 0 && erosion[i] < 250) {
      const l = 0.3 * r + 0.59 * g + 0.11 * b
      const k = 1 - erosion[i] / 255

      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c] * (1 - k) + l * 0.78 * k)
      out[i * 4 + 3] = Math.round(out[i * 4 + 3] * (0.55 + 0.45 * (erosion[i] / 255)))
    }
  }

  // Fondo blanco metido en los mechones (sólo donde la fuente venía sobre blanco): cerca del borde y sobre el mentón,
  // un gris claro sin color no es pelo ni piel; se lleva al tono oscuro del pelo.
  if (peloBlanco) {
    const cerca = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extractChannel(3).blur(9).raw().toBuffer()

    for (let i = 0; i < W * H; i++) {
      if (Math.floor(i / W) > bajoMenton || out[i * 4 + 3] === 0 || cerca[i] > 247) continue
      const r = out[i * 4], g = out[i * 4 + 1], b = out[i * 4 + 2]
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      const s = mx ? (mx - mn) / mx : 0

      if (s < 0.2 && mx > 95) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c] * 0.28)
    }
  }

  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
}

const centroCara = async (png, y) => {
  const { data, info } = await sharp(png).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  let izq = -1, der = -1

  for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 128) { if (izq < 0) izq = x; der = x }

  return (izq + der) / 2
}

const base = await fondo()

mkdirSync(DIR + SALIDA, { recursive: true })
writeFileSync(DIR + `${SALIDA}/_fondo.png`, await sharp(base, { raw: { width: LADO, height: LADO, channels: 3 } }).png().toBuffer())

for (const [p, m] of Object.entries(PERSONAS)) {
  const v = MEDIDAS[m.fuente]
  const sujeto = await descontaminar(DIR + m.fuente, await recortar(p), v.menton + 40, m.contraer)
  const meta = await sharp(sujeto).metadata()
  const escala = (OJOS_MENTON * (m.distancia ?? 1)) / (v.menton - v.ojos)
  const w = Math.round(meta.width * escala), h = Math.round(meta.height * escala)
  // la cara centrada; si la fuente no alcanza a cubrir el ancho, se corre lo mínimo para que sí cubra
  const left = Math.min(0, Math.max(LADO - w, Math.round(LADO / 2 - v.centroX * escala))), top = Math.round(LADO * OJOS_Y - v.ojos * escala)
  const x0 = Math.max(0, -left), y0 = Math.max(0, -top)
  const cw = Math.min(w - x0, LADO - Math.max(0, left)), ch = Math.min(h - y0, LADO - Math.max(0, top))
  const capa = await sharp(await sharp(sujeto).resize(w, h).png().toBuffer()).extract({ left: x0, top: y0, width: cw, height: ch }).png().toBuffer()
  const abajo = top + h

  if (abajo < LADO || left > 0 || left + w < LADO) console.warn(`${p}: el sujeto no cubre el lienzo (abajo ${abajo}, izq ${left}, der ${left + w})`)
  const out = await sharp(base, { raw: { width: LADO, height: LADO, channels: 3 } })
    .composite([{ input: capa, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer()

  writeFileSync(DIR + `${SALIDA}/${p}.png`, out)
  console.log(p, { escala: +escala.toFixed(3) })
  writeFileSync(DIR + `avatares/${p}-capa.png`, await sharp({ create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: capa, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer())
}
