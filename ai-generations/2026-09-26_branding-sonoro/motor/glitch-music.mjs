#!/usr/bin/env node
// Glitch — música (ronda 7, PROPUESTA). Sólo Glitch, nunca Efeonce. La música va ALREDEDOR de la voz, nunca debajo:
// intro del vlog y del podcast, cortinas entre noticias, salida, y reels o recortes sin voz.
//
// Dos registros del mismo ADN (como Efeonce: fondo y energía), en La mayor, con el motivo con bug como gancho:
//   pulso · ~120 BPM · electrónica hipnótica y precisa: los bytes afinados son la percusión; el gancho
//           Mi · Mi · Mi → La tartamudea en la tercera nota y resuelve en La con la manzana.
//   club  · 144 BPM (se siente a 72) · ritmo quebrado y rebotado del club actual: el tartamudeo del bombo ES la falla.
//
//   node glitch-music.mjs --style pulso|club --piece intro|cortina [--no-apple] --out <file.wav>
//   → escribe también <file>.json con el instante del golpe de la manzana (para montar el sello tras la re-grabación).
//
// Maqueta propia con la estructura exacta; después se re-graba con Stable Audio 2.5 (ai-music.ts) y la manzana propia
// se monta encima (sello.mjs). Las primitivas son las del taller: efeonce-brand-workshop/tools/brand-sound (una sola lógica).
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const DSP = process.env.BRAND_SOUND_DIR
  ? path.join(process.env.BRAND_SOUND_DIR, 'src/dsp.mjs')
  : new URL('../../../../efeonce-brand-workshop/tools/brand-sound/src/dsp.mjs', import.meta.url).pathname
const { SR, biquad, createMix, db, note } = await import(DSP)

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const STYLE = opt('--style', 'pulso')
const PIECE = opt('--piece', 'intro')
const OUT = path.resolve(opt('--out', `glitch-${STYLE}-${PIECE}.wav`))
const APPLE = !args.includes('--no-apple')

const BPM = STYLE === 'club' ? 144 : 120
const BEAT = 60 / BPM, S16 = BEAT / 4, BAR = BEAT * 4
const DUR = PIECE === 'cortina' ? 3 : 20 // duraciones enteras: Stable Audio redondea a segundos
const M = createMix({ dur: DUR, seed: STYLE === 'club' ? 0xc1ab : 0x9a15e })
const { I, N } = M

let s0 = 0x1234abcd
const R = () => { s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5; return (s0 >>> 0) / 4294967296 }
const seg = len => new Float64Array(Math.max(1, Math.round(len * SR)))
const crush = (x, bits, hold = 1) => { const q = 2 ** (bits - 1); let h = 0; for (let i = 0; i < x.length; i++) { if (i % hold === 0) h = Math.round(x[i] * q) / q; x[i] = h } return x }
const fade = (x, inMs = 1, outMs = 4) => { const a = Math.round((inMs / 1000) * SR), b = Math.round((outMs / 1000) * SR); for (let i = 0; i < Math.min(a, x.length); i++) x[i] *= i / a; for (let i = 0; i < Math.min(b, x.length); i++) x[x.length - 1 - i] *= i / b; return x }

// ── Instrumentos ─────────────────────────────────────────────────────────────────────────────────────────
// Byte: grano afinado (Hann). Es el hat de Glitch.
const grain = (fr, len = 0.012) => { const x = seg(len); for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * fr * i) / SR) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (x.length - 1))); return x }
// Pluck FM corto: el arpegio y el gancho.
const pluck = (fr, { len = 0.35, decay = 9, index = 1.6, bright = 1 } = {}) => {
  const x = seg(len); let pc = 0, pm = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, e = Math.exp(-t * decay)
    pm += (2 * Math.PI * fr * 2) / SR; pc += (2 * Math.PI * fr) / SR + (index * e * bright * Math.sin(pm) * 2 * Math.PI * fr) / SR / 6
    x[i] = Math.sin(pc) * e * Math.min(1, t / 0.002)
  }
  return fade(x)
}
// Bombo: redondo en pulso; más corto y con clic en club.
const kick = (t, level) => STYLE === 'club'
  ? I.pulse(t, level)
  : M.tone({ t0: t, t1: t + 0.32, freq: u => 52 + 60 * Math.exp(-(u - t) * 35), partials: [[1, 1]], gain: u => db(level) * Math.min(1, (u - t) / 0.003) * Math.exp(-(u - t) * 10) })
