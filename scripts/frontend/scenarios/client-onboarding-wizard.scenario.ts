// TASK-992 mockup — Client Onboarding wizard happy path (Berel via HubSpot
// prefill). Walks the 6 steps + HubSpot picker + success. Mockup-only route, no
// real writes → mutating + safeForCapture. Captures each step for the design loop.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'client-onboarding-wizard',
  route: '/agency/clients/new/mockup',
  viewport: { width: 1440, height: 900 },
  mutating: true,
  safeForCapture: true,
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="origin-hubspot"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 200,
    timeout: 9000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'step1-origen-default', note: 'Paso 1 Origen — 3 cards, footer, rail con stepper + progreso' },

    // Open HubSpot picker
    { kind: 'click', selector: '[data-capture="origin-hubspot"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'hubspot-picker-open', note: 'Modal picker HubSpot abierto con companies' },

    // Select Berel → prefill + close
    { kind: 'click', selector: '[data-capture="hubspot-row-55405407542"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step1-selected', note: 'Paso 1 con company seleccionada (Berel)' },

    // → Step 2 Identidad (prefilled MX + RFC + inference chips)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step2-identidad-prefilled', note: 'Paso 2 Identidad precargado: MX, RFC válido, chips de inferencia' },

    // Next from Identidad triggers the duplicate-tax-id gate (Berel ya existe)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'duplicate-dialog', note: 'Diálogo: ya existe org con este ID tributario (Berel)' },
    { kind: 'click', selector: '[data-capture="dup-create-new"]' },
    { kind: 'sleep', ms: 450 },

    // → Step 3 Comercial (fecha de inicio sembrada por el prefill → datepicker estilizado)
    { kind: 'mark', label: 'step3-comercial', note: 'Paso 3 Comercial — engagement + fechas (GreenhouseDatePicker) + fases' },
    { kind: 'sleep', ms: 200 },

    // → Step 4 Finanzas (currency prefilled MXN)
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step4-finanzas', note: 'Paso 4 Finanzas — MXN prefilled, términos, OC/HES, contactos' },

    // → Step 5 Espacio
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step5-space', note: 'Paso 5 Espacio — nombre prefilled, código, aprovisionamiento' },
    { kind: 'fill', selector: '[data-capture="numeric-code"]', value: '07' },
    { kind: 'sleep', ms: 250 },

    // → Step 6 Confirmar
    { kind: 'click', selector: '[data-capture="wizard-next"]' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'step6-confirmar', note: 'Paso 6 Confirmar — resumen por sección + qué pasará + checkboxes' },

    // Confirm + create → success
    { kind: 'click', selector: '[data-capture="confirm-review"]' },
    { kind: 'click', selector: '[data-capture="confirm-understand"]' },
    { kind: 'sleep', ms: 250 },
    { kind: 'click', selector: '[data-capture="wizard-create"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'success', note: 'Pantalla de éxito — cliente creado + próximos pasos del checklist' }
  ]
}
