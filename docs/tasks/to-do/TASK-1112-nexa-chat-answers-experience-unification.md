# TASK-1112 — Nexa Chat ↔ Answers Experience Unification (cerrar la experiencia conversacional)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|ai|content`
- Blocked by: `TASK-1078 (in-progress, toca NexaThread/NexaFloatingPanel) + TASK-1101 (in-progress, toca NexaChatProvider/streaming) — coordinacion serial, NO concurrente en esos archivos`
- Branch: `task/TASK-1112-nexa-chat-answers-experience-unification`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la **capa de experiencia** conversacional unificando **Nexa Chat** sobre el **mismo answer-turn contract + primitivas** que ya usa **Nexa Answers**, y agregando **streaming real**. Hoy Chat y Answers divergen: Answers tiene grounding/evidencia/citas/trust-chrome; Chat es un thread de markdown plano sin evidence packet, sin streaming, sin citas. Esta task es el **keystone de runtime** que vuelve a Chat el segundo placement del mismo contrato de turno — con Knowledge como unico consumidor de prueba — y de paso entrega el "2º consumidor real" que destraba TASK-1104 (toolbar primitive) y TASK-1105 (streaming-text primitive).

## Why This Task Exists

El operador decidio **cerrar la experiencia conversacional primero y elegir consumidores de dominio despues**. Pero "la experiencia" son dos capas distintas que el repo tenia mezcladas:

1. **Capa de experiencia** (shell + coreografia de estados + streaming + primitivas de turno + contrato de turno): se puede **cerrar ahora**, contra si misma, con Knowledge como unico consumidor de prueba. Lo que la hace "cerrada" es coherencia interna, no generalidad cross-dominio.
2. **Capa de contrato cross-dominio** (`NexaAnswersSurfaceContext` como SSOT universal + adapter protocol por dominio): **no se puede congelar desde un solo dominio**. Eso vive en `TASK-1095` (type `architecture`) y se cierra recien con el 2º consumidor de **dominio** (Finance / Account 360 / ICO).

`TASK-1095` ya es la capa (2) y declara explicito que **no implementa streaming** ("Do not implement token-by-token streaming; document it as a follow-up"). Es decir: el gap mas grande de la capa (1) — streaming — **no tiene dueño**, y el carril de Chat quedo con un contrato pobre.

Reuse assessment verificado en codigo: hoy ~35-40% de la superficie de Answers es reusable en Chat. Las **primitivas** de turno ya son domain/placement-neutral (~65% del valor): `NexaProvenanceTrace` (TASK-1103 complete), `NexaEvidencePanel` (TASK-1093 complete), `NexaResponseToolbar`, `NexaStreamingText`, `NexaExpressiveText`, `NexaConversationBubble`, `NexaAnswersSurfaceContext`. **El bloqueo NO es acoplamiento de UI** — es el **contrato de la ruta de Chat**: `/api/home/nexa` devuelve `{ content: string (markdown plano), suggestions, toolInvocations }` SIN evidence packet, SIN streaming (`Promise` settled, no `AsyncIterable`), SIN citation AST. Cerrar esos tres blockers + cablear las primitivas en `NexaThread` cierra la experiencia.

**Reframe clave (verificado en codigo):** NO se reusa el `NexaAnswersCanvas` en Chat. Son metaforas distintas: Canvas = *una respuesta embebida* (single-answer + historial colapsado); Thread = *mensajes pares multi-turn*. Chat **conserva su shell de thread** y **hereda las primitivas de turno + el contrato de ruta**. El Canvas no se toca.

## Goal

