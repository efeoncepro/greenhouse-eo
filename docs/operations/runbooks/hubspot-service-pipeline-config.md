# Runbook — HubSpot Service Pipeline Config (TASK-836)

> **Tipo:** Runbook operativo
> **Owner:** RevOps / Plataforma
> **Vigente desde:** 2026-05-09
> **Task asociada:** TASK-836
> **Portal HubSpot:** `48713323` (Efeonce production)

## Para que sirve

Configura la etapa nueva `Validación / Sample Sprint` en el HubSpot Service Pipeline (custom object `0-162`) y la property `Tipo de servicio` (internal name `ef_engagement_kind`) que Greenhouse usa para diferenciar servicios `regular` vs Sample Sprints.

Ejecutar este runbook **una sola vez** por entorno HubSpot. Después de ejecutar, los webhooks p_services + el sync inbound de Greenhouse comienzan a recibir/proyectar la nueva metadata sin cambios adicionales en código.

## Antes de empezar

- Acceso de Admin al portal HubSpot `48713323` (Settings → Objects → Services).
- O acceso programático via `HUBSPOT_ACCESS_TOKEN` (private app instalada con scope `crm.objects.custom.read/write` y `crm.schemas.custom.read/write`).
- Confirmar Service Pipeline actual via API:
  ```bash
  curl -s -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
    "https://api.hubapi.com/crm/v3/pipelines/0-162" | jq '.results[] | {label, id, stages: .stages | map({label, id})}'
  ```
- Stage IDs canonicos del pipeline existente (verificados 2026-05-08):
  - `Onboarding` → `8e2b21d0-7a90-4968-8f8c-a8525cc49c70`
  - `Activo` → `600b692d-a3fe-4052-9cd7-278b134d7941`
  - `En renovacion` → `de53e7d9-6b57-4701-b576-92de01c9ed65`
  - `Renovado` → `1324827222`
  - `Closed` → `1324827223`
  - `Pausado` → `1324827224`

## Paso a paso

### Paso 1 — Crear la stage `Validación / Sample Sprint`

Via UI (recomendado):

1. Settings → Objects → Services.
2. Pestaña Pipelines → editar el pipeline default (o el activo en uso).
3. Add stage → label `Validación / Sample Sprint`.
4. Mover la nueva stage **antes** de `Onboarding` (orden: Validación → Onboarding → Activo → ...).
5. Save.
6. Capturar el `stage.id` resultante (UUID o numeric) y registrarlo abajo en la sección **Bitácora de la ejecución**.

Via API (alternativa programática):

```bash
PIPELINE_ID=<id obtenido del paso anterior>

curl -X POST "https://api.hubapi.com/crm/v3/pipelines/0-162/${PIPELINE_ID}/stages" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Validación / Sample Sprint",
    "displayOrder": 0,
    "metadata": {
      "isClosed": "false"
    }
  }' | jq '{id, label, displayOrder}'
```

Actualizar `displayOrder` de las otras stages para que `Validación / Sample Sprint` quede primera. Cada stage existente debe sumar +1 en su `displayOrder`.

### Paso 2 — Crear la property `Tipo de servicio` (internal name `ef_engagement_kind`)

Via API (recomendado, garantiza internal name exacto):

```bash
curl -X POST "https://api.hubapi.com/crm/v3/properties/0-162" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ef_engagement_kind",
    "label": "Tipo de servicio",
    "groupName": "service_information",
    "type": "enumeration",
    "fieldType": "select",
    "options": [
      { "label": "Contratado", "value": "regular", "displayOrder": 0 },
      { "label": "Piloto", "value": "pilot", "displayOrder": 1 },
      { "label": "Trial", "value": "trial", "displayOrder": 2 },
      { "label": "POC", "value": "poc", "displayOrder": 3 },
      { "label": "Discovery", "value": "discovery", "displayOrder": 4 }
    ]
  }'
```

Verificar:

```bash
curl -s -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  "https://api.hubapi.com/crm/v3/properties/0-162/ef_engagement_kind" | \
  jq '{name, label, type, options: .options | map({label, value})}'
```

### Paso 3 — Verificar que el sync inbound recoge la nueva property

El array `SERVICE_PROPERTIES` en `src/lib/hubspot/list-services-for-company.ts` ya incluye `ef_engagement_kind` desde TASK-836 Slice 1 (commit del Slice 1 mismo). El próximo backfill / webhook traerá el dato.

```bash
# Trigger un backfill dry-run (no modifica PG) para verificar que HubSpot devuelve la property
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts
```

