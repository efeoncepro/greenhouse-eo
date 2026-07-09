import { beforeEach, describe, expect, it, vi } from 'vitest'

const executeApiPlatformCommandMock = vi.fn()
const runGreenhousePostgresQueryMock = vi.fn()
const createTalentDemandMock = vi.fn()
const createHiringOpeningMock = vi.fn()
const getHiringOpeningByIdMock = vi.fn()
const updateHiringOpeningMock = vi.fn()
const publishOpeningMock = vi.fn()

vi.mock('@/lib/api-platform/core/commands', () => ({
  executeApiPlatformCommand: executeApiPlatformCommandMock,
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: runGreenhousePostgresQueryMock,
}))

vi.mock('./store', () => ({
  createTalentDemand: createTalentDemandMock,
  createHiringOpening: createHiringOpeningMock,
  getHiringOpeningById: getHiringOpeningByIdMock,
  updateHiringOpening: updateHiringOpeningMock,
}))

vi.mock('./publication', () => ({
  publishOpening: publishOpeningMock,
}))

const {
  executeHiringVacancyPublicationCommand,
  publishHiringVacancyFromBrief,
} = await import('./vacancy-publication-operator')

const brief = {
  idempotencyKey: 'vacancy-account-manager-20260709',
  sourceReference: 'job-brief-account-manager-20260709',
  requestedRole: 'Account Manager / Especialista en Marketing',
  publicTitle: 'Account Manager / Especialista en Marketing',
  publicSummary: 'Lidera cuentas de crecimiento con criterio operativo y visión de marketing.',
  publicDescription: 'Acompaña cuentas estratégicas y coordina el sistema de crecimiento.',
  responsibilities: ['Gestionar la relación diaria con clientes.', 'Coordinar campañas, SEO y proveedores.'],
  requirements: ['Marketing generalista', 'Nociones de SEO', 'Vendor management'],
  niceToHave: ['Experiencia en agencia o growth teams'],
  skillTags: ['Marketing', 'SEO', 'Vendor management', 'Liderazgo operativo'],
  publicArea: 'Marketing',
  workMode: 'remote',
  hiringRegion: 'LATAM',
  seniority: 'L2',
  employmentMode: 'Jornada completa',
}

beforeEach(() => {
  vi.clearAllMocks()
  executeApiPlatformCommandMock.mockImplementation(async ({ run }) => run())
  runGreenhousePostgresQueryMock.mockResolvedValue([])
  createTalentDemandMock.mockResolvedValue({
    demandId: 'tdmn-1',
    publicId: 'EO-TDM-0013',
  })
  createHiringOpeningMock.mockResolvedValue({
    openingId: 'opng-1',
    publicId: 'EO-OPN-0010',
    publicationStatus: 'draft',
  })
  updateHiringOpeningMock.mockResolvedValue({
    openingId: 'opng-1',
    publicId: 'EO-OPN-0010',
    publicationStatus: 'draft',
  })
  publishOpeningMock.mockResolvedValue({
    openingId: 'opng-1',
    publicId: 'EO-OPN-0010',
    publishedAt: '2026-07-09T18:20:00.000Z',
  })
})

describe('publishHiringVacancyFromBrief', () => {
  it('dryRun normalizes the brief without writing state', async () => {
    const result = await publishHiringVacancyFromBrief({ ...brief, mode: 'dryRun' }, 'user-1')

    expect(result.outcome).toBe('validated')
    expect(result.preview?.publicOpening.publicWorkMode).toBe('remote')
    expect(result.preview?.publicOpening.publicHiringRegion).toBe('LATAM')
    expect(result.preview?.publicOpening.publicArea).toBe('Marketing')
    expect(result.preview?.publicOpening.publicSkillTags).toEqual(['Marketing', 'SEO', 'Vendor management', 'Liderazgo operativo'])
    expect(createTalentDemandMock).not.toHaveBeenCalled()
    expect(createHiringOpeningMock).not.toHaveBeenCalled()
    expect(updateHiringOpeningMock).not.toHaveBeenCalled()
    expect(publishOpeningMock).not.toHaveBeenCalled()
  })

  it('publish creates demand/opening, updates structured public projection and publishes', async () => {
    const result = await publishHiringVacancyFromBrief({ ...brief, mode: 'publish' }, 'user-1')

    expect(result.outcome).toBe('published')
    expect(result.demandPublicId).toBe('EO-TDM-0013')
    expect(result.openingPublicId).toBe('EO-OPN-0010')
    expect(updateHiringOpeningMock).toHaveBeenCalledWith(
      'opng-1',
      expect.objectContaining({
        publicWorkMode: 'remote',
        publicHiringRegion: 'LATAM',
        publicArea: 'Marketing',
        publicSkillTags: ['Marketing', 'SEO', 'Vendor management', 'Liderazgo operativo'],
        publicLocationMode: 'LATAM',
        publicationSourceRef: 'job-brief-account-manager-20260709',
      }),
      'user-1',
    )
    expect(publishOpeningMock).toHaveBeenCalledWith('opng-1', 'user-1')
  })
})

describe('executeHiringVacancyPublicationCommand', () => {
  it('does not audit/idempotency-wrap dryRun', async () => {
    const request = new Request('http://localhost/api/hiring/vacancy-publications', { method: 'POST' })

    const result = await executeHiringVacancyPublicationCommand({
      request,
      actorUserId: 'user-1',
      body: { ...brief, mode: 'dryRun' },
    })

    expect(result.data.outcome).toBe('validated')
    expect(executeApiPlatformCommandMock).not.toHaveBeenCalled()
  })

  it('requires an idempotency key for execute/publish', async () => {
    const request = new Request('http://localhost/api/hiring/vacancy-publications', { method: 'POST' })

    await expect(
      executeHiringVacancyPublicationCommand({
        request,
        actorUserId: 'user-1',
        body: { ...brief, idempotencyKey: null, mode: 'execute' },
      }),
    ).rejects.toMatchObject({ code: 'hiring_vacancy_publication_invalid_input' })
  })

  it('wraps publish with the canonical API Platform command ledger', async () => {
    const request = new Request('http://localhost/api/hiring/vacancy-publications', { method: 'POST' })

    await executeHiringVacancyPublicationCommand({
      request,
      actorUserId: 'user-1',
      body: { ...brief, mode: 'publish' },
    })

    expect(executeApiPlatformCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'hiring.vacancy_publication.publish',
        idempotencyKeyOverride: 'vacancy-account-manager-20260709',
      }),
    )
  })
})
