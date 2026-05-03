import { timingSafeEqual } from 'node:crypto'

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { resolveGreenhouseMcpConfig } from './config'
import { createGreenhouseMcpServer } from './server'
import {
  DEFAULT_GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES,
  type GreenhouseMcpRemoteGatewayConfig
} from './types'

const JSON_RPC_INTERNAL_ERROR = -32603
const JSON_RPC_INVALID_REQUEST = -32600

type RemoteGatewayEnv = Record<string, string | undefined>

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value?.trim()) return fallback

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES must be a positive integer when provided.')
  }

  return parsed
}

export const resolveGreenhouseMcpRemoteGatewayConfig = (
  env: RemoteGatewayEnv = process.env
): GreenhouseMcpRemoteGatewayConfig => {
  const gatewayToken = env.GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN?.trim()

  if (!gatewayToken) {
    throw new Error('Missing required Greenhouse MCP remote env var: GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN.')
  }

  return {
    gatewayToken,
    maxBodyBytes: parsePositiveInteger(
      env.GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES,
      DEFAULT_GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES
    )
  }
}

const jsonRpcErrorResponse = (status: number, code: number, message: string, requestId: string) =>
  Response.json(
    {
      jsonrpc: '2.0',
      error: {
        code,
        message
      },
      id: null
    },
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'x-greenhouse-request-id': requestId
      }
    }
  )

const extractBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization') ?? ''
  const [scheme, ...rest] = authorization.trim().split(/\s+/)

  if (scheme?.toLowerCase() !== 'bearer' || rest.length !== 1) {
    return null
  }

  return rest[0] ?? null
}

const tokensMatch = (received: string, expected: string) => {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

const getRequestId = (request: Request) =>
  request.headers.get('x-greenhouse-request-id')?.trim() ||
  request.headers.get('x-request-id')?.trim() ||
  crypto.randomUUID()

const rejectIfBodyTooLarge = (request: Request, maxBodyBytes: number, requestId: string) => {
  const rawLength = request.headers.get('content-length')

  if (!rawLength) return null

  const contentLength = Number(rawLength)

  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return jsonRpcErrorResponse(400, JSON_RPC_INVALID_REQUEST, 'Invalid Content-Length header.', requestId)
  }

  if (contentLength > maxBodyBytes) {
    return jsonRpcErrorResponse(413, JSON_RPC_INVALID_REQUEST, 'MCP request body exceeds the remote gateway limit.', requestId)
  }

  return null
}

export const handleGreenhouseMcpRemoteRequest = async (
  request: Request,
  deps?: {
    env?: RemoteGatewayEnv
    fetch?: typeof fetch
  }
) => {
  const requestId = getRequestId(request)

  let remoteConfig: GreenhouseMcpRemoteGatewayConfig

  try {
    remoteConfig = resolveGreenhouseMcpRemoteGatewayConfig(deps?.env)
  } catch (error) {
    console.error('[greenhouse-mcp-remote] gateway disabled or misconfigured', {
      requestId,
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return jsonRpcErrorResponse(404, JSON_RPC_INVALID_REQUEST, 'Greenhouse MCP remote gateway is not configured.', requestId)
  }

  const token = extractBearerToken(request)

  if (!token || !tokensMatch(token, remoteConfig.gatewayToken)) {
    console.warn('[greenhouse-mcp-remote] rejected unauthorized request', {
      requestId,
      method: request.method
    })

    return jsonRpcErrorResponse(401, JSON_RPC_INVALID_REQUEST, 'Unauthorized Greenhouse MCP remote request.', requestId)
  }

  const bodySizeRejection = rejectIfBodyTooLarge(request, remoteConfig.maxBodyBytes, requestId)

  if (bodySizeRejection) return bodySizeRejection

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  })

  let server: McpServer | null = null

  try {
    server = createGreenhouseMcpServer(resolveGreenhouseMcpConfig(deps?.env), {
      fetch: deps?.fetch
    })

    await server.connect(transport)

    const response = await transport.handleRequest(request)

    response.headers.set('cache-control', 'no-store')
    response.headers.set('x-greenhouse-request-id', requestId)
    response.headers.set('x-greenhouse-mcp-transport', 'streamable-http-stateless')

    return response
  } catch (error) {
    console.error('[greenhouse-mcp-remote] request failed', {
      requestId,
      method: request.method,
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return jsonRpcErrorResponse(500, JSON_RPC_INTERNAL_ERROR, 'Greenhouse MCP remote gateway failed.', requestId)
  } finally {
    await transport.close().catch(() => undefined)
    await server?.close().catch(() => undefined)
  }
}
