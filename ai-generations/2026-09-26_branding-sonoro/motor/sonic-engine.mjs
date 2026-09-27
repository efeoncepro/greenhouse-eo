#!/usr/bin/env node
// Efeonce «La órbita» — motor sonoro de exploración (ronda 1).
//
// Síntesis determinística, sin muestras ni modelos de terceros (misma doctrina que
// scripts/creative/brand-motion/orbit-sound.mjs, cuyas capas de SFX se reutilizan para el sting).
//
//   node sonic-engine.mjs --territory puntos|pregunta|orbita --mode logo|sting|reveal [--line growth|brand|engine|voice|revenue]
//     [--timbre <instrumento de la esfera>] [--bloom <s>] --out <file.wav>
//
// Gramática: el anillo (acorde abierto) pregunta · tres notas breves = las tres ventanas, lo que se piensa ·
// pausa (anticipación) · la esfera: una nota con golpe que resuelve · el halo: la cola de luz.
// PROTOTIPO: los valores viven aquí mientras se explora; al aprobarse pasan a tokens AXIS.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const territory = opt('--territory', 'puntos')
const mode = opt('--mode', 'logo')
const line = opt('--line', 'growth')
const out = path.resolve(opt('--out', `${territory}-${mode}-${line}.wav`))

const SR = 48000
const hz = midi => 440 * 2 ** ((midi - 69) / 12)
const N_ = { A2: 45, E3: 52, A3: 57, E4: 64, A4: 69, B4: 71, Cs5: 73, E5: 76, Fs5: 78, Gs5: 80, A5: 81, B5: 83, Cs6: 85, E6: 88, A6: 93 }

// Territorios: tres notas (las ventanas) + la esfera. Todo en La mayor, la tonalidad del motion aprobado.
const TERRITORIES = {
  puntos: { dots: ['E5', 'E5', 'E5'], sphere: 'A5', idea: 'Puntos suspensivos: tres puntos iguales que se vuelven uno (sube una cuarta, V→I).' },
  pregunta: { dots: ['Cs5', 'E5', 'B5'], sphere: 'A5', idea: 'Pregunta y respuesta: sube como una pregunta y la respuesta asienta un paso abajo.' },
  orbita: { dots: ['A4', 'E5', 'B5'], sphere: 'Cs6', idea: 'Órbita abierta: quintas apiladas (el anillo) y la esfera cae en la tercera, luminosa.' }
}

const T = TERRITORIES[territory]
if (!T) throw new Error(`territorio desconocido: ${territory}`)

// Tiempos. logo: pieza independiente. sting: calza con pieces.sting (impacto 580 ms, acorde 1250 ms).
const TIMING = {
  logo: { dur: 2.9, ring: 0.0, dots: [0.3, 0.44, 0.58], sphere: 0.95, bloom: 1.0 },
  sting: { dur: 2.2, ring: 0.0, dots: [0.16, 0.28, 0.4], sphere: 0.58, bloom: 1.25 },
  // reveal: calza con pieces.reveal V1.1 (nave 1250–1900, impacto 1870, letras 2350, eslogan 2650–3050) + 1 s de cuadro final.
  reveal: { dur: 4.6, ring: 0.0, dots: [1.42, 1.54, 1.66], sphere: 1.87, bloom: 2.75 }
}[mode]
if (!TIMING) throw new Error(`modo desconocido: ${mode}`)
if (args.includes('--bloom')) TIMING.bloom = Number(opt('--bloom'))

// El acento sonoro de cada línea: sólo cambia el timbre de la esfera (la melodía no cambia nunca).
// Voice: el coro se descartó (operador, 2026-09-26); candidatos ronda 2: eco · cuerda · pulso.
const SPHERE_TIMBRE = opt('--timbre', { growth: 'bell', brand: 'marimba', engine: 'fm', voice: 'eco', revenue: 'lowbell' }[line])

