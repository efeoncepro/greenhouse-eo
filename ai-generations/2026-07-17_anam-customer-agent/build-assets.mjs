import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(runDir, '../..')
const sourceDir = path.join(runDir, 'source')
const masterDir = path.join(runDir, 'masters')
const deliveryDir = path.join(runDir, 'delivery')
const reviewDir = path.join(runDir, 'review')
const negativeLogo = path.join(rootDir, 'public/branding/logo-negative.svg')
const positiveLogo = path.join(rootDir, 'public/branding/logo-full.svg')

await Promise.all([sourceDir, masterDir, deliveryDir, reviewDir].map(dir => mkdir(dir, { recursive: true })))

const C = {
  ink: '#171918', muted: '#5E625F', paper: '#F4F1EA', white: '#FFFFFF',
  blue: '#214BD9', deepBlue: '#072A4A', paleBlue: '#DDEAF7',
  coral: '#F15E4A', orange: '#FF8A4C', lime: '#A8E72E', burgundy: '#290519',
  line: '#C8C7C1', dark: '#111614'
}

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const text = (x, y, value, size, weight = 400, fill = C.ink, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Poppins, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(value)}</text>`

const multiline = (x, y, lines, size, weight = 400, fill = C.ink, gap = 1.24, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Poppins, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${lines.map((line, i) => `<tspan x="${x}" dy="${i ? size * gap : 0}">${esc(line)}</tspan>`).join('')}</text>`

const pill = (x, y, w, label, fill, color = C.white) =>
  `<rect x="${x}" y="${y}" width="${w}" height="42" rx="21" fill="${fill}"/>${text(x + w / 2, y + 28, label, 15, 600, color, 'text-anchor="middle" letter-spacing="1.2"')}`

const arrow = (x1, y1, x2, y2, color = C.blue, width = 4) =>
  `<path d="M${x1} ${y1} L${x2 - 14} ${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${x2 - 16} ${y2 - 9} L${x2} ${y2} L${x2 - 16} ${y2 + 9}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

const downArrow = (x, y1, y2, color = C.blue, width = 4) =>
  `<path d="M${x} ${y1} L${x} ${y2 - 14}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${x - 9} ${y2 - 16} L${x} ${y2} L${x + 9} ${y2 - 16}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

