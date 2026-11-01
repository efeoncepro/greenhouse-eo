#!/usr/bin/env node
/**
 * Solicita la indexación de URLs en Google Search Console por la interfaz, que es la única vía: la API de Search
 * Console no tiene «request indexing» y la Indexing API sólo admite JobPosting y BroadcastEvent.
 *
 * Cómo funciona, sin que ningún agente toque credenciales:
 * - `launch` abre un Chrome real (no el Chromium de Playwright, sin banderas de automatización) con un perfil propio
 *   fuera del repo y el puerto de depuración sólo en 127.0.0.1. Una PERSONA inicia ahí, una vez, la sesión de la cuenta
 *   con acceso a la propiedad. El runner nunca escribe contraseñas ni códigos.
 * - `request` se conecta a ese Chrome por CDP, inspecciona cada URL y lee su último rastreo. Por defecto sólo informa.
 *   Con `--apply` pide la indexación cuando la URL no está en Google o cuando Google la rastreó antes de su última
 *   modificación (`--force` la pide igual). Se detiene ante inicio de sesión, cuenta sin acceso, captcha o cupo agotado.
 *
 *   pnpm public-website:gsc-index launch
 *   pnpm public-website:gsc-index request https://efeoncepro.com/aeo/seo-y-aeo/ [más URLs] [--apply] [--force]
 *
 * Opciones: --property sc-domain:efeoncepro.com (la cuenta ve propiedades de varios clientes: se verifica la seleccionada antes de cada inspección) · --port 9333 · --max-per-day 10 · --profile <dir>
 * Registro: scripts/public-website/gsc-indexing/ledger/AAAA-MM.jsonl (una línea por URL inspeccionada o solicitada).
 * Manual: docs/manual-de-uso/public-site/solicitar-indexacion-search-console.md
 */
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LEDGER_DIR = path.join(HERE, 'gsc-indexing', 'ledger')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// --- Pure helpers (tested in scripts/public-website/gsc-request-indexing.test.ts) ---------------------------------

const MONTHS = { ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11, dec: 11 }

/** Parses the «Último rastreo» / «Last crawl» value Search Console shows (local time of the browser). */
export const parseCrawlDate = text => {
  const t = String(text || '').trim().toLowerCase().replace(/\./g, '')
  let m = t.match(/(\d{1,2})\s+([a-zñ]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/) // 26 oct 2026, 4:49:08

  if (m && m[2].slice(0, 4) in MONTHS) return new Date(+m[3], MONTHS[m[2].slice(0, 4)], +m[1], +m[4], +m[5], +(m[6] || 0))
  if (m && m[2].slice(0, 3) in MONTHS) return new Date(+m[3], MONTHS[m[2].slice(0, 3)], +m[1], +m[4], +m[5], +(m[6] || 0))
  m = t.match(/([a-z]+)\s+(\d{1,2}),\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/) // oct 26, 2026, 4:49:08 am

  if (m && m[1].slice(0, 3) in MONTHS) {
    let h = +m[4]

    if (m[7] === 'pm' && h < 12) h += 12
    if (m[7] === 'am' && h === 12) h = 0

    return new Date(+m[3], MONTHS[m[1].slice(0, 3)], +m[2], h, +m[5], +(m[6] || 0))
  }

  return null
}

/** Last modification the page itself declares (article:modified_time, og:updated_time or JSON-LD dateModified). */
export const pageModified = html => {
  const s = String(html || '')

  const m = s.match(/<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)/i)
    || s.match(/<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)/i)
    || s.match(/"dateModified"\s*:\s*"([^"]+)"/)

  const d = m ? new Date(m[1]) : null

  return d && !Number.isNaN(d.getTime()) ? d : null
}

/** Whether to request: not on Google, crawled before the last change, or forced. Never without a reason. */
export const decide = ({ onGoogle, lastCrawl, modified, force }) => {
  if (force) return { request: true, reason: 'forzado' }
  if (!onGoogle) return { request: true, reason: 'la URL no está en Google' }
  if (!lastCrawl) return { request: false, reason: 'no se pudo leer el último rastreo: revísala a mano' }
  if (!modified) return { request: false, reason: 'la página no declara su fecha de modificación: usa --force si cambió' }

  return lastCrawl < modified
    ? { request: true, reason: `rastreada ${lastCrawl.toISOString()} antes del cambio ${modified.toISOString()}` }
    : { request: false, reason: `ya rastreada ${lastCrawl.toISOString()} después del cambio ${modified.toISOString()}` }
}

