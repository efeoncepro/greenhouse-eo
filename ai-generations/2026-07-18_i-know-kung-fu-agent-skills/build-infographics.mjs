import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import * as fontkit from 'fontkit'

const root = dirname(fileURLToPath(import.meta.url))
const sourceDir = resolve(root, 'source')
const deliveryDir = resolve(root, 'delivery')
const signaturePath = resolve(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
const signatureData = Buffer.from(await readFile(signaturePath)).toString('base64')
const fonts = {
  400: fontkit.openSync(resolve(process.cwd(), 'src/assets/fonts/Poppins-Medium.ttf')),
  500: fontkit.openSync(resolve(process.cwd(), 'src/assets/fonts/Poppins-Medium.ttf')),
  600: fontkit.openSync(resolve(process.cwd(), 'src/assets/fonts/Poppins-SemiBold.ttf')),
  700: fontkit.openSync(resolve(process.cwd(), 'src/assets/fonts/Poppins-Bold.ttf'))
}

await mkdir(sourceDir, { recursive: true })
await mkdir(deliveryDir, { recursive: true })

const C = {
  ink: '#022A4E',
  deep: '#023C70',
  mid: '#024C8F',
  active: '#0375DB',
  energy: '#F55D01',
  lead: '#263448',
  muted: '#505964',
  passive: '#DBDBDB',
  paper: '#FFFFFF',
  paleBlue: '#EAF4FC',
  paleOrange: '#FFF0E7',
  paleGray: '#F4F6F8'
}

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const unescapeXml = value => value
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&apos;', "'")
  .replaceAll('&amp;', '&')

const attr = (source, name, fallback = '') => {
  const match = source.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match ? match[1] : fallback
}

const glyphPaths = ({ value, x, y, size, weight, fill, anchor = 'start', tracking = 0, opacity = 1 }) => {
  const font = fonts[weight] || fonts[600]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm
  const advances = run.positions.map(position => position.xAdvance * scale + tracking)
  const total = advances.reduce((sum, width) => sum + width, 0) - (advances.length ? tracking : 0)
  const start = anchor === 'middle' ? -total / 2 : anchor === 'end' ? -total : 0
  let cursor = start
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index]
    const dx = cursor + position.xOffset * scale
    const dy = -position.yOffset * scale
    cursor += advances[index]
    const rawPath = glyph.path.toSVG().trim()
    const pathMarkup = rawPath.startsWith('<') ? rawPath : `<path d="${rawPath}"/>`

    return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})">${pathMarkup}</g>`
  }).join('')
  return `<g data-outlined-text="true" transform="translate(${x} ${y})" fill="${fill}" opacity="${opacity}">${paths}</g>`
}

const outlineText = svg => svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_match, textAttrs, body) => {
  const x = Number(attr(textAttrs, 'x', '0'))
  const y = Number(attr(textAttrs, 'y', '0'))
  const size = Number(attr(textAttrs, 'font-size', '16'))
  const weight = Number(attr(textAttrs, 'font-weight', '400'))
  const fill = attr(textAttrs, 'fill', '#000000')
  const anchor = attr(textAttrs, 'text-anchor', 'start')
  const tracking = Number(attr(textAttrs, 'letter-spacing', '0'))
  const opacity = Number(attr(textAttrs, 'opacity', '1'))
  const tspans = [...body.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)]

  if (!tspans.length) {
    return glyphPaths({ value: unescapeXml(body), x, y, size, weight, fill, anchor, tracking, opacity })
  }

  let currentY = y
  return tspans.map(([, tspanAttrs, value]) => {
    const tspanX = Number(attr(tspanAttrs, 'x', String(x)))
    currentY += Number(attr(tspanAttrs, 'dy', '0'))
    return glyphPaths({ value: unescapeXml(value), x: tspanX, y: currentY, size, weight, fill, anchor, tracking, opacity })
  }).join('')
})
const lines = (items, x, y, size, color = C.ink, weight = 400, gap = Math.round(size * 1.25), anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}">${items.map((item, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : gap}">${escape(item)}</tspan>`).join('')}</text>`

