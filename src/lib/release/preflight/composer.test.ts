import { describe, expect, it } from 'vitest'

import type { PreflightCheckId, PreflightCheckResult, PreflightSeverity } from './types'

import { buildMissingCheckPlaceholder, composeFromCheckResults, PREFLIGHT_CHECK_ORDER } from './composer'

const ALL_CHECK_IDS = PREFLIGHT_CHECK_ORDER

const okCheck = (checkId: PreflightCheckId, overrides: Partial<PreflightCheckResult> = {}): PreflightCheckResult => ({
  checkId,
  severity: 'ok' as PreflightSeverity,
  status: 'ok',
  observedAt: '2026-05-10T12:00:00.000Z',
  durationMs: 100,
  summary: `${checkId} ok`,
  error: null,
  evidence: null,
  recommendation: '',
  ...overrides
})

const buildAllOkChecks = (): PreflightCheckResult[] => ALL_CHECK_IDS.map(id => okCheck(id))

describe('composeFromCheckResults', () => {
  it('returns healthy + ready when all 12 checks ok', () => {
    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: 'jreye@efeonce.org',
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks: buildAllOkChecks()
    })

    expect(result.contractVersion).toBe('production-preflight.v1')
    expect(result.overallStatus).toBe('healthy')
    expect(result.confidence).toBe('high')
    expect(result.readyToDeploy).toBe(true)
    expect(result.degradedSources).toHaveLength(0)
    expect(result.checks).toHaveLength(12)
    expect(result.durationMs).toBe(5000)
  })

  it('returns blocked + not ready when any check has severity error', () => {
    const checks = buildAllOkChecks()

    checks[3] = okCheck('release_batch_policy', {
      severity: 'error',
      summary: 'Mezcla de dominios sensibles sin dependencia documentada',
      recommendation: 'Dividir release en dos batches'
    })

    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: 'jreye@efeonce.org',
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks
    })

    expect(result.overallStatus).toBe('blocked')
    expect(result.readyToDeploy).toBe(false)
  })

  it('returns degraded + not ready when any check has severity warning and none error', () => {
    const checks = buildAllOkChecks()

    checks[5] = okCheck('pending_without_jobs', {
      severity: 'warning',
      summary: '1 run pending sin jobs > 5min'
    })

    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks
    })

    expect(result.overallStatus).toBe('degraded')
    expect(result.readyToDeploy).toBe(false)
  })

  it('lowers confidence to medium when 1-2 sources degraded', () => {
    const checks = buildAllOkChecks()

    checks[10] = okCheck('azure_wif_subject', {
      severity: 'unknown',
      status: 'not_configured',
      summary: 'AZURE_CLI no autenticado en runtime'
    })

    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks
    })

    expect(result.confidence).toBe('medium')
    expect(result.degradedSources).toHaveLength(1)
    expect(result.degradedSources[0]?.checkId).toBe('azure_wif_subject')
  })

  it('lowers confidence to low when 3+ sources degraded', () => {
    const checks = buildAllOkChecks()

    checks[6] = okCheck('vercel_readiness', { severity: 'unknown', status: 'timeout' })
    checks[10] = okCheck('azure_wif_subject', { severity: 'unknown', status: 'not_configured' })
    checks[11] = okCheck('sentry_critical_issues', { severity: 'unknown', status: 'error' })

    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks
    })

    expect(result.confidence).toBe('low')
    expect(result.degradedSources).toHaveLength(3)
  })

  it('orders checks deterministically per PREFLIGHT_CHECK_ORDER', () => {
    const reversed = [...buildAllOkChecks()].reverse()

    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks: reversed
    })

    expect(result.checks.map(c => c.checkId)).toEqual([...PREFLIGHT_CHECK_ORDER])
  })

  it('returns unknown when zero checks supplied (composer-level failure)', () => {
    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:00.000Z',
      completedAt: '2026-05-10T12:00:05.000Z',
      checks: []
    })

    expect(result.overallStatus).toBe('unknown')
    expect(result.confidence).toBe('unknown')
    expect(result.readyToDeploy).toBe(false)
  })

  it('clamps durationMs to 0 when completedAt < startedAt (clock skew defensive)', () => {
    const result = composeFromCheckResults({
      audience: 'admin',
      targetSha: 'abc1234567890',
      targetBranch: 'main',
      triggeredBy: null,
      startedAt: '2026-05-10T12:00:05.000Z',
      completedAt: '2026-05-10T12:00:00.000Z',
      checks: buildAllOkChecks()
    })

    expect(result.durationMs).toBe(0)
  })
})

describe('buildMissingCheckPlaceholder', () => {
  it('produces severity unknown + status not_configured', () => {
    const placeholder = buildMissingCheckPlaceholder(
      'gcp_wif_subject',
      'gcloud no instalado en runtime'
    )

    expect(placeholder.checkId).toBe('gcp_wif_subject')
    expect(placeholder.severity).toBe('unknown')
    expect(placeholder.status).toBe('not_configured')
    expect(placeholder.summary).toContain('Check no ejecutada')
    expect(placeholder.summary).toContain('gcloud no instalado')
  })
})
