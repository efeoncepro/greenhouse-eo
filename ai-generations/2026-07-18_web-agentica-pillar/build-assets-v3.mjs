import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import * as fontkit from 'fontkit'
import { chromium } from 'playwright'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../..')
const sourceDir = path.join(runDir, 'source-v3')
const deliveryDir = path.join(runDir, 'delivery-v3')
const reviewDir = path.join(runDir, 'review-v3')
const socialDir = path.join(runDir, 'social-v3')
for (const directory of [sourceDir, deliveryDir, reviewDir, socialDir]) await mkdir(directory, { recursive: true })

const asset64 = async relative => Buffer.from(await readFile(path.join(root, relative))).toString('base64')
const logos = {
  light: await asset64('public/branding/logo-full.svg'),
  dark: await asset64('public/branding/logo-negative.svg'),
  url: await asset64('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
}

const fonts = {
  400: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-Medium.ttf')),
  500: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-Medium.ttf')),
  600: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-SemiBold.ttf')),
  700: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-Bold.ttf'))
}

const variants = [
  ['desktop', 'light', 1600, 1080], ['desktop', 'dark', 1600, 1080],
  ['mobile', 'light', 1200, 1600], ['mobile', 'dark', 1200, 1600]
]
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const palette = theme => theme === 'dark'
  ? { bg: '#111013', ink: '#F7F7F8', muted: '#B9BAC1', hair: '#45444A', soft: '#232226', navy: '#023C70', blue: '#5AA7DF', orange: '#FF7A2F', magenta: '#E65B8D', purple: '#A98BD0', green: '#8BCB68', gray: '#8B8D96', white: '#FFFFFF' }
  : { bg: '#FFFFFF', ink: '#022A4E', muted: '#505964', hair: '#DBDBDB', soft: '#F5F6F7', navy: '#023C70', blue: '#0375DB', orange: '#F55D01', magenta: '#BB1954', purple: '#633F93', green: '#528F2F', gray: '#7B8490', white: '#FFFFFF' }

let renderMode = 'source'
function text(value, x, y, size, weight, fill, options = {}) {
  const { anchor = 'start', tracking = 0, opacity = 1, rotate = null, data = '' } = options
  if (renderMode === 'source') {
    const transform = rotate == null ? '' : ` transform="rotate(${rotate} ${x} ${y})"`
    return `<text x="${x}" y="${y}" font-family="Poppins" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${tracking}" opacity="${opacity}"${transform}${data}>${esc(value)}</text>`
  }
  const font = fonts[weight] || fonts[600]
  const run = font.layout(String(value))
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
    return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})">${glyph.path.toSVG()}</g>`
  }).join('')
  const rotation = rotate == null ? '' : ` rotate(${rotate})`
  return `<g transform="translate(${x} ${y})${rotation}" fill="${fill}" opacity="${opacity}"${data}>${paths}</g>`
}
const lines = (items, x, y, size, weight, fill, gap = Math.round(size * 1.28), options = {}) => items.map((item, index) => text(item, x, y + index * gap, size, weight, fill, options)).join('')
const rule = (x1, y1, x2, y2, color, width = 2, dash = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
const arrow = (x1, y1, x2, y2, color, width = 4) => `${rule(x1, y1, x2, y2, color, width)}<path d="M${x2} ${y2}l-14 -9v18z" fill="${color}" transform="rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI} ${x2} ${y2})"/>`
const pill = (label, x, y, color, p, width = 148) => `<rect x="${x}" y="${y}" width="${width}" height="34" rx="17" fill="${color}" opacity=".12"/>${text(label, x + width/2, y + 23, 13, 700, color, { anchor: 'middle', tracking: 1 })}`
const node = (x, y, r, color, n, p) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.bg}" stroke="${color}" stroke-width="4"/>${text(n, x, y + 8, 22, 700, color, { anchor: 'middle' })}`

