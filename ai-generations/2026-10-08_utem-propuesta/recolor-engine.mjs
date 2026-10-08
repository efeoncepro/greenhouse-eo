// Lleva el turquesa de una lámina compuesta al azul Engine con un peso continuo por tono (sin umbral de saturación),
// para que los degradados suaves no queden con manchas. Tonos 160–196° van a 208°; 140–160° y 196–206° hacen la rampa.
// Uso: node recolor-engine.mjs <entrada.png> <salida.png>
import sharp from 'sharp'
const [inp, out] = process.argv.slice(2)
// El borde inferior de la rampa se puede subir (RECOLOR_LO=155) para no tocar verdes de marca (Greenhouse).
const LO0 = +(process.env.RECOLOR_LO || 140), LO1 = LO0 + 12
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b); let h = 0, s = 0; const l = (M + m) / 2
  if (M !== m) { const d = M - m; s = l > 0.5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60 } return [h, s, l] }
const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }
const hsl2rgb = (h, s, l) => { h /= 360; if (s === 0) return [l, l, l].map(v => Math.round(v * 255)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => Math.round(v * 255)) }
for (let i = 0; i < data.length; i += 3) {
  const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2])
  const w = ss(LO0, LO1, h) * (1 - ss(196, 206, h)) * ss(0.02, 0.08, s)
  if (w <= 0) continue
  const [r, g, b] = hsl2rgb(h + (208 - h) * w, s, l); data[i] = r; data[i + 1] = g; data[i + 2] = b
}
await sharp(data, { raw: info }).png().toFile(out)
