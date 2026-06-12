# TASK-1086 — Greenhouse MCP Knowledge Resources V1

## Delta 2026-06-12 — CIERRE (complete; código ya en `origin/develop`)

El "push held" del Delta de implementación quedó **obsoleto**: los commits `c72958575` (Slice 1) + `cebf75bd3` (Slices 2-3) **ya están en `origin/develop`** (entraron en un release posterior; `HEAD == origin/develop`). Cierre documental ejecutado hoy:

- **CLAUDE.md** — invariante dedicado "Knowledge MCP / ecosystem lane invariants (TASK-1086)" (default-DENY scope `internal`, anti-oracle 404, read-only/no-invención, `isDocumentAgenticallyVisible` local en sync con el `WHERE` agéntico, cero subject-builder paralelo).
- **Deltas de arquitectura** — ya presentes y verificados: `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1` Delta 2026-06-12 (lane ecosystem de Knowledge) + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1` Delta 2026-06-12 (Consumo MCP).
- **Manual de uso** — `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md` sección "7. Conocimiento (Knowledge)": 2 tools + resource + reglas (no-invención, scope internal, read-only) + referencia técnica.
- **Doc funcional** — `docs/documentation/plataforma/knowledge-platform.md` ya cubre MCP (contrato compartido, dos preguntas separadas, feedback).
- **README + TASK_ID_REGISTRY** — flip `to-do`/`in-progress` → `complete`; path a `complete/`.
- **Verificación de cierre**: 17 tests focales (ecosystem builder + MCP knowledge/tools) verdes en el WT actual; código sin cambios desde el commit verificado (tsc=0, lint=0, 29 tests + smoke live PG en el Delta de implementación).

**Pendiente operativo (post-deploy, no bloquea complete — patrón 1085/1091/1094)**: smoke MCP **end-to-end** contra staging requiere un binding `sister_platform_consumers` con `greenhouse_scope_type='internal'` (artefacto operador-configurado) + la URL `.vercel.app`. El smoke a nivel builder (PG live) ya está verificado; el transporte HTTP del MCP está cubierto por los 18 tests del `http-client`/`tools`.

## Delta 2026-06-12 — IMPLEMENTACIÓN (code-complete local, verificada; push held)

Implementadas las 3 slices del plan corregido (commits LOCAL en `develop`; push held por WIP de Codex en el WT — ver abajo). Read-only, scope-gated.

- **Slice 1 — Ecosystem-lane knowledge endpoints** (commit `c72958575`):
  - `src/lib/api-platform/resources/ecosystem-knowledge.ts`: `getEcosystemKnowledgeSearchPayload` (→ `searchKnowledge({ mode:'agentic' })`) + `getEcosystemKnowledgeDocumentPayload` (read-detail anti-oracle 404). Cero lógica de dominio nueva — reusa el SSOT + readers del store.
  - `buildEcosystemKnowledgeSubject`: deriva el `KnowledgeSearchSubject` del binding sister-platform. Governance gate **default-DENY**: solo `greenhouseScopeType==='internal'` (corpus interno-only) → si no, `403 scope_not_allowed`.
  - `isDocumentAgenticallyVisible`: predicado **local** (mismo patrón que `HUMAN_VISIBLE_STATUSES` del lane app) que espeja el filtro agéntico del SQL (`published`/`stale` + `agent_allowed` + `sensitivity='internal'` + audience interno). Se mantuvo local — el intento de exportarlo desde `search-knowledge.ts` fue revertido 2× por el WT churn de Codex; local es robusto + sin colisión.
  - 2 rutas `GET /api/platform/ecosystem/knowledge/{search,documents/[id]}` vía `runEcosystemReadRoute`.
- **Slices 2-3 — MCP client + tools + resource** (commit `cebf75bd3`):
  - `http-client.ts`: `searchKnowledge` + `getKnowledgeDocument` (hacia los endpoints ecosystem).
  - `tools.ts` + `server.ts`: 2 tools (`search_knowledge`, `get_knowledge_document`) con descripción que instruye no-invención (`confidence='none'`) + el resource addressable `greenhouse://knowledge/document/{id}`.
