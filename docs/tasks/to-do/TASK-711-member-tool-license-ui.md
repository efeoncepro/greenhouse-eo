# TASK-711 — Member ↔ Tool License Assignment UI

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Domain | AI Tooling / Identity / People |
| Sequence | Después de TASK-710 (bridge canónico debe existir) |

## Summary

Surface UI para que el admin de tooling (o People Ops) asigne y revoque licencias de tools a members con UX clara, audit trail, y feedback inmediato sobre el costo proyectado al cliente.

Hoy `tool_assignments` se mantiene vía SQL ad-hoc o backfill scripts. No existe UI productiva para administrar el ciclo de vida (asignar, revocar, cambiar tier, transferir entre members).

## Why This Task Exists

El programa Member Loaded Cost Model (`docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`) requiere que `tool_assignments` sea **autoritativa y mantenida en runtime** para que los materializers de Fact 2 (`tool_consumption_period`) sean precisos.

Sin UI, hay 3 fricciones operativas:

1. **Provisioning lag**: una nueva contratación que necesita Adobe CC + Notion + Asana queda fuera del modelo hasta que alguien corre un backfill SQL.
2. **Sin visibility de impacto**: el admin que asigna una tool no ve qué cliente termina absorbiendo el costo (vía FTE allocation), ni cuánto ese cliente está pagando ya por tooling.
3. **Sin audit**: revocaciones quedan sin trazabilidad de quién/cuándo/por qué.

## Scope

### In scope

- Page `/admin/tooling/assignments` con tabla member × tool (matrix view)
- Form asignación: select member, select tool, fecha inicio, tier, notes
- Cost preview live: al asignar, mostrar "Este member tiene X% FTE en cliente Y → Y absorbe ~$Z/mes adicional"
- Revoke flow con confirmation modal y motivo opcional
- Audit log persistido en `tool_assignment_audit` (migración nueva): `(action, member_id, tool_id, actor_user_id, occurred_at, motivo)`
- Filtros: por tool, por member, por team, por status (active/expired)
- Bulk operations: asignar misma tool a varios members en batch
- Reactive: al guardar, dispara outbox event que repercute en próxima materialización del Fact 2

### Out of scope

- Provisioning real en proveedor externo (creación de cuenta Adobe / Notion via API) — futuro TASK
- Reconciliación con seat counts del proveedor (Adobe API, Notion Workspace API) — futuro TASK
- Renewal/expiración automática — futuro TASK

## Architecture Reference

Spec raíz: `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` §2.2 (Fact 2 dimensiones)

Spec UI: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (componentes, MUI 7.x patterns)

Identity model: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (RBAC `tooling.admin` capability)

## Dependencies & Impact

### Depende de

- TASK-710 (Tool Consumption Bridge) — la UI lee de `tool_consumption_period` para mostrar costo proyectado

### Impacta a

- Reliability signal `tool_consumption.coverage` — sube cuando admins mantienen activos los assignments
- Reduces operational toil: backfills manuales pasan a flow autoservicio

### Archivos owned

- `src/app/(dashboard)/admin/tooling/assignments/page.tsx`
- `src/views/greenhouse/admin/tooling/assignments/*`
- `src/app/api/admin/tooling/assignments/route.ts`
- `migrations/<ts>_task-711-tool-assignment-audit.sql`

## Acceptance Criteria

- Admin con capability `tooling.admin` puede asignar/revocar tools sin SQL
- Cada acción produce row en `tool_assignment_audit` con actor user
- Preview de costo proyectado refleja cálculo usando MLCM Fact 4 actual
- Bulk assign de N members en una operación
- Tests E2E (Playwright) flujo asignar + revocar + audit visible
- 0 SQL manual requerido para hot-path de tooling onboarding

## Notes

Esta task convierte tool ops de "infra invisible" a workflow productivo. Es una de las palancas más concretas de productividad operativa post-MLCM.
