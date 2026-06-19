# TASK-1171 — Inclusión sistémica de cliente en ICO (data-driven + gobernada API/UI, full-api-parity)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- Backend impact: `api`
- Epic: `optional`
- Status real: `Fix sistémico: todo cliente (nuevo o existente) debe quedar ICO-completo sin código por-cliente, resoluble por API/UI (full-api-parity). Disparador: Grupo Berel sincroniza y entra al cálculo por-colaborador pero NO al rollup de cliente. Discovery verificado 2026-06-19 (código + data real). Urgente: cliente sin su vista ICO.`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability|platform`
- Blocked by: `Nada. M0/M1/M2 + pipeline de sync sanos. Esta task corrige el path de inclusión de cliente, no depende de TASK-1169/1170.`
- Branch: `task/TASK-1171-ico-client-inclusion-systemic`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-06-19 — Slice 1 implementado + recalibración de root cause (Discovery verificado)

**Corrección del root cause** (la spec asumía mal): `metrics_by_organization` **NO está hardcodeado a `{efeonce, sky}`** — es data-driven (`whereClause client_id IS NOT NULL`, GROUP BY client_id). El hardcode efeonce/sky existe **solo** en el **reporte de agencia** (`performance_report_monthly`, `materialize.ts:798`) — eso queda para Slice 2. La causa real de la ausencia de Berel en `metrics_by_organization`: el materializador corre **MERGE + incremental-delta** y el delta filter (`entity_last_edited >= deltaCutoff`) **excluye a una entidad nunca-materializada** (cliente nuevo cuya última edición quedó detrás del cutoff que avanza cada noche); como el MERGE no tiene WHEN NOT MATCHED BY SOURCE (correcto), tampoco hay nada que la inserte → exclusión **silenciosa y permanente**. Verificado contra BQ real: el SOURCE produce 3 clientes (Berel incluido), pero el rollup emite `rows_merged=2`.

**Slice 1 implementado (local-first, sin push):**
- **Fix de causa raíz (aditivo)** en `buildMergeSql` (`materialize-sql-builders.ts`): el delta source incluye también entidades **ausentes del target** para el período (`OR NOT EXISTS (cov …)`) → se insertan vía WHEN NOT MATCHED. Estrictamente aditivo (solo agrega la entidad que el bug saltaba; full-period byte-idéntico; ya-materializadas sin edición reciente preservadas). Aplica a los 5 rollups → cierra el mismo bug latente para un colaborador nuevo en `metrics_by_member`. **Self-healing**: el próximo run inserta a Berel, sin backfill ad-hoc. 27/27 tests verdes + validado contra BQ real (TASK-893): con cutoff que excluiría a Berel, el coverage-gap lo rescata (`entra_con_fix=true`).
- **Reliability signal** `delivery.ico.client_absent_from_org_rollup` (`ico-organization-rollup-coverage.ts`, kind `data_quality`, moduleKey `delivery`, steady=0) — defense-in-depth anti-exclusión-silenciosa. Verificado contra PG real: hoy detecta a Berel (`absent_count=1`); tras el fix → `ok`.

**Rollout Slice 1 VERIFICADO EN PRODUCCIÓN (2026-06-19):** push a develop → `ico-batch-deploy` workflow (revisión `ico-batch-worker-00166-98l`) → `gcloud scheduler jobs run ico-materialize-daily` → run 11:13 `rows_merged=3` (antes 2) → **Berel en `metrics_by_organization`** (otd 74.4%, 84 tareas) → `ops-reactive-organization` sincronizó la proyección PG → **signal `delivery.ico.client_absent_from_org_rollup` = `ok` (absent_count=0)**. Bug intermedio detectado y corregido contra el run real: la correlación `cov.<key>=<key>` sin calificar era no-op (BQ la resolvía a la tabla interna) → aliaseada como `grp` (`cov.<key>=grp.<key>`). Lección: el unit test (toContain) pasó pero solo el run real lo destapó.

**Slice 1b — Staleness del período vigente RESUELTA + VERIFICADA EN PROD (2026-06-19):** se descubrió que el incremental-delta no solo excluía entidades nuevas — también dejaba **STALE** a las existentes: efeonce/sky en el rollup junio mostraban OTD **1.5%/2.4%** (congelado al 06-01, 1-2 completadas) cuando el real era **89%/60%** (164/75 completadas) — **data de cliente gravemente incorrecta en vivo**. Fix de causa raíz en `runIcoMaterializerCycle` (`materialize-orchestrator.ts`): **el período EN CURSO siempre se materializa FULL** (`deltaCutoff=null`); el delta solo aplica a períodos cerrados/históricos. Reusa el path full-period existente, aplica a los 5 rollups, test no time-fragile. Rollout: deploy rev `ico-batch-worker-00167-tjq` → run 11:37 `notes='full period'` `rows_merged=3` → **efeonce 61.1% / sky 89.0% / Berel 77.3%, todos `materialized_at=11:37`** (BQ correcto). Proyección PG sincroniza vía outbox→reactive (16 eventos `ico.materialization.completed` pending → publisher cada 2min → `ops-reactive-organization`) — consistencia eventual normal. El dashboard/CVR de cliente (lee BQ directo) ya muestra los valores correctos.

**Slice 2 — Agency report DATA-DRIVEN, RESUELTO + VERIFICADO EN PROD (2026-06-19):** el reporte de agencia (`performance_report_monthly` scope='agency') estaba hardcodeado a `{efeonce, sky}` (en `buildAgencyReportScopeSql` + `isAgencyReportIncludedSpace` (shared.ts) + el filtro `segment_key IN ('efeonce','sky')` del materializador) → subcontaba la operación real (Pinturas Berel afuera). Fix **SSOT data-driven, ESCALABLE (cero código por cliente nuevo)**: los helpers incluyen TODO cliente/espacio real excepto demo; los 3 consumers (materializer/reader/diagnostics) quedan consistentes. Columnas `efeonce_tasks_count`/`sky_tasks_count` preservadas (legacy aditivo). Deploy rev `ico-batch-worker-00168-bp9` → run 12:05 → **agency jun: total_tasks 610→694, task_mix 2→3 segmentos (Berel incluido)**. Validado vs BQ que un cliente nuevo entra solo. Follow-up cosmético: el label de Berel en task_mix sale como space_id (la tabla BQ `greenhouse.clients` no resolvió `client_name`) — no afecta conteo.

**Slice 3 — enable-client-ICO-sync GOBERNADO (Full API Parity), CODE-COMPLETE + command verificado E2E (2026-06-19):** activar el sync Notion→ICO de un cliente deja de ser admin-coarse (`/api/integrations/notion/register`, gate `EFEONCE_ADMIN`, sin capability/audit/outbox) y pasa a una acción **gobernada, idempotente, auditada y escalable** (cero código por cliente nuevo), base para que Nexa la opere. Entregado:
- **Capability** `delivery.ico.sync.enable` (catalog `entitlements-catalog.ts` + grant `runtime.ts` EFEONCE_ADMIN ∪ EFEONCE_OPERATIONS ∪ EFEONCE_ACCOUNT + seed `capabilities_registry` migración `20260619122238123`, todo mismo PR; `capability-grant-coverage.test` verde).
- **Command** transport-agnóstico `enableClientIcoSync` (`src/lib/ico-engine/enable-client-ico-sync.ts`): `can()` + resolución client/space + tx `FOR UPDATE` + flip `sync_enabled=TRUE` + outbox `space_notion_source.ico_sync_enabled` (on-transition) + BQ MERGE idempotente (mirror register) con graceful-degrade (PG autoritativo; fallo BQ → `bigQueryReplicated=false` + captureWithDomain). Consumible por endpoint/Nexa/MCP/CLI.
- **Endpoint** thin `POST /api/delivery/ico/enable-sync` (`requireInternalTenantContext` + command).
- **Errores canónicos** es-CL: `ico_sync_client_not_found`, `ico_sync_source_not_connected`.
- **Verificación:** migración aplicada a dev DB; command E2E contra DB real sobre Berel → ok, alreadyEnabled=true; BQ MERGE SQL dry-run válido; 303 tests focales verdes (incl. grant coverage + command denial/idempotencia/BQ-degrade) + tsc + lint limpios; **endpoint VERIFICADO LIVE en staging (POST autenticado sobre Berel → 200 `{ok:true, alreadyEnabled:true}`)** — path gobernado completo (agent auth → requireInternalTenantContext → can() → command → resuelve Berel → idempotente).
- **Hallazgo arquitectónico (→ Slice 4):** `bigQueryReplicated=false` en staging confirma que el runtime Vercel tiene BQ read pero **no write** (regla canónica: no BQ writes desde route handlers Vercel). El MERGE inline degrada graceful (PG autoritativo). El command YA emite el outbox `space_notion_source.ico_sync_enabled`; la propagación a BQ (necesaria para que un cliente NUEVO sea tomado por el pipeline) debe hacerla un **reactive consumer desde ops-worker** (que sí tiene BQ write). Berel sin impacto (su fila BQ ya está TRUE).

**Slice 4 — Reactive consumer outbox→BQ (cierra el onboarding ICO escalable), RESUELTO + deployado (2026-06-19):** la propagación a BigQuery del flip `sync_enabled` salió del command (runtime Vercel = BQ read-only) y pasó a un **reactive consumer canónico desde ops-worker** (BQ write). Entregado:
- **Projection** `space_notion_source_ico_sync_bq` (`src/lib/sync/projections/space-notion-source-ico-sync-bq.ts`, domain `delivery`, trigger `space_notion_source.ico_sync_enabled`): re-read PG por `source_id` (canonical TASK-771, no confía el payload) + MERGE `space_notion_sources` a BQ, idempotente por `space_id`, retry/dead-letter (maxRetries 3). Registrada en `projections/index.ts` (scheduler `ops-reactive-delivery` */5).
- **Command** `enableClientIcoSync`: removido el MERGE inline (Vercel no escribe BQ); ahora PG flip + outbox; outcome `bigQueryReplicated`→`bigQuerySyncQueued`. SSOT: el worker es el único que escribe BQ.
- **End-to-end del cliente NUEVO cerrado:** enable gobernado → outbox → reactive (ops-worker) → BQ `space_notion_sources` → pipeline Notion→BQ lo toma → materializer (data-driven, Slice 1) → rollup/agency (Slice 2). Cero código por cliente.
- **Verificación:** tests del consumer (contract/extractScope/refresh-MERGE/no-op/throw) + command actualizado verdes; tsc+lint+`worker:runtime-deps-gate` limpios; **ops-worker deploy `success`** (el consumer carga en el runtime del worker) + `ops-reactive-delivery` disparado sin error; BQ write del worker probado por construcción (corre el materializer ICO a diario). **Transición live no exercisable hoy:** el único `space_notion_sources.sync_enabled=FALSE` es **Greenhouse Demo** (prohibido activar por CLAUDE.md); los 3 clientes reales ya están TRUE. El path se ejecutará en el próximo onboarding real (cero código). Cierra el hallazgo de Slice 3.

**Slice 5 — verify-ICO preflight GOBERNADO ("configurado ≠ fluyendo"), RESUELTO + reader verificado E2E (2026-06-19):** la mitad "verify" de Slice 3 — read gobernado Nexa-operable "¿está calculando ICO el cliente X?" + fuente de datos para la UI. Entregado:
- **Capability** `delivery.ico.sync.read` (catalog + grant `runtime.ts` route_group internal ∪ EFEONCE_ADMIN + seed `capabilities_registry` migración `20260619133753393`, mismo PR; coverage test verde).
- **Reader** `getClientIcoSyncStatus` (`src/lib/ico-engine/get-client-ico-sync-status.ts`): escalera `not_connected → connected_not_enabled → enabled_not_calculating → calculating` (PG `space_notion_sources` para connected/enabled/lastSyncedAt + BQ `metric_snapshots_monthly` per-cliente para calculating + otd/tasks del período). Honest degradation: `calculating=null` si BQ falla (no inventa). Transport-agnóstico (endpoint/Nexa/MCP/CLI).
- **Endpoint** thin `GET /api/delivery/ico/sync-status?clientId=|spaceId=` (`requireInternalTenantContext` + reader).
- **Verificación E2E contra DB+BQ reales:** Berel → `calculating` (84 tasks, OTD 77.3%, lastSynced real); **Demo → `connected_not_enabled`** (detección exacta "configurado ≠ fluyendo"); inexistente → `ico_sync_client_not_found`. 19 tests focales + tsc + lint verdes. El BQ **read** funcionó local → confirma que solo el write está restringido a workers (valida la arquitectura de Slice 4). **Endpoint pendiente de promoción del build Vercel** (cola de builds; mismo patrón thin que el endpoint de Slice 3 ya verificado live).

**Estado sistémico:** la inclusión ICO de clientes es ahora **100% data-driven + gobernada + escalable** (cálculo, agency, freshness, activación gobernada, propagación reactiva a BQ, preflight verify) — un cliente nuevo entra sin tocar código. (Staleness: Slice 1b. Agency: Slice 2. Enable-sync: Slice 3. Propagación BQ: Slice 4. Verify preflight: Slice 5.)

**Pendiente (follow-up, requiere GVC loop):** UI affordance (surface interna que liste el estado ICO por cliente + botón activar, consumiendo `GET /sync-status` + `POST /enable-sync`) — es trabajo UI con su propio loop de diseño/GVC; conviene task UI dedicada. Follow-up cosmético: label de Berel en task_mix (BQ `greenhouse.clients` no resuelve `client_name`).

## Summary

Hacer que **cualquier cliente — nuevo o existente — quede ICO-completo automáticamente**, sin parche por-cliente, resoluble por **API o UI** (Full API Parity). El rollup de cliente `metrics_by_organization` excluía **silenciosamente** a clientes nuevos por el coverage-gap del incremental-delta (ver Delta 2026-06-19; **NO** era hardcode — eso es solo el reporte de agencia). Además, el wizard deja `sync_enabled=FALSE` sin una vía gobernada para prenderlo, y el lifecycle/preflight de onboarding **no verifica que ICO calcule** (para en la capa portal).

Esta task: (1) vuelve **data-driven** el rollup de cliente + reporte de agencia (sin allowlist), (2) agrega un **reliability signal** anti-exclusión-silenciosa, (3) expone una **capability + endpoint (+ affordance UI)** gobernada para habilitar el sync de un cliente, (4) extiende el **preflight/lifecycle** con "ICO calculando" (configurado ≠ fluyendo), y (5) hace **backfill data-driven** de clientes ya onboardeados (Berel). NO toca el bono (ya incluye a todos los clientes por colaborador — verificado).

## Why This Task Exists

Discovery verificado 2026-06-19 (código + data real, ADC live):

- **Berel está sano hasta el snapshot:** cliente activo, `space_notion_sources.sync_enabled=TRUE` + token, 108 tareas en portal PG, 92 en `v_tasks_enriched` (con `client_id` stampeado), 84 en `delivery_task_monthly_snapshots` jun-2026.
- **El rollup de cliente lo excluye silenciosamente:** `metrics_by_organization` jun-2026 corre cada noche (`status=succeeded`) pero emite **`rows_merged=2`** (solo efeonce/sky) aunque la fuente tiene 3 clientes. No es sync/config/frescura/trigger — es una **restricción hardcode efeonce/sky** en el path del rollup (mismo patrón que webhook capture, RPA/FTR writeback y `performance_report_monthly`).
- **El bono NO está afectado** (verificado con cálculo con/sin Berel: Maggie OTD almacenado 66.7% = con-Berel, sin-Berel sería 56.0%; Daniela 99.1% = con-Berel). El materializador de miembro es data-driven sin filtro de cliente → todas las métricas por colaborador ya incluyen Berel. El defecto es la **vista de cliente**.
- **Full API Parity roto:** la única vía para `sync_enabled=TRUE` es el endpoint manual `register` (admin-coarse, sin capability fina); el wizard deja FALSE; no hay paso de lifecycle que garantice "ICO calculando".

Es deuda sistémica: cada cliente nuevo repite el problema. Hay que cerrarlo en la plataforma, no por cliente.

## Goal

- `metrics_by_organization` + `performance_report_monthly` + CVR/account-360 **data-driven por `client_id`** (cero allowlist efeonce/sky).
- **Reliability signal** `delivery.ico.client_in_snapshot_absent_from_rollup` (o equivalente): cliente con tareas en snapshot pero sin fila en el rollup → nunca más silencioso.
- **Capability + endpoint gobernado** para habilitar/verificar inclusión ICO de un cliente (no admin-coarse), **Nexa-operable**: consumible por UI (wizard/lifecycle), **Nexa** (enable-sync vía `propose → confirm → execute`; verify-ICO read directo), API Platform (app/ecosystem → MCP), CLI/runbook. Mismo command canónico para todos los consumers (ver `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` §North Star + §Canonical consumers).
- **Preflight + checklist de lifecycle** extendidos: `verify_ico_calculating` (configurado ≠ fluyendo hasta ICO).
- **Backfill data-driven** de clientes existentes (Berel) — re-materializar, sin script ad-hoc por cliente.
- **NO tocar el bono** (ya incluye a todos los clientes por colaborador).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — lifecycle orchestrator + onboarding checklist (TASK-991/992/1001/1009/1017).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — toda acción gobernada por contrato, no UI-only.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability nueva + grant coverage (mismo PR).
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — boundary Notion=OS / GH=motor + registry `space_notion_sources`.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — VIEW/helper/signal + capability⇒grant + flag default-OFF.
- Skills al tomar: `greenhouse-ico`, `arch-architect`, `greenhouse-backend`, `greenhouse-postgres`, `notion-platform`, `greenhouse-ux` (para la affordance).

Reglas obligatorias:

- **NUNCA** reintroducir allowlist `{efeonce, sky}` en el path de cálculo de cliente — data-driven por `client_id`.
- **NUNCA** dejar una exclusión de cliente silenciosa — debe emitir reliability signal (regla ICO "reliability signal upstream").
- **NUNCA** habilitar el sync de un cliente por una acción admin-coarse sin capability fina (full-api-parity) — capability + grant coverage en el mismo PR.
- **NUNCA** tocar el bono / `calculateOtdBonus` / el materializador de miembro (ya es data-driven e incluye todos los clientes — verificado).
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.
- **SIEMPRE** que se seedee la capability nueva, granteear-la a ≥1 rol real + actualizar coverage test (TASK-873/935).

## Normative Docs

- `docs/architecture/metrics/OTD_V1.md` (cohorte cliente).
- `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (checklist).

