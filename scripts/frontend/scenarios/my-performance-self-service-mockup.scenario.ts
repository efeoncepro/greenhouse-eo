// TASK-1027 — Product Design prototype for /my/performance rich self-service activity.
// Mockup only: no API calls, no writes, no admin links.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'my-performance-self-service-mockup',
  route: '/my/performance/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="my-performance-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    { kind: 'visible', selector: 'text=Mi desempeño', reason: 'la superficie debe declarar el objetivo personal' },
    { kind: 'visible', selector: 'text=Nexa Insights', reason: 'Nexa Insights debe quedar visible en el primer fold' },
    { kind: 'visible', selector: 'text=Este período sigue en curso', reason: 'el estado parcial debe ser honesto' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Header, foco personal, Nexa, KPIs y tendencias principales' },
    {
      kind: 'interaction',
      interaction: {
        name: 'refresh-feedback',
        intent: 'Verifica que Actualizar entregue feedback inmediato sin crear una acción primaria falsa.',
        action: { kind: 'click', selector: 'button[aria-label="Actualizar datos"]' },
        frames: [
          { label: 'progress', atMs: 120, clipSelector: '[data-capture="my-performance-header"]', note: 'Feedback de actualización activo' },
          { label: 'complete', atMs: 780, clipSelector: '[data-capture="my-performance-header"]', note: 'Estado de actualización completado' }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button[aria-label="Actualizar datos"]' },
          expected: 'El botón Actualizar datos tiene foco visible y nombre accesible.'
        },
        reducedMotion: 'skip'
      }
    },
    { kind: 'scroll', selector: '[data-capture="my-performance-nexa"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 200 },
    {
      kind: 'interaction',
      interaction: {
        name: 'nexa-history-transition',
        intent: 'Verifica que el bloque Nexa cambie de resumen a historial con transición suave y mantenga affordance de teclado.',
        action: { kind: 'click', selector: 'button:has-text("Historial")' },
        frames: [
          { label: 'start', atMs: 80, clipSelector: '[data-capture="my-performance-nexa"]', note: 'Inicio de transición hacia historial Nexa' },
          { label: 'settled', atMs: 360, clipSelector: '[data-capture="my-performance-nexa"]', note: 'Historial Nexa visible y estable' }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button:has-text("Resumen")' },
          expected: 'El segmented control mantiene foco visible y ruta keyboard.'
        },
        reducedMotion: 'skip'
      }
    },
    { kind: 'scroll', selector: '[data-capture="my-performance-mockup"]', scrollBlock: 'end' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'charts', note: 'Actividad, radar de salud operativa y distribución CSC' }
  ]
}
