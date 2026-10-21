/**
 * Verificación con ffmpeg de lo que afirma Gemini en `pnpm ai:listen --verify`.
 *
 * La regla de oficio que esto vuelve mecánica: la crítica de un modelo es criterio, no medición. Sus tiempos y niveles
 * se equivocan con frecuencia (caso Claude 2026-10-21: «sting enterrado» cuando dominaba; caso AWS: «profundizar el
 * silencio» en un tramo a −inf). Cada hallazgo medible se contrasta contra el audio y la imagen reales.
 *
 * Las decisiones son funciones puras sobre las mediciones (testeables); las mediciones salen de ffmpeg.
 */
import { spawnSync } from 'node:child_process'

import { MEASURABLE_TYPES, type Cue, type CueExpectation, cueExpectations, type Finding } from '@/lib/ai/gemini-media-analysis-cli'

export interface AudioWindow {
  t: number
  rms: number
  peak: number
}

export interface MotionFrame {
  t: number
  diff: number
}

export type VerificationState = 'confirmado' | 'refutado' | 'no_medible' | 'sin_datos'

export interface Verification {
  estado: VerificationState
  medido: string
}

/** Umbrales calibrados sobre la serie de partners (2026-10-21). */
export const VERIFY_THRESHOLDS = {
  silenceRmsDb: -50,
  onsetMinPeakDb: -24,
  onsetRiseDb: 10,
  onsetLookbackSec: 0.1,
  onsetRmsRiseDb: 12,
  visualEventMinDiff: 2,
  visualEventRatio: 2,
  hitToleranceSec: 0.084,
  cutToleranceSec: 0.063,
  cutMinDiff: 12,
  cutNeighborRatio: 3,
  frozenDiff: 0.15,
  syncToleranceSec: 0.042,
  peakToleranceSec: 0.1
} as const

const fmt = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : String(value))

// ── Decisiones puras ─────────────────────────────────────────────────────────

export const detectOnsets = (env: AudioWindow[]): number[] => {
  const out: number[] = []
  const lookback = Math.max(1, Math.round(VERIFY_THRESHOLDS.onsetLookbackSec / 0.01))

  for (let i = 1; i < env.length; i++) {
    const prevPeak = env.slice(Math.max(0, i - lookback), i).reduce((max, w) => Math.max(max, w.peak), -Infinity)
    const recent = env.slice(Math.max(0, i - 5), i).map(w => w.rms)
    const prevRms = recent.length ? recent.reduce((sum, v) => sum + (Number.isFinite(v) ? v : -120), 0) / recent.length : -120
    // Dos criterios: subida de pico sobre el máximo previo, o salto de RMS sobre la media de los 50 ms previos.
    // El segundo detecta un golpe que cae sobre una música ya fuerte (caso AWS, golpe 2 en 4,0 s: pico +9 dB, RMS +22 dB).
    const peakRise = env[i].peak - prevPeak >= VERIFY_THRESHOLDS.onsetRiseDb
    const rmsRise = env[i].rms - prevRms >= VERIFY_THRESHOLDS.onsetRmsRiseDb

    if (env[i].peak >= VERIFY_THRESHOLDS.onsetMinPeakDb && (peakRise || rmsRise)) {
      if (out.length === 0 || env[i].t - out[out.length - 1] > 0.08) out.push(env[i].t)
    }
  }

  return out
}

/** Eventos visuales: picos locales de cambio entre cuadros (cortes, destellos, íconos que aparecen). */
export const detectVisualEvents = (motion: MotionFrame[]): number[] => {
  const out: number[] = []

  for (let i = 0; i < motion.length; i++) {
    const d = motion[i].diff
    const prev = motion[i - 1]?.diff ?? -Infinity
    const next = motion[i + 1]?.diff ?? -Infinity
    const neighbors = motion.slice(Math.max(0, i - 6), i).concat(motion.slice(i + 1, i + 7)).map(f => f.diff).sort((a, b) => a - b)
    const median = neighbors.length ? neighbors[Math.floor(neighbors.length / 2)] : 0

    if (d >= prev && d >= next && d >= VERIFY_THRESHOLDS.visualEventMinDiff && d >= VERIFY_THRESHOLDS.visualEventRatio * Math.max(median, 0.3)) {
      if (out.length === 0 || motion[i].t - out[out.length - 1] > 0.08) out.push(motion[i].t)
    }
  }

  return out
}

