/**
 * Runtime strict collectors (TASK-1018 Slice 3).
 *
 * Engancha listeners en la página durante toda la captura para juntar
 * console.error, pageerror (excepciones no capturadas), warnings de hydration
 * (best-effort por pattern) y responses 4xx/5xx de document/xhr/fetch.
 *
 * Los mensajes se sanitizan + truncan antes de persistir (sin cookies, bypass
 * secrets, bearer tokens ni bodies de respuesta).
 */

import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding, RuntimeSummary } from './manifest'
import type { CaptureRuntimeQualityOptions } from './scenario'

const MAX_SAMPLES = 10
const MAX_MESSAGE_LEN = 500

/** Patterns best-effort para detectar warnings de hydration React/Next. */
const HYDRATION_PATTERNS = [
  /hydrat/i,
  /did not match/i,
  /text content does not match/i,
  /server rendered html/i,
  /a tree hydrated but some attributes/i
]

const RELEVANT_RESOURCE_TYPES = new Set(['document', 'xhr', 'fetch'])

/** Sanitiza un mensaje libre antes de persistirlo. No loggear secretos. */
export const sanitizeRuntimeMessage = (raw: string): string => {
  let out = raw
    .replace(/(authorization|cookie|x-vercel-protection-bypass|set-cookie)\s*[:=]\s*\S+/gi, '$1: [redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, '[redacted-jwt]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[redacted-email]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[redacted-hex]')

  if (out.length > MAX_MESSAGE_LEN) out = `${out.slice(0, MAX_MESSAGE_LEN)}…`

  return out
}

export interface RuntimeRaw {
  consoleErrors: string[]
  pageErrors: string[]
  hydrationWarnings: string[]
  httpFailures: Array<{ url: string; status: number; resourceType: string }>
}

export interface RuntimeCollector {
  summarize(): RuntimeSummary
  raw(): RuntimeRaw
  dispose(): void
}

export const attachRuntimeCollectors = (page: Page): RuntimeCollector => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const hydrationWarnings: string[] = []
  const httpFailures: Array<{ url: string; status: number; resourceType: string }> = []

  const onConsole = (msg: { type(): string; text(): string }): void => {
    const type = msg.type()

    if (type !== 'error' && type !== 'warning') return

    const text = sanitizeRuntimeMessage(msg.text())
    const isHydration = HYDRATION_PATTERNS.some(p => p.test(text))

    if (isHydration) {
      hydrationWarnings.push(text)
    } else if (type === 'error') {
      consoleErrors.push(text)
    }
  }

  const onPageError = (err: Error): void => {
    pageErrors.push(sanitizeRuntimeMessage(err.message || String(err)))
  }

  const onResponse = (res: { status(): number; url(): string; request(): { resourceType(): string } }): void => {
    const status = res.status()

    if (status < 400) return

    const resourceType = res.request().resourceType()

    if (!RELEVANT_RESOURCE_TYPES.has(resourceType)) return

    httpFailures.push({ url: sanitizeRuntimeMessage(res.url()), status, resourceType })
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)

  return {
    summarize: (): RuntimeSummary => ({
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      hydrationWarningCount: hydrationWarnings.length,
      httpFailureCount: httpFailures.length,
      consoleErrorSamples: consoleErrors.slice(0, MAX_SAMPLES),
      pageErrorSamples: pageErrors.slice(0, MAX_SAMPLES),
      hydrationWarningSamples: hydrationWarnings.slice(0, MAX_SAMPLES),
      httpFailureSamples: httpFailures.slice(0, MAX_SAMPLES)
    }),
    raw: (): RuntimeRaw => ({ consoleErrors, pageErrors, hydrationWarnings, httpFailures }),
    dispose: (): void => {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
      page.off('response', onResponse)
    }
  }
}

const matchesAny = (value: string, patterns: string[]): boolean =>
  patterns.some(p => {
    try {
      return new RegExp(p).test(value)
    } catch {
      return value.includes(p)
    }
  })

/**
 * Deriva findings desde los datos runtime crudos según los thresholds del
 * scenario. Sólo emite findings cuando el scenario declara `quality.runtime`.
 */
export const deriveRuntimeFindings = (
  raw: RuntimeRaw,
  options: CaptureRuntimeQualityOptions | undefined
): CaptureFinding[] => {
  if (!options) return []

  const findings: CaptureFinding[] = []
  const ignoreConsole = options.ignoreConsolePatterns ?? []
  const ignoreUrls = options.ignoreUrlPatterns ?? []

  const consoleErrors = raw.consoleErrors.filter(m => !matchesAny(m, ignoreConsole))
  const pageErrors = raw.pageErrors.filter(m => !matchesAny(m, ignoreConsole))
  const hydration = raw.hydrationWarnings.filter(m => !matchesAny(m, ignoreConsole))
  const httpFailures = raw.httpFailures.filter(f => !matchesAny(f.url, ignoreUrls))

  if (consoleErrors.length) {
    findings.push({
      severity: options.failOnConsoleError === false ? 'warning' : 'error',
      category: 'runtime',
      code: FINDING_CODES.runtime_console_error,
      message: `${consoleErrors.length} console.error durante la captura. Ej: ${consoleErrors[0]}`
    })
  }

  if (pageErrors.length) {
    findings.push({
      severity: options.failOnPageError === false ? 'warning' : 'error',
      category: 'runtime',
      code: FINDING_CODES.runtime_page_error,
      message: `${pageErrors.length} excepción(es) no capturada(s) (pageerror). Ej: ${pageErrors[0]}`
    })
  }

  if (hydration.length) {
    findings.push({
      severity: options.failOnHydrationWarning ? 'error' : 'warning',
      category: 'runtime',
      code: FINDING_CODES.runtime_hydration_warning,
      message: `${hydration.length} warning(s) de hydration (best-effort). Ej: ${hydration[0]}`
    })
  }

  if (httpFailures.length) {
    findings.push({
      severity: options.failOnHttpStatus ? 'error' : 'warning',
      category: 'runtime',
      code: FINDING_CODES.runtime_http_error,
      message: `${httpFailures.length} response(s) 4xx/5xx. Ej: ${httpFailures[0].status} ${httpFailures[0].url}`
    })
  }

  return findings
}
