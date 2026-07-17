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

function autonomy(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const desktop = `
    <g filter="url(#softShadow)"><rect x="80" y="330" width="1090" height="120" rx="26" fill="#E7EDF9"/></g>
    ${text(120, 372, 'MENSAJE DEL CLIENTE', 15, 650, C.blue, 'letter-spacing="1.4"')}
    ${text(120, 420, '“Necesito cotizar agua potable y corregir una factura anterior.”', 23, 600, C.deepBlue)}
    <path d="M625 450 L625 492 M625 492 L350 520 M625 492 L900 520" fill="none" stroke="${C.blue}" stroke-width="4" stroke-linecap="round"/>

    <g filter="url(#softShadow)"><rect x="80" y="520" width="520" height="235" rx="26" fill="#E7EDF9" stroke="${C.blue}" stroke-width="2"/></g>
    ${pill(115, 548, 145, 'COTIZACIÓN', C.blue)}
    ${text(115, 630, 'ACLARAR', 29, 650, C.deepBlue)}
    ${multiline(115, 670, ['Pregunta matriz, norma y servicio.', 'No promete precio ni fecha final.'], 17, 450, C.ink, 1.45)}

    <g filter="url(#softShadow)"><rect x="650" y="520" width="520" height="235" rx="26" fill="#FFE1D6" stroke="${C.coral}" stroke-width="2"/></g>
    ${pill(685, 548, 145, 'FACTURA', C.coral)}
    ${text(685, 630, 'PREPARAR', 29, 650, '#6A2418')}
    ${multiline(685, 670, ['Explica lo documentado y reúne referencia.', 'No corrige ni confirma una refacturación.'], 17, 450, '#6A2418', 1.45)}

    <line x1="1205" y1="315" x2="1205" y2="830" stroke="${C.coral}" stroke-width="4" stroke-dasharray="11 10"/>
    ${pill(1120, 300, 170, 'FRONTERA', C.coral)}
    ${arrow(1168, 665, 1245, 665, C.coral)}
    <g filter="url(#softShadow)"><rect x="1245" y="470" width="275" height="360" rx="28" fill="${C.dark}"/></g>
    ${text(1280, 530, 'PERSONA', 16, 650, C.coral, 'letter-spacing="1.4"')}
    ${text(1280, 600, 'Decidir', 36, 650, C.white)}
    ${multiline(1280, 650, ['Revisa la factura,', 'confirma la acción', 'y asume el compromiso.'], 18, 400, C.white, 1.45)}

    <g filter="url(#softShadow)"><rect x="80" y="790" width="1090" height="120" rx="24" fill="#082D50"/></g>
    ${text(120, 832, 'MEMORIA + HANDOFF', 15, 650, '#87C1F2', 'letter-spacing="1.4"')}
    ${pill(120, 852, 170, 'EMPRESA', '#214BD9')}${pill(310, 852, 170, 'SERVICIO', '#214BD9')}${pill(500, 852, 190, 'REFERENCIA', '#214BD9')}${pill(710, 852, 210, 'RESUMEN ÚTIL', C.coral)}${pill(940, 852, 190, 'SIN REINICIAR', '#214BD9')}
  `

  const mobile = `
    <g filter="url(#softShadow)"><rect x="80" y="345" width="1040" height="155" rx="26" fill="#E7EDF9"/></g>
    ${text(125, 395, 'MENSAJE DEL CLIENTE', 16, 650, C.blue, 'letter-spacing="1.4"')}
    ${multiline(125, 445, ['“Necesito cotizar agua potable', 'y corregir una factura anterior.”'], 24, 600, C.deepBlue, 1.35)}
    ${downArrow(600, 510, 555, C.blue)}

    <g filter="url(#softShadow)"><rect x="80" y="575" width="1040" height="245" rx="26" fill="#E7EDF9" stroke="${C.blue}" stroke-width="2"/></g>
    ${pill(125, 610, 160, 'COTIZACIÓN', C.blue)}${text(330, 640, 'ACLARAR', 31, 650, C.deepBlue)}
    ${multiline(125, 710, ['Pregunta matriz, norma y servicio.', 'No promete precio ni fecha final.'], 20, 450, C.ink, 1.45)}

    <g filter="url(#softShadow)"><rect x="80" y="855" width="1040" height="245" rx="26" fill="#FFE1D6" stroke="${C.coral}" stroke-width="2"/></g>
    ${pill(125, 890, 160, 'FACTURA', C.coral)}${text(330, 920, 'PREPARAR', 31, 650, '#6A2418')}
    ${multiline(125, 990, ['Explica lo documentado y reúne referencia.', 'No corrige ni confirma una refacturación.'], 20, 450, '#6A2418', 1.45)}

    <g filter="url(#softShadow)"><rect x="80" y="1135" width="1040" height="150" rx="24" fill="#082D50"/></g>
    ${text(125, 1180, 'MEMORIA + HANDOFF', 16, 650, '#87C1F2', 'letter-spacing="1.4"')}
    ${pill(125, 1210, 175, 'EMPRESA', '#214BD9')}${pill(320, 1210, 175, 'SERVICIO', '#214BD9')}${pill(515, 1210, 190, 'REFERENCIA', '#214BD9')}${pill(725, 1210, 225, 'RESUMEN ÚTIL', C.coral)}

    <line x1="80" y1="1325" x2="1120" y2="1325" stroke="${C.coral}" stroke-width="4" stroke-dasharray="11 10"/>
    ${pill(80, 1304, 170, 'FRONTERA', C.coral)}
    ${downArrow(600, 1340, 1375, C.coral)}
    <g filter="url(#softShadow)"><rect x="80" y="1395" width="1040" height="135" rx="26" fill="${C.dark}"/></g>
    ${text(125, 1445, 'PERSONA DECIDE', 18, 650, C.coral, 'letter-spacing="1.3"')}
    ${text(125, 1492, 'Revisa la factura y asume el compromiso.', 22, 500, C.white)}
  `

  const body = `
    ${pill(80, 70, 260, 'CONVERSACIÓN MIXTA', C.blue)}
    ${multiline(80, 165, vertical ? ['Una conversación puede', 'cambiar de responsable'] : ['Una conversación puede cambiar de responsable'], vertical ? 48 : 51, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'El sistema separa intenciones sin pedirle al cliente que empiece de nuevo.', vertical ? 20 : 21, 400, C.muted)}
    ${vertical ? mobile : desktop}
  `


  return shell({ width: w, height: h, title: 'Anatomía de una conversación mixta', desc: 'Una consulta de cotización y facturación se separa en dos rutas; el agente aclara y prepara, conserva memoria y transfiere la decisión con contexto.', body, background: null })
}

