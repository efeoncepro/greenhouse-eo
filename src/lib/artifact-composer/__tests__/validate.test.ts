import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '../contracts'
import { validateSlide } from '../validate'

const contract: TemplateContract = {
  template: 'StatSplit',
  version: '0.1',
  viewport: { width: 1920, height: 1080 },
  slots: {
    eyebrow: {
      selector: "[data-slot='eyebrow']",
      type: 'string',
      required: true,
      constraints: { maxCharacters: 32, overflow: 'reject' }
    },
    title: {
      selector: "[data-slot='title']",
      type: 'rich-string',
      required: true,
      constraints: { maxCharacters: 106, allowedTags: ['em'], overflow: 'reject' }
    },
    goals: {
      selector: "[data-slot='goals']",
      type: 'array',
      required: true,
      constraints: { minItems: 3, maxItems: 5, overflow: 'reject', quantifiedClaimsRequireEvidenceRef: true },
      item: {
        type: 'object',
        shape: {
          kind: { type: 'enum', values: ['visibility', 'citability'], required: true },
          title: { type: 'string', maxCharacters: 42, required: true },
          metric: { type: 'string', maxCharacters: 30, required: false, requires: ['evidenceRef'] },
          evidenceRef: { type: 'string', required: false }
        }
      }
    },
    support: {
      selector: "[data-slot='support']",
      type: 'object',
      required: false,
      shape: {
        label: { type: 'string', required: true, maxCharacters: 24 },
        summary: { type: 'string', required: true, maxCharacters: 80 },
        tools: {
          type: 'array',
          required: true,
          constraints: { minItems: 1, maxItems: 2, overflow: 'reject' },
          item: {
            type: 'object',
            shape: {
              kind: { type: 'enum', values: ['notion', 'frameio'], required: true },
              name: { type: 'string', maxCharacters: 20, required: true }
            }
          }
        }
      }
    }
  }
}

const slide = (slots: SlideSpec['slots']): SlideSpec => ({
  slideId: 'sky-01',
  contentType: 'stat',
  template: 'StatSplit',
  slots
})

const goal = (over: Record<string, unknown> = {}) => ({
  kind: 'visibility',
  title: 'Ser encontrada',
  ...over
})

const valid = { eyebrow: 'EL DIAGNÓSTICO', title: 'La marca no aparece', goals: [goal(), goal(), goal()] }

describe('deck slot validation', () => {
  it('acepta una lámina que cumple el contrato', () => {
    expect(validateSlide(slide(valid), contract)).toEqual([])
  })

  it('rechaza (no trunca) el copy que excede el máximo', () => {
    const violations = validateSlide(slide({ ...valid, eyebrow: 'X'.repeat(40) }), contract)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('too_long')

    // La regla es explícita en el mensaje: el renderer NO corta el copy de una oferta contractual.
    expect(violations[0]?.message).toContain('NO trunca')
  })

  it('no cuenta el markup como caracteres visibles', () => {
    // 100 chars visibles + markup: cabe en 106. Si contáramos los tags, esto fallaría de mentira.
    const title = `<em>${'a'.repeat(100)}</em>`

    expect(validateSlide(slide({ ...valid, title }), contract)).toEqual([])
  })

  it('exige los slots requeridos', () => {
    const violations = validateSlide(slide({ title: 'x', goals: [goal(), goal(), goal()] }), contract)

    expect(violations.map(v => v.code)).toEqual(['missing_required'])
  })

  it('rechaza un slot que la plantilla no declara (el renderer no inventa composición)', () => {
    const violations = validateSlide(slide({ ...valid, footerNote: 'algo' }), contract)

    expect(violations[0]?.code).toBe('unknown_slot')
  })

  it('hace cumplir el mínimo y el máximo de items', () => {
    expect(validateSlide(slide({ ...valid, goals: [goal(), goal()] }), contract)[0]?.code).toBe('too_few_items')

    const many = Array.from({ length: 6 }, () => goal())

    expect(validateSlide(slide({ ...valid, goals: many }), contract)[0]?.code).toBe('too_many_items')
  })

  it('ANTI-FABRICACIÓN: una métrica sin evidenceRef no se compone', () => {
    const violations = validateSlide(
      slide({ ...valid, goals: [goal({ metric: '40/100' }), goal(), goal()] }),
      contract
    )

    // Éste es el guardrail que separa una oferta seria de una inventada: la cifra viaja con su fuente.
    expect(violations.some(v => v.code === 'missing_evidence_ref')).toBe(true)
  })

  it('acepta la métrica cuando SÍ trae su evidencia', () => {
    const violations = validateSlide(
      slide({ ...valid, goals: [goal({ metric: '40/100', evidenceRef: 'aeo-run-2026-07' }), goal(), goal()] }),
      contract
    )

    expect(violations).toEqual([])
  })

  it('rechaza un enum fuera de los valores permitidos', () => {
    const violations = validateSlide(slide({ ...valid, goals: [goal({ kind: 'inventado' }), goal(), goal()] }), contract)

    expect(violations[0]?.code).toBe('disallowed_enum')
  })

  it('exige los campos requeridos de cada item', () => {
    const violations = validateSlide(
      slide({ ...valid, goals: [{ kind: 'visibility' }, goal(), goal()] }),
      contract
    )

    expect(violations[0]?.code).toBe('missing_required_field')
  })

  it('valida los campos requeridos de un object top-level', () => {
    const violations = validateSlide(
      slide({
        ...valid,
        support: {
          summary: 'Capa transversal para trazabilidad',
          tools: [{ kind: 'notion', name: 'Notion' }]
        }
      }),
      contract
    )

    expect(violations[0]?.code).toBe('missing_required_field')
    expect(violations[0]?.message).toContain('el objeto')
  })
})