function header(p, viewport, kicker, title, subtitle) {
  const x = viewport === 'desktop' ? 82 : 68
  const titleSize = viewport === 'desktop' ? 49 : title.length > 38 ? 36 : 47
  return `${text(kicker, x, 76, 16, 700, p.orange, { tracking: 2.1 })}
    ${text(title, x, 148, titleSize, 700, p.ink)}
    ${text(subtitle, x, 194, viewport === 'desktop' ? 20 : 19, 400, p.muted)}`
}
function footer(p, viewport, source) {
  const width = viewport === 'desktop' ? 1600 : 1200
  const y = viewport === 'desktop' ? 1028 : 1544
  const x = viewport === 'desktop' ? 82 : 68
  const logoWidth = viewport === 'desktop' ? 112 : 104
  const urlWidth = 172
  const gap = 22
  const urlX = width - x - urlWidth
  const logoX = urlX - gap - logoWidth
  return `<g data-footer="true">${rule(x, y-38, width-x, y-38, p.hair, 2)}${text(source, x, y, 13, 500, p.muted)}
    <image href="data:image/svg+xml;base64,${logos[p.bg === '#FFFFFF' ? 'light' : 'dark']}" x="${logoX}" y="${y-24}" width="${logoWidth}" height="28"/>
    <image href="data:image/svg+xml;base64,${logos.url}" x="${urlX}" y="${y-27}" width="${urlWidth}" height="34" opacity=".8"/></g>`
}
function shell({ viewport, theme, width, height, title, desc, body, source }) {
  const p = palette(theme)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><rect width="${width}" height="${height}" fill="${p.bg}"/>${body(p)}${footer(p, viewport, source)}</svg>`
}

function v02(viewport, theme, width, height) {
  const title = 'De interfaz a contrato operativo'
  const stages = [
    ['01','TRADICIONAL','La persona navega','Pantalla','Contenido + formularios','Validación al enviar'],
    ['02','CON IA','La IA asiste dentro','Contexto local','Chat + personalización','Consentimiento + handoff'],
    ['03','PREPARADO','El agente comprende','Semántica','Datos + tareas explícitas','Entradas + errores'],
    ['04','AGÉNTICO','El agente opera','Autoridad','Capacidad invocable','Permiso + confirmación']
  ]
  return shell({ viewport, theme, width, height, title, desc: 'Cuatro estados muestran cómo disminuye la inferencia y aumentan operabilidad y gobierno.', source: 'Marco editorial Efeonce · julio 2026', body: p => viewport === 'desktop' ? `${header(p,viewport,'WEB AGÉNTICA · FRONTERA OPERATIVA',title,'El salto decisivo no es “más IA”: es una acción explícita, gobernada y demostrable.')}
    <g transform="translate(82 250)">${rule(74,535,1418,535,p.hair,3)}${rule(74,535,74,26,p.hair,3)}${arrow(74,535,1420,535,p.orange,5)}${arrow(74,535,74,25,p.blue,5)}
    ${text('MENOS INFERENCIA · MÁS OPERABILIDAD',760,585,15,700,p.orange,{anchor:'middle',tracking:1.2})}${text('MÁS GOBIERNO',16,280,15,700,p.blue,{anchor:'middle',rotate:-90,tracking:1.2})}
    ${stages.map((s,i)=>{const x=210+i*325,y=420-i*118,c=[p.gray,p.blue,p.purple,p.orange][i];return `<g>${rule(x,y,x,y+115,p.hair,2,'7 7')}${node(x,y,32,c,s[0],p)}${text(s[1],x,y-62,14,700,c,{anchor:'middle',tracking:1})}${text(s[2],x,y+67,22,700,p.ink,{anchor:'middle'})}${text(s[3],x,y+102,14,700,c,{anchor:'middle'})}${text(s[4],x,y+132,15,500,p.muted,{anchor:'middle'})}${text(s[5],x,y+160,14,500,p.muted,{anchor:'middle'})}</g>`}).join('')}
    ${pill('PANTALLA',190,620,p.gray,p,150)}${arrow(348,637,510,637,p.hair,3)}${pill('CONTEXTO',520,620,p.blue,p,155)}${arrow(684,637,840,637,p.hair,3)}${pill('SEMÁNTICA',850,620,p.purple,p,165)}${arrow(1024,637,1180,637,p.hair,3)}${pill('AUTORIDAD',1190,620,p.orange,p,165)}
    ${text('Una web se vuelve agéntica cuando el agente deja de adivinar y puede actuar dentro de límites verificables.',714,700,22,600,p.ink,{anchor:'middle'})}</g>` : `${header(p,viewport,'WEB AGÉNTICA · FRONTERA OPERATIVA',title,'Del clic humano a una acción explícita, gobernada y demostrable.')}
    <g transform="translate(68 252)">${rule(62,28,62,1120,p.hair,3)}${arrow(62,28,62,1130,p.orange,5)}
    ${stages.map((s,i)=>{const y=95+i*270,c=[p.gray,p.blue,p.purple,p.orange][i];return `<g>${node(62,y,32,c,s[0],p)}${text(s[1],120,y-38,14,700,c,{tracking:1})}${text(s[2],120,y,29,700,p.ink)}${text(s[3],120,y+39,15,700,c)}${text(s[4],120,y+73,19,500,p.muted)}${text(s[5],120,y+105,17,500,p.muted)}${rule(120,y+135,1048,y+135,p.hair,2)}</g>`}).join('')}
    ${text('MENOS INFERENCIA',62,1080,15,700,p.orange,{tracking:1})}${text('MÁS OPERABILIDAD + MÁS GOBIERNO',62,1115,15,700,p.blue,{tracking:1})}
    ${lines(['El agente deja de adivinar.','La acción adquiere contrato.'],62,1190,27,600,p.ink,38)}</g>` })
}

function v03(viewport, theme, width, height) {
  const title='Una capacidad, dos formas de operar'
  const lane=(p,x,y,w,label,headline,detail,color)=>`${text(label,x,y,14,700,color,{tracking:1.2})}${text(headline,x,y+43,28,700,p.ink)}${text(detail,x,y+78,17,400,p.muted)}${rule(x,y+102,x+w,y+102,color,4)}`
  return shell({viewport,theme,width,height,title,desc:'Arquitectura compartida para interfaces humanas y agentes.',source:'Arquitectura editorial Efeonce · julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'ARQUITECTURA COMPARTIDA',title,'La interfaz cambia. La capacidad, el gobierno y la fuente de verdad permanecen únicos.')}
    <g transform="translate(82 220)">${lane(p,0,0,640,'PERSONA','Interfaz humana','Páginas · navegación · formularios',p.orange)}${lane(p,796,0,640,'AGENTE','Interfaz estructurada','WebMCP · API · MCP',p.blue)}
    ${arrow(320,120,600,214,p.orange,4)}${arrow(1116,120,836,214,p.blue,4)}
    <path d="M600 214H836L988 350L836 486H600L448 350Z" fill="${p.soft}" stroke="${p.purple}" stroke-width="4"/>
    ${text('CAPACIDAD',718,314,14,700,p.purple,{anchor:'middle',tracking:1.2})}${text('COMPARTIDA',718,359,34,700,p.ink,{anchor:'middle'})}${text('Descubrir · evaluar · preparar',718,400,17,500,p.muted,{anchor:'middle'})}${text('ejecutar · recuperar',718,430,17,500,p.muted,{anchor:'middle'})}
    ${arrow(600,486,360,530,p.purple,4)}${arrow(836,486,1076,530,p.purple,4)}
    ${lane(p,0,540,640,'CONTRATO DE EJECUCIÓN','Predecible en cualquier canal','Entradas · resultados · errores · idempotencia',p.blue)}${lane(p,796,540,640,'GOBIERNO','Autonomía proporcional al riesgo','Identidad · alcance · confirmación · auditoría',p.green)}
    ${rule(0,695,1436,695,p.navy,7)}${text('FUENTE DE VERDAD',0,740,14,700,p.navy,{tracking:1.2})}${text('Datos + reglas + permisos + registro',1436,740,25,700,p.ink,{anchor:'end'})}</g>`:`${header(p,viewport,'ARQUITECTURA COMPARTIDA',title,'La experiencia cambia; la responsabilidad operativa no se duplica.')}
    <g transform="translate(68 258)">${lane(p,0,0,1064,'PERSONA','Interfaz humana','Páginas · navegación · formularios',p.orange)}${arrow(532,120,532,190,p.orange,4)}${lane(p,0,220,1064,'AGENTE','Interfaz estructurada','WebMCP · API · MCP',p.blue)}${arrow(532,340,532,410,p.blue,4)}
    <path d="M240 450H824L1000 610L824 770H240L64 610Z" fill="${p.soft}" stroke="${p.purple}" stroke-width="4"/>${text('CAPACIDAD COMPARTIDA',532,574,16,700,p.purple,{anchor:'middle',tracking:1})}${text('Un trabajo de negocio',532,626,34,700,p.ink,{anchor:'middle'})}${text('Descubrir · evaluar · preparar',532,671,18,500,p.muted,{anchor:'middle'})}${text('ejecutar · recuperar',532,704,18,500,p.muted,{anchor:'middle'})}
    ${arrow(532,770,532,840,p.purple,4)}${lane(p,0,870,1064,'CONTRATO + GOBIERNO','Predecible y proporcional al riesgo','Entradas · errores · identidad · confirmación · auditoría',p.green)}
    ${rule(0,1050,1064,1050,p.navy,7)}${text('FUENTE DE VERDAD',0,1100,14,700,p.navy,{tracking:1.1})}${lines(['Datos + reglas + permisos','+ registro'],0,1150,28,700,p.ink,40)}</g>`})
}