function knowledge(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const sourceCluster = vertical ? `
    <g filter="url(#softShadow)"><rect x="80" y="350" width="1040" height="335" rx="26" fill="#E7EDF9"/></g>
    ${text(125, 410, 'FUENTES EN USO', 16, 650, C.blue, 'letter-spacing="1.5"')}
    ${text(125, 500, '6', 68, 700, C.deepBlue)}${text(215, 480, 'archivos privados', 22, 600, C.deepBlue)}
    ${text(570, 500, '+ 17', 68, 700, C.coral)}${text(755, 480, 'respuestas cortas', 22, 600, '#6A2418')}
    ${multiline(125, 565, ['Empresa · servicios y normas · FAQ', 'Cotización · seguimiento/calidad · catálogo'], 18, 500, C.ink, 1.45)}
    ${text(570, 585, 'Situaciones críticas y formulaciones recurrentes.', 18, 500, '#6A2418')}
    ${text(125, 650, '356 registros viven dentro del catálogo: describen referencias, no disponibilidad.', 17, 500, C.muted)}
  ` : `
    <g filter="url(#softShadow)"><rect x="80" y="345" width="410" height="420" rx="26" fill="#E7EDF9"/></g>
    ${text(120, 405, 'FUENTES EN USO', 16, 650, C.blue, 'letter-spacing="1.5"')}
    ${text(120, 500, '6', 72, 700, C.deepBlue)}${text(215, 480, 'archivos', 23, 600, C.deepBlue)}
    ${multiline(120, 545, ['Empresa · servicios · FAQ', 'Cotización · seguimiento', 'Calidad · catálogo técnico'], 15, 500, C.ink, 1.42)}
    <line x1="120" y1="645" x2="450" y2="645" stroke="#B9C8D8"/>
    ${text(120, 710, '17', 54, 700, C.coral)}${text(225, 698, 'respuestas cortas', 18, 600, '#6A2418')}
    ${text(120, 742, '356 registros ≠ 356 servicios', 14, 500, C.muted)}
  `

  const governance = vertical ? `
    ${downArrow(600, 705, 750, C.blue)}
    <g filter="url(#softShadow)"><rect data-role="deep-surface" x="80" y="770" width="1040" height="310" rx="26" fill="${C.deepBlue}"/></g>
    ${text(125, 815, 'GOBIERNO DEL CONOCIMIENTO', 18, 650, '#87C1F2', 'letter-spacing="1.4"')}
    ${text(125, 895, '¿Para qué decisión sirve?', 24, 650, C.white)}${text(650, 895, '¿Sigue vigente?', 24, 650, C.white)}
    ${text(125, 965, '¿Quién responde por ella?', 24, 650, C.white)}${text(650, 965, '¿Qué ocurre si contradice?', 24, 650, C.white)}
    ${text(125, 1035, 'La fuente se vuelve utilizable sólo cuando supera estos cuatro controles.', 17, 500, '#BBD8F0')}
  ` : `
    ${arrow(505, 555, 585, 555, C.blue)}
    <g filter="url(#softShadow)"><rect data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="${C.deepBlue}"/></g>
    ${text(645, 405, 'GOBIERNO', 16, 650, '#87C1F2', 'letter-spacing="1.5"')}
    ${multiline(645, 480, ['01 · Propósito', '¿Para qué decisión sirve?'], 22, 650, C.white, 1.4)}
    ${multiline(645, 565, ['02 · Vigencia', '¿Sigue siendo válida?'], 22, 650, C.white, 1.4)}
    ${multiline(645, 650, ['03 · Responsable', '¿Quién responde por ella?'], 22, 650, C.white, 1.4)}
    ${text(645, 735, '04 · Resolver contradicciones', 20, 650, C.white)}
  `

  const outcomes = vertical ? `
    ${downArrow(600, 1100, 1140, C.coral)}
    <g filter="url(#softShadow)"><rect x="80" y="1160" width="1040" height="300" rx="26" fill="#FFE1D6"/></g>
    ${text(125, 1215, 'CONTRATO DE RESPUESTA', 18, 650, '#A03928', 'letter-spacing="1.4"')}
    ${pill(125, 1260, 250, 'RESPONDER', C.blue)}${pill(475, 1260, 250, 'PREGUNTAR', C.orange)}${pill(825, 1260, 250, 'TRANSFERIR', C.dark)}
    ${text(125, 1350, 'Documentado', 18, 650, C.deepBlue)}${text(475, 1350, 'Falta contexto', 18, 650, '#6A2418')}${text(825, 1350, 'Cambia la responsabilidad', 18, 650, C.ink)}
    ${text(125, 1410, 'Nunca convertir un registro técnico en disponibilidad o promesa.', 18, 600, '#6A2418')}
  ` : `
    ${arrow(1010, 555, 1090, 555, C.coral)}
    <g filter="url(#softShadow)"><rect x="1110" y="345" width="410" height="420" rx="26" fill="#FFE1D6"/></g>
    ${text(1150, 405, 'CONTRATO DE RESPUESTA', 16, 650, '#A03928', 'letter-spacing="1.3"')}
    ${pill(1150, 460, 250, 'RESPONDER', C.blue)}${text(1150, 525, 'Si está documentado', 15, 500, '#6A2418')}
    ${pill(1150, 555, 250, 'PREGUNTAR', C.orange)}${text(1150, 620, 'Si falta contexto', 15, 500, '#6A2418')}
    ${pill(1150, 650, 250, 'TRANSFERIR', C.dark)}${text(1150, 715, 'Si cambia la responsabilidad', 15, 500, '#6A2418')}
    ${text(1150, 748, 'Un registro no es una promesa.', 14, 650, '#6A2418')}
  `

  const body = `
    ${pill(80, 70, 295, '23 FUENTES · 4 CONTROLES', C.blue)}
    ${multiline(80, 165, vertical ? ['De archivos a un', 'contrato de respuesta'] : ['De archivos a un contrato de respuesta'], vertical ? 50 : 52, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'El volumen no gobierna la respuesta: la gobiernan propósito, vigencia y responsabilidad.', vertical ? 19 : 20, 400, C.muted)}
    ${sourceCluster}${governance}${outcomes}
  `


return shell({ width: w, height: h, title: 'Arquitectura gobernada de las 23 fuentes', desc: 'Seis archivos y diecisiete respuestas cortas pasan por reglas de gobierno antes de orientar, aclarar o transferir una consulta.', body, background: null })
}

