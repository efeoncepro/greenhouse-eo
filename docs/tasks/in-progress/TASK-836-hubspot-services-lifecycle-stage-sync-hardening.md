# TASK-836 — HubSpot Services Lifecycle Stage Sync + Sample Sprint Validation Stage

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm / delivery / data`
- Blocked by: `none`
- Branch: `task/TASK-836-hubspot-services-lifecycle-stage-sync-validation-stage`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Corrige la sincronizacion de servicios HubSpot `p_services` (`0-162`) hacia `greenhouse_core.services` para preservar la etapa real del Service Pipeline y representar Sample Sprints como servicios no-regulares. El sync actual aplana todos los servicios materializados a `pipeline_stage='active'`, `status='active'`, `active=TRUE`, lo que hace que servicios `Closed`, `En renovacion` u `Onboarding` se vean operativamente como activos genericos en Greenhouse.

La task introduce una etapa previa en HubSpot Service Pipeline (`Validacion / Sample Sprint`), un mapper canonico, tests, backfill idempotente y verificacion runtime para que Greenhouse refleje el lifecycle de servicios gobernado por HubSpot sin confundir Deal Pipeline, Service Pipeline ni el lifecycle interno de Sample Sprints.

## Why This Task Exists

HubSpot `p_services` es el source of truth para service/engagement instances reflejadas en el CRM. Durante la revision del 2026-05-08 se verifico que HubSpot tiene 17 servicios reales en el custom object `0-162` distribuidos entre `Closed`, `Activo`, `En renovacion` y `Onboarding`, pero el mirror local `greenhouse_core.services` solo materializa 6 servicios `regular` y todos quedan como `active`.

La causa raiz esta en `src/lib/services/upsert-service-from-hubspot.ts`: el UPSERT canonico hardcodea `pipeline_stage='active'`, `status='active'` y `active=TRUE`. Eso rompe P&L, ICO, service attribution, surfaces operativas y cualquier decision que dependa de saber si un servicio esta cerrado, pausado, renovandose u onboarding.

La decision de producto revisada es que un Sample Sprint tambien es un `service`: no es un servicio regular contratado, pero si un servicio no-regular (`engagement_kind IN ('trial','pilot','poc','discovery')`). Por eso el Service Pipeline de HubSpot necesita una etapa previa a `Onboarding` que represente validacion/Sample Sprint, mientras Greenhouse conserva el lifecycle detallado de approval, progreso y outcome.

## Goal

- Preservar la etapa real del Service Pipeline de HubSpot al materializar `greenhouse_core.services`.
- Agregar una etapa `Validacion / Sample Sprint` antes de `Onboarding` en HubSpot Service Pipeline.
- Mantener un unico mapper canonico `HubSpot p_services stage -> Greenhouse service lifecycle`.
- Representar Sample Sprints como servicios no-regulares, no como entidad paralela ni como servicio regular.
- Definir la regla de conversion: Sample Sprint convertido -> servicio regular en `Onboarding` con lineage.
- Evitar defaults silenciosos a `active` cuando HubSpot agregue o cambie etapas.
- Re-sincronizar servicios existentes de forma idempotente y auditable.
- Documentar el contrato para que Deals, Sample Sprints y servicios contratados no vuelvan a mezclarse.

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
- `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- HubSpot `p_services` (`objectTypeId 0-162`) refleja service/engagement instances; Greenhouse conserva la semantica fina mediante `engagement_kind` y lifecycle interno.
- No confundir Service Pipeline con Deal Pipeline. Deals gobiernan oportunidad comercial; `p_services` gobierna delivery/engagement contratado.
- No confundir servicios regulares `engagement_kind='regular'` con Sample Sprints (`engagement_kind IN ('pilot','trial','poc','discovery')`). Ambos son `services`; cambian su tipo y reglas operativas.
- La etapa HubSpot `Validacion / Sample Sprint` no reemplaza approvals/progress/outcome de Greenhouse; solo proyecta el estado macro del servicio no-regular hacia HubSpot.
- No crear tabla paralela de services ni path de sync alternativo; corregir el helper canonico `upsertServiceFromHubSpot`.
- No hacer updates manuales ad hoc sobre `greenhouse_core.services` salvo como parte de un backfill idempotente versionado/operable.
- Las filas `Closed` no deben participar como activas en P&L/ICO/attribution por accidente.
- Una etapa HubSpot desconocida debe degradar de forma auditable; no default silencioso a `active`.

## Normative Docs

