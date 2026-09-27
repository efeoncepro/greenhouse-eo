#!/usr/bin/env node
// Versión rock del sistema: el logo sonoro «Puntos suspensivos» dicho con una banda.
//   node rock.mjs --piece larga|glitch-intro|glitch-cortina|glitch-outro [--stems] --out <file.wav>
//
// Traducción: las tres ventanas = tres golpes apagados (palm mute) en Mi · la esfera = el acorde abierto con bombo,
// platillo y bajo, tres semicorcheas después. A 120 BPM, tres semicorcheas son 0,375 s: la misma pausa del logo (0,37 s).
// Armonía: La · Re · Fa♯m · Mi sus4 — la nota La está en los cuatro golpes (la respuesta no cambia).
import path from 'node:path'

import { SR, biquad, createMix, db, note } from './dsp.mjs'

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const piece = opt('--piece', 'larga')
const out = path.resolve(opt('--out', `rock-${piece}.wav`))

const BEAT = 0.5, BAR = 2, S16 = 0.125
const bar = n => (n - 1) * BAR
const at = (n, s16) => bar(n) + s16 * S16

const DUR = { larga: 37, 'glitch-intro': 8.5, 'glitch-cortina': 2.6, 'glitch-outro': 6.5 }[piece]
if (!DUR) throw new Error(`pieza desconocida: ${piece}`)
const M = createMix({ dur: DUR, seed: 0x51f15eed })
const { I, N } = M

// ─── Guitarras: Karplus-Strong a dos buses (abiertas y apagadas), distorsión y caja después ───
const bus = () => [new Float64Array(N), new Float64Array(N)]
const open = bus(), palm = bus(), lead = bus()
let seed = 0x2545f491
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }

function pluckInto(buf, t0, f, level, len, { decay = 0.998, mute = 0, crush = 1 } = {}) {
  const size = 16384, d = new Float64Array(size), L = SR / f - 0.5
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.ceil((t0 + len) * SR))
  let w = 0, prev = 0, lp = 0, held = 0
  for (let k = 0; k < Math.ceil(L) + 2; k++) { lp += 0.6 * (rnd() - lp); d[w] = lp; w = (w + 1) % size }
  for (let i = i0; i < i1; i++) {
    const r = w - L, ri = Math.floor(r), fr = r - ri
    const a = d[(ri + size) % size], b = d[(ri + 1 + size) % size], x = a + (b - a) * fr
    const y = decay * 0.5 * (x + prev)
    prev = x; d[w] = y; w = (w + 1) % size
    const t = (i - i0) / SR
    let s = x * db(level) * (mute ? Math.exp(-t * mute) : 1) * Math.min(1, (i1 - i) / (SR * 0.02))
    if (crush > 1) { if ((i - i0) % crush === 0) held = Math.round(s * 24) / 24; s = held }
    buf[i] += s
  }
}
// Acorde de quinta doblado: izquierda y derecha con 4 cents y 9 ms de diferencia (dos tomas de guitarra).
const POWER = { E: ['E2', 'B2', 'E3'], A: ['A2', 'E3', 'A3'], D: ['D3', 'A3', 'D4'], Fm: ['F#2', 'C#3', 'F#3', 'A3'], Es: ['E2', 'B2', 'E3', 'A3'] }
function strum(target, t0, chord, len, opts = {}, level = -6) {
  POWER[chord].forEach((n, k) => {
    pluckInto(target[0], t0 + k * 0.004, note(n) * 2 ** (-4 / 1200), level, len, opts)
    pluckInto(target[1], t0 + 0.009 + k * 0.004, note(n) * 2 ** (4 / 1200), level, len, opts)
  })
}
const chug = (t, opts = {}) => strum(palm, t, 'E', 0.16, { mute: 26, decay: 0.99, ...opts }, -4)
const hit = (t, chord, len = 0.6) => strum(open, t, chord, len, { decay: 0.9985 })
const leadA = (t, len = 0.9) => { pluckInto(lead[0], t, note('A4'), -8, len, { decay: 0.999 }); pluckInto(lead[1], t + 0.006, note('A4') * 1.002, -8, len, { decay: 0.999 }) }

