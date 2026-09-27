#!/usr/bin/env node
// Glitch — el tema (ronda 8, PROPUESTA). Sólo Glitch, nunca Efeonce. Reemplaza a Pulso y Club (ronda 7, descartados:
// «no combina con el punch de la intro y el cierre del motion, no tiene el espíritu Glitch»).
//
// Principio: la música SALE del diseño sonoro aprobado (B) y se amarra al motion.
//   · 150 BPM: una semicorchea = 0,1 s = 3 cuadros a 30 fps. Los golpes del motion caen en la grilla: el quiebre (f24,
//     semicorchea 8), la manzana (f48, tiempo 1 del compás 2), «se abre» (f69, una semicorchea ANTES del tiempo), el
//     wordmark (f78), el corte (f105) y el silencio (f108).
//   · Instrumentos = la paleta B: bytes afinados, tartamudeo, desgarro, clic, la manzana. Nada de instrumentos de género.
//   · La edición es el instrumento: el groove se graba derecho y después se CORTA como una cinta (repeticiones de búfer,
//     silencio digital en seco). El silencio es parte del ritmo.
//   · Grave sólo en la manzana: el bombo es seco y medio; el sub existe una vez, cuando cae la manzana.
//   · La apertura aprobada (B, intacta) es el drop: la intro desemboca en ella y la banda golpea en sus mismos cuadros.
//   · El ticker: un patrón 3-3-2 de bytes, la urgencia de una cortina de noticias, dicha en datos.
//
//   node glitch-theme.mjs --version vlog|podcast --apertura <apertura.wav aprobado> --out <file.wav>
//     vlog: 2 compases antes de la apertura (≈ 7,2 s) · podcast: 6 compases (≈ 13,6 s)
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const DSP = process.env.BRAND_SOUND_DIR
  ? path.join(process.env.BRAND_SOUND_DIR, 'src/dsp.mjs')
  : new URL('../../../../efeonce-brand-workshop/tools/brand-sound/src/dsp.mjs', import.meta.url).pathname
const { SR, biquad, createMix, db, note } = await import(DSP)

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const VERSION = opt('--version', 'vlog')
const APERTURA = path.resolve(opt('--apertura', 'glitch-sfx/b/apertura.wav'))
const OUT = path.resolve(opt('--out', `glitch-tema-${VERSION}.wav`))

const S = 0.1, BEAT = 0.4, BAR = 1.6 // 150 BPM
const PRE = VERSION === 'podcast' ? 6 : 2 // compases antes de la apertura
const TA = PRE * BAR // inicio de la apertura aprobada
const DUR = TA + 4 // la apertura dura 4 s (corte a silencio en 3,6 s)

// ── Lectura y escritura de WAV (24 bits, estéreo, 48 kHz) ────────────────────────────────────────────────────
const readWav = file => {
  const b = readFileSync(file)
  let o = 12, fmt, data
  while (o < b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = o + 8; if (id === 'data') { data = { at: o + 8, len }; break } o += 8 + len + (len % 2) }
  const ch = b.readUInt16LE(fmt + 2), rate = b.readUInt32LE(fmt + 4), bits = b.readUInt16LE(fmt + 14)
  if (rate !== SR || bits !== 24) throw new Error(`${file}: se espera 48 kHz / 24 bits (es ${rate} / ${bits})`)
  const n = data.len / (3 * ch), L = new Float64Array(n), R = new Float64Array(n)
  for (let i = 0; i < n; i++) { L[i] = b.readIntLE(data.at + i * 3 * ch, 3) / 8388607; R[i] = ch > 1 ? b.readIntLE(data.at + i * 3 * ch + 3, 3) / 8388607 : L[i] }
  return [L, R]
}
const writeWav = (file, [L, R]) => {
  const n = L.length, buf = Buffer.alloc(44 + n * 6)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 6, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(n * 6, 40)
  for (let i = 0; i < n; i++) for (const [c, ch] of [[0, L], [1, R]]) buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, ch[i])) * 8388607), 44 + i * 6 + c * 3, 3)
  writeFileSync(file, buf)
}

