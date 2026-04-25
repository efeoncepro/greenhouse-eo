import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const STORAGE_PATH = resolve(process.env.AGENT_AUTH_STORAGE_PATH || '.auth/storageState.json')
const MAX_STORAGE_AGE_MS = 20 * 60 * 1000
const SKIP_AUTH_SETUP = process.env.PLAYWRIGHT_SKIP_AUTH_SETUP === 'true'

const RESOLVED_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.AGENT_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

export default async function globalSetup() {
  if (SKIP_AUTH_SETUP) {
    if (!existsSync(STORAGE_PATH)) {
      throw new Error(
        `PLAYWRIGHT_SKIP_AUTH_SETUP=true but ${STORAGE_PATH} does not exist. Run "pnpm test:e2e:setup" first.`
      )
    }

    return
  }

  if (existsSync(STORAGE_PATH)) {
    const age = Date.now() - (await stat(STORAGE_PATH)).mtimeMs

    if (age < MAX_STORAGE_AGE_MS) {
      return
    }
  }

  if (!process.env.AGENT_AUTH_SECRET) {
    throw new Error(
      'AGENT_AUTH_SECRET is required for Playwright auth setup. Set it in .env.local or export it before running the suite.'
    )
  }

  await runAuthSetup()
}

function runAuthSetup(): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('node', ['scripts/playwright-auth-setup.mjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        AGENT_AUTH_BASE_URL: RESOLVED_BASE_URL
      }
    })

    child.on('error', rejectPromise)
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`playwright-auth-setup.mjs exited with code ${code}`))
      }
    })
  })
}
