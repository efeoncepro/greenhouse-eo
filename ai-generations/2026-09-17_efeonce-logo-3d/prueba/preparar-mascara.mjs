// Prepara el par (base, máscara) para que el modelo integre la escena SIN poder tocar el logo.
// base   = plato + render exacto pegado (sin sombra: la pone el modelo)
// máscara = opaca sobre el logo (zona protegida) y transparente en el resto (zona editable),
//           con el contorno del logo erosionado unos píxeles para que el borde pueda fundirse.
// Uso: node prueba/preparar-mascara.mjs <plato> <render> <ancho> <x> <y> <salida-base> <salida-mascara>
import sharp from 'sharp'
const [, , PLATO, RENDER, ANCHO, X, Y, OUT_BASE, OUT_MASK] = process.argv
const x = Number(X), y = Number(Y)
const plato = sharp(PLATO)
const { width: W, height: H } = await plato.metadata()
const obj = await sharp(RENDER).trim({ threshold: 1 }).resize({ width: Number(ANCHO) }).toBuffer()
const { width: w, height: h } = await sharp(obj).metadata()

await sharp(PLATO).composite([{ input: obj, left: x, top: y }]).png().toFile(OUT_BASE)

// Alfa del objeto colocado en el lienzo completo (pegar el RGBA sobre lienzo transparente y extraer su alfa).
const lienzoRGBA = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: obj, left: x, top: y }]).png().toBuffer()
const lienzoAlfa = await sharp(lienzoRGBA).extractChannel('alpha').raw().toBuffer()
// Protección del objeto: NO erosionar. Una erosión de 8 px desprotegía los elementos finos (la órbita del logo
// desapareció repintada como pared). Se protege el alfa completo, dilatado 3 px para cubrir el antialias del borde.
const protegido = await sharp(lienzoAlfa, { raw: { width: W, height: H, channels: 1 } })
  .blur(3).linear(6, -60).toColourspace('b-w').raw().toBuffer()   // sin b-w, sharp devuelve 3 canales y el índice se corre
// Halo editable: se abre SÓLO un anillo alrededor del logo (sombra de contacto, reflejo y rebote).
// El logo queda protegido por dentro y la escena por fuera, así el modelo no re-dibuja ni el objeto ni el resto.
const HALO = Number(process.env.HALO ?? 140)
const dilatado = await sharp(lienzoAlfa, { raw: { width: W, height: H, channels: 1 } })
  .blur(HALO / 2.2).linear(6, -20).toColourspace('b-w').raw().toBuffer()   // anillo exterior editable
const mascara = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) {
  const dentro = protegido[i]               // objeto completo (incluidos trazos finos) → protegido
  const halo = dilatado[i]                  // anillo alrededor → editable
  mascara[i * 4 + 3] = Math.max(dentro, 255 - halo)
}
await sharp(mascara, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT_MASK)
console.log(JSON.stringify({ lienzo: [W, H], objeto: [w, h], en: [x, y] }))
