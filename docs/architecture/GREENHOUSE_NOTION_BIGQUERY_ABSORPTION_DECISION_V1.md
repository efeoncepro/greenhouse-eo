# GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1

## Status

- Estado: `accepted`
- Fecha: `2026-04-24`
- Owner: `Codex / Greenhouse architecture`
- Relacionado con:
  - `docs/tasks/in-progress/TASK-585-notion-bq-sync-cost-efficiency-hardening.md`
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
  - `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

## Pregunta

¿Conviene absorber el repo externo `cesargrowth11/notion-bigquery` dentro de `greenhouse-eo` ahora que el portal depende operativamente de `notion-bq-sync`?

## Decision

**No absorber `notion-bigquery` dentro de `greenhouse-eo` por ahora.**

La decisión vigente es:

- reconocer que Greenhouse **sí depende operativamente** de `notion-bq-sync`
- mantener `notion-bigquery` como repo hermano y source of truth del pipeline `Notion -> notion_ops`
- corregir primero costo, auth e identidad del servicio actual
- reevaluar la absorción solo después de reducir la deuda operativa y medir la fricción real entre repos

## Contexto actual

`greenhouse-eo` depende hoy de `notion-bq-sync` en dos planos distintos:

1. **Plano de datos**
- `notion-bq-sync` es el writer canónico de `notion_ops.{tareas, proyectos, sprints, revisiones, stg_*, raw_pages_snapshot, sync_log}`
- al terminar un sync `full`, cierra el loop downstream llamando a `/api/cron/sync-conformed`
- `greenhouse_conformed.delivery_*` y varios consumers del portal siguen dependiendo de esa materia prima

2. **Plano de integración admin**
- el portal usa `NOTION_PIPELINE_URL` para discovery, sample y verificación de bases Notion
- hoy esas llamadas pasan por:
  - `src/app/api/integrations/notion/discover/route.ts`
  - `src/app/api/integrations/notion/register/route.ts`

Esto significa que la dependencia es real, pero no implica automáticamente que el ownership del código deba mudarse de repo.

## Razonamiento

### Por qué **no** absorber ahora

- el problema principal observado no es de ubicación del código, sino de postura runtime:
  - `minScale=1`
  - `allUsers`
  - `default compute service account`
  - `Cloud Scheduler` sin `OIDC`
- esos problemas se pueden resolver **sin** mover el código al monorepo
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ya declara a `notion-bigquery` como source of truth del pipeline `Notion -> notion_ops`
- el programa actual de integraciones Notion/commercial ya asume que `notion-bigquery` sigue intacto para ingestion
- absorberlo ahora mezclaría en un solo movimiento:
  - hardening cloud
  - FinOps
  - ownership cross-repo
  - posibles cambios de deploy/CI
  - posible refactor de discovery vs batch

Eso elevaría mucho el riesgo y haría más difícil aislar regresiones.

### Por qué **sí** importa dejarlo documentado

- evitar la falsa lectura de que `greenhouse-eo` “no depende” del servicio porque el código vive afuera
- evitar la falsa lectura opuesta de que “como el portal depende, entonces hay que absorberlo ya”
- separar claramente:
  - **dependencia operativa**: sí existe
  - **decisión de ownership/repositorio**: no cambia todavía

## Decision operativa derivada

El orden correcto de remediación es:

1. medir costo y uso con Billing Export
2. cambiar `minScale` de `1` a `0`
3. mover el runtime a service account dedicada
4. mover `Cloud Scheduler` a `OIDC`
5. adaptar portal para invocación autenticada
6. retirar `allUsers`
7. recién después reevaluar si conviene:
   - mantenerlo como repo hermano endurecido
   - absorber solo la superficie HTTP/admin
   - absorber el servicio completo

## Qué tendría que pasar para reabrir esta decisión

Reevaluar absorción si aparecen una o más de estas señales:

- cambios coordinados portal + pipeline se vuelven frecuentes y costosos
- el deploy/manual ops del repo externo se vuelve cuello de botella recurrente
- se necesita una sola CI/CD y una sola política de seguridad para discovery + batch
- discovery/admin y batch comparten tanta lógica/runtime que mantenerlos separados deja de ser más simple
- el equipo decide explícitamente consolidar servicios serverless hermanos dentro del monorepo

## Opciones futuras válidas

### Opción A — Mantener separado

Seguir con `notion-bigquery` como repo hermano, pero ya endurecido y con contrato explícito con el portal.

### Opción B — Absorción parcial

Absorber solo la superficie HTTP/admin que hoy usa el portal (`discover`, `sample`, verify), y dejar el batch de ingestion como servicio separado.

### Opción C — Absorción total

Mover todo el servicio al monorepo con CI/CD, auth y posture unificados.

## Conclusion

La postura vigente queda así:

- **Greenhouse sí depende de `notion-bq-sync`**
- **esa dependencia no justifica absorber `notion-bigquery` hoy**
- **primero se corrige postura y costo**
- **después se decide con datos si la absorción aporta más que complica**
