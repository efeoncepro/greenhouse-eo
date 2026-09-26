#!/usr/bin/env node
// Efeonce «La órbita» — diseño sonoro sintetizado (determinístico, sin muestras ni modelos de terceros).
//
//   node scripts/creative/brand-motion/orbit-sound.mjs --anim reveal|open --out <file.wav>
//
// Cada capa sigue un tramo de la animación (los mismos milisegundos que `orbit-scene.js`): aire de la línea, subida
// tonal del giro, campanilla del planeta, paso de la nave (paneo con su recorrido), golpe grave de llegada y acorde de
// resolución del logo. 48 kHz, estéreo, 24 bits. Sutil por diseño: acompaña, no protagoniza.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const anim = opt('--anim', 'reveal')
const out = path.resolve(opt('--out', `${anim}.wav`))

const SR = 48000
const DUR = { reveal: 3.6, open: 2.4, sting: 1.6 }[anim]
const N = Math.round(SR * (DUR + 0.6)) // cola para que el acorde final decaiga
const L = new Float64Array(N), R = new Float64Array(N)

// Ruido determinístico (xorshift) y filtro de estado variable con corte dependiente del tiempo.
let seed = 0x9e3779b9

const rnd = () => {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5

  return ((seed >>> 0) / 4294967296) * 2 - 1
}

const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : 1 - smooth((t - c) / (d - c)))
const db = v => 10 ** (v / 20)

function addNoise({ t0, t1, cutoff, q, gain, pan }) {
  let lp = 0, bp = 0

  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.ceil(t1 * SR)); i++) {
    const t = i / SR
    const f = cutoff(t)
    const F = 2 * Math.sin((Math.PI * f) / SR)
    const hp = rnd() - lp - q * bp

    bp += F * hp
    lp += F * bp
    const s = bp * gain(t)
    const p = pan(t) // -1 izquierda · 1 derecha (ley de potencia constante)
    const a = ((p + 1) * Math.PI) / 4

    L[i] += s * Math.cos(a)
    R[i] += s * Math.sin(a)
  }
}

function addTone({ t0, t1, freq, partials, gain, pan = () => 0 }) {
  const phase = partials.map(() => 0)

  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.ceil(t1 * SR)); i++) {
    const t = i / SR
    let s = 0

    partials.forEach(([mult, amp], k) => {
      phase[k] += (2 * Math.PI * freq(t) * mult) / SR
      s += Math.sin(phase[k]) * amp
    })
    s *= gain(t)
    const a = ((pan(t) + 1) * Math.PI) / 4

    L[i] += s * Math.cos(a)
    R[i] += s * Math.sin(a)
  }
}

const bell = (t0, f, level, decay = 5) => addTone({
  t0, t1: t0 + 2.2, freq: () => f,
  partials: [[1, 1], [2.01, 0.34], [3.0, 0.16], [4.2, 0.07]],
  gain: t => (t < t0 ? 0 : db(level) * Math.min(1, (t - t0) / 0.004) * Math.exp(-(t - t0) * decay))
})

// Impacto: grave que cae (subgrave), un golpe de ruido corto y un brillo agudo. Marca el momento en que algo encaja.
const impact = (t0, level = -8, pan = 0) => {
  addTone({ t0, t1: t0 + 0.7, freq: t => 58 * (1 + 0.6 * Math.exp(-(t - t0) * 30)), partials: [[1, 1], [2, 0.25]], gain: t => (t < t0 ? 0 : db(level) * Math.min(1, (t - t0) / 0.004) * Math.exp(-(t - t0) * 6.5)), pan: () => pan })
  addNoise({ t0, t1: t0 + 0.12, cutoff: t => 2600 - 1800 * clamp01((t - t0) / 0.1), q: 0.7, gain: t => db(level - 4) * Math.exp(-(t - t0) * 45), pan: () => pan })
  bell(t0 + 0.005, 2637, level - 20, 9)
}

const clamp01 = x => Math.max(0, Math.min(1, x))

// Paso de aire (whoosh): el corte sube hasta el pico y baja; se panea con el recorrido.
const whoosh = (t0, t1, peak, level, pan) => addNoise({
  t0, t1,
  cutoff: t => 300 + 3600 * Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 1.5,
  q: 0.8,
  gain: t => db(level) * env(t, t0, peak, peak + 0.05, t1),
  pan
})