function v05(viewport,theme,width,height){
  const title='El mercado no converge en una sola capa'
  const lanes=[['INTERACCIÓN WEB','WebMCP','Tareas declaradas por la página','Navegador + sitio'],['CONSULTA','NLWeb','Conversación sobre contenido y datos','Sitio + modelos'],['COMERCIO','ACP · UCP','Descubrir, comprar y coordinar','Merchant + plataformas'],['PAGOS','AP2','Mandatos y trazabilidad del pago','Usuario + agente + red'],['AGENTE ↔ AGENTE','A2A','Coordinar agentes entre sistemas','Agentes + empresas'],['GOBERNANZA','AAIF','Hogar neutral para infraestructura','Ecosistema abierto']]
  return shell({viewport,theme,width,height,title,desc:'Mapa de protocolos y proyectos por la capa del sistema que atienden.',source:'Señales públicas del mercado · corte julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'SEÑALES DEL MERCADO · JULIO 2026',title,'Protocolos distintos resuelven fronteras distintas. La arquitectura debe poder combinarlos.')}
    <g transform="translate(82 252)">${rule(225,52,225,680,p.hair,3)}${lanes.map((l,i)=>{const y=30+i*115,c=[p.orange,p.purple,p.blue,p.magenta,p.green,p.gray][i];return `<g>${text(l[0],0,y+10,13,700,c,{tracking:1})}${node(225,y,22,c,String(i+1).padStart(2,'0'),p)}${rule(247,y,320,y,c,3)}${text(l[1],350,y+8,24,700,p.ink)}${text(l[2],590,y+8,18,500,p.ink)}${text(l[3],1370,y+8,16,500,p.muted,{anchor:'end'})}${rule(350,y+42,1370,y+42,p.hair,2)}</g>`}).join('')}
    ${text('No hay un “ganador” único: hay un stack emergente de interoperabilidad.',0,710,24,700,p.ink)}</g>`:`${header(p,viewport,'SEÑALES DEL MERCADO · JULIO 2026',title,'Cada iniciativa ocupa una frontera distinta del sistema.')}
    <g transform="translate(68 250)">${rule(46,40,46,1115,p.hair,3)}${lanes.map((l,i)=>{const y=45+i*183,c=[p.orange,p.purple,p.blue,p.magenta,p.green,p.gray][i];return `<g>${node(46,y,22,c,String(i+1).padStart(2,'0'),p)}${text(l[0],92,y-31,13,700,c,{tracking:1})}${text(l[1],92,y+8,27,700,p.ink)}${text(l[2],92,y+46,18,500,p.ink)}${text(l[3],92,y+80,16,400,p.muted)}${rule(92,y+111,1064,y+111,p.hair,2)}</g>`}).join('')}${lines(['No hay un “ganador” único.','Hay un stack emergente.'],92,1150,28,700,p.ink,42)}</g>`})
}

function v06(viewport,theme,width,height){
  const title='Una capacidad no se valida con un solo test'
  const steps=[['01','TOOL','Contrato','Schema · permisos · errores'],['02','DETERMINISTA','Reglas','Entradas · salidas · idempotencia'],['03','PROBABILÍSTICA','Calidad','Comprensión · selección · groundedness'],['04','END TO END','Resultado','Tarea real · sistema real'],['05','OBSERVACIÓN','Recuperación','Logs · rollback · handoff']]
  return shell({viewport,theme,width,height,title,desc:'Circuito de evaluación para capacidades operadas por agentes.',source:'Modelo de evaluación Efeonce · julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'EVALUACIÓN · DEL CONTRATO AL RESULTADO',title,'La confianza aparece cuando contrato, comportamiento y recuperación se prueban como sistema.')}
    <g transform="translate(82 270)"><path d="M160 330C160 130 360 55 718 55C1076 55 1276 130 1276 330C1276 530 1076 610 718 610C360 610 160 530 160 330Z" fill="none" stroke="${p.hair}" stroke-width="4" stroke-dasharray="10 10"/>
    ${steps.map((s,i)=>{const pos=[[160,330],[390,105],[718,55],[1046,105],[1276,330]][i],c=[p.orange,p.blue,p.purple,p.magenta,p.green][i];return `<g>${node(pos[0],pos[1],42,c,s[0],p)}${text(s[1],pos[0],pos[1]+77,13,700,c,{anchor:'middle',tracking:1})}${text(s[2],pos[0],pos[1]+112,22,700,p.ink,{anchor:'middle'})}${text(s[3],pos[0],pos[1]+142,14,500,p.muted,{anchor:'middle'})}</g>`}).join('')}
    ${arrow(1276,330,1110,555,p.green,4)}${arrow(1110,555,326,555,p.green,4)}${arrow(326,555,160,330,p.green,4)}${text('BUCLE DE EVIDENCIA',718,535,15,700,p.green,{anchor:'middle',tracking:1.2})}
    ${text('Falla temprano en lo determinista. Mide incertidumbre donde realmente existe.',718,680,24,700,p.ink,{anchor:'middle'})}</g>`:`${header(p,viewport,'EVALUACIÓN · DEL CONTRATO AL RESULTADO',title,'Contrato, comportamiento y recuperación se prueban como un sistema.')}
    <g transform="translate(68 260)">${rule(54,40,54,1065,p.hair,4)}${steps.map((s,i)=>{const y=75+i*215,c=[p.orange,p.blue,p.purple,p.magenta,p.green][i];return `<g>${node(54,y,34,c,s[0],p)}${text(s[1],116,y-28,13,700,c,{tracking:1})}${text(s[2],116,y+10,29,700,p.ink)}${text(s[3],116,y+47,18,500,p.muted)}${text(i<4?'EVIDENCIA →':'↺ RECUPERA Y REEVALÚA',116,y+85,14,700,i<4?p.gray:p.green,{tracking:.8})}</g>`}).join('')}
    ${arrow(54,1065,54,75,p.green,4)}${lines(['Falla temprano en lo determinista.','Mide incertidumbre donde existe.'],116,1140,27,700,p.ink,40)}</g>`})
}