// ── Instrumentos: la paleta B, afilada para ritmo ────────────────────────────────────────────────────────────
let s0 = 0x61a7c4
const R = () => { s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5; return (s0 >>> 0) / 4294967296 }
const seg = len => new Float64Array(Math.max(1, Math.round(len * SR)))
const crush = (x, bits, hold = 1) => { const q = 2 ** (bits - 1); let h = 0; for (let i = 0; i < x.length; i++) { if (i % hold === 0) h = Math.round(x[i] * q) / q; x[i] = h } return x }
const fade = (x, a = 0.5, b = 3) => { const na = Math.round((a / 1000) * SR), nb = Math.round((b / 1000) * SR); for (let i = 0; i < Math.min(na, x.length); i++) x[i] *= i / na; for (let i = 0; i < Math.min(nb, x.length); i++) x[x.length - 1 - i] *= i / nb; return x }
const blip = (fr, len = 0.05, decay = 60) => { const x = seg(len); let p = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; p += (2 * Math.PI * fr) / SR; x[i] = (Math.sin(p) + 0.2 * Math.sin(2 * p)) * Math.exp(-t * decay) * Math.min(1, t / 0.0008) } return fade(x) }
const grain = (fr, len = 0.012) => { const x = seg(len); for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * fr * i) / SR) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (x.length - 1))); return x }
const pluck = (fr, len = 0.14, decay = 20) => { const x = seg(len); let pc = 0, pm = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, e = Math.exp(-t * decay); pm += (4 * Math.PI * fr) / SR; pc += (2 * Math.PI * fr) / SR + (1.6 * e * Math.sin(pm) * 2 * Math.PI * fr) / SR / 6; x[i] = Math.sin(pc) * e * Math.min(1, t / 0.001) } return fade(x) }
const noiseSeg = (len, lo, hi, decay) => { const x = seg(len); for (let i = 0; i < x.length; i++) x[i] = (R() * 2 - 1) * Math.exp((-i / SR) * decay); biquad(x, 'highpass', lo); biquad(x, 'lowpass', hi); return fade(x, 0.3, 3) }

function instruments(M) {
  const put = (t, x, pan, send, lvl) => M.addMono(t, x, pan, send, db(lvl))
  return {
    // Bombo seco y medio: pega sin grave (el grave es de la manzana).
    kick(t, lvl = -6) {
      const x = seg(0.22); let p = 0
      for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * (78 + 150 * Math.exp(-u * 55))) / SR; x[i] = Math.tanh(1.8 * Math.sin(p) * Math.exp(-u * 16)) * Math.min(1, u / 0.0008) }
      put(t, fade(x, 0, 8), 0, 0.02, lvl); put(t, noiseSeg(0.006, 2500, 12000, 600), 0, 0, lvl - 9)
    },
    // Caja = el desgarro de B con cuerpo: una franja de ruido y su sombra, más un golpe medio.
    snare(t, lvl = -9, side = 1) {
      put(t, noiseSeg(0.09, 1700, 7500, 30), 0.25 * side, 0.12, lvl)
      put(t + 0.004, noiseSeg(0.05, 3000, 11000, 55), -0.45 * side, 0.08, lvl - 5)
      const x = seg(0.07); let p = 0; for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * (195 - 40 * u)) / SR; x[i] = Math.sin(p) * Math.exp(-u * 40) }
      put(t, fade(x), 0, 0.05, lvl - 3)
      put(t, crush(blip(note('E6'), 0.03, 90), 4, 4), 0.6 * side, 0.02, lvl - 10)
    },
    hat(t, lvl = -22, pan = 0.3) { put(t, crush(grain([note('E7'), note('A7'), note('C#8')][Math.floor(R() * 3)], 0.009 + R() * 0.004), 6, 2), pan, 0.05, lvl) },
    // El ticker: bytes afinados en 3-3-2, la urgencia de noticiero dicha en datos.
    tick(t, fr, lvl = -15, pan = 0) { put(t, crush(blip(fr, 0.045, 70), 6, 3), pan, 0.06, lvl) },
    // Stab de banda: el acorde seco y un poco roto.
    stab(t, notes, lvl = -13, bits = 7) { notes.forEach((n, k) => put(t + k * 0.002, crush(pluck(note(n), 0.13, 22), bits, 2), (k - 1.5) * 0.25, 0.1, lvl)) },
    // Bajo medio, staccato (sobre 80 Hz): el cuerpo del groove sin robarle el grave a la manzana.
    bass(t, n, len = 0.09, lvl = -12) {
      const x = seg(len + 0.03); let p = 0; const f = note(n)
      for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * f) / SR; x[i] = Math.tanh(2.2 * (Math.sin(p) + 0.5 * Math.sin(2 * p) + 0.25 * Math.sin(3 * p))) * Math.exp(-u * 9) * (u < len ? 1 : Math.max(0, 1 - (u - len) / 0.03)) }
      biquad(x, 'highpass', 70); put(t, fade(x, 0.5, 6), 0, 0.03, lvl)
    },
    // La manzana: el único grave de la pieza (sub con caída), más la campana en La. Sólo en la apertura.
    sub(t, lvl = -5) {
      const x = seg(1.1); let p = 0
      for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * (44 + 50 * Math.exp(-u * 18))) / SR; x[i] = Math.sin(p) * Math.exp(-u * 3.2) * Math.min(1, u / 0.002) }
      put(t, fade(x, 0, 40), 0, 0, lvl)
    },
    crash(t, lvl = -16) { put(t, noiseSeg(0.7, 4500, 15000, 5.5), -0.3, 0.25, lvl); put(t + 0.003, noiseSeg(0.7, 4500, 15000, 5.5), 0.3, 0.25, lvl) }
  }
}

