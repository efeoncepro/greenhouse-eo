# Greenhouse — Nexa Insight ↔ Conversation Bridge Architecture V1

> **Tipo:** Spec de arquitectura (contrato agent-facing)
> **Estado:** Direction accepted (ver `GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md`). Slice 1 = TASK-1181.
> **Owner:** Nexa / Delivery (ICO) / Platform Architecture
> **Creado:** 2026-06-19
> **Domain boundary:** Delivery/ICO (lectura de insights) × Nexa (conversación). NO toca Payroll/Finance.

Esta spec describe **cómo** se implementa el bridge decidido en el ADR. El ADR tiene el *por qué* y las alternativas; esta spec tiene el mapa operativo, los contratos y las slices.

---

## 1. Estado actual (runtime verificado 2026-06-19)

Las dos superficies resuelven del mismo origen canónico pero no se conocen.

```
                         greenhouse_serving.ico_ai_signal_enrichments
                         (= "el insight": enrichment LLM de un AI signal ICO)
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              │                                                         │
   readNexaInsightDrill(id, subject)                          (NINGÚN tool del chat
   listNexaInsightsForPeriod(subject)                          lee insights por id/lista)
              │                                                         │
   /nexa/insights, /nexa/insights/[id]                        /api/home/nexa → NexaService
   (cap nexa.insights.read, anti-oracle)                      8 tools; solo get_otd toca ICO
              │                                                  (top-3 signals del org)
              └──────────────  SIN PUENTE BIDIRECCIONAL  ───────────────┘
```

**Hechos clave:**

- **Insight = enrichment row.** `NexaInsightDetailSnapshot` (`nexa-insight-drill-reader.ts`): `enrichmentId, signalId, signalType, metricName, severity, qualityScore, confidence, explanationSummary, rootCauseNarrative, recommendedAction, processedAt, spaceId, memberId, projectId, periodYear, periodMonth`.
- **IDs dispatch por prefijo:** `EO-AIS-*` (signal-anchored) · `EO-AIE-*` (enrichment-anchored) · `EO-AIH-*` (forense/history). Resuelto en `readNexaInsightDrill`.
- **Subject anti-oracle** (`subjectCanReadInsight`): tenant cliente → nunca; `efeonce_admin` o route-group `internal|finance|hr` → todos; resto → self-access por `member_id`. No-acceso → `not_found`, nunca 403.
- **Union honesto del drill:** `current | superseded | expired | not_found | degraded`.
- **Deep-link puro:** `buildNexaInsightDrillHref(id)` → `/nexa/insights/${id}` (client-safe, ya consumido por Home bento + weekly digest).
- **Chat backend:** `NexaService.generateResponse({ prompt, history, context, runtimeContext, requestedModel })`. `runtimeContext: NexaRuntimeContext` = identidad/tenant (`userId, clientId, tenantType, role, roleCodes, routeGroups, timezone, organizationId?, organizationName?, memberId?`). **Sin conciencia de superficie.**
- **Tool registry:** `NEXA_TOOLS` en `nexa-tools.ts`; cada tool tiene `isAvailable(tenant)` + `execute`. `get_otd` ya importa `readOrganizationAiSignals` + `readOrganizationAiLlmEnrichments`.
- **System prompt:** `nexa-system-prompt.ts` (V1 rollback + V2 modular, versionado, golden snapshot, doc-gate). **La palabra "Insights" no aparece.**
- **Persistencia:** `nexa_messages.tool_invocations` (qué tool corrió + raw) + `nexa_turn_telemetry` (tools usados, providers, latencias).

---

## 2. Diseño objetivo (TO-BE)

El bridge expone el reader del insight como tool y abre un canal de conciencia de superficie. Cuatro planos:

### 2.1 Plano 1 — Lectura insight-addressable (Chat → Insights) · TASK-1181

Dos tools nuevos en `NEXA_TOOLS`, ambos **wrappers finos** de los readers existentes (cero lógica de autorización nueva):

