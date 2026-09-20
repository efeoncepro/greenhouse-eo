import 'server-only'

import { OAuth2Client } from 'google-auth-library'

import { resolveGreenhouseBaseUrl } from '@/lib/navigation/deep-links/base-url'
import { resolveSecret } from '@/lib/secrets/secret-manager'

import { GA4_READ_SCOPE } from './contracts'

export interface Ga4OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export const resolveGa4OAuthConfig = async (env: NodeJS.ProcessEnv = process.env): Promise<Ga4OAuthConfig | null> => {
  const [id, secret] = await Promise.all([
    resolveSecret({ envVarName: 'GOOGLE_GA4_OAUTH_CLIENT_ID', secretRefEnvVarName: 'GOOGLE_GA4_OAUTH_CLIENT_ID_SECRET_REF', env }),
    resolveSecret({ envVarName: 'GOOGLE_GA4_OAUTH_CLIENT_SECRET', secretRefEnvVarName: 'GOOGLE_GA4_OAUTH_CLIENT_SECRET_SECRET_REF', env })
  ])

  if (!id.value?.trim() || !secret.value?.trim()) return null

  return {
    clientId: id.value.trim(),
    clientSecret: secret.value.trim(),
    redirectUri: env.GOOGLE_GA4_OAUTH_REDIRECT_URI?.trim() ||
      `${resolveGreenhouseBaseUrl({ env })}/api/admin/growth/analytics-ga4/oauth/callback`
  }
}

const clientFor = (config: Ga4OAuthConfig): OAuth2Client => new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri)

export const buildGa4ConsentUrl = (config: Ga4OAuthConfig, state: string): string =>
  clientFor(config).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
    scope: [GA4_READ_SCOPE],
    state
  })

export const exchangeGa4Code = async (config: Ga4OAuthConfig, code: string) => {
  const { tokens } = await clientFor(config).getToken(code)

  return {
    refreshToken: tokens.refresh_token ?? null,
    scopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : []
  }
}

export const refreshGa4AccessToken = async (config: Ga4OAuthConfig, refreshToken: string): Promise<string> => {
  const client = clientFor(config)

  client.setCredentials({ refresh_token: refreshToken })
  const { token } = await client.getAccessToken()

  if (!token) throw new Error('GA4 access token unavailable')

  return token
}
