const sharp = require('sharp')
const { PDFDocument } = require('pdf-lib')
const fs = require('fs/promises')

const outDir = 'generated/brand-visibility-grader-social/carousel-v1'
const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'
const logo = 'public/branding/logo-white-email.png'
const W = 1080
const H = 1350

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09133f"/><stop offset=".55" stop-color="#06385c"/><stop offset="1" stop-color="#00636a"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#45dfca" stop-opacity=".22"/><stop offset="1" stop-color="#45dfca" stop-opacity="0"/></radialGradient>
  <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#b6e8ed" fill-opacity=".15"/></pattern>
</defs>`

function background(content, slide) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/><circle cx="930" cy="250" r="520" fill="url(#glow)"/><rect width="${W}" height="${H}" fill="url(#dots)"/>
    <text x="84" y="86" fill="#b8eeee" fill-opacity=".8" font-family="Poppins, Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">AI VISIBILITY GRADER</text>
    <text x="996" y="86" text-anchor="end" fill="#b8eeee" fill-opacity=".7" font-family="Poppins, Arial, sans-serif" font-size="16" font-weight="700">${String(slide).padStart(2, '0')} / 07</text>
    ${content}
  </svg>`
}

const slides = [
  {
    name: '01-portada',
    svg: `<text x="84" y="310" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="700">¿Tu marca aparece</text>
      <text x="84" y="394" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="800" font-style="italic">cuando la IA responde?</text>
      <text x="84" y="490" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="31" font-weight="500">La visibilidad se juega en las respuestas.</text>
      <line x1="84" y1="566" x2="996" y2="566" stroke="#86e7dc" stroke-opacity=".3"/>
      <text x="84" y="632" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="1.2">UNA GUÍA EN 7 LÁMINAS</text>`,
    logo: true,
  },
  {
    name: '02-tension',
    svg: `<text x="84" y="280" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="700">Puedes estar online</text>
      <text x="84" y="364" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="800" font-style="italic">y aun así no aparecer.</text>
      <text x="84" y="486" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="32" font-weight="500">La IA puede responder sobre tu categoría</text>
      <text x="84" y="532" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="32" font-weight="500">sin mencionar tu marca.</text>
      <rect x="84" y="666" width="912" height="210" rx="28" fill="#071b45" fill-opacity=".7" stroke="#7de0d1" stroke-opacity=".3"/>
      <text x="126" y="738" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="2">LA BRECHA</text>
      <text x="126" y="806" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="600">Ser encontrable no es lo mismo</text>
      <text x="126" y="850" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="600">que ser la respuesta.</text>`,
  },
  {
    name: '03-reframe',
    svg: `<text x="84" y="286" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="64" font-weight="700">Los motores de respuesta</text>
      <text x="84" y="370" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="64" font-weight="800" font-style="italic">no solo buscan.</text>
      <text x="84" y="490" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="500">Interpretan tu marca.</text>
      <text x="84" y="546" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="500">Comparan alternativas.</text>
      <text x="84" y="602" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="500">Citan fuentes.</text>
      <line x1="84" y1="690" x2="996" y2="690" stroke="#86e7dc" stroke-opacity=".3"/>
      <text x="84" y="766" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="700">La pregunta cambia:</text>
      <text x="84" y="826" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="38" font-weight="700">¿qué respuesta está construyendo</text>
      <text x="84" y="878" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="38" font-weight="700">la IA sobre tu marca?</text>`,
  },
  {
    name: '04-mecanismo',
    svg: `<text x="84" y="270" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="63" font-weight="700">No midas solo</text>
      <text x="84" y="350" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="63" font-weight="800" font-style="italic">si apareces.</text>
      <text x="84" y="474" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="31" font-weight="500">Mide qué entiende, qué cita y dónde</text>
      <text x="84" y="520" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="31" font-weight="500">está la brecha.</text>
      <g transform="translate(84 665)">
        <circle cx="36" cy="36" r="36" fill="#7de0d1"/><text x="36" y="47" text-anchor="middle" fill="#062f59" font-family="Arial" font-size="27" font-weight="700">1</text>
        <text x="96" y="32" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">Presencia de marca</text><text x="96" y="68" fill="#b2e6e6" font-family="Poppins, Arial, sans-serif" font-size="22">¿Apareces en la respuesta?</text>
      </g>
      <g transform="translate(84 815)">
        <circle cx="36" cy="36" r="36" fill="#7de0d1"/><text x="36" y="47" text-anchor="middle" fill="#062f59" font-family="Arial" font-size="27" font-weight="700">2</text>
        <text x="96" y="32" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">Calidad de citas</text><text x="96" y="68" fill="#b2e6e6" font-family="Poppins, Arial, sans-serif" font-size="22">¿Qué fuentes sostienen la respuesta?</text>
      </g>
      <g transform="translate(84 965)">
        <circle cx="36" cy="36" r="36" fill="#7de0d1"/><text x="36" y="47" text-anchor="middle" fill="#062f59" font-family="Arial" font-size="27" font-weight="700">3</text>
        <text x="96" y="32" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">Brecha de categoría</text><text x="96" y="68" fill="#b2e6e6" font-family="Poppins, Arial, sans-serif" font-size="22">¿Te asocia con lo que vendes?</text>
      </g>`,
  },
  {
    name: '05-proof',
    svg: `<text x="84" y="260" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="61" font-weight="700">La métrica no es</text>
      <text x="84" y="340" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="61" font-weight="800" font-style="italic">una opinión.</text>
      <text x="84" y="422" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="29" font-weight="500">Es una lectura de lo que la IA responde hoy.</text>`,
    report: true,
  },
  {
    name: '06-utility',
    svg: `<text x="84" y="286" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="64" font-weight="700">Un score no es</text>
      <text x="84" y="366" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="64" font-weight="800" font-style="italic">el plan.</text>
      <text x="84" y="492" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="33" font-weight="500">La brecha te dice qué revisar primero:</text>
      <g transform="translate(84 620)"><rect width="912" height="84" rx="22" fill="#7de0d1" fill-opacity=".16" stroke="#7de0d1" stroke-opacity=".45"/><text x="32" y="54" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">01 · Qué entiende la IA de tu marca</text></g>
      <g transform="translate(84 735)"><rect width="912" height="84" rx="22" fill="#7de0d1" fill-opacity=".12" stroke="#7de0d1" stroke-opacity=".35"/><text x="32" y="54" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">02 · Qué fuentes usa para sostenerlo</text></g>
      <g transform="translate(84 850)"><rect width="912" height="84" rx="22" fill="#7de0d1" fill-opacity=".08" stroke="#7de0d1" stroke-opacity=".25"/><text x="32" y="54" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700">03 · Qué movimiento hacer después</text></g>`,
  },
  {
    name: '07-close',
    svg: `<text x="84" y="300" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="700">La próxima vez que</text>
      <text x="84" y="382" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="800" font-style="italic">busques tu marca,</text>
      <text x="84" y="500" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="500">no preguntes solo si aparece.</text>
      <text x="84" y="556" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="34" font-weight="500">Pregunta qué respuesta está construyendo.</text>
      <line x1="84" y1="684" x2="996" y2="684" stroke="#86e7dc" stroke-opacity=".3"/>
      <text x="84" y="770" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="700">Guárdalo para tu próxima revisión.</text>
      <text x="84" y="838" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="26" font-weight="500">¿Qué revisarías primero: presencia, citas o categoría?</text>`,
  },
]

