# TASK-620.7 — Catalog Lifecycle & Sunset (service_module_lifecycle states + soft-delete unified + sunset notifications)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C complemento)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-620, TASK-620.1, TASK-620.2, TASK-620.3`
- Branch: `task/TASK-620.7-catalog-lifecycle-sunset`

## Summary

Lifecycle unificado para los 4 catalogos (sellable_roles, sellable_tools, sellable_artifacts, service_modules) con states `draft / active / sunset / archived`. Soft-delete consistente (no hard-delete jamas). Sunset notifications a sales reps que tienen quotes vigentes referenciando items que pasan a sunset. Quotes historicas siguen funcionando aunque item esta archived.

## Why This Task Exists

Sin lifecycle policy:

- "Brand Foundation Package v1" se retira sin saber que retainers vigentes lo usan -> se rompe renewal cycle
- Sales rep agrega tool a quote, tool se borra del catalogo -> quote rota
- Cada modulo improvisa soft-delete diferente (`active=false`, `deleted_at`, `is_archived`) -> inconsistencia

## Goal

- Columna `lifecycle_state text` con CHECK enum en los 4 catalogos
- Transiciones permitidas: draft -> active -> sunset -> archived; nunca DELETE
- Picker (TASK-620.4) filtra por `state IN (active, sunset)` (sunset visible con badge "deprecado")
- Sunset triggers: notificar sales reps con quotes vigentes referenciando + bloquear nueva creacion en composer
- Archived items: invisibles al picker pero referencias FK historicas siguen funcionando (ON DELETE RESTRICT enforces)
- UI admin para sunset/archive con confirmacion + reason

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/research/RESEARCH-005...` Delta v1.9

Reglas:

- jamas hard-delete de un item del catalogo
- ON DELETE RESTRICT en todas las FKs hacia catalog
- transitions auditadas con who/when/why

## Dependencies & Impact

### Depends on

- TASK-620 (4 tablas de catalogo)
- TASK-619.3 (notification reactors para sunset alerts)

### Blocks / Impacts

- TASK-624 (renewal engine) — debe respetar sunset states
- Composer (TASK-620.3) — picker filter
- Quote builder (TASK-620.4)

### Files owned

- `migrations/YYYYMMDD_task-620.7-catalog-lifecycle.sql` (nuevo)
- `src/lib/commercial/catalog-lifecycle-store.ts` (nuevo)
- `src/lib/sync/reactors/sunset-notification-reactor.ts` (nuevo)
- `src/views/greenhouse/admin/catalog-lifecycle/CatalogLifecycleView.tsx` (nuevo)
- `src/app/api/commercial/catalog-items/[type]/[id]/lifecycle/route.ts` (nuevo)

## Scope

### Slice 1 — Migracion lifecycle (0.5 dia)

```sql
-- Apply to los 4 catalogos
ALTER TABLE greenhouse_commercial.sellable_roles
  ADD COLUMN lifecycle_state text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('draft', 'active', 'sunset', 'archived')),
  ADD COLUMN sunset_at timestamptz,
  ADD COLUMN sunset_by text,
  ADD COLUMN sunset_reason text,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by text;

-- Repeat para sellable_tools, sellable_artifacts, service_modules
-- Backfill: active=true -> lifecycle_state='active'; active=false -> 'archived'

CREATE INDEX idx_sellable_*_lifecycle_state
  ON greenhouse_commercial.sellable_* (lifecycle_state)
  WHERE lifecycle_state IN ('active', 'sunset');
```

Trigger validacion transitions:

```sql
CREATE FUNCTION validate_lifecycle_transition() RETURNS trigger AS $$
BEGIN
  -- Permitidas: draft->active, active->sunset, sunset->archived, sunset->active (revert)
  -- Prohibidas: archived->cualquier, draft->sunset directo
  IF OLD.lifecycle_state = 'archived' THEN
    RAISE EXCEPTION 'Cannot transition from archived state';
  END IF;
  IF OLD.lifecycle_state = 'draft' AND NEW.lifecycle_state = 'sunset' THEN
    RAISE EXCEPTION 'Cannot sunset a draft directly, must activate first';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Slice 2 — Store + API (0.5 dia)

`src/lib/commercial/catalog-lifecycle-store.ts`:

```typescript
export const transitionLifecycle = async (params: {
  itemType: 'sellable_role' | 'sellable_tool' | 'sellable_artifact' | 'service_module'
  itemId: string
  toState: 'draft' | 'active' | 'sunset' | 'archived'
  actorUserId: string
  reason?: string
}) => {
  // Pre-check: si toState='sunset', detect quotes vigentes referenciando
  const impactedQuotes = await findImpactedQuotes(params.itemType, params.itemId)

  // Update lifecycle_state + sunset_at/by/reason
  // Audit log
  // Si toState='sunset' y impactedQuotes.length > 0:
  //   emit outbox event 'commercial.catalog.sunset_with_active_quotes'
  // -> reactor notification (TASK-619.3 infra)
}

export const findImpactedQuotes = async (itemType, itemId) => {
  // Query quotes en estado != signed/expired/voided que referencian itemId
}
```

Endpoint `POST /api/commercial/catalog-items/[type]/[id]/lifecycle`:
- Body: `{ toState, reason }`
- Permission: solo Finance Admin / Efeonce Admin

### Slice 3 — Picker filter + sunset badge (0.25 dia)

Modificar TASK-620.4 picker:
- Default filter: `lifecycle_state IN ('active', 'sunset')`
- Items en sunset muestran badge "Deprecado - sera archivado el [fecha estimada + 90d]"
- Items en active sin badge
- Items archived: no aparecen

### Slice 4 — Sunset notification reactor (0.5 dia)

`sunset-notification-reactor.ts`:

- Suscrito a `commercial.catalog.sunset_with_active_quotes`
- Resuelve audiencia: sales reps owners de quotes impactadas + Account Lead del cliente
- Email + in-app notification con: nombre del item, lista de quotes impactadas, fecha sunset, accion sugerida (renovar a v2 o cerrar quote)

### Slice 5 — Admin UI lifecycle view + tests (0.25 dia)

`<CatalogLifecycleView>`:

- Tabla con todos los items per type + filter por state
- Boton "Sunset" / "Archive" / "Reactivate" con confirmation modal
- Pre-check muestra impacted quotes count antes de confirmar

## Out of Scope

- Auto-archive despues de N dias en sunset (humano decide)
- Sunset history visualization (Fase 2)
- Item versioning (v1 -> v2 promotion) — futuro

## Acceptance Criteria

- [ ] migracion aplicada con backfill correcto
- [ ] trigger validation rechaza transitions invalidas
- [ ] picker filtra correctamente
- [ ] sunset badge visible
- [ ] reactor envia notificaciones
- [ ] admin UI funcional
- [ ] tests passing
- [ ] aplicado en staging + prod

## Verification

- Sunset un service_module con 3 quotes vigentes -> verificar 3 sales reps reciben notificacion
- Picker excluye archived, incluye sunset con badge
- Quote historica con archived item: re-render funciona correcto

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con counts post-backfill
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` updated seccion "Lifecycle"
