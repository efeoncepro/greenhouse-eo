#!/usr/bin/env node
// Glitch — diseño sonoro «el sonido de Efeonce, con un bug». PROPUESTA, sólo Glitch (nunca en piezas de Efeonce).
//
// El motivo de Efeonce (Mi · Mi · Mi → La) con la tercera nota que falla: se rompe en bytes y se rearma como la
// manzana (La, campana de Growth, el único golpe grave). Cada sonido cae en un cuadro del piloto de motion
// (efeonce-brand-workshop · tools/glitch-motion · pieces.mjs TIMING y overlays.mjs), a 30 fps.
//
//   node glitch-sfx.mjs --intensity a|b --outdir <dir>
//     → apertura.wav (4 s) · cierre.wav (3 s) · bucle.wav (cierre + apertura, 7 s) · animatic.wav (45,2 s)
//
// a = contenida · b = más punch. Síntesis determinística propia (sin muestras ni modelos). Principios:
// la falla está afinada (todo en La mayor) · sin chiptune, módem, máquina de escribir ni vinilo · un solo golpe
// grave por aparición de la manzana · nunca sobre la voz del host · la firma de Efeonce no suena · el corte es
// silencio digital, no un whoosh.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { SR, note, db, createMix, biquad } from './dsp.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const INT = opt('--intensity', 'a')
const OUT = path.resolve(opt('--outdir', `glitch-${INT}`))
const B = INT === 'b'
mkdirSync(OUT, { recursive: true })

const f = n => n / 30
const FR = 1 / 30

// Azar determinístico (mulberry32): mismas decisiones en cada render.
const rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const R = rng(1717)

// Alturas: todo en La mayor. Pentatónica aguda para los bytes.
const E5 = note('E5'), A5 = note('A5'), A4 = note('A4'), E6 = note('E6'), A6 = note('A6')
const PENTA = ['E5', 'F#5', 'A5', 'B5', 'C#6', 'E6', 'F#6', 'A6', 'B6', 'C#7', 'E7'].map(note)
const HIGH = ['E6', 'F#6', 'A6', 'B6', 'C#7', 'E7'].map(note)

