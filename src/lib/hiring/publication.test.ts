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
  publicEmploymentMode: 'full_time',
  publicSeniority: 'Senior',
  publicProcessNotes: '3 etapas',
  applyUrl: null,
  status: 'active',
  publishedAt: '2026-07-07T00:00:00.000Z',
  createdBy: 'user-secret-owner',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z',
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
        'description',
        'employmentMode',
        'locationMode',
        'niceToHave',
        'processNotes',
        'publicId',
        'publishedAt',
        'requirements',
        'seniority',
        'summary',
        'title',
      ].sort(),
    )
  })

  it('usa el título público y no el interno', () => {
    const payload = buildPublicOpeningPayload(internalOpening)

    expect(payload.title).toBe('Diseñador/a Senior')
  })

  it('cae al título interno solo si no hay público (openings legacy)', () => {
    const payload = buildPublicOpeningPayload({ ...internalOpening, publicTitle: null })

    // Fallback controlado: sin public_title mostramos el internal_title (ya sin codename en casos reales).
    expect(payload.title).toBe(internalOpening.internalTitle)
  })
})
