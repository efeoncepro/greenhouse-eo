import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

import { ENV_LOCAL_PATH, readEnvFile } from './local-env.mjs'

export const VERCEL_PROJECT_ID = 'prj_d9v6gihlDq4k1EXazPvzWhSU0qbl'
export const VERCEL_TEAM_ID = 'efeonce-7670142f'
export const DEFAULT_STAGING_URL = 'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app'
export const DEFAULT_AGENT_EMAIL = 'agent@greenhouse.efeonce.org'

const noop = () => {}

export async function getVercelCliToken({ log = noop } = {}) {
  const paths = [
    resolve(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
    resolve(homedir(), '.local/share/com.vercel.cli/auth.json')
  ]

  for (const path of paths) {
    try {
      const data = JSON.parse(await readFile(path, 'utf-8'))

      if (data.token) return data.token
    } catch {
      // Try the next platform-specific path.
    }
  }

  try {
    execSync('vercel whoami', { stdio: 'pipe' })
    log('  bypass: Vercel CLI authenticated, but token file was not found at expected paths')
  } catch {
    // Not authenticated or CLI unavailable.
  }

  return null
}

export async function fetchBypassSecretFromApi(token) {
  const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_TEAM_ID}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) {
    throw new Error(`Vercel API returned ${res.status}: ${await res.text()}`)
  }

  const project = await res.json()
  const entries = Object.entries(project.protectionBypass || {})
  const automationEntry = entries.find(([, value]) => typeof value === 'object' && value.scope === 'automation-bypass')

  if (!automationEntry) {
    throw new Error(
      'No automation-bypass entry in project protectionBypass. ' +
        'Enable "Protection Bypass for Automation" in Vercel Project Settings > Deployment Protection.'
    )
  }

  return automationEntry[0]
}

export async function resolveBypassSecret({ envLocal, log = noop, persist = true } = {}) {
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    log('  bypass: from env')

    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  const localEnv = envLocal ?? (await readEnvFile(ENV_LOCAL_PATH))

  if (localEnv.VERCEL_AUTOMATION_BYPASS_SECRET) {
    log('  bypass: from .env.local')

    return localEnv.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  log('  bypass: not in env — fetching from Vercel API...')
  const token = await getVercelCliToken({ log })

  if (!token) {
    throw new Error(
      'Cannot resolve VERCEL_AUTOMATION_BYPASS_SECRET.\n' +
        'Options:\n' +
        '  1. Authenticate Vercel CLI: vercel login\n' +
        '  2. Add the system-managed VERCEL_AUTOMATION_BYPASS_SECRET to .env.local\n' +
        '  3. Set it in the current environment for this run'
    )
  }

  const secret = await fetchBypassSecretFromApi(token)

  log('  bypass: fetched from Vercel API')

  if (persist) {
    await persistBypassSecret(secret, { log })
  }

  return secret
}

export async function persistBypassSecret(secret, { log = noop } = {}) {
  try {
    let content = await readFile(ENV_LOCAL_PATH, 'utf-8')

    if (!content.includes('VERCEL_AUTOMATION_BYPASS_SECRET')) {
      const block =
        '\n# Vercel Deployment Protection bypass (auto-fetched, system-managed)\n' +
        `VERCEL_AUTOMATION_BYPASS_SECRET=${secret}\n`

      content += block
      await writeFile(ENV_LOCAL_PATH, content)
      log('  bypass: saved to .env.local for future runs')
    }
  } catch {
    log('  bypass: could not persist to .env.local (non-blocking)')
  }
}

export async function resolveStagingAccess({ log = noop, persistBypass = true, includePlaywrightBaseUrl = false } = {}) {
  const envLocal = await readEnvFile(ENV_LOCAL_PATH)

  const stagingUrl =
    process.env.STAGING_URL ||
    envLocal.STAGING_URL ||
    (includePlaywrightBaseUrl ? process.env.PLAYWRIGHT_BASE_URL || envLocal.PLAYWRIGHT_BASE_URL : undefined) ||
    DEFAULT_STAGING_URL

  const bypassSecret = await resolveBypassSecret({
    envLocal,
    log,
    persist: persistBypass
  })

  const agentSecret = process.env.AGENT_AUTH_SECRET || envLocal.AGENT_AUTH_SECRET

  if (!agentSecret) {
    throw new Error('AGENT_AUTH_SECRET not found in environment or .env.local')
  }

  const email = process.env.AGENT_AUTH_EMAIL || envLocal.AGENT_AUTH_EMAIL || DEFAULT_AGENT_EMAIL

  return {
    stagingUrl,
    bypassSecret,
    agentSecret,
    email
  }
}
