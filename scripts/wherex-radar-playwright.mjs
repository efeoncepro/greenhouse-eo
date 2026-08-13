#!/usr/bin/env node

/**
 * Revisa el radar de Wherex con Playwright en un perfil Chrome aislado.
 *
 * No presenta ofertas, no responde mensajes y no muestra credenciales,
 * cookies ni URLs firmadas. La descarga permanente sólo existe en el modo
 * explícito --tender-id + --archive-originals y depende del evento nativo de
 * descarga de Wherex; nunca intenta extraer archivos desde su visor protegido.
 */

import { chmod, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { execFile as execFileCallback } from 'node:child_process'
import { basename, extname, relative, resolve } from 'node:path'
import { promisify } from 'node:util'

import { PROJECT_ROOT } from './lib/local-env.mjs'

const execFile = promisify(execFileCallback)
const credentialsPath = `${PROJECT_ROOT}/.auth/wherex-auth-credentials.json`
const profilePath = `${PROJECT_ROOT}/.auth/wherex-auth-profile`
const reportsDir = `${PROJECT_ROOT}/.auth/wherex-radar-reports`
const defaultUrl = process.env.WHEREX_AUTH_URL || 'https://app.wherex.com/'
const maxAttachmentBytes = 20 * 1024 * 1024
const maxDocumentCharacters = 120_000
const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printUsage()
  process.exit(0)
}

let context
let tempDir

try {
  await main()
} catch (error) {
  console.error(`[WHEREX_RADAR] ${safeMessage(error)}`)
  process.exitCode = 1
} finally {
  await context?.close().catch(() => {})
  if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {})
}

async function main() {
  const credentials = await readCredentials()

  if (options.checkOnly) {
    console.log('[WHEREX_RADAR] Credencial local y perfil aislado listos para ejecutar.')

    return
  }

  const { chromium } = await import('playwright')
  const startedAt = new Date().toISOString()

  await mkdir(profilePath, { recursive: true, mode: 0o700 })
  await chmod(profilePath, 0o700)
  await mkdir(reportsDir, { recursive: true, mode: 0o700 })
  await chmod(reportsDir, 0o700)

  tempDir = `${PROJECT_ROOT}/.auth/wherex-radar-tmp-${process.pid}-${Date.now()}`
  await mkdir(tempDir, { recursive: true, mode: 0o700 })

  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 980 },
    acceptDownloads: Boolean(options.archiveDir)
  })

  if (options.forceLogin) {
    await context.clearCookies()
    await context.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
  }

  const page = context.pages()[0] || (await context.newPage())

  await page.goto(defaultUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await ensureAuthenticated(page, credentials)
  await navigateToTenders(page)

  if (options.tenderId) {
    const opportunity = await archiveTenderOriginals(page, options.tenderId)

    const reportPath = await writeReport({
      schema: 'efeonce.wherex-radar.v1',
      createdAt: startedAt,
      mode: 'archive-originals',
      sourceStates: ['Nueva', 'Editando'],
      opportunities: [opportunity]
    })

    console.log(`[WHEREX_RADAR] Archivo de originales completado: ${opportunity.attachments.length} adjuntos revisados.`)
    console.log(`[WHEREX_RADAR] Reporte local protegido: ${relative(PROJECT_ROOT, reportPath)}`)

    return
  }

  const opportunities = []

  for (const status of ['Nueva', 'Editando']) {
    await activateStatus(page, status)
    const candidates = await collectCandidatesAcrossPages(page, status)

    for (const candidate of candidates) {
      opportunities.push(await readOpportunity(candidate, status))
    }
  }

  const report = {
    schema: 'efeonce.wherex-radar.v1',
    createdAt: startedAt,
    mode: 'read-only',
    sourceStates: ['Nueva', 'Editando'],
    opportunities
  }

  const reportPath = await writeReport(report)

  console.log(`[WHEREX_RADAR] Revisión completada: ${opportunities.length} oportunidades leídas.`)
  console.log(`[WHEREX_RADAR] Reporte local protegido: ${relative(PROJECT_ROOT, reportPath)}`)
  console.log(
    '[WHEREX_RADAR] Siguiente paso: analiza el reporte con greenhouse-public-private-tenders; un fit no es un GO.'
  )
}

