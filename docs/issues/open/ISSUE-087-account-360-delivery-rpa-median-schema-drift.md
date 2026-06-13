# ISSUE-087 — Account 360 delivery facet falla por drift de columnas RpA en serving cache

## Ambiente

preview (`javascript-nextjs`, Sentry alert `JAVASCRIPT-NEXTJS-7H`). Riesgo latente en staging/production si el mismo build lee el facet `delivery` contra el schema actual de Cloud SQL.

## Detectado

2026-06-12 03:40:12 -04, Sentry email: `GET /api/organization/[id]/360` con excepción `column "rpa_median" does not exist`. Investigado por Codex el 2026-06-13.

## Evidencia Sentry verificada

Consulta read-only via Sentry API el 2026-06-13, usando `SENTRY_INCIDENTS_AUTH_TOKEN` local:

- Issue short ID: `JAVASCRIPT-NEXTJS-7H`
- Group ID: `7545900569`
- Estado Sentry: `unresolved`, `substatus=new`, prioridad `high`
- Ambiente: `preview`
- Count: `30`
- First seen: `2026-06-12T07:40:12Z` (`2026-06-12 03:40:12 -04`)
- Last seen: `2026-06-12T23:54:42Z` (`2026-06-12 19:54:42 -04`)
- Error title: `error: column "rpa_median" does not exist`
- Tags relevantes: `domain=delivery`, `source=account360.delivery.ico_serving`, `handled=yes`, `turbopack=True`
- First release: `f3be080bf330fe387a0506dfadaba40f3a99c555`
- Last release observado: `11c64db0d051cce47160603e3c347ff4213d6037`
- Releases intermedios con el mismo error en eventos muestreados: `adcde46d6e311edacfbacabe60aba52b86c9d0d9`, `e57bdbd2ca08e3ad257c40e008d7c06a0b96d79b`, `7788ff58abe4218a4d0701ce2d4c35467a7e3b1e`
- Organización/ruta del caso vivo observado: `org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0` en `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`

El evento del email (`9c74783d68c84986a9a1a7b8b6dfbd60`) existe en Sentry y pertenece al mismo group. Sentry reporta source maps ausentes para los chunks server (`Source code was not found`) y releases sin commits asociados (`commitCount=0`), por lo que no identifica suspect commit automáticamente; el mapeo al commit roto se obtuvo por git + runtime schema.

## Síntoma

Las llamadas a Account 360 que piden el facet `delivery` emiten error SQL:

```text
error: column "rpa_median" does not exist
```

El stack apunta a `src_lib_account-360...`. Sentry confirmó dos transacciones afectadas:

- `GET /api/organization/[id]/360`
- `GET /api/organizations/[id]/workspace/compact-signals`

Ambas rutas invocan lectura de Account 360 / compact signals que termina ejecutando el facet `delivery`.

## Causa raíz

El reader `src/lib/account-360/facets/delivery.ts` construye un CTE que intenta leer estas columnas desde `greenhouse_serving.organization_operational_metrics`:

- `rpa_median`
- `pipeline_velocity`
- `stuck_asset_pct`

La tabla runtime no tiene esas columnas. Verificado contra Cloud SQL via `information_schema.columns`; su contrato real es el cache compacto:

- `organization_id`
- `period_year`
- `period_month`
- `tasks_completed`
- `tasks_active`
- `tasks_total`
- `rpa_avg`
- `otd_pct`
- `ftr_pct`
- `cycle_time_avg_days`
- `throughput_count`
- `stuck_asset_count`
- `source`
- `materialized_at`

El drift exacto se introdujo en `1f06d26a835d5ae07f94253fb3ead29a32bb7283` (`feat(organizations): harden enterprise workspace runtime`, 2026-06-09), al cambiar el facet `delivery` para preferir `organization_operational_metrics` y unirla con `ico_organization_metrics`, copiando la forma rica de la segunda tabla sobre la primera.

Historial relevante:

