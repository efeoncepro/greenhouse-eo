import type { CaptureScenario } from '../lib/scenario'
import { scenario as login } from './auth-login-v4-issuer.scenario'

/** Editorial variants only; no navigation to external CTA and no auth mutation. */
export const scenario: CaptureScenario = {
  ...login,
  name: 'auth-login-v4-issuer-announcements', route: '/login/announcements',
  viewports: [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }],
  steps: [
    { kind: 'mark', label: 'neutral-first-fold' },
    { kind: 'scroll', selector: '[data-capture="login-stage"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'text-announcement' },
    { kind: 'interaction', interaction: { name: 'announcement-selection', intent: 'Select a banner and pause the carousel without leaving login', action: { kind: 'click', selector: '[data-login-slide-index="1"]' }, frames: [{ label: 'selected-banner', atMs: 200 }], reducedMotion: 'capture', keyboardEquivalent: { action: { kind: 'focus', selector: '[data-login-slide-index="0"]' }, expected: 'Visible paper focus ring on dark stage' } } },
    { kind: 'click', selector: '[data-login-slide-index="0"]' },
    { kind: 'mark', label: 'text-return', fullPage: true }
  ]
}