// ── Segmentos mono ──────────────────────────────────────────────────────────────────────────────────────
const seg = len => new Float64Array(Math.max(1, Math.round(len * SR)))
const fadeEdges = (x, inMs = 1, outMs = 4) => {
  const a = Math.round((inMs / 1000) * SR), b = Math.round((outMs / 1000) * SR)
  for (let i = 0; i < Math.min(a, x.length); i++) x[i] *= i / a
  for (let i = 0; i < Math.min(b, x.length); i++) x[x.length - 1 - i] *= i / b
  return x
}
// Reducción de resolución: cuantiza a `bits` y sostiene cada `hold` muestras (baja la frecuencia de muestreo).
const crush = (x, bits, hold = 1) => {
  const q = 2 ** (bits - 1)
  let h = 0
  for (let i = 0; i < x.length; i++) { if (i % hold === 0) h = Math.round(x[i] * q) / q; x[i] = h }
  return x
}
// Punto: seno puro con un leve segundo parcial. Es la ventana, en digital.
const blip = (fr, { len = 0.2, decay = 26, h2 = 0.14, attack = 0.0012, bend = 0 } = {}) => {
  const x = seg(len)
  let p1 = 0, p2 = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, fq = fr * 2 ** ((bend * Math.exp(-t * 45)) / 12)
    p1 += (2 * Math.PI * fq) / SR; p2 += (4 * Math.PI * fq) / SR
    x[i] = (Math.sin(p1) + h2 * Math.sin(p2)) * Math.min(1, t / attack) * Math.exp(-t * decay)
  }
  return fadeEdges(x)
}
// Byte: grano afinado con ventana de Hann.
const grain = (fr, len = 0.012) => {
  const x = seg(len)
  for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * fr * i) / SR) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (x.length - 1)))
  return x
}
const noiseSeg = (len, lo, hi, decay, rnd = R) => {
  const x = seg(len)
  for (let i = 0; i < x.length; i++) x[i] = (rnd() * 2 - 1) * Math.exp((-i / SR) * decay)
  biquad(x, 'highpass', lo); biquad(x, 'lowpass', hi)
  return fadeEdges(x, 0.5, 3)
}
// Campana de la manzana (La, timbre de Growth), como segmento para poder romperla.
const bellSeg = (fr, len = 2.2, decayMul = 1) => {
  const P = [[1, 1, 1.4], [2.01, 0.34, 2.2], [3.0, 0.16, 3.5], [4.2, 0.07, 5]].map(([m, a, d]) => [m, a, d * decayMul])
  const x = seg(len), ph = P.map(() => 0)
  for (let i = 0; i < x.length; i++) {
    const t = i / SR
    let s = 0
    P.forEach(([m, a, d], k) => { ph[k] += (2 * Math.PI * fr * m) / SR; s += Math.sin(ph[k]) * a * Math.exp(-t * d) })
    x[i] = s * Math.min(1, t / 0.003) * 0.7
  }
  return fadeEdges(x, 0, 60)
}
// Peso de una palabra que cae de golpe: cuerpo medio (no grave), para que el único grave sea de la manzana.
const thump = (from = 230, to = 120, len = 0.12, decay = 22) => {
  const x = seg(len)
  let p = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / SR
    p += (2 * Math.PI * (to + (from - to) * Math.exp(-t * 55))) / SR
    x[i] = Math.sin(p) * Math.min(1, t / 0.0015) * Math.exp(-t * decay)
  }
  return fadeEdges(x)
}
// Clic del canal del micrófono (abre o cierra): transiente breve, seco.
const click = () => {
  const x = seg(0.045)
  for (let i = 0; i < x.length; i++) {
    const t = i / SR
    x[i] = 0.7 * Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 520) + 0.35 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 90)
  }
  const n = noiseSeg(0.006, 1200, 9000, 900)
  for (let i = 0; i < n.length; i++) x[i] += n[i] * 0.8
  return fadeEdges(x, 0.2, 5)
}
// Trazo de plumón (Guttery): el único sonido orgánico, la mano del narrador.
const marker = len => {
  const x = seg(len), r = rng(99)
  for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1
  biquad(x, 'bandpass', 2900, 1.1); biquad(x, 'highpass', 900)
  // Trazos: cada 70–120 ms, un gesto con ataque y caída.
  let t = 0
  const strokes = []
  while (t < len) { const d = 0.06 + r() * 0.05; strokes.push([t, d, 0.6 + 0.4 * r()]); t += d + 0.01 + r() * 0.03 }
  for (let i = 0; i < x.length; i++) {
    const ti = i / SR
    let e = 0
    for (const [s0, d, a] of strokes) if (ti >= s0 && ti < s0 + d) e = Math.max(e, a * Math.sin((Math.PI * (ti - s0)) / d))
    x[i] *= e * 2.2
  }
  return fadeEdges(x, 2, 6)
}
// Tono que tiembla: la altura y el volumen saltan por cuadro (30 fps) y la resolución cae. Es el punto (o la
// manzana) antes de romperse.
const tremble = (fr, len, { jitter = 25, bitsFrom = 12, bitsTo = 6 } = {}) => {
  const x = seg(len), r = rng(7), frames = Math.ceil(len / FR) + 1
  const J = Array.from({ length: frames }, (_, k) => ({ c: (r() * 2 - 1) * jitter * (0.3 + (0.7 * k) / frames), a: 0.55 + 0.45 * r() }))
  let p1 = 0, p2 = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, k = Math.floor(t / FR), u = t / len, fq = fr * 2 ** (J[k].c / 1200)
    p1 += (2 * Math.PI * fq) / SR; p2 += (2 * Math.PI * fq * 3) / SR
    x[i] = (Math.sin(p1) + 0.12 * Math.sin(p2)) * J[k].a * (0.08 + 0.92 * u ** 1.6)
  }
  // Resolución que cae por tramos.
  const n = 6
  for (let s = 0; s < n; s++) {
    const a = Math.floor((s / n) * x.length), b = Math.floor(((s + 1) / n) * x.length)
    const part = x.subarray(a, b)
    crush(part, Math.round(bitsFrom + ((bitsTo - bitsFrom) * s) / (n - 1)), 1 + s)
  }
  biquad(x, 'lowpass', 7000)
  return fadeEdges(x, 20, 2)
}

