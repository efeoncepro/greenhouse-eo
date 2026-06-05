// TASK-1019 — Product Design mockup for Workforce Contracting Studio.
// Mockup only: no writes, no API calls, no ZapSign/PDF/email side effects.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'workforce-contracting-studio-mockup',
  route: '/hr/workforce/contracts/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="workforce-contracting-studio-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="workforce-contracting-studio-mockup"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: 'text=Revisión bilingüe', reason: 'la pantalla diferenciadora debe estar disponible' },
    { kind: 'visible', selector: 'text=ES + EN obligatorios', reason: 'el contrato bilingüe debe ser first-class' }
  ],
  steps: [
    { kind: 'mark', label: 'bilingual-review-first-fold', note: 'Revisión bilingüe: metadata, tabla ES/EN, rail de validación y barra de aprobación' },
    { kind: 'click', selector: 'button[aria-label="Centro operativo"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'command-center', note: 'Centro operativo: KPIs, queue operacional, rail de caso y acciones' },
    { kind: 'click', selector: 'button[aria-label="Flujo guiado"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'guided-builder', note: 'Flujo guiado: datos, validación legal y asistente Claude con límites' },
    { kind: 'scroll', selector: '[data-capture="workforce-contracting-studio-mockup"]', scrollBlock: 'end' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'collaborator-preview', clipSelector: '[data-capture="workforce-contracting-collaborator-preview"]', note: 'Preview colaborador: lectura, firma y descarga futura sin edición legal' }
  ]
}
