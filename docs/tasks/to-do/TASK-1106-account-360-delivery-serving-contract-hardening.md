# TASK-1106 — Account 360 delivery serving contract hardening

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data|platform|delivery|agency|reliability`
- Blocked by: `ISSUE-087`
- Branch: `task/TASK-1106-account-360-delivery-serving-contract-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Resolver el Sentry `JAVASCRIPT-NEXTJS-7H` (`column "rpa_median" does not exist`) en `GET /api/organization/[id]/360` y `GET /api/organizations/[id]/workspace/compact-signals` corrigiendo el contrato completo del facet `delivery`: schema, proyección, reader canónico y guardrails de drift. El cierre debe ser robusto, no un parche local sobre una query.

## Why This Task Exists

El facet `delivery` de Account 360 empezó a leer `rpa_median`, `pipeline_velocity` y `stuck_asset_pct` desde `greenhouse_serving.organization_operational_metrics`, pero la tabla runtime no contiene esas columnas. La tabla nació como cache compacto; el reader nuevo asumió la forma rica de `greenhouse_serving.ico_organization_metrics`.

El bug exacto se introdujo en `1f06d26a835d5ae07f94253fb3ead29a32bb7283` (2026-06-09, `feat(organizations): harden enterprise workspace runtime`). La causa de fondo es duplicación de readers y drift de contrato SQL, la misma clase de problema ya documentada en `ISSUE-078`.

Sentry verificado el 2026-06-13 confirma que el bug no fue solo el correo inicial: group `7545900569`, 30 eventos en `preview` durante el 2026-06-12, `handled=yes`, `domain=delivery`, `source=account360.delivery.ico_serving`, primera aparición en release `f3be080bf330fe387a0506dfadaba40f3a99c555` y persistencia hasta `11c64db0d051cce47160603e3c347ff4213d6037`. Los eventos impactan tanto `/api/organization/[id]/360` como `/api/organizations/[id]/workspace/compact-signals`.

## Goal

- `GET /api/organization/[id]/360?facets=delivery` responde sin error SQL ni `facetErrors` por columnas inexistentes.
- `GET /api/organizations/[id]/workspace/compact-signals` responde sin capturar el mismo error desde `account360.delivery.ico_serving`.
- El contrato de `greenhouse_serving.organization_operational_metrics` queda explícito y alineado entre DDL, migración, proyección, tipos y readers.
- El facet `delivery` consume un reader canónico o una primitive compartida, sin reimplementar una UNION frágil con shapes divergentes.
- Los guardrails de Account 360 detectan drift de schema contra PostgreSQL real antes de preview/staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Prevalece runtime/schema real + arquitectura vigente sobre supuestos de TypeScript o docs antiguas.
- No cerrar con workaround frágil. Si se decide mantener la tabla compacta, el contrato parcial debe quedar documentado y el reader debe degradar explícitamente; si se decide enriquecerla, migración/proyección/backfill/tipos deben cerrar juntos.
- Todo SQL reader productivo de Account 360 debe tener smoke contra PostgreSQL real o un guard equivalente que falle loud ante columnas faltantes.
- BigQuery/ICO sigue siendo el source of truth analítico; `greenhouse_serving.*` es serving cache read-optimized y debe declarar cuándo es subset o parity.

## Normative Docs

- `docs/issues/open/ISSUE-087-account-360-delivery-rpa-median-schema-drift.md`
- `docs/issues/resolved/ISSUE-078-sql-reader-schema-mismatch-task-source-id-canonical-drift.md`
- `docs/tasks/complete/TASK-274-account-360-federated-serving-layer.md`
- `docs/tasks/complete/TASK-014-client-360-implementation.md`

## Dependencies & Impact

### Depends on

- `greenhouse_serving.organization_operational_metrics`
- `greenhouse_serving.ico_organization_metrics`
- `scripts/setup-postgres-organization-operational-serving.sql`
- `src/lib/sync/projections/organization-operational.ts`
- `src/lib/account-360/get-organization-operational-serving.ts`
- `src/lib/account-360/facets/delivery.ts`

### Blocks / Impacts

- Account 360 route: `src/app/api/organization/[id]/360/route.ts`
- Compact signals route: `src/app/api/organizations/[id]/workspace/compact-signals/route.ts`
- Organization workspace runtime and tabs.
- Finance client organization workspace.
- Compact organization signals.
- Sentry noise and preview reliability for `javascript-nextjs`.

### Files owned

- `migrations/**` (new additive migration)
- `scripts/setup-postgres-organization-operational-serving.sql`
- `src/lib/sync/projections/organization-operational.ts`
- `src/lib/account-360/facets/delivery.ts`
- `src/lib/account-360/get-organization-operational-serving.ts` or a new shared helper extracted from it
- `src/lib/account-360/account-complete-360.live.test.ts`
- `src/types/db.d.ts`
- `docs/issues/open/ISSUE-087-account-360-delivery-rpa-median-schema-drift.md`
- this task file

## Current Repo State

### Already exists

