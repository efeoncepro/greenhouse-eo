import { describe, expect, it } from 'vitest'

import { editorialOpeningFixture } from './editorial-opening.fixture'
import { assertPublishableOpening } from './publishability'

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