// ─── Batería y bajo ───
const kick = (t, level = -3) => {
  M.tone({ t0: t, t1: t + 0.5, freq: x => 46 + 120 * Math.exp(-(x - t) * 32), partials: [[1, 1]], gain: x => db(level) * Math.min(1, (x - t) / 0.001) * Math.exp(-(x - t) * 7.5) })
  M.tick(t, level - 10, 3500, 0, 400)
}
const snare = (t, level = -7) => {
  M.noise({ t0: t, t1: t + 0.35, cutoff: () => 2200, q: 0.55, gain: x => db(level) * Math.exp(-(x - t) * 16), sendAmt: 0.35 })
  M.tone({ t0: t, t1: t + 0.2, freq: () => 190, partials: [[1, 1], [1.6, 0.4]], gain: x => db(level - 4) * Math.exp(-(x - t) * 24), sendAmt: 0.2 })
}
const hatC = (t, level = -22, pan = 0.3) => M.tick(t, level, 9500, pan, 260)
const hatO = (t, level = -24) => M.noise({ t0: t, t1: t + 0.35, cutoff: () => 9000, q: 0.5, gain: x => db(level) * Math.exp(-(x - t) * 9), pan: () => 0.3 })
const crash = (t, level = -12) => {
  for (const pan of [-0.5, 0.5]) M.noise({ t0: t, t1: t + 2.6, cutoff: () => 7000, q: 0.35, gain: x => db(level) * Math.exp(-(x - t) * 1.7), pan: () => pan, sendAmt: 0.3 })
  M.tone({ t0: t, t1: t + 2, freq: () => 420, partials: [[1, 0.5], [1.47, 0.4], [2.09, 0.35], [2.56, 0.3], [3.3, 0.2]], gain: x => db(level - 14) * Math.exp(-(x - t) * 2.2), sendAmt: 0.3 })
}
const bassNote = (t, n, len, level = -10) => M.tone({ t0: t, t1: t + len, freq: () => note(n), partials: [[1, 1], [2, 0.5], [3, 0.3], [4, 0.18], [5, 0.1]], gain: x => db(level) * Math.min(1, (x - t) / 0.004) * Math.exp(-(x - t) * 2.5) })
const ROOT = { A: 'A1', D: 'D2', Fm: 'F#1', Es: 'E1', E: 'E1' }

// ─── El riff: puntos (0,1,2) · pausa · esfera (5); y otra vez (8,9,10) · (13) ───
function riffBar(n, chord, { question = false, drums = true, crashAt = null, leadOn = false, half = false } = {}) {
  for (const base of [0, 8]) {
    ;[0, 1, 2].forEach(k => chug(at(n, base + k)))
    if (!question) {
      hit(at(n, base + 5), chord, 0.34)
      bassNote(at(n, base + 5), ROOT[chord], 0.35)
      if (leadOn) leadA(at(n, base + 5), 0.4)
    }
  }
  if (!drums) return
  for (const s of [0, 5, 8, 13]) if (!question || s % 8 === 0) kick(at(n, s), s === 5 || s === 13 ? -4 : -3)
  for (const s of half ? [8] : [4, 12]) snare(at(n, s))
  for (let k = 0; k < 8; k++) hatC(at(n, 2 * k), k % 2 ? -25 : -21)
  if (crashAt != null) crash(at(n, crashAt))
}
function sustainBar(n, chord, { roll = false } = {}) {
  for (let k = 0; k < 16; k++) strum(palm, at(n, k), chord, 0.14, { mute: 20, decay: 0.992 }, -6 + k * 0.25)
  for (let k = 0; k < 8; k++) bassNote(at(n, 2 * k), ROOT[chord], 0.24, -11)
  for (let k = 0; k < 4; k++) kick(at(n, 4 * k), -4)
  if (roll) for (let k = 0; k < 16; k++) snare(at(n, k), -16 + k * 0.6)
}
// La firma: los tres golpes apagados, la pausa de tres semicorcheas y el golpe total con la esfera del sistema.
function signature(t, { voiceSafe = false } = {}) {
  ;[0, 1, 2].forEach(k => chug(t + k * S16))
  const T = t + 5 * S16
  hit(T, 'A', DUR - T); leadA(T, DUR - T); bassNote(T, 'A1', 2.6, -9)
  kick(T, -2); crash(T, -10)
  I.impact(T, -8)
  I.bell(T + 0.004, note('A5'), voiceSafe ? -12 : -9)
  return T
}
// Glitch: la tercera ventana tartamudea — fusas cada vez más degradadas, con la caja repitiéndose.
function stutter(t) {
  ;[4, 8, 14, 22, 32].forEach((crush, k) => {
    chug(t + k * (S16 / 2), { crush, mute: 34 })
    snare(t + k * (S16 / 2), -14 - k)
  })
}

