import type { CaptureScenario, CaptureScenarioStep } from '../lib/scenario'

// Run with an isolated GVC_STORAGE_STATE_PATH containing the desired Vuexy settings.
// PORTAL_BRAND_LAYOUT: vertical (default), collapsed, horizontal.
// PORTAL_BRAND_MOBILE=true captures the opened drawer at 390px.
const mobile = process.env.PORTAL_BRAND_MOBILE === 'true'
const collapsed = process.env.PORTAL_BRAND_LAYOUT === 'collapsed' && !mobile

const steps: CaptureScenarioStep[] = [
  ...(collapsed
    ? [
        { kind: 'hover' as const, selector: '.ts-vertical-layout-navbar' },
        { kind: 'sleep' as const, ms: 500 }
      ]
    : []),
  ...(mobile ? [{ kind: 'click' as const, selector: '.tabler-menu-2' }] : []),
  { kind: 'wait', selector: '[data-capture="portal-navigation-brand"] img' },
  { kind: 'mark', label: 'navigation', clipSelector: '[data-capture="portal-navigation-brand"]' },
  { kind: 'mark', label: 'chrome', fullPage: false },
  ...(collapsed
    ? [
        { kind: 'hover' as const, selector: '[data-capture="portal-navigation-brand"]' },
        { kind: 'sleep' as const, ms: 500 },
        { kind: 'mark' as const, label: 'navigation-hover', clipSelector: '[data-capture="portal-navigation-brand"]' }
      ]
    : []),
  ...(mobile ? [{ kind: 'click' as const, selector: '[aria-label="Cerrar menú"]' }] : []),
  { kind: 'scroll', selector: '[data-capture="portal-footer-brand"]' },
  { kind: 'mark', label: 'footer', clipSelector: 'footer' },
  { kind: 'mark', label: 'footer-context', fullPage: false }
]

export const scenario: CaptureScenario = {
  name: 'portal-brand-chrome',
  route: process.env.PORTAL_BRAND_ROUTE ?? '/design-system',
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  qualityProfile: 'standard',
  initialHoldMs: 1000,
  readiness: {
    selector: '[data-capture="portal-footer-brand"]',
    waitForFonts: true,
    postReadyDelayMs: 1000,
    timeout: 30000
  },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  steps
}
