import sharp from 'sharp'
const [,, src, out] = process.argv
// Recorta, deja el isotipo en un cuadrado transparente y revisa que el hueco central sea transparente
const trimmed = await sharp(src).ensureAlpha().trim().resize({ width: 200, height: 200, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
await sharp(trimmed).toFile(out)
const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true })
const a = (x, y) => data[(y * info.width + x) * 4 + 3]
console.log('tamaño', info.width, info.height, 'alfa centro', a(100, 100), 'alfa esquina', a(2, 2), 'alfa cuerpo', a(60, 100), a(140, 100))
