# 03 — Comportamiento + Routing

> **Capa:** Comportamiento + routing de provider. **Código:** [`nexa-service.ts`](../../../../src/lib/nexa/nexa-service.ts), [`nexa-model-router.ts`](../../../../src/lib/nexa/nexa-model-router.ts), [`nexa-provider.ts`](../../../../src/lib/nexa/nexa-provider.ts), [`providers/`](../../../../src/lib/nexa/providers).
> **Detalle técnico de modelos:** [`technical/llm-models.md`](../technical/llm-models.md).

## Qué hace Nexa por turno

```text
prompt del usuario
  → NexaService.generateResponse (orquestador provider-agnóstico)
    → buildProviderPlan (elige provider primario + cadena de failover)
    → buildSystemPrompt (artefacto versionado V1/V2)
    → provider.resolveTurn (2-pass tool loop: tool AUTO por defecto → se ejecuta → 2da pasada compone)
      → tool search_knowledge (AUTO o forced first-pass si aplica) → packet knowledge-search.v1
    → generateSuggestions
  → NexaResponse { content, toolInvocations, suggestions, modelId }
```

## Ruteo de tools

Por defecto, el ruteo de tools sigue en modo **AUTO**: el provider recibe las tool declarations y
el modelo decide si llama una tool en el primer pase. TASK-1156 agrega un unico override
deterministico: si `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED=true`,
`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true` y `classifyNexaIntent(prompt) === 'knowledge'`, el
orquestador pasa `forcedToolName: 'search_knowledge'` al provider para el primer pase. El provider
mantiene el loop de 2 pases existente y la segunda pasada compone con la misma voz. No cambia el
system prompt ni los modulos de composicion/voz.

| Intención | Acción |
|---|---|
| Proceso / política / guía / definición / "cómo se hace X" | `search_knowledge` ANTES de responder |
| Dato operativo en vivo (su nómina, OTD, correos, capacidad, cuentas por cobrar) | tool operativo correspondiente; NUNCA desde Knowledge |
| **"¿Cuánto cobré / por qué cobré eso?" (pago PROPIO del colaborador)** | **`explain_my_pay`** (TASK-1146) — líquido + desglose regime-aware del **propio** member (anti-oracle por `context.memberId`); NUNCA el pago de otro ni el agregado de la nómina (eso es `check_payroll`, operador) |
| **"¿Por qué cambió el OTD/RpA/FTR? ¿Qué señales/anomalías/insights hay?" (causa raíz de delivery)** | **`list_insights`** (lista del período) / **`get_insight`** (un insight por ID) — TASK-1181, Nexa Insight ↔ Conversation Bridge Slice 1. Análisis advisory (Nexa Insights), distinto del OTD en vivo (`get_otd`) y de las definiciones (`search_knowledge`); al citar un insight, ofrece su enlace |
| Conversación general / aclaración / siguiente paso | sin tool, responde directo |
| Tool no disponible (permisos/datos) | lo dice con honestidad + ofrece el camino real |

**Catálogo de tools operativos (member/operador):** `check_payroll` (operador, agregado del período), `explain_my_pay` (member-self, pago propio + por qué, TASK-1146), `get_otd`, `check_emails`, `get_capacity`, `pending_invoices`, `search_knowledge`, `get_insight` + `list_insights` (Nexa Insights — advisory de delivery, TASK-1181). Cada uno gateado por `isAvailable`; `explain_my_pay` solo con `memberId` y reusa `buildReceiptPresentation` (regime-aware, NUNCA recomputa).

**Insight-addressable read (TASK-1181, Bridge Slice 1):** `get_insight(insightId)` y `list_insights(periodYear?, periodMonth?)` hacen que el chat sea **cliente del MISMO reader** de la page `/nexa/insights` (`readNexaInsightDrill` / `listNexaInsightsForPeriod`) — un primitive, muchos consumers (Full API Parity). Wrappers finos: NO queryean `ico_ai_signal_enrichments` directo; derivan el subject del `runtimeContext` del turno (misma fuente que la page server, vía `buildNexaInsightSubject` en `insight-focus.ts` — SSOT del mapeo) y dejan que el reader aplique el **subject anti-oracle** (cliente nunca ve; admin/route-group broad → todos; colaborador → self por `member_id`). `isAvailable = tenantType === 'efeonce_internal'` (mirror del primer gate del reader). Estados `not_found`/`degraded`/`superseded`/`expired`/`empty-positive` → gap honesto, nunca invención. Deep-link siempre vía `buildNexaInsightDrillHref`. Contrato: `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` §2.1.