function parseArgs(args) {
  const parsed = {
    checkOnly: false,
    forceLogin: false,
    help: false,
    maxPages: 20,
    output: null,
    tenderId: null,
    archiveDir: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') continue

    if (arg === '--check-only') {
      parsed.checkOnly = true
      continue
    }

    if (arg === '--force-login') {
      parsed.forceLogin = true
      continue
    }

    if (arg === '--max-pages') {
      const value = Number.parseInt(args[index + 1] || '', 10)

      if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('--max-pages debe estar entre 1 y 100')
      parsed.maxPages = value
      index += 1
      continue
    }

    if (arg === '--output') {
      const value = args[index + 1]

      if (!value) throw new Error('--output requiere una ruta bajo .auth/')
      parsed.output = value
      index += 1
      continue
    }

    if (arg === '--tender-id') {
      const value = String(args[index + 1] || '').trim()

      if (!/^[A-Za-z0-9-]{2,80}$/.test(value)) throw new Error('--tender-id requiere un identificador alfanumérico válido')
      parsed.tenderId = value
      index += 1
      continue
    }

    if (arg === '--archive-originals') {
      const value = args[index + 1]

      if (!value) throw new Error('--archive-originals requiere una carpeta destino explícita')
      parsed.archiveDir = resolve(value)
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    throw new Error(`opción no reconocida: ${arg}`)
  }

  if (parsed.archiveDir && !parsed.tenderId) {
    throw new Error('--archive-originals requiere --tender-id para evitar archivar adjuntos masivamente')
  }

  if (parsed.tenderId && !parsed.archiveDir) {
    throw new Error('--tender-id requiere --archive-originals <carpeta destino>')
  }

  return parsed
}

function printUsage() {
  console.log(`Uso:
  pnpm wherex:radar
  pnpm wherex:radar -- --check-only
  pnpm wherex:radar -- --force-login
  pnpm wherex:radar -- --max-pages 30
  pnpm wherex:radar -- --output .auth/wherex-radar-reports/mi-revision.json
  pnpm wherex:radar -- --tender-id 1120 --archive-originals "/ruta/a/Licitaciones/Sika"

El comando opera sólo en lectura: revisa Nueva y Editando, abre las fichas y
extrae los adjuntos técnicos disponibles. No participa, no responde, no sube
archivos y no firma. El modo de archivo sólo guarda un original cuando Wherex
emite una descarga nativa; si abre el visor protegido, lo informa sin intentar
extraer la URL ni el contenido del visor.`)
}

async function readCredentials() {
  await assertCredentialPathIsLocal()

  let raw

  try {
    raw = await readFile(credentialsPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('no hay credencial local; ejecuta pnpm wherex:radar:setup')
    }

    throw new Error('no se pudo leer la credencial local de Wherex')
  }

  const metadata = await stat(credentialsPath)

  if ((metadata.mode & 0o077) !== 0) throw new Error('la credencial local debe tener permisos 0600')

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('la credencial local de Wherex no tiene un formato válido')
  }

  if (typeof parsed?.email !== 'string' || !parsed.email.includes('@')) {
    throw new Error('la credencial local no contiene un correo válido')
  }

  if (typeof parsed?.password !== 'string' || parsed.password.length === 0) {
    throw new Error('la credencial local no contiene una clave válida')
  }

  return { email: parsed.email, password: parsed.password }
}

async function assertCredentialPathIsLocal() {
  const localPath = '.auth/wherex-auth-credentials.json'

  const [tracked, ignored] = await Promise.all([
    commandSucceeds('git', ['ls-files', '--error-unmatch', '--', localPath]),
    commandSucceeds('git', ['check-ignore', '--quiet', '--no-index', '--', localPath])
  ])

  if (tracked || !ignored) throw new Error('la credencial local debe permanecer ignorada y fuera del índice Git')
}

async function commandSucceeds(command, args) {
  try {
    await execFile(command, args, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 })

    return true
  } catch {
    return false
  }
}

