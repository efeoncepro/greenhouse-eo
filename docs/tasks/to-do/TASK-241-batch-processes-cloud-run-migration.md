# TASK-241 — Migrar procesos batch pesados de Vercel Functions a Cloud Run

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-241-batch-cloud-run-migration`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Migrar los procesos batch que exceden el timeout de Vercel Functions (120s Pro) a un servicio Cloud Run dedicado. El primer caso: la materialización ICO completa (`ico-materialize`) y el LLM enrichment pipeline (`materializeAiLlmEnrichments`). Documentar en arquitectura que todo proceso batch > 30s debe correr en Cloud Run, no en Vercel.

## Why This Task Exists

TASK-239 expuso el problema real: la materialización ICO completa (`materializeMonthlySnapshots`) con `monthsBack=3` excede consistentemente el timeout de 120s de Vercel Functions. El LLM enrichment pipeline (`materializeAiLlmEnrichments`) también tiene riesgo de timeout cuando procesa muchas señales con llamadas a Gemini. El workaround actual (crear endpoints Vercel más livianos que sólo disparan subconjuntos) es frágil y fragmenta la lógica.

El patrón ya está probado: `hubspot-greenhouse-integration` corre en Cloud Run con acceso a BigQuery y PostgreSQL. Solo falta replicar el pattern para los procesos ICO y formalizar la política de que batch pesado va a Cloud Run.

## Goal

- Un servicio Cloud Run que ejecute materialización ICO y LLM enrichment sin restricción de timeout
- Cloud Scheduler dispara los procesos en horario canónico (reemplaza crons de `vercel.json`)
- Vercel conserva los cron routes como health checks o triggers livianos (fire-and-forget)
- Documento de arquitectura que formalice: procesos batch > 30s → Cloud Run, no Vercel Functions
- TASK-239 Slice 4 (re-materialización LLM) se ejecuta exitosamente como primer caso de uso

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — infraestructura Cloud existente, crons, Cloud Run services
- `docs/architecture/Greenhouse_Services_Architecture_v1.md` — patrón de servicios Cloud Run (hubspot-greenhouse-integration)
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — contrato del ICO Engine, materialización, LLM lane
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — outbox events y proyecciones reactivas

Reglas obligatorias:

- El servicio Cloud Run usa el mismo service account que los Cloud Functions existentes, o uno dedicado con permisos equivalentes
- Acceso a PostgreSQL via Cloud SQL Connector (misma instancia `greenhouse-pg-dev`, perfil `runtime`)
- Acceso a BigQuery via Application Default Credentials (proyecto `efeonce-group`)
- Los outbox events se siguen publicando a PostgreSQL (`greenhouse_sync.outbox_events`) — el reactive consumer de Vercel los procesa
- El servicio debe ser idempotente: re-ejecutar el mismo período no corrompe datos (DELETE + INSERT pattern existente)
- Región: `us-east4` (misma que Cloud SQL y Cloud Functions existentes)

## Normative Docs

- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso (runtime necesita DML)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — patrón de sync pipelines

## Dependencies & Impact

### Depends on

- Cloud SQL instance `greenhouse-pg-dev` operativa en `us-east4`
- BigQuery dataset `ico_engine` con tablas de snapshots, signals y enrichments
- Service account con permisos: `roles/bigquery.dataEditor`, `roles/cloudsql.client`
- `src/lib/ico-engine/materialize.ts` — lógica de materialización ICO
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` — lógica de LLM enrichment
- `src/lib/ico-engine/ai/resolve-signal-context.ts` — entity resolution (TASK-239)

### Blocks / Impacts

- TASK-239 Slice 4 (re-materialización) — primer caso de uso del servicio
- Todo proceso batch futuro que exceda 30s deberá seguir este patrón
- Los cron routes de Vercel (`ico-materialize`, `ico-member-sync`) pasan a ser triggers livianos o se eliminan

### Files owned

- `services/ico-batch/` — nuevo directorio para el servicio Cloud Run [a crear]
- `docs/architecture/GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` — documento de política [a crear]
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — delta con nuevo servicio

## Current Repo State

### Already exists

