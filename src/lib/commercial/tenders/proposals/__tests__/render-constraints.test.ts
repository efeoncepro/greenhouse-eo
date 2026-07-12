import { describe, expect, it } from 'vitest'

import { DEFAULT_MAX_PDF_MB, extractRenderConstraints } from '../render-constraints'
import type { ProposalRenderRequirementRef } from '../render-projection'

const req = (over: Partial<ProposalRenderRequirementRef>): ProposalRenderRequirementRef => ({
  requirementId: over.requirementId ?? 'preq-1',
  requirementKind: over.requirementKind ?? 'format',
  label: over.label ?? '',
  value: over.value ?? null,
  weight: null,
  sourceLocator: null,
  isBlocking: over.isBlocking ?? true,
  requiresHumanAttestation: false
})

describe('extractRenderConstraints (las constraints del RFP se FIJAN, no se suponen)', () => {
  it('sin requisitos → default global 20 MB, sin accesibilidad', () => {
    const c = extractRenderConstraints([])

    expect(c.maxPdfMb).toBe(DEFAULT_MAX_PDF_MB)
    expect(c.maxPdfMbFromRfp).toBe(false)
    expect(c.maxPages).toBeNull()
    expect(c.accessibilityRequired).toBe(false)
  })

  it('un requisito de peso del RFP reemplaza el default y queda trazado', () => {
    const c = extractRenderConstraints([
      req({ requirementId: 'preq-peso', label: 'El archivo no debe superar 10 MB', requirementKind: 'format' })
    ])

    expect(c.maxPdfMb).toBe(10)
    expect(c.maxPdfMbFromRfp).toBe(true)
    expect(c.sourceRequirementIds).toContain('preq-peso')
  })

  it('dos límites declarados → gana el MÁS restrictivo (fail-closed)', () => {
    const c = extractRenderConstraints([
      req({ requirementId: 'a', label: 'Adjuntos hasta 25 MB' }),
      req({ requirementId: 'b', label: 'La oferta técnica en PDF de máximo 8 MB' })
    ])

    expect(c.maxPdfMb).toBe(8)
  })

  it('máximo de páginas declarado se captura', () => {
    const c = extractRenderConstraints([req({ label: 'Presentación de máximo 30 páginas' })])

    expect(c.maxPages).toBe(30)
  })

  it('ACCEPTANCE: PDF/UA · Section 508 · EAA · WCAG · "accesible" disparan accessibilityRequired', () => {
    for (const label of [
      'El documento debe cumplir PDF/UA',
      'Deliverables shall conform to Section 508',
      'Cumplimiento de la European Accessibility Act',
      'Contenido conforme a WCAG 2.1 AA',
      'El PDF debe ser accesible para lectores de pantalla'
    ]) {
      const c = extractRenderConstraints([req({ label, requirementKind: 'excluyente' })])

      expect(c.accessibilityRequired, label).toBe(true)
    }
  })

  it('la detección de accesibilidad aplica a cualquier requirementKind (excluyente incluido)', () => {
    const c = extractRenderConstraints([req({ label: 'PDF/UA obligatorio', requirementKind: 'sla' })])

    expect(c.accessibilityRequired).toBe(true)
  })

  it('un requisito que no habla del archivo no toca las constraints', () => {
    const c = extractRenderConstraints([
      req({ label: 'Experiencia mínima de 5 años del equipo', requirementKind: 'puntua' })
    ])

    expect(c.maxPdfMbFromRfp).toBe(false)
    expect(c.accessibilityRequired).toBe(false)
    expect(c.maxPages).toBeNull()
  })
})
