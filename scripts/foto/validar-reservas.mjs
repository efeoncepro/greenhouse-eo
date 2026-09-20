// `pnpm foto:validar` — arnés canónico de reservas de la fotografía de marca Efeonce.
//
// Dado un plate LIMPIO (sin logo ni texto), dice con números si sirve para la capa gráfica, ANTES de
// componer nada encima. Valida las seis reservas de
// `docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md`.
//
// Uso:
//   pnpm foto:validar <plate.png> [--zona-texto] [--objeto x0,y0,x1,y1] [--padding-x f] [--padding-y f]
//
// `--zona-texto` y `--objeto` son OPT-IN: un plate que no pide esa reserva no reprueba por no tenerla.
// Las coordenadas van en FRACCIONES del lienzo (0–1), no en píxeles.
//
// Sale con código 1 si alguna reserva EVALUADA falla, para encadenarlo en un gate.
//
// Origen: escrito por la sesión «Capa gráfica Efeonce» el 2026-09-19 dentro de su carpeta de corrida,
// promovido a comando el 2026-09-20 porque una herramienta dentro de una carpeta fechada no la
// encuentra nadie. Conserva sus dos correcciones (la zona sirve para ALGUNA tinta, no para las dos;
// epsilon del umbral) y las tres que salieron del piloto (reserva 1 opt-in, su geometría por formato,
// `--objeto` en fracciones con mensaje claro).

import path from 'node:path'

import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const hexLum = h => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100

const TINTA = { blanca: '#ffffff', oscura: '#00284d' }
const TRAZO = '#a6cdf5'
// El lecho no mide igual en los tres formatos [medido en rondas/texto/bv2-{45,916,169}.json].
const LECHO = { '4:5': 0.18, '9:16': 0.22, '16:9': 0.16, '1:1': 0.18 }

const args = process.argv.slice(2)
const file = args[0]

const opt = k => { const i = args.indexOf(`--${k}`);

 

return i >= 0 ? args[i + 1] : null }

// 8 bits explícito: un PNG de 16 bits leído en crudo devuelve basura.
const base = sharp(file).toColourspace('srgb')
const meta = await base.metadata()
const W = meta.width
const H = meta.height
const r = W / H
const formato = Math.abs(r - 0.8) < 0.02 ? '4:5' : Math.abs(r - 0.5625) < 0.02 ? '9:16' : Math.abs(r - 1.7778) < 0.03 ? '16:9' : Math.abs(r - 1) < 0.02 ? '1:1' : `otro (${r.toFixed(3)})`

const zona = async (x0, y0, x1, y1) => {
  const left = Math.max(0, Math.round(x0 * W))
  const top = Math.max(0, Math.round(y0 * H))
  const width = Math.max(1, Math.min(W - left, Math.round((x1 - x0) * W)))
  const height = Math.max(1, Math.min(H - top, Math.round((y1 - y0) * H)))
  const { data } = await sharp(file).extract({ left, top, width, height }).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const ord = [...ls].sort((a, b) => a - b)
  let g = 0
  let n = 0

  for (let y = 0; y < height; y++) for (let x = 1; x < width; x++) { g += Math.abs(ls[y * width + x] - ls[y * width + x - 1]); n++ }

  return { p2: ord[Math.floor(ord.length * 0.02)], p50: ord[Math.floor(ord.length * 0.5)], p98: ord[Math.floor(ord.length * 0.98)], ocupacion: n ? g / n : 0 }
}

const contra = (z, tinta) => ratio(hexLum(tinta), hexLum(tinta) > 0.5 ? z.p98 : z.p2)
const ok = b => (b ? '✓' : '✗')
const filas = []

console.log(`${path.basename(file)}  ${W}×${H}  · formato ${formato}\n`)

