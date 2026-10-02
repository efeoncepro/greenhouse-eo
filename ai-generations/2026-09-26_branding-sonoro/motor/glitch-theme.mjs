#!/usr/bin/env node
// Glitch — el tema (ronda 9, PROPUESTA). Sólo Glitch, nunca Efeonce.
// Historia: ronda 7 (Pulso/Club) descartada — «no tiene el espíritu Glitch»; ronda 8 (síntesis pura) descartada —
// «se escucha muy arcade; Glitch es irreverente, desafiante, experto». Lo que se conserva de la 8: 150 BPM (una
// semicorchea = 3 cuadros, los golpes del motion en la grilla), los cortes y el silencio como ritmo, el grave sólo en
// la manzana y la apertura aprobada (B, intacta) como drop. Lo que cambia: el material es producción real (maqueta
// re-grabada con Stable Audio) y los cortes se hacen DESPUÉS, sobre el audio grabado. Sin bleeps de seno.
//
//   1) maqueta:  node glitch-theme.mjs --stage maqueta --version vlog|podcast --out <maqueta.wav>
//   2) re-grabar: ai-music.ts --route sa --plan tema-a|tema-b --in <maqueta.wav> --strength 0.75
//   3) final:    node glitch-theme.mjs --stage final --version vlog|podcast --from <regrabado.wav>
//                 --apertura glitch-sfx/b/apertura.wav --out <final.wav>
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const DSP = process.env.BRAND_SOUND_DIR
  ? path.join(process.env.BRAND_SOUND_DIR, 'src/dsp.mjs')
  : new URL('../../../../efeonce-brand-workshop/tools/brand-sound/src/dsp.mjs', import.meta.url).pathname
const { SR, biquad, createMix, db, note } = await import(DSP)

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const STAGE = opt('--stage', 'maqueta')
const VERSION = opt('--version', 'vlog')
const PIECE = opt('--piece', 'intro') // intro | cortina | salida | cama
const OUT = path.resolve(opt('--out', `glitch-tema-${PIECE}-${VERSION}-${STAGE}.wav`))

const S = 0.1, BEAT = 0.4, BAR = 1.6 // 150 BPM: una semicorchea = 3 cuadros
const PRE = VERSION === 'podcast' ? 6 : 2
const TA = PRE * BAR // inicio de la apertura aprobada
// intro: pre-roll + la apertura (4 s) · cortina: un compás + 0,4 s · salida: la tarjeta final (3 s) y, en el podcast, dos compases más
// cama: dos vueltas de 8 compases (se extrae la del medio como loop sin costura)
const END = PIECE === 'cama' ? 16 * BAR + 0.4 : PIECE === 'cortina' ? BAR + 0.4 : PIECE === 'salida' ? (VERSION === 'podcast' ? 7 : 3) : TA + 4
const DUR = Math.ceil(END) // Stable Audio redondea a segundos enteros
const idx = t => Math.round(t * SR)

// ── WAV 24 bits ──────────────────────────────────────────────────────────────────────────────────────────────
const readWav = file => {
  const tmp = file.replace(/\.[a-z0-9]+$/, '') + '.__48k.wav'
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s24le', tmp])
  const b = readFileSync(tmp); unlinkSync(tmp)
  let o = 12, data
  while (o < b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'data') { data = { at: o + 8, len }; break } o += 8 + len + (len % 2) }
  const n = data.len / 6, L = new Float64Array(n), R = new Float64Array(n)
  for (let i = 0; i < n; i++) { L[i] = b.readIntLE(data.at + i * 6, 3) / 8388607; R[i] = b.readIntLE(data.at + i * 6 + 3, 3) / 8388607 }
  return [L, R]
}
const writeWav = (file, [L, R]) => {
  const n = L.length, buf = Buffer.alloc(44 + n * 6)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 6, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(n * 6, 40)
  for (let i = 0; i < n; i++) for (const [c, ch] of [[0, L], [1, R]]) buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, ch[i])) * 8388607), 44 + i * 6 + c * 3, 3)
  writeFileSync(file, buf)
}

