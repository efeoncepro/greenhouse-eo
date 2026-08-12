import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockResolveOpening = vi.fn()
const mockCreateIdentityProfile = vi.fn()
const mockReconcileFacet = vi.fn()
const mockCreateApplication = vi.fn()

vi.mock('@/lib/hiring/publication', () => ({
  resolvePublishedOpeningIdByPublicId: (...args: unknown[]) => mockResolveOpening(...args),
}))
vi.mock('@/lib/account-360/organization-store', () => ({
  createIdentityProfile: (...args: unknown[]) => mockCreateIdentityProfile(...args),
}))
vi.mock('@/lib/hiring/store', () => ({
  reconcileCandidateFacet: (...args: unknown[]) => mockReconcileFacet(...args),
  createHiringApplication: (...args: unknown[]) => mockCreateApplication(...args),
}))
vi.mock('./cv-upload', () => ({
  attachPublicCareersCvToApplication: vi.fn(),
  attachScannedPublicCareersCvAssetToApplication: vi.fn(),
}))

import { submitPublicHiringApplication } from './submit-application'
import type { NormalizedApplicationInput } from './schema'

const input: NormalizedApplicationInput = {
  openingPublicId: 'EO-OPN-0061',
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+56912345678',
  residenceCountryCode: 'VE',
  portfolioUrl: null,
  linkedinUrl: null,
  availability: null,
  message: 'Me interesa el rol por X e Y.',
  consentPolicyVersion: 'efeonce-careers-2026-07',
}

describe('submitPublicHiringApplication — completitud de contacto (TASK-1688)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveOpening.mockResolvedValue('hopn-1')
    mockCreateIdentityProfile.mockResolvedValue('prof-1')
    mockReconcileFacet.mockResolvedValue({ candidateFacetId: 'cndf-1' })
    mockCreateApplication.mockResolvedValue({ applicationId: 'happ-1', publicId: 'EO-APP-0001' })
  })

  it('persiste teléfono y país de residencia en el facet person-first (anti "el form acepta y el command descarta")', async () => {
    await submitPublicHiringApplication(input)

    const facetInput = mockReconcileFacet.mock.calls[0][0]

    expect(facetInput.phoneE164).toBe('+56912345678')
    expect(facetInput.residenceCountryCode).toBe('VE')
  })

  it('persiste el mensaje como contexto de LA postulación, no del perfil', async () => {
    await submitPublicHiringApplication(input)

    const applicationInput = mockCreateApplication.mock.calls[0][0]

    expect(applicationInput.candidateMessage).toBe('Me interesa el rol por X e Y.')

    const facetInput = mockReconcileFacet.mock.calls[0][0]

    expect(JSON.stringify(facetInput)).not.toContain('Me interesa el rol')
  })

  it('una entrada sin teléfono/país NO borra los valores existentes (omite, no null-wipea a nivel input)', async () => {
    await submitPublicHiringApplication({ ...input, phone: null, residenceCountryCode: null, message: null })

    const facetInput = mockReconcileFacet.mock.calls[0][0]

    // undefined → el upsert COALESCE preserva el valor previo del facet.
    expect(facetInput.phoneE164).toBeUndefined()
    expect(facetInput.residenceCountryCode).toBeUndefined()
    expect(mockCreateApplication.mock.calls[0][0].candidateMessage).toBeNull()
  })
})
