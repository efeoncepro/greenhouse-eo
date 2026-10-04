import type { CaptureScenario } from '../lib/scenario'

/** Read-only integration QA against the disposable Studio database, not a design approval. */
export const scenario: CaptureScenario = {
  name: 'task2001-studio-owned',
  route: '/calendar?date=2026-10-05',
  authentication: 'anonymous',
  viewport: { width: 1440, height: 960 },
  viewports: [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }],
  initialHoldMs: 1000,
  readiness: { selector: 'main', waitForFonts: true, timeout: 20000 },
  assertions: [{ kind: 'noErrorBoundary', reason: 'El calendario consume el contrato local de activaciones.' }],
  quality: { runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true } },
  steps: [
    { kind: 'mark', label: 'calendar', fullPage: true },
    ...(['week', 'day', 'timeline', 'paid'] as const).flatMap(view => [
      { kind: 'click' as const, selector: `nav[aria-label="Vista"] a[href*="view=${view}"]` },
      { kind: 'sleep' as const, ms: 600 },
      { kind: 'mark' as const, label: view, fullPage: true }
    ])
  ]
}
