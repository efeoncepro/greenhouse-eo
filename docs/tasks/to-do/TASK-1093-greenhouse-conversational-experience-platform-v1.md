# TASK-1093 — Greenhouse Conversational Experience Platform V1

## Delta 2026-06-12 — CORTE DE SCOPE: V1 = consolidación de gaps reales; plataforma multi-surface diferida

Decisión del operador: 1093 se **adelgaza**. Principio arquitectónico "no construir la abstracción antes del 2do consumidor real": los consumidores que justifican la plataforma completa (1084 HKC, 1079 sidecar) son **to-do**. Pero **sí hay gaps reales hoy** que valen la consolidación ahora. → Effort baja de **Alto a Medio**.

**V1 (esta task, hacer ahora) — solo lo que arregla gaps reales:**
- **Evidence view-model** (`ConversationalEvidencePacket`, Slice 1): unifica las DOS renderizaciones de evidencia de Knowledge que YA pueden divergir hoy — la card del chat (`NexaToolRenderers` para `search_knowledge`) vs la answer surface (`NexaKnowledgeAnswerSurface`, 1089). **Ese es el 2do consumidor REAL que ya existe** → la consolidación NO es adelantada.
- **Generalizar el answer-turn** (Slice 2) SOLO lo necesario para que esas dos superficies compartan el render de evidencia (`NexaKnowledgeAnswerSurface` consume el view-model). NO crear los variants especulativos de placement todavía.
- **Unificar el evidence panel** (Slice 3) entre chat y answer surface (las dos que existen).
- **Persistencia/rehidratación de evidencia** (Slice 4): el historial conserva sus cards o degrada honesto. **Es un bug actual** (hoy al reabrir un thread solo vuelve el texto).
- **Design system/GVC** (Slice 6) acotado a las superficies que existen (chat + answer surface), no a las futuras.

**Diferido a follow-up (gatillado por 1084/1079, NO en esta task):**
- La **shell unificada** + variants de placement (`floatingChat`/`embeddedChat`/`sidecarLane`) montando `AdaptiveSidecarLayout variant='assistant'`.
- **Adopción multi-surface** (Slice 5 original): el variant `aiOverviewPanel` para 1084 + el montaje sidecar para 1079 — se extraen **CUANDO esas tasks aterricen**, driven by reuse real, no por apuesta.

Razón: hacer la consolidación que tiene 2 consumidores reales hoy (chat-card vs answer-surface + historial), y dejar que el resto lo gatille el reuse real. Evita plataforma adelantada, reduce blast-radius y baja el effort. (Las correcciones de primitives del Delta de abajo siguen vigentes para el V1: generalizar `NexaKnowledgeAnswerSurface`, no paralelizar; montar en Adaptive Sidecar cuando llegue el sidecar.)

## Delta 2026-06-12 — Review 3-skill (arch-architect + product-ui-architect + modern-ui)

La task es **sólida**: el contrato UX (burbuja → respuesta con avatar → composer desciende, thinking beat, evidencia como panel/disclosure) está al **bar 2026** (Linear/ChatGPT/Claude/Notion AI convergen ahí); evidence-as-view-model (no primitive) es la decisión correcta; adopción gradual + slices committables + rollback per slice. Cinco ajustes, verificados contra las primitives reales del repo:

**Ajuste 1 (BIGGEST, product-ui-architect) — reconciliar la "conversational shell" con el `AdaptiveSidecarLayout` existente, NO crear `NexaConversationShell` paralelo por default.** Greenhouse YA tiene la primitive `AdaptiveSidecarLayout` con variants oficiales **`assistant`** (canónico para AI helpers en desktop) y **`evidence`** (canónico para paneles de provenance/evidencia). Hard rule de la doctrina: AI helpers → Adaptive Sidecar en desktop, Drawer en mobile; **NO paralelizar shells**. → El placement **sidecar/lane** (TASK-1079) DEBE montar `AdaptiveSidecarLayout variant='assistant'`; el **panel de evidencia** debería ser `variant='evidence'` (o el evidence view-model renderizado adentro). El placement **floating** ya es `NexaFloatingPanel`; el **home/embedded** es el contenedor de `NexaThread`. Una shell primitive NUEVA solo se justifica si NINGUNA de esas tres calza — y eso requiere **justificación explícita reportada antes de codear**, no un default. Agregar este primitive-lookup gate a Slice 2/5.

