# TASK-1299 — Growth SEO: Schema + Time-Series Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `none`
- Branch: `task/TASK-1299-growth-seo-schema-timeseries-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la **fundación de datos del módulo SEO** en el schema `greenhouse_growth`: tablas de configuración (`seo_targets`, `seo_keyword_sets`, `seo_keyword_set_members`, `seo_competitors`) y de serie temporal **append-only** (`seo_rank_snapshots`, `seo_site_audit_runs`, `seo_site_audit_findings`, `seo_backlink_snapshots`). Es el bloqueador fundacional de EPIC-022: sin este schema no hay rank tracking, ni materialización, ni readers. Modela la evolución en el tiempo como **snapshots inmutables keyed por `capture_date`** (medición, no término), con anti-mutation triggers espejando el patrón del AEO grader. No incluye providers, readers, commands ni UI — solo el schema + tipos + verificación DDL.

## Why This Task Exists

El módulo SEO (EPIC-022) responde "¿cómo rinde este set de URLs/keywords y cómo evoluciona?". Esa pregunta es intrínsecamente temporal: el valor está en la serie de snapshots, no en una foto. Hoy no existe ningún schema para persistirla — GSC es read-through en vivo (16 meses, sin historia propia) y DataForSEO no se materializa. Antes de escribir un solo reader o cron hay que fijar el contrato de datos: qué es configuración mutable versionada vs qué es medición append-only, dónde está el SoT PG vs BQ, y qué invariantes de idempotencia protegen una captura diaria de doble-escritura. Esta task fija ese contrato para que 1300–1310 construyan encima sin re-decidir el modelo.

## Goal

- Schema `greenhouse_growth` extendido con las 8 tablas SEO (config + snapshots) ancladas a la org canónica.
- Snapshots append-only con UNIQUE de idempotencia por `capture_date` + anti-mutation triggers.
- Migración additive con marker `-- Up Migration` + DO-block de verificación post-DDL + GRANTs runtime.
- Tipos Kysely regenerados (`src/types/db.d.ts`) y verificación real contra PG (`information_schema`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PostgreSQL first (ventana caliente) + BigQuery (historia infinita).
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, markers, ownership, Kysely.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Cliente` → `greenhouse_core.organizations` como ancla per-org.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — convenciones del dominio `growth` (append-only + anti-mutation triggers `block_observation_mutation`, sequence-based public IDs).
- `EPIC-022` — modelo de datos y boundary SEO↔AEO.

Reglas obligatorias:

- **Append-only para mediciones.** `seo_rank_snapshots` / `seo_backlink_snapshots` / `seo_site_audit_*` NUNCA se UPDATE ni DELETE; cada día es un hecho nuevo. Anti-mutation trigger espejo de `block_observation_mutation`.
- **Boundary duro contra AEO.** Cero FK desde una tabla `seo_*` hacia `grader_*`. El cruce SEO↔AEO se hace por `organization_id` en un derived read (TASK-1305), nunca por schema compartido.
- **Boundary duro contra Payroll/Finance.** Este dominio NUNCA referencia ni escribe tablas de payroll/finance/compensación.
- **Migration markers.** `-- Up Migration` exacto + DO-block anti pre-up-marker con RAISE EXCEPTION; Down solo DROP.
- **Ownership.** `greenhouse_ops` dueño; GRANT read/write a `greenhouse_runtime`.

## Normative Docs

- `migrations/20260624125140219_task-1226-greenhouse-growth-schema.sql` — patrón del schema `growth` (AEO) [referencia de convención].
- `migrations/20260628203847129_task-1282-search-console-connections.sql` — patrón additive del dominio growth con marker + DO-block + GRANTs [referencia].
- `migrations/20260508104217939_task-611-capabilities-registry.sql` — patrón DO-block de verificación post-DDL [referencia].
- `src/lib/postgres/client.ts` — conexión canónica; `pnpm db:generate-types` para regenerar Kysely.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (org canónica) como ancla del binding per-org [verificar columna PK canónica].
- Schema `greenhouse_growth` ya existente (creado por TASK-1226).

### Blocks / Impacts

