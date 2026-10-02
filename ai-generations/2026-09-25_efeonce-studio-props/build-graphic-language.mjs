import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, '../..')
const logoData = (await readFile(join(root, 'public/branding/logo-full.svg'))).toString('base64')
const logo = (x, y, w, h) => `<image href="data:image/svg+xml;base64,${logoData}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`
const C = { navy: '#023C70', blue: '#0375DB', orange: '#F55D01', paper: '#F5F3EE', white: '#FFFFFF', ink: '#173044', muted: '#667987', line: '#D9E1E2' }
const t = (x,y,size,txt,color=C.ink,weight=500,extra='') => `<text x="${x}" y="${y}" fill="${color}" font-family="Poppins,Arial,sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${txt}</text>`
const rect = (x,y,w,h,r,fill,stroke='none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`
const base = (title,subtitle,body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs><clipPath id="a"><rect x="60" y="390" width="455" height="330"/></clipPath><clipPath id="b"><rect x="572" y="390" width="455" height="330"/></clipPath><clipPath id="c"><rect x="1084" y="390" width="455" height="330"/></clipPath></defs>
${rect(0,0,1600,1000,0,C.paper)}${rect(0,0,1600,172,0,C.navy)}
${t(60,65,17,'EFEONCE  /  EXPLORACIÓN DE LENGUAJE', '#A7CBE4',600,'letter-spacing="3"')}
${t(60,130,48,title,C.white,700)}
${t(60,210,18,subtitle,C.muted,400)}
${body}
${t(60,965,13,'Estudio gráfico 01 · propuesta, no identidad aprobada',C.muted,400)}
${t(1538,965,13,'25 SEP 2026',C.navy,600,'text-anchor="end"')}
</svg>`

const panel = (x,n,title,subtitle,art,notes) => `
${rect(x,244,455,590,22,C.white)}
${t(x+28,296,15,n,C.blue,700,'letter-spacing="2"')}
${t(x+28,337,28,title,C.navy,700)}
${t(x+28,365,15,subtitle,C.muted,400)}
${art}
<path d="M${x+28} 742 H${x+427}" stroke="${C.line}" stroke-width="1"/>
${t(x+28,782,16,notes[0],C.ink,500)}
${t(x+28,808,16,notes[1],C.ink,500)}
`

const exploration = base('Del círculo al sistema', 'Tres rutas de composición; ninguna copia ni despega fragmentos del isotipo sobre los objetos.', `
${panel(60,'01 / A','Trayectoria abierta','El recorrido estructura la composición.',`<g clip-path="url(#a)">
<path d="M-18 670 C90 472 220 410 343 432 C484 457 493 594 407 680" fill="none" stroke="${C.navy}" stroke-width="29" stroke-linecap="round"/>
<path d="M429 409 C482 443 514 495 537 552" fill="none" stroke="${C.blue}" stroke-width="29" stroke-linecap="round"/>
<rect x="144" y="498" width="180" height="125" rx="15" fill="#EEF3F2"/>
<path d="M164 546 H300 M164 574 H260" stroke="#B8C9CB" stroke-width="12" stroke-linecap="round"/>
</g>`,['La curva rodea una obra o decisión;','el vacío permite que el trabajo respire.'])}
${panel(572,'02 / B','Punto de encuentro','Dos recorridos crean un foco común.',`<g clip-path="url(#b)">
<circle cx="736" cy="559" r="152" fill="none" stroke="${C.navy}" stroke-width="25"/>
<circle cx="884" cy="559" r="152" fill="none" stroke="${C.blue}" stroke-width="25"/>
<path d="M810 492 L810 624" stroke="#88BFE2" stroke-width="12" stroke-linecap="round"/>
<circle cx="810" cy="559" r="22" fill="${C.white}" stroke="#88BFE2" stroke-width="8"/>
</g>`,['La intersección marca una elección;','el foco pertenece al contenido.'])}
${panel(1084,'03 / C','Ritmo de retorno','Variaciones con una misma dirección.',`<g clip-path="url(#c)">
<path d="M1045 712 A345 345 0 0 1 1516 350" fill="none" stroke="${C.navy}" stroke-width="22"/>
<path d="M1093 716 A270 270 0 0 1 1490 416" fill="none" stroke="${C.blue}" stroke-width="22"/>
<path d="M1140 719 A200 200 0 0 1 1466 483" fill="none" stroke="#A8C6D9" stroke-width="22"/>
<rect x="1294" y="522" width="128" height="105" rx="14" fill="#F0F3F0"/>
</g>`,['La repetición expresa ciclos que suman;','se usa con baja frecuencia.'])}
${rect(60,866,1479,53,12,'#E7EFF2')}
${t(84,899,16,'Lectura: A merece desarrollo; B y C revelan riesgos de verse como Venn o radar si se usan literalmente.',C.navy,600)}
`)

const presence = base('Presencia de marca con criterio', 'El sistema gráfico puede acompañar al logo, aparecer solo o dejar la superficie tranquila.', `
${rect(60,244,1479,202,22,C.white)}
${rect(60,470,1479,202,22,C.white)}
${rect(60,696,1479,202,22,C.white)}
${t(93,292,17,'01  IDENTIDAD ANCLADA',C.blue,700,'letter-spacing="1.5"')}
${t(93,326,26,'Logo + gesto de contexto',C.navy,700)}
${t(93,358,16,'Recepción, pizarra principal, pieza institucional.',C.muted,400)}
${logo(671,313,286,70)}
${rect(1037,274,448,144,18,C.navy)}
<circle cx="1146" cy="346" r="60" fill="${C.white}"/>
${rect(1094,333,103,11,5,'#BDD0D5')}
${rect(1111,357,68,11,5,'#BDD0D5')}
${rect(1234,319,170,12,6,'#84B8DD')}
${rect(1234,347,139,12,6,'#84B8DD')}
${rect(1234,375,91,12,6,'#84B8DD')}
${t(93,519,17,'02  LENGUAJE SIN LOGO',C.blue,700,'letter-spacing="1.5"')}
${t(93,553,26,'Un gesto reconocible por uso repetido',C.navy,700)}
${t(93,585,16,'Agenda, funda, set y soportes visuales. Identidad aún por probar.',C.muted,400)}
${rect(674,498,814,145,18,C.blue)}
<circle cx="1054" cy="570" r="105" fill="${C.white}"/>
${rect(1000,539,116,11,5,'#AAC7D4')}
${rect(1019,566,78,11,5,'#AAC7D4')}
${rect(804,544,150,10,5,'#9DD0F4')}
${rect(824,574,130,10,5,'#9DD0F4')}
${rect(1168,544,157,10,5,'#9DD0F4')}
${rect(1168,574,115,10,5,'#9DD0F4')}
${t(93,745,17,'03  SILENCIO',C.blue,700,'letter-spacing="1.5"')}
${t(93,779,26,'Material y función, sin marca visible',C.navy,700)}
${t(93,811,16,'Lapicero, bandeja, cables, soportes y objetos secundarios.',C.muted,400)}
${rect(704,751,620,105,17,'#E5E1D7')}
${rect(741,780,250,43,8,'#C8D0CD')}
<circle cx="1172" cy="805" r="31" fill="#B9C5C3"/>
${t(94,918,14,'La exposición de marca se decide por plano, distancia y función; nunca por llenar superficies.',C.muted,400)}
`)

for (const [name, svg] of [['05-exploracion-grafica', exploration], ['06-presencia-corporativa', presence]]) {
  await writeFile(join(dir, `${name}.svg`), svg)
  await sharp(Buffer.from(svg)).png().toFile(join(dir, `${name}.png`))
}