- `organization_operational_metrics` exists in Cloud SQL with 8 rows and periods 2026-03..2026-06, but only compact operational columns.
- `ico_organization_metrics` has the richer columns (`rpa_median`, `pipeline_velocity`, `stuck_asset_pct`).
- `getOrganizationOperationalServing()` already contains a safer fallback pattern for compact tables.
- Account 360 has a live test scaffold, but it skips unless PostgreSQL env is present.
- Sentry API now works locally via `SENTRY_INCIDENTS_AUTH_TOKEN`; issue `JAVASCRIPT-NEXTJS-7H` is confirmed as `unresolved`, group `7545900569`, 30 events, first seen `2026-06-12T07:40:12Z`, last seen `2026-06-12T23:54:42Z`.

### Gap

- `facets/delivery.ts` duplicates operational metric reading and assumes a richer table shape than runtime.
- Projection `organization-operational.ts` does not populate the rich columns.
- Setup SQL does not define the rich columns.
- No mandatory drift guard prevented the preview build from shipping a reader that references missing columns.
- Sentry releases lack source maps/commit association for the server chunks (`Source code was not found`, `commitCount=0`), so suspect-commit mapping must currently be done by git/runtime analysis.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract decision + additive migration

- Decidir explícitamente si `organization_operational_metrics` debe alcanzar parity con los campos de delivery que Account 360 expone. Recomendación inicial: sí, agregar columnas nullable y backfill desde `ico_organization_metrics` para evitar contratos parciales invisibles.
- Crear migración additive para:
  - `rpa_median NUMERIC(6,2)`
  - `pipeline_velocity NUMERIC(8,2)`
  - `stuck_asset_pct NUMERIC(5,2)`
- Backfill acotado desde `greenhouse_serving.ico_organization_metrics` por `(organization_id, period_year, period_month)`.
- Actualizar `scripts/setup-postgres-organization-operational-serving.sql`.
- Regenerar `src/types/db.d.ts` si el flujo del repo lo requiere.

### Slice 2 — Projection + canonical reader

- Actualizar `src/lib/sync/projections/organization-operational.ts` para poblar/upsert las columnas nuevas cuando existan en la fuente.
- Reemplazar la lógica duplicada de `src/lib/account-360/facets/delivery.ts` por un reader compartido o extraer una primitive server-only desde `getOrganizationOperationalServing()`.
- Si se mantiene una UNION entre tablas, ambas ramas deben declarar shape compatible por construcción y el test debe ejercitar esa query exacta contra PostgreSQL.
- Mantener degradación honesta para datos ausentes, sin catches silenciosos que conviertan schema drift en valores `null` sin señal.

### Slice 3 — Regression guards

- Fortalecer `src/lib/account-360/account-complete-360.live.test.ts` o agregar smoke dedicado para `facets=delivery`.
- Agregar smoke específico para `workspace/compact-signals`, porque Sentry confirmó que ese endpoint también ejecuta el path roto.
- Asegurar que el guard corre en el lane de preview/staging donde exista DB o que el pipeline falle con mensaje explícito si el smoke requerido se saltó.
- Agregar test unitario del mapper para columnas ausentes/null y test de query builder si se extrae helper.
- Documentar bug class como seguimiento de `ISSUE-078` si aparece un nuevo guard general de SQL schema drift.
- Revisar source maps/release association de Sentry para server chunks como sub-tarea de observabilidad si sigue apareciendo `Source code was not found` / `commitCount=0`.

### Slice 4 — Rollout + verification

- Aplicar migración en staging/preview, correr smoke de Account 360, desplegar el fix y monitorear Sentry.
- Si production comparte el runtime afectado, repetir migración/deploy/smoke con ventana controlada.
- Resolver `ISSUE-087` solo después de evidencia runtime y quiet period razonable de Sentry.

## Out of Scope

- Cambiar la semántica de RpA, OTD, FTR o bonus.
- Rehacer la arquitectura completa de Account 360.
- Migrar métricas ICO a un nuevo source of truth.
- Cambios UI/visuales en organization workspace; esta task es contrato data/reader/reliability.

## Detailed Spec

Contrato recomendado de columnas nuevas:

```sql
ALTER TABLE greenhouse_serving.organization_operational_metrics
  ADD COLUMN IF NOT EXISTS rpa_median NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pipeline_velocity NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS stuck_asset_pct NUMERIC(5,2);
```

Backfill recomendado:

```sql
UPDATE greenhouse_serving.organization_operational_metrics oom
SET
  rpa_median = iom.rpa_median,
  pipeline_velocity = iom.pipeline_velocity,
  stuck_asset_pct = iom.stuck_asset_pct
FROM greenhouse_serving.ico_organization_metrics iom
WHERE oom.organization_id = iom.organization_id
  AND oom.period_year = iom.period_year
  AND oom.period_month = iom.period_month;
```

