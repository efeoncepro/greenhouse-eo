// TASK-1059 — Runtime adoption of the approved Organization Workspace Enterprise Detail.
// Read-only: validates /agency/organizations/[id] after wiring real API data.

import type { CaptureScenario } from '../lib/scenario'

const organizationId = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'

export const scenario: CaptureScenario = {
  name: 'organization-workspace-enterprise-detail-runtime',
  route: `/agency/organizations/${organizationId}`,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'laptop', width: 1280, height: 860 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="organization-workspace-enterprise-runtime"]',
    selectors: [
      '[data-capture="organization-enterprise-masthead"]',
      '[data-capture="organization-enterprise-facet-rail"]',
      '[data-capture="organization-enterprise-sidecar"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 18000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-runtime"]',
      failOnViolations: false
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-runtime"]',
      allowHorizontalScrollSelectors: [
        '[data-capture="organization-enterprise-facet-rail"]',
        '[data-table-shell]'
      ],
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
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
      maxDomNodes: 7500,
      maxRequests: 150,
      maxFcpMs: 6000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-workspace-enterprise-runtime"]',
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
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-workspace-enterprise-runtime"]', reason: 'el workspace enterprise runtime debe renderizar' }
  ],
  steps: [
    { kind: 'mark', label: 'workspace-first-fold', note: 'Runtime masthead, KPI rail and facet rail before scenario navigation' },
    { kind: 'scroll', selector: '[data-facet-key="delivery"]', scrollBlock: 'center', scrollInline: 'center' },
    { kind: 'click', selector: '[data-facet-key="delivery"]' },
    { kind: 'sleep', ms: 350 },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="organization-enterprise-delivery-canvas"]',
        reason: 'la faceta delivery debe renderizar el canvas operacional'
      }
    },
    { kind: 'scroll', selector: '[data-capture="organization-enterprise-delivery-canvas"]', scrollBlock: 'center', scrollInline: 'nearest' },
    { kind: 'mark', label: 'delivery-first-fold', note: 'Runtime masthead, KPI rail, facet rail, delivery canvas and sidecar' },
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
      note: 'Delivery runtime context with CSC distribution in its real laptop/desktop column'
    },
    { kind: 'scroll', selector: '[data-facet-key="finance"]', scrollBlock: 'center', scrollInline: 'center' },
    { kind: 'click', selector: '[data-facet-key="finance"]' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'finance-facet', note: 'Agency finance facet with real finance summary and bridge to Finance Clients' },
    { kind: 'scroll', selector: '[data-facet-key="identity"]', scrollBlock: 'center', scrollInline: 'center' },
    { kind: 'click', selector: '[data-facet-key="identity"]' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'identity-facet', note: 'Identity dossier and evidence map from runtime organization data' },
    { kind: 'scroll', selector: '[data-capture="organization-workspace-enterprise-runtime"]', scrollBlock: 'end' },
    { kind: 'mark', label: 'full-page', fullPage: true, note: 'Full-page runtime evidence for enterprise review' }
  ]
}
