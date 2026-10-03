// Subtítulos sincronizados con la locución real (Andre, eleven_v4): escribe los SRT y renderiza
// cada cue como PNG transparente 1920×1080 (Poppins Medium, blanco sobre navy 80 %).
// En S2 y S9 (interfaz del chat) el cue sube para no tapar la barra de escritura.
const fs = require('fs'), path = require('path'), sharp = require('sharp')
const R = path.resolve(__dirname, '..')
const CUES = [
  [0.40, 4.70, ['Hoy, tus clientes no buscan:', 'le preguntan a la IA.']],
  [10.40, 14.35, ['Y si la IA no te conoce,', 'no te nombra.']],
  [15.20, 17.60, ['Por eso existen', 'los Sparks de Efeonce.']],
  [17.95, 21.25, ['Agentes que trabajan con tu equipo,', 'bajo tu dirección.']],
  [21.60, 24.30, ['Primero entienden', 'cómo te ven las IA:']],
  [24.75, 27.75, ['qué fuentes leen y de quién', 'hablan en tu lugar.']],
  [28.20, 31.60, ['Después ordenan lo que falta:', 'contenido claro,']],
  [31.60, 35.30, ['datos que se conectan,', 'señales que una IA puede citar.']],
  [36.00, 38.10, ['Y tú decides cada paso.']],
  [46.90, 50.75, ['Ahora, cuando preguntan,', 'la IA ya sabe quién eres.']],
  [52.60, 54.45, ['Efeonce AEO.']],
  [54.55, 57.30, ['Mide tu visibilidad en los', 'motores de respuesta de IA']],
  [57.30, 59.70, ['con nuestro AI Visibility Report.']],
]
const SONIDO = [
  [5.20, 9.60, ['[tecleo y envío]']],
  [12.00, 13.60, ['[gorjeo del Spark]']],
  [40.60, 44.60, ['[tecleo y envío]']],
  [46.00, 46.80, ['[campanita]']],
  [55.40, 57.20, ['[logo sonoro de Efeonce]']],
]
const UI = [[5, 10], [45, 52.5]]
const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
const srt = list => list.sort((a, b) => a[0] - b[0]).map(([a, b, l], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${l.join('\n')}\n`).join('\n')
fs.writeFileSync(`${R}/SUBTITULOS.es.srt`, srt([...CUES]))
fs.writeFileSync(`${R}/SUBTITULOS.es.sdh.srt`, srt([...CUES, ...SONIDO]))
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
;(async () => {
  const out = `${R}/final/subs`; fs.mkdirSync(out, { recursive: true })
  const lista = []
  for (const [i, [a, b, lines]] of CUES.entries()) {
    const fs_ = 46, lh = 62, padX = 34, padY = 18
    const w = Math.max(...lines.map(l => l.length)) * fs_ * 0.56 + padX * 2
    const h = lines.length * lh + padY * 2
    const enUI = UI.some(([x, y]) => a >= x && a < y)
    const y0 = 1080 - (enUI ? 200 : 78) - h, x0 = (1920 - w) / 2
    const txt = lines.map((l, k) => `<text x="960" y="${y0 + padY + lh * k + 46}" text-anchor="middle">${esc(l)}</text>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="#001a33" fill-opacity="0.8"/><g font-family="Poppins" font-weight="500" font-size="${fs_}" fill="#ffffff">${txt}</g></svg>`
    const f = `${out}/cue-${String(i + 1).padStart(2, '0')}.png`
    await sharp(Buffer.from(svg)).png().toFile(f)
    lista.push({ f, a, b })
  }
  fs.writeFileSync(`${out}/cues.json`, JSON.stringify(lista, null, 1))
  console.log('cues', lista.length)
})()
