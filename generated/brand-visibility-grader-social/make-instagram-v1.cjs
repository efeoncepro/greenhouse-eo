const sharp = require('sharp')

const output = 'generated/brand-visibility-grader-social/instagram-1080x1350-v8.png'
const report = 'src/lib/artifact-composer/catalogs/deck-axis/assets/product/informe-grader-sky.png'

const background = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#080d3c"/><stop offset=".52" stop-color="#062f59"/><stop offset="1" stop-color="#00606d"/>
    </linearGradient>
    <radialGradient id="r"><stop stop-color="#21d4cf" stop-opacity=".22"/><stop offset="1" stop-color="#21d4cf" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#a4deef" fill-opacity=".18"/></pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <circle cx="870" cy="370" r="480" fill="url(#r)"/>
  <rect width="1080" height="1350" fill="url(#dots)"/>
  <text x="72" y="190" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3">LA MEDICIÓN</text>
  <text x="72" y="300" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="700">El diagnóstico está</text>
  <text x="72" y="385" fill="#7de0d1" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="800" font-style="italic">publicado.</text>
  <text x="72" y="470" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="65" font-weight="700">Y se repite cada mes.</text>
</svg>`

Promise.all([
  sharp('public/branding/logo-white-email.png').resize({ width: 185 }).png().toBuffer(),
  sharp(report).resize(936, 559, { fit: 'contain', background: '#071b45' }).png().toBuffer(),
]).then(([logo, reportPng]) => sharp(Buffer.from(background)).composite([
  { input: logo, left: 72, top: 70 },
  { input: reportPng, left: 72, top: 650 },
]).png().toFile(output)).then(() => console.log(output))