const measureText = (value, size, weight = 400, tracking = 0) => {
  const font = fonts[weight] || fonts[600]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm
  const advances = run.positions.map(position => position.xAdvance * scale + tracking)

  return advances.reduce((sum, width) => sum + width, 0) - (advances.length ? tracking : 0)
}

const footer = (width, height, note) => `
  <line x1="72" y1="${height - 92}" x2="${width - 72}" y2="${height - 92}" stroke="${C.passive}" stroke-width="2"/>
  <text x="72" y="${height - 48}" font-size="17" fill="${C.muted}">${escape(note)}</text>
  <image x="${width - 276}" y="${height - 76}" width="204" height="40" href="data:image/svg+xml;base64,${signatureData}"/>`

const shell = ({ width, height, title, desc, body, note, source = false }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escape(title)}</title>
  <desc id="desc">${escape(desc)}</desc>${source ? '\n  <metadata>Editable source SVG · Efeonce editorial infographic system · 2026-07-18</metadata>' : ''}
  <rect width="${width}" height="${height}" fill="${C.paper}"/>
  <g font-family="Poppins, Arial, Helvetica, sans-serif">
${body}
${footer(width, height, note)}
  </g>
</svg>
`

const arrow = (x1, y1, x2, y2, color = C.passive) => {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const ax = x2 - Math.cos(angle) * 18
  const ay = y2 - Math.sin(angle) * 18
  const p1 = `${x2},${y2}`
  const p2 = `${ax + Math.cos(angle + Math.PI / 2) * 9},${ay + Math.sin(angle + Math.PI / 2) * 9}`
  const p3 = `${ax + Math.cos(angle - Math.PI / 2) * 9},${ay + Math.sin(angle - Math.PI / 2) * 9}`
  return `<path d="M${x1} ${y1} L${ax} ${ay}" stroke="${color}" stroke-width="5" stroke-linecap="round"/><path d="M${p1} L${p2} L${p3} Z" fill="${color}"/>`
}

const arrowHead = (x, y, angle, color = C.passive, size = 18) => {
  const baseX = x - Math.cos(angle) * size
  const baseY = y - Math.sin(angle) * size
  const wing = size / 2
  const p1 = `${x},${y}`
  const p2 = `${baseX + Math.cos(angle + Math.PI / 2) * wing},${baseY + Math.sin(angle + Math.PI / 2) * wing}`
  const p3 = `${baseX + Math.cos(angle - Math.PI / 2) * wing},${baseY + Math.sin(angle - Math.PI / 2) * wing}`

  return `<path d="M${p1} L${p2} L${p3} Z" fill="${color}"/>`
}

const dot = (cx, cy, r, fill, label, detail, labelY = 7) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="${C.paper}" stroke-width="2" opacity=".55"/>
  <text x="${cx}" y="${cy + labelY}" text-anchor="middle" font-size="24" font-weight="700" fill="${C.paper}">${escape(label)}</text>
  ${lines(detail, cx, cy + r + 38, 18, C.muted, 400, 24, 'middle')}`

const mobileDot = (cx, cy, fill, label, detail) => `
  <circle cx="${cx}" cy="${cy}" r="125" fill="${fill}"/>
  <circle cx="${cx}" cy="${cy}" r="111" fill="none" stroke="${C.paper}" stroke-width="3" opacity=".55"/>
  <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="42" font-weight="700" fill="${C.paper}">${escape(label)}</text>
  ${lines(detail, cx, cy + 174, 34, C.muted, 400, 42, 'middle')}`

