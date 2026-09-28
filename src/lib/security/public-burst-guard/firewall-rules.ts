/**
 * TASK-1876 — Guard volumétrico de `/api/public/**` en el Firewall de Vercel (WAF).
 *
 * Por qué en el WAF y no en `src/proxy.ts`: un contador en memoria vive por instancia y una
 * ráfaga repartida entre instancias no lo cruza; el WAF cuenta global por IP y corta ANTES de
 * invocar cualquier función, así que un rechazo no abre conexión a PostgreSQL (ISSUE-174).
 * Los rate limiters de dominio (por grant, por submission) siguen detrás, sin cambios.
 *
 * Este archivo es la fuente de verdad versionada de las reglas. El estado vivo se sincroniza
 * con `pnpm security:public-burst-guard` (plan por defecto; `--apply` escribe y relee).
 *
 * Rollout por etapas:
 *   - staging/preview: `enforce` (429 cuando se excede el límite).
 *   - producción: `observe` (sólo registra) hasta tener una ventana de logs que respalde el
 *     límite con tráfico legítimo real; pasar a `enforce` es cambiar `mode` aquí y aplicar.
 *
 * Tráfico server-side de Think (TASK-1875): cuando exista, se exceptúa con una condición
 * explícita en estas reglas; nunca subiendo el límite para todos.
 */

export type PublicBurstGuardMode = 'observe' | 'enforce'

export const PUBLIC_BURST_GUARD_PATH_PREFIX = '/api/public/'

/** Hosts que sirven producción. Todo lo demás del proyecto (staging, preview) es no-productivo. */
export const PRODUCTION_HOSTS = ['greenhouse.efeoncepro.com', 'greenhouse-eo.vercel.app'] as const

/** 20 requests cada 10 s por IP: ~2 req/s sostenidos; un navegador legítimo no se acerca. */
export const PUBLIC_BURST_GUARD_LIMIT = { windowSeconds: 10, requests: 20 } as const

export interface VercelFirewallCondition {
  type: 'path' | 'host'
  op: 'pre' | 'eq' | 'inc'
  value: string | string[]
  neg?: boolean
}

export interface VercelFirewallRuleValue {
  name: string
  description: string
  active: boolean
  conditionGroup: Array<{ conditions: VercelFirewallCondition[] }>
  action: {
    mitigate: {
      action: 'rate_limit'
      rateLimit: {
        algo: 'fixed_window'
        window: number
        limit: number
        keys: string[]
        action: 'rate_limit' | 'log'
      }
      redirect: null
      actionDuration: null
    }
  }
}

export interface PublicBurstGuardRuleSpec {
  name: string
  scope: 'production' | 'non_production'
  mode: PublicBurstGuardMode
}

/** Estado deseado. Cambiar `mode` de producción a `enforce` es la única palanca de cutover. */
export const PUBLIC_BURST_GUARD_RULES: readonly PublicBurstGuardRuleSpec[] = [
  { name: 'greenhouse-public-burst-guard-non-production', scope: 'non_production', mode: 'enforce' },
  { name: 'greenhouse-public-burst-guard-production', scope: 'production', mode: 'observe' }
]

export const buildPublicBurstGuardRule = (spec: PublicBurstGuardRuleSpec): VercelFirewallRuleValue => ({
  name: spec.name,
  description:
    `TASK-1876/ISSUE-174: ${PUBLIC_BURST_GUARD_LIMIT.requests} req/${PUBLIC_BURST_GUARD_LIMIT.windowSeconds}s por IP ` +
    `en ${PUBLIC_BURST_GUARD_PATH_PREFIX} (${spec.scope}, ${spec.mode}). Fuente: src/lib/security/public-burst-guard/firewall-rules.ts`,
  active: true,
  conditionGroup: [
    {
      conditions: [
        { type: 'path', op: 'pre', value: PUBLIC_BURST_GUARD_PATH_PREFIX },
        {
          type: 'host',
          op: 'inc',
          value: [...PRODUCTION_HOSTS],
          ...(spec.scope === 'non_production' ? { neg: true } : {})
        }
      ]
    }
  ],
  action: {
    mitigate: {
      action: 'rate_limit',
      rateLimit: {
        algo: 'fixed_window',
        window: PUBLIC_BURST_GUARD_LIMIT.windowSeconds,
        limit: PUBLIC_BURST_GUARD_LIMIT.requests,
        keys: ['ip'],
        action: spec.mode === 'enforce' ? 'rate_limit' : 'log'
      },
      redirect: null,
      actionDuration: null
    }
  }
})

export interface ActiveFirewallRule {
  id: string
  name: string
  description?: string
  active?: boolean
  conditionGroup?: unknown
  action?: unknown
}

export type FirewallRuleChange =
  | { kind: 'insert'; value: VercelFirewallRuleValue }
  | { kind: 'update'; id: string; value: VercelFirewallRuleValue }
  | { kind: 'unchanged'; id: string; name: string }

/** Proyección comparable: sólo los campos que este archivo gobierna. */
const comparable = (rule: Pick<ActiveFirewallRule, 'description' | 'active' | 'conditionGroup' | 'action'>) =>
  JSON.stringify({
    description: rule.description ?? null,
    active: rule.active ?? null,
    conditionGroup: rule.conditionGroup ?? null,
    action: rule.action ?? null
  })

/**
 * Plan idempotente por nombre de regla: inserta las que faltan, actualiza las que difieren y
 * no toca reglas ajenas (otras reglas del proyecto no son de este guard).
 */
export const planPublicBurstGuardChanges = (
  activeRules: readonly ActiveFirewallRule[],
  specs: readonly PublicBurstGuardRuleSpec[] = PUBLIC_BURST_GUARD_RULES
): FirewallRuleChange[] =>
  specs.map(spec => {
    const desired = buildPublicBurstGuardRule(spec)
    const existing = activeRules.find(rule => rule.name === spec.name)

    if (!existing) return { kind: 'insert', value: desired }

    if (comparable(existing) === comparable(desired)) {
      return { kind: 'unchanged', id: existing.id, name: existing.name }
    }

    return { kind: 'update', id: existing.id, value: desired }
  })
