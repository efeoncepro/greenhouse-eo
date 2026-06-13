# TASK-1095 — Nexa Core Agentic Platform Substrate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `architecture`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|nexa|ai|agentic|ui|knowledge`
- Blocked by: `none`
- Branch: `task/TASK-1095-conversational-experience-v2`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Re-scope 2026-06-13: definir a Nexa como parte del core de Greenhouse, no como una feature aislada de Knowledge ni como un chat global agregado encima del portal. Esta task gobierna el **substrato agentico**: taxonomia de Nexa Moments / Conversational Moments, `NexaAnswersSurfaceContext` como contrato canonico de contexto de superficie, adapters por dominio, boundaries de capabilities/actions, provenance/reliability y reglas para que cada modulo aporte contexto sin crear "mini Nexas". La implementacion visual/productiva de esos momentos vive en TASK-1096 y la promocion runtime Knowledge vive en TASK-1101.

## Delta 2026-06-13 — rescope: Nexa vive en el core agentico de Greenhouse

Intencion del operador: **Greenhouse debe ser una plataforma agentica para colaboradores, clientes y operadores; Nexa debe vivir en el core y percibir sinergias en cada dominio**. Por lo tanto, TASK-1095 deja de ser una task de "construir otra conversacion V2" y pasa a ser el contrato transversal que permite que los AI Moments / Conversational Moments / Nexa Moments sean consistentes y gobernados.

**Nuevo owner conceptual de TASK-1095:**

- Definir el **Nexa Moment Fabric**: una taxonomia compartida para momentos directos de conversacion, answers embebidos, insights promovidos, recomendaciones operativas, technical/MCP moments y self-service client moments.
- Bendecir `NexaAnswersSurfaceContext` como SSOT vigente del contexto de superficie (`surfaceId/domain/placement/dataReality/sensitivity/allowedRenderers/allowedActions`) y documentar si se queda in-place o se promueve a `src/lib/nexa/`.
- Definir adapters de dominio para que Knowledge, Finance, Agency/Account 360, People, Commercial, Delivery/ICO y Client Portal aporten contexto, safe refs, allowed actions, data reality y provenance sin forkear UI/runtime.
- Separar `context` de `action`: un momento puede explicar/sugerir, pero cualquier accion ejecutable debe pasar por commands/readers/capabilities canonicos y tenant-safe.
- Formalizar reliability/evals minimos del fabric: contexto invalido, unsupported domain, proof unavailable y action unavailable deben degradar honradamente.
- Declarar el primer mapa de child tasks/pilots: Knowledge runtime (`TASK-1101`), experiencia cross-domain (`TASK-1096`) y primer piloto real no-Knowledge por definir (recomendado finance/chart explanation o Account 360 signal explanation).

**Fuera del nuevo scope de TASK-1095:**

- No construir la UI final de Nexa Answers ni sus microinteracciones: eso es TASK-1096.
- No promover runtime real de Knowledge: eso es TASK-1101.
- No implementar rollouts reales en Finance/Agency/People/Commercial/Client Portal dentro de esta task; aqui quedan adapters, fixtures, readiness y tasking.
- No crear otro chat shell, sidecar custom ni answer-turn paralelo.

**Cierre esperado:** arquitectura/docs/ADR y contratos suficientes para que Greenhouse trate a Nexa como capability core de plataforma. Si se escribe codigo, debe ser minimo y de contrato (types/controllers/tests), no rollout de producto.

## Delta 2026-06-13 — corrección + decisión del operador: el surfaceContext YA existe y es el canónico

Revisión de necesidad pedida por el operador ("¿1095/1096 quedaron absorbidas? el surfaceContext ya se creó, revisá bien"). **Corrección a una imprecisión previa de este delta:**

- **El surfaceContext SÍ existe:** es **`NexaAnswersSurfaceContext`** (`src/components/greenhouse/primitives/nexa-answers-canvas/nexa-answers-canvas-types.ts`) — `surfaceId/domain/placement/dataReality/sensitivity/allowedRenderers/allowedActions`. Es el contrato que el `NexaAnswersCanvas` consume y que la sesión 2026-06-13 extendió (citas/toolbar/stop/portabilidad). Lo que **nunca se construyó** fue un módulo *separado* `NexaSurfaceContext` en `src/lib/nexa/` que el Arch Gate A1 imaginaba como distinto.
- **El answer-trace de TASK-1089/1090 NO modela surfaceContext** (`NexaKnowledgeAnswerSurface` solo tiene variants `conversationTrace`/`overviewPanel`/`toolResult` + kinds). ⇒ `NexaAnswersSurfaceContext` es objetivamente el contrato más completo.

**Decisión del operador (2026-06-13):** la surface canónica de la lente Nexa es **`NexaAnswersCanvas` + `NexaAnswersSurfaceContext`** (la más rica). Eso **resuelve A1/A2 invirtiendo la dirección**: no se inventa un SSOT nuevo ni se migra el canvas — se **bendice `NexaAnswersSurfaceContext` como el SSOT canónico** (opcionalmente promoviendo su ubicación a `src/lib/nexa/`, o blessing in-place) y los demás consumidores convergen hacia él; el answer-trace converge o se deprecia.

**Lo que NO se absorbió y sigue siendo scope de 1095:**

- **A2 — descomposición de la máquina de estados** (refinamiento *interno* del canvas canónico, no migración): los 10 estados planos → dimensiones ortogonales lifecycle (`idle|composing|submitted|thinking|answered|degraded`+`error`) × disclosure (`proofOpen`) × turn (`followup`/`compacted`).
- **A3/A6/A7** — capabilities/scope + sensitivity tiers mapeados a `can(...)`, contrato a11y del answer-turn, ≥1 reliability signal de salud (`nexa.conversation.surface_context_invalid`, steady=0).
- El sustrato de evidencia ya era de **TASK-1093 (complete)** — nunca fue scope de 1095.

**Acción:** mantener `to-do`, **re-scopear** a: (1) bendecir/promover `NexaAnswersSurfaceContext` como SSOT + convergencia de answer-trace, (2) A2/A3/A6/A7 sobre el canvas canónico. **TASK-1101 (runtime)** consume el contrato existente, ya no espera un SSOT nuevo.

## Arch Review Gate (2026-06-12)

Review de arquitectura (`docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_V2_ARCH_REVIEW.md` + Delta del ADR) verificó que el diseño es sólido pero **TASK-1096 se está construyendo UI-first y ya forkeó contratos que esta task debe poseer**. Antes de seguir endureciendo 1096, esta task debe aterrizar el contrato mínimo (types-only basta):

