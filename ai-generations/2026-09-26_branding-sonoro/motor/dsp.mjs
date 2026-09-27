// Primitivas de síntesis del branding sonoro (determinísticas; sin muestras ni modelos de terceros).
// createMix() devuelve un lienzo estéreo con bus de halo (reverb) y los instrumentos del sistema.
import { writeFileSync } from 'node:fs'

export const SR = 48000
export const hz = midi => 440 * 2 ** ((midi - 69) / 12)
const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
// 'A5' → 81 · 'F#3' → 54
export const midi = name => { const m = /^([A-G]#?)(-?\d)$/.exec(name); return 12 * (Number(m[2]) + 1) + NAMES[m[1]] }
export const note = name => hz(midi(name))
export const db = v => 10 ** (v / 20)
export const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
export const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : 1 - smooth((t - c) / (d - c)))
const clamp01 = x => Math.max(0, Math.min(1, x))

// Biquad RBJ sobre un arreglo (in situ). type: lowpass | highpass | peak | bandpass.
export function biquad(x, type, f, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * f) / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = 10 ** (gainDb / 40)
  let b0, b1, b2, a0, a1, a2
  if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al }
  else if (type === 'highpass') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al }
  else if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al }
  else { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y
  }
  return x
}

export function createMix({ dur, seed = 0x9e3779b9 }) {
  const N = Math.round(SR * dur)
  const dry = [new Float64Array(N), new Float64Array(N)]
  const send = [new Float64Array(N), new Float64Array(N)]
  let s0 = seed
  const rnd = () => { s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5; return ((s0 >>> 0) / 4294967296) * 2 - 1 }
  const tail = (i, i1) => Math.min(1, (i1 - i) / (SR * 0.06))
  const put = (i, s, pan, sendAmt) => {
    const a = ((pan + 1) * Math.PI) / 4, l = s * Math.cos(a), r = s * Math.sin(a)
    dry[0][i] += l; dry[1][i] += r; send[0][i] += l * sendAmt; send[1][i] += r * sendAmt
  }
  const range = (t0, len) => [Math.max(0, Math.floor(t0 * SR)), Math.min(N, Math.ceil((t0 + len) * SR))]

  // Modal (mazos, campanas). crush > 1 sostiene muestras: el «glitch» digital.
  function modal({ t0, f, level, partials, attack = 0.003, pan = 0, sendAmt = 0.3, len = 3, crush = 1 }) {
    const [i0, i1] = range(t0, len), ph = partials.map(() => 0)
    let held = 0
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR
      let s = 0
      partials.forEach(([m, a, d], k) => { ph[k] += (2 * Math.PI * f * m) / SR; s += Math.sin(ph[k]) * a * Math.exp(-t * d) })
      if (crush > 1) { if ((i - i0) % crush === 0) held = Math.round(s * 8) / 8; s = held }
      put(i, s * db(level) * Math.min(1, t / attack) * tail(i, i1), pan, sendAmt)
    }
  }
  function tick(t0, level, cutoff = 4200, pan = 0, decay = 320) {
    let lp = 0, bp = 0
    const F = 2 * Math.sin((Math.PI * cutoff) / SR), [i0, i1] = range(t0, 0.03)
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, hp = rnd() - lp - 0.9 * bp
      bp += F * hp; lp += F * bp
      put(i, bp * db(level) * Math.exp(-t * decay), pan, 0.1)
    }
  }
  // Tono con frecuencia y ganancia en función del tiempo absoluto.
  function tone({ t0, t1, freq, partials, gain, pan = () => 0, sendAmt = 0.05 }) {
    const [i0, i1] = range(t0, t1 - t0), ph = partials.map(() => 0)
    for (let i = i0; i < i1; i++) {
      const t = i / SR
      let s = 0
      partials.forEach(([m, a], k) => { ph[k] += (2 * Math.PI * freq(t) * m) / SR; s += Math.sin(ph[k]) * a })
      put(i, s * gain(t) * tail(i, i1), pan(t), sendAmt)
    }
  }
  function noise({ t0, t1, cutoff, q, gain, pan = () => 0, sendAmt = 0.05 }) {
    let lp = 0, bp = 0
    const [i0, i1] = range(t0, t1 - t0)
    for (let i = i0; i < i1; i++) {
      const t = i / SR, F = 2 * Math.sin((Math.PI * Math.min(cutoff(t), SR / 4)) / SR), hp = rnd() - lp - q * bp
      bp += F * hp; lp += F * bp
      put(i, bp * gain(t) * tail(i, i1), pan(t), sendAmt)
    }
  }

  const I = {
    // Las tres ventanas.
    vibes: (t0, f, level, pan = 0, crush = 1) => { tick(t0, level - 16, 4200, pan); modal({ t0, f, level, partials: [[1, 1, 2.2], [4.0, 0.22, 7], [10.0, 0.06, 16]], pan, sendAmt: 0.28, len: 2.4, crush }) },
    // La esfera de Growth.
    bell: (t0, f, level, pan = 0) => modal({ t0, f, level, partials: [[1, 1, 1.4], [2.01, 0.34, 2.2], [3.0, 0.16, 3.5], [4.2, 0.07, 5]], pan, sendAmt: 0.45, len: 3 }),
    impact: (t0, level = -9) => {
      tone({ t0, t1: t0 + 1.1, freq: t => 58 * (1 + 0.6 * Math.exp(-(t - t0) * 30)), partials: [[1, 1], [2, 0.25]], gain: t => db(level) * Math.min(1, (t - t0) / 0.004) * Math.exp(-(t - t0) * 6.5) })
      noise({ t0, t1: t0 + 0.12, cutoff: t => 2600 - 1800 * clamp01((t - t0) / 0.1), q: 0.7, gain: t => db(level - 4) * Math.exp(-(t - t0) * 45) })
    },
    // Colchón armónico: aditivo cálido con dos voces levemente desafinadas (coro).
    pad: ({ t0, t1, notes, level, attack = 0.5, release = 0.7, bright = 0.35 }) => {
      for (const n of notes) for (const [cents, pan] of [[-4, -0.35], [4, 0.35]]) {
        const f = note(n) * 2 ** (cents / 1200)
        tone({ t0, t1: t1 + release, freq: () => f, partials: [[1, 1], [2, bright], [3, bright * 0.5], [4, bright * 0.22]], gain: t => db(level) * env(t, t0, t0 + attack, t1, t1 + release), pan: () => pan, sendAmt: 0.5 })
      }
    },
    bass: (t0, n, len, level = -16) => tone({ t0, t1: t0 + len, freq: () => note(n), partials: [[1, 1], [2, 0.3], [3, 0.08]], gain: t => db(level) * Math.min(1, (t - t0) / 0.01) * Math.exp(-(t - t0) * 1.2) }),
    // Pulso: un bombo suave, más latido que batería.
    pulse: (t0, level = -14) => tone({ t0, t1: t0 + 0.4, freq: t => 48 + 70 * Math.exp(-(t - t0) * 40), partials: [[1, 1]], gain: t => db(level) * Math.min(1, (t - t0) / 0.002) * Math.exp(-(t - t0) * 9) }),
    hat: (t0, level = -30, pan = 0.2) => tick(t0, level, 9000, pan, 180),
    riser: (t0, t1, level = -24) => {
      tone({ t0, t1, freq: t => 440 * 2 ** clamp01((t - t0) / (t1 - t0)), partials: [[1, 1], [2, 0.2]], gain: t => db(level) * smooth(clamp01((t - t0) / (t1 - t0))) ** 2 })
      noise({ t0, t1, cutoff: t => 400 + 6000 * clamp01((t - t0) / (t1 - t0)) ** 2, q: 0.9, gain: t => db(level - 6) * smooth(clamp01((t - t0) / (t1 - t0))) ** 2 })
    }
  }

  function freeverb(input, spread, room = 0.8, damp = 0.35) {
    const sc = SR / 44100
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ buf: new Float64Array(Math.round((d + spread) * sc)), i: 0, st: 0 }))
    const aps = [556, 441, 341, 225].map(d => ({ buf: new Float64Array(Math.round((d + spread) * sc)), i: 0 }))
    const o = new Float64Array(N)
    for (let n = 0; n < N; n++) {
      const x = input[n] * 0.015
      let s = 0
      for (const c of combs) { const y = c.buf[c.i]; c.st = y * (1 - damp) + c.st * damp; c.buf[c.i] = x + c.st * room; c.i = (c.i + 1) % c.buf.length; s += y }
      for (const a of aps) { const b = a.buf[a.i]; a.buf[a.i] = s + b * 0.5; a.i = (a.i + 1) % a.buf.length; s = b - s }
      o[n] = s
    }
    return o
  }

  // Mezcla final: halo, fundido, pico a −1 dBFS, WAV 48 kHz / 24 bits.
  // gain: ganancia fija (misma escala entre archivos) en vez de normalizar por pico.
  // gate(t): multiplicador final después del halo (corte en seco que también se lleva la cola).
  function write(path, { wet = 1.6, fadeMs = 450, peakDb = -1, gain = null, gate = null } = {}) {
    const wl = freeverb(send[0], 0), wr = freeverb(send[1], 23)
    const L = new Float64Array(N), R = new Float64Array(N), fs = N - Math.round((SR * fadeMs) / 1000)
    let peak = 0
    for (let i = 0; i < N; i++) {
      const f = (i > fs ? 1 - smooth((i - fs) / (N - fs)) : 1) * (gate ? gate(i / SR) : 1)
      L[i] = (dry[0][i] + wl[i] * wet) * f; R[i] = (dry[1][i] + wr[i] * wet) * f
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
    }
    const g = gain ?? db(peakDb) / peak, buf = Buffer.alloc(44 + N * 6)
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 6, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16)
    buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 6, 28)
    buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(N * 6, 40)
    for (let i = 0; i < N; i++) for (const [c, ch] of [[0, L], [1, R]]) buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, ch[i] * g)) * 8388607), 44 + i * 6 + c * 3, 3)
    writeFileSync(path, buf)
    return { peak, gain: g }
  }

  // Suma un bus estéreo ya procesado (p. ej. guitarras distorsionadas) a la mezcla.
  function addStereo(L, R, sendAmt = 0.2, gain = 1) {
    for (let i = 0; i < N; i++) { const l = L[i] * gain, r = R[i] * gain; dry[0][i] += l; dry[1][i] += r; send[0][i] += l * sendAmt; send[1][i] += r * sendAmt }
  }

  // Suma un segmento mono ya sintetizado desde t0, con paneo y envío al halo.
  function addMono(t0, seg, pan = 0, sendAmt = 0.1, gain = 1) {
    const i0 = Math.round(t0 * SR)
    for (let k = 0; k < seg.length; k++) { const i = i0 + k; if (i >= 0 && i < N) put(i, seg[k] * gain, pan, sendAmt) }
  }

  return { N, I, modal, tick, tone, noise, write, addStereo, addMono, rnd }
}