const shell = ({ width, height, title, desc, body, background = C.paper, defs = '' }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#101010" flood-opacity=".14"/></filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#101010" flood-opacity=".10"/></filter>
    ${defs}
  </defs>
  ${background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : ''}
  ${body}
  <!-- Official Efeonce wordmark is composited deterministically during rasterization. -->
</svg>`

function hero() {
  const nodes = []

  const positions = [
    [620, 390], [700, 355], [780, 400], [650, 470], [745, 485], [830, 455],
    [600, 535], [690, 560], [790, 540], [865, 520], [630, 630], [730, 640],
    [830, 620], [900, 590], [675, 705], [780, 710], [875, 685], [960, 430],
    [985, 500], [970, 575], [955, 650], [920, 735], [820, 765]
  ]

  positions.forEach(([x, y], i) => {
    const r = i < 6 ? 15 : 9
    const fill = i < 6 ? C.coral : '#6EA7EF'

    nodes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${i < 6 ? 1 : .86}"/>`)
  })

  const body = `
    <defs>
      <radialGradient id="heroGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1550 120) rotate(145) scale(930 650)"><stop stop-color="#C93700" stop-opacity=".40"/><stop offset=".5" stop-color="#7C244D" stop-opacity=".20"/><stop offset="1" stop-color="#290519" stop-opacity="0"/></radialGradient>
      <linearGradient id="agentPanel" x1="520" y1="270" x2="1130" y2="840"><stop stop-color="#0B3155"/><stop offset="1" stop-color="#061B31"/></linearGradient>
    </defs>
    <rect width="2048" height="1152" fill="${C.burgundy}"/><rect width="2048" height="1152" fill="url(#heroGlow)"/>
    ${pill(520, 115, 280, 'CASO ANAM · HUBSPOT', '#0C3458')}
    ${multiline(520, 205, ['Una IA puede responder.', '¿Sabe cuándo detenerse?'], 58, 650, C.white, 1.12)}
    ${text(520, 350, '23 fuentes gobernadas', 20, 500, '#BBD8F0')}

    <g filter="url(#shadow)"><rect x="520" y="380" width="620" height="470" rx="34" fill="url(#agentPanel)"/><rect x="521" y="381" width="618" height="468" rx="33" fill="none" stroke="#FFFFFF" stroke-opacity=".13" stroke-width="2"/></g>
    ${nodes.join('')}
    <path d="M590 380 C720 280 950 320 1080 430" fill="none" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="80"/>
    <path d="M915 550 C1020 550 1060 585 1135 585" fill="none" stroke="${C.lime}" stroke-width="5" stroke-linecap="round"/>
    ${text(595, 805, '6 archivos + 17 respuestas cortas', 18, 500, '#D8E8F6')}

    <line x1="1185" y1="360" x2="1185" y2="875" stroke="${C.coral}" stroke-width="4" stroke-dasharray="12 12"/>
    ${pill(1100, 325, 170, 'FRONTERA', C.coral)}

    <g filter="url(#shadow)"><rect x="1235" y="440" width="330" height="330" rx="34" fill="#E5EFF8"/><rect x="1236" y="441" width="328" height="328" rx="33" fill="none" stroke="#FFFFFF" stroke-width="2"/></g>
    <circle cx="1400" cy="552" r="58" fill="${C.deepBlue}"/>
    <circle cx="1400" cy="528" r="18" fill="${C.white}"/><path d="M1363 584 C1372 552 1428 552 1437 584" fill="none" stroke="${C.white}" stroke-width="17" stroke-linecap="round"/>
    ${text(1400, 660, 'La persona decide', 29, 650, C.deepBlue, 'text-anchor="middle"')}
    ${text(1400, 700, 'cuando cambia la responsabilidad', 16, 500, '#355A78', 'text-anchor="middle"')}

    <path d="M905 690 C1000 690 1070 700 1165 700" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round"/>
    <path d="M1195 700 C1210 700 1220 700 1235 700" fill="none" stroke="${C.coral}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="905" cy="690" r="11" fill="${C.orange}"/><circle cx="1185" cy="700" r="14" fill="${C.coral}"/><circle cx="1235" cy="700" r="11" fill="${C.coral}"/>
    ${text(520, 930, 'Conocimiento · límites · memoria · transferencia · operación real', 22, 500, '#D9C7D1')}
  `

  
return shell({ width: 2048, height: 1152, title: 'Customer Agent de ANAM: la frontera entre respuesta y decisión', desc: 'Una conversación avanza desde veintitrés fuentes gobernadas y cambia de responsable al cruzar una frontera humana.', body, background: C.burgundy })
}

const autonomyCards = (vertical = false) => {
  const items = [
    { n: '01', name: 'Saber', lines: ['Respuesta documentada.', 'No implica decisión sensible.'], owner: 'AGENTE', fill: C.blue, fg: C.white, accent: C.lime },
    { n: '02', name: 'Aclarar', lines: ['Existe conocimiento.', 'Faltan antecedentes.'], owner: 'AGENTE', fill: '#E7EDF9', fg: C.deepBlue, accent: C.blue },
    { n: '03', name: 'Preparar', lines: ['La acción será humana.', 'El agente reúne y resume.'], owner: 'AGENTE → PERSONA', fill: '#FFE1D6', fg: '#6A2418', accent: C.orange },
    { n: '04', name: 'Decidir', lines: ['Requiere juicio, acceso', 'o compromiso organizacional.'], owner: 'PERSONA', fill: C.dark, fg: C.white, accent: C.coral }
  ]

  if (!vertical) {
    return items.map((item, i) => {
      const x = 80 + i * 365

      
return `<g filter="url(#softShadow)"><rect x="${x}" y="335" width="325" height="430" rx="22" fill="${item.fill}"/></g>
        ${text(x + 28, 390, item.n, 18, 650, item.accent)}
        ${text(x + 28, 470, item.name, 39, 650, item.fg)}
        ${multiline(x + 28, 535, item.lines, 18, 400, item.fg, 1.45)}
        <line x1="${x + 28}" y1="650" x2="${x + 297}" y2="650" stroke="${item.fg}" stroke-opacity=".22"/>
        ${text(x + 28, 708, item.owner, 16, 650, item.accent, 'letter-spacing="1.2"')}`
    }).join('')
  }

  
return items.map((item, i) => {
    const y = 355 + i * 270

    
return `<g filter="url(#softShadow)"><rect x="80" y="${y}" width="1040" height="225" rx="24" fill="${item.fill}"/></g>
      ${text(120, y + 50, item.n, 18, 650, item.accent)}
      ${text(120, y + 112, item.name, 40, 650, item.fg)}
      ${multiline(420, y + 76, item.lines, 20, 400, item.fg, 1.45)}
      ${text(1080, y + 176, item.owner, 15, 650, item.accent, 'text-anchor="end" letter-spacing="1"')}`
  }).join('')
}

