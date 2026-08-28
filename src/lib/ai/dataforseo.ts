import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

import { dataForSeoBreaker, isProviderHealthFailure } from './dataforseo-breaker'
import {
  DATAFORSEO_FAMILIES,
  normalizeEndpoint,
  type DataForSeoFamily,
  type DataForSeoSpendConsumer
} from './dataforseo-families'

const DATAFORSEO_API_BASE_URL = 'https://api.dataforseo.com'

export const DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT = '/v3/serp/google/ai_mode/live/advanced'
export const DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT = '/v3/serp/google/organic/live/advanced'

/**
 * Payload de una tarea SERP. `keyword` es obligatorio porque en `/v3/serp/` lo es.
 *
 * ⚠️ NO sirve para las demás familias: OnPage y Backlinks toman `target`, y Labs bulk toma
 * `keywords: string[]`. Usar este tipo ahí obliga a un cast que **anula el chequeo del
 * payload entero**. Para esas familias existe `DataForSeoTaskPayload` (abajo).
 */
export interface DataForSeoSerpTask {
  keyword: string
  location_name?: string
  location_code?: number
  language_code?: string
  device?: 'desktop' | 'mobile'
  os?: string
  depth?: number
  [key: string]: unknown
}

/**
 * Payload genérico de una tarea de cualquier familia.
 *
 * Cada familia de DataForSEO tiene su propia forma —`keyword` en SERP, `target` en
 * OnPage/Backlinks, `keywords[]` en Labs bulk— y no hay un campo común. Forzarlas todas al
 * shape de SERP sólo lograba que 3 de 4 necesitaran `as unknown as`, que es peor: apaga la
 * validación en vez de expresarla. La forma exacta por endpoint la valida el proveedor.
 */
export type DataForSeoTaskPayload = Record<string, unknown>

export interface DataForSeoSerpResult {
  ok: boolean
  httpStatus: number
  endpoint: string
  tasks: unknown[]
  cost: number | null
  latencyMs: number
  secretSource: SecretResolutionSource
  /** Familia que atendió la llamada (TASK-1300). Aditivo: el AEO lo ignora sin romperse. */
  family?: DataForSeoFamily
  /**
   * `true` cuando NO se llamó al proveedor porque el breaker de esa familia estaba abierto.
   * Distingue "no se intentó" de "se intentó y falló" — sin esto, un breaker abierto se leería
   * como un proveedor caído y el diagnóstico apuntaría al lugar equivocado.
   */
  breakerOpen?: boolean
}

export interface DataForSeoConnectionCheck {
  ok: boolean
  httpStatus: number
  secretSource: SecretResolutionSource
  latencyMs: number
}

export const isDataForSeoConfigured = async (): Promise<boolean> => {
  try {
    const login = process.env.DATAFORSEO_API_LOGIN?.trim()
    const password = await resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })

    return Boolean(login && password.value)
  } catch {
    return false
  }
}

const resolveDataForSeoCredentials = async () => {
  const login = process.env.DATAFORSEO_API_LOGIN?.trim()
  const password = await resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })

  if (!login || !password.value) {
    throw new Error(
      'DataForSEO no esta configurado. Define DATAFORSEO_API_LOGIN y DATAFORSEO_API_PASSWORD o DATAFORSEO_API_PASSWORD_SECRET_REF.'
    )
  }

  return {
    login,
    password: password.value,
    source: password.source
  }
}

const readCost = (json: Record<string, unknown>): number | null => {
  const cost = json.cost

  return typeof cost === 'number' && Number.isFinite(cost) ? cost : null
}

/**
 * Hook opcional de cost-tracking. Lo inyecta el dominio growth (TASK-1300 Slice 2) para no
 * acoplar el cliente genérico de `src/lib/ai/` a una tabla de `greenhouse_growth`: el cliente
 * no sabe de SEO, sólo avisa "esta familia costó esto para esta organización".
 */
export type DataForSeoSpendRecorder = (input: {
  organizationId: string
  family: DataForSeoFamily
  cost: number
  /** TASK-1696 — quién consumió el dólar. Lo declara el caller; el transporte sólo lo transporta. */
  consumer: DataForSeoSpendConsumer
}) => Promise<void>

let spendRecorder: DataForSeoSpendRecorder | null = null

export const setDataForSeoSpendRecorder = (recorder: DataForSeoSpendRecorder | null): void => {
  spendRecorder = recorder
}