- `docs/documentation/comercial/servicios-engagement.md`
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`
- `docs/tasks/complete/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md`
- `docs/tasks/to-do/TASK-821-client-lifecycle-hubspot-trigger-semi-automatic.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-813` completada: inbound sync + legacy cleanup de HubSpot `p_services`.
- `TASK-801` a `TASK-810` completadas: primitive Sample Sprints sobre `greenhouse_core.services.engagement_kind`.
- `greenhouse_core.services` con columnas `pipeline_stage`, `status`, `active`, `hubspot_sync_status`, `hubspot_service_id`, `engagement_kind`.
- HubSpot portal `48713323` con Service Pipeline actual en `0-162`.
- `src/lib/services/upsert-service-from-hubspot.ts`
- `src/lib/hubspot/list-services-for-company.ts`
- `scripts/services/backfill-from-hubspot.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts`
- `src/lib/webhooks/handlers/hubspot-services.ts`
- `src/lib/commercial/sample-sprints/lineage.ts`
- `src/lib/commercial/sample-sprints/outcomes.ts`

### Blocks / Impacts

- Corrige el estado operativo de servicios usados por:
  - `src/lib/service-attribution/materialize.ts`
  - `greenhouse_serving.commercial_cost_attribution_v2`
  - `greenhouse_serving.gtm_investment_pnl`
  - `src/lib/reliability/queries/services-sync-lag.ts`
  - `src/lib/reliability/queries/services-legacy-residual-reads.ts`
  - surfaces futuras de Organization Workspace y servicios contratados.
- Reduce drift para TASK-821 y cualquier automatizacion client lifecycle que consuma servicios contratados.
- Alinea TASK-835 con el modelo correcto: Sample Sprints son `services` no-regulares y pueden proyectarse a HubSpot Service Pipeline sin usar una entidad paralela.
- Puede requerir migracion si `greenhouse_core.services.pipeline_stage` no acepta `validation` o equivalente en runtime real.

### Files owned

- `src/lib/services/upsert-service-from-hubspot.ts`
- `src/lib/services/service-lifecycle-mapper.ts` (nuevo, si Discovery confirma nombre)
- `src/lib/services/service-lifecycle-mapper.test.ts` (nuevo)
- `src/lib/services/engagement-kind-cascade.ts` (nuevo, helper puro para cascade)
- `src/lib/services/engagement-kind-cascade.test.ts` (nuevo)
- `src/lib/services/upsert-service-from-hubspot.test.ts` (nuevo o existente si se crea)
- `src/lib/commercial/sample-sprints/conversion.ts`
- `src/lib/commercial/sample-sprints/lineage.ts`
- `scripts/services/backfill-from-hubspot.ts`
- `src/lib/hubspot/list-services-for-company.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts`
- `src/lib/webhooks/handlers/hubspot-services.ts`
- `src/lib/reliability/queries/service-engagement-lifecycle-stage-unknown.ts` (nuevo)
- `src/lib/reliability/queries/service-engagement-engagement-kind-unmapped.ts` (nuevo)
- `src/lib/reliability/queries/service-engagement-renewed-stuck.ts` (nuevo)
- `src/lib/reliability/queries/service-engagement-lineage-orphan.ts` (nuevo)
- `src/lib/reliability/queries/get-reliability-overview.ts` (extender con los 4 signals nuevos)
- `migrations/<timestamp>_task-836-services-lifecycle-validation-stage-and-lineage-protection.sql` (nuevo)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar `commercial.service_engagement.lifecycle_changed v1`)
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/documentation/comercial/servicios-engagement.md`
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`
- `CLAUDE.md` (agregar Hard Rules canonicas para que tasks futuras hereden las invariantes)

## Current Repo State

### Already exists

- `greenhouse_core.services` existe como mirror operativo de HubSpot `p_services`.
- `src/lib/services/upsert-service-from-hubspot.ts` es el helper canonico de UPSERT por `hubspot_service_id`.
- `src/lib/hubspot/list-services-for-company.ts` lee `0-162` via API directa HubSpot.
- `scripts/services/backfill-from-hubspot.ts` puede re-materializar services por company.
- `src/lib/sync/projections/hubspot-services-intake.ts` materializa desde outbox async.
- `src/lib/webhooks/handlers/hubspot-services.ts` acepta events `service.*`, `p_services.*` y `0-162.*`.
- `Greenhouse_Services_Architecture_v1.md` ya define `pipeline_stage IN ('onboarding','active','renewal_pending','renewed','closed','paused')`.
- `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` define que Sample Sprint no es tabla nueva: es `greenhouse_core.services.engagement_kind != 'regular'`.

### Gap

- El UPSERT canonico ignora `hs_pipeline_stage` y siempre guarda:
  - `pipeline_stage='active'`
  - `status='active'`
  - `active=TRUE`
- HubSpot Service Pipeline actual verificado el 2026-05-08:
  - `8e2b21d0-7a90-4968-8f8c-a8525cc49c70` -> `Onboarding`
  - `600b692d-a3fe-4052-9cd7-278b134d7941` -> `Activo`
  - `de53e7d9-6b57-4701-b576-92de01c9ed65` -> `En renovacion`
  - `1324827222` -> `Renovado`
  - `1324827223` -> `Closed`
  - `1324827224` -> `Pausado`
- Falta etapa previa para servicios no-regulares / Sample Sprints: `Validacion / Sample Sprint`.
- HubSpot tiene 17 services en `0-162`; Greenhouse solo tiene 6 `regular` materializados y todos aparecen `active`.
- Servicios cerrados o en renovacion pueden contaminar P&L/ICO/attribution por leerse como activos.
- Si se agrega `Validacion / Sample Sprint`, el schema/runtime debe decidir si `pipeline_stage='validation'` se incorpora al CHECK historico o si se reutiliza otra etapa canonica con metadata. Recomendacion: agregar `validation` como valor canonico explicito.

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

### Slice 1 — HubSpot Service Pipeline Configuration

- Verificar via HubSpot API el Service Pipeline actual de `0-162` y sus stage IDs.
- Crear en HubSpot la etapa `Validacion / Sample Sprint` antes de `Onboarding`, con API/runbook y rollback documentado.
- Verificar o crear en HubSpot `p_services` una property de tipo de servicio con label humano y nombre interno tecnico:
  - label visible recomendado: `Tipo de servicio`
  - internal name recomendado: `ef_engagement_kind`
  - values internos: `regular`, `pilot`, `trial`, `poc`, `discovery`
  - labels visibles: `Contratado`, `Piloto`, `Trial`, `POC`, `Discovery`
- Registrar el stage ID resultante en la task/docs despues de crearlo.
- No mover services existentes a la etapa nueva durante esta configuracion, salvo que exista un Sample Sprint real que deba proyectarse y el plan lo apruebe.

### Slice 2 — Schema Compatibility for Validation Stage + Lineage Protection

- Verificar si el CHECK real de `greenhouse_core.services.pipeline_stage` acepta solo `onboarding|active|renewal_pending|renewed|closed|paused`.
- Si no acepta `validation`, crear migration siguiendo el patron canonico del repo:
  - Marker `-- Up Migration` exacto al inicio (anti pre-up-marker bug, ver CLAUDE.md "Database — Migration markers").
  - DROP CONSTRAINT viejo + ADD CONSTRAINT nuevo en la misma migration (atomic dentro de la tx).
  - Bloque DO con `RAISE EXCEPTION` post-DDL que verifica que `'validation'` quedo aceptado por el CHECK; aborta si no.
  - Patron `NOT VALID + VALIDATE atomic` no aplica aqui porque no se backfillea valores invalidos previos; el extend del enum es seguro al apply.
- Orden de rollout obligatorio (sino runtime falla):
  1. Migration aplicada (extiende CHECK + agrega lineage column si aplica).
  2. Codigo mergeado (mapper TS empieza a producir `validation`).
  3. Backfill ejecutado (Slice 6).
  Si se invierte, el primer INSERT con `pipeline_stage='validation'` rompe con CHECK violation.
- Actualizar tipos Kysely (`pnpm db:generate-types`) y docs de arquitectura con el nuevo valor.
- Confirmar que consumers de P&L/ICO/attribution no tratan `validation` como servicio regular activo salvo que el `engagement_kind` y terms lo justifiquen.

#### Lineage protection structural (defensa estructural pre-TASK-837)

Aunque la conversion Sample Sprint -> servicio regular se implementa en `TASK-837`, la proteccion estructural del lineage debe quedar instalada en este foundation para que cualquier path futuro (manual, wizard, backfill) no pueda crear lineage invalido:

- Verificar si `greenhouse_core.services` tiene `parent_service_id UUID NULL REFERENCES greenhouse_core.services(service_id) ON DELETE RESTRICT`. Si no existe, agregarlo en la misma migration.
- Crear trigger `BEFORE INSERT OR UPDATE` que enforce:
  - Si `parent_service_id IS NOT NULL` AND `engagement_kind = 'regular'`, el parent debe tener `engagement_kind != 'regular'` (es decir: solo Sample Sprints pueden ser parents de regular services convertidos).
  - Si `parent_service_id IS NOT NULL` AND el parent tiene `engagement_kind != 'regular'`, validar que el parent tenga outcome convertido (`outcome_status='converted'` en `engagement_outcomes` cuando exista; si la columna no esta materializada en services aun, dejar el segundo check como TODO documentado y resolver en TASK-837).
- Si la columna ya existe pero falta el trigger, agregar solo el trigger.
- Sin esta proteccion, una bug en TASK-837 o un path manual puede crear regular-regular lineage chain o convertir servicios sin parent valido y nadie lo detecta.

### Slice 3 — Lifecycle Mapper Canonico

- Crear helper puro para mapear `hs_pipeline` + `hs_pipeline_stage` de HubSpot `p_services` a:
  - `pipelineStage`
  - `status`
  - `active`
  - `engagementKindHint` o validacion esperada cuando aplique.
  - `syncStatusOverride` o error recuperable si aplica.
- Cubrir todas las etapas conocidas del Service Pipeline actual.
- Cubrir la nueva etapa `Validacion / Sample Sprint`.
- Cubrir unknown stage con degradacion honesta: no default silencioso a `active`.
- Agregar tests unitarios para cada stage ID, stage label si se usa fallback, missing stage y unknown stage.

### Slice 4 — UPSERT Canonico Preserva Lifecycle + Outbox Granular

- Actualizar `upsertServiceFromHubSpot()` para consumir el mapper.
- Reemplazar hardcodes de `pipeline_stage`, `status` y `active` en el SQL INSERT/UPDATE.
- Asegurar que `ON CONFLICT DO UPDATE` refresque lifecycle cuando HubSpot cambia una etapa.
- Mantener `hubspot_sync_status='unmapped'` para falta de clasificacion comercial (`ef_linea_de_servicio`), sin confundirlo con lifecycle stage.
- Aplicar la cascade canonica de `engagement_kind` documentada en `Detailed Spec > Engagement kind cascade`:
  - leer `ef_engagement_kind` como internal name tecnico de HubSpot, nunca el label visible `Tipo de servicio`.
  - cuando HubSpot devuelve `ef_engagement_kind` poblado: usar el valor (validar contra enum `regular|pilot|trial|poc|discovery`; si valor invalido, marcar `hubspot_sync_status='unmapped'`).
  - cuando HubSpot devuelve `ef_engagement_kind=NULL` y la fila ya existe en PG: preservar el valor PG (NUNCA pisar con NULL).
  - cuando HubSpot devuelve `ef_engagement_kind=NULL` y la fila es nueva: aplicar default por stage (ver cascade).
- Emitir evento outbox granular `commercial.service_engagement.lifecycle_changed v1` en la misma transaccion del UPSERT solo cuando la transicion afecte estado operativo:
  - dispara cuando `pipeline_stage` cambio, `active` cambio, `status` cambio o `engagement_kind` cambio (no para refresh idempotente sin diff).
  - payload minimo: `{serviceId, hubspotServiceId, previousPipelineStage, nextPipelineStage, previousActive, nextActive, previousStatus, nextStatus, previousEngagementKind, nextEngagementKind, triggeredBy: 'hubspot_webhook'|'backfill'|'manual_command'|'reactive_intake', occurredAt}`.
  - registrar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` antes de mergear.
  - reactive consumers downstream (P&L, ICO, attribution, organization workspace) reaccionan selectivamente sin re-procesar todo el service en cada UPSERT idempotente.
