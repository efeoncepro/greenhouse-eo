const sharp = require('sharp')
const { PDFDocument } = require('pdf-lib')
const fs = require('fs/promises')

const outDir = 'generated/brand-visibility-grader-social/carousel-v2'
const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'
const logo = 'public/branding/logo-white-email.png'
const W = 1080
const H = 1350

const navy = '#07152e'
const aqua = '#58e2d0'
const white = '#f8faf8'
const muted = '#a7c9d0'
const yellow = '#f9b62b'

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061128"/><stop offset=".55" stop-color="#071e3e"/><stop offset="1" stop-color="#003f55"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#51e1cf" stop-opacity=".24"/><stop offset="1" stop-color="#51e1cf" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#b6e8ed" stroke-opacity=".08" stroke-width="1"/></pattern>
  <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#b6e8ed" fill-opacity=".14"/></pattern>
</defs>`

function text(content, x, y, size, fill = white, weight = 700, extra = '') {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Poppins, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${content}</text>`
}

function shell(content, slide, light = false) {
  const bg = light ? '#f3f1eb' : navy
  const foreground = light ? '#101416' : white
  const accent = light ? '#0dbbb2' : aqua
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="${W}" height="${H}" fill="${bg}"/>
    ${light ? '<rect width="1080" height="1350" fill="url(#grid)" opacity=".55"/>' : '<circle cx="930" cy="180" r="520" fill="url(#halo)"/><rect width="1080" height="1350" fill="url(#dots)"/>'}
    ${text('AI VISIBILITY GRADER', 72, 78, 16, light ? '#1a2528' : muted, 700, 'letter-spacing="2"')}
    ${text(String(slide).padStart(2, '0') + ' / 07', 1008, 78, 16, light ? '#1a2528' : muted, 700, 'text-anchor="end"')}
    ${content}
  </svg>`
}

const slides = [
  {
    name: '01-portada',
    light: false,
    svg: `${text('LA', 72, 222, 92)}
      ${text('RESPUESTA', -22, 386, 188, white, 900, 'letter-spacing="-7"')}
      ${text('YA ESTÁ', 76, 532, 74, aqua, 900, 'letter-spacing="-2"')}
      ${text('OCUPADA.', 76, 610, 74, aqua, 900, 'letter-spacing="-2"')}
      <rect x="72" y="670" width="560" height="4" fill="${aqua}"/>
      ${text('Si tu marca no aparece,', 72, 748, 31, white, 500)}
      ${text('no existe para la IA.', 72, 790, 31, aqua, 700)}
      <rect x="74" y="1010" width="230" height="90" rx="16" fill="#081d37" stroke="${aqua}" stroke-opacity=".5"/>
      ${text('MARCA AUSENTE', 96, 1044, 17, aqua, 800, 'letter-spacing="1.5"')}
      ${text('No detectada', 96, 1075, 21, white, 600)}
      <circle cx="318" cy="1055" r="7" fill="${aqua}"/><path d="M325 1055H420" stroke="${aqua}" stroke-dasharray="5 8" stroke-width="2"/>`,
    logo: true,
  },
  {
    name: '02-tension', light: true,
    svg: `${text('NO', 72, 290, 160, '#101416', 900, 'letter-spacing="-5"')}
      ${text('APARECER', 68, 452, 148, '#101416', 900, 'letter-spacing="-6"')}
      <rect x="0" y="500" width="1080" height="170" fill="${aqua}"/>
      ${text('también es perder', 72, 610, 67, '#101416', 900, 'letter-spacing="-2"')}
      ${text('la decisión.', 72, 760, 82, '#101416', 900, 'letter-spacing="-3"')}
      ${text('La IA puede responder sobre tu categoría', 74, 850, 28, '#101416', 500)}
      ${text('sin llevar a tu marca a la conversación.', 74, 892, 28, '#101416', 500)}
      <line x1="74" y1="982" x2="1005" y2="982" stroke="#101416" stroke-opacity=".35"/>
      ${text('NO ES ALCANCE.', 74, 1046, 20, '#101416', 800, 'letter-spacing="2"')}
      ${text('ES ELECCIÓN.', 74, 1090, 36, '#101416', 900, 'letter-spacing="1"')}`,
  },
  {
    name: '03-reframe', light: false,
    svg: `${text('LA IA', 72, 258, 100, white, 900, 'letter-spacing="-3"')}
      ${text('ELIGE.', 72, 355, 100, aqua, 900, 'letter-spacing="-3"')}
      <line x1="72" y1="475" x2="1008" y2="475" stroke="${aqua}" stroke-opacity=".5"/>
      ${text('INTERPRETA', 72, 575, 34, white, 800, 'letter-spacing="1.5"')}
      ${text('tu marca', 72, 618, 29, muted, 500)}
      <line x1="72" y1="680" x2="1008" y2="680" stroke="${aqua}" stroke-opacity=".5"/>
      ${text('COMPARA', 72, 780, 34, white, 800, 'letter-spacing="1.5"')}
      ${text('alternativas', 72, 823, 29, muted, 500)}
      <line x1="72" y1="885" x2="1008" y2="885" stroke="${aqua}" stroke-opacity=".5"/>
      ${text('CITA', 72, 985, 34, white, 800, 'letter-spacing="1.5"')}
      ${text('fuentes', 72, 1028, 29, muted, 500)}
      ${text('La pregunta ya no es “¿me ven?”', 72, 1165, 26, white, 600)}
      ${text('Es “¿qué respuesta construyen sobre mí?”', 72, 1208, 26, aqua, 700)}`,
  },
  {
    name: '04-mechanism', light: true,
    svg: `${text('MÍDELO.', 72, 252, 108, '#101416', 900, 'letter-spacing="-4"')}
      ${text('ANTES DE', 76, 420, 31, '#101416', 800, 'letter-spacing="3"')}
      ${text('OPTIMIZAR.', 76, 475, 56, '#101416', 900, 'letter-spacing="-1"')}
      <rect x="72" y="575" width="936" height="130" fill="#101416"/>
      ${text('01', 110, 655, 38, aqua, 900)}
      ${text('PRESENCIA DE MARCA', 225, 638, 27, white, 800, 'letter-spacing="1"')}
      <rect x="72" y="730" width="936" height="130" fill="${aqua}"/>
      ${text('02', 110, 810, 38, '#101416', 900)}
      ${text('CALIDAD DE CITAS', 225, 793, 27, '#101416', 800, 'letter-spacing="1"')}
      <rect x="72" y="885" width="936" height="130" fill="#101416"/>
      ${text('03', 110, 965, 38, aqua, 900)}
      ${text('BRECHA DE CATEGORÍA', 225, 948, 27, white, 800, 'letter-spacing="1"')}
      ${text('No es un score aislado.', 72, 1120, 28, '#101416', 600)}
      ${text('Es el mapa de la decisión.', 72, 1165, 34, '#101416', 900)}`,
  },
  {
    name: '05-proof', light: false,
    svg: `${text('ESTO ES LO QUE', 72, 238, 70, white, 900, 'letter-spacing="-2"')}
      ${text('VES.', 72, 315, 92, aqua, 900, 'letter-spacing="-3"')}
      ${text('Una lectura concreta de lo que la IA', 72, 395, 28, muted, 500)}
      ${text('responde sobre tu marca hoy.', 72, 436, 28, muted, 500)}`,
    report: true,
  },
  {
    name: '06-decision', light: false,
    svg: `${text('61', 66, 410, 280, aqua, 900, 'letter-spacing="-12"')}
      ${text('/100', 405, 410, 65, white, 700)}
      ${text('NO ES EL FINAL.', 72, 525, 54, white, 900, 'letter-spacing="-1"')}
      <rect x="72" y="620" width="936" height="3" fill="${aqua}"/>
      ${text('Es el punto donde empieza', 72, 745, 39, white, 600)}
      ${text('la decisión.', 72, 800, 58, aqua, 900)}
      <g transform="translate(72 925)"><circle cx="18" cy="18" r="18" fill="${yellow}"/><text x="18" y="26" text-anchor="middle" fill="#101416" font-family="Poppins" font-size="19" font-weight="900">→</text>${text('qué entiende la IA', 58, 27, 28, white, 700)}</g>
      <g transform="translate(72 990)"><circle cx="18" cy="18" r="18" fill="${yellow}"/><text x="18" y="26" text-anchor="middle" fill="#101416" font-family="Poppins" font-size="19" font-weight="900">→</text>${text('qué fuentes te sostienen', 58, 27, 28, white, 700)}</g>
      <g transform="translate(72 1055)"><circle cx="18" cy="18" r="18" fill="${yellow}"/><text x="18" y="26" text-anchor="middle" fill="#101416" font-family="Poppins" font-size="19" font-weight="900">→</text>${text('qué hacer después', 58, 27, 28, white, 700)}</g>`,
  },
  {
    name: '07-close', light: false,
    svg: `${text('¿QUÉ RESPUESTA', 72, 280, 68, white, 900, 'letter-spacing="-2"')}
      ${text('ESTÁ CONSTRUYENDO', 72, 360, 68, aqua, 900, 'letter-spacing="-2"')}
      ${text('TU MARCA?', 72, 440, 68, white, 900, 'letter-spacing="-2"')}
      <rect x="72" y="555" width="936" height="4" fill="${aqua}"/>
      ${text('Descúbrelo con', 72, 690, 33, white, 500)}
      ${text('AI Visibility Grader.', 72, 760, 52, aqua, 900)}
      ${text('Guárdalo para tu próxima revisión.', 72, 915, 30, white, 700)}
      ${text('La respuesta ya está ocupada.', 72, 1060, 27, muted, 600)}
      <path d="M72 1130H1008" stroke="${aqua}" stroke-width="2" stroke-dasharray="4 12"/>`,
    logo: true,
  },
]

async function roundedReport() {
  const source = await sharp(report).resize({ width: 936 }).png().toBuffer()
  const metadata = await sharp(source).metadata()
  return sharp(source).composite([{ input: Buffer.from(`<svg width="936" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg"><rect width="936" height="${metadata.height}" rx="30" fill="white"/></svg>`), blend: 'dest-in' }]).png().toBuffer()
}