## Dependencies & Impact

### Depends on

- Pipeline de sync sano (`space_notion_sources.sync_enabled`, conformed, materializador) — ya existe.
- Materializador de miembro data-driven (ya existe; modelo a espejar).

### Blocks / Impacts

- Desbloquea la **vista de cliente ICO** (dashboard/CVR) para Berel y todo cliente futuro.
- No impacta el bono (verificado). No depende de TASK-1169/1170 ni los bloquea.

### Files owned

> Estimado — `[verificar]` cada path durante Discovery al tomar la task.

- `src/lib/ico-engine/materialize.ts` — quitar allowlist del rollup org + reporte de agencia (`buildAgencyReportScopeSql`, `WHERE segment_key IN ('efeonce','sky')`) — MODIFY
- `src/lib/ico-engine/shared.ts` — `AGENCY_REPORT_SCOPE_*` constants / segment logic data-driven — MODIFY
- `src/lib/reliability/queries/` — signal cliente-ausente-del-rollup — NEW
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability nueva + grant — MODIFY
- `src/app/api/admin/clients/lifecycle/**` o `src/app/api/integrations/notion/**` — endpoint gobernado enable-sync/verify-ICO — NEW/MODIFY
- `src/lib/integrations/notion-onboarding-preflight.ts` — check ICO calculando — MODIFY
- `src/lib/client-lifecycle/**` + migration seed checklist — item `verify_ico_calculating` — MODIFY/NEW
- `src/lib/client-onboarding/notion-connect-store.ts` — gap `sync_enabled=FALSE` (resolver default o vía lifecycle) — MODIFY
- UI: `ClientOnboardingView.tsx` / `LifecycleTimeline.tsx` — affordance (puede ser follow-up)
- `performance_report_monthly` schema (si cambian columnas `efeonce_tasks_count`/`sky_tasks_count` → estructura por-segmento) — MODIFY

