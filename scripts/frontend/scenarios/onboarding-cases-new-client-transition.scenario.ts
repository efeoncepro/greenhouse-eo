// TASK-1015 — Captura de la View Transition "Nuevo cliente" → wizard.
// Evidencia de motion: al presionar el CTA, ViewTransitionLink (TASK-525) corre
// la navegación dentro de document.startViewTransition (crossfade) y el loading.tsx
// del wizard revela su skeleton al instante. Frames relativos al click capturan
// el crossfade + el skeleton + el wizard cargado.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'onboarding-cases-new-client-transition',
  route: '/agency/clients/onboarding',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 300,
  quality: { allowLoading: true },
  readiness: {
    selector: '[data-capture="onboarding-cases"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el cockpit vive bajo (dashboard) autenticado' },
    { kind: 'visible', selector: 'text=Nuevo cliente', reason: 'el CTA Nuevo cliente debe estar presente para disparar la transición' }
  ],
  steps: [
    { kind: 'mark', label: 'cockpit-idle', note: 'Cockpit antes de la transición' },
    {
      kind: 'interaction',
      interaction: {
        name: 'nuevo-cliente-view-transition',
        intent:
          'Al presionar Nuevo cliente, la navegación al wizard corre dentro de una View Transition (crossfade) y el loading skeleton del wizard aparece al instante (perceived performance).',
        action: { kind: 'click', selector: 'text=Nuevo cliente' },
        reducedMotion: 'capture',
        frames: [
          { label: 'vt-start', atMs: 0, note: 'Inicio del crossfade (View Transition)' },
          { label: 'vt-mid', atMs: 140, note: 'Mitad del crossfade' },
          { label: 'wizard-skeleton', atMs: 380, note: 'Loading skeleton del wizard (shell)' },
          { label: 'wizard-loaded', atMs: 1300, note: 'Wizard de alta cargado' }
        ]
      }
    }
  ]
}
