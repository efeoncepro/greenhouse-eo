import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

const ROOT = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(ROOT, 'finales')
const W = 1080
const H = 1350
const C = {
  paper: '#FFF9EB',
  white: '#FFFFFF',
  ink: '#111820',
  navy: '#023C70',
  blue: '#0375DB',
  orange: '#FF6500',
  bluePale: '#CFE4FA',
  gray: '#31485A',
}
const FONT_DIR = '/Users/jreye/Documents/axis-design-system/apps/lab/public/fonts'
const photoPath = path.join(ROOT, 'output/slide-01-cover-draft.png')
const logoPath = '/Users/jreye/Documents/greenhouse-eo/public/branding/logo-full.svg'

const [photo, logo, bricolage, poppins] = await Promise.all([
  fs.readFile(photoPath), fs.readFile(logoPath),
  fs.readFile(path.join(FONT_DIR, 'BricolageGrotesque-Variable.ttf')),
  fs.readFile(path.join(FONT_DIR, 'Poppins-400.ttf')),
])
const photoUri = `data:image/png;base64,${photo.toString('base64')}`
const logoSvg = logo.toString().replace(/^\s*<\?xml[^>]*>\s*/, '')
const logoUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`
const fonts = `<style>@font-face{font-family:Bricolage;src:url(data:font/ttf;base64,${bricolage.toString('base64')}) format('truetype');font-weight:200 800}@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${poppins.toString('base64')}) format('truetype');font-weight:400}</style>`

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const text = (x, y, value, size, opts = {}) => {
  const { family = 'Poppins', weight = 400, fill = C.ink, spacing = 0, anchor = 'start' } = opts
  return `<text x="${x}" y="${y}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${fill}" letter-spacing="${spacing}" text-anchor="${anchor}">${esc(value)}</text>`
}
const lines = (x, y, values, size, opts = {}) => {
  const { leading = 1.14, ...rest } = opts
  return values.map((v, i) => text(x, y + i * size * leading, v, size, rest)).join('')
}
const logoMark = `<image href="${logoUri}" width="837.07" height="196.68"/>`
const bg = (slide, label) => `<rect width="${W}" height="${H}" fill="${C.paper}"/><rect x="0" y="0" width="${W}" height="18" fill="${C.navy}"/><g fill="${C.blue}" opacity=".18">${Array.from({ length: 11 }, (_, i) => `<circle cx="${44 + (i % 4) * 24}" cy="${82 + Math.floor(i / 4) * 24}" r="5"/>`).join('')}</g>${text(82, 81, `LABORATORIO CREATIVO  /  ${label}`, 21, { weight: 400, fill: C.navy, spacing: 1.5 })}<g transform="translate(860 1270) scale(.20)">${logoMark}</g>${text(82, 1287, `${String(slide).padStart(2, '0')} / 06`, 20, { fill: C.navy, spacing: 1 })}`
const burst = (cx, cy, ro, ri, points = 16) => {
  const a = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro
    const t = -Math.PI / 2 + (i * Math.PI) / points
    a.push(`${cx + Math.cos(t) * r},${cy + Math.sin(t) * r}`)
  }
  return `<polygon points="${a.join(' ')}" fill="${C.orange}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>`
}
const bubble = (x, y, w, h, copyLines, opts = {}) => {
  const { fill = C.white, color = C.navy, size = 30 } = opts
  return `<path d="M${x + 20} ${y + 8} Q${x} ${y + 8} ${x} ${y + 34} V${y + h - 38} Q${x} ${y + h - 8} ${x + 30} ${y + h - 8} H${x + w - 30} Q${x + w} ${y + h - 8} ${x + w} ${y + h - 38} V${y + 32} Q${x + w} ${y + 8} ${x + w - 26} ${y + 8} Z" fill="${fill}" stroke="${C.ink}" stroke-width="8"/><path d="M${x + 98} ${y + h - 10} l-10 37 52-34" fill="${fill}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>${lines(x + 30, y + 55, copyLines, size, { fill: color, family: 'Poppins', leading: 1.25 })}`
}
const halftone = (x, y, w, h, color = C.blue, radius = 5) => `<pattern id="dots${x}${y}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="${radius}" fill="${color}"/></pattern><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dots${x}${y})"/>`
const pot = (cx, cy, scale = 1) => `<g transform="translate(${cx} ${cy}) scale(${scale})" stroke="${C.ink}" stroke-width="10" stroke-linejoin="round"><ellipse cx="0" cy="0" rx="200" ry="38" fill="${C.bluePale}"/><path d="M-184 0 Q-170 210 0 230 Q170 210 184 0 Q0 44 -184 0Z" fill="${C.navy}"/><path d="M-164 14 Q-150 183 0 199 Q150 183 164 14" fill="none" stroke="${C.blue}" stroke-width="18"/><path d="M-236 28 Q-250 155 -190 161 M236 28 Q250 155 190 161" fill="none" stroke="${C.ink}" stroke-width="12"/><path d="M-70 207 l-25 37 M70 207 l25 37" fill="none" stroke="${C.ink}" stroke-width="14"/><path d="M-92-6 Q-70-74 -45-8 M0-2 Q25-100 47-7 M80-5 Q114-66 126-3" fill="none" stroke="${C.orange}" stroke-width="12" stroke-linecap="round"/><image href="" width="837.07" height="196.68"/></g>`
const plateFrame = (x, y, w, h, cropY = 0) => `<rect x="${x - 13}" y="${y - 13}" width="${w + 26}" height="${h + 26}" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="10"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 ${cropY} 1122 ${Math.round(h / w * 1122)}" preserveAspectRatio="xMidYMid slice"><image href="${photoUri}" width="1122" height="1402"/></svg>`

