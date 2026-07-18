import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const sourceDir = path.join(runDir, 'source')
const mastersDir = path.join(runDir, 'masters')
const deliveryDir = path.join(runDir, 'delivery')
const reviewDir = path.join(runDir, 'review')

for (const directory of [sourceDir, mastersDir, deliveryDir, reviewDir]) await mkdir(directory, { recursive: true })

const root = path.resolve(runDir, '../..')
const logoLight = Buffer.from(await readFile(path.join(root, 'public/branding/logo-full.svg'))).toString('base64')
const logoDark = Buffer.from(await readFile(path.join(root, 'public/branding/logo-negative.svg'))).toString('base64')

const variants = [
  ['desktop', 'light', 1600, 1000],
  ['desktop', 'dark', 1600, 1000],
  ['mobile', 'light', 1200, 1600],
  ['mobile', 'dark', 1200, 1600]
]

const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function palette(theme) {
  return theme === 'dark'
    ? { bg: '#111013', panel: '#1c1b1e', panel2: '#252428', text: '#f7f7f8', muted: '#c4c4c8', line: '#55545a', navy: '#0d3557', blue: '#5aa7df', teal: '#21c9bd', green: '#9be766', gold: '#f0cb63', logo: logoDark }
    : { bg: '#ffffff', panel: '#ffffff', panel2: '#f3f5f6', text: '#103447', muted: '#526b75', line: '#c4d2d6', navy: '#023c70', blue: '#2277b7', teal: '#008f87', green: '#528f2f', gold: '#9a7416', logo: logoLight }
}

function header(p, width, kicker, title, subtitle) {
  const logoWidth = width === 1600 ? 188 : 168
  const titleSize = width === 1600 ? 54 : title.length > 34 ? 48 : 58
  const x = width === 1600 ? 86 : 72
  return `
    <text x="${x}" y="92" class="kicker">${escapeXml(kicker)}</text>
    <image href="data:image/svg+xml;base64,${p.logo}" x="${width - x - logoWidth}" y="58" width="${logoWidth}" height="45" preserveAspectRatio="xMidYMid meet"/>
    <text x="${x}" y="170" class="title" font-size="${titleSize}">${escapeXml(title)}</text>
    <text x="${x}" y="220" class="subtitle">${escapeXml(subtitle)}</text>`
}

