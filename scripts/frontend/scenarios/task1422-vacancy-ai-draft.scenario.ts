import type { CaptureScenario } from '../lib/scenario'

// TASK-1422 — Vacancy AI Draft drawer (propose→confirm de TASK-1385) en el Publication Desk.
// Requiere: dev local con HIRING_VACANCY_AI_ENABLED=true + seed `scripts/hiring/_seed-task-1422-gvc.ts`
// (opening DRAFT "GVC-1422 SEO Specialist Senior" con proposal `proposed` → paso review determinista,
// sin llamar al LLM en captura). Contratos: docs/ui/{wireframes,flows,motion}/TASK-1422-*.

export const scenario: CaptureScenario = {
  name: 'task1422-vacancy-ai-draft',
  route: '/agency/hiring/publication',
  // mutating por los steps de teclado (press Escape); la secuencia NO muta datos: el dialog de
  // descarte se cancela y el generate jamás se dispara (el LLM no corre en captura).
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="hiring-publication-diff"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000,
  },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'],
      minTargetSize: 20,
      failOnViolations: true,
    },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-publication-diff"]' },
  },
  steps: [
    // La vacante sembrada es la más reciente → seleccionada por defecto (openings[0]).
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'base-diff-with-cta', note: 'Diff con CTA de borrador IA pendiente (columna pública).' },

    // Abrir el drawer directo en review (proposal sembrada).
    { kind: 'click', selector: '[data-capture="hiring-vacancy-ai-cta"] button' },
    { kind: 'wait', selector: '[data-capture="hiring-vacancy-ai-drawer"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'drawer-review', clipSelector: '[data-capture="hiring-vacancy-ai-drawer"]', note: 'Borrador IA editable: banner con modelo, form prefilled, recordatorio anti-sesgo.' },

    // Dialog de descarte (NO se confirma — captura no mutante).
    { kind: 'click', selector: 'button:has-text("Descartar borrador")' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'drawer-discard-dialog', note: 'Confirmación consecuente antes de rechazar el borrador.' },
    { kind: 'click', selector: 'button:has-text("Cancelar")' },
    { kind: 'sleep', ms: 250 },

    // Cierre por Escape (foco restaurado al CTA).
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'closed-focus-restore', note: 'Drawer cerrado; el borrador sigue pendiente en el ledger.' },

    // Microinteracción canónica: apertura del drawer con motion + equivalente teclado + reduced-motion.
    {
      kind: 'interaction',
      interaction: {
        name: 'vacancy-ai-open',
        intent: 'Apertura del drawer del borrador IA (entrada ghHiringDrawer); Escape cierra y restaura foco; bajo reduced-motion el swap es instantáneo con el mismo significado.',
        action: { kind: 'click', selector: '[data-capture="hiring-vacancy-ai-cta"] button' },
        frames: [{ label: 'drawer-opened', atMs: 500, note: 'Drawer abierto tras la entrada (patrón desk).' }],
        keyboardEquivalent: { action: { kind: 'press', key: 'Escape' }, expected: 'Escape cierra el drawer; el borrador pendiente persiste.' },
        reducedMotion: 'capture',
      },
    },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 400 },

    // Paso generate: otra vacante SIN borrador pendiente (flag ON) → template picker + CTA generar.
    // El selector nuevo se ejercita acá (combobox MUI → listbox portal → option).
    { kind: 'click', selector: '[data-capture="hiring-publication-opening-selector"] [role="combobox"]' },
    { kind: 'wait', selector: 'ul[role="listbox"]' },
    { kind: 'click', selector: 'li[role="option"]:has-text("EO-OPN-0009")' },
    { kind: 'sleep', ms: 450 },
    { kind: 'click', selector: '[data-capture="hiring-vacancy-ai-cta"] button' },
    { kind: 'wait', selector: '[data-capture="hiring-vacancy-ai-drawer"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'drawer-generate', clipSelector: '[data-capture="hiring-vacancy-ai-drawer"]', note: 'Paso inicial: template opcional + generar borrador (NO se dispara el LLM en captura).' },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 300 },
  ],
}
