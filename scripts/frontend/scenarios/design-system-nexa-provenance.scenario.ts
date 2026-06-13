// Internal NexaProvenanceTrace Lab verification (TASK-1103) — grounding canónico de Nexa.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-provenance',
  route: '/design-system/nexa-provenance',
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
    selector: '[data-capture="nexa-provenance-lab"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="nexa-provenance-lab"]',
      // El label sr-only del paso activo (variant expandable) es visuallyHidden por diseño.
      ignoreSelectors: ['[data-gvc-ignore-layout="true"]']
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="nexa-provenance-lab"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-provenance-lab-fullpage',
      fullPage: true,
      note: 'Lab de NexaProvenanceTrace: variants inline / expandable / panel + kinds.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-inline',
      clipSelector: '[data-capture="nexa-provenance-trace-inline"]',
      note: 'Variant inline: trust cue compacto (success/warning/info) — asienta confianza sin robar protagonismo.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-expandable',
      clipSelector: '[data-capture="nexa-provenance-trace-expandable"]',
      note: 'Variant expandable: razonamiento progresivo (done/active/pending) + shimmer del footprint.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-panel',
      clipSelector: '[data-capture="nexa-provenance-trace"][data-variant="panel"]',
      note: 'Variant panel: evidencia bajo demanda (compone NexaEvidencePanel read-only).'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-panel-tabbed',
      clipSelector: '[data-capture="nexa-provenance-proof-tabbed"]',
      note: 'Panel tabbed: built-ins transversales (Fuentes/Razonamiento/Packet, packet-driven) + tab de dominio por content slot. Tab activo por defecto = Fuentes.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'switch-proof-tab-packet',
        intent: 'Cambiar al tab Packet muestra el built-in transversal (campos crudos del nexa-evidence.v1), operable por teclado.',
        action: { kind: 'click', selector: '[data-capture="nexa-provenance-proof-tabbed"] button[role="tab"]:has-text("Packet")' },
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="nexa-provenance-proof-tabbed"] button[role="tab"]:has-text("Packet")', key: 'Enter' },
          expected: 'Los tabs del proof son operables por teclado (focus + Enter).'
        },
        frames: [
          {
            label: 'nexa-provenance-panel-tabbed-packet',
            atMs: 250,
            clipSelector: '[data-capture="nexa-provenance-proof-tabbed"]',
            note: 'Built-in packet: contractVersion/confidence/freshness/sources/filtered/maxScore — transversal, cero dominio.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'switch-proof-tab-domain',
        intent: 'Cambiar al tab de dominio (Evals) muestra el content slot que llena el consumer — la primitive no conoce ese contenido.',
        action: { kind: 'click', selector: '[data-capture="nexa-provenance-proof-tabbed"] button[role="tab"]:has-text("Evals")' },
        frames: [
          {
            label: 'nexa-provenance-panel-tabbed-domain',
            atMs: 250,
            clipSelector: '[data-capture="nexa-provenance-proof-tabbed"]',
            note: 'Tab de dominio: el slot content (aquí un Alert de ejemplo). La frontera transversal/dominio en acción.'
          }
        ]
      }
    }
  ]
}
