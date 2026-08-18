import { describe, expect, it } from 'vitest'

import { editorialOpeningFixture } from './editorial-opening.fixture'
import { assertPublishableOpening, requiresEditorialV2ForPublish } from './publishability'

const valid = {
  publicTitle: 'Content Creator — Editorial, SEO/AEO & Social',
  publicSummary: 'Crea contenido con evidencia.',
  publicDescription: 'Una descripción pública completa.',
  publicWorkMode: 'remote' as const,
  publicHiringRegion: 'Global',
  publicCity: null,
  publicCountry: null,
  publicOfficeLocation: null,
  publicArea: 'Creative',
  publicSkillTags: ['SEO', 'Contenido'],
  publicSeniority: 'Semi-senior',
  publicContent: editorialOpeningFixture.content,
  publicRemoteEligibleCountries: ['CL', 'CO']
}

describe('assertPublishableOpening — canonical editorial gate', () => {
  it('acepta una publicación v2 completa', () => {
    expect(() => assertPublishableOpening(valid, { requireEditorialV2: true })).not.toThrow()
  })

  it('rechaza publicar o republicar sin v2', () => {
    expect(() =>
      assertPublishableOpening({ ...valid, publicContent: null }, { requireEditorialV2: true })
    ).toThrowError(expect.objectContaining({ code: 'hiring_opening_missing_public_structured_fields' }))
  })

  it('rechaza una vacante remota v2 sin países exactos', () => {
    expect(() =>
      assertPublishableOpening({ ...valid, publicRemoteEligibleCountries: [] }, { requireEditorialV2: true })
    ).toThrowError(expect.objectContaining({ code: 'hiring_opening_missing_public_structured_fields' }))
  })

  it('mantiene el grandfathering de filas publicadas v1 cuando no se edita contenido', () => {
    expect(() => assertPublishableOpening({ ...valid, publicContent: null })).not.toThrow()
  })
})

describe('requiresEditorialV2ForPublish — grandfathering de vacantes vivas (TASK-1740/1741)', () => {
  it('exige contenido v2 a una vacante que se publica por primera vez', () => {
    expect(requiresEditorialV2ForPublish(null)).toBe(true)
    expect(requiresEditorialV2ForPublish(undefined)).toBe(true)
  })

  it('NO exige v2 para re-publicar una vacante que ya estuvo al aire', () => {
    // Caso real 2026-08-17: EO-OPN-0009 y EO-OPN-0061 están publicadas con contenido v1 y
    // tienen postulantes en proceso. Exigir v2 al re-publicar dejaría su URL en 404 —
    // cortando el canal de un proceso vivo— hasta reescribir el bloque completo.
    expect(requiresEditorialV2ForPublish(new Date('2026-07-09T00:00:00.000Z'))).toBe(false)
    expect(requiresEditorialV2ForPublish('2026-07-30T04:00:00.000Z')).toBe(false)
  })

  it('una vacante ya publicada con contenido v1 pasa el gate de re-publicación', () => {
    const legacyPublished = {
      publicTitle: 'Content Creator — Editorial, SEO/AEO & Social',
      publicSummary: 'Resumen público',
      publicDescription: 'Descripción pública',
      publicWorkMode: 'remote' as const,
      publicHiringRegion: 'LATAM',
      publicCity: null,
      publicCountry: null,
      publicOfficeLocation: null,
      publicArea: 'Marketing',
      publicSkillTags: ['SEO'],
      publicSeniority: 'Semi-senior',
      publicContent: null,
      publicRemoteEligibleCountries: [],
    }

    expect(() =>
      assertPublishableOpening(legacyPublished, {
        requireEditorialV2: requiresEditorialV2ForPublish('2026-07-30T04:00:00.000Z'),
      }),
    ).not.toThrow()

    // La misma vacante, si fuera nueva, sí debe cumplir el contrato editorial.
    expect(() =>
      assertPublishableOpening(legacyPublished, { requireEditorialV2: requiresEditorialV2ForPublish(null) }),
    ).toThrow()
  })
})
