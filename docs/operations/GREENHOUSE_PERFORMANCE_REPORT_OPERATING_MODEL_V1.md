# Greenhouse Performance Report Operating Model V1

## Delta 2026-04-02 — Freeze mensual por tarea queda operativo

`TASK-201` cierra el criterio operativo para períodos históricos de Delivery:

- el cierre mensual debe congelar un snapshot task-level del período antes de rematerializar scorecards
- el comando operativo queda explícito:
  - `pnpm freeze:delivery-performance-period <year> <month>`
- ese freeze:
  - escribe `ico_engine.delivery_task_monthly_snapshots`
  - marca el período como `locked`
  - rematerializa `ICO`
  - refresca `greenhouse_serving.agency_performance_reports`

Regla nueva:

- una vez congelado el período, el `Performance Report` ya no debe volver a leerse desde el estado vivo actual de Notion

## Delta 2026-04-02 — Publicación outbound a Notion queda operativa

`TASK-202` cierra el cutover `Greenhouse -> Notion`:

- el target canónico quedó formalizado en `greenhouse_core.space_notion_publication_targets`
- la trazabilidad runtime quedó formalizada en `greenhouse_sync.notion_publication_runs`
- la integración outbound se registra como `notion_delivery_performance_reports`
- la route operativa queda en:
  - `GET /api/cron/notion-delivery-performance-publish`
- la route soporta:
  - `year`
  - `month`
  - `spaceId`
  - `force=true`
  - `dryRun=true`
- el target base actual es la base Notion `Performance Reports`

## Objetivo

Definir cómo debe operarse el `Performance Report` mensual de Delivery cuando Greenhouse es el motor canónico y Notion consume el resultado.

## Regla base

El reporte mensual no se considera cerrado solo porque existan datos.

Debe pasar por:

- freeze de período
- validación de paridad de datos
- cálculo canónico en Greenhouse
- comparación contra baseline cuando aplique
- publicación a Notion

## Fuente canónica por capa

- `Notion`: source system operativo
- `Greenhouse conformed / marts / serving`: source of truth del cálculo
- `Notion Performance Reports`: surface de consumo y comunicación

## Contrato semántico base

Antes de publicar un período, Greenhouse debe asumir estas reglas mínimas:

- grano canónico: tareas con `due_date` dentro del período
- fecha de corte canónica del cierre mensual: `último día del período + 1 día`
- exclusiones mínimas: `Archivada`, `Cancelada`, `Tomado`
- buckets mutuamente excluyentes del scorecard de cumplimiento:
  - `On-Time`
  - `Late Drop`
  - `Overdue`
- `OTD` del reporte = `On-Time / total de tareas clasificadas del universo due-in-period`
- `Top Performer` usa ese mismo `OTD` y requiere volumen mínimo medido sobre total de tareas del período

Métricas complementarias fuera del denominador de `OTD`:

- `Carry-Over`
  - tareas creadas dentro del período con `due_date` posterior al cierre del período
- `Overdue Carried Forward`
  - tareas con `due_date` en o antes del cierre que siguen abiertas al comenzar el mes siguiente

Regla nueva:

- `Carry-Over` no mide atraso
- `Overdue Carried Forward` sí mide deuda vencida que cruza de mes

## Cadencia mensual

### 1. Cierre de período

- congelar el período calendario del reporte
- confirmar timezone y fecha de corte
- fijar los spaces incluidos

### 2. Readiness de datos

- verificar que el sync Notion -> conformed corrió para el período
- verificar cobertura de propiedades requeridas
- verificar que no existan gaps abiertos de schema readiness para el space

### 3. Cálculo canónico

- materializar el reporte mensual en Greenhouse
- persistir snapshot versionado del cálculo
- generar scorecards, comparativo y breakdowns requeridos

### 4. Validación

- comparar el resultado contra el baseline disponible
- documentar diferencias y su causa
- aprobar el snapshot como versión oficial del período

### 5. Publicación a Notion

- escribir el snapshot mensual en la base de `Performance Reports`
- actualizar propiedades calculadas y resumen
- dejar trazabilidad del run que publicó el reporte
- ejecutar primero `dryRun=true` si el período aún no fue publicado o si se está validando un recálculo

## Calibración inicial obligatoria

Antes de declarar operativo `Abril 2026`, Greenhouse debe recalcular y validar:

- `Marzo 2026`

Objetivo:

- demostrar que el cálculo Greenhouse reproduce el informe completo con paridad verificable

## Criterio de release del reporte

Un período mensual solo puede declararse `Greenhouse-first` si:

- el contrato de métricas está versionado
- la cobertura de propiedades requerida está cerrada
- el snapshot mensual existe en Greenhouse
- la comparación con baseline no tiene drift material no explicado

## Drift handling

Si Notion y Greenhouse divergen:

1. revisar reglas del contrato
2. revisar cobertura de propiedades
3. revisar transformación `notion_ops -> conformed`
4. revisar materialización mensual
5. corregir Greenhouse o la publicación a Notion antes de distribuir el reporte

## Documentación viva

La arquitectura del reporte vive en:

- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`

La lane ejecutable vive en:

- `docs/tasks/complete/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Los deltas de ejecución y validación viven en:

- `Handoff.md`
