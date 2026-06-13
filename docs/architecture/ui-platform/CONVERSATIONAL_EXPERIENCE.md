# Nexa Conversational Experience — contrato agente

> **Version:** 1.0 (2026-06-13)
> **Audience:** agentes/ingenieros que construyen o extienden cualquier surface conversacional de Nexa
> **Autoridad final:** el runtime (`src/components/greenhouse/primitives/nexa-answers-canvas/**` + `src/lib/nexa/**`). Si este doc difiere del runtime, gana el runtime y este doc se actualiza.
> **Skill operativa:** `greenhouse-nexa-conversational` (invocar ANTES de tocar una surface conversacional).

Este doc es el **mapa + el contrato** de la "conversational experience" de Nexa: qué la compone, cómo fluye, qué contratos son SSOT, cómo se garantiza que sea **transversal** (Knowledge es el primer consumer, NO el destino final) y cómo agregar un dominio nuevo sin forkear. Para el "qué es / cómo se siente" en lenguaje simple, ver el doc humano: [`docs/documentation/plataforma/nexa-conversational-experience.md`](../../documentation/plataforma/nexa-conversational-experience.md).

---

## 1. Qué es (y qué NO es)

La **conversational experience** es la lente Nexa: una superficie donde una persona le pregunta a Nexa y recibe una **respuesta primero** (answer-first, estilo Google AI Mode / AI Overview), con **grounding** (por qué confiar), **evidencia bajo demanda** (proof colapsable) y **chrome de confianza** (feedback ¿útil? + copiar/compartir/regenerar) — sin robar protagonismo al composer.

- **Es domain-neutral.** El mismo shell renderiza Knowledge, Finanzas, Agencia, Personas, Commercial y Home. El dominio entra por **contrato de datos** (`surfaceContext`), nunca por chrome especial por dominio.
- **NO es un chat por dominio.** No existe `FinanceAnswerSurface` / `AgencyChat` / etc. Una surface conversacional nueva = un **consumer del canvas canónico** con su `surfaceContext`, NO un componente paralelo.

### Decisión canónica (operador, 2026-06-13)

`NexaAnswersCanvas` es la **surface canónica** de la lente Nexa (la más rica: modela `surfaceContext`, render plan, los 11 estados de la coreografía y los feature-primitives). El **answer-trace** productivo de TASK-1089/1090 (`NexaKnowledgeAnswerSurface`, hoy cableado a `/knowledge` con retrieval real) **conserva su data-path runtime** y **converge** hacia este contrato (no modela `surfaceContext` todavía). Ver §8 (convergencia).

---

## 2. Arquitectura en una imagen

```
                         ┌──────────────────────────────────────────────┐
   surfaceContext  ───▶  │            NexaAnswersCanvas                  │  ◀── canonical shell
   (SSOT, domain)        │  (modes renderPlan|runtime · variants         │      (domain-neutral)
   renderPlan      ───▶  │   embedded|sidecar|inline · 11 states)        │
   (blocks)              │                                              │
                         │  choreography: idle→submitted→thinking→       │
                         │  reasoning→streaming→answered→proofOpen→      │
                         │  followup (+ compacted|degraded|error)        │
                         └───────┬───────────┬───────────┬──────────────┘
                                 │           │           │
        feature primitives  ─────┘           │           └─────  block renderers (registry)
        (transversales, neutrales)           │                   answerBubble · compactAnswer
        NexaProvenanceTrace (grounding)      │                   conversationBubble
        NexaResponseToolbar (chrome)         │
        NexaStreamingText (revelado)         │
        NexaEvidencePanel (evidencia)        │
                                             │
        contratos de datos (SSOT) ───────────┘
        nexa-evidence.v1 (ConversationalEvidencePacket)
        knowledge-search.v1 (KnowledgeRetrievalPacket)  ← primer dominio; otros packets convergen
```

---

## 3. Contratos SSOT (los que NO se forkean)

