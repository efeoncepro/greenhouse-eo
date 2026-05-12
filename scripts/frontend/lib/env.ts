/**
 * Env switch canónico para captura visual.
 *
 * 3 envs soportados V1:
 * - `local`     → http://localhost:3000 (dev server local; sin bypass)
 * - `dev-agent` → custom dev domain con SSO bypass (raramente útil; staging es mejor)
 * - `staging`   → .vercel.app de staging con bypass (default canónico para agentes)
 *
 * Production está BLOQUEADO por default. Triple gate (Slice 2):
 *   GREENHOUSE_CAPTURE_ALLOW_PROD=true + --prod flag + capability check.
 */

export type CaptureEnv = 'local' | 'staging' | 'dev-agent' | 'production'

export interface EnvConfig {
  /** Base URL al que apunta la captura */
  baseUrl: string

  /** Path al storageState.json relativo al repo root */
  storageStatePath: string

  /** Email del agente (para refresh de session si expira) */
  agentEmail: string

  /** Bypass secret para Vercel SSO (solo en .vercel.app URLs) */
  bypassSecret?: string

  /** Si production, requiere triple gate (slice 2 enforcement) */
  isProduction: boolean
}

const STAGING_VERCEL_URL = 'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app'

/**
 * Resuelve config por env name. Lee `.env.local` vía process.env (caller hace `set -a; source`).
 *
 * Throws si:
 * - env name desconocido
 * - production sin triple gate
 * - bypass secret ausente para staging
 */
export const resolveEnvConfig = (env: CaptureEnv): EnvConfig => {
  const agentEmail = process.env.AGENT_AUTH_EMAIL ?? 'agent@greenhouse.efeonce.org'

  switch (env) {
    case 'local':
      return {
        baseUrl: process.env.AGENT_AUTH_BASE_URL ?? 'http://localhost:3000',
        storageStatePath: '.auth/storageState.local-agent.json',
        agentEmail,
        isProduction: false
      }

    case 'staging': {
      const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

      if (!bypassSecret) {
        throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET ausente en .env.local — requerido para staging captures')
      }

      return {
        baseUrl: STAGING_VERCEL_URL,
        storageStatePath: '.auth/storageState.staging.json',
        agentEmail,
        bypassSecret,
        isProduction: false
      }
    }

    case 'dev-agent':
      return {
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        storageStatePath: '.auth/storageState.dev-agent.json',
        agentEmail,
        isProduction: false
      }

    case 'production': {
      const allowProd = process.env.GREENHOUSE_CAPTURE_ALLOW_PROD === 'true'

      if (!allowProd) {
        throw new Error(
          'Production captures disabled. Triple gate requerido:\n' +
            '  1. GREENHOUSE_CAPTURE_ALLOW_PROD=true env var\n' +
            '  2. --prod flag en CLI\n' +
            '  3. capability platform.frontend.capture_prod (futuro slice 2.1)'
        )
      }

      return {
        baseUrl: 'https://greenhouse.efeoncepro.com',
        storageStatePath: '.auth/storageState.production.json',
        agentEmail,
        isProduction: true
      }
    }

    default: {
      const exhaustive: never = env

      throw new Error(`Unknown env: ${exhaustive as string}`)
    }
  }
}

export const isValidEnv = (value: string): value is CaptureEnv =>
  value === 'local' || value === 'staging' || value === 'dev-agent' || value === 'production'