**Ajuste 2 (product-ui-architect + arch) — el "shared answer turn primitive" = GENERALIZAR `NexaKnowledgeAnswerSurface`, NUNCA un `NexaAnswerTurn` paralelo.** El primitive existente `NexaKnowledgeAnswerSurface` (variants `conversationTrace`/`overviewPanel`, kind `knowledgeAnswerTrace`) **YA ES** el answer-turn — solo está nombrado "Knowledge-specific". Como Slice 1 generaliza la evidencia más allá de Knowledge (tools operacionales también), el answer-turn debe consumir el evidence view-model general → eso es una **generalización/rename del primitive existente** (ej. → `NexaAnswerTurn` con el caso Knowledge como kind), NO un segundo componente al lado. Hard rule: "no crear Foo/Foo2 cuando un primitive + variants cubre la familia". Deliverable = **UN** answer-turn primitive, no dos.

**Ajuste 3 (product-ui-architect) — separar la taxonomía variant/kind entre los TRES primitives; Slice 2 los mezcla.** Placement (`floatingChat`/`embeddedChat`/`sidecarLane`) = de la **SHELL**; presentación de respuesta (`knowledgeAnswerTrace`/`aiOverviewPanel`/`toolResult`) = del **ANSWER-TURN**; modos de composer (`inlineFollowUp`) = del **COMPOSER**. El ejemplo `<NexaConversationShell kind='floatingChat'><NexaAnswerTurn kind='knowledgeAnswerTrace'/><NexaComposer kind='inlineFollowUp'/></NexaConversationShell>` ya lo hace bien — pero la lista de Slice 2 ("embeddedChat, floatingChat, knowledgeAnswerTrace, aiOverviewPanel, sidecarLane" como un set) los lumpea. Asignar cada variant a su primitive dueño.

**Ajuste 4 (arch, sequencing) — hard rule cross-task.** 1093 corre **después de que 1085 + 1089 cierren** (ya está blocked-by, correcto) **y NO concurrente con 1092** (ambas tocan `NexaThread`/`NexaToolRenderers`/runtime → WT churn, la lección de esta sesión). Agregarlo a la slice-ordering rule.

**Ajuste 5 (modern-ui) — streaming / perceived-performance como Open Question explícita.** El bar 2026 conversacional **streamea** la respuesta progresivamente (token-by-token), no la renderiza en bloque tras el thinking beat. La task usa thinking beat pero está **muda sobre streaming**. → Decisión explícita: ¿V1 streamea o renderiza en bloque? Si `useNexaPersistentRuntime` no streamea hoy, es límite aceptable de V1 **pero se nombra como follow-up** (es el bar moderno, lift grande).

**4 pillars.** Safety: evidencia persistida sanitizada/versionada (sin corpus ni prompts internos), reusar packets ya filtrados. Robustness: rehidratación con fallback honesto a texto ("fuentes no disponibles en este historial"). Resilience: la adopción en surfaces vivas (Slice 5) va detrás del flag `NEXA_CONVERSATIONAL_EXPERIENCE_V1_ENABLED` (hacerlo NO opcional para surfaces vivas → un regression es flag-flip, no revert). Scalability: un view-model + N adapters escala a futuras tool-evidences + lanes.

**Decisión rechazada:** crear shell + answer-turn nuevos desde cero (paralelos). Razón: viola el Primitive+Variants+Kinds (Adaptive Sidecar `assistant`/`evidence` + `NexaKnowledgeAnswerSurface` ya existen). El path correcto es extender/generalizar/reusar.

## Inventario de primitives conversacionales + decisión "¿hacen falta primitives nuevas?"

Verificado contra `src/components/greenhouse/primitives/index.ts` + los controllers reales:

| Primitive / surface | Rol conversacional | Estado | Acción 1093 |
|---|---|---|---|
| `NexaComposer` (variants `chat`/`command`; kinds `floatingChat`/`knowledgeAsk`/`globalCommand`) | input / composer | **existe** | **extender** con kind `inlineFollowUp` (no nueva) |
| `NexaKnowledgeAnswerSurface` (variants `conversationTrace`/`overviewPanel`; kind `knowledgeAnswerTrace`) | answer-turn (presentación de respuesta + evidencia) | **existe** (TASK-1089) | **generalizar/renombrar → `NexaAnswerTurn`** + variant `toolResult` que consuma el evidence view-model general (no nueva, evolución) |
| `NexaSenderMark` · `NexaPresenceMark` · `NexaFace` · `GreenhouseNexaBrandMark` · `GreenhouseNexaAnimatedMark` · `NexaGlowBorder` | presencia / marca Nexa en el turno | **existen** | **reusar** (avatar/presencia viven en el turno, no como decoración previa) |
| `GreenhouseThinkingBeat` | estado "pensando" | **existe** | **reusar** (un solo beat, sin skeletons estáticos) |
| `AdaptiveSidecarLayout` (variants oficiales incl. **`assistant`** + **`evidence`**) | shell desktop de AI helper + panel de evidencia/provenance | **existe** | **montar** el placement sidecar/lane (TASK-1079) en `assistant` + el evidence panel en `evidence`. NO crear shell paralela |
| `NexaFloatingPanel` (view) · `NexaThread` (view) | placements floating / home-embedded | **existen** (views, no primitives) | **reusar** como placements |

**Decisión: ¿hacen falta primitives NUEVAS? → Esencialmente NO.** La familia conversacional está ~completa. 1093 es **evolución + reconciliación**, no nacimiento de primitives:

1. **`NexaEvidencePanel` — ÚNICO candidato condicional a primitive nueva.** Es el renderer de evidencia (citas inline/side, fuentes, freshness, confidence, denied count, feedback) alimentado por el `ConversationalEvidencePacket` (view-model de Slice 1). **Default: vive como sub-componente del answer-turn** (no va al registry). Se **promueve a primitive standalone SOLO si ≥2 consumers la necesitan independientemente** — concretamente si el `AdaptiveSidecarLayout variant='evidence'` la renderiza fuera del answer-turn (overview/sidecar) además del chat. Esa es una **decisión de discovery con evidencia de ≥2 consumers**, no foregone. Si nace, sigue el protocolo Primitive+Variants+Kinds completo (barrel + resolver kind→variant + a11y/reduced-motion horneados + Lab `/admin/design-system/<nombre>` + GVC desktop+mobile + nodo AXIS + contrato en `ui-platform/PRIMITIVES.md`).
2. **`aiOverviewPanel` NO es primitive nueva** — es `NexaKnowledgeAnswerSurface variant='overviewPanel'` (ya existe). Extender, no parir.
3. **`NexaConversationShell` (del ejemplo) NO debería ser primitive nueva por default** — es composición/router sobre `AdaptiveSidecarLayout variant='assistant'` (sidecar) + `NexaFloatingPanel` (floating) + el contenedor de `NexaThread` (home). Solo si una shell unificada genuinamente no calza en ninguna de las tres → justificar explícitamente antes de codear (no default).
4. **El evidence view-model (`ConversationalEvidencePacket`) NO es primitive** — es contrato/data layer en `src/lib/nexa/` con adapters desde `knowledge-search.v1` y `NexaToolResult`. Reusa la versión del contrato existente; no inventar shape de persistencia nuevo.

Regla corta: **el deliverable de primitives de 1093 es 1 generalización (`NexaAnswerTurn`) + 1 kind de composer (`inlineFollowUp`) + montar en Adaptive Sidecar — y como mucho 1 primitive nueva condicional (`NexaEvidencePanel`) si discovery prueba ≥2 consumers.** Todo lo demás es reuse.

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
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño validado por sinergia Nexa Chat + AnswerSurface; falta plataforma reusable`
- Rank: `TBD`
- Domain: `ui|platform|nexa|ai|content`
- Blocked by: `TASK-1085`, `TASK-1089`
- Branch: `task/TASK-1093-greenhouse-conversational-experience-platform-v1`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir la experiencia conversacional de Nexa en una capacidad transversal de Greenhouse. Hoy `NexaThread` tiene el runtime vivo, historial, composer, thinking beat y tools; `NexaKnowledgeAnswerSurface` tiene la composición premium de respuesta trazable, pero ambas capas pueden divergir. Esta task crea el contrato compartido para answer turns, evidence packets, rehidratación de tool evidence y variants/kinds por surface.

## Why This Task Exists

La experiencia conversacional está creciendo en tres direcciones al mismo tiempo: chat flotante/home, Knowledge Answer Surface y paneles tipo AI Overview. Si cada surface decide por separado cómo mostrar avatar, burbuja, respuesta, citas, fuentes, feedback y follow-up, Greenhouse terminará con múltiples "Nexa" visuales y múltiples contratos de evidencia. La capacidad debe nacer como plataforma: runtime primero, evidence view-model común, primitives reusables y adopción por kinds.

## Goal

- Unificar Nexa Chat y AnswerSurface bajo un contrato común de turnos conversacionales y evidencia.
- Hacer que las respuestas con tools/citas puedan persistirse, rehidratarse y renderizarse igual en chat, panel embebido y overview.
- Promover variants/kinds oficiales para experiencias `embeddedChat`, `floatingPanel`, `knowledgeAnswerTrace`, `aiOverviewPanel` e `inlineFollowUp`.
- Mantener la coreografía fluida: la transición de pregunta a respuesta trazable no debe sentirse como ir a otra página.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`

