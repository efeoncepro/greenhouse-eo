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
      note: 'Specimens principales de Gemini, ChatGPT, Adobe, Adobe Express, Adobe Firefly, Adobe Photoshop, Adobe Premiere Pro, Adobe Illustrator, Adobe After Effects, Envato, Shutterstock, Higgsfield, Magnific, ElevenLabs, Claude, Microsoft Teams, Notion y HubSpot portados desde AXIS Figma.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-gemini-kind-matrix',
      clipSelector: '[data-capture="brand-logo-gemini-kind-matrix"]',
      note: 'Matriz de kinds geminiIsotype, geminiOnBlue, geminiOnNeutral y geminiLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-gpt-kind-matrix',
      clipSelector: '[data-capture="brand-logo-gpt-kind-matrix"]',
      note: 'Matriz de kinds gptIsotype, gptOnBlack, gptOnNeutral y gptLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-adobe-kind-matrix',
      clipSelector: '[data-capture="brand-logo-adobe-kind-matrix"]',
      note: 'Matriz de kinds adobeIsotype, adobeOnRed, adobeOnNeutral, adobeOnPink y adobeLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-express-kind-matrix',
      clipSelector: '[data-capture="brand-logo-express-kind-matrix"]',
      note: 'Matriz de kinds expressIsotype, expressOnBlack, expressFullColorOnBlack, expressOnNeutral y expressLogotype.'
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
      label: 'brand-logo-premiere-kind-matrix',
      clipSelector: '[data-capture="brand-logo-premiere-kind-matrix"]',
      note: 'Matriz de kinds premiereIsotype, premiereOnLightPurple, premiereOnDarkPurple, premiereOnNeutral y premiereLogotype.'
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
    },
    {
      kind: 'mark',
      label: 'brand-logo-envato-kind-matrix',
      clipSelector: '[data-capture="brand-logo-envato-kind-matrix"]',
      note: 'Matriz de kinds envatoIsotype, envatoOnGreen, envatoOnNeutral, envatoOnLightGreen y envatoLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-shutterstock-kind-matrix',
      clipSelector: '[data-capture="brand-logo-shutterstock-kind-matrix"]',
      note: 'Matriz de kinds shutterstockIsotype, shutterstockOnNeutral, shutterstockOnRed, shutterstockOnPink y shutterstockLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-higgsfield-kind-matrix',
      clipSelector: '[data-capture="brand-logo-higgsfield-kind-matrix"]',
      note: 'Matriz de kinds higgsfieldIsotype, higgsfieldOnGreen, higgsfieldOnNeutral y higgsfieldLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-magnific-kind-matrix',
      clipSelector: '[data-capture="brand-logo-magnific-kind-matrix"]',
      note: 'Matriz de kinds magnificIsotype, magnificOnBlack, magnificOnNeutral y magnificLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-elevenlabs-kind-matrix',
      clipSelector: '[data-capture="brand-logo-elevenlabs-kind-matrix"]',
      note: 'Matriz de kinds elevenLabsIsotype, elevenLabsOnBlack, elevenLabsOnNeutral y elevenLabsLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-claude-kind-matrix',
      clipSelector: '[data-capture="brand-logo-claude-kind-matrix"]',
      note: 'Matriz de kinds claudeIsologo, claudeOnDarkOrange, claudeOnNeutral, claudeOnLightOrange y claudeLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-teams-kind-matrix',
      clipSelector: '[data-capture="brand-logo-teams-kind-matrix"]',
      note: 'Matriz de kinds teamsIsotype, teamsOnDarkPurple, teamsOnNeutral, teamsOnLightPurple y teamsLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-notion-kind-matrix',
      clipSelector: '[data-capture="brand-logo-notion-kind-matrix"]',
      note: 'Matriz de kinds notionIsotype, notionOnBlack, notionOnNeutral y notionLogotype.'
    },
    {
      kind: 'mark',
      label: 'brand-logo-hubspot-kind-matrix',
      clipSelector: '[data-capture="brand-logo-hubspot-kind-matrix"]',
      note: 'Matriz de kinds hubspotIsotype, hubspotOnOrange, hubspotOnNeutral, hubspotOnLightOrange y hubspotLogotype.'
    }
  ]
}