async function roundedReport() {
  const source = await sharp(report).resize({ width: 936 }).png().toBuffer()
  const height = Math.round(1290 * 936 / 2160)
  return sharp(source)
    .composite([{ input: Buffer.from(`<svg width="936" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="936" height="${height}" rx="30" fill="white"/></svg>`), blend: 'dest-in' }])
    .png().toBuffer()
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  const reportPng = await roundedReport()
  const logoPng = await sharp(logo).resize({ width: 132 }).png().toBuffer()
  const files = []
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const layers = []
    if (slide.report) layers.push({ input: reportPng, left: 72, top: 485 })
    if (slide.logo) layers.push({ input: logoPng, left: 474, top: 1170 })
    const output = `${outDir}/${slide.name}.png`
    await sharp(Buffer.from(background(slide.svg, index + 1))).composite(layers).png().toFile(output)
    files.push(output)
  }

  const pdf = await PDFDocument.create()
  for (const file of files) {
    const image = await pdf.embedPng(await fs.readFile(file))
    const page = pdf.addPage([W, H])
    page.drawImage(image, { x: 0, y: 0, width: W, height: H })
  }
  await fs.writeFile(`${outDir}/instagram-carousel-v1.pdf`, await pdf.save())
  await fs.writeFile(`${outDir}/linkedin-document-carousel-v1.pdf`, await pdf.save())
  console.log(files.join('\n'))
}

main().catch(error => { console.error(error); process.exit(1) })
