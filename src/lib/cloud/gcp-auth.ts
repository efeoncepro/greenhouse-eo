import 'server-only'

import type { CloudGcpAuthPosture } from '@/lib/cloud/contracts'
import { getGoogleCredentialSource, isWorkloadIdentityConfigured, shouldUseWorkloadIdentity } from '@/lib/google-credentials'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

export const getCloudGcpAuthPosture = (env: NodeJS.ProcessEnv = process.env): CloudGcpAuthPosture => {
  const providerConfigured =
    hasValue(env.GCP_WORKLOAD_IDENTITY_PROVIDER) ||
    (hasValue(env.GCP_PROJECT_NUMBER) && hasValue(env.GCP_WORKLOAD_IDENTITY_POOL_ID) && hasValue(env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID))

  const serviceAccountEmailConfigured = hasValue(env.GCP_SERVICE_ACCOUNT_EMAIL)
  const oidcAvailable = hasValue(env.VERCEL_OIDC_TOKEN)
  const serviceAccountKeyConfigured = hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON) || hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64)
  const workloadIdentityConfigured = isWorkloadIdentityConfigured(env)
  const workloadIdentityActive = shouldUseWorkloadIdentity(env)
  const selectedSource = getGoogleCredentialSource(env)

  if (workloadIdentityConfigured && serviceAccountKeyConfigured) {
    return {
      mode: 'mixed',
      summary:
        selectedSource === 'wif'
          ? 'WIF configurado y preferido en runtime; la SA key sigue presente como fallback'
          : workloadIdentityActive
            ? 'WIF configurado con token OIDC activo y SA key fallback presente'
            : 'WIF configurado, pero la SA key sigue presente como fallback',
      oidcAvailable,
      selectedSource,
      workloadIdentityConfigured,
      serviceAccountKeyConfigured,
      serviceAccountEmailConfigured,
      providerConfigured
    }
  }

  if (workloadIdentityConfigured) {
    return {
      mode: 'wif',
      summary: workloadIdentityActive
        ? 'WIF configurado y preferido en runtime'
        : 'WIF configurado; falta el token OIDC del runtime para activarse',
      oidcAvailable,
      selectedSource,
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
      selectedSource,
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
    selectedSource,
    workloadIdentityConfigured,
    serviceAccountKeyConfigured,
    serviceAccountEmailConfigured,
    providerConfigured
  }
}
