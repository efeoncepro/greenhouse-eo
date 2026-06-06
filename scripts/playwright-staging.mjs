#!/usr/bin/env node

import { spawn } from 'node:child_process'

import { resolveStagingAccess } from './lib/vercel-staging-access.mjs'

const log = (...args) => console.error(...args)
const args = process.argv.slice(2)

if (args[0] === '--') {
  args.shift()
}

async function main() {
  log('─── playwright-staging ───')

  const { stagingUrl, bypassSecret, agentSecret, email } = await resolveStagingAccess({
    log,
    includePlaywrightBaseUrl: true
  })

  log(`  target: ${stagingUrl}`)
  log(`  auth:   ${email}`)

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: stagingUrl,
    AGENT_AUTH_BASE_URL: stagingUrl,
    VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret,
    AGENT_AUTH_SECRET: agentSecret,
    AGENT_AUTH_EMAIL: email
  }

  const child = spawn('pnpm', ['exec', 'playwright', 'test', ...args], {
    stdio: 'inherit',
    env
  })

  child.on('error', error => {
    log(`ERROR: failed to start Playwright: ${error.message}`)
    process.exit(1)
  })

  child.on('exit', code => {
    process.exit(code ?? 1)
  })
}

main().catch(error => {
  log(`ERROR: ${error.message}`)
  process.exit(1)
})
