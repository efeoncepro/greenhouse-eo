const sharp = require('sharp')

const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'
const outDir = 'generated/brand-visibility-grader-social'

const defs = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09133f"/><stop offset=".56" stop-color="#06385c"/><stop offset="1" stop-color="#00636a"/></linearGradient>
  <radialGradient id="r"><stop stop-color="#29d7c3" stop-opacity=".2"/><stop offset="1" stop-color="#29d7c3" stop-opacity="0"/></radialGradient>
  <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#b6e8ed" fill-opacity=".15"/></pattern>
</defs>`

const shell = content => `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">${defs}
  <rect width="1080" height="1350" fill="url(#g)"/><circle cx="950" cy="280" r="500" fill="url(#r)"/><rect width="1080" height="1350" fill="url(#dots)"/>
  ${content}
</svg>`

const variants = [
  {
    name: 'instagram-1080x1350-product-a-score-hero-v6',
    content: `
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2.5">AI VISIBILITY GRADER</text>
      <text x="84" y="278" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="57" font-weight="700">Mide cómo aparece</text>
      <text x="84" y="348" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="57" font-weight="700">tu marca en los</text>
      <text x="84" y="418" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="57" font-weight="800" font-style="italic">motores de respuesta</text>
      <text x="84" y="488" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="57" font-weight="800" font-style="italic">con IA.</text>
      <text x="84" y="548" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="500">Qué dicen de tu marca y qué fuentes</text>
      <text x="84" y="586" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="500">sostienen la respuesta.</text>
      <text x="84" y="704" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="116" font-weight="800">61</text>
      <text x="222" y="702" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="600">/100</text>
      <text x="84" y="808" fill="#b2e6e6" font-family="Poppins, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="1.2">PRESENCIA DE MARCA</text>`,
    top: 0,
    height: 900,
    outTop: 855,
  },
  {
    name: 'instagram-1080x1350-product-b-problem-solution-v6',
    content: `
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2.2">MOTORES DE RESPUESTA CON IA</text>
      <text x="84" y="284" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="700">No basta con estar</text>
      <text x="84" y="365" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="800" font-style="italic">online.</text>
      <text x="84" y="430" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="29" font-weight="500">Tu marca también debe aparecer</text>
      <text x="84" y="472" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="29" font-weight="500">en las respuestas.</text>
      <line x1="84" y1="530" x2="996" y2="530" stroke="#86e7dc" stroke-opacity=".28"/>
      <text x="84" y="640" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.2">AI VISIBILITY GRADER</text>`,
    top: 0,
    height: 1204,
    outTop: 685,
  },
  {
    name: 'instagram-1080x1350-product-c-report-open-v6',
    content: `
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2.5">AI VISIBILITY GRADER</text>
      <text x="84" y="286" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="58" font-weight="700">Tu marca, en los</text>
      <text x="84" y="360" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="58" font-weight="800" font-style="italic">motores de respuesta.</text>
      <text x="84" y="428" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="500">Qué dicen de ti y qué fuentes</text>
      <text x="84" y="467" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="500">sostienen la respuesta.</text>
      <rect x="84" y="500" width="270" height="50" rx="25" fill="#7de0d1" fill-opacity=".18" stroke="#7de0d1" stroke-opacity=".6"/>
      <text x="113" y="533" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="19" font-weight="800">PRESENCIA · 61/100</text>
      <rect x="374" y="500" width="300" height="50" rx="25" fill="#ffffff" fill-opacity=".1" stroke="#ffffff" stroke-opacity=".3"/>
      <text x="404" y="533" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="19" font-weight="800">CAPACIDAD DE ACCIÓN · 8/100</text>`,
    top: 0,
    height: 1204,
    outTop: 665,
  },
]

Promise.all(variants.map(async variant => {
  const reportPng = await sharp(report)
    .extract({ left: 0, top: variant.top, width: 2160, height: variant.height })
    .resize({ width: 936 })
    .png()
    .toBuffer()
  const reportHeight = Math.round(variant.height * 936 / 2160)
  const roundedReport = await sharp(reportPng)
    .composite([{ input: Buffer.from(`<svg width="936" height="${reportHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="936" height="${reportHeight}" rx="28" fill="white"/></svg>`), blend: 'dest-in' }])
    .png()
    .toBuffer()
  const output = `${outDir}/${variant.name}.png`
  await sharp(Buffer.from(shell(variant.content)))
    .composite([{ input: roundedReport, left: 72, top: variant.outTop }])
    .png()
    .toFile(output)
  return output
})).then(files => files.forEach(file => console.log(file)))