| Contrato | SSOT (import canónico) | Qué gobierna |
|---|---|---|
| **Surface context** | `@/lib/nexa/nexa-answers-surface-context` (re-export bendecido de `nexa-answers-canvas-types`) | `domain` · `placement` · `density` · `dataReality` · `sensitivity` · `allowedRenderers` · `allowedActions`. El dominio entra por acá. |
| **Render plan** | `NexaAnswersRenderPlan` (`version: 'nexa-answer-render-plan.v1'`) | `intent` · `autonomyTier` · `blocks[]` (answerBubble/compactAnswer/conversationBubble) · `trustCue` · `actions[]` · `proof`. Es lo que Nexa "decidió mostrar". |
| **Evidencia conversacional** | `@/lib/nexa/conversational-evidence` (`ConversationalEvidencePacket`, `contractVersion: 'nexa-evidence.v1'`) | trace · fuentes · freshness · confidence · `deniedOrFilteredCount` · `primaryFeedbackTarget`. Es el "por qué confiar" serializable. |
| **Retrieval de Knowledge** | `@/lib/knowledge/search` (`KnowledgeRetrievalPacket`, `contractVersion: 'knowledge-search.v1'`) | El primer **packet de dominio** que alimenta la evidencia. Otros dominios producen su packet y lo mapean a `nexa-evidence.v1`. |

**Regla dura:** un consumer NUEVO (incl. la convergencia del answer-trace y el runtime de TASK-1101) **importa el contrato desde el SSOT**. NUNCA crear un `surfaceContext` paralelo en otra surface.

---

## 4. La coreografía (state machine)

`NexaAnswersCanvasState` (11 estados). El host conduce el estado; el canvas pinta cada fase. La coreografía **arranca en el `onSubmit` desde `idle`** (la persona escribe en el composer glow y envía → el canvas desciende el composer y entra en la secuencia).

```
idle ──onSubmit──▶ submitted ──▶ thinking ──▶ reasoning ──▶ streaming ──▶ answered ──▶ proofOpen
                                                                              │            ▲
                                                                              └─ followup ─┘ (compacted)
   degradación honesta (state-design):  answered ──▶ degraded   ·   * ──▶ error
```

| Estado | Qué pinta | Primitive que lleva el peso |
|---|---|---|
| `idle` | composer glow limpio + identidad Nexa en reposo | `NexaComposer` (`knowledgeAsk`) |
| `submitted` / `thinking` | pregunta-burbuja + identidad "Pensando…" + thinking beat | `NexaConversationBubble` + `NexaPresenceMark` + `GreenhouseThinkingBeat` |
| `reasoning` | traza de razonamiento progresiva (done✓/active/pending) + shimmer del footprint | **`NexaProvenanceTrace` variant `expandable`** |
| `streaming` | titular redactado + cuerpo revelándose con caret + "Detener" | **`NexaStreamingText`** + `NexaResponseToolbar` (no aún) |
| `answered` | respuesta enriquecida + trust cue + response toolbar (settle) | `NexaAnswerBubble` + **`NexaResponseToolbar` `embedded`** + `NexaProvenanceTrace` `inline` |
| `proofOpen` | evidencia bajo demanda (colapsable) | **`NexaProvenanceTrace` variant `panel`** → `NexaEvidencePanel` |
| `followup` / `compacted` | composer descendido + chips de próximas preguntas | `NexaComposer` (`inlineFollowUp`) + suggested follow-ups |
| `degraded` / `error` | estados honestos (no `Auditar` falso) | copy `degradedTitle/Body` · `errorTitle/Body` |

El **live region** del status (pensando → streaming → ready) lo lleva **la identidad Nexa**, no cada burbuja → un solo anuncio (a11y). `prefers-reduced-motion` está horneado en cada feature-primitive.

---

## 5. Inventario de componentes (qué es canónico para qué)

Todos viven en `src/components/greenhouse/primitives/` y se exportan por el barrel `index.ts`. Detalle completo en [PRIMITIVES.md](./PRIMITIVES.md) (fila "Nexa chat atoms / answer surfaces").

