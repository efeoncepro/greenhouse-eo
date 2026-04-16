# TASK-409 — Payroll Reliquidación Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-409-payroll-reliquidation-program`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Programa coordinado para habilitar la reliquidación de nóminas cerradas (estado `exported`) sin duplicar asientos en Finance. Introduce un nuevo estado `reopened`, versionado inmutable de `payroll_entries`, eventos outbox con delta neto, consumer de Finance idempotente y UI de reopen con preview del delta, motivo obligatorio y auditoría. Cubre el V1 acordado — deja explícitamente fuera rectificatoria Previred automática y notas de crédito Nubox.

## Why This Task Exists

Hoy el único camino para corregir una nómina `exported` es un ajuste manual fuera del portal o un nuevo asiento en Finance sin trazabilidad a la entry original. El state machine actual bloquea cualquier transición desde `exported` ([src/lib/payroll/period-lifecycle.ts:3-5](../../../src/lib/payroll/period-lifecycle.ts#L3-L5)) y no existe modelo de versionado para `payroll_entries`. Esto impide:

- Emitir una liquidación/recibo actualizado cuando se detecta un error de cálculo post-cierre
- Aplicar bonos retroactivos o correcciones contractuales sin inflar el journal de Finance
- Mantener trazabilidad histórica de qué cambió, quién lo autorizó y por qué
- Reflejar en `commercial_cost_attribution` y `client_economics` el costo real corregido

La falta de esta capacidad obliga a operar fuera del sistema, rompe el contrato del outbox y crea riesgo de doble-conteo en P&L si el operador no sabe que el asiento original ya existe.

## Goal

- Permitir reabrir una nómina `exported` bajo autorización, motivo y audit log inmutable
- Garantizar que Finance reciba **solo el delta** (diferencia entre versión nueva y original), nunca el monto completo duplicado
- Preservar la entry original como registro inmutable; la reliquidación crea una nueva versión enlazada
- Regenerar recibo/liquidación PDF desde la última versión activa, con indicador visual de "v2 reliquidada"
- Ventana V1 restringida al mes operativo vigente; meses anteriores bloqueados
- Bloquear reopen si Previred ya fue declarado (mensaje claro al operador)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) — contrato canónico de Payroll; el estado `exported` hoy es terminal (líneas 757-758)
- [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) — outbox, dual-store, allocations
- [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) — catálogo canónico de eventos outbox
- [docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](../../architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md) — idempotencia, replay-safety
- [docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md) — autorización por rol para acciones sensibles
- [docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md](../../architecture/GREENHOUSE_DATABASE_TOOLING_V1.md) — migraciones, Kysely, conexión centralizada

Reglas obligatorias:

- Toda modificación de `payroll_entries` se hace vía versionado, nunca destructivo
- El evento outbox `payroll_entry.reliquidated` debe llevar `{entry_id, version, previous_version, delta_amount}` — el consumer de Finance jamás recibe el monto total
- Idempotency key del evento = `hash(entry_id, version, 'reliquidated')`
- Reopen requiere rol `efeonce_admin`; no puede ser ejecutado por `hr_manager` regular
- Transacción atómica: reopen + creación de nueva versión + emisión del evento outbox ocurren en una sola TX; si cualquiera falla, rollback completo
- Ventana temporal V1 = mes operativo vigente según [src/lib/calendar/operational-calendar.ts](../../../src/lib/calendar/operational-calendar.ts) — no hardcodear fechas
- Bloquear reopen si el período tiene un export en curso (lock pesimista sobre `payroll_periods`)

## Normative Docs

- [CLAUDE.md](../../../CLAUDE.md) — sección "Payroll Operational Calendar" y "Canonical 360 Object Model"
- [Handoff.md](../../../Handoff.md) — contexto vigente del módulo HR/Payroll

## Dependencies & Impact

### Depends on

- Foundation actual de Payroll: `greenhouse_payroll.payroll_periods`, `greenhouse_payroll.payroll_entries` (verificar schema real durante Discovery)
- Event catalog: [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts) líneas 219-224 (eventos existentes de payroll)
- Calendario operativo: [src/lib/calendar/operational-calendar.ts](../../../src/lib/calendar/operational-calendar.ts)
- State machine: [src/lib/payroll/period-lifecycle.ts](../../../src/lib/payroll/period-lifecycle.ts)

### Blocks / Impacts

- TASK-392/TASK-393 (Management Accounting foundation / period governance) — la reliquidación genera asientos de ajuste que el closing engine debe reconocer como parte del mes original, no del mes de reopen
- TASK-401 (Bank Reconciliation) — si el delta implica pago adicional, debe propagarse al matching
- [commercial_cost_attribution](../../../src/lib/sync/projections/commercial-cost-attribution.ts) — requiere recompute tras reliquidación
- [client_economics](../../../src/lib/sync/projections/client-economics.ts) — costos imputados cambian

### Files owned

Esta task es umbrella — no tiene archivos propios. Las tasks hijas (TASK-410, TASK-411, TASK-412) declaran sus files owned individualmente.

## Current Repo State

### Already exists

- State machine terminal en `exported`: [src/lib/payroll/period-lifecycle.ts:3-5](../../../src/lib/payroll/period-lifecycle.ts#L3-L5)
- Helper interno `shouldReopenApprovedPayrollPeriod` (solo `approved → calculated`): [src/lib/payroll/period-lifecycle.ts:16](../../../src/lib/payroll/period-lifecycle.ts#L16)
- Tipo `PeriodStatus` en [src/types/payroll.ts:12](../../../src/types/payroll.ts#L12) — 4 estados: `draft | calculated | approved | exported`
- Eventos outbox payroll existentes: [src/lib/sync/event-catalog.ts:219-224](../../../src/lib/sync/event-catalog.ts#L219-L224)
- API routes por período: [src/app/api/hr/payroll/periods/\[periodId\]/](../../../src/app/api/hr/payroll/periods/[periodId]/) — `approve`, `calculate`, `close`, `export`, `readiness`
- API routes por entry: [src/app/api/hr/payroll/entries/\[entryId\]/](../../../src/app/api/hr/payroll/entries/[entryId]/) — `explain`, `receipt`
- Consumer de cost attribution reactivo: [src/lib/sync/projections/commercial-cost-attribution.ts](../../../src/lib/sync/projections/commercial-cost-attribution.ts)

### Gap

- No existe estado `reopened` en `PeriodStatus`
- `payroll_entries` no tiene columna `version` ni `superseded_by` — una sola fila por `(period_id, member_id)`
- No existe tabla de auditoría `payroll_period_reopen_audit`
- No existe endpoint `POST /api/hr/payroll/periods/[periodId]/reopen`
- No existe evento outbox `payroll_entry.reliquidated` — el catálogo actual solo modela upsert/calculated/approved/exported
- No existe consumer que aplique delta a Finance sin duplicar
- No existe UI de reopen con preview del delta, ni badge "v2 reliquidada" en entries
- No existe lógica de bloqueo por Previred declarado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

Esta task coordina 3 child tasks. Su entregable es orquestar la ejecución, mantener la coherencia del contrato entre ellas y validar el flujo end-to-end.

### Slice 1 — Foundation (TASK-410)

Delega en [TASK-410](./TASK-410-payroll-period-reopen-foundation-versioning.md):

- Migración SQL: nuevo estado `reopened`, columnas `version`/`is_active`/`superseded_by` en `payroll_entries`, tabla `payroll_period_reopen_audit`
- Actualización de `period-lifecycle.ts` con transiciones del nuevo estado
- Endpoint `POST /api/hr/payroll/periods/[periodId]/reopen` con auth admin + motivo + lock
- Contrato del evento outbox `payroll_entry.reliquidated` publicado en `event-catalog.ts`
- Guardas: ventana temporal = mes operativo vigente; bloqueo por Previred declarado; lock contra export en curso
- TX atómica: reopen + nueva versión + outbox event

### Slice 2 — Finance Delta Consumer (TASK-411)

Delega en [TASK-411](./TASK-411-payroll-reliquidation-finance-delta-consumer.md):

- Consumer reactivo del evento `payroll_entry.reliquidated`
- Cálculo de delta = `new_amount - previous_amount`; asiento de ajuste en Finance (nunca monto completo)
- Idempotencia por `(entry_id, version)`; replay-safe
- Recompute de `commercial_cost_attribution` y `client_economics` para el mes afectado
- Tests con escenarios: delta positivo, delta negativo, delta cero, replay del mismo evento

### Slice 3 — Admin UI, Preview & Audit (TASK-412)

Delega en [TASK-412](./TASK-412-payroll-reliquidation-admin-ui-preview-audit.md):

- Dialog de reopen con motivo obligatorio (taxonomía: `error_calculo`, `bono_retroactivo`, `correccion_contractual`, `otro`)
- Preview del delta antes de confirmar: "Monto anterior: $X. Nuevo: $Y. Diferencia: $Z."
- Badge visual "v2 reliquidada el DD/MM por [usuario]" en la entry
- Vista de historial de versiones accesible desde la entry
- Reenvío automático de liquidación PDF v2 al colaborador (email transaccional)
- Vista de audit log en Admin Center

## Out of Scope

- **Rectificatoria Previred automática** — V1 bloquea el reopen si Previred ya fue declarado; la rectificación se hace manual fuera del portal. Queda para V2.
- **Nota de crédito Nubox automática** — mismo tratamiento: si ya hay boleta emitida, bloquear reopen con mensaje claro.
- **Reliquidaciones múltiples (v3, v4…)** — V1 permite una sola reliquidación por entry. Si se necesita otra, se reabre de nuevo registrando nuevo audit entry pero no se soporta cadena v3+.
- **Undo de reliquidación** — no existe acción "revertir v2 a v1". El preview debe ser suficiente para evitar errores.
- **Ventana extendida a meses históricos** — V1 solo permite mes operativo vigente. Meses anteriores requieren mecanismo distinto (ajuste en período actual).
- **Métricas/alertas avanzadas** — se deja Sentry breadcrumb básico; dashboards e alertas por umbral quedan para V2.
- **Taxonomía de motivos compleja / flujos de aprobación multi-step** — V1 = campo controlado simple + doble confirmación si delta > umbral.
- **Moneda distinta a CLP en la reliquidación** — si la entry original está en USD, tratar igual; no se introduce conversión ni FX en V1.

## Detailed Spec

Ver las child tasks. Este umbrella solo coordina; el detalle SQL, de API y de UI vive en TASK-410/411/412.

**Contrato del evento outbox** (fuente de verdad compartida):

```typescript
// event_type: 'payroll_entry.reliquidated'
interface PayrollEntryReliquidatedPayload {
  entry_id: string
  period_id: string
  member_id: string
  version: number              // nueva versión (>= 2)
  previous_version: number     // versión reemplazada
  previous_amount_net: number  // líquido anterior (CLP)
  new_amount_net: number       // líquido nuevo (CLP)
  delta_amount_net: number     // new - previous (puede ser negativo)
  previous_amount_gross: number
  new_amount_gross: number
  delta_amount_gross: number
  reopen_audit_id: string      // FK a payroll_period_reopen_audit
  reopened_by_user_id: string
  reopen_reason: 'error_calculo' | 'bono_retroactivo' | 'correccion_contractual' | 'otro'
  reopen_reason_detail: string | null
  currency: 'CLP' | 'USD'
  operational_month: string    // YYYY-MM del período original, no del reopen
}
```

Idempotency key: `payroll_entry.reliquidated:${entry_id}:${version}`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 3 child tasks (TASK-410, TASK-411, TASK-412) están en `complete`
- [ ] El contrato del evento outbox `payroll_entry.reliquidated` está publicado en `event-catalog.ts` y documentado en `GREENHOUSE_EVENT_CATALOG_V1.md`
- [ ] Un QA manual en staging ejecuta el flujo completo: cierra una nómina de prueba → la reabre → edita un monto → aprueba → re-exporta → verifica que Finance recibió solo el delta y que `commercial_cost_attribution` fue recalculado
- [ ] El audit log en Admin Center muestra el reopen con usuario, fecha, motivo y delta
- [ ] El colaborador recibe el email con liquidación v2 (verificado en preview de email o inbox real)
- [ ] La documentación funcional en `docs/documentation/hr/` incluye una sección "Reliquidación de nómina" explicando el flujo en lenguaje simple
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` quedó actualizado reflejando el nuevo estado `reopened` y el modelo de versionado

## Verification

- Revisión manual del cierre de cada child task
- Smoke test en staging con `pnpm staging:request` validando los endpoints
- Verificación de que los PRs de las child tasks no rompieron `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas (TASK-392, TASK-393, TASK-401)

- [ ] Las 3 child tasks están cerradas en `complete/` antes de cerrar este umbrella
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` y `GREENHOUSE_EVENT_CATALOG_V1.md` reflejan la capacidad de reliquidación
- [ ] Documentación funcional `docs/documentation/hr/reliquidacion-nomina.md` creada

## Follow-ups

- V2: rectificatoria Previred automática
- V2: nota de crédito Nubox automática al reliquidar honorarios
- V2: reliquidaciones múltiples (v3+) con cadena de versiones
- V2: ventana extendida a meses históricos bajo aprobación adicional
- V2: dashboard de reliquidaciones con alertas por umbral
- V2: undo de reliquidación dentro de ventana corta

## Open Questions

- ¿Umbral de doble confirmación cuando `abs(delta) / previous_amount > ?` — propuesto 10%, confirmar con Finance
- ¿La regeneración del PDF v2 debe incluir un marcador visual explícito ("RELIQUIDADA — REEMPLAZA VERSIÓN DEL DD/MM") o solo el número de versión en el header?
- ¿El email de notificación al colaborador debe ser template transaccional nuevo o reutilizar el template de export con un flag?