/**
 * Argumentos de `postDataForSeoTask`.
 *
 * `organizationId` es OBLIGATORIO para las 4 familias SEO y opcional sólo para `serp`. No es
 * una preferencia de estilo: el gasto de una familia SEO sin organización sería gasto no
 * atribuible, y "el caller se acuerda de pasarlo" es justo la disciplina que falla en
 * silencio. El tipo lo vuelve imposible; el runtime lo revalida por si el caller es JS.
 *
 * ⚠️ Que `serp` lo tenga opcional NO significa que su gasto sea inatribuible por naturaleza: el
 * grader corre sobre prospectos PÚBLICOS que no son clientes, y ésos legítimamente no tienen
 * organización. Cuando el perfil sí la tiene (TASK-1243), el adapter la pasa y el gasto se
 * contabiliza igual que el de las demás familias.
 *
 * TASK-1696 — `consumer` es REQUERIDO en las dos variantes, y no por simetría: `serp` es la
 * familia COMPARTIDA (la compran el rank capture del módulo SEO y el adapter de AI Mode del
 * grader AEO). Un default silencioso haría que el gasto del grader se descuente del presupuesto
 * SEO del cliente sin que nada falle — el modo de falla exacto que esta dimensión cierra. Que sea
 * obligatorio en las cuatro familias SEO, donde hoy no hay ambigüedad, es lo que impide que la
 * próxima familia (p. ej. `ai_optimization`) herede un default que ya no le corresponde.
 */
export type DataForSeoTaskInput =
  | {
      family: Extract<DataForSeoFamily, 'serp'>
      endpoint: string
      tasks: DataForSeoSerpTask[]
      timeoutMs?: number
      organizationId?: string
      consumer: DataForSeoSpendConsumer
    }
  | {
      family: Exclude<DataForSeoFamily, 'serp'>
      endpoint: string
      // Genérico a propósito: OnPage/Backlinks toman `target`, Labs bulk toma `keywords[]`.
      tasks: DataForSeoTaskPayload[]
      timeoutMs?: number
      organizationId: string
      consumer: DataForSeoSpendConsumer
    }

/**
 * Transporte canónico: una sola implementación de fetch + auth + timeout + breaker + costo,
 * parametrizada por familia. Todo lo que hable con DataForSEO pasa por acá.
 */
