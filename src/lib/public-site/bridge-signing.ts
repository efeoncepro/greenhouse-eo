import { createHash, createHmac, randomUUID } from 'node:crypto'

export const PUBLIC_SITE_BRIDGE_SIGNATURE_CONTRACT = 'GHWPB-HMAC-SHA256'
export const PUBLIC_SITE_BRIDGE_SIGNATURE_ALGORITHM = 'sha256'
export const PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION = 'greenhouse-wp-bridge-draft.v1'

export type PublicSiteBridgeSignatureInput = {
  method: string
  route: string
  body?: string
  secret: string
  timestamp?: number
  requestId?: string
  actor: string
  environment: string
}

export type PublicSiteBridgeSignatureHeaders = {
  'X-Greenhouse-Timestamp': string
  'X-Greenhouse-Request-Id': string
  'X-Greenhouse-Actor': string
  'X-Greenhouse-Environment': string
  'X-Greenhouse-Body-Sha256': string
  'X-Greenhouse-Signature': string
}

export type SignedPublicSiteBridgeRequest = {
  canonicalRequest: string
  headers: PublicSiteBridgeSignatureHeaders
}

export const hashPublicSiteBridgeBody = (body = '') =>
  createHash(PUBLIC_SITE_BRIDGE_SIGNATURE_ALGORITHM).update(body, 'utf8').digest('hex')

export const buildPublicSiteBridgeCanonicalRequest = (input: {
  method: string
  route: string
  bodyHash: string
  timestamp: string
  requestId: string
  actor: string
  environment: string
}) =>
  [
    PUBLIC_SITE_BRIDGE_SIGNATURE_CONTRACT,
    input.method.toUpperCase(),
    input.route,
    input.bodyHash,
    input.timestamp,
    input.requestId,
    input.actor,
    input.environment
  ].join('\n')

export const signPublicSiteBridgeRequest = (
  input: PublicSiteBridgeSignatureInput
): SignedPublicSiteBridgeRequest => {
  const secret = input.secret.trim()

  if (!secret) {
    throw new Error('public_site_bridge_shared_secret_required')
  }

  const method = input.method.trim().toUpperCase()
  const route = input.route.trim()

  if (!method || !route.startsWith('/')) {
    throw new Error('public_site_bridge_signature_input_invalid')
  }

  const body = input.body ?? ''
  const bodyHash = hashPublicSiteBridgeBody(body)
  const timestamp = String(input.timestamp ?? Math.floor(Date.now() / 1000))
  const requestId = input.requestId?.trim() || `gh-${randomUUID()}`
  const actor = input.actor.trim()
  const environment = input.environment.trim()

  if (!actor || !environment) {
    throw new Error('public_site_bridge_signature_actor_environment_required')
  }

  const canonicalRequest = buildPublicSiteBridgeCanonicalRequest({
    method,
    route,
    bodyHash,
    timestamp,
    requestId,
    actor,
    environment
  })

  const signature = createHmac(PUBLIC_SITE_BRIDGE_SIGNATURE_ALGORITHM, secret)
    .update(canonicalRequest, 'utf8')
    .digest('hex')

  return {
    canonicalRequest,
    headers: {
      'X-Greenhouse-Timestamp': timestamp,
      'X-Greenhouse-Request-Id': requestId,
      'X-Greenhouse-Actor': actor,
      'X-Greenhouse-Environment': environment,
      'X-Greenhouse-Body-Sha256': bodyHash,
      'X-Greenhouse-Signature': `${PUBLIC_SITE_BRIDGE_SIGNATURE_ALGORITHM}=${signature}`
    }
  }
}
