import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCandidateFacetById = vi.fn()
const getCandidateFacetByProfile = vi.fn()
const listHiringApplications = vi.fn()
const runGreenhousePostgresQuery = vi.fn()
const getLatestScanResultsForAssets = vi.fn()
const listIdentityDocumentsForProfileMasked = vi.fn()

vi.mock('../store', () => ({ getCandidateFacetById, getCandidateFacetByProfile, listHiringApplications }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery }))
vi.mock('@/lib/storage/asset-scan/store', () => ({ getLatestScanResultsForAssets }))
vi.mock('@/lib/person-legal-profile', () => ({ listIdentityDocumentsForProfileMasked }))

const { resolveCandidateDocuments } = await import('./resolve')

const FACET_ID = 'cndf-1'
const PROFILE_ID = 'identity-1'

const facet = {
  candidateFacetId: FACET_ID,
  identityProfileId: PROFILE_ID,
  portfolioUrl: 'https://portafolio.cl/ana',
  linkedinUrl: 'https://linkedin.com/in/ana',
}

const assetRow = (overrides: Record<string, unknown> = {}) => ({
  asset_id: 'asset-1',
  public_id: 'EO-AST-0001',
  owner_aggregate_type: 'hiring_application_cv',
  owner_aggregate_id: 'happ-1',
  status: 'attached',
  filename: 'cv.pdf',
  mime_type: 'application/pdf',
  size_bytes: '2048',
  metadata_json: { candidateFacetId: FACET_ID },
  uploaded_at: '2026-07-09T10:00:00.000Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  getCandidateFacetById.mockResolvedValue(facet)
  getCandidateFacetByProfile.mockResolvedValue(facet)
  listHiringApplications.mockResolvedValue([{ applicationId: 'happ-1' }])
  runGreenhousePostgresQuery.mockResolvedValue([])
  getLatestScanResultsForAssets.mockResolvedValue(new Map())
  listIdentityDocumentsForProfileMasked.mockResolvedValue([])
})

