import 'server-only'

/**
 * TASK-1301 Slice 2 — Chokepoint de entitlement/allowance/budget del módulo SEO per-org.
 *
 * El SEO es un servicio con entitlement POR ORGANIZACIÓN (módulo `seo_v2` en
 * `greenhouse_client_portal.module_assignments`), NO un viewCode role-wide (lección
 * TASK-1248, espejo del AEO `resolveAeoEntitlement`). Este resolver responde, para una
 * org: tier (`contracted` | `trial` | `pilot`), allowance de site-audits del período
 * (runs/mes con reset mensual) y budget de gasto provider del período (USD/mes).
 *
 * `enforceSeoRunEntitlement` es el ÚNICO gate de costo DataForSEO (riesgo #1 del módulo,
 * EPIC-022 §13.1): TODO write provider-facing (rank capture, site audit, backlinks) pasa
 * por acá antes de gastar; ningún cron/command/consumer lo reimplementa inline. Es
 * consumer-agnóstico por diseño (mandato parity+MCP 2026-08-05): el MISMO gate sirve
 * UI, Nexa, lane `app` y lane `ecosystem`/MCP — el plano fino de capability (`can()`)
 * vive en el consumer; acá solo entitlement → ventana → allowance → budget.
 *
 * Fuentes de datos:
 * - Assignment/tier: `module_assignments` (`metadata_json.seo_tier`; override de cupo
 *   pilot vía `metadata_json.seo_audit_runs_per_month`).
 * - Allowance usada: COUNT de `seo_site_audit_runs` del mes (JOIN `seo_targets` por org).
 * - Budget usado: SUM(`provider_cost_usd`) del mes de `seo_provider_spend_daily` (TASK-1300).
 *   El hook declarado acá se ejecutó al aterrizar ese ledger: la fuente dejó de ser la suma
 *   de las 3 tablas snapshot. Sumar ambas contaría el mismo gasto dos veces.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { buildSeoProviderSpendMonthlySumSql } from './provider-spend'

/**
 * Clave canónica del módulo. **Es la de ESCRITURA**: toda asignación nueva nace `seo_v2`.
 */
export const SEO_MODULE_KEY = 'seo_v2' as const

/**
 * Claves que las LECTURAS aceptan. **La ventana expand/contract del cutover
 * `seo_v1 → seo_v2` está CERRADA en código desde `TASK-1677` (2026-08-09).**
 *
 * ## Por qué existió la ventana
 *
 * Renombrar la clave en el código y en la base a la vez es un cambio breaking, y los DOS
 * órdenes de despliegue dejan una ventana de oscuridad:
 *
 *   - migración primero → el código vivo sigue pidiendo `seo_v1`, ya superseded → 0 orgs;
 *   - código primero    → pide `seo_v2`, que la base todavía no tiene → 0 orgs.
 *
 * Y "0 orgs" no es una pantalla vacía nada más: este mismo predicado gatea los tres batches
 * que le pagan al proveedor (rankings, site audit, backlinks). En esa ventana saltarían con
 * `no_entitlement` **en silencio**, que es justo lo que el dominio prohíbe (un run que ve
 * data elegible y materializa 0 nunca es `succeeded`).
 *
 * ## Por qué se puede cerrar ahora, y en este orden
 *
 * La fase contract va **código primero, datos después**, y eso sólo es seguro porque la
 * cobertura ya la da `seo_v2`: verificado contra PG el 2026-08-09, las dos organizaciones
 * con SEO tienen AMBAS claves vigentes, así que ninguna depende sólo de `seo_v1` y dejar de
 * leerla no le quita el módulo a nadie. El orden inverso —superseder los datos con el código
 * todavía leyendo `seo_v1`— es el que el dominio prohíbe.
 *
 * La contracción de los datos (supersede de los assignments `seo_v1`) es un paso posterior
 * y deliberado, que se aplica **después** de que este código esté desplegado y el canary del
 * provider contra producción esté verde. Nunca en la misma migración que el expand.
 *
 * Doctrina expand/contract: `arch-architect` → `data/schema-evolution.md`
 * ("rename in place is forbidden"). Historia del incidente: `ISSUE-143`.
 *
 * ⚠️ `seo_v1` **sigue existiendo** como fila en `modules` (append-only); lo que se retira son
 * sus assignments vigentes. Volver a agregarla acá sería reabrir una ventana cerrada: si un
 * runtime futuro necesitara leerla, eso es un expand nuevo con su propia task.
 */
