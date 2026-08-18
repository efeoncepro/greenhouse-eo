import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getApplication: vi.fn(),
  getOpening: vi.fn(),
  listApplications: vi.fn(),
  listAssessments: vi.fn(),
  documents: vi.fn(),
  capture: vi.fn(),
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.query,
  withGreenhousePostgresTransaction: vi.fn(),
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))
vi.mock('./store', () => ({
  getHiringApplicationById: mocks.getApplication,
  getHiringOpeningById: mocks.getOpening,
  listHiringApplications: mocks.listApplications,
}))
vi.mock('./assessment', () => ({ listAssessmentsForApplication: mocks.listAssessments }))
vi.mock('./documents', () => ({ resolveHiringApplicationDocuments: mocks.documents }))

import { getMicrocopy } from '@/lib/copy'
import type { PublicOpeningPayload } from '@/types/hiring'

import { findForbiddenKeys } from './assessment/public-boundary.contract'
import { getCandidateReviewPacket } from './candidate-review/readers'
import { buildCareersOpeningViewModel } from './public-careers/view-model'
import { resolveTalentPoolSelfServiceToken } from './talent-pool/self-service'

/**
 * TASK-1734 Slice 5 — Boundary de los DTOs candidate/client existentes.
 *
 * Barre los contratos candidate-facing (careers público, talent pool self-service) y el
 * review packet MCP (TASK-1718) con fuentes envenenadas de scoring, y asserta que ninguno
 * expone score/resultado/proposal/rationale/review state. Denylist canónica:
 * `assessment/public-boundary.contract.ts`.
 */

const SENTINELS = {
  autoScore: 8731,
  humanScore: 9642,
  rationale: 'SENTINEL-RATIONALE-nunca-al-consumer',
  resultBand: 'SENTINEL-BAND-alto',
  proposal: 'SENTINEL-PROPOSAL-aiprop-991',
  dossier: 'SENTINEL-DOSSIER-narrativa-interna',
} as const

const expectClean = (payload: unknown) => {
  expect(findForbiddenKeys(payload)).toEqual([])

  const serialized = JSON.stringify(payload)

  for (const sentinel of Object.values(SENTINELS)) {
    expect(serialized).not.toContain(String(sentinel))
  }
}

describe('TASK-1734 Slice 5 — careers público (view model)', () => {
  const copy = getMicrocopy('es-CL').careers

  const opening: PublicOpeningPayload = {
    publicId: 'EO-OPN-9001',
    title: 'Content Creator',
    summary: 'Crea contenido para marcas.',
    description: 'Sobre el rol\nCrear contenido.\n- Redactar piezas',
    requirements: 'SEO\nRedacción',
    niceToHave: null,
    locationMode: 'Remoto',
    workMode: 'remote',
    hiringRegion: 'LATAM',
    city: null,
    country: null,
    officeLocation: null,
    area: 'Marketing',
    skillTags: ['SEO'],
    compensationBand: null,
    employmentMode: 'Jornada completa',
    seniority: 'Semi-senior',
    processNotes: 'Postulas y luego conversamos.',
    applyUrl: null,
    publishedAt: '2026-08-01T00:00:00.000Z',
    content: null,
    remoteEligibleCountries: [],
  }

  it('el view model no expone scoring aunque el payload fuente venga envenenado', () => {
    const poisoned = {
      ...opening,
      assessmentTemplateId: 'tpl-interna',
      avgAutoScore: SENTINELS.autoScore,
      aiRationale: SENTINELS.rationale,
      resultBand: SENTINELS.resultBand,
    } as never

    const vm = buildCareersOpeningViewModel(poisoned, copy)

    expectClean(vm)
  })

  it('filtra process notes internas (scorecard/assessment template) del sitio público', () => {
    const vm = buildCareersOpeningViewModel(
      { ...opening, processNotes: 'Usamos el assessment template L2 y un scorecard interno.' },
      copy,
    )

    expect(vm.processNotes).toEqual([])
  })
})