- Mantener compat: el evento generico `commercial.service_engagement.materialized` v1 sigue emitiendose tras el UPSERT (consumers existentes); `lifecycle_changed` lo complementa con granularidad.

### Slice 5 — Sample Sprint Projection and Conversion Rules

- Definir el flujo canonico:
  - Sample Sprint nace en Greenhouse como `service` no-regular.
  - Se asocia a un HubSpot Deal en etapa `Sample Sprint / Validacion`.
  - Se proyecta o refleja como HubSpot `p_services` en stage `Validacion / Sample Sprint` cuando el producto lo habilite.
  - Si convierte, se crea o vincula un child service `regular` en `Onboarding` y se registra lineage.
  - Si no convierte, el Sample Sprint y su proyeccion `p_services` pasan a `Closed` o terminal equivalente.
- Confirmar si esta task implementa solo el mapping/proyeccion o tambien el comando de creacion/actualizacion `p_services` para Sample Sprints. El flujo deal-bound de wizard + creacion outbound queda en `TASK-837`.
- Asegurar que la etapa HubSpot no sustituye approvals/progress/outcomes internos de Greenhouse.

### Slice 6 — Backfill / Re-sync Idempotente con Pre/Post Baseline

- **Pre-backfill snapshot (obligatorio)**: capturar estado base antes de mutar para detectar regresiones objetivamente.
  - Distribucion actual de services: `SELECT pipeline_stage, status, active, engagement_kind, COUNT(*) FROM greenhouse_core.services WHERE hubspot_service_id IS NOT NULL GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;`
  - Reliability signals base: capturar `value` actual de `commercial.service_engagement.sync_lag`, `commercial.service_engagement.organization_unresolved`, `commercial.service_engagement.legacy_residual_reads`, `services-sync-lag`, `services-legacy-residual-reads` (si existen).
  - KPIs operativos sample (3 clientes Globe + 3 Efeonce internos): MRR/ARR mensual computado, ICO actual del cliente, cost attribution acumulado por `service_id` ultimo trimestre. Persistir snapshot en el PR description o en `docs/tasks/in-progress/TASK-836-pre-backfill-snapshot.md`.