// ── Mezcla ──────────────────────────────────────────────────────────────────────────────────────────────
const LEVEL = { dot: -14, grain: B ? -22 : -25, tick: -31, click: B ? -8 : -10, thump: B ? -7 : -11, tear: B ? -15 : -19 }

// Desgarro (falla RGB y en franjas): por cuadro, una franja brillante a un lado y su sombra desafinada al otro.
const tear = (M, t0, frames, level = LEVEL.tear) => {
  for (let k = 0; k < frames; k++) {
    const t = t0 + k * FR, side = k % 2 ? 1 : -1, c = 1800 + R() * 4800
    M.addMono(t, noiseSeg(0.026, c * 0.7, c * 1.4, 60), 0.75 * side, 0.05, db(level))
    const z = blip(E6 * 2 ** ((R() * 2 - 1) * 0.3), { len: 0.05, decay: 70, bend: -7 })
    M.addMono(t, z, -0.8 * side, 0.03, db(level - 7))
    M.addMono(t + 0.002, blip(E6 * 2 ** (40 / 1200), { len: 0.05, decay: 70, bend: -7 }), 0.8 * side, 0.03, db(level - 9))
  }
}
// Tecleo: ticks digitales mínimos, uno por letra, con un grano afinado muy bajo.
const typing = (M, t0, t1, count, pan = 0) => {
  const step = (t1 - t0) / Math.max(1, count - 1)
  for (let i = 0; i < count; i++) {
    const t = t0 + i * step
    M.tick(t, LEVEL.tick + (R() * 4 - 2), 5200 + R() * 2600, pan + (R() * 0.2 - 0.1), 420)
    M.addMono(t, grain(E6 * (i % 3 === 2 ? 1.5 : 1), 0.01), pan, 0.05, db(-42))
  }
}
// Nube de bytes. dir: 'out' se dispersan (densidad cae) · 'in' se arman (densidad y altura suben, la resolución
// vuelve) · 'implode' vuelven hacia adentro (la altura baja, la resolución se pierde).
const bytes = (M, t0, t1, count, dir, { center = 0.2, level = LEVEL.grain } = {}) => {
  for (let k = 0; k < count; k++) {
    const u = k / (count - 1)
    let tu, fr, bits, pan, lv = level
    if (dir === 'out') { tu = R() ** 2; fr = HIGH[Math.floor(R() * HIGH.length)]; bits = 5; pan = center + (R() * 2 - 1) * 0.9; lv -= 6 * tu }
    else if (dir === 'in') { tu = u ** 0.8; fr = PENTA[Math.min(PENTA.length - 1, Math.floor(u * PENTA.length))]; bits = Math.round(4 + 8 * u); pan = center + (R() * 2 - 1) * 0.9 * (1 - u); lv += 4 * u }
    else { tu = u ** 0.6; fr = PENTA[Math.max(0, PENTA.length - 1 - Math.floor(u * PENTA.length))]; bits = Math.round(12 - 7 * u); pan = center + (R() * 2 - 1) * 0.9 * (1 - u); lv += 3 * u }
    const g = crush(grain(fr * 2 ** ((R() * 2 - 1) * 0.12 / 12), 0.008 + R() * 0.009), bits, bits < 7 ? 3 : 1)
    M.addMono(t0 + tu * (t1 - t0), g, Math.max(-1, Math.min(1, pan)), 0.22, db(lv + (R() * 4 - 2)))
  }
}
// Repetición de búfer que se acelera: el punto que se rompe.
const stutter = (M, t0, src, slicesMs, level, bits = 4, hold = 6) => {
  let t = t0
  slicesMs.forEach((ms, k) => {
    const len = Math.round((ms / 1000) * SR), s = fadeEdges(src.slice(0, len), 0.3, 1.5)
    if (k >= 2) crush(s, bits, hold)
    M.addMono(t, s, k % 2 ? 0.55 : -0.2, 0.08, db(level - k * 0.6))
    t += ms / 1000
  })
  return t
}
// El golpe de la manzana: el único grave. Campana La (Growth) + cuerpo + halo breve + destello verde + eco.
const appleHit = (M, t, { echoAt, level = B ? -7 : -9, crushedEcho = true, pan = 0.15 } = {}) => {
  M.I.impact(t, level)
  M.addMono(t, bellSeg(A5, 1.6, 2.2), pan, 0.4, db(B ? -5.5 : -7))
  M.addMono(t, bellSeg(A4, 1.0, 2.2), pan, 0.25, db(-19))
  M.I.pad({ t0: t, t1: t + (B ? 0.35 : 0.25), notes: ['A4', 'C#5', 'E5'], level: B ? -26 : -29, attack: 0.012, release: 0.55 })
  ;[note('A7'), note('E7'), note('C#7')].forEach((fr, i) => M.addMono(t + i * 0.012, grain(fr, 0.03), pan + 0.2 * (i - 1), 0.3, db(-31)))
  if (echoAt != null) {
    // El eco del pulso (0,55 del golpe). En Glitch, el eco vuelve con la falla.
    const e = bellSeg(A5, 0.8, 2.6)
    if (crushedEcho) crush(e, B ? 5 : 7, B ? 4 : 2)
    M.addMono(echoAt, e, pan + 0.3, 0.4, db((B ? -5.5 : -7) - 5.2))
  }
}