function evidence(vertical = false) {
  const w = vertical ? 1200 : 1600, h = vertical ? 1600 : 1000

  const desktop = `
    <path d="M115 365 H1455" stroke="${C.blue}" stroke-width="5" stroke-linecap="round" opacity=".28"/>
    ${[['DOC', 115], ['PORTAL', 415], ['CONFIG', 715], ['PREVIEW', 1015], ['RUNTIME', 1385]].map(([label, x], i) => `<circle cx="${x}" cy="365" r="${i === 3 ? 18 : 13}" fill="${i < 4 ? (i === 3 ? C.coral : C.blue) : '#9A9D99'}"/><text x="${x}" y="410" font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="650" fill="${i < 4 ? C.ink : C.muted}" text-anchor="middle" letter-spacing="1">${label}</text>`).join('')}

    <g filter="url(#softShadow)"><rect x="80" y="455" width="335" height="330" rx="26" fill="#E7EDF9"/></g>
    ${text(115, 510, 'EVIDENCIA DISPONIBLE', 15, 650, C.blue, 'letter-spacing="1.3"')}
    ${multiline(115, 575, ['Documentación oficial', 'Superficie elegible', '23 fuentes + directrices', 'Canal y handoff configurados'], 19, 550, C.deepBlue, 1.7)}

    <g filter="url(#softShadow)"><rect x="445" y="455" width="430" height="330" rx="26" fill="#FFE1D6" stroke="${C.coral}" stroke-width="3"/></g>
    ${text(480, 510, 'EVIDENCIA DE PRUEBA', 15, 650, C.coral, 'letter-spacing="1.3"')}
    ${text(480, 580, '39', 62, 700, '#6A2418')}${text(595, 558, 'escenarios diseñados', 19, 600, '#6A2418')}
    ${text(480, 655, '≥24', 44, 700, '#6A2418')}${text(595, 640, 'escenarios recuperables', 17, 550, '#6A2418')}
    ${text(480, 715, '35', 44, 700, '#6A2418')}${text(570, 700, 'turnos o ejecuciones', 17, 550, '#6A2418')}
    ${pill(480, 735, 230, 'ANAM AL CORTE', C.coral)}

    <g filter="url(#softShadow)"><rect x="905" y="455" width="290" height="330" rx="26" fill="${C.dark}"/></g>
    ${text(940, 510, 'INTERRUPTOR', 15, 650, C.coral, 'letter-spacing="1.3"')}
    <circle cx="1050" cy="610" r="58" fill="none" stroke="${C.coral}" stroke-width="7"/>
    <line x1="1050" y1="535" x2="1050" y2="600" stroke="${C.coral}" stroke-width="10" stroke-linecap="round"/>
    ${multiline(940, 690, ['Dependencia', 'administrativa', 'de facturación'], 18, 600, C.white, 1.35)}

    <path d="M1195 620 H1255" stroke="${C.coral}" stroke-width="5" stroke-dasharray="11 9"/>
    <g filter="url(#softShadow)"><rect x="1255" y="455" width="265" height="330" rx="26" fill="#E7EDF9" stroke="#9A9D99" stroke-width="3" stroke-dasharray="12 10"/></g>
    ${text(1290, 510, 'FALTA DEMOSTRAR', 15, 650, C.muted, 'letter-spacing="1.2"')}
    ${text(1290, 590, 'Operación real', 29, 650, C.muted)}
    ${multiline(1290, 645, ['Conversación nueva', 'Resolución y handoff', 'Medición de resultados'], 17, 500, C.muted, 1.55)}
    ${text(1290, 745, 'NO VERIFICADO', 14, 650, C.muted, 'letter-spacing="1"')}

    ${text(80, 855, 'NO SE PUEDE INFERIR', 15, 650, C.coral, 'letter-spacing="1.4"')}
    ${text(290, 855, 'horario configurado = atención 24/7', 17, 500, C.muted)}
    ${text(700, 855, 'vista previa = operación real', 17, 500, C.muted)}
    ${text(1065, 855, 'acción en borrador = capacidad activa', 17, 500, C.muted)}
  `

  const mobile = `
    <g filter="url(#softShadow)"><rect x="80" y="350" width="1040" height="250" rx="26" fill="#E7EDF9"/></g>
    ${text(125, 405, 'EVIDENCIA DISPONIBLE', 16, 650, C.blue, 'letter-spacing="1.3"')}
    ${multiline(125, 475, ['Documentación + superficie elegible', '23 fuentes, directrices, canal y handoff'], 22, 550, C.deepBlue, 1.5)}
    ${pill(125, 535, 185, 'CONFIGURADO', C.blue)}

    ${downArrow(600, 620, 670, C.blue)}
    <g filter="url(#softShadow)"><rect x="80" y="690" width="1040" height="270" rx="26" fill="#FFE1D6" stroke="${C.coral}" stroke-width="3"/></g>
    ${text(125, 745, 'EVIDENCIA DE PRUEBA', 16, 650, C.coral, 'letter-spacing="1.3"')}
    ${text(125, 835, '39', 62, 700, '#6A2418')}${text(240, 815, 'escenarios diseñados', 20, 600, '#6A2418')}
    ${text(555, 835, '≥24', 52, 700, '#6A2418')}${text(685, 815, 'recuperables', 20, 600, '#6A2418')}
    ${text(125, 910, '35 turnos o ejecuciones · vista previa con limitaciones', 19, 550, '#6A2418')}
    ${pill(810, 890, 245, 'ANAM AL CORTE', C.coral)}

    ${downArrow(600, 980, 1025, C.coral)}
    <g filter="url(#softShadow)"><rect x="80" y="1045" width="1040" height="180" rx="26" fill="${C.dark}"/></g>
    ${text(125, 1100, 'INTERRUPTOR OPERATIVO', 16, 650, C.coral, 'letter-spacing="1.3"')}
    ${text(125, 1165, 'Dependencia administrativa de facturación', 25, 600, C.white)}

    <path d="M600 1225 V1270" stroke="${C.coral}" stroke-width="5" stroke-dasharray="11 9"/>
    <g filter="url(#softShadow)"><rect x="80" y="1290" width="1040" height="220" rx="26" fill="#E7EDF9" stroke="#9A9D99" stroke-width="3" stroke-dasharray="12 10"/></g>
    ${text(125, 1345, 'OPERACIÓN REAL · NO VERIFICADA', 17, 650, C.muted, 'letter-spacing="1.1"')}
    ${multiline(125, 1410, ['Falta observar una conversación nueva,', 'su resolución, handoff y medición.'], 22, 550, C.muted, 1.45)}
  `

  const body = `
    ${pill(80, 70, 270, 'CADENA DE EVIDENCIA', C.blue)}
    ${multiline(80, 165, vertical ? ['Lo que falta probar', 'también es un resultado'] : ['Lo que falta probar también es un resultado'], vertical ? 48 : 51, 650, C.ink, 1.12)}
    ${text(80, vertical ? 300 : 255, 'La configuración y la vista previa no sustituyen una conversación nueva en operación real.', vertical ? 19 : 20, 400, C.muted)}
    ${vertical ? mobile : desktop}
    ${text(80, h - 45, 'Corte: 17 de julio de 2026 · conversaciones nuevas en pausa', vertical ? 17 : 16, 500, C.muted)}
  `


  return shell({ width: w, height: h, title: 'Cadena de evidencia operativa y punto de interrupción', desc: 'ANAM tenía evidencia de configuración y pruebas en vista previa; una dependencia administrativa de facturación interrumpía la verificación de conversaciones nuevas en operación real.', body, background: null })
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
    .replaceAll('data-role="deep-surface" x="80" y="770" width="1040" height="310" rx="26" fill="#F7F8FA"', 'data-role="deep-surface" x="80" y="770" width="1040" height="310" rx="26" fill="#082D50"')
    .replaceAll('data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="#F7F8FA"', 'data-role="deep-surface" x="605" y="345" width="390" height="420" rx="26" fill="#082D50"')
    .replaceAll('fill="#FFFFFF" stroke="#8E9297"', 'fill="#1B1A1E" stroke="#8E9297"')
}

