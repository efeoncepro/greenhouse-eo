import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/reliability/queries/release-pending-without-jobs', () => ({
  listPendingRuns: vi.fn()
}))

/**
 * TASK-1676 — la lista forense se inyecta como FIXTURE, no se lee la real.
 *
 * Antes, estos tests usaban el `runId` de la única entrada operativa vigente. Eso
 * los volvía el test de regresión de un DATO caducable en vez del test del
 * MECANISMO de exclusión: al retirar esa entrada —correctamente, porque el run ya
 * estaba `cancelled`— dos tests se pusieron rojos sin que el código cambiara. Un
 * test que se rompe cuando caduca un dato operativo está probando la cosa
 * equivocada.
 */
const IGNORED_FIXTURE_RUN_ID = 8_888_888_888

vi.mock('../ignored-pending-runs', () => ({
  IGNORED_PENDING_RUNS: [
    {
      runId: 8_888_888_888,
      reason: 'Fixture de test: run inmanejable con todas las vías de la API agotadas.',
      addedAt: '2026-01-01',
      expiresAt: '2999-01-01'
    }
  ],
  activeIgnoredRunIds: () => new Set([8_888_888_888])
}))

import { listPendingRuns } from '@/lib/reliability/queries/release-pending-without-jobs'

import { checkPendingWithoutJobs } from './pending-without-jobs'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

describe('checkPendingWithoutJobs', () => {
  const originalToken = process.env.GITHUB_RELEASE_OBSERVER_TOKEN
  const originalGithubToken = process.env.GITHUB_TOKEN
  const originalAppId = process.env.GITHUB_APP_ID

  beforeEach(() => {
    delete process.env.GITHUB_RELEASE_OBSERVER_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_APP_ID
    vi.mocked(listPendingRuns).mockReset()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.GITHUB_RELEASE_OBSERVER_TOKEN = originalToken
    if (originalGithubToken !== undefined) process.env.GITHUB_TOKEN = originalGithubToken
    if (originalAppId !== undefined) process.env.GITHUB_APP_ID = originalAppId
  })

  it('severity unknown when no token configured', async () => {
    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
    expect(listPendingRuns).not.toHaveBeenCalled()
  })

  it('severity ok when zero pending records', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('Sin runs queued/in_progress')
  })

  it('severity error when records exist (any) — sintoma deadlock', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        runId: 1,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 10 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/1',
        branch: 'main',
        sha: 'abc'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('sintoma deadlock')
    expect(result.recommendation).toContain('gh run cancel')
  })

  it('exclusión forense: un run de la lista vigente no bloquea, queda en evidencia y la severidad es ok', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        runId: IGNORED_FIXTURE_RUN_ID,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 20 * 60 * 60 * 1000,
        htmlUrl: `https://github.com/x/y/actions/runs/${IGNORED_FIXTURE_RUN_ID}`,
        branch: 'develop',
        sha: '26005a619'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('lista forense')
    expect(result.evidence).toMatchObject({
      count: 0,
      ignored: [expect.objectContaining({ runId: IGNORED_FIXTURE_RUN_ID })]
    })
  })

  it('exclusión forense NO tapa runs fuera de la lista: deadlock real sigue bloqueando', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        runId: IGNORED_FIXTURE_RUN_ID,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 20 * 60 * 60 * 1000,
        htmlUrl: `https://github.com/x/y/actions/runs/${IGNORED_FIXTURE_RUN_ID}`,
        branch: 'develop',
        sha: '26005a619'
      },
      {
        runId: 999,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 10 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/999',
        branch: 'main',
        sha: 'def'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('error')
    expect(result.evidence).toMatchObject({ count: 1 })
  })

  it('severity unknown when reader throws', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockRejectedValue(new Error('rate limit'))

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.error).toContain('rate limit')
  })
})