- Streaming real end-to-end en el path de Chat (`/api/home/nexa` → SSE; abort via `NexaChatProvider`; `NexaStreamingText` consume el stream real, no timers).
- La ruta de Chat emite `ConversationalEvidencePacket` (no solo `content`), reutilizando el substrato de TASK-1093 (extendido con path generic/degraded).
- El contenido de Chat viaja como citation AST (`NexaExpressiveTextValue`) en vez de markdown plano, para que las citas inline `[n]` + evidence-peek funcionen en el thread.
- `NexaThread` rinde las primitivas de turno: `NexaProvenanceTrace` (cue compacto) + `NexaEvidencePanel` (proof on-demand) + `NexaResponseToolbar` (¿util?/copiar/compartir/regenerar/detener) + `NexaStreamingText`.
- Chat queda como el **2º consumidor real** de toolbar + streaming-text → desbloquea `TASK-1104` y `TASK-1105`.
- Definicion de "experiencia cerrada" cumplida (ver Acceptance Criteria), probada SOLO con Knowledge; el contrato cross-dominio queda marcado **PROVISIONAL** (no congelado).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`, `PATTERNS.md`, `HISTORIAL.md`
- `DESIGN.md`

Reglas obligatorias:

- **No reusar `NexaAnswersCanvas` como shell de Chat.** Chat mantiene su thread (mensajes pares); el Canvas es el placement embebido single-answer. Lo compartido es el **contrato de ruta + las primitivas de turno**, no el shell. Metaforas distintas, placements distintos.
- **No crear un answer-turn paralelo ni un chat por dominio.** Las primitivas (`NexaProvenanceTrace`, `NexaEvidencePanel`, `NexaResponseToolbar`, `NexaStreamingText`, `NexaExpressiveText`) son la base a consumir, no a forkear.
- **No reescribir el contrato cross-dominio** (`NexaAnswersSurfaceContext` SSOT + adapter protocol). Eso es `TASK-1095`. Esta task lo **consume** con `domain: 'home'` / `placement: 'floating'`; el blessing/congelado del contrato espera al 2º consumidor de **dominio**.
- **No congelar el contrato cross-dominio en esta task.** Marcarlo explicito como PROVISIONAL (Knowledge-shaped v1) en los docs que se toquen. Cerrar la *experiencia* ≠ congelar el *contrato*.
- **Streaming honesto:** `prefers-reduced-motion` y degradacion never-hidden (si el stream falla, el contenido queda legible). No robar foco al composer (`aria-live="polite"`).
- **Degradacion honesta:** si no hay evidence packet (tool sin provenance, error), mostrar copy degradado con causa — nunca `$0`, nunca certeza falsa. Reusar el path generic/degraded del substrato.
- **No consultar tablas desde UI ni reimplementar retrieval.** El packet viaja por la ruta; Knowledge conversa via `knowledge-search.v1` → `nexa-evidence.v1` ya existentes.
- **Copy visible reutilizable** vive en `src/lib/copy/nexa.ts` (TASK-265). No hardcodear labels/aria/empty states.
- **Coordinacion de ownership de archivos:** varios archivos owned aqui figuran tambien en "Files owned" de `TASK-1095`. `TASK-1095` es contrato (types/controllers/tests minimos); esta task es la **implementacion** runtime. No tocar concurrentemente con `TASK-1078`/`TASK-1101` los archivos compartidos (ver Slice ordering hard rule).

## Normative Docs

- `docs/tasks/to-do/TASK-1095-conversational-experience-v2.md` (contrato cross-dominio — consumir, no reescribir)
- `docs/tasks/in-progress/TASK-1101-nexa-answers-runtime-promotion.md` (streaming/abort provider-side para Knowledge Answers — coordinar, no duplicar)
- `docs/tasks/in-progress/TASK-1078-nexa-floating-chat-expandable-persisted.md` (toca NexaThread/NexaFloatingPanel — resolver solape)
- `docs/tasks/to-do/TASK-1110-nexa-composition-runtime-wiring-knowledge-inplace.md` (consumer Knowledge in-place — coordinar)
- `docs/tasks/to-do/TASK-1104-nexa-response-toolbar-primitive.md` (se desbloquea con esta task)
- `docs/tasks/to-do/TASK-1105-nexa-streaming-text-primitive.md` (se desbloquea con esta task)
- `docs/tasks/complete/TASK-1093-greenhouse-conversational-experience-platform-v1.md` (`ConversationalEvidencePacket` + `NexaEvidencePanel`)
- `docs/tasks/complete/TASK-1103-nexa-provenance-trace-primitive.md` (`NexaProvenanceTrace`)
- `docs/tasks/in-progress/TASK-1091` (`NexaChatProvider` + abort)
- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md` (`knowledge-search.v1` + `search_knowledge`)

