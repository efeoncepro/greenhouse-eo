import 'server-only'

import { getAuthReadinessSnapshot, type AuthReadinessSnapshot } from '@/lib/auth/readiness'
import { resolveSecret } from '@/lib/secrets/secret-manager'

export const authSecrets = await (async () => {
  const [nextAuthSecret, azureAdClientSecret, googleClientSecret] = await Promise.all([
    resolveSecret({
      envVarName: 'NEXTAUTH_SECRET'
    }),
    resolveSecret({
      envVarName: 'AZURE_AD_CLIENT_SECRET'
    }),
    resolveSecret({
      envVarName: 'GOOGLE_CLIENT_SECRET'
    })
  ])

  return {
    nextAuth: nextAuthSecret,
    azureAdClient: azureAdClientSecret,
    googleClient: googleClientSecret
  }
})()

/**
 * TASK-742 Capa 2 — Compute the readiness snapshot using the same secrets
 * the providers use. Cached 30s in `getAuthReadinessSnapshot`.
 */
export const getCurrentAuthReadiness = (): Promise<AuthReadinessSnapshot> =>
  getAuthReadinessSnapshot({
    azureAdClientSecret: authSecrets.azureAdClient.value,
    googleClientSecret: authSecrets.googleClient.value,
    nextAuthSecret: authSecrets.nextAuth.value
  })

export const getNextAuthSecret = () => {
  const secret = authSecrets.nextAuth.value?.trim()

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  return secret
}

export const getAzureAdClientSecret = () => authSecrets.azureAdClient.value?.trim() || null

export const getGoogleClientSecret = () => authSecrets.googleClient.value?.trim() || null

export const hasMicrosoftAuthProvider = () =>
  Boolean(process.env.AZURE_AD_CLIENT_ID?.trim() && getAzureAdClientSecret())

export const hasGoogleAuthProvider = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && getGoogleClientSecret())
