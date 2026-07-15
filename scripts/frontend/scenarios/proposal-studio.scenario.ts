// TASK-1413 — Proposal Studio (/admin/commercial/proposals): lista de propuestas
// + sidecar de versiones por artefacto + descarga gobernada. Captura desktop.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'proposal-studio',
  route: '/admin/commercial/proposals',
  viewport: { width: 1440, height: 900 },
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
    { kind: 'mark', label: 'lista', note: 'Tabla de propuestas: estado, origen, deadline, artefactos' },
    { kind: 'click', selector: 'tbody tr' },
    { kind: 'wait', selector: '.MuiAccordion-root', timeout: 15000 },
    { kind: 'mark', label: 'sidecar', note: 'Sidecar: historial de versiones por kind + descarga + chip Interno' }
  ]
}
