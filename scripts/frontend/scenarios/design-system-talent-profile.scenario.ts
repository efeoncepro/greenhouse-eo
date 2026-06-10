// Internal Talent Profile Lab verification — dossier and verification primitives.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-talent-profile',
  route: '/design-system/talent-profile',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'talent-profile-lab',
      fullPage: true,
      note: 'Laboratorio interno dedicado para GreenhouseTalentProfileDossier y GreenhouseVerificationBadge'
    }
  ]
}
