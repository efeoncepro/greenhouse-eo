# Party Lifecycle Runbook

Runbook operativo para el carril administrativo de lifecycle comercial (`TASK-542`).

## Que cubre

- Surface Admin Center `/admin/commercial/parties`
- Snapshot serving `greenhouse_serving.party_lifecycle_snapshots`
- Conflicts `greenhouse_commercial.party_sync_conflicts`
- Sweep de inactividad en `ops-worker`

## Diagnostico rapido

1. Abrir `/admin/commercial/parties`.
2. Revisar los KPIs de conflictos pendientes, clientes activos y backlog HubSpot.
3. Filtrar por stage o sync health.
4. Entrar al detalle de la party si hay drift, transición inesperada o conflicto pendiente.

## Que mirar en el detalle

- `lifecycle_stage` y `lifecycle_stage_since`
- timeline en `organization_lifecycle_history`
- mirror HubSpot (`hubspot_company_id`, lifecycle espejo, última actividad)
- quotes activas y contratos activos
- conflictos pendientes y su tipo

## Resolver un conflicto de sync

Opciones disponibles desde el detalle:

- `Forzar outbound`
  - usar cuando Greenhouse debe imponerse sobre HubSpot
  - marca el conflicto como `resolved_greenhouse_wins`
- `Forzar inbound`
  - usar cuando HubSpot trae la señal correcta y Greenhouse quedó stale
  - marca el conflicto como `resolved_hubspot_wins`
- `Ignorar`
  - usar solo si el conflicto no requiere acción o fue absorbido por otra intervención

## Forzar una transición manual

Requiere capability `commercial.party.override_lifecycle`.

Flujo:

1. Entrar al detalle de la party.
2. Click en `Forzar transición`.
3. Elegir el stage destino.
4. Escribir una razón clara y específica.
5. Confirmar.

Reglas:

- la transición no escribe directo sobre la tabla base; pasa por `promoteParty`
- queda history con `source='operator_override'`
- si la transición es ilegal según la máquina de estados, la API la rechaza

## Sweep de inactividad

Endpoint operativo:

- `POST /party-lifecycle/sweep` en `ops-worker`

Criterio V1:

- parties en `active_client`
- sin contrato activo
- sin quote emitida reciente
- ventana de 6 meses

Uso recomendado:

- primero correr en dry-run
- revisar volumen esperado
- luego ejecutar sin dry-run si el corte es correcto

## SQL de apoyo

Snapshot actual:

```sql
select *
from greenhouse_serving.party_lifecycle_snapshots
where organization_id = '<organization_id>';
```

History:

```sql
select *
from greenhouse_core.organization_lifecycle_history
where organization_id = '<organization_id>'
order by transitioned_at desc, history_id desc;
```

Conflicts:

```sql
select *
from greenhouse_commercial.party_sync_conflicts
where organization_id = '<organization_id>'
order by detected_at desc, conflict_id desc;
```

## Escalacion

- Si el conflicto reaparece después de `force_outbound`, revisar `TASK-540` y el carril anti-ping-pong.
- Si una transición manual falla por permisos, validar entitlement `commercial.party.override_lifecycle`.
- Si el sweep mueve demasiadas parties, detener el cron y revisar la ventana de quotes/contratos antes de repetir.
