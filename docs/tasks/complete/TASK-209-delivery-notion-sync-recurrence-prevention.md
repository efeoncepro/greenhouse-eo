# TASK-209 - Delivery Notion Sync Recurrence Prevention & Orchestration Closure

## Delta 2026-04-03

- la lane queda cerrada con implementación validada en el repo:
  - control plane nuevo `greenhouse_sync.notion_sync_orchestration_runs`
  - helper canónico `src/lib/integrations/notion-sync-orchestration.ts`
  - recovery route `GET /api/cron/sync-conformed-recovery`
  - visibilidad operativa en `/admin/integrations` y `TenantNotionPanel`
- la solución final no depende de callback upstream desde `../notion-bigquery`; cierra la recurrencia localmente con freshness polling y retry auditado por `space_id`
- `vercel.json` queda alineado a la realidad del scheduler upstream: `sync-conformed` principal a `20 6 * * *`, recovery cada `30` minutos y monitor de data quality después de la ventana de recuperación
- validación ejecutada:
  - `pnpm exec vitest run src/lib/integrations/notion-sync-orchestration.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm migrate:up`

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `5`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Cerrar la causa de recurrencia operativa detrás del drift `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`, de modo que Greenhouse no dependa de reruns manuales de `sync-conformed` para recuperar paridad después del ciclo diario.

La lane no debe rediseñar la auditoría ni el monitor ya cerrados en `TASK-205`, `TASK-207` y `TASK-208`. Debe resolver el hueco que todavía permite que el raw de `Notion` quede más fresco que el conformed por desfase de scheduling, chaining o retry.

## Why This Task Exists

El incidente del `2026-04-03` dejó dos conclusiones distintas:

- la capa de observabilidad sí tenía bugs puntuales, ya corregidos
- pero también existía un drift real porque el raw de `Notion` quedó más fresco que el último run canónico de `sync-conformed`

Evidencia operativa confirmada:

- `TASK-205` dejó el auditor reusable y buckets como `fresh_raw_after_conformed_sync`
- `TASK-207` endureció el writer canónico y evitó materializar raw stale
- `TASK-208` dejó monitoreo persistido `healthy / degraded / broken`
- aun así, el estado saludable final solo se recuperó después de ejecutar manualmente `GET /api/cron/sync-conformed`

Eso significa que el incidente actual quedó resuelto, pero la prevención de reaparición todavía no está cerrada. Falta institucionalizar el contrato de orquestación entre refresh raw y materialización conformed.

## Goal

- Garantizar que el ciclo normal `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks` converja sin intervención manual.
- Cerrar el desfase entre raw freshness y el momento en que corre el writer canónico.
- Dejar evidencia operativa explícita para distinguir `esperando raw`, `reintentando`, `sincronizado` y `desalineado`.

## Recommended Execution Order

1. Ejecutar `TASK-209` primero.
2. Ejecutar `TASK-206` después.
3. Ejecutar `TASK-204` al final.

Razonamiento:

- esta lane estabiliza la base operativa del pipeline y evita que reaparezca drift `raw -> conformed`
- la atribución operativa de `TASK-206` no debe cerrarse sobre una sincronización que todavía pueda desalinearse por orquestación
- el split semántico de `TASK-204` debe correr sobre datos frescos y sobre una capa de ownership ya endurecida

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- no abrir un segundo writer para `greenhouse_conformed.delivery_tasks`
- no degradar `TASK-207` ni duplicar el monitor persistido de `TASK-208`
- cualquier retry, chaining o reschedule debe quedar auditado en el control plane existente
- la solución debe operar por `space_id` y preservar tenant isolation
- el estado `healthy` no puede depender de reruns manuales fuera del operating model normal

## Dependencies & Impact

### Depends on

- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `TASK-205 - Delivery Notion Origin Parity Audit`
- `TASK-207 - Delivery Notion Sync Pipeline Hardening & Freshness Gates`
- `TASK-208 - Delivery Data Quality Monitoring & Drift Auditor`
- `src/app/api/cron/sync-conformed/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/integrations/notion-readiness.ts`
- `src/lib/integrations/notion-delivery-data-quality.ts`
- `vercel.json`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.integration_data_quality_runs`

### Impacts to

- el control plane de la integración nativa de `Notion`
- el runtime de `sync-conformed`
- la confiabilidad operativa de `delivery_tasks`
- `TASK-204 - Delivery Carry-Over & Overdue Carried Forward Semantic Split`
- `TASK-206 - Delivery Operational Attribution Model`
- cualquier consumer downstream que asuma que `greenhouse_conformed.delivery_tasks` está fresco después del ciclo diario

### Files owned

- `docs/tasks/complete/TASK-209-delivery-notion-sync-recurrence-prevention.md`
- `src/app/api/cron/sync-conformed/route.ts`
- `src/app/api/cron/sync-conformed-recovery/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/integrations/notion-readiness.ts`
- `src/lib/integrations/notion-delivery-data-quality.ts`
- `src/lib/integrations/notion-sync-orchestration.ts`
- `src/types/notion-sync-orchestration.ts`
- `vercel.json`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Current Repo State

### Ya existe

- `TASK-205` ya dejó un auditor reusable para medir drift real y buckets de causa
- `TASK-207` ya endureció el writer canónico, preservó jerarquía y bloquea materialización si el raw está stale
- `TASK-208` ya persiste runs/checks históricos y expone salud operativa por `space`
- el staging quedó `healthy` para `Efeonce` y `Sky Airline` después del rerun manual del writer canónico
- `greenhouse_sync.source_sync_runs` ya conserva evidencia suficiente para correlacionar runs cancelados, fallidos y exitosos

### Gap actual

- el sistema actual todavía permite que el raw de `Notion` quede más fresco que el último conformed exitoso
- la convergencia final todavía puede requerir rerun manual de `sync-conformed`
- no está formalizado si la solución correcta es chaining post-raw, retry diferido, reschedule del cron o una combinación de esas estrategias
- falta un contrato explícito para declarar que el ciclo diario terminó realmente alineado y no solo que `sync-conformed` corrió alguna vez

## Scope

### Slice 1 - Recurrence contract

- definir qué significa exactamente “ciclo diario convergido” para `Notion -> raw -> conformed`
- formalizar la relación entre frescura del raw y obligación de correr el writer canónico
- distinguir contractualmente `raw stale`, `raw fresh but conformed pending` y `conformed healthy`

### Slice 2 - Orchestration closure

- decidir y materializar el mecanismo operativo correcto:
  - chaining desde el refresh raw
  - retry con backoff
  - reschedule del cron
  - combinación de los anteriores
- evitar dependencia en intervención manual para recuperar paridad

### Slice 3 - Control plane evidence

- persistir o exponer razón explícita cuando el conformed queda pendiente por esperar raw
- dejar trazabilidad suficiente para correlacionar runs raw, runs conformed y health checks
- asegurar que el monitor de `TASK-208` pueda distinguir degradación real de pipeline lento pero todavía convergiendo

### Slice 4 - Validation in staging

- demostrar el comportamiento correcto en el ciclo real de staging
- confirmar que los active spaces no vuelven a quedar en `broken` o `degraded` por mera descoordinación de horarios
- documentar thresholds, ventanas y expectativas operativas finales

## Out of Scope

- reabrir el diseño base del auditor de `TASK-205`
- rehacer el hardening estructural ya cerrado por `TASK-207`
- reemplazar el monitor histórico y surfaces admin ya cerradas por `TASK-208`
- redefinir métricas de Delivery, owner attribution o semántica de carry-over
- resolver consumers downstream ajenos a este contrato de orquestación

## Acceptance Criteria

- [ ] El ciclo normal de sync ya no requiere reruns manuales para alinear `notion_ops` y `greenhouse_conformed.delivery_tasks`.
- [ ] Existe un mecanismo explícito y auditado que vuelve a intentar o encadena el writer canónico cuando el raw se refresca después del primer intento.
- [ ] `source_sync_runs` y la evidencia operativa permiten distinguir claramente `waiting for raw`, `retry scheduled`, `sync completed` y `sync failed`.
- [ ] El monitor de `TASK-208` permanece `healthy` después del ciclo normal de staging para los spaces activos sin intervención manual.
- [ ] `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` queda actualizado con el contrato operativo final.

## Verification

- `pnpm build`
- `pnpm lint`
- validación manual o programada del ciclo real en `staging`
- revisión de `greenhouse_sync.source_sync_runs` + `greenhouse_sync.integration_data_quality_runs`