/** Requests already sent today (UTC) according to the ledger lines. */
export const requestedToday = (lines, now = new Date()) => {
  const day = now.toISOString().slice(0, 10)

  return lines.filter(l => l && l.result === 'requested' && String(l.at || '').slice(0, 10) === day).length
}

/** Whether a URL belongs to a Search Console property (`sc-domain:x` covers x and its subdomains; URL-prefix covers its prefix). */
export const urlBelongsToProperty = (url, property) => {
  let u

  try { u = new URL(url) } catch { return false }

  if (property.startsWith('sc-domain:')) {
    const d = property.slice('sc-domain:'.length).toLowerCase()

    return u.hostname === d || u.hostname.endsWith(`.${d}`)
  }

  return url.startsWith(property)
}

/** The property Search Console has selected, read from the `resource_id` of its own URL. */
export const selectedProperty = pageUrl => {
  try { return new URL(pageUrl).searchParams.get('resource_id') } catch { return null }
}

/** A confirmed request for this URL in the last 24 hours (ledger), so a re-run never spends quota twice. */
export const requestedRecently = (lines, url, now = new Date()) =>
  lines.some(l => l && l.url === url && l.result === 'requested' && now - new Date(l.at) < 24 * 3600 * 1000)

// --- Runtime -------------------------------------------------------------------------------------------------------

const args = process.argv.slice(2)

const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)

  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}

const has = name => args.includes(`--${name}`)
const PORT = Number(flag('port', '9333'))
const PROPERTY = flag('property', 'sc-domain:efeoncepro.com')
const PROFILE = flag('profile', path.join(os.homedir(), '.efeonce', 'gsc-chrome-profile'))
const MAX_PER_DAY = Number(flag('max-per-day', '10'))

const fail = (code, msg) => { console.error(`✗ ${msg}`); process.exit(code) }
const author = () => { try { return execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim() } catch { return 'desconocido' } }
const ledgerFile = (d = new Date()) => path.join(LEDGER_DIR, `${d.toISOString().slice(0, 7)}.jsonl`)
const readLedger = () => (fs.existsSync(ledgerFile()) ? fs.readFileSync(ledgerFile(), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }) : [])
const writeLedger = entry => { fs.mkdirSync(LEDGER_DIR, { recursive: true }); fs.appendFileSync(ledgerFile(), JSON.stringify({ at: new Date().toISOString(), author: author(), property: PROPERTY, ...entry }) + '\n') }