async function ensureAuthenticated(page, credentials) {
  if (!options.forceLogin && (await isAuthenticated(page))) return

  const deadline = Date.now() + 90_000
  let emailSent = false
  let passwordSent = false

  while (Date.now() < deadline) {
    if (await isAuthenticated(page)) return

    const email = await firstVisible(page, [
      'input[type="email"]',
      'input[autocomplete="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]'
    ])

    if (email && !emailSent) {
      await email.fill(credentials.email)
      await submitCurrentForm(page)
      emailSent = true
      await page.waitForTimeout(500)
      continue
    }

    const password = await firstVisible(page, ['input[type="password"]', 'input[autocomplete="current-password"]'])

    if (password && !passwordSent) {
      await password.fill(credentials.password)
      await submitCurrentForm(page)
      passwordSent = true
      await page.waitForTimeout(750)
      continue
    }

    await page.waitForTimeout(400)
  }

  throw new Error(
    'Wherex no confirmó la sesión; revisa la cuenta, clave o un desafío de seguridad en el perfil aislado'
  )
}

async function isAuthenticated(page) {
  const body = await page
    .locator('body')
    .innerText({ timeout: 1_000 })
    .catch(() => '')

  const hasPassword = await firstVisible(page, ['input[type="password"]', 'input[autocomplete="current-password"]'])

  return !hasPassword && /\b(Sourcing|Licitaciones|Dashboard|Inicio)\b/i.test(body)
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

async function submitCurrentForm(page) {
  const submit = await firstVisible(page, ['button[type="submit"]', 'input[type="submit"]'])

  if (submit) {
    await submit.click({ timeout: 3_000 }).catch(() => {})

    return
  }

  await page.keyboard.press('Enter').catch(() => {})
}

async function navigateToTenders(page) {
  if (await hasStatusControls(page)) return

  await clickControlContaining(page, /^Sourcing$/i)
  await page.waitForTimeout(500)

  if (!(await clickControlContaining(page, /^Licitaciones$/i))) {
    throw new Error('no se encontró Sourcing → Licitaciones; la interfaz de Wherex requiere calibración de selectores')
  }

  await page.waitForTimeout(750)

  if (!(await hasStatusControls(page))) {
    throw new Error('Wherex no mostró los estados Nueva/Editando; la interfaz requiere calibración de selectores')
  }
}

async function hasStatusControls(page) {
  return (await findControlIndex(page, /^Nueva\b/i)) !== -1 && (await findControlIndex(page, /^Editando\b/i)) !== -1
}

async function activateStatus(page, status) {
  const clicked = await clickControlContaining(page, new RegExp(`^${escapeRegExp(status)}\\b`, 'i'))

  if (!clicked) throw new Error(`no se encontró el estado ${status} en Wherex`)
  await page.waitForTimeout(650)
}

async function clickControlContaining(page, expression) {
  const index = await findControlIndex(page, expression)

  if (index === -1) return false

  const controls = page.locator('button, [role="tab"], a')

  await controls.nth(index).click({ timeout: 5_000 })

  return true
}

async function findControlIndex(page, expression) {
  const controls = page.locator('button, [role="tab"], a')
  const count = await controls.count()

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)

    if (!(await isVisible(control))) continue

    const label =
      `${(await control.getAttribute('aria-label').catch(() => '')) || ''} ${await control.innerText().catch(() => '')}`.trim()

    if (expression.test(label)) return index
  }

  return -1
}

async function collectCandidatesAcrossPages(page, status) {
  const collected = new Map()
  let fingerprint = ''

  for (let pageNumber = 1; pageNumber <= options.maxPages; pageNumber += 1) {
    const candidates = await collectCandidates(page)

    for (const candidate of candidates) collected.set(candidate.href, { ...candidate, status })

    const nextFingerprint = candidates.map(candidate => candidate.href).join('|')

    if (!nextFingerprint || nextFingerprint === fingerprint) break
    fingerprint = nextFingerprint

    if (!(await goToNextPage(page, fingerprint))) break
  }

  if (collected.size === 0) {
    throw new Error(
      `no se pudieron identificar fichas en el estado ${status}; la interfaz requiere calibración de selectores`
    )
  }

  return [...collected.values()]
}