// ── Reserva 1 · zona de texto ────────────────────────────────────────────────────────────────
// Se busca la banda contigua más profunda desde arriba con contraste y calma, para las dos tintas.
// La reserva se cumple si la banda sirve para ALGUNA de las dos tintas; exigir las dos era mi error:
// un muro oscuro nunca va a sostener tinta navy, y no por eso falta la reserva.
//
// 🔴 Y la zona de texto NO tiene la misma geometría en los tres formatos. En vertical es una banda
// superior; en 16:9 es el COSTADO IZQUIERDO (42% del ancho), porque el sujeto vive a la derecha.
// Medir la banda superior en horizontal daba 0.16 en un plate cuyo campo izquierdo mide 0.60. Es el
// mismo bug de clase que «Vertical 4:5.»: la geometría de un formato metida en algo que corre en
// todos. Lo detectó la sesión de fotografía sobre su piloto, y es justo el error que yo venía
// señalando en los docs de ella.
const GEOMETRIA_ZONA = {
  '16:9': { eje: 'columna', x0: 0.06, x1: 0.48, desde: 0.05, hasta: 0.95, minimo: 0.42 },
  __default: { eje: 'banda', x0: 0.07, x1: 0.69, desde: 0, hasta: 0.6, minimo: 0.28 }
}

const pedida = k => args.includes(`--${k}`)
const geo = GEOMETRIA_ZONA[formato] ?? GEOMETRIA_ZONA.__default
const zonaTexto = {}

for (const [nombre, tinta] of Object.entries(TINTA)) {
  let alcance = 0

  if (geo.eje === 'banda') {
    for (let y = geo.desde; y < geo.hasta; y += 0.02) {
      const z = await zona(geo.x0, y, geo.x1, y + 0.02)

      if (contra(z, tinta) >= 4.5 && z.ocupacion < 0.005) alcance = y + 0.02
      else break
    }
  } else {
    for (let x = geo.x0; x < geo.x1; x += 0.02) {
      const z = await zona(x, geo.desde, x + 0.02, geo.hasta)

      if (contra(z, tinta) >= 4.5 && z.ocupacion < 0.005) alcance = x + 0.02
      else break
    }
  }

  zonaTexto[nombre] = alcance
}

// Epsilon: acumular 0.02 catorce veces da 0.28000000000000003 y `>= 0.28` fallaba por coma flotante.
const mejorZona = Math.max(...Object.values(zonaTexto))
const unidad = geo.eje === 'banda' ? 'del alto' : 'del ancho'

// Opt-in: un plate que no pide zona de texto no «falla» por no tenerla. Sin `--zona-texto` informa
// pero no reprueba, igual que la reserva 2 sin `--objeto`.
filas.push([`1 · zona de texto (${geo.eje})`, `blanca ${zonaTexto.blanca.toFixed(2)} · oscura ${zonaTexto.oscura.toFixed(2)} ${unidad}`,
  pedida('zona-texto') ? mejorZona >= geo.minimo - 1e-9 : null])

// ── Reserva 2 · objeto para enmarcar ─────────────────────────────────────────────────────────
// El trazo debe leerse en los CUATRO lados del perímetro, no sólo arriba y abajo.
const obj = opt('objeto')

