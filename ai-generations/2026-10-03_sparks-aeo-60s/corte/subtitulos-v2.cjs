// Subtítulos del corte v2: lee final/v2/cues-fuente.json (escrito por audio/mezcla-v2.py con los tiempos reales de la
// voz), escribe los SRT y renderiza cada cue como PNG 1920×1080 (Poppins Medium, blanco sobre navy 80 %).
const fs = require('fs'), path = require('path'), sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const R = path.resolve(__dirname, '..'), OUT = `${R}/final/v2`
const src = JSON.parse(fs.readFileSync(`${OUT}/cues-fuente.json`, 'utf8'))
const ts = s => { const ms = Math.round(s * 1000)
  return `00:${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
const srt = l => l.sort((a, b) => a.a - b.a).map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.lines.join('\n')}\n`).join('\n')
fs.writeFileSync(`${R}/SUBTITULOS-v2.es.srt`, srt([...src.cues]))
fs.writeFileSync(`${R}/SUBTITULOS-v2.es.sdh.srt`, srt([...src.cues, ...src.sonido.map(([a, b, lines]) => ({ a, b, lines }))]))
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
;(async () => {
  fs.mkdirSync(`${OUT}/subs`, { recursive: true })
  const lista = []
  for (const [i, c] of src.cues.entries()) {
    const fz = 46, lh = 62, padX = 34, padY = 18
    const w = Math.max(...c.lines.map(l => l.length)) * fz * 0.55 + padX * 2, h = c.lines.length * lh + padY * 2
    const enUI = src.ui.some(([x, y]) => c.a >= x - 0.05 && c.a < y)
    const y0 = 1080 - (enUI ? 200 : 78) - h, x0 = (1920 - w) / 2
    const txt = c.lines.map((l, k) => `<text x="960" y="${y0 + padY + lh * k + 46}" text-anchor="middle">${esc(l)}</text>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="#001a33" fill-opacity="0.8"/><g font-family="Poppins" font-weight="500" font-size="${fz}" fill="#ffffff">${txt}</g></svg>`
    const f = `${OUT}/subs/cue-${String(i + 1).padStart(2, '0')}.png`
    await sharp(Buffer.from(svg)).png().toFile(f)
    lista.push({ f, a: c.a, b: c.b })
  }
  fs.writeFileSync(`${OUT}/subs/cues.json`, JSON.stringify(lista, null, 1))
  console.log('cues', lista.length)
})()
