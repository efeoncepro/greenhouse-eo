import { describe, expect, it } from 'vitest'

import { sanitizeOpeningPublicCopy } from './contracts'

// TASK-1385 — el sanitizer es la frontera de enforcement de la salida del LLM: exige el mínimo
// usable (title+summary+description) y clampa/descarta el resto. Espeja la disciplina de 1361.

const validRaw = {
  publicTitle: '  SEO Specialist Senior  ',
  publicSummary: 'Liderarás el SEO técnico de cuentas reales.',
  publicDescription: '- Auditorías técnicas\n- Estrategia de contenido',
  publicRequirements: '- Experiencia con GA4',
  publicNiceToHave: '- Search Console API',
  publicArea: 'Growth',
  publicSkillTags: ['SEO técnico', '', 'GA4', 42, 'Search Console'],
  publicSeniority: 'senior',
  publicProcessNotes: 'El proceso evalúa SEO y comunicación.',
  note: 'Basado en las competencias del template.',
}

describe('sanitizeOpeningPublicCopy (TASK-1385)', () => {
  it('acepta un borrador válido, trimea y filtra skillTags malformados', () => {
    const copy = sanitizeOpeningPublicCopy(validRaw)

    expect(copy).not.toBeNull()
    expect(copy?.publicTitle).toBe('SEO Specialist Senior')
    expect(copy?.publicSkillTags).toEqual(['SEO técnico', 'GA4', 'Search Console'])
    expect(copy?.note).toBe('Basado en las competencias del template.')
  })

  it('devuelve null si falta el mínimo usable (title/summary/description)', () => {
    expect(sanitizeOpeningPublicCopy({ ...validRaw, publicTitle: '' })).toBeNull()
    expect(sanitizeOpeningPublicCopy({ ...validRaw, publicSummary: undefined })).toBeNull()
    expect(sanitizeOpeningPublicCopy({ ...validRaw, publicDescription: 42 })).toBeNull()
  })

  it('devuelve null para formas inservibles', () => {
    expect(sanitizeOpeningPublicCopy(null)).toBeNull()
    expect(sanitizeOpeningPublicCopy('texto plano')).toBeNull()
    expect(sanitizeOpeningPublicCopy([validRaw])).toBeNull()
  })

  it('clampa longitudes máximas (título 160)', () => {
    const copy = sanitizeOpeningPublicCopy({ ...validRaw, publicTitle: 'x'.repeat(500) })

    expect(copy?.publicTitle).toHaveLength(160)
  })

  it('omite campos opcionales vacíos en vez de escribir strings vacíos', () => {
    const copy = sanitizeOpeningPublicCopy({
      publicTitle: 'T',
      publicSummary: 'S',
      publicDescription: 'D',
      publicRequirements: '   ',
      publicSkillTags: [],
    })

    expect(copy?.publicRequirements).toBeUndefined()
    expect(copy?.publicSkillTags).toBeUndefined()
  })
})