- **A1 — `surfaceContext` SSOT.** `NexaSurfaceContext` (§7) vive en `src/lib/nexa/` como única fuente; el `NexaAnswersCanvas` lo consume (hoy define un `NexaAnswersSurfaceContext` local divergente). **Mergear** el `allowedRenderers`/`allowedActions` del canvas (renderer-allowlist de seguridad) al contrato canónico.
- **A2 — máquina de estados descompuesta.** Los 6 estados canónicos (`idle|composing|submitted|thinking|answered|degraded`) + `error` son **lifecycle puro**. `proofOpen` (disclosure) y `followup`/`compacted` (turn) son **dimensiones separadas**, no estados de lifecycle. El canvas (10 estados planos) debe reconciliar contra esta descomposición. Regla: nunca mezclar dimensiones ortogonales en un enum.
- **A3 — `capabilities.action`/`scope` + sensitivity tiers mapeados a `can(subject, capability, action, scope)`** antes de cualquier piloto no-Knowledge.
- **A6 — contrato a11y del answer-turn** (cross-surface, pertenece a esta task): `aria-live="polite"` sin robar foco al composer, landmarks/headings de la conversación, proof on-demand top-layer (`dialog`/`popover`), reduced-motion horneado.
- **A4 — interface/stub server-side** del builder de `surfaceContext` + shape del endpoint embedded-answer, antes de endurecer fixtures (Full API Parity: el reader primero, la UI después).
- **A7 — ≥1 reliability signal** de salud propia (ej. `nexa.conversation.surface_context_invalid`, steady=0), distinto de los analytics de producto del §15.

A1/A2/A3/A6 son blocking pre-`Accepted` del ADR.

## Why This Task Exists

`TASK-1093` entrego una V1 deliberadamente acotada: `ConversationalEvidencePacket`, `NexaEvidencePanel`, `inlineFollowUp` y rehidratacion segura de tool evidence. La plataforma completa quedo diferida hasta que existieran consumidores reales. Con `TASK-1090`, `/knowledge` ya es ese consumidor: necesita el patron tipo Google AI Mode aprobado, pero hoy la arquitectura sigue repartida entre `NexaThread`, `NexaFloatingPanel`, `NexaKnowledgeAnswerSurface`, `NexaEvidencePanel` y docs que aun describen un idle viejo con trace rail/respuesta visible.

La raiz del problema no es un pixel de `/knowledge`: es que Greenhouse necesita un contrato conversacional estable para responder preguntas utiles y accionables sobre cualquier dominio del portal, con contexto y evidencia disponibles por detras, sin crear chats paralelos ni cards de retrieval que rompan la conversacion.

## Target Experience Narrative

La experiencia objetivo no debe sentirse como otro panel de datos ni como un visor tecnico de retrieval. Debe sentirse como una conversacion competente dentro de Greenhouse: Nexa responde con claridad, entiende la surface desde donde fue invocada, recuerda el contexto inmediato, muestra suficiente confianza para trabajar y deja la maquinaria tecnica disponible solo cuando el usuario la necesita.

Knowledge es el primer consumer real de Nexa Answers porque estamos terminando de construir esa experiencia y es la surface de menor riesgo para aprender el patron: lectura/explicacion sobre documentos gobernados, fuentes, citas y freshness, sin writes operacionales. No es el destino final ni el owner conceptual del patron. La misma base debe poder aparecer junto a un chart financiero, en una vista de Agency, en Personas, en Commercial o dentro de un flujo operacional. En cada caso cambia el contexto, el riesgo y las acciones disponibles; no cambia el contrato conversacional de fondo.

En `/knowledge`, el selector comun gobierna la intencion: **Humano | Nexa | MCP**.

- **Humano** conserva el Workbench documental: buscar, filtrar, explorar y trabajar sobre documentos.
- **Nexa** abre una superficie conversacional limpia: sin respuesta falsa, sin trace rail prematuro, sin proof panel visible antes de preguntar. El composer es el primer foco.
- **MCP** ofrece la inspeccion tecnica/agencial: resources, packets, provenance y trazas sanitizadas sin pretender ser chat humano.

Cuando el usuario pregunta, la pregunta aparece primero como burbuja. La interfaz reconoce la intencion antes de que Nexa responda. Despues aparece Nexa con identidad clara y una senal de pensamiento sobria; no hay multiples spinners, skeletons ni panels de intento ocupando la escena.

Cuando Nexa responde, la primera cosa visible es la respuesta. Debe ser directa, sintetizada y util para avanzar el trabajo. Si corresponde, termina con un siguiente paso, accion sugerida o follow-up natural. El composer queda alcanzable para continuar.

La evidencia aparece como confianza progresiva, no como protagonista:

- Por defecto se muestra solo una senal compacta: "basado en X fuentes", "fuente reciente", "revisar vigencia", "sin fuente suficiente" o copy canonico equivalente.
- Si el usuario quiere inspeccionar, abre el proof: fuentes, citas, frescura, limitaciones, filtered count y feedback.
- Si el usuario esta en MCP, puede ver el packet tecnico completo y la provenance sanitizada.

En un follow-up, Nexa no reinicia la escena ni vuelve a imprimir todo el proof. Conserva el contexto conversacional, responde sobre lo anterior y actualiza la senal de confianza solo si cambio la base. La conversacion avanza; la evidencia permanece disponible.

La jerarquia de experiencia es:

1. Utilidad: "me respondio y puedo actuar".
2. Confianza: "se de donde viene y que tan solido es".
3. Inspeccion: "puedo abrir el proof si lo necesito".
4. Operacion tecnica: "MCP puede ver el paquete completo".

El anti-patron que esta task debe evitar: convertir Nexa en un dashboard de retrieval o en un sistema defendiendose en juicio cada vez que habla.

El segundo anti-patron: crear "mini Nexas" por modulo. Finance no debe tener su propio chat financiero, Agency su propio chat de cuentas y Knowledge su propio chat documental. Cada surface debe aportar contexto, permisos, acciones y provenance mediante adapters; la conversacion sigue siendo una plataforma compartida.

## Goal

