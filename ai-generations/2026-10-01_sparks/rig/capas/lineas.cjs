// Seis líneas: la luz azul de Engine (tono 0,53–0,70, saturada y encendida) pasa al tono de la línea; el navy
// (encendido bajo) y los blancos no se tocan. Exporta además la versión web (1000 px, WebP) de cada capa.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const D = __dirname
const LINES = { engine: '#0375db', growth: '#36c8bf', brand: '#ff6500', voice: '#f83902', 'revenue-hubspot': '#e86bd0', 'revenue-salesforce': '#2fb8ff' }
const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1 } return [h, mx ? d / mx : 0, mx] }
const hsv2rgb = (h, s, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6]; return [r * 255, g * 255, b * 255] }
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const files = fs.readdirSync(path.join(D, 'engine')).filter((f) => f.endsWith('.png'))
;(async () => {
  for (const [line, hex] of Object.entries(LINES)) {
    const [th, ts] = rgb2hsv(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))
    const out = path.join(D, 'web', line); fs.mkdirSync(out, { recursive: true })
    for (const f of files) {
      const { data, info } = await sharp(path.join(D, 'engine', f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      if (line !== 'engine') for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue
        const [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2])
        const w = ss(0.50, 0.55, h) * (1 - ss(0.68, 0.73, h)) * ss(0.35, 0.55, s) * ss(0.3, 0.5, v)
        if (w <= 0) continue
        const [r, g, b] = hsv2rgb(th, Math.max(s, ts * 0.9), v)
        data[i] = Math.round(data[i] * (1 - w) + r * w); data[i + 1] = Math.round(data[i + 1] * (1 - w) + g * w); data[i + 2] = Math.round(data[i + 2] * (1 - w) + b * w)
      }
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(1000).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(path.join(out, f.replace('.png', '.webp')))
    }
    const kb = fs.readdirSync(out).reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0) / 1024
    console.log(line, files.length, 'capas', kb.toFixed(0), 'KB')
  }
})()