function autonomy(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const body = `
    ${pill(vertical ? 80 : 80, 70, 235, 'AUTONOMÍA CONVERSACIONAL', C.blue)}
    ${multiline(80, vertical ? 165 : 165, vertical ? ['La responsabilidad', 'marca la frontera'] : ['La responsabilidad marca la frontera'], vertical ? 52 : 54, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'No todas las conversaciones recorren las cuatro zonas.', vertical ? 21 : 22, 400, C.muted)}
    ${autonomyCards(vertical)}
    ${vertical ? '<line x1="80" y1="1142" x2="1120" y2="1142" stroke="#F15E4A" stroke-width="4" stroke-dasharray="10 10" opacity=".45"/>' : '<line x1="1170" y1="305" x2="1170" y2="805" stroke="#F15E4A" stroke-width="4" stroke-dasharray="10 10" opacity=".40"/>'}
    ${text(80, h - 75, 'La IA se detiene antes de decidir por la organización.', vertical ? 24 : 23, 600, C.ink)}
  `

  
return shell({ width: w, height: h, title: 'Frontera de autonomía conversacional', desc: 'Cuatro zonas muestran qué puede responder, aclarar y preparar el agente, y qué debe decidir una persona.', body, background: null })
}

function knowledge(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const sourceCluster = vertical ? `
    <g filter="url(#softShadow)"><rect x="80" y="350" width="1040" height="310" rx="26" fill="#E7EDF9"/></g>
    ${text(125, 410, 'FUENTES EN USO', 16, 650, C.blue, 'letter-spacing="1.5"')}
    ${text(125, 505, '6', 72, 700, C.deepBlue)}${text(220, 486, 'archivos privados', 23, 600, C.deepBlue)}
    ${text(570, 505, '+ 17', 72, 700, C.coral)}${text(760, 486, 'respuestas cortas', 23, 600, '#6A2418')}
    ${text(125, 595, 'El catálogo contiene 356 registros técnicos; no son 356 fuentes ni servicios.', 18, 500, C.muted)}
  ` : `
    <g filter="url(#softShadow)"><rect x="80" y="345" width="410" height="420" rx="26" fill="#E7EDF9"/></g>
    ${text(120, 405, 'FUENTES EN USO', 16, 650, C.blue, 'letter-spacing="1.5"')}
    ${text(120, 510, '6', 76, 700, C.deepBlue)}${text(220, 486, 'archivos', 25, 600, C.deepBlue)}
    ${text(120, 625, '17', 76, 700, C.coral)}${text(250, 600, 'respuestas cortas', 23, 600, '#6A2418')}
    <line x1="120" y1="665" x2="450" y2="665" stroke="#B9C8D8"/>
    ${multiline(120, 710, ['356 registros viven dentro', 'del catálogo técnico.'], 16, 500, C.muted, 1.45)}
  `

  const governance = vertical ? `
    ${downArrow(600, 680, 730, C.blue)}
    <g filter="url(#softShadow)"><rect data-role="deep-surface" x="80" y="750" width="1040" height="300" rx="26" fill="${C.deepBlue}"/></g>
    ${text(125, 815, 'GOBIERNO DEL CONOCIMIENTO', 18, 650, '#87C1F2', 'letter-spacing="1.4"')}
    ${text(125, 900, 'Propósito', 27, 650, C.white)}${text(585, 900, 'Vigencia', 27, 650, C.white)}
    ${text(125, 980, 'Responsable', 27, 650, C.white)}${text(585, 980, 'Contradicciones', 27, 650, C.white)}
  ` : `
    ${arrow(505, 555, 585, 555, C.blue)}
    <g filter="url(#softShadow)"><rect data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="${C.deepBlue}"/></g>
    ${text(645, 405, 'GOBIERNO', 16, 650, '#87C1F2', 'letter-spacing="1.5"')}
    ${text(645, 490, 'Propósito', 28, 650, C.white)}${text(645, 560, 'Vigencia', 28, 650, C.white)}
    ${text(645, 630, 'Responsable', 28, 650, C.white)}${text(645, 700, 'Contradicciones', 28, 650, C.white)}
  `

  const outcomes = vertical ? `
    ${downArrow(600, 1070, 1120, C.coral)}
    <g filter="url(#softShadow)"><rect x="80" y="1140" width="1040" height="300" rx="26" fill="#FFE1D6"/></g>
    ${text(125, 1205, 'CONDUCTA DEL AGENTE', 18, 650, '#A03928', 'letter-spacing="1.4"')}
    ${pill(125, 1260, 250, 'RESPONDER', C.blue)}${pill(475, 1260, 250, 'ACLARAR', C.orange)}${pill(825, 1260, 250, 'TRANSFERIR', C.dark)}
    ${text(125, 1385, 'Las fuentes no llegan directo a una respuesta: primero pasan por reglas.', 18, 500, '#6A2418')}
  ` : `
    ${arrow(1010, 555, 1090, 555, C.coral)}
    <g filter="url(#softShadow)"><rect x="1110" y="345" width="410" height="420" rx="26" fill="#FFE1D6"/></g>
    ${text(1150, 405, 'CONDUCTA', 16, 650, '#A03928', 'letter-spacing="1.5"')}
    ${pill(1150, 470, 250, 'RESPONDER', C.blue)}${pill(1150, 550, 250, 'ACLARAR', C.orange)}${pill(1150, 630, 250, 'TRANSFERIR', C.dark)}
    ${multiline(1150, 720, ['La respuesta depende', 'de reglas, no del volumen.'], 16, 500, '#6A2418', 1.4)}
  `

  const body = `
    ${pill(80, 70, 265, '23 FUENTES · UN CONTRATO', C.blue)}
    ${multiline(80, 165, vertical ? ['Cargar documentos', 'no crea conocimiento'] : ['Cargar documentos no crea conocimiento'], vertical ? 50 : 52, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'El valor aparece cuando cada fuente tiene propósito, vigencia y responsable.', vertical ? 20 : 21, 400, C.muted)}
    ${sourceCluster}${governance}${outcomes}
  `

  
return shell({ width: w, height: h, title: 'Arquitectura gobernada de las 23 fuentes', desc: 'Seis archivos y diecisiete respuestas cortas pasan por reglas de gobierno antes de orientar, aclarar o transferir una consulta.', body, background: null })
}

