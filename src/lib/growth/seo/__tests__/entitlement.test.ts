import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1301 Slice 2 — resolveSeoEntitlement + enforceSeoRunEntitlement.
 * Cubre: sin entitlement, expirado, contratado con cupo, quota_exhausted,
 * budget_exhausted (gasto acumulado y costo estimado), override pilot.
 * PG mockeado (routing por SQL, patrón del test AEO TASK-1277).
 */

vi.mock('server-only', () => ({}))

const state = {
  assignment: null as {
    assignment_id: string
    status: string
    metadata_json: Record<string, unknown> | null
    expires_at: string | null
  } | null,
  auditRunsUsed: 0,
  spendUsedUsd: 0,
  /** SQL capturado de la query de uso, para verificar DE DÓNDE sale el gasto. */
  usageSql: ''
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (sql.includes('audit_runs_used')) {
      state.usageSql = sql

      return [
        {
          audit_runs_used: state.auditRunsUsed,
          spend_used_usd: state.spendUsedUsd,
          period_reset_at: '2026-09-01T00:00:00.000Z'
        }
      ]
    }

    if (sql.includes('module_assignments')) {
      return state.assignment ? [state.assignment] : []
    }

    return []
  }
}))

import { enforceSeoRunEntitlement, resolveSeoEntitlement } from '../entitlement'

/**
 * TASK-1300 — El gasto sale de UNA sola fuente.
 *
 * El resto de los tests mockea el resultado de la query sin mirar de qué tabla viene, así
 * que pasarían igual si alguien revirtiera la fuente a las tablas snapshot — o, peor, si
 * sumara AMBAS (el doble conteo que esta task cerró: agotaría los presupuestos a la mitad,
 * en silencio). Esto lo verifica sobre el SQL real.
 */
describe('fuente del gasto del período', () => {
  it('lee el ledger `seo_provider_spend_daily` y NO el provider_cost de los snapshots', async () => {
    state.usageSql = ''
    await resolveSeoEntitlement('org-1')

    expect(state.usageSql).toContain('seo_provider_spend_daily')
    expect(state.usageSql).toContain('provider_cost_usd')

    // Las 3 tablas snapshot de TASK-1299 ya no son fuente de presupuesto: su
    // `provider_cost` queda como procedencia por fila.
    expect(state.usageSql).not.toContain('seo_rank_snapshots')
    expect(state.usageSql).not.toContain('seo_backlink_snapshots')
    expect(state.usageSql).not.toMatch(/SUM\(\s*\w+\.provider_cost\s*\)/)
  })
})

// Defaults: contracted 8 audits / USD 50; trial 1 / USD 2; pilot 2 / USD 10.
const ENV = {} as NodeJS.ProcessEnv

beforeEach(() => {
  state.assignment = null
  state.auditRunsUsed = 0
  state.spendUsedUsd = 0
})

describe('resolveSeoEntitlement', () => {
  it('sin assignment → no_entitlement, remaining=0, budget=0', async () => {
    const e = await resolveSeoEntitlement('org-x', ENV)

    expect(e.hasModule).toBe(false)
    expect(e.tier).toBeNull()
    expect(e.allowanceRemaining).toBe(0)
    expect(e.budgetRemainingUsd).toBe(0)
    expect(e.blockedReason).toBe('no_entitlement')
    expect(e.periodResetAt).toBe('2026-09-01T00:00:00.000Z')
  })

  it('assignment expirado → blockedReason=expired (distinto de no_entitlement)', async () => {
    state.assignment = {
      assignment_id: 'cpma-exp',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: '2026-01-01T00:00:00.000Z'
    }

    const e = await resolveSeoEntitlement('org-exp', ENV)

    expect(e.hasModule).toBe(true)
    expect(e.blockedReason).toBe('expired')
  })

  it('contracted (cap 8 / $50) con 3 audits y $10 usados → habilitado con remaining', async () => {
    state.assignment = {
      assignment_id: 'cpma-1',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: null
    }
    state.auditRunsUsed = 3
    state.spendUsedUsd = 10

    const e = await resolveSeoEntitlement('org-berel', ENV)

    expect(e.tier).toBe('contracted')
    expect(e.allowanceCap).toBe(8)
    expect(e.allowanceRemaining).toBe(5)
    expect(e.budgetCapUsd).toBe(50)
    expect(e.budgetRemainingUsd).toBe(40)
    expect(e.blockedReason).toBeNull()
  })

  it('trial con su único audit consumido → quota_exhausted', async () => {
    state.assignment = {
      assignment_id: 'cpma-2',
      status: 'active',
      metadata_json: { seo_tier: 'trial' },
      expires_at: null
    }
    state.auditRunsUsed = 1

    const e = await resolveSeoEntitlement('org-trial', ENV)

    expect(e.tier).toBe('trial')
    expect(e.allowanceRemaining).toBe(0)
    expect(e.blockedReason).toBe('quota_exhausted')
  })

  it('gasto del mes >= budget del tier → budget_exhausted', async () => {
    state.assignment = {
      assignment_id: 'cpma-3',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: null
    }
    state.spendUsedUsd = 50

    const e = await resolveSeoEntitlement('org-gastada', ENV)

    expect(e.budgetRemainingUsd).toBe(0)
    expect(e.blockedReason).toBe('budget_exhausted')
  })

  it('pilot honra el override metadata_json.seo_audit_runs_per_month', async () => {
    state.assignment = {
      assignment_id: 'cpma-4',
      status: 'pilot',
      metadata_json: { seo_tier: 'pilot', seo_audit_runs_per_month: 6 },
      expires_at: null
    }
    state.auditRunsUsed = 4

    const e = await resolveSeoEntitlement('org-pilot', ENV)

    expect(e.tier).toBe('pilot')
    expect(e.allowanceCap).toBe(6)
    expect(e.allowanceRemaining).toBe(2)
    expect(e.blockedReason).toBeNull()
  })

  it('tier desconocido en metadata → fallback conservador por status', async () => {
    state.assignment = {
      assignment_id: 'cpma-5',
      status: 'active',
      metadata_json: { seo_tier: 'enterprise-plus' },
      expires_at: null
    }

    const e = await resolveSeoEntitlement('org-raro', ENV)

    expect(e.tier).toBe('trial')
  })
})

