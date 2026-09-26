// Clawd CON su signo de interrogación, compuesto determinísticamente para pasarlo como referencia.
//
// El «?» es TIPOGRAFÍA: se compone, no se le pide al modelo. Sin esto, la pieza fuente lo tenía y la
// primera reconstrucción no, porque se describió en palabras en vez de construirse. Misma doctrina
// que el lanyard: la forma sensible se arma aparte y el modelo sólo pone materia y luz.
import path from 'node:path'

import sharp from 'sharp'

const KIT = 'ai-generations/2026-09-17_clawd-poses-3d/final'
const VISTA = process.argv[2] ?? 'efeonce-clawd-3d-01-frente-heroe-1x1-1600x1600-v01-transparente.png'
const SALIDA = process.argv[3] ?? 'ai-generations/2026-09-21_copiloto/piezas/clawd-con-pregunta.png'

const NARANJA = '#F55D01'          // el acento de marca
const clawd = await sharp(path.join(KIT, VISTA)).trim().toBuffer()
const { width: cw, height: ch } = await sharp(clawd).metadata()

// El signo ocupa ~la mitad del alto de Clawd y flota sobre él, con su propio aire.
const fs = Math.round(ch * 0.62)
const aire = Math.round(fs * 0.34)
const W = Math.max(cw, fs)
const H = fs + aire + ch

const signo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.round(fs * 1.25)}">
  <text x="${W / 2}" y="${Math.round(fs * 0.98)}" text-anchor="middle" fill="${NARANJA}"
        font-family="Poppins" font-weight="800" font-size="${fs}">?</text>
</svg>`)

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: await sharp(signo).png().toBuffer(), left: 0, top: 0 },
    { input: clawd, left: Math.round((W - cw) / 2), top: fs + aire }
  ])
  .png().toFile(SALIDA)

console.log(`Clawd con «?» → ${SALIDA}\n  ${W}x${H} · signo ${fs}px naranja ${NARANJA} · figura ${cw}x${ch}`)
