import 'server-only'

import type { CloudGcpAuthPosture } from '@/lib/cloud/contracts'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

export const getCloudGcpAuthPosture = (env: NodeJS.ProcessEnv = process.env): CloudGcpAuthPosture => {
  const providerConfigured = hasValue(env.GCP_WORKLOAD_IDENTITY_PROVIDER)
  const serviceAccountEmailConfigured = hasValue(env.GCP_SERVICE_ACCOUNT_EMAIL)
  const oidcAvailable = hasValue(env.VERCEL_OIDC_TOKEN)
  const serviceAccountKeyConfigured = hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON) || hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64)

  const workloadIdentityConfigured = providerConfigured && serviceAccountEmailConfigured

  if (workloadIdentityConfigured && serviceAccountKeyConfigured) {
    return {
      mode: 'mixed',
      summary: oidcAvailable
        ? 'WIF configurado con token OIDC activo y SA key fallback presente'
        : 'WIF configurado, pero la SA key sigue presente como fallback',
      oidcAvailable,
      workloadIdentityConfigured,
      serviceAccountKeyConfigured,
      serviceAccountEmailConfigured,
      providerConfigured
    }
  }

  if (workloadIdentityConfigured) {
    return {
      mode: 'wif',
      summary: oidcAvailable
        ? 'WIF configurado y token OIDC presente en runtime'
        : 'WIF configurado; falta el token OIDC del runtime para activarse',
      oidcAvailable,
      workloadIdentityConfigured,
      serviceAccountKeyConfigured,
      serviceAccountEmailConfigured,
      providerConfigured
    }
  }

  if (serviceAccountKeyConfigured) {
    return {
      mode: 'service_account_key',
      summary: 'Runtime autenticando con SA key estática',
      oidcAvailable,
      workloadIdentityConfigured,
      serviceAccountKeyConfigured,
      serviceAccountEmailConfigured,
      providerConfigured
    }
  }

  return {
    mode: 'unconfigured',
    summary: 'No hay postura GCP configurada para runtime',
    oidcAvailable,
    workloadIdentityConfigured,
    serviceAccountKeyConfigured,
    serviceAccountEmailConfigured,
    providerConfigured
  }
}
