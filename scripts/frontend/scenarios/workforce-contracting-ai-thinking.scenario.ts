// TASK-1024 GVC — "AI is thinking" micro-interaction on the Bilingual Review desk.
// Selects a draft-less offer case, hits "Generar borrador IA", and captures the
// thinking state (pulsing AI glyph + cycling steps + indeterminate progress) that
// Claude shows while it drafts ES+EN (~1-2 min). Before this, the button just sat
// disabled and the operator thought nothing was happening (caso Luis).
// Mutating (triggers a real Claude call) but the capture finishes in ~4s; closing
// the context aborts the in-flight request, so token spend is minimal.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'workforce-contracting-ai-thinking',
  route: '/hr/workforce/contracts',
  viewport: { width: 1440, height: 1000 },
  mutating: true,
  safeForCapture: true,
  initialHoldMs: 1400,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="workforce-contracting-command-center"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el estudio vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [
    // Select the draft-less offer case (subject + "Carta oferta" disambiguates it).
    { kind: 'click', selector: 'tr:has-text("ZZZ Prueba Firma"):has-text("Carta oferta")' },
    { kind: 'sleep', ms: 700 },

    // Open the review desk → "Sin borrador todavía" empty state.
    { kind: 'click', selector: 'button:has-text("Revisar borrador bilingüe")' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: 'empty-no-draft', note: 'Empty state — Sin borrador todavía + CTA Generar borrador IA' },

    // Trigger AI generation → the thinking micro-interaction appears immediately.
    { kind: 'click', selector: 'button:has-text("Generar borrador IA")' },
    { kind: 'sleep', ms: 2600 },
    {
      kind: 'mark',
      label: 'ai-thinking',
      clipSelector: '[data-capture="workforce-contracting-ai-thinking"]',
      note: 'Micro-interacción "la IA está pensando" — glyph pulsante + paso cíclico + barra indeterminada'
    },
    { kind: 'sleep', ms: 2400 },
    {
      kind: 'mark',
      label: 'ai-thinking-step2',
      clipSelector: '[data-capture="workforce-contracting-ai-thinking"]',
      note: 'Mismo estado, paso siguiente del ciclo (verifica el cambio de mensaje)'
    }
  ]
}
