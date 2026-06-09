// Product Design mockup — Organization Workspace Enterprise Detail.
// Mockup only: no writes, no API calls, no changes to the runtime organization shell.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'organization-workspace-enterprise-detail-mockup',
  route: '/agency/organizations/mockup/enterprise-detail',
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'laptop', width: 1280, height: 860 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1400,
  finalHoldMs: 400,
  baseline: {
    surfaceId: 'agency.organizations.enterprise-detail',
    baselineName: 'organization-workspace-enterprise-detail-approved-mockup',
    approvedMockupCaptureDir: '.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup',
    requiredFrameLabels: ['delivery-first-fold', 'finance-facet', 'identity-facet'],
    maskSelectors: [
      '[data-capture="organization-enterprise-masthead"]',
      '[data-capture="organization-enterprise-sidecar"]'
    ],
    maxDiffRatio: 0.08,
    requiredRegions: [
      '[data-capture="organization-enterprise-masthead"]',
      '[data-capture="organization-enterprise-facet-rail"]',
      '[data-capture="organization-enterprise-main-canvas"]'
    ]
  },
  readiness: {
    selector: '[data-capture="organization-workspace-enterprise-detail-mockup"]',
    selectors: [
      '[data-capture="organization-enterprise-masthead"]',
      '[data-capture="organization-enterprise-facet-rail"]',
      '[data-capture="organization-enterprise-sidecar"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 350,
    timeout: 12000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-detail-mockup"]',
      failOnViolations: false
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-detail-mockup"]',
      allowHorizontalScrollSelectors: ['[data-capture="organization-enterprise-facet-rail"]'],
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: false,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'facet-rail',
          startSelector: '[data-capture="organization-enterprise-facet-rail"] button',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 7000,
      maxRequests: 130,
      maxFcpMs: 5000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-detail-mockup"]',
      failOnViolations: false,
      expectedDataCaptureRegions: [
        'organization-enterprise-masthead',
        'organization-enterprise-facet-rail',
        'organization-enterprise-main-canvas',
        'organization-enterprise-sidecar'
      ],
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo']
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-workspace-enterprise-detail-mockup"]', reason: 'el workspace enterprise debe renderizar' },
    { kind: 'visible', selector: 'text=Entrega operacional', reason: 'la facet recomendada debe ser el canvas inicial' }
  ],
  steps: [
    { kind: 'mark', label: 'delivery-first-fold', note: 'Facet Command Center: masthead, KPI rail, facet rail, delivery canvas and sidecar' },
    {
      kind: 'mark',
      label: 'csc-distribution',
      clipSelector: '[data-capture="organization-enterprise-csc-distribution"]',
      note: 'CSC distribution chart must remain fully visible inside its enterprise card'
    },
    {
      kind: 'mark',
      label: 'delivery-full-page',
      fullPage: true,
      note: 'Delivery page context with CSC distribution in its real laptop/desktop column'
    },
    { kind: 'scroll', selector: '[data-facet-key="finance"]', scrollBlock: 'center', scrollInline: 'center' },
    { kind: 'click', selector: '[data-facet-key="finance"]' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'finance-facet', note: 'Agency-flavored finance facet with bridge to Finance Clients' },
    { kind: 'scroll', selector: '[data-facet-key="identity"]', scrollBlock: 'center', scrollInline: 'center' },
    { kind: 'click', selector: '[data-facet-key="identity"]' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'identity-facet', note: 'Identity dossier and evidence map without returning to green-heavy chrome' },
    { kind: 'scroll', selector: '[data-capture="organization-workspace-enterprise-detail-mockup"]', scrollBlock: 'end' },
    { kind: 'mark', label: 'full-page', fullPage: true, note: 'Full-page evidence for enterprise review' }
  ]
}
