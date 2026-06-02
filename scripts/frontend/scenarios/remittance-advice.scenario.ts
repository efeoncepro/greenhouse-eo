import type { CaptureScenario } from '../lib/scenario'

// TASK-960 — Contractor Remittance Advice ("Comprobante de Pago") mockup.
// Captures both locales (es-CL / en-US) full-page + the two regimes that
// exercise the breakdown variants (provider-managed = no withholding row,
// cross-currency = FX line), driven by the in-page toggles.
export const scenario: CaptureScenario = {
  name: 'remittance-advice',
  route: '/my/contractor/remittance/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 500,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'es-honorarios-fullpage', fullPage: true, note: 'es-CL · honorarios CL (retención SII) · página completa con ambas integraciones' },
    { kind: 'click', selector: 'button[value="provider_managed"]' },
    { kind: 'mark', label: 'es-provider-viewer', clipSelector: '[role="article"]', note: 'es-CL · provider-managed (sin fila de retención)' },
    { kind: 'click', selector: 'button[value="cross_currency"]' },
    { kind: 'mark', label: 'es-crosscurrency-viewer', clipSelector: '[role="article"]', note: 'es-CL · cross-currency (línea FX)' },
    { kind: 'click', selector: 'button[value="en-US"]' },
    { kind: 'mark', label: 'en-crosscurrency-viewer', clipSelector: '[role="article"]', note: 'en-US · cross-currency (Remittance Advice)' },
    { kind: 'click', selector: 'button[value="honorarios_cl"]' },
    { kind: 'mark', label: 'en-honorarios-fullpage', fullPage: true, note: 'en-US · página completa (superficies bilingües)' }
  ]
}
