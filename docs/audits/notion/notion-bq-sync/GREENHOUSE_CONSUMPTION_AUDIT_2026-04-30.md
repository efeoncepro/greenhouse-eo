# GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30

## Status

- Date: 2026-04-30
- Scope: auditoria de como `greenhouse-eo` consume `notion-bq-sync`
- Auditor: Codex
- Upstream audited separately: `NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- Critical downstream impacted: `greenhouse_conformed.delivery_*`, `ICO Engine`, onboarding/admin Notion

## Executive Summary

Greenhouse consume `notion-bq-sync` en mas de un plano, y eso cambia bastante la lectura del riesgo.

No es solo un upstream de datos para `ICO`. Hoy `greenhouse-eo` lo usa como:

1. backend admin para discovery y sample de bases Notion
2. oraculo de verificacion para registrar nuevos bindings `Space -> Notion`
3. fallback de discovery/schema para governance
4. writer upstream de `notion_ops.*` para `sync-conformed`
5. señal indirecta de salud operativa via `_synced_at` y `last_synced_at`

La conclusion operativa es:

- Greenhouse esta **mas acoplado** a `notion-bq-sync` de lo que sugiere el hecho de que el repo viva afuera
- el carril critico `notion-bq-sync -> notion_ops -> sync-conformed -> ICO` sigue siendo la dependencia mas importante
- ademas existe un acople paralelo de UX/admin que hoy depende de endpoints HTTP del sibling service
- el boundary arquitectonico todavia esta incompleto porque varios consumers del portal siguen leyendo `notion_ops` directo, no solo `greenhouse_conformed`

## Audit Scope

Aristas auditadas:

- rutas API del portal que llaman `NOTION_PIPELINE_URL`
- governance y schema refresh de Notion
- pipeline `raw -> conformed -> ICO`
- readers operativos que consumen `notion_ops` directo
- readers de observabilidad y readiness
- contratos documentales vivos del repo

Fuentes principales contrastadas:

- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/space-notion/notion-governance.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/integrations/notion-readiness.ts`
- `src/lib/integrations/notion-sync-operational-overview.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Consumption Map

### Plano 1 — Admin / onboarding

El portal usa `NOTION_PIPELINE_URL` para:

- descubrir bases Notion (`/discover`)
- traer muestras (`/discover/<db>/sample`)
- verificar acceso antes de registrar bindings

Rutas involucradas:

- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`

### Plano 2 — Governance / schema discovery

La gobernanza de Notion puede refrescar schemas de dos maneras:

- directo contra Notion API si existe `NOTION_TOKEN`
- via `notion-bq-sync` usando `discover` + `sample` cuando no existe token local

Archivo principal:

- `src/lib/space-notion/notion-governance.ts`

### Plano 3 — Carril critico de datos

El flujo operativo real sigue siendo:

1. `notion-bq-sync` escribe `notion_ops.{proyectos,tareas,sprints,revisiones}`
2. `sync-conformed` lee `notion_ops.*` y escribe `greenhouse_conformed.delivery_*`
3. `ico-materialize` consume `greenhouse_conformed.delivery_*`

Archivo principal:

- `src/lib/sync/sync-notion-conformed.ts`

### Plano 4 — Observabilidad / readiness

Greenhouse no tiene un reader directo del servicio upstream. La salud del sync se infiere desde:

- `_synced_at` en `notion_ops.*`
- `last_synced_at` en `greenhouse_core.space_notion_sources`

Archivos principales:

- `src/lib/integrations/notion-readiness.ts`
- `src/lib/integrations/notion-sync-operational-overview.ts`

### Plano 5 — Consumers directos adicionales

Aunque el boundary target es `greenhouse_conformed.delivery_*`, varios modulos del portal siguen leyendo `notion_ops` directo.

Ejemplos representativos:

- `src/lib/people/get-person-operational-metrics.ts`
- `src/lib/agency/agency-queries.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/team-queries.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`

Esto vuelve a `notion-bq-sync` una dependencia transversal, no solo un input del pipeline ICO.

## Findings

### G-001 — El plano admin del portal depende directamente de endpoints HTTP del sibling service

Severity: High

La ruta `GET /api/integrations/notion/discover` del portal es un proxy directo al `/discover` del pipeline. Ademas, si el frontend pide sample, el mismo handler llama `/discover/<db>/sample`.

Impacto:

- la UX admin depende de la disponibilidad, latencia y contrato HTTP de `notion-bq-sync`
- cualquier endurecimiento upstream de auth/identity obliga a adaptar el portal
- el portal no controla el backend funcional de discovery; solo lo retransmite

Evidencia:

- `src/app/api/integrations/notion/discover/route.ts`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`

### G-002 — Register y governance usan al pipeline como oraculo de verificacion y schema inference

Severity: High

`POST /api/integrations/notion/register` valida cada base consultando `sample?limit=1` en el pipeline. A la vez, `notion-governance` puede inferir schema desde sample records si el portal no tiene `NOTION_TOKEN`.

Impacto:

- un endpoint pensado para ingestion/admin termina definiendo si el onboarding pasa o falla
- la validacion depende de muestras, no de un contrato formal de schema
- governance puede degradarse a inference heuristica si no existe token directo

Evidencia:

- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/space-notion/notion-governance.ts`

### G-003 — El carril critico a ICO depende del shape raw de `notion_ops`, no de un contrato mas estable

Severity: High

`sync-conformed` lee `notion_ops.proyectos`, `notion_ops.tareas` y `notion_ops.sprints` directamente. Incluso introspecta columnas en runtime para decidir expresiones y tolerar drift.

Impacto:

- Greenhouse hereda directamente cambios de shape del writer externo
- el runtime conformed queda acoplado a nombres de columnas raw, aliases y heuristicas
- cualquier rotura upstream puede pegar antes de llegar a una capa canonica mas estable

