import { statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import type { Page } from 'playwright'

import { analyzeLayoutIntegrity } from './layout-integrity'
import type { CaptureFinding } from './manifest'
import type { CaptureAccessibilityQualityOptions, CaptureLayoutQualityOptions } from './scenario'

export interface FrameQualityOptions {
  frameLabel: string
  framePath: string
  allowEmpty?: boolean
  allowLoading?: boolean
  allowLogin?: boolean
  allowErrorBoundary?: boolean
  fullPage?: boolean
  accessibility?: CaptureAccessibilityQualityOptions
  layout?: CaptureLayoutQualityOptions
}

const DEFAULT_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

const DEFAULT_LOGIN_SELECTORS = [
  '[data-testid="login-card"]',
  'input[type="password"]',
  'form[action*="signin" i]',
  'text=/Iniciar sesión|Enter portal|Sign in/i'
]

const DEFAULT_ERROR_SELECTORS = [
  '[data-nextjs-error-overlay]',
  '[data-testid="error-boundary"]',
  '[role="alert"][data-severity="error"]',
  'text=/Application error|Unhandled Runtime Error|Something went wrong|Error inesperado/i'
]

const DEFAULT_LOADING_SELECTORS = [
  '[data-loading="true"]',
  '[aria-busy="true"]',
  '.MuiSkeleton-root'
]

const isVisible = async (page: Page, selector: string): Promise<boolean> => {
  try {
    return await page.locator(selector).first().isVisible({ timeout: 250 })
  } catch {
    return false
  }
}

const writeAxeArtifact = (
  framePath: string,
  payload: unknown
): { artifactName: string; artifactPath: string } => {
  const extension = extname(framePath)
  const baseName = basename(framePath, extension)
  const artifactName = `${baseName}.axe.json`
  const artifactPath = join(dirname(framePath), artifactName)

  writeFileSync(artifactPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')

  return { artifactName, artifactPath }
}

const analyzeAccessibility = async (
  page: Page,
  frameLabel: string,
  framePath: string,
  accessibility: CaptureAccessibilityQualityOptions
): Promise<CaptureFinding[]> => {
  const findings: CaptureFinding[] = []
  const tags = accessibility.tags?.length ? accessibility.tags : DEFAULT_AXE_TAGS
  let builder = new AxeBuilder({ page }).withTags(tags)

  if (accessibility.includeSelector) {
    builder = builder.include(accessibility.includeSelector)
  }

  try {
    const results = await builder.analyze()
    const violations = results.violations

    if (!violations.length) return findings

    const { artifactName } = writeAxeArtifact(framePath, {
      frameLabel,
      url: page.url(),
      includeSelector: accessibility.includeSelector ?? null,
      tags,
      violations,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable.length,
      passes: results.passes.length
    })

    const violationSummary = violations
      .map(violation => `${violation.id} (${violation.nodes.length})`)
      .join(', ')

    findings.push({
      severity: accessibility.failOnViolations === false ? 'warning' : 'error',
      category: 'accessibility',
      code: 'axe_violations',
      message: `Frame "${frameLabel}" tiene ${violations.length} violation(s) axe: ${violationSummary}. Detalle: frames/${artifactName}`,
      frameLabel,
      selector: accessibility.includeSelector
    })
  } catch (err) {
    findings.push({
      severity: accessibility.failOnViolations === false ? 'warning' : 'error',
      category: 'accessibility',
      code: 'axe_run_failed',
      message: err instanceof Error ? err.message : String(err),
      frameLabel,
      selector: accessibility.includeSelector
    })
  }

  return findings
}

export const analyzeFrameQuality = async (page: Page, options: FrameQualityOptions): Promise<CaptureFinding[]> => {
  const findings: CaptureFinding[] = []
  const frameLabel = options.frameLabel

  try {
    const bytes = statSync(options.framePath).size

    if (bytes < 10_000 && !options.allowEmpty) {
      findings.push({
        severity: 'warning',
        category: 'frame_quality',
        code: 'frame_small_file',
        message: `Frame "${frameLabel}" pesa ${(bytes / 1024).toFixed(1)} KB; puede estar vacío o ser poco útil.`,
        frameLabel
      })
    }
  } catch (err) {
    findings.push({
      severity: 'warning',
      category: 'frame_quality',
      code: 'frame_stat_failed',
      message: err instanceof Error ? err.message : String(err),
      frameLabel
    })
  }

  const url = new URL(page.url())

  if (options.fullPage) {
    const pageSize = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    }))

    if (pageSize.scrollHeight <= pageSize.viewportHeight * 1.05) {
      findings.push({
        severity: 'warning',
        category: 'frame_quality',
        code: 'full_page_without_scroll',
        message: `Frame "${frameLabel}" fue full-page pero la página no parece tener scroll real.`,
        frameLabel
      })
    }
  }

  if (!options.allowLogin && (url.pathname.startsWith('/login') || url.pathname.startsWith('/signin') || url.pathname.startsWith('/auth/'))) {
    findings.push({
      severity: 'error',
      category: 'auth_redirect',
      code: 'login_route_captured',
      message: `Frame "${frameLabel}" fue capturado en ${url.pathname}, no en la ruta esperada.`,
      frameLabel
    })
  }

  for (const selector of DEFAULT_LOGIN_SELECTORS) {
    if (!options.allowLogin && await isVisible(page, selector)) {
      findings.push({
        severity: 'error',
        category: 'auth_redirect',
        code: 'login_ui_visible',
        message: `Frame "${frameLabel}" parece mostrar UI de login.`,
        frameLabel,
        selector
      })
      break
    }
  }

  for (const selector of DEFAULT_ERROR_SELECTORS) {
    if (!options.allowErrorBoundary && await isVisible(page, selector)) {
      findings.push({
        severity: 'error',
        category: 'app_error',
        code: 'error_boundary_visible',
        message: `Frame "${frameLabel}" contiene una alerta o boundary de error.`,
        frameLabel,
        selector
      })
      break
    }
  }

  for (const selector of DEFAULT_LOADING_SELECTORS) {
    if (!options.allowLoading && await isVisible(page, selector)) {
      findings.push({
        severity: 'warning',
        category: 'frame_quality',
        code: 'loading_visible',
        message: `Frame "${frameLabel}" todavía muestra loading/skeleton dominante o explícito.`,
        frameLabel,
        selector
      })
      break
    }
  }

  if (options.accessibility?.enabled) {
    findings.push(...await analyzeAccessibility(page, frameLabel, options.framePath, options.accessibility))
  }

  if (options.layout?.enabled) {
    findings.push(...await analyzeLayoutIntegrity(page, frameLabel, options.layout))
  }

  return findings
}
