# TASK-1304 — Growth SEO: Site Audit (Queue+Poll) + Backlink Snapshot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations|data`
- Blocked by: `TASK-1299, TASK-1300, TASK-1303`
- Branch: `task/TASK-1304-growth-seo-site-audit-backlink-snapshot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la **capa de fundamentos técnicos + off-page** del módulo SEO: el **site audit** técnico vía DataForSEO **OnPage** y el **backlink snapshot** semanal vía DataForSEO **Backlinks**. OnPage es un provider **task-based ASYNC**, así que el audit se modela en **dos fases desacopladas**: un Cloud Scheduler `seo-audit-enqueue` (semanal) que crea la task OnPage y persiste su `provider_task_id` con `status=running`, y un `seo-audit-collect` (cada 30 min) que **poll-ea idempotente por `provider_task_id`** y materializa `seo_site_audit_runs` + `seo_site_audit_findings` cuando la task termina. El backlink snapshot es síncrono (`seo-backlink-capture` semanal → `seo_backlink_snapshots`). Expone los readers `readSiteAuditReport(targetId, auditRunId?)` y `readBacklinkProfile(targetId, { range })`, el command `queueSiteAudit(targetId, actor)`, y la signal `seo.audit.stuck_tasks`. Ambos providers (`onpage`, `backlinks`) corren detrás del **family registry de TASK-1300** (breaker + cost por familia). No incluye UI (TASK-1309).

## Why This Task Exists

El módulo SEO responde tres preguntas: dónde rankeas (rank tracking, TASK-1303), qué te enlaza (backlinks) y qué está roto técnicamente (site audit). Las dos últimas viven acá. Sin site audit no hay diagnóstico de indexabilidad, thin content, redirects rotos ni JSON-LD faltante — el input del pipeline de contenido del caso Berel. Sin backlink snapshot no hay perfil de autoridad ni digital-PR gap. El reto arquitectónico es que OnPage **no responde en el request**: es una task async que puede tardar minutos a horas según el tamaño del crawl. Meter eso en un Vercel route handler o en un cron síncrono revienta por timeout o cuelga el path. El patrón canónico Greenhouse para esto es queue+poll en ops-worker (mirror del outbox publisher y del regrade scheduler del AEO). Esta task fija ese patrón para OnPage antes de que la UI (TASK-1309) lo consuma, y hace explícita la **doctrina de honestidad**: un crawl que devuelve 0 findings (`succeeded`) no es lo mismo que un crawl que falló (`failed`).

## Goal

- Command `queueSiteAudit(targetId, actor)` gateado por `growth.seo.audit.run` que crea la task OnPage y persiste `provider_task_id` con `status=running`.
- Cloud Scheduler `seo-audit-enqueue` (semanal) + `seo-audit-collect` (30 min, poll idempotente por `provider_task_id`) → materializa `seo_site_audit_runs` + `seo_site_audit_findings`.
- Cloud Scheduler `seo-backlink-capture` (semanal) → `seo_backlink_snapshots` idempotente por `capture_date`.
- Readers `readSiteAuditReport(targetId, auditRunId?)` + `readBacklinkProfile(targetId, { range })` gateados por `growth.seo.observation.read`, con degradación honesta.
- Signal `seo.audit.stuck_tasks` en el subsistema Growth Health. Cost tracking por familia + reactive BQ mirror de los snapshots.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §3 (mapa de capacidades: OnPage para site audit, Backlinks para perfil), §6 (DataForSEO governance: family registry, breaker por familia, honest degradation, OnPage task-based async), §7 (readers `readSiteAuditReport`/`readBacklinkProfile`), §8 (materialización: `seo-audit-enqueue`/`seo-audit-collect`/`seo-backlink-capture`, signal `seo.audit.stuck_tasks`).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — convenciones del dominio `growth` + patrón de run async del AEO (claim atómico `FOR UPDATE SKIP LOCKED`, poll idempotente).
- `CLAUDE.md §"Outbox publisher canónico — Cloud Scheduler, no Vercel"` — el path async crítico va a Cloud Scheduler + ops-worker, NUNCA a Vercel cron (staging no corre Vercel crons).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registro de la signal `seo.audit.stuck_tasks`.
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — `capture_date` = DATE, `captured_at`/`*_at` = TIMESTAMPTZ; validar contra PG real antes de mergear.

Reglas obligatorias:

- **OnPage es task-based async: 2 fases desacopladas.** NUNCA esperar el resultado del crawl en el request. `enqueue` crea la task + persiste `provider_task_id`; `collect` poll-ea idempotente. Un `collect` que corre sobre una task aún incompleta es un no-op, no un error.
- **Idempotencia por `provider_task_id`.** El `collect` claim-ea/materializa exactamente una vez por task terminada. Dos ejecuciones concurrentes del cron NUNCA duplican findings ni el run.
- **Honest degradation.** Un crawl que devuelve 0 findings = `status='succeeded'` (sitio limpio). Un crawl que falló el fetch/timeout = `status='failed'`. Un crawl parcial = `status='degraded'`. NUNCA fabricar un snapshot ni mapear "0 findings" a "falló".
- **Family registry (TASK-1300).** OnPage y Backlinks corren por el registry de familias con **breaker por familia**: un Backlinks roto NUNCA hunde el audit ni el rank capture (TASK-1303). Provider único, familias como config.
- **Doctrina CWV (arch §3).** CWV/INP de **campo** = GSC (ranking factor real, TASK-1302); Lighthouse/lab por-URL = OnPage (diagnóstico). Esta task NO promedia ni sustituye la señal de campo por la de lab.
- **Cost tracking + quota.** Cada call OnPage/Backlinks persiste `provider_cost` en el run/snapshot + incrementa `seo_provider_spend_daily` per-org (event-sourced). El gate de costo/quota es `enforceSeoRunEntitlement` (TASK-1301).
- **No live-per-view.** Los readers pegan SIEMPRE a snapshots materializados en PG, nunca a DataForSEO en el render.

## Normative Docs

- `src/lib/ai/dataforseo.ts` — cliente DataForSEO canónico (Basic auth, `resolveSecret`, cost tracking); ampliado por el family registry de TASK-1300 (`onpage` `/v3/on_page/`, `backlinks` `/v3/backlinks/`). NUNCA duplicar el cliente.
- `services/ops-worker/server.ts` — host de los handlers async (patrón `handleOutboxPublishBatch`); acá viven los handlers `seo-audit-enqueue`/`seo-audit-collect`/`seo-backlink-capture` [verificar path del router de endpoints].
- `src/lib/sync/outbox-consumer.ts` — patrón de state machine atómica (`FOR UPDATE SKIP LOCKED`) reusado por el claim del `collect`.
- `src/lib/growth/ai-visibility/store.ts` (`claimPendingGraderRuns`, `listOperatorCrossOrgAeoScores`) — patrón de claim atómico + degradación honesta (`null`, nunca `0`) a replicar.
- `src/lib/growth/search-console/contracts.ts` — patrón de result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar en los readers.
- `migrations/` schema SEO de TASK-1299 (`seo_site_audit_runs`, `seo_site_audit_findings`, `seo_backlink_snapshots`) — SoT que esta task escribe.

## Dependencies & Impact

### Depends on

- `TASK-1299` — schema `greenhouse_growth.seo_*` (`seo_targets`, `seo_site_audit_runs`, `seo_site_audit_findings`, `seo_backlink_snapshots`). Bloqueador duro (esta task escribe esas tablas).
- `TASK-1300` — DataForSEO family registry con familias `onpage` + `backlinks` (allowlist + breaker + cost por familia). Bloqueador duro (esta task corre por ese registry).
- `TASK-1303` — patrón canónico de captura (rank capture command + Cloud Scheduler + reactive BQ mirror + signal) ya establecido; esta task lo replica para audit/backlinks. Bloqueador de patrón + reusa el reactive consumer + el `enforceSeoRunEntitlement`.

### Blocks / Impacts

- Bloquea `TASK-1309` (UI Site Audit `/admin/growth/seo/audit`) — consume `readSiteAuditReport`.
- Impacta el modelo dimensional analítico downstream (BQ mirror de audit runs/findings + backlink snapshots).
- Alimenta `readSeoAeoGap` indirectamente (misma serie temporal por org) y el pipeline de contenido del caso Berel.

### Files owned

- `src/lib/growth/seo/site-audit/queue-audit.ts` [nuevo — command `queueSiteAudit`]
- `src/lib/growth/seo/site-audit/collect.ts` [nuevo — poll idempotente por `provider_task_id`]
- `src/lib/growth/seo/site-audit/reader.ts` [nuevo — `readSiteAuditReport`]
- `src/lib/growth/seo/backlinks/capture.ts` [nuevo — `seo-backlink-capture`]
- `src/lib/growth/seo/backlinks/reader.ts` [nuevo — `readBacklinkProfile`]
- `src/lib/growth/seo/contracts.ts` [nuevo o extendido — result shapes + tipos compartidos]
- `services/ops-worker/server.ts` [modificado — handlers enqueue/collect/backlink-capture]
- `src/lib/reliability/queries/seo-audit-stuck-tasks.ts` [nuevo — signal `seo.audit.stuck_tasks`]
- Cloud Scheduler jobs (`seo-audit-enqueue`, `seo-audit-collect`, `seo-backlink-capture`) declarados en `services/ops-worker/deploy.sh` [modificado, verificar path]

## Current Repo State

### Already exists

- Cliente DataForSEO canónico `src/lib/ai/dataforseo.ts` (Basic auth, `resolveSecret`, cost tracking) — hoy hard-codea `/v3/serp/`; el family registry lo abre (TASK-1300).
- Patrón queue+poll canónico en ops-worker (outbox publisher + AEO regrade scheduler): claim atómico `FOR UPDATE SKIP LOCKED`, Cloud Scheduler, reactive BQ mirror, reliability signals.
- Schema SEO (post TASK-1299): `seo_site_audit_runs` (`status` CHECK `running|succeeded|degraded|failed`, `provider_task_id`, `health_score`, `crawled_pages`), `seo_site_audit_findings` (append-only, `severity` CHECK), `seo_backlink_snapshots` (UNIQUE por `capture_date`).
- `enforceSeoRunEntitlement` + capabilities `growth.seo.*` (post TASK-1301).

### Gap

- Cero integración OnPage/Backlinks. No hay command `queueSiteAudit`, ni el ciclo enqueue/collect, ni el backlink capture. No hay readers `readSiteAuditReport`/`readBacklinkProfile`. No hay signal `seo.audit.stuck_tasks`. Las tablas de audit/backlink existen (TASK-1299) pero nadie las escribe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration` (provider externo DataForSEO OnPage/Backlinks + cron async prod + write command gobernado)
- Source of truth afectado: `greenhouse_growth.seo_site_audit_runs` + `seo_site_audit_findings` + `seo_backlink_snapshots` (SoT append-only ventana caliente PG); BQ mirror = historia; `seo_provider_spend_daily` (event-sourced) para cost.
- Consumidores afectados: `readSiteAuditReport`/`readBacklinkProfile` → UI TASK-1309, Nexa/MCP; reactive BQ mirror; signal Growth Health.
- Runtime target: `staging|production|cron|worker|external`