- Bloquea `TASK-1301` (capabilities referencian el dominio), `TASK-1303` (rank capture escribe `seo_rank_snapshots`), `TASK-1304` (audit/backlinks), `TASK-1302` (GSC snapshot).
- Impacta el modelo dimensional analítico downstream (BQ mirror de snapshots — TASK-1303).

### Files owned

- `migrations/<ts>_task-1299-growth-seo-schema.sql` [nuevo]
- `src/types/db.d.ts` [regenerado — additive]

## Current Repo State

### Already exists

- Schema `greenhouse_growth` con las tablas del AEO grader + forms + search_console.
- Convención de dominio growth: append-only, anti-mutation triggers, sequence-based public IDs, FK a `greenhouse_core.organizations`.

### Gap

- Cero tablas SEO. No hay modelo para rank tracking, keyword sets, competitors, site audit ni backlinks. No hay serie temporal de posiciones.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: nuevas tablas `greenhouse_growth.seo_*` (config = SoT mutable; snapshots = SoT append-only de la ventana caliente PG, BQ como historia posterior en TASK-1303).
- Consumidores afectados: readers/commands SEO (1302–1305), UI (1306–1310), Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: convenciones de schema `growth`, ownership `greenhouse_ops`, FK a org canónica.
- Contrato nuevo o modificado: 8 tablas + índices + anti-mutation triggers. Sin readers/commands aún (esta task es solo schema).
- Backward compatibility: `gated` (schema nuevo aditivo; cero impacto en tablas existentes).
- Full API parity: `N/A — no capability` (esta task no introduce capability; el schema lo consumen los primitives de 1301–1305).

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_targets`, `seo_keyword_sets`, `seo_keyword_set_members`, `seo_competitors`, `seo_rank_snapshots`, `seo_site_audit_runs`, `seo_site_audit_findings`, `seo_backlink_snapshots`.
- Invariantes que no se pueden romper:
  - Snapshots son append-only: UPDATE/DELETE bloqueado por trigger (espejo `block_observation_mutation`).
  - `seo_rank_snapshots` idempotente: UNIQUE(`seo_target_id`, `keyword`, `engine`, `device`, `capture_date`).
  - `seo_backlink_snapshots` idempotente: UNIQUE(`seo_target_id`, `capture_date`).
  - `seo_targets` UNIQUE(`organization_id`, `root_domain`, `location_code`, `language_code`).
  - `seo_site_audit_runs.status` acotado por CHECK (`running|succeeded|degraded|failed`); `seo_site_audit_findings.severity` CHECK (`critical|warning|notice`).
  - Membership de keywords/competitors es append-only con `effective_from`/`effective_to` (término, no medición) — NUNCA DELETE de una keyword.
  - Cero FK a `grader_*`, payroll o finance.
- Tenant/space boundary: todo `seo_target` FK a `greenhouse_core.organizations`; los reads (tasks posteriores) derivan `organization_id` server-side.
- Idempotency/concurrency: UNIQUE de captura garantiza que una re-ejecución del cron no duplique filas; el UPSERT vive en el command (TASK-1303), acá solo el constraint.
- Audit/outbox/history: la serie append-only ES el historial; sin outbox en esta task (lo agrega el command de captura).

### Migration, backfill and rollout

- Migration posture: `additive` (8 tablas + índices + triggers + GRANTs; marker + DO-block).
- Default state: `read-only` (schema inerte hasta que 1303 escriba filas; ninguna feature lo consume aún).
- Backfill plan: N/A (feature nueva, sin datos legacy).
- Rollback path: reverse migration (DROP de las 8 tablas — sin filas de producción todavía) + revert PR.
- External coordination: ninguna (solo DDL en `greenhouse-pg-dev`, que dev/staging comparten).

### Security and access

- Auth/access gate: N/A a nivel schema; el gate de acceso vive en las capabilities (TASK-1301) y readers.
- Sensitive data posture: sin PII, sin secretos, sin finance. Solo métricas SEO públicas/de mercado.
- Error contract: N/A (DDL); la verificación usa RAISE EXCEPTION en el DO-block.
- Abuse/rate-limit posture: N/A a nivel schema (el gate de costo DataForSEO vive en 1300/1301).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes tras regenerar `db.d.ts`.
- DB/runtime checks: `pnpm migrate:up` + verificación con SELECT contra `information_schema.tables`/`.columns`/`pg_constraint`/`pg_trigger` de que las 8 tablas, sus UNIQUE, CHECK y anti-mutation triggers existen. El propio DO-block aborta si falta algún objeto.
- Integration checks: N/A (sin provider en esta task).
- Reliability signals/logs: N/A (los signals los agregan 1303/1304).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability`. Esta task es schema puro (DDL + tipos). No introduce ni modifica una capability; los primitives gobernados (commands/readers) que consumen este schema nacen en `TASK-1301` (capabilities), `TASK-1303`/`TASK-1304` (commands/readers). Deuda declarada: el schema no es consumible por ningún consumer hasta que esas tasks aterricen; se secuencian a continuación en EPIC-022.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Config tables