- **Dry-run obligatorio**: ejecutar `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts` (sin `--apply`) y confirmar universo HubSpot vs Greenhouse antes de mutar. Documentar diff esperado vs detectado.
- **Apply idempotente**: solo despues de aprobar el mapping y el dry-run.
- **Post-backfill snapshot**: re-ejecutar exactamente las mismas queries del pre-snapshot. Diff esperado:
  - Services con HubSpot stage `Closed` cambian `active TRUE -> FALSE`, `status active -> closed`.
  - Services con HubSpot stage `En renovacion` cambian `pipeline_stage active -> renewal_pending` (active sigue TRUE).
  - Services con stage desconocida quedan con `hubspot_sync_status='unmapped'` (no pasan a `active=TRUE` silente).
  - Reliability signal `legacy_residual_reads` puede subir temporalmente si hay `service_attribution_facts` con `created_at > services.updated_at` post-cambio; debe volver a 0 tras la siguiente materializacion del consumer.
- **Plan de revert**: si el post-snapshot muestra signals rojos fuera del esperado o KPIs P&L con desviacion > 5%:
  - Capturar evidencia (snapshot diff completo, signals afectados, services especificos).
  - Revert via emit de eventos `lifecycle_changed` reverse en transaccion (mismo pattern outbox publisher) que restauren `pipeline_stage`, `status`, `active`, `engagement_kind` previos.
  - NUNCA usar `DELETE` directo ni `UPDATE` ad-hoc sobre `services` para revertir; usar el helper canonico `upsertServiceFromHubSpot` con valores previos.
- Verificar que los servicios ya materializados cambien a su lifecycle correcto:
  - `Validacion / Sample Sprint` -> `pipeline_stage='validation'`, `status` derivado del lifecycle interno, `engagement_kind != 'regular'`
  - `Closed` -> `pipeline_stage='closed'`, `status='closed'`, `active=FALSE`
  - `En renovacion` -> `pipeline_stage='renewal_pending'`, `status='active'`, `active=TRUE`
  - `Onboarding` -> `pipeline_stage='onboarding'`, `status='active'`, `active=TRUE`
  - `Renovado` -> `pipeline_stage='renewed'`, `status='active'`, `active=TRUE` (transitorio; ver politica `Renovado`).
  - `Pausado` -> `pipeline_stage='paused'`, `status='paused'`, `active=FALSE` (decision canonica, ver politica `Pausado`).
- No borrar filas legacy ni services sin association; reportarlos en el snapshot post.

### Slice 7 — Reliability / Drift Guard

- Agregar signal `commercial.service_engagement.lifecycle_stage_unknown` (kind=drift, severity=error si count>0, steady=0) — cuenta services con `hubspot_sync_status='unmapped'` por `failed_stage_mapping` (stage HubSpot que el mapper no reconoce). Reader: subquery sobre `services` filtrado por motivo `unmapped_stage_id`.
- Agregar signal `commercial.service_engagement.engagement_kind_unmapped` (kind=drift, severity=warning si count>0, steady=0) — cuenta services en stage `validation` con `engagement_kind IS NULL` (operador debe clasificar en HubSpot antes de que participen en P&L/ICO).
- Agregar signal `commercial.service_engagement.renewed_stuck` (kind=drift, severity=warning si count>0) — cuenta services con `pipeline_stage='renewed'` por mas de 60 dias (HubSpot deberia haberlos promovido a `Activo` al iniciar nuevo ciclo de renovacion). Subsystem rollup: `commercial`.
- Agregar signal `commercial.service_engagement.lineage_orphan` (kind=data_quality, severity=error si count>0, steady=0) — cuenta services regulares con `parent_service_id IS NOT NULL` pero parent missing/invalid, o parent con `engagement_kind='regular'` (chain regular-regular invalida que el trigger del Slice 2 deberia haber bloqueado; signal es defense in depth).
- Agregar o extender signal para detectar Sample Sprints no-regulares que deberian tener proyeccion `p_services` y no la tienen, si el rollout decide activar esa proyeccion (alcance acotado a `TASK-837`).
- Asegurar que `services-sync-lag` siga excluyendo `legacy_seed_archived` y no oculte drifts de lifecycle.
- Wire-up de los signals nuevos en `src/lib/reliability/queries/get-reliability-overview.ts` con `expectedSignalKinds: ['drift','data_quality']` para el subsystem `commercial`.

### Slice 8 — Docs y Runbook

- Actualizar arquitectura de intake HubSpot services con el mapping oficial.
- Actualizar arquitectura de Services con la regla HubSpot Service Pipeline -> Greenhouse lifecycle.
- Actualizar arquitectura de Sample Sprints con la nueva decision: Sample Sprint es service no-regular y puede proyectarse a HubSpot `p_services` stage `Validacion / Sample Sprint`.
- Actualizar documentacion/manual para explicar:
  - diferencia entre Deal Pipeline y Service Pipeline
  - diferencia entre servicios `regular` y Sample Sprints como servicios no-regulares
  - como re-sincronizar y validar stages
  - como operar stage desconocida.

## Out of Scope

- No cambiar etapas de HubSpot desde Greenhouse.
- No crear ni cerrar servicios regulares en HubSpot fuera del flujo explicitamente definido.
- No resolver asociaciones faltantes de company para los 17 services salvo reporting/dry-run.
- No tocar Deal Pipeline ni la etapa `Sample Sprint / Validacion`.
- No reemplazar el lifecycle interno de Sample Sprints con la etapa HubSpot `Validacion / Sample Sprint`.
- No implementar el wizard deal-bound ni el comando outbound completo de creacion `p_services`; ese alcance vive en `TASK-837`.
- No rediseñar UI de servicios contratados; esta task es sync/runtime/data contract.
- No activar write-back Greenhouse -> HubSpot `p_services` para todos los campos; si se requiere proyeccion de Sample Sprints, debe quedar acotada a los campos aprobados y auditada.

## Detailed Spec

### Mapping inicial esperado

| HubSpot stage label | HubSpot stage ID | Greenhouse `pipeline_stage` | `status` | `active` |
| --- | --- | --- | --- | --- |
| `Validacion / Sample Sprint` | `TBD after HubSpot creation` | `validation` | derived from Sample Sprint lifecycle | derived |
| `Onboarding` | `8e2b21d0-7a90-4968-8f8c-a8525cc49c70` | `onboarding` | `active` | `TRUE` |
| `Activo` | `600b692d-a3fe-4052-9cd7-278b134d7941` | `active` | `active` | `TRUE` |
| `En renovacion` | `de53e7d9-6b57-4701-b576-92de01c9ed65` | `renewal_pending` | `active` | `TRUE` |
| `Renovado` | `1324827222` | `renewed` | `active` | `TRUE` |
| `Closed` | `1324827223` | `closed` | `closed` | `FALSE` |
| `Pausado` | `1324827224` | `paused` | `paused` | `FALSE` |