const launch = () => {
  if (!fs.existsSync(CHROME)) fail(1, `no encontré Chrome en ${CHROME}`)
  fs.mkdirSync(PROFILE, { recursive: true })
  const child = spawn(CHROME, [`--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', `https://search.google.com/search-console?resource_id=${encodeURIComponent(PROPERTY)}`], { detached: true, stdio: 'ignore' })

  child.unref()
  console.log(`Chrome abierto con el perfil ${PROFILE} y el puerto ${PORT} (sólo 127.0.0.1).`)
  console.log('Si es la primera vez, una persona inicia ahí la sesión de la cuenta con acceso a la propiedad. Después corre `request`.')
  console.log('Cierra ese Chrome cuando termines: mientras está abierto, cualquier proceso local puede controlarlo por el puerto.')
}

const STOP = {
  // Signed out, Search Console lands on its marketing page (/search-console/about), not on accounts.google.com.
  signIn: /accounts\.google\.com|ServiceLogin|signin|search-console\/about/i,
  noAccess: /no puedes acceder a esta propiedad|you don.t have access to this property/i,
  captcha: /captcha|unusual traffic|tráfico inusual|no soy un robot|i'm not a robot/i,
  quota: /se ha superado la cuota|quota exceeded|cuota diaria/i,
  notInProperty: /no pertenece a (esta|la) propiedad|not in (this|the current) property|isn.t in this property/i
}

const REQUESTED = /Se ha solicitado la indexación|Indexing requested/i

/** Polls the page's rendered text (innerText skips hidden nodes) until one pattern shows up; 'timeout' otherwise. */
const waitForRenderedText = async (page, patterns, timeoutMs) => {
  const until = Date.now() + timeoutMs

  while (Date.now() < until) {
    const text = await page.locator('body').innerText().catch(() => '')
    const hit = Object.entries(patterns).find(([, re]) => re.test(text))

    if (hit) return hit[0]
    await page.waitForTimeout(2000)
  }

  return 'timeout'
}

const assertProperty = (page, url) => {
  const selected = selectedProperty(page.url())

  if (selected !== PROPERTY) fail(7, `Search Console tiene seleccionada la propiedad ${selected ?? '(ninguna)'} y no ${PROPERTY}. Me detengo antes de inspeccionar ${url}.`)
}

const inspectOne = async (page, url, apply, force) => {
  // Fresh overview per URL, so a batch never reads the verdict of the previous one.
  await page.goto(`https://search.google.com/search-console?resource_id=${encodeURIComponent(PROPERTY)}`, { waitUntil: 'domcontentloaded' })
  const box = page.locator('input[placeholder*="Inspecciona" i], input[placeholder*="Inspect" i], input[aria-label*="Inspecciona" i], input[aria-label*="Inspect" i]').first()

  await box.waitFor({ timeout: 30_000 })
  // This account sees several clients' properties: never inspect unless the selected one is ours.
  assertProperty(page, url)
  await box.click()
  await box.fill(url)
  await box.press('Enter')
  const verdict = page.getByText(/La URL (no )?está en Google|URL is (not )?on Google|La URL no está registrada|URL is unknown/i).first()

  await verdict.waitFor({ timeout: 90_000 })
  const verdictText = (await verdict.innerText()).trim()

  assertProperty(page, url)
  if (STOP.notInProperty.test(await page.locator('body').innerText())) fail(7, `Search Console dice que ${url} no pertenece a ${PROPERTY}. Me detengo.`)
  const onGoogle = /está en Google|is on Google/i.test(verdictText) && !/no está|not on Google/i.test(verdictText)
  const panel = page.getByText(/^(Indexación de páginas|Page indexing)$/).first()

  if (await panel.count()) { await panel.click().catch(() => {}); await page.waitForTimeout(1500) }
  const body = await page.locator('body').innerText()
  const crawlText = (body.match(/(Último rastreo|Last crawl)\s*\n?\s*([^\n]+)/i) || [])[2] || ''
  const lastCrawl = parseCrawlDate(crawlText)
  const html = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Efeonce-gsc-index' } }).then(r => r.text()).catch(() => '')
  const modified = pageModified(html)
  const d = decide({ onGoogle, lastCrawl, modified, force })
  const base = { url, verdict: verdictText, lastCrawl: lastCrawl?.toISOString() ?? crawlText ?? null, modified: modified?.toISOString() ?? null, decision: d.reason }

  if (!d.request || !apply) {
    writeLedger({ ...base, result: apply ? 'skipped' : 'dry-run' })

    return { ...base, result: apply ? 'skipped' : 'dry-run' }
  }

  // Already requested (ledger in the last 24 h, or the panel shows the confirmation): don't spend quota twice.
  if (!force && (requestedRecently(readLedger(), url) || REQUESTED.test(body))) {
    writeLedger({ ...base, result: 'already-requested' })

    return { ...base, result: 'already-requested' }
  }

  const button = page.getByRole('button', { name: /solicitar indexación|request indexing/i }).first()
  const link = page.getByText(/^(SOLICITAR INDEXACIÓN|Solicitar indexación|REQUEST INDEXING|Request indexing)$/).first()

  await ((await button.count()) ? button : link).click()

  // Read the rendered text, not a locator: the first DOM match of the confirmation can be a hidden copy, and waiting
  // for it to become visible timed out on 2026-10-26 while the page already showed «Se ha solicitado la indexación».
  const outcome = await waitForRenderedText(page, { requested: REQUESTED, quota: STOP.quota }, 180_000)

  const close = page.getByRole('button', { name: /^(Cerrar|Got it|Close|Entendido)$/i }).first()

  if (await close.count()) await close.click().catch(() => {})
  writeLedger({ ...base, result: outcome })

  return { ...base, result: outcome }
}

const request = async () => {
  const urls = args.filter(a => /^https?:\/\//.test(a))

  if (!urls.length) fail(1, 'indica al menos una URL completa (https://…)')
  const foreign = urls.filter(u => !urlBelongsToProperty(u, PROPERTY))

  if (foreign.length) fail(1, `estas URL no pertenecen a ${PROPERTY}: ${foreign.join(', ')}. Usa --property con la propiedad correcta.`)
  const apply = has('apply')
  const force = has('force')
  const sent = requestedToday(readLedger())

  if (apply && sent + urls.length > MAX_PER_DAY) fail(1, `el cupo diario es ${MAX_PER_DAY} y hoy ya van ${sent} (registro). Pide menos URLs o espera a mañana.`)
  const { chromium } = await import('playwright')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null)

  if (!browser) fail(2, `no hay Chrome escuchando en 127.0.0.1:${PORT}. Corre \`launch\` primero.`)
  const context = browser.contexts()[0]
  const page = await context.newPage()

  try {
    await page.goto(`https://search.google.com/search-console?resource_id=${encodeURIComponent(PROPERTY)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    const body = await page.locator('body').innerText().catch(() => '')

    if (STOP.signIn.test(page.url())) {
      // Leave Google's sign-in screen open for the person (the «Empezar ahora» link); the runner never types in it.
      const signIn = await page.evaluate(() => [...document.querySelectorAll('a')].find(a => /accounts\.google\.com/.test(a.href))?.href).catch(() => null)

      if (signIn) { const tab = await context.newPage();

 await tab.goto(signIn).catch(() => {}); await tab.bringToFront().catch(() => {}) }

      fail(3, 'Chrome no tiene la sesión iniciada. Dejé abierta la pantalla de Google en esa ventana: una persona inicia sesión con la cuenta que tiene acceso a la propiedad y vuelve a correr `request`. El runner no escribe credenciales.')
    }

    if (STOP.noAccess.test(body)) fail(3, `la cuenta abierta no tiene acceso a ${PROPERTY}. Una persona debe cambiar a la cuenta correcta en esa ventana.`)
    if (STOP.captcha.test(body)) fail(4, 'Google mostró una verificación (captcha). Me detengo: no se resuelve ni se evita.')
    const results = []

    for (const url of urls) {
      const r = await inspectOne(page, url, apply, force).catch(e => {
        if (e?.name !== 'TimeoutError') throw e
        if (STOP.signIn.test(page.url())) fail(3, 'Search Console cerró la sesión a mitad de camino. Una persona debe iniciarla de nuevo en la ventana de `launch`.')
        fail(6, `Search Console no mostró lo esperado a tiempo con ${url} (${String(e.message).split('\n')[0]}). Revisa esa ventana: puede haber cambiado la interfaz.`)
      })

      results.push(r)
      console.log(`${r.result.padEnd(9)} ${url}\n          ${r.verdict} · último rastreo ${r.lastCrawl ?? '—'} · modificada ${r.modified ?? '—'}\n          ${r.decision}`)
      const now = await page.locator('body').innerText().catch(() => '')

      if (r.result === 'quota' || STOP.quota.test(now)) fail(5, 'Search Console dice que se agotó el cupo diario. Me detengo.')
      if (STOP.captcha.test(now)) fail(4, 'Google mostró una verificación (captcha). Me detengo.')
      if (r.result === 'timeout') fail(6, 'Search Console no confirmó la solicitud a tiempo. Revisa esa URL a mano antes de repetir.')
    }

    if (!apply) console.log('\n→ Sólo inspección. Repite con --apply para solicitar las que lo necesitan.')
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {}) // with connectOverCDP this only disconnects: the human's Chrome stays open
  }
}

const cmd = args[0]

if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'launch') launch()
  else if (cmd === 'request') await request()
  else fail(1, 'uso: launch | request <url…> [--apply] [--force] [--property …] [--port …] [--max-per-day …]')
}