const slides = []
slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}<rect width="${W}" height="${H}" fill="${C.paper}"/><rect width="${W}" height="18" fill="${C.navy}"/><g opacity=".25">${halftone(0,0,250,330,C.blue,5)}</g>${burst(102,420,106,78,13)}<text x="105" y="438" text-anchor="middle" font-family="Bricolage" font-weight="800" font-size="53" fill="${C.navy}">¡PUM!</text>${plateFrame(248,98,584,730,0)}${text(82,895,'YO: DIRECCIÓN CREATIVA',20,{fill:C.navy,spacing:1.2})}${text(998,895,'NEXA: COPILOTO',20,{fill:C.navy,spacing:1.2,anchor:'end'})}${lines(82,985,['El contexto crea','la pieza creativa.'],69,{family:'Bricolage',weight:620,fill:C.navy,leading:.98})}${lines(84,1150,['Así se prepara la olla antes de abrir','el prompt y activar el modelo.'],27,{fill:C.gray,leading:1.45})}<g transform="translate(849 1261) scale(.19)">${logoMark}</g>${text(82,1286,'DESLIZA PARA VER LA RECETA  →',18,{fill:C.navy,spacing:1})}</svg>`)

slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}${bg(2,'01 · ENCARGO')}${lines(82,224,['Primero, define','qué debe lograr.'],65,{family:'Bricolage',weight:630,fill:C.navy,leading:1.02})}${text(84,383,'El contexto de la pieza empieza con tres decisiones.',25,{fill:C.gray})}<g transform="translate(95 488)"><circle cx="96" cy="86" r="72" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><path d="M96 39 L112 81 L155 96 L112 111 L96 153 L80 111 L38 96 L80 81Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><text x="194" y="68" font-family="Bricolage" font-weight="650" font-size="36" fill="${C.navy}">Objetivo</text><text x="194" y="111" font-family="Poppins" font-size="24" fill="${C.ink}">¿Qué queremos mover?</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(95 690)"><circle cx="96" cy="86" r="72" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><circle cx="75" cy="82" r="28" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><circle cx="117" cy="82" r="28" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/><path d="M45 129 Q49 99 75 103 Q101 103 105 129 M87 129 Q91 99 117 103 Q143 103 147 129" fill="${C.navy}" stroke="${C.ink}" stroke-width="5"/><text x="194" y="68" font-family="Bricolage" font-weight="650" font-size="36" fill="${C.navy}">Audiencia</text><text x="194" y="111" font-family="Poppins" font-size="24" fill="${C.ink}">¿Con quién conversamos?</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(95 892)"><circle cx="96" cy="86" r="72" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><path d="M54 58 Q54 42 72 42 H126 Q142 42 142 58 V96 Q142 112 126 112 H94 L70 135 V112 H72 Q54 112 54 96Z" fill="${C.white}" stroke="${C.ink}" stroke-width="7"/><path d="M72 70 H124 M72 87 H113" stroke="${C.blue}" stroke-width="8" stroke-linecap="round"/><text x="194" y="68" font-family="Bricolage" font-weight="650" font-size="36" fill="${C.navy}">Mensaje</text><text x="194" y="111" font-family="Poppins" font-size="24" fill="${C.ink}">¿Qué debe recordar?</text><image href="" width="837.07" height="196.68"/></g>${bubble(563,1063,420,146,['Nexa: ¿qué cambia','después de verla?'],{fill:C.white,color:C.navy,size:27})}</svg>`)

slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}${bg(3,'02 · INGREDIENTES')}${lines(82,224,['Reúne lo que da','forma a la idea.'],65,{family:'Bricolage',weight:630,fill:C.navy,leading:1.02})}${text(84,383,'La olla necesita materiales con propósito.',25,{fill:C.gray})}<g transform="translate(80 461)"><path d="M0 0 H440 V237 H0Z" fill="${C.white}" stroke="${C.ink}" stroke-width="8"/><path d="M0 0 H440 V48 H0Z" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><text x="26" y="34" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="${C.navy}">IDENTIDAD</text><text x="25" y="108" font-family="Bricolage" font-weight="620" font-size="33" fill="${C.navy}">Marca y tono</text><text x="25" y="157" font-family="Poppins" font-size="22" fill="${C.ink}">Qué se siente propio.</text><text x="25" y="196" font-family="Poppins" font-size="22" fill="${C.ink}">Qué debe mantenerse.</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(560 461)"><path d="M0 0 H440 V237 H0Z" fill="${C.white}" stroke="${C.ink}" stroke-width="8"/><path d="M0 0 H440 V48 H0Z" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><text x="26" y="34" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="${C.navy}">REFERENCIAS</text><text x="25" y="108" font-family="Bricolage" font-weight="620" font-size="33" fill="${C.navy}">Ejemplos sí / no</text><text x="25" y="157" font-family="Poppins" font-size="22" fill="${C.ink}">Dirección visual concreta.</text><text x="25" y="196" font-family="Poppins" font-size="22" fill="${C.ink}">No sólo adjetivos.</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(80 755)"><path d="M0 0 H440 V237 H0Z" fill="${C.white}" stroke="${C.ink}" stroke-width="8"/><path d="M0 0 H440 V48 H0Z" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><text x="26" y="34" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="${C.navy}">MATERIALES</text><text x="25" y="108" font-family="Bricolage" font-weight="620" font-size="33" fill="${C.navy}">Copy + assets</text><text x="25" y="157" font-family="Poppins" font-size="22" fill="${C.ink}">Fotos, logos, producto.</text><text x="25" y="196" font-family="Poppins" font-size="22" fill="${C.ink}">Todo aprobado y disponible.</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(560 755)"><path d="M0 0 H440 V237 H0Z" fill="${C.white}" stroke="${C.ink}" stroke-width="8"/><path d="M0 0 H440 V48 H0Z" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="8"/><text x="26" y="34" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="${C.navy}">FORMATO</text><text x="25" y="108" font-family="Bricolage" font-weight="620" font-size="33" fill="${C.navy}">Canal + medida</text><text x="25" y="157" font-family="Poppins" font-size="22" fill="${C.ink}">Feed, story, banner…</text><text x="25" y="196" font-family="Poppins" font-size="22" fill="${C.ink}">La salida también dirige.</text><image href="" width="837.07" height="196.68"/></g>${burst(916,1110,72,54,11)}<text x="916" y="1120" text-anchor="middle" font-family="Bricolage" font-weight="800" font-size="28" fill="${C.navy}">¡LISTO!</text>${text(82,1179,'Si un material falta, acláralo antes de mezclar.',25,{fill:C.navy})}</svg>`)

slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}${bg(4,'03 · PROMPT')}${lines(82,224,['El prompt ordena','la mezcla.'],65,{family:'Bricolage',weight:630,fill:C.navy,leading:1.02})}${text(84,383,'Convierte las decisiones en instrucciones claras.',25,{fill:C.gray})}<path d="M93 477 Q93 438 132 438 H949 Q986 438 986 477 V955 Q986 992 949 992 H249 L143 1070 L166 992 H132 Q93 992 93 955Z" fill="${C.white}" stroke="${C.ink}" stroke-width="9"/><text x="145" y="523" font-family="Poppins" font-weight="600" font-size="22" letter-spacing="2" fill="${C.blue}">LA RECETA DICE:</text>${lines(145,598,['Qué buscamos, para quién y qué debe decir.','Qué códigos visuales seguir y qué evitar.','Qué materiales usar y en qué formato.'],30,{family:'Poppins',weight:400,fill:C.navy,leading:1.9})}<path d="M146 812 H915" stroke="${C.bluePale}" stroke-width="8"/><text x="145" y="875" font-family="Bricolage" font-weight="620" font-size="38" fill="${C.navy}">Contexto útil → mejor dirección</text>${bubble(140,1070,485,137,['Nexa: incluye límites,','usos y referencias.'],{fill:C.bluePale,color:C.navy,size:27})}${burst(850,1120,93,68,12)}<text x="850" y="1130" text-anchor="middle" font-family="Bricolage" font-weight="800" font-size="30" fill="${C.navy}">CLARO</text></svg>`)

slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}${bg(5,'04 · MODELO')}${lines(82,224,['El modelo pone','la chispa.'],65,{family:'Bricolage',weight:630,fill:C.navy,leading:1.02})}${text(84,383,'Interpreta el encargo y abre posibilidades.',25,{fill:C.gray})}${burst(540,730,265,205,16)}<path d="M540 538 L484 710 H548 L499 903 L624 674 H557 L606 538Z" fill="${C.white}" stroke="${C.ink}" stroke-width="10" stroke-linejoin="round"/><g transform="translate(160 948)"><circle cx="24" cy="0" r="16" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><text x="62" y="10" font-family="Bricolage" font-weight="620" font-size="31" fill="${C.navy}">Prueba rutas distintas</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(160 1020)"><circle cx="24" cy="0" r="16" fill="${C.blue}" stroke="${C.ink}" stroke-width="6"/><text x="62" y="10" font-family="Bricolage" font-weight="620" font-size="31" fill="${C.navy}">Materializa la dirección</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(160 1092)"><circle cx="24" cy="0" r="16" fill="${C.bluePale}" stroke="${C.ink}" stroke-width="6"/><text x="62" y="10" font-family="Bricolage" font-weight="620" font-size="31" fill="${C.navy}">No conoce tu criterio</text><image href="" width="837.07" height="196.68"/></g>${bubble(604,1068,367,124,['La selección final','sigue siendo tuya.'],{fill:C.white,color:C.navy,size:26})}</svg>`)

