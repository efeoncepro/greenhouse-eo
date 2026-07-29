const sharp = require('sharp')

const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'
const outDir = 'generated/brand-visibility-grader-social'

const baseDefs = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09133f"/><stop offset=".56" stop-color="#06385c"/><stop offset="1" stop-color="#00636a"/></linearGradient>
    <radialGradient id="r"><stop stop-color="#29d7c3" stop-opacity=".2"/><stop offset="1" stop-color="#29d7c3" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#b6e8ed" fill-opacity=".15"/></pattern>
  </defs>`

const background = (body, footer = 'EVIDENCIA REAL · SKY AIRLINE') => `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">${baseDefs}
  <rect width="1080" height="1350" fill="url(#g)"/><circle cx="950" cy="280" r="500" fill="url(#r)"/><rect width="1080" height="1350" fill="url(#dots)"/>
  ${body}
  <text x="84" y="1295" fill="#b2e6e6" fill-opacity=".88" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="1.5">${footer}</text>
</svg>`

const alternatives = [
  {
    output: `${outDir}/instagram-1080x1350-product-a-score-hero.png`,
    svg: background(`
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="3">AI VISIBILITY REPORT</text>
      <text x="84" y="300" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="700">Mide tu visibilidad</text>
      <text x="84" y="382" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="800" font-style="italic">en la IA.</text>
      <text x="84" y="447" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="500">Un diagnóstico, no una suposición.</text>
      <text x="84" y="550" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="126" font-weight="800">61</text>
      <text x="230" y="548" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="32" font-weight="600">/100</text>
      <text x="84" y="586" fill="#b2e6e6" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="1.4">PRESENCIA EN IA</text>
      <line x1="84" y1="626" x2="996" y2="626" stroke="#86e7dc" stroke-opacity=".28"/>`),
    crop: { top: 0, height: 920, width: 936, left: 72, topOut: 660 },
  },
  {
    output: `${outDir}/instagram-1080x1350-product-b-problem-solution.png`,
    svg: background(`
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="3">LA NUEVA VISIBILIDAD</text>
      <text x="84" y="300" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="700">No basta con estar</text>
      <text x="84" y="382" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="66" font-weight="800" font-style="italic">online.</text>
      <text x="84" y="447" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="500">Tu marca también debe aparecer</text>
      <text x="84" y="490" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="500">en las respuestas.</text>
      <line x1="84" y1="550" x2="996" y2="550" stroke="#86e7dc" stroke-opacity=".28"/>
      <text x="84" y="604" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="2">DIAGNÓSTICO DE PRODUCTO</text>`),
    crop: { top: 0, height: 1120, width: 936, left: 72, topOut: 610 },
  },
  {
    output: `${outDir}/instagram-1080x1350-product-c-report-open.png`,
    svg: background(`
      <text x="84" y="164" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="3">AI VISIBILITY REPORT</text>
      <text x="84" y="295" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="62" font-weight="700">Tu marca.</text>
      <text x="84" y="372" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="62" font-weight="800" font-style="italic">Vista por la IA.</text>
      <text x="84" y="438" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="30" font-weight="500">Abre el reporte. Encuentra la brecha.</text>
      <rect x="84" y="500" width="286" height="54" rx="27" fill="#7de0d1" fill-opacity=".16" stroke="#7de0d1" stroke-opacity=".55"/>
      <text x="113" y="535" fill="#baf8ed" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700">PRESENCIA 61/100</text>
      <rect x="390" y="500" width="300" height="54" rx="27" fill="#ffffff" fill-opacity=".1" stroke="#ffffff" stroke-opacity=".28"/>
      <text x="418" y="535" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700">ACCIÓN 8/100</text>`),
    crop: { top: 0, height: 1120, width: 936, left: 72, topOut: 590 },
  },
]

Promise.all(alternatives.map(async ({ output, svg, crop }) => {
  const reportPng = await sharp(report)
    .extract({ left: crop.left === 72 ? 0 : crop.left, top: crop.top, width: 2160, height: crop.height })
    .resize({ width: crop.width })
    .png()
    .toBuffer()
  await sharp(Buffer.from(svg)).composite([{ input: reportPng, left: crop.left, top: crop.topOut }]).png().toFile(output)
  return output
})).then(files => files.forEach(file => console.log(file)))
