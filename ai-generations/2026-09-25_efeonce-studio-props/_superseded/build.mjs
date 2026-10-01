import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, '../..')
const data = async path => `data:image/svg+xml;base64,${(await readFile(join(root, path))).toString('base64')}`
const logo = await data('public/branding/logo-full.svg')
const logoWhite = await data('public/branding/logo-negative.svg')
const mark = await data('public/branding/SVG/isotipo-full-efeonce.svg')
const markWhite = await data('public/branding/SVG/isotipo-efeonce-negativo.svg')

const C = { navy: '#023C70', blue: '#0375DB', orange: '#F55D01', lime: '#6EC207', ink: '#142632', paper: '#F4F2EC', ivory: '#FCFAF6', line: '#DBE0DF', muted: '#697883' }
const image = (href, x, y, w, h, extra = '') => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`
const text = (x, y, size, value, color = C.ink, weight = 500, extra = '') => `<text x="${x}" y="${y}" fill="${color}" font-family="Poppins,Arial,sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${value}</text>`
const round = (x,y,w,h,r,fill,stroke='none',sw=1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
const label = (x,y,n,title,sub) => `${round(x,y-17,31,31,10,C.navy)}${text(x+9,y+5,15,n,'white',700)}${text(x+45,y+2,19,title,C.ink,700)}${text(x+45,y+27,13,sub,C.muted,400)}`
const base = (title, subtitle, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs>
<linearGradient id="paper" x2="1" y2="1"><stop stop-color="#FCFBF8"/><stop offset="1" stop-color="#F0EEE8"/></linearGradient>
<linearGradient id="mug" x2="1"><stop stop-color="#DCDDD9"/><stop offset=".28" stop-color="#FFFDF8"/><stop offset=".8" stop-color="#F5F1E9"/><stop offset="1" stop-color="#D1D1CC"/></linearGradient>
<linearGradient id="metal" x2="1" y2="1"><stop stop-color="#C2CBD1"/><stop offset=".45" stop-color="#F4F5F3"/><stop offset="1" stop-color="#A7B2BB"/></linearGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".58"/><stop offset=".5" stop-color="#E7F5FD" stop-opacity=".42"/><stop offset="1" stop-color="#C7DFEE" stop-opacity=".2"/></linearGradient>
<filter id="shadow"><feDropShadow dx="0" dy="15" stdDeviation="18" flood-color="#122F42" flood-opacity=".12"/></filter>
<filter id="soft"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#173A50" flood-opacity=".12"/></filter>
</defs>
${round(0,0,1600,1000,0,C.paper)}
${round(0,0,1600,170,0,C.navy)}
${text(60,73,18,'EFEONCE  /  CREATIVE PRODUCTION', '#A8C9E8',600,'letter-spacing="3"')}
${text(60,132,51,title,'#FFFFFF',700)}
${image(logoWhite,1320,60,220,52)}
${text(61,206,17,subtitle,C.muted,400)}
${body}
${text(60,966,13,'Concepto visual · 25 sep 2026 · sujeto a revisión de muestra física',C.muted,400)}
${text(1530,966,13,'EFEONCE',C.navy,700,'text-anchor="end" letter-spacing="2"')}
</svg>`

const props = base('Objetos que hacen visible el oficio', 'Sistema de utilería funcional para estudio, oficina, fotografía y video.', `
${round(55,235,695,680,30,'#EAE6DE')}
${round(775,235,367,326,30,C.ivory)}
${round(1167,235,378,326,30,C.ivory)}
${round(775,586,367,329,30,C.ivory)}
${round(1167,586,378,329,30,C.ivory)}

<!-- Mug ceramic hero -->
<ellipse cx="398" cy="777" rx="247" ry="54" fill="#98A6AC" opacity=".17"/>
<ellipse cx="408" cy="763" rx="201" ry="38" fill="#E7DED2" stroke="#CFC8BE" stroke-width="4"/>
<ellipse cx="406" cy="758" rx="151" ry="21" fill="#F7F2EA"/>
<path d="M539 387 C630 351 670 421 664 492 C659 561 608 584 550 554 L557 512 C607 535 628 498 626 459 C624 419 599 403 546 423 Z" fill="url(#mug)" stroke="#C9CBC9" stroke-width="6" filter="url(#soft)"/>
<path d="M222 355 L548 355 L525 716 Q403 758 275 716 Z" fill="url(#mug)" stroke="#D5D6D1" stroke-width="3" filter="url(#shadow)"/>
<ellipse cx="385" cy="355" rx="163" ry="43" fill="#F5F1E9" stroke="#D5D6D1" stroke-width="4"/>
<ellipse cx="385" cy="355" rx="144" ry="29" fill="#34302B"/>
<path d="M285 396 Q385 421 487 396" fill="none" stroke="white" stroke-opacity=".65" stroke-width="6"/>
${image(logo,294,485,190,46)}
${label(88,282,'01','Mug de estudio','Cerámica hueso · logo navy · 350 ml')}
${text(94,847,15,'Interior navy opcional · sin eslogan · base apilable',C.muted)}

<!-- Notebook / pen -->
<g transform="rotate(-8 950 395)" filter="url(#soft)">${round(875,316,192,190,13,C.navy)}${round(895,315,10,190,2,'#376A96')}${image(markWhite,941,356,71,57)}<path d="M905 488 H1052" stroke="#9FABB7" stroke-width="3"/></g>
<g transform="rotate(24 940 430)">${round(855,422,178,10,5,'url(#metal)')}${round(865,422,20,10,3,C.navy)}<path d="M1033 422 l22 5 -22 5" fill="#8E9CA4"/></g>
${label(805,282,'02','Agenda + lapicero','A5 textil navy · señal discreta')}
${text(805,537,14,'Canto y separador azul activo',C.muted)}

<!-- Laptop and stickers -->
<g filter="url(#soft)">${round(1232,330,247,169,11,'url(#metal)','#8C9CA5',3)}${round(1244,343,223,144,3,'#EFF2F1')}</g>
${image(mark,1321,391,70,52)}
<circle cx="1444" cy="450" r="12" fill="${C.orange}"/>
<path d="M1438 450 h12 M1444 444 v12" stroke="white" stroke-width="2"/>
<path d="M1209 504 H1503 L1474 519 H1237 Z" fill="#B0BBC0" stroke="#87969B" stroke-width="2"/>
${label(1196,282,'03','Mac con stickers','Kit removible · isla limpia de marca')}
${text(1196,537,14,'Isotipo oficial + formas de sistema',C.muted)}

<!-- Acrylic board -->
<path d="M822 674 L1117 674 L1098 842 L840 842 Z" fill="url(#glass)" stroke="#9EB9C7" stroke-width="5" filter="url(#soft)"/>
<path d="M843 682 L1095 682" stroke="white" stroke-width="6" opacity=".8"/>
${image(logo,978,689,100,25)}
<g fill="none" stroke-width="5" stroke-linecap="round"><path d="M864 747 h82" stroke="${C.blue}"/><path d="M864 771 h177" stroke="#7D9AAB"/><path d="M864 795 h139" stroke="#7D9AAB"/><circle cx="1055" cy="775" r="10" stroke="${C.orange}"/></g>
<path d="M850 843 l-19 22 M1088 843 l19 22" stroke="#738B98" stroke-width="8" stroke-linecap="round"/>
${label(805,634,'04','Pizarra acrílica','Panel transparente · logo en cabecera')}
${text(805,890,14,'Trabajo real visible; vinilo sólo fuera del área útil',C.muted)}

<!-- Production tray -->
<g filter="url(#soft)">${round(1211,685,289,140,20,'#D7D0C3')}${round(1224,698,263,114,12,'#EEEAE2')}</g>
${round(1244,716,81,70,6,C.navy)}${image(markWhite,1267,731,36,34)}
${round(1344,716,96,58,5,'#A9B9BF')}${round(1364,736,56,18,2,C.blue)}
<path d="M1251 797 h168" stroke="#495B64" stroke-width="7" stroke-linecap="round"/>
${label(1196,634,'05','Bandeja técnica','Muestras, SSD, adaptadores y marcador')}
${text(1196,890,14,'Cada objeto tiene tarea en la escena',C.muted)}
`)

const pin = (x,y,n) => `<circle cx="${x}" cy="${y}" r="19" fill="${C.navy}" stroke="white" stroke-width="4"/>${text(x,y+6,16,n,'white',700,'text-anchor="middle"')}`
const office = base('Una oficina que muestra el trabajo', 'Zonificación conceptual; la distribución se adapta a las medidas y condiciones del inmueble.', `
${round(55,236,1135,679,30,'#E6E1D7')}
${round(81,261,1083,626,15,'#F7F3EA','#B1BCBB',3)}
<path d="M81 530 H1164 M360 261 V530 M760 261 V530 M390 530 V887 M760 530 V887" stroke="#BBC8CA" stroke-width="9"/>
<path d="M85 530 H230 M895 530 H1160" stroke="${C.blue}" stroke-width="12"/>

<!-- Reception -->
${round(112,303,213,90,20,'#D6CBB9')}${round(130,319,178,58,10,'#EEE8DD')}
${image(logo,150,332,137,32)}
<path d="M122 459 H320" stroke="#C4B9A8" stroke-width="17" stroke-linecap="round"/>
<circle cx="289" cy="445" r="16" fill="${C.lime}" opacity=".85"/>
${pin(332,293,'1')}

<!-- Project table -->
<ellipse cx="556" cy="395" rx="157" ry="92" fill="#8A6545" opacity=".14"/>
<ellipse cx="553" cy="389" rx="147" ry="81" fill="#E4D8C7" stroke="#C4B6A4" stroke-width="4"/>
${round(476,356,140,64,8,'#FCFAF6')}${round(512,363,44,20,3,C.blue)}
<circle cx="421" cy="392" r="22" fill="#AAB8B4"/><circle cx="685" cy="392" r="22" fill="#AAB8B4"/>
<circle cx="552" cy="291" r="22" fill="#AAB8B4"/><circle cx="552" cy="487" r="22" fill="#AAB8B4"/>
${pin(736,293,'2')}

<!-- Set -->
${round(799,291,325,206,14,'#D6DEE0')}
<path d="M822 468 Q887 371 956 413 Q1026 454 1101 337" fill="none" stroke="#F8F7F3" stroke-width="22"/>
<path d="M816 304 L864 350 M1102 304 L1054 350" stroke="#2C3940" stroke-width="8"/>
<circle cx="868" cy="351" r="17" fill="#FCF1CF"/><circle cx="1053" cy="351" r="17" fill="#FCF1CF"/>
<path d="M831 469 h70" stroke="${C.blue}" stroke-width="12"/>
${pin(1134,293,'3')}

<!-- Materials library -->
${round(111,570,226,279,10,'#D3C8B9')}
${round(129,588,188,55,5,'#EAE5DC')}${round(129,657,188,55,5,'#EAE5DC')}${round(129,726,188,55,5,'#EAE5DC')}
<rect x="148" y="603" width="30" height="26" fill="${C.navy}"/><rect x="186" y="603" width="30" height="26" fill="#B2AA9D"/><rect x="224" y="603" width="30" height="26" fill="${C.blue}"/>
<path d="M150 684 h140 M150 752 h140" stroke="#8E9C9B" stroke-width="7"/>
${pin(347,563,'4')}

<!-- Review wall with acrylic board -->
${round(421,573,306,238,14,'url(#glass)','#90AEBE',4)}
${image(logo,588,590,114,28)}
<path d="M453 651 h126 M453 684 h220 M453 718 h171" stroke="${C.blue}" stroke-width="6" stroke-linecap="round"/>
<circle cx="670" cy="718" r="14" fill="none" stroke="${C.orange}" stroke-width="5"/>
${round(477,824,195,22,8,'#C7B9A4')}
${pin(736,563,'5')}

<!-- Audio/podcast -->
${round(808,572,322,272,13,'#E7E2D8')}
<path d="M828 600 H1110 M828 615 H1110 M828 630 H1110" stroke="#D2C7B4" stroke-width="8"/>
<ellipse cx="962" cy="737" rx="92" ry="46" fill="#B5A68F"/>
<path d="M899 713 l-24 -37 M1022 713 l24 -37" stroke="#273C4B" stroke-width="7"/>
<circle cx="875" cy="671" r="10" fill="#1B2E3C"/><circle cx="1047" cy="671" r="10" fill="#1B2E3C"/>
<circle cx="887" cy="774" r="17" fill="${C.navy}"/><circle cx="1035" cy="774" r="17" fill="${C.navy}"/>
${pin(1134,563,'6')}

<!-- legend -->
${round(1215,236,330,679,30,C.ivory)}
${text(1246,285,22,'Programa de espacios',C.ink,700)}
${text(1246,323,15,'Un lugar útil antes que un decorado.',C.muted,400)}
${text(1246,382,17,'01  Recepción',C.navy,700)}${text(1246,405,13,'Logo físico + bienvenida clara',C.muted)}
${text(1246,459,17,'02  Mesa de proyecto',C.navy,700)}${text(1246,482,13,'Revisión de obra y datos',C.muted)}
${text(1246,536,17,'03  Set modular',C.navy,700)}${text(1246,559,13,'Luz, fondo y equipo visibles',C.muted)}
${text(1246,613,17,'04  Materiales',C.navy,700)}${text(1246,636,13,'Muestras reales ordenadas',C.muted)}
${text(1246,690,17,'05  Pizarra de decisiones',C.navy,700)}${text(1246,713,13,'Acrílico móvil y legible',C.muted)}
${text(1246,767,17,'06  Audio / podcast',C.navy,700)}${text(1246,790,13,'Acústica y encuadre propio',C.muted)}
${round(1244,827,274,54,12,'#E9F1F4')}${text(1261,860,13,'Circulación, cableado y luz se validan in situ',C.navy,500)}
`)

for (const [name, svg] of [['01-objetos', props], ['02-oficina', office]]) {
  await writeFile(join(dir, `${name}.svg`), svg)
  await sharp(Buffer.from(svg)).png().toFile(join(dir, `${name}.png`))
}
