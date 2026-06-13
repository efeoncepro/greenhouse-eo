// TASK-1096 — Nexa Answers visual prototype: Knowledge first real low-risk surface.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-answers-surface',
  route: '/knowledge/mockup/nexa-answers',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="nexa-answers-surface"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno autenticado via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="nexa-answers-trust-cue"]',
      reason: 'Nexa Answers debe priorizar trust cue compacto antes que proof visible.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="nexa-answers-visual-page"]',
      // El label sr-only del status "pensando" es visuallyHidden por diseño (lo anuncia el
      // lector de pantalla); el clip es intencional, no un overflow real.
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
      includeSelector: '[data-capture="nexa-answers-surface"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-answers-answered-fullpage',
      fullPage: true,
      note: 'Nexa Answers en Knowledge: respuesta primero, trust cue compacto y proof colapsado.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-conversation',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Turno principal con pregunta, identidad Nexa, respuesta y composer descendido.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-chart-trend',
      clipSelector: '[data-capture="nexa-answers-chart-variant"]',
      note: 'Variante chart: tendencia Recharts dentro de la respuesta enriquecida.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-citations-inline',
      clipSelector: '[data-capture="nexa-answers-rich-answer-card"]',
      note: 'Citas inline [1] [3] span-level en la prosa (estilo Google AI Mode), no un sidebar.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'open-citation-peek',
        intent: 'Tocar la cita inline abre el evidence-peek con la fuente: grounding nativo del texto.',
        action: { kind: 'click', selector: '[data-capture="nexa-answers-citation-marker"]' },
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="nexa-answers-citation-marker"]', key: 'Enter' },
          expected: 'La cita abre la fuente por teclado (focus + Enter), no solo por click.'
        },
        frames: [
          { label: 'nexa-answers-citation-peek-open', atMs: 400, note: 'Evidence-peek: título de la fuente, fragmento citado, score y frescura + Abrir fuente.' }
        ]
      }
    },
    {
      kind: 'mark',
      label: 'nexa-response-toolbar',
      clipSelector: '[data-capture="nexa-response-toolbar"]',
      note: 'Fase settle: response toolbar — feedback ¿útil? + copiar/compartir/regenerar (chrome de confianza estilo AI Overview, distinto de las acciones de dominio).'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-portability-finance',
      clipSelector: '[data-capture="nexa-answers-portability-finance"]',
      note: 'Portabilidad: el mismo NexaAnswersCanvas renderiza dominio Finanzas (chart de margen comprimido) — surfaceContext/renderPlan agnósticos del dominio.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-portability-insight',
      clipSelector: '[data-capture="nexa-answers-portability-insight"]',
      note: 'Portabilidad: una señal de Nexa Insights promovida a respuesta (metricSummary OTD/FTR/RpA) en el mismo canvas.'
    },
    {
      kind: 'interaction',
      interaction: {
        // El voto colapsa el cluster a un acuse (el botón se reemplaza), así que la operabilidad por
        // teclado se prueba como path PRIMARIO (press Enter sobre el botón enfocado) en vez de click +
        // un segundo pase de teclado que apuntaría a un botón ya inexistente — más riguroso, sin warning.
        name: 'vote-response-helpful',
        intent: 'Votar "Sí, me sirvió" por teclado (focus + Enter) colapsa el feedback a un acuse, como en AI Overview.',
        action: { kind: 'press', selector: '[data-capture="nexa-response-toolbar-helpful"]', key: 'Enter' },
        frames: [
          {
            label: 'nexa-response-toolbar-feedback-ack',
            atMs: 300,
            clipSelector: '[data-capture="nexa-response-toolbar"]',
            note: 'Tras votar: el cluster de feedback colapsa a "¡Gracias por tu feedback!".'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'show-nexa-answers-chart-comparison',
        intent: 'El modo comparativo muestra barras Recharts asentadas dentro de la bubble.',
        action: { kind: 'click', selector: 'button:has-text("Comparativo")' },
        keyboardEquivalent: {
          action: { kind: 'press', selector: 'button:has-text("Comparativo")', key: 'Enter' },
          expected: 'El segmented control de chart se activa por teclado (focus + Enter), no solo por click.'
        },
        frames: [
          {
            label: 'nexa-answers-chart-comparison',
            atMs: 900,
            clipSelector: '[data-capture="nexa-answers-chart-variant"]',
            note: 'Variante chart: comparativo Recharts dentro de la misma bubble.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'show-nexa-answers-chart-composition',
        intent: 'El modo composición muestra donut Recharts asentado dentro de la bubble.',
        action: { kind: 'click', selector: 'button:has-text("Composición")' },
        keyboardEquivalent: {
          action: { kind: 'press', selector: 'button:has-text("Composición")', key: 'Enter' },
          expected: 'El segmented control de chart se activa por teclado (focus + Enter), no solo por click.'
        },
        frames: [
          {
            label: 'nexa-answers-chart-composition',
            atMs: 1200,
            clipSelector: '[data-capture="nexa-answers-chart-variant"]',
            note: 'Variante chart: composición Recharts dentro de la misma bubble.'
          }
        ]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Pensando")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-thinking"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-thinking-beat',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Thinking beat alineado al patrón curado de Nexa Chat: wordmark compacto + dots inline wave.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Razonando")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-provenance-trace-expandable"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-reasoning',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Razonando estilo AI Overview: pasos progresivos (done/active/pending) + shimmer ocupando el footprint.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Streaming")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-streaming"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-streaming',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Streaming honesto: titular redactado + cuerpo a mitad con caret + gráfica armándose + control "Detener" (estilo AI Mode); sin trust cue todavía.'
    },
    {
      kind: 'interaction',
      interaction: {
        // "Detener" desmonta el card de streaming al asentar la respuesta (answered), así que la
        // operabilidad por teclado se prueba como path PRIMARIO (press Enter sobre el botón enfocado):
        // un segundo pase de teclado apuntaría a un selector ya inexistente.
        name: 'stop-generation',
        intent: 'Detener por teclado (focus + Enter) corta la generación y asienta lo recibido (answered), como en AI Mode/ChatGPT.',
        action: { kind: 'press', selector: '[data-capture="nexa-answers-stop-generation"]', key: 'Enter' },
        frames: [
          {
            label: 'nexa-answers-stopped-settled',
            atMs: 350,
            clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
            note: 'Tras detener: la respuesta asienta (settle) en vez de quedar a medias.'
          }
        ]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Streaming")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-streaming"]',
      timeout: 5000
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'play-deploy',
        intent: 'El despliegue completo estilo AI Overview se reproduce: razonar → streaming → respuesta que asienta.',
        action: { kind: 'click', selector: 'button:has-text("Reproducir despliegue")' },
        // Prueba del contrato reduced-motion sobre la surface real: re-dispara el despliegue con
        // prefers-reduced-motion → shimmer/caret estáticos y contenido visible (never-hidden),
        // sin depender de animación para comunicar el estado.
        reducedMotion: 'capture',
        keyboardEquivalent: {
          action: { kind: 'press', selector: 'button:has-text("Reproducir despliegue")', key: 'Enter' },
          expected: 'El despliegue se dispara por teclado (focus + Enter), no solo por click.'
        },
        frames: [
          { label: 'deploy-reasoning', atMs: 700, clipSelector: '[data-capture="nexa-answers-canvas-conversation"]', note: 'Fase 0 — razonando con pasos progresivos + shimmer.' },
          { label: 'deploy-reasoning-late', atMs: 1800, clipSelector: '[data-capture="nexa-answers-canvas-conversation"]', note: 'Fase 0 — "Redactando…" con pasos previos en done.' },
          { label: 'deploy-streaming', atMs: 2900, clipSelector: '[data-capture="nexa-answers-canvas-conversation"]', note: 'Fase 2 — la respuesta llega con caret y la gráfica se arma.' },
          { label: 'deploy-settled', atMs: 4200, clipSelector: '[data-capture="nexa-answers-surface"]', note: 'Fase 4 — respuesta + trust + sugeridos asentados (settle stagger).' }
        ]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Respuesta")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-trust-cue"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-suggested-followups',
      clipSelector: '[data-capture="nexa-answers-canvas-suggested-followups"]',
      note: 'Follow-ups sugeridos: pills de próxima pregunta tras la respuesta — la conversación sigue sin composer en blanco.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-compaction-before',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'TASK-1102 — ANTES: el turno de Impacto está vivo (answerBubble grande), sin historial.'
    },
    {
      kind: 'interaction',
      interaction: {
        // TASK-1102 — al promover una sugerencia, el turno de Impacto se COMPACTA hacia el historial
        // (View Transitions Tier 3: morph de tamaño+posición) mientras entra el turno nuevo de follow-up.
        // reduced-motion: el helper degrada honesto a swap instantáneo (sin morph), contenido intacto.
        name: 'pick-suggested-followup',
        intent: 'Tocar una sugerencia promueve el turno: el answer de Impacto se encoge hacia el historial (View Transitions) y entra el turno nuevo — spatial continuity, no un corte seco.',
        action: { kind: 'click', selector: '[data-capture="nexa-answers-canvas-suggested-followups"] button' },
        reducedMotion: 'capture',
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="nexa-answers-canvas-suggested-followups"] button', key: 'Enter' },
          expected: 'Las preguntas sugeridas son operables por teclado (focus + Enter), no solo click.'
        },
        frames: [
          {
            label: 'nexa-answers-compaction-during',
            atMs: 150,
            clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
            note: 'DURANTE: el turno de Impacto morfea hacia su versión compactada (mid View Transition ~300ms).'
          },
          {
            label: 'nexa-answers-suggested-followup-promoted',
            atMs: 700,
            clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
            note: 'ASENTADO: Impacto compactado en el historial (arriba) + el turno nuevo de follow-up vivo abajo.'
          }
        ]
      }
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Continúa con Nexa"]',
      value: 'Dame una versión para un manager'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-followup-composer-active',
      clipSelector: '[data-capture="nexa-answers-canvas-composer"]',
      note: 'Composer post-respuesta con texto: conserva Nexa mark y cambia el botón a enviar activo.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'submit-nexa-answers-followup',
        intent: 'El follow-up escrito se promueve a burbuja y no vuelve a semántica de búsqueda.',
        action: { kind: 'press', selector: 'input[aria-label="Continúa con Nexa"]', key: 'Enter' },
        frames: [{ label: 'nexa-answers-written-followup', atMs: 250, clipSelector: '[data-capture="nexa-answers-surface"]' }]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Proof")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-proof"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-proof-expanded',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Proof expandido bajo demanda; la evidencia no desplaza el answer-first default.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Follow-up")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-compact-answer-card"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-followup-compacted',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Follow-up compacto: conserva contexto sin reimprimir todo el proof.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Degradado")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-degraded"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-degraded',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Degradado honesto: respuesta parcial declarada, no base decisional ni $0 silencioso.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Error")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-error"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-error',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Error honesto: causa + recuperación, sin pintar respuesta falsa.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Idle")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-idle"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-idle',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Idle limpio: composer glow sin respuesta falsa ni proof prematuro.'
    },
    {
      kind: 'interaction',
      interaction: {
        // El momento de enviar desde la caja glow ARRANCA la coreografía (no salta a la respuesta):
        // razonando → streaming → settle. Es exactamente lo que el usuario espera al presionar enviar.
        name: 'submit-from-idle',
        intent: 'Enviar desde idle dispara el despliegue completo desde el composer glow (no un salto seco a la respuesta).',
        action: { kind: 'press', selector: 'input[aria-label="Pregúntale a Nexa"]', key: 'Enter' },
        frames: [
          { label: 'idle-submit-reasoning', atMs: 700, clipSelector: '[data-capture="nexa-answers-canvas-conversation"]', note: 'Al enviar: la coreografía arranca en razonando (pasos + shimmer), no salta a la respuesta.' },
          { label: 'idle-submit-streaming', atMs: 2900, clipSelector: '[data-capture="nexa-answers-canvas-conversation"]', note: 'Luego: la respuesta llega con caret (streaming).' },
          { label: 'idle-submit-settled', atMs: 4200, clipSelector: '[data-capture="nexa-answers-surface"]', note: 'Y asienta (settle) con respuesta + trust + sugeridos.' }
        ]
      }
    }
  ]
}
