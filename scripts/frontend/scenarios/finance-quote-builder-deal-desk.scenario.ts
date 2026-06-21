// Rediseño enterprise de Nueva cotización: wizard de cotización con
// readiness global en header. El Deal Desk aparece desde alcance/economía,
// no en el contexto inicial.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'finance-quote-builder-deal-desk',
  route: '/finance/quotes/new',
  viewport: { width: 1440, height: 900 },
  mutating: true,
  safeForCapture: true,
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 15' }
  ],
  initialHoldMs: 3500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="quote-builder-deal-desk"]',
    absentSelectors: ['[data-testid="login-card"]', '[data-testid="LoginCard"]'],
    waitForFonts: true,
    postReadyDelayMs: 2500,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Nueva cotización autenticada vía actor GVC local.' },
    { kind: 'noErrorBoundary', reason: 'El builder no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="quote-builder-wizard"]',
      reason: 'El wizard de cotización debe estar montado en el primer fold.'
    },
    {
      kind: 'visible',
      selector: '[data-testid="quote-header-readiness-progress"]',
      reason: 'La readiness 0 de 6 campos debe vivir en el header.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="quote-builder-deal-desk"]',
      ignoreSelectors: ['[data-gvc-ignore-layout="true"]']
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="quote-builder-deal-desk"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="quote-builder-wizard"]', timeout: 30000 },
    {
      kind: 'mark',
      label: 'identity-header',
      clipSelector: '[data-capture="quote-identity-strip"]',
      note: 'Cabecera única de cotización: identidad dominante, readiness y acciones en un rail compacto.'
    },
    {
      kind: 'mark',
      label: 'initial-context-wizard',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Wizard de nueva cotización: contexto comercial full-width y readiness global en header.'
    },
    { kind: 'click', selector: 'button:has-text("Elige organización")', timeout: 12000 },
    { kind: 'wait', selector: '[role="combobox"]', timeout: 12000 },
    { kind: 'fill', selector: '[role="combobox"]', value: 'sky', timeout: 12000 },
    { kind: 'wait', selector: '[role="option"]:has-text("Sky Airlines")', timeout: 180000 },
    {
      kind: 'mark',
      label: 'organization-dropdown-results',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Dropdown enterprise del selector de organización con búsqueda, estado de resultados y foco visible.'
    },
    { kind: 'click', selector: '[role="option"]:has-text("Sky Airlines")', timeout: 12000 },
    { kind: 'wait', selector: 'button:has-text("Continuar al alcance")', timeout: 12000 },
    { kind: 'click', selector: 'button:has-text("Continuar al alcance")', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="quote-builder-line-canvas"]', timeout: 20000 },
    {
      kind: 'mark',
      label: 'scope-empty-state',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Paso Alcance con Deal Desk contextual, empty state y métodos de agregado.'
    },
    { kind: 'click', selector: '[data-capture="quote-builder-open-catalog"]', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="sellable-picker-drawer"]', timeout: 20000 },
    { kind: 'fill', selector: '[data-capture="sellable-picker-search"]', value: 'Creative', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="sellable-item-option"]', timeout: 180000 },
    {
      kind: 'mark',
      label: 'catalog-drawer-results',
      clipSelector: '[data-capture="sellable-picker-drawer"]',
      note: 'Drawer de catálogo con búsqueda, tabs, resultados y footer de selección.'
    },
    { kind: 'click', selector: '[data-capture="sellable-item-option"]', timeout: 12000 },
    {
      kind: 'mark',
      label: 'catalog-drawer-selected',
      clipSelector: '[data-capture="sellable-picker-drawer"]',
      note: 'Estado seleccionado del item antes de agregarlo al alcance.'
    },
    { kind: 'click', selector: '[data-capture="sellable-picker-drawer"] button:has-text("Agregar")', timeout: 12000 },
    { kind: 'sleep', ms: 1800 },
    { kind: 'wait', selector: '[data-capture="quote-builder-line-canvas"]:has-text("Ítems de la cotización")', timeout: 30000 },
    {
      kind: 'mark',
      label: 'scope-line-added',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Línea agregada: fila compacta, progreso actualizado, Deal Desk calculando y sin scroll horizontal.'
    },
    { kind: 'click', selector: 'button:has-text("Revisar economía")', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="quote-builder-economics-review"]', timeout: 20000 },
    {
      kind: 'mark',
      label: 'economics-review',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Paso Economía con revisión final, notas y Deal Desk contextual.'
    }
  ]
}
