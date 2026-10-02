import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, '../..')
const assets = {
  logo: 'public/branding/logo-full.svg',
  ship: 'public/branding/SVG/isotipo-full-efeonce.svg',
  globe: 'public/branding/SVG/isotipo-goble-full.svg',
  wave: 'public/branding/SVG/isotipo-wave.svg',
  reach: 'public/branding/SVG/isotipo-reach-full.svg',
}
const encoded = Object.fromEntries(await Promise.all(Object.entries(assets).map(async ([name, path]) =>
  [name, (await readFile(join(root, path))).toString('base64')],
)))
const C = {
  navy: '#023C70', blue: '#0375DB', ink: '#183246', muted: '#5E7180', paper: '#F5F3EE',
  white: '#FFFFFF', line: '#D9E2E4', ice: '#E9F3F8', magenta: '#BB1954', orange: '#FF6500',
  wave: '#082E8E', reach: '#FF6F00',
}
const image = (name, x, y, w, h) => `<image href="data:image/svg+xml;base64,${encoded[name]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`
const text = (x, y, size, value, color=C.ink, weight=500, extra='') => `<text x="${x}" y="${y}" font-family="Poppins,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${value}</text>`
const rect = (x, y, w, h, r, fill, stroke='none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`
const shell = (title, subtitle, body, foot) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
${rect(0,0,1600,1000,0,C.paper)}${rect(0,0,1600,188,0,C.white)}
${image('logo',60,52,277,72)}
<path d="M365 40 V144" stroke="${C.line}" stroke-width="2"/>
${text(398,84,40,title,C.navy,700)}
${text(398,122,18,subtitle,C.muted,400)}
${body}
${text(60,967,13,foot,C.muted,400)}
${text(1538,967,13,'25 SEP 2026',C.navy,600,'text-anchor="end"')}
</svg>`

const hierarchy = shell('Efeonce como marca anfitriona', 'Una marca principal; los signos de producto aparecen cuando aportan contexto.', `
${rect(60,225,698,647,22,C.white)}
${rect(60,225,698,87,22,C.navy)}${rect(60,288,698,24,0,C.navy)}
${text(91,279,16,'MARCA PRINCIPAL',C.white,700,'letter-spacing="2"')}
${image('ship',149,353,519,363)}
${text(91,770,36,'Efeonce',C.navy,700)}
${text(91,808,18,'Firma el entorno y da unidad a las experiencias.',C.muted,400)}
${text(91,837,16,'El isotipo puede vivir como símbolo, objeto o presencia espacial.',C.muted,400)}

${rect(784,225,755,197,20,C.white)}
${rect(806,245,12,157,6,C.magenta)}
${image('globe',845,254,141,141)}
${text(1021,283,15,'SUBMARCA / CREATIVE STUDIO',C.magenta,700,'letter-spacing="1.5"')}
${text(1021,328,34,'Globe',C.navy,700)}
${text(1021,362,16,'Su globo identifica el contexto creativo.',C.muted,400)}
${rect(784,443,755,197,20,C.white)}
${rect(806,463,12,157,6,C.blue)}
${image('wave',835,494,170,94)}
${text(1021,501,15,'SUBMARCA / DIGITAL',C.blue,700,'letter-spacing="1.5"')}
${text(1021,546,34,'Wave',C.navy,700)}
${text(1021,580,16,'Sus pliegues angulares pueden sugerir un marco.',C.muted,400)}
${rect(784,661,755,211,20,C.white)}
${rect(806,681,12,171,6,C.reach)}
${image('reach',851,706,129,129)}
${text(1021,720,15,'SUBMARCA / MEDIA Y DISTRIBUCIÓN',C.reach,700,'letter-spacing="1.5"')}
${text(1021,765,34,'Reach',C.navy,700)}
${text(1021,799,16,'Su flecha señala dirección en ese contexto.',C.muted,400)}
${rect(60,895,1479,46,11,C.ice)}
${text(82,925,16,'Criterio: la familia completa se muestra al explicar el portafolio; un accesorio corporativo puede usar solo Efeonce.',C.navy,600)}
`, 'Exploración de jerarquía · símbolos oficiales · sin aplicaciones a objetos')

const routes = shell('Rutas para una línea gráfica', 'No son cuatro logos repetidos: son tres maneras de ordenar presencia, formas y contexto.', `
${rect(60,231,459,644,22,C.white)}
${text(87,278,16,'01 / FAMILIA EXPLÍCITA',C.blue,700,'letter-spacing="1.3"')}
${text(87,317,27,'Símbolos en conjunto',C.navy,700)}
${text(87,351,16,'Útil para explicar el portafolio.',C.muted,400)}
${rect(87,384,405,330,16,C.ice)}
${image('ship',181,414,218,171)}
${image('globe',132,602,58,70)}
${image('wave',223,613,111,57)}
${image('reach',378,605,69,69)}
${text(87,764,16,'Fortaleza: relación directa con los signos.',C.ink,500)}
${text(87,793,16,'Límite: una escena diaria parecería',C.muted,400)}
${text(87,817,16,'un catálogo de logos.',C.muted,400)}

${rect(571,231,459,644,22,C.white)}
${text(598,278,16,'02 / CÓDIGO FORMAL',C.blue,700,'letter-spacing="1.3"')}
${text(598,317,27,'Relaciones sin iconos',C.navy,700)}
${text(598,351,16,'Foco, marco y dirección en el layout.',C.muted,400)}
${rect(598,384,405,330,16,'#E8F0F2')}
<circle cx="800" cy="547" r="115" fill="${C.white}"/>
<path d="M598 485 L689 437 L689 457 L630 489 L689 521 L689 541 Z" fill="${C.wave}"/>
<path d="M1003 602 L919 648 L919 628 L974 599 L919 568 L919 548 Z" fill="${C.blue}"/>
${rect(737,514,123,11,5,'#A9BFC7')}
${rect(758,540,81,11,5,'#A9BFC7')}
${text(598,764,16,'Fortaleza: puede vivir en formatos.',C.ink,500)}
${text(598,793,16,'Límite: necesita reglas propias para',C.muted,400)}
${text(598,817,16,'no volverse geometría genérica.',C.muted,400)}

${rect(1082,231,457,644,22,C.white)}
${text(1109,278,16,'03 / SISTEMA SELECTIVO',C.blue,700,'letter-spacing="1.3"')}
${text(1109,317,27,'Efeonce lidera',C.navy,700)}
${text(1109,351,16,'Una submarca solo cuando corresponde.',C.muted,400)}
${rect(1109,384,403,330,16,C.navy)}
${rect(1133,410,355,278,12,C.white)}
${image('logo',1152,433,185,57)}
<path d="M1154 510 H1462" stroke="${C.line}" stroke-width="2"/>
${text(1154,546,16,'CREATIVE STUDIO',C.magenta,700,'letter-spacing="1.4"')}
${image('globe',1372,519,66,78)}
${rect(1154,585,208,11,5,'#C8D6D9')}
${rect(1154,609,267,11,5,'#C8D6D9')}
${rect(1154,633,168,11,5,'#C8D6D9')}
${text(1109,764,16,'Fortaleza: jerarquía clara y flexible.',C.ink,500)}
${text(1109,793,16,'Riesgo: si falta oficio visual, queda',C.muted,400)}
${text(1109,817,16,'en un simple cobranding.',C.muted,400)}
${rect(60,897,1479,45,11,C.ice)}
${text(82,926,16,'Hipótesis a desarrollar: combinar la jerarquía de 03 con una gramática 02 más distintiva; usar 01 para mapas del ecosistema.',C.navy,600)}
`, 'Exploración de rutas · propuestas, no identidad aprobada')

for (const [name, svg] of [['07-jerarquia-universo', hierarchy], ['08-rutas-universo', routes]]) {
  await writeFile(join(dir, `${name}.svg`), svg)
  await sharp(Buffer.from(svg)).png().toFile(join(dir, `${name}.png`))
}
