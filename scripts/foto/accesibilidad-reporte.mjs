// `pnpm foto:accesibilidad <piezas.json>` — reporte de accesibilidad y contraste de un plan ya compuesto.
//
// Lee el QA del plan, `out/qa-<plan>.json` (o el `out/qa.json` del formato anterior; la medición la hace el compositor sobre el píxel real, con scripts/foto/accesibilidad.mjs) y
// escribe en `out/accesibilidad/`:
//   · reporte.md                 una tabla por pieza y por voz: WCAG 2.2 AA según el tamaño EN PANTALLA, APCA,
//                                área bajo el umbral, daltonismo y el texto alternativo
//   · <id>-daltonismo.png        la pieza a 390 px como la ve cada tipo de daltonismo (Machado 2009)
//
// No aprueba nada: el que decide es `pnpm foto:cta:gate`. Esto es para MIRAR, que es donde se encontraron los
// fallos que el número no mostraba.
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { MATRICES_DALTONISMO, UMBRALES } from './accesibilidad.mjs'
import { rutaQa } from './cta-integridad.mjs'

const plan = process.argv[2]

if (!plan) {
  console.error('uso: pnpm foto:accesibilidad <piezas.json>   (después de pnpm foto:componer:cta)')
  process.exit(2)
}

const dir = path.dirname(path.resolve(plan))
const qaPath = [rutaQa(path.join(dir, 'out'), plan), path.join(dir, 'out', 'qa.json')].find(f => fs.existsSync(f)) ?? rutaQa(path.join(dir, 'out'), plan)

if (!fs.existsSync(qaPath)) {
  console.error(`✗ no existe ${qaPath}: corre \`pnpm foto:componer:cta ${plan}\` primero.`)
  process.exit(1)
}

const piezas = JSON.parse(fs.readFileSync(path.resolve(plan), 'utf8'))
const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8')).filter(r => piezas.some(p => p.id === r.id))
const out = path.join(dir, 'out', 'accesibilidad')

fs.mkdirSync(out, { recursive: true })

// Daltonismo por píxel con tablas: 256 valores lineales precalculados, la conversión de vuelta con potencia.
const LIN = Float64Array.from({ length: 256 }, (_, i) => {
  const c = i / 255

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

const SRGB = v => {
  const c = Math.min(1, Math.max(0, v))

  return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
}

async function hojaDaltonismo(id) {
  const src = path.join(dir, 'out', 'preview-390', `${id}.png`)

  if (!fs.existsSync(src)) return null
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const paneles = [{ nombre: 'visión típica', buf: data }]

  for (const [tipo, m] of Object.entries(MATRICES_DALTONISMO)) {
    const o = Buffer.alloc(data.length)

    for (let i = 0; i < data.length; i += 3) {
      const R = LIN[data[i]], G = LIN[data[i + 1]], B = LIN[data[i + 2]]

      o[i] = SRGB(m[0] * R + m[1] * G + m[2] * B)
      o[i + 1] = SRGB(m[3] * R + m[4] * G + m[5] * B)
      o[i + 2] = SRGB(m[6] * R + m[7] * G + m[8] * B)
    }

    paneles.push({ nombre: { protan: 'protanopía', deutan: 'deuteranopía', tritan: 'tritanopía' }[tipo], buf: o })
  }

  const gap = 10
  const rotulo = 24
  const W = info.width * paneles.length + gap * (paneles.length - 1)
  const H = info.height + rotulo
  const capas = []

  for (const [i, p] of paneles.entries()) {
    const x = i * (info.width + gap)

    capas.push(
      { input: await sharp(p.buf, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer(), left: x, top: rotulo },
      { input: Buffer.from(`<svg width="${info.width}" height="${rotulo}"><text x="4" y="17" font-family="Helvetica" font-size="13" fill="#fff">${p.nombre}</text></svg>`), left: x, top: 0 }
    )
  }

  const destino = path.join(out, `${id}-daltonismo.png`)

  await sharp({ create: { width: W, height: H, channels: 3, background: '#1b1b1b' } }).composite(capas).png().toFile(destino)

  return path.relative(out, destino)
}

const marca = v => (v === true ? '✓' : v === false ? '✗' : '—')
const lineas = []
let fallasWcag = 0
let avisos = 0

lineas.push(`# Accesibilidad y contraste — ${path.basename(plan)}`, '')
lineas.push(
  `Umbrales del contrato AXIS \`axisAdvertising.accessibility\`: texto normal ${UMBRALES.normalTextContrast}:1, ` +
    `texto grande ${UMBRALES.largeTextContrast}:1 (≥ ${UMBRALES.normalTextMinCssPx} px, o ≥ ${UMBRALES.boldLargeTextMinCssPx} px en negrita), ` +
    `límites no textuales ${UMBRALES.essentialBoundaryContrast}:1. Tamaños medidos EN PANTALLA: la pieza a 390 CSS px de ancho. ` +
    'WCAG 2.2 AA aprueba; APCA (Bronze) es verificación de respaldo.',
  ''
)

for (const r of qa) {
  const a = r.accesibilidad

  lineas.push(`## ${r.id}`, '')

  if (!a) {
    lineas.push('_Sin medición de accesibilidad: el QA es de una versión anterior del compositor. Recompón._', '')
    avisos++
    continue
  }

  lineas.push('| voz | en pantalla | WCAG | umbral | APCA | umbral | área bajo umbral | daltonismo (P · D · T) |', '|---|---|---|---|---|---|---|---|')

  for (const [voz, m] of Object.entries(a.voces)) {
    if (!m) continue
    if (!m.cumpleWcag) fallasWcag++
    if (m.cumpleApca === false || m.cumpleDaltonismo === false || m.pctBajoUmbral > 0) avisos++
    const d = m.daltonismo ? `${m.daltonismo.protan} · ${m.daltonismo.deutan} · ${m.daltonismo.tritan} ${marca(m.cumpleDaltonismo)}` : '—'

    lineas.push(`| ${voz} | ${m.cssPx == null ? 'límite' : `${m.cssPx} px${m.grande ? ' (grande)' : ''}`} | ${m.wcag}:1 ${marca(m.cumpleWcag)} | ${m.umbralWcag}:1 | ${m.apca ?? '—'} ${marca(m.cumpleApca)} | ${m.umbralApca ?? '—'} | ${m.pctBajoUmbral} % | ${d} |`)
  }

  const hoja = await hojaDaltonismo(r.id)

  lineas.push('', `**Texto alternativo${a.altTextEscena ? '' : ' (sin descripción de la escena: agrega `altText` al plan)'}:** ${a.altText}`, '')
  if (hoja) lineas.push(`![${r.id} bajo daltonismo](${hoja})`, '')
}

fs.writeFileSync(path.join(out, 'reporte.md'), `${lineas.join('\n')}\n`)
console.log(`Reporte: ${path.join(out, 'reporte.md')} · ${qa.length} piezas · ${fallasWcag} voces bajo WCAG AA · ${avisos} avisos`)