async function coverReport() {
  return sharp(report).resize({ width: 620 }).rotate(-7, { background: { r: 7, g: 21, b: 46, alpha: 0 } }).png().toBuffer()
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  const reportPng = await roundedReport()
  const coverReportPng = await coverReport()
  const logoPng = await sharp(logo).resize({ width: 132 }).png().toBuffer()
  const files = []
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const layers = []
    if (slide.name === '01-portada') layers.push({ input: coverReportPng, left: 398, top: 832 })
    if (slide.report) layers.push({ input: reportPng, left: 72, top: 515 })
    if (slide.logo) layers.push({ input: logoPng, left: 474, top: 1200 })
    const output = `${outDir}/${slide.name}.png`
    await sharp(Buffer.from(shell(slide.svg, index + 1, slide.light))).composite(layers).png().toFile(output)
    files.push(output)
  }
  const pdf = await PDFDocument.create()
  for (const file of files) {
    const image = await pdf.embedPng(await fs.readFile(file))
    const page = pdf.addPage([W, H])
    page.drawImage(image, { x: 0, y: 0, width: W, height: H })
  }
  await fs.writeFile(`${outDir}/instagram-carousel-v2.pdf`, await pdf.save())
  await fs.writeFile(`${outDir}/linkedin-document-carousel-v2.pdf`, await pdf.save())
  console.log(files.join('\n'))
}

main().catch(error => { console.error(error); process.exit(1) })