### Contract surface

- Contrato existente a respetar: cliente `src/lib/ai/dataforseo.ts` + family registry (TASK-1300), patrón queue+poll ops-worker, `enforceSeoRunEntitlement` (TASK-1301), result shape `{ ok }` del reader de Search Console, schema SEO (TASK-1299).
- Contrato nuevo o modificado: command `queueSiteAudit(targetId, actor)`; readers `readSiteAuditReport(targetId, auditRunId?)` → `{ ok: true, run, findings } | { ok: false, errorCode, status }`, `readBacklinkProfile(targetId, { range })` → `{ ok: true, points } | { ok: false, errorCode, status }`; 3 Cloud Scheduler jobs + 3 handlers ops-worker; signal `seo.audit.stuck_tasks`.
- Backward compatibility: `gated` (feature nueva behind `GROWTH_SEO_ENABLED` default OFF; provider registry additive).
- Full API parity: `queueSiteAudit` es command gobernado en `src/lib/growth/seo/**` (capability `growth.seo.audit.run`), reusable por UI + Nexa + MCP (`propose → confirm → execute`); readers son primitives canónicos, no lógica de pantalla. Ver `## Capability Definition of Done`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_site_audit_runs`, `seo_site_audit_findings`, `seo_backlink_snapshots`, `seo_provider_spend_daily` [verificar nombre exacto — lo define TASK-1300/1303], outbox + BQ mirror `greenhouse_growth_analytics.*`.
- Invariantes que no se pueden romper:
  - OnPage async: `enqueue` persiste `provider_task_id` + `status=running`; `collect` materializa exactamente una vez por task terminada (idempotente por `provider_task_id`); un poll sobre task incompleta = no-op.
  - Honest degradation: `succeeded` (crawl OK, incluso 0 findings) ≠ `failed` (crawl no completó) ≠ `degraded` (parcial). NUNCA fabricar snapshot ni mapear 0 findings a fallo.
  - Append-only: `seo_site_audit_findings` y los snapshots NUNCA se UPDATE/DELETE (anti-mutation trigger de TASK-1299); `seo_backlink_snapshots` idempotente por `(target, capture_date)`.
  - Breaker por familia: Backlinks caído NO hunde audit ni rank capture; cada familia con su breaker + budget aunque compartan credencial.
  - Cero FK/merge a `grader_*`, payroll o finance.
  - Reads pegan a snapshots PG materializados, NUNCA a DataForSEO en el render.
- Tenant/space boundary: cada `seo_target` FK a `greenhouse_core.organizations`; el command deriva `organization_id` del target server-side y valida entitlement per-org (`module_assignments`, no rol). Los readers filtran por org derivada de la sesión.
- Idempotency/concurrency: `collect` usa claim atómico `FOR UPDATE SKIP LOCKED` por `provider_task_id`; backlink capture idempotente por `(seo_target_id, capture_date)` (UNIQUE de TASK-1299) vía UPSERT.
- Audit/outbox/history: la serie append-only ES el historial; `queueSiteAudit` emite outbox (`propose → confirm → execute` + audit); cada snapshot materializado emite outbox → reactive BQ mirror.

### Migration, backfill and rollout

- Migration posture: `none` (el schema lo trae TASK-1299; esta task es integración + crons + readers). Si emerge necesidad de `seo_provider_spend_daily` o de una columna nueva, va en TASK-1300/1303, no acá [verificar].
- Default state: `flag OFF` (`GROWTH_SEO_ENABLED`) + Cloud Scheduler jobs creados `disabled` hasta habilitar el módulo por-org.
- Backfill plan: N/A (feature nueva; la serie nace vacía y se llena con las corridas programadas).
- Rollback path: `GROWTH_SEO_ENABLED` OFF + pausar los 3 Cloud Scheduler jobs + revert PR. La historia append-only ya escrita es inmutable por diseño (no se revierte; se deja de escribir).
- External coordination: credencial DataForSEO ya existente (compartida con AEO, `resolveSecret`); Cloud Scheduler jobs nuevos (`gcloud scheduler`); redeploy ops-worker; presupuesto/quota per-org coordinado con `enforceSeoRunEntitlement` (TASK-1301). Sin consent externo (datos de mercado).

### Security and access

- Auth/access gate: `queueSiteAudit` → capability `growth.seo.audit.run` (execute, tenant) + entitlement per-org. Readers → `growth.seo.observation.read` (read, tenant). Cost gate → `enforceSeoRunEntitlement` (quota cap por-org). Handlers ops-worker autenticados por el mecanismo canónico del worker (service token, no público).
- Sensitive data posture: sin PII, sin secretos en el payload, sin finance. Solo métricas SEO técnicas + de mercado. La credencial DataForSEO se resuelve server-side vía `resolveSecret`, nunca en el snapshot.
- Error contract: readers retornan `{ ok: false, errorCode, status }` (canónico, es-CL en la UI); errores de provider capturados con `captureWithDomain(err, 'integrations'|'growth', ...)`, NUNCA `Sentry.captureException` directo ni raw error al cliente. El command usa errores canónicos sanitizados.
- Abuse/rate-limit posture: quota cap por-org + breaker por familia + cost tracking (`seo_provider_spend_daily`) + audits **programados** (no on-demand ilimitado). `queueSiteAudit` on-demand respeta el quota cap.

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit/focal tests del command, del poll idempotente (dos `collect` concurrentes → una sola materialización), de la clasificación de estado (0 findings = `succeeded`), y de los readers (degradación honesta).
- DB/runtime checks: correr `enqueue` en staging → verificar `seo_site_audit_runs.status=running` + `provider_task_id` set; correr `collect` tras completar la task → verificar `status` final + findings materializados una sola vez; `seo-backlink-capture` → una fila por `capture_date`. Validar la query de la signal contra PG real (gate TASK-893).
- Integration checks: smoke real contra DataForSEO OnPage (task_post + task_get) y Backlinks en staging; verificar cost tracking incrementa `seo_provider_spend_daily`; verificar breaker aísla Backlinks de audit.
- Reliability signals/logs: `seo.audit.stuck_tasks` (steady=0) visible en `/admin/operations` (subsistema Growth Health); log de cada corrida enqueue/collect/capture.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **introduce/consume** las capabilities `growth.seo.audit.run` (write) y `growth.seo.observation.read` (read), seedeadas en `TASK-1301`. Aplica el gate a nivel capability:

- [ ] **Lógica en el primitive, no en la UI.** `queueSiteAudit`, el ciclo enqueue/collect, `readSiteAuditReport` y `readBacklinkProfile` viven en `src/lib/growth/seo/**`; cero lógica de audit en un componente UI.
- [ ] **Modelada como command/recurso, no como click-handler.** `queueSiteAudit(targetId, actor)` es un command con command semantics (crea task OnPage), no un handler acoplado a un botón.
- [ ] **Read** expuesto como reader canónico (`readSiteAuditReport`, `readBacklinkProfile`) con shape + latencia estables; **write** (`queueSiteAudit`) con authorization fina (`growth.seo.audit.run` + entitlement per-org, NO admin-coarse), idempotencia (por `provider_task_id`/`capture_date`), audit + outbox, errores canónicos sanitizados, observabilidad (signal + logs).
- [ ] **Capability + grant en el MISMO PR:** las capabilities las seedea TASK-1301; esta task verifica que `growth.seo.audit.run` y `growth.seo.observation.read` tengan grant a ≥1 rol real + coverage test verde antes de cerrar. Si falta el grant → bloquea (regla TASK-873/935).
- [ ] **Camino programático declarado:** command + readers consumibles por Product API / `api/platform/app` / MCP (Nexa). UI (TASK-1309) es un consumer más, no el SoT.
- [ ] **Write apto para `propose → confirm → execute`:** `queueSiteAudit` NO ejecuta side effects externos irreversibles antes de la confirmación humana/gobernada; el LLM nunca dispara el crawl directo.
- [ ] **Un primitive, muchos consumers:** UI, Nexa, MCP, cron consumen el mismo command/reader; cero duplicación por consumer.
- [ ] **Parity check = SÍ:** el site audit y el backlink profile tienen contrato gobernado a nivel capability → todos los consumers los operan por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Site audit command + enqueue (fase 1 async)

- `queueSiteAudit(targetId, actor)` en `src/lib/growth/seo/site-audit/queue-audit.ts`: valida capability `growth.seo.audit.run` + entitlement per-org + quota, resuelve el target, dispara `task_post` a DataForSEO OnPage vía el family registry (`onpage`), persiste `seo_site_audit_runs` con `status=running` + `provider_task_id` + `provider_cost`, emite outbox + audit.
- Cloud Scheduler `seo-audit-enqueue` (semanal) → handler ops-worker que encola audits para los targets con módulo SEO activo (reusa `queueSiteAudit` por target). Job creado `disabled`.
- Cost tracking incrementa `seo_provider_spend_daily` per-org. Tests: command con capability OK/denegada, quota agotada → error canónico, run persistido con `status=running`.

### Slice 2 — Site audit collect (fase 2 poll idempotente)

- `collect.ts` en `src/lib/growth/seo/site-audit/`: por cada `seo_site_audit_runs` en `status=running`, poll `task_get` idempotente por `provider_task_id` con claim atómico `FOR UPDATE SKIP LOCKED`. Si la task terminó → materializa `health_score`, `crawled_pages`, `status` final (honest: `succeeded`/`degraded`/`failed`) + inserta `seo_site_audit_findings` (append-only, `severity` CHECK). Si sigue en progreso → no-op. Emite outbox → reactive BQ mirror.
- Cloud Scheduler `seo-audit-collect` (cada 30 min) → handler ops-worker. Job creado `disabled`.
- Tests: poll sobre task incompleta = no-op; dos `collect` concurrentes → una sola materialización; 0 findings → `succeeded`; fetch fallido → `failed`.

### Slice 3 — Backlink snapshot capture

- `capture.ts` en `src/lib/growth/seo/backlinks/`: llama DataForSEO Backlinks (`backlinks` family) por target, UPSERT `seo_backlink_snapshots` idempotente por `(seo_target_id, capture_date)` (`referring_domains`, `backlinks_total`, `domain_rank`, `toxic_share`, `new_lost_delta` JSONB, `provider_cost`), emite outbox → BQ mirror.
- Cloud Scheduler `seo-backlink-capture` (semanal) → handler ops-worker. Job creado `disabled`.
- Cost tracking + breaker por familia (Backlinks aislado de OnPage/rank). Tests: idempotencia por `capture_date`, breaker aísla el fallo.

### Slice 4 — Readers + reliability signal

- `readSiteAuditReport(targetId, auditRunId?)` en `src/lib/growth/seo/site-audit/reader.ts` → `{ ok: true, run, findings (por severidad) } | { ok: false, errorCode, status }`; si no hay run → degradación honesta (no `0`, no fabricar).
- `readBacklinkProfile(targetId, { range })` en `src/lib/growth/seo/backlinks/reader.ts` → `{ ok: true, points } | { ok: false, errorCode, status }`.
- Signal `seo.audit.stuck_tasks` en `src/lib/reliability/queries/seo-audit-stuck-tasks.ts`: runs en `status=running` con `provider_task_id` más viejos que el umbral (task colgada). Steady=0. Query validada contra PG real (gate TASK-893, cuidado DATE vs TIMESTAMPTZ). Registrada en el subsistema Growth Health.

## Out of Scope

- UI Site Audit `/admin/growth/seo/audit` + `/[issueGroup]` (TASK-1309).
- Rank tracking / `readRankEvolution` (TASK-1303).
- GSC daily snapshot / CWV de campo (TASK-1302).
- `readSeoAeoGap` derived read (TASK-1305).
- Schema SEO (TASK-1299) y family registry (TASK-1300) — dependencias, no scope.
- Capabilities/entitlement seed (TASK-1301) — se consume, no se crea acá.
- Keyword opportunities / topical authority (TASK-1302/1308).

## Detailed Spec

Ver el contrato completo en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 (OnPage/Backlinks como fuentes), §6 (family registry + breaker + honest degradation + OnPage async) y §8 (`seo-audit-enqueue`/`seo-audit-collect`/`seo-backlink-capture` + signal). Puntos load-bearing:

- **OnPage async = 2 crons desacoplados.** `enqueue` (semanal) NO espera el crawl: crea la task, persiste `provider_task_id`, retorna. `collect` (30 min) poll-ea `task_get` idempotente. El acople entre ambos es el `provider_task_id` en `seo_site_audit_runs`. Este es el mismo patrón que el AEO regrade scheduler y el outbox publisher: claim atómico + no-op si aún no listo.
- **Honest degradation (arch §6).** El mapeo estado es explícito: crawl completó + N findings (N≥0) = `succeeded`; crawl completó parcial = `degraded`; crawl no completó (timeout/fetch error/task error) = `failed`. Un `succeeded` con 0 findings significa "sitio técnicamente limpio", nunca "no corrió". El reader distingue los tres estados al cliente.
- **Doctrina CWV (arch §3).** CWV/INP de campo (ranking real) = GSC (TASK-1302). OnPage entrega Lighthouse/lab por-URL como **diagnóstico**, no como sustituto de la señal de campo. Esta task materializa el lab bajo `seo_site_audit_findings`/`health_score`, sin promediarlo con GSC.
- **Breaker por familia (arch §6).** OnPage y Backlinks comparten credencial con SERP-AI (AEO) pero cada familia tiene breaker + budget. Un Backlinks 500 abre el breaker de `backlinks` sin tocar `onpage` ni el `serp` del AEO.
- **Cost (arch §6/§13).** Backlinks $0.02/req + $0.00003/fila; OnPage crawl $0.000125/pág, Lighthouse $0.00425/pág. Audits programados (no on-demand ilimitado), cost tracking por familia, quota cap per-org (`enforceSeoRunEntitlement`). Signal `seo.provider.cost_over_budget` la agrega TASK-1303; esta task alimenta el contador.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (enqueue/command) → Slice 2 (collect) es orden duro: `collect` poll-ea las tasks que `enqueue` creó (acople por `provider_task_id`). Slice 3 (backlinks) es independiente y puede shippear en paralelo. Slice 4 (readers + signal) va al final (consume lo que 1–3 escriben). NUNCA habilitar el Cloud Scheduler `collect` antes de que `enqueue` persista `provider_task_id`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| OnPage task cuelga indefinida (nunca completa) → run zombie `running` | integrations | medium | signal `seo.audit.stuck_tasks` (umbral edad) + honest `degraded`/`failed` tras N polls; poll idempotente | `seo.audit.stuck_tasks` > 0 |
| Dos `collect` concurrentes duplican findings/run | data | medium | claim atómico `FOR UPDATE SKIP LOCKED` por `provider_task_id`; findings insert idempotente | test concurrencia + count |
| 0 findings mapeado a `failed` (falso negativo de honestidad) | growth | medium | mapeo estado explícito: crawl OK + 0 findings = `succeeded`; test dedicado | review + test |
| Backlinks roto hunde el audit/rank (secreto compartido) | integrations | low | breaker por familia (TASK-1300); budgets separados | breaker open + logs |
| Cron en Vercel en vez de Cloud Scheduler → invisible en staging | ops | low | los 3 crons van a `services/ops-worker/deploy.sh`, NUNCA a `vercel.json` | ausencia de corridas en staging |
| Query de signal con `EXTRACT(EPOCH FROM DATE-DATE)` → 500 runtime | data | medium | `capture_date`=DATE / `*_at`=TIMESTAMPTZ; validar contra PG real (gate TASK-893) | Sentry + lint rule |
| Cost DataForSEO se dispara (crawl grande × orgs) | integrations | medium | audits programados + quota cap per-org + cost tracking por familia | `seo.provider.cost_over_budget` (TASK-1303) |

### Feature flags / cutover

- Todo behind `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`). Los 3 Cloud Scheduler jobs se crean `disabled` y se habilitan por-org cuando el módulo se activa (`module_assignments`). Cutover: crear jobs disabled → habilitar en staging shadow → verificar corridas + honest states → habilitar prod por-org.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF + pausar `seo-audit-enqueue` + revert PR | <10 min | si (runs `running` quedan; el collect no los toca si flag OFF) |
| Slice 2 | flag OFF + pausar `seo-audit-collect` + revert PR | <10 min | si (deja de materializar; lo ya escrito es append-only) |
| Slice 3 | flag OFF + pausar `seo-backlink-capture` + revert PR | <10 min | si |
| Slice 4 | revert PR (readers/signal son read-only) | <5 min | si |

### Production verification sequence

1. En staging con `GROWTH_SEO_ENABLED=true`: correr `seo-audit-enqueue` manual sobre un target de prueba → verificar `seo_site_audit_runs.status=running` + `provider_task_id` set + `provider_cost` registrado.
2. Esperar a que la task OnPage complete; correr `seo-audit-collect` → verificar `status` final honesto + `seo_site_audit_findings` materializados; re-correr `collect` → verificar **no duplica** (idempotencia).
3. Correr `seo-backlink-capture` → verificar una fila `seo_backlink_snapshots` por `capture_date`; re-correr mismo día → UPSERT no duplica.
4. `readSiteAuditReport(targetId)` + `readBacklinkProfile(targetId, {range})` → shape correcto; target sin runs → degradación honesta (no `0`).
5. Verificar `seo.audit.stuck_tasks` = 0 en `/admin/operations`; forzar un run zombie → signal alerta.
6. Verificar reactive BQ mirror recibió los snapshots. Verificar breaker por familia aísla un fallo de Backlinks.
7. Prod vía release control plane cuando EPIC-022 se secuencie; habilitar Cloud Scheduler por-org.

### Out-of-band coordination required

- Crear los 3 Cloud Scheduler jobs (`gcloud scheduler`, disabled) + redeploy ops-worker.
- Confirmar credencial DataForSEO compartida resuelve para las familias `onpage`/`backlinks` (TASK-1300).
- Coordinar quota cap per-org con `enforceSeoRunEntitlement` (TASK-1301).
- Registrar la signal `seo.audit.stuck_tasks` en el subsistema Growth Health.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `queueSiteAudit(targetId, actor)` existe, gateado por `growth.seo.audit.run` + entitlement per-org, dispara OnPage `task_post` y persiste `seo_site_audit_runs` con `status=running` + `provider_task_id` + `provider_cost`.
- [ ] Ciclo async: `seo-audit-enqueue` (semanal) + `seo-audit-collect` (30 min, poll idempotente por `provider_task_id` con `FOR UPDATE SKIP LOCKED`); un `collect` sobre task incompleta = no-op; dos `collect` concurrentes → una sola materialización.
- [ ] Honest degradation verificada: crawl OK + 0 findings = `succeeded`; crawl parcial = `degraded`; crawl no completó = `failed`. NUNCA se fabrica snapshot.
- [ ] `seo-backlink-capture` (semanal) escribe `seo_backlink_snapshots` idempotente por `(target, capture_date)`.
- [ ] `readSiteAuditReport(targetId, auditRunId?)` y `readBacklinkProfile(targetId, { range })` gateados por `growth.seo.observation.read`, con shape `{ ok }` y degradación honesta (no `0`).
- [ ] Signal `seo.audit.stuck_tasks` (steady=0) registrada en Growth Health; query validada contra PG real (`capture_date`=DATE, `*_at`=TIMESTAMPTZ).
- [ ] OnPage y Backlinks corren por el family registry (TASK-1300) con breaker por familia; un Backlinks caído NO hunde audit/rank; cost tracking por familia incrementa `seo_provider_spend_daily`.
- [ ] Todos los crons en `services/ops-worker/deploy.sh` (Cloud Scheduler), NUNCA en `vercel.json`; jobs creados `disabled`.
- [ ] `GROWTH_SEO_ENABLED` default OFF + fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Cero FK/merge a `grader_*`, payroll o finance.
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; smoke DataForSEO en staging documentado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Smoke real DataForSEO OnPage (task_post + task_get) y Backlinks en staging + verificación DB de idempotencia (collect no duplica; backlink UPSERT por capture_date) + honest states + signal `seo.audit.stuck_tasks`.
- `[downstream-verified: seo-site-audit]` en el commit de cierre (verificación end-to-end enqueue→collect→snapshot→reader).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] fila `GROWTH_SEO_ENABLED` en `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] signal `seo.audit.stuck_tasks` documentada en el subsistema Growth Health
- [ ] chequeo de impacto cruzado (TASK-1309 UI Site Audit consume estos readers)
- [ ] documentación técnica + funcional + manual proporcional del audit/backlinks

## Follow-ups

- `TASK-1309` — UI Site Audit `/admin/growth/seo/audit` (consume `readSiteAuditReport`).
- `TASK-1303` — signal `seo.provider.cost_over_budget` (esta task alimenta el contador de spend).
- Definir el umbral de "stuck task" para `seo.audit.stuck_tasks` y el máximo de polls antes de marcar `failed`.
- Evaluar cache de crawls OnPage para no re-crawlear un sitio sin cambios (optimización de costo).

## Open Questions

1. ¿Nombre y owner exactos de `seo_provider_spend_daily` (event-sourced cost counter)? Lo introduce TASK-1300 o TASK-1303 — resolver en Discovery antes de incrementarlo acá.
2. ¿Umbral de edad para `seo.audit.stuck_tasks` y máximo de polls antes de degradar a `failed`? Propuesta: stuck > 6h, `failed` tras 12 polls sin completar.
3. ¿El `queueSiteAudit` on-demand comparte quota con los audits programados o tiene su propio cap? Resolver contra `enforceSeoRunEntitlement` (TASK-1301).
4. ¿Path exacto del router de endpoints en `services/ops-worker/server.ts` y de la declaración de jobs en `deploy.sh`? Confirmar en Discovery.