// ── Piezas (tiempos del piloto v2, relativos a T0) ──────────────────────────────────────────────────────
function apertura(M, T0) {
  const at = x => T0 + x
  // 1. Los tres puntos escriben (f2 + 0,1 s × i).
  ;[0, 1, 2].forEach(i => M.addMono(at(f(2) + 0.1 * i), blip(E5), [-0.25, 0, 0.25][i], 0.15, db(LEVEL.dot)))
  // 2. La cámara se acerca y el tercer punto se hincha y tiembla (f13 → f24).
  M.addMono(at(f(13)), tremble(E5, f(24) - f(13), { jitter: B ? 45 : 28, bitsTo: B ? 4 : 6 }), 0.25, 0.08, db(B ? -15 : -18))
  // 3. GOLPE 1 (f24): el punto se rompe en bytes. Repetición de búfer, destello y desgarro estéreo.
  const src = blip(E5, { len: 0.1, decay: 8 })
  stutter(M, at(f(24)), src, B ? [42, 42, 28, 28, 18, 18, 12, 12, 8, 8, 5, 5, 3] : [40, 30, 22, 16, 11, 8, 5], B ? -10 : -13)
  M.addMono(at(f(24)), noiseSeg(0.03, 2500, 12000, 90), 0, 0.1, db(B ? -12 : -16))
  tear(M, at(f(24)), 2)
  if (B) M.addMono(at(f(24)), thump(180, 95, 0.14, 20), 0.1, 0.1, db(-13))
  // 4. Los bytes flotan (f24 → f35) y 5. se arman fila por fila, de abajo hacia arriba (f35 → f47).
  bytes(M, at(f(24)) + 0.02, at(f(35)), B ? 44 : 32, 'out', { center: 0.25 })
  bytes(M, at(f(35)), at(f(47)) + 0.01, B ? 48 : 38, 'in', { center: 0.2 })
  // 6. GOLPE 2 (f48, cuadro de sincronía): la manzana. Eco en f52.
  appleHit(M, at(f(48)), { echoAt: at(f(52)) })
  // 7. «El micrófono» se teclea (f56 → f68, 12 letras).
  typing(M, at(f(56)), at(f(68)), 12, -0.05)
  // 8. GOLPE 3 (f69): «se abre» cae de golpe; el canal del micrófono se abre (el aire entra en roomTone()).
  M.addMono(at(f(69)), click(), 0, 0.05, db(LEVEL.click))
  M.addMono(at(f(69)), thump(), 0, 0.08, db(LEVEL.thump))
  tear(M, at(f(69)) + 0.08, B ? 4 : 3)
  // 9. El wordmark sube (f78) y el número se decodifica (f80 → f86) y se asienta en La.
  M.addMono(at(f(78)), grain(E6, 0.02), -0.1, 0.2, db(-31)); M.addMono(at(f(78)) + 0.06, grain(A6, 0.02), 0.1, 0.2, db(-31))
  for (let k = 0; k < 6; k++) M.addMono(at(f(80 + k)), crush(grain(note('A5') * 2 ** (Math.floor(R() * 24) / 12), 0.018), 5, 3), 0.2, 0.1, db(-29))
  M.addMono(at(f(86)), blip(A6, { len: 0.16, decay: 30 }), 0.2, 0.2, db(-23))
  // 11. Salida (f105): corte con falla; en f108 todo se va a silencio digital (gate en el render).
  tear(M, at(f(105)), 3)
}

