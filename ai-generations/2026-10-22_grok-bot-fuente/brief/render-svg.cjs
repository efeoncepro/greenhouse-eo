// Renderiza SVG oficiales capturados en vivo de x.ai/news/designing-grok-bot (outerHTML tras el JS oficial),
// aplicando las 3 reglas del CSS del módulo: .head fill var(--fg) · .eye fill var(--bg). Ojos = #F5F5F5 (fondo UI).
// Uso: node render-svg.cjs <svg-entrada> <base-salida>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const fs = require('fs')
const [inp, base] = process.argv.slice(2)
;(async () => {
  let s = fs.readFileSync(inp, 'utf8')
  const fg = (s.match(/--fg:([^;"]+)/) || [])[1] || ''
  const color = fg.trim().startsWith('#') ? fg.trim() : '#09090B'
  s = s.replace(/class="grok-bot-module__2wE0bW__svg"/, '')
    .replace(/<svg([^>]*?)style="[^"]*"/, '<svg$1width="2048" height="2048"')
    .replace(/class="grok-bot-module__2wE0bW__head"/g, `fill="${color}"`)
    .replace(/class="grok-bot-module__2wE0bW__eye"/g, 'fill="#F5F5F5"')
    .replace(/var\(--fg\)/g, color).replace(/var\(--bg\)/g, '#F5F5F5').replace(/var\(--gb-ink, currentColor\)/g, color)
  if (!/width="2048"/.test(s)) s = s.replace(/<svg/, '<svg width="2048" height="2048"')
  fs.writeFileSync(`${base}.svg`, s)
  await sharp(Buffer.from(s), { density: 72 }).png().toFile(`${base}-2048.png`)
  console.log(base, color)
})()
