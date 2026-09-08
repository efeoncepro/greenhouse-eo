/** TASK-1836 — configuration is pinned by the runtime, never selected by a login request. */
import { validateEntraOidcConfig, type EntraOidcConfig } from './oidc'

export const internalAuthEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.AUTH_SERVER_INTERNAL_AUTH_ENABLED?.trim().toLowerCase() === 'true'

/** Issuance/refresh cohort is explicit; absence, wildcard and malformed lists never enroll anybody. */
export const internalMultiOrgIssuanceEnabled = (profileId: string, env: Partial<NodeJS.ProcessEnv> = process.env): boolean => {
  if (env.AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED?.trim().toLowerCase() !== 'true') return false
  const profiles = (env.AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS ?? '').split(',').map(value => value.trim())

  return profiles.length > 0 && profiles.every(value => /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/.test(value)) && profiles.includes(profileId)
}

export const internalMultiOrgReaderEnabled = (env: Partial<NodeJS.ProcessEnv> = process.env): boolean =>
  env.IDENTITY_INTERNAL_MULTI_ORG_ENABLED?.trim().toLowerCase() === 'true'

export const readInternalOidcConfig = (nativeIssuer: string, env: NodeJS.ProcessEnv = process.env): EntraOidcConfig => {
  const tenantId = env.AUTH_SERVER_ENTRA_TENANT_ID?.trim() ?? ''

  const config: EntraOidcConfig = {
    tenantId,
    clientId: env.AUTH_SERVER_ENTRA_CLIENT_ID?.trim() ?? '',
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    redirectUri: `${nativeIssuer}/auth/internal/callback`
  }

  validateEntraOidcConfig(config)

  return config
}
