import { describe, expect, it } from 'vitest'

import {
  evaluateNotionOnboardingReadiness,
  type OnboardingCheckId,
  type OnboardingReadinessFacts
} from './notion-onboarding-preflight'

const NOW = '2026-06-04T12:00:00.000Z'

const greenFacts = (): OnboardingReadinessFacts => ({
  spaceId: 'space-cli-test',
  now: NOW,
  source: {
    exists: true,
    syncEnabled: true,
    hasTasksDataSource: true,
    hasProjectsDataSource: true,
    tokenSecretRef: 'notion-integration-token-greenhouse-test',
    lastSyncedAt: '2026-06-04T10:00:00.000Z'
  },
  tokenResolves: { ok: true, value: true },
  rawSnapshot: {
    ok: true,
    value: {
      spaceId: 'space-cli-test',
      taskRowCount: 80,
      projectRowCount: 4,
      sprintRowCount: 0,
      maxTaskSyncedAt: '2026-06-04T10:00:00.000Z',
      maxProjectSyncedAt: '2026-06-04T10:00:00.000Z',
      maxSprintSyncedAt: null,
      ready: true,
      reasons: []
    }
  },
  clientId: { ok: true, value: { total: 80, nullCount: 0, columnPresent: true } },
  templateL1: { ok: true, value: { titleColumnPresent: true, statusColumnPresent: true, unmappedStatuses: [], sampled: 5 } },
  conformedCount: { ok: true, value: 80 },
  portalCount: { ok: true, value: 80 }
})

const statusOf = (result: ReturnType<typeof evaluateNotionOnboardingReadiness>, id: OnboardingCheckId) =>
  result.checks.find(check => check.id === id)?.status

describe('evaluateNotionOnboardingReadiness', () => {
  it('all green → readyToOnboard true, 9 checks', () => {
    const result = evaluateNotionOnboardingReadiness(greenFacts())

    expect(result.readyToOnboard).toBe(true)
    expect(result.checks).toHaveLength(9)
    expect(result.checks.every(check => check.status === 'ok')).toBe(true)
    expect(result.summary).toContain('verde')
  })

  it('portal PG empty → not ready (la garantía de TASK-1009)', () => {
    const facts = greenFacts()

    facts.portalCount = { ok: true, value: 0 }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'portal_pg')).toBe('fail')
    expect(result.readyToOnboard).toBe(false)
    expect(result.summary).toContain('Tareas en el portal')
  })

  it('Estado no mapeable a V1 → template_l1 fail + not ready (no aliases por cliente)', () => {
    const facts = greenFacts()

    facts.templateL1 = {
      ok: true,
      value: { titleColumnPresent: true, statusColumnPresent: true, unmappedStatuses: ['Estado Inventado'], sampled: 6 }
    }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'template_l1')).toBe('fail')
    expect(result.readyToOnboard).toBe(false)
  })

  it('client_id NULL → fail (regresión TASK-1004)', () => {
    const facts = greenFacts()

    facts.clientId = { ok: true, value: { total: 80, nullCount: 80, columnPresent: true } }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'client_id_attributed')).toBe('fail')
    expect(result.readyToOnboard).toBe(false)
  })

  it('freshness stale → advisory degraded, NO bloquea readyToOnboard', () => {
    const facts = greenFacts()

    facts.source.lastSyncedAt = '2026-05-01T00:00:00.000Z'
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'freshness')).toBe('degraded')
    expect(result.readyToOnboard).toBe(true)
  })

  it('token ref ausente → advisory degraded, NO bloquea (raw landing prueba el token)', () => {
    const facts = greenFacts()

    facts.source.tokenSecretRef = null
    facts.tokenResolves = { ok: true, value: false }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'token_resolves')).toBe('degraded')
    expect(result.readyToOnboard).toBe(true)
  })

  it('fuente BQ caída → check crítico degraded → not ready (conservador)', () => {
    const facts = greenFacts()

    facts.portalCount = { ok: false, reason: 'connection refused' }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'portal_pg')).toBe('degraded')
    expect(result.readyToOnboard).toBe(false)
  })

  it('space sin binding → sync_enabled fail + not ready', () => {
    const facts = greenFacts()

    facts.source = {
      exists: false,
      syncEnabled: false,
      hasTasksDataSource: false,
      hasProjectsDataSource: false,
      tokenSecretRef: null,
      lastSyncedAt: null
    }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'sync_enabled')).toBe('fail')
    expect(result.readyToOnboard).toBe(false)
  })

  it('template L1 sin filas para inspeccionar (sampled=0) → degraded inconcluso, no ok', () => {
    const facts = greenFacts()

    facts.templateL1 = {
      ok: true,
      value: { titleColumnPresent: true, statusColumnPresent: true, unmappedStatuses: [], sampled: 0 }
    }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'template_l1')).toBe('degraded')
    expect(result.readyToOnboard).toBe(false)
  })

  it('client_id columna ausente (schema pre-TASK-1004) → degraded, no fail', () => {
    const facts = greenFacts()

    facts.clientId = { ok: true, value: { total: 0, nullCount: 0, columnPresent: false } }
    const result = evaluateNotionOnboardingReadiness(facts)

    expect(statusOf(result, 'client_id_attributed')).toBe('degraded')
    expect(result.readyToOnboard).toBe(false)
  })
})