### Politica `Pausado` (resuelta)

`Pausado` se mapea a `pipeline_stage='paused', status='paused', active=FALSE`. Decision canonica:

- Razon: un service pausado no participa en P&L/ICO/attribution operativo del periodo en curso. Tratarlo como `active=TRUE` mezclaria obligaciones contractuales latentes con operacion vigente y rompe el filtro canonico `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'`.
- Si emerge un consumer que necesita "obligaciones contractuales activas aunque pausado" (e.g. cobranza diferida, contratos con clausula de hibernacion), abrir task derivada que introduzca un flag separado (e.g. `lifecycle_active` distinto de `active`) sin modificar la decision base de esta task.
- Resume operativo desde `Pausado`: cuando HubSpot mueva el service de vuelta a `Activo`, el UPSERT canonico restaura `active=TRUE`, `status='active'` automaticamente; el outbox `lifecycle_changed` permite a downstream reactivar materializaciones.

### Politica `Renovado` (resuelta)

`Renovado` es una etapa **transitoria operativa**, NO terminal:

- Mapping: `pipeline_stage='renewed', status='active', active=TRUE`. El service sigue siendo operativo (cuenta para P&L/ICO/attribution) durante la ventana de renovacion exitosa.
- Source of truth de la transicion: HubSpot. Cuando inicia el siguiente ciclo de billing, HubSpot mueve el service de `Renovado` a `Activo`; el UPSERT canonico actualiza `pipeline_stage='active'` automaticamente.
- Si HubSpot no promueve y el service queda en `Renovado` indefinidamente, el reliability signal `commercial.service_engagement.renewed_stuck` (Slice 7) lo flag-ea con threshold > 60 dias para resolucion operativa manual. Greenhouse NO promueve unilateralmente — HubSpot es el source of truth de stage.
- Consumers que filtren "servicios operativos del periodo": usar `WHERE active=TRUE` (incluye `renewed`) o `WHERE pipeline_stage IN ('active','renewal_pending','renewed','onboarding')` segun granularidad necesaria. NUNCA filtrar solo `pipeline_stage='active'`.

### Engagement kind cascade (canonica)

El UPSERT debe aplicar esta cascade exacta para resolver `engagement_kind` ante webhook HubSpot. Sin cascade declarativa, el primer webhook post-rollout pisa Sample Sprints locales con NULL silenciosamente.

| Caso | Condicion | Accion canonica |
| --- | --- | --- |
| 1 | HubSpot `ef_engagement_kind` poblado, valor en enum `regular\|pilot\|trial\|poc\|discovery` | Usar valor HubSpot (HubSpot es source of truth cuando explicito) |
| 2 | HubSpot `ef_engagement_kind` poblado, valor fuera del enum | NUNCA pisar PG; marcar `hubspot_sync_status='unmapped'`; emitir warning + reliability signal `engagement_kind_unmapped` |
| 3 | HubSpot `ef_engagement_kind=NULL`, fila ya existe en PG con `engagement_kind != 'regular'` | Preservar valor PG (path de rollout: Sample Sprints declarados desde Greenhouse antes de tener `p_services` HubSpot) |
| 4 | HubSpot `ef_engagement_kind=NULL`, fila ya existe en PG con `engagement_kind = 'regular'` | Preservar `regular` (consistente) |
| 5 | HubSpot `ef_engagement_kind=NULL`, fila nueva, stage resuelto = `validation` | `engagement_kind=NULL`, `hubspot_sync_status='unmapped'`; reliability signal `engagement_kind_unmapped`; operador debe clasificar en HubSpot antes de que el service participe en P&L/ICO |
| 6 | HubSpot `ef_engagement_kind=NULL`, fila nueva, stage resuelto in `onboarding\|active\|renewal_pending\|renewed\|closed\|paused` | Default `engagement_kind='regular'` (legacy migration default; los 17 services existentes son operativos regulares por construccion historica) |

Reglas duras de la cascade:

- **NUNCA** sobrescribir `engagement_kind` con NULL desde un UPSERT inbound. La cascade preserve PG en caso 3-4.
- **NUNCA** asumir `engagement_kind=pilot` por defecto en stage `validation`. Sin clasificacion explicita, queda unmapped y operador resuelve.
- **NUNCA** mutar `engagement_kind` localmente desde Greenhouse cuando el service ya tiene `hubspot_service_id` y `ef_engagement_kind` poblado en HubSpot. Si emerge necesidad legitima, escalarla via property sync outbound (alcance `TASK-837`).
- **SIEMPRE** validar contra el enum cerrado al asignar.

### Outbox event canonico: `commercial.service_engagement.lifecycle_changed v1`

Evento emitido en la misma transaccion del UPSERT cuando ocurre una transicion de estado operativo. Permite que consumers downstream (P&L, ICO, attribution, organization workspace, audit) reaccionen selectivamente sin reprocesar el service en cada UPSERT idempotente.

```jsonc
{
  "name": "commercial.service_engagement.lifecycle_changed",
  "version": 1,
  "subject_id": "<service_id>",
  "occurred_at": "<iso8601>",
  "payload": {
    "serviceId": "uuid",
    "hubspotServiceId": "string|null",
    "previousPipelineStage": "string|null",
    "nextPipelineStage": "string",
    "previousActive": "boolean|null",
    "nextActive": "boolean",
    "previousStatus": "string|null",
    "nextStatus": "string",
    "previousEngagementKind": "string|null",
    "nextEngagementKind": "string|null",
    "triggeredBy": "hubspot_webhook|backfill|manual_command|reactive_intake",
    "occurredAt": "iso8601"
  }
}
```

Reglas de emision:

- Disparar solo cuando uno o mas de `pipeline_stage`, `active`, `status`, `engagement_kind` cambian. Refresh idempotente sin diff NO emite el evento.
- Idempotencia: `subject_id + previous* + next*` es la idempotency key. Si el reactive consumer ya proceso este transition, lo skipea.
- Compat: el evento generico `commercial.service_engagement.materialized` v1 sigue emitiendose en cada UPSERT (consumers existentes); `lifecycle_changed` lo complementa con granularidad para consumers que solo reaccionan a transiciones reales.