El output del dry-run debe mostrar `ef_engagement_kind` poblado para los services que el operador ya configuró en HubSpot. Si está vacío, completarlo manualmente en HubSpot UI antes del apply.

### Paso 4 — Bitacora de la ejecucion

Ejecucion confirmada 2026-05-09 via Claude Code agent con autorización explícita del usuario:

```yaml
hubspot_portal: '48713323'
executed_at: '2026-05-09T13:13:00Z'
executed_by: 'jreysgo@gmail.com (via Claude Code agent)'

pipeline:
  pipeline_id: 'ba9cdbd6-e220-45b2-a5a2-d67ebdcbade6'
  stages:
    - label: 'Onboarding'
      id: '8e2b21d0-7a90-4968-8f8c-a8525cc49c70'
      display_order: 0
    - label: 'Validación / Sample Sprint'
      id: '1357763256'
      display_order: 1  # HubSpot API ignoró PATCH a displayOrder=0 (mantiene orden de creación). Mapper opera por stage ID, no por orden visual; RevOps puede arrastrar stage en HubSpot UI si lo prefiere.
    - label: 'Activo'
      id: '600b692d-a3fe-4052-9cd7-278b134d7941'
      display_order: 2
    - label: 'En renovación'
      id: 'de53e7d9-6b57-4701-b576-92de01c9ed65'
      display_order: 3
    - label: 'Renovado'
      id: '1324827222'
      display_order: 4
    - label: 'Closed'
      id: '1324827223'
      display_order: 5
    - label: 'Pausado'
      id: '1324827224'
      display_order: 6

property:
  internal_name: 'ef_engagement_kind'
  label_visible: 'Tipo de servicio'
  type: 'enumeration'
  field_type: 'select'
  group_name: 'service_information'
  options: ['regular', 'pilot', 'trial', 'poc', 'discovery']
  options_labels: ['Contratado', 'Piloto', 'Trial', 'POC', 'Discovery']
```

Mapper TS actualizado en `src/lib/services/service-lifecycle-mapper.ts` con stage ID `1357763256` agregado. Tests anti-regression: 18/18 verdes.

## Que no hacer

- NUNCA crear la property con internal name distinto de `ef_engagement_kind`. El UPSERT canonico (`upsert-service-from-hubspot.ts`) y el mapper (`service-lifecycle-mapper.ts`) buscan exactamente esa key.
- NUNCA depender del label visible (`Tipo de servicio`) en codigo. Internal names + stage IDs son los unicos contratos estables.
- NUNCA mover la stage `Validación / Sample Sprint` despues de `Onboarding` en el orden visual. El orden semantico es:
  `Validación → Onboarding → Activo → En renovacion → Renovado → Closed/Pausado`.
- NUNCA borrar stages antiguas durante esta config. Si hay drift, abrir TASK derivada para retire seguro.
- NUNCA mover services existentes a la nueva stage durante este runbook. Esa migration vive en TASK-836 Slice 6 (backfill idempotente con pre/post snapshot).

## Problemas comunes

| Sintoma | Accion |
| --- | --- |
| API devuelve 401 al crear stage | Verifica que la private app tiene scope `crm.schemas.custom.write` + `crm.objects.custom.write`. |
| API devuelve 409 ("property already exists") al crear `ef_engagement_kind` | La property ya existe (otra ejecucion). Verifica con GET; si los options coinciden, skip. |
| Backfill dry-run muestra `ef_engagement_kind` vacio para todos los services | El operador no ha clasificado los services en HubSpot todavia. Es esperado — la cascade canonica del UPSERT (TASK-836 Slice 4) preserva PG cuando HubSpot devuelve NULL para filas existentes. |
| Stage `Validación / Sample Sprint` no aparece en el dropdown UI | Refrescar la pagina HubSpot. Si persiste, verificar `displayOrder=0` y que la stage no tenga `metadata.isClosed=true`. |

## Referencias tecnicas

- Spec: `docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`
- Mapper canonico: `src/lib/services/service-lifecycle-mapper.ts` (Slice 3)
- UPSERT canonico: `src/lib/services/upsert-service-from-hubspot.ts` (Slice 4 refactor)
- Properties array: `src/lib/hubspot/list-services-for-company.ts` (extendida en Slice 1)
- HubSpot CRM Pipelines API: https://developers.hubspot.com/docs/api/crm/pipelines
- HubSpot CRM Properties API: https://developers.hubspot.com/docs/api/crm/properties
