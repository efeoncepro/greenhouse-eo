#!/usr/bin/env node
// Piezas del sistema sonoro construidas sobre el logo sonoro «Puntos suspensivos» (Mi Mi Mi → La).
//   node composer.mjs --piece larga|glitch-intro|glitch-cortina|glitch-outro --out <file.wav>
//
// Tempo 96 BPM: la semicorchea (156 ms) es casi el espaciado del logo (140 ms). En la pieza larga la esfera responde
// siempre La mientras la armonía cambia debajo: La (fundamental) · Re/La (quinta) · Fa♯m7 (tercera) · Mi sus4 (cuarta).
// El contexto cambia; la respuesta no.
import path from 'node:path'

import { createMix, note } from './dsp.mjs'

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const piece = opt('--piece', 'larga')
const out = path.resolve(opt('--out', `${piece}.wav`))

const BEAT = 60 / 96, BAR = 4 * BEAT, S16 = BEAT / 4
const bar = n => (n - 1) * BAR

const CHORDS = {
  A: { pad: ['A3', 'C#4', 'E4', 'B4'], bass: 'A2' },
  D: { pad: ['A3', 'D4', 'F#4', 'C#5'], bass: 'A2' },
  Fm: { pad: ['F#3', 'A3', 'C#4', 'E4'], bass: 'F#2' },
  Es: { pad: ['E3', 'A3', 'B3', 'E4'], bass: 'E2' },
  E: { pad: ['E3', 'G#3', 'B3', 'E4'], bass: 'E2' }
}

const DUR = { larga: 40.5, 'glitch-intro': 8.5, 'glitch-cortina': 2.4, 'glitch-outro': 6.5 }[piece]
if (!DUR) throw new Error(`pieza desconocida: ${piece}`)
const M = createMix({ dur: DUR })
const { I } = M

// ─── El motivo ───
const ring = (t0, t1, level = -30) => I.pad({ t0, t1, notes: ['A2', 'E3', 'A3', 'E4'], level, attack: 0.4, release: 0.25, bright: 0.15 })
const dots = (t, level = -14, space = 0.14) => [0, 1, 2].forEach(k => I.vibes(t + k * space, note('E5'), level + k, -0.45 + k * 0.2))
const sphere = (t, { level = -8, impact = true } = {}) => { if (impact) I.impact(t, -9); I.bell(t + 0.004, note('A5'), level) }
const bloom = (t, level = -30) => ['A4', 'C#5', 'E5', 'A5'].forEach((n, k) => M.modal({ t0: t, f: note(n), level: level - [0, 3, 3, 6][k], partials: [[1, 1, 1.3], [2.01, 0.2, 2.5]], attack: 0.06, sendAmt: 0.6, len: 2.5 }))
// El logo sonoro completo, con los tiempos exactos de la pieza «logo» (anillo 0 · puntos 0,30/0,44/0,58 · esfera 0,95).
const signature = t0 => { ring(t0, t0 + 0.95); dots(t0 + 0.3); sphere(t0 + 0.95); bloom(t0 + 1.0) }
// Glitch: la tercera ventana tartamudea (fusas con reducción de resolución creciente) antes de responder.
const stutter = (t, level = -16) => [6, 10, 16, 24].forEach((crush, k) => I.vibes(t + k * (S16 / 2), note('E5'), level - 2 * k, 0.1 * (k % 2 ? 1 : -1), crush))

