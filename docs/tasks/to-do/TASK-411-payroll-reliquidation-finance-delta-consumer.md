# TASK-411 — Payroll Reliquidación Finance Delta Consumer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-410`
- Branch: `task/TASK-411-payroll-reliquidation-finance-consumer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Consumer reactivo del evento outbox `payroll_entry.reliquidated` que aplica **solo el delta** (`new_amount - previous_amount`) al ledger de Finance, recomputa `commercial_cost_attribution` y `client_economics` para el mes afectado, y es estrictamente idempotente. Garantiza que reliquidar una nómina NUNCA duplique costos — exactamente el requisito que motiva el programa completo ([TASK-409](./TASK-409-payroll-reliquidation-program.md)).

## Why This Task Exists

La foundation (TASK-410) publica el evento con delta, pero sin un consumer que lo procese correctamente, Finance queda desincronizado: el asiento original sigue vigente, el nuevo monto no se refleja, y las proyecciones reactivas (`commercial_cost_attribution`, `client_economics`) siguen apuntando al costo antiguo. Esta task cierra ese gap y hace cumplir el principio "solo aplicarse el último monto" que el usuario especificó.

## Goal

- Consumer que procesa `payroll_entry.reliquidated` de forma **idempotente** (replay-safe)
- Inserta en el ledger de Finance un **asiento de ajuste** por el delta, nunca el monto completo
- Recomputa `commercial_cost_attribution` para el `operational_month` afectado
- Recomputa `client_economics` para los clientes que heredan ese costo
- Delta cero → no-op explícito (log pero no asiento)
- Delta negativo → asiento de reversión parcial correcto
- Tests con escenarios de replay, orden alterado, fallo parcial

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- [docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](../../architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md) — idempotencia obligatoria
- [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)
- [docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

Reglas obligatorias:

- Idempotency key = `payroll_entry.reliquidated:${entry_id}:${version}` — el consumer DEBE verificar y saltarse si ya procesó ese key
- Replay del mismo evento debe ser estrictamente no-op (ni doble delta ni log duplicado)
- El asiento de ajuste debe referenciar el asiento original vía `related_posting_id` o mecanismo equivalente [verificar contra schema real de Finance]
- El recompute de `commercial_cost_attribution` debe usar el flujo existente, no reimplementar
- Dentro de la TX del consumer: apply delta + update idempotency record; el recompute reactivo puede ocurrir fuera de la TX vía otro evento encadenado

## Normative Docs

- [TASK-409](./TASK-409-payroll-reliquidation-program.md) — contrato del payload
- [TASK-410](./TASK-410-payroll-period-reopen-foundation-versioning.md) — emisor del evento

## Dependencies & Impact

### Depends on

- **TASK-410 completa** — evento publicado, guardas y contrato estables
- [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts)
- [src/lib/sync/projections/commercial-cost-attribution.ts](../../../src/lib/sync/projections/commercial-cost-attribution.ts)
- [src/lib/sync/projections/client-economics.ts](../../../src/lib/sync/projections/client-economics.ts)
- [src/lib/sync/projections/payroll-export-ready.ts](../../../src/lib/sync/projections/payroll-export-ready.ts) (referencia de patrón)
- Ledger de Finance: tabla de postings/asientos [verificar nombre exacto durante Discovery]
- Endpoint del worker reactivo Cloud Run: `services/ops-worker` (si el consumer se ejecuta ahí) o vía `/api/cron/outbox-react` (fallback)

### Blocks / Impacts

- **Impacts:** [TASK-392](./TASK-392-management-accounting-reliable-actual-foundation-program.md) y [TASK-393](./TASK-393-management-accounting-period-governance-restatements-reclassification.md) — el asiento de ajuste debe aparecer en el mes original, no en el mes del reopen. Coordinar con period governance.
- **Impacts:** [TASK-401](./TASK-401-bank-reconciliation-continuous-matching.md) — si delta > 0 implica pago adicional, debe propagarse al matcher; fuera de scope en V1 pero debe quedar el hook

### Files owned

- `src/lib/sync/projections/payroll-reliquidation.ts` (nuevo — consumer)
- `src/lib/sync/projections/payroll-reliquidation.test.ts` (nuevo)
- `src/lib/finance/apply-payroll-delta.ts` (nuevo — lógica de asiento de ajuste)
- `src/lib/finance/apply-payroll-delta.test.ts` (nuevo)
- [src/lib/sync/reactive-consumer.ts](../../../src/lib/sync/reactive-consumer.ts) [verificar path exacto] (modificar — registrar el nuevo handler)
- [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts) (modificar — si el tipo requiere etiquetas adicionales para routing)
- Posible migración si el ledger de Finance necesita un nuevo campo `posting_type = 'payroll_reliquidation_delta'`

## Current Repo State

### Already exists

- Patrón de consumer reactivo: [src/lib/sync/projections/commercial-cost-attribution.ts](../../../src/lib/sync/projections/commercial-cost-attribution.ts)
- Consumer con idempotencia: [src/lib/sync/projections/payroll-export-ready.ts](../../../src/lib/sync/projections/payroll-export-ready.ts)
- Framework reactivo: [src/lib/sync/reactive-consumer.test.ts](../../../src/lib/sync/reactive-consumer.test.ts) (usar como referencia)
- Worker Cloud Run `ops-worker` [services/ops-worker/](../../../services/ops-worker/) — ejecuta crons reactivos

### Gap

- No existe consumer específico para `payroll_entry.reliquidated`
- No existe función `applyPayrollDelta` que inserte un asiento de ajuste con referencia al original
- No existe un mecanismo claro de "recompute targeted del mes X" para `commercial_cost_attribution` — puede requerir un helper intermedio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Apply delta to Finance ledger

- Crear `src/lib/finance/apply-payroll-delta.ts`:
  ```typescript
  interface ApplyPayrollDeltaParams {
    entryId: string
    version: number
    previousVersion: number
    deltaAmountNet: number    // puede ser negativo
    deltaAmountGross: number
    operationalMonth: string  // YYYY-MM — mes del período ORIGINAL, no del reopen
    memberId: string
    reopenAuditId: string
    currency: 'CLP' | 'USD'
  }
  ```
- Durante Discovery, identificar la tabla canónica de postings de Finance ([verificar]: probablemente `greenhouse_finance.postings` o `greenhouse_finance.journal_entries`)
- Insertar un nuevo posting con:
  - `posting_type = 'payroll_reliquidation_delta'` (agregar al enum si no existe)
  - `amount = deltaAmountNet` (firmado)
  - `posting_date = último día del operationalMonth` (para que caiga en el mes original)
  - `related_entity_id = entryId`, `related_version = version`
  - `reopen_audit_id = reopenAuditId`
  - `idempotency_key = 'payroll_entry.reliquidated:' + entryId + ':' + version`
- Si `deltaAmountNet === 0` → no insertar, retornar `{ status: 'noop' }`
- Tests: delta positivo, delta negativo, delta cero, replay del mismo evento (debe saltarse por idempotency key único)

### Slice 2 — Reactive consumer handler

- Crear `src/lib/sync/projections/payroll-reliquidation.ts`:
  - Handler con signature compatible con el framework reactivo existente (usar `payroll-export-ready.ts` como plantilla)
  - Lee payload del evento `payroll_entry.reliquidated`
  - Llama `applyPayrollDelta(...)`
  - Si apply retornó `status !== 'noop'`, dispara trigger de recompute para `commercial_cost_attribution` y `client_economics` (puede ser vía emisión de otro evento reactivo o llamada directa; decidir en Discovery)
  - Registra en `source_sync_runs` con `source_system='reactive_worker'` y `event_type='payroll_entry.reliquidated'`
- Registrar el handler en el dispatcher del consumer reactivo [verificar path exacto]
- Tests: feliz, replay, evento con delta cero, fallo del apply (debe dejar el evento en estado `failed` para retry)

### Slice 3 — Recompute de proyecciones downstream

- Verificar si [src/lib/sync/projections/commercial-cost-attribution.ts](../../../src/lib/sync/projections/commercial-cost-attribution.ts) ya expone un método "recompute solo este mes" — si no, agregar `recomputeForMonth(year, month)`
- Desde el consumer, invocarlo tras el apply exitoso
- Igual para [src/lib/sync/projections/client-economics.ts](../../../src/lib/sync/projections/client-economics.ts)
- Garantizar que si el recompute falla, el evento reactivo NO queda marcado como procesado (retry)

### Slice 4 — Validación end-to-end y tests

- Test de integración con DB real que:
  1. Inserta un período `exported` con una entry v1
  2. Simula emisión del evento `payroll_entry.reliquidated` con delta = +50000 (CLP)
  3. Ejecuta el consumer
  4. Verifica: posting de ajuste insertado con amount=+50000, `commercial_cost_attribution` recalculado, `source_sync_runs` registrado
  5. Re-ejecuta el mismo evento → verifica que no se insertó segundo posting
- Test con delta negativo (-20000)
- Test con delta cero (no-op)

## Out of Scope

- **Emisión del evento** → TASK-410
- **UI de reopen y audit view** → TASK-412
- **Propagación a `bank_reconciliation` matcher** — V2
- **Notificación a tesorería de pago adicional pendiente** — V2
- **Reversión completa del asiento original + re-post** (alternativa de diseño descartada) — esta task implementa solo delta neto
- **Recompute de proyecciones no-financieras** (person-intelligence, staff-augmentation) — solo si se detecta que dependen del costo payroll; de lo contrario fuera

## Detailed Spec

### Cálculo del delta

```typescript
const deltaAmountNet = newAmountNet - previousAmountNet
const deltaAmountGross = newAmountGross - previousAmountGross
```

Ambos vienen en el payload — el consumer no recalcula, confía en el emisor (TASK-410).

### Referencia al asiento original

El posting de ajuste **no reversa** el original; lo complementa. El reporting de Finance debe sumar ambos para obtener el costo real:

```
Posting original (mes 2026-04):    costo payroll Juan = 850,000 (v1)
Posting ajuste   (mes 2026-04):    delta reliquidación = +50,000 (v2)
-------------------------------------------------------------------
Costo real mes 2026-04:                                  900,000
```

Esto preserva historial contable y no destruye el asiento original, lo cual es preferible a "borrar y re-insertar".

### Idempotencia

- Tabla de idempotencia: [verificar si existe `reactive_consumer_idempotency` o similar]; si no, usar columna `idempotency_key` con UNIQUE en la tabla de postings
- Orden de operaciones dentro de la TX del consumer:
  1. `SELECT 1 FROM postings WHERE idempotency_key = ?` — si existe, return noop
  2. INSERT del posting con `idempotency_key`
  3. INSERT en `source_sync_runs`
  4. COMMIT
- Recompute fuera de TX (async) para no bloquear

### Manejo de fallos

- Si `applyPayrollDelta` falla → throw; el framework reactivo lo marca como failed y hace retry con backoff
- Si el recompute falla pero el apply fue exitoso → log warning, emitir alerta, pero NO retry del evento (el delta ya fue aplicado). La proyección se recuperará en la próxima corrida reactiva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `applyPayrollDelta` inserta el posting con el signo correcto (positivo o negativo) y referencia al audit
- [ ] Replay del mismo evento (mismo `entry_id`, mismo `version`) no inserta segundo posting
- [ ] Delta cero → no inserta posting, log informativo
- [ ] El posting de ajuste aparece en el mes operativo ORIGINAL (no el mes del reopen)
- [ ] `commercial_cost_attribution` recalculado para el mes afectado tras el apply
- [ ] `client_economics` recalculado para los clientes afectados
- [ ] El consumer registra una fila en `source_sync_runs` con `source_system='reactive_worker'` y `event_type='payroll_entry.reliquidated'`
- [ ] Fallo en recompute no bloquea el delta ya aplicado (el ledger queda correcto aunque la proyección tarde)
- [ ] Tests de integración cubren delta positivo, negativo, cero, y replay
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit` verdes
- [ ] Build de `services/ops-worker` verde si el consumer se ejecuta ahí

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Build del worker Cloud Run si aplica: `bash services/ops-worker/deploy.sh` (solo build check, no deploy)
- Smoke test en staging: reliquidar una entry de prueba end-to-end y validar que el reporting refleja el delta

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] [TASK-409](./TASK-409-payroll-reliquidation-program.md) actualizado reflejando que Slice 2 está complete
- [ ] [TASK-392](./TASK-392-management-accounting-reliable-actual-foundation-program.md) y [TASK-393](./TASK-393-management-accounting-period-governance-restatements-reclassification.md) revisadas para compatibilidad del nuevo `posting_type`
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizado con el patrón de delta posting

