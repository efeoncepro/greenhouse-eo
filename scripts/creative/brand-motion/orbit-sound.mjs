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
const DUR = { reveal: 4.2, open: 2.8 }[anim]
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

if (anim === 'reveal') {
  // Aire de la línea: ruido rosado muy bajo, se abre con el anillo y se va con el giro.
  addNoise({ t0: 0, t1: 2.2, cutoff: t => 900 + 500 * t, q: 1.6, gain: t => db(-40) * env(t, 0, 0.5, 1.4, 2.2), pan: () => 0 })
  // El arco: un hilo tonal muy suave que sube con la esfera.
  addTone({ t0: 0.25, t1: 1.3, freq: t => 520 + 90 * smooth((t - 0.25) / 0.9), partials: [[1, 1], [2, 0.12]], gain: t => db(-38) * env(t, 0.25, 0.5, 1.0, 1.3) })
  // El giro: subida tonal (quinta) que acompaña la inclinación.
  addTone({ t0: 0.9, t1: 2.0, freq: t => 160 + 60 * smooth((t - 0.95) / 0.9), partials: [[1, 1], [1.5, 0.45], [2, 0.18]], gain: t => db(-30) * env(t, 0.95, 1.5, 1.7, 2.0) })
  // El planeta aterriza.
  bell(1.84, 1318.5, -27, 4.5)
  // La nave: paso de aire con el corte subiendo y bajando; entra por la izquierda y se detiene al centro.
  addNoise({ t0: 1.5, t1: 2.45, cutoff: t => 350 + 2600 * Math.sin(Math.PI * smooth((t - 1.5) / 0.95)), q: 0.9, gain: t => db(-17) * env(t, 1.5, 1.85, 1.98, 2.4), pan: t => -0.85 + 0.85 * smooth((t - 1.55) / 0.7) })
  // Llegada: golpe grave corto.
  addTone({ t0: 2.2, t1: 2.9, freq: t => 62 + 30 * Math.exp(-(t - 2.22) * 18), partials: [[1, 1], [2, 0.2]], gain: t => db(-18) * (t < 2.22 ? 0 : Math.min(1, (t - 2.22) / 0.006) * Math.exp(-(t - 2.22) * 9)) })
  // Resolución del logo: acorde abierto (La, Do#, Mi, La) que decae; la cámara termina a los 3,25 s.
  for (const [f, lv] of [[440, -30], [554.37, -33], [659.25, -33], [880, -36]]) bell(3.22, f, lv, 1.6)
  // Eslogan: un brillo apenas audible.
  bell(3.12, 1760, -40, 3.2)
} else {
  // Letras que se recogen: suspiro de aire.
  addNoise({ t0: 0.25, t1: 0.95, cutoff: t => 2400 - 1500 * smooth((t - 0.25) / 0.7), q: 1.2, gain: t => db(-32) * env(t, 0.25, 0.5, 0.6, 0.95), pan: () => 0 })
  // La nave sale por la derecha, acelerando.
  addNoise({ t0: 1.05, t1: 1.85, cutoff: t => 500 + 2800 * smooth((t - 1.05) / 0.65), q: 0.9, gain: t => db(-17) * env(t, 1.05, 1.5, 1.6, 1.85), pan: t => 0.9 * smooth((t - 1.1) / 0.6) })
  // El giro de vuelta: tono que baja.
  addTone({ t0: 1.35, t1: 2.3, freq: t => 220 - 60 * smooth((t - 1.4) / 0.8), partials: [[1, 1], [1.5, 0.4], [2, 0.15]], gain: t => db(-31) * env(t, 1.4, 1.7, 1.95, 2.3) })
  // El arco se dibuja y el círculo se abre: campanilla suave al final.
  addTone({ t0: 2.0, t1: 2.8, freq: t => 520 + 90 * smooth((t - 2.0) / 0.8), partials: [[1, 1], [2, 0.12]], gain: t => db(-37) * env(t, 2.0, 2.2, 2.6, 2.8) })
  bell(2.72, 1318.5, -30, 3.5)
}

// Pico a -3 dBFS y escritura WAV de 24 bits.
let peak = 0

for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = peak > 0 ? db(-3) / peak : 1
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