export const SEO_MODULE_KEYS_READ: readonly string[] = ['seo_v2']

export type SeoTier = 'contracted' | 'trial' | 'pilot'

export type SeoBlockedReason =
  | 'no_entitlement'
  | 'expired'
  | 'quota_exhausted'
  | 'budget_exhausted'

export interface SeoAllowanceConfig {
  contractedAuditRunsPerMonth: number
  trialAuditRunsPerMonth: number
  pilotAuditRunsPerMonth: number
  contractedMonthlyBudgetUsd: number
  trialMonthlyBudgetUsd: number
  pilotMonthlyBudgetUsd: number
}

export interface SeoEntitlement {
  organizationId: string
  /** ¿La org tiene el módulo SEO asignado y vigente? */
  hasModule: boolean
  tier: SeoTier | null
  assignmentId: string | null
  /** status del assignment (`active`/`pilot`). */
  status: string | null
  /** Cupo de site-audits del período según el tier. */
  allowanceCap: number
  /** Site-audits consumidos este mes por la org. */
  allowanceUsed: number
  /** Cupo restante (>= 0). */
  allowanceRemaining: number
  /** Budget provider del período según el tier (USD). */
  budgetCapUsd: number
  /** Gasto provider del mes (USD, SUM de provider_cost de los snapshots). */
  budgetUsedUsd: number
  /** Budget restante (>= 0, USD). */
  budgetRemainingUsd: number
  /** Inicio del próximo período (reset mensual), ISO. */
  periodResetAt: string
  /** Razón de bloqueo si no puede correr ahora; null = puede correr. */
  blockedReason: SeoBlockedReason | null
}

export interface SeoRunGate {
  allowed: boolean
  tier: SeoTier | null
  allowanceRemaining: number
  budgetRemainingUsd: number
  blockedReason: SeoBlockedReason | null
}

const VALID_TIERS: ReadonlySet<string> = new Set<SeoTier>(['contracted', 'trial', 'pilot'])

const toPositiveFloat = (raw: string | undefined, fallback: number): number => {
  const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const toPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/**
 * Config de allowance/budget por tier. Son knobs de configuración con default (NO
 * feature flags `*_ENABLED`); ajustables por env sin deploy de código.
 */
export const resolveSeoAllowanceConfig = (env: NodeJS.ProcessEnv = process.env): SeoAllowanceConfig => ({
  contractedAuditRunsPerMonth: toPositiveInt(env.GROWTH_SEO_CONTRACTED_AUDIT_RUNS_PER_MONTH, 8),
  trialAuditRunsPerMonth: toPositiveInt(env.GROWTH_SEO_TRIAL_AUDIT_RUNS_PER_MONTH, 1),
  pilotAuditRunsPerMonth: toPositiveInt(env.GROWTH_SEO_PILOT_AUDIT_RUNS_PER_MONTH, 2),
  contractedMonthlyBudgetUsd: toPositiveFloat(env.GROWTH_SEO_CONTRACTED_MONTHLY_BUDGET_USD, 50),
  trialMonthlyBudgetUsd: toPositiveFloat(env.GROWTH_SEO_TRIAL_MONTHLY_BUDGET_USD, 2),
  pilotMonthlyBudgetUsd: toPositiveFloat(env.GROWTH_SEO_PILOT_MONTHLY_BUDGET_USD, 10)
})

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  status: string
  metadata_json: Record<string, unknown> | null
  expires_at: string | null
}

interface UsageRow extends Record<string, unknown> {
  audit_runs_used: number
  spend_used_usd: number
  period_reset_at: string
}

const resolveTier = (status: string, metadata: Record<string, unknown> | null): SeoTier => {
  const declared = typeof metadata?.seo_tier === 'string' ? metadata.seo_tier : null

  if (declared && VALID_TIERS.has(declared)) {
    return declared as SeoTier
  }

  // Fallback conservador (espejo AEO): pilot por status; en otro caso el tier de menor cupo.
  return status === 'pilot' ? 'pilot' : 'trial'
}

const resolveAuditCap = (
  tier: SeoTier,
  metadata: Record<string, unknown> | null,
  config: SeoAllowanceConfig
): number => {
  if (tier === 'contracted') {
    return config.contractedAuditRunsPerMonth
  }

  if (tier === 'pilot') {
    const override = metadata?.seo_audit_runs_per_month

    if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
      return Math.floor(override)
    }

    return config.pilotAuditRunsPerMonth
  }

  return config.trialAuditRunsPerMonth
}

