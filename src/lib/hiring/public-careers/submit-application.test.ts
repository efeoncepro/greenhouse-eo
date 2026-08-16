import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockResolveOpening = vi.fn()
const mockCreateIdentityProfile = vi.fn()
const mockReconcileFacet = vi.fn()
const mockCreateApplication = vi.fn()
const mockEnsureTalentPoolMembership = vi.fn()
const mockRequestTalentPoolFutureConsent = vi.fn()

vi.mock('@/lib/hiring/publication', () => ({
  resolvePublishedOpeningIdByPublicId: (...args: unknown[]) => mockResolveOpening(...args)
}))
vi.mock('@/lib/account-360/organization-store', () => ({
  createIdentityProfile: (...args: unknown[]) => mockCreateIdentityProfile(...args)
}))
vi.mock('@/lib/hiring/store', () => ({
  reconcileCandidateFacet: (...args: unknown[]) => mockReconcileFacet(...args),
  createHiringApplication: (...args: unknown[]) => mockCreateApplication(...args)
}))
vi.mock('@/lib/hiring/talent-pool/self-service', () => ({
  ensureTalentPoolMembership: (...args: unknown[]) => mockEnsureTalentPoolMembership(...args)
}))
vi.mock('@/lib/hiring/talent-pool/commands', () => ({
  requestTalentPoolFutureConsent: (...args: unknown[]) => mockRequestTalentPoolFutureConsent(...args)
}))
vi.mock('./cv-upload', () => ({
  attachPublicCareersCvToApplication: vi.fn(),
  attachScannedPublicCareersCvAssetToApplication: vi.fn()
}))

const mockPersistEvidence = vi.fn()
const mockReconcileDisplay = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/hiring/candidate-intake/evidence', () => ({
  persistCandidateIdentityIntakeEvidence: (...args: unknown[]) => mockPersistEvidence(...args)
}))
vi.mock('@/lib/hiring/candidate-intake/reconcile-display', () => ({
  reconcileCandidateIdentityDisplayName: (...args: unknown[]) => mockReconcileDisplay(...args)
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import { HiringValidationError } from '@/lib/hiring/errors'

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
  futureOpportunitiesConsent: false
}

describe('submitPublicHiringApplication — completitud de contacto (TASK-1688)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveOpening.mockResolvedValue('hopn-1')
    mockCreateIdentityProfile.mockResolvedValue('prof-1')
    mockReconcileFacet.mockResolvedValue({ candidateFacetId: 'cndf-1' })
    mockCreateApplication.mockResolvedValue({ applicationId: 'happ-1', publicId: 'EO-APP-0001' })
    mockEnsureTalentPoolMembership.mockResolvedValue({ membership_id: 'tlpm-1', public_id: 'EO-TLP-00001' })
    mockRequestTalentPoolFutureConsent.mockResolvedValue({ receiptId: 'EO-TPR-00001' })
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

  it('crea una solicitud verificable, no un grant, cuando la persona marca futuras oportunidades', async () => {
    await submitPublicHiringApplication({ ...input, futureOpportunitiesConsent: true })

    expect(mockEnsureTalentPoolMembership).toHaveBeenCalledWith({ candidateFacetId: 'cndf-1' })
    expect(mockRequestTalentPoolFutureConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        talentProfileId: 'EO-TLP-00001',
        source: 'public_application',
        evidenceRef: 'hiring_application:happ-1'
      })
    )
  })

  it('no crea una solicitud de recontacto cuando el consentimiento opcional está ausente', async () => {
    await submitPublicHiringApplication(input)

    expect(mockEnsureTalentPoolMembership).toHaveBeenCalledOnce()
    expect(mockRequestTalentPoolFutureConsent).not.toHaveBeenCalled()
  })
})

describe('submitPublicHiringApplication — intake de identidad canónico (TASK-1736 Slice 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveOpening.mockResolvedValue('hopn-1')
    mockCreateIdentityProfile.mockResolvedValue('prof-1')
    mockReconcileFacet.mockResolvedValue({ candidateFacetId: 'cndf-1' })
    mockCreateApplication.mockResolvedValue({ applicationId: 'happ-1', publicId: 'EO-APP-0001' })
    mockEnsureTalentPoolMembership.mockResolvedValue({ membership_id: 'tlpm-1', public_id: 'EO-TLP-00001' })
  })

  it('Person recibe el display ESTRUCTURAL (NFC + whitespace colapsado), nunca el verbatim', async () => {
    // lastName con ñ descompuesta (n + U+0303) y doble espacio interno.
    await submitPublicHiringApplication({
      ...input,
      firstName: 'valentina',
      lastName: 'peña  soto',
      fullName: 'valentina peña  soto'
    })

    expect(mockCreateIdentityProfile.mock.calls[0][0].fullName).toBe('valentina peña soto')
  })

  it('el casing NO se toca en el intake (materializar casing = Slice 2, no acá)', async () => {
    await submitPublicHiringApplication({
      ...input,
      firstName: 'valentina',
      lastName: 'villa',
      fullName: 'valentina villa'
    })

    // Sigue en minúsculas: la propuesta "Valentina Villa" existe pero NO se aplica en el intake.
    expect(mockCreateIdentityProfile.mock.calls[0][0].fullName).toBe('valentina villa')
  })

  it('un nombre ya bien formado pasa idéntico (la estructural es no-op sobre input limpio)', async () => {
    await submitPublicHiringApplication(input)

    expect(mockCreateIdentityProfile.mock.calls[0][0].fullName).toBe('Ada Lovelace')
  })
})

