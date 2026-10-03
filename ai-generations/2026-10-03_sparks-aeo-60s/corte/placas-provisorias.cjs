// Placas PROVISORIAS del primer corte (S2, S9 interfaz, S10 cierre): texto y logos exactos, compuestos.
// La versión final se compone en post con los recursos AEO de AXIS; esto sólo sirve para ver el ritmo.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const fs = require('fs')
const W = 1344, H = 768
const A = '/Users/jreye/Documents/axis-design-system/packages/brand-assets/assets'
const ui = (respuesta) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="100%" height="100%" fill="#eef2f7"/><rect width="270" height="${H}" fill="#e2e8f1"/>
<rect x="36" y="44" width="150" height="12" rx="6" fill="#c3cfdf"/><rect x="36" y="86" width="180" height="10" rx="5" fill="#d0d9e6"/>
<rect x="640" y="56" width="640" height="64" rx="20" fill="#023c70"/>
<text x="664" y="97" font-family="Poppins" font-size="22" fill="#ffffff">¿Cuál es el mejor software de gestión de flotas en Chile?</text>
${respuesta}
<rect x="330" y="660" width="900" height="64" rx="32" fill="#ffffff" stroke="#c8d4e4" stroke-width="2"/>
<circle cx="1190" cy="692" r="20" fill="#c8d4e4"/></svg>`
const s2 = ui(`<text x="330" y="200" font-family="Poppins" font-size="22" fill="#1d2a3a">Estas son algunas de las opciones más recomendadas para empresas en Chile:</text>
<rect x="330" y="230" width="900" height="200" rx="16" fill="#ffffff" stroke="#d5deea" stroke-width="2"/>
<text x="360" y="285" font-family="Poppins" font-size="22" fill="#1d2a3a"><tspan font-weight="600">1. [Marca ficticia A]</tspan> — seguimiento GPS y reportes de ruta.</text>
<text x="360" y="340" font-family="Poppins" font-size="22" fill="#1d2a3a"><tspan font-weight="600">2. [Marca ficticia B]</tspan> — mantenimiento y consumo de combustible.</text>
<text x="360" y="395" font-family="Poppins" font-size="22" fill="#1d2a3a"><tspan font-weight="600">3. [Marca ficticia C]</tspan> — planificación de despachos.</text>`)
const s9 = ui(`<text x="330" y="200" font-family="Poppins" font-size="22" fill="#1d2a3a">Para empresas en Chile, estas son opciones recomendadas:</text>
<rect x="330" y="230" width="900" height="190" rx="16" fill="#ffffff" stroke="#0375db" stroke-width="3"/>
<text x="360" y="288" font-family="Poppins" font-size="23" fill="#1d2a3a"><tspan font-weight="700" fill="#023c70">1. Andina Cargo</tspan> — gestión de flotas con seguimiento en tiempo real.</text>
<rect x="360" y="330" width="420" height="44" rx="22" fill="#e3eefb"/>
<text x="384" y="360" font-family="Poppins" font-size="18" font-weight="500" fill="#023c70">Fuente · [sitio de Andina Cargo, ficticio]</text>
<text x="330" y="480" font-family="Poppins" font-size="21" fill="#4b5a6c">2. [Marca ficticia A] · 3. [Marca ficticia B]</text>`)
;(async () => {
  await sharp(Buffer.from(s2)).png().toFile('S2-placa.png')
  await sharp(Buffer.from(s9)).png().toFile('S9-placa.png')
  const svg = f => fs.readFileSync(`${A}/${f}`)
  const logo = await sharp(svg('efeonce-logo-negative.svg'), { density: 300 }).resize({ width: 300 }).png().toBuffer()
  const aeo = await sharp(svg('aeo-logo-negative.svg'), { density: 300 }).resize({ height: 44 }).png().toBuffer()
  const avr = await sharp(svg('ai-visibility-report-logo-negative.svg'), { density: 300 }).resize({ height: 40 }).png().toBuffer()
  const orbita = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#091951"/>
<circle cx="672" cy="330" r="210" fill="none" stroke="#72ded8" stroke-opacity="0.22" stroke-width="2"/>
<path d="M672 120 A210 210 0 0 1 864 245" stroke="#0375db" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="864" cy="245" r="10" fill="#0375db"/></svg>`)
  const lm = await sharp(logo).metadata(), am = await sharp(aeo).metadata(), vm = await sharp(avr).metadata()
  await sharp(orbita).composite([
    { input: logo, left: Math.round(672 - lm.width / 2), top: Math.round(330 - lm.height / 2) },
    { input: aeo, left: Math.round(672 - am.width - 30), top: 600 },
    { input: avr, left: 702, top: 602 }
  ]).png().toFile('S10-placa.png')
  console.log('ok')
})()