### HubSpot property contract: label vs internal name

HubSpot separa labels visibles de internal names de API. Esta task debe respetar ambos planos:

| Concepto | Uso | Valor recomendado |
| --- | --- | --- |
| Label visible | UI humana HubSpot | `Tipo de servicio` |
| Internal name | API/sync/codigo | `ef_engagement_kind` |
| Field type | HubSpot property | `select` / enumeration |

Opciones:

| Label visible | Internal value |
| --- | --- |
| `Contratado` | `regular` |
| `Piloto` | `pilot` |
| `Trial` | `trial` |
| `POC` | `poc` |
| `Discovery` | `discovery` |

Reglas:

- El usuario HubSpot nunca debe ver labels tecnicos tipo `ef_engagement_kind`.
- El codigo nunca debe depender del label visible, porque puede traducirse o cambiar.
- El sync debe operar con internal name `ef_engagement_kind` y values internos.
- El mapper de stages debe operar con stage IDs; labels solo pueden ser fallback auditable.
- `engagement_kind` responde "que tipo de servicio es"; `pipeline_stage` responde "en que etapa esta".

### Sample Sprint service semantics

Decision de producto:

- Sample Sprint es `greenhouse_core.services`, no entidad paralela.
- Sample Sprint no es `regular`: usa `engagement_kind IN ('trial','pilot','poc','discovery')`.
- HubSpot Deal asociado refleja la oportunidad comercial y puede estar en Deal Stage `Sample Sprint / Validacion`.
- HubSpot `p_services` refleja el servicio/engagement macro y, para Sample Sprints, usa Service Stage `Validacion / Sample Sprint`.
- Greenhouse sigue siendo la autoridad del detalle operativo: approval, capacity warning, progress snapshots, outcome, audit y lineage.

Flujo esperado:

```text
HubSpot Deal: Sample Sprint / Validacion
        |
        v
Greenhouse service non-regular: engagement_kind trial|pilot|poc|discovery
        |
        v
HubSpot p_services: Validacion / Sample Sprint
        |
        +-- outcome converted --> child service regular + HubSpot p_services Onboarding
        |
        +-- outcome cancelled/dropped --> p_services Closed
```

### Schema note for `validation`

`Greenhouse_Services_Architecture_v1.md` y el snapshot historico listan `pipeline_stage IN ('onboarding','active','renewal_pending','renewed','closed','paused')`. Si el runtime real mantiene ese CHECK, esta task debe incluir migration para agregar `validation`. El agente no debe reutilizar `onboarding` para Sample Sprints solo para evitar migracion; eso volveria a mezclar pre-delivery con delivery regular.

### Unknown stage policy

El agente debe elegir una politica fail-safe y documentarla. Recomendacion inicial:

- no guardar unknown como `active`;
- marcar `hubspot_sync_status='unmapped'` o `failed` segun constraints reales;
- conservar `pipeline_stage='paused'` o `closed` solo si existe una razon operativa clara;
- emitir warning/reliability signal con `hubspot_service_id`, `hs_pipeline`, `hs_pipeline_stage`.

### Runtime verification queries

Al cierre, validar al menos:

```sql
SELECT pipeline_stage, status, active, COUNT(*)
FROM greenhouse_core.services
WHERE hubspot_service_id IS NOT NULL
GROUP BY 1,2,3
ORDER BY 1,2,3;
```

```sql
SELECT hubspot_service_id, name, pipeline_stage, status, active, hubspot_sync_status
FROM greenhouse_core.services
WHERE hubspot_service_id IS NOT NULL
ORDER BY pipeline_stage, name;
```

```sql
SELECT engagement_kind, pipeline_stage, status, active, COUNT(*)
FROM greenhouse_core.services
WHERE engagement_kind != 'regular'
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4;
```

## Hard Rules (invariantes anti-regresion)

Reglas duras canonizadas por esta task. Cualquier futura task o agente que toque `greenhouse_core.services`, `upsertServiceFromHubSpot`, el mapper de lifecycle o la proyeccion HubSpot `p_services` debe respetarlas:

- **NUNCA** hardcodear `pipeline_stage='active'`, `status='active'` ni `active=TRUE` en INSERT/UPDATE de `services` cuando la fuente es HubSpot. Toda mutacion pasa por el mapper canonico (Slice 3).
- **NUNCA** depender del label visible HubSpot (`Tipo de servicio`, `Activo`, `Closed`, etc.) en codigo. Solo internal names + stage IDs. Labels son traducibles y mutables.
- **NUNCA** sobrescribir `engagement_kind` con NULL desde un UPSERT inbound. La cascade preserva PG cuando HubSpot devuelve NULL (casos 3-4 de la cascade).
- **NUNCA** asumir un default de `engagement_kind` para servicios nuevos en stage `validation`. Sin clasificacion explicita, queda `unmapped` y reliability signal alerta.
- **NUNCA** crear servicio con `engagement_kind='regular'` AND `parent_service_id IS NOT NULL` cuyo parent tenga `engagement_kind='regular'`. Lineage chain regular-regular es invalida; trigger del Slice 2 lo bloquea, signal `lineage_orphan` lo detecta defense-in-depth.
- **NUNCA** mutar `pipeline_stage`, `status` o `active` directo via SQL en produccion. Toda mutacion pasa por `upsertServiceFromHubSpot()` o el revert canonico via outbox.
- **NUNCA** consumir downstream `services` sin filtrar `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'`. El signal `legacy_residual_reads` flag-ea consumers que olviden el filtro.
- **NUNCA** agregar stage HubSpot nuevo sin extender el mapper + agregar tests + actualizar `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`. Default unknown stage al fail-safe `unmapped`, NUNCA a `active`.
- **NUNCA** filtrar "servicios operativos del periodo" con `WHERE pipeline_stage = 'active'` solo. `renewed` y `renewal_pending` tambien son operativos. Usar `WHERE active=TRUE` o whitelist explicita.
- **NUNCA** promover unilateralmente desde Greenhouse `pipeline_stage='renewed'` a `'active'`. HubSpot es source of truth de stage; Greenhouse solo refleja. Si HubSpot no promueve, el signal `renewed_stuck` lo escala operativamente.
- **NUNCA** ejecutar backfill sin pre/post snapshot documentado y plan de revert via outbox `lifecycle_changed`.
- **SIEMPRE** que ocurra una transicion de `pipeline_stage`, `active`, `status` o `engagement_kind`, emitir `commercial.service_engagement.lifecycle_changed v1` en la misma transaccion. Refresh idempotente sin diff NO emite.
- **SIEMPRE** validar `engagement_kind` contra el enum cerrado `regular|pilot|trial|poc|discovery`. Valores fuera del enum -> `hubspot_sync_status='unmapped'`, NUNCA cast silencioso.
- **SIEMPRE** que un Sample Sprint convierta a service regular, el child hereda `parent_service_id` no-nullable apuntando al Sample Sprint padre. El trigger del Slice 2 enforce; sin lineage, lineage_orphan signal escala.
- **SIEMPRE** que emerja una stage HubSpot nueva en runtime, el signal `lifecycle_stage_unknown` la flag-ea (steady=0). Operador extiende el mapper antes de aprobar mas operacion sobre esa stage.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `upsertServiceFromHubSpot()` ya no hardcodea todos los services como `active`.
- [ ] HubSpot Service Pipeline tiene etapa `Validacion / Sample Sprint` antes de `Onboarding`, con stage ID documentado.
- [ ] HubSpot `p_services` tiene property `Tipo de servicio` con internal name `ef_engagement_kind` y values canonicos `regular|pilot|trial|poc|discovery`.
- [ ] `greenhouse_core.services.pipeline_stage` soporta `validation`; migration aplica patron `-- Up Migration` + bloque DO de verificacion (anti pre-up-marker bug).
- [ ] Migration sigue el orden canonico de rollout: DDL aplicada -> codigo mergeado -> backfill ejecutado.
- [ ] Existe un mapper canonico probado para las 7 etapas esperadas del HubSpot Service Pipeline (incluida `validation`).
- [ ] Mapper aplica la `Engagement kind cascade` canonica: HubSpot poblado gana, NULL preserva PG, NULL en stage `validation` queda unmapped, NULL en stages operativos default a `regular`.
- [ ] Un cambio de stage en HubSpot refresca `pipeline_stage`, `status` y `active` en `greenhouse_core.services` via UPSERT idempotente.
- [ ] El UPSERT emite outbox `commercial.service_engagement.lifecycle_changed v1` solo cuando hay diff real en `pipeline_stage`, `active`, `status` o `engagement_kind`.
- [ ] El evento `lifecycle_changed v1` esta documentado en `GREENHOUSE_EVENT_CATALOG_V1.md` con payload contract estable.
- [ ] Sample Sprints quedan modelados como services no-regulares y no como servicio regular ni entidad paralela.
- [ ] Servicios `Closed` en HubSpot no quedan `active=TRUE` en Greenhouse.
- [ ] Servicios `En renovacion` quedan distinguibles de `active` generico mediante `pipeline_stage='renewal_pending'`.
- [ ] Servicios `Pausado` quedan con `active=FALSE` (decision canonica) y excluidos del filtro operativo standard.
- [ ] Servicios `Renovado` quedan con `active=TRUE` (transitorio); reliability signal `renewed_stuck` flag-ea > 60 dias.
- [ ] La conversion de Sample Sprint hacia servicio regular queda definida como lineage + child service regular en `Onboarding`.
- [ ] Trigger PG de lineage protection bloquea creacion de chain regular-regular (parent_service_id apunta a non-regular).
- [ ] Unknown stage no se degrada silenciosamente a `active`; queda con `hubspot_sync_status='unmapped'` + signal `lifecycle_stage_unknown`.
- [ ] Backfill/re-sync aplicado de forma idempotente, con pre-snapshot + post-snapshot documentados y diff esperado verificado.
- [ ] Plan de revert documentado y verificable (revert via outbox `lifecycle_changed` reverse, no DELETE/UPDATE ad-hoc).
- [ ] Reliability signals nuevos (`lifecycle_stage_unknown`, `engagement_kind_unmapped`, `renewed_stuck`, `lineage_orphan`) wired en `getReliabilityOverview` con steady-state esperado documentado.
- [ ] Docs explican el contrato Deal Pipeline vs Service Pipeline vs Sample Sprint.
- [ ] Hard Rules (invariantes anti-regresion) quedan reflejadas en CLAUDE.md o doc canonico equivalente para que tasks/agentes futuros no introduzcan regresiones.

## Verification