function v07(viewport,theme,width,height){
  const title='Madurez agéntica: comprensión y acción'
  const levels=[['01','ENCONTRABLE','El agente llega','SEO · accesibilidad'],['02','LEGIBLE','Extrae significado','HTML · schema · nombres'],['03','CORRECTO','Interpreta sin contradicción','UI · schema · reglas'],['04','INTRÍNSECO','Descubre tareas','Capacidades · errores'],['05','OPERABLE','Ejecuta con autoridad','Permiso · confirmación · registro']]
  return shell({viewport,theme,width,height,title,desc:'Modelo de cinco niveles que separa comprensión de operabilidad.',source:'Modelo de madurez agéntica Efeonce · v1 · julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'MODELO PROPIETARIO · CINCO NIVELES',title,'La percepción progresa en cuatro niveles. La acción es un eje independiente y gobernado.')}
    <g transform="translate(82 258)">${rule(90,600,1370,600,p.hair,4)}${rule(90,600,90,40,p.hair,4)}${arrow(90,600,1380,600,p.orange,5)}${arrow(90,600,90,30,p.blue,5)}${text('COMPRENSIÓN DEL AGENTE',25,310,14,700,p.blue,{anchor:'middle',rotate:-90,tracking:1.1})}${text('CAPACIDAD DE ACCIÓN',730,650,14,700,p.orange,{anchor:'middle',tracking:1.1})}
    ${levels.map((l,i)=>{const x=175+i*265,y=505-i*102,c=[p.gray,p.blue,p.purple,p.magenta,p.orange][i];return `<g>${rule(x,y,x,600,p.hair,2,'7 7')}${node(x,y,35,c,l[0],p)}${text(l[1],x,y-62,13,700,c,{anchor:'middle',tracking:.9})}${text(l[2],x,y+70,18,700,p.ink,{anchor:'middle'})}${text(l[3],x,y+99,14,500,p.muted,{anchor:'middle'})}</g>`}).join('')}
    ${text('OPERABILIDAD ≠ LEGIBILIDAD',1370,650,14,700,p.orange,{anchor:'end',tracking:1})}${text('Exige autoridad + límites + confirmación + evidencia',1370,685,16,600,p.ink,{anchor:'end'})}</g>`:`${header(p,viewport,'MODELO PROPIETARIO · CINCO NIVELES',title,'Comprender mejor no concede automáticamente permiso para actuar.')}
    <g transform="translate(68 250)">${rule(54,40,54,1055,p.hair,4)}${levels.map((l,i)=>{const y=70+i*205,c=[p.gray,p.blue,p.purple,p.magenta,p.orange][i];return `<g>${node(54,y,34,c,l[0],p)}${text(l[1],112,y-31,13,700,c,{tracking:1})}${text(l[2],112,y+8,28,700,p.ink)}${text(l[3],112,y+46,17,500,p.muted)}${pill(i<4?'COMPRENSIÓN':'ACCIÓN GOBERNADA',710,y-18,c,p,i<4?190:260)}</g>`}).join('')}
    ${rule(112,1112,1064,1112,p.orange,5)}${lines(['Ser legible habilita comprensión.','Operar exige autoridad + evidencia.'],112,1180,27,700,p.ink,41)}</g>`})
}

function v08(viewport,theme,width,height){
  const title='Doce pruebas antes de llamarla “agent-ready”'
  const groups=[['SIGNIFICADO',p=>p.orange,['Oferta entendible','Nombres consistentes','UI y schema alineados']],['INTERACCIÓN',p=>p.blue,['Controles accesibles','Tareas delimitadas','Entradas + errores']],['EJECUCIÓN',p=>p.purple,['Capacidad server-side','Vista previa + confirmación','Mínimo privilegio']],['EVIDENCIA',p=>p.green,['Identidad + registro','Recuperación + handoff','Stack de evaluación']]]
  return shell({viewport,theme,width,height,title,desc:'Checklist visual de doce pruebas agrupadas en cuatro dominios.',source:'Checklist Efeonce · julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'READINESS · INSPECCIÓN DE EXTREMO A EXTREMO',title,'La preparación no es un atributo: es una cadena de evidencia que puede romperse en cualquier punto.')}
    <g transform="translate(82 260)">${rule(88,105,1080,105,p.hair,5)}${groups.map((g,i)=>{const x=90+i*330,c=g[1](p);return `<g>${node(x,105,34,c,String(i+1).padStart(2,'0'),p)}${text(g[0],x,42,14,700,c,{anchor:'middle',tracking:1})}${g[2].map((item,j)=>{const y=205+j*142;return `<g>${text(String(i*3+j+1).padStart(2,'0'),x,y,14,700,c,{anchor:'middle'})}${rule(x+28,y-6,x+78,y-6,c,3)}${text(item,x+96,y,16,600,p.ink)}${rule(x+96,y+28,x+300,y+28,p.hair,2)}</g>`}).join('')}</g>`}).join('')}
    ${arrow(90,590,1080,590,p.orange,5)}${text('SIGNIFICADO',90,630,13,700,p.orange)}${text('ACCIÓN DEMOSTRABLE',1080,630,13,700,p.green,{anchor:'end'})}${text('Si una prueba falla, la autonomía debe detenerse o degradarse con seguridad.',715,690,23,700,p.ink,{anchor:'middle'})}</g>`:`${header(p,viewport,'READINESS · 12 PRUEBAS',title,'Una cadena de evidencia: significado, interacción, ejecución y prueba.')}
    <g transform="translate(68 250)">${groups.map((g,i)=>{const y=i*292,c=g[1](p);return `<g>${text(String(i+1).padStart(2,'0'),0,y+24,17,700,c)}${text(g[0],58,y+24,15,700,c,{tracking:1.1})}${rule(0,y+48,1064,y+48,c,4)}${g[2].map((item,j)=>`${text(String(i*3+j+1).padStart(2,'0'),24,y+100+j*58,14,700,c)}${text(item,82,y+100+j*58,20,600,p.ink)}`).join('')}</g>`}).join('')}${arrow(0,1120,1064,1120,p.orange,5)}${lines(['Si una prueba falla, la autonomía','se detiene o degrada con seguridad.'],0,1160,27,700,p.ink,42)}</g>`})
}

