// Repara la capa de Julio (avatares/julio-capa.png, 2026-09-29): el recorte dejó huecos en la bomber (vetas en la manga
// y el hombro del lado izquierdo del cuadro). La foto fuente está limpia, así que el cuerpo se rehace desde ella con la
// silueta rellena; la cabeza y el pelo se conservan de la capa original, que ya venía descontaminada.
// node reparar-capa.mjs → julio-capa-reparada.png (1080², misma geometría que la capa original)
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')

const AV = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_avatares-equipo/'
const DIR = new URL('./', import.meta.url).pathname
const LADO = 1080

// Geometría de componer-avatares.mjs para julio (medidas de Vision en avatares/_medidas.jsonl).
const OJOS = 305, MENTON = 513, CENTRO_X = 514
const escala = 222 / (MENTON - OJOS)
const W0 = 1024, H0 = 1536
const w = Math.round(W0 * escala), h = Math.round(H0 * escala)
const left = Math.min(0, Math.max(LADO - w, Math.round(LADO / 2 - CENTRO_X * escala)))
const top = Math.round(LADO * 0.33 - OJOS * escala)

// Morfología sobre máscaras de un canal. Medido el 2026-10-24 con sharp 0.34.5: sobre un cuadrado blanco de 40×40,
// `erode(3)` dio 2116 px blancos y `dilate(3)` 1156: en máscaras de un canal los nombres están invertidos respecto de lo
// blanco. Se usan por lo que hacen, no por su nombre.
const mascara = buf => sharp(buf, { raw: { width: W0, height: H0, channels: 1 } })
const crecer = async (buf, r) => mascara(buf).erode(r).extractChannel(0).raw().toBuffer()
const encoger = async (buf, r) => mascara(buf).dilate(r).extractChannel(0).raw().toBuffer()

// 1. Silueta del cuerpo en coordenadas de la fuente: alfa del recorte → binaria → cierre → relleno de huecos.
const { data: A } = await sharp(readFileSync(AV + 'recortes/julio-ext-ok.png')).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
const bin = Buffer.alloc(W0 * H0)
for (let i = 0; i < bin.length; i++) bin[i] = A[i] >= 100 ? 255 : 0

const cerrar = async (buf, r) => encoger(await crecer(buf, r), r)
const cerrada = await cerrar(bin, 12)

// relleno: todo lo que no se alcanza desde el borde del cuadro por fondo es sujeto
const visto = new Uint8Array(W0 * H0)
const pila = []
const empuja = (x, y) => {
  if (x < 0 || y < 0 || x >= W0 || y >= H0) return
  const i = y * W0 + x
  if (visto[i] || cerrada[i] > 127) return
  visto[i] = 1
  pila.push(i)
}
for (let x = 0; x < W0; x++) { empuja(x, 0); empuja(x, H0 - 1) }
for (let y = 0; y < H0; y++) { empuja(0, y); empuja(W0 - 1, y) }
while (pila.length) {
  const i = pila.pop(), x = i % W0, y = (i / W0) | 0
  empuja(x + 1, y); empuja(x - 1, y); empuja(x, y + 1); empuja(x, y - 1)
}
const llena = Buffer.alloc(W0 * H0)
for (let i = 0; i < llena.length; i++) llena[i] = visto[i] ? 0 : 255

