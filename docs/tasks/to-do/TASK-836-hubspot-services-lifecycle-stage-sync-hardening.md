# TASK-836 — HubSpot Services Lifecycle Stage Sync + Sample Sprint Validation Stage

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
- `src/lib/services/upsert-service-from-hubspot.test.ts` (nuevo o existente si se crea)
- `src/lib/commercial/sample-sprints/conversion.ts`
- `src/lib/commercial/sample-sprints/lineage.ts`
- `scripts/services/backfill-from-hubspot.ts`
- `src/lib/hubspot/list-services-for-company.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts`
- `src/lib/webhooks/handlers/hubspot-services.ts`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `docs/documentation/comercial/servicios-engagement.md`
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`

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

### Slice 2 — Schema Compatibility for Validation Stage

- Verificar si el CHECK real de `greenhouse_core.services.pipeline_stage` acepta solo `onboarding|active|renewal_pending|renewed|closed|paused`.
- Si no acepta `validation`, crear migration para agregar `validation` como valor canonico.
- Actualizar tipos Kysely y docs de arquitectura con el nuevo valor.
- Confirmar que consumers de P&L/ICO/attribution no tratan `validation` como servicio regular activo salvo que el `engagement_kind` y terms lo justifiquen.

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

### Slice 4 — UPSERT Canonico Preserva Lifecycle

- Actualizar `upsertServiceFromHubSpot()` para consumir el mapper.
- Reemplazar hardcodes de `pipeline_stage`, `status` y `active` en el SQL INSERT/UPDATE.
- Asegurar que `ON CONFLICT DO UPDATE` refresque lifecycle cuando HubSpot cambia una etapa.
- Mantener `hubspot_sync_status='unmapped'` para falta de clasificacion comercial (`ef_linea_de_servicio`), sin confundirlo con lifecycle stage.
- Preservar/derivar `engagement_kind` correctamente:
  - leer `ef_engagement_kind` como internal name tecnico de HubSpot, nunca el label visible `Tipo de servicio`.
  - `Validacion / Sample Sprint` -> `engagement_kind` no-regular cuando la fuente lo indique (`ef_engagement_kind`, metadata o comando Greenhouse).
  - etapas `Onboarding` en adelante -> `regular` salvo excepcion documentada.
- Incluir en el outbox payload el lifecycle resuelto si no rompe consumidores actuales.

### Slice 5 — Sample Sprint Projection and Conversion Rules

- Definir el flujo canonico:
  - Sample Sprint nace en Greenhouse como `service` no-regular.
  - Se asocia a un HubSpot Deal en etapa `Sample Sprint / Validacion`.
  - Se proyecta o refleja como HubSpot `p_services` en stage `Validacion / Sample Sprint` cuando el producto lo habilite.
  - Si convierte, se crea o vincula un child service `regular` en `Onboarding` y se registra lineage.
  - Si no convierte, el Sample Sprint y su proyeccion `p_services` pasan a `Closed` o terminal equivalente.
- Confirmar si esta task implementa solo el mapping/proyeccion o tambien el comando de creacion/actualizacion `p_services` para Sample Sprints. Si no se implementa, dejar follow-up explicito.
- Asegurar que la etapa HubSpot no sustituye approvals/progress/outcomes internos de Greenhouse.

### Slice 6 — Backfill / Re-sync Idempotente

- Ejecutar dry-run del backfill existente y confirmar universo HubSpot vs Greenhouse antes de mutar.
- Ejecutar apply idempotente solo despues de validar mapping.
- Verificar que los servicios ya materializados cambien a su lifecycle correcto:
  - `Validacion / Sample Sprint` -> `pipeline_stage='validation'`, `status` derivado del lifecycle interno, `engagement_kind != 'regular'`
  - `Closed` -> `pipeline_stage='closed'`, `status='closed'`, `active=FALSE`
  - `En renovacion` -> `pipeline_stage='renewal_pending'`, `status='active'`, `active=TRUE`
  - `Onboarding` -> `pipeline_stage='onboarding'`, `status='active'`, `active=TRUE`
  - `Pausado` -> `pipeline_stage='paused'`, `status='paused'`, `active=FALSE` salvo que Discovery justifique otra politica.
- No borrar filas legacy ni services sin association; reportarlos.

### Slice 7 — Reliability / Drift Guard

- Agregar o extender signal para detectar servicios `p_services` con stage desconocida o materializacion stale.
- Agregar o extender signal para detectar Sample Sprints no-regulares que deberian tener proyeccion `p_services` y no la tienen, si el rollout decide activar esa proyeccion.
- Si no existe fuente persistida para stage desconocida, documentar como follow-up y al menos agregar logging/capture con dominio `integrations.hubspot` o `commercial`.
- Asegurar que `services-sync-lag` siga excluyendo `legacy_seed_archived` y no oculte drifts de lifecycle.

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

Si Discovery confirma que `Pausado` debe seguir siendo elegible para alguna operacion, documentar la excepcion y ajustar consumidores, no solo el mapper.

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
- [ ] `greenhouse_core.services.pipeline_stage` soporta `validation` si la implementacion lo adopta.
- [ ] Existe un mapper canónico probado para las 7 etapas esperadas del HubSpot Service Pipeline.
- [ ] Un cambio de stage en HubSpot refresca `pipeline_stage`, `status` y `active` en `greenhouse_core.services` via UPSERT idempotente.
- [ ] Sample Sprints quedan modelados como services no-regulares y no como servicio regular ni entidad paralela.
- [ ] Servicios `Closed` en HubSpot no quedan `active=TRUE` en Greenhouse.
- [ ] Servicios `En renovacion` quedan distinguibles de `active` generico mediante `pipeline_stage='renewal_pending'`.
- [ ] La conversion de Sample Sprint hacia servicio regular queda definida como lineage + child service regular en `Onboarding`.
- [ ] Unknown stage no se degrada silenciosamente a `active`.
- [ ] Backfill/re-sync aplicado de forma idempotente y verificado contra HubSpot `0-162`.
- [ ] Docs explican el contrato Deal Pipeline vs Service Pipeline vs Sample Sprint.

## Verification

- `pnpm test src/lib/services`
- `pnpm test src/lib/sync/projections/hubspot-services-intake.test.ts`
- `pnpm test src/lib/webhooks/handlers/hubspot-services.test.ts`
- tests focales de Sample Sprints si se toca conversion/lineage: `pnpm test src/lib/commercial/sample-sprints`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm pg:doctor`
- HubSpot API read-back de Service Pipeline `0-162` para confirmar etapa `Validacion / Sample Sprint`
- HubSpot API read-back de property `ef_engagement_kind` en `0-162` para confirmar label visible, internal name y options
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts`
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces` solo tras dry-run aprobado por el agente ejecutor y con evidencia previa.
- SQL smoke contra `greenhouse_core.services` para distribucion de `pipeline_stage/status/active`.

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
- [ ] `docs/documentation/comercial/servicios-engagement.md` y `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md` quedaron sincronizados
- [ ] Se documentaron servicios no materializables por falta de association/company/space sin forzar datos

