/**
 * TASK-1231 — Growth Forms portable renderer · cliente del API público gobernado.
 *
 * Full API Parity (CLAUDE.md): el renderer es UN consumer más del MISMO contrato
 * gobernado que Nexa/MCP/CLI. Solo habla con dos endpoints públicos (TASK-1229):
 *   GET  {base}/api/public/growth/forms/{slug}[?surfaceId=]   → render_contract
 *   POST {base}/api/public/growth/forms/{slug}/submit         → outcome
 * NUNCA recibe ni envía destination mapping, GUIDs, property names ni secrets.
 */
import type { PublicSubmitOutcome, PublicSubmitResult, RenderContract } from './contract'

export interface RendererApiConfig {
  /** Origen del portal Greenhouse (ej. https://greenhouse.efeoncepro.com). */
  baseUrl: string
  slug: string
  /** TASK-1297 — identidad estable opaca (UUID). Si está, es el segmento de ruta preferido. */
  formKey?: string
  surfaceId?: string
  embedKey?: string
}

/**
 * TASK-1297 — segmento de ruta del formRef: el `form_key` (identidad estable) si está
 * presente, si no el `slug` (backward-compatible). El servidor desambigua slug-vs-uuid.
 */
const formRef = (config: RendererApiConfig): string => config.formKey || config.slug

export class ContractLoadError extends Error {
  constructor(
    public readonly status: number,
    public readonly kind: 'unavailable' | 'error',
  ) {
    super(`contract_load_failed_${status}`)
    this.name = 'ContractLoadError'
  }
}

const join = (base: string, path: string): string => `${base.replace(/\/$/, '')}${path}`

/** Carga el render_contract público. 404 → `unavailable` (no publicado / surface no autorizada). */
export const fetchRenderContract = async (
  config: RendererApiConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<RenderContract> => {
  const url = new URL(join(config.baseUrl, `/api/public/growth/forms/${encodeURIComponent(formRef(config))}`))

  if (config.surfaceId) url.searchParams.set('surfaceId', config.surfaceId)

  let response: Response

  try {
    response = await fetchImpl(url.toString(), { method: 'GET', headers: { accept: 'application/json' } })
  } catch {
    throw new ContractLoadError(0, 'error')
  }

  if (!response.ok) {
    throw new ContractLoadError(response.status, response.status === 404 ? 'unavailable' : 'error')
  }

  return (await response.json()) as RenderContract
}

/**
 * Veredicto sanitizado de `/verify-email` (TASK-1254), espejo del payload del endpoint.
 * El cliente NUNCA recibe el payload crudo del provider ni el tier interno. `outcome`
 * distingue el veredicto real (`ok`) de la degradación honesta (`disabled` = flag OFF /
 * 404, `rate_limited` = 429, `error` = red/5xx) — en degradación el submit NO se traba:
 * la autoridad del gate vive en `submitForm` (TASK-1254).
 */
export type EmailVerifyResult =
  | {
      outcome: 'ok'
      syntaxValid: boolean
      isCorporate: boolean
      isDisposable: boolean
      isRoleBased: boolean
      isFreeProvider: boolean
      deliverable: 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
      quality: 'verified' | 'suspect' | 'unknown'
      suggestion: string | null
      reasonCode: 'email_format' | 'email_not_corporate' | 'email_disposable' | null
    }
  | { outcome: 'disabled' | 'rate_limited' | 'error' }

/**
 * Verifica un correo vía el endpoint público gobernado (debounced por el caller).
 * Gateado por `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED`: si está OFF el endpoint
 * responde 404 → `disabled` (degradación honesta, sin trabar el submit). NUNCA llama
 * al provider directo: el secreto vive server-only y solo este endpoint lo orquesta.
 */
export const verifyPublicEmail = async (
  config: RendererApiConfig,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailVerifyResult> => {
  const url = join(config.baseUrl, `/api/public/growth/forms/${encodeURIComponent(formRef(config))}/verify-email`)

  let response: Response

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    return { outcome: 'error' }
  }

  if (response.status === 404) return { outcome: 'disabled' }
  if (response.status === 429) return { outcome: 'rate_limited' }

  let parsed: Record<string, unknown> = {}

  try {
    parsed = (await response.json()) as Record<string, unknown>
  } catch {
    return { outcome: 'error' }
  }

  if (!response.ok || parsed.outcome !== 'ok') return { outcome: 'error' }

  return {
    outcome: 'ok',
    syntaxValid: Boolean(parsed.syntaxValid),
    isCorporate: Boolean(parsed.isCorporate),
    isDisposable: Boolean(parsed.isDisposable),
    isRoleBased: Boolean(parsed.isRoleBased),
    isFreeProvider: Boolean(parsed.isFreeProvider),
    deliverable: (parsed.deliverable as 'deliverable' | 'undeliverable' | 'risky' | 'unknown') ?? 'unknown',
    quality: (parsed.quality as 'verified' | 'suspect' | 'unknown') ?? 'unknown',
    suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : null,
    reasonCode: (parsed.reasonCode as 'email_format' | 'email_not_corporate' | 'email_disposable' | null) ?? null,
  }
}

export interface SubmitPayload {
  fields: Record<string, string | number | boolean | string[]>
  files?: Record<string, File>
  consent: boolean
  consentCheckboxes: string[]
  /** Honeypot anti-bot: si trae valor, el server rechaza silenciosamente. */
  honeypot?: string
  pageUri?: string
  pageName?: string
  referrer?: string
  idempotencyKey?: string
  formVersionId?: string
  captchaToken?: string
}

/** Envía la submission al endpoint público gobernado. Mapea network error → outcome `invalid`. */
export const submitPublicForm = async (
  config: RendererApiConfig,
  payload: SubmitPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicSubmitResult> => {
  const url = join(config.baseUrl, `/api/public/growth/forms/${encodeURIComponent(formRef(config))}/submit`)

  const body = {
    surfaceId: config.surfaceId,
    embedKey: config.embedKey,
    formVersionId: payload.formVersionId,
    fields: payload.fields,
    consent: payload.consent,
    consentCheckboxes: payload.consentCheckboxes,
    pageUri: payload.pageUri,
    pageName: payload.pageName,
    referrer: payload.referrer,
    honeypot: payload.honeypot,
    idempotencyKey: payload.idempotencyKey,
    captchaToken: payload.captchaToken,
  }

  const files = payload.files ?? {}
  const hasFiles = Object.keys(files).length > 0

  let response: Response

  try {
    if (hasFiles) {
      const formData = new FormData()

      formData.append('payload', JSON.stringify(body))

      for (const [fieldKey, file] of Object.entries(files)) {
        formData.append(`file:${fieldKey}`, file)
      }

      response = await fetchImpl(url, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: formData,
      })
    } else {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
    }
  } catch {
    return { outcome: 'invalid', reason: 'network_error' }
  }

  let parsed: Partial<PublicSubmitResult> = {}

  try {
    parsed = (await response.json()) as Partial<PublicSubmitResult>
  } catch {
    parsed = {}
  }

  const outcome = (parsed.outcome as PublicSubmitOutcome | undefined) ?? (response.ok ? 'accepted' : 'invalid')

  return { outcome, submissionId: parsed.submissionId, reason: parsed.reason }
}