## Current Repo State

### Already exists (verificado)

- Materializador de **miembro** data-driven (sin filtro cliente) — modelo a espejar.
- Rollup de **organización** `METRICS_BY_ORGANIZATION_CONFIG` con `whereClause: client_id IS NOT NULL` pero **emite solo 2 clientes** (restricción efectiva a pinpointear: source SQL / scope / snapshot).
- `space_notion_sources` registry + `sync_enabled` gate + endpoint `register` (TRUE) vs wizard (FALSE).
- Preflight `notion-onboarding-preflight.ts` (9 checks hasta portal PG) + checklist lifecycle (hasta `verify_notion_flowing`).
- Capabilities `client.lifecycle.*` (sin `integration.*`/`ico.*`).

### Gap

- Hardcode `{efeonce, sky}` en rollup org + agency report + CVR scope.
- Exclusión de cliente silenciosa (sin signal).
- Sin capability/endpoint/UI gobernado para enable-sync/verify-ICO.
- Lifecycle/preflight no llegan a ICO.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (additive + data-driven; NO toca el bono)
- Impacto principal: `api` (capability+endpoint) + `reader`/materializer (data-driven) + `migration` (checklist seed)
- Source of truth afectado: `metrics_by_organization` / `performance_report_monthly` (vista de cliente) + `space_notion_sources.sync_enabled`
- Consumidores afectados: dashboard/CVR de cliente, account-360, reporte de agencia, **Nexa** (read del ICO de cliente + enable-sync gobernado), MCP/app lanes, CLI/runbook
- Runtime target: `production` (additive, sin tocar nómina)

