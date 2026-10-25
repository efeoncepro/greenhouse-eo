import type { CaptureScenario } from '../lib/scenario'

/** Anonymous recovery only: no invitation token, code, identity cookie or mailbox enters GVC.
 * Run against local Rooms with both lanes enabled. The focused real-issuer harness proves
 * the two exact anonymous 404/401 probes and authenticated states without recording secrets.
 */
export const scenario: CaptureScenario = {
  name: 'rooms-invitation-entry', route: '/invite', authentication: 'anonymous',
  mutating: false, safeForCapture: true, qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'compact', width: 320, height: 740 },
  ],
  readiness: { selector: '[data-capture="invitation-recovery"]', waitForFonts: true, postReadyDelayMs: 200 },
  assertions: [
    { kind: 'visible', selector: 'role=heading[name="Tu invitación empieza en el correo."]' },
    { kind: 'noErrorBoundary' },
  ],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: {
      failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true,
      // Exact anonymous recovery probes; all other endpoints remain blocking.
      ignoreUrlPatterns: ['/api/invitations/(transaction|session)$'],
      ignoreConsolePatterns: ['^Failed to load resource: the server responded with a status of (401|404) \\(.*\\)$'],
    },
    assets: { enabled: true, failOnViolations: true },
    keyboard: { enabled: true, failOnViolations: true, reducedMotionCheck: true, probes: [{ name: 'skip-to-entry', startSelector: '.skip-link', keys: ['Enter'], expectedFocusSelector: '#main-content', requireVisibleFocusRing: false }] },
    performance: { enabled: true, severity: 'error', maxDomNodes: 800, maxRequests: 100, maxTransferBytes: 3000000, maxFcpMs: 10000 },
    enterpriseRubric: { enabled: true, failOnViolations: true, requireSurfaceRecipeMarker: true },
  },
  steps: [{ kind: 'mark', label: 'invitation-empty', fullPage: true }],
}
