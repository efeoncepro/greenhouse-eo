#!/usr/bin/env node

/**
 * Descubre oportunidades visibles en LicitaLAB mediante un perfil Chrome aislado.
 *
 * El runner no descarta, recomienda, crea vistas, cambia filtros, presenta ofertas ni
 * escribe en HubSpot. Produce códigos para que el MCP hidrate ficha y documentos.
 */

import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { execFile as execFileCallback } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { promisify } from 'node:util'

import { PROJECT_ROOT } from './lib/local-env.mjs'
import { parseLicitaLabOpportunityCells, parseLicitaLabRadarArgs } from './lib/licitalab-radar.mjs'

const execFile = promisify(execFileCallback)
const credentialsPath = `${PROJECT_ROOT}/.auth/licitalab-auth-credentials.json`
const profilePath = `${PROJECT_ROOT}/.auth/licitalab-auth-profile`
const reportsDir = `${PROJECT_ROOT}/.auth/licitalab-radar-reports`
const defaultUrl = process.env.LICITALAB_AUTH_URL || 'https://app.licitalab.cl/'
const options = parseLicitaLabRadarArgs(process.argv.slice(2))

if (options.help) {
  printUsage()
  process.exit(0)
}

let context

try {
  await main()
} catch (error) {
  console.error(`[LICITALAB_RADAR] ${safeMessage(error)}`)
  process.exitCode = 1
} finally {
  await context?.close().catch(() => {})
}

async function main() {
  await assertLocalPaths()
  const credentials = await readCredentialsOptional()

  if (options.checkOnly) {
    const credentialState = credentials ? 'credencial local disponible' : 'sin credencial local'

    console.log(`[LICITALAB_RADAR] Perfil aislado listo; ${credentialState}.`)
    
return
  }

  const { chromium } = await import('playwright')
  const startedAt = new Date().toISOString()

  await mkdir(profilePath, { recursive: true, mode: 0o700 })
  await chmod(profilePath, 0o700)
  await mkdir(reportsDir, { recursive: true, mode: 0o700 })
  await chmod(reportsDir, 0o700)

  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 980 },
    acceptDownloads: false
  })

  if (options.forceLogin) {
    if (!credentials) throw new Error('--force-login requiere ejecutar primero pnpm licitalab:radar:setup')
    await context.clearCookies()
  }

  const page = context.pages()[0] || (await context.newPage())

  await page.goto(defaultUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await ensureAuthenticated(page, credentials)
  await navigateToOpportunities(page)
  await activateRequestedView(page)

  const opportunities = await collectVisibleOpportunities(page)

  const reportPath = await writeReport({
    schema: 'efeonce.licitalab-radar.v1',
    createdAt: startedAt,
    mode: 'discovery-read-only',
    requestedView: options.view,
    source: 'LicitaLAB authenticated web session',
    opportunities,
    nextStep:
      'Hidratar cada código con LicitaLAB MCP antes de clasificar fit; no promover a HubSpot sin confirmación humana.'
  })

  console.log(`[LICITALAB_RADAR] Discovery completado: ${opportunities.length} oportunidades visibles.`)
  console.log(`[LICITALAB_RADAR] Reporte local protegido: ${relative(PROJECT_ROOT, reportPath)}`)
  console.log('[LICITALAB_RADAR] Siguiente paso: ficha + documentos por MCP; el score del listado no es un GO.')
}

function printUsage() {
  console.log(`Uso:
  pnpm licitalab:radar
  pnpm licitalab:radar -- --check-only
  pnpm licitalab:radar -- --force-login
  pnpm licitalab:radar -- --view recommended
  pnpm licitalab:radar -- --view all --max-opportunities 200
  pnpm licitalab:radar -- --output .auth/licitalab-radar-reports/mi-revision.json

El comando es read-only. Reutiliza el perfil aislado si su sesión sigue vigente; si
LicitaLAB pide login, usa la credencial local creada por licitalab:radar:setup. No
modifica vistas o filtros, no descarta oportunidades y no escribe en HubSpot.`)
}

async function assertLocalPaths() {
  for (const localPath of [
    '.auth/licitalab-auth-credentials.json',
    '.auth/licitalab-auth-profile',
    '.auth/licitalab-radar-reports'
  ]) {
    const [tracked, ignored] = await Promise.all([
      commandSucceeds('git', ['ls-files', '--error-unmatch', '--', localPath]),
      commandSucceeds('git', ['check-ignore', '--quiet', '--no-index', '--', localPath])
    ])

    if (tracked || !ignored) throw new Error(`${localPath} debe permanecer ignorado y fuera del índice Git`)
  }
}

async function commandSucceeds(command, args) {
  try {
    await execFile(command, args, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 })
    
return true
  } catch {
    return false
  }
}

async function readCredentialsOptional() {
  let raw

  try {
    raw = await readFile(credentialsPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw new Error('no se pudo leer la credencial local de LicitaLAB')
  }

  const metadata = await stat(credentialsPath)

  if ((metadata.mode & 0o077) !== 0) throw new Error('la credencial local debe tener permisos 0600')

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('la credencial local de LicitaLAB no tiene un formato válido')
  }

  if (typeof parsed?.email !== 'string' || !parsed.email.includes('@')) {
    throw new Error('la credencial local no contiene un correo válido')
  }

  if (typeof parsed?.password !== 'string' || parsed.password.length === 0) {
    throw new Error('la credencial local no contiene una clave válida')
  }

  return { email: parsed.email, password: parsed.password }
}