const v01Desktop = source => shell({
  width: 1600,
  height: 1000,
  source,
  title: 'Un agente útil necesita tres capas',
  desc: 'Modelo, MCP y Agent Skill convergen en un resultado gobernado.',
  note: 'Marco editorial Efeonce · Agent Skills · julio 2026',
  body: `
  <text x="72" y="72" font-size="20" font-weight="700" letter-spacing="4" fill="${C.active}">AGENT SKILLS · MODELO OPERATIVO</text>
  ${lines(['Un agente útil necesita', 'tres capas'], 72, 142, 56, C.ink, 700, 62)}
  <text x="72" y="282" font-size="24" fill="${C.muted}">Razonamiento, acceso y método cumplen trabajos distintos. El resultado aparece cuando convergen.</text>
  <path d="M390 565 L800 420 L1210 565 L800 735 Z" fill="${C.paleGray}" stroke="${C.passive}" stroke-width="2"/>
  ${arrow(510, 565, 740, 690, C.mid)}
  ${arrow(800, 525, 800, 680, C.active)}
  ${arrow(1090, 565, 860, 690, C.energy)}
  ${dot(390, 565, 108, C.mid, 'MODELO', ['Razona y produce', 'capacidad general'])}
  ${dot(800, 420, 108, C.active, 'MCP', ['Conecta sistemas', 'datos y acciones'])}
  ${dot(1210, 565, 108, C.energy, 'SKILL', ['Aporta criterio,', 'límites y checks'])}
  <rect x="490" y="690" width="620" height="132" rx="66" fill="${C.ink}"/>
  <text x="800" y="742" text-anchor="middle" font-size="17" font-weight="700" letter-spacing="3" fill="#9FD4FF">RESULTADO GOBERNADO</text>
  <text x="800" y="785" text-anchor="middle" font-size="29" font-weight="700" fill="${C.paper}">Utilizable · verificable · auditable</text>
  <text x="800" y="866" text-anchor="middle" font-size="22" font-weight="700" fill="${C.energy}">La conexión habilita. El método orienta.</text>`
})

const v01Mobile = source => shell({
  width: 1000,
  height: 1500,
  source,
  title: 'Un agente útil necesita tres capas',
  desc: 'Modelo, MCP y Agent Skill convergen en un resultado gobernado.',
  note: 'Marco editorial Efeonce · Agent Skills · julio 2026',
  body: `
  <text x="60" y="70" font-size="18" font-weight="700" letter-spacing="3" fill="${C.active}">AGENT SKILLS · MODELO OPERATIVO</text>
  ${lines(['Un agente útil', 'necesita tres capas'], 60, 142, 50, C.ink, 700, 58)}
  ${lines(['Razonamiento, acceso y método', 'cumplen trabajos distintos.'], 60, 286, 34, C.muted, 400, 42)}
  <line x1="170" y1="438" x2="170" y2="1042" stroke="${C.passive}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="170" cy="470" r="74" fill="${C.mid}"/>
  <text x="170" y="484" text-anchor="middle" font-size="42" font-weight="700" fill="${C.paper}">01</text>
  <text x="290" y="454" font-size="44" font-weight="700" fill="${C.ink}">MODELO</text>
  ${lines(['Razona y produce', 'capacidad general'], 290, 505, 34, C.muted, 400, 40)}
  ${arrow(170, 548, 170, 650, C.mid)}
  <circle cx="170" cy="740" r="74" fill="${C.active}"/>
  <text x="170" y="754" text-anchor="middle" font-size="42" font-weight="700" fill="${C.paper}">02</text>
  <text x="290" y="724" font-size="44" font-weight="700" fill="${C.ink}">MCP</text>
  ${lines(['Conecta sistemas,', 'datos y acciones'], 290, 775, 34, C.muted, 400, 40)}
  ${arrow(170, 818, 170, 920, C.active)}
  <circle cx="170" cy="1010" r="74" fill="${C.energy}"/>
  <text x="170" y="1024" text-anchor="middle" font-size="42" font-weight="700" fill="${C.paper}">03</text>
  <text x="290" y="994" font-size="44" font-weight="700" fill="${C.ink}">SKILL</text>
  ${lines(['Aporta criterio,', 'límites y checks'], 290, 1045, 34, C.muted, 400, 40)}
  ${arrow(170, 1088, 170, 1175, C.energy)}
  <rect x="90" y="1170" width="820" height="152" rx="48" fill="${C.ink}"/>
  <text x="500" y="1225" text-anchor="middle" font-size="28" font-weight="700" letter-spacing="2" fill="#9FD4FF">RESULTADO GOBERNADO</text>
  <text x="500" y="1278" text-anchor="middle" font-size="38" font-weight="700" fill="${C.paper}">Utilizable · verificable · auditable</text>`
})