- `seo_targets` (org FK, root_domain, location_code, language_code, market, status, created_by, created_at, UNIQUE per-org+dominio+mercado).
- `seo_keyword_sets` (target FK, name, created_at).
- `seo_keyword_set_members` (keyword_set FK, keyword, tags[], effective_from, effective_to — append-only membership).
- `seo_competitors` (target FK, competitor_domain, effective_from, effective_to — append-only).
- Índices + GRANTs. Marker + DO-block de verificación.

### Slice 2 — Time-series snapshot tables

- `seo_rank_snapshots` (target FK, keyword, engine, device, capture_date, position, url, serp_features JSONB, estimated_traffic, provider_cost, source_run_id, captured_at, UNIQUE de captura) + anti-mutation trigger.
- `seo_site_audit_runs` (target FK, capture_date, status CHECK, crawled_pages, health_score, provider_task_id, provider_cost, timestamps) + `seo_site_audit_findings` (run FK, url, issue_type, severity CHECK, detail JSONB) append-only.
- `seo_backlink_snapshots` (target FK, capture_date, referring_domains, backlinks_total, domain_rank, toxic_share, new_lost_delta JSONB, provider_cost, captured_at, UNIQUE de captura) + anti-mutation trigger.
- Índices compuestos para reads temporales (`(seo_target_id, keyword, capture_date DESC)`). Regenerar `db.d.ts`.

## Out of Scope

- Providers DataForSEO / ampliación del allowlist (TASK-1300).
- Capabilities / entitlements / chokepoint (TASK-1301).
- Readers, commands, crons, reactive BQ mirror, reliability signals (TASK-1302–1305).
- Cualquier UI (TASK-1306–1310).
- BQ mart / mirror de snapshots (lo agrega el command de captura, TASK-1303).

## Detailed Spec

Ver el modelo de datos y el DDL conceptual en `EPIC-022` (§Modelo de datos) y en la spec de arquitectura del dominio SEO. Decisión temporal canónica: los snapshots (`seo_rank_snapshots`, `seo_backlink_snapshots`, `seo_site_audit_*`) son **event rows append-only keyed por `capture_date`** — mediciones, nunca "supersede". Las tablas de config (`seo_keyword_set_members`, `seo_competitors`) usan membership append-only con `effective_from`/`effective_to` porque SÍ son términos. Los reads temporales de tasks posteriores hacen `SELECT ... ORDER BY capture_date DESC` sobre la ventana caliente PG; BQ absorbe la historia infinita en TASK-1303. Anti-mutation triggers mirror de `block_observation_mutation` del AEO. GRANTs read/write a `greenhouse_runtime`, ownership `greenhouse_ops`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (config) puede shippear independiente. Slice 2 (snapshots) referencia `seo_targets` de Slice 1 (FK), así que Slice 1 → Slice 2. Ambos en la misma migración additive es aceptable (una sola migración con las 8 tablas ordenadas config→snapshots).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Marker invertido → sección Up vacía, tablas nunca creadas | data | medium | marker `-- Up Migration` exacto + DO-block RAISE EXCEPTION que aborta si falta una tabla | migración falla loud |
| FK accidental a `grader_*` rompe el boundary SEO↔AEO | growth | low | review + regla dura: cero FK cross-motor; cruce por `organization_id` en derived read | code review |
| Anti-mutation trigger ausente → un UPDATE corrompe la serie histórica | data | low | trigger espejo `block_observation_mutation` en las 3 tablas snapshot + test | verificación `pg_trigger` |
| Tipo DATE vs TIMESTAMP mal declarado (bug class ISSUE EXTRACT) | data | medium | `capture_date` como DATE explícito; `captured_at` como TIMESTAMPTZ; verificar `information_schema` | smoke query |

