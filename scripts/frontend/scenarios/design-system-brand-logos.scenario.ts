import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-brand-logos',
  route: '/design-system/brand-logos',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
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
      label: 'brand-logo-lab',
      fullPage: true,
      note: 'Hoja interna dedicada para GreenhouseBrandLogoMark y sus kinds desde AXIS Figma.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-hero',
      clipSelector: '[data-capture="brand-logo-hero"]',
      note: 'Specimens principales de Gemini, Adobe, Adobe Firefly, Adobe Photoshop, Adobe Illustrator y Adobe After Effects portados desde AXIS Figma.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-gemini-kind-matrix',
      clipSelector: '[data-capture="brand-logo-gemini-kind-matrix"]',
      note: 'Matriz de kinds geminiIsotype, geminiOnBlue, geminiOnNeutral y geminiLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-adobe-kind-matrix',
      clipSelector: '[data-capture="brand-logo-adobe-kind-matrix"]',
      note: 'Matriz de kinds adobeIsotype, adobeOnRed, adobeOnNeutral, adobeOnPink y adobeLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-firefly-kind-matrix',
      clipSelector: '[data-capture="brand-logo-firefly-kind-matrix"]',
      note: 'Matriz de kinds fireflyIsotype, fireflyOnRed, fireflyOnNeutral, fireflyOnPink y fireflyLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-photoshop-kind-matrix',
      clipSelector: '[data-capture="brand-logo-photoshop-kind-matrix"]',
      note: 'Matriz de kinds photoshopIsotype, photoshopOnDarkBlue, photoshopOnNeutral, photoshopOnLightBlue y photoshopLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-illustrator-kind-matrix',
      clipSelector: '[data-capture="brand-logo-illustrator-kind-matrix"]',
      note: 'Matriz de kinds illustratorIsotype, illustratorOnBrown, illustratorOnNeutral, illustratorOnYellow y illustratorLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-after-effects-kind-matrix',
      clipSelector: '[data-capture="brand-logo-after-effects-kind-matrix"]',
      note: 'Matriz de kinds afterEffectsIsotype, afterEffectsOnDarkPurple, afterEffectsOnNeutral, afterEffectsOnLightPurple y afterEffectsLogotype.'
    }
  ]
}
