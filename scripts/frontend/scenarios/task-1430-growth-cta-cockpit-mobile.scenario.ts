// TASK-1430 — Cockpit de CTAs en compact (390): el detalle colapsa al drawer
// canónico del Composition Shell (trigger `composition-shell-aside-drawer-trigger`)
// preservando el inventario; la autoría corre sin el rail (oculto en compact).
// NO muta estado (fills sin submit; dirty-close → Descartar al final).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1430-growth-cta-cockpit-mobile',
  route: '/growth/ctas',
  viewport: { width: 390, height: 844 },
  initialHoldMs: 6000,
  finalHoldMs: 500,
  mutating: true,
  safeForCapture: true,
  readiness: {
    selector: '[data-capture="cta-inventory"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 900,
    timeout: 25000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta interna autenticada (viewCode gestion.growth_ctas)' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    layout: { enabled: true, failOnViolations: false },
    runtime: { enabled: true, failOnViolations: false },
    enterpriseRubric: { enabled: true, failOnViolations: false }
  },
  steps: [
    { kind: 'mark', label: '01-mobile-shell' },
    { kind: 'mark', label: '02-mobile-inventory', clipSelector: '[data-capture="cta-inventory"]' },

    // Detalle = drawer temporal del shell (inventario/filtros se preservan detrás).
    { kind: 'click', selector: '[role="option"]:nth-of-type(1)' },
    { kind: 'sleep', ms: 1200 },
    { kind: 'scroll', selector: '[data-capture="composition-shell-aside-drawer-trigger"]' },
    { kind: 'click', selector: '[data-capture="composition-shell-aside-drawer-trigger"]' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: '03-mobile-detail-drawer' },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 700 },

    // Autoría en compact: sin rail (oculto), contenido + footer operables.
    { kind: 'scroll', selector: '[data-capture="cta-cockpit-create"]' },
    { kind: 'click', selector: '[data-capture="cta-cockpit-create"]' },
    { kind: 'sleep', ms: 1400 },
    { kind: 'mark', label: '04-mobile-author-intent' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'fill', selector: 'input[placeholder="ej. Descarga informe SEO Q2"]', value: 'GVC móvil' },
    { kind: 'fill', selector: 'input[placeholder="ej. Tu informe SEO del Q2 ya está disponible"]', value: 'Tu informe está listo' },
    { kind: 'fill', selector: 'input[placeholder="ej. Descargar informe"]', value: 'Ver informe' },
    { kind: 'mark', label: '05-mobile-author-content' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'fill', selector: 'input[placeholder="ej. /recursos/guia-pricing"]', value: '/recursos/informe' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: '06-mobile-author-preview' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '07-mobile-author-review' },

    // Dirty-close explícito.
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '08-mobile-dirty-confirm' },
    { kind: 'click', selector: '.MuiDialog-root button.MuiButton-containedError' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '09-mobile-back' }
  ]
}
