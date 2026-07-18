// TASK-1430 — Cockpit operator de CTAs (/growth/ctas): master-detail + autoría gobernada.
// Ejercita inventario (selección por teclado), detalle (métricas/kill switch/superficies/
// supresión/versiones), el drawer de autoría completo (8 pasos con fills), el harness de
// preview (scrubber de density + matriz pairwise + degradación que bloquea revisión) y el
// dirty-close. NO muta estado: jamás hace submit ni toca lifecycle/kill switch.
// Wireframe: docs/ui/wireframes/TASK-1430-growth-cta-authoring-reporting-cockpit.md.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1430-growth-cta-cockpit',
  route: '/growth/ctas',
  // Mobile (390) vive en el scenario hermano `task-1430-growth-cta-cockpit-mobile`:
  // en compact el detalle es drawer del shell y los pasos difieren (el DSL no
  // condiciona steps por viewport).
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 6000,
  finalHoldMs: 500,
  // fills sin submit: el drawer se descarta al final (dirty-close → Descartar).
  // Seguro para captura: jamás hace submit ni toca lifecycle/kill switch.
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
  // GVC V1.5 — gates de calidad SIEMPRE en este cockpit (lección TASK-1430: el
  // "wireframe look" pasó el gate porque el rubric era opt-in y no se declaró).
  quality: {
    layout: { enabled: true, failOnViolations: false },
    runtime: { failOnConsoleError: false },
    enterpriseRubric: {
      enabled: true,
      failOnViolations: false,
      expectedDataCaptureRegions: ['cta-cockpit-shell', 'cta-inventory', 'cta-detail']
    }
  },
  steps: [
    // ── Workbench: inventario + detalle ──
    { kind: 'mark', label: '01-cockpit-shell' },
    { kind: 'mark', label: '02-inventory', clipSelector: '[data-capture="cta-inventory"]' },

    // Selección por teclado: foco en la primera opción → ↓ navega a la segunda.
    { kind: 'click', selector: '[role="option"]:nth-of-type(1)' },
    { kind: 'press', key: 'ArrowDown' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: '03-detail-header', clipSelector: '[data-capture="cta-detail"]' },
    { kind: 'scroll', selector: '[data-capture="cta-detail-metrics"], [data-capture="cta-detail-metrics-partial"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: '04-metrics', clipSelector: '[data-capture="cta-detail-metrics"], [data-capture="cta-detail-metrics-partial"]' },
    { kind: 'scroll', selector: '[data-capture="cta-surfaces"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: '05-surfaces', clipSelector: '[data-capture="cta-surfaces"]' },
    { kind: 'scroll', selector: '[data-capture="cta-detail-versions"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: '06-suppression-versions', clipSelector: '[data-capture="cta-detail-suppression"]' },

    // ── Autoría gobernada (drawer): 8 pasos, sin submit ──
    { kind: 'scroll', selector: '[data-capture="cta-cockpit-create"]' },
    { kind: 'click', selector: '[data-capture="cta-cockpit-create"]' },
    { kind: 'sleep', ms: 1400 },
    { kind: 'mark', label: '07-author-intent', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '08-author-placement', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '09-author-appearance', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },

    // Contenido: anatomía mínima (nombre + headline + label del botón).
    { kind: 'fill', selector: 'input[placeholder="ej. Descarga informe SEO Q2"]', value: 'GVC — informe SEO Q2' },
    { kind: 'fill', selector: 'input[placeholder="ej. Tu informe SEO del Q2 ya está disponible"]', value: 'Tu informe SEO del Q2 ya está disponible' },
    { kind: 'fill', selector: 'input[placeholder="ej. Descargar informe"]', value: 'Ver mi informe' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: '10-author-content', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },

    // Acción: kinds del registry (TASK-1431) + destino.
    { kind: 'fill', selector: 'input[placeholder="ej. /recursos/guia-pricing"]', value: '/recursos/informe-seo' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: '11-author-action', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '12-author-targeting', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 1600 },

    // Preview harness: renderer canónico + scrubber + matriz pairwise.
    { kind: 'mark', label: '13-author-preview', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-harness-degrade-toggle"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '14-preview-degraded-blocks-next', clipSelector: '.MuiDrawer-paper' },
    { kind: 'click', selector: '[data-capture="cta-harness-degrade-toggle"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'click', selector: '[data-capture="cta-author-next"]' },
    { kind: 'sleep', ms: 800 },

    // Revisión: checklist server-note + resumen listo.
    { kind: 'mark', label: '15-author-review', clipSelector: '.MuiDrawer-paper' },

    // Dirty-close: Escape → confirmación de descarte explícita.
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '16-dirty-close-confirm' },
    { kind: 'click', selector: '.MuiDialog-root button.MuiButton-containedError' },
    { kind: 'sleep', ms: 800 },
    { kind: 'mark', label: '17-back-to-cockpit' }
  ]
}
