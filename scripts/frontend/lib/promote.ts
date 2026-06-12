/**
 * GVC promote — helpers puros para cristalizar una sesión de explore en un
 * `.scenario.ts` determinístico (TASK-1098, Capa 3).
 *
 * El output durable de GVC SIEMPRE es el DSL gobernado: la improvisación de
 * explore se DESTILA a un scenario (con sus quality gates, failure taxonomy y
 * determinismo de baseline). Estos helpers son puros (sin IO) para testearlos.
 */

import type { ExploreSession } from './explore'
import type { CaptureReadiness, CaptureScenario, CaptureScenarioStep } from './scenario'

export interface PromoteOptions {
  /** Nombre kebab-case del scenario (= nombre de archivo). */
  name: string
  /** Selectores extra a marcar con clipSelector (regiones de detalle). */
  markSelectors?: string[]
  viewport?: { width: number; height: number }
}

const DEFAULT_VIEWPORT = { width: 1440, height: 900 }

const ABSENT_GUARDS = ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root']

/**
 * Elige un selector de readiness estable desde la sesión:
 * 1. un marker `data-gvc-ready`/`data-capture` (lo más estable),
 * 2. sino un heading único con nombre (vía `role=heading[name="…"]`),
 * 3. sino undefined (readiness queda solo con los absentSelectors + fonts).
 */
export const pickReadinessSelector = (session: ExploreSession): string | undefined => {
  const readyMarker = session.markers.find(m => m.selector.includes('data-gvc-ready') && m.count > 0)

  if (readyMarker) return readyMarker.selector

  const captureMarker = session.markers.find(m => m.selector.includes('data-capture') && m.count > 0)

  if (captureMarker) return captureMarker.selector

  const heading = session.candidates.find(c => c.role === 'heading' && c.name && c.unique)

  if (heading) return `role=heading[name=${JSON.stringify(heading.name)}]`

  return undefined
}

const slugifyLabel = (selector: string, index: number): string => {
  const slug = selector
    .replace(/\[data-capture="?([^"\]]+)"?\]/i, '$1')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return slug ? `section-${slug}` : `section-${index + 1}`
}

/**
 * Destila una sesión de explore en un `CaptureScenario` válido:
 * readiness sugerido + `mark` inicial full-viewport + un `scroll`+`mark`
 * (clipSelector) por cada selector de detalle pedido. NUNCA mutating.
 */
export const buildPromotedScenario = (session: ExploreSession, opts: PromoteOptions): CaptureScenario => {
  const readinessSelector = pickReadinessSelector(session)

  const readiness: CaptureReadiness = {
    ...(readinessSelector ? { selector: readinessSelector } : {}),
    absentSelectors: ABSENT_GUARDS,
    waitForFonts: true,
    postReadyDelayMs: 150,
    timeout: 12000,
    note: 'Generado por fe:capture:promote desde una sesión de explore (TASK-1098).'
  }

  const steps: CaptureScenarioStep[] = [{ kind: 'mark', label: 'initial' }]

  const usedLabels = new Set<string>(['initial'])

  for (const [index, selector] of (opts.markSelectors ?? []).entries()) {
    let label = slugifyLabel(selector, index)

    while (usedLabels.has(label)) label = `${label}-${index + 1}`
    usedLabels.add(label)

    steps.push({ kind: 'scroll', selector, scrollBlock: 'center' })
    steps.push({ kind: 'mark', label, clipSelector: selector })
  }

  return {
    name: opts.name,
    route: session.route,
    viewport: opts.viewport ?? DEFAULT_VIEWPORT,
    initialHoldMs: 1500,
    finalHoldMs: 200,
    readiness,
    assertions: [
      { kind: 'noLoginRedirect', reason: 'authenticated route expected' },
      { kind: 'noErrorBoundary', reason: 'visual evidence should not capture app error' }
    ],
    steps
  }
}

/**
 * Serializa un `CaptureScenario` a un módulo `.scenario.ts` válido. Usa
 * JSON.stringify (subset válido de TS para el literal) — siempre parseable y
 * sin riesgo de inyección de código.
 */
export const serializeScenario = (scenario: CaptureScenario): string => {
  const body = JSON.stringify(scenario, null, 2)

  return `import type { CaptureScenario } from '../lib/scenario'

// Generado por \`pnpm fe:capture:promote\` desde una sesión de explore (TASK-1098).
// Revisá selectores/readiness/marks y ajustá antes de commitear. Preferí
// user-facing locators (getByRole/data-markers) sobre CSS frágil.
export const scenario: CaptureScenario = ${body}
`
}
