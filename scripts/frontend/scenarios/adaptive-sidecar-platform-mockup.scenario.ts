// TASK-1028 — Adaptive Sidecar UI Platform mockup verification.
// Mockup only: no API calls, no writes, validates platform primitive behavior.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'adaptive-sidecar-platform-mockup',
  route: '/platform/adaptive-sidecar/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="adaptive-sidecar-platform"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    { kind: 'visible', selector: 'text=Mesa operacional', reason: 'la superficie debe declarar la tarea operacional' },
    { kind: 'visible', selector: 'text=Superficie no-Nexa', reason: 'la validación debe demostrar uso no-Nexa' },
    { kind: 'visible', selector: 'text=Inspector · GH-1842', reason: 'el sidecar debe estar visible en primer fold' },
    { kind: 'visible', selector: 'img[alt="Greenhouse Workspace"]', reason: 'el reflow del shell no debe ocultar el avatar global' },
    {
      kind: 'visible',
      selector: '[data-sidecar-shell-reflow="greenhouse-vertical-navbar"]',
      reason: 'el sidecar viewport debe declarar reflow del app bar de plataforma'
    },
    {
      kind: 'visible',
      selector: '[data-sidecar-motion="enterprise"]',
      reason: 'la primitiva debe exponer la coreografía enterprise salvo reduced motion'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'desktop-push',
      note: 'Workbench y sidecar conviven en layout push sin superposición'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'switch-to-composer',
        intent: 'Verifica cambio de variante hacia composer y mantenimiento de contexto.',
        action: { kind: 'click', selector: 'button[aria-label="Composer"]' },
        frames: [
          {
            label: 'variant-start',
            atMs: 120,
            note: 'Inicio del cambio de variante'
          },
          {
            label: 'variant-settled',
            atMs: 520,
            note: 'Composer contextual estable'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button[aria-label="Composer"]' },
          expected: 'El selector de tipo de panel tiene foco visible y nombre accesible.'
        },
        reducedMotion: 'skip'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'close-panel',
        intent: 'Verifica salida suave del panel y recuperación del canvas sin overlay residual.',
        action: { kind: 'click', selector: 'button[aria-label="Cerrar panel"]' },
        frames: [
          {
            label: 'close-start',
            atMs: 80,
            note: 'Inicio del cierre con salida del rail contextual'
          },
          {
            label: 'close-settled',
            atMs: 420,
            note: 'Workspace estable después del cierre'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button:has-text("Abrir panel")' },
          expected: 'El foco retorna a la acción que reabre el panel.'
        },
        reducedMotion: 'skip'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'reopen-panel',
        intent: 'Verifica entrada suave del rail y reflow del app bar sin tapar avatar ni acciones.',
        action: { kind: 'click', selector: 'button:has-text("Abrir panel")' },
        frames: [
          {
            label: 'open-start',
            atMs: 100,
            note: 'Inicio de apertura con reserva de shell'
          },
          {
            label: 'open-settled',
            atMs: 520,
            note: 'Rail estable con navbar adaptado'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button[aria-label="Cerrar panel"]' },
          expected: 'El panel reabierto expone una acción de cierre accesible.'
        },
        reducedMotion: 'skip'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'mode-inline',
        intent: 'Verifica que el sidecar siga siendo una columna del workspace al alternar modo in-flow.',
        action: { kind: 'click', selector: 'button:has-text("Inline")' },
        frames: [
          {
            label: 'inline-start',
            atMs: 120,
            note: 'Transición a modo inline'
          },
          {
            label: 'inline-settled',
            atMs: 520,
            note: 'Sidecar in-flow estabilizado y contenido principal preservado'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button:has-text("Inline")' },
          expected: 'El selector de modo conserva navegación por teclado.'
        },
        reducedMotion: 'skip'
      }
    },
    { kind: 'mark', label: 'desktop-final', note: 'Estado final desktop después de alternar variantes y modos' }
  ]
}
