#!/usr/bin/env node

/**
 * staging-request — Authenticated requests to Vercel Staging
 *
 * Handles the full pipeline automatically:
 *   1. Resolves the Vercel protection bypass secret (from env, .env.local, or Vercel API)
 *   2. Authenticates as the agent user via /api/auth/agent-session
 *   3. Executes the actual API request with bypass header + session cookie
 *
 * Usage:
 *   # GET request (default)
 *   node scripts/staging-request.mjs /api/agency/operations
 *
 *   # POST with body
 *   node scripts/staging-request.mjs POST /api/some/endpoint '{"key":"value"}'
 *
 *   # Via pnpm
 *   pnpm staging:request /api/agency/operations
 *   pnpm staging:request POST /api/some/endpoint '{"key":"value"}'
 *
 *   # Pipe-friendly — outputs raw JSON to stdout, logs to stderr
 *   pnpm staging:request /api/agency/operations | jq '.subsystems'
 *
 *   # Pretty-print with built-in filter
 *   pnpm staging:request /api/agency/operations --pretty
 *
 *   # Search for keys matching a pattern
 *   pnpm staging:request /api/agency/operations --grep reactive
 *
 * Environment (all optional — auto-resolved if not set):
 *   VERCEL_AUTOMATION_BYPASS_SECRET  — skip API lookup if already known
 *   AGENT_AUTH_SECRET                — from .env.local (auto-read)
 *   AGENT_AUTH_EMAIL                 — default: agent@greenhouse.efeonce.org
 *   STAGING_URL                      — override staging base URL
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

// ───── Config ─────

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local')

const VERCEL_PROJECT_ID = 'prj_d9v6gihlDq4k1EXazPvzWhSU0qbl'
const VERCEL_TEAM_ID = 'efeonce-7670142f'

const DEFAULT_STAGING_URL = 'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app'

const DEFAULT_AGENT_EMAIL = 'agent@greenhouse.efeonce.org'

// ───── Helpers ─────

const log = (...args) => console.error(...args) // logs go to stderr, data to stdout

function parseEnvFile(content) {
  const vars = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')

    if (eqIdx === -1) continue
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }

  return vars
}

async function readEnvLocal() {
  try {
    return parseEnvFile(await readFile(ENV_LOCAL_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

// ───── Bypass secret resolution ─────

async function getVercelCliToken() {
  // macOS: ~/Library/Application Support/com.vercel.cli/auth.json
  // Linux: ~/.local/share/com.vercel.cli/auth.json
  const paths = [
    resolve(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
    resolve(homedir(), '.local/share/com.vercel.cli/auth.json')
  ]

  for (const p of paths) {
    try {
      const data = JSON.parse(await readFile(p, 'utf-8'))

      if (data.token) return data.token
    } catch {
      // try next
    }
  }

  // Fallback: try `vercel whoami` to confirm CLI is authenticated
  try {
    execSync('vercel whoami', { stdio: 'pipe' })

    // CLI is authenticated but we couldn't find token file — shouldn't happen
    log('⚠ Vercel CLI is authenticated but token file not found at expected paths')
  } catch {
    // not authenticated
  }

  return null
}

async function fetchBypassSecretFromApi(token) {
  const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_TEAM_ID}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) {
    throw new Error(`Vercel API returned ${res.status}: ${await res.text()}`)
  }

  const project = await res.json()
  const entries = Object.entries(project.protectionBypass || {})

  const automationEntry = entries.find(([, v]) => typeof v === 'object' && v.scope === 'automation-bypass')

  if (!automationEntry) {
    throw new Error(
      'No automation-bypass entry in project protectionBypass. ' +
        'Enable "Protection Bypass for Automation" in Vercel Project Settings > Deployment Protection.'
    )
  }

  return automationEntry[0] // the key IS the secret
}

async function resolveBypassSecret(envLocal) {
  // 1. From environment
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    log('  bypass: from env')

    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  // 2. From .env.local
  if (envLocal.VERCEL_AUTOMATION_BYPASS_SECRET) {
    log('  bypass: from .env.local')

    return envLocal.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  // 3. Fetch from Vercel API using CLI token
  log('  bypass: not in env — fetching from Vercel API...')
  const token = await getVercelCliToken()

  if (!token) {
    throw new Error(
      'Cannot resolve VERCEL_AUTOMATION_BYPASS_SECRET.\n' +
        'Options:\n' +
        '  1. Add VERCEL_AUTOMATION_BYPASS_SECRET to .env.local\n' +
        '  2. Authenticate Vercel CLI: vercel login\n' +
        '  3. Set it in environment: export VERCEL_AUTOMATION_BYPASS_SECRET=...'
    )
  }

  const secret = await fetchBypassSecretFromApi(token)

  log('  bypass: fetched from Vercel API ✓')

  // Persist to .env.local for future runs
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

  return secret
}

// ───── Agent auth ─────

async function agentAuth({ stagingUrl, bypassSecret, agentSecret, email }) {
  const url = `${stagingUrl}/api/auth/agent-session`

  log(`  auth:  POST ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': bypassSecret
    },
    body: JSON.stringify({ secret: agentSecret, email })
  })

  if (!res.ok) {
    const body = await res.text()
    const isHtml = body.trimStart().startsWith('<')

    if (isHtml) {
      throw new Error(
        `Agent auth returned HTML (${res.status}) — Vercel SSO wall not bypassed.\n` +
          'The bypass secret may be stale. Delete VERCEL_AUTOMATION_BYPASS_SECRET from .env.local and retry.'
      )
    }

    throw new Error(`Agent auth failed (${res.status}): ${body}`)
  }

  return res.json()
}

// ───── Main request ─────

async function makeRequest({ stagingUrl, bypassSecret, cookie, method, path, body }) {
  const url = `${stagingUrl}${path}`

  log(`  req:   ${method} ${url}`)

  const headers = {
    'x-vercel-protection-bypass': bypassSecret,
    Cookie: cookie
  }

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body || undefined
  })

  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  log(`  resp:  HTTP ${res.status} (${contentType.split(';')[0]})`)

  if (!res.ok) {
    log(`  ERROR: ${text.slice(0, 500)}`)
    process.exit(1)
  }

  return text
}

// ───── Search helper ─────

function searchRecursive(obj, pattern, path = '') {
  const results = []
  const re = new RegExp(pattern, 'i')

  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${k}` : k

      if (re.test(k)) {
        results.push({ path: fullPath, value: v })
      }

      results.push(...searchRecursive(v, pattern, fullPath))
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...searchRecursive(item, pattern, `${path}[${i}]`))
    })
  } else if (typeof obj === 'string' && re.test(obj)) {
    results.push({ path, value: obj })
  }

  return results
}

// ───── CLI ─────

async function main() {
  const args = process.argv.slice(2)
  let method = 'GET'
  let path = ''
  let body = null
  let pretty = false
  let grepPattern = null

  // Parse args
  const positional = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pretty') {
      pretty = true
    } else if (args[i] === '--grep' && i + 1 < args.length) {
      grepPattern = args[++i]
    } else {
      positional.push(args[i])
    }
  }

  if (positional.length === 0) {
    log('Usage: staging-request [METHOD] <path> [body] [--pretty] [--grep <pattern>]')
    log('  staging-request /api/agency/operations')
    log('  staging-request /api/agency/operations --grep reactive')
    log('  staging-request POST /api/some/endpoint \'{"key":"value"}\'')
    process.exit(1)
  }

  if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(positional[0]?.toUpperCase())) {
    method = positional.shift().toUpperCase()
  }

  path = positional[0]

  if (!path.startsWith('/')) path = '/' + path
  body = positional[1] || null

  // Resolve secrets
  log('─── staging-request ───')
  const envLocal = await readEnvLocal()
  const stagingUrl = process.env.STAGING_URL || DEFAULT_STAGING_URL
  const bypassSecret = await resolveBypassSecret(envLocal)

  const agentSecret = process.env.AGENT_AUTH_SECRET || envLocal.AGENT_AUTH_SECRET

  if (!agentSecret) {
    log('ERROR: AGENT_AUTH_SECRET not found in environment or .env.local')
    process.exit(1)
  }

  const email = process.env.AGENT_AUTH_EMAIL || envLocal.AGENT_AUTH_EMAIL || DEFAULT_AGENT_EMAIL

  // Authenticate
  const authData = await agentAuth({
    stagingUrl,
    bypassSecret,
    agentSecret,
    email
  })

  log(`  auth:  ok ✓ user=${authData.userId}`)

  const cookie = `${authData.cookieName}=${authData.cookieValue}`

  // Make request
  const responseText = await makeRequest({
    stagingUrl,
    bypassSecret,
    cookie,
    method,
    path,
    body
  })

  // Output
  if (grepPattern) {
    try {
      const data = JSON.parse(responseText)
      const matches = searchRecursive(data, grepPattern)

      if (matches.length === 0) {
        log(`  grep:  no matches for "${grepPattern}"`)
      } else {
        log(`  grep:  ${matches.length} match(es) for "${grepPattern}"`)

        for (const m of matches) {
          log(`\n  ── ${m.path} ──`)

          const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value, null, 2)

          console.log(val)
        }
      }
    } catch {
      log('  grep:  response is not JSON, searching as text')
      const re = new RegExp(`.*${grepPattern}.*`, 'gi')
      const lineMatches = responseText.match(re)

      if (lineMatches) {
        lineMatches.forEach(l => console.log(l))
      } else {
        log(`  grep:  no matches for "${grepPattern}"`)
      }
    }
  } else if (pretty) {
    try {
      console.log(JSON.stringify(JSON.parse(responseText), null, 2))
    } catch {
      console.log(responseText)
    }
  } else {
    console.log(responseText)
  }
}

main().catch(err => {
  log(`\n✗ ${err.message}`)
  process.exit(1)
})