if (anim === 'reveal') {
  // Aire de la línea y el arco que sube con la esfera.
  addNoise({ t0: 0, t1: 1.3, cutoff: t => 900 + 700 * t, q: 1.6, gain: t => db(-34) * env(t, 0, 0.3, 0.9, 1.3), pan: () => 0 })
  addTone({ t0: 0.15, t1: 0.95, freq: t => 520 + 140 * smooth((t - 0.15) / 0.65), partials: [[1, 1], [2, 0.12]], gain: t => db(-30) * env(t, 0.15, 0.3, 0.7, 0.95) })
  // Giro: subida de quinta, más decidida.
  addTone({ t0: 0.75, t1: 1.5, freq: t => 150 + 75 * smooth((t - 0.8) / 0.6), partials: [[1, 1], [1.5, 0.5], [2, 0.2]], gain: t => db(-24) * env(t, 0.8, 1.2, 1.3, 1.5) })
  bell(1.4, 1318.5, -22, 5)
  // La nave entra por la izquierda y encaja al centro.
  whoosh(1.2, 1.95, 1.75, -9, t => -0.9 + 0.9 * smooth((t - 1.25) / 0.6))
  impact(1.87, -6)
  // Cámara a la «o» (más suave) y resolución.
  whoosh(2.05, 2.8, 2.25, -19, () => 0)
  bell(2.65, 1760, -30, 3.2)
  for (const [f, lv] of [[440, -22], [554.37, -25], [659.25, -25], [880, -28]]) bell(2.75, f, lv, 1.4)
} else if (anim === 'sting') {
  whoosh(0.05, 0.65, 0.5, -9, t => -0.9 + 0.9 * smooth((t - 0.1) / 0.5))
  impact(0.58, -6)
  whoosh(0.72, 1.3, 0.9, -19, () => 0)
  for (const [f, lv] of [[440, -22], [554.37, -25], [659.25, -25], [880, -28]]) bell(1.25, f, lv, 1.4)
} else {
  // Las letras se recogen de golpe (aire que se cierra) y la cámara vuelve.
  addNoise({ t0: 0.12, t1: 0.5, cutoff: t => 3200 - 2400 * smooth((t - 0.12) / 0.35), q: 1.1, gain: t => db(-24) * env(t, 0.12, 0.35, 0.4, 0.5), pan: () => 0 })
  whoosh(0.35, 1.0, 0.6, -20, () => 0)
  addTone({ t0: 0.93, t1: 1.3, freq: () => 70, partials: [[1, 1], [2, 0.2]], gain: t => (t < 0.93 ? 0 : db(-18) * Math.min(1, (t - 0.93) / 0.005) * Math.exp(-(t - 0.93) * 12)) })
  // Anticipación (tensión corta) y lanzamiento a la derecha.
  addTone({ t0: 0.98, t1: 1.16, freq: t => 300 + 500 * smooth((t - 0.98) / 0.17), partials: [[1, 1], [2, 0.3]], gain: t => db(-30) * env(t, 0.98, 1.1, 1.14, 1.16) })
  impact(1.15, -8, 0.2)
  whoosh(1.15, 1.75, 1.35, -9, t => 0.9 * smooth((t - 1.15) / 0.45))
  // El giro de vuelta y el arco que se abre.
  addTone({ t0: 1.25, t1: 1.95, freq: t => 230 - 70 * smooth((t - 1.25) / 0.6), partials: [[1, 1], [1.5, 0.4], [2, 0.15]], gain: t => db(-27) * env(t, 1.25, 1.5, 1.7, 1.95) })
  addTone({ t0: 1.65, t1: 2.3, freq: t => 520 + 140 * smooth((t - 1.65) / 0.6), partials: [[1, 1], [2, 0.12]], gain: t => db(-31) * env(t, 1.65, 1.8, 2.1, 2.3) })
  bell(2.2, 1318.5, -22, 3.5)
}

// Pico a -1 dBFS y escritura WAV de 24 bits.
let peak = 0

for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = peak > 0 ? db(-1) / peak : 1
const buf = Buffer.alloc(44 + N * 6)

buf.write('RIFF', 0)
buf.writeUInt32LE(36 + N * 6, 4)
buf.write('WAVEfmt ', 8)
buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1, 20)
buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 6, 28)
buf.writeUInt16LE(6, 32)
buf.writeUInt16LE(24, 34)
buf.write('data', 36)
buf.writeUInt32LE(N * 6, 40)

for (let i = 0; i < N; i++) {
  for (const [c, ch] of [[0, L], [1, R]]) {
    const v = Math.max(-1, Math.min(1, ch[i] * g))

    buf.writeIntLE(Math.round(v * 8388607), 44 + i * 6 + c * 3, 3)
  }
}

writeFileSync(out, buf)
console.log(`${anim}: ${out} (${(N / SR).toFixed(2)} s)`)
