// TASK-1231 / TASK-1256 — Growth Forms portable renderer preview (verificación interna GVC).
// El mismo core Web Component que WordPress/Astro renderizan en producción, montado
// desde fixtures del render_contract bajo el Design System. TASK-1256 agrega la
// secuencia "Integridad": máscaras por país + submit-gating del email corporativo.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-forms-renderer-preview',
  route: '/design-system/growth-forms-renderer',
  // fill/press son seguros: el preview usa un `fetch` simulado (offline) que nunca
  // toca el API real ni persiste nada — solo ejercita máscaras + gate en el cliente.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="growth-forms-renderer-preview"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'preview interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'growth-forms-renderer-default',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Formulario interactivo (estado default)'
    },
    // TASK-1256 — fixture "Integridad": máscaras por país + gate corporativo.
    {
      kind: 'click',
      selector: 'button:has-text("Integridad")',
      note: 'Cambia a la composición de integridad de datos'
    },
    { kind: 'sleep', ms: 600, note: 'Re-monta el renderer con el fixture Integridad' },
    // Enviar vacío → resumen de errores accesible (patrón GOV.UK).
    { kind: 'click', selector: '[data-ghf-primary]', note: 'Enviar vacío → resumen de errores' },
    { kind: 'sleep', ms: 300, note: 'Render del resumen' },
    {
      kind: 'mark',
      label: 'growth-forms-renderer-error-summary',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Resumen de errores accesible al enviar (links que enfocan el campo)'
    },
    {
      kind: 'fill',
      selector: '[name="phone"]',
      value: '987654321',
      note: 'Teléfono sin formato — la máscara CL lo formatea al salir'
    },
    { kind: 'press', key: 'Tab', note: 'Blur del teléfono → aplica máscara +56 9 …' },
    {
      kind: 'fill',
      selector: '[name="work_email"]',
      value: 'ana@gmail.com',
      note: 'Correo personal en un campo corporate_email → debe gatear'
    },
    { kind: 'press', key: 'Tab', note: 'Blur del correo → dispara verificación + gate' },
    { kind: 'sleep', ms: 900, note: 'Roundtrip de /verify-email (simulado en el preview)' },
    {
      kind: 'mark',
      label: 'growth-forms-renderer-integrity-gate',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Máscara de teléfono aplicada + gate corporativo + typo-suggest'
    },
    // Estado reactivo de éxito: corrige el correo + completa RUT → ✓ verde live.
    {
      kind: 'fill',
      selector: '[name="work_email"]',
      value: 'ana@empresa.com',
      note: 'Correo corporativo → ✓ success reactivo'
    },
    { kind: 'press', key: 'Tab', note: 'Verifica + confirma corporativo' },
    { kind: 'sleep', ms: 700, note: 'Roundtrip de verificación (simulado)' },
    { kind: 'fill', selector: '[name="company"]', value: 'Efeonce', note: 'Empresa' },
    { kind: 'press', key: 'Tab', note: 'Blur empresa' },
    {
      kind: 'fill',
      selector: '[name="national_id"]',
      value: '123456785',
      note: 'RUT válido → ✓ success'
    },
    { kind: 'press', key: 'Tab', note: 'Blur del RUT → formato + ✓' },
    { kind: 'fill', selector: '[name="message"]', value: 'Queremos mejorar nuestra visibilidad en IA.', note: 'Muestra el contador de caracteres' },
    { kind: 'click', selector: '[data-ghf-consent="tos"]', note: 'Acepta consentimiento → listo para enviar' },
    { kind: 'sleep', ms: 300, note: 'Asienta el estado reactivo' },
    {
      kind: 'mark',
      label: 'growth-forms-renderer-reactive-success',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Estado reactivo: ✓ success en correo corporativo + RUT válido'
    },
    {
      kind: 'mark',
      label: 'growth-forms-renderer-fullpage',
      fullPage: true,
      note: 'Preview completo: canvas + embed snippet'
    }
  ]
}