## Dependencies & Impact

### Depends on

- `TASK-1093` (complete): `ConversationalEvidencePacket` (`src/lib/nexa/conversational-evidence.ts`) + `NexaEvidencePanel`. Substrato a **extender** con path generic/degraded — no reabrir la primitive.
- `TASK-1091` (complete): `NexaChatProvider` abstraction + abort. Reusar la maquinaria provider-side de streaming/abort.
- `TASK-1103` (complete): `NexaProvenanceTrace` primitive (variants inline/expandable/panel).
- `TASK-1085` (complete): `search_knowledge` + `knowledge-search.v1` packet.
- `TASK-1095` (to-do, architecture): contrato `NexaAnswersSurfaceContext`. Consumir como existe; no esperar a que cierre.

### Blocks / Impacts

- **Desbloquea `TASK-1104`** (NexaResponseToolbar → primitive): esta task aporta el 2º consumer real (Chat).
- **Desbloquea `TASK-1105`** (NexaStreamingText → primitive): idem.
- **Coordina serial con `TASK-1078`** (in-progress): ambos tocan `NexaThread`/`NexaFloatingPanel`. NO concurrente.
- **Coordina serial con `TASK-1101`** (in-progress): ambos tocan `NexaChatProvider`/streaming. Reusar maquinaria, no duplicar.
- **Coordina con `TASK-1110`** (composicion Knowledge in-place): mismo substrato de evidencia.
- Informa a `TASK-1096` (experiencia cross-domain) y al futuro 2º consumidor de dominio: una vez cerrada la experiencia, comparar el render del turno en Chat (placement floating) vs Answers (placement embedded) da el insumo concreto para `TASK-1095` (extraer lo comun → contrato cross-dominio).

### Files owned

- `src/app/api/home/nexa/route.ts` [verificar — compartido con TASK-1095 ownership]
- `src/lib/nexa/use-nexa-runtime.ts` [compartido con TASK-1095 ownership — coordinar]
- `src/lib/nexa/nexa-contract.ts` [compartido con TASK-1095 ownership — coordinar]
- `src/lib/nexa/conversational-evidence.ts` [compartido con TASK-1095 ownership — extender, no reabrir contrato]
- `src/views/greenhouse/home/components/NexaThread.tsx` [compartido con TASK-1078/TASK-1095 — coordinar serial]
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/lib/nexa/flags.ts`
- `src/lib/copy/nexa.ts`
- `src/lib/reliability/queries/[nexa-conversation-experience-signal].ts` [verificar nombre exacto en Discovery]
- `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts` [verificar]
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/HISTORIAL.md`

## Current Repo State

### Already exists

- `NexaAnswersCanvas` + `NexaAnswersRenderPlan` + `NexaAnswersSurfaceContext` (`src/components/greenhouse/primitives/nexa-answers-canvas/`): el answer-turn embebido con coreografia de estados, streaming-text, provenance y trust chrome. Knowledge ya lo consume.
- Primitivas de turno domain/placement-neutral: `NexaProvenanceTrace` (TASK-1103), `NexaEvidencePanel` (TASK-1093), `NexaResponseToolbar` (co-located en canvas, commit `78d30ee40`), `NexaStreamingText` (`StreamingAnswerDraft`, consume `value` o `stream: AsyncIterable<string>`), `NexaExpressiveText` (citation AST), `NexaConversationBubble`.
- `ConversationalEvidencePacket` (`src/lib/nexa/conversational-evidence.ts`): normaliza evidencia Knowledge (`kind='knowledge'`) desde `knowledge-search.v1` para rehidratacion/evals/feedback/MCP/proof.
- `NexaChatProvider` (`src/lib/nexa/nexa-provider.ts` + `providers/`): abstraccion de provider con abort (TASK-1091).
- Nexa Chat hoy: `/api/home/nexa/route.ts`, `use-nexa-runtime.ts` (assistant-ui via `useLocalRuntime`), `NexaThread.tsx` (render markdown + thinking beat + tool renderers + suggestions + composer), `NexaFloatingPanel.tsx`.