function cierre(M, T0) {
  const at = x => T0 + x
  // 1. GOLPE 1 (f6): «se cierra.» cae de golpe; el canal del micrófono se cierra (el aire se corta en roomTone()).
  M.addMono(at(f(6)), click(), 0, 0.05, db(LEVEL.click))
  M.addMono(at(f(6)), thump(210, 115), 0, 0.08, db(LEVEL.thump))
  tear(M, at(f(6)) + 0.08, 3)
  // 2. La muletilla en Guttery se escribe (f14 → f26): el trazo del plumón.
  M.addMono(at(f(14)), marker(f(26) - f(14)), 0.1, 0.04, db(B ? -27 : -30))
  // La invitación aparece (f21). La firma de Efeonce (f26 → f34) no suena: limpia.
  M.addMono(at(f(21)), blip(E6, { len: 0.12, decay: 40, bend: -2 }), 0, 0.15, db(-27))
  // 3. GOLPE 2 (f57): se corta con falla. La firma sólo se corta.
  tear(M, at(f(57)), 3)
  // 4. La manzana tiembla (f60 → f66) e implosiona en bytes hacia el tercer punto (f66 → f74).
  M.addMono(at(f(60)), tremble(A5, f(66) - f(60), { jitter: B ? 45 : 30, bitsTo: 6 }), 0.25, 0.08, db(B ? -17 : -20))
  bytes(M, at(f(66)), at(f(74)) - 0.01, B ? 46 : 34, 'implode', { center: 0.25 })
  if (B) {
    // La respuesta vuelve hacia adentro: la campana al revés, hasta el punto.
    const rb = bellSeg(A5, f(74) - f(62)).reverse()
    M.addMono(at(f(62)), fadeEdges(rb, 30, 3), 0.25, 0.2, db(-17))
  }
  // 5. GOLPE 3 (f74): el tercer punto vuelve con destello. Queda el primer cuadro de la apertura (bucle).
  M.addMono(at(f(74)), blip(E5, { len: 0.22 }), 0.25, 0.15, db(-12))
  M.addMono(at(f(74)), noiseSeg(0.02, 3000, 12000, 120), 0.25, 0.05, db(-22))
  if (B) M.addMono(at(f(74)), thump(200, 130, 0.08, 30), 0.2, 0.05, db(-17))
}