export const detectCuts = (motion: MotionFrame[]): number[] => {
  const out: number[] = []

  for (let i = 0; i < motion.length; i++) {
    const neighbors = motion.slice(Math.max(0, i - 6), i).concat(motion.slice(i + 1, i + 7)).map(f => f.diff).sort((a, b) => a - b)
    const median = neighbors.length ? neighbors[Math.floor(neighbors.length / 2)] : 0

    if (motion[i].diff >= VERIFY_THRESHOLDS.cutMinDiff && motion[i].diff >= VERIFY_THRESHOLDS.cutNeighborRatio * Math.max(median, 0.5)) {
      if (out.length === 0 || motion[i].t - out[out.length - 1] > 0.1) out.push(motion[i].t)
    }
  }

  return out
}

const nearest = (values: number[], t: number) =>
  values.reduce<number | undefined>((best, v) => (best === undefined || Math.abs(v - t) < Math.abs(best - t) ? v : best), undefined)

export const checkSilence = (env: AudioWindow[], t0: number, t1: number): Verification => {
  const inside = env.filter(w => w.t >= t0 + 0.01 && w.t + 0.01 <= t1 - 0.005)

  if (inside.length === 0) return { estado: 'sin_datos', medido: `sin audio en ${fmt(t0)}–${fmt(t1)} s` }

  const loudest = inside.reduce((max, w) => Math.max(max, w.rms), -Infinity)
  const silent = loudest <= VERIFY_THRESHOLDS.silenceRmsDb

  return {
    estado: silent ? 'confirmado' : 'refutado',
    medido: `RMS máx. ${loudest === -Infinity ? '−inf' : fmt(loudest, 1)} dB en ${fmt(t0)}–${fmt(t1)} s (silencio ≤ ${VERIFY_THRESHOLDS.silenceRmsDb} dB)`
  }
}

export const checkHit = (onsets: number[], t: number): Verification => {
  const hit = nearest(onsets, t)

  if (hit === undefined) return { estado: 'refutado', medido: 'no hay ningún ataque de sonido en el archivo' }

  const delta = hit - t
  const ok = Math.abs(delta) <= VERIFY_THRESHOLDS.hitToleranceSec

  return { estado: ok ? 'confirmado' : 'refutado', medido: `ataque más cercano en ${fmt(hit)} s (Δ ${delta >= 0 ? '+' : ''}${fmt(delta * 1000, 0)} ms)` }
}

export const checkCut = (cuts: number[], t: number): Verification => {
  const cut = nearest(cuts, t)

  if (cut === undefined) return { estado: 'refutado', medido: 'no hay cortes detectados en el video' }

  const delta = cut - t
  const ok = Math.abs(delta) <= VERIFY_THRESHOLDS.cutToleranceSec

  return { estado: ok ? 'confirmado' : 'refutado', medido: `corte más cercano en ${fmt(cut)} s (Δ ${delta >= 0 ? '+' : ''}${fmt(delta * 1000, 0)} ms)` }
}