const cycleNode = (cx, cy, number, title, detail, fill) => `
  <circle cx="${cx}" cy="${cy}" r="82" fill="${fill}"/>
  <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="18" font-weight="700" fill="${C.paper}">0${number}</text>
  <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="${title === 'EMPAQUETAR' ? 18 : 23}" font-weight="700" fill="${C.paper}">${escape(title)}</text>
  ${lines(detail, cx, cy + 122, 18, C.muted, 400, 24, 'middle')}`

const v02Desktop = source => shell({
  width: 1600,
  height: 1000,
  source,
  title: 'Del criterio tácito a una capacidad reusable',
  desc: 'Un loop de cinco movimientos convierte decisiones expertas en un skill mantenible.',
  note: 'Marco editorial Efeonce · El skill se mantiene; no congela el conocimiento',
  body: `
  <text x="72" y="72" font-size="20" font-weight="700" letter-spacing="4" fill="${C.energy}">CONOCIMIENTO PROPIETARIO · LOOP</text>
  ${lines(['Del criterio tácito a una', 'capacidad reusable'], 72, 142, 54, C.ink, 700, 60)}
  <text x="72" y="280" font-size="24" fill="${C.muted}">El skill gana valor cuando captura decisiones y vuelve a aprender de la evidencia.</text>
  <path d="M245 535 H1350 Q1430 535 1430 615 V770 Q1430 850 1350 850 H245 Q165 850 165 770 V650" fill="none" stroke="${C.passive}" stroke-width="6" stroke-dasharray="5 18" stroke-linecap="round"/>
  ${arrow(320, 535, 460, 535, C.mid)}
  ${arrow(610, 535, 750, 535, C.active)}
  ${arrow(910, 535, 1050, 535, C.energy)}
  ${arrow(1210, 535, 1350, 535, C.deep)}
  ${arrowHead(255, 850, Math.PI, C.mid, 20)}
  ${cycleNode(220, 535, 1, 'OBSERVAR', ['Decisiones expertas'], C.mid)}
  ${cycleNode(520, 535, 2, 'EXTRAER', ['Criterios y límites'], C.active)}
  ${cycleNode(820, 535, 3, 'EMPAQUETAR', ['Instrucciones y checks'], C.energy)}
  ${cycleNode(1120, 535, 4, 'EJECUTAR', ['Trabajo con evidencia'], C.deep)}
  ${cycleNode(1380, 690, 5, 'REVISAR', ['Cambios de la operación'], C.mid)}
  <rect x="490" y="750" width="620" height="128" rx="64" fill="${C.paleOrange}" stroke="${C.energy}" stroke-width="3"/>
  <text x="800" y="796" text-anchor="middle" font-size="17" font-weight="700" letter-spacing="3" fill="${C.energy}">LO QUE VUELVE AL INICIO</text>
  <text x="800" y="842" text-anchor="middle" font-size="30" font-weight="700" fill="${C.ink}">Criterio propietario actualizado</text>`
})

const mobileStep = (y, number, title, detail, fill) => `
  <circle cx="170" cy="${y}" r="62" fill="${fill}"/>
  <text x="170" y="${y + 13}" text-anchor="middle" font-size="38" font-weight="700" fill="${C.paper}">0${number}</text>
  <text x="280" y="${y - 8}" font-size="40" font-weight="700" fill="${C.ink}">${escape(title)}</text>
  ${lines(detail, 280, y + 36, 34, C.muted, 400, 39)}`

