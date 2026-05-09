# TASK-837 — Deal-Bound Sample Sprint HubSpot Service Projection

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
- Epic: `EPIC-014`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm / delivery / agency`
- Blocked by: `TASK-836`
- Branch: `task/TASK-837-deal-bound-sample-sprint-service-projection`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa el flujo deal-bound de Sample Sprints: el wizard debe seleccionar un HubSpot Deal abierto, crear el Sample Sprint como `greenhouse_core.services` no-regular y proyectarlo a HubSpot `p_services` en la etapa `Validacion / Sample Sprint`. El servicio HubSpot debe quedar asociado al Deal seleccionado y heredar sus asociaciones de company y contactos.

Esta task separa el write path outbound y la experiencia transaccional del foundation de lifecycle/stages de `TASK-836`, para que `TASK-836` permanezca enfocada en Service Pipeline sync y mapping.

## Why This Task Exists

Sample Sprints son servicios no-regulares (`engagement_kind IN ('pilot','trial','poc','discovery')`) pero nacen desde una oportunidad comercial concreta. Hoy el wizard puede declarar el service interno sin exigir un Deal abierto como ancla comercial, y no existe un contrato cerrado para crear el `p_services` HubSpot asociado al Deal, company y contactos del Deal.

Sin ese ancla, el flujo queda fragil: un Sample Sprint puede quedar huerfano de CRM, sin trazabilidad de pipeline comercial, sin asociaciones confiables para organization/workspace y con riesgo de duplicar servicios en HubSpot ante retries o fallas parciales.

## Goal

- Exigir seleccion de HubSpot Deal abierto en el wizard de Sample Sprint.
- Filtrar y revalidar Deals elegibles por stage IDs/configuracion sincronizada, no por labels visibles.
- Crear/proyectar el HubSpot `p_services` del Sample Sprint en `Validacion / Sample Sprint`.
- Asociar el `p_services` al Deal seleccionado, a la company del Deal y al contacto o contactos asociados al Deal.
- Persistir `hubspot_deal_id`, `hubspot_service_id` y metadata interna suficiente para idempotencia y reconciliacion.
- Dejar fallas parciales como estados retryable/auditables, no como exitos silenciosos.

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
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Sample Sprint sigue siendo `greenhouse_core.services`; no crear tabla paralela.
- El Deal gobierna la oportunidad comercial; `p_services` gobierna el service/engagement macro; Greenhouse gobierna approval, progress, outcome y lineage.
- La UI nunca decide elegibilidad final. El server debe revalidar Deal abierto antes de crear o proyectar.
- No filtrar por labels visibles de HubSpot. Usar stage IDs y metadata sincronizada (`is_closed`, `is_won` o equivalente).
- El servicio no debe quedar huerfano: `p_services` debe asociarse al Deal, company y contacto(s) heredados desde el Deal.
- No duplicar `p_services` ante retry; usar idempotency key/lineage estable.
- Si HubSpot falla despues de crear el service local, el estado debe quedar retryable/auditable.
- Access model dual-plane: la surface usa `gestion.sample_sprints`; las mutaciones usan `commercial.engagement.*` y, si se agrega capability CRM, debe declararse explicitamente.

## Normative Docs

- `docs/tasks/to-do/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`
- `docs/tasks/complete/TASK-809-sample-sprints-ui-wizards.md`
- `docs/tasks/complete/TASK-808-engagement-audit-log-outbox-events-reactive-consumers.md`
- `docs/tasks/complete/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-836`: debe existir stage HubSpot Service Pipeline `Validacion / Sample Sprint`, property `ef_engagement_kind` y mapper de lifecycle.
- `greenhouse_core.services.hubspot_deal_id` y `greenhouse_core.services.hubspot_service_id`.
- `greenhouse_commercial.hubspot_deal_pipeline_config` o fuente equivalente para identificar Deals abiertos sin hardcodear labels.
- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/sample-sprints/store.ts`
- `src/app/api/agency/sample-sprints/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- HubSpot `p_services` custom object `0-162`.

### Blocks / Impacts

- Completa el rollout operativo de Sample Sprints como servicios no-regulares conectados al proceso comercial.
- Reduce drift entre Deal Pipeline, Service Pipeline y Greenhouse `services`.
- Impacta Commercial Health/reliability para detectar Sample Sprints sin `p_services` o sin asociaciones CRM.
- Impacta Organization Workspace y attribution porque company/contact inheritance estabiliza el contexto comercial.

### Files owned

- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/declare.ts` (extender con `hubspotDealId` + outbox emit)
- `src/app/api/agency/sample-sprints/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/views/greenhouse/agency/sample-sprints/wizards/DealSelectionStep.tsx` (nuevo)
- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/eligible-deals-reader.ts` (nuevo, server-side reader con cache TTL 60s)
- `src/lib/hubspot/list-services-for-company.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts` (extender con lookup cascade webhook eco)
- `src/lib/sync/projections/sample-sprint-hubspot-outbound.ts` (nuevo, projection registrada en outbox)
- `src/lib/sync/projections/sample-sprint-hubspot-outbound.test.ts` (nuevo)
- `src/lib/webhooks/handlers/hubspot-services.ts` (extender lookup cascade)
- `src/lib/reliability/queries/sample-sprint-outbound-pending-overdue.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-outbound-dead-letter.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-partial-associations.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-deal-closed-but-active.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-deal-associations-drift.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-outcome-terminal-pservices-open.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-legacy-without-deal.ts` (nuevo)
- `src/lib/reliability/queries/get-reliability-overview.ts` (extender con los 7 signals nuevos)
- `src/app/admin/integrations/hubspot/sample-sprint-dead-letter/page.tsx` (nuevo, dead-letter UX)
- `src/app/api/admin/integrations/hubspot/sample-sprint-dead-letter/[serviceId]/retry/route.ts` (nuevo)
- `src/app/api/admin/integrations/hubspot/sample-sprint-dead-letter/[serviceId]/skip/route.ts` (nuevo)
- `src/config/entitlements-catalog.ts` (agregar `commercial.engagement.recover_outbound`)
- `services/hubspot_greenhouse_integration/hubspot_client.py` (Slice 0.5b — agregar `create_service`, `update_service`, `find_service_by_idempotency_key`)
- `services/hubspot_greenhouse_integration/app.py` (Slice 0.5b — agregar 3 Flask routes: `POST /services`, `PATCH /services/<id>`, `GET /services/by-idempotency-key/<key>`)
- `services/hubspot_greenhouse_integration/tests/test_hubspot_services_outbound.py` (Slice 0.5b — nuevo, 6 tests pytest)
- `scripts/create-hubspot-service-custom-properties.ts` (Slice 0.5a — extender con property `ef_greenhouse_service_id` idempotente)
- `migrations/<timestamp>_task-837-services-idempotency-key-and-sync-status-states.sql` (Slice 0.5c — nuevo, agregar `idempotency_key TEXT NULL` + UNIQUE INDEX partial + extender CHECK `hubspot_sync_status` con 5 valores nuevos del outbound state machine)
- `src/types/db.d.ts` (Slice 0.5c — regen via `pnpm db:generate-types` post-migrate)
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar 2 events nuevos)
- `docs/operations/runbooks/sample-sprint-outbound-recovery.md` (nuevo)
- `docs/documentation/comercial/servicios-engagement.md`
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`
- `CLAUDE.md` (agregar Hard Rules canonicas para que tasks futuras hereden las invariantes)

## Current Repo State

### Already exists

- `/agency/sample-sprints` y `/api/agency/sample-sprints` existen como surface/API real.
- `declareSampleSprint()` crea servicios no-regulares con approval inicial sobre `greenhouse_core.services`.
- `greenhouse_core.services` ya tiene `hubspot_deal_id` y `hubspot_service_id` documentados para integración HubSpot.
- `src/lib/commercial/deals-store.ts` sincroniza deals y mantiene metadata de pipeline/stages.
- TASK-813 ya materializa inbound HubSpot `p_services` hacia `greenhouse_core.services`.
- HubSpot API live, portal `48713323`, objeto `0-162`, verificado el 2026-05-08: existen 87 properties activas y ya existen estas properties Greenhouse/Efeonce custom:
  - `ef_deal_id` (`HubSpot Deal ID`)
  - `ef_space_id` (`Greenhouse Space ID`)
  - `ef_organization_id` (`Greenhouse Organization ID`)
  - `ef_pipeline_stage` (`Pipeline Stage (Greenhouse)`)
  - `ef_linea_de_servicio`, `ef_servicio_especifico`
  - `ef_modalidad`, `ef_billing_frequency`, `ef_country`, `ef_currency`
  - `ef_start_date`, `ef_target_end_date`
  - `ef_total_cost`, `ef_amount_paid`
  - `ef_notion_project_id`
- HubSpot tambien expone standard properties utiles `hs_name`, `hs_pipeline`, `hs_pipeline_stage`, `hubspot_owner_id` y `hs_unique_creation_key`.

### Gap

