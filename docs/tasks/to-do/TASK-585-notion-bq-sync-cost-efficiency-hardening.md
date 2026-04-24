# TASK-585 — Notion BQ Sync Cost Efficiency & Invocation Hardening

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
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-585-notion-bq-sync-cost-efficiency-hardening`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Reducir el costo fijo y endurecer la invocación de `notion-bq-sync` sin romper el sync diario ni los flows admin del portal que hoy dependen de su superficie HTTP pública. La lane parte con FinOps observable y una optimización de muy bajo riesgo (`minScale=0`), y recién después endurece identidad, Scheduler auth y exposición pública.

## Why This Task Exists

La auditoría live mostró que `notion-bq-sync` hoy combina tres problemas distintos en una misma pieza:

- costo fijo artificial por `minScale=1` aun con tráfico muy bajo
- exposición pública (`allUsers`) y Cloud Scheduler sin `OIDC`
- runtime legacy montado sobre la `default compute service account`

Al mismo tiempo, el portal sí depende de ese servicio para discovery y verificación de bases Notion, por lo que cerrar acceso o mover arquitectura sin secuencia rompería operación real. La task existe para convertir ese hallazgo en un plan ejecutable, medible y reversible.

## Goal

- Bajar el costo fijo de `notion-bq-sync` sin degradar el sync diario ni la UX admin crítica
- Migrar la invocación del servicio hacia identidad dedicada y auth explícita
- Dejar lista la transición desde servicio público legacy hacia una superficie privada/controlada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

Reglas obligatorias:

- mantener `notion-bq-sync` en `request-based billing`; no convertir esta task en una migración apresurada a `Cloud Run Jobs`
- el primer cambio runtime debe ser el de menor riesgo operativo (`minScale=0`) y debe tener rollback explícito
- no bajar memoria ni tocar retención de `notion_ops.raw_pages_snapshot` antes de medir el impacto del cambio de escala mínima
- no cerrar `allUsers` hasta que portal y Scheduler tengan un camino autenticado equivalente
- si la implementación requiere cambios en el repo externo `notion-bigquery`, documentar claramente qué vive fuera de este workspace y cómo se coordina

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/operations/postura-cloud-gcp.md`

## Dependencies & Impact

### Depends on

- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`
- `greenhouse_core.space_notion_sources`
- `notion_ops.raw_pages_snapshot`
- `project_context.md` (nota canónica de que el repo runtime del servicio es `notion-bigquery`)
- Billing export activo en `efeonce-group.billing_export` y `efeonce-group.billing_cud_export`

### Blocks / Impacts

- endurecimiento posterior del dominio Cloud / FinOps
- operación diaria de `notion-bq-daily-sync`
- surfaces admin de registro y discovery Notion
- follow-up futuro para separar discovery vs batch

### Files owned

- `docs/tasks/to-do/TASK-585-notion-bq-sync-cost-efficiency-hardening.md`
- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/documentation/operations/postura-cloud-gcp.md`

## Current Repo State

### Already exists