Reglas obligatorias:

- No crear otro chat paralelo. `NexaThread`, `useNexaPersistentRuntime`, `NexaComposer`, `NexaToolRenderers` y `NexaKnowledgeAnswerSurface` son la base a converger.
- La UI no consulta tablas ni reimplementa retrieval. Las respuestas con Knowledge consumen packets reales `knowledge-search.v1` producidos por `search_knowledge`.
- El avatar/presencia de Nexa debe vivir en el turno de respuesta, no como decoración previa que rompa la semántica de chat.
- Las cards de trace/evidence no deben duplicar el lenguaje visual entre chat y AnswerSurface; deben salir de un view-model común.
- Respetar `prefers-reduced-motion`, a11y, keyboard flow, scroll containment y GVC para desktop/mobile.
- Copy visible reutilizable debe vivir en `src/lib/copy/*`; evitar strings nuevos hardcodeados en JSX.

## Normative Docs

- `docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md`
- `docs/tasks/in-progress/TASK-1089-nexa-knowledge-answer-surface.md`
- `docs/tasks/to-do/TASK-1092-nexa-knowledge-production-readiness-inline-citations.md`
- `docs/tasks/to-do/TASK-1078-nexa-floating-chat-expandable-persisted.md`
- `docs/tasks/to-do/TASK-1079-nexa-interaction-mode-sidecar-c-and-preference.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-1085` — real tool rendering, `search_knowledge` evidence packets and reliability signals.
- `TASK-1089` — first AnswerSurface primitive/kind and design target.
- `NexaComposer` primitive and `kind='knowledgeAsk'` already available in `src/components/greenhouse/primitives/NexaComposer.tsx`.
- `useNexaPersistentRuntime` already available in `src/lib/nexa/use-nexa-runtime.ts`.

### Blocks / Impacts

- `TASK-1078` floating chat polish should consume the shared conversational capability instead of forking shell behavior.
- `TASK-1079` sidecar/lane mode should mount the same runtime + answer turn primitives.
- `TASK-1084` Human Knowledge Center can reuse `aiOverviewPanel` and `knowledgeAnswerTrace` instead of creating a local answer renderer.
- Future app/MCP/agent lanes can reuse the same evidence contract for explainability.

### Files owned

- `src/lib/nexa/use-nexa-runtime.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx`
- `src/components/greenhouse/primitives/NexaComposer.tsx`
- `src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx`
- `src/components/greenhouse/primitives/nexa-composer-controller.ts`
- `src/components/greenhouse/primitives/nexa-knowledge-answer-surface-controller.ts`
- `src/lib/copy/nexa.ts`
- `src/lib/copy/knowledge.ts`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- `NexaThread` renders assistant-ui messages, user bubbles, assistant sender mark, thinking beat, copy/retry/feedback actions and sticky composer.
- `NexaToolRenderers` registers tool UIs for operational tools and `search_knowledge`; Knowledge already renders trace steps, sources and feedback from `knowledge-search.v1`.
- `NexaKnowledgeAnswerSurface` implements the chosen answer-trace choreography: question bubble, Nexa response, follow-up composer and proof panel.
- `NexaComposer` is already a primitive with variants/kinds, including `knowledgeAsk`.
- `NexaFloatingPanel` uses `useNexaPersistentRuntime`, history rail, contextual prompts and thread rehydration.

### Gap

- `NexaKnowledgeAnswerSurface` is props-only and does not consume the live assistant-ui runtime/evidence packet directly.
- `NexaThread` and `NexaKnowledgeAnswerSurface` have separate answer/evidence layouts, so citations and trace can drift visually.
- `mapThreadMessagesToInitial` rehydrates only text; historical tool invocations/evidence cards do not render when a thread is reopened.
- Evidence/citation UI is Knowledge-specific instead of a reusable `EvidencePacketViewModel` that could cover Knowledge, operational tools and future AI Overview panels.
- Some visible copy and aria labels still live close to components and should move into canonical copy modules as the capability stabilizes.

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

