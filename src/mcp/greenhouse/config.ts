import type { SisterPlatformExternalScopeType } from '@/lib/sister-platforms/types'

import { DEFAULT_GREENHOUSE_MCP_API_VERSION, type GreenhouseMcpConfig } from './types'

const REQUIRED_ENV_VARS = [
  'GREENHOUSE_MCP_API_BASE_URL',
  'GREENHOUSE_MCP_CONSUMER_TOKEN',
  'GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE',
  'GREENHOUSE_MCP_EXTERNAL_SCOPE_ID'
] as const

const normalizeRequiredString = (value: string | undefined) => {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, '')

export const resolveGreenhouseMcpConfig = (
  env: Record<string, string | undefined> = process.env
): GreenhouseMcpConfig => {
  const missing = REQUIRED_ENV_VARS.filter(key => !normalizeRequiredString(env[key]))

  if (missing.length > 0) {
    throw new Error(
      `Missing required Greenhouse MCP env vars: ${missing.join(', ')}.`
    )
  }

  return {
    apiBaseUrl: normalizeApiBaseUrl(env.GREENHOUSE_MCP_API_BASE_URL!.trim()),
    consumerToken: env.GREENHOUSE_MCP_CONSUMER_TOKEN!.trim(),
    externalScopeType: env.GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE!.trim() as SisterPlatformExternalScopeType,
    externalScopeId: env.GREENHOUSE_MCP_EXTERNAL_SCOPE_ID!.trim(),
    apiVersion: normalizeRequiredString(env.GREENHOUSE_MCP_API_VERSION) ?? DEFAULT_GREENHOUSE_MCP_API_VERSION
  }
}