// ── Etapa 1: la maqueta — banda, derecha, sin cortes (la re-grabación pone el sonido; los cortes vienen después) ──
if (STAGE === 'maqueta') {
  const M = createMix({ dur: DUR, seed: 0x3ea7 })
  const { I } = M
  let s0 = 0x51ce
  const R = () => { s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5; return (s0 >>> 0) / 4294967296 }
  const seg = len => new Float64Array(Math.max(1, Math.round(len * SR)))
  const fade = (x, a = 0.5, b = 4) => { const na = Math.round((a / 1000) * SR), nb = Math.round((b / 1000) * SR); for (let i = 0; i < Math.min(na, x.length); i++) x[i] *= i / na; for (let i = 0; i < Math.min(nb, x.length); i++) x[x.length - 1 - i] *= i / nb; return x }
  const put = (t, x, pan, send, lvl) => M.addMono(t, x, pan, send, db(lvl))
  // Batería con cuerpo (la re-grabación la vuelve real): bombo, caja, hats de ruido (no bytes).
  const kick = (t, lvl = -5) => { const x = seg(0.3); let p = 0; for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * (60 + 120 * Math.exp(-u * 40))) / SR; x[i] = Math.tanh(2 * Math.sin(p) * Math.exp(-u * 12)) } put(t, fade(x, 0, 10), 0, 0.05, lvl) }
  const snare = (t, lvl = -8) => { M.noise({ t0: t, t1: t + 0.22, cutoff: () => 3200, q: 0.45, gain: u => db(lvl) * Math.exp(-(u - t) * 16), sendAmt: 0.25 }); const x = seg(0.12); let p = 0; for (let i = 0; i < x.length; i++) { const u = i / SR; p += (2 * Math.PI * 185) / SR; x[i] = Math.sin(p) * Math.exp(-u * 25) } put(t, fade(x), 0, 0.1, lvl - 2) }
  const hat = (t, lvl = -22, open = false) => M.noise({ t0: t, t1: t + (open ? 0.18 : 0.04), cutoff: () => 9000, q: 0.3, gain: u => db(lvl) * Math.exp(-(u - t) * (open ? 14 : 70)), pan: () => 0.3, sendAmt: 0.1 })
  // Bajo distorsionado (diente de sierra saturado): el riff lleva el motivo. La re-grabación lo vuelve bajo real.
  const bass = (t, n, len, lvl = -9) => {
    const f = note(n), x = seg(len + 0.04); let ph = 0
    for (let i = 0; i < x.length; i++) { const u = i / SR; ph = (ph + f / SR) % 1; const saw = 2 * ph - 1; x[i] = Math.tanh(3 * saw) * (u < len ? 1 : Math.max(0, 1 - (u - len) / 0.04)) * Math.min(1, u / 0.002) }
    biquad(x, 'lowpass', 1400); put(t, fade(x, 0.5, 8), 0, 0.05, lvl)
  }
  // Guitarra/sinte sucio en quintas (acorde abierto): el golpe de banda.
  const chord = (t, root, len, lvl = -13) => { for (const [m, pan] of [[1, -0.4], [1.5, 0.4], [2, -0.1]]) { const f = note(root) * m, x = seg(len); let ph = 0; for (let i = 0; i < x.length; i++) { const u = i / SR; ph = (ph + f * (1 + 0.003 * pan) / SR) % 1; x[i] = Math.tanh(4 * (2 * ph - 1)) * Math.exp(-u * 3) } biquad(x, 'lowpass', 3200); put(t, fade(x, 1, 20), pan, 0.2, lvl) } }
  const RIFF = ['E2', 'E2', 'E2', 'A2'] // Mi · Mi · Mi → La, en el bajo
  const ROOT = ['A2', 'D2', 'F#2', 'E2']
  // El groove: medio tiempo con swagger (bombo quebrado, caja en el 3 del compás de 2 tiempos), bajo con el motivo.
  const groove = (t0, bar, { full = true } = {}) => {
    ;[0, 3, 7, 10].forEach(k => kick(t0 + k * S))
    if (full) [4, 12].forEach(k => snare(t0 + k * S))
    for (let k = 0; k < 16; k += 2) hat(t0 + k * S, k % 4 === 2 ? -20 : -24, k === 14)
    // Motivo en el bajo: Mi (0) · Mi (3) · Mi (6) → La (9), tres semicorcheas de pausa como el logo, y resolución.
    ;[[0, 0.18], [3, 0.18], [6, 0.18]].forEach(([k, len], j) => bass(t0 + k * S, RIFF[j], len))
    bass(t0 + 9 * S, ROOT[bar % 4] === 'A2' ? 'A2' : ROOT[bar % 4], 0.55, -8)
    if (full) chord(t0 + 9 * S, ROOT[bar % 4].replace('2', '3'), 0.6)
  }
  if (PIECE === 'cama') {
    // La cama bajo la voz: medio tiempo, sin acordes (pelean con la voz), bombo y caja suaves, hats arriba y el motivo en
    // el bajo sólo cada cuatro compases. El resto del bajo es un pedal en La que respira.
    for (let b = 0; b < 16; b++) {
      const t0 = b * BAR
      ;[0, 10].forEach(k => kick(t0 + k * S, -9)); snare(t0 + 8 * S, -14)
      for (let k = 0; k < 16; k += 2) hat(t0 + k * S, k % 4 === 2 ? -23 : -27, false)
      if (b % 4 === 3) { [[0, 0.16], [3, 0.16], [6, 0.16]].forEach(([k, len]) => bass(t0 + k * S, 'E2', len, -13)); bass(t0 + 9 * S, 'A2', 0.5, -12) }
      else { bass(t0, 'A1', 0.5, -14); bass(t0 + 8 * S, 'A1', 0.3, -15) }
    }
  } else if (PIECE === 'cortina') {
    groove(0, 0)
  } else if (PIECE === 'salida') {
    // «se cierra.» (f6 = semicorchea 2): la banda entra con el golpe; el groove sigue hasta el corte (f57, semicorchea 19).
    kick(0.2, -3); snare(0.2, -6); chord(0.2, 'A3', 0.6, -10)
    groove(0.2, 1)
    if (VERSION === 'podcast') {
      // Tras la tarjeta final: dos compases más y la respuesta en La, cortada en seco.
      groove(3.2, 2); groove(4.8, 3)
      kick(6.4, -3); chord(6.4, 'A3', 0.8, -9); bass(6.4, 'A2', 0.5, -7)
    }
  } else for (let b = 0; b < PRE; b++) groove(b * BAR, b, { full: !(VERSION === 'podcast' && b === 0) })
  if (PIECE !== 'intro') {
    M.write(OUT, { wet: 0.6, fadeMs: 30 })
    writeFileSync(OUT.replace(/\.wav$/, '.json'), JSON.stringify({ piece: PIECE, version: VERSION, bpm: 150, durationSec: DUR }, null, 1))
    console.log(`maqueta ${PIECE} ${VERSION}: ${OUT} (${DUR} s)`)
    process.exit(0)
  }
  // Sobre la apertura: silencio hasta el quiebre (f24); golpe; el bombo se acelera; la manzana (f48) = el drop.
  const at = k => TA + k * S
  kick(at(8), -4); snare(at(8), -7); chord(at(8), 'A3', 0.5, -11)
  ;[10, 12, 13, 14, 14.5, 15, 15.5].forEach(k => kick(at(k), -10 + (k - 10) * 0.6))
  kick(at(16), -3); chord(at(16), 'A3', 1.2, -10); bass(at(16), 'A2', 0.5, -7)
  groove(at(16), 0)
  kick(at(23), -4); snare(at(23), -6); chord(at(23), 'E3', 0.5, -11) // «se abre»: una semicorchea antes del tiempo
  ;[32, 35].forEach(k => kick(at(k), -7)); snare(at(33), -9); snare(at(35), -8)
  M.write(OUT, { wet: 0.6, fadeMs: 30 })
  writeFileSync(OUT.replace(/\.wav$/, '.json'), JSON.stringify({ version: VERSION, bpm: 150, preBars: PRE, aperturaAt: TA, durationSec: DUR }, null, 1))
  console.log(`maqueta ${VERSION}: ${OUT} (${DUR} s, apertura en ${TA.toFixed(2)} s)`)
  process.exit(0)
}

