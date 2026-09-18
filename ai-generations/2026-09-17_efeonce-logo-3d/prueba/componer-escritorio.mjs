// Composición determinística: plato de escena + render exacto del kit + sombra elíptica difusa y calce de luz.
// El modelo generativo deformaba la órbita y aclaraba el navy; acá el logo es el render, píxel por píxel.
import sharp from 'sharp'
const PLATO = 'prueba/escritorio-plato.png'
const RENDER = 'kit/pequena-navy/efeonce-logo-3d-navy-pequena-03-picado-tres-cuartos-izquierda-luz-der-transparente.png'
const ANCHO = 900, X = 330, Y = 700

const obj = await sharp(RENDER).trim({ threshold: 1 }).resize({ width: ANCHO }).toBuffer()
const { width: w, height: h } = await sharp(obj).metadata()
const alfa = await sharp(obj).extractChannel('alpha').raw().toBuffer()

// Calce de luz: la ventana entra por la derecha → degradado cálido de izquierda (sombra) a derecha (luz),
// recortado con el alfa original para no tocar el fondo.
const grad = Buffer.from(`<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" x2="1">
<stop offset="0" stop-color="#0a1a2e" stop-opacity="0.35"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
<stop offset="1" stop-color="#ffd9a8" stop-opacity="0.42"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/></svg>`)
const objCalzado = await sharp(await sharp(obj).modulate({ brightness: 1.03, saturation: 1.05 })
  .composite([{ input: grad, blend: 'soft-light' }]).removeAlpha().toBuffer())
  .joinChannel(alfa, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()

// Sombra: elipse difusa bajo la pieza, desplazada a la izquierda porque la luz viene de la derecha.
const sw = Math.round(w * 1.12), sh = Math.round(h * 0.5)
const sombra = Buffer.from(`<svg width="${sw}" height="${sh}"><defs><filter id="b" x="-30%" y="-30%" width="160%" height="160%">
<feGaussianBlur stdDeviation="${Math.round(h * 0.06)}"/></filter></defs>
<ellipse cx="${sw * 0.47}" cy="${sh * 0.55}" rx="${sw * 0.42}" ry="${sh * 0.3}" fill="#2c1d0c" opacity="0.4" filter="url(#b)"/></svg>`)

await sharp(PLATO)
  .composite([
    { input: await sharp(sombra).png().toBuffer(), left: X - Math.round(w * 0.1), top: Y + h - Math.round(sh * 0.62) },
    { input: objCalzado, left: X, top: Y }
  ])
  .png().toFile('prueba/escritorio-compuesto.png')
console.log('ok', w, h)