**Conciencia de superficie — `focusRef` (TASK-1182, Bridge Slice 2):** cuando el usuario abre el chat desde un insight (CTA "Pregúntale a Nexa sobre este insight"), la UI manda `focusRef: { kind:'nexa_insight', id }` en el body del POST; `route.ts` lo valida (shape estricto) y lo setea en `runtimeContext.focusRef`. En `NexaService.generateResponse`, `buildFocusedInsightNote(runtimeContext)` (`insight-focus.ts`) **pre-resuelve** ese insight con el reader anti-oracle (subject del turno) y appendea una nota de contexto al **system prompt del turno** (NO al prompt versionado: es contexto runtime per-turno). Reglas: `focusRef` es **contexto, no permiso** (el reader decide el acceso; un `focusRef` ajeno → `not_found` → sin ancla); no resoluble → `null` → el turno procede normal (degradación honesta); la nota instruye usar el contexto solo si la pregunta es sobre ese insight. Contrato: `..._BRIDGE_V1.md` §2.2.

**Enviar/sembrar un mensaje al chat PROGRAMÁTICAMENTE (TASK-1182) — patrón canónico:** un CTA de dominio que abre el chat con una pregunta pre-hecha (ej. "Pregúntale a Nexa sobre este insight") debe inyectar el mensaje con el store de assistant-ui **`aui.thread().append({ role: 'user', content: [{ type: 'text', text }] })`** (hook `useAui()` de `@assistant-ui/react`), **desde un componente montado DENTRO del `AssistantRuntimeProvider`**. Es el MISMO API que usan las follow-up suggestions del chat (`NexaThread` → `FollowupSuggestions`), por eso es el camino vivo y probado. Implementación de referencia: `NexaSeedAutoSend` en `NexaFloatingButton.tsx` envía una vez (cuando `useAuiState(s => s.thread.isRunning)` es false), gatillado por el estado `pendingSeed` que setea el listener de `NEXA_FLOATING_OPEN_EVENT`. **Anti-patrones (NO usar):** (1) `runtime.thread.append()` sobre el objeto del outer `useLocalRuntime` — su `.thread` es el placeholder "empty thread" → crashea en render o no envía en silencio; (2) `ThreadPrimitive.Suggestion` oculto + auto-click — frágil, no dispara. El `focusRef` del turno viaja por el body del adapter (arriba), así que el mensaje sembrado llega anclado al insight.

## Ruteo de provider (interno, NUNCA expuesto al usuario)

`buildProviderPlan` decide en este orden de precedencia:

1. **Modelo pedido explícito** (soportado, del picker) → gana, deriva su provider, single (sin failover).
2. **Pin `NEXA_PROVIDER`** → single, sin failover (intención del operador).
3. **Auto-router `NEXA_AUTO_ROUTER_ENABLED`** → primario por **intención** + failover al otro provider.
   - `classifyNexaIntent` clasifica la pregunta; `routeNexaProviderKey` elige: **Claude** solo cuando
     intención = `knowledge` AND `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; resto → Gemini.
4. **Default** → Gemini (idéntico al comportamiento previo a la abstracción de provider).

La selección de modelo es **100% interna**. El picker visible sigue solo-Gemini; Claude es
router-internal. Observabilidad: `NexaResponse.modelId` (persistido; provider derivable).

> **Importante (post-TASK-1134 — el chat SÍ alcanza el router):** el chat manda `modelMode: 'auto'`
> por defecto → `/api/home/nexa` pasa `requestedModel: null` y el provider lo decide el plan por
> **flags**, NO por entorno. Router OFF (default actual) → Gemini en todos lados. Router ON +
> `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` ON → conocimiento a **Claude** (incl. local). Antes el chat
> quedaba clavado en Gemini porque el endpoint forzaba un `requestedModel` soportado. La selección
> de modelo: `auto` (default) o `manual` (override del picker, solo Gemini); Claude nunca es opción visible.

## Response modes (elige por intención)

`definición` · `cómo-hacer` · `política` · `troubleshooting` · `comparación` · `operativo en vivo` ·
`sin-respuesta`. (Definidos en el módulo `responseModes` del prompt V2.)

## Higiene de formato del output (TASK-1149)

`NexaService.generateResponse` aplica una **capa determinística** sobre el texto del turno antes de
devolverlo/persistirlo: `downgradeStructuralHeadings` (`strip-markdown-excerpt.ts`) baja los headers
ATX (`#`/`##`/`###`) a **negrita** en su propia línea, preservando viñetas/negritas/links y los bloques
de código. **Por qué:** el contrato de voz prohíbe headers en el panel del chat (módulo `answerFormatting`),
pero el cumplimiento del LLM es **probabilístico** — Claude (auto-router) los pone pese al prompt; lo
detectó el nightly de TASK-1127 (caso K6 en staging). Defense-in-depth: el prompt reduce la frecuencia,
esta capa lo **garantiza** en TODOS los providers. NO se toca el prompt para esto. (El `cleanNexaAnswer`
del cliente sigue manejando aparte el `[n]` colgante del streaming typewriter.)

