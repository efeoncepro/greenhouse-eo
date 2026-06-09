// TASK-1021 — Runtime Admin Viewer del Workforce Contracting Studio.
// Promoción del mockup a runtime: Command Center (queue + detail rail), Guided Builder
// (create form) y Bilingual Review Desk consumiendo readers + commands reales.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'workforce-contracting-studio-runtime',
  route: '/hr/workforce/contracts',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="workforce-contracting-studio"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="workforce-contracting-studio"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: 'text=Contratos laborales', reason: 'título runtime' },
    { kind: 'visible', selector: 'text=ES + EN obligatorios', reason: 'contrato bilingüe first-class' }
  ],
  steps: [
    { kind: 'mark', label: 'command-center', note: 'Centro operativo: KPIs computados, queue filtrable + detail rail (estados honestos)' },
    { kind: 'click', selector: 'button[aria-label="Flujo guiado"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'guided-builder-create', note: 'Flujo guiado: form de creación (tipo, persona, pack, fecha, ref. legal condicional)' },
    { kind: 'click', selector: 'button[aria-label="Revisión bilingüe"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'bilingual-review-empty', note: 'Revisión bilingüe: estado honesto cuando no hay caso seleccionado' }
  ]
}