const assets = [
  { name: 'anam-ca-hero', svg: hero(), logo: negativeLogo, logoWidth: 190, logoLeft: 1360, logoTop: 1018, master: [2048, 1152], version: 1 },
  ...['autonomy', 'knowledge', 'evidence'].flatMap(concept => [
    { name: `anam-ca-${concept}-desktop`, svg: ({ autonomy, knowledge, evidence })[concept](false), logo: positiveLogo, logoWidth: 135, logoLeft: 1390, logoTop: 925, master: [1600, 1000], theme: 'light', version: 2 },
    { name: `anam-ca-${concept}-mobile`, svg: ({ autonomy, knowledge, evidence })[concept](true), logo: positiveLogo, logoWidth: 145, logoLeft: 955, logoTop: 1540, master: [1200, 1600], theme: 'light', version: 2 },
    { name: `anam-ca-${concept}-desktop-dark`, svg: darkTheme(({ autonomy, knowledge, evidence })[concept](false)), logo: negativeLogo, logoWidth: 135, logoLeft: 1390, logoTop: 925, master: [1600, 1000], theme: 'dark', version: 2 },
    { name: `anam-ca-${concept}-mobile-dark`, svg: darkTheme(({ autonomy, knowledge, evidence })[concept](true)), logo: negativeLogo, logoWidth: 145, logoLeft: 955, logoTop: 1540, master: [1200, 1600], theme: 'dark', version: 2 }
  ])
]

