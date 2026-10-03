// Intro muda para Instagram: pantalla negra con un teléfono vectorial genérico (sin botones) que gira de vertical a
// horizontal con flechas curvas, para pedir que se voltee la pantalla (el video es 16:9). Cuadro a cuadro desde SVG.
//   node corte/intro-girar.cjs <salida.mp4>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const { spawn } = require('child_process')
const OUT = process.argv[2], FPS = 24, DUR = 3.0, N = Math.round(DUR * FPS), W = 1920, H = 1080
const clamp = x => Math.max(0, Math.min(1, x)), inOut = x => 0.5 - Math.cos(Math.PI * x) / 2, outCubic = x => 1 - Math.pow(1 - x, 3)
const BLUE = '#0375db', WHITE = '#ffffff'
// Flecha curva: arco alrededor del teléfono con punta; `p` = cuánto del arco está dibujado (0–1).
const arrow = (cx, cy, r, a0, a1, p, op) => {
  const a = a0 + (a1 - a0) * p, pt = t => [cx + r * Math.cos(t), cy + r * Math.sin(t)]
  const [x0, y0] = pt(a0), [x1, y1] = pt(a), large = Math.abs(a - a0) > Math.PI ? 1 : 0, sweep = a1 > a0 ? 1 : 0
  const dir = a + (sweep ? Math.PI / 2 : -Math.PI / 2), hl = 34, hw = 0.5
  const h1 = [x1 - hl * Math.cos(dir - hw), y1 - hl * Math.sin(dir - hw)], h2 = [x1 - hl * Math.cos(dir + hw), y1 - hl * Math.sin(dir + hw)]
  return p <= 0.01 ? '' : `<g opacity="${op.toFixed(3)}" fill="none" stroke="${BLUE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}"/>
    <path d="M${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}"/></g>`
}
;(async () => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-video_track_timescale', '12288', OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = 0; f < N; f++) {
    const t = f / FPS
    const fadeIn = outCubic(clamp(t / 0.35)), fadeOut = 1 - clamp((t - 2.65) / 0.35)
    const rot = 90 * inOut(clamp((t - 0.95) / 0.7)) // vertical → horizontal, en sentido horario
    const pulse = 1 + 0.04 * Math.sin(Math.PI * clamp((t - 1.75) / 0.5))
    const arrP = outCubic(clamp((t - 0.45) / 0.45)), arrOp = (1 - clamp((t - 1.6) / 0.35)) * fadeIn
    const cx = W / 2, cy = H / 2
    const phone = `<g transform="translate(${cx} ${cy}) rotate(${rot.toFixed(3)}) scale(${pulse.toFixed(4)})">
      <rect x="-118" y="-232" width="236" height="464" rx="44" fill="none" stroke="${WHITE}" stroke-width="12"/>
      <rect x="-30" y="-206" width="60" height="16" rx="8" fill="${WHITE}"/></g>`
    const arrows = arrow(cx, cy, 330, -Math.PI * 0.62, -Math.PI * 0.12, arrP, arrOp) + arrow(cx, cy, 330, Math.PI * 0.38, Math.PI * 0.88, arrP, arrOp)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><g opacity="${(fadeIn * fadeOut).toFixed(3)}">${arrows}${phone}</g></svg>`
    const buf = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer()
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  await new Promise((r, j) => ff.on('close', c => (c ? j(new Error(`ffmpeg ${c}`)) : r())))
  console.log('ok', OUT, N, 'cuadros')
})()
