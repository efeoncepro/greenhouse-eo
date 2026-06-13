# TASK-1091 — Nexa AI provider abstraction + internal model router ("auto") + Anthropic adapter

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai`
- Blocked by: `TASK-1085` (el tool `search_knowledge` + Answer Rules provider-agnósticos deben estar shipped) · soft-depends `TASK-1019` (cliente `src/lib/ai/anthropic.ts`, ya existe)
- Branch: `task/TASK-1091-nexa-provider-router`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Abstraer el provider LLM de Nexa detrás de una interfaz `NexaChatProvider`, agregar el **adapter Anthropic (Claude) de tool-use conversacional**, y construir un **router de modelo INTERNO ("auto")** que elige el provider adecuado por **intención de la consulta** (grounding/sensible → Claude; navegación/chat rápido → Gemini Flash; etc.), con **failover** entre providers. La selección es **100% interna, NUNCA expuesta al usuario**. Sin tocar el tool `search_knowledge` ni las Answer Rules (TASK-1085). Behind flag, default Gemini, cutover gradual con eval de paridad.

## Why This Task Exists

Decisión del operador (2026-06-12): en vez de un **swap duro Gemini→Claude**, conviene **conservar los providers y enrutar internamente** — es más robusto:

- **Best-fit por intención**: Claude rinde mejor en la **disciplina de grounding** (citar el `citationLabel` exacto, declarar `stale`/`deprecated`, decir "no encontré guía publicada" en `confidence='none'` **sin inventar**) — el núcleo de Knowledge, donde inventar (finance/payroll/legal) es caro. Gemini 2.5 Flash es ideal para navegación/chat trivial (barato/veloz). No se pierden las fortalezas de Gemini.
- **Resiliencia/failover**: si un provider cae o devuelve un error de shape (ISSUE-092 mostró que el function-calling de Gemini es frágil), Nexa reintenta con otro provider.
- **Costo/latencia**: modelo barato para lo trivial, fuerte para lo que importa.

El cambio es **contenido (no re-arquitectura)** porque el tool + reglas se diseñaron provider-agnósticos en TASK-1085 y ya existe `src/lib/ai/anthropic.ts` + el secret `greenhouse-anthropic-api-key`. La abstracción de provider es el **prerequisito de cualquier camino**; el router "auto" vive **encima** de ella.

## Goal

- Extraer una interfaz `NexaChatProvider` (system prompt + declaración de tools + 2-pass tool loop + sugerencias) del `nexa-service.ts` acoplado a Gemini.
- Implementar el **adapter Anthropic** de tool-use conversacional.
- Construir un **router interno** (`NexaModelRouter`) que selecciona el provider por intención de la consulta + **failover**. **Interno, nunca expuesto al usuario.**
- Cutover **gradual behind flag** (default Gemini), con eval de paridad antes de activar "auto".
- **NO tocar** `search_knowledge`, las Answer Rules, ni el contrato `knowledge-search.v1`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` (Delta Retrieval de Nexa, TASK-1085)
- `CLAUDE.md` → sección "AI providers — texto/LLM (Gemini, Anthropic, OpenAI)" + "Nexa Knowledge Retrieval invariants (TASK-1085)"

Reglas obligatorias (de CLAUDE.md):

- El cliente Anthropic canónico vive en `src/lib/ai/anthropic.ts`; el de Gemini en `src/lib/ai/google-genai.ts`; OpenAI en `src/lib/ai/openai-*.ts`. **NUNCA** instanciar un SDK dentro de un módulo de dominio.
- Modelos Anthropic se agregan al shape `anthropic/claude-*@default` en `src/config/nexa-models.ts`.
- **NUNCA** hardcodear `sk-ant-*`/`sk-*`; resolver server-side vía `resolveSecretByRef` (`ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key`, etc.).
- El tool `search_knowledge` y las Answer Rules NO dependen del SDK — el router/adapter NO los tocan (invariante TASK-1085).

