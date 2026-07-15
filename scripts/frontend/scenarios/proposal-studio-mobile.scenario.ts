// TASK-1413 — Proposal Studio en mobile (390px): tabla contenida (scroll interno del
// DataTableShell, nunca overflow del body) + sidecar como surface móvil.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'proposal-studio-mobile',
  route: '/admin/commercial/proposals',
  viewport: { width: 390, height: 844 },
  initialHoldMs: 1800,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin gated por viewCode + capability' },
    { kind: 'noErrorBoundary', reason: 'la lista debe renderizar, no un error boundary' }
  ],
  steps: [
    { kind: 'wait', selector: 'tbody tr', timeout: 12000 },
    { kind: 'mark', label: 'lista-mobile', note: 'Tabla contenida a 390px sin scroll horizontal del body' },
    { kind: 'click', selector: 'tbody tr' },
    { kind: 'wait', selector: '.MuiAccordion-root', timeout: 15000 },
    { kind: 'mark', label: 'sidecar-mobile', note: 'Sidecar móvil con versiones + descarga' }
  ]
}
