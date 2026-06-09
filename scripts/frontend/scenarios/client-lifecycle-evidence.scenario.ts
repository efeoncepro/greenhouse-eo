// TASK-1017 — Capture del checklist de onboarding con la capa de evidencia.
// Corre la verificación on-demand ("Verificar evidencia") sobre un caso real (Berel)
// y captura los chips de evidencia (detectado / sin detectar / no verificable) bajo
// cada paso auto-derivable. Ruta flag-gated CLIENT_LIFECYCLE_ONBOARDING_ENABLED.
// clipSelector sobre el panel del checklist (evita fullPage ilegible con sidebar fijo).

import type { CaptureScenario } from '../lib/scenario'

const BEREL_ORG_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'client-lifecycle-evidence',
  route: `/agency/clients/${BEREL_ORG_ID}/lifecycle`,
  viewport: { width: 1440, height: 1100 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="onboarding-checklist"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el timeline vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe mostrar un error boundary' },
    { kind: 'visible', selector: 'text=Verificar evidencia', reason: 'el botón de verificación de evidencia está presente' }
  ],
  steps: [
    { kind: 'mark', label: 'checklist-idle', clipSelector: '[data-capture="onboarding-checklist"]', note: 'Checklist sin verificar (estado base)' },
    { kind: 'click', selector: 'button:has-text("Verificar evidencia")' },
    { kind: 'wait', selector: 'text=Detectado', timeout: 20000 },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'checklist-evidence', clipSelector: '[data-capture="onboarding-checklist"]', note: 'Checklist con evidencia real por paso (detectado / sin detectar / no verificable)' }
  ]
}