## Follow-ups

- Registry DB `greenhouse_core.hubspot_service_pipeline_stage_config` si se quiere V2 admin-gobernable similar a `hubspot_deal_pipeline_config`.
- Signal dedicado `commercial.service_engagement.lifecycle_stage_drift` si Slice 4 no puede cerrarlo en V1.
- UI manual queue para services no materializables si la deuda de asociaciones HubSpot se mantiene.
- Comando canonico Greenhouse -> HubSpot `p_services` para crear/proyectar Sample Sprints si esta task decide dejarlo fuera de scope implementativo.

## Open Questions

- ¿`Pausado` debe ser `active=FALSE` para excluir de P&L/ICO operativo o `active=TRUE` con `pipeline_stage='paused'` para mantener obligaciones operativas visibles? Recomendacion inicial: `active=FALSE`, pero Discovery debe confirmar consumidores.
- ¿Unknown stage debe usar `hubspot_sync_status='unmapped'` o agregar un estado nuevo `failed_stage_mapping`? Requiere revisar CHECK/consumers reales antes de implementar.
- ¿La proyeccion de Sample Sprints hacia HubSpot `p_services` se activa en esta task o queda como follow-up despues de crear la etapa y el mapper? Recomendacion: si se implementa, hacerlo acotado, auditado y feature-flagged.