async function collectCandidates(page) {
  return page.locator('a[href]').evaluateAll(anchors => {
    const current = new URL(window.location.href)
    const ignored = /(?:logout|login|sourcing$|licitaciones$|perfil|configuraci[oó]n|nueva|editando)/i
    const seen = new Set()

    return anchors.flatMap(anchor => {
      const href = new URL(anchor.href, current.href)
      const block = anchor.closest('tr, [role="row"], article, li, [class*="card" i], [class*="item" i]') || anchor
      const text = (block.innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim()

      if (
        href.origin !== current.origin ||
        href.pathname === current.pathname ||
        ignored.test(href.pathname) ||
        text.length < 8
      ) {
        return []
      }

      if (seen.has(href.href)) return []
      seen.add(href.href)

      return [{ href: href.href, preview: text.slice(0, 4_000) }]
    })
  })
}

async function goToNextPage(page, fingerprint) {
  const controls = page.locator('button, a')
  const count = await controls.count()

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)

    if (!(await isVisible(control))) continue
    if ((await control.isDisabled().catch(() => false)) || (await control.getAttribute('aria-disabled')) === 'true')
      continue

    const label = `${(await control.getAttribute('aria-label').catch(() => '')) || ''} ${(await control.getAttribute('title').catch(() => '')) || ''} ${await control.innerText().catch(() => '')}`

    if (!/\b(siguiente|next)\b/i.test(label)) continue

    await control.click({ timeout: 5_000 })
    await page.waitForTimeout(750)
    const next = (await collectCandidates(page)).map(candidate => candidate.href).join('|')

    return Boolean(next && next !== fingerprint)
  }

  return false
}

async function readOpportunity(candidate, status) {
  const detailPage = await context.newPage()

  try {
    await detailPage.goto(candidate.href, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await detailPage.waitForTimeout(500)

    const body = redactUrls(
      await detailPage
        .locator('body')
        .innerText({ timeout: 10_000 })
        .catch(() => candidate.preview)
    )

    const headings = await detailPage
      .locator('h1, h2')
      .allTextContents()
      .catch(() => [])

    const attachments = await extractAttachments(detailPage)

    return {
      status,
      title: normalizeText(headings.find(Boolean) || firstUsefulLine(body) || 'Sin título detectable'),
      id: extractId(body),
      buyer: extractBuyer(body),
      close: extractClose(body),
      detail: truncate(body, maxDocumentCharacters),
      attachments: await Promise.all(attachments.map((attachment, index) => readAttachment(attachment, index)))
    }
  } finally {
    await detailPage.close().catch(() => {})
  }
}

async function archiveTenderOriginals(page, tenderId) {
  const candidate = await findTenderCandidate(page, tenderId)
  const detailPage = await context.newPage()

  try {
    await detailPage.goto(candidate.href, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await detailPage.waitForTimeout(500)

    const body = redactUrls(
      await detailPage
        .locator('body')
        .innerText({ timeout: 10_000 })
        .catch(() => candidate.preview)
    )

    const headings = await detailPage
      .locator('h1, h2')
      .allTextContents()
      .catch(() => [])

    const attachments = await archiveNativeDownloads(detailPage)

    return {
      status: candidate.status,
      title: normalizeText(headings.find(Boolean) || firstUsefulLine(body) || 'Sin título detectable'),
      id: extractId(body) || tenderId,
      buyer: extractBuyer(body),
      close: extractClose(body),
      detail: truncate(body, maxDocumentCharacters),
      attachments
    }
  } finally {
    await detailPage.close().catch(() => {})
  }
}

async function findTenderCandidate(page, tenderId) {
  const matcher = new RegExp(`(?:^|\\D)${escapeRegExp(tenderId)}(?:\\D|$)`, 'i')

  for (const status of ['Nueva', 'Editando']) {
    await activateStatus(page, status)
    const candidates = await collectCandidatesAcrossPages(page, status)
    const matches = candidates.filter(candidate => matcher.test(candidate.preview))

    if (matches.length === 1) return matches[0]
    if (matches.length > 1) throw new Error(`la licitación ${tenderId} aparece más de una vez; requiere calibración`)
  }

  throw new Error(`no se encontró la licitación ${tenderId} en Nueva ni Editando`)
}

async function archiveNativeDownloads(page) {
  const archiveDir = await assertArchiveDirectory()
  const controls = page.locator('[title="Descargar"]')
  const count = await controls.count()
  const attachments = []

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)

    if (!(await isVisible(control))) continue

    const fallbackName = `adjunto-${index + 1}`
    const name = await attachmentName(control, fallbackName)
    const outcome = await waitForNativeDownloadOrViewer(page, control)

    if (outcome.type === 'download') {
      const filename = safeAttachmentName(outcome.download.suggestedFilename() || name)
      const destination = await uniqueArchivePath(archiveDir, filename)

      await outcome.download.saveAs(destination)
      await chmod(destination, 0o600)

      const metadata = await stat(destination)

      if (metadata.size === 0) throw new Error(`Wherex descargó ${filename} vacío`)
      if (metadata.size > maxAttachmentBytes) throw new Error(`${filename} supera el límite de lectura`)

      const buffer = await readFile(destination)
      const text = await extractDocumentText(destination, '', buffer)

      if (!text.trim()) {
        attachments.push({
          name: filename,
          archival: 'ok',
          extraction: 'unreadable',
          sizeBytes: metadata.size,
          reason: 'El original fue archivado, pero no contiene texto extraíble; requiere revisión visual.'
        })
        continue
      }

      attachments.push({
        name: filename,
        archival: 'ok',
        extraction: 'ok',
        sizeBytes: metadata.size,
        text: truncate(redactUrls(text), maxDocumentCharacters)
      })
      continue
    }

    if (outcome.type === 'viewer') {
      await outcome.viewer.close().catch(() => {})
      attachments.push({
        name,
        archival: 'manual-save-required',
        extraction: 'unreadable',
        reason: 'Wherex abrió el visor protegido en lugar de emitir una descarga nativa.'
      })
      continue
    }

    attachments.push({
      name,
      archival: 'unreadable',
      extraction: 'unreadable',
      reason: 'Wherex no emitió una descarga nativa ni abrió un visor identificable.'
    })
  }

  return attachments
}