- El wizard no exige seleccionar HubSpot Deal abierto.
- El API de creacion no revalida que el Deal siga abierto ni que tenga company/contactos.
- No existe comando canonico Greenhouse -> HubSpot `p_services` para Sample Sprints.
- No existe aun `ef_engagement_kind` en HubSpot `p_services`; `TASK-836` debe crearla como property minima para distinguir `regular|pilot|trial|poc|discovery`.
- `ef_pipeline_stage` existe pero no contiene `validation`; la stage canonica de HubSpot debe venir de `hs_pipeline_stage`, y `ef_pipeline_stage` solo debe setearse si `TASK-836` decide extenderla con `validation`.
- Falta verificar si `hs_unique_creation_key` puede usarse como idempotency key writable para creates outbound. Si no es usable, crear una property minima `ef_greenhouse_service_id`.
- No hay read-back/reliability especifico para Sample Sprint creado sin Deal, sin `p_services` o sin asociaciones company/contact.

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

### Slice 0 — Pre-implementation checkpoints (binary gates antes de Plan)

Estos checkpoints son obligatorios antes de iniciar Plan/Discovery. Cada uno produce una decision binaria que cambia el shape de slices posteriores; sin resolverlos, planificar Slice 4-5 es especulativo.

- **Checkpoint A — `hs_unique_creation_key` writability**: ejecutar sandbox API call contra HubSpot dev portal creando un `p_services` con `properties: { hs_unique_creation_key: '<test-uuid>' }` y luego `GET` para verificar que el valor persiste y queda consultable. Documentar resultado:
  - Si writable + readable: usar como idempotency key primaria; no crear `ef_greenhouse_service_id`.
  - Si NOT writable o NOT readable confiablemente: crear property `ef_greenhouse_service_id` (text, single-line, internal name canonico) ANTES de implementar Slice 4. Documentar en HubSpot con label `Greenhouse Service ID`.
- **Checkpoint B — Multi-company association label**: verificar via HubSpot API si Deals con multiples companies tienen association label primaria (`HUBSPOT_DEFINED` con label `Primary`) confiable. Documentar:
  - Si existe primaria confiable: usar como source of truth.
  - Si NO existe o es inconsistente: implementar manual queue UI (Slice 5) ANTES de habilitar el wizard a operadores.
- **Checkpoint C — Rate limits posture**: confirmar que el bridge `hubspot-greenhouse-integration` (Cloud Run) maneja el outbound projection (no Vercel route inline). El bridge ya tiene rate limiter compartido y backoff exponencial. Si por alguna razon Discovery decide usar otro path, documentar la politica de rate limiting equivalente antes de Slice 4.
- **Checkpoint D — `ef_pipeline_stage` deprecation**: confirmar con stakeholders comerciales que `ef_pipeline_stage` queda deprecated para Sample Sprints (`hs_pipeline_stage` es source of truth). Si aun se usa en reportes HubSpot ad-hoc, planear migracion de esos reportes.

#### Slice 0 — Resultados ejecutados 2026-05-09 (HubSpot portal 48713323, agente Claude Opus)

##### Checkpoint A — `hs_unique_creation_key` writability → **NO writable. Path fallback obligatorio.**

Evidencia ejecutada contra `POST https://api.hubapi.com/crm/v3/objects/0-162`:

- Primer intento (sin stage): HubSpot rechaza con `VALIDATION_ERROR` por `hs_pipeline_stage` requerido — confirma que stage es mandatory at create time.
- Segundo intento con `hs_pipeline_stage=1357763256` (validation) y `hs_unique_creation_key=task837-cpa-<uuid>` devolvió:

```json
{
  "status": "error",
  "category": "VALIDATION_ERROR",
  "errors": [{
    "message": "\"hs_unique_creation_key\" is a read only property; its value cannot be set.",
    "code": "READ_ONLY_VALUE",
    "context": {"propertyName": ["hs_unique_creation_key"]}
  }]
}
```

- `GET /crm/v3/properties/0-162/ef_greenhouse_service_id` → `404 OBJECT_NOT_FOUND` (property aún no existe).

**Decision binaria**: `hs_unique_creation_key` es **READ-ONLY** at create time en custom object `0-162`. La idempotency key writable canónica para Slice 4 es **`ef_greenhouse_service_id`**.

**Action items derivados (bloqueantes pre-Slice 4)**:

- Crear property HubSpot `ef_greenhouse_service_id` en `0-162` con shape:
  - `name`: `ef_greenhouse_service_id`
  - `label`: `Greenhouse Service ID`
  - `type`: `string`, `fieldType`: `text`, single-line
  - `groupName`: `service_information`
  - `description`: `UUID del service en Greenhouse. Idempotency key para outbound projection (TASK-837).`
  - `hasUniqueValue`: `true` si HubSpot lo soporta para custom objects (verificar al crear).
- Extender `services/hubspot_greenhouse_integration/contract.py` `SERVICE_PROPERTIES` para incluir `ef_greenhouse_service_id` en el read contract.
- Slice 4 idempotency primaria: usar `ef_greenhouse_service_id = service_id` (UUID Greenhouse). Pre-create `GET /search` filterGroups por este property antes de POST.
- **NO crear** `hs_unique_creation_key` ni intentar setearlo en outbound payloads — HubSpot lo rechaza con `READ_ONLY_VALUE`.

##### Checkpoint B — Multi-company primary association label → **No-op en V1. Manual queue NO requerido.**

Evidencia ejecutada contra `GET /crm/v3/objects/deals?associations=companies&limit=50` (3 páginas, 150 deals scanned):

- Distinct `toObjectId` count per deal: **100% de deals tienen exactly 1 company asociada** (0 deals con multi-company real).
- Inspección v4 (`GET /crm/v4/objects/deals/{id}/associations/companies`) en 3 sample deals (`32425565567`, `33028841864`, `34020586807`) devolvió:

```json
{
  "results": [{
    "toObjectId": "<single_id>",
    "associationTypes": [
      {"category": "HUBSPOT_DEFINED", "typeId": 5, "label": "Primary"},
      {"category": "HUBSPOT_DEFINED", "typeId": 341, "label": null}
    ]
  }]
}
```

- El "deal_to_company_unlabeled" (typeId 341) que aparecía en v3 list NO es una segunda company — es un duplicate associationType sobre la misma `toObjectId`. Falso positivo del v3 endpoint.

**Decision binaria**: en el portal Greenhouse 48713323, el patrón empírico es **1 deal → 1 company** con label `Primary` (typeId 5 HUBSPOT_DEFINED) consistentemente presente. **Manual queue UI para multi-company NO es requerido en V1.**

**Action items derivados**:

- Slice 4 resolve company así:

```ts
const primary = associations.results.find(r =>
  r.associationTypes.some(t => t.category === 'HUBSPOT_DEFINED' && t.typeId === 5)
) ?? associations.results[0]
```

- Defensive fallback (cinturón + tirantes): si en futuro emerge un deal con `len(distinct toObjectIds) > 1`, preferir el que tiene `typeId=5 (Primary)`. Si ninguno tiene Primary label, **bloquear** el wizard con error explicit `multi_company_unresolved` y crear reliability signal `commercial.sample_sprint.multi_company_unresolved` (kind=drift, severity=warning, steady=0). Materializar manual queue UI **solo si** el signal sale > 0 en runtime.
- NO implementar manual queue UI especulativamente. Aplicar YAGNI con cobertura defensiva.

##### Checkpoint C — Bridge rate limit posture → **Detección OK. Endpoints CRUD `0-162` AUSENTES.**

Inspección [services/hubspot_greenhouse_integration/hubspot_client.py](services/hubspot_greenhouse_integration/hubspot_client.py) + [app.py](services/hubspot_greenhouse_integration/app.py):

| Capacidad | Estado | Línea(s) |
| --- | --- | --- |
| Detección HTTP 429 → `HUBSPOT_RATE_LIMIT` | ✅ | `hubspot_client.py:54-55` |
| Captura `Retry-After` header | ✅ | `hubspot_client.py:21,26,66,956` |
| Bridge response 429 al caller con `Retry-After` | ✅ | `app.py:635-638` |
| Retry/backoff INTERNO en bridge | ❌ (intencional) | stateless — backoff vive en consumer-side |
| Endpoint **POST `/0-162`** (create service) | ❌ MISSING | — |
| Endpoint **PATCH `/0-162/{id}`** (update service) | ❌ MISSING | — |
| Endpoint **POST search** filtered por `ef_greenhouse_service_id` | ❌ MISSING | — |
| Helpers `create_association` / `create_default_association` (genéricos, reusables para `0-162 → companies/contacts/deals`) | ✅ | `hubspot_client.py:929,944` |
| Helper `find_deal_by_idempotency_key` (pattern fuente para `find_service_by_idempotency_key`) | ✅ (mirror disponible) | `hubspot_client.py:264` |
| Helper `get_services_by_ids` (batch_read) | ✅ | `hubspot_client.py:973-998` |

**Decision binaria**: el bridge está arquitectónicamente correcto para rate limiting (stateless + propagate Retry-After + consumer-side exponential backoff via outbox state machine TASK-773). **NO requiere cambios al modelo de rate limiting**. Sí requiere agregar 3 endpoints CRUD para `0-162`.

**Action items derivados (bloqueantes pre-Slice 4)**:

Agregar a [hubspot_client.py](services/hubspot_greenhouse_integration/hubspot_client.py) (mirror de patterns existentes):

