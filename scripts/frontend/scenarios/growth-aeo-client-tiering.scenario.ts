// TASK-1278 — AEO client tiering + PLG trial (nodo S6, EPIC-020) GVC verification.
// Targets the deterministic tiering harness (/aeo/mockup/tiering gallery) so the capture is data-independent
// — the real route /aeo resolves the surface per-org entitlement (no tiers without a live grader run + module
// assignment). One scenario captures the 4 tier states via clipped marks: contratado (workbench), trial con
// cupo (banner "Te quedan N de 3" + generar revisión), trial agotado (upsell, not error), y sin acceso
// (teaser/locked gratis). Desktop + 390px, sin scroll horizontal.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-aeo-client-tiering',
  route: '/aeo/mockup/tiering',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 3500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="aeo-tiering-gallery"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: '01-contratado', clipSelector: '[data-capture="tier-gallery-contracted"]' },
    { kind: 'scroll', selector: '[data-capture="tier-gallery-trial"]', scrollBlock: 'start' },
    { kind: 'mark', label: '02-trial-disponible', clipSelector: '[data-capture="tier-gallery-trial"]' },
    { kind: 'scroll', selector: '[data-capture="tier-gallery-exhausted"]', scrollBlock: 'start' },
    { kind: 'mark', label: '03-trial-agotado', clipSelector: '[data-capture="tier-gallery-exhausted"]' },
    { kind: 'scroll', selector: '[data-capture="tier-gallery-locked"]', scrollBlock: 'start' },
    { kind: 'mark', label: '04-locked', clipSelector: '[data-capture="tier-gallery-locked"]' }
  ]
}

export default scenario
