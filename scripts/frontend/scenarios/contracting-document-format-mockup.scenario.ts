import type { CaptureScenario } from '../lib/scenario'

const STAGE = '[data-capture-stage="contracting-document"]'

export const scenario: CaptureScenario = {
  name: 'contracting-document-format-mockup',
  route: '/hr/workforce/contracts/mockup/documents',
  viewport: { width: 1440, height: 1000 },
  initialHoldMs: 1800,
  finalHoldMs: 500,
  readiness: {
    selector: 'h1',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 12000
  },
  assertions: [{ kind: 'noLoginRedirect', reason: 'mockup route is authenticated (dashboard group)' }],
  steps: [
    // O1 — Carta oferta, draft (default). ES prevalente + espejo EN.
    { kind: 'mark', label: 'offer-draft', clipSelector: STAGE, note: 'Carta oferta O1 — proyecto (ES + EN)' },
    // C2 — Contrato, draft.
    { kind: 'click', selector: '[data-capture-toggle="contract"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'contract-draft', clipSelector: STAGE, note: 'Contrato C2 — proyecto (ES + EN)' },
    // C2 — Contrato, firmado (sin watermark, firma estampada).
    { kind: 'click', selector: '[data-capture-toggle="signed"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'contract-signed', clipSelector: STAGE, note: 'Contrato C2 — firmado' }
  ]
}