async function attachmentName(control, fallback) {
  const rowText = await control
    .evaluate(element => element.closest('tr')?.innerText || '')
    .catch(() => '')

  const match = rowText.match(/[^\n]+?\.(?:pdf|docx?|xlsx?|pptx?)(?:\s|$)/i)

  return safeAttachmentName(match?.[0] || fallback)
}

async function waitForNativeDownloadOrViewer(page, control) {
  const never = () => new Promise(() => {})

  const download = page
    .waitForEvent('download', { timeout: 10_000 })
    .then(value => ({ type: 'download', download: value }))
    .catch(never)

  const viewer = context
    .waitForEvent('page', { timeout: 10_000 })
    .then(value => ({ type: 'viewer', viewer: value }))
    .catch(never)

  const timeout = page.waitForTimeout(10_250).then(() => ({ type: 'timeout' }))

  await control.click({ timeout: 5_000 })

  return Promise.race([download, viewer, timeout])
}

async function assertArchiveDirectory() {
  if (!options.archiveDir) throw new Error('falta carpeta de archivo para guardar originales')

  if (options.archiveDir === '/' || options.archiveDir === PROJECT_ROOT) {
    throw new Error('la carpeta de archivo debe ser una carpeta de licitación específica')
  }

  await mkdir(options.archiveDir, { recursive: true, mode: 0o700 })

  return options.archiveDir
}

async function uniqueArchivePath(directory, filename) {
  const extension = extname(filename)
  const stem = extension ? filename.slice(0, -extension.length) : filename

  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const candidate = resolve(directory, suffix === 0 ? filename : `${stem} (${suffix + 1})${extension}`)

    try {
      await stat(candidate)
    } catch (error) {
      if (error?.code === 'ENOENT') return candidate
      throw error
    }
  }

  throw new Error(`no se pudo reservar un nombre de archivo para ${filename}`)
}

