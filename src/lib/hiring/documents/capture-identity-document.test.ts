import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCandidateFacetById = vi.fn()
const listHiringApplications = vi.fn()
const declareIdentityDocument = vi.fn()

vi.mock('../store', () => ({ getCandidateFacetById, listHiringApplications }))
vi.mock('@/lib/person-legal-profile', () => ({ declareIdentityDocument }))

const { captureCandidateIdentityDocument } = await import('./capture-identity-document')

const FACET_ID = 'cndf-1'
const PROFILE_ID = 'identity-1'

const input = {
  candidateFacetId: FACET_ID,
  documentType: 'CL_RUT' as const,
  rawValue: '12.345.678-K',
  countryCode: 'CL',
  actorUserId: 'user-hr',
}

const declaredDocument = {
  documentId: 'doc-1',
  documentType: 'CL_RUT',
  countryCode: 'CL',
  displayMask: 'xx.xxx.678-K',
  verificationStatus: 'pending_review',
  evidenceAssetId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  getCandidateFacetById.mockResolvedValue({ candidateFacetId: FACET_ID, identityProfileId: PROFILE_ID })
  listHiringApplications.mockResolvedValue([{ applicationId: 'happ-1', decision: 'selected' }])
  declareIdentityDocument.mockResolvedValue({ document: declaredDocument })
})

describe('captureCandidateIdentityDocument', () => {
  describe('guardrail post-decisión (Ley 21.719: sin decisión no hay base de licitud)', () => {
    it.each([
      ['sin decisión todavía', null],
      ['rechazado', 'rejected'],
      ['retirado', 'withdrawn'],
      ['en pausa', 'on_hold'],
    ])('rechaza la captura para un candidato %s', async (_label, decision) => {
      listHiringApplications.mockResolvedValue([{ applicationId: 'happ-1', decision }])

      await expect(captureCandidateIdentityDocument(input)).rejects.toMatchObject({
        code: 'hiring_identity_capture_requires_decision',
        statusCode: 409,
      })
      expect(declareIdentityDocument).not.toHaveBeenCalled()
    })

    it('rechaza la captura si el candidato no tiene ninguna postulación', async () => {
      listHiringApplications.mockResolvedValue([])

      await expect(captureCandidateIdentityDocument(input)).rejects.toMatchObject({
        code: 'hiring_identity_capture_requires_decision',
      })
    })

    it.each(['selected', 'backup_selected'])('permite la captura tras una decisión %s', async decision => {
      listHiringApplications.mockResolvedValue([{ applicationId: 'happ-1', decision }])

      await expect(captureCandidateIdentityDocument(input)).resolves.toMatchObject({ documentId: 'doc-1' })
    })

    it('basta con que UNA de las postulaciones tenga decisión favorable', async () => {
      listHiringApplications.mockResolvedValue([
        { applicationId: 'happ-1', decision: 'rejected' },
        { applicationId: 'happ-2', decision: 'selected' },
      ])

      await expect(captureCandidateIdentityDocument(input)).resolves.toBeTruthy()
    })
  })

  describe('el apply público no puede alcanzar este path', () => {
    it('exige operador autenticado — el apply público corre con actor null', async () => {
      await expect(captureCandidateIdentityDocument({ ...input, actorUserId: '' })).rejects.toMatchObject({
        code: 'hiring_identity_capture_requires_actor',
        statusCode: 401,
      })
      expect(getCandidateFacetById).not.toHaveBeenCalled()
    })
  })

  describe('anclaje y PII', () => {
    it('ancla al identity_profile_id del candidato, nunca a un member_id', async () => {
      await captureCandidateIdentityDocument(input)

      const [declared] = declareIdentityDocument.mock.calls[0]

      expect(declared.profileId).toBe(PROFILE_ID)
      expect(declared).not.toHaveProperty('memberId')
    })

    it('lo declara HR sobre el candidato, no el candidato sobre sí mismo', async () => {
      await captureCandidateIdentityDocument(input)

      expect(declareIdentityDocument.mock.calls[0][0]).toMatchObject({
        source: 'hr_declared',
        declaredByUserId: 'user-hr',
      })
    })

    it('devuelve el documento enmascarado y nunca el valor crudo', async () => {
      const result = await captureCandidateIdentityDocument(input)

      expect(result.displayMask).toBe('xx.xxx.678-K')
      expect(JSON.stringify(result)).not.toContain('12.345.678-K')
    })

    it('falla cuando el candidato no existe', async () => {
      getCandidateFacetById.mockResolvedValue(null)

      await expect(captureCandidateIdentityDocument(input)).rejects.toThrow(/ficha de candidato/)
    })

    it('enlaza el escaneo del documento como evidencia (asset privado), sin tabla nueva', async () => {
      await captureCandidateIdentityDocument({ ...input, evidenceAssetId: 'asset-9' })

      expect(declareIdentityDocument.mock.calls[0][0].evidenceAssetId).toBe('asset-9')
    })
  })
})
