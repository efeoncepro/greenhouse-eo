import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const [out, state] = process.argv.slice(2)
const ap = readdirSync('aprobados-ref').filter((f) => f.startsWith('plastilina-') && f.endsWith(`-${state === 'rest' ? 'rest' : 'response'}.svg`)).map((f) => 'aprobados-ref/' + f)
const keys = ['lapiz','rodillo','aerosol','escuadra','postit','encuadre','pelicula','vinilo','guitarra','reproducir','varita','taza','lampara','trofeo','estrella']
const nu = keys.map((k) => `control/${k}/${k}-${state === 'rest' ? 'reposo' : 'respuesta'}-oscuro.svg`)
const C = 9, S = 112, P = 12
const all = [...ap, ...Array(C * 2 - ap.length).fill(null), ...nu]
const rows = Math.ceil(all.length / C)
const comps = []
for (let i = 0; i < all.length; i++) if (all[i]) comps.push({ input: await sharp(all[i], { density: 300 }).resize(S - 2 * P, S - 2 * P).png().toBuffer(), left: (i % C) * S + P, top: Math.floor(i / C) * S + P + (i >= C * 2 ? 16 : 0) })
await sharp({ create: { width: C * S, height: rows * S + 16, channels: 3, background: '#001a33' } }).composite(comps).png().toFile(out)
console.log(out)
