import { describe, expect, it } from 'vitest'

import {
  computeRevealedPlainText,
  isRevealing,
  NEXA_STREAMING_TEXT_DEFAULT_FRACTION,
  NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS
} from './nexa-streaming-text-controller'

describe('computeRevealedPlainText — paridad byte-idéntica con el canvas', () => {
  // El canvas hacía: full.slice(0, Math.max(24, Math.ceil(len * 0.6))).trimEnd()
  const canvasFormula = (full: string) => full.slice(0, Math.max(24, Math.ceil(full.length * 0.6))).trimEnd()

  it('reproduce exactamente el slice del canvas con los defaults (60% / min 24)', () => {
    const samples = [
      'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, con trazabilidad.',
      'Texto corto.',
      'a'.repeat(200),
      'Frase con espacios al borde del corte                    final.'
    ]

    for (const sample of samples) {
      expect(computeRevealedPlainText(sample)).toBe(canvasFormula(sample))
    }
  })

  it('usa los defaults canónicos exportados', () => {
    expect(NEXA_STREAMING_TEXT_DEFAULT_FRACTION).toBe(0.6)
    expect(NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS).toBe(24)
  })

  it('fraction >= 1 revela todo el texto (estado asentado, sin recorte)', () => {
    const full = 'Respuesta completa de Nexa, ya asentada.'

    expect(computeRevealedPlainText(full, { fraction: 1 })).toBe(full)
    expect(computeRevealedPlainText(full, { fraction: 1.5 })).toBe(full)
  })

  it('clampa fracciones inválidas/negativas y NaN sin romper (never-hidden: cae a settled o respeta minChars)', () => {
    const full = 'Contenido que nunca debe quedar atrapado invisible.'

    // NaN → tratado como settled (revela todo) — el contenido nunca queda oculto.
    expect(computeRevealedPlainText(full, { fraction: Number.NaN })).toBe(full)
    // fracción negativa → clamp a 0 → respeta minChars (no string vacío silencioso del 0%).
    expect(computeRevealedPlainText(full, { fraction: -1 }).length).toBe(NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS)
  })

  it('respeta minChars cuando la fracción dejaría menos texto', () => {
    const full = 'a'.repeat(100)

    expect(computeRevealedPlainText(full, { fraction: 0.05, minChars: 24 }).length).toBe(24)
    expect(computeRevealedPlainText(full, { fraction: 0.05, minChars: 40 }).length).toBe(40)
  })
})

describe('isRevealing', () => {
  it('es true mientras el revelado es más corto que el texto completo (caret visible)', () => {
    expect(isRevealing('texto completo largo', 'texto comp')).toBe(true)
  })

  it('es false cuando el revelado alcanzó el texto completo (caret oculto al asentar)', () => {
    const full = 'texto completo'

    expect(isRevealing(full, full)).toBe(false)
  })
})
