import { NextResponse } from 'next/server'

import {
  consumeSisterPlatformAuthorizationCode,
  getOAuthRequestAuditMetadata,
  recordSisterPlatformOAuthAuditEvent,
  SisterPlatformOAuthError
} from '@/lib/sister-platforms/oauth-broker'
import {
  exchangeMcpGatewayToken,
  McpTokenExchangeError,
  RFC8693_ACCESS_TOKEN_TYPE,
  RFC8693_TOKEN_EXCHANGE_GRANT
} from '@/lib/sister-platforms/mcp-token-exchange'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const parseBasicAuth = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim()

  if (!authorization?.toLowerCase().startsWith('basic ')) return null

  try {
    const decoded = Buffer.from(authorization.slice('basic '.length), 'base64').toString('utf8')
    const separatorIndex = decoded.indexOf(':')

    if (separatorIndex === -1) return null

    return {
      clientId: decoded.slice(0, separatorIndex),
      clientSecret: decoded.slice(separatorIndex + 1)
    }
  } catch {
    return null
  }
}

const parseTokenPayload = async (request: Request) => {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>
  }

  const formData = await request.formData()
  const payload: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    payload[key] = typeof value === 'string' ? value : ''
  }

  return payload
}

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const parseBearerAuth = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim() ?? ''

  return authorization.toLowerCase().startsWith('bearer ') ? authorization.slice('bearer '.length).trim() : ''
}

const buildOAuthError = (error: SisterPlatformOAuthError) =>
  NextResponse.json(
    {
      error: error.errorCode,
      error_description: 'Sister platform token exchange rejected.'
    },
    { status: error.statusCode }
  )

const normalizeTokenExchangeError = (error: McpTokenExchangeError) => {
  const errorCode =
    error.code === 'scope_not_allowed'
      ? 'invalid_scope'
      : ['identity_not_bound', 'user_not_eligible'].includes(error.code)
        ? 'invalid_grant'
        : error.code === 'exchange_disabled'
          ? 'unauthorized_client'
          : error.code === 'configuration_missing'
            ? 'temporarily_unavailable'
            : error.code

  return new SisterPlatformOAuthError('MCP token exchange rejected.', {
    statusCode: error.statusCode,
    errorCode
  })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const auditMetadata = getOAuthRequestAuditMetadata(request)

  try {
    const payload = await parseTokenPayload(request)
    const basicAuth = parseBasicAuth(request)
    const grantType = asString(payload.grant_type)

    if (grantType === RFC8693_TOKEN_EXCHANGE_GRANT) {
      if (!request.headers.get('content-type')?.toLowerCase().includes('application/x-www-form-urlencoded')) {
        throw new McpTokenExchangeError('invalid_request')
      }

      const exchanged = await exchangeMcpGatewayToken({
        requestUrl: request.url,
        workloadToken: parseBearerAuth(request),
        grantType,
        clientId: asString(payload.client_id),
        subjectToken: asString(payload.subject_token),
        subjectTokenType: asString(payload.subject_token_type),
        ...(asString(payload.requested_token_type)
          ? { requestedTokenType: asString(payload.requested_token_type) }
          : {}),
        requestedScope: asString(payload.scope),
        auditMetadata
      })

      return NextResponse.json(
        {
          token_type: 'Bearer',
          issued_token_type: RFC8693_ACCESS_TOKEN_TYPE,
          access_token: exchanged.accessToken,
          expires_in: exchanged.expiresIn,
          scope: exchanged.scope,
          correlation_id: exchanged.correlationId
        },
        {
          status: 200,
          headers: {
            'cache-control': 'no-store',
            pragma: 'no-cache',
            'x-correlation-id': exchanged.correlationId
          }
        }
      )
    }

    if (grantType !== 'authorization_code') {
      throw new SisterPlatformOAuthError('Unsupported grant_type.', {
        statusCode: 400,
        errorCode: 'unsupported_grant_type'
      })
    }

    const clientId = basicAuth?.clientId || asString(payload.client_id)
    const clientSecret = basicAuth ? basicAuth.clientSecret : asString(payload.client_secret)

    const consumed = await consumeSisterPlatformAuthorizationCode({
      clientId,
      clientSecret,
      code: asString(payload.code),
      redirectUri: asString(payload.redirect_uri),
      codeVerifier: asString(payload.code_verifier),
      auditMetadata
    })

    return NextResponse.json(
      {
        token_type: 'Bearer',
        access_token: consumed.accessToken,
        expires_in: consumed.expiresIn,
        scope: consumed.scopes.join(' '),
        correlation_id: consumed.correlationId,
        identity: consumed.identity
      },
      {
        status: 200,
        headers: {
          'cache-control': 'no-store',
          'x-correlation-id': consumed.correlationId
        }
      }
    )
  } catch (error) {
    const normalized =
      error instanceof McpTokenExchangeError
        ? normalizeTokenExchangeError(error)
        : error instanceof SisterPlatformOAuthError
        ? error
        : new SisterPlatformOAuthError('Unexpected token broker failure.', {
            statusCode: 500,
            errorCode: 'internal_error'
          })

    await recordSisterPlatformOAuthAuditEvent({
      eventType: normalized.errorCode === 'code_replay' ? 'code_replay' : 'token_reject',
      outcome: normalized.statusCode >= 500 ? 'failure' : 'rejected',
      errorCode: normalized.errorCode,
      responseStatus: normalized.statusCode,
      durationMs: Date.now() - startedAt,
      auditMetadata
    }).catch(() => undefined)

    return buildOAuthError(normalized)
  }
}