export const checkFrozen = (motion: MotionFrame[], t0: number, t1?: number): Verification => {
  const end = t1 ?? t0 + 0.2
  const inside = motion.filter(f => f.t >= t0 - 0.05 && f.t <= end + 0.05)

  if (inside.length === 0) return { estado: 'sin_datos', medido: `sin cuadros en ${fmt(t0)}–${fmt(end)} s` }

  let run = 0
  let best = 0

  for (const frame of inside) {
    run = frame.diff < VERIFY_THRESHOLDS.frozenDiff ? run + 1 : 0
    best = Math.max(best, run)
  }

  const minDiff = inside.reduce((min, f) => Math.min(min, f.diff), Infinity)

  return {
    estado: best >= 2 ? 'confirmado' : 'refutado',
    medido: `${best} cuadro(s) quieto(s) seguidos en ${fmt(t0)}–${fmt(end)} s (diferencia mínima ${fmt(minDiff)}; quieto < ${VERIFY_THRESHOLDS.frozenDiff})`
  }
}

export const checkDesync = (visualEvents: number[], onsets: number[], t: number, tFin?: number): Verification => {
  // Un instante: el ataque y el evento visual más cercanos a t. Un tramo: cada ataque dentro del tramo con su evento
  // visual más cercano (±0,15 s), y se juzga la mediana del desfase.
  const targets = tFin !== undefined ? onsets.filter(o => o >= t - 0.05 && o <= tFin + 0.05) : [nearest(onsets.filter(o => Math.abs(o - t) <= 0.3), t)].filter((o): o is number => o !== undefined)

  const pairs = targets
    .map(onset => ({ onset, visual: nearest(visualEvents.filter(v => Math.abs(v - onset) <= 0.15), onset) }))
    .filter((p): p is { onset: number; visual: number } => p.visual !== undefined)

  if (pairs.length === 0) return { estado: 'sin_datos', medido: `sin pares ataque–evento visual en ${fmt(t)}${tFin !== undefined ? `–${fmt(tFin)}` : ''} s` }

  const deltas = pairs.map(p => p.onset - p.visual).sort((a, b) => a - b)
  const median = deltas[Math.floor(deltas.length / 2)]
  const desync = Math.abs(median) > VERIFY_THRESHOLDS.syncToleranceSec
  const lead = median > 0 ? 'el sonido llega después de la imagen' : 'el sonido llega antes de la imagen'

  return {
    estado: desync ? 'confirmado' : 'refutado',
    medido: `${pairs.length} par(es); desfase mediano ${median >= 0 ? '+' : ''}${fmt(median * 1000, 0)} ms (${lead}); rango ${fmt(deltas[0] * 1000, 0)}…${fmt(deltas[deltas.length - 1] * 1000, 0)} ms; tolerancia ±${VERIFY_THRESHOLDS.syncToleranceSec * 1000} ms`
  }
}

export const checkPeak = (env: AudioWindow[], t: number): Verification => {
  const around = env.filter(w => Math.abs(w.t - t) <= 0.5)

  if (around.length === 0) return { estado: 'sin_datos', medido: `sin audio cerca de ${fmt(t)} s` }

  const top = around.reduce((best, w) => (w.peak > best.peak ? w : best))
  const ok = Math.abs(top.t - t) <= VERIFY_THRESHOLDS.peakToleranceSec

  return { estado: ok ? 'confirmado' : 'refutado', medido: `pico de ±0,5 s en ${fmt(top.t)} s (${fmt(top.peak, 1)} dBFS)` }
}

export interface Measurements {
  env?: AudioWindow[]
  motion?: MotionFrame[]
  onsets: number[]
  cuts: number[]
  visualEvents: number[]
}