### Contract surface

- Contrato existente a respetar: materializador de miembro + `calculateOtdBonus` (NO se tocan)
- Contrato nuevo: capability `integration.notion.sync.enable` (o `client.lifecycle.enable_ico`) + endpoint; signal nuevo; checklist item nuevo
- Backward compatibility: `compatible` (data-driven amplía cobertura; no remueve efeonce/sky)
- Full API parity: la acción enable-sync/verify-ICO existe como capability+endpoint, no solo UI

### Data model and invariants

- Entidades: `metrics_by_organization`, `performance_report_monthly`, `space_notion_sources`, checklist lifecycle
- Invariantes:
  - cálculo de cliente data-driven por `client_id` (sin allowlist)
  - toda exclusión de cliente emite signal (no silenciosa)
  - el bono no cambia (materializador de miembro intacto)
  - capability nueva ⇒ grant a ≥1 rol + coverage test (mismo PR)
- Tenant/space boundary: per-cliente vía `client_id`/`space_id`; capability tenant-safe
- Idempotency/concurrency: materializador idempotente (MERGE); enable-sync idempotente
- Audit/outbox/history: signal + audit del enable-sync; append-only checklist

### Migration, backfill and rollout

- Migration posture: `additive` (checklist seed + capability seed; cambios de materializador son SQL data-driven)
- Default state: capability default según rol; signal steady=0
- Backfill plan: re-materializar `metrics_by_organization` para clientes existentes (Berel) — data-driven, sin script por-cliente; verificar CVR
- Rollback path: revert PR (data-driven es additive; si rompe, vuelve a la cobertura previa) + flag si se gatea
- External coordination: ninguna que toque nómina; confirmar token-per-space del repo hermano `notion-bigquery` para el default de `sync_enabled` (ver Open Questions)

