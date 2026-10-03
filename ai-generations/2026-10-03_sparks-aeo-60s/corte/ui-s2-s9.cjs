// S2 y S9 (interfaz del chat) a 1920×1080 con acercamiento SUAVE: cada cuadro se dibuja desde el vector con
// escala decimal y se envía crudo a ffmpeg. Reemplaza el zoompan, que redondea el encuadre a píxeles enteros
// y por eso salta. Marcas de la competencia inventadas (verificadas sin empresa homónima en la búsqueda del
// 2026-10-03); Andina Cargo es la marca del cliente en la ficción.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const { spawn } = require('child_process')
const path = require('path')
const OUT = process.env.UI_OUT || path.resolve(__dirname, '../final')
const FRAMES = JSON.parse(process.env.UI_FRAMES || '{}')
const W = 1344, H = 768, K = 1920 / 1344, FPS = 24
const MARCAS = ['Rodavía', 'Kilomar', 'TrazaNorte']
const t = (x, y, s, txt, extra = '') => `<text x="${x}" y="${y}" font-family="Poppins" font-size="${s}" ${/fill=/.test(extra) ? '' : 'fill="#1d2a3a"'} ${extra}>${txt}</text>`
const ui = r => `<rect width="${W}" height="${H}" fill="#eef2f7"/><rect width="270" height="${H}" fill="#e2e8f1"/>
<rect x="36" y="44" width="150" height="12" rx="6" fill="#c3cfdf"/><rect x="36" y="86" width="180" height="10" rx="5" fill="#d0d9e6"/>
<rect x="572" y="56" width="692" height="64" rx="20" fill="#023c70"/>
${t(598, 97, 22, '¿Cuál es el mejor software de gestión de flotas en Chile?', 'fill="#ffffff"')}
${r}
<rect x="330" y="660" width="900" height="64" rx="32" fill="#ffffff" stroke="#c8d4e4" stroke-width="2"/>
<circle cx="1190" cy="692" r="20" fill="#c8d4e4"/>`
const S2 = ui(`${t(330, 200, 22, 'Estas son algunas de las opciones más recomendadas para empresas en Chile:')}
<rect x="330" y="230" width="900" height="200" rx="16" fill="#ffffff" stroke="#d5deea" stroke-width="2"/>
${t(360, 285, 22, `<tspan font-weight="600">1. ${MARCAS[0]}</tspan> — seguimiento GPS y reportes de ruta.`)}
${t(360, 340, 22, `<tspan font-weight="600">2. ${MARCAS[1]}</tspan> — mantenimiento y consumo de combustible.`)}
${t(360, 395, 22, `<tspan font-weight="600">3. ${MARCAS[2]}</tspan> — planificación de despachos.`)}`)
const S9 = ui(`${t(330, 200, 22, 'Para empresas en Chile, estas son opciones recomendadas:')}
<rect x="330" y="230" width="900" height="190" rx="16" fill="#ffffff" stroke="#0375db" stroke-width="3"/>
${t(360, 288, 23, `<tspan font-weight="700" fill="#023c70">1. Andina Cargo</tspan> — gestión de flotas con seguimiento en tiempo real.`)}
<rect x="360" y="330" width="330" height="44" rx="22" fill="#e3eefb"/>
${t(384, 360, 18, 'Fuente · sitio de Andina Cargo', 'font-weight="500" fill="#023c70"')}
${t(330, 480, 21, `2. ${MARCAS[0]} · 3. ${MARCAS[1]}`, 'fill="#4b5a6c"')}`)
// S2 entra cortando sobre el push-in de S1: arranca en movimiento y frena (ease-out).
// S9 es un respiro lento con entrada y salida suaves.
const easeOut = x => 1 - Math.pow(1 - x, 3)
const easeInOut = x => 0.5 - Math.cos(Math.PI * x) / 2
const TOMAS = [
  { file: '02.mp4', svg: S2, foco: [780, 330], z0: 1.0, z1: 1.07, ease: easeOut },
  { file: '09a.mp4', svg: S9, foco: [780, 330], z0: 1.0, z1: 1.06, ease: easeInOut },
]
const render = async ({ file, svg, foco, z0, z1, ease }) => {
  const N = FRAMES[file] || 120
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1920x1080', '-r', `${FPS}`,
    '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-video_track_timescale', '12288', `${OUT}/${file}`], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = 0; f < N; f++) {
    const s = z0 + (z1 - z0) * ease(f / (N - 1))
    const [fx, fy] = foco
    const g = `<g transform="translate(${fx * K} ${fy * K}) scale(${K * s}) translate(${-fx} ${-fy})">${svg}</g>`
    const buf = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${g}</svg>`))
      .removeAlpha().raw().toBuffer()
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  await new Promise((r, j) => ff.on('close', c => (c ? j(new Error(`ffmpeg ${c}`)) : r())))
  console.log('ok', file)
}
;(async () => { for (const x of TOMAS) await render(x) })()
