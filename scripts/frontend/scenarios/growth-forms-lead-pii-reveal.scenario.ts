import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1256 Slice 4 — GVC del panel de datos del lead con PII enmascarada + reveal
 * gobernado en el cockpit (/admin/growth/forms). Selecciona el form con submissions,
 * abre la evidencia y captura: PII masked por default + el diálogo de reveal (con
 * motivo + aviso de bitácora). NO confirma el reveal (no escribe audit/outbox).
 */
export const scenario: CaptureScenario = {
  name: 'growth-forms-lead-pii-reveal',
  route: '/admin/growth/forms',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 6000,
  finalHoldMs: 600,
  // Desktop-only: el flujo interactivo (seleccionar form → abrir evidencia) choca con
  // el drawer-modal del sidecar en mobile. La responsividad del cockpit la cubre el
  // scenario base `growth-forms-admin-cockpit`; el panel PII es el mismo componente.
  viewports: [{ name: 'desktop', width: 1440, height: 900 }],
  assertions: [
    { kind: 'noErrorBoundary' },
    { kind: 'noLoginRedirect' },
    { kind: 'visible', selector: '[data-capture="growth-forms-shell"]' },
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="growth-forms-command-center"]', timeout: 15000 },
    // Selecciona el form que tiene submissions con PII.
    { kind: 'click', selector: 'button[aria-pressed][aria-label*="Demo gate corporativo C"]', timeout: 10000 },
    { kind: 'sleep', ms: 600 },
    // Abre la evidencia → monta el panel de datos del lead (fetch /lead masked).
    { kind: 'click', selector: '[data-capture="growth-forms-open-evidence"]', timeout: 10000 },
    { kind: 'wait', selector: '[data-capture="growth-forms-lead-pii"] .MuiButton-root', timeout: 10000 },
    { kind: 'sleep', ms: 600, note: 'Fetch del lead masked resuelto' },
    {
      kind: 'mark',
      label: 'growth-forms-lead-pii-masked',
      clipSelector: '[data-capture="growth-forms-lead-pii"]',
      note: 'PII enmascarada por default (email c***@…) + chip Enmascarado + Revelar',
    },
    // Abre el diálogo de reveal (sin confirmar → no escribe audit/outbox).
    { kind: 'click', selector: '[data-capture="growth-forms-lead-pii"] button:has-text("Revelar")', timeout: 8000 },
    { kind: 'sleep', ms: 500 },
    {
      kind: 'mark',
      label: 'growth-forms-lead-pii-dialog',
      fullPage: true,
      note: 'Diálogo de reveal gobernado: motivo ≥10 + aviso de bitácora',
    },
  ],
}