### Security and access

- Auth/access gate: capability fina nueva (reemplaza admin-coarse del enable-sync)
- Sensitive data posture: métrica de cliente (no PII directa); el bono no se toca
- Error contract: `canonicalErrorResponse` + `captureWithDomain`
- Abuse/rate-limit posture: N/A (acción de onboarding gobernada)

### Runtime evidence

- Local checks: tests del rollup data-driven + capability coverage test + preflight
- DB/runtime checks: tras backfill, `metrics_by_organization` tiene Berel jun-2026; CVR de Berel renderiza; signal=0
- Integration checks: enable-sync vía API + UI end-to-end en staging
- Reliability signals/logs: `delivery.ico.client_in_snapshot_absent_from_rollup`
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Rollup de cliente + reporte de agencia + CVR data-driven (Berel y cualquier cliente aparecen).
- [ ] Signal anti-exclusión-silenciosa wired, steady=0.
- [ ] Capability+endpoint gobernado enable-sync/verify-ICO (full-api-parity) + grant coverage.
- [ ] **Full API Parity verificado (base):** enable-sync/verify-ICO + el read de ICO de cliente existen como contrato gobernado a nivel capability (un command/reader canónico, sin lógica duplicada para la UI). Como consecuencia, Nexa y todos los consumers lo operan por construcción (enable-sync write vía `propose→confirm→execute`) — sin integración Nexa-específica.
- [ ] Preflight/lifecycle extendidos a ICO.
- [ ] Backfill Berel verificado; bono intacto (verificado).

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rollup de cliente data-driven + signal (UNBLOCK Berel — ship-fast)