describe('TASK-1734 Slice 5 — talent pool self-service (candidate-facing)', () => {
  const token = 'A'.repeat(43)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('talent_pool_self_service_token')) {
        return [
          {
            membership_id: 'membership-private-1',
            public_id: 'EO-TLP-0001',
            lifecycle_status: 'pool_eligible',
            future_consent_expires_at: '2027-01-01T00:00:00.000Z',
            aggregate_version: 3,
            availability: 'inmediata',
            expires_at: '2026-09-01T00:00:00.000Z',
            revoked_at: null,
            // veneno: columnas de evidencia/resultado que un SELECT futuro podría arrastrar
            result_band: SENTINELS.resultBand,
            assessment_auto_score: SENTINELS.autoScore,
            ai_rationale: SENTINELS.rationale,
          },
        ]
      }

      if (sql.includes('talent_pool_consent_event')) {
        return [
          {
            receipt_public_id: 'EO-TLPR-1',
            purpose: 'future_opportunities',
            action: 'granted',
            occurred_at: '2026-08-01T00:00:00.000Z',
            expires_at: '2027-01-01T00:00:00.000Z',
          },
        ]
      }

      return []
    })
  })

  it('el perfil self-service expone sólo el allowlist del candidato (sin evidencia ni resultBand)', async () => {
    const resolved = await resolveTalentPoolSelfServiceToken(token)

    expect(Object.keys(resolved.profile).sort()).toEqual(
      ['access', 'aggregateVersion', 'availability', 'futureConsentExpiresAt', 'lifecycleStatus', 'receipts', 'talentProfileId'].sort(),
    )
    expect(resolved.profile).not.toHaveProperty('evidence')
    expect(resolved.profile).not.toHaveProperty('membershipId')
    expectClean(resolved.profile)
  })
})

describe('TASK-1734 Slice 5 — candidate review packet (MCP, TASK-1718)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApplication.mockResolvedValue({
      applicationId: 'application-1',
      openingId: 'opening-1',
      identityProfileId: 'profile-1',
      candidateFacetId: 'facet-1',
      stage: 'assessment',
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:01:00.000Z',
    })
    mocks.getOpening.mockResolvedValue({ openingId: 'opening-1', internalTitle: 'Content Creator' })

    // Assessments envenenados: el reader interno trae scoring; el packet MCP no puede exponerlo.
    mocks.listAssessments.mockResolvedValue([
      {
        assessmentId: 'hass-privada-1',
        publicId: 'EO-ASMT-1',
        method: 'candidate_test',
        status: 'submitted',
        submittedAt: '2026-08-16T00:02:00.000Z',
        updatedAt: '2026-08-16T00:02:00.000Z',
        autoScore: SENTINELS.autoScore,
        humanScore: SENTINELS.humanScore,
        aiRationale: SENTINELS.rationale,
        aiProposalId: SENTINELS.proposal,
        reviewDossier: SENTINELS.dossier,
      },
    ])
    mocks.documents.mockResolvedValue({
      applicationId: 'application-1',
      candidateFacetId: 'facet-1',
      quarantinedCount: 0,
      links: [{ kind: 'portfolio', url: 'https://portfolio.example.test' }],
      files: [{ assetId: 'asset-1', kind: 'cv', status: 'available', scan: { verdict: 'clean' } }],
    })
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('identity_profiles')) return [{ full_name: 'Candidate Name' }]

      if (sql.includes('candidate_document_review_projection')) {
        return [
          {
            content_hash: 'a'.repeat(64),
            status: 'ready',
            text_content: 'Redacted candidate evidence',
            source_updated_at: '2026-08-16T00:01:00.000Z',
            extracted_at: '2026-08-16T00:03:00.000Z',
            extraction_version: 'pdfjs-v1',
            redaction_policy_version: 'contact-v1',
          },
        ]
      }

      return []
    })
  })

  it('el packet sigue sin scores, notas, dossier ni scoring-run (allowlist por assessment)', async () => {
    const packet = await getCandidateReviewPacket({ applicationId: 'application-1', purpose: 'screening_review' })

    expectClean(packet)

    expect(packet.assessments).toHaveLength(1)
    expect(Object.keys(packet.assessments[0]).sort()).toEqual(
      ['assessmentId', 'method', 'status', 'submittedAt', 'updatedAt'].sort(),
    )

    // El id expuesto es el público, nunca el interno.
    expect(packet.assessments[0].assessmentId).toBe('EO-ASMT-1')
    expect(JSON.stringify(packet)).not.toContain('hass-privada-1')

    // Sin hábitats paralelos de revisión dentro del packet.
    expect(packet).not.toHaveProperty('notes')
    expect(packet).not.toHaveProperty('dossier')
    expect(packet).not.toHaveProperty('scoringRun')
    expect(packet).not.toHaveProperty('proposals')
  })
})
