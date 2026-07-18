// TASK-1429 — Slide-in interruptivo + CTA Experience System en el preview de /growth/ctas.
// Captura: matriz de density del slide_in (full|condensed|peek por container query del
// propio shell), appearances (default/spotlight/minimal/unknown-fallback) y el overlay
// VIVO (SlideInController immediate): apertura sin focus steal, Escape (keyboard) →
// dismissed con salida allow-discrete. Los contratos de foco/guard/reapertura quedan
// además asegurados por unit tests (slide-in.test.ts). Mutating=true SOLO por el press
// de Escape (fixtures deterministas; cero datos reales).
// Wireframe: docs/ui/wireframes/TASK-1429-growth-cta-interruptive-placement.md.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1429-growth-cta-interruptive-placement',
  route: '/growth/ctas',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  mutating: true,
  // Seguro para captura: el preview usa fixtures deterministas (cero datos reales);
  // el único step "mutante" es el press de Escape sobre el overlay demo.
  safeForCapture: true,
  initialHoldMs: 6000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="cta-preview-card"]',
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
    // Fixture slide_in (chip 6): matriz de density derivada del contenedor.
    { kind: 'scroll', selector: '[data-capture="cta-preview-card"]' },
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(6)' },
    { kind: 'sleep', ms: 1200 },
    { kind: 'mark', label: '01-density-full', clipSelector: '[data-capture="cta-preview-density-full"]' },
    { kind: 'mark', label: '02-density-condensed', clipSelector: '[data-capture="cta-preview-density-condensed"]' },
    { kind: 'mark', label: '03-density-peek', clipSelector: '[data-capture="cta-preview-density-peek"]' },

    // Overlay VIVO: abre inmediato (sin focus steal), captura y cierra con Escape (teclado).
    { kind: 'click', selector: '[data-capture="cta-slidein-demo-trigger"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '04-slidein-open-overlay' },
    { kind: 'press', selector: '.ghc-slidein .ghc-primary', key: 'Escape' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: '05-slidein-escaped' },

    // Appearances del slide_in: spotlight (chip 7), minimal (chip 8) y unknown → default (chip 10).
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(7)' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '06-appearance-spotlight', clipSelector: '[data-capture="cta-preview-density-full"]' },
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(8)' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '07-appearance-minimal', clipSelector: '[data-capture="cta-preview-density-full"]' },
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(10)' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '08-appearance-unknown-fallback', clipSelector: '[data-capture="cta-preview-density-full"]' },

    // Copy largo (chip 9): límite de alto + composición sin clipping engañoso.
    { kind: 'click', selector: '[data-capture="cta-preview-card"] .MuiChip-root:nth-of-type(9)' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: '09-long-copy', clipSelector: '[data-capture="cta-preview-density-condensed"]' }
  ]
}