### Slice 1 — Conversational evidence contract

- Crear un contrato/view-model común para evidencia conversacional, por ejemplo `ConversationalEvidencePacket` o `NexaEvidencePacketViewModel`, con adapters desde `knowledge-search.v1` y desde `NexaToolResult`.
- Separar estado de respuesta (`thinking`, `grounded`, `no_source`, `tool_result`, `error`) de su presentación visual.
- Asegurar que el contrato preserve `citationLabel`, freshness, confidence, denied/filtered count, source URL, owner/fuente y feedback target cuando existan.

### Slice 2 — Shared answer turn primitive

> **Corrección (Delta review):** NO crear `NexaAnswerTurn` paralelo — **generalizar/renombrar el `NexaKnowledgeAnswerSurface` existente**. Y la lista de variants de abajo mezcla TRES primitives: separar por dueño (ver "Inventario de primitives" arriba).

- **Generalizar** el answer-turn (hoy `NexaKnowledgeAnswerSurface`) para que su slot de evidencia consuma el `ConversationalEvidencePacket` general (Knowledge **y** tool-result), no solo `knowledge-search.v1`. Incluye sender mark, nombre, thinking beat, prose, actions y slot de evidencia. Es UN primitive, no dos.
- Variants/kinds **por primitive dueño** (no un set único):
  - **Answer-turn** (este primitive): `conversationTrace` (existe), `overviewPanel`/`aiOverviewPanel` (existe), + `toolResult` (nuevo, evidencia de tool operacional).
  - **Shell** (placement, NO este primitive): `floatingChat` → `NexaFloatingPanel`; `embeddedChat` → contenedor de `NexaThread`; `sidecarLane` → `AdaptiveSidecarLayout variant='assistant'`. NO inventar shell paralela (ver Ajuste 1).
  - **Composer** (NO este primitive): `inlineFollowUp` → kind nuevo de `NexaComposer`.
- Eliminar duplicación semántica como títulos "Respuesta verificable" o mode pills cuando Nexa responde en formato chat; esos labels viven en proof panel o metadata discreta.

### Slice 3 — Evidence panel unification

- Reusar el mismo renderer de evidencia en chat y AnswerSurface. `NexaKnowledgeToolTraceCard` debe poder alimentar el proof panel sin crear una segunda card contradictoria.
- Crear affordances de cita inline/side citation que funcionen tanto en respuesta conversacional como en panel overview.
- Integrar feedback de Knowledge con el mismo patrón visual de feedback del turno, manteniendo endpoints correctos (`/api/platform/app/knowledge/feedback` para feedback de fuente).

### Slice 4 — Runtime persistence and rehydration

- Extender la rehidratación de threads para conservar tool invocations/evidence seguros, no solo texto.
- Revisar `NexaThreadMessage`, API de threads y adapter `createNexaChatAdapter` para que los historical turns puedan renderizar evidence cards sin re-ejecutar tools.
- Sanitizar y versionar el payload persistido para evitar acoplar la UI a shapes accidentales del provider.

### Slice 5 — Surface adoption (V1 acotado: solo las 2 superficies que existen)

> **Corte de scope (Delta arriba):** V1 adopta SOLO las superficies vivas hoy. La adopción multi-surface especulativa (placement shell, overview, sidecar) se difiere a follow-up gatillado por 1084/1079.

- **V1:** adaptar `NexaKnowledgeAnswerSurface` para aceptar live evidence packets/view-models además de props/mock data, y que la card de Knowledge del chat (`NexaToolRenderers`) consuma el mismo view-model. Sin cambiar la experiencia base cuando el usuario no ha preguntado.
- **DIFERIDO (follow-up, NO en esta task):** el variant `aiOverviewPanel` para `TASK-1084`, el montaje sidecar (`AdaptiveSidecarLayout variant='assistant'`) para `TASK-1079`, y la shell unificada de placements. Se extraen cuando esas tasks aterricen, driven by reuse real.

### Slice 6 — Design system, motion and GVC

- Actualizar `/design-system/nexa-chat` con specimens de answer turn, evidence packet, overview panel y follow-up composer.
- Crear/actualizar scenarios GVC para chat home/floating, AnswerSurface y overview compacta, con desktop/mobile.
- Documentar primitive + patterns + manual de uso; incluir reduced-motion, keyboard, scroll and focus notes.

