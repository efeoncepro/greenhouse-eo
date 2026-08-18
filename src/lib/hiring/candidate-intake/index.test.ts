import { describe, expect, it } from 'vitest'

import { CANDIDATE_DISPLAY_FALLBACK_PLACEHOLDER, normalizeCandidateIdentityInput } from './index'

// TASK-1736 Slice 1 — primitive canónico: evidencia intacta, display estructural SIN casing.

describe('normalizeCandidateIdentityInput', () => {
  it('conserva el submitted EXACTO y deriva un display estructural (NFC + whitespace)', () => {
    const out = normalizeCandidateIdentityInput({ firstName: 'valentina', lastName: 'villa  soto' })

    expect(out.submitted.firstName).toBe('valentina')
    expect(out.submitted.lastName).toBe('villa  soto')
    expect(out.submitted.fullName).toBe('valentina villa  soto')
    expect(out.display.fullName).toBe('valentina villa soto')
  })

  it('el display NO toca el casing en el intake (la materialización es Slice 2)', () => {
    const out = normalizeCandidateIdentityInput({ firstName: 'valentina', lastName: 'villa' })

    expect(out.display.fullName).toBe('valentina villa')
    expect(out.casing.classification).toBe('degenerate_lower')
    expect(out.casing.proposedDisplayName).toBe('Valentina Villa')
  })

  it('compone NFC en el display y preserva diacríticos', () => {
    // lastName con la ñ DESCOMPUESTA (n + U+0303): el display compone; la evidencia queda tal cual.
    const out = normalizeCandidateIdentityInput({ firstName: 'Valentina', lastName: 'Pen\u0303a' })

    expect(out.display.fullName).toBe('Valentina Peña')
    expect(out.submitted.lastName).toBe('Pen\u0303a')
  })

  it('deriva search key versionada y expone la versión de la policy', () => {
    const out = normalizeCandidateIdentityInput({ firstName: 'María', lastName: 'Pérez' })

    expect(out.searchKey).toEqual({ value: 'maria perez', version: 'v1' })
    expect(out.normalizationVersion).toBe('v1')
  })

  it('no latino: display estructural, needs_review, sin propuesta, key preservada', () => {
    const out = normalizeCandidateIdentityInput({ firstName: '李', lastName: '小龙' })

    expect(out.display.fullName).toBe('李 小龙')
    expect(out.casing.classification).toBe('non_latin')
    expect(out.casing.confidence).toBe('needs_review')
    expect(out.casing.proposedDisplayName).toBeNull()
    expect(out.searchKey.value).toBe('李 小龙')
  })

  it('edge degenerado (sólo zero-width): display = placeholder neutro y needs_review (A5)', () => {
    const out = normalizeCandidateIdentityInput({ firstName: '\u200b', lastName: '\u200b' })

    // A5 — el display JAMÁS nace invisible: cae al placeholder NEUTRO del dominio, no al raw
    // con controles/zero-width.
    expect(out.display.fullName).toBe(CANDIDATE_DISPLAY_FALLBACK_PLACEHOLDER)
    expect(out.display.fullName).not.toBe(out.submitted.fullName)

    // La evidencia submitted conserva el raw exacto (inmutable, ADR D1).
    expect(out.submitted.fullName).toBe('\u200b \u200b')

    // Clasificación fail-closed a humano, sin propuesta; search key vacía (sin señal — nunca
    // matchea otro placeholder).
    expect(out.casing.classification).toBe('mixed_ambiguous')
    expect(out.casing.confidence).toBe('needs_review')
    expect(out.casing.proposedDisplayName).toBeNull()
    expect(out.searchKey.value).toBe('')
  })

  it('edge degenerado con controles bidi/BOM: mismo placeholder neutro y needs_review (A5)', () => {
    const out = normalizeCandidateIdentityInput({ firstName: '\u202e\u200d', lastName: '\ufeff' })

    expect(out.display.fullName).toBe(CANDIDATE_DISPLAY_FALLBACK_PLACEHOLDER)
    expect(out.casing.confidence).toBe('needs_review')
  })

  it('es determinista/idempotente: mismo input ⇒ mismo output', () => {
    const input = { firstName: ' MARÍA DE LOS ÁNGELES', lastName: 'ROJAS ' }

    expect(normalizeCandidateIdentityInput(input)).toEqual(normalizeCandidateIdentityInput(input))
  })
})