## Honestidad (gaps + degradación)

- Si la evidencia de Knowledge es insuficiente → gap honesto ("no encontré una guía publicada…"), no inventa.
- Si piden el estado real y no se consultó un tool en vivo → lo dice.
- Si un tool falla por permisos/datos → lo nombra + ofrece el camino real.

## Telemetría de turno (TASK-1129)

Cada respuesta de Nexa adjunta una `turnTelemetry` (contrato `nexa-turn-telemetry.v1`, en
[`nexa-turn-telemetry.ts`](../../../../src/lib/nexa/nexa-turn-telemetry.ts)) que el orquestador arma
y el endpoint **persiste** en el ledger aditivo `greenhouse_ai.nexa_turn_telemetry` — NO se devuelve
al cliente. Registra **observabilidad, no conversación**: versión/familia del prompt (TASK-1124),
provider plan + provider/modelo resuelto + failover, latencias (total + por step), tools (nombre +
availability), `outcome` (`success`/`graceful_fallback`/`tool_degraded`/`provider_failed`/`aborted`)
y resultado de sugerencias. Tokens/costo = `null` hasta que el SDK exponga usage estable.

- **Persistencia best-effort post-commit** (`store.ts`): un fallo del ledger (p.ej. tabla ausente en
  un entorno) NUNCA tumba la persistencia de la conversación — se captura con `captureWithDomain('home')`.
- **Sin contenido sensible:** nunca el prompt completo, el texto de respuesta, los tool results crudos
  ni secretos.
- **Hard-fail** (`provider_failed`/`aborted`) NO llegan al ledger (lanzan antes de persistir) → cubiertos
  por el incident del endpoint (`captureWithDomain('home')`, TASK-1131).
- **Reliability signal** `nexa.turn.degraded_outcomes` (módulo Home): cuenta `graceful_fallback` +
  `did_failover` en 24h (steady≈0). El ledger habilita filtrado ad-hoc por `prompt_version`/`resolved_provider`/`outcome`.

## Contrato de error del endpoint (TASK-1131)

`/api/home/nexa` (+ sus handlers hermanos `feedback/`, `threads/`, `threads/[threadId]`) es el backend
compartido del chat (legacy embebido + flotante global). Todos sus errores que cruzan al cliente usan
el **contrato de error canónico** (`canonicalErrorResponse`, es-CL + `code` + `actionable`):

- Sin sesión → `unauthorized` (401). Sin prompt → `nexa_prompt_required` (422).
- Fallo de generación → `nexa_generation_failed` (500, `actionable: true` — es transitorio; reintentar suele resolver).
- Fallos de store (feedback/threads) → `internal_error` (500).

Todo fallo se captura con `captureWithDomain(error, 'home', { tags: { source: 'nexa_*_endpoint' } })`
→ se rolea al módulo **Home** del reliability dashboard. El detalle técnico se redacta
(`redactErrorForResponse`) hacia Sentry, **NUNCA** al cliente. El cliente (`use-nexa-runtime`) lee
`errorBody.error` → ahora es-CL canónico por construcción.

## Acciones gobernadas (TASK-1137)

Nexa puede pasar de advisory a **acción gobernada** — el rung `execute_requires_confirmation` del
Action Maturity Ladder (`GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`). El LLM **NUNCA**
ejecuta un write. El loop canónico es **propose → confirm → execute**:

1. **Propose** — el LLM llama el tool `propose_action(actionKey)`. Es read-only: el resolver
   determinístico (`resolveNexaActionProposal`, `src/lib/nexa/actions/registry.ts`) valida
   enablement + permiso, construye un **preview con datos reales** y devuelve un `NexaActionProposal`
   (contrato `nexa-action-proposal.v1`). El LLM **solo pasa una `actionKey` registrada** — NUNCA un
   endpoint, URL ni SQL. Una key desconocida / deshabilitada / sin permiso → **gap honesto** (no se
   propone nada). El orquestador eleva las propuestas a `NexaResponse.actionProposals`.