Pinpoint el filtro efectivo efeonce/sky en el path del rollup org (source SQL / scope / snapshot) y volverlo **data-driven por `client_id`**. Agregar reliability signal `client_in_snapshot_absent_from_rollup`. **Backfill** re-materializando → Berel y todo cliente aparecen en `metrics_by_organization`. Verificar CVR/account-360 de Berel. **Esta slice resuelve la urgencia del día 19 para Berel.**

### Slice 2 — Reporte de agencia data-driven

Generalizar `performance_report_monthly` (`WHERE segment_key IN ('efeonce','sky')` + `buildAgencyReportScopeSql`) a N segmentos por `client_id` (el branch `client:<id>` + `task_mix_json` ya lo soportan). Reemplazar columnas fijas `efeonce_tasks_count`/`sky_tasks_count` por estructura por-segmento.

### Slice 3 — Capability + endpoint gobernado (full-api-parity)

Capability fina `integration.notion.sync.enable` (o `client.lifecycle.enable_ico`) + endpoint que habilita el sync de un cliente + verifica inclusión ICO, idempotente, auditado. Grant a ≥1 rol + coverage test. Reemplaza el admin-coarse del `register`. **Nexa-operable por contrato (mandato North Star):** el command se modela como aggregate/command canónico reutilizable por TODOS los consumers (UI, Nexa con `propose→confirm→execute`, MCP/app/ecosystem, CLI) — no un click-handler de la UI del wizard. Declarar el tool/contrato que Nexa invoca.