// Kit de overlays del animatic (tiempos de kit.mjs + overlays.mjs, sin la transición de bytes).
function cabecera(M, T0, n) {
  M.tick(T0 + f(3), -30, 6000, -0.4, 380)
  if (n === 1) {
    M.addMono(T0 + f(6), grain(A6, 0.02), -0.4, 0.15, db(-33))
    M.addMono(T0 + f(13), blip(E5, { len: 0.2 }), -0.4, 0.12, db(-16)) // noticia 1 = primer Mi
    M.addMono(T0 + f(13), crush(grain(E6, 0.03), 5, 3), -0.4, 0.05, db(-30))
    return
  }
  // El número se decodifica (f4 → f7) y se llena el segmento (f6): noticia 2 = segundo Mi · noticia 3 = el Mi que falla.
  for (let k = 0; k < 3; k++) M.addMono(T0 + f(4 + k), crush(grain(note('A5') * 2 ** (Math.floor(R() * 24) / 12), 0.016), 5, 3), -0.4, 0.05, db(-31))
  if (n === 2) M.addMono(T0 + f(6), blip(E5, { len: 0.2 }), -0.4, 0.12, db(-16))
  else stutter(M, T0 + f(6), blip(E5, { len: 0.1, decay: 8 }), [34, 24, 16, 10, 6], -16, 5, 4)
}
function cabeceraSalida(M, T0) { tear(M, T0, 3, LEVEL.tear - 4) }
function lowerThird(M, T0, guest = false) {
  // El rótulo se abre (f3): cuatro ticks que suben. La manzana nace en la órbita (f9): un tintineo agudo, no un golpe.
  ;['E6', 'F#6', 'A6', 'B6'].forEach((n, i) => M.addMono(T0 + f(3) + i * 0.028, grain(note(n), 0.012), -0.5 + i * 0.1, 0.1, db(-33)))
  if (guest) {
    M.addMono(T0 + f(8), blip(E6, { len: 0.1, decay: 45 }), -0.4, 0.15, db(-30))
    for (let k = 0; k < 3; k++) M.tick(T0 + f(20) + 0.35 + 0.7 * k, -36, 3000, -0.4, 250) // el punto hueco que late
  } else M.addMono(T0 + f(9), bellSeg(A6, 0.6), -0.4, 0.4, db(-29))
  // El nombre cae (f12): sólo un clic liviano; nada grave.
  M.addMono(T0 + f(12), click(), -0.4, 0.03, db(-24))
  typing(M, T0 + f(18), T0 + f(18) + 0.2, 5, -0.4)
  tear(M, T0 + f(132), 2, LEVEL.tear - 6)
}
function noticia(M, T0, withSource) {
  M.tick(T0 + f(3), -30, 5000, 0.1, 380)
  bytes(M, T0 + f(3), T0 + f(9), 7, 'out', { center: 0.1, level: LEVEL.grain - 4 })
  tear(M, T0 + f(5), 2, LEVEL.tear - 7)
  typing(M, T0 + f(12), T0 + f(12) + 0.3, 9, 0.1)
  M.tick(T0 + f(27), -34, 4200, 0.1, 380)
  if (withSource) bytes(M, T0 + f(3), T0 + f(3) + 0.45, 14, 'in', { center: -0.3, level: LEVEL.grain - 7 })
  tear(M, T0 + f(132), 2, LEVEL.tear - 7)
}
function dropPiece(M, T0) {
  M.tick(T0 + f(3), -30, 5000, 0, 380)
  for (let j = 0; j < 8; j++) M.addMono(T0 + f(6) + j * 2 * FR, crush(grain(HIGH[Math.floor(R() * HIGH.length)], 0.012), 5, 3), -0.3, 0.05, db(-32))
  typing(M, T0 + f(6), T0 + f(13), 11, -0.1)
  typing(M, T0 + f(13), T0 + f(28), 18, 0)
  // El remate cae de golpe (f31) y la manzana (f37) da el golpe del Drop, con su eco.
  M.addMono(T0 + f(31), thump(), 0, 0.08, db(LEVEL.thump))
  tear(M, T0 + f(31) + 0.08, 3)
  appleHit(M, T0 + f(37), { echoAt: T0 + f(41), level: B ? -8 : -10 })
  tear(M, T0 + f(106), 3)
}
function cta(M, T0) {
  M.addMono(T0 + f(3), marker(0.5), 0.1, 0.04, db(B ? -27 : -30))
  M.addMono(T0 + f(14), blip(E6, { len: 0.12, decay: 40, bend: -2 }), 0, 0.15, db(-27))
  M.addMono(T0 + f(48), grain(A6, 0.03), 0, 0.2, db(-32))
  tear(M, T0 + f(105), 3, LEVEL.tear - 4)
}

