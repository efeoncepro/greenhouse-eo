## Delta 2026-04-13

- TASK-175 cerrada. La red de seguridad de tests para `postgres-reconciliation.ts` (18 tests) y `payment-ledger.ts` (15 tests) ya existe. Refactorizar `reconciliation.ts` como motor standalone (Slice 1 de esta task) ahora tiene cobertura base — se puede avanzar sin riesgo de regresión silenciosa.
- TASK-174 cerrada. Los fundamentos de locking que esta task requiere ya están en producción: `SELECT ... FOR UPDATE NOWAIT` en reconciliation period y bank_statement_rows, `withTransaction` en match/unmatch routes, idempotency middleware disponible en `src/lib/finance/idempotency.ts`. El motor de auto-match de esta task puede apalancarse en estos primitivos directamente.

# TASK-401 — Bank Reconciliation: Continuous Transaction Matching

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Grande`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-401-bank-reconciliation-continuous-matching`
- Legacy ID: none
- GitHub Issue: none

## Summary

El modelo actual de conciliación bancaria está organizado en períodos mensuales: el usuario debe crear un período, cargar un extracto, hacer match manual y cerrar. Esto no refleja cómo opera un equipo de finanzas moderno. El matching de movimientos debería ocurrir de forma **continua y automática** conforme llegan los movimientos desde Nubox, dejando el cierre mensual solo como validación formal. Este cambio convierte la conciliación de un proceso batch mensual a un flujo diario sin fricción.

## Why This Task Exists

- El banco recibe movimientos vía Nubox sync (diario/automático), pero el matching con cobros/pagos registrados solo ocurre cuando el usuario inicia un período de conciliación mensual.
- Un cobro por factoring registrado hoy no aparece como "conciliado" hasta que alguien crea un período y lo matchea manualmente.
- Herramientas como Xero y QuickBooks hacen auto-match en tiempo real: cuando llega un movimiento bancario, el sistema busca automáticamente el cobro o pago correspondiente y lo marca como conciliado.
- El campo `is_reconciled` en `income_payments` y `expenses` existe pero solo se actualiza durante el proceso manual mensual.
- El modelo actual genera fricción operativa y retrasa la visibilidad de caja real.

## Goal

- Implementar matching automático de movimientos bancarios (Nubox) contra `income_payments` y `expense_payments` al momento de la sincronización.
- El campo `is_reconciled` se actualiza de forma continua, sin requerir que el usuario abra un período.
- El cierre mensual formal se mantiene como proceso de validación y firma contable, no como el único momento en que ocurre el matching.
- La vista de Cobros y Banco refleja el estado de conciliación en tiempo real.
- Reducir el porcentaje de movimientos "sin conciliar" que hoy acumulan el mes entero.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- El matching automático NO reemplaza ni bloquea el cierre mensual formal — son capas complementarias.
- El campo `is_reconciled` es la fuente de verdad operativa; `reconciliation_periods` es para el cierre contable.
- Todo matching automático debe ser reversible (unmatch posible desde la UI).
- No usar BigQuery para escrituras de conciliación — solo PostgreSQL (`greenhouse_finance`).

## Normative Docs

- `src/lib/finance/reconciliation.ts` — lógica actual de conciliación
- `src/app/api/finance/reconciliation/` — API routes existentes
- `src/lib/finance/account-balances.ts` — materialización de saldos bancarios

## Dependencies & Impact

### Depends on

- `TASK-174` — idempotency keys y locking: prerequisito para que el motor de auto-match no genere double-match en retries
- `TASK-175` — test coverage sobre `reconciliation.ts` antes de refactorizarlo como motor standalone
- `TASK-179` — **prerequisito directo**: la reconciliación debe estar en Postgres-only antes de implementar el motor continuo; operar auto-match sobre dual-write es riesgo de inconsistencia
- `greenhouse_finance.income_payments` — campo `is_reconciled`, `payment_account_id`
- `greenhouse_finance.settlement_legs` — fuente primaria de movimientos bancarios conciliados
- Pipeline Nubox sync (Cloud Run / `src/lib/sync/`) — origen de movimientos bancarios
- TASK-399 — Native Integrations Runtime Hardening (puede afectar el pipeline de sync)