| Tool | Firma | Envuelve | `isAvailable` | Devuelve |
| --- | --- | --- | --- | --- |
| `get_insight` | `{ insightId: string }` | `readNexaInsightDrill(insightId, subject)` | mismo gate que `nexa.insights.read` derivado del tenant del turno | summary es-CL del insight (metric, severidad, causa raíz, recomendación) + `raw.insight` (el snapshot) + `raw.drillHref`. Estados `superseded/expired/not_found/degraded` → gap honesto. |
| `list_insights` | `{ periodYear?, periodMonth?, scope?: 'mine'|'all' }` | `listNexaInsightsForPeriod(subject, input)` | idem | summary de los N insights del período (severity-ordered) + `raw.insights[]` con `drillHref` por item. `empty-positive` → "sin insights en el período". |

**Construcción del subject:** se deriva del `runtimeContext` del turno (igual que hoy `search_knowledge` arma su `KnowledgeSearchSubject`). El subject que reciben los readers es el MISMO que usa la page server — una sola fuente de verdad de autorización.

**System prompt:** módulo nuevo (en `nexa-system-prompt.ts` V2, versionado) que declara:
- Que existe la superficie **Nexa Insights** (advisory de delivery: anomalías/predicciones/causa-raíz/recomendaciones sobre OTD/RpA/FTR).
- **Ruteo:** "por qué/qué pasó con OTD/RpA/FTR de un espacio/miembro/período" → `list_insights` / `get_insight`; "cuál es mi OTD ahora" (dato vivo) → `get_otd`; definición/proceso/política → `search_knowledge`.
- Que al citar un insight, ofrezca el deep-link (`raw.drillHref`).

Requiere: bump de `version` + entrada de changelog + `nexa-system-prompt.test.ts -u` + `pnpm nexa:doc-gate`.

### 2.2 Plano 2 — Conciencia de superficie (Insights → Chat) · Slice 2

- **Contrato:** campo opcional nuevo en `NexaRuntimeContext`:
  ```ts
  focusRef?: { kind: 'nexa_insight'; id: string }   // forward-compat: kind extensible
  ```
  Es **contexto, no permiso** — el gate sigue siendo subject + capability.
- **CTA:** en `NexaInsightDetailView` / `NexaInsightListItemCard`, un botón "Pregúntale a Nexa sobre este insight" abre el chat flotante con un prompt semilla + `focusRef={ kind:'nexa_insight', id }`. Reusa el hook de `NexaSuggestedPrompt.entityRef` (ya previsto forward-compat).
- **Comportamiento:** cuando hay `focusRef`, `NexaService` pre-resuelve el insight (vía `readNexaInsightDrill` con el subject del turno) y lo inyecta como contexto acotado del turno, de modo que la respuesta quede anclada al insight enfocado sin que el usuario tenga que pegar el id.

### 2.3 Plano 3 — Cross-citación (Answer → Insights) · Slice 3

- Cuando una respuesta de Nexa sobre delivery se apoya en un insight (vía `get_insight`/`list_insights`), emite una **acción `drillDown`** en el render plan / toolbar de la respuesta.
- La navegación es **host-side** (la primitive emite intent, el host resuelve la ruta): el host llama `buildNexaInsightDrillHref(id)` → `/nexa/insights/[id]`.
- Reusa el patrón de acciones del canvas (`NexaAnswersAction.intent = 'drillDown'`) + el deep-link puro. Cero ruta compuesta a mano.

### 2.4 Plano 4 — Acción gobernada sobre insight (Chat → write) · Diferido

- acknowledge / snooze / assign-recommendation modelados como acciones del registry (`src/lib/nexa/actions/registry.ts`) → propose→confirm→execute (TASK-1137).
- Gated por `NEXA_ACTION_RUNTIME_ENABLED` (default OFF) + ADR propio por tier de autonomía.
- **Boundary duro:** una acción sobre un `recommendation` NUNCA toca `payroll_entries`/`compensation_versions`/`final_settlements` ni recalcula métricas ICO.

---

## 3. Contratos afectados