## Out of Scope

- Encender production de `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; eso queda en `TASK-1092`.
- Cambiar provider/model router; eso queda en `TASK-1091`.
- Construir todo el Human Knowledge Center; esta task solo entrega la capability reusable que `TASK-1084` puede consumir.
- Crear nuevos endpoints de retrieval o consultar tablas Knowledge desde UI.
- Rediseñar la marca Nexa completa fuera de los turnos conversacionales.
- **(Corte de scope V1)** La shell unificada de placements + variants `floatingChat`/`embeddedChat`/`sidecarLane`, el montaje en `AdaptiveSidecarLayout variant='assistant'` (1079), y el variant `aiOverviewPanel` (1084). Se difieren a follow-up gatillado por esas tasks (ver Follow-ups).

## Detailed Spec

### Target capability shape

La capacidad debe quedar expresada como primitives/adapters, no como pantallas especiales:

```tsx
<NexaConversationShell kind='floatingChat'>
  <NexaAnswerTurn kind='knowledgeAnswerTrace' evidence={evidencePacket} />
  <NexaComposer kind='inlineFollowUp' />
</NexaConversationShell>
```

El nombre final de los componentes puede variar según discovery, pero la intención es estable:

- runtime: assistant-ui + `useNexaPersistentRuntime`
- composer: `NexaComposer` existente
- answer turn: sender/presence + prose/actions + evidence slot
- evidence: view-model común + renderers por variant
- shell: floating/home/sidecar/overview placement, sin duplicar runtime

### UX contract

- Antes de preguntar: mantener la experiencia actual de empty state, prompts, greeting y composer.
- Al preguntar: la pregunta queda como burbuja arriba; Nexa aparece como respuesta después de la burbuja, con avatar/presencia alineado al turno.
- Mientras piensa: usar `GreenhouseThinkingBeat` compartido, sin múltiples beats simultáneos ni skeletons estáticos.
- Después de responder: el composer baja debajo de la respuesta, manteniendo continuidad visual y scroll natural.
- Evidence/trace debe aparecer como panel o disclosure contextual, no como cards grandes que corten la conversación cuando la intención principal es chat.
- En overview: no exigir thread completo; mostrar respuesta compacta con citas/fuentes y CTA para continuar conversación.

### Data contract

- La UI trabaja contra un view-model derivado de `NexaToolResult`/`KnowledgeRetrievalPacket`.
- Persistencia histórica debe conservar solo payloads versionados/sanitizados necesarios para renderizar evidencia. No persistir prompts internos ni corpus completo.
- Si falta evidencia histórica o el shape es viejo, degradar a texto + "fuentes no disponibles en este historial" sin romper el thread.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5 -> Slice 6.

No adoptar en múltiples surfaces antes de cerrar el contrato de evidence y answer turn. No migrar persistencia histórica sin fallback para threads existentes.

**Hard rule cross-task (Delta review, anti-WT-churn):** 1093 arranca **después de que TASK-1085 + TASK-1089 estén COMPLETE** (ya blocked-by) **y NO corre concurrente con TASK-1092** — ambas editan `NexaThread`/`NexaToolRenderers`/runtime; dos agentes en paralelo ahí = el WT churn de esta sesión. Secuencia: 1085 → 1089 → 1092 → 1093 (o 1092 y 1093 serializadas, nunca solapadas).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble lenguaje visual de Nexa entre chat y AnswerSurface | UI / product trust | medium | Shared answer turn + evidence view-model antes de adoption | GVC review / product QA |
| Rehidratación rompe threads históricos | Nexa persistence | medium | Versioned payload + fallback text-only | API errors / console errors |
| Evidence sensible se muestra fuera de scope | Knowledge / access | medium | Reusar packets ya filtrados, no consultar tablas en UI, sanitize persisted tool payload | auth/access logs, QA policy cases |
| Motion/scroll afecta usabilidad del chat | UI / accessibility | medium | Reduced-motion, scroll containment, GVC desktop/mobile | GVC findings / manual keyboard QA |
| Task se vuelve mega-refactor | delivery | medium | Slices committables y adoption gradual por consumer | diff size / tests duration |

### Feature flags / cutover

- Preferir adoption gradual por surface/kind. Si el discovery detecta riesgo en runtime live, introducir flag específico `NEXA_CONVERSATIONAL_EXPERIENCE_V1_ENABLED=false` o reusar flags existentes por surface.
- Production behavior de retrieval sigue gobernado por `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; esta task no lo activa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert adapter/view-model additions; no runtime cutover | <10 min | yes |
| Slice 2 | Revert primitive extraction or keep legacy consumers | <15 min | yes |
| Slice 3 | Fallback to existing `NexaKnowledgeToolTraceCard` rendering | <10 min | yes |
| Slice 4 | Disable historical evidence rehydration; keep text-only mapping | <10 min | yes |
| Slice 5 | Flip surface back to existing `NexaThread`/AnswerSurface path or revert adoption commit | <15 min | yes |
| Slice 6 | Remove GVC/lab additions if noisy; no production runtime impact | <5 min | yes |