describe('enforceSeoRunEntitlement', () => {
  it('sin assignment → allowed=false, no_entitlement', async () => {
    const gate = await enforceSeoRunEntitlement('org-x', {}, ENV)

    expect(gate.allowed).toBe(false)
    expect(gate.blockedReason).toBe('no_entitlement')
  })

  it('habilitado con cupo y budget → allowed=true', async () => {
    state.assignment = {
      assignment_id: 'cpma-1',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: null
    }

    const gate = await enforceSeoRunEntitlement('org-berel', {}, ENV)

    expect(gate.allowed).toBe(true)
    expect(gate.tier).toBe('contracted')
    expect(gate.blockedReason).toBeNull()
  })

  it('costo estimado excede el budget restante → allowed=false, budget_exhausted', async () => {
    state.assignment = {
      assignment_id: 'cpma-1',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: null
    }
    state.spendUsedUsd = 45 // budget cap 50 → restante 5

    const gate = await enforceSeoRunEntitlement('org-berel', { estimatedCostUsd: 7 }, ENV)

    expect(gate.allowed).toBe(false)
    expect(gate.blockedReason).toBe('budget_exhausted')
    expect(gate.budgetRemainingUsd).toBe(5)
  })

  it('costo estimado que sí cabe → allowed=true', async () => {
    state.assignment = {
      assignment_id: 'cpma-1',
      status: 'active',
      metadata_json: { seo_tier: 'contracted' },
      expires_at: null
    }
    state.spendUsedUsd = 45

    const gate = await enforceSeoRunEntitlement('org-berel', { estimatedCostUsd: 4 }, ENV)

    expect(gate.allowed).toBe(true)
  })

  // TASK-1303 — el rank capture no crea audit runs: quota_exhausted no puede congelar la
  // serie diaria de un org que agotó sus audits. El freno de esa capability es budget.
  it('quota_exhausted + consumesAuditAllowance=false → allowed=true (rank capture)', async () => {
    state.assignment = {
      assignment_id: 'cpma-2',
      status: 'active',
      metadata_json: { seo_tier: 'trial' },
      expires_at: null
    }
    state.auditRunsUsed = 1 // trial cap = 1 → quota_exhausted

    const audit = await enforceSeoRunEntitlement('org-trial', {}, ENV)

    expect(audit.allowed).toBe(false)
    expect(audit.blockedReason).toBe('quota_exhausted')

    const rankCapture = await enforceSeoRunEntitlement('org-trial', { consumesAuditAllowance: false }, ENV)

    expect(rankCapture.allowed).toBe(true)
    expect(rankCapture.blockedReason).toBeNull()
  })

  it('consumesAuditAllowance=false NO salta el freno de budget ni el de expiración', async () => {
    state.assignment = {
      assignment_id: 'cpma-2',
      status: 'active',
      metadata_json: { seo_tier: 'trial' },
      expires_at: null
    }
    state.auditRunsUsed = 1
    state.spendUsedUsd = 2 // trial budget cap = 2 → restante 0

    const gate = await enforceSeoRunEntitlement('org-trial', { consumesAuditAllowance: false }, ENV)

    expect(gate.allowed).toBe(false)
    expect(gate.blockedReason).toBe('budget_exhausted')

    state.spendUsedUsd = 0
    state.assignment.expires_at = '2026-01-01T00:00:00.000Z'

    const expired = await enforceSeoRunEntitlement('org-trial', { consumesAuditAllowance: false }, ENV)

    expect(expired.allowed).toBe(false)
    expect(expired.blockedReason).toBe('expired')
  })

  it('config por env sobreescribe defaults (trial budget)', async () => {
    state.assignment = {
      assignment_id: 'cpma-2',
      status: 'active',
      metadata_json: { seo_tier: 'trial' },
      expires_at: null
    }
    state.spendUsedUsd = 3

    const env = { GROWTH_SEO_TRIAL_MONTHLY_BUDGET_USD: '20' } as unknown as NodeJS.ProcessEnv
    const e = await resolveSeoEntitlement('org-trial', env)

    expect(e.budgetCapUsd).toBe(20)
    expect(e.budgetRemainingUsd).toBe(17)
    expect(e.blockedReason).toBeNull()
  })
})