// ── Armonía y patrones (semicorcheas por compás) ─────────────────────────────────────────────────────────────
const HARM = [
  { stab: ['A3', 'C#4', 'E4', 'A4'], bass: ['A2', 'A2', 'E2', 'A2', 'A2', 'E2'] },
  { stab: ['A3', 'D4', 'F#4', 'A4'], bass: ['D2', 'D2', 'A2', 'D2', 'D2', 'A2'] },
  { stab: ['F#3', 'A3', 'C#4', 'E4'], bass: ['F#2', 'F#2', 'C#2', 'F#2', 'F#2', 'C#2'] },
  { stab: ['E3', 'A3', 'B3', 'E4'], bass: ['E2', 'E2', 'B1', 'E2', 'E2', 'B1'] }
]
const KICK = [0, 3, 6, 10, 11], SNARE = [4, 12], TICK = [0, 3, 6, 8, 11, 14], STAB = [0, 6, 11]

// Un compás del groove, completo o por capas.
function grooveBar(I, t0, h, { kick = true, snare = true, hats = true, ticks = true, stabs = true, bass = true, lvl = 0 } = {}) {
  const H = HARM[h % 4]
  if (kick) KICK.forEach(k => I.kick(t0 + k * S, -6 + lvl))
  if (snare) SNARE.forEach((k, j) => I.snare(t0 + k * S, -9 + lvl, j ? 1 : -1))
  if (hats) for (let k = 1; k < 16; k += 2) I.hat(t0 + k * S, -24 + lvl + (k % 4 === 3 ? 3 : 0), k % 4 === 1 ? -0.35 : 0.35)
  if (ticks) TICK.forEach((k, j) => I.tick(t0 + k * S, note(j % 3 === 2 ? 'A6' : 'E6'), -16 + lvl, j % 2 ? 0.25 : -0.25))
  if (stabs) STAB.forEach(k => I.stab(t0 + k * S, H.stab, -14 + lvl))
  if (bass) TICK.forEach((k, j) => I.bass(t0 + k * S, H.bass[j], k === 8 ? 0.16 : 0.08, -12 + lvl))
}
// El gancho con bug dentro de un compás: Mi · Mi · Mi (tartamudea) → La en la semicorchea `la`.
function hookIn(I, M, t0, la = 8) {
  const tLa = t0 + la * S
  ;[5, 4, 3].forEach((back, j) => { const t = tLa - back * S; if (j < 2) M.addMono(t, blip(note('E5'), 0.12, 22), j ? 0.1 : -0.1, 0.1, db(-9)) })
  // La tercera nota se rompe: tres cortes cada vez más cortos y más rotos.
  let t = tLa - 3 * S
  ;[0.05, 0.035, 0.025, 0.018, 0.012].forEach((len, k) => { M.addMono(t, crush(fade(blip(note('E5'), len, 10), 0.2, 1), 7 - k, 2 + k), k % 2 ? 0.5 : -0.3, 0.05, db(-9 - k)); t += len + 0.005 })
  I.stab(tLa, ['A4', 'C#5', 'E5', 'A5'], -9, 8)
}

