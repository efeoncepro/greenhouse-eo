#!/usr/bin/env node

/**
 * Renueva los dos planos de autenticación de Google Cloud usando Playwright
 * como navegador explícito cuando el operador lo solicita.
 *
 * El comando es deliberadamente manual y local:
 *   pnpm gcloud:auth:playwright
 *   pnpm gcloud:auth:playwright -- --force
 *
 * No imprime URLs OAuth, códigos de autorización, cookies ni contraseñas.
 * La credencial local vive en .auth/, que está ignorado por Git.
 */

import { mkdir, readFile, stat } from 'node:fs/promises'
import { execFile as execFileCallback, spawn, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'

import { PROJECT_ROOT } from './lib/local-env.mjs'

const execFile = promisify(execFileCallback)

const PROJECT_ID = process.env.GREENHOUSE_GCLOUD_PROJECT || 'efeonce-group'
const CREDENTIALS_PATH = `${PROJECT_ROOT}/.auth/gcloud-auth-credentials.json`
const DEFAULT_PROFILE_PATH = `${PROJECT_ROOT}/.auth/gcloud-auth-profile`
const AUTH_TIMEOUT_MS = 180_000
const OAUTH_URL_PATTERN = /https:\/\/accounts\.google\.com\/o\/oauth2\/auth\?[^\s\r\n]+/

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printUsage()
  process.exit(0)
}

const main = async () => {
  const statusBefore = await readAuthStatus()

  if (options.checkOnly) {
    printStatus(statusBefore)

    return
  }

  if (statusBefore.cli && statusBefore.adc && !options.force) {
    console.log('[GCLOUD_AUTH] CLI y ADC ya están vigentes; no se abre Playwright.')
    await runCanonicalVerification()

    return
  }

  const credentials = await readCredentials()
  const profilePath = resolveProfilePath()

  if (options.force || !statusBefore.cli) {
    await runGcloudBrowserFlow({
      args: ['auth', 'login', credentials.email, '--no-launch-browser', '--force'],
      label: 'gcloud CLI',
      credentials,
      profilePath
    })
  }

  const statusAfterCli = await readAuthStatus()

  if (options.force || !statusAfterCli.adc) {
    await runGcloudBrowserFlow({
      // ADC rejects the account positional argument when credentials already exist and exits
      // before emitting an OAuth URL. Omitting it is the documented force-refresh path.
      args: ['auth', 'application-default', 'login', '--no-launch-browser'],
      label: 'Application Default Credentials',
      credentials,
      profilePath
    })
  }

  await runCanonicalVerification()
}

try {
  await main()
} catch (error) {
  const message = redactSensitiveText(error instanceof Error ? error.message : 'fallo no identificado')

  console.error(`[GCLOUD_AUTH] ${message}`)
  process.exitCode = 1
}

function parseArgs(args) {
  const parsed = { checkOnly: false, force: false, help: false }

  for (const arg of args) {
    if (arg === '--') continue

    if (arg === '--check-only') {
      parsed.checkOnly = true
      continue
    }

    if (arg === '--force') {
      parsed.force = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    throw new Error(`opción no reconocida: ${arg}`)
  }

  return parsed
}

function printUsage() {
  console.log(`Uso:
  pnpm gcloud:auth:playwright
  pnpm gcloud:auth:playwright -- --force
  pnpm gcloud:auth:playwright -- --check-only

El flujo normal solo renueva cuando CLI o ADC no están vigentes.
--force obliga a repetir ambos consentimientos OAuth.`)
}

async function readAuthStatus() {
  const [cli, adc] = await Promise.all([
    commandSucceeds('gcloud', ['auth', 'print-access-token', '--quiet']),
    commandSucceeds('gcloud', ['auth', 'application-default', 'print-access-token', '--quiet'])
  ])

  return { cli, adc }
}

function printStatus(status) {
  console.log(`[GCLOUD_AUTH] CLI: ${status.cli ? 'vigente' : 'requiere renovación'}`)
  console.log(`[GCLOUD_AUTH] ADC: ${status.adc ? 'vigente' : 'requiere renovación'}`)
}

async function commandSucceeds(command, args) {
  try {
    await execFile(command, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, CLOUDSDK_CORE_PROJECT: PROJECT_ID },
      maxBuffer: 1024 * 1024
    })

    return true
  } catch {
    return false
  }
}