const N = Math.round(SR * TIMING.dur)
const dry = [new Float64Array(N), new Float64Array(N)]
const send = [new Float64Array(N), new Float64Array(N)] // bus al halo (reverb)

// Ruido determinístico (xorshift).
let seed = 0x9e3779b9
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }
const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : 1 - smooth((t - c) / (d - c)))
const db = v => 10 ** (v / 20)
const clamp01 = x => Math.max(0, Math.min(1, x))
// Ventana de salida: los últimos 60 ms de cada voz van a cero (sin clics al cortar).
const tail = (i, i1) => Math.min(1, (i1 - i) / (SR * 0.06))

function put(i, s, pan, sendAmt) {
  const a = ((pan + 1) * Math.PI) / 4
  const l = s * Math.cos(a), r = s * Math.sin(a)
  dry[0][i] += l; dry[1][i] += r
  send[0][i] += l * sendAmt; send[1][i] += r * sendAmt
}

// Modal: suma de parciales con decaimiento propio (mallets, campanas). attack en s.
function modal({ t0, f, level, partials, attack = 0.003, pan = 0, sendAmt = 0.3, len = 3, trem = null }) {
  const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.ceil((t0 + len) * SR))
  const ph = partials.map(() => 0)
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR
    let s = 0
    partials.forEach(([mult, amp, decay], k) => {
      ph[k] += (2 * Math.PI * f * mult) / SR
      s += Math.sin(ph[k]) * amp * Math.exp(-t * decay)
    })
    const tr = trem ? 1 - trem.depth * 0.5 * (1 - Math.cos(2 * Math.PI * trem.rate * t)) : 1
    put(i, s * tr * db(level) * Math.min(1, t / attack) * tail(i, i1), pan, sendAmt)
  }
}

// Cuerda pulsada (Karplus-Strong con retardo fraccional para afinar exacto).
function pluck({ t0, f, level, pan = 0, len = 2.4, decay = 0.9965, sendAmt = 0.35 }) {
  const size = 8192, buf = new Float64Array(size)
  const L = SR / f - 0.5
  const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.ceil((t0 + len) * SR))
  let w = 0, prev = 0, lp = 0
  for (let k = 0; k < Math.ceil(L) + 2; k++) { lp += 0.5 * (rnd() - lp); buf[w] = lp; w = (w + 1) % size }
  for (let i = i0; i < i1; i++) {
    const r = w - L, ri = Math.floor(r), fr = r - ri
    const a = buf[(ri + size) % size], b = buf[(ri + 1 + size) % size]
    const d = a + (b - a) * fr
    const y = decay * 0.5 * (d + prev)
    prev = d
    buf[w] = y; w = (w + 1) % size
    put(i, d * 1.6 * db(level) * tail(i, i1), pan, sendAmt)
  }
}

// Contacto del mazo: clic de ruido filtrado, muy corto (le da el «toque» tocado a mano).
function tick(t0, level, cutoff = 3500, pan = 0) {
  let lp = 0, bp = 0
  const F = 2 * Math.sin((Math.PI * cutoff) / SR)
  const i0 = Math.floor(t0 * SR)
  for (let i = i0; i < Math.min(N, i0 + SR * 0.02); i++) {
    const t = (i - i0) / SR
    const hp = rnd() - lp - 0.9 * bp
    bp += F * hp; lp += F * bp
    put(i, bp * db(level) * Math.exp(-t * 320), pan, 0.1)
  }
}

// FM de dos operadores (timbre sintético y preciso: Engine).
function fm({ t0, f, level, ratio = 2, index = 2.2, decay = 3, pan = 0, sendAmt = 0.3, len = 2.5 }) {
  const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.ceil((t0 + len) * SR))
  let pc = 0, pm = 0
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR
    pm += (2 * Math.PI * f * ratio) / SR
    pc += (2 * Math.PI * f) / SR
    const s = Math.sin(pc + index * Math.exp(-t * 6) * Math.sin(pm))
    put(i, s * db(level) * Math.min(1, t / 0.002) * Math.exp(-t * decay) * tail(i, i1), pan, sendAmt)
  }
}