const v02Mobile = source => shell({
  width: 1000,
  height: 1500,
  source,
  title: 'Del criterio tácito a una capacidad reusable',
  desc: 'Cinco movimientos convierten decisiones expertas en un skill mantenible.',
  note: 'Marco editorial Efeonce · El skill se mantiene; no congela el conocimiento',
  body: `
  <text x="60" y="70" font-size="18" font-weight="700" letter-spacing="3" fill="${C.energy}">CONOCIMIENTO PROPIETARIO · LOOP</text>
  ${lines(['Del criterio tácito', 'a una capacidad reusable'], 60, 142, 48, C.ink, 700, 56)}
  ${lines(['El valor aparece cuando el sistema', 'aprende de la evidencia.'], 60, 278, 34, C.muted, 400, 42)}
  <line x1="170" y1="410" x2="170" y2="1170" stroke="${C.passive}" stroke-width="8" stroke-linecap="round"/>
  <path d="M108 1150 H72 V450 Q72 410 112 410" fill="none" stroke="${C.energy}" stroke-width="4" stroke-linecap="round"/>
  ${arrowHead(112, 410, 0, C.energy, 18)}
  ${mobileStep(430, 1, 'OBSERVAR', ['Qué decide la persona experta'], C.mid)}
  ${mobileStep(610, 2, 'EXTRAER', ['Criterios, excepciones', 'y límites'], C.active)}
  ${mobileStep(790, 3, 'EMPAQUETAR', ['Instrucciones, referencias', 'y checks'], C.energy)}
  ${mobileStep(970, 4, 'EJECUTAR', ['Trabajo con evidencia', 'recuperable'], C.deep)}
  ${mobileStep(1150, 5, 'REVISAR', ['Actualizar cuando cambia', 'la operación'], C.mid)}
  <rect x="120" y="1260" width="760" height="118" rx="48" fill="${C.paleOrange}" stroke="${C.energy}" stroke-width="3"/>
  <text x="500" y="1305" text-anchor="middle" font-size="27" font-weight="700" letter-spacing="2" fill="${C.energy}">RESULTADO</text>
  <text x="500" y="1350" text-anchor="middle" font-size="36" font-weight="700" fill="${C.ink}">Criterio convertido en sistema</text>`
})

const gate = (y, number, title, detail) => `
  <circle cx="178" cy="${y}" r="47" fill="${number === 5 ? C.energy : C.active}"/>
  <text x="178" y="${y + 9}" text-anchor="middle" font-size="27" font-weight="700" fill="${C.paper}">${number}</text>
  <line x1="226" y1="${y}" x2="282" y2="${y}" stroke="${C.passive}" stroke-width="4"/>
  <text x="310" y="${y - 7}" font-size="25" font-weight="700" fill="${C.ink}">${escape(title)}</text>
  <text x="310" y="${y + 26}" font-size="19" fill="${C.muted}">${escape(detail)}</text>`

const v03Social = source => shell({
  width: 1080,
  height: 1350,
  source,
  title: '¿Este proceso merece convertirse en un skill?',
  desc: 'Cinco señales para decidir si un proceso es buen candidato para un Agent Skill propietario.',
  note: 'Marco editorial Efeonce · No es una fórmula universal',
  body: `
  <text x="64" y="68" font-size="18" font-weight="700" letter-spacing="3" fill="${C.active}">AGENT SKILLS · GUÍA DE DECISIÓN</text>
  ${lines(['¿Este proceso merece', 'convertirse en un skill?'], 64, 140, 48, C.ink, 700, 56)}
  ${lines(['Busca señales de criterio operativo, no sólo', 'una secuencia de pasos que automatizar.'], 64, 282, 22, C.muted, 400, 30)}
  <path d="M178 390 V1010" stroke="${C.passive}" stroke-width="8" stroke-linecap="round"/>
  ${gate(410, 1, 'SE REPITE', 'Ocurre con suficiente frecuencia para mantenerlo.')}
  ${gate(550, 2, 'DEPENDE DE CRITERIO', 'Exige decidir, priorizar o reconocer calidad.')}
  ${gate(690, 3, 'TIENE EXCEPCIONES', 'Incluye límites y casos que un prompt genérico pierde.')}
  ${gate(830, 4, 'SE PUEDE VERIFICAR', 'Produce evidencia y condiciones claras de aceptación.')}
  ${gate(970, 5, 'TIENE UN DUEÑO', 'Alguien revisa el skill cuando cambia la operación.')}
  <rect x="92" y="1060" width="896" height="158" rx="32" fill="${C.ink}"/>
  <text x="132" y="1108" font-size="17" font-weight="700" letter-spacing="3" fill="#9FD4FF">DECISIÓN</text>
  <text x="132" y="1156" font-size="30" font-weight="700" fill="${C.paper}">Cuantas más señales reúna,</text>
  <text x="132" y="1194" font-size="29" font-weight="700" fill="${C.paper}">mejor candidato es para prototipar y probar.</text>`
})

