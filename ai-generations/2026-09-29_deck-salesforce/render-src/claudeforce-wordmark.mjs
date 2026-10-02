// Wordmark «Claudeforce» (versión de video de Salesforce: «Claude» blanco + «force» celeste con la f del logo).
// No existe vector publicado. Se arma sin redibujar a mano:
//  - «force», «a», «e»: paths del vector oficial de Dreamforce (logos/claudeforce-layer1-oficial.svg), sin alterar.
//  - «d»: el path oficial de la «a» + su asta prolongada hasta la altura de la D (misma tipografía geométrica).
//  - «l»: asta del mismo ancho que la de la «a», de la altura de la D a la línea base.
//  - «u»: construida con la geometría oficial medida (asta 6,8; x-height 16,45; base 47,25; sobrepaso 48,15) y el ancho medido en el cuadro.
//  - «C»: no aparece en ningún vector oficial. Es un anillo cortado por una franja horizontal a la derecha: radios y corte
//    medidos sobre el cuadro del video (logos/claudeforce-frame-video-operador.png) vectorizado con potrace, y construida geométrica.
// Posiciones medidas en el cuadro y convertidas a unidades del vector (k px/unidad, anclado en la f).
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
const D = 'ai-generations/2026-09-29_deck-salesforce/'
const FRAME = D + 'logos/claudeforce-frame-video-operador.png'
const OFF = readFileSync(D + 'logos/claudeforce-layer1-oficial.svg', 'utf8')
const paths = [...OFF.matchAll(/<path d="([^"]+)"/g)].map(m => m[1])
const P = { o: paths[1], r: paths[2], c: paths[3], e: paths[4], f: paths[5], eD: paths[8], a: paths[9] }
const k = 1.566, fx = 353, fy = 198, FX = 257.99, FY = 2.81
const ux = x => FX + (x - fx) / k, uy = y => FY + (y - fy) / k
const TMP = process.argv[2]
async function trace (name, L, T, W, H, K = 10) {
  const { data, info } = await sharp(FRAME).removeAlpha().extract({ left: L, top: T, width: W, height: H })
    .resize({ width: W * K, kernel: 'lanczos3' }).blur(4).raw().toBuffer({ resolveWithObject: true })
  let rows = []
  for (let y = 0; y < info.height; y++) { let r = ''; for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; const mn = Math.min(data[i], data[i + 1], data[i + 2]), mx = Math.max(data[i], data[i + 1], data[i + 2]); r += (mn > 160 && mx - mn < 70) ? '1' : '0' } rows.push(r) }
  writeFileSync(`${TMP}/${name}.pbm`, `P1\n${info.width} ${info.height}\n${rows.join('\n')}\n`)
  execFileSync('potrace', [`${TMP}/${name}.pbm`, '-s', '-t', '200', '-a', '1.2', '-O', '0.6', '-o', `${TMP}/${name}.svg`])
  const svg = readFileSync(`${TMP}/${name}.svg`, 'utf8')
  const g = svg.slice(svg.indexOf('<g '), svg.lastIndexOf('</g>') + 4).replace(/fill="#000000"/, 'fill="#FFFFFF"')
  return `<g transform="translate(${ux(L).toFixed(3)} ${uy(T).toFixed(3)}) scale(${(1 / (K * k)).toFixed(6)})">${g}</g>`
}
const Cref = await trace('C', 50, 196, 72, 78) // sólo referencia de medida; no entra al logo
writeFileSync(`${TMP}/C-ref.svg`, Cref)
const cR = 21.55, cr = 14.05, ccy = 26.95, ccx = 67.25 + cR, ch = 9.1
const co = Math.sqrt(cR * cR - ch * ch), ci = Math.sqrt(cr * cr - ch * ch), g3 = n => n.toFixed(3)
const C = `<path fill="#FFFFFF" d="M${g3(ccx + co)} ${g3(ccy - ch)} A${cR} ${cR} 0 1 0 ${g3(ccx + co)} ${g3(ccy + ch)} H${g3(ccx + ci)} A${cr} ${cr} 0 1 1 ${g3(ccx + ci)} ${g3(ccy - ch)} Z"/>`
const uW = 43 / k, uR = uW / 2, ur = uR - 6.8, ucy = 48.15 - uR, uJ = ucy + Math.sqrt(uR * uR - ur * ur)
const uX = ux(203), f2 = n => n.toFixed(3)
const u = `<path transform="translate(${f2(uX)} 0)" fill="#FFFFFF" d="M0 16.45 H6.8 V${f2(ucy)} A${f2(ur)} ${f2(ur)} 0 0 0 ${f2(uW - 6.8)} ${f2(ucy)} V16.45 H${f2(uW)} V47.25 H${f2(uW - 6.8)} V${f2(uJ)} A${f2(uR)} ${f2(uR)} 0 0 1 0 ${f2(ucy)} Z"/>`
// a oficial: bbox x 180.13, stem x 206.00–212.80, x-height top 15.4; D cap top 6.18, baseline 47.24
const at = x => `<path transform="translate(${(x - 180.13).toFixed(3)} 0)" d="${P.a}" fill="#FFFFFF"/>`
const aX = ux(144), dX = ux(255), eX = ux(312), lC = ux(130)
const W = '#FFFFFF', B = '#00B6FF'
const body = [
  C,
  `<rect x="${(lC - 3.4).toFixed(3)}" y="6.2" width="6.8" height="41.05" fill="${W}"/>`,
  at(aX),
  u,
  at(dX), `<rect x="${(dX - 180.13 + 206.0).toFixed(3)}" y="6.2" width="6.8" height="11" fill="${W}"/>`,
  `<path transform="translate(${(eX - 145.31).toFixed(3)} 0)" d="${P.eD}" fill="${W}"/>`,
  ...['f', 'o', 'r', 'c', 'e'].map(n => `<path d="${P[n]}" fill="${B}"/>`)
].join('\n')
const x0 = Math.floor(ux(55)) - 1
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 2 ${406 - x0} 59.5" width="${406 - x0}" height="59.5">\n${body}\n</svg>\n`
writeFileSync(D + 'logos/claudeforce-wordmark.svg', out)
console.log('ok viewBox', x0, 406 - x0)