Si en Discovery se decide que la tabla compacta NO debe enriquecerse, el agente debe registrar la decisión en docs/arquitectura o ADR ligero y el reader debe exponer campos faltantes como degradación explícita (`unavailable`/`null` con reason), no como shape implícito que parece parity.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + migration) -> Slice 2 (projection + reader) -> Slice 3 (guards) -> Slice 4 (rollout).
- No desplegar Slice 2 esperando columnas nuevas si Slice 1 no fue aplicada en el ambiente objetivo, salvo que el reader sea backward-compatible contra ambos schemas y esté probado contra ambos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reader vuelve a asumir columnas no aplicadas en el ambiente | Account 360 / PostgreSQL | medium | migración antes del deploy o reader dual-schema probado | Sentry `column ... does not exist`, live smoke |
| Backfill copia métricas de un periodo equivocado | Serving metrics | low | join por `organization_id, period_year, period_month` + conteo before/after | smoke SQL comparando tablas |
| Projection deja columnas nuevas siempre null | Sync projections | medium | test de upsert + smoke de periodo con datos reales | freshness/drift check del serving row |
| Guard live se salta en CI y el drift reaparece | Reliability | medium | skip explícito como failure en lanes productivos o job dedicado con env | CI annotation / smoke failure |

### Feature flags / cutover

Sin flag. La migración es additive y nullable. El cutover debe ser compatible con lectores existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Dejar columnas additive; revertir código si hay problema. Dropear columnas solo si se confirma que no hay consumers. | <15 min para revert code | parcial |
| Slice 2 | Revertir reader/projection al commit anterior; si columnas existen no rompen. | <15 min | si |
| Slice 3 | Ajustar o revertir guard si genera false positive, sin tocar runtime. | <15 min | si |
| Slice 4 | Rollback de deploy; columnas additive permanecen. | <15 min | si |

### Production verification sequence

1. Aplicar migración en staging/preview.
2. Verificar columnas:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema='greenhouse_serving'
     AND table_name='organization_operational_metrics'
     AND column_name IN ('rpa_median','pipeline_velocity','stuck_asset_pct');
   ```
3. Correr smoke SQL del reader `delivery` contra una organización real.
4. Desplegar code fix.
5. Ejecutar `GET /api/organization/[id]/360?facets=delivery` con auth/bypass correspondiente y confirmar sin `facetErrors`.
6. Ejecutar `GET /api/organizations/[id]/workspace/compact-signals` contra la misma organización staging observada por Sentry (`org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0`) y confirmar sin captura `account360.delivery.ico_serving`.
7. Monitorear Sentry por `JAVASCRIPT-NEXTJS-7H`.
8. Repetir en production si aplica.

### Out-of-band coordination required

- Acceso a Cloud SQL vía `pnpm pg:connect` o pipeline de migraciones autorizado.
- Confirmar qué deployment de Vercel/preview disparó el evento para validar el mismo target post-fix.

## Verification

Comandos esperados, ajustables durante ejecución:

```bash
pnpm migrate:up
pnpm db:generate-types
pnpm exec vitest run src/lib/account-360/account-complete-360.live.test.ts
pnpm exec tsc --noEmit --pretty false
pnpm build
```

Smoke SQL esperado:

```bash
GREENHOUSE_SKIP_PREFLIGHT=true pnpm pg:connect:shell
```

Luego verificar columnas, conteos y una consulta equivalente al facet `delivery`.

## Investigation Appendix

- Sentry event visible en email: `9c74783d68c84986a9a1a7b8b6dfbd60`.
- Sentry API no se pudo consultar localmente durante la investigación inicial porque faltaban credenciales read-only. El 2026-06-13 se configuró `SENTRY_INCIDENTS_AUTH_TOKEN` local desde Secret Manager y se verificó el issue real.
- Sentry issue: `JAVASCRIPT-NEXTJS-7H`, group `7545900569`, status `unresolved`, priority `high`, environment `preview`, count `30`.
- Sentry timing: first seen `2026-06-12T07:40:12Z`, last seen `2026-06-12T23:54:42Z`.
- Sentry tags: `domain=delivery`, `source=account360.delivery.ico_serving`, `handled=yes`, `turbopack=True`.
- Sentry affected transactions: `GET /api/organization/[id]/360` and `GET /api/organizations/[id]/workspace/compact-signals`.
- Sentry observed organization/URL: `org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0` on `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`.
- Sentry releases: first `f3be080bf330fe387a0506dfadaba40f3a99c555`, later events in `adcde46d6e311edacfbacabe60aba52b86c9d0d9`, `e57bdbd2ca08e3ad257c40e008d7c06a0b96d79b`, `7788ff58abe4218a4d0701ce2d4c35467a7e3b1e`, and last observed `11c64db0d051cce47160603e3c347ff4213d6037`.
- Sentry source-map/release gap: event detail reports `Source code was not found` for server chunks and release `commitCount=0`; Sentry did not provide suspect commit automatically.
- Reproducción Cloud SQL: query ofensiva falla con `42703`, `column "rpa_median" does not exist`.
- `organization_operational_metrics` runtime tiene 8 filas y periodos 2026-03..2026-06.
- `ico_organization_metrics` runtime tiene 8 filas y contiene las columnas ricas.