const definitions = [
  ['kfu-v01-three-layers-desktop', v01Desktop],
  ['kfu-v01-three-layers-mobile', v01Mobile],
  ['kfu-v02-tacit-knowledge-loop-desktop', v02Desktop],
  ['kfu-v02-tacit-knowledge-loop-mobile', v02Mobile],
  ['kfu-v03-skill-candidate-social', v03Social]
]

const typographyFitCases = [
  ['KFU-V01 desktop', 'círculo MODELO', 'MODELO', 24, 700, 216, 0.8],
  ['KFU-V01 desktop', 'círculo MCP', 'MCP', 24, 700, 216, 0.8],
  ['KFU-V01 desktop', 'círculo SKILL', 'SKILL', 24, 700, 216, 0.8],
  ['KFU-V01 desktop', 'cápsula resultado', 'Utilizable · verificable · auditable', 29, 700, 620, 0.82],
  ['KFU-V01 mobile', 'cápsula resultado', 'Utilizable · verificable · auditable', 38, 700, 820, 0.82],
  ['KFU-V02 desktop', 'círculo OBSERVAR', 'OBSERVAR', 23, 700, 164, 0.78],
  ['KFU-V02 desktop', 'círculo EXTRAER', 'EXTRAER', 23, 700, 164, 0.78],
  ['KFU-V02 desktop', 'círculo EMPAQUETAR', 'EMPAQUETAR', 18, 700, 164, 0.78],
  ['KFU-V02 desktop', 'círculo EJECUTAR', 'EJECUTAR', 23, 700, 164, 0.78],
  ['KFU-V02 desktop', 'círculo REVISAR', 'REVISAR', 23, 700, 164, 0.78],
  ['KFU-V02 desktop', 'cápsula retorno', 'Criterio propietario actualizado', 30, 700, 620, 0.82],
  ['KFU-V02 mobile', 'detalle EXTRAER 1', 'Criterios, excepciones', 34, 400, 650, 0.82],
  ['KFU-V02 mobile', 'detalle EMPAQUETAR 1', 'Instrucciones, referencias', 34, 400, 650, 0.82],
  ['KFU-V02 mobile', 'detalle EJECUTAR 1', 'Trabajo con evidencia', 34, 400, 650, 0.82],
  ['KFU-V02 mobile', 'detalle REVISAR 1', 'Actualizar cuando cambia', 34, 400, 650, 0.82],
  ['KFU-V02 mobile', 'cápsula resultado', 'Criterio convertido en sistema', 36, 700, 760, 0.82],
  ['KFU-V03 social', 'decisión línea 1', 'Cuantas más señales reúna,', 30, 700, 816, 0.86],
  ['KFU-V03 social', 'decisión línea 2', 'mejor candidato es para prototipar y probar.', 29, 700, 816, 0.82]
]

const typographyFitResults = typographyFitCases.map(([asset, element, value, size, weight, containerWidth, maxOccupancy]) => {
  const textWidth = measureText(value, size, weight)
  const occupancy = textWidth / containerWidth

  return {
    asset,
    element,
    value,
    size,
    weight,
    textWidth: Number(textWidth.toFixed(2)),
    containerWidth,
    horizontalPaddingEachSide: Number(((containerWidth - textWidth) / 2).toFixed(2)),
    occupancy: Number(occupancy.toFixed(4)),
    maxOccupancy,
    verdict: occupancy <= maxOccupancy ? 'PASS' : 'BLOCK'
  }
})

const typographyFitReport = {
  generatedAt: new Date().toISOString(),
  status: typographyFitResults.some(result => result.verdict === 'BLOCK') ? 'BLOCK' : 'PASS',
  rule: 'Critical labels and diagram lockups must preserve an explicit optical inset; thresholds vary by container role.',
  results: typographyFitResults
}

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')
const files = []

