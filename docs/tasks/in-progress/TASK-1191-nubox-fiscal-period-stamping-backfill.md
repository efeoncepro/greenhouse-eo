# TASK-1191 — Estampar período fiscal en sync Nubox + backfill (cierra ISSUE-103)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1191-nubox-fiscal-period-stamping-backfill`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-103`

## Summary

Cierra ISSUE-103: los documentos con IVA sincronizados desde Nubox (`EXP-NB-*` / `INC-NB-*`) no tienen período fiscal (`period_year`/`period_month`/`tax_period` vacíos) → el 90% del crédito fiscal de compras (112/125 expenses + 53 income) nunca entra al F29 y Efeonce paga IVA de más. El período es derivable de `document_date`/`invoice_date`. Esta task (1) estampa el período fiscal en el sync de Nubox para que los documentos nuevos nazcan con período, (2) backfillea idempotente los 165 existentes, y (3) re-materializa el IVA para que el crédito completo entre al F29.

## Why This Task Exists

ISSUE-101/TASK-725 cerró un tramo de exclusión del IVA (el gate `space_id IS NOT NULL`), pero el signal `finance.vat.eligible_without_period` (TASK-1185) reveló el tramo mayor: el sync de Nubox no estampa el período fiscal, así que la mayoría de los documentos con IVA quedan fuera de toda posición F29. Es la raíz del "$2.56M crédito excluido" del audit original. Es fiscalmente material (crédito no reclamado = sobrepago de IVA), por eso P1.

## Goal

- El sync de Nubox estampa `period_year`/`period_month` (y `tax_period` si aplica) derivando del `document_date`/`invoice_date` con el calendario operativo canónico (`America/Santiago`). Documentos nuevos nacen con período.
- Backfill idempotente (dry-run → apply) de los 165 documentos existentes sin período.
- Post-backfill: re-materializar el IVA → `finance.vat.eligible_without_period` = 0 y el crédito fiscal completo entra al F29.
- Validación de la cifra resultante vs F29 real con el contador (gate humano).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (VAT / F29; Delta TASK-725 + TASK-1185)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (Nubox pipeline)
- `src/lib/calendar/operational-calendar.ts` (calendario operativo canónico `America/Santiago`)

Reglas obligatorias:

- **NUNCA** derivar el período/mes operativo con helpers locales de vista (usar el calendario operativo canónico).
- **NUNCA** un backfill destructivo sin dry-run + idempotencia (derivar período de la fecha, no inventar).
- El período fiscal del IVA en Chile se reclama en el período del documento (o hasta 2 períodos después por regla SII) — **verificar la regla de derivación con el contador** antes de aplicar (¿mes del documento, o mes de recepción/registro?).
- No cambiar el scope fiscal (sigue siendo entidad legal, TASK-725).

## Normative Docs

- `docs/issues/open/ISSUE-103-nubox-synced-vat-docs-missing-fiscal-period.md` (incidente origen).
- `docs/tasks/complete/TASK-1185-vat-materializer-fiscal-robustness-hardening.md` (el signal que lo detectó).
- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md`.
- Skill `greenhouse-finance-accounting-operator` (regla SII de período de crédito fiscal).

## Dependencies & Impact

### Depends on

- Sync de Nubox: `src/lib/nubox/sync-nubox-to-postgres.ts` `[verificar]` (punto donde se upsertean income/expenses).
- `src/lib/calendar/operational-calendar.ts` (derivación de período).
- `greenhouse_finance.income` / `greenhouse_finance.expenses` (columnas `period_year`, `period_month`, `tax_period`, `document_date`, `invoice_date`).
- Materializador VAT (`src/lib/finance/vat-ledger.ts`) para re-materializar post-backfill.

### Blocks / Impacts

- Completa la posición de IVA (TASK-725) — sin esto, el F29 sigue sub-declarando crédito.
- Impacta posibles consumers que asumen período en income/expenses (cost intelligence, KPIs por período).

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts` (estampar período)
- `scripts/finance/` (script de backfill idempotente `[verificar]`)
- migración de backfill si se prefiere SQL-based `[verificar]`
- tests asociados

## Current Repo State

### Already exists

- Sync de Nubox 3 fases (API→BQ raw→conformed→PG); el step PG upsertea income/expenses con `document_date` pero sin período.
- Calendario operativo canónico (`operational-calendar.ts`) para derivar mes/período.
- Materializador VAT + signal `finance.vat.eligible_without_period` (mide el progreso del backfill).

