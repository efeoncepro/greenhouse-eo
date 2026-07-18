// TASK-1340 — Gobernanza del motor de CTAs (/growth/ctas) + preview del renderer portable.
// Captura el inventario real (CTA seeded por TASK-1339 en dev), las surfaces registradas y el
// preview del <greenhouse-cta> en sus variantes visuales (default/spotlight) con fixtures
// deterministas. El estado del flag OFF se captura honesto (chip + acciones deshabilitadas).
// Wireframe: docs/ui/wireframes/TASK-1340-growth-ctas-governance.md.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1340-growth-cta-renderer',
  route: '/growth/ctas',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 6000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="cta-inventory"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta interna autenticada (viewCode gestion.growth_ctas)' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: '01-inventory', clipSelector: '[data-capture="cta-inventory"]' },
    { kind: 'mark', label: '02-surfaces', clipSelector: '[data-capture="cta-surfaces"]' },

    // Preview: fixture default → capture; cambiar a spotlight → capture (variantes ricas).
    { kind: 'scroll', selector: '[data-capture="cta-preview-card"]' },
    { kind: 'sleep', ms: 1200 },
    { kind: 'mark', label: '03-preview-default', clipSelector: '[data-capture="cta-preview-card"]' },
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(2)' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '04-preview-spotlight', clipSelector: '[data-capture="cta-preview-card"]' }
  ]
}
