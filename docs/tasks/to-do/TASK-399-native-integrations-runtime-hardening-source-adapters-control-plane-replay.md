# TASK-399 — Native Integrations Runtime Hardening: Source Adapters, Control Plane & Replay Governance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `platform`, `data`, `ops`
- Blocked by: `none`
- Branch: `task/TASK-399-integrations-runtime-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar y ejecutar el hardening runtime de las integraciones source-led de Greenhouse: adapters resilientes, sync planning con cursores y leases, storage seguro raw/conformed, status por etapa, replay/backfill gobernado y runbooks operativos. Esta task toma el patrón validado en Nubox y lo convierte en contrato reusable para Notion, HubSpot y futuros upstreams.

## Why This Task Exists

Greenhouse ya tenía governance e inventory razonables para integraciones, pero el incidente real de Nubox mostró un hueco distinto: el runtime profundo de los source syncs seguía siendo heterogéneo. Había conectores con paginación frágil, freshness inferida con `NOW()`, writers destructivos sobre BigQuery caliente y replay demasiado artesanal.

Sin una lane explícita de runtime hardening:

- cada upstream vuelve a inventar su adapter contract
- los backfills largos siguen siendo operaciones delicadas
- `success` puede esconder fallas parciales entre raw, conformed y product projection
- las surfaces admin muestran health general, pero no control real de stage lag, replay y runbooks

## Goal

- Institucionalizar el `Integration Runtime Pattern` para source-led connectors
- Aterrizar control plane, replay y observabilidad por etapa como capability reusable
- Dejar Nubox como primera implementación endurecida y convertir ese patrón en baseline para otros upstreams

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- toda integración source-led crítica debe separar `adapter`, `sync planner`, `raw`, `conformed`, `projection` y `status`
- `raw` debe ser la señal primaria de frescura; las proyecciones downstream no pueden maquillar sync con timestamps artificiales
- las capas conformed sobre BigQuery no deben depender de deletes destructivos sobre tablas calientes
- el replay/backfill debe existir como operación explícita, no como cirugía ad hoc

## Normative Docs

- `docs/tasks/in-progress/TASK-188-native-integrations-layer-platform-governance.md`
- `docs/tasks/to-do/TASK-258-migrate-sync-conformed-to-ops-worker.md`
- `docs/tasks/to-do/TASK-260-migrate-nubox-sync-ico-member-sync-to-ops-worker.md`
- `docs/issues/resolved/ISSUE-002-nubox-sync-conformed-data-integrity.md`

## Dependencies & Impact

### Depends on

- `TASK-188`
- `TASK-254`
- `TASK-260`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.source_sync_watermarks`

### Blocks / Impacts

- robustez enterprise de `Nubox`, `Notion`, `HubSpot` inbound y futuros source syncs
- surfaces de `/admin/integrations`, `/admin/ops-health` y endpoints de readiness
- futuras migraciones de source syncs a `ops-worker`

### Files owned

- `docs/tasks/to-do/TASK-399-native-integrations-runtime-hardening-source-adapters-control-plane-replay.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `src/lib/integrations/**`
- `src/lib/nubox/**`
- `src/lib/sync/**`
- `services/ops-worker/**`
- `Handoff.md`

## Current Repo State

### Already exists

- integration registry, readiness y control plane inicial en `TASK-188`
- run tracking institucional en `greenhouse_sync.source_sync_runs`
- migración parcial de crons durables a `ops-worker`
- primer caso endurecido real en `Nubox`:
  - sync planning con hot window + historical sweep
  - conformed append-only snapshots
  - latest-snapshot readers
  - status por etapa

### Gap

- no existe todavía una contract library explícita para adapters source-led
- locks/leases, error taxonomy, replay y stage freshness no están institucionalizados transversalmente
- otros conectores siguen pudiendo operar con patrones legacy o parciales
- no hay runbooks y criterios de promotion comunes para declarar una integración como enterprise-grade

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Adapter Runtime Contract

- Definir contrato reusable para source adapters:
  - auth preflight
  - retries con backoff
  - timeout budgets
  - paginación defensiva
  - taxonomía de errores (`auth`, `rate_limit`, `transient`, `schema_drift`, `fatal`)
- Dejar helpers/shared types donde convenga en `src/lib/integrations/**`

### Slice 2 — Control Plane, Cursors & Partial Success

- Formalizar cursores/watermarks, hot window, historical sweep y replay manual por rango
- Introducir `lease`/locking cuando el sync pueda solaparse
- Estandarizar estado por etapa y `partial success`
- Endurecer `sync-status` / readiness para que expongan stage freshness y no solo último run agregado

### Slice 3 — Snapshot-Safe Storage & Product Freshness

- Formalizar la regla `raw append-only -> conformed snapshots -> latest-snapshot readers -> product projection`
- Barrer writers destructivos o freshness artificial en source syncs críticos
- Definir criterios para cuándo un conector puede usar merge/upsert directo y cuándo debe operar por snapshots

### Slice 4 — Replay Governance, Ops Worker & Runbooks

- Aterrizar runbooks de replay/backfill, auth smoke post-rotation y recovery por etapa
- Encajar source syncs largos con `ops-worker` cuando aplique
- Definir checklist de promotion a `enterprise-grade integration`

## Out of Scope

- Reescribir todos los conectores de una vez
- Reemplazar repos upstream hermanos que ya son owners de extracción externa
- Construir un ESB o plataforma de integración genérica separada del portal

## Detailed Spec

La salida esperada incluye:

- patrón runtime reusable documentado y aterrizado en código shared cuando aplique
- matriz de stage status y frescura por integración
- política de snapshot-safe conformed
- política de replay/backfill y lock/lease
- baseline de runbooks y criterios de promotion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe contrato explícito de runtime hardening para integraciones source-led
- [ ] El control plane distingue claramente `raw`, `conformed` y `projection`
- [ ] Replay/backfill y frescura por etapa quedan documentados y operables
- [ ] Nubox queda tratado como primera implementación endurecida y reusable
- [ ] Existe secuencia clara para adoptar el patrón en otros upstreams críticos

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- revisión manual de arquitectura + trazabilidad en `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado
- [ ] `Handoff.md` quedó actualizado si hubo cambios o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió el contrato operativo
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-188`, `TASK-258`, `TASK-260` y conectores activos

## Follow-ups

- adopción explícita del patrón en `Notion`
- adopción explícita del patrón en `HubSpot` inbound syncs que aún no converjan
- posible task específica de `integration runbooks & alerting` si el volumen operacional lo exige
