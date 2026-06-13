// Internal Nexa Chat Pattern Lab verification — composer variants and chat atoms.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-chat',
  route: '/design-system/nexa-chat',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-chat-lab"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-chat-lab-fullpage',
      fullPage: true,
      note: 'Laboratorio interno del patrón Nexa Chat y sus atoms'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-composer-command-variant"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-composer-command-variant',
      clipSelector: '[data-capture="nexa-composer-command-variant"]',
      note: 'Variant command del NexaComposer con kind knowledgeAsk'
    },
    {
      kind: 'mark',
      label: 'nexa-composer-spectrum-inactive',
      clipSelector: '[data-capture="nexa-composer-spectrum-inactive"]',
      note: 'Variación inactive/sin texto de la caja de envío Nexa con brand spectrum'
    },
    {
      kind: 'mark',
      label: 'nexa-composer-spectrum-with-text',
      clipSelector: '[data-capture="nexa-composer-spectrum-with-text"]',
      note: 'Variación con texto de la caja de envío Nexa con brand spectrum'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-prompt-dock-specimen"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-prompt-dock-specimen',
      clipSelector: '[data-capture="nexa-prompt-dock-specimen"]',
      note: 'Composition primitive NexaPromptDock con dock compacto y panel contextual'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-knowledge-answer-surface-specimen"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-knowledge-answer-surface-specimen',
      clipSelector: '[data-capture="nexa-knowledge-answer-surface-specimen"]',
      note: 'Composition primitive para respuestas Knowledge con pregunta-burbuja y proof panel'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-conversation-bubble-specimen"]',
      scrollBlock: 'start',
      scrollY: -96
    },
    {
      kind: 'mark',
      label: 'nexa-conversation-bubble-specimen',
      clipSelector: '[data-capture="nexa-conversation-bubble-specimen"]',
      note: 'Primitive NexaConversationBubble con pregunta, thinking, texto simple, follow-up y notice'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-answer-bubble-chart-specimen"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-answer-bubble-chart-specimen',
      clipSelector: '[data-capture="nexa-answer-bubble-chart-specimen"]',
      note: 'Primitive NexaAnswerBubble con variante chart y Recharts'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-answer-bubble-metric-summary-specimen"]',
      scrollBlock: 'start',
      scrollY: -220
    },
    {
      kind: 'mark',
      label: 'nexa-answer-bubble-metric-summary-specimen',
      clipSelector: '[data-capture="nexa-answer-bubble-metric-summary-specimen"]',
      note: 'Primitive NexaAnswerBubble con variante metricSummary para lectura ejecutiva de KPIs'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-answer-bubble-action-plan-specimen"]',
      scrollBlock: 'start',
      scrollY: -96
    },
    {
      kind: 'mark',
      label: 'nexa-answer-bubble-action-plan-specimen',
      clipSelector: '[data-capture="nexa-answer-bubble-action-plan-specimen"]',
      note: 'Primitive NexaAnswerBubble con variante actionPlan para recomendaciones accionables'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-answers-canvas-specimen"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-canvas-specimen',
      clipSelector: '[data-capture="nexa-answers-canvas-specimen"]',
      note: 'Primitive NexaAnswersCanvas con render plan, proof bajo demanda y composer persistente'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-knowledge-tool-trace-specimen"]',
      scrollBlock: 'start',
      scrollY: -128
    },
    {
      kind: 'mark',
      label: 'nexa-knowledge-tool-trace-specimen',
      clipSelector: '[data-capture="nexa-knowledge-tool-trace-specimen"]',
      note: 'Renderer del tool search_knowledge debajo de la respuesta Nexa'
    }
  ]
}
