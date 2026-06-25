import { createHash } from 'crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1251 Slice 1 — Parity de la convergencia del abuse-guard del grader sobre el
 * core PURO compartido (`decideAbuse`). El abuse-guard es un primitive de SEGURIDAD:
 * estos tests cubren la FRONTERA DE DECISIÓN (thresholds exactos de rate-limit, borde
 * del presupuesto, orden email→IP→budget, short-circuit del SUM) y el hash byte-idéntico
 * — no sólo el happy path. Garantizan cero cambio observable de accept/reject tras mover
 * la decisión al core compartido.
 */

// ── Mock del cliente PG: intercepta los queries de conteo/SUM por su SQL ──────────
const pgState = {
  emailCount: 0,
  ipCount: 0,
  spent: 0,
  calls: [] as string[],
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async (sql: string, params?: unknown[]) => {
    pgState.calls.push(sql)

    if (sql.includes('SUM(estimated_cost_usd)')) {
      return [{ total: String(pgState.spent) }]
    }

    if (sql.includes('COUNT(*)')) {
      const column = (params?.[0] as string) ?? ''

      // El test usa `email:*` / `ip:*` como valores hasheados de prueba.
      return [{ n: column.startsWith('email:') ? pgState.emailCount : pgState.ipCount }]
    }

    return []
  }),
}))

import {
  ESTIMATED_PUBLIC_RUN_COST_USD,
  checkIntakeAbuse,
  hashIdentifier,
  resolveIntakeLimits,
} from '../public-intake/abuse-guard'

const LIMITS = { perEmailPerDay: 3, perIpPerDay: 10, globalDailyBudgetUsd: 25 }

beforeEach(() => {
  pgState.emailCount = 0
  pgState.ipCount = 0
  pgState.spent = 0
  pgState.calls = []
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('TASK-1251 — hashIdentifier byte-parity (salt preservado)', () => {
  // Algoritmo previo de TASK-1240: sha256(`${salt}:${value.trim().toLowerCase()}`).
  const golden = (value: string) =>
    createHash('sha256').update(`gh-ai-visibility-intake-v1:${value.trim().toLowerCase()}`).digest('hex')

  it('produce el MISMO hash que el algoritmo previo (no orfana window counters)', () => {
    expect(hashIdentifier('Prospecto@Empresa.com')).toBe(golden('Prospecto@Empresa.com'))
    expect(hashIdentifier('  1.2.3.4  ')).toBe(golden('1.2.3.4'))
    expect(hashIdentifier('ABC')).toBe(hashIdentifier('  abc  ')) // trim + lowercase
  })

  it('null / vacío → null', () => {
    expect(hashIdentifier(null)).toBeNull()
    expect(hashIdentifier('')).toBeNull()
    expect(hashIdentifier('   ')).toBeNull()
  })
})

describe('TASK-1251 — checkIntakeAbuse: frontera de decisión (delegada a decideAbuse)', () => {
  const run = (overrides?: Partial<{ ipHash: string | null; emailHash: string; estimatedCostUsd: number }>) =>
    checkIntakeAbuse({
      ipHash: 'ip:x',
      emailHash: 'email:x',
      estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD,
      limits: LIMITS,
      ...overrides,
    })

  it('per-email: justo bajo el límite → allowed; en el límite → rate_limited', async () => {
    pgState.emailCount = LIMITS.perEmailPerDay - 1
    expect(await run()).toEqual({ allowed: true, outcome: null })

    pgState.emailCount = LIMITS.perEmailPerDay
    expect(await run()).toEqual({ allowed: false, outcome: 'rate_limited' })
  })

  it('per-IP: en el límite → rate_limited; sin ipHash → no se evalúa IP', async () => {
    pgState.ipCount = LIMITS.perIpPerDay
    expect(await run()).toEqual({ allowed: false, outcome: 'rate_limited' })

    // Sin ipHash: el conteo IP no aplica aunque el contador esté alto.
    expect(await run({ ipHash: null })).toEqual({ allowed: true, outcome: null })
  })

  it('budget: spent + estimated == budget → allowed (estricto >); > budget → cost_blocked', async () => {
    pgState.spent = LIMITS.globalDailyBudgetUsd - ESTIMATED_PUBLIC_RUN_COST_USD
    expect(await run()).toEqual({ allowed: true, outcome: null }) // exactamente en el tope

    pgState.spent = LIMITS.globalDailyBudgetUsd // + estimated > budget
    expect(await run()).toEqual({ allowed: false, outcome: 'cost_blocked' })
  })

  it('orden de precedencia: email gana sobre IP gana sobre budget', async () => {
    pgState.emailCount = LIMITS.perEmailPerDay
    pgState.ipCount = LIMITS.perIpPerDay
    pgState.spent = LIMITS.globalDailyBudgetUsd
    // Las tres condiciones disparan; debe reportar la PRIMERA (rate_limited por email).
    expect(await run()).toEqual({ allowed: false, outcome: 'rate_limited' })
  })

  it('short-circuit: si hay rate-limit NO consulta el SUM del presupuesto', async () => {
    pgState.emailCount = LIMITS.perEmailPerDay
    await run()

    expect(pgState.calls.some(sql => sql.includes('SUM(estimated_cost_usd)'))).toBe(false)
  })

  it('sin rate-limit SÍ consulta el SUM (evalúa presupuesto)', async () => {
    pgState.emailCount = 0
    pgState.ipCount = 0
    await run()

    expect(pgState.calls.some(sql => sql.includes('SUM(estimated_cost_usd)'))).toBe(true)
  })
})

describe('TASK-1251 — resolveIntakeLimits (preservado para el reliability signal reader)', () => {
  it('defaults del grader cuando no hay env', () => {
    expect(resolveIntakeLimits({} as NodeJS.ProcessEnv)).toEqual({
      perEmailPerDay: 3,
      perIpPerDay: 10,
      globalDailyBudgetUsd: 25,
    })
  })

  it('honra overrides por env var', () => {
    const env = {
      GROWTH_AI_VISIBILITY_PUBLIC_PER_EMAIL_PER_DAY: '5',
      GROWTH_AI_VISIBILITY_PUBLIC_PER_IP_PER_DAY: '20',
      GROWTH_AI_VISIBILITY_PUBLIC_DAILY_BUDGET_USD: '100',
    } as unknown as NodeJS.ProcessEnv

    expect(resolveIntakeLimits(env)).toEqual({ perEmailPerDay: 5, perIpPerDay: 20, globalDailyBudgetUsd: 100 })
  })
})
