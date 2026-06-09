// TASK-1024 GVC — Workforce Contracting Studio · Bilingual Review desk.
// Verifies the enterprise clause-rendering redesign: sub-clause hierarchy
// (N.N hanging numbers), highlighted [POR DEFINIR …] placeholders, friendly
// language headers (Español "Versión legal" / Inglés "Referencia"), human
// section labels, and the per-clause "N por definir" scan chip.
// Read-only navigation (selects a seeded case + opens the review desk).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'workforce-contracting-bilingual-review',
  route: '/hr/workforce/contracts',
  viewport: { width: 1440, height: 1000 },
  mutating: false,
  safeForCapture: true,
  initialHoldMs: 1400,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="workforce-contracting-command-center"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el estudio vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'command-center', note: 'Centro operativo — tabla 4 columnas + avatares' },

    // Select the AI-drafted international_internal case (real Claude draft with
    // N.N sub-clauses + [POR DEFINIR …] placeholders — exercises the redesign).
    { kind: 'click', selector: 'tr:has-text("Maggie")' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'case-rail', note: 'Detalle del caso (rail) con avatar + pack humano' },

    // Open the Bilingual Review desk.
    { kind: 'click', selector: 'button:has-text("Revisar borrador bilingüe")' },
    { kind: 'sleep', ms: 1100 },
    { kind: 'mark', label: 'review-desk', note: 'Desk de revisión bilingüe — jerarquía de cláusulas' },

    // Full desk + a clipped read of the table for legible detail.
    { kind: 'scroll', selector: '[data-capture="workforce-contracting-bilingual-review"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 350 },
    {
      kind: 'mark',
      label: 'clause-hierarchy',
      clipSelector: '[data-capture="workforce-contracting-bilingual-review"]',
      note: 'Cláusulas con sub-numeración N.N + placeholders [POR DEFINIR] resaltados + headers amigables'
    }
  ]
}
