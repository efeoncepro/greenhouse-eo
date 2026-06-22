// Internal Gamification Lab verification — GreenhouseLeaderboard primitives.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-gamification',
  route: '/design-system/gamification',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 900,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
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
      label: 'gamification-lab',
      fullPage: true,
      note: 'Laboratorio interno para GreenhouseLeaderboardCard, Rankings y Podium antes de cablearlos a un modulo de gamification'
    },
    {
      kind: 'mark',
      label: 'gamification-leaderboard-card',
      clipSelector: '[data-capture="gamification-leaderboard-card"]',
      note: 'Card completa con periodo, selector de run, podium top 3 y ranking paginado con avatars reales'
    },
    {
      kind: 'mark',
      label: 'gamification-podium',
      clipSelector: '[data-capture="gamification-podium-primary"]',
      note: 'Podium top 3 con orden visual 2-1-3, avatars reales del equipo y valores tabulares'
    },
    {
      kind: 'mark',
      label: 'gamification-podium-variants',
      clipSelector: '[data-capture="gamification-podium-variants"]',
      note: 'Variants classic/modern/minimal del podium para surfaces compactas'
    }
  ]
}