export const verifyFinding = (finding: Finding, m: Measurements): Verification => {
  if (!MEASURABLE_TYPES.includes(finding.tipo)) return { estado: 'no_medible', medido: `«${finding.tipo}» es juicio: no se mide` }

  switch (finding.tipo) {
    case 'silencio':
      return m.env ? checkSilence(m.env, finding.t, finding.t_fin ?? finding.t + 0.2) : { estado: 'sin_datos', medido: 'sin audio para medir' }
    case 'golpe':
      return m.env ? checkHit(m.onsets, finding.t) : { estado: 'sin_datos', medido: 'sin audio para medir' }
    case 'corte':
      return m.motion ? checkCut(m.cuts, finding.t) : { estado: 'sin_datos', medido: 'sin video para medir' }
    case 'cuadro_quieto':
      return m.motion ? checkFrozen(m.motion, finding.t, finding.t_fin) : { estado: 'sin_datos', medido: 'sin video para medir' }
    case 'desfase':
      return m.env && m.motion ? checkDesync(m.visualEvents, m.onsets, finding.t, finding.t_fin) : { estado: 'sin_datos', medido: 'hace falta audio y video' }
    default:
      return { estado: 'no_medible', medido: 'tipo sin medición' }
  }
}

export const verifyExpectation = (expectation: CueExpectation, m: Measurements): Verification => {
  if (!m.env) return { estado: 'sin_datos', medido: 'sin audio para medir' }

  if (expectation.kind === 'silencio') return checkSilence(m.env, expectation.t, expectation.tFin)
  if (expectation.kind === 'pico') return checkPeak(m.env, expectation.t)

  return checkHit(m.onsets, expectation.t)
}

export const verifyCues = (cues: Cue[], m: Measurements) =>
  cues.flatMap(cue => cueExpectations(cue).map(expectation => ({ cue: cue.t, ...expectation, ...verifyExpectation(expectation, m) })))

// ── Mediciones con ffmpeg ────────────────────────────────────────────────────

const runFfmpeg = (args: string[]) => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

  if (result.error || result.status !== 0) throw new Error(`ffmpeg falló: ${(result.stderr || String(result.error)).slice(-300)}`)

  return result.stdout
}

const parseMetadataLines = (text: string, keys: string[]) => {
  const rows: Array<Record<string, number>> = []
  let current: Record<string, number> | null = null

  for (const line of text.split('\n')) {
    const pts = /pts_time:([\d.]+)/.exec(line)

    if (pts) {
      current = { t: Number(pts[1]) }
      rows.push(current)
      continue
    }

    if (!current) continue

    for (const key of keys) {
      if (line.startsWith(`${key}=`)) {
        const raw = line.slice(key.length + 1).trim()

        current[key] = raw === '-inf' ? -Infinity : Number(raw)
      }
    }
  }

  return rows
}

/** Envolvente en ventanas de 10 ms (RMS y pico en dBFS). */
export const measureAudio = (path: string): AudioWindow[] => {
  const rms = 'lavfi.astats.Overall.RMS_level'
  const peak = 'lavfi.astats.Overall.Peak_level'
  const out = runFfmpeg(['-i', path, '-vn', '-af', 'aresample=16000,asetnsamples=160,astats=metadata=1:reset=1,ametadata=print:file=-', '-f', 'null', '-'])

  return parseMetadataLines(out, [rms, peak]).map(row => ({ t: row.t, rms: row[rms] ?? -Infinity, peak: row[peak] ?? -Infinity }))
}

/** Diferencia media de luminancia entre cuadros consecutivos (0 = cuadro idéntico al anterior). */
export const measureMotion = (path: string): MotionFrame[] => {
  const key = 'lavfi.signalstats.YAVG'
  const out = runFfmpeg(['-i', path, '-an', '-vf', `scale=270:-2,tblend=all_mode=difference,signalstats,metadata=print:key=${key}:file=-`, '-f', 'null', '-'])

  return parseMetadataLines(out, [key]).map(row => ({ t: row.t, diff: row[key] ?? 0 }))
}

export const collectMeasurements = (input: { audioPath?: string; videoPath?: string }): Measurements => {
  const env = input.audioPath ? measureAudio(input.audioPath) : undefined
  const motion = input.videoPath ? measureMotion(input.videoPath) : undefined

  return { env, motion, onsets: env ? detectOnsets(env) : [], cuts: motion ? detectCuts(motion) : [], visualEvents: motion ? detectVisualEvents(motion) : [] }
}
