import type { CaptureScenario } from '../lib/scenario'

// TASK-968 — Contractor Engagement Compensation Setup + Agreed-Amount Guardrail mockup.
// Captures the 3 states (sin definir / definido / excede acuerdo) across the 3 surfaces
// (admin editor entry + drawer · contractor derived read-only · payable guardrail + override).
export const scenario: CaptureScenario = {
  name: 'contractor-compensation',
  route: '/hr/contractors/compensation/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 500,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'undefined-fullpage', fullPage: true, note: 'Estado Sin definir · empty state admin + contractor gated' },
    { kind: 'click', selector: 'button[value="defined"]' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: 'defined-fullpage', fullPage: true, note: 'Estado Definido · monto acordado + derivado read-only + guardrail OK' },
    { kind: 'click', selector: 'button:has-text("Editar compensación")' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'editor-drawer', clipSelector: '[role="dialog"]', note: 'Drawer editor con el monto acordado cargado' },
    { kind: 'click', selector: 'button:has-text("Cancelar")' },
    { kind: 'sleep', ms: 500 },
    { kind: 'click', selector: 'button[value="exceeds"]' },
    { kind: 'sleep', ms: 1000 },
    { kind: 'mark', label: 'exceeds-fullpage', fullPage: true, note: 'Estado Excede acuerdo · guardrail fail-closed' }
  ]
}