```python
def create_service(self, properties: dict[str, Any]) -> dict[str, Any]:
    # POST /crm/v3/objects/0-162 — mirror de create_deal (línea 206)
    response = self.session.post(
        f"{HUBSPOT_API}/crm/v3/objects/0-162",
        headers=self._headers(),
        json={"properties": properties},
        timeout=self.timeout_seconds,
    )
    if response.status_code >= 400:
        _raise_hubspot_error(response)
    return response.json()

def update_service(self, service_id: str, properties: dict[str, Any]) -> dict[str, Any]:
    # PATCH /crm/v3/objects/0-162/{id} — mirror de update_quote (línea 959)
    ...

def find_service_by_idempotency_key(self, key: str) -> dict[str, Any] | None:
    # POST /crm/v3/objects/0-162/search — mirror de find_deal_by_idempotency_key (línea 264)
    # filterGroups: [{filters: [{propertyName: 'ef_greenhouse_service_id', operator: 'EQ', value: key}]}]
    ...
```

Agregar Flask routes en [app.py](services/hubspot_greenhouse_integration/app.py): `POST /api/integrations/hubspot/services/create`, `PATCH /api/integrations/hubspot/services/{id}`, `GET /api/integrations/hubspot/services/by-idempotency-key/{key}`.

El reactive consumer `sample-sprint-hubspot-outbound` consume estos endpoints. Cuando recibe 429, respeta `Retry-After` del header del bridge response y schedulea reintento via outbox state machine (`failed → pending`, retry_count++).

##### Checkpoint D — `ef_pipeline_stage` deprecation → **Property activa hoy. Codebase coupling: 3 callsites. Stakeholder confirmation pending.**

Evidencia:

1. **HubSpot property metadata** (`GET /crm/v3/properties/0-162/ef_pipeline_stage`):
   - Created 2026-03-16 por user `75788512`
   - `type=enumeration`, `fieldType=select`, **6 valores**: `onboarding | active | renewal_pending | renewed | closed | paused`
   - **NO incluye `validation`** — incompatible con Sample Sprint stage canónico (`Validacion / Sample Sprint`, stage_id `1357763256`)
   - `archived: false` (vigente)
   - `groupName: service_information`
   - `readOnlyValue: false` (writable)