### Gap

- El sync no estampa `period_year`/`period_month`/`tax_period`.
- 165 documentos existentes sin período (112 expenses + 53 income, mayoría Nubox).
- No hay backfill ni regla de derivación documentada/validada con contador.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca el pipeline Nubox + backfill de datos fiscales; sign-off contable)
- Impacto principal: `sync` (fix del estampado) + `backfill` (165 docs) + re-materialización
- Source of truth afectado: `greenhouse_finance.income` / `expenses` (`period_year`/`period_month`/`tax_period`)
- Consumidores afectados: materializador VAT, cost intelligence, KPIs por período
- Runtime target: `worker`/`cron` (Nubox sync) + backfill one-shot

### Contract surface

- Contrato existente a respetar: el shape de income/expenses; el sync Nubox canónico; el calendario operativo.
- Contrato nuevo o modificado: el sync estampa período; backfill idempotente.
- Backward compatibility: `compatible` (additive: poblar columnas que estaban NULL).
- Full API parity: `N/A — no capability` (data quality / sync fix).

### Data model and invariants

- Entidades/tablas: `income`, `expenses` (poblar período); VAT tables (re-materializar).
- Invariantes:
  - Período derivado del calendario operativo canónico (`America/Santiago`), NUNCA helper local.
  - Backfill idempotente (re-ejecutable, deriva de la fecha, no sobre-escribe un período ya correcto sin razón).
  - Regla de derivación SII validada con contador antes de apply.
- Tenant/space boundary: N/A (datos de la entidad legal).
- Idempotency/concurrency: backfill idempotente con dry-run; el sync estampa en el upsert.
- Audit/outbox/history: el backfill puede emitir los eventos `finance.{income,expense}.updated` para disparar la re-materialización reactiva, o re-materializar explícito.

### Migration, backfill and rollout

- Migration posture: `backfill` (poblar período en 165 filas) — vía script idempotente o migración data-only con dry-run.
- Default state: el fix del sync puede gatearse o ir directo (additive: poblar NULLs).
- Backfill plan: dry-run (mostrar el período derivado por doc) → apply → re-materializar VAT → verificar `eligible_without_period`=0.
- Rollback path: el backfill es additive (NULL→valor); revert = volver a NULL los backfilleados (script inverso) o dejarlos (son correctos). Revert PR del sync fix.
- External coordination: validación de la regla de período + cifra resultante con el contador (vs F29 real).

### Security and access

- Auth/access gate: backfill = script ops (server-only); sync = cron/worker existente.
- Sensitive data posture: `finance` (cifras fiscales).
- Error contract: `captureWithDomain(err,'finance'|'integrations.nubox',...)`.
- Abuse/rate-limit posture: N/A.

### Runtime evidence