function chordBar(n, name, { level = -29, bright = 0.45, half = null } = {}) {
  const t0 = bar(n)
  if (half) {
    I.pad({ t0, t1: t0 + BAR / 2, notes: CHORDS[name].pad, level, bright })
    I.pad({ t0: t0 + BAR / 2, t1: t0 + BAR, notes: CHORDS[half].pad, level, bright, attack: 0.15 })
  } else I.pad({ t0, t1: t0 + BAR, notes: CHORDS[name].pad, level, bright })
  I.bass(t0, CHORDS[name].bass, BAR / 2, -20)
  I.bass(t0 + BAR / 2, CHORDS[half ?? name].bass, BAR / 2, -20)
}
const pulses = (n, every = 2, level = -18) => { for (let b = 0; b < 4; b += every) I.pulse(bar(n) + b * BEAT, level) }
const hats = (n, per = 2, level = -26) => { for (let k = 0; k < 4 * per; k++) I.hat(bar(n) + (k * BEAT) / per, level - (k % 2 ? 3 : 0), k % 2 ? 0.25 : -0.15) }
// Arpegio de mazo en corcheas, muy atrás: textura, no melodía.
const arp = (n, name, level = -24) => CHORDS[name].pad.concat(CHORDS[name].pad.slice(1, 3).reverse()).forEach((p, k) => {
  const f = note(p) * 2
  M.modal({ t0: bar(n) + k * (BEAT / 2), f, level, partials: [[1, 1, 4], [4, 0.15, 12]], pan: k % 2 ? 0.4 : -0.4, sendAmt: 0.4, len: 1.2 })
})
// Pregunta y respuesta dentro de la pieza: puntos en el cuarto tiempo, la esfera (suave, sin golpe) en el siguiente compás.
const callAnswer = (n, level = -18) => { dots(bar(n) + 3 * BEAT, level, S16); sphere(bar(n + 1), { level: level - 2, impact: false }) }

if (piece === 'larga') {
  // Intro (1–2): el anillo abierto y dos preguntas sin respuesta.
  ring(0, bar(3) + 0.3, -33)
  M.noise({ t0: 0, t1: 5, cutoff: t => 900 + 140 * t, q: 1.6, gain: t => 10 ** (-36 / 20) * Math.min(1, t / 1.2) * Math.max(0, 1 - Math.max(0, t - 4) / 1) })
  dots(bar(1) + 2 * BEAT, -17, S16)
  dots(bar(2) + 2 * BEAT, -16, S16)
  // A (3–6): la armonía entra; la esfera empieza a responder.
  const prog = ['A', 'D', 'Fm', 'Es']
  prog.forEach((c, k) => chordBar(3 + k, c, { half: c === 'Es' ? 'E' : null }))
  pulses(5); pulses(6)
  callAnswer(4); callAnswer(6)
  // B (7–12): pulso, hats y arpegio; la misma respuesta sobre cada acorde.
  for (let n = 7; n <= 12; n++) {
    const c = prog[(n - 7) % 4]
    chordBar(n, c, { half: c === 'Es' ? 'E' : null })
    pulses(n); hats(n); arp(n, c)
  }
  callAnswer(7); callAnswer(9); callAnswer(11, -17)
  // Subida (13–14): el arco avanza — pulso en cada tiempo, semicorcheas, colchón más brillante.
  chordBar(13, 'Fm', { bright: 0.5, level: -25 }); chordBar(14, 'Es', { bright: 0.55, level: -24, half: 'E' })
  for (const n of [13, 14]) { pulses(n, 1, -17); hats(n, 4, -26); arp(n, n === 13 ? 'Fm' : 'E', -23) }
  I.riser(bar(13), bar(15) - 0.05, -22)
  // Corte y firma: silencio de anticipación y el logo sonoro completo, que resuelve en La.
  signature(bar(15))
} else if (piece === 'glitch-intro') {
  ring(0, 2.5, -30)
  for (let n = 1; n <= 3; n++) { pulses(n, 1, -19); hats(n, 2, -30) }
  dots(bar(1) + 3 * BEAT - 2 * S16, -14, S16 * 0.9)
  stutter(bar(1) + 3 * BEAT + S16 * 0.9)
  sphere(bar(2))
  bloom(bar(2) + 0.05)
  chordBar(2, 'A', { level: -28 }); chordBar(3, 'D', { level: -29 })
  M.noise({ t0: 5.2, t1: 8.5, cutoff: () => 3000, q: 1.2, gain: () => 0 })
} else if (piece === 'glitch-cortina') {
  dots(0.2, -14, 0.156)
  stutter(0.2 + 3 * 0.156)
  sphere(1.0, { level: -10, impact: false })
  bloom(1.05, -33)
} else if (piece === 'glitch-outro') {
  ring(0, 2.6, -30)
  chordBar(1, 'Es', { level: -28, half: 'E' })
  pulses(1, 1, -19); hats(1, 2, -30)
  signature(bar(2) - 0.3)
}

M.write(out, { fadeMs: piece === 'glitch-intro' ? 2200 : 450 })
console.log(`${piece}: ${path.basename(out)} (${DUR} s)`)
