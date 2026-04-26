import { describe, it, expect } from 'vitest'

import type {
  PlatformHealthIssue,
  PlatformHealthModule,
  PlatformOverallStatus
} from '@/types/platform-health'

import { buildCheckTriggerSet, deriveSafeModes } from './safe-modes'

const moduleStub = (
  moduleKey: string,
  status: PlatformOverallStatus,
  domain = 'platform'
): PlatformHealthModule => ({
  moduleKey,
  label: moduleKey,
  domain,
  status,
  confidence: 'high',
  summary: `${moduleKey} is ${status}`,
  topIssues: [],
  sourceFreshness: {}
})

const issueStub = (
  moduleKey: string,
  severity: 'error' | 'warning',
  source = 'subsystem'
): PlatformHealthIssue => ({
  moduleKey,
  severity,
  source,
  summary: `${moduleKey} ${severity}`,
  evidenceRefs: [],
  ownerDomain: 'platform',
  observedAt: null
})

const allHealthyModules: PlatformHealthModule[] = [
  moduleStub('cloud', 'healthy', 'platform'),
  moduleStub('finance', 'healthy', 'finance'),
  moduleStub('delivery', 'healthy', 'delivery'),
  moduleStub('integrations.notion', 'healthy', 'integrations')
]

describe('deriveSafeModes', () => {
  it('returns all-true when every module is healthy and there are no blocking issues', () => {
    const safeModes = deriveSafeModes({
      overallStatus: 'healthy',
      modules: allHealthyModules,
      blockingIssues: []
    })

    expect(safeModes).toEqual({
      readSafe: true,
      writeSafe: true,
      deploySafe: true,
      backfillSafe: true,
      notifySafe: true,
      agentAutomationSafe: true
    })
  })

  it('locks down write/deploy/backfill/agent when cloud is blocked', () => {
    const modules = [
      moduleStub('cloud', 'blocked'),
      moduleStub('finance', 'healthy', 'finance'),
      moduleStub('delivery', 'healthy', 'delivery'),
      moduleStub('integrations.notion', 'healthy', 'integrations')
    ]

    const blockingIssues = [issueStub('cloud', 'error')]

    const safeModes = deriveSafeModes({
      overallStatus: 'blocked',
      modules,
      blockingIssues
    })

    expect(safeModes.readSafe).toBe(false)
    expect(safeModes.writeSafe).toBe(false)
    expect(safeModes.deploySafe).toBe(false)
    expect(safeModes.backfillSafe).toBe(false)
    expect(safeModes.notifySafe).toBe(false)
    expect(safeModes.agentAutomationSafe).toBe(false)
  })

  it('keeps reads but locks backfill when delivery is degraded', () => {
    const modules = [
      moduleStub('cloud', 'healthy'),
      moduleStub('finance', 'healthy', 'finance'),
      moduleStub('delivery', 'degraded', 'delivery'),
      moduleStub('integrations.notion', 'healthy', 'integrations')
    ]

    const safeModes = deriveSafeModes({
      overallStatus: 'degraded',
      modules,
      blockingIssues: []
    })

    expect(safeModes.readSafe).toBe(true)
    expect(safeModes.writeSafe).toBe(true)
    expect(safeModes.backfillSafe).toBe(false)
    expect(safeModes.agentAutomationSafe).toBe(false)
  })

  it('disables notifySafe when an integration_readiness blocking issue is present', () => {
    const blockingIssues = [issueStub('integrations.notion', 'error', 'integration_readiness')]

    const safeModes = deriveSafeModes({
      overallStatus: 'degraded',
      modules: allHealthyModules,
      blockingIssues
    })

    expect(safeModes.notifySafe).toBe(false)
  })

  it('returns conservative falses when modules array is empty', () => {
    const safeModes = deriveSafeModes({
      overallStatus: 'unknown',
      modules: [],
      blockingIssues: []
    })

    expect(safeModes.readSafe).toBe(false)
    expect(safeModes.writeSafe).toBe(false)
    expect(safeModes.agentAutomationSafe).toBe(false)
  })
})

describe('buildCheckTriggerSet', () => {
  it('emits overall trigger when status is not healthy', () => {
    const triggers = buildCheckTriggerSet({
      overallStatus: 'degraded',
      modules: [],
      safeModes: {
        readSafe: true,
        writeSafe: true,
        deploySafe: true,
        backfillSafe: true,
        notifySafe: true,
        agentAutomationSafe: true
      },
      degradedSources: []
    })

    expect(triggers.has('overall:degraded')).toBe(true)
  })

  it('emits per-module triggers and per-source triggers', () => {
    const triggers = buildCheckTriggerSet({
      overallStatus: 'degraded',
      modules: [
        moduleStub('finance', 'degraded', 'finance'),
        moduleStub('cloud', 'healthy')
      ],
      safeModes: {
        readSafe: true,
        writeSafe: false,
        deploySafe: false,
        backfillSafe: true,
        notifySafe: true,
        agentAutomationSafe: false
      },
      degradedSources: [{ source: 'sentry_incidents', status: 'timeout' }]
    })

    expect(triggers.has('module:finance:degraded')).toBe(true)
    expect(triggers.has('module:cloud:degraded')).toBe(false)
    expect(triggers.has('source:sentry_incidents:degraded')).toBe(true)
    expect(triggers.has('safe-mode:writeSafe:false')).toBe(true)
    expect(triggers.has('safe-mode:deploySafe:false')).toBe(true)
    expect(triggers.has('safe-mode:notifySafe:false')).toBe(false)
  })
})