### Slice 4 — Preflight + lifecycle hasta ICO

Extender `notion-onboarding-preflight.ts` con check "ICO calculando" (cliente en `metrics_by_organization`/snapshot) + checklist item `verify_ico_calculating` (configurado ≠ fluyendo hasta ICO). Cerrar el gap `sync_enabled=FALSE` del wizard (default o vía lifecycle).

### Slice 5 — Affordance UI

Botón/estado gobernado en el wizard/lifecycle para enable-sync/verify-ICO, consumiendo el endpoint de Slice 3. (Puede separarse a TASK-1172 si se prefiere `ui-ux` puro — ver Hybrid Execution Justification.)

### Slice 6 — Docs

ADR/Delta de inclusión de cliente ICO + lifecycle + capability; CLAUDE.md (pointer); manual de onboarding.

## Hybrid Execution Justification

La task es mayormente `backend-data` (materializador, capability, endpoint, signal, preflight, backfill). La única parte `ui-ux` es la affordance (Slice 5), pequeña y cliente del endpoint de Slice 3. Se mantiene vertical porque el grueso es backend cohesivo y la UI es un thin client; si en Discovery la UI crece, separar Slice 5 a una task `ui-ux` dedicada (TASK-1172). Orden interno: 1→2→3→4→(5)→6.

## Out of Scope

- **El bono / cutover OTD** → TASK-1169/1170 (independiente; el bono ya incluye todos los clientes).
- RpA data-quality (Notion `Correcciones` vacío) → follow-up separado.
- Multi-cliente onboarding masivo / 3er+ cliente comercial → se beneficia, pero el flujo comercial es otra task.