## Follow-ups

- V2: integración con bank reconciliation para propagar pago adicional pendiente
- V2: reporte específico "Reliquidaciones del mes" en Finance dashboard
- Investigar si el reporting actual de P&L suma correctamente postings con `posting_type = 'payroll_reliquidation_delta'` — podría requerir actualización de VIEWs

## Delta 2026-04-15 — Audit Findings (pre-implementación)

Durante Discovery se detectaron supuestos desactualizados que cambian materialmente el diseño:

1. **NO existe tabla `postings` / `journal_entries` en Finance.** El payroll cost vive en `greenhouse_finance.expenses` + `greenhouse_finance.expense_payments`. Flujo actual: `payroll_period.exported` → consumer `finance_expense_reactive_intake` materializa un `expense` por entry (`expenseType='payroll'`, linkeado vía `payroll_entry_id` + `payroll_period_id`).
2. **El check de idempotencia actual es `WHERE payroll_entry_id = $1`**, lo que causaría **double-counting** si creamos v2 con nuevo `entry_id`: el consumer vería el v2 como "nuevo" y crearía una segunda expense. **Corrección obligatoria**: cambiar el check a `WHERE (payroll_period_id, member_id) = ($1, $2)` — una sola expense "primaria" por `(period, member)`, independiente del entry_id.
3. **Idempotencia del framework reactivo es automática** vía PK `(event_id, handler)` en `greenhouse_sync.outbox_reactive_log`. No hay que implementarla en el handler.
4. **Recompute de proyecciones**: `commercialCostAttributionProjection` y `clientEconomicsProjection` ya tienen eventos payroll en sus `triggerEvents`. Basta con agregar `payroll_entry.reliquidated` al mismo array — se recalculan automáticamente.
5. **No existe `posting_type` ni `related_posting_id`**. La expense de delta se distingue por `costCategory='direct_labor'` + `notes` explícito + el `reopen_audit_id` como FK.

## Arquitectura V1 Final (Delta-only)

- **Cambio 1**: `finance_expense_reactive_intake` pasa a idempotencia por `(payroll_period_id, member_id)`.
- **Cambio 2**: Nuevo consumer `payroll_reliquidation_delta` inserta expense de ajuste con `amount = delta_gross` en la misma `(period, member)`. Skip si delta = 0.
- **Cambio 3**: Columna nueva `reopen_audit_id` en `greenhouse_finance.expenses` (nullable, FK al audit table).

## Open Questions — Resueltas

- Tabla canónica: `greenhouse_finance.expenses`.
- Framework idempotente: automático vía `outbox_reactive_log`.
- Recompute projections: automático al agregar `payroll_entry.reliquidated` a `triggerEvents`.