- Patrón Cloud Run probado: `hubspot-greenhouse-integration` con acceso a BigQuery + PostgreSQL — `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `materializeMonthlySnapshots()` — 12 pasos de materialización ICO — `src/lib/ico-engine/materialize.ts`
- `materializeAiLlmEnrichments()` — pipeline LLM con entity resolution — `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
- Cloud Scheduler jobs existentes para otros servicios — `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Cron routes en `vercel.json`: `ico-materialize` (10:15 UTC), `ico-member-sync` (10:30 UTC)
- Endpoint admin temporal: `src/app/api/admin/ops/ico-llm-rematerialize/route.ts` (workaround de TASK-239)
- Cloud SQL Connector pattern centralizado en `src/lib/postgres/client.ts`
- BigQuery client singleton en `src/lib/bigquery.ts`

### Gap

- No existe un servicio Cloud Run para procesos batch ICO
- No existe política documentada de cuándo un proceso va a Cloud Run vs Vercel Functions
- No existe Cloud Scheduler job para ICO materialization (hoy depende de cron de Vercel que hace timeout)
- La materialización con `monthsBack > 1` falla consistentemente por timeout en Vercel
- El LLM enrichment puede fallar si hay muchas señales (14+ llamadas a Gemini ~5-8s c/u)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Documento de política de batch processing

- Crear `docs/architecture/GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` con:
  - Criterio: proceso batch > 30s → Cloud Run; < 30s puede quedarse en Vercel
  - Patrón de servicio: HTTP endpoint autenticado (IAM o shared secret), idempotente, con Cloud SQL Connector + BigQuery
  - Patrón de trigger: Cloud Scheduler → HTTP POST con payload `{ year, month }` (o equivalente)
  - Observabilidad: Cloud Logging + alertas en Slack via webhook on failure
  - Inventario de procesos candidatos a migración (ico-materialize, ico-member-sync, sync-conformed, etc.)
- Agregar delta a `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` documentando la política

### Slice 2 — Servicio Cloud Run: ICO Batch Worker

- Crear servicio Cloud Run con Node.js runtime que exponga:
  - `POST /ico/materialize` — ejecuta `materializeMonthlySnapshots(year, month)`
  - `POST /ico/llm-enrich` — ejecuta `materializeAiLlmEnrichments({ periodYear, periodMonth })`
  - `GET /health` — health check
- Autenticación vía IAM (service-to-service) o header secret
- Dockerfile basado en Node.js 22 con dependencias del ICO engine
- Cloud SQL Connector para acceso a `greenhouse-pg-dev`
- BigQuery credentials via Application Default Credentials
- Configuración: 1 GiB RAM, 1 vCPU, 1 min instance, timeout 300s, `us-east4`
- Decisión de arquitectura: el servicio importa directamente los módulos de `src/lib/` (monorepo build) o se extrae como paquete standalone — decidir durante Discovery

### Slice 3 — Cloud Scheduler jobs

- Crear Cloud Scheduler job para materialización ICO diaria (reemplaza `/api/cron/ico-materialize`)
  - Schedule: `15 10 * * *` UTC (misma hora actual)
  - Target: Cloud Run service `POST /ico/materialize` con `{ monthsBack: 3 }`
  - Retry: 1 intento, 60s timeout between retries
- Crear Cloud Scheduler job para LLM enrichment (se ejecuta después del materialization)
  - Schedule: `45 10 * * *` UTC (30 min después, asegura que outbox events estén publicados)
  - Target: Cloud Run service `POST /ico/llm-enrich` con mes actual
- Mantener los cron routes de Vercel como fallback/health check por un período de transición

### Slice 4 — Re-materialización de TASK-239

- Usar el servicio Cloud Run para ejecutar `POST /ico/llm-enrich` para Feb, Mar, Abr 2026
- Verificar que las narrativas usan nombres operativos (FTR%, RpA), nombres de entities, y doble capa narrativa
- Validar en staging UI (`/agency?tab=ico` → Nexa Insights)
- Eliminar el endpoint temporal `src/app/api/admin/ops/ico-llm-rematerialize/route.ts`

## Out of Scope

- Migrar TODOS los cron routes de Vercel a Cloud Run (solo los que exceden timeout)
- Cambiar la lógica de materialización ICO o LLM enrichment (solo se mueve a Cloud Run)
- Migrar el reactive consumer (`outbox-react`) — este es liviano y cabe en Vercel
- Cambiar el esquema de outbox events o proyecciones reactivas
- Crear CI/CD pipeline para el servicio Cloud Run (deploy manual en primera iteración)
- Monitoring avanzado (Grafana, alertas por métrica) — es follow-up

## Detailed Spec

### Decisiones de arquitectura a resolver durante Discovery

1. **Monorepo build vs standalone:**
   - Opción A: El servicio Cloud Run compila desde el monorepo Next.js y importa `src/lib/ico-engine/` directamente. Más simple pero el container es grande.
   - Opción B: Se extrae un paquete standalone con solo las dependencias necesarias (bigquery, postgres, genai). Más limpio pero más mantenimiento.
   - Recomendación: evaluar opción A primero por velocidad.

2. **Autenticación:**
   - Opción A: IAM nativo (Cloud Scheduler usa service account para invocar Cloud Run). Zero-config auth.
   - Opción B: Header secret (como `CRON_SECRET` de Vercel). Más portable pero menos seguro.
   - Recomendación: IAM nativo — ya probado con Cloud Functions existentes.

3. **Transición gradual:**
   - Los cron routes de Vercel se mantienen como fallback durante 2 semanas
   - Si Cloud Scheduler funciona establemente, se deshabilitan los crons de Vercel
   - El endpoint `ico-llm-rematerialize` se elimina cuando Cloud Run esté operativo

### Inventario de procesos candidatos (priorizado)

| Proceso | Ruta Vercel actual | Timeout típico | Prioridad migración |
|---------|-------------------|---------------|-------------------|
| ICO materialización completa | `/api/cron/ico-materialize` | 120s+ (falla) | **P0** — ya falla |
| LLM enrichment pipeline | (trigger reactivo) | 60-90s (riesgo) | **P0** — primer caso de uso |
| ICO member sync | `/api/cron/ico-member-sync` | ~45s | P2 — funciona hoy |
| Sync conformed | `/api/cron/sync-conformed` | ~30-60s | P2 — funciona hoy |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe servicio Cloud Run en `us-east4` que expone `/ico/materialize` y `/ico/llm-enrich`
- [ ] `POST /ico/materialize` con `monthsBack=3` completa exitosamente (no timeout)
- [ ] `POST /ico/llm-enrich` para un mes completa exitosamente con prompt v2
- [ ] Cloud Scheduler jobs disparan ambos endpoints en horario canónico
- [ ] Las narrativas re-materializadas de TASK-239 usan nombres operativos, entity names y doble capa
- [ ] Existe `docs/architecture/GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` con política formalizada
- [ ] Delta en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` documenta el nuevo servicio
- [ ] El endpoint temporal `ico-llm-rematerialize` se elimina del repo

## Verification

- Cloud Run service responde `200` en `/health`
- `POST /ico/materialize` con `{ "year": 2026, "month": 4 }` retorna resultado exitoso
- `POST /ico/llm-enrich` con `{ "year": 2026, "month": 3 }` retorna `succeeded`
- Cloud Scheduler log muestra ejecución exitosa
- Staging UI muestra narrativas mejoradas en Nexa Insights

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con el nuevo servicio
- [ ] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` con delta de migración a Cloud Run
- [ ] Deshabilitar crons redundantes de `vercel.json` (después de período de transición)

## Follow-ups

- Migrar `ico-member-sync` y `sync-conformed` a Cloud Run si experimentan timeouts
- CI/CD pipeline para deploy automático del servicio Cloud Run (GitHub Actions)
- Dashboard de observabilidad: duración de materialización, señales procesadas, errores
- Evaluar si el reactive consumer (`outbox-react`) necesita migración eventualmente
- Evaluar Cloud Tasks para paralelizar materialización por space (fan-out pattern)

## Open Questions

- Decidir monorepo build vs standalone package durante Discovery (Slice 2)
- Confirmar service account y permisos IAM necesarios con la infraestructura actual