// ── Etapa 3: final — cortes sobre la re-grabación + la apertura aprobada intacta + la manzana ─────────────────
const [TL, TR] = readWav(path.resolve(opt('--from')))
const [AL, AR] = PIECE === 'cortina' ? [new Float64Array(0), new Float64Array(0)] : readWav(path.resolve(opt(PIECE === 'salida' ? '--cierre' : '--apertura', PIECE === 'salida' ? 'glitch-sfx/b/cierre.wav' : 'glitch-sfx/b/apertura.wav')))
const N = idx(END)
const OL = new Float64Array(N), OR = new Float64Array(N)
function copy(src, dst, len, { gain = 1, crushBits = 0 } = {}) {
  const a = idx(src), d = idx(dst), n = idx(len), fN = Math.min(72, Math.floor(n / 4))
  let hL = 0, hR = 0; const q = crushBits ? 2 ** (crushBits - 1) : 0
  for (let i = 0; i < n; i++) {
    let l = TL[a + i] ?? 0, r = TR[a + i] ?? 0
    if (crushBits) { if (i % 3 === 0) { hL = Math.round(l * q) / q; hR = Math.round(r * q) / q } l = hL; r = hR }
    const e = Math.min(1, i / fN, (n - 1 - i) / fN)
    if (d + i < N) { OL[d + i] += l * e * gain; OR[d + i] += r * e * gain }
  }
}
// El tiempo 4 de un compás tartamudea sobre la grabación real (semicorcheas, fusas, cada vez más roto) hasta el corte.
const stutterBeat4 = t0 => { let t = t0 + 12 * S; [[S, 2, 0], [S / 2, 2, 0], [S / 4, 2, 10], [S / 8, 4, 8]].forEach(([len, times, bits]) => { for (let k = 0; k < times; k++) { copy(t0 + 12 * S, t, len, { crushBits: bits, gain: 1 + 0.06 * k }); t += len } }) }
if (PIECE === 'cama') {
  // Loop sin costura: los compases 5 a 12 de la re-grabación (lejos de los bordes), con 20 ms de fundido cruzado en la unión.
  const a = idx(4 * BAR), n = idx(8 * BAR), x = idx(0.02)
  const L = new Float64Array(n), R = new Float64Array(n)
  for (let i = 0; i < n; i++) { L[i] = TL[a + i]; R[i] = TR[a + i] }
  for (let i = 0; i < x; i++) { const e = i / x; L[i] = L[i] * e + TL[a + n + i] * (1 - e); R[i] = R[i] * e + TR[a + n + i] * (1 - e) }
  // El hueco de la voz: el medio se baja (300 Hz–3 kHz) para que la locución pase limpia.
  for (const ch of [L, R]) { biquad(ch, 'peak', 700, 0.6, -6); biquad(ch, 'peak', 1800, 0.7, -7); biquad(ch, 'peak', 3200, 1, -3) }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  for (let i = 0; i < n; i++) { L[i] *= db(-1) / peak; R[i] *= db(-1) / peak }
  writeWav(OUT, [L, R])
  console.log(`final cama: ${OUT} (loop de 8 compases, ${(8 * BAR).toFixed(1)} s)`)
  process.exit(0)
}
if (PIECE !== 'intro') {
  if (PIECE === 'cortina') { copy(0, 0, 12 * S); stutterBeat4(0) }
  else {
    copy(0.2, 0.2, 1.7) // de «se cierra.» al corte con falla (f57); después, silencio: la manzana implosiona sola
    if (VERSION === 'podcast') { copy(3.2, 3.2, 3.2); stutterBeat4(3.2); copy(6.4, 6.4, 0.6) } // dos compases, el 2.º tartamudea, y la respuesta en La
  }
  const ML = new Float64Array(N), MR = new Float64Array(N)
  for (let i = 0; i < N; i++) { ML[i] = OL[i] * 0.8 + (AL[i] ?? 0); MR[i] = OR[i] * 0.8 + (AR[i] ?? 0) }
  const cutAt = (t0, t1) => { for (let i = idx(t0); i < Math.min(N, idx(t1)); i++) { ML[i] = 0; MR[i] = 0 } }
  if (PIECE === 'cortina') cutAt(BAR, END)
  else { cutAt(1.9, VERSION === 'podcast' ? 3.2 : 0); for (let i = idx(1.9); i < idx(3.2) && i < N; i++) { ML[i] = AL[i] ?? 0; MR[i] = AR[i] ?? 0 } }
  for (let i = N - 96; i < N; i++) { const e = (N - i) / 96; ML[i] *= e; MR[i] *= e }
  let peak = 0
  for (let i = 0; i < N; i++) { ML[i] = Math.tanh(ML[i] * 1.1) / 1.1; MR[i] = Math.tanh(MR[i] * 1.1) / 1.1; peak = Math.max(peak, Math.abs(ML[i]), Math.abs(MR[i])) }
  for (let i = 0; i < N; i++) { ML[i] *= db(-1) / peak; MR[i] *= db(-1) / peak }
  writeWav(OUT, [ML, MR])
  console.log(`final ${PIECE} ${VERSION}: ${OUT}`)
  process.exit(0)
}
// Pre-roll: compases derechos; en el último, el tiempo 4 tartamudea (búfer de la grabación real) hasta el corte.
for (let b = 0; b < PRE; b++) {
  const t0 = b * BAR
  if (b < PRE - 1 && !(VERSION === 'podcast' && b === 4)) { copy(t0, t0, BAR); continue }
  if (VERSION === 'podcast' && b === 4) {
    // Compás 5: dos tiempos, una semicorchea de silencio y vuelve; el tiempo 4 repite su primer octavo.
    copy(t0, t0, 8 * S); copy(t0 + 9 * S, t0 + 9 * S, 3 * S); copy(t0 + 12 * S, t0 + 12 * S, 2 * S); copy(t0 + 12 * S, t0 + 14 * S, 2 * S)
    continue
  }
  copy(t0, t0, 12 * S)
  let t = t0 + 12 * S
  ;[[S, 2, 0], [S / 2, 2, 0], [S / 4, 2, 10], [S / 8, 4, 8]].forEach(([len, times, bits]) => { for (let k = 0; k < times; k++) { copy(t0 + 12 * S, t, len, { crushBits: bits, gain: 1 + 0.06 * k }); t += len } })
}
// Sobre la apertura: la banda re-grabada desde el quiebre (f24) hasta el silencio (f108). Antes, silencio: la pregunta.
copy(TA + 0.8, TA + 0.8, 2.8)
// Mezcla: la música un poco debajo de la apertura aprobada, que se monta intacta; el sub de la manzana, el único grave.
const MUSIC = 0.8
const ML = new Float64Array(N), MR = new Float64Array(N)
for (let i = 0; i < N; i++) {
  ML[i] = OL[i] * MUSIC; MR[i] = OR[i] * MUSIC
  const a = i - idx(TA); if (a >= 0 && a < AL.length) { ML[i] += AL[a]; MR[i] += AR[a] }
}
const apple = idx(TA + 1.6)
for (let i = 0; i < idx(1.0); i++) { const u = i / SR, s = Math.sin(2 * Math.PI * (44 * u + (50 / 18) * (1 - Math.exp(-u * 18)))) * Math.exp(-u * 3.2) * Math.min(1, u / 0.002) * db(-6); if (apple + i < N) { ML[apple + i] += s; MR[apple + i] += s } }
// Corte en seco antes de la apertura y silencio digital desde f108.
for (let i = idx(TA) - 96; i < idx(TA); i++) { const e = (idx(TA) - i) / 96; ML[i] *= e; MR[i] *= e }
for (let i = idx(TA + 3.6); i < N; i++) { ML[i] = 0; MR[i] = 0 }
let peak = 0
for (let i = 0; i < N; i++) { ML[i] = Math.tanh(ML[i] * 1.1) / 1.1; MR[i] = Math.tanh(MR[i] * 1.1) / 1.1; peak = Math.max(peak, Math.abs(ML[i]), Math.abs(MR[i])) }
for (let i = 0; i < N; i++) { ML[i] *= db(-1) / peak; MR[i] *= db(-1) / peak }
writeWav(OUT, [ML, MR])
console.log(`final ${VERSION}: ${OUT}`)
