// Hoja de contacto de los plates de un patrón: node hoja.mjs '<regex de carpeta>' <salida.jpg> [alto]
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path'
const D = path.dirname(new URL(import.meta.url).pathname) + '/plates'
const re = new RegExp(process.argv[2]); const out = process.argv[3]; const H = +(process.argv[4] ?? 520)
const dirs = fs.readdirSync(D).filter(d => re.test(d)).sort()
const imgs = []
for (const d of dirs) { const f = fs.readdirSync(path.join(D, d)).find(x => x.endsWith('.png')); if (f) imgs.push(await sharp(path.join(D, d, f)).resize({ height: H }).png().toBuffer()) }
const metas = await Promise.all(imgs.map(b => sharp(b).metadata()))
const W = metas.reduce((a, m) => a + m.width + 10, 0)
let x = 0
await sharp({ create: { width: W, height: H, channels: 3, background: '#888' } }).composite(imgs.map((b, i) => { const c = { input: b, left: x, top: 0 }; x += metas[i].width + 10; return c })).jpeg({ quality: 82 }).toFile(out)
console.log(dirs.join(' '))