for (const [name, render] of definitions) {
  const source = Buffer.from(render(true))
  const delivery = Buffer.from(outlineText(render(false)))
  const sourcePath = resolve(sourceDir, `${name}-source-v1.svg`)
  const deliveryPath = resolve(deliveryDir, `${name}-delivery-v1.svg`)
  await writeFile(sourcePath, source)
  await writeFile(deliveryPath, delivery)
  files.push({
    name,
    source: { path: sourcePath.replace(`${process.cwd()}/`, ''), sha256: sha256(source), bytes: source.length },
    delivery: {
      path: deliveryPath.replace(`${process.cwd()}/`, ''),
      sha256: sha256(delivery),
      bytes: { raw: delivery.length, gzip: gzipSync(delivery, { level: 9 }).length, brotli: brotliCompressSync(delivery).length }
    }
  })
}

await writeFile(resolve(root, 'build-report.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`)
await writeFile(resolve(root, 'typography-fit-report.json'), `${JSON.stringify(typographyFitReport, null, 2)}\n`)

if (typographyFitReport.status === 'BLOCK') {
  throw new Error('Typography fit gate failed. Review typography-fit-report.json.')
}

const byName = Object.fromEntries(files.map(file => [file.name, file]))
const manifest = {
  schemaVersion: 1,
  runId: '2026-07-18_i-know-kung-fu-agent-skills',
  status: 'production_visual_complete_integration_pending',
  article: {
    wordpressPostId: 250748,
    title: '«I Know Kung Fu»: el momento Matrix de los Agent Skills',
    slug: 'i-know-kung-fu-agent-skills-momento-matrix-ia-empresarial',
    wordpressStatus: 'private'
  },
  visualSystem: {
    name: 'El criterio se vuelve capacidad',
    thesis: 'Razonamiento, acceso y método convergen; el conocimiento propietario gana valor cuando se convierte en un loop verificable.',
    skin: 'efeonce_core',
    canvas: 'white_poster',
    signatureAsset: 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg',
    signatureLabel: 'efeoncepro.com',
    palette: C,
    invariants: ['título autónomo', 'una relación dominante', 'navy estructural', 'naranja para decisión', 'firma periférica'],
    forbidden: ['Matrix literal', 'lluvia de código', 'UI ficticia', 'cards de dashboard', 'glass', 'glow', 'gradientes', 'cifras no verificadas']
  },
  pictureContract: {
    breakpointPx: 720,
    rationale: 'Los body assets cambian de composición triangular/circular a recorridos verticales; no se resuelven encogiendo desktop.',
    fallback: 'desktopLight'
  },
  assets: [
    {
      conceptId: 'KFU-V01',
      slot: 'body_after_mcp_and_skills',
      function: 'Mostrar que razonamiento, acceso y método cumplen trabajos distintos y convergen en un resultado gobernado.',
      explanatoryDelta: 'Hace visible la convergencia simultánea de tres capas que la tabla adyacente sólo compara de forma binaria.',
      archetype: 'layered-model',
      deliveryContract: {
        viewport: 'art_directed', theme: 'single_theme', canvas: 'opaque', skin: 'efeonce_core',
        rationale: 'La convergencia triangular necesita una composición vertical específica para conservar texto legible en móvil.'
      },
      variants: {
        desktopLight: byName['kfu-v01-three-layers-desktop'].delivery.path,
        mobileLight: byName['kfu-v01-three-layers-mobile'].delivery.path
      },
      sources: {
        desktop: byName['kfu-v01-three-layers-desktop'].source,
        mobile: byName['kfu-v01-three-layers-mobile'].source
      },
      deliveries: {
        desktop: byName['kfu-v01-three-layers-desktop'].delivery,
        mobile: byName['kfu-v01-three-layers-mobile'].delivery
      },
      metadata: {
        alt: 'Modelo, MCP y Agent Skill aportan razonamiento, acceso y método; las tres capas convergen en un resultado utilizable, verificable y auditable.',
        caption: 'La conexión habilita y el modelo razona; el skill aporta el criterio y las verificaciones del trabajo.',
        description: 'Infografía editorial determinística KFU-V01. No representa productos independientes ni garantiza calidad por sí sola.'
      },
      qa: { status: 'pass', liveTextInDelivery: false, outlinedFont: 'Poppins', typographyFitChecked: true, reviewedAtOriginalResolution: true }
    },
    {
      conceptId: 'KFU-V02',
      slot: 'body_after_skill_candidate_criteria',
      function: 'Mostrar cómo decisiones expertas entran en un loop de explicitación, ejecución con evidencia y mantenimiento.',
      explanatoryDelta: 'Hace visible el feedback que transforma experiencia dispersa en una capacidad mantenible, no sólo una lista de pasos.',
      archetype: 'cycle',
      deliveryContract: {
        viewport: 'art_directed', theme: 'single_theme', canvas: 'opaque', skin: 'efeonce_core',
        rationale: 'El loop se lee horizontalmente en desktop y como recorrido serpenteante con retorno explícito en móvil.'
      },
      variants: {
        desktopLight: byName['kfu-v02-tacit-knowledge-loop-desktop'].delivery.path,
        mobileLight: byName['kfu-v02-tacit-knowledge-loop-mobile'].delivery.path
      },
      sources: {
        desktop: byName['kfu-v02-tacit-knowledge-loop-desktop'].source,
        mobile: byName['kfu-v02-tacit-knowledge-loop-mobile'].source
      },
      deliveries: {
        desktop: byName['kfu-v02-tacit-knowledge-loop-desktop'].delivery,
        mobile: byName['kfu-v02-tacit-knowledge-loop-mobile'].delivery
      },
      metadata: {
        alt: 'Cinco movimientos convierten conocimiento tácito en una capacidad reusable: observar decisiones, extraer criterios, empaquetar el skill, ejecutar con evidencia y revisar para actualizar.',
        caption: 'El skill no congela el conocimiento: lo convierte en un sistema que puede revisarse cuando cambia la operación.',
        description: 'Infografía editorial determinística KFU-V02. No implica que todo conocimiento pueda automatizarse.'
      },
      qa: { status: 'pass', liveTextInDelivery: false, outlinedFont: 'Poppins', typographyFitChecked: true, reviewedAtOriginalResolution: true }
    },
    {
      conceptId: 'KFU-V03',
      slot: 'social_derivative_skill_candidate',
      function: 'Convertir cinco señales editoriales en una guía autónoma para decidir qué proceso prototipar como skill.',
      explanatoryDelta: 'Transforma una lista de condiciones en un recorrido de decisión autónomo que puede circular sin el artículo.',
      archetype: 'path',
      deliveryContract: {
        viewport: 'crop_safe', theme: 'single_theme', canvas: 'opaque', skin: 'efeonce_core',
        rationale: 'El póster 4:5 conserva título, cinco señales y decisión dentro de una zona segura para social y thumbnail.'
      },
      variants: {
        desktopLight: byName['kfu-v03-skill-candidate-social'].delivery.path
      },
      sources: { social: byName['kfu-v03-skill-candidate-social'].source },
      deliveries: { social: byName['kfu-v03-skill-candidate-social'].delivery },
      metadata: {
        alt: 'Cinco señales ayudan a decidir si un proceso merece convertirse en Agent Skill: se repite, depende de criterio, contiene excepciones, produce un resultado verificable y tiene un dueño.',
        caption: 'Cuantas más señales reúna el proceso, mejor candidato es para un skill propietario.',
        description: 'Infografía editorial determinística KFU-V03. Es una guía de decisión, no una fórmula universal.'
      },
      qa: { status: 'pass', liveTextInDelivery: false, outlinedFont: 'Poppins', typographyFitChecked: true, reviewedAtOriginalResolution: true }
    }
  ],
  production: {
    generator: 'build-infographics.mjs',
    renderer: 'fontkit outlined delivery',
    fontSources: ['src/assets/fonts/Poppins-Medium.ttf', 'src/assets/fonts/Poppins-SemiBold.ttf', 'src/assets/fonts/Poppins-Bold.ttf'],
    sourceAndDeliverySeparated: true,
    typographyFitGate: 'typography-fit-report.json',
    externalResources: false,
    rasterRequired: false,
    rasterRationale: 'Las piezas son vectoriales, seguras y más nítidas como SVG. Raster queda pendiente sólo para destinos sociales o CMS que lo exijan.'
  },
  integration: { wordpressMediaIds: [], articleUpdated: false, publicationAuthorized: false }
}

await writeFile(resolve(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ status: 'ok', files: files.length, report: resolve(root, 'build-report.json'), manifest: resolve(root, 'manifest.json') }, null, 2))
