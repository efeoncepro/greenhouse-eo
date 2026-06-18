// TASK-1079 — Nexa interaction-mode, concepto C (lane sidecar full-height).
// Evidencia del lane in-flow `role=complementary` junto al dashboard (split, no
// atenuado), reflow del shell, y la conversación con composer pinned. Desktop lane;
// mobile = Drawer temporal (lo resuelve AdaptiveSidecarLayout).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-lane-sidecar',
  route: '/nexa/lane-sidecar/mockup',
  // El fill escribe en el composer de un mockup con runtime mock (sin API real).
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 414, height: 896 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="nexa-lane-sidecar"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup autenticado via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' },
    { kind: 'visible', selector: '[data-capture="nexa-lane-backdrop"]', reason: 'el dashboard debe quedar visible al lado del lane (split, no atenuado)' },
    { kind: 'visible', selector: '[role="complementary"][aria-label="Nexa AI"]', reason: 'el lane debe ser complementary, no modal' }
  ],
  steps: [
    { kind: 'mark', label: 'lane-open-split', note: 'Lane assistant full-height a la derecha; dashboard 100% visible al lado' },
    { kind: 'mark', label: 'lane-only', clipSelector: '[data-capture="nexa-lane-sidecar"]', note: 'Header navy + presencia + rail historial + thread seeded' },
    {
      kind: 'interaction',
      interaction: {
        name: 'new-conversation',
        intent: 'Nueva conversación → empty hero con cara real + saludo + grilla de prompts',
        action: { kind: 'click', selector: 'button[aria-label="Nueva conversación"]' },
        frames: [
          { label: 'empty-hero', atMs: 400, clipSelector: '[data-capture="nexa-lane-sidecar"]' }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'toggle-history-rail',
        intent: 'El toggle de historial colapsa/expande el rail sin romper el thread',
        action: { kind: 'click', selector: 'button[aria-label="Historial"]' },
        frames: [
          { label: 'rail-collapsed', atMs: 300, clipSelector: '[data-capture="nexa-lane-sidecar"]' }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'collapse-lane',
        intent: 'Cerrar el lane → sale deslizándose hacia el borde derecho (panelEntrance=slide)',
        action: { kind: 'click', selector: '[data-capture="nexa-lane-sidecar"] button[aria-label="Cerrar Nexa"]' },
        frames: [
          { label: 'collapse-mid', atMs: 150 },
          { label: 'collapsed', atMs: 500 }
        ],
        reducedMotion: 'skip'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'reopen-lane-slide',
        intent: 'Reabrir → el lane entra deslizándose desde el borde derecho y empuja el contenido',
        action: { kind: 'click', selector: 'button:has-text("Abrir Nexa")' },
        frames: [
          { label: 'slide-0ms', atMs: 0 },
          { label: 'slide-150ms', atMs: 150 },
          { label: 'slide-350ms', atMs: 350 },
          { label: 'slide-settled', atMs: 650 }
        ],
        reducedMotion: 'skip'
      }
    },
    { kind: 'mark', label: 'lane-final', note: 'Estado final tras nueva conversación + toggle de rail + slide demo (desktop lane / mobile Drawer)' }
  ]
}