// Coro breve: vocales formantes sobre un pulso (Voice). Aire vocal, sin palabras.
function choir({ t0, f, level, len = 1.6, pan = 0 }) {
  const formants = [[730, 1.0, 80], [1090, 0.5, 90], [2440, 0.25, 120]] // «a»
  const voices = [-7, 0, 6].map(c => f * 2 ** (c / 1200))
  const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.ceil((t0 + len) * SR))
  const st = formants.map(() => ({ lp: 0, bp: 0 }))
  const ph = voices.map(() => 0)
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR
    let src = 0
    voices.forEach((v, k) => { ph[k] = (ph[k] + v / SR) % 1; src += (ph[k] * 2 - 1) * 0.33 })
    src += rnd() * 0.04
    let s = 0
    formants.forEach(([fc, g, bw], k) => {
      const F = 2 * Math.sin((Math.PI * fc) / SR), q = bw / fc
      const hp = src - st[k].lp - q * st[k].bp
      st[k].bp += F * hp; st[k].lp += F * st[k].bp
      s += st[k].bp * g
    })
    put(i, s * db(level) * env(t, 0, 0.05, len * 0.35, len), pan, 0.55)
  }
}

// Karplus-Strong (cuerda pulsada) — reservado para variantes.
const INSTR = {
  vibes: (t0, f, level, pan) => { tick(t0, level - 16, 4200, pan); modal({ t0, f, level, partials: [[1, 1, 2.2], [4.0, 0.22, 7], [10.0, 0.06, 16]], pan, sendAmt: 0.28, len: 2.4 }) },
  bell: (t0, f, level, pan) => modal({ t0, f, level, partials: [[1, 1, 1.4], [2.01, 0.34, 2.2], [3.0, 0.16, 3.5], [4.2, 0.07, 5]], pan, sendAmt: 0.45, len: 3 }),
  lowbell: (t0, f, level, pan) => { modal({ t0, f: f / 2, level, partials: [[1, 1, 1.6], [2.01, 0.4, 2.4], [3.0, 0.2, 4]], pan, sendAmt: 0.4, len: 3 }); modal({ t0, f, level: level - 8, partials: [[1, 1, 2.5]], pan, sendAmt: 0.4 }) },
  marimba: (t0, f, level, pan) => { tick(t0, level - 12, 2500, pan); modal({ t0, f, level: level + 1, partials: [[1, 1, 4.5], [3.93, 0.3, 13], [9.2, 0.08, 30]], pan, sendAmt: 0.3, len: 2 }) },
  fm: (t0, f, level, pan) => fm({ t0, f, level: level - 2, pan }),
  // Voice, ronda 2. eco: el mensaje que se propaga (la nota se repite y viaja de lado a lado).
  eco: (t0, f, level, pan) => {
    const partials = [[1, 1, 1.9], [2.0, 0.42, 3.2], [3.0, 0.2, 5], [5.02, 0.08, 9]]
    modal({ t0, f, level, partials, pan, sendAmt: 0.4, len: 2.6 })
    for (let k = 1; k <= 4; k++) modal({ t0: t0 + k * 0.17, f, level: level - 5 * k - 2, partials, pan: k % 2 ? -0.6 : 0.6, sendAmt: 0.6, len: 2 })
  },
  // cuerda: pulsada, cercana; la voz de quien cuenta algo.
  cuerda: (t0, f, level, pan) => { pluck({ t0, f, level: level + 2, pan }); pluck({ t0: t0 + 0.012, f: f * 1.002, level: level - 6, pan: pan + 0.25 }) },
  // pulso: nota con trémolo de 6 Hz, como una señal que se transmite.
  pulso: (t0, f, level, pan) => { tick(t0, level - 16, 4200, pan); modal({ t0, f, level: level + 1, partials: [[1, 1, 1.5], [4.0, 0.2, 5], [10.0, 0.05, 12]], pan, sendAmt: 0.4, len: 2.8, trem: { rate: 6, depth: 0.45 } }) },
  choir: (t0, f, level, pan) => { modal({ t0, f, level: level - 6, partials: [[1, 1, 2], [2.01, 0.3, 3]], pan, sendAmt: 0.4 }); choir({ t0, f, level: level - 3, pan }) }
}