### Production verification sequence

1. Run focal unit tests for evidence adapters, answer turn, runtime mapping and renderers.
2. Run `pnpm exec tsc --noEmit --pretty false`.
3. Run focal ESLint for touched files and design lint if design docs/tokens change.
4. Run GVC scenarios for `/design-system/nexa-chat`, floating chat and Knowledge AnswerSurface desktop/mobile.
5. Verify existing no-question empty state remains unchanged.
6. Verify asked-question choreography: user bubble -> Nexa avatar/answer -> evidence -> follow-up composer.
7. Verify reopening a thread with historical evidence renders safely or degrades honestly.

### Out-of-band coordination required

N/A — repo-only change. Product review required before replacing active surfaces broadly.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un evidence view-model común usado por Knowledge evidence y listo para otras tool evidences.
- [ ] `NexaThread` y `NexaKnowledgeAnswerSurface` comparten la misma base visual de answer turn/evidence o adapters documentados sin divergencia visual.
- [ ] La experiencia sin pregunta conserva el empty state/composer actual.
- [ ] Al preguntar, la UI mantiene burbuja de usuario, respuesta de Nexa con avatar después de la burbuja y composer de follow-up debajo.
- [ ] Las cards de intento/retrieval/trace no rompen la conversación; viven como panel/disclosure/evidence lane según variant.
- [ ] Threads rehidratados conservan evidence cards o degradan honestamente sin re-ejecutar tools.
- [ ] `/design-system/nexa-chat` documenta los variants/kinds nuevos.
- [ ] GVC desktop/mobile cubre chat, AnswerSurface y overview compacta.

## Verification

- `pnpm task:lint --task TASK-1093`
- `pnpm exec tsc --noEmit --pretty false`
- Focal ESLint sobre archivos tocados
- Focal Vitest/render tests para adapters/renderers/runtime mapping
- `pnpm design:lint`
- `pnpm fe:capture design-system-nexa-chat --env=local`
- `pnpm fe:capture knowledge-answer-trace --env=local`
- GVC de floating/home route según scenario disponible o nuevo scenario creado
- `pnpm docs:closure-check --changed`

## Closing Protocol

- Actualizar `docs/architecture/ui-platform/PRIMITIVES.md`.
- Actualizar `docs/architecture/ui-platform/PATTERNS.md`.
- Actualizar `docs/manual-de-uso/plataforma/knowledge-platform.md` si cambia la experiencia de Knowledge.
- Actualizar `project_context.md`, `Handoff.md` y `changelog.md` al cerrar.
- Mover task a `docs/tasks/in-progress/` al tomarla y a `complete/` solo después de GVC + docs closure.

## Follow-ups

- **Plataforma conversacional multi-surface (diferido del corte de scope V1, gatillado por consumidores reales):** cuando **TASK-1084** (Human Knowledge Center) y/o **TASK-1079** (sidecar/lane) aterricen, extraer — driven by reuse real — la **shell unificada de placements** + variants `floatingChat`/`embeddedChat`/`sidecarLane` montando `AdaptiveSidecarLayout variant='assistant'`, y el variant `aiOverviewPanel`. El evidence view-model + el answer-turn generalizado de este V1 son la base que esos consumidores reusan; la primitive `NexaEvidencePanel` se promueve a standalone solo si ese punto prueba ≥2 consumers (ver "Inventario de primitives" arriba).
- **Streaming / perceived-performance (modern-ui):** evaluar streaming token-by-token de la respuesta de Nexa (el bar 2026) si `useNexaPersistentRuntime` lo soporta; es un lift grande, fuera de este V1.