### Blocks / Impacts

- `TASK-392` — management accounting: sin matching continuo el "actual confiable" tiene lag mensual
- Vista Cobros (`CashInListView`) — estado de conciliación por cobro
- Vista Banco (`BankDetailView`) — coverage y movimientos sin conciliar
- Flujo de conciliación mensual (`reconciliation_periods`) — debe coexistir sin conflicto

### Quality Enhancers (no bloqueantes)

- `TASK-212` (Nubox line items sync) — cuando esté lista, los movimientos de Nubox tendrán folio, RUT y descripción completos, mejorando el scoring del auto-match de ~70% a ~95% de precisión

### Files owned

- `src/lib/finance/reconciliation.ts`
- `src/lib/finance/auto-match.ts` (nuevo)
- `src/app/api/finance/reconciliation/auto-match/route.ts` (nuevo — trigger manual)
- `src/lib/sync/nubox*.ts` — punto de integración del auto-match al recibir movimientos

## Current Repo State

### Already exists

- `greenhouse_finance.income_payments.is_reconciled` — flag existe, solo se actualiza vía período mensual
- `greenhouse_finance.settlement_legs` — tabla de movimientos bancarios ya existente
- `src/lib/finance/reconciliation.ts` — lógica de match manual y auto-match dentro de período
- `/api/finance/reconciliation/[id]/auto-match` — auto-match dentro de un período mensual (ya funciona)
- `src/app/api/finance/cash-in` — retorna `paymentSource` y estado de conciliación

### Gap

- No existe matching automático fuera del contexto de un `reconciliation_period`.
- El pipeline Nubox sincroniza **dos tipos de datos distintos**: documentos DTE (facturas emitidas → `income` records) y movimientos bancarios (pagos recibidos → `income_payments` con `payment_source = 'nubox_bank_sync'`). El auto-match solo aplica al segundo tipo. Hoy ninguno de los dos dispara matching.
- No existe un job periódico (diario) que intente matchear los movimientos bancarios recientes (`income_payments` con `payment_source IN ('nubox_bank_sync', 'factoring_proceeds')`) contra los `income` registrados sin conciliar.
- La lógica de scoring/matching de `reconciliation.ts` está acoplada al período mensual — no es invocable standalone.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer motor de matching a función standalone

- Refactorizar la lógica de scoring/matching de `reconciliation.ts` a un módulo `auto-match.ts` invocable sin `reconciliation_period_id`.
- La función recibe un rango de fechas (o lista de `payment_id`s de Nubox) y produce matches candidatos.
- Criterios de match: monto exacto, fecha ±3 días, referencia Nubox vs referencia del cobro.

### Slice 2 — Job de auto-match continuo

- Crear endpoint `POST /api/finance/reconciliation/auto-match` que corra el motor standalone.
- **Trigger correcto:** el auto-match se dispara únicamente cuando Nubox trae **movimientos bancarios** (`payment_source = 'nubox_bank_sync'`), es decir cuando crea registros en `income_payments`. NO se dispara al sincronizar documentos DTE (facturas), que van a `income` y no son pagos.
- También aplica a pagos de factoring (`payment_source = 'factoring_proceeds'`) y otros orígenes con `payment_account_id` asignado.
- Cron diario 08:00 CLT como fallback para movimientos que llegaron fuera de sync.
- Registrar matches como `is_reconciled = true` + crear entrada en `settlement_legs` con `linked_payment_type = 'income_payment'` o `'expense_payment'`.
- Matches con score < umbral quedan en cola para revisión manual.

### Slice 3 — UX: visibilidad del estado continuo

- Actualizar vista Cobros (`CashInListView`) para reflejar conciliación en tiempo real (badge "Conciliado" / "Por conciliar" ya existe, solo necesita datos frescos).
- Vista Banco: el `coverage %` debe reflejar el matching continuo, no solo dentro de períodos.
- Agregar sección "Conciliados automáticamente hoy" en la vista de Banco.

