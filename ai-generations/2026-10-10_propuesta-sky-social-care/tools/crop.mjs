import sharp from 'sharp'
const [,, src, out, l, t, w, h, scale = '2'] = process.argv
const m = await sharp(src).metadata()
console.log(m.width, m.height)
await sharp(src).extract({ left: +l, top: +t, width: +w, height: +h }).resize({ width: Math.round(+w * +scale) }).png().toFile(out)
