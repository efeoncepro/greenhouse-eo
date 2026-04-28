# TASK-715 — Reconciliation Test Period Archive UX

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-715-reconciliation-test-period-archive-ux`
- Legacy ID: `TASK-714b follow-up suggested by Claude handoff`
- GitHub Issue: `[optional]`

## Summary

Agregar una accion explicita "Archivar como prueba" en `/finance/reconciliation` para periodos experimentales o de prueba. El operador no debe tener que presionar "Conciliar" para sacar de la cola un periodo que nunca fue evidencia bancaria real.

La solucion debe preservar audit y hacer que los periodos archivados queden ocultos por defecto, consultables cuando se pida historial o `includeArchived`.

## Why This Task Exists

El incidente de conciliacion expuso un root cause UX: cuando un periodo experimental queda abierto, la UI empuja al usuario a "Conciliar" para descartarlo. Eso mezcla dos estados semanticos opuestos: cerrar un periodo real vs archivar una prueba.

Forzar esa ruta aumenta el riesgo de que filas de test aparezcan como evidencia real en saldos, ledger-health o posteriores remediaciones.

## Goal

- Dar una accion segura y auditable para archivar periodos de conciliacion de prueba.
- Separar estado "reconciled/closed" de "archived/test evidence".
- Ocultar periodos archivados de la cola operativa por defecto.
- Mantener disponible el historial para auditoria y debugging.

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
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La surface visible sigue siendo `/finance/reconciliation`; no crear nueva ruta ni menu.
- Access model: reutilizar la view/surface existente `finance.reconciliation`. Si se agrega capability fina, debe documentarse explicitamente; expectativa inicial: usar la capability write/match existente.
- Archivar no equivale a conciliar. No debe emitir el mismo significado contable que `finance.reconciliation_period.reconciled`.
- No borrar periodos ni filas; debe quedar audit trail.
- La UI debe confirmar impacto antes de archivar y explicar que se trata de prueba.

## Normative Docs

- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/tasks/complete/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover.md`
- `docs/tasks/complete/TASK-708b-nubox-phantom-cohort-remediation.md`
- `docs/tasks/to-do/TASK-714-banco-instrument-detail-semantic-drawer.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/app/api/finance/reconciliation/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `greenhouse_finance.reconciliation_periods`
- `greenhouse_finance.bank_statement_rows`
- `src/lib/sync/event-catalog.ts`

### Blocks / Impacts

- Operacion diaria de `/finance/reconciliation`.
- Ledger-health y futuras remediaciones que dependen de distinguir prueba vs evidencia real.
- `TASK-708d` si necesita excluir periodos archivados como prueba de las evidencias validas.

### Files owned

- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/sync/event-catalog.ts`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `changelog.md`

## Current Repo State

### Already exists

- `/finance/reconciliation` lista periodos y permite operar contra bank statement rows.
- `/finance/reconciliation/[id]` permite revisar, matchear, excluir, auto-match y reconciliar.
- `postgres-reconciliation.ts` es el store primario; `reconciliation.ts` legacy BigQuery esta deprecado.
- `event-catalog.ts` ya declara eventos de periodo reconciliado y cerrado.

### Gap

- No existe una accion de descarte/archivo para periodos experimentales.
- El usuario puede verse forzado a usar "Conciliar" para sacar una prueba de la cola.
- No hay contrato visible para ocultar archivados por defecto y mantenerlos auditables.

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

### Slice 1 — Schema and domain contract

- Discovery debe confirmar si conviene:
  - columnas aditivas (`archived_at`, `archived_by`, `archive_reason`, `archive_kind`), o
  - extension controlada de status.
- Preferencia inicial: columnas aditivas para no mezclar `archived/test` con estados contables de cierre.
- Agregar constraints/indexes para filtrar archivados sin romper queries existentes.

### Slice 2 — Store and API command

- Agregar command server-side `archiveReconciliationPeriodAsTest(periodId, reason, actor)` o equivalente.
- Validar que el periodo exista y no este cerrado/reconciliado de forma real.
- Emitir evento/audit distinguible, por ejemplo `finance.reconciliation_period.archived_as_test`.
- Actualizar list/detail para excluir archivados por defecto y aceptar `includeArchived=true` si el contrato actual lo permite.

### Slice 3 — UI action

- En detail y/o list, agregar accion secundaria "Archivar como prueba".
- Usar confirm dialog con copy claro:
  - no conciliara el periodo;
  - lo ocultara de la cola operativa;
  - quedara en historial/auditoria.
- Deshabilitar o esconder la accion cuando el periodo ya esta reconciliado/cerrado.

### Slice 4 — Ledger/evidence exclusions

- Asegurar que periodos archivados como prueba no cuenten como evidencia bancaria valida en readers de ledger-health, detectores o snapshots donde aplique.
- Si algun reader no toca periodos archivados, documentar que no requiere cambio.

### Slice 5 — Tests and docs

- Tests del store/API para archivo idempotente, restricciones de estado y filtro default.
- Tests UI focalizados si existe suite local para reconciliation.
- Actualizar `docs/documentation/finance/conciliacion-bancaria.md`.

## Out of Scope

- Redisenar toda la conciliacion bancaria.
- Crear una nueva surface admin.
- Reconciliar o remediar periodos historicos automaticamente.
- Borrar `bank_statement_rows`.
- Cambiar `TASK-714` drawer de Banco.
- Resolver Cohorte D (`TASK-708d`) salvo excluir archivados si el detector ya existe.

## Detailed Spec

Contrato objetivo:

```ts
type ArchiveReconciliationPeriodAsTestInput = {
  periodId: string
  reason: string
  actorUserId: string
}

type ReconciliationPeriodArchiveState = {
  archivedAt: string | null
  archivedBy: string | null
  archiveReason: string | null
  archiveKind: 'test_period' | null
}
```

El agente debe adaptar nombres al schema real durante Discovery, pero debe preservar la semantica: archivo auditado, no conciliacion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un operador puede archivar un periodo como prueba sin marcarlo como conciliado.
- [ ] Los periodos archivados quedan ocultos por defecto en `/finance/reconciliation`.
- [ ] Existe forma auditable de ver/consultar el periodo archivado.
- [ ] La accion queda bloqueada para periodos ya reconciliados/cerrados reales.
- [ ] El evento/audit diferencia `archived_as_test` de `reconciled` / `closed`.
- [ ] Tests cubren command, filtros e idempotencia.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/finance`
- Validacion manual en `/finance/reconciliation` y `/finance/reconciliation/[id]`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-708d` fue revisada si su detector considera periodos archivados como prueba

## Follow-ups

- Filtro visual "Archivados" en la lista si el primer slice solo agrega `includeArchived` tecnico.

## Open Questions

- Confirmar en Discovery si el estado actual de `reconciliation_periods.status` permite extension segura o si conviene mantener archivo como columnas aditivas.