| Contrato | Cambio | Slice |
| --- | --- | --- |
| `NEXA_TOOLS` (`nexa-tools.ts`) | +2 tools (`get_insight`, `list_insights`), wrappers de readers existentes | 1 |
| `nexa-system-prompt.ts` (V2, versionado) | +módulo "Nexa Insights routing"; bump version + golden snapshot | 1 |
| `NexaRuntimeContext` (`nexa-contract.ts`) | +`focusRef?` opcional (no rompe; aditivo) | 2 |
| `NexaSuggestedPrompt.entityRef` | consumido (ya existe forward-compat) | 2 |
| Render plan / `NexaAnswersAction` | acción `drillDown` host-resuelta vía `buildNexaInsightDrillHref` | 3 |
| `src/lib/nexa/actions/registry.ts` | +acciones insight (acknowledge/snooze/assign) | 4 |

**Sin migración de schema en V1 Slices 1–3.** La telemetría existente (`nexa_messages.tool_invocations`, `nexa_turn_telemetry`) ya cubre la auditoría.

---

## 4. Reliability / observabilidad

- Las llamadas a `get_insight`/`list_insights` quedan en `nexa_messages.tool_invocations` + `nexa_turn_telemetry.tools_used` — auditable por turno sin nuevo signal.
- Heredamos los signals de liveness del pipeline de insights (`nexa.insights.freshness`, `nexa.insights.no_new_signals_in_24h`) — el bridge no los toca.
- Señal de drift candidata (follow-up, no V1): "Nexa citó un insight inexistente / expirado" — detectable comparando `tool_invocations` con el estado del enrichment. Diferida hasta evidencia de runtime.

---

## 5. Roadmap por slices

| Slice | Alcance | Task | Profile | Riesgo |
| --- | --- | --- | --- | --- |
| **1** | Tools `get_insight`/`list_insights` + módulo de prompt + ruteo | **TASK-1181** | backend-data | Bajo (aditivo, sin schema/UI) |
| 2 | `focusRef` en runtimeContext + CTA "Pregúntale a Nexa" desde insight | (follow-up) | hybrid (backend + ui-ux) | Bajo-medio |
| 3 | Cross-citación: acción `drillDown` desde la respuesta | (follow-up) | ui-ux | Bajo |
| 4 | Acción gobernada sobre insight (acknowledge/snooze/assign) | (follow-up + ADR) | backend-data | Medio (write gobernado) |

---

## 6. Invariantes operativos para agentes

- **NUNCA** crear un chat/answer-surface dedicado a insights — el chat es cliente del reader canónico (`readNexaInsightDrill`/`listNexaInsightsForPeriod`).
- **NUNCA** queryear `ico_ai_signal_enrichments`/`ico_ai_signals` directo desde un tool de Nexa — pasar por los readers (subject anti-oracle reusado).
- **NUNCA** dejar que `focusRef` amplíe lo legible — es contexto, el gate es subject + capability.
- **NUNCA** que el LLM ejecute un write sobre un insight (Slice 4 = propose→confirm→execute).
- **NUNCA** una acción sobre `recommendation` toca payroll/compensation/finiquito ni recalcula métricas ICO.
- **NUNCA** editar el prompt inline en `nexa-service.ts` — módulo en `nexa-system-prompt.ts` versionado + golden snapshot + doc-gate.
- **SIEMPRE** emitir el deep-link vía `buildNexaInsightDrillHref` (no componer la ruta a mano).
- **SIEMPRE** que un tool nuevo lea un insight, derivar el subject del `runtimeContext` del turno (misma fuente que la page server).

---

## 7. Referencias

- Decisión (ADR): `GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md`
- Capa de insights: `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- Nexa runtime: `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `docs/architecture/nexa-intelligence/README.md`
- Parity: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Código: `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`, `nexa-insight-list-reader.ts`, `nexa-insight-href.ts`, `src/lib/nexa/nexa-tools.ts`, `nexa-system-prompt.ts`, `nexa-contract.ts`, `src/lib/nexa/actions/*`
