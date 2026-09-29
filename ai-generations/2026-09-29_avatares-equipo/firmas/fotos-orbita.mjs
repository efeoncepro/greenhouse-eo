// Foto de cada persona dentro de su órbita, para la firma de correo (clara y oscura).
// El tamaño sale del token: emailSignature.portrait.sizePx (130 px desde axis-tokens 0.3.35, a la altura del
// bloque de texto de al lado), exportado a 3× para pantallas densas. La geometría sale de efeonceGraphicLine.portrait.
// Recorte por la cara medida con Vision: lado = 3,3 × ojos→mentón (222 px en los avatares normalizados), ojos al 42 %.
// node fotos-orbita.mjs → fotos/foto-orbita[-oscura]-<slug>.png
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')

const AQUI = new URL('./', import.meta.url).pathname
const AVATARES = AQUI + '../avatares/'
const C = GL.color
const P = GL.portrait
const S = GL.emailSignature.portrait.sizePx * 3
const cx = S / 2
const R = P.ringRadiusOfSize * S
const D = Math.round(P.photoRadiusOfSize * S * 2)
const SW = P.arcStrokeOfSize * S
const RS = P.sphereRadiusOfSize * S
const RW = P.ringStrokeOfSize * S
const a0 = P.arcStartDeg
const a1 = P.arcStartDeg + P.arcSweepDeg
const pt = a => [cx + R * Math.cos((a * Math.PI) / 180), cx + R * Math.sin((a * Math.PI) / 180)]

const OJOS_MENTON = 222
const OJOS_Y = 356
const CENTRO_X = 540

const SLUG = {
  julio: 'julio-reyes',
  daniela: 'daniela-ferreira',
  andres: 'andres-carlosama',
  melkin: 'melkin-hernandez',
  humberly: 'humberly-henriquez',
  valentina: 'valentina-hoyos'
}

const fotoOrbita = async (cara, destino, { ring, ringOp, accent }) => {
  const mascara = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}"/></svg>`)
  const circulo = await sharp(cara).resize(D, D).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer()
  const [x0, y0] = pt(a0)
  const [x1, y1] = pt(a1)

  const orbita = Buffer.from(`<svg width="${S}" height="${S}">
    <circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${ring}" stroke-opacity="${ringOp}" stroke-width="${RW}"/>
    <path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${accent}" stroke-width="${SW}" stroke-linecap="round"/>
    <circle cx="${x1}" cy="${y1}" r="${RS}" fill="${accent}"/>
  </svg>`)

  await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: circulo, left: Math.round(cx - D / 2), top: Math.round(cx - D / 2) }, { input: orbita }])
    .png()
    .toFile(destino)
}

for (const [persona, slug] of Object.entries(SLUG)) {
  const lado = Math.round(OJOS_MENTON * 3.3)
  const cara = await sharp(AVATARES + persona + '.png')
    .extract({ left: Math.round(CENTRO_X - lado / 2), top: Math.round(OJOS_Y - 0.42 * lado), width: lado, height: lado })
    .png()
    .toBuffer()

  await fotoOrbita(cara, AQUI + `fotos/foto-orbita-${slug}.png`, { ring: C.navy, ringOp: P.ringOpacity.onLight, accent: C.tealDark })
  await fotoOrbita(cara, AQUI + `fotos/foto-orbita-oscura-${slug}.png`, { ring: C.halo, ringOp: P.ringOpacity.onDark, accent: C.teal })
}

console.log('ok', Object.keys(SLUG).length * 2, `fotos de ${S} px (${S / 3} px en el correo)`)