function evidence(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const stages = [
    ['01', 'Documentado', 'El proveedor describe', 'la capacidad.'],
    ['02', 'Elegible', 'La cuenta muestra', 'la superficie.'],
    ['03', 'Configurado', 'Fuentes, directrices', 'y canal presentes.'],
    ['04', 'Probado', 'Vista previa con', 'limitaciones.'],
    ['05', 'Operativo', 'Conversación real', 'verificada.']
  ]

  const ladder = vertical ? stages.map((s, i) => {
    const y = 345 + i * 220
    const active = i < 4
    const fill = i === 3 ? '#FFE1D6' : active ? '#E7EDF9' : C.white
    const stroke = i === 3 ? C.coral : active ? C.blue : '#9A9D99'

    
return `<g filter="url(#softShadow)"><rect x="80" y="${y}" width="1040" height="175" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="${i === 3 ? 4 : 2}" ${active ? '' : 'stroke-dasharray="12 10"'}/></g>
      ${text(125, y + 55, s[0], 18, 650, stroke)}${text(210, y + 78, s[1], 34, 650, active ? C.deepBlue : C.muted)}
      ${multiline(600, y + 58, [s[2], s[3]], 18, 400, active ? C.ink : C.muted, 1.4)}
      ${i === 3 ? pill(820, y + 105, 245, 'ANAM AL CORTE', C.coral) : ''}
      ${i === 4 ? text(1060, y + 118, 'NO VERIFICADO', 15, 650, C.muted, 'text-anchor="end" letter-spacing="1"') : ''}`
  }).join('') : stages.map((s, i) => {
    const x = 70 + i * 302
    const active = i < 4
    const fill = i === 3 ? '#FFE1D6' : active ? '#E7EDF9' : C.white
    const stroke = i === 3 ? C.coral : active ? C.blue : '#9A9D99'
    const y = 365 - i * 28
    const height = 390 + i * 28

    
return `<g filter="url(#softShadow)"><rect x="${x}" y="${y}" width="260" height="${height}" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="${i === 3 ? 4 : 2}" ${active ? '' : 'stroke-dasharray="12 10"'}/></g>
      ${text(x + 26, y + 55, s[0], 18, 650, stroke)}${text(x + 26, y + 130, s[1], 28, 650, active ? C.deepBlue : C.muted)}
      ${multiline(x + 26, y + 190, [s[2], s[3]], 16, 400, active ? C.ink : C.muted, 1.45)}
      ${i === 3 ? pill(x + 26, y + height - 80, 205, 'ANAM AL CORTE', C.coral) : ''}
      ${i === 4 ? text(x + 26, y + height - 52, 'NO VERIFICADO', 14, 650, C.muted, 'letter-spacing="1"') : ''}`
  }).join('')

  const body = `
    ${pill(80, 70, 250, 'ESCALERA DE EVIDENCIA', C.blue)}
    ${multiline(80, 165, vertical ? ['Configurar', 'no es operar'] : ['Configurar no es operar'], vertical ? 52 : 54, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'Cada estado exige una evidencia distinta.', vertical ? 21 : 22, 400, C.muted)}
    ${ladder}
    ${text(80, h - 65, 'Corte: 17 de julio de 2026 · conversaciones nuevas en pausa', vertical ? 18 : 17, 500, C.muted)}
  `

  
return shell({ width: w, height: h, title: 'Escalera de evidencia operativa', desc: 'ANAM alcanzó configuración y prueba en vista previa, pero no verificación en operación real al corte.', body, background: null })
}