if (obj) {
  const crudo = obj.split(',').map(Number)

  if (crudo.some(v => v > 1.5)) {
    throw new Error(`--objeto toma FRACCIONES del lienzo (0–1), no píxeles. Recibí "${obj}"; dividí por ${W} y ${H}.`)
  }

  let [x0, y0, x1, y1] = crudo
  // 🔴 El trazo NO se dibuja lamiendo el objeto: la caja AXIS lleva `padding`. Medir el perímetro
  // del objeto y el de la caja no es lo mismo, y confundirlos hace descartar plates que sirven.
  // Medido sobre el piloto: perímetro del objeto 1.02:1 (falla) · caja con padding estándar 3.29:1
  // (pasa) · padding 0.04 otra vez 2.83:1, porque la caja crece hasta tocar la manga del sujeto.
  // Hay punto dulce, no monotonía. El padding sale del contrato, no de un número mío.
  const PAD = { inline: 0.012, block: 0.01 }
  const padX = Number(opt('padding-x') ?? PAD.inline)
  const padY = Number(opt('padding-y') ?? PAD.block)

  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY
  const gr = Math.max(0.006, (y1 - y0) * 0.08)

  const lados = {
    arriba: [x0, y0 - gr, x1, y0 + gr], abajo: [x0, y1 - gr, x1, y1 + gr],
    izquierda: [x0 - gr, y0, x0 + gr, y1], derecha: [x1 - gr, y0, x1 + gr, y1]
  }

  const medidas = {}

  for (const [k, v] of Object.entries(lados)) medidas[k] = contra(await zona(...v), TRAZO)
  const peor = Math.min(...Object.values(medidas))

  filas.push(['2 · objeto para enmarcar (perímetro de la CAJA)', `peor lado ${peor} (${Object.entries(medidas).map(([k, v]) => `${k} ${v}`).join(' · ')})`, peor >= 3])
} else {
  filas.push(['2 · objeto para enmarcar', 'no declarado (--objeto x0,y0,x1,y1)', null])
}

// ── Reserva 3 y 6 · lecho de la firma, con el porcentaje del formato ─────────────────────────
const pct = LECHO[formato] ?? 0.18
const lecho = await zona(0.30, 1 - pct, 0.70, 0.995)
const logoBlanco = contra(lecho, '#ffffff')
const logoNavy = ratio(hexLum('#023c70'), lecho.p2)
const mejorLogo = Math.max(logoBlanco, logoNavy)

filas.push([`3 · lecho de la firma (${Math.round(pct * 100)}% por formato)`, `blanco ${logoBlanco} · navy ${logoNavy} · nitidez ${lecho.ocupacion.toFixed(4)}`, mejorLogo >= 4.5 && lecho.ocupacion < 0.004])

// ── Reserva 4 · aire para cursores ───────────────────────────────────────────────────────────
// Con dos colaboradores el aire lateral se paga dos veces: se exige margen libre a ambos costados.
const izq = await zona(0, 0.10, 0.10, 0.45)
const der = await zona(0.90, 0.10, 1, 0.45)

filas.push(['4 · aire para cursores', `costados ocupación ${izq.ocupacion.toFixed(4)} / ${der.ocupacion.toFixed(4)}`, izq.ocupacion < 0.012 && der.ocupacion < 0.012])

// ── Reserva 5 · campo profundo al margen ─────────────────────────────────────────────────────
// Banda vertical de ~30% del ancho que siga siendo la MISMA superficie hasta pasado el 40% del alto.
let bandaHasta = 0
let tintaBanda = null

for (const [nombre, tinta] of Object.entries(TINTA)) {
  let hasta = 0

  for (let y = 0.05; y < 0.6; y += 0.025) {
    const z = await zona(0.05, y, 0.35, y + 0.025)

    if (contra(z, tinta) >= 4.5 && z.ocupacion < 0.005) hasta = y + 0.025
    else break
  }

  if (hasta > bandaHasta) { bandaHasta = hasta; tintaBanda = nombre }
}

filas.push(['5 · campo profundo al margen', `banda continua hasta ${bandaHasta.toFixed(2)} (tinta ${tintaBanda ?? '—'})`, bandaHasta >= 0.40])

// ── Salida ───────────────────────────────────────────────────────────────────────────────────
console.log('  reserva'.padEnd(42) + 'medido'.padEnd(52) + 'pasa')
for (const [n, m, p] of filas) console.log('  ' + n.padEnd(40) + String(m).padEnd(52) + (p === null ? '—' : ok(p)))

const evaluadas = filas.filter(f => f[2] !== null)

console.log(`\n  ${evaluadas.filter(f => f[2]).length}/${evaluadas.length} reservas cumplidas`)
if (evaluadas.some(f => !f[2])) process.exitCode = 1
