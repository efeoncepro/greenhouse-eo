#!/usr/bin/env node

/**
 * Playwright / Agent Auth Setup
 *
 * Generates a Playwright storageState JSON file with a valid NextAuth
 * session cookie.  Two modes:
 *
 * 1. API mode (default) — calls /api/auth/agent-session with AGENT_AUTH_SECRET
 * 2. Credential mode   — uses Playwright to fill the login form with email/password
 *
 * Usage:
 *   # API mode (headless, no browser needed)
 *   AGENT_AUTH_SECRET=<secret> AGENT_AUTH_EMAIL=julio.reyes@efeonce.org \
 *     node scripts/playwright-auth-setup.mjs
 *
 *   # Credential mode (opens browser, fills login form)
 *   AGENT_AUTH_MODE=credentials AGENT_AUTH_EMAIL=julio.reyes@efeonce.org \
 *     AGENT_AUTH_PASSWORD=<password> node scripts/playwright-auth-setup.mjs
 *
 * Output:
 *   .auth/storageState.json  — pass this to Playwright's storageState option
 *
 * Environment:
 *   AGENT_AUTH_SECRET       — shared secret (API mode)
 *   AGENT_AUTH_EMAIL        — email of the user to authenticate as
 *   AGENT_AUTH_PASSWORD     — password (credential mode only)
 *   AGENT_AUTH_MODE         — 'api' (default) or 'credentials'
 *   AGENT_AUTH_BASE_URL     — base URL, default http://localhost:3000
 *   AGENT_AUTH_STORAGE_PATH — output path, default .auth/storageState.json
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const BASE_URL = process.env.AGENT_AUTH_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const MODE = process.env.AGENT_AUTH_MODE || 'api'
const EMAIL = process.env.AGENT_AUTH_EMAIL
const STORAGE_PATH = resolve(process.env.AGENT_AUTH_STORAGE_PATH || '.auth/storageState.json')

if (!EMAIL) {
  console.error('ERROR: AGENT_AUTH_EMAIL is required.')
  process.exit(1)
}

/**
 * API mode — calls the agent-session endpoint to get a signed cookie
 * without needing a browser at all.
 */
async function authViaApi() {
  const secret = process.env.AGENT_AUTH_SECRET

  if (!secret) {
    console.error('ERROR: AGENT_AUTH_SECRET is required for API auth mode.')
    process.exit(1)
  }

  const url = `${BASE_URL}/api/auth/agent-session`
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

  console.log(`→ POST ${url}  (email: ${EMAIL})${bypassSecret ? '  [vercel bypass on]' : ''}`)

  const headers = { 'Content-Type': 'application/json' }

  if (bypassSecret) {
    headers['x-vercel-protection-bypass'] = bypassSecret
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ secret, email: EMAIL })
  })

  if (!res.ok) {
    const body = await res.text()

    console.error(`ERROR: Agent session request failed (${res.status}): ${body}`)
    process.exit(1)
  }

  const data = await res.json()
  const { cookieName, cookieValue, portalHomePath } = data

  const isSecure = BASE_URL.startsWith('https')
  const requiresSecureCookie = isSecure || cookieName.startsWith('__Secure-') || cookieName.startsWith('__Host-')
  const domain = new URL(BASE_URL).hostname

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain,
        path: '/',
        httpOnly: true,
        secure: requiresSecureCookie,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 86400 // 24h
      }
    ],
    origins: [
      {
        origin: BASE_URL,
        localStorage: []
      }
    ]
  }

  await mkdir(dirname(STORAGE_PATH), { recursive: true })
  await writeFile(STORAGE_PATH, JSON.stringify(storageState, null, 2))

  console.log(`✓ storageState saved to ${STORAGE_PATH}`)
  console.log(`  cookie: ${cookieName}`)
  console.log(`  user:   ${data.email} (${data.userId})`)
  console.log(`  home:   ${portalHomePath}`)
}

/**
 * Credential mode — opens a real browser with Playwright, fills the
 * login form, and saves the resulting session cookies.
 */
async function authViaCredentials() {
  const password = process.env.AGENT_AUTH_PASSWORD

  if (!password) {
    console.error('ERROR: AGENT_AUTH_PASSWORD is required for credentials auth mode.')
    process.exit(1)
  }

  let chromium

  try {
    const pw = await import('playwright')

    chromium = pw.chromium
  } catch {
    console.error('ERROR: Playwright is not installed. Run: pnpm add -D playwright @playwright/test')
    process.exit(1)
  }

  console.log(`→ Opening browser for ${BASE_URL}/login  (email: ${EMAIL})`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

  // Fill the credentials form
  await page.fill('input[type="email"], input[name="email"]', EMAIL)
  await page.fill('input[type="password"], input[name="password"]', password)

  // Submit
  await page.click('button[type="submit"]')

  // Wait for redirect away from /login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

  console.log(`✓ Logged in, now at: ${page.url()}`)

  // Save storage state
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
  await context.storageState({ path: STORAGE_PATH })

  await browser.close()

  console.log(`✓ storageState saved to ${STORAGE_PATH}`)
}

// ── Main ──────────────────────────────────────────────────────────────
try {
  if (MODE === 'credentials') {
    await authViaCredentials()
  } else {
    await authViaApi()
  }
} catch (error) {
  console.error('Agent auth setup failed:', error)
  process.exit(1)
}