async function ensureAuthenticated(page, credentials) {
  if (!options.forceLogin && (await isAuthenticated(page))) return

  if (!credentials) {
    throw new Error('LicitaLAB requiere login; ejecuta pnpm licitalab:radar:setup en una terminal interactiva')
  }

  const email = await firstVisible(page, [
    'input[type="email"]',
    'input[autocomplete="email"]',
    'input[placeholder*="correo" i]'
  ])

  const password = await firstVisible(page, [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[placeholder*="contraseña" i]'
  ])

  if (!email || !password) throw new Error('no se reconoció el formulario de login de LicitaLAB')

  await email.fill(credentials.email)
  await password.fill(credentials.password)

  const submit = page.getByRole('button', { name: /iniciar sesi[oó]n/i }).first()

  if (await isVisible(submit)) await submit.click({ timeout: 5_000 })
  else await password.press('Enter')

  const deadline = Date.now() + 90_000

  while (Date.now() < deadline) {
    if (await isAuthenticated(page)) return
    await page.waitForTimeout(500)
  }

  throw new Error('LicitaLAB no confirmó la sesión; revisa la cuenta o un desafío visible en el perfil aislado')
}

async function isAuthenticated(page) {
  const body = await page
    .locator('body')
    .innerText({ timeout: 2_000 })
    .catch(() => '')

  const hasPassword = await firstVisible(page, ['input[type="password"]', 'input[autocomplete="current-password"]'])

  return !hasPassword && /\b(Oportunidades|Recomendadas|Mis resultados|Mercado P[uú]blico)\b/i.test(body)
}

async function navigateToOpportunities(page) {
  if (await isOpportunityList(page)) return

  const control = page
    .locator('a, button, [role="button"]')
    .filter({ hasText: /^\s*B[uú]squeda(?:\s+\d+\+?)?\s*$/i })
    .first()

  if (await isVisible(control)) {
    await control.click({ timeout: 5_000 })
    await page.waitForTimeout(750)
  }

  if (!(await isOpportunityList(page))) {
    throw new Error('no se encontró el listado de oportunidades; la interfaz de LicitaLAB requiere calibración')
  }
}

async function isOpportunityList(page) {
  const body = await page
    .locator('body')
    .innerText({ timeout: 2_000 })
    .catch(() => '')

  
return /Oportunidad\s*\/\s*ID/i.test(body) && /Organismo/i.test(body) && /Cierre/i.test(body)
}

async function activateRequestedView(page) {
  if (!options.view) return

  const label = options.view === 'recommended' ? 'Recomendadas' : 'Todos'
  const candidate = page.getByText(new RegExp(`^${label}$`, 'i')).first()

  if (!(await isVisible(candidate))) throw new Error(`no se encontró la vista ${label} en LicitaLAB`)
  await candidate.click({ timeout: 5_000 })
  await page.waitForTimeout(750)
}

async function collectVisibleOpportunities(page) {
  const collected = new Map()
  let previousFingerprint = ''

  for (let pageNumber = 1; pageNumber <= 100 && collected.size < options.maxOpportunities; pageNumber += 1) {
    const rows = await readOpportunityRows(page)

    for (const cells of rows) {
      const opportunity = parseLicitaLabOpportunityCells(cells)

      if (opportunity) collected.set(opportunity.code, opportunity)
      if (collected.size >= options.maxOpportunities) break
    }

    if (collected.size >= options.maxOpportunities) break

    const fingerprint = [...collected.keys()].slice(-20).join('|')
    const next = page.locator('.ant-pagination-next').first()

    const disabled =
      !(await isVisible(next)) ||
      (await next.getAttribute('aria-disabled').catch(() => null)) === 'true' ||
      (await next
        .locator('button')
        .isDisabled()
        .catch(() => false))

    if (disabled || fingerprint === previousFingerprint) break
    previousFingerprint = fingerprint

    await next.click({ timeout: 5_000 })
    await page.waitForTimeout(650)
  }

  if (collected.size === 0) {
    throw new Error('no se detectaron códigos de oportunidad; la interfaz de LicitaLAB requiere calibración')
  }

  return [...collected.values()].slice(0, options.maxOpportunities)
}

async function readOpportunityRows(page) {
  return page.locator('table tbody tr, [role="row"]').evaluateAll(elements =>
    elements.map(element => {
      const cells = [...element.querySelectorAll('td, [role="cell"]')]

      
return (cells.length ? cells : [element]).map(cell => cell.innerText || '')
    })
  )
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()

    if (await isVisible(locator)) return locator
  }

  
return null
}

async function isVisible(locator) {
  try {
    return await locator.isVisible({ timeout: 500 })
  } catch {
    return false
  }
}

async function writeReport(report) {
  const defaultName = `licitalab-radar-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const target = resolve(PROJECT_ROOT, options.output || `.auth/licitalab-radar-reports/${defaultName}`)
  const authRoot = resolve(PROJECT_ROOT, '.auth')

  if (!(target === authRoot || target.startsWith(`${authRoot}/`))) {
    throw new Error('el reporte debe guardarse bajo .auth/')
  }

  await mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 })
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await chmod(target, 0o600)

  return target
}

function safeMessage(error) {
  const value = error instanceof Error ? error.message : 'fallo no identificado'

  
return value
    .replace(/https?:\/\/[^\s)\]}>]+/gi, '[URL redactada]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}
