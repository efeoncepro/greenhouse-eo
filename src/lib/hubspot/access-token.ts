import 'server-only'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-1230 — Resolver canónico del HubSpot private app token (compartido).
 *
 * Único punto para obtener el token de la API HubSpot v3: env var `HUBSPOT_ACCESS_TOKEN`
 * (CLI/local) con fallback a GCP Secret Manager `hubspot-access-token`. Centraliza lo
 * que antes vivía privado en `list-services-for-company.ts` — NUNCA un cliente/secret
 * HubSpot paralelo (regla bridge). El token NUNCA se expone al browser.
 */
const TOKEN_ENV_VAR = 'HUBSPOT_ACCESS_TOKEN'
const TOKEN_GCP_SECRET = 'gcp:hubspot-access-token'

export const getHubSpotAccessToken = async (env: NodeJS.ProcessEnv = process.env): Promise<string> => {
  const envValue = env[TOKEN_ENV_VAR]?.trim()

  if (envValue) return envValue

  const token = await resolveSecretByRef(TOKEN_GCP_SECRET)

  if (!token) {
    throw new Error(`HubSpot access token not found (env ${TOKEN_ENV_VAR} ni ${TOKEN_GCP_SECRET})`)
  }

  return token
}