Evidencia:

- `src/lib/sync/sync-notion-conformed.ts`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

### G-004 — El cierre del loop diario depende de ownership partido entre upstream y portal

Severity: Medium-High

La arquitectura viva documenta que `notion-bq-sync` cierra el loop downstream llamando `GET /api/cron/sync-conformed` cuando una corrida `full` termina bien. Eso significa que la materializacion diaria no depende solo del cron local del portal, sino tambien del callback del servicio hermano.

Impacto:

- hay dependencia cross-repo para cerrar el ciclo `raw -> conformed`
- debugging y rollback de incidentes requieren mirar ambos lados
- un cambio upstream en callback/auth puede degradar el pipeline aunque el portal no cambie

Evidencia:

- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`

### G-005 — La observabilidad de Greenhouse no puede consultar estado real del upstream; solo lo infiere

Severity: Medium-High

`getNotionSyncOperationalOverview()` declara explicitamente que nunca toca `notion-bq-sync` directo. En su lugar, usa `_synced_at` en `notion_ops.*` y señales de data quality/orchestration para inferir si el upstream esta sano.

Impacto:

- el portal no distingue con claridad entre “upstream no corrió”, “upstream corrió parcial” y “raw escribió tarde pero correctamente”
- la salud del servicio se diagnostica por efectos, no por estado propio
- incident response llega mas tarde y con menos precision

Evidencia:

- `src/lib/integrations/notion-sync-operational-overview.ts`
- `src/lib/integrations/notion-readiness.ts`

### G-006 — El boundary hacia `greenhouse_conformed` todavia esta incompleto: varios modulos leen `notion_ops` directo

Severity: High

Aunque el carril canonico para Delivery/ICO ya es `greenhouse_conformed.delivery_*`, todavia existen varios readers del portal que consultan `notion_ops` de forma directa para People, Agency, Projects, Team y dashboards.

Impacto:

- el blast radius de `notion-bq-sync` es mayor que el solo pipeline ICO
- `sync-conformed` no encapsula toda la dependencia raw
- cambios de shape en `notion_ops` pueden romper features no obvias del portal

Evidencia representativa:

- `src/lib/people/get-person-operational-metrics.ts`
- `src/lib/agency/agency-queries.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/team-queries.ts`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

### G-007 — El binding state vive repartido entre PostgreSQL, BigQuery replica y runtime externo

Severity: Medium

El registro de mappings escribe primero `greenhouse_core.space_notion_sources` en PostgreSQL y luego replica a BigQuery `greenhouse.space_notion_sources`, que es lo que el upstream usa. El flujo añade además `governanceRefresh`, pero no ejecuta el sync en la misma transaccion.

Impacto:

- existen ventanas donde el binding esta persistido pero el upstream aun no refleja datos nuevos
- troubleshooting requiere revisar PG, BQ replica, governance y pipeline
- el modelo es correcto para desacoplar, pero exige disciplina fuerte de observabilidad y recovery

Evidencia:

- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/space-notion/space-notion-store.ts`

## Architectural Reading

La dependencia de Greenhouse con `notion-bq-sync` hoy tiene dos formas distintas:

1. **dependencia estructural de datos**
2. **dependencia funcional de producto/admin**

La primera alimenta `ICO` y `delivery_*`.
La segunda afecta onboarding, discovery, governance y soporte operativo del portal.

Eso explica por que “migrar al SDK de Notion en el portal” ayuda, pero no mueve el riesgo principal: el coupling mas serio sigue viviendo en el servicio hermano y en el consumo directo de `notion_ops`.

## Recommendations

### Horizon 1 — Hardening inmediato del consumo

1. Preparar el portal para auth del upstream y eliminar la asuncion de endpoint publico.
2. Hacer explicito en `discover` y `register` que el backend depende de `notion-bq-sync`.
3. Agregar errores operativos mas estructurados en proxy/admin para distinguir timeouts, auth y upstream unavailable.

### Horizon 2 — Reducir coupling del plano admin

1. Separar conceptualmente `discovery/sample` de `batch sync`.
2. Evaluar absorcion parcial del plano admin dentro de `greenhouse-eo`.
3. Mantener `register` y `governance` sobre un contrato mas estable que sample-based inference.

### Horizon 3 — Reducir coupling del plano de datos

1. Seguir moviendo consumers runtime desde `notion_ops.*` hacia `greenhouse_conformed.delivery_*` o serving tables mas canonicas.
2. Documentar una matriz de readers raw pendientes por dominio.
3. Evitar agregar nuevos consumers directos de `notion_ops` salvo que no exista capa canonica.

### Horizon 4 — Endurecer observabilidad cross-repo

1. Exponer o acordar un reader upstream autenticado para estado de corrida.
2. Mantener `_synced_at` como verdad funcional, pero no como unica señal de salud.
3. Instrumentar claramente el loop `notion-bq-sync -> sync-conformed -> ico-materialize`.

## Priority View

Si el objetivo es proteger el flujo que mas importa de este chat, la prioridad correcta sigue siendo:

1. endurecer `notion-bq-sync`
2. endurecer como Greenhouse lo consume en admin y observabilidad
3. reducir consumers directos sobre `notion_ops`
4. reevaluar absorcion parcial o total cuando el hardening minimo ya este cerrado

## Conclusion

Greenhouse no consume `notion-bq-sync` de una sola forma. Lo usa como:

- backend admin
- verificador de onboarding
- fallback de governance
- writer upstream del pipeline hacia ICO
- señal indirecta de salud

Por eso la criticidad del servicio no puede leerse solo desde `sync-conformed`. El coupling real es mas amplio y hoy atraviesa producto, operaciones y data platform al mismo tiempo.
