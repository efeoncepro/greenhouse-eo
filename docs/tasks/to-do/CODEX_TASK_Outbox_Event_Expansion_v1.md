# CODEX_TASK_Outbox_Event_Expansion_v1

## Summary

Expandir el patrón de outbox events a los módulos que aún no publican cambios (Account 360, HR Core, Identity), y construir el primer event consumer reactivo que actualice vistas serving cuando cambian datos upstream. Esto transforma el outbox de un mecanismo de auditoría (BigQuery log) en una infraestructura de consistencia eventual real.

## Why This Task Exists

El outbox ya funciona, pero de forma incompleta:

**Módulos que publican eventos hoy:**
- Finance (income, expenses) ✓
- Finance Slice 2 (accounts, suppliers, rates) ✓
- Nubox (emission, sync) ✓
- HR Leave (leave requests, balances) ✓
- Payroll (entries, periods) ✓
- AI Tools (credits, wallet) ✓

**Módulos que NO publican eventos:**
- Account 360 (organizations, spaces, memberships) ✗
- HR Core (members, departments, promotions) ✗
- Identity (reconciliation proposals, profile links) ✗
- Services (service CRUD, history) ✗

**El consumer actual es unidireccional:** `publishPendingOutboxEvents()` solo lee de Postgres y escribe a BigQuery como log. No hay consumers que reaccionen a eventos para actualizar vistas serving o disparar workflows.

Esto significa que cuando se crea una nueva organización, se asigna un miembro a un cliente, o se aprueba una reconciliación de identidad, ningún otro módulo se entera automáticamente. Las vistas 360 solo se actualizan cuando alguien las consulta (y si tienen cache, pueden estar stale).

## Goal

1. **Estandarizar el patrón de publicación** con un helper reutilizable
2. **Agregar publicación de eventos** en Account 360, HR Core, Identity, y Services
3. **Construir el primer consumer reactivo:** cuando cambia una asignación FTE o un membership, recalcular `client_labor_cost_allocation` y/o invalidar cache de `organization_economics`
4. **Documentar el catálogo de eventos** como referencia para futuros consumers

## Dependencies & Impact

### Depends on
- `src/lib/sync/outbox-consumer.ts` — consumer actual
- `src/app/api/cron/outbox-publish/route.ts` — cron de publicación
- `greenhouse_sync.outbox_events` — tabla de eventos
- Patrón existente en `src/lib/finance/postgres-store.ts` (línea 149) — ejemplo de publicación

### Impacts to
- `CODEX_TASK_Webhook_Infrastructure_MVP_v1.md` — outbox expandido es el input natural para outbound webhooks; esta task le da más eventos para dispatch
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — economics puede invalidarse reactivamente cuando cambia una asignación o se aprueba nómina
- `CODEX_TASK_Notification_System.md` — eventos de identity reconciliation o membership change son candidatos naturales para notificaciones
- `CODEX_TASK_ICO_Person_360_Integration_v1.md` — evento de cambio en member puede trigger re-materialización de ICO per-person
- `Greenhouse_Data_Node_Architecture_v2.md` — catálogo de eventos es la base del Data Node event stream

### Files owned
- `src/lib/sync/publish-event.ts` (helper reutilizable)
- `src/lib/sync/event-catalog.ts` (type registry de todos los eventos)
- `src/lib/sync/reactive-consumer.ts` (consumer que reacciona a eventos)
- `src/app/api/cron/outbox-react/route.ts` (cron para consumer reactivo)
- Modificaciones: `src/lib/account-360/organization-store.ts` (agregar publicación)
- Modificaciones: `src/lib/people/postgres-store.ts` (agregar publicación)
- Modificaciones: `src/lib/identity/reconciliation-store.ts` (agregar publicación)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Ya existe
- **Outbox table:** `greenhouse_sync.outbox_events` con columnas: event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at, status, published_at, publish_run_id.
- **Consumer:** `publishPendingOutboxEvents()` en `src/lib/sync/outbox-consumer.ts` (líneas 104-245). Lee pending events, publica a BigQuery `greenhouse_raw.postgres_outbox_events`.
- **Cron:** `/api/cron/outbox-publish` ejecuta cada 5 minutos.
- **Publicadores existentes:** Finance, Finance Slice 2, Nubox, HR Leave, Payroll, AI Tools — todos usan INSERT directo en `greenhouse_sync.outbox_events`.
- **Patrón de publicación** (ejemplo de finance):
  ```sql
  INSERT INTO greenhouse_sync.outbox_events (aggregate_type, aggregate_id, event_type, payload_json)
  VALUES ($1, $2, $3, $4)
  ```