## Normative Docs

- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md` (tool + reglas provider-agnósticas)
- `docs/issues/resolved/ISSUE-092-nexa-tool-calling-broken-function-response-id.md` (fragilidad del tool-shape de Gemini → justifica failover)

## Dependencies & Impact

### Depends on

- `TASK-1085` (tool + Answer Rules + flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`).
- `TASK-1019` (cliente `src/lib/ai/anthropic.ts` + secret — ya existe).

### Blocks / Impacts

- Afecta el runtime conversacional de Nexa (Home + futuras surfaces). El router cambia qué modelo responde cada turno → impacta latencia, costo y comportamiento.
- NO impacta otros consumers de Gemini (AI Observer del RCP, image generation) — fuera de scope.

### Files owned

- `src/lib/nexa/nexa-service.ts` (refactor a provider abstraction + invoca el router)
- `src/lib/nexa/nexa-provider.ts` [verificar — nuevo: interfaz `NexaChatProvider`]
- `src/lib/nexa/providers/gemini.ts` [verificar — nuevo: provider Gemini extraído]
- `src/lib/nexa/providers/anthropic.ts` [verificar — nuevo: adapter Anthropic tool-use conversacional]
- `src/lib/nexa/nexa-model-router.ts` [verificar — nuevo: router interno por intención + failover]
- `src/config/nexa-models.ts` (ids `anthropic/claude-*@default` + routing por prefijo de provider)
- `src/lib/nexa/flags.ts` (flags `NEXA_PROVIDER` / `NEXA_AUTO_ROUTER_ENABLED`)
- Docs: `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` (Delta), `CLAUDE.md`, `changelog.md`, doc funcional + manual si cambia comportamiento visible

### NO owned (reuso, no tocar)

- `src/lib/nexa/nexa-tools.ts` (`search_knowledge` + `executeNexaTool` + declaraciones) — provider-agnóstico, se consume.
- `src/lib/nexa/nexa-contract.ts` (tipos `NexaToolDeclaration`/`NexaToolInvocation`/`NexaToolResult`).
- `src/lib/knowledge/**` (SSOT `searchKnowledge` + contrato `knowledge-search.v1`).

## Current Repo State

### Already exists

- `src/lib/ai/anthropic.ts` (TASK-1019): cliente canónico (`getAnthropicClient`, `isAnthropicConfigured`) + `generateStructuredAnthropic` — tool-use de **structured-output forzado** (un solo tool_choice). **NO** tiene tool-use conversacional.
- `src/lib/nexa/nexa-service.ts`: el 2-pass tool loop con Gemini (`resolveToolTurn` → `generateContent` AUTO function-calling → `functionResponse` → follow-up + `generateSuggestions`). Acoplado a `@google/genai`.
- `src/lib/nexa/nexa-tools.ts` + `nexa-contract.ts`: tool `search_knowledge` + `getNexaToolDeclarations` + `executeNexaTool` + Answer Rules (provider-agnósticos, TASK-1085).
- `src/config/nexa-models.ts`: `NexaModelId = 'provider/model@version'` (todos `google/*` hoy) + `resolveNexaModel` + `DEFAULT_NEXA_MODEL`.
- `src/lib/ai/openai-image.ts` (OpenAI **imágenes**, NO chat/tools).
- Secret `greenhouse-anthropic-api-key` + `ANTHROPIC_API_KEY_SECRET_REF`.

### Gap

- `anthropic.ts` **no tiene tool-use conversacional** (multi-turn `tool_use`/`tool_result`).
- `nexa-service.ts` está **acoplado al SDK de Gemini**; no hay abstracción de provider.
- No existe **router de modelo** (selección por intención) ni **failover** entre providers.
- `nexa-models.ts` no tiene ids `anthropic/claude-*` ni routing por prefijo.
- No hay flags de provider/router.
- No existe cliente OpenAI de **chat/tools** (solo imágenes) → OpenAI queda como follow-up.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — `NexaChatProvider` interface + extraer el provider Gemini (refactor, sin cambio de comportamiento)