2. **Confirm** — el humano confirma en la UI. La **confirm-card** (`NexaActionProposalCard`, renderizada
   como el tool `propose_action` en `NexaToolRenderers` → cubre el chat flotante + el home) muestra el
   preview + impacto + botones; al confirmar hace `POST /api/nexa/actions/[actionKey]/confirm` echoando
   la `idempotencyKey` del proposal, con estados honestos (idle/ejecutando/ejecutado/falló/conflicto).
3. **Execute** — el endpoint (user-session, capability `nexa.action.execute`) **re-valida** la acción
   al momento de ejecutar y corre el command bound vía `executeApiPlatformCommand` (foundation
   TASK-655, `principalKind='app_user'`, idempotente + auditado). Es el **ÚNICO ejecutor**; el LLM
   nunca lo llama.

**Gate**: `NEXA_ACTION_RUNTIME_ENABLED` (default OFF, server-only). Con OFF el tool `propose_action`
no se ofrece → Nexa se comporta exactamente como antes (cero acciones). El tool + el endpoint se
gatean además por audiencia (interno ∪ EFEONCE_ADMIN para el piloto). **Piloto V1**:
`mark_notifications_read` (self-scoped, idempotente, dominio neutral — NUNCA finance/payroll/legal/
security para el primer piloto).

**Observabilidad**: ledger append-only `greenhouse_ai.nexa_action_events` (proposed / proposal_denied
/ executed / failed / execution_denied / conflict / cancelled) + 2 reliability signals (módulo Home):
`nexa.action.failure_rate` y `nexa.action.unauthorized_proposal_rate` (SECURITY — detecta al LLM
inducido a proponer acciones prohibidas/inexistentes). Contrato: [`technical/data-contracts.md`](../technical/data-contracts.md).

### Acciones parametrizadas (TASK-1212)

El piloto V1 (`mark_notifications_read`) es una **self-action sin input**. TASK-1212 extendió el runtime
a **acciones parametrizadas**: el LLM propone un `input` además de la `actionKey`, y la acción declara un
**`inputSchema` Zod**. El contrato `NexaActionDefinition` es ahora genérico sobre `TInput`; las
self-actions quedan en `TInput = void` (sin cambio). Flujo:

1. **Propose** — `propose_action(actionKey, input)`. El resolver parsea `input` con `definition.inputSchema`;
   si no pasa → gap honesto `invalid_input` (NUNCA se propone una mutación con datos inválidos). El
   `input` validado viaja en `proposal.execution.input` (eco al cliente).
2. **Confirm** — la confirm-card echa de vuelta `idempotencyKey` **+ `input`**. El endpoint **re-valida**
   el `input` contra el schema en el punto de mutación (no confía en el eco del cliente).
3. **Execute** — el command bound corre con el `input` validado. Como el command **re-enforza todos sus
   invariantes** (capability, precio del engine, idempotencia), un eco manipulado **no escala privilegio**:
   solo puede autorar lo que el usuario ya podía.

**Primera acción parametrizada**: `author_quote` (crear/emitir una cotización) — bound al command canónico
`submitQuoteFromBuilder` (mismo primitive que la UI y las rutas; NO una integración Nexa paralela).
Dominio `commercial-q2c`, capability `commercial.quotation`, gateada por
`NEXA_QUOTE_AUTHOR_ACTION_ENABLED` (default OFF, además del master runtime flag). Comparte el
governed-action surface con el close Q2C (TASK-1206). Spec: ADR
`GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md` (Delta 2026-06-21).

## Reglas duras

- **TASK-1137** — el LLM **NUNCA** ejecuta un write: solo propone una `actionKey` registrada vía
  `propose_action`. La ejecución requiere **confirmación humana** + el endpoint determinístico de
  confirmación (capability `nexa.action.execute` + idempotency foundation). Sin command canónico
  bound → gap honesto/deep-link, NUNCA un endpoint inventado.
- **NUNCA** devolver `error.message` crudo (ni prosa inglesa) al cliente desde un handler del chat. Usar `canonicalErrorResponse` + `captureWithDomain('home', …)`. (Bug-class cerrado en TASK-1131.)
- **NUNCA** exponer la selección de modelo al usuario.
- **NUNCA** instanciar un SDK LLM dentro de un dominio: Gemini vía `getGoogleGenAIClient`, Anthropic
  vía `getAnthropicClient` (`src/lib/ai/*`). Detalle: [`technical/llm-models.md`](../technical/llm-models.md).
- **NUNCA** responder un dato operativo en vivo desde Knowledge.
- **NUNCA** acoplar el tool/Answer Rules a un SDK: el swap de provider NO debe tocar `search_knowledge`.
