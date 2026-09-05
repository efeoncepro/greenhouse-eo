/** TASK-1836 — configuration is pinned by the runtime, never selected by a login request. */
import { validateEntraOidcConfig, type EntraOidcConfig } from './oidc'

export const internalAuthEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.AUTH_SERVER_INTERNAL_AUTH_ENABLED?.trim().toLowerCase() === 'true'

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
