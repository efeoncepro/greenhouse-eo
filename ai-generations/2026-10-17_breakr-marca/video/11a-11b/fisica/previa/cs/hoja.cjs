// Arma una hoja de contactos numerada con el tiempo de cada cuadro.
const sharp = require('sharp'), fs = require('fs')
const [dir, out, cols, w, h, t0, fps] = process.argv.slice(2); const C = +cols, W = +w, H = +h
const f = fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort()
;(async () => {
  const rows = Math.ceil(f.length / C), comps = []
  for (const [i, p] of f.entries()) {
    const t = (+t0 + i / +fps).toFixed(2)
    const lab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="26"><rect width="${W}" height="26" fill="rgba(0,0,0,.7)"/><text x="6" y="19" font-family="Helvetica" font-size="17" font-weight="700" fill="#fff">${t} s</text></svg>`)
    comps.push({ input: `${dir}/${p}`, left: (i % C) * W, top: Math.floor(i / C) * H }, { input: lab, left: (i % C) * W, top: Math.floor(i / C) * H })
  }
  await sharp({ create: { width: C * W, height: rows * H, channels: 3, background: '#000' } }).composite(comps).png().toFile(out)
})()