function darkTheme(svg) {
  return svg
    .replaceAll('#171918', '#F7F8FA')
    .replaceAll('#5E625F', '#BEC6CE')
    .replaceAll('#E7EDF9', '#17283C')
    .replaceAll('#FFE1D6', '#3A211E')
    .replaceAll('#6A2418', '#FFC0B2')
    .replaceAll('#A03928', '#FF9A87')
    .replaceAll('#9A9D99', '#8E9297')
    .replaceAll('#111614', '#2A2D2C')
    .replaceAll('fill="#072A4A"', 'fill="#F7F8FA"')
    .replaceAll('data-role="deep-surface" x="80" y="750" width="1040" height="300" rx="26" fill="#F7F8FA"', 'data-role="deep-surface" x="80" y="750" width="1040" height="300" rx="26" fill="#082D50"')
    .replaceAll('data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="#F7F8FA"', 'data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="#082D50"')
    .replaceAll('fill="#FFFFFF" stroke="#8E9297"', 'fill="#1B1A1E" stroke="#8E9297"')
}

const assets = [
  { name: 'anam-ca-hero', svg: hero(), logo: negativeLogo, logoWidth: 190, logoLeft: 1360, logoTop: 1018, master: [2048, 1152] },
  ...['autonomy', 'knowledge', 'evidence'].flatMap(concept => [
    { name: `anam-ca-${concept}-desktop`, svg: ({ autonomy, knowledge, evidence })[concept](false), logo: positiveLogo, logoWidth: 135, logoLeft: 1390, logoTop: 925, master: [1600, 1000], theme: 'light' },
    { name: `anam-ca-${concept}-mobile`, svg: ({ autonomy, knowledge, evidence })[concept](true), logo: positiveLogo, logoWidth: 145, logoLeft: 955, logoTop: 1510, master: [1200, 1600], theme: 'light' },
    { name: `anam-ca-${concept}-desktop-dark`, svg: darkTheme(({ autonomy, knowledge, evidence })[concept](false)), logo: negativeLogo, logoWidth: 135, logoLeft: 1390, logoTop: 925, master: [1600, 1000], theme: 'dark' },
    { name: `anam-ca-${concept}-mobile-dark`, svg: darkTheme(({ autonomy, knowledge, evidence })[concept](true)), logo: negativeLogo, logoWidth: 145, logoLeft: 955, logoTop: 1510, master: [1200, 1600], theme: 'dark' }
  ])
]

