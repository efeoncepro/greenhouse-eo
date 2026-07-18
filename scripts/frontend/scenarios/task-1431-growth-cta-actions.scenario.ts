// TASK-1431 — Action Registry + navegación gobernada: preview del renderer en /growth/ctas
// con las fixtures de la familia navigate (link_url interno/externo, open_think_tool,
// book_meeting). El preview corre con `inertNavigation` (jamás navega el portal): el click
// plain demuestra pending accesible (aria-disabled + role=status) y el restore acotado.
// Las URL/rel/target assertions duras viven en los unit tests del renderer
// (`src/growth-cta-renderer/__tests__/renderer.test.ts`); esta captura es la evidencia
// visual de que TODAS las familias comparten el mismo shell (cero skin por action kind).
// Wireframe: docs/ui/wireframes/TASK-1431-growth-cta-action-registry-navigation-adapters.md.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1431-growth-cta-actions',
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
    { kind: 'scroll', selector: '[data-capture="cta-preview-card"]' },
    { kind: 'sleep', ms: 1200 },

    // link_url interno: anchor real, mismo shell visual que open_growth_form.
    { kind: 'click', selector: 'role=button[name="link_url interno (path same-origin, mismo contexto)"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '01-link-internal-ready', clipSelector: '[data-capture="cta-preview-card"]' },

    // Click plain sobre el anchor (inert en preview): pending accesible single-dispatch.
    { kind: 'click', selector: '[data-capture="cta-preview"] .ghc-primary' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: '02-link-internal-pending', clipSelector: '[data-capture="cta-preview-card"]' },

    // Restore acotado (4s): el mismo control vuelve habilitado con foco recuperable.
    { kind: 'sleep', ms: 4200 },
    { kind: 'mark', label: '03-link-internal-restored', clipSelector: '[data-capture="cta-preview-card"]' },

    // link_url externo + pestaña nueva (target/_blank + rel seguro + hint sr-only).
    { kind: 'click', selector: 'role=button[name="link_url externo (https, pestaña nueva + rel seguro)"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '04-link-external-newtab', clipSelector: '[data-capture="cta-preview-card"]' },

    // open_think_tool: continuidad a herramienta Think (URL compuesta sobre hub gobernado).
    { kind: 'click', selector: 'role=button[name="open_think_tool (hub Think + campaign context UTM)"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '05-think-tool', clipSelector: '[data-capture="cta-preview-card"]' },

    // book_meeting: expectativa honesta de agenda (navegación-only, cero write CRM).
    { kind: 'click', selector: 'role=button[name="book_meeting (agenda gobernada; navegación-only)"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '06-book-meeting', clipSelector: '[data-capture="cta-preview-card"]' }
  ]
}