const outputs = []

for (const asset of assets) {
  const svgPath = path.join(sourceDir, `${asset.name}-v${asset.version}.svg`)
  const masterPath = path.join(masterDir, `${asset.name}-master-v${asset.version}.png`)

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

    await sharp(path.join(masterDir, `${desktopName}-master-v2.png`)).webp({ quality: 88, effort: 6, alphaQuality: 100 }).toFile(path.join(deliveryDir, `${desktopName}-web-1600-v2.webp`))
    await sharp(path.join(masterDir, `${mobileName}-master-v2.png`)).webp({ quality: 88, effort: 6, alphaQuality: 100 }).toFile(path.join(deliveryDir, `${mobileName}-web-1200-v2.webp`))
    const proofBackground = { r: theme ? 17 : 255, g: theme ? 16 : 255, b: theme ? 19 : 255, alpha: 1 }
    const desktopMaster = await readFile(path.join(masterDir, `${desktopName}-master-v2.png`))
    const mobileMaster = await readFile(path.join(masterDir, `${mobileName}-master-v2.png`))

    await sharp({ create: { width: 1600, height: 1000, channels: 4, background: proofBackground } })
      .composite([{ input: desktopMaster }])
      .png()
      .toFile(path.join(reviewDir, `${desktopName}-proof-v2.png`))
    await sharp({ create: { width: 1200, height: 1600, channels: 4, background: proofBackground } })
      .composite([{ input: mobileMaster }])
      .png()
      .toFile(path.join(reviewDir, `${mobileName}-proof-v2.png`))
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

await writeFile(path.join(runDir, 'build-report-v2.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), outputs, integrity }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ ok: true, outputs }, null, 2))