**Shell + render**
- `NexaAnswersCanvas` — la surface canónica (shell domain-neutral). Modes `renderPlan`/`runtime`; variants `embedded`/`sidecar`/`inline`; kinds `knowledgeEmbedded`/`financeChartEmbedded`/`agencyInsightEmbedded`/`peopleInsightEmbedded`/`commercialInsightEmbedded`/`custom`. Valida `surfaceContext.allowedRenderers` (`assertNexaAnswersRenderPlanAllowed`) y renderiza blocks vía `NEXA_ANSWERS_RENDERER_REGISTRY`.
- `NexaKnowledgeAnswerSurface` — la surface **productiva** wired al lens `/knowledge` (TASK-1089/1090, retrieval real). Variants `conversationTrace`/`overviewPanel`/`toolResult`. **Converge** hacia el canvas (§8).

**Feature primitives (transversales, neutrales) — extraídas del canvas**
- `NexaProvenanceTrace` (TASK-1103) — **grounding** (SoT del "por qué confiar"). Variants `inline` (trust cue) / `expandable` (razonamiento) / `panel` (evidencia, compone `NexaEvidencePanel`). Kinds `knowledgeGrounded`→panel / `signalPromoted`→inline / `computed`→inline.
- `NexaResponseToolbar` (TASK-1104) — **chrome de confianza** (feedback ¿útil? + copiar/compartir/regenerar). Variants `embedded`/`floating`/`docked`. Kinds `responseSettle`→embedded / `chatMessage`→floating / `surfaceBar`→docked. Distinto de las **acciones de dominio** (`NexaAnswersAction`).
- `NexaStreamingText` (TASK-1105) — **revelado progresivo** (el "feel" del asistente que escribe). Modes `value` (revela fracción) / `stream` (consume `AsyncIterable` de chunks, abort-safe). Caret tokenizado; never-hidden + reduced-motion horneados.
- `NexaEvidencePanel` — renderer compartido de `nexa-evidence.v1` (trace, fuentes, freshness, confidence, filtered count, feedback). Lo consumen el chat `search_knowledge` y el answer-surface.

**Composición de respuesta**
- `NexaAnswerBubble` — answer-turn enriquecido. Variants `explanation`/`chart`/`metricSummary`/`actionPlan` (kinds por dominio).
- `NexaConversationBubble` — burbuja base (pregunta-usuario / nexa-thinking / nexa-text / nexa-followup / system-notice).
- `NexaExpressiveText` — renderer serializable de la voz Nexa (`string | segments[]`, estilos cerrados + emoji + break + citation). Es el value type que viaja en títulos/cuerpo.

**Composer + identidad**
- `NexaComposer` (+ `NexaComposerInput`, `NexaComposerActionButton`, `NexaGlowBorder`) — el input glow (variants `chat`/`command`; kinds `floatingChat`/`knowledgeAsk`/`globalCommand`/`inlineFollowUp`).
- `NexaPromptDock` — dock compacto → panel contextual.
- `NexaFace` / `NexaPresenceMark` / `NexaSenderMark` — la cara/presencia/avatar-por-mensaje (brand SSOT `GREENHOUSE_NEXA_BRAND_COLORS`).

---

## 6. La garantía de transversalidad (defense-in-depth, ≥4 capas)

Knowledge es el **primer consumer**, no el dueño. La transversalidad NO es una promesa de prosa — está enforced en 4 capas independientes:

1. **Contrato tipado (SSOT).** `surfaceContext.domain` es un union cerrado (`knowledge|finance|agency|people|commercial|home|custom`). El dominio es un dato, no chrome. Import único desde `@/lib/nexa/nexa-answers-surface-context`.
2. **Resolver `kind→variant` neutral.** `resolveNexaAnswersCanvasVariant` / `…Density` resuelven cualquier kind (incl. los de dominio) a un **variant funcional existente**. Ningún kind inventa chrome. Lo mismo en cada feature-primitive (`resolveNexaProvenanceTraceVariant`, `resolveNexaResponseToolbarVariant`).
3. **Feature primitives neutrales.** `NexaProvenanceTrace` / `NexaResponseToolbar` / `NexaStreamingText` tienen nombres + props **neutrales** (no "knowledge*"). Cero acoplamiento al dominio.
4. **Guard mecánico = specimens de portabilidad.** El scenario `nexa-answers-surface` incluye **specimens Finanzas + Insight** (`nexa-answers-portability-finance` / `…-insight`) que prueban que el MISMO canvas renderiza otro dominio. Más los **tests de contrato** del controller (`nexa-answers-canvas-controller.test.ts`: los 5 dominios resuelven a variants neutrales) y de cada feature-primitive.