// ─── SFX del motion aprobado (copiados de orbit-sound.mjs para el modo sting) ───
function addNoise({ t0, t1, cutoff, q, gain, pan }) {
  let lp = 0, bp = 0
  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.ceil(t1 * SR)); i++) {
    const t = i / SR
    const F = 2 * Math.sin((Math.PI * cutoff(t)) / SR)
    const hp = rnd() - lp - q * bp
    bp += F * hp; lp += F * bp
    put(i, bp * gain(t), pan(t), 0.05)
  }
}
function addTone({ t0, t1, freq, partials, gain, pan = () => 0 }) {
  const ph = partials.map(() => 0)
  const i1 = Math.min(N, Math.ceil(t1 * SR))
  for (let i = Math.floor(t0 * SR); i < i1; i++) {
    const t = i / SR
    let s = 0
    partials.forEach(([m, a], k) => { ph[k] += (2 * Math.PI * freq(t) * m) / SR; s += Math.sin(ph[k]) * a })
    put(i, s * gain(t) * tail(i, i1), pan(t), 0.05)
  }
}
const whoosh = (t0, t1, peak, level, pan) => addNoise({ t0, t1, cutoff: t => 300 + 3600 * Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 1.5, q: 0.8, gain: t => db(level) * env(t, t0, peak, peak + 0.05, t1), pan })
const impact = (t0, level = -8) => {
  addTone({ t0, t1: t0 + 1.1, freq: t => 58 * (1 + 0.6 * Math.exp(-(t - t0) * 30)), partials: [[1, 1], [2, 0.25]], gain: t => (t < t0 ? 0 : db(level) * Math.min(1, (t - t0) / 0.004) * Math.exp(-(t - t0) * 6.5)) })
  addNoise({ t0, t1: t0 + 0.12, cutoff: t => 2600 - 1800 * clamp01((t - t0) / 0.1), q: 0.7, gain: t => db(level - 4) * Math.exp(-(t - t0) * 45), pan: () => 0 })
}

// ─── Composición ───
const { dots, sphere } = T

// El anillo: acorde abierto (quinta), sostenido y tenue. Pregunta, no resuelve.
for (const [n, lv] of [['A2', -34], ['E3', -34], ['A3', -35], ['E4', -38]]) {
  addTone({ t0: TIMING.ring, t1: TIMING.sphere + 0.05, freq: () => hz(N_[n]), partials: [[1, 1], [2, 0.15], [3, 0.05]], gain: t => db(lv) * env(t, TIMING.ring, TIMING.ring + 0.25, TIMING.sphere - 0.12, TIMING.sphere + 0.05), pan: () => 0 })
}

// Las tres ventanas: notas breves, livianas, sin golpe, paneadas en el recorrido (izq → centro).
dots.forEach((n, k) => INSTR.vibes(TIMING.dots[k], hz(N_[n]), -14 + k, -0.45 + k * 0.2))

// La esfera: la respuesta, con golpe (impacto grave + nota) al centro.
impact(TIMING.sphere, mode === 'sting' ? -6 : -9)
INSTR[SPHERE_TIMBRE](TIMING.sphere + 0.004, hz(N_[sphere]), -8, 0)