- `pnpm test src/lib/services` (incluye lifecycle-mapper unit tests cubriendo cada stage ID + cascade `engagement_kind` casos 1-6 + unknown stage fail-safe)
- `pnpm test src/lib/sync/projections/hubspot-services-intake.test.ts`
- `pnpm test src/lib/webhooks/handlers/hubspot-services.test.ts`
- `pnpm test src/lib/reliability/queries` para los 4 signals nuevos (`lifecycle_stage_unknown`, `engagement_kind_unmapped`, `renewed_stuck`, `lineage_orphan`)
- tests focales de Sample Sprints si se toca conversion/lineage: `pnpm test src/lib/commercial/sample-sprints`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm pg:doctor`
- Migration verification post-apply: `pnpm migrate:status` + `psql` query confirmando que el CHECK acepta `validation` y que el trigger de lineage existe.
- HubSpot API read-back de Service Pipeline `0-162` para confirmar etapa `Validacion / Sample Sprint`
- HubSpot API read-back de property `ef_engagement_kind` en `0-162` para confirmar label visible, internal name y options
- **Pre-backfill snapshot ejecutado y persistido** (Slice 6).
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts` (dry-run obligatorio).
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces` solo tras dry-run aprobado por el agente ejecutor y con evidencia previa.
- **Post-backfill snapshot ejecutado**, diff documentado contra pre-snapshot, signals afectados documentados en PR description antes de mergear.
- SQL smoke contra `greenhouse_core.services` para distribucion de `pipeline_stage/status/active/engagement_kind`.
- Test integracion para outbox: simular un cambio de stage HubSpot y verificar que se emite `lifecycle_changed v1` con previous/next correctos; verificar que un UPSERT idempotente sin diff NO emite el evento.
- Test integracion para trigger lineage: intentar INSERT/UPDATE de service `regular` con `parent_service_id` apuntando a otro `regular`; debe fallar con error claro.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` y `docs/architecture/Greenhouse_Services_Architecture_v1.md` quedaron sincronizados con el mapping real
- [ ] `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` quedo sincronizado con la decision `Sample Sprint = service non-regular + p_services validation stage`
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` registra `commercial.service_engagement.lifecycle_changed v1` con payload contract
- [ ] `docs/documentation/comercial/servicios-engagement.md` y `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md` quedaron sincronizados
- [ ] Se documentaron servicios no materializables por falta de association/company/space sin forzar datos
- [ ] Hard Rules (invariantes anti-regresion) quedaron canonizadas en `CLAUDE.md` para que agentes/tasks futuros hereden las reglas
- [ ] 4 reliability signals nuevos (`lifecycle_stage_unknown`, `engagement_kind_unmapped`, `renewed_stuck`, `lineage_orphan`) wired y verificados con steady-state esperado documentado
- [ ] Pre/post backfill snapshots persistidos en PR description o `docs/tasks/in-progress/TASK-836-pre-backfill-snapshot.md`

## Follow-ups

- Registry DB `greenhouse_core.hubspot_service_pipeline_stage_config` si se quiere V2 admin-gobernable similar a `hubspot_deal_pipeline_config`.
- Signal dedicado `commercial.service_engagement.lifecycle_stage_drift` si Slice 4 no puede cerrarlo en V1.
- UI manual queue para services no materializables si la deuda de asociaciones HubSpot se mantiene.
- `TASK-837` implementa el flujo deal-bound de wizard + creacion/proyeccion outbound `p_services` para Sample Sprints.

## Open Questions

- **RESUELTA (2026-05-08)** `Pausado` queda con `pipeline_stage='paused', status='paused', active=FALSE`. Ver `Detailed Spec > Politica Pausado (resuelta)`. Si emerge consumer que necesita "obligaciones contractuales activas aunque pausado", abrir task derivada con flag separado (`lifecycle_active`).
- **RESUELTA (2026-05-08)** `Renovado` queda con `pipeline_stage='renewed', status='active', active=TRUE` (transitorio). HubSpot es source of truth de la promocion `Renovado -> Activo`; Greenhouse NO promueve unilateralmente. Reliability signal `renewed_stuck` flag-ea > 60 dias para resolucion operativa. Ver `Detailed Spec > Politica Renovado (resuelta)`.
- ¿Unknown stage debe usar `hubspot_sync_status='unmapped'` o agregar un estado nuevo `failed_stage_mapping`? Recomendacion: reusar `unmapped` con `metadata_json.unmapped_reason='unknown_pipeline_stage'` para discriminar de `unmapped_classification` (`ef_linea_de_servicio` faltante). Requiere revisar CHECK/consumers reales en Plan.
- ¿La proyeccion de Sample Sprints hacia HubSpot `p_services` se activa en esta task o queda como follow-up despues de crear la etapa y el mapper? Decision: dejar el flujo outbound completo para `TASK-837`. Esta task solo configura HubSpot (stages + property) y deja el inbound robusto.

## Delta 2026-05-08 — Hardening pre-implementation

Task endurecida antes de iniciar implementacion para alinearla con los patrones canonicos del repo (TASK-708/728/766/768/774/785). Cambios introducidos:

1. **Cascade `engagement_kind` declarativa (Slice 4 + Detailed Spec)**: 6 casos canonicos que cubren todas las combinaciones HubSpot poblado/NULL × PG existente/nuevo × stage operativa/validacion. Resuelve race condition latente donde un webhook con `ef_engagement_kind=NULL` podia pisar Sample Sprints declarados localmente. Pattern fuente: TASK-785 (workforce role title source-of-truth).
2. **Pre/post backfill baseline + plan de revert (Slice 6)**: snapshot obligatorio de distribucion de services + reliability signals + KPIs sample (3 Globe + 3 Efeonce) antes y despues del apply. Diff esperado documentado. Revert via outbox `lifecycle_changed` reverse, NUNCA DELETE/UPDATE ad-hoc. Pattern fuente: TASK-774 (account balances rematerialize) + TASK-703b (OTB cascade).
3. **Atomicidad migration `validation` (Slice 2)**: marker `-- Up Migration` + bloque DO con `RAISE EXCEPTION` post-DDL + orden canonico de rollout (DDL -> code -> backfill). Pattern fuente: ISSUE-068 / TASK-768 Slice 1 (anti pre-up-marker bug).
4. **Politica `Pausado` resuelta**: `active=FALSE` (decision canonica). Documentada como subseccion en Detailed Spec. Open Question 1 marcada RESUELTA.
5. **Politica `Renovado` resuelta**: transitoria, `active=TRUE`. HubSpot source of truth; Greenhouse NO promueve. Reliability signal `renewed_stuck` > 60 dias. Documentada como subseccion en Detailed Spec.
6. **Outbox event granular `commercial.service_engagement.lifecycle_changed v1` (Slice 4 + Detailed Spec)**: separado del UPSERT generico. Disparado solo en transiciones reales (no en refresh idempotente). Permite que P&L/ICO/attribution/organization workspace reaccionen selectivamente. Pattern fuente: TASK-773 (outbox publisher cutover) + TASK-708 (settlement_legs lifecycle events).
7. **Lineage protection structural (Slice 2)**: `parent_service_id` column + trigger PG que bloquea chain regular-regular en INSERT/UPDATE. Defensa estructural pre-TASK-837 para que ningun path manual o future bug pueda crear lineage invalido. Reliability signal `lineage_orphan` defense-in-depth.
8. **Hard Rules canonicas**: 14 invariantes anti-regresion (`NUNCA`/`SIEMPRE`) que se canonizan en CLAUDE.md para que agentes/tasks futuros hereden las reglas sin tener que re-derivarlas.
9. **4 reliability signals nuevos** (`lifecycle_stage_unknown`, `engagement_kind_unmapped`, `renewed_stuck`, `lineage_orphan`) con steady-state esperado documentado.
10. **Acceptance Criteria + Verification + Closing Protocol + Files owned** sincronizados con los puntos anteriores.

Razon: aplicar el 4-pillar contract (safety / robustness / resilience / scalability) elevo el score de la task de 7/10 promedio a 9/10 antes de implementacion. Sin estos ajustes, la implementacion abriria probabilisticamente un ISSUE-### post-rollout por race en `engagement_kind`, drift en attribution post-backfill, services en `renewed` invisibles a queries operativas, o lineage chain invalida creada por path manual no protegido.