### Gap

- `/api/home/nexa` devuelve `{ content: string (markdown plano), suggestions, toolInvocations }`: **sin** `ConversationalEvidencePacket`, **sin** streaming (`Promise<NexaResponse>` settled, no `AsyncIterable`), **sin** citation AST.
- `NexaThread` rinde markdown plano (`MarkdownTextPrimitive` de assistant-ui) + iconos de accion custom (no `NexaResponseToolbar`); no rinde `NexaProvenanceTrace` ni `NexaEvidencePanel` ni `NexaStreamingText`. → Chat no tiene grounding/citas/trust-chrome/streaming que Answers ya tiene.
- `ConversationalEvidencePacket` es Knowledge-only (`kind='knowledge'`): falta el path generic/degraded para que una respuesta de Chat con tools no-knowledge (o sin evidencia) degrade honesta.
- `TASK-1104`/`TASK-1105` (promocion a primitive de toolbar/streaming-text) estan YAGNI-gated esperando un "2º consumer real = Nexa floating chat". Ese 2º consumer es justamente esta task.
- No existe señal de reliability de salud de la *experiencia* conversacional (ej. `nexa.conversation.surface_context_invalid`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE  (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Reconciliacion + decision de topologia (doc + flags, sin runtime visible)

- Producir doc de reconciliacion (en `ui-platform/CONVERSATIONAL_EXPERIENCE.md` o delta) mapeando "cerrar la experiencia" contra la topologia real: `TASK-1095` (contrato) / `TASK-1101` (Knowledge Answers runtime + streaming provider-side) / `TASK-1110` (composicion Knowledge) / `TASK-1078` (floating chat) / `TASK-1104`-`1105` (primitivas). Declarar esta task como **keystone**: Chat adopta answer-turn contract + primitivas + streaming.
- **Resolver el solape con `TASK-1078`** (decision documentada): absorber su parte de `NexaThread` o correr serial. NO concurrente.
- Declarar el contrato cross-dominio como **PROVISIONAL** (Knowledge-shaped) en los docs tocados.
- Crear los flags en `src/lib/nexa/flags.ts` (default OFF): `NEXA_CHAT_STREAMING_ENABLED`, `NEXA_CHAT_ANSWER_TURN_ENABLED` (cue/evidence/toolbar/citation AST). Sin runtime visible aun.

### Slice 1 — Streaming en el path de Chat

- `/api/home/nexa` emite SSE (stream de chunks) detras de `NEXA_CHAT_STREAMING_ENABLED`. Fallback al `Promise` settled actual cuando el flag esta OFF (parity bit-for-bit).
- `use-nexa-runtime.ts`: el adapter consume el stream real; abort real via `NexaChatProvider` (TASK-1091). **Coordinar provider-side con `TASK-1101`** (reusar su maquinaria de streaming/abort, no duplicar).
- `NexaThread` rinde `NexaStreamingText` en modo `stream` (never-hidden + reduced-motion + abort-safe) para el mensaje del assistant.

### Slice 2 — La ruta emite `ConversationalEvidencePacket` + cue/proof en el thread

- Extender `conversational-evidence.ts` con path **generic/degraded** (sin reabrir el contrato Knowledge ni romper `knowledgePacketToConversationalEvidence()`): un tool result no-knowledge o sin provenance produce un packet degradado honesto.
- `/api/home/nexa` adjunta el `ConversationalEvidencePacket` a la respuesta (adapter desde tool results / knowledge).
- `NexaThread` rinde `NexaProvenanceTrace` (cue compacto Layer 1) + `NexaEvidencePanel` (proof on-demand Layer 2). El proof NO es el body por defecto.

### Slice 3 — Contenido como citation AST

- El contenido de la respuesta viaja como `NexaExpressiveTextValue` (AST con nodos de cita) en vez de markdown plano cuando hay packet con citas.
- `NexaThread` rinde `NexaExpressiveText` con citas inline `[n]` + evidence-peek. Fallback a markdown plano cuando no hay AST (degradacion honesta).

### Slice 4 — `NexaResponseToolbar` en el thread (2º consumer → desbloquea TASK-1104/1105)

- Cablear `NexaResponseToolbar` (¿util?→feedback `POST /api/home/nexa/feedback`; copiar self-contained; compartir; regenerar→re-run; detener→abort) en el mensaje del assistant de `NexaThread`, preservando el contrato `onResponseControl`.
- Registrar en `TASK-1104` y `TASK-1105` que Chat es ahora el 2º consumer real (sin ejecutar esas tasks aqui — solo desbloquearlas).

### Slice 5 — GVC + cierre de la experiencia + señal reliability + a11y

- GVC (`pnpm fe:capture`) del chat en los estados de la coreografia (idle limpio → submitted/burbuja pregunta → thinking → streaming → answered con cue → proofOpen → followup) desktop + mobile, mirado en loop hasta enterprise.
- Multi-turn dentro del host (no solo Home): floating panel preserva contexto entre turnos sin reimprimir el proof.
- ≥1 señal de reliability de la experiencia (ej. `nexa.conversation.surface_context_invalid`, steady=0) + reader en `src/lib/reliability/queries/`.
- Contrato a11y: `aria-live="polite"` sin robar foco al composer; `aria-busy` en thinking/streaming; proof on-demand en top-layer.
- Verificar la **definicion de terminado** completa (Acceptance Criteria) probada SOLO con Knowledge.

## Out of Scope

- **No reescribir `NexaAnswersCanvas`** ni migrar Chat a el. Chat conserva su thread; el Canvas es el placement embebido.
- **No congelar/bendecir el contrato cross-dominio** (`NexaAnswersSurfaceContext` SSOT universal + adapter protocol). Eso es `TASK-1095` y espera al 2º consumidor de **dominio**.
- **No ejecutar el rollout real de un dominio no-Knowledge** (Finance/Account 360/ICO). Esta task cierra la experiencia con Knowledge como unico consumidor de prueba.
- **No ejecutar la promocion a primitive** de toolbar (`TASK-1104`) ni streaming-text (`TASK-1105`). Solo desbloquearlas.
- **No reabrir** la primitive `NexaEvidencePanel` ni romper `knowledgePacketToConversationalEvidence()` (TASK-1093). Solo extender el union con path generic/degraded.
- **No activar** `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` en produccion (eso es `TASK-1092`).
- **No rediseñar** el history rail ni el shell del floating panel mas alla de lo necesario para multi-turn.

## Detailed Spec

### Las dos capas (por que esta task cierra la (1) y no la (2))

| Capa | Que es | Se cierra cuando | Dueño |
|---|---|---|---|
| (1) Experiencia | shell + coreografia + streaming + primitivas + contrato de **turno** | coherencia interna, probada con Knowledge | **esta task (TASK-1112)** |
| (2) Contrato cross-dominio | `surfaceContext` SSOT universal + adapter protocol por **dominio** | ≥2 consumidores de **dominio** lo estresan | `TASK-1095` |

La trampa a evitar: "cerrar la experiencia" ≠ "congelar el contrato universal". Si esta task declara `NexaAnswersSurfaceContext` como SSOT domain-neutral final, se diseña la abstraccion desde un solo dominio y el 2º consumidor la rompe. Marcar PROVISIONAL.

### Modelo mental de reuso (3 capas)

- **Capa A — contrato de ruta** (`ConversationalEvidencePacket` + streaming + citation AST): hoy vive solo en el carril Knowledge/Answers. Es el bloqueo real. → Slices 1-3.
- **Capa B — primitivas de turno** (provenance, toolbar, streaming-text, expressive-text, evidence-panel): ya compartidas (~65%). → Slices 1-4 (cablear en `NexaThread`).
- **Capa C — shell/placement** (Canvas embebido / Thread flotante): per-placement, NO compartido, y esta bien asi. → no se toca el Canvas.

### Contrato de respuesta de `/api/home/nexa` (target)

Pasa de `{ content: string, suggestions, toolInvocations }` a, detras de flag, un stream que ademas materializa:
- `evidencePacket?: ConversationalEvidencePacket` (Layer 0/1/2),
- contenido como `NexaExpressiveTextValue` cuando hay citas,
- abort real propagado al `NexaChatProvider`.

Backward compat: flag OFF → shape y comportamiento actuales bit-for-bit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 0 (flags + reconciliacion) → Slice 1 (streaming) → Slice 2 (evidence packet) → Slice 3 (citation AST) → Slice 4 (toolbar) → Slice 5 (GVC/señal/a11y/cierre).**
- Slice 1 puede shippear independiente de 2/3 (streaming es ortogonal al packet). 2 → 3 (el AST de citas depende de que el packet exista). 4 puede correr despues de 2 (la toolbar no depende del AST). 5 cierra al final.
- **Hard rule de coordinacion (load-bearing):** `TASK-1078` y `TASK-1101` estan **in-progress** y tocan `NexaThread`/`NexaChatProvider`. NINGUN slice de esta task que toque esos archivos puede ejecutarse concurrentemente con ellas. Resolver en Slice 0: o se serializa (esta task espera/absorbe), o se reparte ownership explicito por archivo. Ejecutar fuera de esto = colision de WIP (riesgo de orphan/merge documentado en CLAUDE.md).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Streaming SSE rompe el chat para todos los usuarios | UI / Nexa runtime | medium | flag `NEXA_CHAT_STREAMING_ENABLED` default OFF; fallback `Promise` settled; never-hidden | logs ruta + feedback negativo |
| Colision de WIP con TASK-1078/1101 en NexaThread/Provider | UI / Nexa | high | Slice 0 resuelve serializacion/ownership ANTES de tocar archivos compartidos | `git status` orphan + CI rojo |
| Evidence packet generic rompe `knowledgePacketToConversationalEvidence()` | Nexa / Knowledge | medium | extender union additive; tests anti-regresion del adapter Knowledge | tests TASK-1093 verdes |
| Citation AST degrada mal y oculta contenido | UI | low | fallback a markdown plano cuando no hay AST; never-hidden | GVC + a11y check |
| Proof se vuelve el body por defecto (anti-patron) | UI / producto | medium | regla dura: cue compacto Layer 1 default; proof Layer 2 on-demand | GVC review (proofOpen separado de answered) |
| Abort no propaga y deja stream colgado | Nexa runtime | low | reusar abort de TASK-1091; test de cancelacion | logs |

### Feature flags / cutover

- `NEXA_CHAT_STREAMING_ENABLED` (default `false`): controla SSE en `/api/home/nexa`. OFF = comportamiento actual settled. Flip post-smoke staging. Revert: flag `false` + redeploy, <5 min Vercel.
- `NEXA_CHAT_ANSWER_TURN_ENABLED` (default `false`): controla cue/evidence/toolbar/citation-AST en `NexaThread`. OFF = thread markdown actual. Flip independiente del streaming. Revert: idem.
- Ambos default OFF garantizan cero cambio de comportamiento al merge.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert PR (solo flags + doc) | <5 min | si |
| Slice 1 | `NEXA_CHAT_STREAMING_ENABLED=false` + redeploy | <5 min | si |
| Slice 2 | `NEXA_CHAT_ANSWER_TURN_ENABLED=false` + redeploy | <5 min | si |
| Slice 3 | flag OFF (cae a markdown) o revert del AST | <5 min | si |
| Slice 4 | flag OFF (cae a acciones actuales) | <5 min | si |
| Slice 5 | revert PR (GVC/señal/a11y additive) | <10 min | si |

### Production verification sequence

1. Deploy a staging con ambos flags OFF → verify Chat actual no cambio (parity).
2. `NEXA_CHAT_STREAMING_ENABLED=true` en staging → agent auth + Playwright/GVC: verify streaming token-by-token + abort funciona + reduced-motion ok.
3. `NEXA_CHAT_ANSWER_TURN_ENABLED=true` en staging → verify cue compacto + proof on-demand + citas inline + toolbar (¿util?/copiar/compartir/regenerar/detener) + degradacion honesta sin packet.
4. GVC desktop+mobile en los estados de la coreografia, mirado.
5. Verify señal reliability steady=0.
6. Repetir flips en produccion con cooldown; monitor señal + feedback 7d.

### Out-of-band coordination required

- **Coordinacion humana con los owners de `TASK-1078` y `TASK-1101`** (ambas in-progress) antes de tocar `NexaThread`/`NexaChatProvider`. Es el unico bloqueo real. Resolver en Slice 0.
- Resto: N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con `NEXA_CHAT_STREAMING_ENABLED=true`, Chat hace streaming token/chunk-by-chunk real (no timers), never-hidden, con abort funcional via `NexaChatProvider`.
- [ ] Con ambos flags OFF, el Chat se comporta byte-for-byte como hoy (parity verificada).
- [ ] `/api/home/nexa` puede emitir un `ConversationalEvidencePacket`; un tool sin provenance produce un packet **degradado honesto** (no fake proof, no `$0`).
- [ ] `NexaThread` rinde `NexaProvenanceTrace` (cue compacto) como default y `NexaEvidencePanel` (proof) **solo on-demand** — el proof NUNCA es el body por defecto.
- [ ] El contenido con citas viaja como `NexaExpressiveTextValue` y las citas inline `[n]` + evidence-peek funcionan en el thread; sin AST cae a markdown legible.
- [ ] `NexaResponseToolbar` (¿util?/copiar/compartir/regenerar/detener) esta cableada en el mensaje del assistant del thread.
- [ ] Chat y Answers consumen el **mismo** `ConversationalEvidencePacket` y las **mismas** primitivas de turno, en sus dos placements (Thread flotante / Canvas embebido).
- [ ] Multi-turn dentro del host preserva contexto sin reimprimir el proof en cada turno.
- [ ] Contrato a11y: `aria-live="polite"` sin robar foco al composer; `aria-busy` en thinking/streaming; reduced-motion horneado.
- [ ] ≥1 señal de reliability de la experiencia (ej. `nexa.conversation.surface_context_invalid`, steady=0) con su reader.
- [ ] GVC desktop+mobile de los estados de la coreografia, mirado, nivel enterprise.
- [ ] El contrato cross-dominio queda marcado **PROVISIONAL** (no congelado) en los docs tocados.
- [ ] `TASK-1104` y `TASK-1105` quedan registradas como desbloqueadas (Chat = 2º consumer).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (incluir tests anti-regresion del adapter Knowledge de TASK-1093)
- `pnpm fe:capture` (GVC de los estados, desktop + mobile)
- Smoke con agent auth + Playwright contra staging (streaming + abort + cue + proof + toolbar)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con aprendizajes/deuda/validaciones
- [ ] `changelog.md` actualizado (comportamiento visible del Chat cambia)
- [ ] chequeo de impacto cruzado: actualizar `TASK-1104`, `TASK-1105` (desbloqueadas), `TASK-1095` (insumo para extraer contrato), `TASK-1078`/`TASK-1101` (ownership resuelto)
- [ ] `greenhouse-documentation-governor` invocado al cierre
- [ ] `ui-platform/CONVERSATIONAL_EXPERIENCE.md` + `HISTORIAL.md` reflejan Chat como 2º placement del answer-turn

## Follow-ups

- `TASK-1104` (NexaResponseToolbar → primitive) y `TASK-1105` (NexaStreamingText → primitive): ejecutar ahora que existe 2º consumer.
- Primer consumidor de **dominio** no-Knowledge (Finance/chart o Account 360 o ICO): recien aqui se extrae el contrato cross-dominio y se cierra `TASK-1095`.
- Multi-turn compaction + View Transitions en Chat (paralelo a `TASK-1102` que lo hace para el Canvas).

## Open Questions

- ¿Esta task **absorbe** la parte de `NexaThread` de `TASK-1078` o corre serial despues de su cierre? (Resolver en Slice 0 con el owner.)
- ¿El streaming provider-side de `TASK-1101` queda como dependencia dura (esperar su cierre) o se comparte la maquinaria en paralelo coordinado? (Resolver en Slice 0.)
- ¿La señal reliability canonica es `nexa.conversation.surface_context_invalid` (de TASK-1095 A7) o una propia de la experiencia de Chat? Confirmar para no duplicar.
