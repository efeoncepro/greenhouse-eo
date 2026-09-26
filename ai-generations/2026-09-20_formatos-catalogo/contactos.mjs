// Hoja de contactos por formato: 34 planchas sueltas no se revisan, una lámina sí.
// Marca en rojo el borde de la reserva declarada para poder juzgar de un vistazo si el espacio
// quedó donde se pidió — y si lo que hay ahí es una superficie de la escena o un objeto puesto.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const DIR = process.argv[2] ?? 'ai-generations/2026-09-20_formatos-catalogo/rondas/cobertura'
const ANCHO = 620
const COLS = 3

for (const [fmt, sufijo] of [['16:9', '-169-'], ['9:16', '-916-'], ['1:1', '-11-']]) {
  const fs_ = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && f.includes(sufijo)).sort()
  if (!fs_.length) continue

  const miniaturas = []
  for (const f of fs_) {
    const img = sharp(path.join(DIR, f))
    const { width, height } = await img.metadata()
    const h = Math.round((height / width) * ANCHO)
    // línea de la reserva: en 16:9 el costado a 0.42; en vertical la banda superior a 0.30
    const x = fmt === '16:9' ? Math.round(ANCHO * 0.42) : null
    const y = fmt === '16:9' ? null : Math.round(h * 0.30)
    const linea = Buffer.from(
      `<svg width="${ANCHO}" height="${h}">${x
        ? `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#F55D01" stroke-width="3" stroke-dasharray="10 8"/>`
        : `<line x1="0" y1="${y}" x2="${ANCHO}" y2="${y}" stroke="#F55D01" stroke-width="3" stroke-dasharray="10 8"/>`}
       <text x="8" y="${h - 10}" font-family="sans-serif" font-size="19" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${f.replace(sufijo + 'plate.png', '')}</text></svg>`
    )
    miniaturas.push({ buf: await img.resize(ANCHO).composite([{ input: linea }]).png().toBuffer(), h })
  }

  const filas = Math.ceil(miniaturas.length / COLS)
  const hFila = Math.max(...miniaturas.map(m => m.h))
  const G = 10
  const comp = miniaturas.map((m, i) => ({ input: m.buf, left: (i % COLS) * (ANCHO + G) + G, top: Math.floor(i / COLS) * (hFila + G) + G }))
  const out = path.join(DIR, `_contactos-${fmt.replace(':', '')}.png`)
  await sharp({ create: { width: COLS * (ANCHO + G) + G, height: filas * (hFila + G) + G, channels: 3, background: '#111111' } })
    .composite(comp).png().toFile(out)
  console.log(out, '·', miniaturas.length, 'planchas')
}