- **Decisiones de scope** (vs el audit): `get_knowledge_citations` **descartado** (redundante con el packet + read-detail); resource `source/{id}` y `runbook/{slug}` **diferidos** (un `source/{id}` expone config de ingesta sin valor para un agente; V1 = `document/{id}`).
- **Verificación**: tsc=0, lint=0; **29 tests focales** (11 ecosystem builder + predicado · 18 MCP, 5 archivos); **smoke live PG** del builder: binding interno recupera 4 chunks reales con citas+score (confidence=high), binding client → `scope_not_allowed`, read-detail → doc + 49 secciones.
- **Push HELD** (protocolo multi-agente, sin stash): Codex está activo en la 2da mitad de 1085 en el mismo WT y el pre-push hook corre sobre todo el árbol. NO se pushea hasta que el WT quede limpio. El WT churn de Codex (git clean/checkout) **revirtió 2× archivos míos untracked** (rutas + edits a `search-knowledge.ts` + el lifecycle move) → de ahí el patrón **commit-inmediato por slice**: lo commiteado sobrevive, lo untracked se wipea.
- **Pendiente de cierre** (cuando el WT esté limpio + push): mover a `complete/`, sync README/registry, Handoff, changelog, Deltas en `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1` (lane ecosystem de knowledge) + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1`, CLAUDE.md invariant, doc funcional + manual (acceso MCP a knowledge), y **smoke del path MCP end-to-end** (requiere un binding sister-platform `internal` + dev server) en staging.

## Delta 2026-06-12 — AUDIT ARQUITECTÓNICO (arch-architect + Full API Parity): el lane ecosystem de knowledge NO existe, hay que crearlo

Auditada contra el runtime real (post-1083/1085). **La task subestimaba el trabajo**: el Delta de abajo dice "el MCP lo envuelve en el lane ecosystem **sin lógica nueva**" — verificado contra el repo, eso es **inexacto**. Hallazgos:

1. **El MCP server consume EXCLUSIVAMENTE el lane `ecosystem`.** `src/mcp/greenhouse/http-client.ts` solo llama `/api/platform/ecosystem/*` (machine-authed por binding de sister-platform). Lo confirmé: todos sus métodos (`context`, `organizations`, `capabilities`, `health`, `webhook-*`) van a `ecosystem`.
2. **Los endpoints `/api/platform/ecosystem/knowledge/*` NO existen.** En TASK-1083 construí solo el lane **`app`** (`/api/platform/app/knowledge/{search,documents,documents/[id],feedback}`, session-authed para la UI in-portal + Nexa). El directorio `ecosystem/` tiene `context/organizations/capabilities/health/webhook-*` — **cero knowledge**.
3. **Por lo tanto este task DEBE crear el lane ecosystem de knowledge primero** (no "solo mapear el cliente MCP"). Es **lógica de dominio cero** (reusa el SSOT `searchKnowledge` + los readers del store — la misma *parity seam* que el app lane), pero son **route handlers + resource builders NUEVOS** con auth de máquina y derivación de `subject` distinta. "Sin lógica de dominio nueva" ✓; "sin lógica nueva / solo client mapping" ✗.

### La decisión de diseño que la task glosaba: derivar el `subject` desde el binding (no hay sesión)

El app lane construye el `KnowledgeSearchSubject` desde un `TenantContext` (sesión: `tenantType` + `roleCodes` → capabilities vía `can()` — ver `buildKnowledgeSearchSubject` en `src/lib/api-platform/resources/app-knowledge.ts`). **El lane ecosystem NO tiene `TenantContext` ni roleCodes** — tiene un binding sister-platform (`external_scope` → `greenhouse_scope`, `allowedGreenhouseScopeTypes`). Entonces el resource builder ecosystem **deriva el subject desde el binding**:

- `tenantType: 'efeonce_internal'` (corpus MVP **solo interno**), `tenantId: null`, `roleCodes: []`, `routeGroups: []`.
- `capabilities: ['knowledge.agentic.retrieve']` (modo **siempre `agentic`** en MCP) — **otorgada SOLO si el binding está explícitamente autorizado para knowledge** (governance: default-DENY; exponer conocimiento interno a una plataforma hermana externa es un grant explícito, no implícito). Mecanismo V1: un `greenhouse_scope_type` de knowledge en `allowedGreenhouseScopeTypes` del consumer (o allowlist equivalente). Sin esa autorización → `403`/`scope_not_allowed` (el helper `runEcosystemReadRoute` ya lo enforce con `allowedGreenhouseScopeTypes`).
- **Defensa en profundidad:** aunque un binding quede autorizado, el reader en modo `agentic` ya excluye `agent_excluded`/`quarantined`/`restricted` y solo retorna `agent_allowed` interno. Un binding NUNCA ve docs sensibles. El grant es la primera capa; el filtro del reader es la segunda.

### Plan corregido (slices reordenadas) — ver Scope abajo

- **Slice 1 (el trabajo real):** crear los endpoints ecosystem `GET /api/platform/ecosystem/knowledge/search` + `GET /api/platform/ecosystem/knowledge/documents/[id]` vía `runEcosystemReadRoute`, con resource builders en `src/lib/api-platform/resources/ecosystem-knowledge.ts` que **reusan** `searchKnowledge` (agentic) + `getKnowledgeDocumentById`/`getKnowledgeDocumentVersion`/`getKnowledgeSourceById` del store, construyendo el subject desde el binding. Cero SQL/Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`).
- **Slice 2:** métodos en `src/mcp/greenhouse/http-client.ts` (`searchKnowledge`, `getKnowledgeDocument`) hacia esos endpoints + tipos en `types.ts`.
- **Slice 3:** registrar los **tools** (`search_knowledge`, `get_knowledge_document`) + los **resources** (`greenhouse://knowledge/document/{id}`, `greenhouse://knowledge/source/{id}`) en `tools.ts`/`remote.ts`/`server.ts` + tests (success, no-answer `confidence='none'`, stale-preservada, auth/scope error sanitizado, read-only boundary).

### `get_knowledge_citations` se descarta (redundante)

Las citas YA viajan en el packet de `search_knowledge` (`chunks[].citationLabel` + `humanUrl` + `freshness`) y en el read-detail de `get_knowledge_document` (secciones + versión). Un tercer tool/endpoint "citations" no retorna nada que esos dos no den → es un primitivo redundante (anti-patrón: no agregar un tool que duplica lo que otro ya devuelve). **V1 = 2 tools** (`search_knowledge` + `get_knowledge_document`). Si emerge una necesidad real de "solo las citas de un doc" sin el resto, se pliega como un campo del read-detail, no como endpoint nuevo.

### 4 pillars

- **Safety:** binding allowlist default-deny para knowledge + reader excluye restricted/quarantined/agent_excluded + read-only V1 + no SQL/Notion directo (lint) + no inferir tenant por nombre.
- **Robustness:** reusa el único path validado (`searchKnowledge` SSOT + store readers); errores sanitizados (`runEcosystemReadRoute` + `redactErrorForResponse`); no-answer honesto en `confidence='none'` (NUNCA inventa doc).
- **Resilience:** el lane ecosystem ya trae audit + manejo de error; observabilidad reusa las señales `knowledge.nexa.*` (retrieval) — el `knowledge.mcp.error_rate` del risk matrix se materializa como señal solo si hay un failure mode que las existentes no cubran (evaluar; no crear señal preventiva sin consumidor).
- **Scalability:** misma query FTS ya indexada (GIN); cero path nuevo de datos; el packet es bounded (limit 1..20).

### Resource URIs (corregido)

`greenhouse://knowledge/document/{id}` (backed por read-detail ✓) + `greenhouse://knowledge/source/{id}` (backed por `getKnowledgeSourceById` ✓). **`greenhouse://knowledge/runbook/{slug}` se difiere** — `getKnowledgeDocumentBySlug` existe, pero un resource slug-addressed no aporta sobre `document/{id}` en V1; agregar solo si un consumidor lo pide.

## Delta 2026-06-12 — desbloqueada por TASK-1083 (reader lane-agnóstico listo)

> ⚠️ **Corregido por el AUDIT de arriba:** la frase "sin lógica nueva" es engañosa. El reader SSOT es lane-agnóstico (cierto), pero los **endpoints ecosystem de knowledge no existen** — este task los crea (reusando el SSOT, sin lógica de dominio nueva, pero sí route handlers + resource builders + derivación de subject desde el binding). `get_knowledge_citations` se descarta (redundante con el packet + read-detail).

El reader SSOT `searchKnowledge` es **lane-agnóstico por diseño** (Full API Parity #4): recibe `subject`, no `request`. El MCP lo envuelve en el lane `ecosystem` (`/api/platform/ecosystem/knowledge/*`) reusando `searchKnowledge` (modo `agentic`) + los readers del store, NUNCA SQL directo ni Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`). El packet `knowledge-search.v1` ya trae todo lo que un agente necesita (citas, `humanUrl`, `freshness`, `confidence`, `deniedOrFilteredCount`). El filtrado agéntico (excluye `agent_excluded`/`quarantined`/`restricted`) ya está horneado en el reader.

## Delta 2026-06-11

Cerrado por **TASK-1080** (alineado, sin cambio estructural):

- MCP es downstream de la API Platform (TASK-1083); hereda el filtrado por `agentic_policy` — los resources/tools nunca exponen docs `agent_excluded` ni `quarantined`. Read-only V1, sin Notion directo, sin writes.
- Corpus MVP **solo interno**; la capability de retrieval agéntica es `knowledge.agentic.retrieve` (definida en TASK-1080 / sembrada en TASK-1081).

## Delta 2026-06-11 — Visual contract input from Answer Trace Studio

El mockup `/knowledge/mockup/answer-trace` incluye un modo `MCP` y una tarjeta de consumo machine con URI `greenhouse://knowledge/...`, packet versionado y disclosure para agentes. No implementa resources/tools MCP; fija la experiencia esperada cuando el MCP envuelva el reader de `TASK-1083`.

Implicaciones para esta task:

- Los resources/tools MCP deben devolver un mapping fiel del mismo `KnowledgeRetrievalPacket`, no una forma paralela.
- Las URIs `greenhouse://knowledge/...` deben ser estables, legibles y alineadas con los recursos documentados.
- El payload para agentes debe conservar confidence, freshness, citations, denied/filtered count y no-answer, sin exponer contenido `agent_excluded` ni `quarantined`.
- La UX humana ya muestra cómo auditar lo que consume un agente; MCP debe preservar esa trazabilidad para debugging y governance.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete 2026-06-12 — code en origin/develop; cierre documental hecho (CLAUDE.md invariant + Deltas arch + manual MCP + README/registry). Pendiente operativo post-deploy: smoke MCP e2e con binding internal en staging.`
- Rank: `TBD`
- Domain: `mcp|platform|api|content`
- Blocked by: `TASK-1083`
- Branch: `task/TASK-1086-mcp-knowledge-resources`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Exponer Knowledge Platform en Greenhouse MCP/webMCP como resources/tools read-only downstream de API Platform: buscar knowledge, obtener documento y recuperar citas. No debe leer SQL ni Notion directo.

## Why This Task Exists

La capa agéntica no es solo Nexa. Greenhouse MCP debe poder entregar conocimiento publicado a agentes externos/controlados sin duplicar lógica ni saltarse permisos. La arquitectura MCP exige que todo vaya downstream de API Platform.

## Goal

- Agregar MCP resources `greenhouse://knowledge/...`.
- Agregar tools read-only `search_knowledge`, `get_knowledge_document`, `get_knowledge_citations`.
- Mantener auth, tenancy, observabilidad y access policy via API Platform.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- MCP no se adelanta a API estable.
- MCP no lee SQL directo.
- MCP no lee Notion directo como bypass.
- V1 read-only.
- No inferir tenant por nombre del cliente.

## Normative Docs

- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/to-do/TASK-1085-nexa-knowledge-retrieval-citations.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` para API/search estable.

### Blocks / Impacts

- Habilita agentes MCP/webMCP a consultar knowledge publicado.

### Files owned

- `src/app/api/platform/ecosystem/knowledge/**` (rutas nuevas — Slice 1)
- `src/lib/api-platform/resources/ecosystem-knowledge.ts` (resource builders nuevos — Slice 1)
- `src/mcp/greenhouse/**` (http-client + tools + resources + tests — Slices 2-3)
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane ecosystem de knowledge)
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

### NO owned (reuso, no tocar)

- `src/lib/knowledge/**` (SSOT `searchKnowledge` + store readers — se consume, no se modifica)
- `src/app/api/platform/app/knowledge/**` (lane app de TASK-1083 — intacto)

## Current Repo State

### Already exists

- MCP server oficial en `src/mcp/greenhouse/**` (`http-client.ts` consume **solo** el lane `ecosystem`; `tools.ts`/`remote.ts`/`server.ts` + tests).
- Lane app de knowledge (`/api/platform/app/knowledge/*`, TASK-1083) + SSOT `searchKnowledge` lane-agnóstico + readers del store.
- Helper `runEcosystemReadRoute` + modelo de binding/scope (`allowedGreenhouseScopeTypes`).

### Gap

- **No existen los endpoints `/api/platform/ecosystem/knowledge/*`** (solo el lane app). El MCP no puede llamar lo que no existe → este task los crea (Slice 1) antes de mapear el cliente MCP.
- MCP no expone Knowledge Platform resources/tools.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

> **Reordenado por el AUDIT 2026-06-12.** El "API client mapping" original asumía endpoints que no existen. El trabajo real arranca creando el lane ecosystem de knowledge.

### Slice 1 — Ecosystem-lane knowledge endpoints (el trabajo real, downstream del SSOT)

- Resource builders en `src/lib/api-platform/resources/ecosystem-knowledge.ts`:
  - `getEcosystemKnowledgeSearchPayload(context, request)` → `searchKnowledge({ query, subject, mode: 'agentic' })`.
  - `getEcosystemKnowledgeDocumentPayload(context, documentId)` → `getKnowledgeDocumentById` + `getKnowledgeDocumentVersion` (secciones por `heading_path`), anti-oracle `notFound`/404 si no existe / no publicado / `agent_excluded`.
  - `buildEcosystemKnowledgeSubject(context)` → deriva el `KnowledgeSearchSubject` desde el binding (interno, `capabilities: ['knowledge.agentic.retrieve']` solo si el binding está autorizado; default-deny).
- Rutas `GET /api/platform/ecosystem/knowledge/search` + `GET /api/platform/ecosystem/knowledge/documents/[id]` vía `runEcosystemReadRoute` (espeja `ecosystem/organizations/route.ts`).
- Gate de governance: el binding necesita el `greenhouse_scope_type` de knowledge en `allowedGreenhouseScopeTypes`; sin él → `scope_not_allowed`. NUNCA SQL/Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`).

### Slice 2 — MCP http-client methods

- Agregar `searchKnowledge(input)` + `getKnowledgeDocument(id)` a `src/mcp/greenhouse/http-client.ts` (mismo patrón `this.request('/api/platform/ecosystem/knowledge/...')`) + tipos en `types.ts`. Preservar auth/config/apiVersion existente del MCP.

### Slice 3 — MCP tools + resources + tests

- Tools (V1 = **2**, `get_knowledge_citations` descartado por redundante): `search_knowledge`, `get_knowledge_document` en `tools.ts`/`remote.ts`/`server.ts`.
- Resources: `greenhouse://knowledge/document/{id}` + `greenhouse://knowledge/source/{id}` (`runbook/{slug}` diferido).
- Tests (`src/mcp/greenhouse/__tests__/**`): payload fiel del packet, no-answer (`confidence='none'` → no inventar doc), stale-preservada (`freshness`), auth/scope error sanitizado, read-only boundary.

## Out of Scope

- Writes MCP, Notion MCP bridging, OAuth multiusuario nuevo, embeddings, authoring/editing desde MCP.

## Detailed Spec

La tool `search_knowledge` debe devolver el mismo citation packet o un mapping fiel de API Platform. Los errores deben ser sanitizados y observables. Si el API devuelve `confidence='none'`, MCP no debe inventar un documento.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (crear endpoints ecosystem + resource builders) -> Slice 2 (http-client methods) -> Slice 3 (tools + resources + tests). **No MCP tool sin su endpoint ecosystem estable detrás** (el endpoint NO existe hoy — se crea en Slice 1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| MCP bypass de access policy | mcp/security | medium | downstream API only + tests | `knowledge.mcp.error_rate` |
| Tool devuelve docs stale sin metadata | mcp/content | low | preserve freshness fields | eval/manual smoke |

### Feature flags / cutover

- Puede quedar behind MCP config allowlist si el gateway lo soporta; V1 read-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert mapping | <10 min | sí |
| 2 | remove resources from registry | <10 min | sí |
| 3 | remove tools from registry | <10 min | sí |

### Production verification sequence

1. Unit tests MCP tools/resources.
2. Local `pnpm mcp:greenhouse` smoke.
3. Remote gateway smoke si aplica.
4. Docs closure.

### Out-of-band coordination required

- Ninguna salvo credenciales/gateway MCP si se valida remoto.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Existen los endpoints `GET /api/platform/ecosystem/knowledge/{search,documents/[id]}` vía `runEcosystemReadRoute`, reusando el SSOT `searchKnowledge` (agentic) + readers del store (cero lógica de dominio nueva).
- [ ] El `subject` se deriva del binding (interno, default-DENY); un binding sin autorización de knowledge recibe `scope_not_allowed`, no datos.
- [ ] MCP expone 2 tools (`search_knowledge`, `get_knowledge_document`) + resources (`document/{id}`, `source/{id}`) read-only downstream del lane ecosystem.
- [ ] No hay SQL directo ni Notion directo desde el lane ecosystem ni desde MCP (lint verde).
- [ ] Access/freshness/citations se preservan (mapping fiel del packet, no forma paralela); un doc `agent_excluded`/`quarantined`/`restricted` NUNCA aparece.
- [ ] Tests cubren success, no-answer (`confidence='none'`), stale y auth/scope error sanitizado.
- [ ] Documentación funcional/manual + API Platform arch (lane ecosystem de knowledge) actualizadas.

## Verification

- tests `src/mcp/greenhouse/**`
- smoke `pnpm mcp:greenhouse` si disponible
- `pnpm task:lint --task TASK-1086`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con MCP evidence.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre API Platform docs.

## Follow-ups

- Writes MCP solo con ADR/task separada.