### Slice 4 — Cierre mensual como validación formal

- El proceso de `reconciliation_periods` se mantiene intacto para el cierre contable.
- Al abrir un período mensual, los movimientos ya auto-matcheados aparecen pre-conciliados (no hay trabajo duplicado).
- Solo los residuos sin match quedan para revisión manual en el cierre mensual.

## Out of Scope

- Eliminar o reemplazar `reconciliation_periods` — el cierre mensual formal se mantiene.
- Integración con extractos bancarios en formato PDF o Excel (solo Nubox sync por ahora).
- Multi-moneda FX matching (solo CLP en esta task).
- Matching de tarjetas de crédito o fintech (solo cuentas bancarias).

## Detailed Spec

### Motor de matching standalone

Criterios de match (por prioridad):

1. **Monto exacto** + **referencia Nubox coincide con referencia del cobro** → match automático (score 100)
2. **Monto exacto** + **fecha ±1 día** → match automático (score 90)
3. **Monto exacto** + **fecha ±3 días** → match para revisión (score 70)
4. **Monto ±1%** + **fecha ±1 día** → match para revisión (score 60)
5. Sin match → queda como "por conciliar"

Umbral de auto-aplicación: score ≥ 90. Score 60-89: se propone pero requiere confirmación manual.

### Trigger de ejecución

Nubox sincroniza dos tipos de datos con semántica distinta:

| Tipo Nubox | Destino en Greenhouse | ¿Dispara auto-match? |
|---|---|---|
| Documentos DTE (facturas emitidas) | `greenhouse_finance.income` | ❌ No — son registros de ingresos, no pagos |
| Movimientos bancarios (cobros recibidos) | `greenhouse_finance.income_payments` con `payment_source = 'nubox_bank_sync'` | ✅ Sí — son pagos reales contra una cuenta |

- **Post-Nubox bank-movement sync**: cuando el pipeline importa `income_payments` nuevos con `payment_source = 'nubox_bank_sync'`, dispara el auto-match sobre esos `payment_id`s específicos.
- **Post-factoring**: cuando se registra una operación de factoring (`payment_source = 'factoring_proceeds'`), el pago también entra al motor de auto-match.
- **Cron diario 08:00 CLT**: re-intenta el matching de los últimos 7 días como fallback para syncs tardíos o fuera de orden.
- **Trigger manual**: `POST /api/finance/reconciliation/auto-match` con parámetros `{ fromDate, toDate, accountId? }`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un cobro registrado hoy con `payment_account_id` aparece como `is_reconciled = true` dentro de las 24 horas siguientes sin intervención manual.
- [ ] El coverage % en la vista de Banco refleja matches continuos, no solo períodos cerrados.
- [ ] El cierre mensual formal sigue funcionando sin cambios de comportamiento.
- [ ] Matches automáticos son revertibles desde la UI (unmatch).
- [ ] El motor standalone funciona sin `reconciliation_period_id`.
- [ ] Cron diario ejecuta sin errores y registra resultado en logs/observabilidad.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Staging: registrar un cobro, verificar que aparece conciliado antes del fin del día siguiente sin crear período mensual.
- Staging: verificar que el cierre mensual manual sigue funcionando con movimientos ya auto-matcheados.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado ejecutado (especialmente TASK-399, TASK-397)
- [ ] Documentación funcional en `docs/documentation/finance/` actualizada

## Follow-ups

- Matching multi-moneda (USD ↔ CLP con FX tolerance)
- Matching para tarjetas de crédito y fintech
- Dashboard de calidad de conciliación (% auto-matched, % manual, % sin match por cuenta y período)

## Open Questions

- ¿El job de auto-match diario corre en Cloud Run (ops-worker) o como cron de Vercel? Probablemente ops-worker dado el volumen potencial.
- ¿Cuántos días hacia atrás re-intenta el cron? Propuesta inicial: 7 días.
- ¿Se notifica al usuario cuando hay matches automáticos nuevos? (depende de TASK-386/387).