### No existe aún
- Helper reutilizable para publicar eventos (cada módulo hace INSERT manual)
- Publicación de eventos en Account 360, HR Core, Identity, Services
- Consumer reactivo que reaccione a eventos para actualizar datos downstream
- Catálogo documentado de tipos de eventos
- Cron para consumer reactivo

## Implementation Plan

### Slice 1 — Estandarización y Helper

1. **Crear `src/lib/sync/publish-event.ts`:**
   ```typescript
   export async function publishOutboxEvent(
     pool: Pool,
     event: {
       aggregateType: string;   // 'organization' | 'member' | 'identity_profile' | ...
       aggregateId: string;
       eventType: string;       // 'organization.created' | 'membership.changed' | ...
       payload: Record<string, unknown>;
     }
   ): Promise<string>  // returns event_id
   ```

2. **Crear `src/lib/sync/event-catalog.ts`:**
   - Type union de todos los eventos conocidos
   - Constantes para aggregate types y event types
   - Documentación inline de cada evento

3. **Migrar publicadores existentes** al helper (refactor no-breaking).

### Slice 2 — Nuevos Publicadores

Agregar publicación de eventos en:

1. **Account 360** (`organization-store.ts`):
   - `organization.created`, `organization.updated`, `organization.archived`
   - `space.created`, `space.updated`, `space.archived`
   - `membership.created`, `membership.updated`, `membership.removed`

2. **HR Core / People** (`postgres-store.ts` o equivalente):
   - `member.created`, `member.updated`, `member.deactivated`
   - `assignment.created`, `assignment.updated`, `assignment.removed`
   - `department.created`, `department.updated`

3. **Identity** (`reconciliation-store.ts`):
   - `identity.reconciliation.proposed`, `identity.reconciliation.approved`, `identity.reconciliation.rejected`
   - `identity.profile.linked`, `identity.profile.merged`

4. **Services** (store correspondiente):
   - `service.created`, `service.updated`, `service.archived`

### Slice 3 — Consumer Reactivo

1. **Crear `src/lib/sync/reactive-consumer.ts`:**
   - Leer eventos pendientes de tipo `assignment.updated`, `membership.changed`, `payroll.approved`
   - Para cada evento, ejecutar la acción correspondiente:
     - `assignment.updated` → recalcular `client_labor_cost_allocation` para el miembro afectado
     - `membership.changed` → invalidar cache de `organization_360`
     - `payroll.approved` → recalcular cost allocation del período

2. **Crear cron `/api/cron/outbox-react`** (cada 5 min, después de outbox-publish).

3. **Event routing table** con registro de handlers por event_type.

### Slice 4 — Documentación

1. **Crear `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`** con tabla completa de:
   - Aggregate type, Event type, Publisher module, Payload schema, Known consumers

## Acceptance Criteria

- [ ] Helper `publishOutboxEvent` usado por al menos 4 módulos
- [ ] Account 360, HR Core, e Identity publican eventos de cambios
- [ ] Al menos un consumer reactivo funciona end-to-end (ej: assignment change → recalculate allocation)
- [ ] Event catalog documentado con todos los eventos activos
- [ ] No breaking changes en el consumer existente (BigQuery publish sigue funcionando)
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 4 tests unitarios (helper + consumer)