function shell({ width, height, theme, title, desc, content }) {
  const p = palette(theme)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(desc)}</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#00131d" flood-opacity="${theme === 'dark' ? '.28' : '.12'}"/></filter>
    <marker id="arrow" markerWidth="11" markerHeight="11" refX="9" refY="5.5" orient="auto"><path d="M0 0L10 5.5L0 11Z" fill="${p.teal}"/></marker>
    <style>
      text{font-family:Poppins,Arial,sans-serif}.kicker{font-size:22px;font-weight:700;letter-spacing:3px;fill:${p.teal}}.title{font-weight:760;fill:${p.text}}.subtitle{font-size:23px;fill:${p.muted}}.label{font-size:20px;font-weight:700;letter-spacing:2px}.h{font-size:30px;font-weight:760;fill:${p.text}}.body{font-size:21px;fill:${p.muted}}.small{font-size:18px;fill:${p.muted}}
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="${p.bg}"/>
  ${content(p)}
  </svg>`.replace(/^[ \t]+$/gm, '')
}

function v02(viewport, theme, width, height) {
  const title = 'De una interfaz a un contrato operativo'
  const desc = 'Cuatro etapas aumentan la comprensión para agentes y el gobierno de ejecución, desde un sitio tradicional hasta una web agéntica.'
  return shell({ width, height, theme, title, desc, content: p => viewport === 'desktop' ? `
    ${header(p, width, 'WEB AGÉNTICA · FRONTERA OPERATIVA', title, 'La IA interna no equivale a una web que un agente externo puede operar.')}
    <g transform="translate(86 294)">
      <line x1="78" y1="548" x2="1370" y2="548" stroke="${p.line}" stroke-width="3"/>
      <line x1="78" y1="548" x2="78" y2="38" stroke="${p.line}" stroke-width="3"/>
      <path d="M78 548L1370 548" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      <path d="M78 548V38" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      <text x="92" y="650" class="label" fill="${p.teal}">MÁS OPERABILIDAD EXTERNA →</text>
      <text transform="translate(30 482) rotate(-90)" class="label" fill="${p.teal}">MÁS GOBIERNO →</text>
      ${[
        [120,424,'01','TRADICIONAL','La persona navega','Contenido + formularios',p.line],
        [425,328,'02','CON IA','La IA asiste dentro','Chatbot + personalización',p.blue],
        [730,220,'03','PREPARADO','El agente comprende','Semántica + tareas',p.teal],
        [1035,88,'04','AGÉNTICO',['El agente autorizado','opera'],'Permisos + confirmación',p.green]
      ].map(([x,y,n,k,h,b,c]) => {
        const headline = Array.isArray(h)
          ? `<text x="24" y="94" class="h" style="font-size:22px">${h.map((line, index) => `<tspan x="24" dy="${index === 0 ? 0 : 27}">${line}</tspan>`).join('')}</text>`
          : `<text x="24" y="103" class="h" style="font-size:24px">${h}</text>`
        const detailY = Array.isArray(h) ? 157 : 139

        return `<g transform="translate(${x} ${y})" filter="url(#shadow)"><rect width="310" height="190" rx="24" fill="${p.panel}" stroke="${c}" stroke-width="3"/><circle cx="42" cy="42" r="25" fill="${c}"/><text x="42" y="50" text-anchor="middle" font-size="18" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${n}</text><text x="80" y="46" class="label" fill="${c}">${k}</text>${headline}<text x="24" y="${detailY}" class="small">${b}</text></g>`
      }).join('')}
    </g>` : `
    ${header(p, width, 'WEB AGÉNTICA · FRONTERA OPERATIVA', title, 'La diferencia no es “más IA”, sino qué puede comprender y hacer un agente externo.')}
    <g transform="translate(72 292)">
      <path d="M76 80V1150" stroke="${p.teal}" stroke-width="6" marker-end="url(#arrow)"/>
      ${[
        [0,'01','TRADICIONAL','La persona navega','Contenido y formularios',p.line],
        [280,'02','CON IA','La IA asiste dentro','Chatbot y personalización',p.blue],
        [560,'03','PREPARADO','El agente comprende','Semántica y tareas explícitas',p.teal],
        [840,'04','AGÉNTICO','El agente autorizado opera','Permisos, confirmación y registro',p.green]
      ].map(([y,n,k,h,b,c]) => `<g transform="translate(138 ${y})" filter="url(#shadow)"><rect width="900" height="220" rx="28" fill="${p.panel}" stroke="${c}" stroke-width="4"/><circle cx="62" cy="62" r="34" fill="${c}"/><text x="62" y="72" text-anchor="middle" font-size="25" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${n}</text><text x="120" y="58" class="label" fill="${c}">${k}</text><text x="38" y="132" class="h">${h}</text><text x="38" y="178" class="body">${b}</text></g>`).join('')}
      <text x="0" y="1235" class="label" fill="${p.teal}">MÁS OPERABILIDAD + MÁS GOBIERNO ↓</text>
    </g>` })
}

function v03(viewport, theme, width, height) {
  const title = 'Una base, dos formas de operar'
  const desc = 'La interfaz humana, WebMCP y la API consumen las mismas capacidades, gobierno, datos y reglas de negocio.'
  const layer = (p, x, y, w, h, label, headline, detail, color) => `<g transform="translate(${x} ${y})" filter="url(#shadow)"><rect width="${w}" height="${h}" rx="26" fill="${p.panel}" stroke="${color}" stroke-width="3"/><text x="34" y="43" class="label" fill="${color}">${label}</text><text x="34" y="82" class="h">${headline}</text><text x="34" y="118" class="body">${detail}</text></g>`
  return shell({ width, height, theme, title, desc, content: p => viewport === 'desktop' ? `
    ${header(p, width, 'ARQUITECTURA COMPARTIDA', title, 'La experiencia cambia; el contrato de negocio permanece único.')}
    <g transform="translate(86 255)">
      ${layer(p,0,0,690,160,'PERSONA','Interfaz humana','Páginas · navegación · formularios',p.gold)}
      ${layer(p,738,0,690,160,'AGENTE','Interfaz estructurada','WebMCP · API · automatización',p.teal)}
      <path d="M345 175V205M1083 175V205" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      ${layer(p,0,225,1428,140,'CAPACIDADES COMPARTIDAS','Consultar · comparar · preparar · ejecutar','Entradas, resultados, validaciones, errores e idempotencia definidos una vez.',p.blue)}
      <path d="M714 380V410" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      ${layer(p,0,430,1428,140,'GOBIERNO PROPORCIONAL AL RIESGO','Identidad · permisos · confirmación · registro','Revocación, límites, handoff humano y recuperación antes de ampliar autonomía.',p.green)}
      <path d="M714 585V615" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      <rect x="0" y="635" width="1428" height="90" rx="26" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/>
      <text x="714" y="691" text-anchor="middle" font-size="30" font-weight="760" fill="#fff">DATOS + REGLAS DEL NEGOCIO</text>
    </g>` : `
    ${header(p, width, 'ARQUITECTURA COMPARTIDA', title, 'Personas y agentes llegan por interfaces distintas a una misma base gobernada.')}
    <g transform="translate(72 286)">
      ${layer(p,0,0,1056,190,'PERSONA','Interfaz humana','Páginas · navegación · formularios',p.gold)}
      <path d="M528 205V250" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      ${layer(p,0,270,1056,190,'AGENTE','Interfaz estructurada','WebMCP · API · automatización',p.teal)}
      <path d="M528 475V520" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      ${layer(p,0,540,1056,220,'CAPACIDADES COMPARTIDAS','Consultar · comparar','Preparar · ejecutar · validar · recuperar',p.blue)}
      <path d="M528 775V820" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      ${layer(p,0,840,1056,250,'GOBIERNO','Identidad · permisos','Confirmación · registro · handoff humano',p.green)}
      <path d="M528 1105V1150" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/>
      <rect x="0" y="1170" width="1056" height="116" rx="26" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/>
      <text x="528" y="1243" text-anchor="middle" font-size="30" font-weight="760" fill="#fff">DATOS + REGLAS DEL NEGOCIO</text>
    </g>` })
}

const textLines = (items, x, y, className = 'body', lineHeight = 28, extra = '') => `<text x="${x}" y="${y}" class="${className}" ${extra}>${items.map((item, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(item)}</tspan>`).join('')}</text>`

function v02Rich(viewport, theme, width, height) {
  const title = 'De una interfaz a un contrato operativo'
  const desc = 'Cuatro tipos de sitio comparados por operador, comprensión del agente, capacidad, control y señal de éxito.'
  const stages = p => [
    { n: '01', label: 'TRADICIONAL', title: ['La persona', 'navega'], thesis: 'La interfaz es el producto', color: p.line, rows: [['OPERADOR','Persona'],['EL AGENTE','Interpreta la pantalla'],['CAPACIDAD','Contenido + formularios'],['CONTROL','Validación al enviar'],['SEÑAL','Sesión + conversión']] },
    { n: '02', label: 'CON IA', title: ['La IA asiste', 'dentro'], thesis: 'La ayuda vive en el sitio', color: p.blue, rows: [['OPERADOR','Persona + asistente'],['EL AGENTE','Responde con contexto local'],['CAPACIDAD','Chat + personalización'],['CONTROL','Handoff + consentimiento'],['SEÑAL','Resolución + derivación']] },
    { n: '03', label: 'PREPARADO', title: ['El agente', 'comprende'], thesis: 'La tarea deja de ser ambigua', color: p.teal, rows: [['OPERADOR','Persona o agente externo'],['EL AGENTE','Descubre datos y tareas'],['CAPACIDAD','Semántica + accesibilidad'],['CONTROL','Entradas + errores explícitos'],['SEÑAL','Descubrimiento + éxito']] },
    { n: '04', label: 'AGÉNTICO', title: ['El agente', 'opera'], thesis: 'La acción tiene contrato', color: p.green, rows: [['OPERADOR','Agente autorizado'],['EL AGENTE','Invoca una capacidad'],['CAPACIDAD','WebMCP · API · MCP'],['CONTROL','Permiso + confirmación'],['SEÑAL','Tarea + auditoría']] }
  ]

  return shell({ width, height, theme, title, desc, content: p => viewport === 'desktop' ? `
    ${header(p, width, 'WEB AGÉNTICA · FRONTERA OPERATIVA', title, 'La diferencia no es cuánta IA existe, sino cuánto debe inferir un agente para avanzar.')}
    <g transform="translate(86 266)">
      ${stages(p).map((stage, index) => `<g data-containment="stage" transform="translate(${index * 360} 0)">
        <rect width="336" height="566" rx="22" fill="${stage.n === '04' ? p.panel2 : p.panel}" stroke="${stage.color}" stroke-width="${stage.n === '04' ? 3 : 2}"/>
        <rect width="336" height="8" rx="4" fill="${stage.color}"/>
        <circle cx="42" cy="48" r="23" fill="${stage.color}"/><text x="42" y="55" text-anchor="middle" font-size="17" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${stage.n}</text>
        <text x="78" y="44" font-size="18" font-weight="760" letter-spacing="1.6" fill="${stage.color}">${stage.label}</text>
        ${textLines(stage.title, 26, 102, 'h', 31)}
        <text x="26" y="174" font-size="16" fill="${p.muted}">${stage.thesis}</text><line x1="26" y1="198" x2="310" y2="198" stroke="${p.line}"/>
        ${stage.rows.map(([label,value], row) => `<text x="26" y="${224 + row * 66}" font-size="14" font-weight="760" letter-spacing="1.2" fill="${stage.color}">${label}</text><text x="26" y="${249 + row * 66}" font-size="16" fill="${p.text}">${value}</text>${row < 4 ? `<line x1="26" y1="${276 + row * 66}" x2="310" y2="${276 + row * 66}" stroke="${p.line}" opacity=".65"/>` : ''}`).join('')}
      </g>`).join('')}
      <path d="M40 615H1392" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/><text x="0" y="660" class="label" fill="${p.teal}">MENOS INFERENCIA · MÁS OPERABILIDAD · MÁS GOBIERNO</text>
      <text x="1428" y="706" text-anchor="end" font-size="23" font-weight="760" fill="${p.text}">La acción deja de ser un clic y se vuelve un contrato.</text>
    </g>` : `
    ${header(p, width, 'WEB AGÉNTICA · FRONTERA OPERATIVA', title, 'La diferencia no es “más IA”, sino cuánto debe inferir un agente para avanzar.')}
    <g transform="translate(72 276)">
      ${stages(p).map((stage, index) => `<g data-containment="stage-mobile" transform="translate(0 ${index * 270})">
        <rect width="1056" height="238" rx="24" fill="${stage.n === '04' ? p.panel2 : p.panel}" stroke="${stage.color}" stroke-width="3"/><rect width="8" height="238" rx="4" fill="${stage.color}"/>
        <circle cx="52" cy="48" r="23" fill="${stage.color}"/><text x="52" y="55" text-anchor="middle" font-size="17" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${stage.n}</text><text x="88" y="44" font-size="18" font-weight="760" letter-spacing="1.6" fill="${stage.color}">${stage.label}</text>
        <text x="32" y="93" class="h" style="font-size:27px">${stage.title.join(' ')}</text><text x="1024" y="93" text-anchor="end" font-size="16" fill="${p.muted}">${stage.thesis}</text><line x1="32" y1="116" x2="1024" y2="116" stroke="${p.line}"/>
        <text x="32" y="145" font-size="14" font-weight="760" letter-spacing="1.2" fill="${stage.color}">EL AGENTE</text><text x="32" y="174" font-size="17" fill="${p.text}">${stage.rows[1][1]}</text><text x="550" y="145" font-size="14" font-weight="760" letter-spacing="1.2" fill="${stage.color}">CAPACIDAD</text><text x="550" y="174" font-size="17" fill="${p.text}">${stage.rows[2][1]}</text>
        <text x="32" y="213" font-size="15" font-weight="650" fill="${p.text}">Control: ${stage.rows[3][1]} · Señal: ${stage.rows[4][1]}</text>
      </g>`).join('')}
      <path d="M0 1102H1018" stroke="${p.teal}" stroke-width="5" marker-end="url(#arrow)"/><text x="0" y="1148" class="label" fill="${p.teal}">MENOS INFERENCIA · MÁS GOBIERNO →</text><text x="0" y="1195" font-size="25" font-weight="760" fill="${p.text}">La acción deja de ser un clic y se vuelve un contrato.</text>
    </g>` })
}

function v03Rich(viewport, theme, width, height) {
  const title = 'Una base, dos formas de operar'
  const desc = 'Personas y agentes consumen una capacidad compartida bajo un contrato, gobierno, datos y reglas comunes.'
  const box = (p, { x = 0, y = 0, w, h, label, headline, details, color, fill = p.panel }) => `<g data-containment="architecture" transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${color}" stroke-width="3"/><text x="28" y="38" font-size="16" font-weight="760" letter-spacing="1.4" fill="${color}">${label}</text><text x="28" y="78" class="h">${headline}</text>${details.map((detail,index) => `<text x="28" y="${116 + index * 32}" font-size="${viewport === 'desktop' ? 18 : 19}" fill="${p.muted}">${detail}</text>`).join('')}</g>`

  return shell({ width, height, theme, title, desc, content: p => viewport === 'desktop' ? `
    ${header(p, width, 'ARQUITECTURA COMPARTIDA', title, 'La experiencia cambia; la capacidad y sus controles no se duplican.')}
    <g transform="translate(86 236)">
      ${box(p,{w:690,h:132,label:'PERSONA',headline:'Interfaz humana',details:['Páginas · navegación · formularios'],color:p.gold})}${box(p,{x:738,w:690,h:132,label:'AGENTE',headline:'Interfaz estructurada',details:['WebMCP · API · MCP'],color:p.teal})}
      <path d="M345 144V176M1083 144V176" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      <g data-containment="architecture" transform="translate(0 192)"><rect width="1428" height="130" rx="22" fill="${p.panel}" stroke="${p.blue}" stroke-width="3"/><text x="28" y="38" font-size="16" font-weight="760" letter-spacing="1.4" fill="${p.blue}">CAPACIDAD COMPARTIDA</text><text x="28" y="78" class="h">Un trabajo de negocio, cinco momentos</text><text x="28" y="112" font-size="18" fill="${p.muted}">Descubrir · evaluar · preparar · ejecutar · recuperar</text><text x="1400" y="112" text-anchor="end" font-size="17" fill="${p.muted}">Una sola lógica; varias interfaces.</text></g>
      <path d="M714 336V366" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      ${box(p,{y:382,w:690,h:170,label:'CONTRATO DE EJECUCIÓN',headline:'Predecible en cualquier canal',details:['Entradas · resultados · validaciones','Errores · idempotencia · observabilidad'],color:p.blue})}
      ${box(p,{x:738,y:382,w:690,h:170,label:'GOBIERNO PROPORCIONAL AL RIESGO',headline:'La autonomía se gana con evidencia',details:['Identidad · alcance · vista previa · confirmación','Auditoría · revocación · handoff · recuperación'],color:p.green,fill:p.panel2})}
      <path d="M345 566V594M1083 566V594" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      <g data-containment="architecture" transform="translate(0 610)"><rect width="1428" height="88" rx="22" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/><text x="28" y="34" font-size="15" font-weight="760" letter-spacing="1.4" fill="${p.teal}">FUENTE DE VERDAD</text><text x="28" y="67" font-size="24" font-weight="760" fill="#fff">DATOS + REGLAS + PERMISOS + REGISTRO</text><text x="1400" y="57" text-anchor="end" font-size="18" fill="#fff">WebMCP es una interfaz. No el sistema completo.</text></g>
      <text x="0" y="748" font-size="24" font-weight="760" fill="${p.text}">Una capacidad. Varias interfaces. Una sola responsabilidad operativa.</text>
    </g>` : `
    ${header(p, width, 'ARQUITECTURA COMPARTIDA', title, 'Personas y agentes llegan por interfaces distintas a una misma base gobernada.')}
    <g transform="translate(72 240)">
      ${box(p,{w:1056,h:160,label:'PERSONA',headline:'Interfaz humana',details:['Páginas · navegación · formularios'],color:p.gold})}${box(p,{y:184,w:1056,h:160,label:'AGENTE',headline:'Interfaz estructurada',details:['WebMCP · API · MCP'],color:p.teal})}
      <path d="M528 358V394" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      ${box(p,{y:410,w:1056,h:200,label:'CAPACIDAD COMPARTIDA',headline:'Un trabajo de negocio',details:['Descubrir · evaluar · preparar','Ejecutar · recuperar'],color:p.blue})}
      <path d="M528 624V660" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      ${box(p,{y:676,w:1056,h:194,label:'CONTRATO DE EJECUCIÓN',headline:'Predecible en cualquier canal',details:['Entradas · resultados · validaciones · errores','Idempotencia · observabilidad'],color:p.blue})}
      ${box(p,{y:894,w:1056,h:230,label:'GOBIERNO PROPORCIONAL AL RIESGO',headline:'La autonomía se gana con evidencia',details:['Identidad · alcance · vista previa · confirmación','Auditoría · revocación · handoff · recuperación'],color:p.green,fill:p.panel2})}
      <path d="M528 1138V1174" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>
      <g data-containment="architecture" transform="translate(0 1190)"><rect width="1056" height="118" rx="22" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/><text x="28" y="38" font-size="16" font-weight="760" letter-spacing="1.4" fill="${p.teal}">FUENTE DE VERDAD</text><text x="28" y="82" font-size="27" font-weight="760" fill="#fff">DATOS + REGLAS + PERMISOS + REGISTRO</text></g>
      <text x="0" y="1342" font-size="24" font-weight="760" fill="${p.text}">Una capacidad. Varias interfaces. Una responsabilidad.</text>
    </g>` })
}

function v04Authority(viewport, theme, width, height) {
  const title = 'Cadena de autoridad para agentes'
  const desc = 'Una persona delega una intención a un agente u operador; la capacidad del sitio valida identidad, alcance y confirmación antes de registrar un resultado auditable y recuperable.'
  const steps = p => [
    { n: '01', label: 'PERSONA', headline: 'Define la intención', details: ['Objetivo · límites · vigencia'], color: p.gold },
    { n: '02', label: 'AGENTE / OPERADOR', headline: 'Presenta identidad', details: ['Representación · contexto'], color: p.teal },
    { n: '03', label: 'CAPACIDAD DEL SITIO', headline: 'Valida autoridad', details: ['Alcance · riesgo · confirmación'], color: p.blue },
    { n: '04', label: 'SISTEMA DE REGISTRO', headline: 'Demuestra el resultado', details: ['Registro · revocar · recuperar'], color: p.green }
  ]
  const gates = p => [
    { label: 'IDENTIDAD', question: ['¿Quién', 'actúa?'], detail: 'Agente + operador', color: p.teal },
    { label: 'ALCANCE DELEGADO', question: ['¿En nombre de', 'quién y para qué?'], detail: 'Propósito + vigencia', color: p.blue },
    { label: 'CONFIRMACIÓN', question: ['¿Qué debe aprobar', 'una persona?'], detail: 'Control proporcional', color: p.gold },
    { label: 'EVIDENCIA', question: ['¿Qué ocurrió y', 'cómo se recupera?'], detail: 'Registro + reversión', color: p.green }
  ]

  return shell({ width, height, theme, title, desc, content: p => viewport === 'desktop' ? `
    ${header(p, width, 'CONFIANZA OPERATIVA', title, 'Identidad no equivale a permiso delegado. La acción debe probar toda la cadena.')}
    <g transform="translate(86 258)">
      ${steps(p).map((step, index) => `<g data-containment="authority-step" transform="translate(${index * 360} 0)"><rect width="330" height="210" rx="22" fill="${p.panel}" stroke="${step.color}" stroke-width="3"/><rect width="330" height="8" rx="4" fill="${step.color}"/><circle cx="42" cy="48" r="23" fill="${step.color}"/><text x="42" y="55" text-anchor="middle" font-size="17" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${step.n}</text><text x="78" y="44" font-size="16" font-weight="760" letter-spacing="1.25" fill="${step.color}">${step.label}</text><text x="26" y="108" class="h" style="font-size:25px">${step.headline}</text><text x="26" y="150" font-size="17" fill="${p.muted}">${step.details[0]}</text><text x="26" y="184" font-size="15" font-weight="650" fill="${step.color}">${index < 3 ? 'VERIFICA ANTES DE AVANZAR' : 'CIERRA EL CICLO'}</text></g>${index < 3 ? `<path d="M${330 + index * 360} 105H${360 + index * 360}" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>` : ''}`).join('')}
      <text x="0" y="270" class="label" fill="${p.teal}">CUATRO GATES QUE LA ACCIÓN DEBE SUPERAR</text>
      ${gates(p).map((gate, index) => `<g data-containment="authority-gate" transform="translate(${index * 360} 302)"><rect width="330" height="225" rx="22" fill="${index % 2 ? p.panel2 : p.panel}" stroke="${p.line}" stroke-width="2"/><text x="24" y="39" font-size="15" font-weight="760" letter-spacing="1.15" fill="${gate.color}">${gate.label}</text>${textLines(gate.question,24,89,'h',30,'style="font-size:24px"')}<line x1="24" y1="156" x2="306" y2="156" stroke="${p.line}"/><text x="24" y="193" font-size="17" fill="${p.muted}">${gate.detail}</text></g>`).join('')}
      <rect x="0" y="563" width="1410" height="92" rx="22" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/><text x="705" y="620" text-anchor="middle" font-size="25" font-weight="760" fill="#fff">Identificar al agente no basta: hay que probar autoridad, límite y resultado.</text>
    </g>` : `
    ${header(p, width, 'CONFIANZA OPERATIVA', title, 'Identidad no equivale a permiso delegado.')}
    <g transform="translate(72 258)">
      ${steps(p).map((step, index) => {
        const gate = gates(p)[index]
        return `<g data-containment="authority-mobile" transform="translate(0 ${index * 274})"><rect width="1056" height="238" rx="24" fill="${index % 2 ? p.panel2 : p.panel}" stroke="${step.color}" stroke-width="3"/><rect width="8" height="238" rx="4" fill="${step.color}"/><circle cx="52" cy="50" r="23" fill="${step.color}"/><text x="52" y="57" text-anchor="middle" font-size="17" font-weight="800" fill="${theme === 'dark' ? p.bg : '#fff'}">${step.n}</text><text x="90" y="45" font-size="17" font-weight="760" letter-spacing="1.2" fill="${step.color}">${step.label}</text><text x="32" y="105" class="h" style="font-size:29px">${step.headline}</text><text x="32" y="146" font-size="19" fill="${p.muted}">${step.details[0]}</text><line x1="32" y1="170" x2="1024" y2="170" stroke="${p.line}"/><text x="32" y="205" font-size="15" font-weight="760" letter-spacing="1.1" fill="${gate.color}">${gate.label}</text><text x="310" y="205" font-size="19" font-weight="650" fill="${p.text}">${gate.question.join(' ')}</text></g>${index < 3 ? `<path d="M528 ${238 + index * 274}V${270 + index * 274}" stroke="${p.teal}" stroke-width="4" marker-end="url(#arrow)"/>` : ''}`
      }).join('')}
      <rect x="0" y="1118" width="1056" height="112" rx="22" fill="${p.navy}" stroke="${p.teal}" stroke-width="3"/><text x="528" y="1163" text-anchor="middle" font-size="23" font-weight="760" fill="#fff">Identidad + alcance + confirmación + evidencia</text><text x="528" y="1200" text-anchor="middle" font-size="20" fill="#fff">La autoridad se demuestra antes, durante y después de la acción.</text>
    </g>` })
}

const concepts = [
  { id: 'v02-frontera-operativa', render: v02Rich },
  { id: 'v03-arquitectura-compartida', render: v03Rich },
  { id: 'v04-cadena-autoridad', render: v04Authority }
]

const outputs = []
for (const concept of concepts) {
  for (const [viewport, theme, width, height] of variants) {
    const stem = `web-agentica-${concept.id}-${viewport}-${theme}-v2`
    const source = path.join(sourceDir, `${stem}.svg`)
    await writeFile(source, concept.render(viewport, theme, width, height))
    outputs.push({ conceptId: concept.id, viewport, theme, width, height, stem, source })
  }
}

const browser = await chromium.launch({ headless: true })
try {
  for (const output of outputs) {
    const page = await browser.newPage({ viewport: { width: output.width, height: output.height }, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(output.source).href, { waitUntil: 'load' })
    await page.evaluate(async () => {
      await document.fonts.ready
      const images = [...document.images]
      await Promise.all(images.map(image => image.decode()))
      if (images.some(image => !image.complete || image.naturalWidth === 0)) throw new Error('Broken embedded brand asset')
    })
    const textOverflow = await page.evaluate(() => [...document.querySelectorAll('g[data-containment]')].flatMap((group, groupIndex) => {
      const rect = group.querySelector(':scope > rect')
      if (!rect) return []

      const bounds = {
        left: Number(rect.getAttribute('x') ?? 0),
        top: Number(rect.getAttribute('y') ?? 0),
        right: Number(rect.getAttribute('x') ?? 0) + Number(rect.getAttribute('width') ?? 0),
        bottom: Number(rect.getAttribute('y') ?? 0) + Number(rect.getAttribute('height') ?? 0)
      }

      return [...group.querySelectorAll(':scope > text')].flatMap((node, textIndex) => {
        const box = node.getBBox()
        const tolerance = 2
        const contained = box.x >= bounds.left - tolerance
          && box.y >= bounds.top - tolerance
          && box.x + box.width <= bounds.right + tolerance
          && box.y + box.height <= bounds.bottom + tolerance

        return contained ? [] : [{ groupIndex, textIndex, text: node.textContent?.trim(), box, bounds }]
      })
    }))
    if (textOverflow.length) throw new Error(`Text overflow detected: ${JSON.stringify(textOverflow)}`)
    const master = path.join(mastersDir, `${output.stem.replace('-v2', '-master-v2')}.png`)
    await page.screenshot({ path: master, fullPage: false, animations: 'disabled' })
    await page.close()
    const web = path.join(deliveryDir, `${output.stem.replace('-v2', '-web-v2')}.webp`)
    execFileSync('cwebp', ['-quiet', '-q', '90', '-m', '6', master, '-o', web])
    output.master = master
    output.web = web
  }

  for (const output of outputs) {
    const displayWidth = output.viewport === 'desktop' ? 1112 : 358
    const displayHeight = Math.round(displayWidth * output.height / output.width)
    const page = await browser.newPage({ viewport: { width: output.viewport === 'desktop' ? 1280 : 390, height: displayHeight + 180 }, deviceScaleFactor: 1 })
    const background = output.theme === 'dark' ? '#111013' : '#ffffff'
    const webData = (await readFile(output.web)).toString('base64')
    await page.setContent(`<style>html,body{margin:0;background:${background}}main{width:${displayWidth}px;margin:70px auto 0}img{display:block;width:100%;height:auto}</style><main><img src="data:image/webp;base64,${webData}"></main>`)
    await page.locator('img').evaluate(image => image.decode())
    const proof = path.join(reviewDir, `${output.stem.replace('-v2', '-context-proof-v2')}.png`)
    await page.screenshot({ path: proof, fullPage: true, animations: 'disabled' })
    output.proof = proof
    output.displayWidth = displayWidth
    output.displayHeight = displayHeight
    await page.close()
  }
} finally {
  await browser.close()
}

const describe = async file => {
  const buffer = await readFile(file)
  return { path: path.relative(root, file), sha256: createHash('sha256').update(buffer).digest('hex'), bytes: (await stat(file)).size }
}

const report = { renderer: `Chromium ${await chromium.executablePath()}`, generatedAt: new Date().toISOString(), variants: [] }
for (const output of outputs) report.variants.push({ conceptId: output.conceptId, viewport: output.viewport, theme: output.theme, width: output.width, height: output.height, measuredArticleWidth: output.displayWidth, projectedRenderHeight: output.displayHeight, source: await describe(output.source), master: await describe(output.master), web: await describe(output.web), contextualProof: await describe(output.proof) })
await writeFile(path.join(runDir, 'build-report-v2.json'), `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ ok: true, variants: outputs.length, report: path.join(runDir, 'build-report-v2.json') }, null, 2)}\n`)