// El halo: el acorde de La florece suave bajo la esfera (misma resolución que el motion aprobado).
for (const [n, lv] of [['A4', -30], ['Cs5', -33], ['E5', -33], ['A5', -36]]) {
  modal({ t0: TIMING.bloom, f: hz(N_[n]), level: lv, partials: [[1, 1, 1.3], [2.01, 0.2, 2.5]], attack: 0.06, sendAmt: 0.6, len: 2.5 })
}

if (mode === 'reveal') {
  // Capas del reveal aprobado que se conservan: aire de la línea, el arco que sube, la subida de quinta del giro,
  // el paso de la nave (paneado) y la cámara. La campanilla del planeta (1,4 s) la reemplazan las tres ventanas.
  addNoise({ t0: 0, t1: 1.3, cutoff: t => 900 + 700 * t, q: 1.6, gain: t => db(-34) * env(t, 0, 0.3, 0.9, 1.3), pan: () => 0 })
  addTone({ t0: 0.15, t1: 0.95, freq: t => 520 + 140 * smooth((t - 0.15) / 0.65), partials: [[1, 1], [2, 0.12]], gain: t => db(-32) * env(t, 0.15, 0.3, 0.7, 0.95) })
  addTone({ t0: 0.75, t1: 1.5, freq: t => 150 + 75 * smooth((t - 0.8) / 0.6), partials: [[1, 1], [1.5, 0.5], [2, 0.2]], gain: t => db(-27) * env(t, 0.8, 1.2, 1.3, 1.5) })
  whoosh(1.2, 1.95, 1.75, -13, t => -0.9 + 0.9 * smooth((t - 1.25) / 0.6))
  whoosh(2.05, 2.8, 2.25, -21, () => 0)
}

if (mode === 'sting') {
  whoosh(0.05, 0.65, 0.5, -12, t => -0.9 + 0.9 * smooth((t - 0.1) / 0.5))
  whoosh(0.72, 1.3, 0.9, -21, () => 0)
}

// ─── Halo: reverb Freeverb (8 combs + 4 allpass por canal, dispersión estéreo 23 muestras) ───
function freeverb(input, spread, room = 0.78, damp = 0.35) {
  const scale = SR / 44100
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ buf: new Float64Array(Math.round((d + spread) * scale)), i: 0, store: 0 }))
  const aps = [556, 441, 341, 225].map(d => ({ buf: new Float64Array(Math.round((d + spread) * scale)), i: 0 }))
  const outp = new Float64Array(N)
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015
    let s = 0
    for (const c of combs) {
      const y = c.buf[c.i]
      c.store = y * (1 - damp) + c.store * damp
      c.buf[c.i] = x + c.store * room
      c.i = (c.i + 1) % c.buf.length
      s += y
    }
    for (const a of aps) {
      const b = a.buf[a.i]
      a.buf[a.i] = s + b * 0.5
      a.i = (a.i + 1) % a.buf.length
      s = b - s
    }
    outp[n] = s
  }
  return outp
}

const wetL = freeverb(send[0], 0), wetR = freeverb(send[1], 23)
const L = new Float64Array(N), R = new Float64Array(N)
const fadeStart = N - Math.round(SR * 0.45) // fundido final 0,45 s (motion.sound)
for (let i = 0; i < N; i++) {
  const f = i > fadeStart ? 1 - smooth((i - fadeStart) / (N - fadeStart)) : 1
  L[i] = (dry[0][i] + wetL[i] * 1.6) * f
  R[i] = (dry[1][i] + wetR[i] * 1.6) * f
}

// Pico a −1 dBFS, WAV 48 kHz / 24 bits.
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = db(-1) / peak
const buf = Buffer.alloc(44 + N * 6)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 6, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 6, 28)
buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(N * 6, 40)
for (let i = 0; i < N; i++) for (const [c, ch] of [[0, L], [1, R]]) buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, ch[i] * g)) * 8388607), 44 + i * 6 + c * 3, 3)
writeFileSync(out, buf)
console.log(`${territory}/${mode}/${line}: ${path.basename(out)} (${TIMING.dur} s) — ${T.idea}`)
