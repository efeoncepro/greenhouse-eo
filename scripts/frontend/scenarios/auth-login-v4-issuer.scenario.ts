import type { CaptureScenario } from '../lib/scenario'

/** TASK-2064. Anonymous read-only issuer harness; no auth command is executed. */
export const scenario: CaptureScenario = {
  name: 'auth-login-v4-issuer', route: '/login/rooms', authentication: 'anonymous',
  mutating: false, safeForCapture: true, qualityProfile: 'premium',
  viewport: { width: 1440, height: 960 },
  viewports: [{ name: 'desktop', width: 1440, height: 960 }, { name: 'laptop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }, { name: 'compact', width: 320, height: 740 }],
  readiness: { selector: '[data-capture="login-form"]', waitForFonts: true, postReadyDelayMs: 500 },
  assertions: [{ kind: 'visible', selector: '[data-capture="login-form"]' }, { kind: 'noErrorBoundary' }],
  quality: {
    allowLogin: true,
    accessibility: { enabled: true, failOnViolations: true },
    // Zoomed SVG pixels are clipped by the lens and stage; the page and outer SVG remain checked.
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true, ignoreSelectors: ['[data-login-lens] g[clip-path]', '.id-v4-lens-inside'] },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: { enabled: true, failOnViolations: true, reducedMotionCheck: true, probes: [{ name: 'email-to-submit', startSelector: '#email', keys: ['Tab'], expectedFocusSelector: 'button[type="submit"]', requireVisibleFocusRing: true }] },
    performance: { enabled: true, severity: 'error', maxDomNodes: 600, maxRequests: 20, maxTransferBytes: 3000000, maxFcpMs: 10000 },
    enterpriseRubric: { enabled: true, failOnViolations: true, requireSurfaceRecipeMarker: true }
  },
  steps: [
    { kind: 'mark', label: 'first-fold' },
    { kind: 'interaction', interaction: { name: 'email-submit-feedback', intent: 'Clear pointer and keyboard feedback without submitting authentication', action: { kind: 'hover', selector: 'button[type="submit"]' }, frames: [{ label: 'hover-start', atMs: 0 }, { label: 'hover-settled', atMs: 240 }], reducedMotion: 'capture', keyboardEquivalent: { action: { kind: 'focus', selector: 'button[type="submit"]' }, expected: 'Visible focus ring' } } },
    { kind: 'mark', label: 'full-page', fullPage: true }
  ]
}
