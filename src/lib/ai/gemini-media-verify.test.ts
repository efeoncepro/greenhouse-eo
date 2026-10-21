import { describe, expect, it } from 'vitest'

import {
  type AudioWindow,
  checkDesync,
  checkFrozen,
  checkPeak,
  checkSilence,
  detectCuts,
  detectOnsets,
  detectVisualEvents,
  type MotionFrame,
  verifyFinding
} from './gemini-media-verify'

/** Envolvente sintética: ruido a −30 dB, silencio 1,75–2,0, golpe en 2,0, sting con pico en 5,0. */
const envelope = (): AudioWindow[] =>
  Array.from({ length: 800 }, (_, i) => {
    const t = i / 100

    if (t >= 1.75 && t < 2.0) return { t, rms: -Infinity, peak: -Infinity }
    if (t >= 2.0 && t < 2.05) return { t, rms: -8, peak: -2 }
    if (t >= 4.0 && t < 4.05) return { t, rms: -9, peak: -3 }
    if (Math.abs(t - 5.0) < 0.005) return { t, rms: -10, peak: -1 }

    return { t, rms: -30, peak: -24.5 }
  })

/** Movimiento sintético a 24 fps: deriva suave, corte en 2,0, dos cuadros quietos en 6,0. */
const motion = (): MotionFrame[] =>
  Array.from({ length: 192 }, (_, i) => {
    const t = i / 24

    if (Math.abs(t - 2.0) < 0.01) return { t, diff: 60 }
    if (t >= 6.0 && t < 6.1) return { t, diff: 0.05 }

    return { t, diff: 1.5 }
  })

describe('ai:listen — verificación con mediciones', () => {
  const env = envelope()
  const frames = motion()
  const onsets = detectOnsets(env)
  const cuts = detectCuts(frames)

  it('encuentra los ataques y los cortes reales', () => {
    expect(onsets.some(t => Math.abs(t - 2.0) < 0.02)).toBe(true)
    expect(onsets.some(t => Math.abs(t - 4.0) < 0.02)).toBe(true)
    expect(cuts).toEqual([2])
  })

  it('confirma el silencio que existe y refuta el que no', () => {
    expect(checkSilence(env, 1.75, 2.0).estado).toBe('confirmado')
    expect(checkSilence(env, 3.0, 3.5).estado).toBe('refutado')
  })

  it('verifica golpes con tolerancia de dos cuadros', () => {
    const m = { env, motion: frames, onsets, cuts, visualEvents: detectVisualEvents(frames) }

    expect(verifyFinding({ t: 2.03, tipo: 'golpe', severidad: 'media', afirmacion: 'golpe', medible: true }, m).estado).toBe('confirmado')
    expect(verifyFinding({ t: 3.2, tipo: 'golpe', severidad: 'media', afirmacion: 'golpe', medible: true }, m).estado).toBe('refutado')
  })

  it('distingue sincronía de desfase y cuadros quietos', () => {
    const visual = detectVisualEvents(frames)

    expect(visual).toContain(2)
    expect(checkDesync(visual, onsets, 2.0).estado).toBe('refutado')
    expect(checkDesync(visual, onsets.map(t => (Math.abs(t - 2) < 0.02 ? t + 0.1 : t)), 2.0).estado).toBe('confirmado')
    expect(checkFrozen(frames, 6.0, 6.1).estado).toBe('confirmado')
    expect(checkFrozen(frames, 3.0, 3.5).estado).toBe('refutado')
  })

  it('mide el desfase de un tramo con varios ataques (caso de los íconos de AWS: el clic llega ~45 ms tarde)', () => {
    const visual = [0.5, 0.625, 0.75, 0.875]
    const lateClicks = [0.55, 0.67, 0.8, 0.92]
    const onTime = [0.5, 0.63, 0.75, 0.88]

    const late = checkDesync(visual, lateClicks, 0.45, 0.95)

    expect(late.estado).toBe('confirmado')
    expect(late.medido).toMatch(/después de la imagen/)
    expect(checkDesync(visual, onTime, 0.45, 0.95).estado).toBe('refutado')
  })

  it('detecta un golpe que cae sobre música fuerte por el salto de RMS', () => {
    const loud: AudioWindow[] = Array.from({ length: 100 }, (_, i) => {
      const t = i / 100

      if (t < 0.4) return { t, rms: -20, peak: -12 }
      if (t < 0.5) return { t, rms: -30, peak: -22 }

      return { t, rms: -8, peak: -3 }
    })

    expect(detectOnsets(loud).some(t => Math.abs(t - 0.5) < 0.011)).toBe(true)
  })

  it('ubica el pico del sting', () => {
    expect(checkPeak(env, 5.0).estado).toBe('confirmado')
    expect(checkPeak(env, 6.5).estado).toBe('refutado')
  })

  it('no mide lo que es juicio aunque el modelo diga que es medible', () => {
    const m = { env, motion: frames, onsets, cuts, visualEvents: detectVisualEvents(frames) }

    expect(verifyFinding({ t: 5, tipo: 'juicio', severidad: 'baja', afirmacion: 'el cierre es plano', medible: true }, m).estado).toBe('no_medible')
  })
})
