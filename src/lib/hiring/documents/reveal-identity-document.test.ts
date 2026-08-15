import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCandidateFacetById = vi.fn()
const listIdentityDocumentsForProfileMasked = vi.fn()
const revealPersonIdentityDocument = vi.fn()

vi.mock('../store', () => ({ getCandidateFacetById }))
vi.mock('@/lib/person-legal-profile', () => ({
  listIdentityDocumentsForProfileMasked,
  revealPersonIdentityDocument,
}))

const { revealCandidateIdentityDocument } = await import('./reveal-identity-document')

const FACET_ID = 'cndf-1'
const PROFILE_ID = 'identity-1'
const DOCUMENT_ID = 'doc-1'

const input = {
  candidateFacetId: FACET_ID,
  documentId: DOCUMENT_ID,
  actorUserId: 'user-hr',
  reason: 'preparación de contrato para la contratación aprobada',
}

const revealResult = {
  document: { documentId: DOCUMENT_ID, valueFull: '12.345.678-9', valueNormalized: '123456789' },
  auditId: 'audit-1',
  eventId: 'event-1',
}

beforeEach(() => {
  vi.clearAllMocks()
  getCandidateFacetById.mockResolvedValue({ candidateFacetId: FACET_ID, identityProfileId: PROFILE_ID })
  listIdentityDocumentsForProfileMasked.mockResolvedValue([{ documentId: DOCUMENT_ID }])
  revealPersonIdentityDocument.mockResolvedValue(revealResult)
})

describe('revealCandidateIdentityDocument', () => {
  describe('anti-IDOR: el documento debe pertenecer al candidato del path', () => {
    it('revela cuando el documento está entre los del perfil del candidato', async () => {
      await expect(revealCandidateIdentityDocument(input)).resolves.toEqual(revealResult)

      expect(revealPersonIdentityDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: DOCUMENT_ID, actorUserId: 'user-hr' }),
      )
    })

    it('rechaza un documentId que pertenece a otra persona SIN revelar nada', async () => {
      listIdentityDocumentsForProfileMasked.mockResolvedValue([{ documentId: 'doc-de-otra-persona' }])

      await expect(revealCandidateIdentityDocument(input)).rejects.toMatchObject({
        // 404 y NO 403: un 403 confirmaría que el documento existe y es de otro.
        statusCode: 404,
        code: 'hiring_identity_document_not_found',
      })

      expect(revealPersonIdentityDocument).not.toHaveBeenCalled()
    })

    it('rechaza cuando el perfil del candidato no tiene ningún documento', async () => {
      listIdentityDocumentsForProfileMasked.mockResolvedValue([])

      await expect(revealCandidateIdentityDocument(input)).rejects.toMatchObject({ statusCode: 404 })
      expect(revealPersonIdentityDocument).not.toHaveBeenCalled()
    })

    it('incluye archivados/expirados en la verificación de pertenencia para que TASK-784 pueda dar su 409', async () => {
      await revealCandidateIdentityDocument(input)

      // Sin includeArchived, un documento archivado del propio candidato se
      // reportaría como inexistente en vez de recibir el 409 que explica la causa.
      expect(listIdentityDocumentsForProfileMasked).toHaveBeenCalledWith(PROFILE_ID, { includeArchived: true })
    })
  })

  describe('guardrails de entrada', () => {
    it('exige un operador autenticado', async () => {
      await expect(revealCandidateIdentityDocument({ ...input, actorUserId: '' })).rejects.toMatchObject({
        statusCode: 401,
        code: 'hiring_identity_reveal_requires_actor',
      })

      expect(getCandidateFacetById).not.toHaveBeenCalled()
    })

    it.each([
      ['vacío', ''],
      ['demasiado corto', 'ok'],
      ['solo espacios', '        '],
    ])('rechaza un motivo %s antes de tocar la fila', async (_label, reason) => {
      await expect(revealCandidateIdentityDocument({ ...input, reason })).rejects.toMatchObject({
        statusCode: 400,
        code: 'hiring_identity_reveal_reason_required',
      })

      expect(getCandidateFacetById).not.toHaveBeenCalled()
      expect(revealPersonIdentityDocument).not.toHaveBeenCalled()
    })

    it('rechaza un candidato inexistente', async () => {
      getCandidateFacetById.mockResolvedValue(null)

      await expect(revealCandidateIdentityDocument(input)).rejects.toMatchObject({ statusCode: 404 })
      expect(listIdentityDocumentsForProfileMasked).not.toHaveBeenCalled()
    })
  })

  describe('delegación al reveal auditado de TASK-784', () => {
    it('no duplica audit ni outbox: delega con el contexto completo del actor', async () => {
      await revealCandidateIdentityDocument({
        ...input,
        actorEmail: 'hr@efeonce.org',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(revealPersonIdentityDocument).toHaveBeenCalledTimes(1)
      expect(revealPersonIdentityDocument).toHaveBeenCalledWith({
        documentId: DOCUMENT_ID,
        actorUserId: 'user-hr',
        actorEmail: 'hr@efeonce.org',
        reason: input.reason,
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      })
    })

    it('normaliza el contexto opcional ausente a null en vez de undefined', async () => {
      await revealCandidateIdentityDocument(input)

      expect(revealPersonIdentityDocument).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail: null, ipAddress: null, userAgent: null }),
      )
    })
  })
})