- Local checks: tests del estampado de período en el sync + del backfill (derivación correcta de la fecha).
- DB/runtime checks: dry-run del backfill (período derivado por doc) vs `document_date`; post-apply `eligible_without_period`=0.
- Integration checks: un sync de Nubox nuevo estampa período.
- Reliability signals/logs: `finance.vat.eligible_without_period` (→0), `finance.vat.position_drift` (sigue 0).
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Regla de derivación del período validada con contador (mes del documento vs recepción).
- [ ] Sync estampa período; documentos nuevos nacen con período.
- [ ] Backfill idempotente con dry-run; 165 docs poblados.
- [ ] `eligible_without_period`=0 + VAT re-materializado + drift=0.
- [ ] Cifra de IVA resultante validada vs F29 real.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability` (data-quality / sync fix; no introduce un write de negocio nuevo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Regla de derivación del período + Discovery del sync

- Confirmar con contador la regla SII de período del crédito fiscal (mes del documento vs recepción; ventana de hasta 2 períodos). Localizar el punto exacto del upsert en el sync de Nubox (`sync-nubox-to-postgres.ts`).

### Slice 2 — Estampar período en el sync

- En el step PG del sync, derivar `period_year`/`period_month` (+ `tax_period`) del `document_date`/`invoice_date` con el calendario operativo canónico. Documentos nuevos nacen con período. Tests.

### Slice 3 — Backfill idempotente

- Script `scripts/finance/` (server-only): dry-run que muestra el período derivado por doc, apply idempotente de los 165 existentes. Re-ejecutable.

### Slice 4 — Re-materializar VAT + verificación

- Tras el backfill, re-materializar el IVA (`materializeAllAvailableVatPeriods`) → `eligible_without_period`=0, `position_drift`=0, crédito fiscal completo en el F29. Validación contable de la cifra.

## Out of Scope

- Cambiar el scope fiscal (entidad legal, TASK-725).
- PPM/Retenciones/F22 (TASK-1186 y sus children).
- Envío del F29 a SII.
- Otros campos faltantes del sync Nubox no relacionados con período.

## Detailed Spec

El período fiscal se deriva de la fecha del documento con el calendario operativo (`America/Santiago`). El fix vive en el step PG del sync de Nubox (no en una vista). El backfill es additive (NULL→valor) e idempotente. Post-backfill, re-materializar reusa el materializador de TASK-725/1185 (ya hardeneado). La regla SII exacta (período de imputación del crédito) se valida con contador en Slice 1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (regla + discovery) → Slice 2 (sync estampa) → Slice 3 (backfill) → Slice 4 (re-materializar + verificar). El backfill (3) antes de la re-materialización (4). El sync fix (2) antes para que no se re-introduzcan docs sin período.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Período derivado incorrecto (regla SII mal interpretada) | finance | medium | validar regla con contador (Slice 1); dry-run revisado | drift vs F29 real |
| Backfill no idempotente / sobre-escribe período correcto | finance | low | derivar solo donde NULL; dry-run; re-ejecutable | `eligible_without_period` |
| Re-materialización cambia cifras ya declaradas | finance | medium | validación contable antes de baseline | `finance.vat.position_drift` |
| Sync fix rompe el upsert Nubox | integrations.nubox | low | tests del step PG; sync run de prueba | source_sync_runs |

### Feature flags / cutover

El sync fix es additive (poblar NULLs). El backfill es one-shot con dry-run. Sin flag necesario; opcional gatear el estampado si se quiere shadow.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | revert PR del sync | <15 min | sí |
| Slice 3 | script inverso (volver NULL los backfilleados) o dejar (son correctos) | <15 min | sí |
| Slice 4 | re-materializar con estado previo (fuente intacta) | <30 min | sí |

### Production verification sequence

1. Slice 2 a staging → un sync Nubox de prueba estampa período.
2. Slice 3 dry-run → revisar período derivado por doc.
3. Slice 3 apply → `eligible_without_period` baja.
4. Slice 4 re-materializar dev → `eligible_without_period`=0, drift=0.
5. Validación contable de la cifra resultante vs F29 real.
6. Prod: aplicar sync fix + backfill + re-materializar + monitor.

### Out-of-band coordination required

Validación con contador de (a) la regla de derivación del período y (b) la cifra de IVA resultante vs F29 real, antes de baseline productivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El sync de Nubox estampa `period_year`/`period_month` (+ `tax_period`) derivado de la fecha del documento con el calendario operativo canónico.
- [ ] Documentos nuevos de Nubox nacen con período (test + sync run de prueba).
- [ ] Backfill idempotente con dry-run aplicado a los 165 docs existentes.
- [ ] `finance.vat.eligible_without_period`=0 post-backfill.
- [ ] VAT re-materializado: `finance.vat.position_drift`=0, crédito fiscal completo en el F29.
- [ ] Regla de período + cifra resultante validadas con contador.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- `pnpm pg:connect:shell` — dry-run del backfill + verificación de signals
- `pnpm staging:request` del sync Nubox + del VAT endpoint
- `pnpm worker:runtime-deps-gate` si toca worker-bundled

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta + `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` si cambia el contrato del sync
- [ ] ISSUE-103 movido a `resolved/` + tracker actualizado
- [ ] chequeo de impacto cruzado (TASK-725/1185)

## Follow-ups

- Revisar si otros campos del sync Nubox también quedan NULL sistemáticamente.

## Open Questions

- ¿La regla SII de imputación del crédito fiscal es "mes del documento" o "mes de recepción/registro"? Define la derivación (Slice 1, validar con contador).
- ¿El backfill debe respetar la ventana de 2 períodos del SII para crédito tardío, o estampar siempre el mes del documento? Validar con contador.
