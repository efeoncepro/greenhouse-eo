// TASK-992/998/1001 runtime — Client Onboarding wizard RUNTIME (not mockup).
// Same Berel-via-HubSpot happy path, but drives the real /agency/clients/new
// route (flag CLIENT_LIFECYCLE_ONBOARDING_ENABLED ON) to GVC-verify the live
// fixes: Comercial datepicker (GreenhouseDatePicker), Espacio mode-card contrast
// (color: inherit), and the removed manual "código numérico" field.
// Mutating + safeForCapture (the wizard only writes on the final create, which
// this scenario does not reach — it stops at Espacio).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'client-onboarding-wizard-runtime',
  route: '/agency/clients/new',
  viewport: { width: 1440, height: 900 },
  mutating: true,
  safeForCapture: true,
  initialHoldMs: 1400,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="origin-hubspot"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'step1-origen', note: 'Paso 1 Origen — 3 cards' },

    // Open HubSpot picker + select Berel (prefills identity + currency + start date)
    { kind: 'click', selector: '[data-capture="origin-hubspot"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'hubspot-picker-open', note: 'Picker HubSpot abierto' },
    { kind: 'click', selector: '[data-capture="hubspot-row-55405407542"]' },
    { kind: 'sleep', ms: 600 },

    // → Step 2 Identidad (prefilled)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'step2-identidad', note: 'Paso 2 Identidad precargado' },

    // Next → Comercial (en runtime Berel no está en PG → sin gate de duplicado)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 600 },

    // → Step 3 Comercial — GreenhouseDatePicker (CHANGED: datepicker consistency)
    { kind: 'mark', label: 'step3-comercial', note: 'Paso 3 Comercial — GreenhouseDatePicker inicio/fin + fases' },
    { kind: 'sleep', ms: 250 },

    // Abrir form "Agregar fase" → verificar datepicker de fase consistente (CHANGED)
    { kind: 'click', selector: '[data-capture="add-phase"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step3-phase-form', note: 'Form de fase — GreenhouseDatePicker inicio/fin (antes era type=date nativo)' },

    // → Step 4 Finanzas (MXN prefilled)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'step4-finanzas', note: 'Paso 4 Finanzas — MXN prefilled' },

    // → Step 5 Espacio (CHANGED: mode-card contrast + removed numeric code)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'step5-espacio', note: 'Paso 5 Espacio — cards Notion/Teams (contraste), sin código numérico manual' },

    // Revelar paneles de vínculo → verificar isotipos Notion + Teams (CHANGED: Tabler glyphs, no SVG blob)
    { kind: 'click', selector: 'button:has-text("Vincular teamspace existente")' },
    { kind: 'sleep', ms: 350 },
    { kind: 'click', selector: 'button:has-text("Vincular canal existente")' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step5-link-panels', note: 'Paneles de vínculo — isotipos Notion (N en caja blanca) + Teams (glyph púrpura Tabler)' },

    // Clip al panel Teams → isotipo crisp (verificar glyph bien formado, no blob)
    { kind: 'scroll', selector: '[data-capture="teams-connect-panel"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'teams-isotype-crisp', clipSelector: '[data-capture="teams-connect-panel"]', note: 'Panel Teams recortado — isotipo Tabler púrpura bien formado' }
  ]
}