// ── 1) La cinta derecha: el pre-roll grabado sin cortes ─────────────────────────────────────────────────────
const tape = createMix({ dur: TA + 0.5, seed: 0x7e3a })
const IT = instruments(tape)
for (let b = 0; b < PRE; b++) {
  const t0 = b * BAR, last = b === PRE - 1
  if (VERSION === 'podcast' && b === 0) grooveBar(IT, t0, b, { kick: false, snare: false, hats: false, stabs: false, bass: false })
  else if (VERSION === 'podcast' && b === 1) { grooveBar(IT, t0, b, { snare: false, hats: false }); }
  else grooveBar(IT, t0, b, { lvl: last ? 1 : 0 })
  if (last || (VERSION === 'podcast' && b === 3)) hookIn(IT, tape, t0, 8)
}
const tapeFile = OUT.replace(/\.wav$/, '.cinta.wav')
tape.write(tapeFile, { wet: 0.7, fadeMs: 5, gain: 0.35 })
const [TL, TR] = readWav(tapeFile)
unlinkSync(tapeFile)

// ── 2) La edición: se corta la cinta como en una mesa (el tartamudeo y el silencio son el ritmo) ────────────
const N = Math.round(DUR * SR)
const OL = new Float64Array(N), OR = new Float64Array(N)
const idx = t => Math.round(t * SR)
function copy(src, dst, len, { crushBits = 0, gain = 1 } = {}) {
  const a = idx(src), d = idx(dst), n = idx(len), fadeN = Math.min(96, Math.floor(n / 4))
  const l = new Float64Array(n), r = new Float64Array(n)
  for (let i = 0; i < n; i++) { l[i] = TL[a + i] ?? 0; r[i] = TR[a + i] ?? 0 }
  if (crushBits) { crush(l, crushBits, 3); crush(r, crushBits, 3) }
  for (let i = 0; i < n; i++) { const e = Math.min(1, i / fadeN, (n - 1 - i) / fadeN); if (d + i < N) { OL[d + i] += l[i] * e * gain; OR[d + i] += r[i] * e * gain } }
}
// Compases sin cortes, salvo el último antes de la apertura (y el 5 en la versión podcast).
const editBar = b => {
  const t0 = b * BAR
  // Tiempos 1 a 3 derechos: el gancho con bug resuelve en el tiempo 3.
  copy(t0, t0, 12 * S)
  // Tiempo 4: su primera semicorchea en semicorcheas, fusas y garrapateas, cada vez más rota. Justo 0,4 s.
  const b4 = t0 + 12 * S
  let t = b4
  ;[[S, 2, 0], [S / 2, 2, 7], [S / 4, 2, 5], [S / 8, 4, 4]].forEach(([len, times, bits]) => { for (let k = 0; k < times; k++) { copy(b4, t, len, { crushBits: bits, gain: 1 + 0.08 * k }); t += len } })
}
for (let b = 0; b < PRE; b++) {
  const last = b === PRE - 1
  if (last) editBar(b)
  else if (VERSION === 'podcast' && b === 4) {
    // Compás 5: dos tiempos, un silencio de semicorchea, y el tiempo 3 que vuelve; el 4 tartamudea en octavos.
    copy(b * BAR, b * BAR, 8 * S); copy(b * BAR + 9 * S, b * BAR + 9 * S, 3 * S)
    for (let k = 0; k < 2; k++) copy(b * BAR + 12 * S, b * BAR + 12 * S + k * 2 * S, 2 * S)
  } else copy(b * BAR, b * BAR, BAR)
}

