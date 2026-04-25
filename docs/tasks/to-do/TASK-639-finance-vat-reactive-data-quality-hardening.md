# TASK-639 — Finance VAT Reactive Lane & Data Quality Semantics Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-639-finance-vat-reactive-data-quality-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer dos carriles que hoy están degradando Finance y Cloud Platform por causas reales de dominio: el materializer reactivo `vat_monthly_position` que cae en dead-letter con error SQL, y la semántica de `Finance Data Quality` que hoy mezcla shared overhead con orphan records reales, inflando warnings operativos y escondiendo la causa raíz.

## Why This Task Exists

El Admin Center está mostrando síntomas válidos, pero detrás hay dos problemas distintos:

1. El carril reactivo de VAT ledger falla en staging con `could not determine data type of parameter $6`, dejando `projection_refresh_queue` y `outbox_reactive_log` degradados para `vat_monthly_position`.
2. El check `orphan_expenses` trata como falla a gastos `supplier` operacionales compartidos (`cost_is_direct=false`, sin `client_id`), aunque la arquitectura financiera ya admite `unallocated overhead` como estado válido. Eso infla `Finance Data Quality` y mezcla policy incorrecta con drift real (ledger divergence, overdue receivables).

Sin corregir ambos contratos, el portal sigue generando ruido operativo, los replays reactivos no cierran y el equipo no puede distinguir entre un bug de materialización y una regla de calidad mal calibrada.

## Goal

- Reparar el lane reactivo `vat_monthly_position` con una solución durable, tipada y cubierta por tests.
- Rehacer la semántica de data quality para separar `direct cost without client` de `shared overhead intentionally unallocated`.
- Dejar replays/observabilidad suficientes para validar que staging vuelve a estado sano sin depender de maquillaje en UI.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PIPELINE_SCALABILITY_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- No resolver el problema maquillando `Reliability`; la fuente de verdad se corrige en `finance` y/o `reactive pipeline`.
- `shared overhead` y `direct cost` no pueden seguir mezclados bajo el mismo check de orphaning.
- El fix del VAT ledger debe quedar idempotente, testeado y seguro para replay en `ops-worker`.

## Normative Docs

- `docs/documentation/plataforma/reliability-control-plane.md`
- `docs/documentation/operations/ops-worker-reactive-crons.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/vat-ledger.ts`
- `src/lib/sync/projections/vat-monthly-position.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/finance/data-quality/route.ts`
- `services/ops-worker/server.ts`

### Blocks / Impacts

- `Admin Center` reliability cards (`/admin`)
- `Ops Health` (`/admin/ops-health`)
- carril reactivo `projection_refresh_queue` / `outbox_reactive_log`
- lane manual/replay del VAT ledger en `ops-worker`

### Files owned

- `src/lib/finance/vat-ledger.ts`
- `src/lib/sync/projections/vat-monthly-position.ts`
- `src/app/api/finance/data-quality/route.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/lib/reliability/signals.ts`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/reliability-control-plane.md`

## Current Repo State

### Already exists

- VAT ledger mensual canónico y projection reactiva `vat_monthly_position`.
- `GET /api/finance/data-quality` con checks de ledger, overdue, orphan expenses y otros guardrails.
- `getOperationsOverview()` ya expone `Proyecciones`, `Reactive backlog`, `failedHandlers` y `Finance Data Quality`.
- `ops-worker` ya tiene lane manual para materialización VAT.

### Gap

- El SQL/materializer de VAT ledger no está endurecido frente al caso real de staging y deja dead-letters.
- `orphan_expenses` no respeta la semántica arquitectónica de overhead no asignado.
- El overview operativo sigue mezclando conteos de policy y drift real sin slices más precisos para decisión humana.

## Scope

### Slice 1 — VAT reactive lane hardening

- Identificar y corregir la causa raíz del error SQL en `vat_monthly_position`.
- Agregar tests de regresión sobre el materializer/projection para evitar reintroducir el mismo fallo.
- Validar replay seguro del período afectado (`2026-04`) sin romper idempotencia.

### Slice 2 — Finance data quality semantic split

- Reemplazar `orphan_expenses` por checks semánticamente correctos:
  - direct cost without client/allocation
  - shared overhead intentionally unallocated
- Mantener visibles los problemas reales: overdue receivables, ledger divergence, etc.
- Ajustar summary/details del overview para que reflejen policy correcta y no ruido inflado.

### Slice 3 — Ops validation & documentation

- Verificar staging/dev contra los readers reales (`finance/data-quality`, `agency/operations`, reliability).
- Documentar el contrato nuevo en arquitectura/documentación funcional.
- Dejar playbook corto de replay/validación si vuelve a aparecer drift reactivo o DQ.

## Out of Scope

- Rediseñar la UI completa de Reliability u Ops Health.
- Reabrir el programa completo del Reliability Control Plane.
- Corregir todos los dead-letters históricos no relacionados con VAT/data-quality semantics.
- Cambiar ownership general de `shared overhead` o `allocated_client_id` fuera del contrato de esta task.

## Detailed Spec

Puntos a cubrir en Discovery/implementación:

- Auditar el uso de parámetros en `materializeVatLedgerForPeriod()` y dejar casts explícitos donde el SQL builder actual permita ambigüedad de tipo.
- Confirmar si el replay debe ocurrir vía lane manual en `ops-worker`, vía endpoint interno, o ambos.
- Cambiar `orphan_expenses` para que no cuente rows con patrón de overhead compartido válido (`expense_type='supplier'`, `cost_is_direct=false`, sin `client_id`).
- Si hace falta, introducir un check nuevo tipo `shared_overhead_unallocated` como `ok`/`warning` informativo separado del drift real.
- Evitar que `getOperationsOverview()` agregue en un solo número categorías con semánticas incompatibles.

## Acceptance Criteria

- [ ] `vat_monthly_position` deja de fallar por el error SQL observado en staging y queda cubierto por test de regresión.
- [ ] `Finance Data Quality` deja de contar shared overhead válido como `orphan_expense`.
- [ ] Los problemas financieros reales siguen visibles por separado (por ejemplo overdue receivables o ledger divergence).
- [ ] Existe una validación reproducible de replay/materialización para el período afectado.
- [ ] La documentación técnica/funcional queda alineada con la nueva semántica.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm staging:request /api/finance/data-quality --pretty`
- `pnpm staging:request /api/agency/operations --pretty`
- validación manual de `/admin` y/o `/admin/ops-health` en staging

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se documentó el procedimiento de replay/materialización del período VAT afectado

## Follow-ups

- Limpiar o cerrar dead-letters históricos de `product_hubspot_outbound` si siguen siendo relevantes operativamente.
- Evaluar si `OperationsSubsystem` necesita un contrato más rico que `processed/failed` para evitar ambigüedad futura en otros módulos.

## Open Questions

- ¿El replay canónico del período VAT afectado debe vivir como comando explícito admin-safe en `ops-worker`, o basta con reusar el lane manual ya existente?
- ¿`shared overhead unallocated` debe quedar como check visible de tipo `ok/info`, o salir completamente del resumen de fallas?