- Definir a Nexa como capability core de Greenhouse: un fabric agentico que puede aparecer como chat, answer embebido, insight promovido, recomendacion operativa, technical/MCP moment o client self-service moment.
- Canonizar el mapa de momentos y dominios para Knowledge, Finance, Agency/Account 360, People, Commercial, Delivery/ICO, Client Portal y future operational modules.
- Bendecir `NexaAnswersSurfaceContext` como contrato vigente y completar su semantica: context, data reality, sensitivity, renderer/action allowlists y ownership de adapters.
- Definir el boundary de acciones: suggestions y explanations pueden vivir en el moment; writes/approvals/retries/export/recovery deben ir por commands/API/capabilities gobernadas.
- Formalizar reliability/evals minimos del fabric y degradacion honesta por dominio/contexto/provenance.
- Dejar TASK-1096 y TASK-1101 desbloqueadas por contrato: 1096 diseña la experiencia sentida; 1101 promueve runtime real Knowledge.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/architecture/ui-platform/STACK.md`
- `DESIGN.md`

Reglas obligatorias:

- No crear otro chat de Nexa. `NexaThread`, `useNexaPersistentRuntime`, `NexaFloatingPanel`, `NexaComposer`, `NexaToolRenderers`, `NexaKnowledgeAnswerSurface` y `NexaEvidencePanel` son la base a converger.
- No crear `NexaAnswerTurn` paralelo si `NexaKnowledgeAnswerSurface` puede evolucionar por alias, facade, rename gradual o variants/kinds. La decision debe quedar documentada antes de tocar consumers.
- No acoplar la experiencia conversacional a Knowledge. Knowledge es el primer consumer real por bajo riesgo y porque su experiencia se esta cerrando; Finance, charts, Agency, Personas, Commercial y futuros modulos deben poder consumir el mismo contrato mediante context adapters.
- Cada consumer debe aportar un `surfaceContext` tipado: surface id, dominio, entidad o metrica actual, rango temporal cuando aplique, capabilities/acciones permitidas, nivel de sensibilidad, estado de datos y provenance disponible.
- La plataforma conversacional no decide permisos de negocio por UI. Debe recibir capabilities/entitlements ya resueltos o invocar readers/commands canonicos server-side; no debe inferir acceso desde la ruta visible.
- El idle conversacional aprobado es limpio: composer/empty state, sin respuesta falsa, proof panel ni trace rail prematuro.
- La pregunta del usuario debe preservarse como burbuja antes de que aparezca Nexa/avatar/respuesta.
- Trace completo vive como proof panel, disclosure o lane contextual despues de una pregunta. Las cards de intento/retrieval no deben aparecer arriba cortando la conversacion.
- Evidence no es el personaje principal de un answer-turn humano: por defecto se presenta como una senal compacta de confianza; el proof detallado aparece solo bajo demanda, en un disclosure, en un sidecar contextual o en la lente MCP.
- Placement no es answer-turn: `floatingChat`, `embeddedChat` y `sidecarLane` pertenecen a shells/placements; `knowledgeAnswerTrace`, `toolResult` y `overviewPanel` pertenecen al answer-turn; `inlineFollowUp` pertenece al composer.
- Sidecar/lane futuro debe montar `AdaptiveSidecarLayout variant='assistant'`; no crear shell paralela para imitarlo.
- UI no consulta tablas ni reimplementa retrieval. Knowledge conversa solo via packets reales `knowledge-search.v1` y adapters `nexa-evidence.v1`.
- Los consumers no-Knowledge tampoco consultan tablas desde UI ni duplican readers. Finance, Agency, Personas y Commercial deben conectarse mediante primitives/readers/commands canonicos y adapters de contexto/provenance.
- Copy visible reutilizable debe vivir en `src/lib/copy/*`; no hardcodear labels/aria/empty states repetibles.

### Required architecture deliverables

Esta task requiere arquitectura formal antes de implementar runtime. No basta con dejar la decision dentro de la task.

Crear o actualizar:

- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`
  - Spec canonica de la plataforma conversacional multi-surface.
  - Debe cubrir runtime boundaries, `surfaceContext`, consumer adapters, answer-turn contract, provenance/trust cue/proof layers, placement ownership, access/capability boundaries, observability/evals y migration path desde `NexaKnowledgeAnswerSurface`.
- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`
  - ADR dedicado porque la decision cruza UI platform, Nexa runtime, Knowledge, Finance/charts, Agency, Personas, Commercial, MCP/provenance y access boundaries.
  - Debe incluir `Status`, `Date`, `Owner`, `Scope`, `Reversibility`, `Confidence`, `Validated as of`, `Context`, `Decision`, `Alternatives Considered`, `Consequences`, `Runtime Contract` y `Revisit When`.
- `docs/architecture/DECISIONS_INDEX.md`
  - Agregar la decision cuando el ADR pase a `Accepted`.
- `docs/architecture/ui-platform/PATTERNS.md`, `PRIMITIVES.md`, `HISTORIAL.md`
  - Enlazar la spec/ADR y reflejar el contrato de UI platform.

Decision minima a formalizar:

> Nexa Conversational Experience V2 es una plataforma conversacional multi-surface gobernada por un contrato compartido (`surfaceContext` + answer-turn + provenance substrate), no una implementacion local de Knowledge ni un conjunto de chats por modulo.

Alternativas que el ADR debe evaluar y rechazar o acotar:

- Chat local por dominio (`FinanceNexaChat`, `AgencyNexaChat`, etc.).
- Knowledge-only AnswerSurface promovido sin `surfaceContext`.
- Proof/evidence como UI principal de cada respuesta.
- Sidecar/chat shell nuevo que duplique `NexaThread`, `NexaFloatingPanel` o `AdaptiveSidecar`.
- UI adapters que infieren permisos desde ruta/rol en vez de capabilities/entitlements server-side.

## Normative Docs

- `docs/tasks/complete/TASK-1093-greenhouse-conversational-experience-platform-v1.md`
- `docs/tasks/in-progress/TASK-1090-answer-trace-promotion-spec.md`
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md`
- `docs/tasks/complete/TASK-950-nexa-insights-list-page-canonical.md`
- `docs/tasks/in-progress/TASK-1089-nexa-knowledge-answer-surface.md`
- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md`
- `docs/tasks/in-progress/TASK-1078-nexa-floating-chat-expandable-persisted.md`
- `docs/tasks/to-do/TASK-1079-nexa-interaction-mode-sidecar-c-and-preference.md`
- `docs/tasks/in-progress/TASK-1092-nexa-knowledge-production-readiness-inline-citations.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-1093` complete: evidence view-model V1, shared `NexaEvidencePanel`, `inlineFollowUp` composer and evidence rehydration.
- `TASK-1085` complete: `search_knowledge`, `knowledge-search.v1`, real packet rendering and reliability signals.
- `TASK-1089` code-complete foundation: `NexaKnowledgeAnswerSurface` exists as the first answer-turn composition primitive.
- `TASK-1090` WIP context: `/knowledge` has Humano/Nexa/MCP lenses and revealed the need for a V2 contract.

### Blocks / Impacts

- `TASK-1090` should consume the V2 contract before final closure if the operator wants Knowledge to be the first serious conversational consumer.
- `TASK-1096` owns the product/UI choreography of **Nexa Answers** and consumes this task as its platform support layer. TASK-1095 must not absorb that visual-experience scope.
- `TASK-1079` sidecar/lane mode should mount the same runtime and answer-turn primitives instead of designing a new chat shell.
- `TASK-1092` production readiness must remain serial with this task if both touch `NexaThread`, `NexaToolRenderers`, `use-nexa-runtime` or answer evidence.
- Future MCP/app lanes can reuse the provenance substrate instead of creating local packet renderers.
- Finance, chart intelligence, Agency, Personas and Commercial should consume the same conversational substrate through adapters instead of spawning local chat patterns.

### Files owned

- `src/lib/nexa/conversational-evidence.ts`
- `src/lib/nexa/use-nexa-runtime.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx`
- `src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx`
- `src/components/greenhouse/primitives/nexa-knowledge-answer-surface-controller.ts`
- `src/components/greenhouse/primitives/NexaEvidencePanel.tsx`
- `src/components/greenhouse/primitives/NexaComposer.tsx`
- `src/components/greenhouse/primitives/nexa-composer-controller.ts`
- `src/lib/copy/nexa.ts`
- `src/lib/copy/knowledge.ts`
- `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `src/views/greenhouse/knowledge/KnowledgeCenterView.tsx`
- `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`
- `scripts/frontend/scenarios/knowledge-answer-trace.scenario.ts`
- `scripts/frontend/scenarios/knowledge-lenses.scenario.ts`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- `useNexaPersistentRuntime` is the canonical assistant-ui runtime for Home and floating panel, including threadId persistence and rehydrated tool-call parts.
- `NexaThread` renders user bubbles, Nexa sender mark, markdown answer, thinking beat, tool renderers, follow-up suggestions and sticky composer.
- `NexaFloatingPanel` mounts the runtime, history rail, contextual prompts and keyed conversation remount.
- `NexaKnowledgeAnswerSurface` renders the approved answer choreography: question bubble, Nexa answer, follow-up composer and proof panel.
- `ConversationalEvidencePacket` normalizes Knowledge evidence from `knowledge-search.v1` for rehydration, evals, feedback, MCP and optional proof inspection.
- `NexaEvidencePanel` renders trace, sources, freshness, confidence, filtered count and feedback for expanded proof states; it is not the default body of a human conversational answer.
- `/knowledge` WIP already has Humano/Nexa/MCP lenses and uses `NexaKnowledgeAnswerSurface` for the Nexa lens.

### Gap

- The canonical state machine is not named in code, so each surface still decides locally what idle, thinking, answered and degraded mean.
- There is no named multi-surface consumer contract yet, so a finance chart, an agency account view, a person profile and a commercial workflow would each need to invent how they pass context, allowed actions and provenance into Nexa.
- `ConversationalEvidencePacket` is still Knowledge-only (`kind='knowledge'`), so future tool provenance would need ad hoc shapes unless V2 expands the contract.
- `NexaKnowledgeAnswerSurface` is the answer-turn in practice, but its name and docs still imply a Knowledge-specific surface. The repo needs a deliberate compatibility/rename strategy.
- `docs/architecture/ui-platform/PATTERNS.md` still describes an idle state with trace rail/respuesta/proof visible, contradicting the TASK-1090 approved idle-clean contract.
- Placement rules are not yet executable enough: sidecar/overview/floating can still drift unless the task documents which existing shell owns each placement.
- The default conversational presentation still over-weights proof/evidence compared with answer utility, follow-up continuity and actionability. V2 must make evidence progressive: invisible runtime substrate first, compact trust cue second, expanded proof only when the user or surface asks for it.

### Deep discovery — 2026-06-12

This task now has a repo-verified discovery baseline:

- `NexaKnowledgeAnswerSurface` is the strongest UI seed, but it is not yet the platform. It owns choreography props and proof rendering, not a typed multi-surface contract.
- `/knowledge` currently wires the Nexa lens to `runKnowledgeSearch(..., 'agentic')` and local answer-step derivation. It does not yet submit a contextual prompt to the shared Nexa runtime.
- `useNexaPersistentRuntime` and `/api/home/nexa` are canonical for Nexa Chat/Home/floating usage, but they are HomeSnapshot/thread-history oriented. TASK-1095 must decide whether embedded answers use a generalized endpoint, a mode on the existing endpoint, or an adapter around the service.
- `src/lib/nexa/nexa-page-context.tsx` is too shallow for V2. It can inspire context labels, but it cannot carry safe refs, sensitivity tier, data reality, capabilities or provenance refs.
- `ConversationalEvidencePacket` should become a provenance substrate, not a Knowledge-only citation packet. It must preserve the current `knowledge-search.v1` adapter while adding generic/degraded/unsupported paths.
- The compact trust cue does not exist as a first-class view-model. Do not use `NexaEvidencePanel` as the visible trust cue; keep it for expanded proof.
- `Nexa Insights` needs only a promotion contract in TASK-1095, not a chat UI rewrite: promoted insight context should carry signal/enrichment refs, lifecycle state, severity, entity refs, sensitivity and provenance refs.
- UI platform docs had known drift around the old idle/proof contract. TASK-1095 should treat that as a migration/documentation input; TASK-1096 owns the final product-pattern wording.

Execution implication:

1. Start with `src/lib/nexa/surface-context.ts` and fixtures before touching product consumers.
2. Keep Knowledge as the reference consumer but do not let Knowledge fields leak into the generic contract.
3. Keep Knowledge as the first real low-risk rollout surface, but keep the first real non-Knowledge rollout out of TASK-1095. Use fixtures/specimens only; open a child pilot after TASK-1096.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Core doctrine and ADR refresh

- Actualizar o crear el ADR/spec de plataforma para declarar que Nexa es una capability core de Greenhouse, no una UI local de Knowledge.
- Nombrar el fabric como `Nexa Moment Fabric` o equivalente aprobado y fijar vocabulario: `Nexa Moment`, `Conversational Moment`, `AI Moment`, `Nexa Answers`, `Nexa Chat`, `Nexa Insight promoted`, `MCP/technical moment`.
- Documentar la relacion Efeonce/Greenhouse: Nexa sirve a colaboradores, operadores internos y clientes segun access/tier/contexto, no solo a usuarios internos.

### Slice 1 — Moment taxonomy and domain synergy map

- Definir tipos de momento:
  - direct chat,
  - embedded answer,
  - promoted insight,
  - operational recommendation,
  - workflow copilot,
  - technical/MCP packet,
  - client self-service moment.
- Mapear cada tipo contra dominios: Knowledge, Finance, Agency/Account 360, People, Commercial, Delivery/ICO, Client Portal y Admin/Ops.
- Para cada dominio, registrar contexto aportado, acciones potenciales, sensitivity tier, provenance esperada y degradacion si falta reader/API.

### Slice 2 — Surface context blessing and adapter contract

- Bendecir `NexaAnswersSurfaceContext` como SSOT vigente y decidir si se mantiene in-place o se promueve a `src/lib/nexa/`.
- Separar formalmente:
  - `context`: safe refs, labels, data reality, sensitivity, provenance refs;
  - `rendering`: allowed renderers, placement, answer-turn affordances;
  - `action`: allowed actions/capabilities resueltas por policy/server.
- Definir adapter contract por dominio sin payloads crudos ni autorizacion inferida desde ruta/rol.

### Slice 3 — Action/capability and autonomy boundary

- Documentar que V1 de moments es explain/suggest/recommend por defecto.
- Toda accion ejecutable debe declarar command/API/readers canonicos, authorization tenant-safe, audit/outbox cuando aplique, idempotencia y errores sanitizados.
- Clasificar autonomy levels: `inform`, `recommend`, `draft`, `execute_requires_confirmation`, `execute_autonomous` (los ultimos dos quedan follow-up gobernado).

### Slice 4 — Reliability, provenance and evals

- Definir senales minimas: context invalid, unsupported domain, proof unavailable, action unavailable, stale/partial data.
- Conectar conceptualmente con `NexaProvenanceTrace` y `ConversationalEvidencePacket` sin reabrir la primitive.
- Aceptar degradacion honesta como comportamiento de primera clase.

### Slice 5 — Program handoff

- Dejar TASK-1096 como owner de experiencia/percepcion de moments.
- Dejar TASK-1101 como owner del runtime Knowledge sobre el contrato existente.
- Crear o referenciar el primer child pilot no-Knowledge cuando producto decida prioridad: recomendado `finance.chart_explanation` o `account360.signal_explanation`.

## Historical Scope (superseded by rescope 2026-06-13)

### Slice 0 — Architecture and ADR gate

- Create `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md` before runtime implementation.
- Create `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md` as a dedicated ADR.
- Update `docs/architecture/DECISIONS_INDEX.md` when the ADR is accepted.
- Include at minimum:
  - C4/container-level relationship between Nexa runtime, Nexa Chat, Nexa Insights, UI primitives, surface adapters, API/readers/commands, MCP and provenance/evals,
  - `surfaceContext` schema and invariants,
  - AI experience moment map: direct conversational consumers, conversationally promotable moments and technical/MCP moments,
  - pre-implementation checklist from `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`,
  - recommended delivery boundary: platform + Knowledge first real low-risk consumer + non-Knowledge fixtures now; real non-Knowledge pilot as child follow-up,
  - consumer adapter lifecycle,
  - access/capability boundary,
  - redaction/sensitivity model,
  - observability/eval hooks,
  - migration/compatibility plan from `NexaKnowledgeAnswerSurface`,
  - 12-month and 36-month self-critique.
- Runtime implementation in Slices 1-6 must not start until this slice is accepted or explicitly approved as `Proposed` by the operator.

### Slice 1 — Canonical conversational state contract

- Define the V2 state contract (`idle`, `composing`, `submitted`, `thinking`, `answered`, `degraded`) as a small reusable controller/view-model, not a visual component.
- Map each state to expected UI behavior for chat, AnswerSurface, Knowledge Nexa lens and embedded domain surfaces.
- Add regression coverage that idle does not render answer, proof detail or trace before a user submits.
- Define an answer/action-first contract: the answer turn must prioritize useful response, suggested next step and conversational continuity before any proof detail.
- Define how follow-up turns inherit prior question, answer context and provenance silently, without re-rendering the full proof payload on every turn.
- Move repeated state/copy labels into `src/lib/copy/nexa.ts` or `src/lib/copy/knowledge.ts` where applicable.

### Slice 2 — Multi-surface consumer contract

- Define the surface consumption contract before broadening UI:
  - `surfaceId` / placement owner,
  - `domain` (`knowledge`, `finance`, `chart`, `agency`, `person`, `commercial`, `generic`),
  - entity references (`organization_id`, `person_id`, metric id, document id, chart id or equivalent domain-safe ref),
  - time range / cohort / segment when applicable,
  - data reality (`strong`, `partial`, `delayed`, `inferred`, `degraded`, `unknown`),
  - allowed actions/capabilities already resolved by server-side policy,
  - provenance packet refs and trust cue inputs,
  - sensitivity/redaction tier.
- Add a small adapter pattern so surfaces contribute context without importing or mutating the conversational runtime internals.
- Document how embedded consumers differ from global chat:
  - Nexa Chat is the primary direct shell consumer,
  - Nexa Insights is an advisory AI moment that may promote into conversation from a selected signal/enrichment,
  - embedded finance/chart/person/commercial surfaces start from local context,
  - global/floating chat starts from broad workspace context,
  - sidecar lane starts from selected object/section context.
- Add type/tests or fixture coverage for at least four consumer profiles: Nexa Chat/global, Nexa Insight promotion, Knowledge, finance/chart insight and one operational domain (`agency`, `person` or `commercial`).
- Keep the contract additive: no consumer may require a Knowledge-shaped packet or a document-citation-only proof model.
- Do not start the real non-Knowledge product rollout inside this slice. Define fixtures/specimens only; open or reference a child follow-up task for the first pilot.

### Slice 3 — Answer-turn generalization without parallel components

- Decide and implement the compatibility strategy for `NexaKnowledgeAnswerSurface`:
  - preferred: introduce a canonical facade/alias such as `NexaAnswerTurn` that delegates to the existing implementation; or
  - acceptable: keep the current name for now, but document it as the answer-turn primitive of record and add a clear rename follow-up.
- Preserve existing public props used by `/knowledge/mockup/answer-trace` and `/knowledge`.
- Keep `showModeSelector` default `true` and `showTraceRail` default `false`.
- Ensure variants/kinds are owned by the correct layer: answer-turn (`conversationTrace`, `overviewPanel`, `toolResult`), composer (`inlineFollowUp`), placement (`floating`, `embedded`, `sidecar`).

### Slice 4 — Provenance substrate and progressive disclosure

- Extend `ConversationalEvidencePacket` to support future evidence/provenance kinds beyond Knowledge without forcing every tool into a Knowledge-shaped packet.
- Preserve the existing `knowledge-search.v1 -> nexa-evidence.v1` adapter and its tests.
- Add at least one generic degraded/unsupported evidence path so operational tools can degrade honestly instead of rendering fake proof.
- Keep sensitive data out of persisted evidence; no prompts internos, no corpus completo, no raw provider payloads beyond the sanitized tool result already persisted.
- Define the default presentation ladder:
  - Layer 0: invisible runtime substrate for rehydration, evals, feedback, MCP and reliability.
  - Layer 1: compact human trust cue, for example source count, citation marker, freshness or "basado en Knowledge".
  - Layer 2: inspectable proof on demand via disclosure, floating evidence peek or AdaptiveSidecar when the surface needs depth.
  - Layer 3: agent/MCP packet with full sanitized trace for technical inspection.
- Define the Layer 1 trust cue taxonomy in copy and view-model terms, including at least:
  - sourced/current: "basado en X fuentes" or equivalent canonical copy,
  - cited but stale: "fuente disponible, revisar vigencia",
  - insufficient source: "sin fuente suficiente",
  - unavailable proof: honest degraded copy without implying the answer is verified.
- Separate confidence semantics in the view-model: retrieval confidence, answer confidence, source freshness and policy/runtime restrictions must not be collapsed into one raw score.
- `NexaEvidencePanel` remains the expanded proof renderer. It must not become the default visible answer body for human conversation.

### Slice 5 — Knowledge as first serious V2 consumer

- Reconcile `/knowledge` with V2 instead of local behavior:
  - Humano remains a document workbench.
  - Nexa consumes the answer-turn contract with idle clean, answer-first response and compact trust cue after submit.
  - Expanded proof remains available on demand; it should not displace the answer or follow-up composer by default.
  - MCP consumes resource/provenance views without pretending to be chat.
- Follow-up questions in the Nexa lens should preserve conversational continuity: the user sees the new question/answer flow, while provenance continuity remains available in the background and only surfaces as a compact cue or expanded proof when requested.
- Remove or document any leftover local logic that duplicates answer-turn/provenance behavior.
- Keep `/knowledge/mockup/answer-trace` as protected visual baseline/lab; do not delete or replace it.
- Update `knowledge-lenses` and `knowledge-answer-trace` GVC scenarios if the V2 contract changes selectors or state names.

### Slice 6 — Design System, docs and verification

- Update `/design-system/nexa-chat` specimens to show:
  - clean idle state,
  - Nexa Chat global conversation,
  - Nexa Insight promoted into conversation,
  - multi-surface consumer examples for Knowledge, finance/chart and one operational domain,
  - answer turn with compact trust cue,
  - expanded proof disclosure,
  - tool result compact/degraded,
  - Knowledge Answer Trace,
  - historical evidence degraded state.
- Update `docs/architecture/ui-platform/PATTERNS.md`, `PRIMITIVES.md` and `HISTORIAL.md` so the canonical docs no longer describe the old idle trace rail behavior.
- Update Knowledge functional/manual docs only for runtime-visible behavior.
- Run GVC on `design-system-nexa-chat`, `knowledge-answer-trace` and `knowledge-lenses`, covering both the default collapsed trust cue state and the expanded proof state.

## Out of Scope

- Do not build the full sidecar lane C; `TASK-1079` owns the interaction mode preference and lane implementation.
- Do not implement full conversational features in Finance, Agency, Personas or Commercial as product rollout in this task. This task defines the shared contract and representative fixtures/specimens so those domains can adopt it without re-architecture.
- Default follow-up recommendation: create a child task for finance/chart insight explanation as the first real non-Knowledge consumer. Knowledge remains the first real consumer because it is low risk and already under active experience completion. Agency account health is the alternate if product prioritizes operational next-best-action.
- Do not replace Nexa Insights list/detail/block UX with chat. V2 only defines the escalation contract from an insight into conversation.
- Do not implement token-by-token streaming; document it as a follow-up unless it already exists in `assistant-ui` without broad refactor.
- Do not activate production `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; `TASK-1092` owns production readiness.
- Do not redesign the whole floating chat shell or history rail.
- Do not create MCP write tools or new Knowledge backend endpoints.
- Do not replace `NexaThread` or `useNexaPersistentRuntime` with a new runtime.

## Detailed Spec

### State contract

The V2 contract must be explicit enough that product surfaces can share behavior without sharing layout:

| State | Meaning | Required UI behavior |
|---|---|---|
| `idle` | No user question in this surface/session yet | Empty hero or clean composer only; no fake answer, no proof panel, no trace rail |
| `composing` | User is typing but has not submitted | Keep composer focused; no retrieval/proof UI |
| `submitted` | Valid prompt accepted | Render user prompt as a bubble before Nexa appears |
| `thinking` | Runtime/tool/LLM is working | Show Nexa identity + one `GreenhouseThinkingBeat`; no duplicate spinners/skeletons |
| `answered` | Answer content exists | Render answer prose first, then compact trust cue, actions and follow-up composer; expanded proof is optional/on demand |
| `degraded` | Evidence/runtime missing or stale shape | Keep text readable; show honest copy such as evidence unavailable for this history/tool |

### Surface consumer contract

The conversational platform must be consumable by product surfaces without each module owning a chat fork. Consumers contribute context through an adapter/view-model boundary; the shared conversation primitives own state, answer-turn rendering, trust cues, proof disclosure and follow-up continuity.

Required fields:

| Field | Purpose | Notes |
|---|---|---|
| `surfaceId` | Stable consumer identity | Example: `knowledge.nexa`, `finance.chart`, `agency.account`, `person.profile`, `commercial.pipeline` |
| `domain` | Domain routing and copy semantics | `knowledge`, `finance`, `chart`, `agency`, `person`, `commercial`, `generic` |
| `placement` | UI placement owner | `embedded`, `floating`, `sidecar`, `chartOverlay`, `inspector` |
| `entityRefs` | Safe references to current object(s) | IDs/refs only; no raw private payloads in UI state |
| `timeRange` | Reporting or metric context | Required for charts/finance when temporal claims are made |
| `dataReality` | Truthfulness tier | `strong`, `partial`, `delayed`, `inferred`, `degraded`, `unknown` |
| `capabilities` | Allowed actions | Resolved by server-side policy/readers; UI does not infer permissions |
| `provenanceRefs` | Evidence/proof inputs | Versioned packets or safe refs, not raw provider payloads |
| `sensitivity` | Redaction/access tier | Drives what can be shown in trust cue, proof and MCP |

Reference consumer profiles:

| Consumer | Primary job | Context emphasis | Default UX |
|---|---|---|---|
| Knowledge Nexa lens | Ask grounded questions over corpus | Documents, sources, freshness, citations | Clean composer -> answer -> compact source cue -> proof on demand |
| Finance/chart insight | Explain a metric, movement or anomaly | Metric id, period, comparison, calculation provenance | Answer anchored to chart context; no fake drilldown if reader unavailable |
| Agency account surface | Explain account health or next action | Organization/account refs, engagement status, risk signals | Recommendation/action-first with provenance behind the cue |
| Person profile | Explain workforce/person context | Person ref, role/compensation/readiness access tier | Redaction-aware; avoids leaking restricted HR/payroll detail |
| Commercial pipeline | Explain deal/client lifecycle movement | Deal/org refs, stage, HubSpot/Bow-tie context | Next-best-action orientation; source freshness visible when relevant |

Hard rules:

- A surface adapter may provide context, not redefine conversational state.
- A surface adapter may expose allowed actions, not bypass command/API authorization.
- A surface adapter may provide provenance refs, not raw private records.
- A domain may specialize copy and suggested actions, not fork the answer-turn UI.
- A missing domain reader must degrade honestly instead of simulating evidence.

### Placement ownership

- Floating panel: `NexaFloatingPanel` remains the shell.
- Embedded/Home: `NexaThread` remains the body.
- Knowledge Nexa lens: Answer-turn embedded inside `KnowledgeCenterView`; selector of lenses stays in Knowledge, not inside the answer-turn.
- Embedded domain surfaces: finance charts, agency/person/commercial inspectors and future module surfaces consume the same answer-turn primitives through `surfaceContext`; they do not create their own chat shell.
- Sidecar lane: future `TASK-1079` mounts `AdaptiveSidecarLayout variant='assistant'`; V2 must not create a replacement shell.
- Evidence sidecar/provenance: use `NexaEvidencePanel` inside an explicit expanded proof surface or inside `AdaptiveSidecarLayout variant='evidence'` only when a real consumer exists. Do not mount it as the default answer body.

### Naming strategy

The task must decide and document one of these paths:

1. **Facade path:** create a canonical export such as `NexaAnswerTurn` that delegates to `NexaKnowledgeAnswerSurface` internally. Existing consumers continue to work, new consumers use the generic name.
2. **Deferred rename path:** keep `NexaKnowledgeAnswerSurface`, but update docs to state it is the answer-turn primitive of record until a future mechanical rename. This is acceptable only if adding a facade would create churn during TASK-1090.

Creating a second independent implementation is explicitly forbidden.

### Provenance substrate shape

`ConversationalEvidencePacket` must remain versioned and backward-compatible with current Knowledge packets. Expanding the union is acceptable; breaking `knowledgePacketToConversationalEvidence()` is not.

Any new evidence/provenance kind must answer:

- what generated the evidence,
- what the human user can inspect by default, if anything,
- what compact trust cue is safe to show in conversation,
- what citations/sources/actions are safe to reveal on demand,
- what feedback target exists, if any,
- what degraded state appears when the packet is old, missing or unsupported.

Presentation is part of the contract, not a local styling choice:

| Layer | Audience | Default visibility | Purpose |
|---|---|---|---|
| Layer 0 runtime substrate | Nexa runtime, evals, reliability | Hidden | Rehydration, feedback, tool provenance, observability |
| Layer 1 trust cue | Human user in conversation | Visible when helpful | Quick confidence signal without derailing the answer |
| Layer 2 proof detail | Human user inspecting | On demand | Sources, freshness, filtered count, feedback, limitations |
| Layer 3 MCP/agent packet | Technical lens / agent | Explicit technical surface | Full sanitized trace and machine-readable provenance |

### Trust cue taxonomy

Layer 1 trust cues must be short, human-readable and backed by the provenance view-model. They are not badges for decoration and must not expose raw scores by default.

| Cue state | Meaning | Default UX |
|---|---|---|
| `sourcedCurrent` | Sources exist and freshness is acceptable for the answer | Compact text such as "Basado en X fuentes" plus optional citation marker |
| `sourcedStale` | Sources exist but freshness is imperfect or needs review | Compact caution copy; proof detail can explain freshness |
| `insufficientSource` | Retrieval did not find enough grounded material | Honest limitation near the answer; no fake confidence |
| `proofUnavailable` | Historical/runtime packet cannot render proof safely | Degraded copy plus optional feedback target |
| `restricted` | Policy/access/runtime restriction prevents showing details | Minimal explanation; no raw payload or hidden source names |

### Confidence semantics

The V2 view-model must keep these concepts separate:

- retrieval confidence: how strongly the runtime matched source material,
- answer confidence: how confidently Nexa should present the generated answer,
- source freshness: whether the cited material is current enough for the topic,
- policy/runtime restrictions: whether access, sanitization or provider state limits what can be shown.

The UI may combine these into a compact cue, but implementation must not persist or render a single ambiguous "confidence" score as if it explained all four concepts.

### Answer/action-first behavior

Every answer turn should optimize for conversation quality:

- answer the user's question directly before showing proof mechanics,
- offer the next useful action, follow-up or refinement when the answer naturally invites one,
- keep the composer reachable after the answer,
- avoid turning standard answers into audit reports unless the user opens proof or uses MCP/technical lens.

### Follow-up continuity

Follow-up turns must carry prior conversational context and provenance references through the runtime/view-model. The visible UI should show the new user prompt and new Nexa answer, while inherited provenance stays in Layer 0 unless it changes the trust cue or the user expands proof.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (architecture + ADR) -> Slice 1 (state contract) -> Slice 2 (multi-surface consumer contract) -> Slice 3 (answer-turn naming/generalization) -> Slice 4 (provenance substrate + progressive disclosure) -> Slice 5 (Knowledge consumer) -> Slice 6 (docs/GVC).
- Slice 0 is a decision gate. Do not implement irreversible runtime contracts while the ADR is missing.
- Slice 5 must not start until Slice 1, Slice 2 and Slice 3 are verified, otherwise `/knowledge` will keep encoding local conversational behavior and the platform will be born Knowledge-specific.
- Do not run this task concurrently with `TASK-1092` if both touch `NexaThread`, `NexaToolRenderers`, `use-nexa-runtime`, `conversational-evidence` or `NexaKnowledgeAnswerSurface`.
- If `TASK-1090` WIP is still uncommitted, stage/commit only paths owned by the active slice and coordinate before touching the same files.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Crear un segundo chat/answer-turn paralelo | UI platform | medium | Facade/rename over existing `NexaKnowledgeAnswerSurface`; no duplicate implementation | GVC/design review shows two visual languages |
| Romper `/knowledge/mockup/answer-trace` baseline | Knowledge UI | medium | Preserve mockup route; run `knowledge-answer-trace` GVC before closing | GVC diff/finding on mockup baseline |
| Rehidratacion de threads viejos falla por provenance shape V2 | Nexa runtime | medium | Versioned adapter + fallback to text/degraded state | Console errors, thread reopen failures |
| Evidence sensible leaks into UI | Knowledge/Nexa/access | medium | Reuse filtered packets; sanitize persisted tool results; expose compact trust cues by default | Access QA, reliability logs, user report |
| Conversacion se vuelve un visor de pruebas | Product UX | medium | Answer-first rule + Layer 1 trust cue by default + proof only on demand | GVC shows proof panel competing with answer/composer |
| Plataforma nace acoplada a Knowledge | Architecture/Product | high | Slice 2 surface contract + fixtures for non-Knowledge profiles before Knowledge adoption | Types/copy mention only documents/citations; finance/chart profile cannot be represented |
| Domain surface bypasses authorization | Security/access | medium | Capabilities are resolved server-side; UI adapters cannot infer access | Consumer adapter passes raw route/role instead of capability/action refs |
| Context payload leaks private data | Security/privacy | medium | Entity refs + sensitivity tier only; no raw records in UI state | Serialized surface context contains payroll/finance/HubSpot raw payload |
| Trust cue comunica falsa certeza | Product UX / AI safety | medium | Separate confidence semantics; no raw score as universal confidence | Copy review finds "verified" claims without enough source/freshness |
| Follow-up pierde contexto o reimprime todo el proof | Runtime/UI | medium | Preserve provenance refs in Layer 0; show only changed cue or requested proof | Follow-up turn repeats full source panel or contradicts previous context |
| Scope creeps into sidecar/streaming/prod rollout | Delivery | medium | Explicit out-of-scope and slice gates | Diff touches `TASK-1079` lane or production flags |

### Feature flags / cutover

- No new flag is required for additive controller/docs/test changes.
- Any broad replacement of live floating/Home chat behavior must use an explicit flag or an existing surface flag; do not silently cut over all Nexa placements.
- `/knowledge` is already WIP under `TASK-1090`; if V2 is implemented before 1090 commit, treat its runtime adoption as part of local WIP and verify with GVC before commit.
- Production Knowledge retrieval remains governed by `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` and `TASK-1092`; this task does not flip it.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Mark ADR `Proposed`/withdrawn and do not implement runtime changes | <10 min | si |
| Slice 1 | Revert controller/state contract and tests; consumers still use existing behavior | <10 min | si |
| Slice 2 | Remove multi-surface adapter types/fixtures; existing Knowledge behavior remains | <15 min | si |
| Slice 3 | Remove facade/alias or revert docs-only naming decision; existing `NexaKnowledgeAnswerSurface` remains | <15 min | si |
| Slice 4 | Keep `knowledge` adapter and remove new provenance kinds/degraded adapter; keep compact trust cue hidden if needed | <15 min | si |
| Slice 5 | Revert `/knowledge` consumer changes to previous `TASK-1090` state; mockup route remains intact | <15 min | si |
| Slice 6 | Revert DS/docs/scenario changes; no production runtime impact | <10 min | si |

### Production verification sequence

1. Run focal ESLint for touched Nexa/Knowledge UI files.
2. Verify `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`, `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md` and `DECISIONS_INDEX.md` are synchronized before runtime closure.
3. Run focal Vitest for `conversational-evidence`, `use-nexa-runtime`, `NexaToolRenderers`, `NexaKnowledgeAnswerSurface`/facade and composer tests.
4. Run `pnpm exec tsc --noEmit --pretty false`.
5. Run `pnpm design:lint` if UI docs/tokens or DS specimens change.
6. Run `pnpm fe:capture design-system-nexa-chat --env=local`.
7. Run `pnpm fe:capture knowledge-answer-trace --env=local`.
8. Run `pnpm fe:capture knowledge-lenses --env=local`.
9. Manually inspect GVC frames: idle clean, question bubble, Nexa/avatar, answer-first layout, compact trust cue, follow-up composer and expanded proof only when requested.
10. Capture/inspect at least one follow-up turn when the implementing slice touches follow-up continuity, confirming context persists without reprinting the full proof payload.
11. Verify the non-Knowledge consumer fixtures/specimens for finance/chart and one operational domain still render/degrade without requiring Knowledge citations.
12. Run `pnpm task:lint --task TASK-1095`, `pnpm ops:lint --changed`, `pnpm docs:closure-check` and `git diff --check`.

### Out-of-band coordination required

- N/A for external platforms. Repo-only UI/platform work.
- Product review required before declaring `/knowledge` conversational experience final, because this task intentionally governs the visual/UX contract used by `TASK-1090`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] TASK-1095 consume `GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md` y declara a Nexa como capability core agentica de Greenhouse, no como feature local de Knowledge.
- [ ] Existe una taxonomia inicial de `Nexa Moments` / `Conversational Moments` / `AI Moments` que distingue direct chat, embedded answer, promoted insight, operational recommendation, workflow copilot, technical/MCP moment y client self-service moment.
- [ ] El mapa de dominios cubre Knowledge, Finance, Agency/Account 360, People, Commercial, Delivery/ICO, Client Portal y Admin/Ops con contexto, sensitivity, provenance y acciones potenciales.
- [ ] `NexaAnswersSurfaceContext` queda bendecido como contrato canonico vigente o movido/promovido con compatibilidad clara.
- [ ] El boundary `context` vs `rendering` vs `action` queda documentado y no permite inferir permisos desde UI.
- [ ] Las actions ejecutables declaran command/API/capability/audit/idempotencia cuando corresponda; V1 queda explain/suggest/recommend por defecto.
- [ ] Reliability/evals minimos quedan definidos para context invalid, unsupported domain, proof unavailable, action unavailable y stale/partial data.
- [ ] TASK-1096 y TASK-1101 quedan explícitamente desbloqueadas por el contrato existente; no esperan que 1095 construya UI/runtime.
- [ ] Primer child pilot no-Knowledge queda recomendado o creado como follow-up de dominio.
- [ ] Los acceptance criteria historicos de abajo se reinterpretan bajo este rescope; cualquier criterio que implique rollout UI/runtime real se mueve a TASK-1096, TASK-1101 o child task.
- [ ] `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md` exists and defines the multi-surface conversational architecture.
- [ ] `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md` exists as the dedicated ADR and is linked from `docs/architecture/DECISIONS_INDEX.md` when accepted.
- [ ] The ADR explicitly rejects domain-local chat forks and Knowledge-only coupling, and defines the runtime contract for `surfaceContext`, answer-turn, provenance/trust cues and access boundaries.
- [ ] The architecture maps AI experience moments: Nexa Chat as direct shell consumer, Nexa Insights as conversationally promotable advisory surface, Knowledge as reference embedded consumer, charts/domain summaries as contextual consumers and MCP as technical lane.
- [ ] The architecture pre-implementation checklist is resolved or explicitly deferred: first child pilot, `surfaceContext` home, answer-turn naming, AI moments registry, trust cue copy, sensitivity tiers, observability, autonomy boundary, context persistence, Nexa Insights promotion and GVC specimens.
- [ ] TASK-1095 scope remains platform + Knowledge as first real low-risk consumer + non-Knowledge fixtures/specimens; first real non-Knowledge rollout is documented as child follow-up, defaulting to finance/chart insight explanation.
- [ ] A canonical conversational state contract exists and is consumed or referenced by the relevant Nexa/Knowledge/domain surfaces.
- [ ] A multi-surface `surfaceContext` / consumer adapter contract exists and can represent Nexa Chat, Nexa Insight promotion, Knowledge, finance/chart insight and at least one operational domain without Knowledge-specific fields.
- [ ] Surface context carries safe refs, capabilities, data reality, sensitivity and provenance refs; it does not serialize raw private records or infer authorization from UI route/role.
- [ ] Idle clean is enforced by tests or GVC: no answer/proof/trace before submit.
- [ ] The repo has one answer-turn implementation path; no parallel `NexaAnswerTurn`/`NexaKnowledgeAnswerSurface` duplication exists.
- [ ] Provenance substrate remains backward-compatible with current `knowledge-search.v1` packets and degrades honestly for unsupported/missing evidence.
- [ ] Default answer turn shows answer-first conversation plus compact trust cue; it does not render expanded proof/evidence as the main body unless the user or surface explicitly requests it.
- [ ] Expanded proof remains available on demand through the approved disclosure/sidecar/MCP placement.
- [ ] Trust cue taxonomy exists in the view-model/copy layer and avoids raw one-size-fits-all confidence scores.
- [ ] Retrieval confidence, answer confidence, source freshness and policy/runtime restrictions remain separate concepts in code or documented adapter semantics.
- [ ] Follow-up turns preserve conversation/provenance continuity without reprinting expanded proof by default.
- [ ] Answer turns include a clear next-step/action/follow-up affordance when applicable, and keep the composer reachable.
- [ ] `/knowledge` uses the V2 contract for the Nexa lens and keeps Humano/MCP as distinct lenses.
- [ ] `/knowledge/mockup/answer-trace` remains available as baseline/lab.
- [ ] `PATTERNS.md`, `PRIMITIVES.md` and `HISTORIAL.md` describe the same idle, trust cue and proof disclosure behavior implemented in runtime.
- [ ] GVC evidence covers `design-system-nexa-chat`, `knowledge-answer-trace` and `knowledge-lenses` desktop/mobile, including collapsed/expanded proof states and non-Knowledge consumer specimens when added.

## Verification

- Confirm architecture artifacts:
  - `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`
  - `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`
  - `docs/architecture/DECISIONS_INDEX.md`
- `pnpm exec eslint src/lib/nexa/conversational-evidence.ts src/lib/nexa/use-nexa-runtime.ts src/views/greenhouse/home/components/NexaToolRenderers.tsx src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx src/components/greenhouse/primitives/NexaEvidencePanel.tsx src/components/greenhouse/primitives/NexaComposer.tsx src/views/greenhouse/knowledge/KnowledgeCenterView.tsx src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `pnpm vitest run src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/nexa/use-nexa-runtime.test.ts src/components/greenhouse/primitives/__tests__/NexaKnowledgeAnswerSurface.test.tsx src/components/greenhouse/primitives/__tests__/NexaComposer.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture design-system-nexa-chat --env=local`
- `pnpm fe:capture knowledge-answer-trace --env=local`
- `pnpm fe:capture knowledge-lenses --env=local`
- Inspect GVC frames for both collapsed trust cue and expanded proof states; add a repeatable scenario or interaction step if the flow is no longer covered by existing scenarios.
- Verify the multi-surface fixtures/specimens for Knowledge, finance/chart and one operational domain render without hardcoded document/citation assumptions.
- Verify Nexa Insight promotion fixtures/specimens preserve signal/enrichment refs without converting the Insights UI itself into a chat thread.
- `pnpm task:lint --task TASK-1095`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- Move this file to `docs/tasks/complete/` and change `Lifecycle` to `complete`.
- Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- Ensure `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`, `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`, `DECISIONS_INDEX.md`, `ui-platform/PATTERNS.md`, `PRIMITIVES.md` and `HISTORIAL.md` are synchronized.
- Update `Handoff.md`, `project_context.md` and `changelog.md` with the final conversational contract.
- Invoke `greenhouse-documentation-governor` and run `pnpm docs:closure-check`.
- Leave explicit notes for deferred sidecar, streaming, production retrieval rollout and first non-Knowledge consumer follow-ups.
