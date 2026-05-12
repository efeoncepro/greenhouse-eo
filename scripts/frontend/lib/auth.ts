/**
 * Auth wrapper: delega a scripts/playwright-auth-setup.mjs (canónico).
 *
 * Garantiza single source of truth para agent-session — NUNCA reinventar
 * la creación del cookie next-auth fuera de ese script.
 *
 * 3 paths:
 *
 * 1. `ensureStorageStateFresh(env)` — verifica que el storageState exista
 *    y no esté expirado. Si falta o está stale, llama a setup.
 *
 * 2. `refreshStorageState(env)` — fuerza re-creación (llama setup).
 *    Usado cuando captura detecta redirect a /login → stale auth.
 *
 * 3. `getCookieExpiryHoursLeft(env)` — telemetría para decidir refresh
 *    proactivo (cookies caducan a 24h por default en agent-session).
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { CaptureEnv, EnvConfig } from './env'

const SETUP_SCRIPT = 'scripts/playwright-auth-setup.mjs'

const STORAGE_STATE_STALE_THRESHOLD_HOURS = 1

interface StorageStateFile {
  cookies: Array<{
    name: string
    expires?: number
  }>
}

const readSessionCookieExpiry = (path: string): number | null => {
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as StorageStateFile
    const session = parsed.cookies.find(c => c.name.includes('next-auth.session-token'))

    return session?.expires ?? null
  } catch {
    return null
  }
}

export const getCookieExpiryHoursLeft = (config: EnvConfig): number | null => {
  const path = resolve(config.storageStatePath)

  if (!existsSync(path)) return null

  const expiresUnix = readSessionCookieExpiry(path)

  if (!expiresUnix) return null

  const now = Date.now() / 1000

  return (expiresUnix - now) / 3600
}

export const refreshStorageState = (env: CaptureEnv, config: EnvConfig): void => {
  const envVars = {
    ...process.env,
    AGENT_AUTH_BASE_URL: config.baseUrl,
    AGENT_AUTH_EMAIL: config.agentEmail,
    AGENT_AUTH_STORAGE_PATH: config.storageStatePath,
    ...(config.bypassSecret ? { VERCEL_AUTOMATION_BYPASS_SECRET: config.bypassSecret } : {})
  }

  const result = spawnSync('node', [SETUP_SCRIPT], {
    env: envVars as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    const stderr = result.stderr ?? ''
    const stdout = result.stdout ?? ''

    throw new Error(`Agent session refresh failed for env=${env}:\n${stderr || stdout}`)
  }
}

export const ensureStorageStateFresh = (env: CaptureEnv, config: EnvConfig): void => {
  const hoursLeft = getCookieExpiryHoursLeft(config)

  if (hoursLeft === null) {
    refreshStorageState(env, config)

    return
  }

  if (hoursLeft < STORAGE_STATE_STALE_THRESHOLD_HOURS) {
    refreshStorageState(env, config)
  }
}