// El aire del estudio: el canal abierto. Sólo mientras «el micrófono» está abierto.
function roomTone(M, t0, t1, level = B ? -45 : -47) {
  const x = seg(t1 - t0), r = rng(4242)
  for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1
  biquad(x, 'highpass', 160); biquad(x, 'lowpass', 4800); biquad(x, 'peak', 1200, 0.8, 3)
  M.addMono(t0, fadeEdges(x, 12, 10), 0, 0, db(level))
}

// ── Render ─────────────────────────────────────────────────────────────────────────────────────────────
// Cada pieza se escribe en dos pistas con la MISMA ganancia: efectos (con el corte a silencio) y aire del estudio.
const gateCut = cuts => t => {
  for (const [a, b] of cuts) {
    if (t >= a && t < a + 0.004) return 1 - (t - a) / 0.004
    if (t >= a + 0.004 && t < b) return 0
    if (t >= b && t < b + 0.004) return (t - b) / 0.004
  }
  return 1
}
let GAIN = null
function render(name, dur, build, room, cuts = []) {
  const fx = createMix({ dur, seed: 0x51f0 })
  build(fx)
  const fxFile = path.join(OUT, `.${name}-fx.wav`), roomFile = path.join(OUT, `.${name}-room.wav`)
  const w = fx.write(fxFile, { wet: 1.2, fadeMs: 20, gain: GAIN, gate: gateCut(cuts) })
  if (GAIN == null) GAIN = w.gain
  const rm = createMix({ dur, seed: 0x7a11 })
  for (const [a, b] of room) roomTone(rm, a, b)
  rm.write(roomFile, { wet: 0, fadeMs: 5, gain: GAIN })
  const out = path.join(OUT, `${name}.wav`)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', fxFile, '-i', roomFile, '-filter_complex', 'amix=inputs=2:normalize=0', '-c:a', 'pcm_s24le', out])
  rmSync(fxFile); rmSync(roomFile)
  console.log(`${name}: ${out}`)
}

// La apertura fija la escala: su pico (el golpe de la manzana) queda en −1 dBFS; el resto usa la misma ganancia.
render('apertura', 4, M => apertura(M, 0), [[f(69), f(108)]], [[f(108), 99]])
render('cierre', 3, M => cierre(M, 0), [[0, f(6) + 0.03]])
render('bucle', 7, M => { cierre(M, 0); apertura(M, 3) }, [[0, f(6) + 0.03], [3 + f(69), 3 + f(108)]], [[3 + f(108), 99]])
render('animatic', 45.2, M => {
  apertura(M, 0)
  cabecera(M, 4, 1); lowerThird(M, 5)
  noticia(M, 10.5, true)
  cabecera(M, 16, 2); noticia(M, 16.5, false)
  dropPiece(M, 22)
  cabecera(M, 26.5, 3); lowerThird(M, 27, true)
  noticia(M, 32.2, false)
  cabeceraSalida(M, 38); cta(M, 38.2)
  cierre(M, 42.2)
}, [[f(69), 42.2 + f(6) + 0.03]], [[f(108), 3.98]])
