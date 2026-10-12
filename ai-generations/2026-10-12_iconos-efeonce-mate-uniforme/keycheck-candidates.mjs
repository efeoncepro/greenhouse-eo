#!/usr/bin/env node
/**
 * Plastilina en volumen (D24) — el método para personas y agentes. El volumen se genera DESDE el vector aprobado;
 * este script hace todo lo que no es el modelo: la referencia, el recorte, el QA y la publicación sellada.
 *
 *   pnpm icons:volume -- refs    --out <dir> [--glyphs a,b]      referencia plana de cada glifo (1024, fondo navy)
 *   pnpm icons:volume -- key     --in <dir> --out <dir> [--glyphs a,b]   recorte por color → PNG con alfa
 *   pnpm icons:volume -- check   --refs <dir> --in <dir> [--glyphs a,b]  QA contra el plano; sale 1 si hay avisos
 *   pnpm icons:volume -- publish --in <dir> [--glyphs a,b]      comprime, copia al paquete y al Lab, y sella
 *
 * La generación corre fuera de AXIS (necesita la llave del proveedor), con el prompt canónico
 * docs/agent-composition/iconography/volume-prompt.txt. Guía: docs/agent-composition/iconography.md §Plastilina en volumen.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { ICON_CATALOG, iconSvg } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js'

const V = GL.icons.volume
const root = new URL('..', import.meta.url).pathname
const [command, ...args] = process.argv.slice(2).filter((a) => a !== '--')
if (!['key', 'check'].includes(command)) throw new Error('Candidate adapter only permits key/check; no refs or publication.')
const arg = (name, fallback = null) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}
const PLASTILINA = JSON.parse(await readFile(new URL('./flat/selection.json', import.meta.url), 'utf8'))
const glyphs = () => {
  const list = arg('--glyphs')
  if (!list) return PLASTILINA
  const wanted = list.split(',').map((s) => s.trim())
  const unknown = wanted.filter((k) => !PLASTILINA.some((e) => e.key === k))
  if (unknown.length) throw new Error(`No son glifos de Plastilina: ${unknown.join(', ')}`)
  return PLASTILINA.filter((e) => wanted.includes(e.key))
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const BG = hex(V.generation.background)

// --- referencia: el ícono plano en respuesta, con gesto si lo tiene, centrado sobre el fondo ---
async function refs() {
  const out = arg('--out')
  if (!out) throw new Error('Falta --out')
  await mkdir(out, { recursive: true })
  for (const e of glyphs()) {
    // El gesto sale de la grilla 48 (overflow visible) y librsvg lo recortaría: se abre el viewBox al lienzo entero,
    // con el ícono a `referencePx` centrado, igual que en el navegador.
    const grid = GL.icons.plastilina.grid
    const pad = ((V.sizePx - V.generation.referencePx) / 2) * (grid / V.generation.referencePx)
    const span = grid + 2 * pad
    const svg = iconSvg({ glyph: e.key, state: V.state, size: V.sizePx, line: V.line, gesture: !!e.gesture })
      .replace(`viewBox="0 0 ${grid} ${grid}"`, `viewBox="${-pad} ${-pad} ${span} ${span}"`)
      .replace(/(<svg[^>]*>)/, `$1<rect x="${-pad}" y="${-pad}" width="${span}" height="${span}" fill="${V.generation.background}"/>`)
    await sharp(Buffer.from(svg), { density: 72 }).flatten({ background: V.generation.background }).png().toFile(path.join(out, `${e.key}.png`))
    console.log(`  ✓ ${e.key}`)
  }
}

// --- recorte por color: alfa por distancia al fondo local y des-mezcla del borde (sin halo, calados abiertos) ---
async function keyOne(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, F = V.key.frameSamplePx
  const px = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < F || y < F || x >= W - F || y >= H - F) { const i = (y * W + x) * 3; px.push([data[i], data[i + 1], data[i + 2]]) }
  const bg = [0, 1, 2].map((c) => px.map((p) => p[c]).sort((a, b) => a - b)[px.length >> 1])
  const out = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const c = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]
    const d = Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2])
    const a = Math.min(1, Math.max(0, (d - V.key.from) / (V.key.to - V.key.from)))
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.max(0, Math.min(255, a > 0 && a < 1 ? (c[k] - (1 - a) * bg[k]) / a : c[k]))
    out[i * 4 + 3] = Math.round(a * 255)
  }
  return { png: await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(), bg }
}
async function key() {
  const input = arg('--in'), out = arg('--out')
  if (!input || !out) throw new Error('Faltan --in y --out')
  await mkdir(out, { recursive: true })
  for (const e of glyphs()) {
    const { png, bg } = await keyOne(path.join(input, `${e.key}.png`))
    await writeFile(path.join(out, `${e.key}.png`), png)
    const off = Math.hypot(bg[0] - BG[0], bg[1] - BG[1], bg[2] - BG[2])
    console.log(`  ✓ ${e.key} · fondo ${bg.join(',')}${off > 12 ? ' · ⚠ el fondo generado se alejó del navy: revisa el recorte' : ''}`)
  }
}

// --- QA contra el plano: silueta normalizada por caja, calados y piezas sueltas ---
const N = 256
async function mask(file, fromAlpha) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, m = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) m[i] = fromAlpha ? (data[i * 4 + 3] > 128 ? 1 : 0) : (Math.hypot(data[i * 4] - BG[0], data[i * 4 + 1] - BG[1], data[i * 4 + 2] - BG[2]) > 60 ? 1 : 0)
  return { m, W, H }
}
function regions({ m, W, H }, value) {
  const seen = new Uint8Array(W * H), min = W * H * 0.00015, found = []
  for (let s = 0; s < W * H; s++) {
    if (m[s] !== value || seen[s]) continue
    const st = [s]; seen[s] = 1; let a = 0, border = false
    while (st.length) {
      const p = st.pop(); a++; const x = p % W, y = (p / W) | 0
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && !seen[q] && m[q] === value && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q) }
    }
    if (a > min) found.push({ a, border })
  }
  return found
}
async function normalized({ m, W, H }) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const buf = Buffer.from(m.map((v) => v * 255))
  const out = await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize(N, N, { fit: 'fill' }).raw().toBuffer()
  return out.map((v) => (v > 127 ? 1 : 0))
}
async function measure(refFile, volFile) {
  const a = await mask(refFile, false), b = await mask(volFile, true)
  const na = await normalized(a), nb = await normalized(b)
  let inter = 0, uni = 0
  for (let i = 0; i < N * N; i++) { inter += na[i] & nb[i]; uni += na[i] | nb[i] }
  const holes = (x) => regions(x, 0).filter((r) => !r.border).length
  const parts = (x) => regions(x, 1).length
  return { iou: +(inter / uni).toFixed(3), holes: [holes(a), holes(b)], parts: [parts(a), parts(b)] }
}
async function check() {
  const refsDir = arg('--refs'), input = arg('--in')
  if (!refsDir || !input) throw new Error('Faltan --refs y --in')
  let flagged = 0
  for (const e of glyphs()) {
    const r = await measure(path.join(refsDir, `${e.key}.png`), path.join(input, `${e.key}.png`))
    const flags = []
    if (r.iou < V.qa.minIoU) flags.push(`silueta ${r.iou} < ${V.qa.minIoU}`)
    if (V.qa.sameHoles && r.holes[0] !== r.holes[1]) flags.push(`calados ${r.holes[0]} → ${r.holes[1]}`)
    if (V.qa.sameParts && r.parts[0] !== r.parts[1]) flags.push(`piezas ${r.parts[0]} → ${r.parts[1]}`)
    if (flags.length) flagged++
    console.log(`  ${flags.length ? '⚠' : '✓'} ${e.key.padEnd(12)} silueta ${r.iou} · calados ${r.holes.join('→')} · piezas ${r.parts.join('→')}${flags.length ? ' — revisar al 100 %: ' + flags.join('; ') : ''}`)
  }
  console.log(flagged ? `\n${flagged} con avisos. Un aviso no es un rechazo: mira cada uno al 100 % contra el plano (el volumen junta piezas que se tocan y la perspectiva baja la silueta). Rechaza si la forma se reinventó, si un calado se volvió relieve o si figura y fondo se invirtieron.` : '\nSin avisos.')
  process.exitCode = flagged ? 1 : 0
}

// --- publicación: comprime, copia al paquete de marca y al Lab, y sella el manifiesto ---
async function publish() {
  const input = arg('--in')
  if (!input) throw new Error('Falta --in')
  const pkgDir = path.join(root, 'packages/brand-assets/assets/volume')
  const labDir = path.join(root, 'apps/lab/public/media/iconography/volume')
  await mkdir(pkgDir, { recursive: true })
  await mkdir(labDir, { recursive: true })
  const manifestPath = path.join(root, 'packages/brand-assets/src/volume-manifest.ts')
  let seals = {}
  try {
    const prev = await readFile(manifestPath, 'utf8')
    seals = JSON.parse(prev.slice(prev.indexOf('{'), prev.lastIndexOf('}') + 1).replace(/ as const$/, ''))
  } catch {}
  for (const e of glyphs()) {
    const png = await sharp(path.join(input, `${e.key}.png`)).resize(V.sizePx, V.sizePx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 }).toBuffer()
    await writeFile(path.join(pkgDir, `${e.key}.png`), png)
    await writeFile(path.join(labDir, `${e.key}.png`), png)
    seals[e.key] = { label: e.label, gesture: !!e.gesture, size: V.sizePx, sha256: createHash('sha256').update(png).digest('hex') }
    console.log(`  ✓ ${e.key} · ${Math.round(png.length / 1024)} KB`)
  }
  const ordered = Object.fromEntries(PLASTILINA.filter((e) => seals[e.key]).map((e) => [e.key, seals[e.key]]))
  await writeFile(manifestPath, `// Generated by scripts/icons-volume.mjs publish — do not edit by hand.\nexport const VOLUME_ICON_SEALS = ${JSON.stringify(ordered, null, 2)} as const\n`)
  console.log(`sellados ${Object.keys(ordered).length} de ${PLASTILINA.length}`)
}

const commands = { refs, key, check, publish }
if (!commands[command]) {
  console.log('AXIS · Plastilina en volumen\n\n  pnpm icons:volume -- refs|key|check|publish …\n\nGuía: docs/agent-composition/iconography.md §Plastilina en volumen')
  process.exit(command ? 2 : 0)
}
commands[command]().catch((err) => { console.error(err.message); process.exit(2) })