### Feature flags / cutover

- Sin flag propio (schema inerte). El módulo completo se gatea con `GROWTH_SEO_ENABLED` a nivel feature en las tasks que lo consumen (1302+). El schema puede existir sin que ninguna feature lo lea.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (DROP config tables) + revert PR | <5 min | si (sin filas prod) |
| Slice 2 | reverse migration (DROP snapshot tables) + revert PR | <5 min | si (sin filas prod) |

### Production verification sequence

1. `pnpm migrate:up` en staging (dev/staging comparten `greenhouse-pg-dev`) → el DO-block confirma las 8 tablas + constraints + triggers.
2. SELECT contra `information_schema.columns` verificando `capture_date` = DATE y `captured_at` = TIMESTAMPTZ.
3. Insertar una fila de prueba en `seo_rank_snapshots` + intentar UPDATE → verificar que el anti-mutation trigger lo rechaza; borrar la fila de prueba.
4. Regenerar `db.d.ts` + `pnpm typecheck` verde.
5. Prod vía release control plane (migración additive) cuando el módulo se secuencie a producción.

### Out-of-band coordination required

- Ninguna (solo DDL en la instancia compartida dev/staging; sin secrets, sin provider, sin consent externo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Source of truth nombrado: 8 tablas `greenhouse_growth.seo_*` (config mutable + snapshots append-only).
- [ ] Migración additive con marker `-- Up Migration` + DO-block que aborta si falta cualquier tabla/constraint/trigger.
- [ ] Snapshots append-only: anti-mutation trigger en `seo_rank_snapshots`, `seo_backlink_snapshots`, `seo_site_audit_findings`; UPDATE/DELETE rechazado (verificado con test/smoke).
- [ ] Idempotencia: UNIQUE de captura en rank (`target,keyword,engine,device,capture_date`) y backlinks (`target,capture_date`).
- [ ] Boundary: cero FK a `grader_*`, payroll o finance; anclaje a `greenhouse_core.organizations`.
- [ ] `capture_date` = DATE, `captured_at` = TIMESTAMPTZ (verificado en `information_schema`).
- [ ] GRANT read/write a `greenhouse_runtime`; ownership `greenhouse_ops`.
- [ ] `db.d.ts` regenerado; `pnpm typecheck` + `pnpm lint` verdes.
- [ ] Down migration solo DROP (cero CREATE bajo `-- Down Migration`).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` en staging + verificación SQL contra `information_schema`/`pg_constraint`/`pg_trigger` (tablas, UNIQUE, CHECK, triggers) + smoke de anti-mutation (UPDATE rechazado).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1300/1301/1302/1303 dependen de este schema)
- [ ] documentación técnica del schema SEO (arquitectura del dominio)

## Follow-ups

- `TASK-1300` — DataForSEO family registry (paralelo, no bloqueado por este schema).
- `TASK-1301` — capabilities `growth.seo.*` + entitlement per-org.
- `TASK-1303` — rank capture command que escribe `seo_rank_snapshots` + BQ mirror.
- Definir el tamaño de la ventana caliente PG (prune-to-BQ) — se decide en TASK-1303 según patrón de queries.

## Open Questions

1. ¿Columna PK canónica de `greenhouse_core.organizations` para la FK (`organization_id` vs otro)? Resolver en Discovery contra el schema real.
2. ¿La membership de keywords necesita un `keyword_set_member_id` sequence public o basta el compuesto? Propuesta: PK sintética + UNIQUE lógico.
3. ¿Tamaño inicial de ventana caliente PG antes de prune a BQ? Propuesta: 180 días, confirmar en TASK-1303.