// 808 de club: sub con leve deslizamiento y saturación suave.
const sub808 = (t, n, len, level = -12) => {
  const f0 = note(n)
  M.tone({ t0: t, t1: t + len, freq: u => f0 * (1 + 0.5 * Math.exp(-(u - t) * 40)), partials: [[1, 1], [2, 0.18], [3, 0.06]], gain: u => db(level) * Math.min(1, (u - t) / 0.004) * Math.exp(-(u - t) * 2.2) })
}
// Palmas: tres ráfagas de ruido muy juntas.
const clap = (t, level = -18, pan = 0) => { for (const [dt, g] of [[0, 1], [0.011, 0.8], [0.022, 1.1]]) M.noise({ t0: t + dt, t1: t + dt + 0.12, cutoff: () => 1800, q: 0.35, gain: u => db(level) * g * Math.exp(-(u - t - dt) * 38), pan: () => pan, sendAmt: 0.2 }) }
const hatByte = (t, level, pan) => M.addMono(t, crush(grain([note('E7'), note('A7'), note('C#7')][Math.floor(R() * 3)], 0.01 + R() * 0.006), 7, 2), pan, 0.08, db(level))
// Chirrido afinado de club: el gesto del género, con un byte propio (no la muestra clásica).
const chirp = (t, level = -24, pan = 0) => M.tone({ t0: t, t1: t + 0.09, freq: u => note('A6') * 2 ** ((9 * Math.exp(-(u - t) * 30)) / 12), partials: [[1, 1], [2, 0.3]], gain: u => db(level) * Math.min(1, (u - t) / 0.002) * Math.exp(-(u - t) * 28), pan: () => pan, sendAmt: 0.15 })

// El gancho: Mi · Mi · Mi → (3 semicorcheas) → La. La tercera nota tartamudea (búfer que se acelera) y baja de resolución.
function hook(tLa, { level = -12, bugLevel = -13, withApple = false } = {}) {
  const t1 = tLa - 5 * S16, t2 = t1 + S16, t3 = t2 + S16
  M.addMono(t1, pluck(note('E5'), { len: 0.25, decay: 14 }), -0.15, 0.25, db(level))
  M.addMono(t2, pluck(note('E5'), { len: 0.25, decay: 14 }), 0, 0.25, db(level))
  const src = pluck(note('E5'), { len: 0.2, decay: 6 })
  let t = t3
  const slices = STYLE === 'club' ? [S16, S16 / 2, S16 / 2, S16 / 4, S16 / 4, S16 / 4, S16 / 4] : [S16, S16 * 0.66, S16 * 0.44, S16 * 0.3, S16 * 0.2]
  slices.forEach((len, k) => {
    const s = fade(src.slice(0, Math.round(len * SR)), 0.3, 1.5)
    if (k >= 1) crush(s, Math.max(3, 8 - k), 2 + k)
    M.addMono(t, s, k % 2 ? 0.5 : -0.3, 0.1, db(bugLevel - k * 0.5))
    t += len
  })
  if (withApple) { I.impact(tLa, -8); I.bell(tLa + 0.004, note('A5'), -7) }
  M.addMono(tLa, pluck(note('A5'), { len: 1.2, decay: 3, index: 1.2 }), 0.1, 0.35, db(level + 1))
}

const CHORDS = [['A3', 'C#4', 'E4'], ['A3', 'D4', 'F#4'], ['F#3', 'A3', 'C#4', 'E4'], ['E3', 'A3', 'B3']]
const ROOTS = ['A1', 'D2', 'F#1', 'E1']
let tLa