- Definir `NexaChatProvider` (interfaz): `resolveTurn({ systemPrompt, history, prompt, tools, runtimeContext }) → { text, toolInvocations }` + `generateSuggestions(...)`.
- Mover el código Gemini actual de `nexa-service.ts` a `providers/gemini.ts` implementando la interfaz. `nexa-service.ts` queda como orquestador.
- Default sigue Gemini → **cero cambio de comportamiento**. Tests de paridad (los existentes de `src/lib/nexa/` siguen verdes).

### Slice 2 — Anthropic adapter (tool-use conversacional)

- `providers/anthropic.ts` implementa `NexaChatProvider` vía `getAnthropicClient()`:
  - Mapear `getNexaToolDeclarations(runtimeContext)` → Anthropic `tools` (name/description/input_schema).
  - 2-pass loop: `messages.create` con `tools` → si `stop_reason='tool_use'`, ejecutar vía `executeNexaTool` (reusado tal cual) → segundo `messages.create` con el bloque `tool_result` → texto final.
  - `generateSuggestions` con Claude (mismo contrato: 3 follow-ups JSON).
- Reusa `executeNexaTool` + `NexaToolInvocation` sin tocarlos (el `raw.packet` viaja igual → las señales de TASK-1085 siguen funcionando).
- **Importante (ISSUE-092):** Anthropic usa `tool_use`(id)/`tool_result`(tool_use_id) — el adapter Anthropic **sí** usa el id (es su contrato correcto). NO copiar el workaround de Gemini.

### Slice 3 — Router interno ("auto") por intención + failover + flag

- `nexa-model-router.ts`: `selectProvider({ prompt, runtimeContext, history }) → NexaModelId` — **heurístico por intención** (sin llamada LLM extra), determinístico + debuggeable:
  - knowledge/grounding/dominio sensible (finance/payroll/legal/security) → Claude.
  - navegación/chat trivial → Gemini Flash.
  - default conservador declarado.
- **Failover**: si el provider elegido falla (error de SDK, 429, timeout), reintentar con el siguiente provider de la cadena.
- **Interno, nunca expuesto**: el usuario no elige; `requestedModel` queda solo como override de ops/testing.
- Flags: `NEXA_PROVIDER` (pin a un provider) + `NEXA_AUTO_ROUTER_ENABLED` (default false → pin a Gemini; true → "auto").
- Routing en `nexa-service.ts`: derivar provider del prefijo del `NexaModelId` resuelto (`google/*` → Gemini, `anthropic/*` → Anthropic). Agregar ids `anthropic/claude-sonnet-4-x@default` a `nexa-models.ts`.

### Slice 4 — Eval de paridad + cutover + docs

