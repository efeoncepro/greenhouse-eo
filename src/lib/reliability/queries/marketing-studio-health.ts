import 'server-only'

import { z } from 'zod'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import type { ReliabilitySeverity, ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1896 — Señal agregada de Efeonce Marketing Studio (`studio.efeonce.org`) en el Reliability Control Plane.
 *
 * Studio es un sistema par (precedente Kortex): Greenhouse NUNCA lee su base por SQL. Consume su health profundo
 * (`GET /api/v1/health?deep=1`) por HTTP con el bearer de un `api_client` de Studio con scope `studio:health`
 * (sin datos de negocio), y lo proyecta a UNA señal. El detalle (componentes y frescura) vive en Studio.
 *
 * Severidad:
 * - `error`: un componente `down` (base, conexiones saturadas, bucket, worker) o el ensayo de restauración `down`
 *   (último ensayo fallido o más de 45 días sin uno exitoso). También la base caída (Studio responde 503).
 * - `warning`: algún componente o frescura `degraded`.
 * - `ok`: todo `ok` o `not_configured` (lo no configurado nunca cuenta como falla).
 * - `unknown`: Studio no respondió, credencial ausente/rechazada o respuesta inválida. La caída del dominio la
 *   alerta el uptime check de Studio por su cuenta; aquí no se duplica.
 *
 * Evidencia sin datos sensibles: estados, conteos y códigos; nunca el token, hosts ni mensajes crudos.
 */

export const MARKETING_STUDIO_HEALTH_SIGNAL_ID = 'platform.marketing_studio.health'

const DEFAULT_HEALTH_URL = 'https://studio.efeonce.org/api/v1/health?deep=1'
const TIMEOUT_MS = 5000
const SPEC = 'docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md'

const State = z.enum(['ok', 'degraded', 'down', 'not_configured'])

const Item = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{1,60}$/),
  state: State,
  code: z.string().regex(/^[a-z][a-z0-9_]{1,60}$/).optional(),
  count: z.number().int().nonnegative().optional(),
  ageSeconds: z.number().int().nonnegative().optional()
})

export const MarketingStudioHealthDeepSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  version: z.string().max(40),
  observedAt: z.string(),
  components: z.array(Item),
  freshness: z.array(Item)
})

export type MarketingStudioHealthDeep = z.infer<typeof MarketingStudioHealthDeepSchema>

type Item = z.infer<typeof Item>

const describe = (item: Item) =>
  `${item.name}=${item.state}${item.code ? `(${item.code})` : ''}${item.count !== undefined ? ` count=${item.count}` : ''}`

/** Proyección pura del health profundo de Studio a la severidad de la señal. */
export const severityForStudioHealth = (health: MarketingStudioHealthDeep): { severity: ReliabilitySeverity; problems: Item[] } => {
  const all = [...health.components, ...health.freshness]
  const down = all.filter(item => item.state === 'down')
  const degraded = all.filter(item => item.state === 'degraded')

  if (health.status === 'down' || down.length > 0) return { severity: 'error', problems: [...down, ...degraded] }
  if (degraded.length > 0 || health.status === 'degraded') return { severity: 'warning', problems: degraded }

  return { severity: 'ok', problems: [] }
}

const base = (observedAt: string) => ({
  signalId: MARKETING_STUDIO_HEALTH_SIGNAL_ID,
  moduleKey: 'platform' as const,
  kind: 'runtime' as const,
  source: 'getMarketingStudioHealthSignal',
  label: 'Efeonce Marketing Studio — salud',
  observedAt
})

const unknownSignal = (observedAt: string, summary: string, code: string): ReliabilitySignal => ({
  ...base(observedAt),
  severity: 'unknown',
  summary,
  evidence: [
    { kind: 'metric', label: 'code', value: code },
    { kind: 'doc', label: 'Spec', value: SPEC }
  ]
})

export interface MarketingStudioHealthDeps {
  fetchImpl?: typeof fetch
  resolveToken?: () => Promise<string | null>
  url?: string
  now?: () => Date
}

const defaultResolveToken = async () => (await resolveSecret({ envVarName: 'MARKETING_STUDIO_HEALTH_TOKEN' })).value

export const getMarketingStudioHealthSignal = async (deps: MarketingStudioHealthDeps = {}): Promise<ReliabilitySignal> => {
  const observedAt = (deps.now?.() ?? new Date()).toISOString()
  const token = await (deps.resolveToken ?? defaultResolveToken)().catch(() => null)

  if (!token) {
    return unknownSignal(observedAt, 'Sin credencial para leer el health de Marketing Studio (MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF).', 'credential_not_configured')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await (deps.fetchImpl ?? fetch)(deps.url ?? process.env.MARKETING_STUDIO_HEALTH_URL?.trim() ?? DEFAULT_HEALTH_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    })

    if (response.status === 401 || response.status === 403) {
      return unknownSignal(observedAt, `Marketing Studio rechazó la credencial de salud (HTTP ${response.status}).`, 'credential_rejected')
    }

    const payload: unknown = await response.json().catch(() => null)

    // 503 con el contrato de errores (la base no responde) ⇒ caída real, no desconocido.
    if (response.status === 503 && (payload as { code?: string } | null)?.code === 'database_unavailable') {
      return {
        ...base(observedAt),
        severity: 'error',
        summary: 'Marketing Studio responde, pero su base de datos no está disponible.',
        evidence: [
          { kind: 'metric', label: 'http_status', value: '503' },
          { kind: 'metric', label: 'code', value: 'database_unavailable' },
          { kind: 'doc', label: 'Spec', value: SPEC }
        ]
      }
    }

    const parsed = MarketingStudioHealthDeepSchema.safeParse(payload)

    if (!parsed.success || (response.status !== 200 && response.status !== 503)) {
      return unknownSignal(observedAt, `Marketing Studio respondió algo que no es su health profundo (HTTP ${response.status}).`, 'invalid_payload')
    }

    const health = parsed.data
    const { severity, problems } = severityForStudioHealth(health)
    const notConfigured = [...health.components, ...health.freshness].filter(item => item.state === 'not_configured').map(item => item.name)

    const summary =
      severity === 'ok'
        ? `Marketing Studio sano (${health.components.length} componentes, ${health.freshness.length} chequeos de frescura).`
        : `Marketing Studio ${severity === 'error' ? 'con fallas' : 'degradado'}: ${problems.map(describe).join(', ')}.`

    return {
      ...base(observedAt),
      severity,
      summary,
      evidence: [
        { kind: 'metric', label: 'status', value: health.status },
        { kind: 'metric', label: 'api_version', value: health.version },
        { kind: 'metric', label: 'studio_observed_at', value: health.observedAt },
        ...problems.map(item => ({ kind: 'metric' as const, label: item.name, value: describe(item) })),
        ...(notConfigured.length ? [{ kind: 'metric' as const, label: 'not_configured', value: notConfigured.join(', ') }] : []),
        { kind: 'doc', label: 'Spec', value: SPEC }
      ]
    }
  } catch (error) {
    const aborted = (error as { name?: string } | null)?.name === 'AbortError'

    if (!aborted) {
      captureWithDomain(error, 'platform', { tags: { source: 'reliability_signal_marketing_studio_health' }, level: 'warning' })
    }

    return unknownSignal(observedAt, aborted ? 'Marketing Studio no respondió su health a tiempo.' : 'No fue posible consultar el health de Marketing Studio.', aborted ? 'timeout' : 'unreachable')
  } finally {
    clearTimeout(timer)
  }
}