**Si agregás chrome especial "solo para X dominio" en el shell o en un feature-primitive, rompés la capa 3 y el guard de la capa 4 debe atraparlo.**

---

## 7. Receta: agregar un dominio/surface conversacional nuevo

No se crea un componente nuevo. Se compone el canvas con el contrato del dominio.

1. **Declarar el `surfaceContext`** con `domain: '<nuevo>'`, `placement`, `dataReality`, `sensitivity`, `allowedRenderers` (whitelist de renderers que esa surface permite) y `allowedActions`. Import del SSOT.
2. **Elegir kind→variant.** Si hay un kind de dominio (`<x>InsightEmbedded`), agregalo a `NEXA_ANSWERS_CANVAS_KIND_CONFIG` resolviendo a un **variant existente** (`embedded`/`sidecar`/`inline`) — NUNCA un variant nuevo por dominio. Si no, usar `custom`.
3. **Producir el render plan** (`nexa-answer-render-plan.v1`): blocks con `answerBubble` (variant por intent) + `proof` (con `ConversationalEvidencePacket` si hay evidencia). El packet de evidencia se mapea desde el packet de dominio (p.ej. `knowledge-search.v1` → `nexa-evidence.v1`).
4. **Conducir la coreografía** desde el host (los 11 estados) — degradación honesta en `degraded`/`error`.
5. **Agregar un specimen de portabilidad** al scenario GVC (mismo canvas, dominio nuevo) → el guard de transversalidad lo cubre.
6. **NO** crear `surfaceContext` paralelo, ni un answer-surface por dominio, ni chrome especial.

---

## 8. Convergencia del answer-trace (TASK-1108)

`NexaKnowledgeAnswerSurface` (Codex, TASK-1089/1090/1092) está **wired a producción** (`/knowledge` lens, retrieval real). El plan canónico (operador): **conservar su data-path runtime**, converger su presentación hacia el canvas + los feature-primitives neutrales.

**Hecho (TASK-1108):** el **proof del answer-trace migró a `NexaProvenanceTrace` variant `panel` tabbed** — byte-idéntico (GVC). La frontera transversal/dominio quedó **ratificada por skills arch + product-ui** y enforced por el shape de la primitive:

- **Transversal (horneado en la primitive):** el chrome tabbed (a11y/teclado/ARIA) + los renderers built-in **packet-driven** (`sources`/`trace` componen `NexaEvidencePanel` · `packet` campos crudos del `nexa-evidence.v1`). Cero acoplamiento a dominio.
- **Dominio (slot que llena la surface):** los labels (i18n) + qué tabs/orden + un tab extra con `content` ReactNode (p.ej. "Evals"/eval-harness de Knowledge). Así la primitive neutral **no** absorbe conceptos de Knowledge.
- `NexaKnowledgeAnswerSurface.proofTabs` es ahora `NexaProvenanceProofTab[]`; la primitive es dueña del estado del tab activo (los consumers ya no controlan `proofTab`/`proofContent`). Consumers migrados: `KnowledgeCenterView` (prod, built-ins + slot Evals) + el Lab `nexa-chat` + el mockup `answer-trace` (slots bespoke).

**Deferido (sin consumer real → no se construye, arch-correct):**