2. **Codebase coupling** (3 callsites):
   - [src/lib/hubspot/custom-properties.ts:341](src/lib/hubspot/custom-properties.ts#L341) — declaración legacy de la property (seed scripting)
   - [services/hubspot_greenhouse_integration/models.py:461](services/hubspot_greenhouse_integration/models.py#L461) — bridge MAPPING expone `ef_pipeline_stage` como `pipelineStage` en payload normalizado
   - [services/hubspot_greenhouse_integration/contract.py:341](services/hubspot_greenhouse_integration/contract.py#L341) — bridge CONTRACT incluye `ef_pipeline_stage` en read properties

3. **HubSpot reports/views/dashboards consumiendo `ef_pipeline_stage`**: NO determinable programáticamente (HubSpot reports API no expone listing público de filters). **Stakeholder confirmation requerida** con equipo comercial / HubSpot ops.

**Decision binaria parcial (técnica)**: `ef_pipeline_stage` queda **deprecated para Sample Sprints**. Outbound TASK-837 NO escribe esta property; usar SOLO `hs_pipeline_stage` (stage ID `1357763256`). El mapper inbound TASK-836 (`upsertServiceFromHubSpot`) ya consume solo `hs_pipeline_stage` per CLAUDE.md, así que el coupling es residual.

**Action items derivados (NO bloqueantes para Slice 1-6, pero sí para cleanup posterior)**:
- Stakeholder TODO: confirmar con `Cesar Henry / Daniel Ramirez / equipo comercial` si existen HubSpot saved views, dashboards, workflows o reports que filtren/agrupen por `ef_pipeline_stage`. Esta confirmación NO bloquea TASK-837 implementation, pero condiciona la cleanup follow-up.
- Crear follow-up task derivada `TASK-XXX-ef-pipeline-stage-deprecation-cleanup` (V1.1, post TASK-837 merge) que:
  1. Audite HubSpot reports/views/workflows (manualmente desde HubSpot UI o via support ticket) que dependan de `ef_pipeline_stage`.
  2. Migre cada uno a `hs_pipeline_stage`.
  3. Remueva el coupling en `models.py:461` y `contract.py:341` (eliminar `ef_pipeline_stage` del mapping + property list).
  4. Archive property en HubSpot vía `PATCH /crm/v3/properties/0-162/ef_pipeline_stage` con `archived: true`.
  5. Remueva la declaración legacy en `src/lib/hubspot/custom-properties.ts:341`.
- Hard rule canonizada en CLAUDE.md (Hard Rules section de TASK-837 ya incluye la regla #14 "NUNCA depender de `ef_pipeline_stage` como source of truth de HubSpot stage. Solo `hs_pipeline_stage`."). Confirmado vigente.
- Outbound projection (Slice 4) **NO debe** setear `ef_pipeline_stage` en el payload. Si por error se setea, el reliability signal `commercial.sample_sprint.legacy_pipeline_stage_written` (kind=drift, severity=warning) lo flag-ea (signal nuevo a considerar en Slice 6 si emerge regression).

#### Resumen de decisiones binarias post-checkpoints

| Checkpoint | Decision | Bloqueante para Slice 4? | Action items pre-Slice 4 |
|---|---|---|---|
| A — writability | `hs_unique_creation_key` READ-ONLY → fallback `ef_greenhouse_service_id` | **SÍ** | Crear property `ef_greenhouse_service_id` en HubSpot + extender bridge contract |
| B — multi-company | 0 deals multi-company en sample 150 → no-op V1 + defensive fallback | **NO** | Implementar resolver `find primary` + defensive `multi_company_unresolved` reliability signal |
| C — rate limits | Bridge OK; falta CRUD `0-162` | **SÍ** | Agregar `create_service`, `update_service`, `find_service_by_idempotency_key` al bridge + Flask routes |
| D — `ef_pipeline_stage` | Deprecated técnicamente; stakeholder confirmation pending para cleanup | **NO** (V1) / **SÍ** (cleanup follow-up) | Outbound NO escribe property; abrir follow-up task post-merge |

**Bloqueantes pre-Slice 4 (resumen)**: 2 items (Checkpoint A property creation + Checkpoint C bridge endpoints). Ambos consolidados en Slice 0.5 abajo. Todo lo demás puede planificarse con certeza.

### Slice 0.5 — Pre-implementation infra setup (derivado de Slice 0 checkpoints)

Slice de **infra setup** que land los 2 bloqueantes binarios identificados en Slice 0 (Checkpoint A property + Checkpoint C bridge endpoints). **Este slice debe completar antes de Slice 4.** Puede correr en paralelo con Slice 1-3 (UI/wizard + persistencia local) porque no hay dependencia de runtime entre ellos.

Razón de existir como slice separado: aislar las mutaciones cross-system (HubSpot property + bridge deploy) del resto de la implementación. Un PR atómico por dominio de cambio reduce blast radius en revert y simplifica review.

#### Sub-slice 0.5a — HubSpot property `ef_greenhouse_service_id`

Owner del cambio: extender [scripts/create-hubspot-service-custom-properties.ts](scripts/create-hubspot-service-custom-properties.ts) (script canónico de properties `0-162`). NO crear script paralelo.

Property shape definitivo:

```ts
{
  name: 'ef_greenhouse_service_id',
  label: 'Greenhouse Service ID',
  type: 'string',
  fieldType: 'text',
  groupName: 'service_information',
  description: 'UUID del service en Greenhouse (greenhouse_core.services.service_id). Idempotency key para outbound projection (TASK-837). NO editar manualmente.',
  hasUniqueValue: true,
  formField: false
}
```

Idempotencia: el script DEBE hacer `GET /crm/v3/properties/0-162/ef_greenhouse_service_id` antes de POST. Si retorna 200 → skip (logging "ya existe"). Si retorna 404 → POST. Si retorna 5xx → throw + Sentry. Patrón fuente: el resto del script ya hace esto para las otras properties.

Verificación post-deploy:

- `GET /crm/v3/properties/0-162/ef_greenhouse_service_id` → 200 con shape correcto.
- Crear un service de test con `ef_greenhouse_service_id=<uuid>` → verificar persiste en GET (esto sí es write+cleanup test, queda como verification step manual o Playwright integration).
- Confirmar `hasUniqueValue: true` se aplicó (HubSpot lo soporta para custom objects pero ocasionalmente lo silently ignora — verificar via metadata GET).

Rollback: `PATCH /crm/v3/properties/0-162/ef_greenhouse_service_id` con `{archived: true}`. La property archivada no afecta records existentes; queda recoverable via unarchive.

#### Sub-slice 0.5b — Bridge endpoints CRUD `0-162`

Owner del cambio: [services/hubspot_greenhouse_integration/hubspot_client.py](services/hubspot_greenhouse_integration/hubspot_client.py) + [app.py](services/hubspot_greenhouse_integration/app.py).

Helpers nuevos en `hubspot_client.py`:

- `create_service(properties: dict[str, Any]) -> dict[str, Any]` — POST `/crm/v3/objects/0-162`. Mirror de `create_deal` (línea 206). Properties mínimas requeridas por HubSpot: `hs_name`, `hs_pipeline_stage`. Resto opcional (incluye `ef_greenhouse_service_id` para idempotency).
- `update_service(service_id: str, properties: dict[str, Any]) -> dict[str, Any]` — PATCH `/crm/v3/objects/0-162/{service_id}`. Mirror de `update_quote` (línea 959). Para asignar `hubspot_service_id` post-create cuando outbound necesite parchear.
- `find_service_by_idempotency_key(key: str) -> dict[str, Any] | None` — POST `/crm/v3/objects/0-162/search`. Mirror de `find_deal_by_idempotency_key` (línea 264). FilterGroups: `[{filters: [{propertyName: 'ef_greenhouse_service_id', operator: 'EQ', value: key}]}]`. Devuelve `None` si search no matchea (no throw).

Routes nuevas en `app.py` (mirror del shape `/services/<id>` ya existente en línea 896):

- `POST /services` — body: `{properties: {...}}` → llama `create_service` → response `{ok, hubspotServiceId, properties}`.
- `PATCH /services/<service_id>` — body: `{properties: {...}}` → llama `update_service` → response `{ok, properties}`.
- `GET /services/by-idempotency-key/<key>` → llama `find_service_by_idempotency_key` → response `{ok, hubspotServiceId | null, properties | null}`.

Auth: las 3 routes nuevas siguen el patrón existente del bridge (Bearer `GREENHOUSE_INTEGRATION_API_TOKEN`). NO bypass.

Tests Python (pytest, en `services/hubspot_greenhouse_integration/tests/`):

- `test_create_service_happy_path` — mock HubSpot 200 + valid response.
- `test_create_service_validation_error_propagates` — mock HubSpot 400 → bridge raises `HubSpotIntegrationError(status_code=400, error_code='HUBSPOT_VALIDATION')`.
- `test_create_service_rate_limit_propagates_retry_after` — mock HubSpot 429 + Retry-After header → bridge raises con `retry_after` populated.
- `test_find_service_by_key_no_match_returns_none` — mock search results empty → returns None (no throw).
- `test_find_service_by_key_match_returns_record` — mock 1 result → returns dict.
- `test_update_service_happy_path` — mock 200.

Deploy: via GitHub Actions workflow `hubspot-greenhouse-integration-deploy.yml` (auto-trigger on push a `develop` que toque `services/hubspot_greenhouse_integration/**`). Verificar `gh run list --workflow=hubspot-greenhouse-integration-deploy.yml --limit 1` → status `success` antes de marcar slice complete.

Smoke verification post-deploy:

- `curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health` → 200.
- `curl GET .../services/by-idempotency-key/<random-uuid>` con auth → 200 + `{ok: true, hubspotServiceId: null}` (no match esperado para uuid random).

Rollback: `gh run rerun` del workflow del commit anterior, O `gcloud run services update-traffic hubspot-greenhouse-integration --to-revisions=PREVIOUS=100 --region=us-central1`.

#### Sub-slice 0.5c — Migration PG `idempotency_key` + extender `hubspot_sync_status` enum

Owner del cambio: nueva migration en [migrations/](migrations/) generada via `pnpm migrate:create task-837-services-idempotency-key-and-sync-status-states`.

Cambios DDL:

```sql
-- Up Migration

-- 1. Agregar columna idempotency_key a services
ALTER TABLE greenhouse_core.services
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS services_idempotency_key_unique
  ON greenhouse_core.services (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Extender CHECK constraint hubspot_sync_status con los 5 valores nuevos del outbound state machine
--    Valores actuales (TASK-813/836): pending | synced | unmapped
--    Valores nuevos (TASK-837): outbound_pending | outbound_in_progress | ready | partial_associations | outbound_dead_letter
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_hubspot_sync_status_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_hubspot_sync_status_check
  CHECK (hubspot_sync_status IS NULL OR hubspot_sync_status IN (
    'pending',
    'synced',
    'unmapped',
    'outbound_pending',
    'outbound_in_progress',
    'ready',
    'partial_associations',
    'outbound_dead_letter'
  ));

-- 3. Anti pre-up-marker bug guard
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'services'
      AND column_name = 'idempotency_key'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-837 anti pre-up-marker check: services.idempotency_key was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.services_idempotency_key_unique;
ALTER TABLE greenhouse_core.services DROP COLUMN IF EXISTS idempotency_key;
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_hubspot_sync_status_check;
ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_hubspot_sync_status_check
  CHECK (hubspot_sync_status IS NULL OR hubspot_sync_status IN ('pending', 'synced', 'unmapped'));
```

Post-migrate: `pnpm db:generate-types` para regenerar `src/types/db.d.ts` con los nuevos valores del enum + columna. Commit el regen junto con la migration.

Verificación post-apply:

- `pnpm migrate:status` → migration listada como applied.
- `psql ... -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='greenhouse_core' AND table_name='services' AND column_name='idempotency_key'"` → 1 row.
- `psql ... -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='services_hubspot_sync_status_check'"` → CHECK con los 8 valores.
- `pnpm pg:doctor` → green.

Rollback: `pnpm migrate:down` ejecuta el Down marker que revierte CHECK + DROP COLUMN. Cero data loss porque `idempotency_key` no se ha poblado todavía.

#### Slice 0.5 — Acceptance Criteria

- [ ] Property `ef_greenhouse_service_id` existe en HubSpot `0-162` con shape correcto (verificado via GET metadata).
- [ ] `scripts/create-hubspot-service-custom-properties.ts` extendido con la property; idempotente (skipea si ya existe).
- [ ] Bridge endpoints `POST /services`, `PATCH /services/<id>`, `GET /services/by-idempotency-key/<key>` desplegados y respondiendo correctamente al smoke (verificado en Cloud Run logs + curl test).
- [ ] Pytest suite del bridge pasa con los 6 tests nuevos (`pnpm test` en bridge dir o `pytest services/hubspot_greenhouse_integration/tests/`).
- [ ] Migration PG aplicada en staging y prod; `idempotency_key` columna presente; CHECK constraint con 8 valores.
- [ ] `src/types/db.d.ts` regenerado y commiteado (`pnpm db:generate-types`).
- [ ] `pnpm pg:doctor` green post-migrate.
- [ ] GitHub Actions workflow `hubspot-greenhouse-integration-deploy.yml` corrió exitosamente para el commit del slice.
- [ ] Plan de rollback documentado en PR description (property archive + Cloud Run revision rollback + `pnpm migrate:down`).

#### Slice 0.5 — Out of Scope

- NO implementar el reactive consumer outbound (eso es Slice 4).
- NO implementar el wizard Deal selection (eso es Slice 2).
- NO escribir lógica de outbox emit en `declareSampleSprint()` (eso es Slice 3).
- NO setear `idempotency_key` en INSERTs existentes (queda NULL para todos los registros pre-Slice 3; sólo nuevos services post-Slice 3 lo tendrán populated).

### Slice 1 — Eligible Deal Source

- Crear o extender reader server-side para listar Deals elegibles para Sample Sprint.
- Elegible significa Deal abierto: no ganado, no perdido, no cerrado terminal.
- Resolver elegibilidad desde `hubspot_deal_pipeline_config` o fuente equivalente con stage IDs, no labels.
- Incluir contexto para UI: nombre del Deal, stage, amount, company asociada y contactos asociados.
- Si el mirror local no tiene asociaciones suficientes, agregar fallback controlado a HubSpot API o marcar el Deal como no seleccionable con razon.
- TTL del cache del reader: 60s in-memory por subject. Deals que se cierran en HubSpot deben dejar de ser elegibles en menos de 1 minuto sin requerir resync completo.

### Slice 2 — Wizard Deal Selection

- Actualizar el wizard de declaracion para requerir un Deal elegible.
- Mostrar company/contactos heredados como contexto no editable.
- Deshabilitar o bloquear submit si falta Deal, company o contactos.
- Mantener copy visible en `src/lib/copy/agency.ts` si se agregan labels, empty states, errores o aria labels.

### Slice 3 — Server-Side Creation Contract (PG-first, outbox-driven outbound)

- Extender `DeclareSampleSprintInput` para recibir `hubspotDealId`.
- Revalidar en `declareSampleSprint()` que el Deal sigue abierto antes de mutar (lookup en `hubspot_deal_pipeline_config` o reader canonico, NO confiar en valor del cliente).
- Revalidar que el Deal tiene company asociada y al menos un contacto asociado.
- Persistir `hubspot_deal_id` en `greenhouse_core.services` y metadata de lineage comercial en `commitment_terms_json` o primitive aprobada durante Discovery.
- Persistir `idempotency_key` estable en metadata: si Checkpoint A determina `hs_unique_creation_key` writable, usar `service_id` (uuid Greenhouse) como key; si no, generar `ef_greenhouse_service_id = service_id`. La key vive en metadata desde el INSERT, ANTES del POST HubSpot.
- Mantener audit/outbox en la misma transaccion local.
- **Emitir outbox event `commercial.sample_sprint.declared v1`** en la misma tx con payload `{serviceId, hubspotDealId, idempotencyKey, requestedAt}` — el outbound projection consumer lo procesa async (Slice 4). Esto **rompe el coupling** PG ↔ HubSpot inline: si HubSpot esta caido, el service local queda persistido y el reactive consumer reintentara hasta exito o dead-letter. NO ejecutar POST HubSpot inline en el route handler (anti-pattern TASK-771).
- El handler responde 201/200 al cliente con `service_id` y estado `outbound_pending`. La UI muestra estado "proyectando a HubSpot..." con badge transitorio hasta que el reactive consumer complete o dead-letter.

### Slice 4 — HubSpot `p_services` Outbound Projection (Cloud Run reactive consumer)

- **Registrar projection canonica** en `src/lib/sync/projections/sample-sprint-hubspot-outbound.ts` consumiendo `commercial.sample_sprint.declared v1`. Patron fuente: `provider_bq_sync` (TASK-771) y `hubspot-services-intake` (TASK-813). El consumer corre en `ops-worker` Cloud Run, NUNCA inline en route Vercel. Beneficios: retry exponencial automatico, dead-letter despues de N intentos, idempotency tracking, rate limit handling co-located con bridge.
- **Re-leer de PG en el `refresh`**: el consumer lee el service local por `entityId=service_id` desde PG canonica, NUNCA confia en payload del outbox como source of truth. Esto garantiza consistencia ante updates posteriores al evento.
- **Hosting**: el bridge Cloud Run `hubspot-greenhouse-integration` (`services/hubspot_greenhouse_integration/`) ya tiene rate limiter HubSpot compartido + auth + retry policy. El consumer hace HTTP call al bridge, NO HTTP call directo a HubSpot. Si Discovery decide otro path (e.g., consumer Node directo en ops-worker con token HubSpot), debe replicar rate limiter + backoff identico.
- Crear helper canonico server-side `createSampleSprintHubSpotService(input)` que arma payload y llama bridge. Helper puro testeable.
- Reutilizar propiedades existentes antes de proponer properties nuevas:
  - `ef_deal_id` para el Deal seleccionado; no crear `ef_source_deal_id`.
  - `ef_organization_id` y `ef_space_id` para anchors Greenhouse existentes.
  - `ef_start_date`, `ef_target_end_date`, `ef_total_cost`, `ef_amount_paid`, `ef_currency`, `ef_modalidad`, `ef_billing_frequency`, `ef_country`, `ef_linea_de_servicio`, `ef_servicio_especifico` cuando el comando tenga esos valores.
- Setear la stage real del Service Pipeline con `hs_pipeline` + `hs_pipeline_stage = Validacion / Sample Sprint` (stage ID resuelto desde Slice 1 de TASK-836); NO usar `ef_pipeline_stage` como source of truth de HubSpot stage.
- Setear `ef_engagement_kind` (creada por TASK-836) con valor interno `pilot|trial|poc|discovery` segun lo declarado en Greenhouse.
- **Idempotency primaria**: usar `hs_unique_creation_key = service_id` si Checkpoint A confirmo writability. Si NO, usar property fallback `ef_greenhouse_service_id = service_id`. Documentar la decision tomada en Checkpoint A en el PR.
- **Idempotency secundaria pre-create**: ANTES de POST, hacer `GET /search` por la idempotency key elegida. Si existe `p_services` con esa key, skipear create y solo asegurar asociaciones (caso retry parcial).
- No crear `ef_engagement_origin` en V1 salvo que Discovery demuestre que `ef_engagement_kind` + `ef_deal_id` + idempotency key no cubren auditoria/reconciliacion.
- Asociar `p_services` -> Deal, Company y Contact(s) en una secuencia de calls al bridge. Cada asociacion es idempotente (HubSpot tolera duplicates).
- **Persistir `hubspot_service_id` local en la misma respuesta del bridge**: UPDATE atomico del service en PG con `hubspot_service_id`, `hubspot_last_synced_at`, `hubspot_sync_status='ready'`. Si el UPDATE falla post-create HubSpot, el siguiente retry detecta la fila huerfana via lookup secundario (Slice 5).
- **Webhook eco race**: cuando HubSpot dispara `p_services.creation` webhook hacia Greenhouse con el service recien creado por outbound, el handler `hubspot-services` debe matchear:
  1. primero por `hs_unique_creation_key` o `ef_greenhouse_service_id` (= service_id local) -> matches el service local existente, UPSERT con `hubspot_service_id` resuelto;
  2. fallback por `hubspot_service_id` -> matches si outbound ya persistio.
  Sin lookup cascade en el handler, la combinacion outbound + webhook puede crear filas duplicadas si el webhook llega antes que el UPDATE atomico del paso anterior. Esta cascade requiere coordinacion con TASK-836 (handler inbound).

### Slice 5 — Failure Modes, Dead-Letter UX & Observability

La idempotency primary/secondary + retry policy quedaron declaradas en Slice 0 (checkpoints) + Slice 3 (outbox event) + Slice 4 (projection registrada). Este slice cubre el ciclo de vida completo de fallas y la UX de recovery.

- **Estados visibles del service local** (campo `hubspot_sync_status`):
  - `outbound_pending`: outbox event emitido, projection no la proceso aun.
  - `outbound_in_progress`: projection tomo el lock, esta ejecutando.
  - `ready`: `hubspot_service_id` persistido, asociaciones completas.
  - `partial_associations`: `hubspot_service_id` persistido pero alguna asociacion (Deal/Company/Contact) fallo. Reintentable.
  - `outbound_dead_letter`: agotaron retries. Requiere humano.
- **Recovery de partial associations**: el reactive consumer detecta `partial_associations` al re-correr, identifica que asociacion(es) faltan via `GET /associations` HubSpot y solo retry esas. Idempotente porque HubSpot tolera duplicate associations.
- **Dead-letter UX**: surface UI bajo `/admin/operations` o `/admin/integrations/hubspot/sample-sprint-dead-letter` que liste services en `outbound_dead_letter` con:
  - service_id, hubspot_deal_id, error history (last 3 attempts), last_error_message redactado via `redactErrorForResponse`.
  - boton "Reintentar" (capability `commercial.engagement.recover_outbound`, FINANCE_ADMIN o EFEONCE_ADMIN solo) que reemite el outbox event.
  - boton "Marcar como skip" para services donde el operador decide explicitamente no proyectar (dejar solo local). Genera audit log + outbox event `commercial.sample_sprint.outbound_skipped v1`.
- **Observability**:
  - Toda falla outbound captura via `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'sample_sprint_outbound', stage: '<create|associate|verify>' }, extra: { serviceId, hubspotDealId, attemptCount } })`.
  - NUNCA `Sentry.captureException()` directo. NUNCA loggear payload completo del bridge response (puede contener PII de contactos).
  - Toda response al cliente final pasa por `redactErrorForResponse` antes de devolver.
- **Audit log append-only**: cada transicion de `hubspot_sync_status` genera fila en `service_outbound_sync_log` (o reusar `audit_log` canonico) con `service_id, previous_status, next_status, triggered_by, occurred_at, error_message_redacted` para auditoria post-mortem.

### Slice 6 — Reliability Signals & Cross-System Drift Detection

Reliability signals canonicos bajo subsystem `commercial` (rollup hacia `Commercial Health`). Steady state declarado por signal:

- `commercial.sample_sprint.outbound_pending_overdue` — kind=lag, severity=warning si count>0. Cuenta services con `engagement_kind != 'regular'` AND `hubspot_sync_status='outbound_pending'` AND `created_at < now() - interval '15 minutes'`. Steady=0. Detecta projection consumer caido o backlog.
- `commercial.sample_sprint.outbound_dead_letter` — kind=dead_letter, severity=error si count>0. Cuenta services en `hubspot_sync_status='outbound_dead_letter'`. Steady=0. Cualquier > 0 requiere humano.
- `commercial.sample_sprint.partial_associations` — kind=drift, severity=warning si count>0. Cuenta services en `hubspot_sync_status='partial_associations'`. Steady=0 idealmente; el reactive consumer deberia drenar pero el signal lo flag-ea si stuck.
- `commercial.sample_sprint.deal_closed_but_active` — kind=drift, severity=warning si count>0. Sample Sprint con `hubspot_sync_status='ready'` pero el Deal asociado ya fue cerrado en HubSpot (won/lost). Operador comercial debe decidir: cerrar el Sample Sprint via outcome o reabrir el Deal.
- `commercial.sample_sprint.deal_associations_drift` — kind=drift, severity=warning si count>0. Sample Sprint cuyo Deal HubSpot perdio company o contact post-creacion. No bloqueante (no podemos forzar ediciones HubSpot), pero visible para operador comercial.
- `commercial.sample_sprint.outcome_terminal_pservices_open` — kind=drift, severity=warning si count>0. Sample Sprint con outcome terminal en Greenhouse (`converted | cancelled | dropped`) pero `p_services` HubSpot todavia en stage `Validacion / Sample Sprint`. Operador HubSpot debe mover el `p_services` a Closed (V1 manual; V2 puede automatizarse en task derivada).
- `commercial.sample_sprint.legacy_without_deal` — kind=data_quality, severity=warning. Sample Sprints legacy declarados antes de TASK-837 sin `hubspot_deal_id`. NO bloqueante, pero alimenta manual queue para retroactivamente vincular cuando posible.

Backfill / manual queue policy:

- Para Sample Sprints legacy existentes sin Deal: crear reporte/manual queue UI bajo `/admin/operations` agrupado por space/cliente. NUNCA inventar Deals retroactivamente. Operador comercial decide:
  - vincular Deal existente (UPDATE atomico de `hubspot_deal_id`)
  - declarar el Sample Sprint como pre-existing legacy (skip outbound projection)
  - cerrar el Sample Sprint si era basura
- Wire-up de signals en `getReliabilityOverview`. Subsystem rollup: `commercial`. Incident domain tag: `commercial`.

### Slice 7 — Docs and Runbook

- Actualizar `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` con el flujo deal-bound completo: wizard -> outbox event -> projection consumer -> `p_services` HubSpot.
- Actualizar `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` con el write path outbound acotado (Sample Sprints only V1, expansion plan documentado).
- Actualizar `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` con `commercial.sample_sprint.declared v1` y `commercial.sample_sprint.outbound_skipped v1`.
- Actualizar `docs/documentation/comercial/servicios-engagement.md` y `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md` con el wizard deal-bound visible.
- Crear runbook `docs/operations/runbooks/sample-sprint-outbound-recovery.md` cubriendo:
  - como diagnosticar `outbound_pending_overdue`
  - como reintentar desde dead-letter UI
  - como recuperar `partial_associations`
  - como vincular Sample Sprint legacy a Deal retroactivamente
  - como resolver `deal_closed_but_active` (cerrar outcome o reabrir Deal)
  - como mover `p_services` HubSpot a Closed cuando Sample Sprint outcome es terminal (V1 manual)
- Sincronizar `changelog.md` con el cambio de comportamiento del wizard (deal selection requerida).
- Documentar la decision tomada en Checkpoint A (writability `hs_unique_creation_key`) y Checkpoint B (multi-company primary association) en el PR description y en la spec arquitectura.

## Out of Scope

- No crear Deals automaticamente para Sample Sprints.
- No cambiar Deal Pipeline stages ni sus probabilidades.
- No resolver conversion de Sample Sprint a servicio regular mas alla de preservar lineage requerido por el flujo existente.
- No reescribir TASK-836 ni su mapper lifecycle.
- No activar write-back general de todos los servicios Greenhouse hacia HubSpot; solo Sample Sprint `p_services` acotado.
- No corregir asociaciones historicas de HubSpot fuera de reporte/manual queue.

## Detailed Spec

### Deal-bound creation contract

1. El wizard carga Deals elegibles desde una fuente server-side.
2. El usuario selecciona un Deal abierto.
3. El API revalida el Deal al submit:
   - stage no ganado;
   - stage no perdido;
   - Deal no cerrado;
   - company asociada presente;
   - al menos un contacto asociado presente.
4. Greenhouse crea el Sample Sprint como `greenhouse_core.services` no-regular.
5. Greenhouse crea/proyecta HubSpot `p_services` (`0-162`) en stage `Validacion / Sample Sprint`.
6. El `p_services` queda asociado al Deal seleccionado, a la company asociada al Deal y a todos los contactos asociados al Deal.
7. Greenhouse persiste `hubspot_deal_id`, `hubspot_service_id` y estado de sync auditable.

### HubSpot property policy

La task no debe crear properties duplicadas cuando ya existe una equivalente en `0-162`.

| Necesidad | Propiedad a usar | Estado |
| --- | --- | --- |
| Deal asociado | `ef_deal_id` | Ya existe |
| Organization Greenhouse | `ef_organization_id` | Ya existe |
| Space Greenhouse | `ef_space_id` | Ya existe |
| Tipo de servicio | `ef_engagement_kind` | Falta; owner `TASK-836` |
| Stage real HubSpot | `hs_pipeline_stage` | Ya existe; source of truth |
| Stage shadow Greenhouse | `ef_pipeline_stage` | Ya existe; no tiene `validation` hoy |
| Idempotencia create | `hs_unique_creation_key` | Existe; verificar si writable |
| Fallback idempotencia/reconciliacion | `ef_greenhouse_service_id` | Crear solo si `hs_unique_creation_key` no sirve |

No crear en V1:

- `ef_source_deal_id`: usar `ef_deal_id`.
- `ef_engagement_origin`: usar `ef_engagement_kind` y asociaciones; crearla solo si Discovery prueba un gap real.

### Association policy

| Association | Fuente | Requisito |
| --- | --- | --- |
| `p_services` -> Deal | Deal seleccionado en wizard | Obligatoria |
| `p_services` -> Company | Company asociada al Deal | Obligatoria |
| `p_services` -> Contact(s) | Contactos asociados al Deal | Obligatoria, uno o mas |

Si HubSpot permite multiples companies en el Deal, Discovery debe definir una politica deterministica: usar association label primaria si existe; si no hay primaria confiable, bloquear y pedir resolucion operativa.

### Access model

- `views`: se mantiene `gestion.sample_sprints` como surface visible.
- `entitlements`:
  - `commercial.engagement.declare` (existe) -> declara service local + emite outbox event. **No requiere capability nueva para "proyectar a CRM"**: la proyeccion outbound es disparada por outbox consumer, NO por accion directa del usuario. Esto resuelve naturalmente la separation declare-vs-project sin agregar capability.
  - `commercial.engagement.recover_outbound` (nuevo, granular) -> habilita "Reintentar" y "Marcar como skip" en dead-letter UX (Slice 5). Reservado a FINANCE_ADMIN + EFEONCE_ADMIN. NO mezclar con `commercial.engagement.declare`.
- `routeGroups`: no crear routeGroup nuevo. La surface dead-letter vive bajo `/admin/operations` (route_group `admin`).
- `startup policy`: sin cambios.

### Outbound projection contract (canonico)

```text
Wizard submit (route handler Vercel)
  ├─> validateDealEligibility (server-side, NO trust UI)
  ├─> declareSampleSprint() en tx PG:
  │   ├─ INSERT services (engagement_kind, hubspot_deal_id, idempotency_key, hubspot_sync_status='outbound_pending')
  │   ├─ INSERT engagement_approvals + audit_log
  │   └─ publishOutboxEvent('commercial.sample_sprint.declared v1')
  ├─> respond 201 al cliente con service_id + status='outbound_pending'
  │
  ┊  (async, decoupled)
  │
Cloud Scheduler (*/2 min via outbox publisher Cloud Run)
  └─> reactive consumer 'sampleSprintHubSpotOutbound':
      ├─ re-leer service desde PG (NO confiar payload)
      ├─ idempotency check: GET /search HubSpot por hs_unique_creation_key o ef_greenhouse_service_id
      ├─ si encontrado: skip POST, solo asegurar asociaciones
      ├─ si no encontrado: POST p_services via bridge hubspot-greenhouse-integration
      ├─ asociar Deal + Company + Contact(s)
      ├─ UPDATE service local: hubspot_service_id, hubspot_last_synced_at, hubspot_sync_status='ready'
      └─ falla parcial: hubspot_sync_status='partial_associations' (retryable)
      └─ falla total post N retries: hubspot_sync_status='outbound_dead_letter' (humano)
```

Beneficios sobre inline:

- HubSpot caido NO produce 5xx al cliente. El service local queda en `outbound_pending` y drena cuando HubSpot vuelva.
- Retry exponencial automatico via Cloud Run reactive pattern (TASK-771/773).
- Rate limit handling co-located con bridge (rate limiter compartido HubSpot).
- Observability uniforme: dead-letter signal + reliability dashboard.
- Cero coupling: si TASK-836 cambia el shape de `p_services`, solo el consumer se modifica, no el route handler ni el wizard.

### Transactional consistency policy

| Escenario | Comportamiento canonico |
| --- | --- |
| PG INSERT OK, outbox emit OK, HubSpot POST OK, asociaciones OK | `hubspot_sync_status='ready'`. Path feliz. |
| PG INSERT OK, outbox emit OK, HubSpot POST FAIL (timeout/5xx) | `hubspot_sync_status='outbound_pending'` (sin cambio). Reactive consumer reintenta exponencial. |
| PG INSERT OK, outbox emit OK, HubSpot POST OK, asociaciones FAIL parcial | `hubspot_sync_status='partial_associations'`. Reactive consumer reintenta solo asociaciones faltantes. |
| PG INSERT OK, outbox emit OK, HubSpot rate limit (429) | Bridge respeta `Retry-After` header, reactive consumer aplica backoff. |
| PG INSERT FAIL | Tx PG aborta. NO outbox event emitido. Cliente recibe 4xx/5xx claro. NO side effect HubSpot. |
| PG INSERT OK, outbox emit FAIL | Tx aborta (outbox emit y INSERT son misma tx). Cliente recibe 5xx. |
| Reactive consumer crash mid-execution | Outbox state machine deja event en `publishing`; siguiente run lo retoma con `SKIP LOCKED`. Idempotente. |
| Network partition en reactive consumer despues de POST exitoso pre-UPDATE local | Webhook eco entra antes que UPDATE atomico. Lookup cascade en handler inbound (Slice 4) matchea por `ef_greenhouse_service_id` y reconcilia. |

### Webhook eco cascade (anti-duplicate row)

Cuando el outbound projection crea `p_services` y HubSpot dispara webhook `p_services.creation` hacia Greenhouse, el handler `hubspot-services` debe matchear el service local existente para EVITAR crear una segunda fila. Cascade de matching:

1. Lookup primario por `hs_unique_creation_key` (o `ef_greenhouse_service_id` segun Checkpoint A) extraido del webhook payload. Match contra `services.idempotency_key` en PG. Si match: UPDATE con `hubspot_service_id` y `hubspot_sync_status='ready'`.
2. Lookup secundario por `hubspot_service_id` (path canonico TASK-813). Si match: UPSERT normal.
3. Si NO match en ninguno: comportamiento default TASK-813 (crear fila nueva con asociaciones HubSpot). Este path es el que TASK-813 cubre cuando un `p_services` se crea directamente en HubSpot sin Greenhouse.

Sin esta cascade, la combinacion outbound + webhook produce duplicado: una fila creada por outbound projection con `hubspot_service_id=X`, otra fila creada por webhook handler con `hubspot_service_id=X` (race entre UPDATE atomico local y webhook entrega).

### `ef_pipeline_stage` deprecation policy (resuelta)

`ef_pipeline_stage` queda **deprecated** para Sample Sprints. Decision canonica:

- Source of truth de HubSpot stage = `hs_pipeline_stage` (sistema HubSpot estandar).
- `ef_pipeline_stage` (custom property creada en migracion previa) NO se actualiza por outbound de esta task. Queda con su ultimo valor escrito y eventualmente se elimina como cleanup en task derivada.
- Reportes HubSpot ad-hoc que dependan de `ef_pipeline_stage` deben migrarse a `hs_pipeline_stage` (Checkpoint D).
- Inbound handler (TASK-836) NO lee `ef_pipeline_stage`; mapper canonico usa solo `hs_pipeline` + `hs_pipeline_stage`.

## Hard Rules (invariantes anti-regresion)

Reglas duras canonizadas por esta task. Cualquier futura task o agente que toque el flujo deal-bound de Sample Sprints, el outbound projection o el handler inbound `p_services` debe respetarlas:

- **NUNCA** ejecutar POST/PATCH/DELETE a HubSpot inline en un route handler Vercel para Sample Sprints. Toda mutacion outbound pasa por outbox event + reactive consumer en `ops-worker` Cloud Run (anti-pattern TASK-771).
- **NUNCA** responder 5xx al cliente cuando PG commiteo y solo HubSpot fallo. El cliente recibe 201 con `outbound_pending`; el reactive consumer reintenta async.
- **NUNCA** declarar Sample Sprint sin `hubspot_deal_id` validado server-side contra Deal abierto. La UI nunca decide elegibilidad final.
- **NUNCA** filtrar Deals elegibles por label visible HubSpot. Solo stage IDs sincronizados desde `hubspot_deal_pipeline_config` o equivalente.
- **NUNCA** crear `p_services` HubSpot sin idempotency key (ya sea `hs_unique_creation_key` o fallback `ef_greenhouse_service_id`). Toda creacion outbound es idempotente por construccion.
- **NUNCA** crear property HubSpot `ef_source_deal_id` ni `ef_engagement_origin`. Reusar `ef_deal_id` y `ef_engagement_kind` (la dimension orthogonal "tipo" vs "Deal" ya existe).
- **NUNCA** persistir `hubspot_service_id` sin `idempotency_key` previamente persistido. La idempotency key vive en metadata desde el INSERT local, ANTES del POST HubSpot.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del outbound projection. Usar `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'sample_sprint_outbound', ... } })`.
- **NUNCA** loggear payload completo del bridge response (puede contener PII de contactos). Usar `redactErrorForResponse` y `redactSensitive` antes de persistir o loggear.
- **NUNCA** crear segunda fila `services` cuando webhook eco entra para un service ya creado por outbound. El handler inbound aplica lookup cascade (Slice 4 + Webhook eco cascade policy).
- **NUNCA** mover `p_services` HubSpot a Closed automaticamente cuando outcome Greenhouse es terminal (V1 manual). Reliability signal `outcome_terminal_pservices_open` lo escala operativamente. Automatizar es task derivada V2.
- **NUNCA** inventar Deal retroactivamente para Sample Sprint legacy sin Deal. Operador comercial decide via manual queue (vincular existente, declarar legacy o cerrar).
- **NUNCA** depender de `ef_pipeline_stage` como source of truth de HubSpot stage. Solo `hs_pipeline_stage`.
- **SIEMPRE** que un Sample Sprint se declare via wizard, emitir outbox event `commercial.sample_sprint.declared v1` en la misma tx PG.
- **SIEMPRE** revalidar elegibilidad del Deal server-side al submit (stage abierto + company + ≥1 contacto). El cache del reader tiene TTL 60s; el revalidate es fresh.
- **SIEMPRE** que outbound projection reciba 429 de HubSpot, respetar `Retry-After` header del bridge. Backoff exponencial automatico.
- **SIEMPRE** que el operador HubSpot remueva una asociacion Deal->company o Deal->contact post-creacion del Sample Sprint, el signal `deal_associations_drift` lo flag-ea (no bloqueante, visible).
- **SIEMPRE** que un service entre en `outbound_dead_letter`, requiere humano via dead-letter UX (`commercial.engagement.recover_outbound` capability, FINANCE_ADMIN o EFEONCE_ADMIN solo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pre-implementation checkpoints A/B/C/D ejecutados y resultados documentados en PR description antes de empezar Slice 1.
- [ ] El wizard exige seleccionar un HubSpot Deal abierto para crear Sample Sprint.
- [ ] Deals ganados, perdidos o cerrados no se muestran como elegibles ni son aceptados por API.
- [ ] El API revalida server-side stage, company y contactos antes de crear (cache TTL 60s con revalidate fresh al submit).
- [ ] `declareSampleSprint()` persiste `hubspot_deal_id`, `idempotency_key` y `hubspot_sync_status='outbound_pending'` en la misma tx PG.
- [ ] La declaracion emite outbox event `commercial.sample_sprint.declared v1` en la misma tx (atomico).
- [ ] El route handler responde 201/200 al cliente sin hacer POST inline a HubSpot. **NO 5xx cuando HubSpot esta caido.**
- [ ] Reactive consumer registrado en `ops-worker` Cloud Run consume el outbox event y proyecta `p_services` async.
- [ ] El consumer hace idempotency check pre-create via `GET /search` por `hs_unique_creation_key` o `ef_greenhouse_service_id` antes de POST.
- [ ] El consumer escribe a HubSpot via bridge `hubspot-greenhouse-integration` (rate limit + retry compartidos).
- [ ] Al crear Sample Sprint se crea/proyecta un HubSpot `p_services` en `Validacion / Sample Sprint` (stage ID resuelto desde TASK-836 Slice 1).
- [ ] La proyeccion reutiliza `ef_deal_id`, `ef_organization_id`, `ef_space_id` y las properties existentes; no crea duplicados como `ef_source_deal_id` ni `ef_engagement_origin`.
- [ ] `ef_engagement_kind` existe (creada por TASK-836) y se setea con value interno no-regular `pilot|trial|poc|discovery`.
- [ ] La idempotencia usa `hs_unique_creation_key` si Checkpoint A confirmo writability; si no, usa fallback documentado `ef_greenhouse_service_id`.
- [ ] El `p_services` queda asociado al Deal, company y contacto(s) heredados desde el Deal.
- [ ] La proyeccion es idempotente y no duplica `p_services` ante retry, ni ante webhook eco circular (lookup cascade en handler inbound).
- [ ] Fallas parciales (asociaciones) quedan en `hubspot_sync_status='partial_associations'` y el reactive consumer las drena.
- [ ] Fallas totales post-N-retries quedan en `hubspot_sync_status='outbound_dead_letter'` con dead-letter UX accesible (capability `commercial.engagement.recover_outbound`).
- [ ] Multi-company unresolved tiene operator surface (manual queue) si Checkpoint B detecto que no hay primaria confiable.
- [ ] Audit log append-only registra cada transicion de `hubspot_sync_status`.
- [ ] Errores capturados via `captureWithDomain('integrations.hubspot', ...)`, NUNCA `Sentry.captureException()` directo.
- [ ] Responses al cliente pasan por `redactErrorForResponse` (no PII de contactos en logs ni respuestas).
- [ ] Reliability signals nuevos (`outbound_pending_overdue`, `outbound_dead_letter`, `partial_associations`, `deal_closed_but_active`, `deal_associations_drift`, `outcome_terminal_pservices_open`, `legacy_without_deal`) wired y verificados con steady-state esperado documentado.
- [ ] `ef_pipeline_stage` queda deprecated explicitamente; outbound NO la actualiza.
- [ ] Outbox event `commercial.sample_sprint.declared v1` documentado en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- [ ] Outbox event `commercial.sample_sprint.outbound_skipped v1` documentado para path "marcar como skip" del operador.
- [ ] Hard Rules (invariantes anti-regresion) reflejadas en CLAUDE.md o doc canonico equivalente al cierre.
- [ ] Runbook `docs/operations/runbooks/sample-sprint-outbound-recovery.md` creado y verificado.
- [ ] Docs/manual explican el flujo deal-bound y la diferencia Deal Pipeline vs Service Pipeline vs `p_services` validation stage.

## Verification

- Pre-implementation checkpoint reports persistidos: writability `hs_unique_creation_key` (Checkpoint A), multi-company primary association (Checkpoint B), bridge rate limiter posture (Checkpoint C), `ef_pipeline_stage` deprecation alignment (Checkpoint D).
- `pnpm test src/lib/commercial/sample-sprints`
- `pnpm test src/lib/commercial/deals-store.test.ts`
- `pnpm test src/lib/sync/projections/sample-sprint-hubspot-outbound.test.ts` (nuevo) cubriendo: idempotency check pre-create, lookup cascade webhook eco, partial associations recovery, dead-letter transition.
- `pnpm test src/lib/reliability/queries` para los 7 signals nuevos.
- tests focales de API/wizard para Deal abierto, Deal cerrado, company faltante, contactos faltantes, e idempotency/retry.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm pg:doctor`
- HubSpot API read-back de un Sample Sprint creado en sandbox/preview para confirmar `p_services` -> Deal, Company y Contact(s).
- HubSpot API read-back de properties usadas: `ef_deal_id`, `ef_engagement_kind`, `ef_organization_id`, `ef_space_id`, `hs_pipeline`, `hs_pipeline_stage`, `hs_unique_creation_key` o `ef_greenhouse_service_id`.
- Test integracion outbox: simular HubSpot 5xx en sandbox; verificar que el cliente recibe 201 con `outbound_pending`, que reactive consumer reintenta exponencial, y que post-recovery el service queda `ready` sin duplicados.
- Test integracion webhook eco: outbound crea `p_services`; antes que UPDATE atomico complete, simular webhook entrante; verificar que NO se crea segunda fila (lookup cascade matchea por idempotency key).
- Test integracion partial associations: simular fallo en POST de una asociacion (Contact); verificar que `hubspot_sync_status='partial_associations'` y que retry solo completa la asociacion faltante.
- Test integracion dead-letter: configurar bridge para fallar N+1 veces; verificar que service termina en `outbound_dead_letter` y que dead-letter UX lo lista con capability check correcto.
- Smoke `pnpm staging:request /api/agency/sample-sprints` con Deal sandbox; revisar HubSpot via API que el `p_services` quedo creado correctamente.
- Prueba manual o Playwright autenticado de `/agency/sample-sprints` declarando un Sample Sprint con Deal elegible controlado.
- Verificar reliability dashboard `/admin/operations` post-deploy: signals nuevos visibles con steady=0.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-836` quedo referenciado como dependency/foundation, no duplicado como owner del wizard deal-bound
- [ ] `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` quedaron sincronizados si cambio contrato runtime
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` registra `commercial.sample_sprint.declared v1` y `commercial.sample_sprint.outbound_skipped v1`
- [ ] Hard Rules canonizadas en `CLAUDE.md` para que agentes/tasks futuros hereden las reglas
- [ ] 7 reliability signals nuevos wired y verificados con steady-state esperado documentado
- [ ] Runbook `docs/operations/runbooks/sample-sprint-outbound-recovery.md` creado
- [ ] Pre-implementation checkpoint reports (A/B/C/D) persistidos en PR description
- [ ] `commercial.engagement.recover_outbound` capability declarada en entitlements catalog y seedeada en `capabilities_registry`

## Follow-ups

- UI manual queue para Sample Sprints legacy sin Deal si el backfill detecta datos historicos.
- Admin repair action para completar asociaciones HubSpot faltantes si reliability detecta drift recurrente.

## Open Questions

- **RESUELTA (2026-05-08)** `ef_pipeline_stage` queda **deprecated** para Sample Sprints. `hs_pipeline_stage` es source of truth de HubSpot stage. Outbound NO actualiza `ef_pipeline_stage`. Reportes ad-hoc dependientes deben migrarse (Checkpoint D). Ver `Detailed Spec > ef_pipeline_stage deprecation policy`.
- **RESUELTA (2026-05-08)** Capability separation declare-vs-project resuelta naturalmente con outbox pattern: la projection es disparada por outbox consumer, NO por accion directa del usuario. Solo se agrega capability granular `commercial.engagement.recover_outbound` (FINANCE_ADMIN + EFEONCE_ADMIN solo) para dead-letter UX. Ver `Detailed Spec > Access model`.
- ¿Contactos faltantes deben bloquear siempre o permitir override admin temporal? **Recomendacion canonica: bloquear**. Override temporal abre superficie de Sample Sprints sin contacto identificable, lo cual rompe assumption commercial (no se puede comunicar con quien). Si emerge caso legitimo (ej. Deal interno EOM testing), abrir task derivada con flag explicito + audit.
- ¿Existe association label primaria confiable para company en Deals con multiples companies? **Resolver en Checkpoint B (Slice 0)**. Si no existe, manual queue UI antes de habilitar el wizard a operadores. Si existe primaria confiable, usar como source of truth automatico.
- ¿`hs_unique_creation_key` es writable en custom object `0-162` para creates API? **Resolver en Checkpoint A (Slice 0)**. Si NO writable, crear `ef_greenhouse_service_id` como fallback minimo ANTES de Slice 4. Decision documentada en PR description.

## Delta 2026-05-08 — Hardening pre-implementation

Task endurecida antes de iniciar implementacion para alinearla con los patrones canonicos del repo (TASK-771, TASK-773, TASK-813, TASK-742). Cambios introducidos:

1. **Pre-implementation checkpoints (Slice 0 nuevo)**: 4 binary gates (A: writability `hs_unique_creation_key`, B: multi-company primary association, C: rate limits posture, D: `ef_pipeline_stage` deprecation) que deben resolverse ANTES de Plan/Discovery. Sin esto, planificar Slice 4-5 era especulativo. Pattern fuente: TASK-708/728 (NOT VALID + VALIDATE atomic — pre-validate gates).
2. **Outbound projection registrada en outbox + ops-worker (Slice 3 + Slice 4 reescritos)**: rompe el coupling inline PG ↔ HubSpot. Patron fuente: TASK-771 (finance supplier write-decoupling) + TASK-773 (outbox publisher Cloud Scheduler cutover). El route handler responde 201/200 sin tocar HubSpot; el reactive consumer en Cloud Run reintenta exponencial via bridge `hubspot-greenhouse-integration`. Resuelve: (a) HubSpot caido NO produce 5xx al cliente; (b) rate limit handling co-located; (c) dead-letter automatico; (d) observability uniforme.
3. **Webhook eco cascade (Slice 4 + Detailed Spec)**: handler inbound `hubspot-services` aplica lookup cascade por `idempotency_key` ANTES de fallback `hubspot_service_id`, eliminando race condition donde outbound + webhook crean filas duplicadas. Coordinacion con TASK-836.
4. **Failure modes + dead-letter UX (Slice 5 reestructurado)**: states canonicos (`outbound_pending | outbound_in_progress | ready | partial_associations | outbound_dead_letter`), recovery de partial associations idempotente via HubSpot `GET /associations`, dead-letter UI bajo `/admin/operations` con capability `commercial.engagement.recover_outbound` (FINANCE_ADMIN + EFEONCE_ADMIN solo). Pattern fuente: TASK-742 (auth resilience 7 layers).
5. **7 reliability signals nuevos (Slice 6 reestructurado)**: `outbound_pending_overdue`, `outbound_dead_letter`, `partial_associations`, `deal_closed_but_active`, `deal_associations_drift`, `outcome_terminal_pservices_open`, `legacy_without_deal`. Cobertura completa de drift cross-system. Subsystem rollup: `commercial`. Pattern fuente: TASK-742 + TASK-783 (reliability control plane).
6. **Manual queue UI para legacy + multi-company unresolved**: Sample Sprints legacy sin Deal y multi-company sin primary association se canalizan a manual queue UI. NUNCA inventar Deals retroactivamente. NUNCA bypass del wizard. Pattern fuente: TASK-768 (economic_category manual queue).
7. **Runbook canonico (Slice 7 expandido)**: `docs/operations/runbooks/sample-sprint-outbound-recovery.md` cubre los 5 escenarios operativos principales (overdue, dead-letter, partial, legacy, deal-closed-but-active, outcome-terminal-pservices-open).
8. **`ef_pipeline_stage` deprecation policy resuelta**: `hs_pipeline_stage` es source of truth; outbound NO actualiza la legacy property; reportes ad-hoc deben migrarse. Open Question 4 marcada RESUELTA.
9. **Capability separation resuelta naturalmente**: outbox pattern elimina necesidad de capability `project_to_crm` separada; solo se agrega `commercial.engagement.recover_outbound` granular para dead-letter UX. Open Question implicita marcada RESUELTA.
10. **Hard Rules section nueva**: 18 invariantes anti-regresion (`NUNCA`/`SIEMPRE`) que se canonizan en CLAUDE.md para que agentes/tasks futuros hereden las reglas sin re-derivarlas.
11. **2 outbox events documentados**: `commercial.sample_sprint.declared v1` (path principal) y `commercial.sample_sprint.outbound_skipped v1` (path de operador rechazando proyeccion).
12. **Acceptance Criteria + Verification + Closing Protocol + Files owned** sincronizados.

Razon: aplicar el 4-pillar contract llevo el score de la task de 6.25/10 promedio a 8.75/10 antes de implementacion. Sin estos ajustes, la implementacion abriria probabilisticamente:

- Un ISSUE post-rollout cuando HubSpot tenga el primer outage real (route handler 5xx + service local zombie)
- Un ISSUE de webhook eco creando duplicate rows
- Un ISSUE de Sample Sprints legacy sin path de recovery operativo
- Un ISSUE de rate limits cuando volumen crezca sin backoff coordinado
- Un ISSUE de dead-letter sin UX para que el operador pueda actuar