async function runCanonicalVerification() {
  await new Promise((resolve, reject) => {
    const child = spawn('bash', ['scripts/gcloud-auth-preflight.sh'], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        GREENHOUSE_GCLOUD_AUTH_NONINTERACTIVE: 'true',
        GREENHOUSE_GCLOUD_PROJECT: PROJECT_ID
      },
      stdio: 'inherit'
    })

    child.once('error', reject)
    child.once('close', code => {
      if (code === 0) {
        resolve()

        return
      }

      reject(new Error('la verificación canónica de Gcloud no pasó'))
    })
  })
}

async function readCredentials() {
  const stored = await readStoredCredentials()
  const email = process.env.GCLOUD_AUTH_PLAYWRIGHT_EMAIL || stored?.email || readActiveAccount()
  const password = process.env.GCLOUD_AUTH_PLAYWRIGHT_PASSWORD || stored?.password || null

  if (!email) {
    throw new Error(
      'no hay cuenta configurada; ejecuta pnpm gcloud:auth:playwright:setup o define GCLOUD_AUTH_PLAYWRIGHT_EMAIL'
    )
  }

  return { email, password }
}

async function readStoredCredentials() {
  await assertCredentialPathIsLocal()

  let raw

  try {
    raw = await readFile(CREDENTIALS_PATH, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw new Error('no se pudo leer la credencial local de Gcloud')
  }

  try {
    const metadata = await stat(CREDENTIALS_PATH)

    if ((metadata.mode & 0o077) !== 0) {
      throw new Error('la credencial local debe tener permisos 0600')
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('permisos 0600')) throw error
    throw new Error('no se pudo verificar la protección de la credencial local')
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('la credencial local de Gcloud no tiene un formato válido')
  }

  if (typeof parsed?.email !== 'string' || !parsed.email.includes('@')) {
    throw new Error('la credencial local no contiene una cuenta Google válida')
  }

  if (typeof parsed?.password !== 'string' || parsed.password.length === 0) {
    throw new Error('la credencial local no contiene una clave válida')
  }

  return { email: parsed.email, password: parsed.password }
}

async function assertCredentialPathIsLocal() {
  const relativePath = '.auth/gcloud-auth-credentials.json'
  const tracked = await commandSucceeds('git', ['ls-files', '--error-unmatch', '--', relativePath])
  const ignored = await commandSucceeds('git', ['check-ignore', '--quiet', '--no-index', '--', relativePath])

  if (tracked || !ignored) {
    throw new Error('la credencial local debe permanecer ignorada y fuera del índice Git')
  }
}

function readActiveAccount() {
  try {
    const account = execFileSync('gcloud', ['config', 'get-value', 'account'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    return account && account !== '(unset)' ? account : null
  } catch {
    return null
  }
}

function resolveProfilePath() {
  const configured = process.env.GCLOUD_AUTH_PLAYWRIGHT_PROFILE
  const path = configured ? (configured.startsWith('/') ? configured : `${PROJECT_ROOT}/${configured}`) : DEFAULT_PROFILE_PATH

  return path
}

async function runGcloudBrowserFlow({ args, label, credentials, profilePath }) {
  console.log(`[GCLOUD_AUTH] Iniciando flujo ${label} con Playwright.`)

  const child = spawn('gcloud', args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, CLOUDSDK_CORE_PROJECT: PROJECT_ID },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const output = []
  let authUrl = null

  const capture = chunk => {
    const text = chunk.toString()

    output.push(text)

    if (!authUrl) authUrl = text.match(OAUTH_URL_PATTERN)?.[0] || null
  }

  child.stdout.on('data', capture)
  child.stderr.on('data', capture)

  const exitPromise = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal }))
  })

  try {
    authUrl = await waitForAuthUrl({ child, output, initialUrl: authUrl, exitPromise })
    const code = await authenticateWithPlaywright(authUrl, credentials, profilePath)

    child.stdin.write(`${code}\n`)
    child.stdin.end()

    const result = await exitPromise

    if (result.code !== 0) {
      throw new Error(`${label} rechazó la autorización (${sanitizeOutput(output.join(''))})`)
    }

    console.log(`[GCLOUD_AUTH] Flujo ${label} completado.`)
  } catch (error) {
    if (!child.killed) child.kill('SIGTERM')

    if (error instanceof Error && error.message.startsWith('[GCLOUD_AUTH]')) throw error
    if (error instanceof Error && error.message.includes('rechazó la autorización')) throw error
    throw new Error(
      `Playwright no pudo completar el flujo ${label}: ${redactSensitiveText(error instanceof Error ? error.message : 'fallo no identificado')}`
    )
  }
}