let finalHit = null
if (piece === 'larga') {
  // Intro: la guitarra sola pregunta (sólo los puntos, sin respuesta); en el 2 entran los hats.
  riffBar(1, 'E', { question: true, drums: false })
  riffBar(2, 'E', { question: true, drums: false }); for (let k = 0; k < 8; k++) hatC(at(2, 2 * k), -26)
  // Estrofa: entra la banda y la esfera responde.
  const prog = ['A', 'D', 'Fm', 'Es']
  prog.forEach((c, k) => riffBar(3 + k, c, { crashAt: k === 0 ? 0 : null }))
  prog.forEach((c, k) => riffBar(7 + k, c, { crashAt: k === 0 ? 0 : null, leadOn: true }))
  // Coro a medio tiempo: más peso, platillo en cada compás.
  prog.forEach((c, k) => riffBar(11 + k, c, { crashAt: 0, leadOn: true, half: true }))
  for (let k = 0; k < 4; k++) hatO(at(11 + k, 12))
  // Subida: el arco avanza.
  sustainBar(15, 'Fm'); sustainBar(16, 'Es', { roll: true })
  I.riser(bar(15), bar(17) - 0.02, -18)
  // Corte de un tiempo y firma.
  finalHit = signature(bar(17) + 0.25)
} else if (piece === 'glitch-intro') {
  for (let k = 0; k < 8; k++) { kick(at(1, 2 * k), -6 + k * 0.4); if (k >= 4) snare(at(1, 2 * k + 1), -12 + k) }
  ;[0, 1, 2].forEach(k => chug(at(2, k)))
  stutter(at(2, 3))
  const T = at(2, 5)
  hit(T, 'A', 1.2); kick(T, -2); crash(T, -10); I.impact(T, -8); I.bell(T + 0.004, note('A5'), -9); bassNote(T, 'A1', 0.9, -9)
  riffBar(3, 'A'); riffBar(4, 'D')
  finalHit = T
} else if (piece === 'glitch-cortina') {
  ;[0, 1, 2].forEach(k => chug(0.15 + k * S16))
  stutter(0.15 + 3 * S16)
  const T = 0.15 + 5 * S16 + S16
  hit(T, 'A', 1.3); kick(T, -3); crash(T, -13); I.bell(T + 0.004, note('A5'), -11)
  finalHit = T
} else if (piece === 'glitch-outro') {
  riffBar(1, 'Es', { crashAt: 0 })
  finalHit = signature(bar(2) + 0.25)
}

// Cadena de guitarra: paso alto, saturación, caja (paso bajo + presencia), y el bus apagado más oscuro.
function amp(b, { drive, lp, gain }) {
  for (const ch of b) {
    biquad(ch, 'highpass', 90)
    for (let i = 0; i < N; i++) ch[i] = Math.tanh(ch[i] * drive)
    biquad(ch, 'peak', 1600, 0.9, 3)
    biquad(ch, 'lowpass', lp, 0.8)
    biquad(ch, 'lowpass', lp * 1.3, 0.7)
  }
  M.addStereo(b[0], b[1], 0.12, gain)
}
amp(open, { drive: 9, lp: 5200, gain: db(-9) })
amp(palm, { drive: 8, lp: 2600, gain: db(-8) })
amp(lead, { drive: 5, lp: 6000, gain: db(-15) })

M.write(out, { wet: 0.9, fadeMs: piece === 'glitch-intro' ? 2000 : 500 })
console.log(`rock/${piece}: ${path.basename(out)} (${DUR} s) · golpe final ${finalHit?.toFixed(3)} s`)