const outputs = []

for (const asset of assets) {
  const svgPath = path.join(sourceDir, `${asset.name}-v1.svg`)
  const masterPath = path.join(masterDir, `${asset.name}-master-v1.png`)

  await writeFile(svgPath, asset.svg.replace(/[ \t]+$/gm, ''), 'utf8')
  const logo = await sharp(await readFile(asset.logo)).resize({ width: asset.logoWidth }).png().toBuffer()

  await sharp(Buffer.from(asset.svg), { density: 144 })
    .resize(asset.master[0], asset.master[1], { fit: 'fill' })
    .composite([{ input: logo, left: asset.logoLeft, top: asset.logoTop }])
    .png({ compressionLevel: 9 })
    .toFile(masterPath)
  outputs.push({ asset: asset.name, svg: path.relative(runDir, svgPath), master: path.relative(runDir, masterPath), width: asset.master[0], height: asset.master[1] })
}

await sharp(path.join(masterDir, 'anam-ca-hero-master-v1.png')).resize(1600, 900).webp({ quality: 88, effort: 6 }).toFile(path.join(deliveryDir, 'anam-ca-hero-web-1600-v1.webp'))
await sharp(path.join(masterDir, 'anam-ca-hero-master-v1.png')).resize(1440, 810).extract({ left: 0, top: 26, width: 1440, height: 757 }).jpeg({ quality: 91, mozjpeg: true }).toFile(path.join(deliveryDir, 'anam-ca-hero-og-1440x757-v1.jpg'))
await sharp(path.join(masterDir, 'anam-ca-hero-master-v1.png')).extract({ left: 448, top: 0, width: 1152, height: 1152 }).png().toFile(path.join(reviewDir, 'anam-ca-hero-square-proof-v1.png'))

for (const concept of ['autonomy', 'knowledge', 'evidence']) {
  for (const theme of ['', '-dark']) {
    const desktopName = `anam-ca-${concept}-desktop${theme}`
    const mobileName = `anam-ca-${concept}-mobile${theme}`

    await sharp(path.join(masterDir, `${desktopName}-master-v1.png`)).webp({ quality: 88, effort: 6, alphaQuality: 100 }).toFile(path.join(deliveryDir, `${desktopName}-web-1600-v1.webp`))
    await sharp(path.join(masterDir, `${mobileName}-master-v1.png`)).webp({ quality: 88, effort: 6, alphaQuality: 100 }).toFile(path.join(deliveryDir, `${mobileName}-web-1200-v1.webp`))
    await sharp(path.join(masterDir, `${desktopName}-master-v1.png`)).flatten({ background: theme ? '#111013' : '#FFFFFF' }).png().toFile(path.join(reviewDir, `${desktopName}-proof-v1.png`))
    await sharp(path.join(masterDir, `${mobileName}-master-v1.png`)).flatten({ background: theme ? '#111013' : '#FFFFFF' }).png().toFile(path.join(reviewDir, `${mobileName}-proof-v1.png`))
  }
}

const integrity = []

for (const directory of [sourceDir, masterDir, deliveryDir]) {
  for (const filename of (await readdir(directory)).sort()) {
    const filePath = path.join(directory, filename)
    const buffer = await readFile(filePath)
    const fileStat = await stat(filePath)

    const record = {
      path: path.relative(runDir, filePath),
      bytes: fileStat.size,
      sha256: createHash('sha256').update(buffer).digest('hex')
    }

    if (/\.(png|webp|jpe?g)$/i.test(filename)) {
      const metadata = await sharp(buffer).metadata()

      Object.assign(record, { mime: `image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}`, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha })
    } else if (/\.svg$/i.test(filename)) {
      Object.assign(record, { mime: 'image/svg+xml' })
    }

    integrity.push(record)
  }
}

await writeFile(path.join(runDir, 'build-report.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), outputs, integrity }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ ok: true, outputs }, null, 2))
