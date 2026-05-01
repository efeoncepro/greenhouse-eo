import type { SisterPlatformExternalScopeType } from '@/lib/sister-platforms/types'

export const DEFAULT_GREENHOUSE_MCP_API_VERSION = '2026-04-25'
export const DEFAULT_GREENHOUSE_MCP_REQUEST_TIMEOUT_MS = 15_000
export const DEFAULT_GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES = 1_000_000

export type GreenhouseMcpConfig = {
  apiBaseUrl: string
  consumerToken: string
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
  apiVersion: string
  requestTimeoutMs: number
}

export type GreenhouseMcpRemoteGatewayConfig = {
  gatewayToken: string
  maxBodyBytes: number
}

export type GreenhouseApiSuccessEnvelope<T> = {
  requestId: string
  servedAt: string
  version: string
  data: T
  meta?: Record<string, unknown>
}

export type GreenhouseApiErrorItem = {
  code: string
  message: string
  details?: Record<string, unknown> | null
}

export type GreenhouseApiErrorEnvelope = {
  requestId?: string
  servedAt?: string
  version?: string
  data: null
  errors?: GreenhouseApiErrorItem[]
  meta?: Record<string, unknown>
}

export type GreenhouseMcpSuccessResult<T = unknown> = {
  ok: true
  requestId: string
  apiVersion: string
  status: number
  data: T
  meta: Record<string, unknown>
}

export type GreenhouseMcpErrorResult = {
  ok: false
  requestId: string | null
  apiVersion: string | null
  status: number
  error: {
    code: string
    message: string
    details: Record<string, unknown> | null
  }
}

export type GreenhouseMcpToolResult<T = unknown> = GreenhouseMcpSuccessResult<T> | GreenhouseMcpErrorResult
