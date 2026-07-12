import { describe, expect, it, vi } from 'vitest'

import type * as PostgresClient from '@/lib/postgres/client'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', async importOriginal => ({
  ...(await importOriginal<typeof PostgresClient>()),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...(args as []))
}))

import { listProposalsForOperator } from '../operator-view'

/**
 * TASK-1399 — el read model del día a día. Lo que se prueba acá es la DERIVACIÓN (el semáforo del
 * deadline y el link del PDF); el SQL se ejercitó contra PG real (gate TASK-893).
 */

const baseRow = {
  proposal_id: 'prop-1',
  owner_org_id: 'org-1',
  title: 'SKY — Blog 2026',
  origin: 'private_rfp',
  state: 'producing',
  deadline: null as string | null,
  deadline_confidence: 'none_declared',
  updated_at: '2026-07-12T00:00:00Z',
  assets_count: '3',
  evidence_count: '2',
  requirements_count: '1',
  jobs_in_flight: '0',
  jobs_needing_attention: '0',
  latest_job_id: null as string | null,
  latest_job_purpose: null as string | null,
  latest_job_audience: null as string | null,
  latest_job_state: null as string | null,
  latest_job_failure: null as string | null,
  latest_job_pdf_asset: null as string | null,
  latest_job_previews: null as number | null,
  latest_job_created_at: null as string | null
}

describe('listProposalsForOperator — el semáforo del deadline', () => {
  it('sin deadline → risk "none" (no inventa urgencia)', async () => {
    mockQuery.mockResolvedValueOnce([baseRow])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.deadlineRisk).toBe('none')
  })

  it('deadline a menos de 72 h → "at_risk" (es lo que hay que mirar primero)', async () => {
    const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString()

    mockQuery.mockResolvedValueOnce([{ ...baseRow, deadline: soon }])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.deadlineRisk).toBe('at_risk')
  })

  it('deadline vencido → "expired" (el proceso se perdió: la verdad, no un warning)', async () => {
    mockQuery.mockResolvedValueOnce([{ ...baseRow, deadline: '2020-01-01T00:00:00Z' }])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.deadlineRisk).toBe('expired')
  })

  it('deadline lejano → "ok"', async () => {
    const far = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()

    mockQuery.mockResolvedValueOnce([{ ...baseRow, deadline: far }])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.deadlineRisk).toBe('ok')
  })
})

describe('listProposalsForOperator — el artefacto', () => {
  it('un job completado expone el link CANÓNICO de descarga (nunca una URL de bucket)', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        ...baseRow,
        latest_job_id: 'prnd-1',
        latest_job_purpose: 'deck',
        latest_job_audience: 'client_facing',
        latest_job_state: 'completed',
        latest_job_pdf_asset: 'asset-abc',
        latest_job_previews: 15,
        latest_job_created_at: '2026-07-12T00:00:00Z'
      }
    ])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.latestArtifact?.downloadUrl).toBe('/api/assets/private/asset-abc')
    expect(row!.latestArtifact?.previewCount).toBe(15)
    // El link re-autoriza en cada descarga: acá NO hay firma ni bucket.
    expect(row!.latestArtifact?.downloadUrl).not.toContain('storage.googleapis')
  })

  it('un job fallido NO ofrece link (no hay PDF que bajar) y se cuenta como "necesita atención"', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        ...baseRow,
        jobs_needing_attention: '1',
        latest_job_id: 'prnd-2',
        latest_job_purpose: 'deck',
        latest_job_audience: 'client_facing',
        latest_job_state: 'dead_letter',
        latest_job_failure: 'audience_violation',
        latest_job_pdf_asset: null,
        latest_job_created_at: '2026-07-12T00:00:00Z'
      }
    ])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.latestArtifact?.downloadUrl).toBeNull()
    expect(row!.latestArtifact?.failureCode).toBe('audience_violation')
    expect(row!.renderJobsNeedingAttention).toBe(1)
  })

  it('sin jobs → latestArtifact null (nunca un placeholder falso)', async () => {
    mockQuery.mockResolvedValueOnce([baseRow])

    const [row] = await listProposalsForOperator({ ownerOrgId: 'org-1' })

    expect(row!.latestArtifact).toBeNull()
  })
})
