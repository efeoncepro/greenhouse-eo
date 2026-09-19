// Efeonce look — prototipo V0: grade determinístico + medición (look-check).
// Uso:
//   node efeonce-look.mjs grade <in> <out.png> [params.json]
//   node efeonce-look.mjs check <in> [--json]
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import fs from 'node:fs'

const DEFAULTS = {
  blackLift: 0.05,                  // punto negro levantado (p1 >= 16/255)
  blackTint: [0.03, 0.066, 0.118],    // navy #023c70 oscurecido, h ~278 (no teal)
  shadowShift: [-0.002, -0.004, 0.018],  // desvío a azul con leve rojo: h 270-285
  highlightShift: [0.02, 0.008, -0.024],
  globalSat: 0.87,
  skinSat: 0.97,
  accentSat: 1.04,
  skinShadowProtect: 0.65,
  grainSigma: 3.5 / 255,
  seed: 7
}

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }

function rgbToHsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return [h, mx === 0 ? 0 : d / mx, mx]
}

// sRGB (0..1) -> Lab D65
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function rgbToLab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b)
  let x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  let y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  let z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  x = f(x); y = f(y); z = f(z)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

function isSkin(h, s, v) { return h >= 8 && h <= 45 && s >= 0.12 && s <= 0.62 && v >= 0.18 }
function isAccent(h, s, v) { return h >= 28 && h <= 48 && s >= 0.45 && v >= 0.45 }  // ámbar/tungsteno HSV

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

async function grade(inPath, outPath, params = {}) {
  const p = { ...DEFAULTS, ...params }
  const { data: px, info } = await sharp(inPath).removeAlpha().toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(px.length)
  const rnd = mulberry(p.seed)
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
  for (let i = 0; i < px.length; i += 3) {
    let r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255
    const [h, s, v] = rgbToHsv(r, g, b)
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const skin = isSkin(h, s, v) ? 1 : 0
    const accent = !skin && isAccent(h, s, v) ? 1 : 0
    // 1. saturación selectiva
    const sat = accent ? p.accentSat : skin ? p.skinSat : p.globalSat
    r = Y + (r - Y) * sat; g = Y + (g - Y) * sat; b = Y + (b - Y) * sat
    // 2. sombras hacia navy (protegiendo piel)
    const ws = smooth(0.5, 0.02, Y) * (1 - skin * p.skinShadowProtect)
    r += p.shadowShift[0] * ws; g += p.shadowShift[1] * ws; b += p.shadowShift[2] * ws
    // 3. altas luces neutras-cálidas
    const wh = smooth(0.62, 1.0, Y)
    r += p.highlightShift[0] * wh; g += p.highlightShift[1] * wh; b += p.highlightShift[2] * wh
    // 4. punto negro levantado y teñido
    const wb = (1 - clamp(Y)) ** 3
    r += p.blackTint[0] * wb; g += p.blackTint[1] * wb; b += p.blackTint[2] * wb
    // 5. grano luminancia (también actúa como dither)
    const n = gauss() * p.grainSigma
    out[i] = Math.round(clamp(r + n) * 255)
    out[i + 1] = Math.round(clamp(g + n) * 255)
    out[i + 2] = Math.round(clamp(b + n) * 255)
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ compressionLevel: 9 }).toFile(outPath)
  return outPath
}

async function check(inPath) {
  const { data, info } = await sharp(inPath).removeAlpha().toColourspace('srgb').resize({ width: 800, withoutEnlargement: true }).raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true })
  const lum = [], shadowA = [], shadowB = [], hiB = [], chromaNonAccent = []
  let accent = 0, skinShadowB = [], total = 0
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const [L, A, B] = rgbToLab(r, g, b)
    const [h, s, v] = rgbToHsv(r, g, b)
    lum.push(Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 255))
    const C = Math.hypot(A, B), hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
    const skin = isSkin(h, s, v)
    const acc = hue >= 60 && hue <= 85 && C >= 30 && C <= 60 && !skin
    const brandBlue = hue >= 255 && hue <= 295 && C > 20
    if (acc) accent++; else if (!brandBlue) chromaNonAccent.push(C)
    if (L < 25 && L > 3 && C < 14 && !skin) { shadowA.push(A); shadowB.push(B) }
    if (L < 40 && skin) skinShadowB.push(B)
    if (L > 80) hiB.push(B)
    total++
  }
  const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN)
  const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))] }
  const m = {
    p1Lum: pct(lum, 0.01),
    shadowA: mean(shadowA), shadowB: mean(shadowB), shadowShare: shadowB.length / total,
    highlightB: mean(hiB),
    medianChromaNonAccent: pct(chromaNonAccent, 0.5),
    accentArea: accent / total,
    skinShadowB: mean(skinShadowB)
  }
  const rules = [
    ['p1 luminancia ≥ 16 (negro levantado)', m.p1Lum >= 16],
    ['sombras neutras b* entre −9 y −4', !(m.shadowShare > 0.01) || (m.shadowB >= -9 && m.shadowB <= -4)],
    ['sombras neutras a* entre +1 y +4 (no teal)', !(m.shadowShare > 0.01) || (m.shadowA >= 1 && m.shadowA <= 4)],
    ['altas luces b* entre 0 y +6', Number.isNaN(m.highlightB) || (m.highlightB >= 0 && m.highlightB <= 6)],
    ['croma mediano ≤ 22', m.medianChromaNonAccent <= 22],
    ['acento ámbar ≤ 15 % (opcional)', m.accentArea <= 0.15]
  ].map(([k, ok]) => ({ rule: k, ok }))
  return { file: inPath, size: `${info.width}x${info.height}`, metrics: m, rules }
}

const [mode, a, b, c] = process.argv.slice(2)
if (mode === 'grade') {
  const params = c ? JSON.parse(fs.readFileSync(c, 'utf8')) : {}
  console.log(await grade(a, b, params))
} else if (mode === 'check') {
  const r = await check(a)
  if (b === '--json') console.log(JSON.stringify(r, null, 2))
  else {
    console.log(r.file, r.size)
    for (const [k, v] of Object.entries(r.metrics)) console.log(`  ${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`)
    for (const x of r.rules) console.log(`  ${x.ok ? 'OK  ' : 'FUERA'} ${x.rule}`)
  }
} else {
  console.error('uso: grade <in> <out> [params.json] | check <in> [--json]'); process.exit(1)
}