- `7846de5a0c4c72a00f4a5b033ef05f8054369413` (2026-03-26) creó `organization_operational_metrics` como cache compacto; nunca incluyó esas columnas.
- `72d22ccfbd1a4a19578f87342baf3e7b6d621edc` (2026-03-26) ya endureció el helper `getOrganizationOperationalServing()` usando aliases seguros (`NULL::numeric AS rpa_median`, etc.) y fallback a `ico_organization_metrics`/BigQuery.
- `6308564c7a474b6dc419cdd18bcf459559b1d471` (TASK-274, 2026-04-07) introdujo el serving federado de Account 360; inicialmente el facet leía `ico_organization_metrics` directamente y no disparaba este error.

Causa estructural: hay dos readers para la misma intención de delivery/operational metrics, con contratos divergentes. El guard live `src/lib/account-360/account-complete-360.live.test.ts` existe, pero se salta si no hay env de PostgreSQL (`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` o `GREENHOUSE_POSTGRES_HOST`), por lo que no capturó el drift antes de preview.

## Impacto

Toda superficie que consuma `GET /api/organization/[id]/360` con `facets=delivery` puede degradar datos de delivery y generar ruido en Sentry. Blast radius identificado:

- `src/views/greenhouse/organizations/tabs/OrganizationOverviewTab.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationProjectsTab.tsx`
- `src/views/greenhouse/organizations/AgencyOrganizationWorkspaceClient.tsx`
- `src/views/greenhouse/organizations/OrganizationView.tsx`
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`
- `src/views/greenhouse/finance/FinanceClientsOrganizationWorkspaceClient.tsx`
- `src/lib/organization-workspace/compact-signals.ts`

El resolver de Account 360 puede devolver facet errors parciales, y el path `compact-signals` también captura el mismo fallo como degradación observada. El tag Sentry `handled=yes` confirma que no fue un crash bruto, sino un error capturado por `observeAndDegrade()`; aun así el contrato SQL está roto y Sentry lo registra en runtime.

## Solución

Resolver mediante `TASK-1106`, con solución robusta:

- formalizar el contrato de `organization_operational_metrics`;
- alinear migración, setup script y proyección `src/lib/sync/projections/organization-operational.ts`;
- eliminar la duplicación frágil entre `facets/delivery.ts` y `getOrganizationOperationalServing()`;
- agregar guardrails que fallen si el schema real vuelve a divergir.

No aceptar como cierre una curita local que solo agregue `NULL AS rpa_median` en un reader sin decidir el contrato de la tabla/proyección y sin smoke contra PostgreSQL real.

## Verificación

Verificado durante investigación:

- Cloud SQL confirma que `organization_operational_metrics` no tiene `rpa_median`, `pipeline_velocity` ni `stuck_asset_pct`.
- Query ofensiva reproducida contra Cloud SQL con error `42703`, `column "rpa_median" does not exist`.
- `ico_organization_metrics` sí contiene las columnas ricas.
- Sentry API confirma `JAVASCRIPT-NEXTJS-7H` / group `7545900569`, 30 eventos en preview el 2026-06-12, impactando `360` y `workspace/compact-signals`.

Verificación requerida para cerrar:

- migración/proyección/reader alineados;
- `GET /api/organization/[id]/360?facets=delivery` responde sin `facetErrors`;
- smoke live PostgreSQL del facet `delivery` falla loud si falta una columna esperada;
- Sentry queda sin nuevos eventos de `JAVASCRIPT-NEXTJS-7H` para esta causa en el ambiente afectado.

## Estado

open

## Relacionado

- `TASK-1106`
- `ISSUE-078` (bug class análogo: SQL reader schema mismatch contra schema real)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `src/lib/account-360/facets/delivery.ts`
- `src/lib/account-360/get-organization-operational-serving.ts`
- `src/lib/sync/projections/organization-operational.ts`
- `scripts/setup-postgres-organization-operational-serving.sql`
