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
  surfaceId?: string
  embedKey?: string
}

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
  const url = new URL(join(config.baseUrl, `/api/public/growth/forms/${encodeURIComponent(config.slug)}`))

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

export interface SubmitPayload {
  fields: Record<string, string | number | boolean | string[]>
  consent: boolean
  consentCheckboxes: string[]
  /** Honeypot anti-bot: si trae valor, el server rechaza silenciosamente. */
  honeypot?: string
  pageUri?: string
  pageName?: string
  referrer?: string
  idempotencyKey?: string
  formVersionId?: string
}

/** Envía la submission al endpoint público gobernado. Mapea network error → outcome `invalid`. */
export const submitPublicForm = async (
  config: RendererApiConfig,
  payload: SubmitPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicSubmitResult> => {
  const url = join(config.baseUrl, `/api/public/growth/forms/${encodeURIComponent(config.slug)}/submit`)

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
  }

  let response: Response

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
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