- el portal ya proxea discovery y sample de Notion hacia `NOTION_PIPELINE_URL` desde `src/app/api/integrations/notion/discover/route.ts`
- el registro de mappings Notion ya valida acceso llamando al mismo pipeline desde `src/app/api/integrations/notion/register/route.ts`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` declara a `notion-bq-sync` como writer canónico de `notion_ops`
- Billing export ya fue habilitado en BigQuery (`billing_export` + linked dataset `billing_cud_export`)

### Gap

- `notion-bq-sync` sigue con `minScale=1`, `allUsers`, `default compute service account` y Scheduler sin `OIDC`
- el costo live del servicio no está todavía cuantificado con queries sobre billing export
- la postura target está decidida, pero no existe una task canónica que secuencie costo, auth y cutover sin romper portal

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

### Slice 1 — Baseline FinOps y evidencia operacional

- crear queries base sobre `billing_export` para costo diario y tendencia de `notion-bq-sync`
- documentar baseline de uso, cold starts, duración de sync y costo asociado antes de cambiar configuración
- dejar evidencia explícita de por qué `minScale=1` es costo fijo y no crecimiento natural del portal

### Slice 2 — Optimización de bajo riesgo

- cambiar únicamente `minScale` de `1` a `0`
- mantener sin cambios `memory=2Gi`, `cpu=1`, `concurrency=1`, `timeout=600` y `startup CPU boost`
- correr validación controlada sobre `GET /health`, `GET /discover`, `GET /discover/:db/sample`, `POST /` manual y el siguiente run diario del Scheduler
- dejar rollback rápido a la revisión anterior documentado

### Slice 3 — Identidad dedicada y Scheduler autenticado

- crear o asignar una service account dedicada al runtime de `notion-bq-sync`
- reemplazar la `default compute service account` por permisos mínimos necesarios
- mover `Cloud Scheduler` a invocación HTTP con `OIDC`
- validar que el cron diario sigue sano antes de tocar exposición pública

### Slice 4 — Portal autenticado y cierre de exposición pública

- definir e implementar el camino autenticado desde el portal hacia el pipeline para discovery y sample
- actualizar `discover/route.ts` y `register/route.ts` para dejar de depender de un endpoint público anónimo
- retirar `allUsers` solo cuando portal y Scheduler ya estén validados con auth explícita

### Slice 5 — Diseño del siguiente desacople

- dejar follow-up concreto para separar `discovery/admin HTTP` de `batch sync`
- evaluar más adelante si el batch puro conviene como `Cloud Run Job`, pero sin mezclar esa migración en esta task

## Out of Scope

- bajar memoria por debajo de `2Gi` dentro de esta task
- aplicar TTL/retención a `notion_ops.raw_pages_snapshot` sin auditoría previa de consumidores
- reescribir la lógica interna completa del repo externo `notion-bigquery`
- migrar inmediatamente el servicio a `Cloud Run Jobs`
- rediseñar el pipeline canónico Notion → conformed más allá de este endurecimiento

## Detailed Spec

Decisiones ya ratificadas por la auditoría:

- `request-based billing` debe mantenerse
- `minScale=0` es el primer cambio recomendado porque reduce costo idle sin alterar contrato funcional
- el histórico de `OOM` con `512Mi` hace que la memoria actual (`2Gi`) no deba tocarse al inicio
- `allUsers` es deuda real, pero cerrarlo antes de adaptar portal + Scheduler rompería runtime
- la secuencia correcta es:
  1. medir
  2. bajar `minScale`
  3. mover identidad y auth
  4. cerrar exposición pública
  5. recién después separar discovery de batch

Se espera que el agente valide esta secuencia contra documentación oficial de Google Cloud antes de ejecutar cambios live, especialmente:

- `Cloud Run minimum instances`
- `Cloud Run request-based billing`
- `Cloud Scheduler HTTP auth / OIDC`
- `BigQuery billing export`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] existe un baseline verificable de costo y uso de `notion-bq-sync` usando `billing_export`
- [ ] `notion-bq-sync` opera con `minScale=0` sin regresión del sync diario ni de discovery/sample
- [ ] el runtime deja de usar la `default compute service account`
- [ ] `Cloud Scheduler` invoca el servicio con `OIDC`
- [ ] el portal tiene un camino autenticado para discovery/sample antes de retirar `allUsers`
- [ ] `allUsers` se elimina solo después de validar portal + Scheduler
- [ ] la task deja follow-up explícito para separación discovery/batch sin mezclarlo aquí

## Verification

- `gcloud run services describe notion-bq-sync --region us-central1 --format export`
- `gcloud scheduler jobs describe notion-bq-daily-sync --location us-central1`
- `bq ls efeonce-group:billing_export`
- `bq query --use_legacy_sql=false '<query de costo diario por servicio/SKU>'`
- validación manual de:
  - `GET /api/integrations/notion/discover`
  - `POST /api/integrations/notion/register`
  - corrida diaria de `notion-bq-daily-sync`
- revisión de logs y `sync_log` en `notion_ops`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se documentó claramente cualquier cambio que deba vivir o desplegarse en el repo externo `notion-bigquery`

## Follow-ups

- task futura para separar `notion-bq-discovery` vs `notion-bq-sync-batch`
- task futura para evaluar migración del batch puro a `Cloud Run Job`
- task futura para gobernanza de retención/particionado de `notion_ops.raw_pages_snapshot`

## Open Questions

- si la auth portal → pipeline debe resolverse con `identity token` directo, un proxy interno adicional o una absorción parcial del servicio al monorepo
- qué permisos mínimos exactos necesita la nueva service account del runtime en GCP y BigQuery