// El recorte original se llevó ~10 px del fondo claro (ventanas y madera) junto al contorno de los brazos. En esa banda
// exterior, un píxel claro no es la prenda (la bomber navy no pasa de luma ~95 ni en sus brillos): sale de la silueta.
const { data: RGB } = await sharp(readFileSync(AV + 'extendido/julio-ext-ok.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const nucleo = await encoger(llena, 16)
let fuera = 0
for (let i = 0; i < llena.length; i++) {
  if (llena[i] < 128 || nucleo[i] > 127 || (i / W0 | 0) < MENTON) continue
  const luma = 0.3 * RGB[i * 3] + 0.59 * RGB[i * 3 + 1] + 0.11 * RGB[i * 3 + 2]
  if (luma > 105) { llena[i] = 0; fuera++ }
}
console.log('píxeles claros sacados de la banda exterior:', fuera)
// Sacar píxeles sueltos deja el contorno en escalones: se alisa con una apertura y un cierre chicos.
const lisa = await cerrar(await crecer(await encoger(llena, 2), 2), 5)
lisa.copy(llena)

// borde: se contrae 3 px (ahí queda el fondo viejo) y se suaviza 1 px
const contraida = await encoger(llena, 3)
const alfaCuerpo = await sharp(contraida, { raw: { width: W0, height: H0, channels: 1 } }).blur(1.4).extractChannel(0).raw().toBuffer()

// 2. Capa del cuerpo: color de la fuente + alfa reparado, llevada a la geometría de la capa.
// Filo del contorno: los ~7 px junto al borde traen el fondo claro de la oficina. Se tiñen con el color del interior
// cercano (promedio normalizado del interior), así el contorno queda del navy de la prenda sobre cualquier fondo nuevo.
const interior = await encoger(llena, 7)
const pre = Buffer.alloc(W0 * H0 * 3)
for (let i = 0; i < W0 * H0; i++) if (interior[i] > 127) for (let c = 0; c < 3; c++) pre[i * 3 + c] = RGB[i * 3 + c]
const SIG = 9
const preB = await sharp(pre, { raw: { width: W0, height: H0, channels: 3 } }).blur(SIG).raw().toBuffer()
const pesB = await sharp(interior, { raw: { width: W0, height: H0, channels: 1 } }).blur(SIG).extractChannel(0).raw().toBuffer()
const rgba = Buffer.alloc(W0 * H0 * 4)
for (let i = 0; i < W0 * H0; i++) {
  const filo = llena[i] > 127 && interior[i] <= 127 && pesB[i] > 0
  for (let c = 0; c < 3; c++) rgba[i * 4 + c] = filo ? Math.min(255, Math.round((preB[i * 3 + c] / pesB[i]) * 255)) : RGB[i * 3 + c]
  rgba[i * 4 + 3] = alfaCuerpo[i]
}
const escalada = await sharp(rgba, { raw: { width: W0, height: H0, channels: 4 } }).resize(w, h).png().toBuffer()
const x0 = -left, y0 = Math.max(0, -top)
const cuerpo = await sharp(escalada).extract({ left: x0, top: y0, width: LADO, height: Math.min(h - y0, LADO - Math.max(0, top)) }).png().toBuffer()
const cuerpo1080 = await sharp({ create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: cuerpo, left: 0, top: Math.max(0, top) }]).raw().toBuffer()

// 3. Unión: arriba la capa original (pelo y rostro), abajo el cuerpo reparado, con una banda de mezcla bajo el mentón.
const original = await sharp(readFileSync(AV + 'avatares/julio-capa.png')).ensureAlpha().raw().toBuffer()
const mentonCapa = top + MENTON * escala
const desde = Math.round(mentonCapa - 40), hasta = Math.round(mentonCapa)
const out = Buffer.alloc(LADO * LADO * 4)
for (let y = 0; y < LADO; y++) {
  const t = y <= desde ? 0 : y >= hasta ? 1 : (y - desde) / (hasta - desde)
  for (let x = 0; x < LADO; x++) {
    const i = (y * LADO + x) * 4
    for (let c = 0; c < 4; c++) out[i + c] = Math.round(original[i + c] * (1 - t) + cuerpo1080[i + c] * t)
  }
}
writeFileSync(DIR + 'julio-capa-reparada.png', await sharp(out, { raw: { width: LADO, height: LADO, channels: 4 } }).png().toBuffer())
console.log({ escala: +escala.toFixed(4), left, top, mentonCapa: Math.round(mentonCapa) })