describe('submitPublicHiringApplication — evidencia + reconciliación (TASK-1736 Slice 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED
    mockResolveOpening.mockResolvedValue('hopn-1')
    mockCreateIdentityProfile.mockResolvedValue('prof-1')
    mockReconcileFacet.mockResolvedValue({ candidateFacetId: 'cndf-1' })
    mockCreateApplication.mockResolvedValue({ applicationId: 'happ-1', publicId: 'EO-APP-0001' })
    mockEnsureTalentPoolMembership.mockResolvedValue({ membership_id: 'tlpm-1', public_id: 'EO-TLP-00001' })
    mockPersistEvidence.mockResolvedValue(undefined)
    mockReconcileDisplay.mockResolvedValue({ outcome: 'skipped', reasonCode: 'already_canonical' })
  })

  afterEach(() => {
    delete process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED
  })

  it('flag OFF (default): comportamiento actual intacto — CERO escritura de evidencia/reconcile', async () => {
    const result = await submitPublicHiringApplication(input)

    expect(result.outcome).toBe('accepted')
    expect(mockPersistEvidence).not.toHaveBeenCalled()
    expect(mockReconcileDisplay).not.toHaveBeenCalled()
  })

  it('flag ON: persiste la fila de evidencia por application y reconcilia el display (D3)', async () => {
    process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED = 'true'

    const result = await submitPublicHiringApplication({
      ...input,
      firstName: 'valentina',
      lastName: 'villa',
      fullName: 'valentina villa'
    })

    expect(result.outcome).toBe('accepted')

    expect(mockPersistEvidence).toHaveBeenCalledOnce()

    const evidenceInput = mockPersistEvidence.mock.calls[0][0]

    expect(evidenceInput.applicationId).toBe('happ-1')
    expect(evidenceInput.identityProfileId).toBe('prof-1')
    expect(evidenceInput.intake.submitted.fullName).toBe('valentina villa')
    expect(evidenceInput.intake.casing.proposedDisplayName).toBe('Valentina Villa')

    expect(mockReconcileDisplay).toHaveBeenCalledOnce()
    expect(mockReconcileDisplay.mock.calls[0][0]).toMatchObject({
      identityProfileId: 'prof-1',
      applicationId: 'happ-1'
    })
  })

  it('flag ON + re-apply duplicado: la capa corre igual sobre la application existente (caso sticky-name)', async () => {
    process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED = 'true'

    mockCreateApplication.mockRejectedValue(
      new HiringValidationError('dup', 'hiring_application_duplicate', 409, { applicationId: 'happ-9' })
    )

    const result = await submitPublicHiringApplication(input)

    expect(result.outcome).toBe('accepted')
    expect(mockPersistEvidence.mock.calls[0][0].applicationId).toBe('happ-9')
    expect(mockReconcileDisplay).toHaveBeenCalledOnce()
  })

  it('un fallo de la capa de evidencia JAMÁS rompe el submit: degrade a Sentry y accepted igual', async () => {
    process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED = 'true'
    mockPersistEvidence.mockRejectedValue(new Error('pg down'))

    const result = await submitPublicHiringApplication(input)

    expect(result.outcome).toBe('accepted')
    expect(result.applicationId).toBe('happ-1')
    expect(mockCapture).toHaveBeenCalledOnce()
    expect(mockCapture.mock.calls[0][1]).toBe('hiring')
  })

  it('un fallo del reconcile tampoco rompe el submit (fail-closed a observabilidad, no al candidato)', async () => {
    process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED = 'true'
    mockReconcileDisplay.mockRejectedValue(new Error('cas explotó'))

    const result = await submitPublicHiringApplication(input)

    expect(result.outcome).toBe('accepted')
    expect(mockCapture).toHaveBeenCalledOnce()
  })
})
