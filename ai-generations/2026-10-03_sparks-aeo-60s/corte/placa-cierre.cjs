// Placa de cierre animada (S10a v2): los cuatro Sparks oficiales entran escalonados con rebote y flotan al compás
// (160 BPM: un compás = 1,5 s); el logo AEO aparece con «Efeonce AEO» y, con «AI Visibility Report», se corre a la
// izquierda y entra el logo del Report. Cada cuadro se dibuja como SVG con transformaciones decimales (sin saltos).
//   PLACA_N=<cuadros> PLACA_AEO=<s> PLACA_AVR=<s> node corte/placa-cierre.cjs <salida.mp4>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const { spawn } = require('child_process')
const A = '/Users/jreye/Documents/axis-design-system/packages/brand-assets/assets'
const OUT = process.argv[2], FPS = 24, N = Number(process.env.PLACA_N || 157)
const T_AEO = Number(process.env.PLACA_AEO || 0.15), T_AVR = Number(process.env.PLACA_AVR || 4.55)
const W = 1920, H = 1080
const clamp = x => Math.max(0, Math.min(1, x))
const outBack = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
const outCubic = x => 1 - Math.pow(1 - x, 3)
const inOut = x => 0.5 - Math.cos(Math.PI * x) / 2
const png64 = async (file, opt) => {
  const b = await sharp(file, { density: 300, limitInputPixels: false }).resize(opt).png().toBuffer()
  const m = await sharp(b).metadata()
  return { href: `data:image/png;base64,${b.toString('base64')}`, w: m.width, h: m.height }
}
;(async () => {
  const sparks = []
  for (const s of ['investigacion', 'contenido', 'crm-datos', 'reportes']) sparks.push(await png64(`${A}/sparks-2d/spark-2d-${s}-dark.svg`, { height: 520 }))
  const aeo = await png64(`${A}/aeo-logo-negative.svg`, { height: 144 })
  const avr = await png64(`${A}/ai-visibility-report-logo-negative.svg`, { height: 128 })
  const aw = aeo.w / 2, vw = avr.w / 2, gap = 60, total = aw + gap + vw
  const aeoX0 = (W - aw) / 2, aeoX1 = (W - total) / 2, avrX1 = aeoX1 + aw + gap
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-video_track_timescale', '12288', OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let f = 0; f < N; f++) {
    const t = f / FPS
    let g = ''
    sparks.forEach((s, i) => {
      const p = clamp((t - i * 0.12) / 0.45), e = outBack(p)
      const sc = (0.6 + 0.4 * e) * 0.5, op = clamp(p * 2.2)
      const bob = 7 * Math.sin((2 * Math.PI * t) / 1.5 + i * 0.9) * clamp((t - 0.6) / 0.5)
      const cx = 300 + i * 340 + (s.w * 0.5) / 2, cy = 250 + 130 + (1 - e) * 70 + bob
      g += `<g opacity="${op.toFixed(3)}" transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${sc.toFixed(4)})"><image href="${s.href}" x="${-s.w / 2}" y="${-s.h / 2}" width="${s.w}" height="${s.h}"/></g>`
    })
    const pa = outCubic(clamp((t - T_AEO) / 0.35)), slide = inOut(clamp((t - T_AVR) / 0.4))
    const ax = aeoX0 + (aeoX1 - aeoX0) * slide
    g += `<g opacity="${pa.toFixed(3)}" transform="translate(${ax.toFixed(2)} ${(640 + (1 - pa) * 24).toFixed(2)}) scale(0.5)"><image href="${aeo.href}" width="${aeo.w}" height="${aeo.h}"/></g>`
    const pv = outCubic(clamp((t - T_AVR - 0.3) / 0.35))
    g += `<g opacity="${pv.toFixed(3)}" transform="translate(${(avrX1 + (1 - pv) * 30).toFixed(2)} 644) scale(0.5)"><image href="${avr.href}" width="${avr.w}" height="${avr.h}"/></g>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#091951"/>${g}</svg>`
    const buf = await sharp(Buffer.from(svg), { limitInputPixels: false }).removeAlpha().raw().toBuffer()
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  await new Promise((r, j) => ff.on('close', c => (c ? j(new Error(`ffmpeg ${c}`)) : r())))
  console.log('ok', OUT, N, 'cuadros')
})()
