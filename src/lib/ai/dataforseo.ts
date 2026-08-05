import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

import { dataForSeoBreaker } from './dataforseo-breaker'
import {
  DATAFORSEO_FAMILIES,
  normalizeEndpoint,
  type DataForSeoFamily
} from './dataforseo-families'

const DATAFORSEO_API_BASE_URL = 'https://api.dataforseo.com'

export const DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT = '/v3/serp/google/ai_mode/live/advanced'
export const DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT = '/v3/serp/google/organic/live/advanced'

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
 */
export type DataForSeoTaskInput =
  | {
      family: Extract<DataForSeoFamily, 'serp'>
      endpoint: string
      tasks: DataForSeoSerpTask[]
      timeoutMs?: number
      organizationId?: string
    }
  | {
      family: Exclude<DataForSeoFamily, 'serp'>
      endpoint: string
      tasks: DataForSeoSerpTask[]
      timeoutMs?: number
      organizationId: string
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
      secretSource: 'env',
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
      dataForSeoBreaker.recordFailure(family)

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
        await spendRecorder({ organizationId: input.organizationId, family, cost })
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
 */
export const postDataForSeoSerpLiveAdvanced = async (input: {
  endpoint: string
  tasks: DataForSeoSerpTask[]
  timeoutMs?: number
}): Promise<DataForSeoSerpResult> =>
  postDataForSeoTask({
    family: 'serp',
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
