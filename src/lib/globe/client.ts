import 'server-only'

import { GlobeClient, GlobeSdkError } from '@efeonce-globe/sdk'
import {
  createGoogleAdcIdTokenAuth,
  type GoogleIdTokenClientFactory
} from '@efeonce-globe/sdk/google-auth'
import { GoogleAuth } from 'google-auth-library'

import {
  createAmbientImpersonatedGoogleIdTokenClientFactory,
  createVercelWifGoogleIdTokenClientFactory,
  isVercelRuntime
} from '@/lib/google-credentials'
import type { GlobeTenancyReconcileCommand } from './tenancy-reconciler'

export type GreenhouseGlobeCredentialSource = 'wif' | 'ambient_adc'

export type GreenhouseGlobeClientConfig = Readonly<{
  baseUrl: string
  audience: string
  projectId: string
  credentialSource: GreenhouseGlobeCredentialSource
  workloadIdentityProvider?: string
  serviceAccountEmail?: string
}>

export type GreenhouseGlobeClientDependencies = Readonly<{
  googleAuth?: GoogleIdTokenClientFactory
  fetch?: typeof globalThis.fetch
}>

export class GreenhouseGlobeConfigurationError extends Error {
  readonly code:
    | 'globe_not_configured'
    | 'globe_url_invalid'
    | 'globe_wif_config_invalid'
    | 'globe_production_forbidden'
    | 'globe_sdk_command_unavailable'

  constructor(code: GreenhouseGlobeConfigurationError['code']) {
    super(code)
    this.name = 'GreenhouseGlobeConfigurationError'
    this.code = code
  }
}

export function readGreenhouseGlobeClientConfig(
  env: NodeJS.ProcessEnv = process.env
): GreenhouseGlobeClientConfig {
  if (env.VERCEL_ENV?.trim().toLowerCase() === 'production') {
    throw new GreenhouseGlobeConfigurationError('globe_production_forbidden')
  }

  const baseUrl = normalizeHttpsOrigin(env.GLOBE_API_BASE_URL)
  const audience = normalizeHttpsOrigin(env.GLOBE_API_AUDIENCE ?? baseUrl)
  const projectId = env.GLOBE_GCP_PROJECT?.trim() || 'efeonce-globe'

  if (!baseUrl || !audience || !projectId) {
    throw new GreenhouseGlobeConfigurationError('globe_not_configured')
  }

  if (!isVercelRuntime(env)) {
    return {
      baseUrl,
      audience,
      projectId,
      credentialSource: 'ambient_adc',
      serviceAccountEmail: env.GLOBE_GCP_SERVICE_ACCOUNT_EMAIL?.trim() || undefined
    }
  }

  const workloadIdentityProvider = env.GLOBE_GCP_WORKLOAD_IDENTITY_PROVIDER?.trim()
  const serviceAccountEmail = env.GLOBE_GCP_SERVICE_ACCOUNT_EMAIL?.trim()

  if (!workloadIdentityProvider || !serviceAccountEmail) {
    throw new GreenhouseGlobeConfigurationError('globe_wif_config_invalid')
  }

  return {
    baseUrl,
    audience,
    projectId,
    credentialSource: 'wif',
    workloadIdentityProvider,
    serviceAccountEmail
  }
}

export function createGreenhouseGlobeClient(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: GreenhouseGlobeClientDependencies = {}
) {
  const config = readGreenhouseGlobeClientConfig(env)
  const googleAuth = dependencies.googleAuth ?? createGoogleIdTokenClientFactory(config, env)

  return {
    client: new GlobeClient({
      baseUrl: config.baseUrl,
      audience: config.audience,
      auth: createGoogleAdcIdTokenAuth({ audience: config.audience, auth: googleAuth }),
      fetch: dependencies.fetch
    }),
    config
  }
}

/** Canonical typed SDK seam for the continuous tenancy reconciler. */
export function createGreenhouseGlobeTenancyReconcileCommand(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: GreenhouseGlobeClientDependencies = {}
): GlobeTenancyReconcileCommand {
  const { client } = createGreenhouseGlobeClient(env, dependencies)

  if (typeof client.reconcileTenancyProjection !== 'function') {
    throw new GreenhouseGlobeConfigurationError('globe_sdk_command_unavailable')
  }

  return async input => {
    await client.reconcileTenancyProjection(
      { snapshot: input.snapshot },
      {
        workspaceId: input.workspaceId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId
      }
    )
  }
}

function createGoogleIdTokenClientFactory(
  config: GreenhouseGlobeClientConfig,
  env: NodeJS.ProcessEnv
): GoogleIdTokenClientFactory {
  if (config.credentialSource === 'ambient_adc') {
    if (config.serviceAccountEmail) {
      return createAmbientImpersonatedGoogleIdTokenClientFactory({
        projectId: config.projectId,
        serviceAccountEmail: config.serviceAccountEmail
      })
    }

    return new GoogleAuth({ projectId: config.projectId })
  }

  return createVercelWifGoogleIdTokenClientFactory({
    provider: requireConfig(config.workloadIdentityProvider),
    serviceAccountEmail: requireConfig(config.serviceAccountEmail),
    env
  })
}

function normalizeHttpsOrigin(value: string | undefined) {
  if (!value?.trim()) throw new GreenhouseGlobeConfigurationError('globe_not_configured')

  try {
    const url = new URL(value.trim())
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)

    if ((url.protocol !== 'https:' && !local) || url.username || url.password || url.search || url.hash) {
      throw new GreenhouseGlobeConfigurationError('globe_url_invalid')
    }

    return url.origin
  } catch (error) {
    if (error instanceof GreenhouseGlobeConfigurationError) throw error
    throw new GreenhouseGlobeConfigurationError('globe_url_invalid')
  }
}

function requireConfig(value: string | undefined) {
  if (!value) throw new GreenhouseGlobeConfigurationError('globe_wif_config_invalid')

  return value
}

export { GlobeSdkError }
