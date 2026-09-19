// Prueba: firma centrada sobre el lecho desenfocado. Uso: node firmar.mjs <plate> <out> <cy_frac> [ancho_frac]
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const [plate, out, cyS, wS] = process.argv.slice(2)
const B = '/Users/jreye/Documents/greenhouse-eo/public/branding/'
const img = sharp(plate); const { width: W, height: H } = await img.metadata()
const lw = Math.round(W * Number(wS ?? 0.2)), lh = Math.round(lw * 196.68 / 837.07)
const left = Math.round((W - lw) / 2), top = Math.round(Number(cyS) * H - lh / 2)
const { data } = await sharp(plate).extract({ left, top, width: lw, height: lh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const rel = (r, g, b) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const Ls = []; for (let i = 0; i < data.length; i += 3) Ls.push(rel(data[i], data[i + 1], data[i + 2])); Ls.sort((a, b) => a - b)
const lightest = Ls.at(-1), darkest = Ls[0]
const white = 1.05 / (lightest + 0.05), navyL = rel(2, 60, 112), navy = (darkest + 0.05) / (navyL + 0.05)
const useWhite = white >= navy
const svg = useWhite ? 'logo-negative.svg' : 'logo-full.svg'
const logo = await sharp(B + svg, { density: 600 }).resize(lw, lh).png().toBuffer()
await sharp(plate).composite([{ input: logo, left, top }]).png().toFile(out)
console.log(out, `logo ${lw}x${lh} @(${left},${top})`, 'blanco', white.toFixed(2) + ':1', 'navy', navy.toFixed(2) + ':1', '→', useWhite ? 'negativo' : 'navy', (useWhite ? white : navy) >= 4.5 ? 'OK' : 'FALLA < 4.5')