- Eval: mismo set de preguntas (incl. golden questions de knowledge) contra cada provider; asertar que ambos citan + respetan no-invención en `confidence='none'`.
- Smoke live de ambos providers + del router "auto" (con el flag de knowledge ON).
- Observabilidad: registrar qué provider resolvió cada turno (en `nexa_messages` o un campo) para auditar el router + costo.
- Docs: Delta en `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `CLAUDE.md`, `changelog.md`, doc funcional/manual si cambia comportamiento visible.

## Out of Scope

- **Exponer la selección de modelo al usuario** — el router es 100% interno (decisión explícita del operador).
- Tocar el tool `search_knowledge`, las Answer Rules o el contrato `knowledge-search.v1`.
- **Adapter OpenAI de chat/tools** — hoy solo existe `openai-image.ts`; OpenAI entra por la misma abstracción en un follow-up. V1 = Gemini + Claude.
- **Router por clasificador LLM-barato** — V1 es heurístico/determinístico; el clasificador LLM es follow-up.
- Embeddings / RAG vector (escalación diferida TASK-1080).
- Migrar otros consumers de Gemini (AI Observer del RCP, image generation, `greenhouse-agent.ts`).
- Streaming de respuestas.

## Detailed Spec

El adapter de cada provider debe producir el **mismo shape de salida** que el Gemini actual (`{ text, toolInvocations: NexaToolInvocation[] }`) para que el resto de Nexa (persistencia en `nexa_messages.tool_invocations`, señales de TASK-1085, UI de Answer Trace de TASK-1089) funcione **sin cambios**. El `NexaToolInvocation.result.raw.packet` debe seguir siendo el `KnowledgeRetrievalPacket` v1 idéntico — el adapter solo cambia cómo se le habla al modelo, no qué devuelve el tool.

El router es una **función pura** sobre `{ prompt, runtimeContext, history }` → `NexaModelId`, testeable sin red. La cadena de failover y el provider elegido se loggean para auditoría. El no-determinismo se acota: el router es determinístico (heurístico), así que la misma intención → mismo provider (reproducible); lo único no-determinístico es el modelo en sí, igual que hoy.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (abstracción, refactor sin cambio) → Slice 2 (adapter Anthropic) → Slice 3 (router + failover + flag) → Slice 4 (eval + cutover). **No activar "auto"** (`NEXA_AUTO_ROUTER_ENABLED=true`) sin el eval de paridad de Slice 4 verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tool-shape mismatch (Gemini functionCall vs Anthropic tool_use/tool_result) | nexa/ai | media | adapter dedicado + tests de paridad del loop; contrato real de Anthropic (id en tool_use/tool_result) | tests de adapter rojos |
| Router misclasifica intención (manda grounding a Flash) | nexa/knowledge | media | heurística conservadora (ante duda → modelo fuerte); eval de paridad; log del provider elegido | `knowledge.nexa.no_source_*` / `low_citation_rate` (TASK-1085) en warning |
| No-determinismo percibido (misma pregunta, modelo distinto) | nexa | baja | router determinístico (misma intención → mismo provider); log auditable | reportes de inconsistencia |
| Provider caído / 429 / error de shape | nexa/ai | media | **failover** a otro provider en la cadena | tasa de failover elevada |
| Drift de instrucción (no cita / inventa) al cambiar modelo | nexa/knowledge | media | eval de paridad antes del cutover | señales de retrieval en warning |
| Latencia / costo distinto por provider | nexa/ai | media | medir en shadow; log del provider+costo por turno | métricas de latencia/costo |

### Feature flags / cutover

- `NEXA_AUTO_ROUTER_ENABLED` default `false` → Nexa pinneado a Gemini (comportamiento actual). `NEXA_PROVIDER` permite pin manual a un provider. Activar "auto" tras eval verde. Rollback = flag flip (sin deploy).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (refactor sin cambio de default) | <10 min | sí |
| 2 | revert PR (adapter aislado, no enrutado aún) | <10 min | sí |
| 3 | flag `NEXA_AUTO_ROUTER_ENABLED=false` / `NEXA_PROVIDER=google` | <2 min | sí |
| 4 | flag flip + revert doc | <5 min | sí |

### Production verification sequence

1. Tests `src/lib/nexa/**` + adapter + router (función pura) verdes.
2. Smoke live de ambos providers + del router "auto" (flag knowledge ON): citan + no inventan en `confidence='none'`.
3. Eval de paridad (golden questions) verde para cada provider.
4. Shadow de latencia/costo + revisión del log de routing antes de activar "auto".
5. Cutover gradual + monitor de señales `knowledge.nexa.*` + tasa de failover.

### Out-of-band coordination required

- Confirmar el/los modelo(s) Claude objetivo (Sonnet 4.x recomendado) + budget/quota Vertex/Anthropic. Sign-off del operador antes de activar "auto" en producción.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [x] Existe `NexaChatProvider` y el provider Gemini está extraído detrás de ella, con default = Gemini y comportamiento idéntico (tests de paridad verdes — `nexa-service.test.ts` 7/7 intacto).
- [x] Existe el adapter Anthropic con tool-use conversacional (2-pass `tool_use`/`tool_result`), reusando `executeNexaTool` sin tocarlo.
- [x] El output de cada adapter es `{ text, toolInvocations }` con el `raw.packet` idéntico → señales TASK-1085 + persistencia + Answer Trace funcionan sin cambios.
- [x] Existe el router interno (`nexa-model-router.ts`, función pura) por intención + failover; el provider que resolvió el turno queda en `NexaResponse.modelId` (persistido) + failover loggeado.
- [x] La selección de modelo NO está expuesta al usuario (el picker `NEXA_MODEL_OPTIONS` sigue solo-Gemini; el id Anthropic es router-internal; `requestedModel` es solo override de ops y solo honra modelos del picker).
- [x] Flags `NEXA_AUTO_ROUTER_ENABLED` / `NEXA_PROVIDER`; activar "auto" es config sin deploy; default = Gemini (ruta single-provider byte-idéntica).
- [x] El tool `search_knowledge` y las Answer Rules NO fueron modificados (diff vacío en `nexa-tools.ts` / `nexa-contract.ts` / `knowledge/**`).
- [ ] **(gated, live)** Eval de paridad: cada provider cita `[n]` + respeta no-invención en `confidence='none'` — requiere `ANTHROPIC_API_KEY_SECRET_REF` resuelto en el runtime + sign-off del operador. Ver Activation Playbook.

## Activation Playbook (gated — sesión live con keys + sign-off)

El código está shipped con `NEXA_AUTO_ROUTER_ENABLED` **OFF** (cero cambio de comportamiento: Nexa usa siempre Gemini). Activar el router "auto" en producción requiere, en orden:

1. **Secret en el runtime**: confirmar `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` resuelto en Vercel (prod + staging) — `isAnthropicConfigured()` true. Sin esto, el failover desde Gemini hacia Anthropic degrada (Anthropic no configurado).
2. **Smoke live de ambos providers** (flag knowledge ON): con `NEXA_PROVIDER=anthropic` forzar un turno de conocimiento → verificar que Claude cita `[n]` + cierra `Fuentes:` + dice gap honesto en `confidence='none'`. Idem `NEXA_PROVIDER=google` (regresión Gemini).
3. **Eval de paridad** sobre las golden questions de knowledge (TASK-1083): ambos providers citan + respetan no-invención. Documentar el resultado.
4. **Shadow** de latencia/costo + revisar el log de routing/failover antes de flip.
5. **Cutover**: `NEXA_AUTO_ROUTER_ENABLED=true` (config sin deploy). Monitorear señales `knowledge.nexa.*` (TASK-1085) + tasa de failover. Rollback = `NEXA_AUTO_ROUTER_ENABLED=false` (<2 min, sin deploy).

Modelo Claude objetivo: **Sonnet 4.6** (`anthropic/claude-sonnet-4-6@default`). Sign-off del operador antes del flip.

## Pendientes — estado de cierre (lo que falta)

El **código está completo y mergeado a `develop`** (`bfd8b28e9` · `4ba526193` · `9ccbbe8c7` · `a64ff79e8`), con el flag `NEXA_AUTO_ROUTER_ENABLED` **OFF** → en producción corre la ruta default Gemini, byte-idéntica a la previa. Lo que **NO** está cerrado y queda explícitamente pendiente:

### A. Verificación live de los caminos NUEVOS (gated por la key Anthropic)

| Camino | Verificado hoy | Pendiente |
|---|---|---|
| Default Gemini (activo en prod) | unit (`nexa-service` 7/7) **+ smoke live**: respuesta real sin tool + 2-pass tool loop disparando `check_payroll` contra PG real (mayo 2026, neto CLP 427.789,57) | — |
| Adapter Anthropic (Claude) | unit (6 tests, SDK mockeado) | **smoke live real** contra la API de Claude (turno con tool + síntesis + cita) — requiere `ANTHROPIC_API_KEY_SECRET_REF` resuelto |
| Router "auto" + failover | unit (router 12 + selección/failover 6, providers mockeados) | **smoke live** del router con `NEXA_AUTO_ROUTER_ENABLED=true` + un fallo real de provider que dispare el failover |

- **Eval de paridad (golden questions de knowledge, TASK-1083): NO corrida.** Falta asertar en vivo que **ambos** providers citan `[n]` + respetan no-invención en `confidence='none'`. Es el gate que protege contra drift de instrucción al cambiar de modelo.

### B. Activación en producción (gated — ver Activation Playbook arriba)

1. Confirmar `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` resuelto en Vercel prod + staging (`isAnthropicConfigured()` true) — **pendiente**. Sin esto el failover Gemini→Anthropic degrada.
2. Smoke live de ambos providers (paso A) — **pendiente**.
3. Eval de paridad verde + documentado — **pendiente**.
4. Shadow de latencia/costo + revisión del log de routing/failover — **pendiente**.
5. Flip `NEXA_AUTO_ROUTER_ENABLED=true` (config sin deploy) + monitor de `knowledge.nexa.*` + tasa de failover — **pendiente**.

### C. Coordinación out-of-band

- Confirmar modelo Claude objetivo (Sonnet 4.6) + **budget/quota** Anthropic + **sign-off del operador** antes de activar "auto" en producción — **pendiente**.

### D. Observabilidad fina (opcional, follow-up)

- Hoy la observabilidad es `NexaResponse.modelId` (persistido en `nexa_messages` → provider derivable) + el `console.warn` de failover. Una **métrica estructurada de tasa-de-failover / costo-por-provider** (señal de reliability o columna) queda como follow-up si el router "auto" se vuelve permanente.

> Nada de A–D bloquea el merge actual (flag OFF = cero efecto). Son los pasos para **encender el router "auto"** en una sesión live con keys + sign-off.

## Verification

**Ejecutado en esta sesión (gate de cierre):**

- `pnpm exec vitest run` (full) → **6771 passed** (972 files, 15/69 skip). `nexa-service.test.ts` 7/7 intacto (paridad ruta default). Nuevos: adapter Anthropic 6 + router 12 + selección/failover 6.
- `pnpm exec tsc --noEmit` (full, todo el árbol) → **0 errores**.
- `pnpm build` (producción Turbopack) → **OK** (boundary server-only).
- **Smoke live runtime** (orquestador real → Gemini/Vertex + PG): turno sin tool (respuesta real) + turno con tool (`check_payroll` → PG real → síntesis). ✅

**Pendiente (gated — sección Pendientes A/B):**

- Smoke live de Anthropic + router "auto" (requiere la key Anthropic + flag ON).
- Eval de paridad de las golden questions contra cada provider.
- `pnpm task:lint --task TASK-1091`.

## Closing Protocol

- [x] `Lifecycle` sincronizado con carpeta (`complete/`).
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` actualizados.
- [x] `Handoff.md` + `changelog.md` actualizados.
- [x] Delta en `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `CLAUDE.md` (provider abstraction + router).
- [x] Doc funcional + manual: **N/A** — el router está flag-OFF (cero comportamiento visible al usuario; el picker no cambia). Se documenta cuando se active "auto" (Activation Playbook). Arch Delta + CLAUDE.md cubren el contrato para agentes.

## Follow-ups

- **Adapter OpenAI de chat/tools** (entra por la misma abstracción; agrega el 3er provider al router).
- **Router por clasificador LLM-barato** (más flexible que el heurístico; medir si vale el costo/latencia).
- Tier strategy fina (modelo barato para enrutar + fuerte para componer).
- Migrar otros consumers de Gemini (AI Observer, `greenhouse-agent.ts`) a la abstracción si conviene.
- Streaming de respuestas de Nexa.
