// Placas finales a 1920x1080: S2 y S9 (interfaz exacta) desde el mismo SVG de las provisorias, y S10a
// (Efeonce AEO · AI Visibility Report con el plantel de Sparks oficiales). El cierre S10b es la animación
// oficial del logo (reveal sin voz, kit de identidad sonora), no se rehace.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const fs = require('fs')
const A = '/Users/jreye/Documents/axis-design-system/packages/brand-assets/assets'
const src = fs.readFileSync('placas-provisorias.cjs', 'utf8')
;(async () => {
  // Re-render de S2/S9 desde los PNG provisorios no sirve (raster); se re-ejecuta el SVG a mayor densidad.
  const mod = src.replace(/await sharp\(Buffer\.from\((s2|s9)\)\)\.png\(\)\.toFile\('(S\d)-placa\.png'\)/g,
    "await sharp(Buffer.from($1), { density: 72 * 1920 / 1344 }).resize(1920, 1080, { fit: 'cover' }).png().toFile('$2-placa-1080.png')")
    .replace(/const s10start[\s\S]*$/, '')
  fs.writeFileSync('/tmp/_placas_tmp.cjs', mod.split("const svg = f =>")[0] + "})()\n")
  require('child_process').execSync('node /tmp/_placas_tmp.cjs', { cwd: process.cwd(), stdio: 'inherit' })
  const W = 1920, H = 1080
  const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#091951"/></svg>`)
  const sparks = ['investigacion', 'contenido', 'crm-datos', 'reportes']
  const capas = []
  for (let i = 0; i < 4; i++) {
    const b = await sharp(`${A}/sparks-2d/spark-2d-${sparks[i]}-dark.svg`, { density: 300, limitInputPixels: false }).resize({ height: 260 }).png().toBuffer()
    capas.push({ input: b, left: 300 + i * 340, top: 250 })
  }
  const aeo = await sharp(`${A}/aeo-logo-negative.svg`, { density: 200, limitInputPixels: false }).resize({ height: 72 }).png().toBuffer()
  const avr = await sharp(`${A}/ai-visibility-report-logo-negative.svg`, { density: 200, limitInputPixels: false }).resize({ height: 64 }).png().toBuffer()
  const am = await sharp(aeo).metadata(), vm = await sharp(avr).metadata()
  const gap = 60, total = am.width + gap + vm.width
  capas.push({ input: aeo, left: Math.round((W - total) / 2), top: 640 })
  capas.push({ input: avr, left: Math.round((W - total) / 2) + am.width + gap, top: 644 })
  await sharp(fondo).composite(capas).png().toFile('S10a-placa-1080.png')
  console.log('ok')
})()