const resolveBudgetCap = (tier: SeoTier, config: SeoAllowanceConfig): number => {
  if (tier === 'contracted') {
    return config.contractedMonthlyBudgetUsd
  }

  if (tier === 'pilot') {
    return config.pilotMonthlyBudgetUsd
  }

  return config.trialMonthlyBudgetUsd
}

/**
 * Resuelve el entitlement SEO de una org. Read-only: no incurre costo ni muta nada.
 */
export const resolveSeoEntitlement = async (
  organizationId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<SeoEntitlement> => {
  const config = resolveSeoAllowanceConfig(env)

  // Uso del período (allowance + spend) siempre disponible, incluso sin entitlement.
  //
  // ⚠️ FUENTE ÚNICA DE GASTO: `seo_provider_spend_daily` (TASK-1300). Este resolver ya NO suma
  // el `provider_cost` de las tablas snapshot — hacer ambas cosas contaría el mismo gasto DOS
  // VECES (el transporte registra la llamada Y el caller persiste el costo en su fila) y los
  // presupuestos se agotarían a la mitad, en silencio. El `provider_cost` de los snapshots
  // queda como procedencia por fila, no como fuente de presupuesto.
  //
  // El ledger es además más completo: lo escribe el transporte en CADA llamada cobrada, así
  // que cubre las que no dejan fila (tarea `on_page` async, consulta con cero resultados).
  const usageRows = await runGreenhousePostgresQuery<UsageRow>(
    `SELECT
       (SELECT COUNT(*)
          FROM greenhouse_growth.seo_site_audit_runs r
          JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
         WHERE t.organization_id = $1
           AND r.created_at >= date_trunc('month', CURRENT_DATE))::int AS audit_runs_used,
       ${buildSeoProviderSpendMonthlySumSql('$1')}::float8 AS spend_used_usd,
       (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz AS period_reset_at`,
    [organizationId]
  )

  const periodResetAt = usageRows[0]?.period_reset_at
    ? new Date(usageRows[0].period_reset_at).toISOString()
    : new Date().toISOString()

  const auditRunsUsed = usageRows[0]?.audit_runs_used ?? 0
  const spendUsedUsd = usageRows[0]?.spend_used_usd ?? 0

  // Assignment vigente por effective_to/status; la EXPIRACIÓN se clasifica aparte
  // (blockedReason 'expired', distinto de 'no_entitlement') — por eso NO se filtra acá.
  const assignmentRows = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT assignment_id, status, metadata_json, expires_at
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = ANY($2::text[])
        AND effective_to IS NULL
        AND status IN ('active', 'pilot')
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId, [...SEO_MODULE_KEYS_READ]]
  )

  const assignment = assignmentRows[0]

  if (!assignment) {
    return {
      organizationId,
      hasModule: false,
      tier: null,
      assignmentId: null,
      status: null,
      allowanceCap: 0,
      allowanceUsed: auditRunsUsed,
      allowanceRemaining: 0,
      budgetCapUsd: 0,
      budgetUsedUsd: spendUsedUsd,
      budgetRemainingUsd: 0,
      periodResetAt,
      blockedReason: 'no_entitlement'
    }
  }

  const tier = resolveTier(assignment.status, assignment.metadata_json)
  const allowanceCap = resolveAuditCap(tier, assignment.metadata_json, config)
  const allowanceRemaining = Math.max(0, allowanceCap - auditRunsUsed)
  const budgetCapUsd = resolveBudgetCap(tier, config)
  const budgetRemainingUsd = Math.max(0, budgetCapUsd - spendUsedUsd)

  const expired =
    assignment.expires_at !== null && new Date(assignment.expires_at).getTime() <= Date.now()

  let blockedReason: SeoBlockedReason | null = null

  if (expired) {
    blockedReason = 'expired'
  } else if (allowanceRemaining <= 0) {
    blockedReason = 'quota_exhausted'
  } else if (budgetRemainingUsd <= 0) {
    blockedReason = 'budget_exhausted'
  }

  return {
    organizationId,
    hasModule: true,
    tier,
    assignmentId: assignment.assignment_id,
    status: assignment.status,
    allowanceCap,
    allowanceUsed: auditRunsUsed,
    allowanceRemaining,
    budgetCapUsd,
    budgetUsedUsd: spendUsedUsd,
    budgetRemainingUsd,
    periodResetAt,
    blockedReason
  }
}