async function waitForAuthUrl({ child, output, initialUrl, exitPromise }) {
  if (initialUrl) return initialUrl

  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    const found = output.join('').match(OAUTH_URL_PATTERN)?.[0]

    if (found) return found

    const finished = await Promise.race([
      exitPromise.then(result => ({ finished: true, result })),
      new Promise(resolve => setTimeout(() => resolve({ finished: false }), 250))
    ])

    if (finished.finished) {
      throw new Error('gcloud terminó antes de entregar la URL OAuth')
    }
  }

  if (!child.killed) child.kill('SIGTERM')
  throw new Error('gcloud no entregó la URL OAuth dentro del tiempo esperado')
}

async function authenticateWithPlaywright(authUrl, credentials, profilePath) {
  const { chromium } = await import('playwright')

  await mkdir(profilePath, { recursive: true })

  let context

  try {
    context = await chromium.launchPersistentContext(profilePath, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 900 }
    })

    const page = context.pages()[0] || (await context.newPage())

    try {
      await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    } catch {
      throw new Error('no se pudo abrir la pantalla OAuth de Google')
    }

    const deadline = Date.now() + AUTH_TIMEOUT_MS

    while (Date.now() < deadline) {
      const code = extractAuthorizationCode(page.url())

      if (code) return code

      if (await clickAccount(page, credentials.email)) continue
      if (await clickOtherAccount(page)) continue
      if (await fillEmail(page, credentials.email)) continue
      if (await fillPassword(page, credentials.password)) continue
      if (await clickConsent(page)) continue

      await page.waitForTimeout(350)
    }

    throw new Error('la ventana OAuth no entregó un código dentro del tiempo esperado')
  } finally {
    if (context) await context.close().catch(() => {})
  }
}

function extractAuthorizationCode(value) {
  let url

  try {
    url = new URL(value)
  } catch {
    return null
  }

  const isCallback =
    url.hostname === 'sdk.cloud.google.com' ||
    url.hostname === 'localhost' ||
    url.pathname.includes('authcode')

  if (!isCallback) return null

  const code = url.searchParams.get('code')

  return code && code.length > 10 ? code : null
}

async function clickAccount(page, email) {
  if (!(await isAccountChooser(page))) return false

  const account = page.getByRole('link', { name: new RegExp(escapeRegExp(email), 'i') }).first()

  if (!(await isVisible(account))) return false

  return safeClick(account)
}

async function clickOtherAccount(page) {
  if (!(await isAccountChooser(page))) return false

  const other = page.getByRole('link', { name: /usar otra cuenta|use another account/i }).first()

  if (!(await isVisible(other))) return false

  return safeClick(other)
}

async function fillEmail(page, email) {
  const field = page.getByRole('textbox', { name: /correo electrónico|email|e-mail/i }).first()

  if (!(await isVisible(field))) return false

  await field.fill(email)
  await clickNext(page)

  return true
}

async function fillPassword(page, password) {
  const field = page.getByRole('textbox', { name: /contraseña|password/i }).first()

  if (!(await isVisible(field))) return false

  if (!password) {
    throw new Error('Google pidió la clave, pero no existe una credencial local configurada')
  }

  await field.fill(password)
  await clickNext(page)

  return true
}

async function clickNext(page) {
  const next = page.getByRole('button', { name: /siguiente|next/i }).first()

  if (!(await isVisible(next))) return

  if (await safeClick(next)) return

  try {
    await next.press('Enter', { timeout: 1_500 })
  } catch {
    // La navegación puede haber separado el botón entre ambos intentos.
  }
}

async function clickConsent(page) {
  const allow = page.getByRole('button', { name: /^(permitir|allow)$/i }).first()

  if (await isVisible(allow)) {
    return safeClick(allow)
  }

  const continueButton = page.getByRole('button', { name: /^(continuar|continue)$/i }).first()

  if (await isVisible(continueButton)) {
    return safeClick(continueButton)
  }

  return false
}

async function safeClick(locator) {
  try {
    await locator.click({ timeout: 5_000 })

    return true
  } catch {
    return false
  }
}

async function isVisible(locator) {
  try {
    return await locator.isVisible({ timeout: 300 })
  } catch {
    return false
  }
}

async function isAccountChooser(page) {
  const heading = page.getByRole('heading', { name: /selecciona una cuenta|choose an account/i }).first()

  return isVisible(heading)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeOutput(value) {
  return redactSensitiveText(value)
    .trim()
    .slice(-600)
    .replace(/\s+/g, ' ')
}

function redactSensitiveText(value) {
  return value
    .replace(/https?:\/\/[^\s)\]}>'"]+/gi, '<url-redacted>')
    .replace(/(?:authorization\s+code|code|state|token|sid|rapt)\s*[:=]\s*[^\s&]+/gi, '<sensitive-value-redacted>')
}