describe('cutover seo_v1 → seo_v2 (expand/contract — CERRADO en código por TASK-1677)', () => {
  it('la ventana está cerrada: lectura y escritura son la misma clave', async () => {
    const { SEO_MODULE_KEY, SEO_MODULE_KEYS_READ } = await import('../entitlement')

    // La escritura nace en la clave nueva: una asignación creada hoy es `seo_v2`.
    expect(SEO_MODULE_KEY).toBe('seo_v2')

    // Este assert dejó de ser el guardián de la ventana y pasó a declarar que cerró.
    // Mientras duró el cutover fijaba `['seo_v2', 'seo_v1']` para que sacar la clave vieja
    // fuera una decisión explícita y no un descuido que apagara el módulo y, con él, los
    // tres batches que le pagan al proveedor. Ahora fija lo contrario: volver a agregar
    // `seo_v1` sería reabrir una ventana cerrada, y eso es un expand nuevo con su task.
    expect([...SEO_MODULE_KEYS_READ]).toEqual(['seo_v2'])

    // Lectura y escritura convergieron, que es la definición de que el cutover terminó.
    expect(SEO_MODULE_KEYS_READ).toHaveLength(1)
    expect(SEO_MODULE_KEYS_READ[0]).toBe(SEO_MODULE_KEY)
  })

  // ISSUE-143 — el guardrail que faltaba.
  //
  // El assert de arriba fija el array, pero no impide lo que efectivamente tumbó producción:
  // una MIGRACIÓN que supersede una clave que el código vigente todavía lee. La regla vivía en
  // prosa (§10.7: "el contract es un cambio posterior y deliberado") y una migración la violó sin
  // que nada se quejara, porque nadie revisa una migración contra un párrafo.
  //
  // Escanea sólo la sección `Up` a propósito: el `Down` de una migración de reapertura cierra la
  // ventana legítimamente, y ese es su trabajo.
  it('ninguna migración nueva supersede una clave que el código todavía lee', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const { SEO_MODULE_KEYS_READ } = await import('../entitlement')

    // La migración de viewCodes de TASK-1310 ES el incidente. Ya está aplicada y las migraciones
    // aplicadas no se editan (forward fix, nunca retroactivo): queda declarada acá para que el
    // guardrail proteja de aquí en adelante sin reescribir la historia.
    const HISTORICAL = new Set(['20260808131441444_task-1310-seo-client-view-codes.sql'])

    const migrationsDir = resolve(process.cwd(), 'migrations')
    const offenders: string[] = []

    for (const fileName of readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))) {
      if (HISTORICAL.has(fileName)) continue

      const sql = readFileSync(resolve(migrationsDir, fileName), 'utf8')
      const downIndex = sql.indexOf('-- Down Migration')
      // Los bloques `DO $$ … $$` se retiran antes de partir por `;`: llevan `;` internos que
      // desalinean el split y mezclan una verificación con el statement de al lado.
      const upSection = (downIndex >= 0 ? sql.slice(0, downIndex) : sql).replace(/DO \$\$[\s\S]*?\$\$/g, '')

      for (const statement of upSection.split(';')) {
        if (!/\bUPDATE\b[\s\S]*module_assignments/i.test(statement)) continue

        // Reabrir la ventana (`effective_to = NULL`) es lo CONTRARIO de superseder. Sólo cuenta
        // como supersede asignarle un valor: una fecha, CURRENT_DATE, NOW().
        const assignments = [...statement.matchAll(/effective_to\s*=\s*([A-Za-z_'(]+)/gi)]
        const supersedes = assignments.some(match => !/^null$/i.test(match[1]))

        if (!supersedes) continue

        for (const key of SEO_MODULE_KEYS_READ) {
          if (statement.includes(`'${key}'`)) offenders.push(`${fileName} → ${key}`)
        }
      }
    }

    expect(
      offenders,
      `Estas migraciones superseden una clave de módulo que ${'`SEO_MODULE_KEYS_READ`'} todavía acepta, ` +
        'lo que apaga el módulo en cualquier runtime que aún no tenga el dual-read desplegado ' +
        '(ISSUE-143). El contract va en su propia migración, DESPUÉS de que la clave salga del array de lectura.'
    ).toEqual([])
  })
})
