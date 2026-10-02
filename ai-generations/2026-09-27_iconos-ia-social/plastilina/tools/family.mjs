// Hoja de familia: los 33 Plastilina aprobados arriba y los 10 candidatos abajo. Uso: node tools/family.mjs out.png rest|response
import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const [out, state] = process.argv.slice(2)
const suf = state === 'rest' ? 'rest' : 'response'
const ap = readdirSync('aprobados-ref').filter((f) => f.startsWith('plastilina-') && f.endsWith(`-${suf}.svg`)).sort().map((f) => 'aprobados-ref/' + f)
const keys = ['chispa', 'prompt', 'barra-busqueda', 'aro-de-luz', 'television', 'like', 'galeria', 'biblioteca', 'hoodie', 'gorra']
const nu = keys.map((k) => `control/${k}/${k}-${state === 'rest' ? 'reposo' : 'respuesta'}-oscuro.svg`)
const C = 11, S = 112, P = 12, GAP = 24
const apRows = Math.ceil(ap.length / C)
const all = [...ap, ...Array(apRows * C - ap.length).fill(null), ...nu]
const rows = Math.ceil(all.length / C)
const comps = []
for (let i = 0; i < all.length; i++) if (all[i]) comps.push({ input: await sharp(all[i], { density: 300 }).resize(S - 2 * P, S - 2 * P).png().toBuffer(), left: (i % C) * S + P, top: Math.floor(i / C) * S + P + (i >= apRows * C ? GAP : 0) })
await sharp({ create: { width: C * S, height: rows * S + GAP, channels: 3, background: '#001a33' } }).composite(comps).png().toFile(out)
console.log(out, ap.length, 'aprobados +', nu.length, 'candidatos')
