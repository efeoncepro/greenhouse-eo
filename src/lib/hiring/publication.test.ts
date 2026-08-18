import { describe, expect, it } from 'vitest'

import type { HiringOpening } from '@/types/hiring'

import { buildPublicOpeningPayload } from './publication'

const internalOpening: HiringOpening = {
  openingId: 'opng-1',
  publicId: 'EO-OPN-0001',
  demandId: 'tdmn-1',
  internalTitle: 'Senior Designer (internal codename FALCON)',
  seniority: 'senior',
  requestedSeats: 2,
  ownerUserId: 'user-secret-owner',
  spaceId: 'space-1',
  organizationId: 'org-confidential',
  budgetBand: 'CLP 3.5M-4.2M',
  rateBand: 'internal-band-C',
  riskNotes: 'cliente sensible, no divulgar',
  internalNotes: 'preferimos alguien del bench',
  visibility: 'public_listed',
  publicationStatus: 'published',
  publicTitle: 'Diseñador/a Senior',
  publicSummary: 'Buscamos un/a diseñador/a senior para nuestro equipo.',
  publicDescription: 'Responsabilidades públicas...',
  publicRequirements: '5+ años de experiencia',
  publicNiceToHave: 'Portafolio en motion',
  publicLocationMode: 'remoto',
  publicWorkMode: 'remote',
  publicHiringRegion: 'LATAM',
  publicCity: null,
  publicCountry: null,
  publicOfficeLocation: null,
  publicArea: 'Creative',
  publicSkillTags: ['Diseño', 'Figma'],
  publicCompensationBand: null,
  publicationSourceRef: 'brief-1',
  publicEmploymentMode: 'full_time',
  publicSeniority: 'Senior',
  publicProcessNotes: '3 etapas',
  publicContent: {
    version: 1,
    promise: 'Vas a liderar el sistema visual de marcas reales.',
    intro: null,
    outcomes: ['Entregar 2 identidades completas por trimestre'],
    workItems: [],
    essentials: ['Figma avanzado'],
    preferred: [],
    learnables: [],
    evidenceAsk: 'Portafolio con decisiones explicadas.',
    workModel: '100% remoto con overlap GMT-4.',
    collaboration: null,
    process: {
      steps: [
        { title: 'Screening', body: null },
        { title: 'Muestra de trabajo pagada', body: null }
      ],
      expectedTiming: null,
      responseCommitment: null,
      accommodationPath: null
    },
    benefits: ['15 días hábiles de vacaciones'],
    compensation: null,
    additionalSections: []
  },
  publicRemoteEligibleCountries: ['CL', 'CO'],
  applyUrl: null,
  status: 'active',
  publishedAt: '2026-07-07T00:00:00.000Z',
  createdBy: 'user-secret-owner',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z'
}

describe('buildPublicOpeningPayload — allowlist de proyección pública', () => {
  it('expone solo campos públicos y jamás internos', () => {
    const payload = buildPublicOpeningPayload(internalOpening)
    const serialized = JSON.stringify(payload)

    // NUNCA deben aparecer campos internos load-bearing en el payload público.
    expect(serialized).not.toContain('FALCON')
    expect(serialized).not.toContain('user-secret-owner')
    expect(serialized).not.toContain('org-confidential')
    expect(serialized).not.toContain('CLP 3.5M-4.2M')
    expect(serialized).not.toContain('internal-band-C')
    expect(serialized).not.toContain('cliente sensible')
    expect(serialized).not.toContain('bench')
    expect(serialized).not.toContain('tdmn-1')
    expect(serialized).not.toContain('opng-1')

    // El set de llaves públicas es cerrado (allowlist).
    expect(Object.keys(payload).sort()).toEqual(
      [
        'applyUrl',
        'content',
        'description',
        'employmentMode',
        'area',
        'city',
        'compensationBand',
        'country',
        'hiringRegion',
        'locationMode',
        'niceToHave',
        'officeLocation',
        'processNotes',
        'publicId',
        'publishedAt',
        'remoteEligibleCountries',
        'requirements',
        'seniority',
        'skillTags',
        'summary',
        'title',
        'workMode'
      ].sort()
    )
  })

  it('TASK-1740 — expone el bloque estructurado y los países elegibles sin arrastrar internos', () => {
    const payload = buildPublicOpeningPayload(internalOpening)

    expect(payload.content?.promise).toContain('sistema visual')
    expect(payload.remoteEligibleCountries).toEqual(['CL', 'CO'])

    // El contenido estructurado tampoco puede transportar sentinels internos.
    const serialized = JSON.stringify(payload.content)

    for (const sentinel of [
      'FALCON',
      'user-secret-owner',
      'org-confidential',
      'CLP 3.5M-4.2M',
      'internal-band-C',
      'cliente sensible',
      'bench'
    ]) {
      expect(serialized).not.toContain(sentinel)
    }
  })

  it('TASK-1740 — opening legacy degrada a content null y países vacíos (fallback de prosa)', () => {
    const payload = buildPublicOpeningPayload({
      ...internalOpening,
      publicContent: null,
      publicRemoteEligibleCountries: []
    })

    expect(payload.content).toBeNull()
    expect(payload.remoteEligibleCountries).toEqual([])
  })

  it('usa el título público y no el interno', () => {
    const payload = buildPublicOpeningPayload(internalOpening)

    expect(payload.title).toBe('Diseñador/a Senior')
    expect(payload.workMode).toBe('remote')
    expect(payload.hiringRegion).toBe('LATAM')
    expect(payload.area).toBe('Creative')
    expect(payload.skillTags).toEqual(['Diseño', 'Figma'])
  })

  it('falla cerrado si no hay título público y jamás expone el título interno', () => {
    expect(() => buildPublicOpeningPayload({ ...internalOpening, publicTitle: null })).toThrowError(
      expect.objectContaining({ code: 'hiring_opening_public_title_required' })
    )
  })

  it.each(['L2', 'Intermedio', 'senior'])('falla cerrado ante seniority público no canónico: %s', publicSeniority => {
    expect(() => buildPublicOpeningPayload({ ...internalOpening, publicSeniority })).toThrowError(
      expect.objectContaining({ code: 'hiring_opening_public_seniority_invalid' })
    )
  })

  it('falla cerrado si un título Senior se contradice con el nivel público', () => {
    expect(() =>
      buildPublicOpeningPayload({
        ...internalOpening,
        publicTitle: 'Senior Visual Designer',
        publicSeniority: 'Semi-senior'
      })
    ).toThrowError(expect.objectContaining({ code: 'hiring_opening_public_seniority_title_mismatch' }))
  })
})
