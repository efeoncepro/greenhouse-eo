import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { getKortexCommandDefinition, KORTEX_COMMAND_PATH_PATTERNS } from './registry'
import type { KortexCommandName } from './types'

const DEFAULT_KORTEX_COMMAND_BASE_URL = 'https://kortex-control-plane-758246035804.us-central1.run.app'
const KORTEX_COMMAND_TIMEOUT_MS = 120_000

export const isAllowedKortexCommandPath = (path: string) =>
  KORTEX_COMMAND_PATH_PATTERNS.some(pattern => pattern.test(path))

export const resolveKortexCommandBaseUrl = () =>
  (
    process.env.KORTEX_COMMAND_API_BASE_URL ||
    process.env.KORTEX_CONTROL_PLANE_BASE_URL ||
    process.env.KORTEX_RUNTIME_BASE_URL ||
    DEFAULT_KORTEX_COMMAND_BASE_URL
  ).replace(/\/+$/, '')

const resolveKortexCommandToken = () =>
  process.env.KORTEX_COMMAND_API_TOKEN?.trim() ||
  process.env.KORTEX_CONTROL_PLANE_TOKEN?.trim() ||
  ''

const resolveKortexAdminBootstrapToken = () =>
  process.env.KORTEX_COMMAND_ADMIN_TOKEN?.trim() ||
  process.env.KORTEX_ADMIN_BOOTSTRAP_TOKEN?.trim() ||
  ''

export const fetchKortexCommandJson = async <T>({
  path,
  method,
  body,
  commandName,
  idempotencyKey,
  actorUserId,
  timeoutMs = KORTEX_COMMAND_TIMEOUT_MS
}: {
  path: string
  method: 'POST' | 'PUT' | 'PATCH'
  body: Record<string, unknown>
  commandName: KortexCommandName
  idempotencyKey: string | null
  actorUserId: string | null
  timeoutMs?: number
}): Promise<T> => {
  if (!isAllowedKortexCommandPath(path)) {
    throw new ApiPlatformError('Kortex command path is not allowlisted.', {
      statusCode: 400,
      errorCode: 'bad_request',
      details: { path }
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const token = resolveKortexCommandToken()

  const adminToken = getKortexCommandDefinition(commandName).tier === 'admin_breakglass'
    ? resolveKortexAdminBootstrapToken()
    : ''

  const url = `${resolveKortexCommandBaseUrl()}${path}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'greenhouse-kortex-command-adapter',
        'X-Greenhouse-Command-Name': commandName,
        ...(idempotencyKey ? { 'X-Greenhouse-Idempotency-Key': idempotencyKey } : {}),
        ...(actorUserId ? { 'X-Greenhouse-Actor-Id': actorUserId } : {}),
        ...(adminToken ? { 'X-Kortex-Admin-Token': adminToken } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store'
    })

    if (response.status === 401 || response.status === 403) {
      throw new ApiPlatformError('Kortex command upstream rejected Greenhouse credentials.', {
        statusCode: 502,
        errorCode: 'kortex_upstream_unauthorized'
      })
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')

      throw new ApiPlatformError(`Kortex command upstream returned ${response.status}.`, {
        statusCode: response.status >= 500 ? 502 : 400,
        errorCode: 'kortex_preflight_failed',
        details: { status: response.status, detail: text ? redactErrorForResponse(text) : null }
      })
    }

    return await response.json() as T
  } catch (error) {
    if (error instanceof ApiPlatformError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiPlatformError('Kortex command upstream timed out.', {
        statusCode: 504,
        errorCode: 'kortex_upstream_timeout'
      })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