## Detailed Spec

Root cause verificado: rollup de cliente emite `rows_merged=2` (efeonce/sky) con 3 clientes en la fuente → restricción hardcode. Fix = data-driven + signal (defense-in-depth anti-silencio) + gobernanza del enable-sync (full-api-parity) + lifecycle hasta ICO + backfill data-driven. El materializador de miembro (bono) ya es data-driven — espejar ese patrón en el de organización.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (unblock Berel + signal) primero — resuelve la urgencia. Luego 2 (agency report), 3 (capability/endpoint), 4 (preflight/lifecycle), 5 (UI), 6 (docs).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Romper rollup efeonce/sky al generalizar | delivery | media | data-driven amplía, no remueve; test de paridad efeonce/sky pre/post | signal rollup |
| Re-exclusión silenciosa futura | delivery | media | reliability signal obligatorio | `client_in_snapshot_absent_from_rollup` |
| enable-sync sin gobernanza | platform | media | capability fina + grant coverage test | coverage test CI |
| Tocar el bono por error | payroll | baja | hard rule: no tocar materializador de miembro; gate vitest payroll | vitest payroll |

### Feature flags / cutover

- Slice 1 es additive (data-driven). Si se quiere de-risk, gatear el cambio del rollup detrás de flag default-ON con rollback a allowlist. Capability default-OFF hasta grant.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (vuelve a allowlist) | <15 min | sí |
| 2 | revert PR | <15 min | sí |
| 3 | revert PR (capability+endpoint additive) | <15 min | sí |
| 4 | revert PR (checklist additive) | <10 min | sí |
| 5 | revert PR (UI) | <10 min | sí |
| 6 | revert doc | inmediato | sí |

### Production verification sequence

1. Slice 1 en staging → re-materializar → Berel en `metrics_by_organization` + CVR renderiza + efeonce/sky sin cambios (paridad) + signal=0.
2. Prod: deploy + re-materializar + verificar Berel + monitor signal.
3. Slices 3-4: enable-sync vía API + UI end-to-end en staging con un cliente de prueba.

### Out-of-band coordination required

- Confirmar con el repo hermano `notion-bigquery` el estado del token-per-space (define si el wizard puede defaultear `sync_enabled=TRUE`).
- Comms: la vista de cliente ICO de Berel se habilita; el bono no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `metrics_by_organization` incluye Berel (y cualquier cliente con data) jun-2026 tras backfill.
- [ ] Reporte de agencia + CVR data-driven (N clientes, no 2).
- [ ] Reliability signal anti-exclusión-silenciosa wired, steady=0, visible en `/admin/operations`.
- [ ] Capability+endpoint gobernado enable-sync/verify-ICO + grant a ≥1 rol + coverage test verde.
- [ ] Preflight + checklist con `verify_ico_calculating`; gap `sync_enabled=FALSE` del wizard cerrado.
- [ ] Paridad efeonce/sky pre/post (no cambian sus números).
- [ ] Bono intacto (verificado: materializador de miembro no tocado; `pnpm vitest run src/lib/payroll` verde).
- [ ] `pnpm test` + `pnpm build` verdes.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` · `pnpm build`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` (gate: bono no afectado)
- BQ: `metrics_by_organization` con Berel post-backfill; paridad efeonce/sky.
- Capability coverage test (TASK-873/935).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-991/992/1001/1009/1017/1169/1170)
- [ ] CLAUDE.md pointer + manual de onboarding

## Follow-ups

- RpA data-quality (Notion `Correcciones` vacío) — task separada.
- UI affordance como TASK-1172 si se separa el perfil `ui-ux`.

## Open Questions

- **¿`sync_enabled` default a TRUE en el wizard?** Depende del estado del token-per-space del repo hermano `notion-bigquery` (el comentario del wizard lo ata a eso). Confirmar antes de cambiar el default.
- **¿Slice 1 como hotfix separado** (data-driven + signal + backfill) para Berel-hoy, y Slices 3-5 (gobernanza/UI) como task mayor? Decisión del operador.
- **Nombre de la capability:** `integration.notion.sync.enable` vs `client.lifecycle.enable_ico` — definir con entitlements governance.