slides.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fonts}${bg(6,'05 · CRITERIO')}${plateFrame(82,146,380,475,420)}${text(516,203,'Y AHORA, PROFESOR…',20,{fill:C.navy,spacing:1.3})}${lines(516,292,['¿qué sale','de la olla?'],55,{family:'Bricolage',weight:630,fill:C.navy,leading:1})}<g transform="translate(100 703)"><circle cx="36" cy="35" r="27" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><path d="M22 35 l10 10 19-23" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><text x="91" y="48" font-family="Poppins" font-size="29" fill="${C.ink}">¿Responde al objetivo?</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(100 795)"><circle cx="36" cy="35" r="27" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><path d="M22 35 l10 10 19-23" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><text x="91" y="48" font-family="Poppins" font-size="29" fill="${C.ink}">¿Se siente de marca?</text><image href="" width="837.07" height="196.68"/></g><g transform="translate(100 887)"><circle cx="36" cy="35" r="27" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/><path d="M22 35 l10 10 19-23" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><text x="91" y="48" font-family="Poppins" font-size="29" fill="${C.ink}">¿Funciona en su formato?</text><image href="" width="837.07" height="196.68"/></g><path d="M82 1011 H998" stroke="${C.ink}" stroke-width="8"/><text x="82" y="1089" font-family="Bricolage" font-weight="650" font-size="45" fill="${C.navy}">Contexto + criterio</text><text x="82" y="1150" font-family="Bricolage" font-weight="750" font-size="49" fill="${C.blue}">= creatividad con dirección.</text>${text(82,1212,'Guarda esta receta para tu próxima pieza digital.',23,{fill:C.gray})}</svg>`)

await fs.mkdir(OUT, { recursive: true })
const pdf = await PDFDocument.create()
const pngFiles = []
for (let i = 0; i < slides.length; i++) {
  const file = path.join(OUT, `design-contexto-${String(i + 1).padStart(2, '0')}.png`)
  const svgBuffer = Buffer.from(slides[i])
  await sharp(svgBuffer, { density: 144 }).resize(W, H).png({ compressionLevel: 9 }).toFile(file)
  pngFiles.push(file)
  const page = pdf.addPage([W, H])
  page.drawImage(await pdf.embedPng(await fs.readFile(file)), { x: 0, y: 0, width: W, height: H })
}
await fs.writeFile(path.join(OUT, 'linkedin-design-contexto.pdf'), await pdf.save())
const thumbW = 360, thumbH = 450, gap = 24, cols = 3, rows = Math.ceil(pngFiles.length / cols)
const thumbs = await Promise.all(pngFiles.map(async (file, i) => ({
  input: await sharp(file).resize(thumbW, thumbH).png().toBuffer(),
  left: gap + (i % cols) * (thumbW + gap), top: gap + Math.floor(i / cols) * (thumbH + gap),
})))
await sharp({ create: { width: gap + cols * (thumbW + gap), height: gap + rows * (thumbH + gap), channels: 4, background: C.paper } }).composite(thumbs).png().toFile(path.join(OUT, 'contact-sheet.png'))
console.log(JSON.stringify({ slides: pngFiles, pdf: path.join(OUT, 'linkedin-design-contexto.pdf'), contactSheet: path.join(OUT, 'contact-sheet.png') }, null, 2))