- `surfaceContext` SSOT en el answer-trace — sería un **prop huérfano** (su sistema de variants `conversationTrace`/`overviewPanel`/`toolResult` no mapea a `allowedRenderers` todavía). Se adopta cuando tenga consumer real.
- El `inline` trust cue del answer-trace → variant `inline` (cuando se toque esa zona).
- ADR de plataforma + hard-rule absoluta en CLAUDE.md (**NUNCA** answer-surface por dominio) — **descriptiva por ahora** (el canvas es el shell canónico; grounding/proof vía `NexaProvenanceTrace`); la absoluta aterriza cuando el answer-trace converja del todo (consume `surfaceContext` + el canvas como shell).
- Slices A1/A2 de TASK-1095: promoción física del contrato + split dominio/UI de `allowedRenderers`/`allowedActions`.

Mientras converge el resto, **ambas surfaces coexisten**: el canvas es la referencia rica + el laboratorio de los feature-primitives; el answer-trace es el runtime de Knowledge — ahora compartiendo el **mismo grounding/proof canónico** (`NexaProvenanceTrace`).

---

## 9. Verificación visual (GVC)

- Scenario madre: **`nexa-answers-surface`** (`/knowledge/mockup/nexa-answers`) — recorre los 11 estados + specimens de portabilidad + la response toolbar + el grounding + el streaming + el submit-from-idle. Es el regression test visual de la coreografía completa.
- Labs por primitive (specimen vivo + a11y por teclado): `/design-system/nexa-provenance`, `/design-system/nexa-response-toolbar`, `/design-system/nexa-streaming-text` (+ `/design-system/nexa-chat` para los átomos del composer).
- **Migración byte-idéntica:** al extraer un mecanismo del canvas a un feature-primitive, el helper puro (p.ej. `computeRevealedPlainText`) reproduce la fórmula original y el frame del canvas se verifica idéntico (el sha puede diferir solo por fase de animación viva —caret/beam— cuando el scenario no congela animaciones; la prueba es visual + el test del helper).

---

## 10. Hard rules (anti-regresión)

- **NUNCA** crear una answer-surface / chat conversacional por dominio (`FinanceAnswerSurface`, `AgencyChat`, …). Componer `NexaAnswersCanvas` con su `surfaceContext`.
- **NUNCA** crear un `surfaceContext` paralelo. Import único: `@/lib/nexa/nexa-answers-surface-context`.
- **NUNCA** meter chrome "solo para X dominio" en el shell ni en un feature-primitive. El dominio entra por datos (`surfaceContext`/`renderPlan`), no por skin.
- **NUNCA** inventar un variant nuevo por dominio. Un kind de dominio resuelve a un **variant existente** vía el controller.
- **NUNCA** romper el contrato versionado (`nexa-answer-render-plan.v1`, `nexa-evidence.v1`, `knowledge-search.v1`) sin bumpear la versión — los consumers dependen del shape estable.
- **NUNCA** duplicar el grounding, la response toolbar o el revelado en una surface nueva: consumir `NexaProvenanceTrace` / `NexaResponseToolbar` / `NexaStreamingText`.
- **NUNCA** pintar `Auditar`/estado falso cuando la verdad es "no sé" — usar `degraded`/`error` honestos (state-design).
- **NUNCA** duplicar el live region: el status (pensando→streaming→ready) lo lleva la identidad Nexa, no cada burbuja.
- **NUNCA** extraer un mecanismo del canvas sin verificar la migración byte-idéntica en GVC (helper puro + frame mirado).
- **SIEMPRE** que emerja una surface conversacional nueva, agregar un specimen de portabilidad al scenario GVC (guard de transversalidad).
- **SIEMPRE** invocar la skill `greenhouse-nexa-conversational` antes de tocar/extender una surface conversacional.

---

## 11. Procedencia

TASK-1096 (canvas + coreografía + feature-primitives co-located) · TASK-1095 (surfaceContext SSOT, A1) · TASK-1101 (citation mapper + runtime wiring) · TASK-1103 (NexaProvenanceTrace) · TASK-1104 (NexaResponseToolbar) · TASK-1105 (NexaStreamingText) · TASK-1089/1090/1092 (answer-trace productivo, Codex) · TASK-1091 (NexaChatProvider, stream real). HISTORIAL: [HISTORIAL.md](./HISTORIAL.md) Delta 2026-06-13.