describe('resolveCandidateDocuments', () => {
  it('exige al menos un identificador', async () => {
    await expect(resolveCandidateDocuments({})).rejects.toThrow(/candidateFacetId o identityProfileId/)
  })

  it('falla cuando el candidato no existe, en vez de devolver un paquete vacío', async () => {
    getCandidateFacetById.mockResolvedValue(null)

    await expect(resolveCandidateDocuments({ candidateFacetId: FACET_ID })).rejects.toThrow(/ficha de candidato/)
  })

  it('resuelve por identityProfileId cuando no se entrega el facet', async () => {
    await resolveCandidateDocuments({ identityProfileId: PROFILE_ID })

    expect(getCandidateFacetByProfile).toHaveBeenCalledWith(PROFILE_ID)
    expect(getCandidateFacetById).not.toHaveBeenCalled()
  })

  it('busca por el facet Y por las postulaciones del candidato', async () => {
    await resolveCandidateDocuments({ candidateFacetId: FACET_ID })

    const [, values] = runGreenhousePostgresQuery.mock.calls[0]
    const [contexts, anchorIds, metadataFacetId] = values as [string[], string[], string]

    // El portafolio se ancla al facet; cada CV a su postulación.
    expect(anchorIds).toEqual([FACET_ID, 'happ-1'])
    // Los quarantined/pending sólo se encuentran por metadata (owner_aggregate_id es NULL).
    expect(metadataFacetId).toBe(FACET_ID)
    expect(contexts).toContain('hiring_application_cv_draft')
    expect(contexts).toContain('hiring_candidate_portfolio_file')
  })

  it('reusa los enlaces de TASK-1367 sin columna nueva', async () => {
    const result = await resolveCandidateDocuments({ candidateFacetId: FACET_ID })

    expect(result.links).toEqual([
      { kind: 'portfolio', url: 'https://portafolio.cl/ana' },
      { kind: 'linkedin', url: 'https://linkedin.com/in/ana' },
    ])
  })

  it('omite los enlaces ausentes en vez de emitir strings vacíos', async () => {
    getCandidateFacetById.mockResolvedValue({ ...facet, portfolioUrl: null, linkedinUrl: null })

    expect((await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).links).toEqual([])
  })

  describe('estado del archivo — el desk tiene que distinguir "no hay" de "está bloqueado"', () => {
    it('un asset attached y escaneado limpio es descargable', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([assetRow()])
      getLatestScanResultsForAssets.mockResolvedValue(
        new Map([['asset-1', { verdict: 'clean', scanner: 'structural', findings: [], scannedAt: 'ts' }]]),
      )

      const [file] = (await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).files

      expect(file.status).toBe('available')
      expect(file.downloadUrl).toBe('/api/assets/private/asset-1')
      expect(file.kind).toBe('cv')
    })

    it('un asset en cuarentena NO es descargable y se cuenta', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([
        assetRow({ status: 'quarantined', owner_aggregate_id: null, owner_aggregate_type: 'hiring_application_cv_draft' }),
      ])
      getLatestScanResultsForAssets.mockResolvedValue(
        new Map([
          [
            'asset-1',
            {
              verdict: 'suspicious',
              scanner: 'structural',
              findings: [{ code: 'hostile_magic_bytes', severity: 'blocking', detail: 'x' }],
              scannedAt: 'ts',
            },
          ],
        ]),
      )

      const result = await resolveCandidateDocuments({ candidateFacetId: FACET_ID })
      const [file] = result.files

      expect(file.status).toBe('quarantined')
      expect(file.downloadUrl).toBeNull()
      expect(file.scan?.findingCodes).toEqual(['hostile_magic_bytes'])
      expect(result.quarantinedCount).toBe(1)
    })

    it('un asset en cuarentena recupera su applicationId desde la metadata (owner_aggregate_id es NULL)', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([
        assetRow({
          status: 'quarantined',
          owner_aggregate_id: null,
          metadata_json: { candidateFacetId: FACET_ID, applicationId: 'happ-1' },
        }),
      ])

      const [file] = (await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).files

      expect(file.applicationId).toBe('happ-1')
    })

    it('un asset legacy sigue siendo descargable pero se marca como no escaneado', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([assetRow()])
      getLatestScanResultsForAssets.mockResolvedValue(
        new Map([['asset-1', { verdict: 'legacy_unscanned', scanner: 'none', findings: [], scannedAt: 'ts' }]]),
      )

      const [file] = (await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).files

      expect(file.status).toBe('legacy_unscanned')
      expect(file.downloadUrl).toBe('/api/assets/private/asset-1')
    })

    it('un asset pending todavía no es descargable', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([assetRow({ status: 'pending', owner_aggregate_id: null })])

      const [file] = (await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).files

      expect(file.status).toBe('pending')
      expect(file.downloadUrl).toBeNull()
    })

    it('mapea el contexto de portafolio a su kind', async () => {
      runGreenhousePostgresQuery.mockResolvedValue([
        assetRow({ owner_aggregate_type: 'hiring_candidate_portfolio_file', owner_aggregate_id: FACET_ID }),
      ])

      expect((await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).files[0].kind).toBe('portfolio_file')
    })
  })

  describe('identidad', () => {
    it('devuelve los documentos de identidad enmascarados y nunca el valor completo', async () => {
      listIdentityDocumentsForProfileMasked.mockResolvedValue([
        {
          documentId: 'doc-1',
          documentType: 'CL_RUT',
          countryCode: 'CL',
          displayMask: 'xx.xxx.678-K',
          verificationStatus: 'verified',
          evidenceAssetId: 'asset-9',
          profileId: PROFILE_ID,
        },
      ])

      const [document] = (await resolveCandidateDocuments({ candidateFacetId: FACET_ID })).identityDocuments

      expect(document.displayMask).toBe('xx.xxx.678-K')
      expect(JSON.stringify(document)).not.toContain('value_full')
      expect(Object.keys(document)).not.toContain('valueFull')
    })

    it('consulta la identidad por el perfil del candidato, no por member', async () => {
      await resolveCandidateDocuments({ candidateFacetId: FACET_ID })

      expect(listIdentityDocumentsForProfileMasked).toHaveBeenCalledWith(PROFILE_ID)
    })
  })

  describe('degradación honesta', () => {
    it('propaga el fallo de la consulta de assets en vez de devolver files vacío', async () => {
      runGreenhousePostgresQuery.mockRejectedValue(new Error('connection reset'))

      await expect(resolveCandidateDocuments({ candidateFacetId: FACET_ID })).rejects.toThrow('connection reset')
    })

    it('propaga el fallo de la consulta de identidad', async () => {
      listIdentityDocumentsForProfileMasked.mockRejectedValue(new Error('pg down'))

      await expect(resolveCandidateDocuments({ candidateFacetId: FACET_ID })).rejects.toThrow('pg down')
    })
  })
})