if (PIECE === 'cortina') {
  // 3 s: un compás de bytes, el gancho y la manzana; el acorde florece y se apaga.
  tLa = STYLE === 'club' ? 0.3 + 5 * S16 : 0.35 + 5 * S16
  for (let k = 0; k < 6; k++) hatByte(0.05 + k * S16, -30, (k % 2 ? 0.3 : -0.3))
  hook(tLa, { withApple: APPLE })
  kick(tLa, STYLE === 'club' ? -8 : -10)
  if (STYLE === 'club') { sub808(tLa, 'A1', 1.4, -11); clap(tLa + BEAT, -20) }
  I.pad({ t0: tLa, t1: tLa + 0.8, notes: ['A3', 'C#4', 'E4', 'A4'], level: -24, attack: 0.02, release: 1.2 })
} else if (STYLE === 'pulso') {
  // 10 compases de 2 s. 1–2: aire y bytes · 3–6: el pulso (bombo, bajo, arpegio) · 7–8: el gancho aparece dos veces y
  // se abre el filtro · 9: quiebre (sin bombo) y el gancho con bug · 10: la manzana en el tiempo 1.
  const bar = n => (n - 1) * BAR
  tLa = bar(10)
  I.pad({ t0: 0, t1: bar(9), notes: ['A3', 'E4', 'A4'], level: -27, attack: 2.5, release: 1.5, bright: 0.25 })
  for (let n = 1; n <= 9; n++) for (let k = 0; k < 16; k++) {
    const t = bar(n) + k * S16 + (k % 2 ? S16 * 0.1 : 0) // leve swing
    if (n <= 2 && k % 2) continue
    hatByte(t, (k % 4 === 2 ? -27 : -32) + (n >= 7 ? 2 : 0), k % 2 ? 0.35 : -0.35)
  }
  for (let n = 3; n <= 8; n++) {
    const c = (n - 3) % 4
    for (let b = 0; b < 4; b++) kick(bar(n) + b * BEAT, -12)
    for (let e = 0; e < 8; e++) I.bass(bar(n) + e * BEAT / 2, ROOTS[c].replace('1', '2'), BEAT / 2 * 0.9, e % 2 ? -22 : -19)
    // Arpegio en semicorcheas sobre las notas del acorde, con el filtro que se abre hacia el gancho.
    for (let k = 0; k < 16; k++) {
      const nn = CHORDS[c][k % CHORDS[c].length].replace(/(\d)$/, d => String(Number(d) + 1))
      M.addMono(bar(n) + k * S16, pluck(note(nn), { len: 0.2, decay: 16, bright: 0.4 + 0.1 * (n - 3) }), (k % 3) * 0.3 - 0.3, 0.3, db(-24 + (n >= 7 ? 2 : 0)))
    }
    M.tick(bar(n) + BEAT, -26, 3200, 0.1, 260); M.tick(bar(n) + 3 * BEAT, -26, 3200, 0.1, 260)
  }
  hook(bar(8), { level: -14, bugLevel: -16 }) // un adelanto del gancho, a media intensidad
  hook(bar(10), { withApple: APPLE }) // el gancho completo resuelve en la manzana
  kick(bar(10), -9)
  I.bass(bar(10), 'A2', 1.6, -16)
  I.pad({ t0: bar(10), t1: bar(10) + 0.6, notes: ['A3', 'C#4', 'E4', 'A4'], level: -22, attack: 0.02, release: 1.3 })
} else {
  // Club, 12 compases de 1,667 s. 1–2: el gancho picado como adelanto · 3–8: el patrón (bombo 1 · 2 · 3 · 3& · 4&, palmas
  // en 2 y 4, chirridos a contratiempo, 808) · 9–10: el bombo se acelera y tartamudea (la falla) · 11: silencio de un
  // tiempo y el gancho · 12: la manzana en el tiempo 1 con toda la banda.
  const bar = n => (n - 1) * BAR
  tLa = bar(12)
  for (let n = 1; n <= 2; n++) for (let k = 0; k < 16; k += 2) M.addMono(bar(n) + k * S16, crush(pluck(note(k % 6 === 4 ? 'A5' : 'E5'), { len: 0.12, decay: 22 }), 6, 2), k % 4 ? 0.3 : -0.3, 0.2, db(-24))
  const KICK16 = [0, 4, 8, 10, 14]
  for (let n = 3; n <= 8; n++) {
    const c = Math.floor((n - 3) / 2) % 4
    KICK16.forEach(k => { kick(bar(n) + k * S16, -9); sub808(bar(n) + k * S16, ROOTS[c], 0.28, -14) })
    clap(bar(n) + BEAT, -17); clap(bar(n) + 3 * BEAT, -17)
    for (let k = 2; k < 16; k += 4) chirp(bar(n) + k * S16, -25, k % 8 === 2 ? -0.4 : 0.4)
    for (let k = 0; k < 16; k++) if (k % 2) hatByte(bar(n) + k * S16, -30, k % 4 === 1 ? 0.3 : -0.3)
    // Acordes picados en el tiempo 1 y el 3&.
    for (const k of [0, 10]) for (const nn of CHORDS[c]) M.addMono(bar(n) + k * S16, pluck(note(nn.replace(/(\d)$/, d => String(Number(d) + 1))), { len: 0.18, decay: 18 }), 0, 0.25, db(-26))
  }
  // La falla: 9 en corcheas, 10 en semicorcheas y la mitad final en fusas, con la resolución que cae.
  for (let k = 0; k < 8; k++) kick(bar(9) + k * 2 * S16, -11)
  for (let k = 0; k < 16; k++) { const t = bar(10) + k * S16; kick(t, -12 + k * 0.2); if (k >= 8) kick(t + S16 / 2, -13 + k * 0.2) }
  for (let n = 9; n <= 10; n++) { clap(bar(n) + BEAT, -19); clap(bar(n) + 3 * BEAT, -19) }
  hook(bar(12), { withApple: APPLE })
  kick(bar(12), -6); sub808(bar(12), 'A1', 1.6, -10); clap(bar(12) + BEAT, -16)
  I.pad({ t0: bar(12), t1: bar(12) + 0.5, notes: ['A3', 'C#4', 'E4', 'A4'], level: -22, attack: 0.02, release: 1.1 })
}

M.write(OUT, { wet: STYLE === 'club' ? 0.9 : 1.4, fadeMs: 250 })
writeFileSync(OUT.replace(/\.wav$/, '.json'), JSON.stringify({ style: STYLE, piece: PIECE, bpm: BPM, durationSec: DUR, appleHitSec: +tLa.toFixed(4) }, null, 1))
console.log(`${STYLE}/${PIECE}: ${OUT} · manzana en ${tLa.toFixed(3)} s`)
