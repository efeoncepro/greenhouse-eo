const sharp = require('sharp')

const output = 'generated/brand-visibility-grader-social/instagram-1080x1350-v10.png'
const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'

const background = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#09133f"/><stop offset=".56" stop-color="#06385c"/><stop offset="1" stop-color="#00636a"/>
    </linearGradient>
    <radialGradient id="r"><stop stop-color="#29d7c3" stop-opacity=".18"/><stop offset="1" stop-color="#29d7c3" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#b6e8ed" fill-opacity=".15"/></pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <circle cx="950" cy="280" r="500" fill="url(#r)"/>
  <rect width="1080" height="1350" fill="url(#dots)"/>
  <text x="84" y="194" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="3">AI VISIBILITY REPORT</text>
  <text x="84" y="315" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="68" font-weight="700">¿Tu marca aparece</text>
  <text x="84" y="398" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="68" font-weight="800" font-style="italic">cuando la buscan?</text>
  <text x="84" y="474" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="32" font-weight="500">La visibilidad también se mide.</text>
  <line x1="84" y1="535" x2="996" y2="535" stroke="#86e7dc" stroke-opacity=".28"/>
  <text x="84" y="1295" fill="#b2e6e6" fill-opacity=".88" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="1.5">EVIDENCIA REAL · SKY AIRLINE</text>
</svg>`

Promise.all([
  sharp('public/branding/logo-white-email.png').resize({ width: 172 }).png().toBuffer(),
  sharp(report)
    .extract({ left: 0, top: 0, width: 2160, height: 1120 })
    .resize({ width: 936 })
    .png()
    .toBuffer(),
]).then(([logo, reportPng]) => sharp(Buffer.from(background)).composite([
  { input: logo, left: 84, top: 72 },
  { input: reportPng, left: 72, top: 575 },
]).png().toFile(output)).then(() => console.log(output))
