import { describe, expect, it } from 'vitest'

import {
  PRODUCTION_HOSTS,
  PUBLIC_BURST_GUARD_RULES,
  buildPublicBurstGuardRule,
  planPublicBurstGuardChanges,
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
})