/**
 * Chokepoint ÚNICO del gate de costo SEO. Todo write provider-facing (rank capture,
 * site audit, backlinks) DEBE invocarlo antes de gastar; ningún consumer lo
 * reimplementa inline. Si `estimatedCostUsd` viene, además valida que el run estimado
 * quepa en el budget restante del período (no deja pasar un run que exceda el cap).
 *
 * El plano fino de capability (`can(subject, 'growth.seo.*', ...)`) es responsabilidad
 * del consumer (route/command); este gate es deliberadamente subject-agnóstico para
 * servir idéntico a UI, Nexa, lane app y lane ecosystem/MCP (Full API Parity).
 */
/**
 * ⚠️ LÍMITE CONOCIDO — este gate se consulta UNA vez y el gasto se acumula DESPUÉS.
 *
 * No hay reserva ni claim: N llamadas del mismo batch leen el mismo `budgetRemainingUsd` y
 * pasan todas. Medido: un batch de 120 keywords con budget `trial` (USD 2) llegó a gastar
 * USD 6 — sobregiro de 3×. El overrun por corrida es `N × costo_unitario`, sin techo.
 *
 * Mitigaciones disponibles HOY, que el caller debe aplicar:
 *   - Pasar `estimatedCostUsd` con el costo del **batch completo**, no de una llamada.
 *   - Re-consultar el gate cada K llamadas dentro de un batch largo.
 *   - Acotar el tamaño del batch a algo cuyo peor caso quepa en el presupuesto del tier.
 *
 * Además: `quota_exhausted` cuenta `seo_site_audit_runs`, así que **no aplica al rank
 * capture** (no crea audit runs) — para esa capability el único freno es el presupuesto.
 * Y si una llamada hace timeout DESPUÉS de que el proveedor la procesó y cobró, el costo no
 * se registra: dinero gastado que el gate no ve.
 *
 * Cerrar esto de verdad pide una reserva previa al gasto (patrón del spend fence de Globe),
 * que es trabajo de la task que introduzca el primer batch real — TASK-1303.
 *
 * Delta TASK-1303 (spend fence del rank capture): el caller del primer batch real aplica
 * las tres mitigaciones (estimatedCostUsd del batch completo + re-consulta cada K llamadas
 * + pre-check de idempotencia que evita re-gastar). `consumesAuditAllowance: false` existe
 * porque el rank capture no crea `seo_site_audit_runs`: sin él, un org que agotó su cupo
 * de audits quedaría con la serie diaria de rankings CONGELADA por un contador que no
 * consume — el freno correcto para esa capability es solo presupuesto/expiración.
 * Residual conocido: un timeout DESPUÉS de que el proveedor cobró sigue sin registrarse.
 */
export const enforceSeoRunEntitlement = async (
  organizationId: string,
  options: { estimatedCostUsd?: number; consumesAuditAllowance?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<SeoRunGate> => {
  const entitlement = await resolveSeoEntitlement(organizationId, env)
  const consumesAuditAllowance = options.consumesAuditAllowance !== false

  // `quota_exhausted` cuenta audit runs. Para capabilities que no los consumen (rank
  // capture), se re-deriva el bloqueo sin ese contador — en el MISMO orden del resolver
  // (expired > budget), nunca inline en un consumer.
  const effectiveBlockedReason =
    entitlement.blockedReason === 'quota_exhausted' && !consumesAuditAllowance
      ? entitlement.budgetRemainingUsd <= 0
        ? 'budget_exhausted'
        : null
      : entitlement.blockedReason

  if (effectiveBlockedReason) {
    return {
      allowed: false,
      tier: entitlement.tier,
      allowanceRemaining: entitlement.allowanceRemaining,
      budgetRemainingUsd: entitlement.budgetRemainingUsd,
      blockedReason: effectiveBlockedReason
    }
  }

  const estimated = options.estimatedCostUsd

  if (
    typeof estimated === 'number' &&
    Number.isFinite(estimated) &&
    estimated > entitlement.budgetRemainingUsd
  ) {
    return {
      allowed: false,
      tier: entitlement.tier,
      allowanceRemaining: entitlement.allowanceRemaining,
      budgetRemainingUsd: entitlement.budgetRemainingUsd,
      blockedReason: 'budget_exhausted'
    }
  }

  return {
    allowed: true,
    tier: entitlement.tier,
    allowanceRemaining: entitlement.allowanceRemaining,
    budgetRemainingUsd: entitlement.budgetRemainingUsd,
    blockedReason: null
  }
}
