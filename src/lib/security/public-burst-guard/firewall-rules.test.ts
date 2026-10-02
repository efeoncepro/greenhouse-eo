import { describe, expect, it } from 'vitest'

import {
  PRODUCTION_HOSTS,
  PUBLIC_BURST_GUARD_LIMIT,
  PUBLIC_BURST_GUARD_RULES,
  THINK_SERVER_KEY_HEADER,
  buildPublicBurstGuardRule,
  planPublicBurstGuardChanges,
  type ActiveFirewallRule,
  type VercelFirewallCondition,
  type VercelFirewallRuleValue
} from './firewall-rules'

/**
 * Evaluador mínimo de las condiciones que estas reglas usan (`pre`, `eq`, `inc`, `neg`), para
 * probar a qué requests aplica cada regla — el comportamiento — y no la forma del JSON. La
 * semántica real la aplica el WAF de Vercel; la lectura viva la hace `pnpm security:public-burst-guard`.
 */
const conditionMatches = (condition: VercelFirewallCondition, request: { host: string; path: string }) => {
  const subject = condition.type === 'path' ? request.path : request.host

  const hit =
    condition.op === 'pre'
      ? subject.startsWith(String(condition.value))
      : condition.op === 'eq'
        ? subject === condition.value
        : (condition.value as string[]).includes(subject)

  return condition.neg ? !hit : hit
}

const ruleApplies = (rule: VercelFirewallRuleValue, request: { host: string; path: string }) =>
  rule.conditionGroup.some(group => group.conditions.every(condition => conditionMatches(condition, request)))

const rules = PUBLIC_BURST_GUARD_RULES.map(spec => ({ spec, rule: buildPublicBurstGuardRule(spec) }))

/** Readback real de Vercel del 2026-09-28, sin credenciales ni tokens. */
const vercelReadbackFixture = {
  name: 'greenhouse-public-burst-guard-non-production',
  description:
    'TASK-1876/ISSUE-174: 20 req/10s por IP en /api/public/ (non_production, enforce). Fuente: src/lib/security/public-burst-guard/firewall-rules.ts',
  active: true,
  action: {
    mitigate: {
      redirect: null,
      action: 'rate_limit',
      rateLimit: {
        limit: 20,
        action: 'rate_limit',
        window: 10,
        algo: 'fixed_window',
        keys: ['ip']
      },
      actionDuration: null
    }
  },
  id: 'rule_greenhouse_public_burst_guard_non_production_vDqo2n',
  conditionGroup: [
    {
      conditions: [
        {
          type: 'path',
          op: 'pre',
          value: '/api/public/'
        },
        {
          op: 'inc',
          neg: true,
          type: 'host',
          value: ['greenhouse.efeoncepro.com', 'greenhouse-eo.vercel.app']
        }
      ]
    }
  ],
  valid: true,
  validationErrors: null
} as ActiveFirewallRule & { valid: boolean; validationErrors: null }

const applying = (request: { host: string; path: string }) => rules.filter(({ rule }) => ruleApplies(rule, request))

