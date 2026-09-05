import type { CaptureScenario } from '../lib/scenario'

/** Local first-fold fixtures only: AGENT_AUTH_BASE_URL=http://127.0.0.1:19035. */
export const scenario: CaptureScenario = {
  name: 'task1835-efeonce-id',
  route: '/login',
  authentication: 'anonymous',
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  readiness: { selector: '[data-capture="id-shell"]', waitForFonts: true, timeout: 10000 },
  assertions: [
    {
      kind: 'visible',
      selector: '[data-capture="id-shell"]',
      reason: 'El harness debe renderizar la superficie de identidad.'
    },
    { kind: 'noErrorBoundary', reason: 'Un error no acredita el first fold.' }
  ],
  quality: {
    allowLogin: true,
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'body', minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{ name: 'decision-focus', startSelector: '#page-title', keys: ['Tab'], requireVisibleFocusRing: true }]
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 500,
      maxRequests: 12,
      maxTransferBytes: 600000,
      maxFcpMs: 5000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="id-shell"]',
      failOnViolations: true,
      placeholderTerms: ['lorem ipsum'],
      expectedDataCaptureRegions: ['id-shell', 'id-client']
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'login-first-fold',
      fullPage: true,
      note: 'Vista ficticia de entrada corporativa y por invitación, sin llamadas de autenticación.'
    },
    { kind: 'click', selector: '[data-capture="id-corporate-action"]' },
    { kind: 'wait', selector: '[data-capture="id-organization"]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'consent-first-fold',
      fullPage: true,
      note: 'Organización y permisos ficticios; permitir no concede acceso.'
    }
  ]
}
