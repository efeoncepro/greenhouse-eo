import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'offboarding-queue-microinteractions-v2',
  route: '/hr/offboarding',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 700,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 8000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'authenticated HR route expected' },
    { kind: 'noErrorBoundary', reason: 'microinteraction evidence should not capture error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'initial-loaded', note: 'Estado inicial antes de microinteractions V2' },
    {
      kind: 'interaction',
      interaction: {
        name: 'action-filter-hover',
        action: { kind: 'hover', selector: '[role="tab"][aria-label*="Requieren acción"]' },
        intent: 'Confirmar feedback hover del KPI/filtro antes de activarlo',
        frames: [
          { label: 'before', atMs: 0 },
          { label: 'hover-feedback', atMs: 150 },
          { label: 'settled', atMs: 300 }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', key: 'Tab' },
          expected: 'El foco debe ser visible en el carril de filtros'
        },
        reducedMotion: 'capture'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'row-hover',
        action: { kind: 'hover', selector: 'tbody tr:first-child' },
        intent: 'Verificar que una fila actionable entrega feedback antes del click',
        frames: [
          { label: 'before', atMs: 0 },
          { label: 'hover-feedback', atMs: 180 }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', key: 'Tab' },
          expected: 'El foco debe poder navegar hacia la tabla o accion relacionada'
        }
      }
    }
  ]
}