function v04(viewport,theme,width,height){
  const title='La autoridad debe viajar con la acción'
  const actors=[['01','PERSONA','Intención','Objetivo · límites · vigencia'],['02','AGENTE','Representación','Identidad · contexto'],['03','CAPACIDAD','Decisión','Alcance · riesgo · confirmación'],['04','REGISTRO','Evidencia','Resultado · revocación · recuperación']]
  return shell({viewport,theme,width,height,title,desc:'Cadena de custodia para acciones delegadas a agentes.',source:'Modelo de confianza operativa Efeonce · julio 2026',body:p=>viewport==='desktop'?`${header(p,viewport,'CONFIANZA · CADENA DE CUSTODIA',title,'Identificar al agente no basta. Hay que probar representación, alcance, confirmación y resultado.')}
    <g transform="translate(82 270)">${arrow(110,230,1320,230,p.blue,5)}${actors.map((a,i)=>{const x=120+i*400,c=[p.orange,p.blue,p.purple,p.green][i];return `<g>${node(x,230,42,c,a[0],p)}${text(a[1],x,145,14,700,c,{anchor:'middle',tracking:1})}${text(a[2],x,310,24,700,p.ink,{anchor:'middle'})}${text(a[3],x,346,15,500,p.muted,{anchor:'middle'})}${rule(x,372,x,455,p.hair,2,'7 7')}</g>`}).join('')}
    ${[['IDENTIDAD','¿Quién actúa?',p.blue],['REPRESENTACIÓN','¿En nombre de quién?',p.purple],['ALCANCE','¿Para qué y por cuánto?',p.orange],['CONFIRMACIÓN','¿Qué aprueba una persona?',p.magenta],['EVIDENCIA','¿Qué ocurrió y cómo vuelve?',p.green]].map((g,i)=>{const x=40+i*280;return `<g>${text(g[0],x,505,13,700,g[2],{tracking:.8})}${text(g[1],x,545,17,600,p.ink)}${rule(x,570,x+245,570,p.hair,2)}</g>`}).join('')}
    ${rule(40,590,1360,590,p.green,6)}${text('ANTES',40,630,13,700,p.muted)}${text('DURANTE',700,630,13,700,p.muted,{anchor:'middle'})}${text('DESPUÉS',1360,630,13,700,p.muted,{anchor:'end'})}${text('La confianza no es una pantalla: es una cadena auditable y recuperable.',700,680,24,700,p.ink,{anchor:'middle'})}</g>`:`${header(p,viewport,'CONFIANZA · CADENA DE CUSTODIA',title,'La acción debe demostrar autoridad antes, durante y después.')}
    <g transform="translate(68 250)">${rule(54,45,54,890,p.hair,4)}${actors.map((a,i)=>{const y=75+i*220,c=[p.orange,p.blue,p.purple,p.green][i];return `<g>${node(54,y,34,c,a[0],p)}${text(a[1],112,y-28,13,700,c,{tracking:1})}${text(a[2],112,y+10,29,700,p.ink)}${text(a[3],112,y+48,18,500,p.muted)}</g>`}).join('')}
    ${rule(0,850,1064,850,p.green,6)}${[['IDENTIDAD','Quién'],['REPRESENTACIÓN','En nombre de quién'],['ALCANCE','Para qué'],['CONFIRMACIÓN','Qué se aprueba'],['EVIDENCIA','Qué ocurrió']].map((g,i)=>`${text(g[0],0,910+i*45,13,700,[p.blue,p.purple,p.orange,p.magenta,p.green][i],{tracking:.6})}${text(g[1],430,910+i*45,18,600,p.ink)}`).join('')}${lines(['Cadena auditable.','Resultado recuperable.'],0,1180,28,700,p.ink,42)}</g>`})
}