// ── 3) La banda sobre la apertura aprobada: golpea en sus mismos cuadros ────────────────────────────────────
const band = createMix({ dur: DUR, seed: 0xa9e1 })
const IB = instruments(band)
const at = s16 => TA + s16 * S
// 0–0,8 s: silencio de banda. La apertura pregunta sola (los puntos, el temblor).
// f24 (semicorchea 8): el quiebre — golpe de banda sin grave.
IB.kick(at(8), -5); IB.snare(at(8), -8); IB.stab(at(8), HARM[0].stab, -12, 5); IB.crash(at(8), -18)
// Mientras los bytes se arman: el bombo se acelera hacia la manzana (corcheas → semicorcheas → fusas).
;[10, 12, 13, 14].forEach(k => IB.kick(at(k), -12 + (k - 10)))
for (let k = 0; k < 3; k++) IB.kick(at(14.5 + k * 0.5 * 0.9), -9)
for (let k = 0; k < 8; k++) IB.tick(at(11 + k * 0.5), note(['E5', 'F#5', 'A5', 'B5', 'C#6', 'E6', 'F#6', 'A6'][k]), -21 + k, (k % 2 ? 0.3 : -0.3))
// f48 (semicorchea 16, tiempo 1): LA MANZANA — el drop. El único grave de la pieza.
IB.sub(at(16), -4); IB.kick(at(16), -4); IB.crash(at(16), -14); IB.stab(at(16), ['A3', 'C#4', 'E4', 'A4'], -11, 8)
// El groove con todo, del 1,6 al 3,5 s (un compás y tres semicorcheas).
grooveBar(IB, at(16), 0, { lvl: -2 })
for (const k of [0, 3]) { IB.kick(at(32 + k), -8); IB.bass(at(32 + k), 'A2', 0.08, -14) }
IB.snare(at(32 + 1), -10)
// f69 (semicorchea 23, una antes del tiempo): «se abre» — la banda golpea con el texto.
IB.kick(at(23), -4); IB.snare(at(23), -7); IB.stab(at(23), ['A3', 'E4', 'A4', 'C#5'], -10, 6)
// f105 (semicorchea 35): el corte con falla. f108: silencio digital (compuerta abajo).
IB.snare(at(35), -9); IB.stab(at(35), HARM[3].stab, -14, 4)
const bandFile = OUT.replace(/\.wav$/, '.banda.wav')
band.write(bandFile, { wet: 0.8, fadeMs: 5, gain: 0.35, gate: t => (t < at(36) ? 1 : t < at(36) + 0.004 ? 1 - (t - at(36)) / 0.004 : 0) })
const [BL, BR] = readWav(bandFile)
unlinkSync(bandFile)

// ── 4) Mezcla: cinta editada + banda + la apertura aprobada intacta ─────────────────────────────────────────
const [AL, AR] = readWav(APERTURA)
const ML = new Float64Array(N), MR = new Float64Array(N)
const MUSIC = 0.9 // la música queda debajo de la apertura: sus golpes se refuerzan, no se tapan
for (let i = 0; i < N; i++) {
  ML[i] = (OL[i] + (BL[i] ?? 0)) * MUSIC; MR[i] = (OR[i] + (BR[i] ?? 0)) * MUSIC
  const a = i - idx(TA)
  if (a >= 0 && a < AL.length) { ML[i] += AL[a]; MR[i] += AR[a] }
}
// Corte en seco del pre-roll justo antes de la apertura: 2 ms (el silencio digital es el golpe previo).
for (let i = idx(TA) - 96; i < idx(TA); i++) { const e = (idx(TA) - i) / 96; ML[i] *= e; MR[i] *= e }
// Bus: saturación suave (pegamento) — nunca compresión del golpe de la manzana.
let peak = 0
for (let i = 0; i < N; i++) { ML[i] = Math.tanh(ML[i] * 1.15) / 1.15; MR[i] = Math.tanh(MR[i] * 1.15) / 1.15; peak = Math.max(peak, Math.abs(ML[i]), Math.abs(MR[i])) }
const g = db(-1) / peak
for (let i = 0; i < N; i++) { ML[i] *= g; MR[i] *= g }
writeWav(OUT, [ML, MR])
writeFileSync(OUT.replace(/\.wav$/, '.json'), JSON.stringify({ version: VERSION, bpm: 150, preBars: PRE, aperturaAt: +TA.toFixed(3), apple: +(TA + 1.6).toFixed(3), seAbre: +(TA + 2.3).toFixed(3), silence: +(TA + 3.6).toFixed(3), durationSec: DUR }, null, 1))
console.log(`${VERSION}: ${OUT} · apertura en ${TA.toFixed(2)} s · manzana en ${(TA + 1.6).toFixed(2)} s`)