async function extractAttachments(page) {
  return page.locator('a[href]').evaluateAll(anchors => {
    const seen = new Set()

    const attachmentPattern =
      /(?:\.pdf(?:$|[?#])|\.docx?(?:$|[?#])|\.xlsx?(?:$|[?#])|\.pptx?(?:$|[?#])|download|adjunto|attachment)/i

    return anchors.flatMap(anchor => {
      const href = anchor.href
      const name = (anchor.innerText || anchor.getAttribute('download') || '').replace(/\s+/g, ' ').trim()

      if (!attachmentPattern.test(`${href} ${name}`) || seen.has(href)) return []
      seen.add(href)

      return [{ href, name: name || 'Adjunto sin nombre' }]
    })
  })
}

async function readAttachment(attachment, index) {
  try {
    const response = await context.request.get(attachment.href, { timeout: 45_000 })

    if (!response.ok()) throw new Error(`HTTP ${response.status()}`)

    const buffer = await response.body()

    if (buffer.length > maxAttachmentBytes) throw new Error('archivo supera el límite de lectura')

    const contentType = (response.headers()['content-type'] || '').toLowerCase()
    const extension = inferExtension(attachment.name, attachment.href, contentType)
    const temporaryPath = resolve(tempDir, `${index}${extension}`)

    await writeFile(temporaryPath, buffer, { mode: 0o600 })

    try {
      const text = await extractDocumentText(temporaryPath, contentType, buffer)

      return {
        name: safeAttachmentName(attachment.name),
        extraction: 'ok',
        text: truncate(redactUrls(text), maxDocumentCharacters)
      }
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => {})
    }
  } catch (error) {
    return { name: safeAttachmentName(attachment.name), extraction: 'unreadable', reason: safeMessage(error) }
  }
}

async function extractDocumentText(path, contentType, buffer) {
  if (contentType.includes('pdf') || path.endsWith('.pdf')) {
    const result = await execFile('pdftotext', [path, '-'], { maxBuffer: 8 * 1024 * 1024, timeout: 30_000 })

    return result.stdout || ''
  }

  if (/\.(docx?|xlsx?|pptx?)$/i.test(path)) {
    const result = await execFile('textutil', ['-convert', 'txt', '-stdout', path], {
      maxBuffer: 8 * 1024 * 1024,
      timeout: 30_000
    })

    return result.stdout || ''
  }

  return new TextDecoder().decode(buffer)
}

function inferExtension(name, href, contentType) {
  const fromName = extname(basename(name.split('?')[0]))

  if (fromName) return fromName.toLowerCase()
  const fromHref = extname(new URL(href).pathname)

  if (fromHref) return fromHref.toLowerCase()
  if (contentType.includes('pdf')) return '.pdf'

  return '.bin'
}

function safeAttachmentName(name) {
  return normalizeText(name).replace(/[\\/]/g, '-').slice(0, 180) || 'Adjunto sin nombre'
}

function extractId(text) {
  return text.match(/\b(?:ID|Código|N°|No\.)\s*[:#-]?\s*([A-Z0-9-]{2,})/i)?.[1] || null
}

function extractBuyer(text) {
  return text.match(/(?:Comprador|Empresa|Cliente)\s*[:\-]\s*([^\n]{2,160})/i)?.[1]?.trim() || null
}

function extractClose(text) {
  return text.match(/(?:Cierre|Fecha de cierre|Termina)\s*[:\-]?\s*([^\n]{3,120})/i)?.[1]?.trim() || null
}

function firstUsefulLine(text) {
  return (
    text
      .split('\n')
      .map(line => line.trim())
      .find(line => line.length > 4 && line.length < 240) || ''
  )
}

async function writeReport(report) {
  const defaultName = `wherex-radar-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const target = resolve(PROJECT_ROOT, options.output || `.auth/wherex-radar-reports/${defaultName}`)
  const authRoot = resolve(PROJECT_ROOT, '.auth')

  if (!(target === authRoot || target.startsWith(`${authRoot}/`))) {
    throw new Error('el reporte debe guardarse bajo .auth/')
  }

  await mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 })
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await chmod(target, 0o600)

  return target
}

function truncate(value, limit) {
  return value.length > limit ? `${value.slice(0, limit)}\n[truncado]` : value
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function redactUrls(value) {
  return String(value || '').replace(/https?:\/\/[^\s)\]}>]+/gi, '[URL redactada]')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safeMessage(error) {
  const value = error instanceof Error ? error.message : 'fallo no identificado'

  return redactUrls(value).replace(/\s+/g, ' ').trim().slice(0, 300)
}