describe('public burst guard WAF rules (TASK-1876)', () => {
  const hosts = [...PRODUCTION_HOSTS, 'dev-greenhouse.efeoncepro.com', 'pre-greenhouse.efeoncepro.com', 'greenhouse-eo-git-x.vercel.app']

  it('covers every host of the project with exactly one rule on /api/public/**', () => {
    for (const host of hosts) {
      expect(applying({ host, path: '/api/public/insights/shared/abc' })).toHaveLength(1)
    }
  })

  it('never applies outside /api/public/ (authenticated routes and pages stay out)', () => {
    for (const host of hosts) {
      expect(applying({ host, path: '/api/finance/expenses' })).toHaveLength(0)
      expect(applying({ host, path: '/public/assessment/session' })).toHaveLength(0)
    }
  })

  it('observes (log only) on production hosts and enforces 429 elsewhere', () => {
    for (const host of PRODUCTION_HOSTS) {
      const [match] = applying({ host, path: '/api/public/growth/forms/x' })

      expect(match.rule.action.mitigate.rateLimit.action).toBe('log')
    }

    const [staging] = applying({ host: 'dev-greenhouse.efeoncepro.com', path: '/api/public/growth/forms/x' })

    expect(staging.rule.action.mitigate.rateLimit.action).toBe('rate_limit')
  })

  it('counts by client IP, never by a shared key', () => {
    for (const { rule } of rules) {
      expect(rule.action.mitigate.rateLimit.keys).toEqual(['ip'])
    }
  })

  it('plans inserts, updates and no-ops by rule name without touching foreign rules', () => {
    const [nonProd, prod] = rules.map(({ rule }) => rule)

    const plan = planPublicBurstGuardChanges([
      { id: 'r-foreign', name: 'someone-else', description: 'x' },
      { id: 'r-nonprod', ...nonProd },
      { id: 'r-prod', ...prod, action: { mitigate: { action: 'deny' } } }
    ])

    expect(plan).toEqual([
      { kind: 'unchanged', id: 'r-nonprod', name: nonProd.name },
      { kind: 'update', id: 'r-prod', value: prod }
    ])

    expect(planPublicBurstGuardChanges([]).map(change => change.kind)).toEqual(['insert', 'insert'])
  })

  it('treats a rule with recursively reordered object keys as unchanged', () => {
    const desired = buildPublicBurstGuardRule(PUBLIC_BURST_GUARD_RULES[0])

    const reordered = {
      id: 'r-reordered',
      action: {
        mitigate: {
          rateLimit: {
            action: desired.action.mitigate.rateLimit.action,
            keys: desired.action.mitigate.rateLimit.keys,
            limit: desired.action.mitigate.rateLimit.limit,
            window: desired.action.mitigate.rateLimit.window,
            algo: desired.action.mitigate.rateLimit.algo
          },
          action: desired.action.mitigate.action
        }
      },
      conditionGroup: desired.conditionGroup.map(group => ({
        conditions: group.conditions.map(condition => ({
          value: condition.value,
          ...(condition.neg === undefined ? {} : { neg: condition.neg }),
          op: condition.op,
          type: condition.type
        }))
      })),
      active: desired.active,
      description: desired.description,
      name: desired.name
    }

    expect(planPublicBurstGuardChanges([reordered], [PUBLIC_BURST_GUARD_RULES[0]])).toEqual([
      { kind: 'unchanged', id: 'r-reordered', name: desired.name }
    ])
  })

  it('ignores real Vercel readback fields and explicit neg false', () => {
    const fixtureWithExplicitFalse = structuredClone(vercelReadbackFixture)

    const groups = fixtureWithExplicitFalse.conditionGroup as Array<{ conditions: Array<Record<string, unknown>> }>

    groups[0].conditions[0].neg = false

    expect(planPublicBurstGuardChanges([fixtureWithExplicitFalse], [PUBLIC_BURST_GUARD_RULES[0]])).toEqual([
      {
        kind: 'unchanged',
        id: vercelReadbackFixture.id,
        name: vercelReadbackFixture.name
      }
    ])
  })

  it.each([
    ['limit', (rule: ActiveFirewallRule) => ((rule.action as any).mitigate.rateLimit.limit = 21)],
    ['window', (rule: ActiveFirewallRule) => ((rule.action as any).mitigate.rateLimit.window = 11)],
    ['action', (rule: ActiveFirewallRule) => ((rule.action as any).mitigate.rateLimit.action = 'log')],
    [
      'host',
      (rule: ActiveFirewallRule) =>
        (((rule.conditionGroup as any[])[0].conditions[1] as any).value = ['greenhouse.efeoncepro.com'])
    ],
    [
      'path',
      (rule: ActiveFirewallRule) => (((rule.conditionGroup as any[])[0].conditions[0] as any).value = '/api/private/')
    ]
  ])('plans an update for a real %s change', (_field, mutate) => {
    const changed = structuredClone(vercelReadbackFixture)

    mutate(changed)

    expect(planPublicBurstGuardChanges([changed], [PUBLIC_BURST_GUARD_RULES[0]])[0]).toMatchObject({
      kind: 'update',
      id: vercelReadbackFixture.id
    })
  })

  it('exceptúa a Think sólo con su llave explícita, sin subir el límite (TASK-1875)', () => {
    const withKey = buildPublicBurstGuardRule(PUBLIC_BURST_GUARD_RULES[0]!, { thinkKey: 'k-think' })
    const conditions = withKey.conditionGroup[0]!.conditions

    expect(conditions).toContainEqual({ type: 'header', key: THINK_SERVER_KEY_HEADER, op: 'eq', value: 'k-think', neg: true })
    expect(withKey.action.mitigate.rateLimit.limit).toBe(PUBLIC_BURST_GUARD_LIMIT.requests)
    expect(buildPublicBurstGuardRule(PUBLIC_BURST_GUARD_RULES[0]!).conditionGroup[0]!.conditions.some(c => c.type === 'header')).toBe(false)
  })

  it('detecta drift cuando la regla viva no tiene la excepción de Think', () => {
    const live = { id: 'r1', ...buildPublicBurstGuardRule(PUBLIC_BURST_GUARD_RULES[0]!) }
    const plan = planPublicBurstGuardChanges([live], [PUBLIC_BURST_GUARD_RULES[0]!], { thinkKey: 'k-think' })

    expect(plan[0]!.kind).toBe('update')
    expect(planPublicBurstGuardChanges([{ id: 'r1', ...buildPublicBurstGuardRule(PUBLIC_BURST_GUARD_RULES[0]!, { thinkKey: 'k-think' }) }], [PUBLIC_BURST_GUARD_RULES[0]!], { thinkKey: 'k-think' })[0]!.kind).toBe('unchanged')
  })
})
