/**
 * TASK-1340 — Growth CTA renderer: único punto de red del bundle público.
 *
 * GET render (contrato arbitrado server-side) + POST events (ingest Tier A,
 * fire-and-forget). El embed key autentica la SURFACE, no al visitante (arch §16.1):
 * viaja como header en el GET y en el body del POST, igual que registró TASK-1339.
 * Fail-closed: cualquier error de red/HTTP en el GET ⇒ el card no se muestra.
 */
import type { ArbitratedRenderResultMirror } from './contract'

export interface CtaApiConfig {
  baseUrl: string
  surfaceId: string
  embedKey: string | null
  route: string
}

export type ContractLoadFailure = 'disabled' | 'unauthorized' | 'error'

export class CtaContractLoadError extends Error {
  readonly reason: ContractLoadFailure

  constructor(reason: ContractLoadFailure) {
    super(`cta contract load failed: ${reason}`)
    this.reason = reason
  }
}

const cleanBase = (baseUrl: string): string => baseUrl.replace(/\/$/, '')

export const fetchArbitratedContracts = async (
  config: CtaApiConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ArbitratedRenderResultMirror> => {
  const url = new URL(`${cleanBase(config.baseUrl)}/api/public/growth/ctas/render`)

  url.searchParams.set('surfaceId', config.surfaceId)
  url.searchParams.set('route', config.route)

  const headers: Record<string, string> = { accept: 'application/json' }

  if (config.embedKey) headers['x-greenhouse-cta-embed-key'] = config.embedKey

  let response: Response

  try {
    response = await fetchImpl(url.toString(), { headers })
  } catch {
    throw new CtaContractLoadError('error')
  }

  if (response.status === 404) throw new CtaContractLoadError('disabled')
  if (response.status === 403) throw new CtaContractLoadError('unauthorized')
  if (!response.ok) throw new CtaContractLoadError('error')

  return (await response.json()) as ArbitratedRenderResultMirror
}

export interface CtaIngestEventInput {
  ctaSlug: string
  ctaVersionId: string
  eventKind: 'clicked' | 'action_started' | 'action_completed' | 'form_opened' | 'form_submitted' | 'dismissed' | 'error'
  pageUri?: string
  placement?: string
  trigger?: string
  variantId?: string
  actionKind?: 'open_growth_form'
  visitorKey?: string
  sessionKey?: string
  consentState?: 'granted' | 'denied' | 'unknown'
  consentSource?: string
  formSubmissionId?: string
  payload?: Record<string, string | number | boolean>
}

/**
 * Ingest Tier A fire-and-forget: nunca bloquea ni rompe la UX del host. Todo entra
 * `browser_reported` server-side (la conversión-verdad es server_confirmed).
 */
export const postCtaEvent = (
  config: CtaApiConfig,
  event: CtaIngestEventInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> =>
  fetchImpl(`${cleanBase(config.baseUrl)}/api/public/growth/ctas/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      surfaceId: config.surfaceId,
      embedKey: config.embedKey ?? '',
      ...event,
    }),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined)
