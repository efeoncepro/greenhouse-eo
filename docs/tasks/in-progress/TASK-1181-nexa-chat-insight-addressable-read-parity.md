# TASK-1181 — Nexa Chat Insight-Addressable Read Parity (Bridge Slice 1)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-1181-nexa-chat-insight-addressable-read-parity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hace que el chat de Nexa pueda **leer y listar insights** (la superficie advisory de ICO/delivery) por construcción, exponiendo los readers canónicos existentes (`readNexaInsightDrill`, `listNexaInsightsForPeriod`) como dos tools nuevos (`get_insight`, `list_insights`) más un módulo de system prompt que le enseña a Nexa que la superficie Insights existe y cómo rutear. Es el Slice 1 del Nexa Insight ↔ Conversation Bridge: cierra el lado Chat → Insights sin schema ni UI nueva.

## Why This Task Exists

Hoy **Nexa Insights** (`/nexa/insights/[id]`) y **Nexa Chat** (`/api/home/nexa`) resuelven del mismo origen canónico (`greenhouse_serving.ico_ai_signal_enrichments`) pero viven de espaldas: el chat **no tiene ningún tool para leer un insight por id ni para listar insights** — solo `get_otd` toca ICO de refilón (top-3 signals del org). El system prompt **nunca menciona "Insights"**. Un colaborador que ve un insight ("OTD de Sky bajó por bloqueo en revisión") no puede preguntarle a Nexa sobre él, y Nexa no sabe que el insight existe. Esto contradice el North Star de Full API Parity (Nexa opera TODO por construcción) y la decisión Nexa Core ("los Insights son promotable a momento conversacional"). La causa NO es falta de datos ni de infra — ambos existen; es que **el chat no es cliente del reader del insight**.

## Goal

