// TASK-1231 — Growth Forms portable renderer preview (verificación interna GVC).
// El mismo core Web Component que WordPress/Astro renderizan en producción, montado
// desde fixtures del render_contract bajo el Design System.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-forms-renderer-preview',
  route: '/design-system/growth-forms-renderer',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="growth-forms-renderer-preview"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'preview interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'growth-forms-renderer-default',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Formulario interactivo (estado default)'
    },
    {
      kind: 'mark',
      label: 'growth-forms-renderer-fullpage',
      fullPage: true,
      note: 'Preview completo: canvas + embed snippet'
    }
  ]
}
