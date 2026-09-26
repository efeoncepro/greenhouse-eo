// Estampa de espalda del POLO: logo + eslogan «Empower your Growth», compuesta determinísticamente.
//
// Nace de la decisión del operador del 2026-09-21, que REVIERTE la del 2026-09-17 («la única prenda
// con espalda limpia es el polo»). Motivo: de espaldas, un polo sin marca no se reconoce como Efeonce.
//
// Diferencia con el hoodie y las chaquetas: en el polo la espalda va BORDADA —puntada satinada con
// relieve sobre el piqué—, no serigrafiada, porque es la prenda más formal frente a cliente y su
// emblema de pecho ya es bordado. El arte es el mismo; lo que cambia es el acabado que se le pide al
// modelo.
//
// Dos versiones, una por color de tela: hilo BLANCO sobre el polo navy, hilo NAVY sobre el blanco.
// El texto exacto nunca se le pide a un modelo.
import sharp from 'sharp'

const ANCHO = 1600
const NAVY = '#023c70'
const DIR = 'ai-generations/2026-09-17_polo-efeonce/ref'

const estampa = async (tintaLogo, tintaTexto, tintaEnfasis, salida) => {
  const svgLogo = tintaLogo === 'blanco' ? 'public/branding/logo-negative.svg' : 'public/branding/logo-full.svg'
  const logo = await sharp(svgLogo, { density: 600 }).resize({ width: ANCHO }).png().toBuffer()
  const { height: hLogo } = await sharp(logo).metadata()

  const anchoEslogan = Math.round(ANCHO * 0.52)
  const fs = Math.round(anchoEslogan / 8.2)
  const gap = Math.round(ANCHO * 0.07)

  const esloganSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${Math.round(fs * 1.6)}">
  <text x="${ANCHO / 2}" y="${fs * 1.05}" text-anchor="middle" fill="${tintaTexto}" font-family="Poppins" font-size="${fs}" xml:space="preserve">
    <tspan font-weight="800" font-style="italic">Empower</tspan><tspan font-weight="800"> your </tspan><tspan font-weight="900" font-style="italic" fill="${tintaEnfasis}">Growth</tspan>
  </text>
</svg>`)

  const eslogan = await sharp(esloganSvg).png().toBuffer()
  const { height: hEsl } = await sharp(eslogan).metadata()
  const H = hLogo + gap + hEsl

  await sharp({ create: { width: ANCHO, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, left: 0, top: 0 }, { input: eslogan, left: 0, top: hLogo + gap }])
    .png().toFile(`${DIR}/${salida}.png`)

  console.log(`${salida}: ${ANCHO}x${H} · logo ${hLogo} · eslogan ${fs}px`)

  return { ANCHO, H, hLogo, fs }
}

// Sobre el polo NAVY: todo en hilo blanco.
await estampa('blanco', '#ffffff', '#ffffff', 'estampa-espalda-hilo-blanco')
// Sobre el polo BLANCO: todo en hilo navy.
await estampa('navy', NAVY, NAVY, 'estampa-espalda-hilo-navy')