- Nexa puede responder "¿qué insights hay para [espacio/miembro] este período?" llamando `list_insights` (wrapper de `listNexaInsightsForPeriod`).
- Nexa puede responder "explícame el insight EO-AIE-… / por qué bajó OTD de X" llamando `get_insight` (wrapper de `readNexaInsightDrill`).
- El system prompt rutea correctamente: Insights advisory → tools nuevos; dato vivo (OTD ahora) → `get_otd`; definición/proceso → `search_knowledge`.
- Cero relajación de autorización: ambos tools reusan el subject anti-oracle de los readers (cliente nunca ve; self-access por `memberId`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md` (ADR — esta task es Slice 1)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` (spec — §2.1 Plano 1)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (contrato de la capa de insights)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (un primitive, muchos consumers)
- `docs/architecture/nexa-intelligence/README.md` + capas `behavior/`, `knowledge/`, `system-prompt/`

Reglas obligatorias:

- **NUNCA** queryear `ico_ai_signal_enrichments`/`ico_ai_signals` directo desde un tool — pasar por `readNexaInsightDrill`/`listNexaInsightsForPeriod` (subject anti-oracle reusado).
- **NUNCA** editar el system prompt inline en `nexa-service.ts` — el módulo vive en `nexa-system-prompt.ts` versionado; al cambiarlo: bump `version` + entrada de changelog + actualizar el golden snapshot (`nexa-system-prompt.test.ts -u`) + `pnpm nexa:doc-gate --changed`.
- **SIEMPRE** derivar el subject de los readers desde el `runtimeContext` del turno (misma fuente que la page server `/nexa/insights`), no construir un subject paralelo.
- **SIEMPRE** emitir el deep-link en el resultado del tool vía `buildNexaInsightDrillHref` (no componer `/nexa/insights/...` a mano).
- Degradación honesta: estados `superseded|expired|not_found|degraded`/`empty-positive` → gap honesto en el summary del tool, NUNCA inventar.

## Normative Docs

- `.claude/skills/greenhouse-nexa-conversational/skill.md` (recargar al implementar — hard rules del runtime del chat + doc-gate)
- `.claude/skills/greenhouse-ico` (boundary Notion=OS / Greenhouse=motor; no recomputar métricas)

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — `readNexaInsightDrill(id, subject)`, `NexaInsightDetailSnapshot`, union `current|superseded|expired|not_found|degraded` (existe)
- `src/lib/ico-engine/ai/nexa-insight-list-reader.ts` — `listNexaInsightsForPeriod(subject, input)`, estados `ready|empty-positive|degraded` (existe)
- `src/lib/ico-engine/ai/nexa-insight-href.ts` — `buildNexaInsightDrillHref(id)` puro/client-safe (existe)
- `src/lib/nexa/nexa-tools.ts` — registry `NEXA_TOOLS`, patrón de tool (`isAvailable` + `execute`), ejemplo `get_otd` y `search_knowledge` (subject derivation) (existe)
- `src/lib/nexa/nexa-system-prompt.ts` — prompt V2 modular versionado + golden snapshot (existe)
- Capability `nexa.insights.read` — gate ya sembrado (migration `20260529004012583_task-947`) (existe)

### Blocks / Impacts

- Habilita Slice 2 (`focusRef` + CTA "Pregúntale a Nexa") y Slice 3 (cross-citación `drillDown`) del bridge.
- No bloquea ninguna task activa.

### Files owned

- `src/lib/nexa/nexa-tools.ts` (modificación: +2 tools)
- `src/lib/nexa/nexa-system-prompt.ts` (modificación: +módulo de ruteo Insights, bump version)
- `src/lib/nexa/__tests__/` (tests de los tools + golden snapshot del prompt) `[verificar nombre exacto del archivo de test del prompt: nexa-system-prompt.test.ts]`
- `docs/architecture/nexa-intelligence/behavior/` + `system-prompt/` (capas a sincronizar — doc-gate)

## Current Repo State

### Already exists

- Readers anti-oracle completos: `readNexaInsightDrill`, `listNexaInsightsForPeriod` con subject filter (`subjectCanReadInsight`).
- Deep-link puro `buildNexaInsightDrillHref` (ya consumido por Home bento + weekly digest).
- Patrón de tool con subject derivation: `search_knowledge` arma `KnowledgeSearchSubject` desde el tenant del turno — replicar para el subject de insights.
- `get_otd` ya importa `readOrganizationAiSignals`/`readOrganizationAiLlmEnrichments` (precedente de tool ICO).
- Prompt V2 versionado + golden snapshot + `pnpm nexa:doc-gate`.

### Gap

- No existe `get_insight` ni `list_insights` en `NEXA_TOOLS`.
- El system prompt no menciona Insights ni rutea hacia ellos.
- No hay un helper que construya el subject de insights desde `NexaRuntimeContext` (hoy cada reader recibe el subject ya armado por la page server) — `[verificar]` si existe un builder reusable de subject de insights o si hay que extraer uno (mirror del de knowledge).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_serving.ico_ai_signal_enrichments` (vía readers canónicos — NO acceso directo)
- Consumidores afectados: `Nexa chat (NexaService) — un consumer más del mismo reader`
- Runtime target: `local` + `staging` (chat backend compartido `/api/home/nexa`)

### Contract surface

- Contrato existente a respetar: `readNexaInsightDrill`/`listNexaInsightsForPeriod` (subject anti-oracle), `NEXA_TOOLS` tool shape, `nexa-answer/prompt versioning` (`NEXA_PROMPT_GOVERNANCE`)
- Contrato nuevo o modificado: dos tool declarations (`get_insight`, `list_insights`) + módulo de prompt versionado (bump de versión)
- Backward compatibility: `compatible` (aditivo — tools nuevos, prompt versionado con golden snapshot)
- Full API parity: el chat se vuelve cliente del MISMO reader del insight (un primitive, muchos consumers); NO se crea lógica de insight paralela en el tool

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna escritura; lectura vía readers de `greenhouse_serving.ico_ai_signal_enrichments` (+ `_history`)
- Invariantes que no se pueden romper:
  - El subject del tool = subject derivado del `runtimeContext` del turno (mismo gate que la page server). El tool no relaja autorización.
  - No-acceso → `not_found`/`empty-positive` (anti-oracle), nunca 403 ni leak de existencia.
  - Cero query directo a tablas de enrichment/signals desde el tool.
- Tenant/space boundary: derivado del `runtimeContext` (tenantType, roleCodes, routeGroups, memberId, clientId) — idéntico a cómo `/nexa/insights` resuelve su subject
- Idempotency/concurrency: N/A — lectura pura, sin mutación
- Audit/outbox/history: heredado — `nexa_messages.tool_invocations` + `nexa_turn_telemetry.tools_used` registran la llamada; sin signal nuevo en V1

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — tools de lectura gateados por el mismo `nexa.insights.read` derivado del tenant; sin flag dedicado porque es aditivo y reusa el gate existente (ver Risk matrix)
- Backfill plan: N/A
- Rollback path: `revert PR + redeploy` (quitar 2 tools del registry + revertir el módulo de prompt al golden snapshot anterior)
- External coordination: N/A — repo-only change

### Security and access

- Auth/access gate: `capability` (`nexa.insights.read` derivado del subject del turno, reusado por los readers)
- Sensitive data posture: insights de delivery scoped por subject; sin PII de payroll/finance. Cliente nunca ve insights internos (anti-oracle del reader).
- Error contract: contrato canónico es-CL (TASK-1131) + `captureWithDomain('home', ...)`; NUNCA `error.message` crudo ni detalle técnico al cliente
- Abuse/rate-limit posture: heredado del chat backend; lectura acotada por subject. `none adicional with rationale` (read-only, sin amplificación)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/nexa` + golden snapshot del prompt actualizado
- DB/runtime checks: smoke con agent-session (persona collaborator + persona client) verificando que el tool respeta el anti-oracle
- Integration checks: ejercitar el chat flotante con prompt real ("qué insights hay para mi espacio") en `/knowledge` o Home, leyendo el tool card
- Reliability signals/logs: heredados (`nexa.insights.freshness`, `nexa.insights.no_new_signals_in_24h`); verificar la llamada en `nexa_turn_telemetry.tools_used`
- Production verification sequence: ver §Rollout

### Acceptance criteria additions

- [ ] Source of truth (readers canónicos), contract surface (2 tools + prompt module) y consumers (NexaService) nombrados con paths reales.
- [ ] Data invariants (subject anti-oracle reusado, cero query directo) y tenant boundary explícitos.
- [ ] Rollback posture explícito y proporcional (revert PR, sin migración).
- [ ] Runtime evidence listada (vitest + smoke multi-persona + ejercicio real del chat).
- [ ] Dominio sensible: errores canónicos es-CL + sin leak de existencia a clientes.

## Capability Definition of Done — Full API Parity gate

- [x] **Lógica en el primitive, no en la UI.** La lógica de lectura del insight ya vive en `src/lib/ico-engine/ai/*` (readers); el tool es un wrapper fino.
- [x] **Modelada como reader canónico**, no click-handler — el tool consume `readNexaInsightDrill`/`listNexaInsightsForPeriod`.
- [x] **Read** expuesto como reader canónico ya existente; este task agrega un consumer (Nexa chat) sin duplicar lógica.
- [ ] **Capability + grant:** N/A capability nueva — reusa `nexa.insights.read` (ya sembrada + grantada). Verificar grant vigente en Discovery.
- [x] **Camino programático declarado:** el reader ya es contrato canónico; el tool es el consumer Nexa. (Plano 2/3 del bridge agregan UI/CTA en follow-ups.)
- [x] **Write apto para propose→confirm→execute:** N/A — este slice es read-only; el write (Slice 4) es follow-up gobernado.
- [x] **Un primitive, muchos consumers:** UI `/nexa/insights` + Nexa chat consumen el MISMO reader; cero lógica duplicada.
- [x] **Parity check = SÍ:** la capability "leer/listar insights" ya tiene contrato gobernado; este task hace que Nexa la opere por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Subject builder + tool `get_insight`

- Helper que construye el subject de insights desde `NexaRuntimeContext` (mirror del subject de `search_knowledge`); reutilizar el tipo de subject que ya consumen los readers.
- Tool `get_insight({ insightId })` en `NEXA_TOOLS`: `isAvailable` derivado de `nexa.insights.read`; `execute` llama `readNexaInsightDrill(insightId, subject)`; mapea el union a summary es-CL (`current` → narrativa + recomendación; `superseded/expired/not_found/degraded` → gap honesto); incluye `raw.insight` (snapshot) + `raw.drillHref` (`buildNexaInsightDrillHref`).
- Tests: persona internal ve; persona client → gap anti-oracle; insightId malformado → gap.

### Slice 2 — Tool `list_insights`

- Tool `list_insights({ periodYear?, periodMonth?, scope?: 'mine'|'all' })`: `execute` llama `listNexaInsightsForPeriod(subject, input)`; default período = Santiago actual; mapea `ready` → summary severity-ordered + `raw.insights[]` con `drillHref` por item; `empty-positive` → "sin insights en el período"; `degraded` → gap honesto.
- Tests: período con/ sin insights; scope `mine` (self por memberId) vs `all` (internos); cliente acotado.

### Slice 3 — System prompt routing module + doc-gate

- Módulo nuevo en `nexa-system-prompt.ts` V2: declara que existe la superficie Nexa Insights (advisory de delivery sobre OTD/RpA/FTR) + reglas de ruteo (Insights vs `get_otd` vivo vs `search_knowledge` definición) + instrucción de ofrecer el `drillHref` al citar.
- Bump `version` + entrada de changelog + `nexa-system-prompt.test.ts -u` (golden snapshot).
- Sincronizar capas `nexa-intelligence/behavior/` + `system-prompt/` + `pnpm nexa:doc-gate --changed` verde.

## Out of Scope

- `focusRef` en `runtimeContext` y el CTA "Pregúntale a Nexa sobre este insight" (Slice 2 del bridge — task aparte).
- La cross-citación `drillDown` desde la respuesta hacia `/nexa/insights/[id]` (Slice 3 del bridge — task aparte).
- Cualquier acción gobernada sobre un insight (acknowledge/snooze/assign — Slice 4, requiere ADR propio).
- Cambios al materializer de AI signals, al enrichment LLM o a las métricas ICO (upstream — intacto).
- Nuevas capabilities, migraciones o tablas.

## Detailed Spec

Ver `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` §2.1 (Plano 1) y §3 (contratos afectados). Resumen del shape de los tools:

```
get_insight({ insightId: string })
  → subject = buildInsightSubject(runtimeContext)
  → readNexaInsightDrill(insightId, subject)
  → current:    { summary: es-CL(metric, severity, rootCause, recommendation),
                  raw: { insight: NexaInsightDetailSnapshot, drillHref } }
    superseded/expired/not_found/degraded → gap honesto

list_insights({ periodYear?, periodMonth?, scope?: 'mine'|'all' })
  → listNexaInsightsForPeriod(subject, { period, scope })
  → ready:          { summary: top-N severity-ordered, raw: { insights[] con drillHref } }
    empty-positive: "sin insights en el período"
    degraded:       gap honesto
```

El subject NO se inventa: se deriva del `runtimeContext` del turno con el mismo criterio que la page server `/nexa/insights` (tenantType/roleCodes/routeGroups/memberId/clientId → `subjectCanReadInsight`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (subject builder + `get_insight`) → Slice 2 (`list_insights`, reusa el subject builder) → Slice 3 (prompt module, requiere que los tools existan para rutear hacia ellos).
- Slice 3 NO puede cerrar antes que Slice 1+2: el prompt referenciaría tools inexistentes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tool relaja el anti-oracle y un cliente ve un insight interno | identity / delivery | low | Reusar el subject de los readers (no construir gate paralelo); tests multi-persona (collaborator + client) | sin signal — cubierto por tests; emerge en logs si leak |
| Prompt rutea mal (llama `get_insight` para dato vivo, o `get_otd` para advisory) | Nexa quality | medium | Reglas de ruteo explícitas en el módulo + golden snapshot + `qa:nexa-knowledge` | `nexa.turn.degraded_outcomes` + telemetría `tools_used` |
| Bump de prompt rompe el doc-gate / golden | Nexa CI | medium | Seguir el protocolo de versioning (`-u` + changelog) + `pnpm nexa:doc-gate --changed` antes de cerrar | CI `ci.yml` doc-gate |
| `insightId` malformado/cross-prefix lanza en vez de degradar | delivery | low | Mapear el union completo a gap honesto; test de id malformado | logs `captureWithDomain('home')` |

### Feature flags / cutover

Sin flag dedicado — additive, immediate cutover. Razón: los tools son read-only y reusan el gate `nexa.insights.read` ya vigente; no hay superficie nueva que prender ni riesgo de over-exposure más allá del subject (que ya gobierna `/nexa/insights`). Revert = revert PR + redeploy. (Si en review se decide gatear el ruteo del prompt, usar el patrón flag default-OFF + golden shadow — declararlo en el plan.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (quita `get_insight` del registry) | <5 min | sí |
| Slice 2 | revert PR (quita `list_insights`) | <5 min | sí |
| Slice 3 | revert al golden snapshot anterior del prompt + redeploy | <10 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/nexa` verde local + golden snapshot actualizado.
2. Smoke con agent-session persona `agent-collaborator` en staging: pedir "qué insights hay para mí" → verifica self-scope; pedir un `EO-AIE-*` ajeno → gap.
3. Smoke con agent-session persona `agent-client` en staging: pedir insights → NO ve insights internos (anti-oracle).
4. Ejercitar el chat flotante real en staging con prompt de advisory delivery → verificar que rutea a `list_insights`/`get_insight` (no a `get_otd`) y que ofrece el `drillHref`.
5. Verificar `nexa_turn_telemetry.tools_used` registra los tools nuevos.
6. Monitor `nexa.turn.degraded_outcomes` 48h post-deploy.

### Out-of-band coordination required

N/A — repo-only change. Sin secrets, sin Azure/HubSpot/Notion, sin migración.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `get_insight({ insightId })` existe en `NEXA_TOOLS`, llama `readNexaInsightDrill` con el subject del turno, y devuelve summary es-CL + `raw.drillHref` para `current`; gap honesto para `superseded|expired|not_found|degraded`.
- [ ] `list_insights({ periodYear?, periodMonth?, scope? })` existe, llama `listNexaInsightsForPeriod`, devuelve los insights del período severity-ordered con `drillHref` por item; `empty-positive` → mensaje honesto.
- [ ] Ambos tools reusan el subject anti-oracle de los readers — persona `client` NUNCA ve insights internos; persona `collaborator` solo ve los suyos (verificado por test).
- [ ] El system prompt V2 declara la superficie Insights y rutea: advisory → tools nuevos, dato vivo → `get_otd`, definición → `search_knowledge`. Version bumpeada + golden snapshot actualizado.
- [ ] `pnpm nexa:doc-gate --changed` verde (capas `behavior/` + `system-prompt/` sincronizadas).
- [ ] El deep-link sale de `buildNexaInsightDrillHref` (no ruta compuesta a mano).
- [ ] Cero query directo a `ico_ai_signal_enrichments`/`ico_ai_signals` desde los tools.

## Verification

- `pnpm vitest run src/lib/nexa` (+ `src/lib/knowledge` si toca el subject pattern)
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm nexa:doc-gate --changed`
- `pnpm qa:nexa-knowledge` (voz/ruteo)
- Smoke multi-persona con agent-session (collaborator + client) en staging
- Ejercicio real del chat flotante (tool card del insight + deep-link)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con lo implementado/verificado
- [ ] `changelog.md` actualizado (nuevo comportamiento del chat)
- [ ] chequeo de impacto cruzado (Slice 2/3 del bridge referenciados)
- [ ] capas `nexa-intelligence/` sincronizadas + doc-gate verde
- [ ] `pnpm test` (full) + `pnpm build` antes de mover a `complete/` (Task Closing Quality Gate)

## Follow-ups

- Bridge Slice 2: `focusRef` en `NexaRuntimeContext` + CTA "Pregúntale a Nexa sobre este insight" desde `/nexa/insights` (conciencia de superficie).
- Bridge Slice 3: cross-citación `drillDown` desde la respuesta del chat hacia el detalle del insight.
- Bridge Slice 4 (requiere ADR propio): acción gobernada sobre insight (acknowledge/snooze/assign) vía propose→confirm→execute.
- Señal de drift candidata: "Nexa citó un insight inexistente/expirado" (diferida hasta evidencia de runtime).

## Open Questions

- ¿Existe ya un builder reusable del subject de insights desde `NexaRuntimeContext`, o hay que extraer uno (mirror del de knowledge)? `[verificar en Discovery]`
- ¿El ruteo del prompt hacia los tools nuevos debe quedar detrás de un flag default-OFF con golden shadow, o cutover inmediato (additive)? Decisión de review.
