import { describe, expect, it } from 'vitest'

import { formatPreflightAsHuman, formatPreflightAsJson } from './output-formatters'
import type { ProductionPreflightV1 } from './types'

const buildPayload = (): ProductionPreflightV1 => ({
  contractVersion: 'production-preflight.v1',
  startedAt: '2026-05-10T12:00:00.000Z',
  completedAt: '2026-05-10T12:00:05.000Z',
  durationMs: 5000,
  audience: 'admin',
  targetSha: 'abc1234567890def1234567890',
  targetBranch: 'main',
  triggeredBy: 'jreye',
  overallStatus: 'healthy',
  confidence: 'high',
  readyToDeploy: true,
  checks: [
    {
      checkId: 'target_sha_exists',
      severity: 'ok',
      status: 'ok',
      observedAt: '2026-05-10T12:00:00.000Z',
      durationMs: 100,
      summary: 'Commit verificado',
      error: null,
      evidence: null,
      recommendation: ''
    }
  ],
  degradedSources: []
})

describe('formatPreflightAsJson', () => {
  it('produces valid JSON parseable round-trip', () => {
    const payload = buildPayload()
    const json = formatPreflightAsJson(payload)
    const parsed = JSON.parse(json)

    expect(parsed.contractVersion).toBe('production-preflight.v1')
    expect(parsed.overallStatus).toBe('healthy')
  })
})

describe('formatPreflightAsHuman', () => {
  it('includes target SHA + overall status + ready flag', () => {
    const output = formatPreflightAsHuman(buildPayload())

    expect(output).toContain('abc123456789')
    expect(output).toContain('READY')
    expect(output).toContain('Ready to Deploy  : SI')
  })

  it('shows BLOCKED when overall blocked + readyToDeploy NO', () => {
    const payload = buildPayload()

    const output = formatPreflightAsHuman({
      ...payload,
      overallStatus: 'blocked',
      readyToDeploy: false
    })

    expect(output).toContain('BLOCKED')
    expect(output).toContain('Ready to Deploy  : NO')
  })

  it('lists degraded sources when present', () => {
    const payload = buildPayload()

    const output = formatPreflightAsHuman({
      ...payload,
      degradedSources: [
        {
          checkId: 'azure_wif_subject',
          status: 'not_configured',
          observedAt: '2026-05-10T12:00:00.000Z',
          summary: 'Azure CLI no autenticado'
        }
      ]
    })

    expect(output).toContain('Degraded Sources')
    expect(output).toContain('azure_wif_subject')
  })
})