const concepts=[
  ['WAG-V02','frontera-operativa',v02],['WAG-V03','arquitectura-compartida',v03],['WAG-V05','mapa-ecosistema',v05],
  ['WAG-V06','circuito-evaluacion',v06],['WAG-V07','madurez-agentica',v07],['WAG-V08','readiness-12-pruebas',v08],['WAG-V04','cadena-autoridad',v04]
]
const outputs=[]
for(const [conceptId,slug,render] of concepts){for(const [viewport,theme,width,height] of variants){
  const stem=`web-agentica-${slug}-${viewport}-${theme}-v7`
  renderMode='source'; const sourceSvg=render(viewport,theme,width,height)
  renderMode='delivery'; const deliverySvg=render(viewport,theme,width,height)
  const source=path.join(sourceDir,`${stem}-source.svg`),delivery=path.join(deliveryDir,`${stem}.svg`)
  await writeFile(source,sourceSvg); await writeFile(delivery,deliverySvg)
  outputs.push({conceptId,slug,viewport,theme,width,height,stem,source,delivery})
}}

const browser=await chromium.launch({headless:true})
try{
  for(const output of outputs){
    const page=await browser.newPage({viewport:{width:output.width,height:output.height},deviceScaleFactor:1})
    await page.goto(pathToFileURL(output.source).href,{waitUntil:'load'}); await page.evaluate(()=>document.fonts.ready)
    const bounds=await page.evaluate(()=>{const svg=document.querySelector('svg').getBoundingClientRect();const footer=document.querySelector('[data-footer]').getBoundingClientRect();return [...document.querySelectorAll('text')].flatMap((el,index)=>{const b=el.getBoundingClientRect();const outside=b.left<svg.left-2||b.top<svg.top-2||b.right>svg.right+2||b.bottom>svg.bottom+2;const collides=!el.closest('[data-footer]')&&b.bottom>footer.top-8;return outside||collides?[{index,text:el.textContent,b:{left:b.left,top:b.top,right:b.right,bottom:b.bottom},footerTop:footer.top}]:[]})})
    if(bounds.length) throw new Error(`Canvas overflow ${output.stem}: ${JSON.stringify(bounds)}`)
    const collisions=await page.evaluate(()=>{const items=[...document.querySelectorAll('text')].map((el,index)=>({index,text:el.textContent.trim(),b:el.getBoundingClientRect()}));const hits=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j],x=Math.min(a.b.right,b.b.right)-Math.max(a.b.left,b.b.left),y=Math.min(a.b.bottom,b.b.bottom)-Math.max(a.b.top,b.b.top);if(x>3&&y>3)hits.push({a:a.text,b:b.text,overlap:{x:Math.round(x),y:Math.round(y)}})}return hits})
    if(collisions.length) throw new Error(`Text collision ${output.stem}: ${JSON.stringify(collisions.slice(0,8))}`)
    const brandOutsideFooter=await page.evaluate(()=>[...document.querySelectorAll('image')].filter(image=>!image.closest('[data-footer]')).length)
    if(brandOutsideFooter) throw new Error(`Brand asset outside footer ${output.stem}`)
    const review=path.join(reviewDir,`${output.stem}.png`); await page.screenshot({path:review,animations:'disabled'}); await page.close()
    output.review=review
    if(output.viewport==='mobile'){
      const social=path.join(socialDir,`${output.stem}-social.png`)
      const socialPage=await browser.newPage({viewport:{width:1080,height:1440},deviceScaleFactor:1})
      const svg64=(await readFile(output.delivery)).toString('base64')
      await socialPage.setContent(`<style>html,body{margin:0;background:${palette(output.theme).bg}}img{display:block;width:1080px;height:1440px;object-fit:cover;object-position:top}</style><img src="data:image/svg+xml;base64,${svg64}">`)
      await socialPage.locator('img').evaluate(img=>img.decode()); await socialPage.screenshot({path:social,animations:'disabled'}); await socialPage.close(); output.social=social
    }
  }
}finally{await browser.close()}

const describe=async file=>{const data=await readFile(file);return{path:path.relative(root,file),bytes:(await stat(file)).size,sha256:createHash('sha256').update(data).digest('hex')}}
const report={version:7,generatedAt:new Date().toISOString(),renderer:'Chromium + fontkit outlined delivery',variants:[]}
for(const o of outputs)report.variants.push({conceptId:o.conceptId,slug:o.slug,viewport:o.viewport,theme:o.theme,width:o.width,height:o.height,source:await describe(o.source),delivery:await describe(o.delivery),review:await describe(o.review),social:o.social?await describe(o.social):null,qa:{canvasOverflow:false,liveTextInDelivery:false,gradients:false,filters:false}})
await writeFile(path.join(runDir,'build-report-v3.json'),`${JSON.stringify(report,null,2)}\n`)
process.stdout.write(`${JSON.stringify({ok:true,concepts:concepts.length,variants:outputs.length,report:'build-report-v3.json'},null,2)}\n`)