export const postDataForSeoTask = async (input: DataForSeoTaskInput): Promise<DataForSeoSerpResult> => {
  const { family } = input
  const definition = DATAFORSEO_FAMILIES[family]

  if (definition?.requiresOrganization && !input.organizationId) {
    throw new Error(`La familia DataForSEO "${family}" exige organizationId para atribuir su gasto.`)
  }

  // ⚠️ Falla FUERTE si el runtime no registró el contador de gasto.
  //
  // Es deliberado y es la lección de TASK-1302: un runtime nuevo que consume un cliente
  // externo sin llevarse su configuración degrada EN SILENCIO y nadie se entera hasta que
  // alguien audita. Acá el modo de falla equivalente sería peor — se gastaría dinero real
  // sin quedar contabilizado, y el gate de presupuesto leería cero para siempre.
  // Un throw en la primera llamada del entorno nuevo se descubre en desarrollo; un
  // contador en cero se descubre en la factura.
  // ⚠️ La condición es "¿HAY organización?", NO "¿la familia exige organización?".
  //
  // Atarlo a `requiresOrganization` dejaba abierto el agujero más caro del contrato: una
  // llamada `serp` CON `organizationId` y sin contador registrado gastaba de verdad, no
  // lanzaba, y el ledger quedaba en cero — con el gate de presupuesto leyendo cero para
  // siempre. Y `serp` es justamente lo que TASK-1303 usará para rank capture desde un cron.
  // Si hay organización, hay atribución posible; entonces es obligatoria.
  if (input.organizationId && !spendRecorder) {
    throw new Error(
      `La llamada a DataForSEO ("${family}") declara organizationId y este runtime no registró el contador de gasto. ` +
        'Importa `@/lib/growth/seo/register-provider-spend` en el punto de entrada antes de llamar.'
    )
  }

  // El endpoint se valida ANTES de resolver credenciales: un mismatch es error de programación
  // y no tiene sentido tocar Secret Manager para descubrirlo.
  const endpoint = normalizeEndpoint(input.endpoint, family)

  // Breaker por familia: si esta familia está abierta, se degrada honesto SIN llamar. No se
  // fabrican `tasks` ni `cost` — el caller distingue esto de "llamó y no hubo resultados".
  if (!dataForSeoBreaker.canAttempt(family)) {
    return {
      ok: false,
      httpStatus: 0,
      endpoint,
      tasks: [],
      cost: null,
      latencyMs: 0,
      // NO se resolvió ningún secreto: el return está antes de resolver credenciales.
      // Declarar 'env' afirmaría un origen que nunca se consultó y contaminaría el campo
      // que existe para diagnosticar de dónde salió la credencial.
      secretSource: 'unconfigured',
      family,
      breakerOpen: true
    }
  }

  const credentials = await resolveDataForSeoCredentials()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 35_000)
  const started = Date.now()
  const auth = Buffer.from(`${credentials.login}:${credentials.password}`, 'utf8').toString('base64')

  try {
    const response = await fetch(`${DATAFORSEO_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input.tasks),
      signal: controller.signal
    })

    const latencyMs = Date.now() - started

    if (!response.ok) {
      await response.text().catch(() => undefined)

      // Sólo los fallos que hablan de la SALUD del proveedor abren el breaker. Un 4xx de
      // caller (payload mal formado) es determinista y se repetiría en cada llamada de la
      // corrida: contarlo abriría el breaker y degradaría a callers sanos que comparten la
      // familia — incluido el AEO sobre `serp`.
      if (isProviderHealthFailure(response.status)) {
        dataForSeoBreaker.recordFailure(family)
      }

      return {
        ok: false,
        httpStatus: response.status,
        endpoint,
        tasks: [],
        cost: null,
        latencyMs,
        secretSource: credentials.source,
        family,
        breakerOpen: false
      }
    }

    const json = (await response.json()) as Record<string, unknown>
    const tasks = Array.isArray(json.tasks) ? json.tasks : []
    const cost = readCost(json)

    dataForSeoBreaker.recordSuccess(family)

    // El costo se registra en el TRANSPORTE, no en cada caller. Así una captura nueva no puede
    // gastar sin quedar contabilizada por olvidar el registro.
    if (cost !== null && cost > 0 && input.organizationId && spendRecorder) {
      try {
        await spendRecorder({ organizationId: input.organizationId, family, cost, consumer: input.consumer })
      } catch (error) {
        // Un fallo al contabilizar NUNCA invalida un resultado que el proveedor ya cobró:
        // se observa y se sigue. Perder el dato del contador es malo; perder el resultado
        // pagado además del dato es peor.
        captureWithDomain(error, 'growth', {
          tags: { source: 'dataforseo_spend_recorder' },
          extra: { family, organizationId: input.organizationId }
        })
      }
    }

    return {
      ok: true,
      httpStatus: response.status,
      endpoint,
      tasks,
      cost,
      latencyMs,
      secretSource: credentials.source,
      family,
      breakerOpen: false
    }
  } catch (error) {
    dataForSeoBreaker.recordFailure(family)
    captureWithDomain(error, 'growth', {
      tags: { source: 'dataforseo_transport' },
      extra: { family, endpoint }
    })

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Contrato histórico del AEO. Se conserva su firma y su shape de retorno; internamente delega
 * en el transporte compartido con la familia `serp`. No agregar parámetros acá: los consumers
 * nuevos usan `postDataForSeoTask`.
 *
 * 🔴 TASK-1696 — ESTA PUERTA NO ATRIBUYE GASTO, Y ESO YA NO ES UNA LIMITACIÓN NEUTRA. No acepta
 * `organizationId`, así que todo lo que compre por acá queda fuera del ledger aunque el perfil
 * tenga organización; y declara `consumer: 'aeo'` fijo porque el único uso que le queda es de ese
 * lado. Su único consumer productivo —el adapter de AI Mode del grader— MIGRÓ a
 * `postDataForSeoTask` justamente para poder atribuir. Un consumer nuevo que entre por acá
 * reabre el punto ciego en silencio; el guard
 * `src/lib/ai/__tests__/dataforseo-legacy-wrapper-guard.test.ts` lo rompe en build.
 */
export const postDataForSeoSerpLiveAdvanced = async (input: {
  endpoint: string
  tasks: DataForSeoSerpTask[]
  timeoutMs?: number
}): Promise<DataForSeoSerpResult> =>
  postDataForSeoTask({
    family: 'serp',
    consumer: 'aeo',
    endpoint: input.endpoint,
    tasks: input.tasks,
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs })
  })

export const checkDataForSeoConnection = async (input: { timeoutMs?: number } = {}): Promise<DataForSeoConnectionCheck> => {
  const credentials = await resolveDataForSeoCredentials()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15_000)
  const started = Date.now()
  const auth = Buffer.from(`${credentials.login}:${credentials.password}`, 'utf8').toString('base64')

  try {
    const response = await fetch(`${DATAFORSEO_API_BASE_URL}/v3/appendix/user_data`, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
      signal: controller.signal
    })

    if (!response.ok) {
      await response.text().catch(() => undefined)
    } else {
      await response.json().catch(() => undefined)
    }

    return {
      ok: response.ok,
      httpStatus: response.status,
      secretSource: credentials.source,
      latencyMs: Date.now() - started
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const runDataForSeoGoogleAiModeSerp = async (input: {
  keyword: string
  locationName?: string
  languageCode?: string
  device?: 'desktop' | 'mobile'
  timeoutMs?: number
}): Promise<DataForSeoSerpResult> =>
  postDataForSeoSerpLiveAdvanced({
    endpoint: DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
    timeoutMs: input.timeoutMs,
    tasks: [
      {
        keyword: input.keyword,
        location_name: input.locationName ?? 'Chile',
        language_code: input.languageCode ?? 'es',
        device: input.device ?? 'desktop'
      }
    ]
  })
