# TASK-1209 — Nubox Export Invoice Automatic Income Projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P1.1`
- Domain: `finance|integrations.nubox|sync|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1209-nubox-export-invoice-automatic-income-projection`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-06-20 — Recalibración de causa raíz (pre-ejecución, verificada contra PG+BQ)

La hipótesis original de esta spec (cliente no resoluble / `!sale.client_id` skip silencioso / foreign plane faltante) quedó **desactualizada** tras el Discovery de Slice 1. Causa raíz **real y verificada**:

- En conformed (`greenhouse_conformed.nubox_sales`) existen **dos** facturas de exportación Berel: `28800562` (folio 1, CLP 4.617.647) y `29062197` (folio 51, CLP 4.463.462). El **latest conformed de ambas ya trae `organization_id` Y `client_id` resueltos** → NO se saltan por identidad.
- Cada sync diario las intenta y falla con `totalAmount does not match the resolved tax snapshot (0)` (26 fallos en `source_sync_failures`, código genérico `nubox_postgres_projection_failed`; la corrida queda `partial`, **no** silenciosa).
- El bug es genérico de **documentos exentos**, no específico de export/Berel: una factura de exportación es 100% exenta (`net_amount=0`, `exempt_amount=total`). `buildIncomeTaxWriteFields` computa `expectedTotal = subtotal(afecto) + IVA` e **ignora el monto exento**, así que para un doc 100% exento `expectedTotal=0` y rechaza el total real. Verificado: **0 facturas exentas** se han proyectado jamás (PG income solo tiene DTE 33 afecto + 61); conformed tiene 6 docs exentos bloqueados (2×110, 1×34, 1×41, 2×61).

Impacto en el plan: **Slice 2 cambia de "enriquecer foreign plane / fallar visible por cliente" a "fix de causa raíz: contabilizar el monto exento en el total del income tax snapshot"** (identidad DTE CL `total = neto afecto + IVA + exento`). El snapshot de impuesto se mantiene tax-puro (lo lee `vat-ledger`); el exento se suma sólo al `total_amount` del income. Berel pasa a ser fixture de aceptación: con el fix, el sync recurrente lo proyecta solo. Slice 3 (signal + código estable) se mantiene como defensa-en-profundidad. Detalle del Audit en `Handoff.md`.

## Summary

Cierra la brecha operativa donde las facturas Nubox de exportación, como Grupo Berel, pueden existir en Nubox/conformed pero no materializarse en `greenhouse_finance.income`. El resultado esperado no es correr backfills manuales cada mes: cuando Nubox emite una factura mensual nueva, el sync/projection debe detectarla, resolver cliente/moneda/planos FX y escribir el AR canónico automáticamente.

## Why This Task Exists

El dashboard de Finanzas mostraba para junio 2026 solo la factura de Sky (`$6.902.000`) y omitía Grupo Berel. La causa verificada no fue la UI ni el reader mensual: `GET /api/finance/income/summary` suma `greenhouse_finance.income`, y en esa tabla solo existe Sky para junio.

El dry-run de `scripts/finance/task-990-berel-income-native-backfill.ts` confirmó:

- Nubox sale `28800562` / DTE 110 / folio 1 existe.
- Cliente: `PINTURAS BEREL SA DE CV`, RFC `PBE970101718`.
- Emisión: `2026-06-01`, vencimiento: `2026-07-01`.
- Native: `89.960 MXN`.
- Functional: `4.617.647 CLP`.
- `Income row BEFORE: (no income row)`.

TASK-990 construyó el soporte MXN y el backfill allowlisted para el caso histórico, pero quedó `code-complete / rollout pendiente`. Eso no basta para un cliente con facturación mensual: el flujo recurrente debe entrar por el pipeline Nubox normal, no por scripts por cliente.

## Goal

- Hacer que toda factura Nubox de exportación emitida para un cliente completo se proyecte automáticamente a `greenhouse_finance.income` desde el sync canónico.
- Usar Berel como fixture inicial y reparación one-shot del documento histórico, sin crear lógica recurrente específica de Berel.
- Garantizar idempotencia: re-sync mensual o retry nunca duplica AR.
- Exponer señales de reliability para facturas Nubox exportadas no proyectadas, clientes no resolubles, foreign plane faltante y projection failures.
- Verificar que el siguiente ciclo Nubox mensual materializa nuevas facturas sin intervención manual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNTING_VOCABULARY_V1.md`
- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md`
- `docs/tasks/complete/TASK-992-client-lifecycle-orchestrator-single-front-door.md`

Reglas obligatorias:

- `greenhouse_finance.income` representa factura emitida / AR devengado, no caja.
- Nubox emitido es el source-of-truth de facturación fiscal/AR; Greenhouse no inventa facturas recurrentes si Nubox no las emitió.
- La proyección recurrente vive en el sync Nubox canónico (`readConformedSales` -> `upsertIncomeFromSale`), no en scripts por cliente.
- Berel puede tener una reparación one-shot para la factura ya emitida y huérfana, pero las facturas futuras deben entrar solas por sync.
- No hardcodear `Grupo Berel`, `28800562` ni MXN en el flujo recurrente; usarlos solo como fixture/evidencia de aceptación.
- No recomputar el CLP funcional de la factura MXN: usar el CLP legal/documental que trae Nubox/SII y snapshotear FX como evidencia.
- No marcar como `ok` una corrida donde una factura de exportación válida quedó sin income; debe quedar en `source_sync_failures` y/o reliability signal.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/nubox/dte-foreign-currency.ts`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/finance/multi-currency/flags.ts`
- `src/lib/finance/multi-currency/fx-snapshot-store.ts`
- `src/lib/reliability/queries/multi-currency-fx-signals.ts`
- `scripts/finance/task-990-berel-income-native-backfill.ts`
- `scripts/finance/task-990-berel-income-native-dryrun.ts`
- `greenhouse_conformed.nubox_sales`
- `greenhouse_finance.income`
- `greenhouse_finance.client_profiles`
- `greenhouse_core.organizations`
- `greenhouse_core.clients`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.source_sync_failures`

### Blocks / Impacts

- Corrige la base devengada visible en Finanzas para clientes MXN/export.
- Reduce falsos `Facturación del mes` incompletos en `/finance`.
- Alimenta F29/PPM/VAT/management accounting con facturación real emitida.
- Desbloquea close-readiness AR más honesto en `TASK-1205`.
- Complementa `TASK-1206`: Q2C gobierna cierres comerciales; Nubox sync gobierna facturas fiscales emitidas desde Nubox.

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/nubox/dte-foreign-currency.ts`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/finance/multi-currency/`
- `src/lib/reliability/queries/multi-currency-fx-signals.ts`
- `src/lib/reliability/queries/`
- `scripts/finance/task-990-berel-income-native-backfill.ts`
- `scripts/finance/task-990-berel-income-native-dryrun.ts`
- `services/ops-worker/`
- `migrations/` if additive DDL is required after Plan Mode
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `readConformedSales(projectId)` reads conformed Nubox sales.
- `upsertIncomeFromSale(sale)` is the canonical PG writer for Nubox income projection.
- `syncNuboxToPostgres` records `postgres_projection` runs and can record per-document projection failures.
- TASK-990 added MXN finance-core support, native/functional/reporting planes, FX snapshots and signals.
- `parseDteForeignCurrencyXml` can extract the foreign plane from SII XML for export DTEs.
- Berel identity/client profile exists in runtime data and the dry-run resolves the invoice payload.

### Gap

- Berel invoice `28800562` is present in Nubox/conformed evidence but absent from `greenhouse_finance.income`.
- The existing Berel script is an allowlisted historical repair, not the monthly operating model.
- There is no proven recurring acceptance gate that says: "new Nubox export invoice emitted -> next sync creates income automatically."
- Current reliability catches some MXN plane drift after an income row exists, but it does not fully fail the pipeline when a valid Nubox export sale never becomes income.
- If a client is incomplete or the foreign plane cannot be sourced, the failure must be visible and actionable rather than silently skipped.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_conformed.nubox_sales` -> `greenhouse_finance.income`
- Consumidores afectados: Finance dashboard, AR/readers, F29/PPM fiscal materializers, Cost Intelligence, Nexa finance readers, reliability overview
- Runtime target: `local`, `staging`, `production`, `worker`, `cron`

### Contract surface

- Contrato existente a respetar: `readConformedSales`, `upsertIncomeFromSale`, `parseDteForeignCurrencyXml`, `source_sync_runs`, `source_sync_failures`, multi-currency FX snapshots.
- Contrato nuevo o modificado: recurrent Nubox export invoice projection contract:

```ts
projectNuboxExportInvoiceToIncome({
  nuboxSaleId,
  sourceRunId,
  actor: 'nubox_sync',
  mode: 'scheduled' | 'manual_retry',
})
```

- Backward compatibility: compatible; existing CLP invoices and non-export documents keep current behavior.
- Full API parity: no aplica como capability humana directa; this is a provider sync/materialization contract. Manual retry, if added or touched, must be exposed through the governed sync boundary from `TASK-1194`, not a UI-only button.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_conformed.nubox_sales`, `greenhouse_finance.income`, `greenhouse_sync.source_sync_runs`, `greenhouse_sync.source_sync_failures`, `greenhouse_finance.fx_snapshots`.
- Invariantes que no se pueden romper:
  - A valid emitted Nubox invoice for a resolvable client creates or updates exactly one `greenhouse_finance.income` row.
  - Re-running the same Nubox sale is idempotent by `nubox_document_id`/source id and never duplicates AR.
  - Export DTEs 110/111/112 preserve native amount/currency and legal CLP functional amount.
  - Existing CLP invoice projection remains bit-for-bit compatible except for additive metadata/signal improvements.
  - Missing client, missing RFC disposition, missing foreign plane or stale FX never silently "succeeds"; it records an actionable failure.
  - Monthly Berel invoices are not inferred. They only enter once Nubox emits them and conformed/raw evidence exists.
- Tenant/space boundary: derive organization/client via canonical tax identity/client lifecycle; do not match by display name as authority.
- Idempotency/concurrency: upsert by source object / `nubox_document_id`, advisory or transaction guard if needed, retries return `updated`/`skipped` instead of duplicate.
- Audit/outbox/history: keep `source_sync_runs` and `source_sync_failures`; preserve `finance.income.created` outbox/event semantics when a new income row is created.

### Migration, backfill and rollout

- Migration posture: prefer none; additive DDL only if failure classification or idempotency evidence needs durable fields.
- Default state: gated by existing MXN/export flags until staging smoke proves readiness.
- Backfill plan: one-time allowlisted repair for already-emitted Berel invoice `28800562`, preceded by dry-run and followed by dashboard/income verification. This is not the recurring model.
- Rollback path: disable flags/revert projection changes; any created Berel income is reversed/superseded through finance-approved repair, not blind delete.
- External coordination: Finance/operator sign-off before applying the historical Berel repair or flipping production flags/workers.

### Security and access

- Auth/access gate: scheduled worker/cron service boundary; any manual retry must use the governed finance sync/materializer boundary from `TASK-1194`.
- Sensitive data posture: finance AR, tax ids/RFC/RUT, client billing; do not leak raw tax identifiers in user-facing errors.
- Error contract: canonical projection failure codes such as `nubox_export_client_unresolved`, `nubox_export_foreign_plane_missing`, `nubox_export_fx_snapshot_missing`, `nubox_income_projection_failed`.
- Abuse/rate-limit posture: provider sync bounded by existing Nubox cron cadence; manual retries require allowlist, dry-run and actor/reason.

### Runtime evidence

- Local checks: focused tests for export invoice projection, idempotent retry, missing client, missing foreign plane and CLP regression.
- DB/runtime checks: read-only SQL proving Berel absent before repair; after apply, one row with `nubox_document_id=28800562`, `native_amount=89960`, `native_currency='MXN'`, `total_amount_clp=4617647`, `payment_status='pending'`.
- Integration checks: staging Nubox sync/projection run over a period containing Berel or controlled export fixture.
- Reliability signals/logs: `finance.nubox_export.unprojected_invoice`, existing `finance.nubox_export.foreign_amount_missing`, `finance.fx.snapshot_missing`, `finance.multi_currency.native_equivalent_drift`, `finance.nubox.source_freshness`.
- Production verification sequence: dry-run -> gated apply historical Berel -> verify dashboard total -> next scheduled/monthly Nubox emission smoke -> signal steady.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] No aplica para la proyección calendarizada en sí: esta task no introduce una acción humana de negocio, endurece un contrato de sync de proveedor.
- [ ] If a manual retry command is introduced or modified, it is governed through server-side command/capability, idempotency, actor/reason, audit and canonical errors.
- [ ] No UI-only recovery path is introduced.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Projection path discovery and runtime gap proof

- Re-run read-only DB checks for Berel and all export DTEs 110/111/112 in `greenhouse_conformed.nubox_sales`.
- Map which export invoices are conformed, which have matching org/client, and which are missing `greenhouse_finance.income`.
- Confirm exact behavior of `syncNuboxToPostgres` when `upsertIncomeFromSale` returns `skipped`.
- Confirm current flag state for `FINANCE_CORE_MXN_ENABLED` and `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED` in local/staging/worker environments.

### Slice 2 — Recurring projection hardening

- Ensure the scheduled Nubox postgres projection enriches export DTEs with the foreign plane before calling `upsertIncomeFromSale`.
- Ensure `upsertIncomeFromSale` fails visibly for valid export invoices that cannot project, instead of silently skipping.
- Preserve CLP legacy behavior and existing income fiscal-period stamping.
- Add or strengthen tests for export DTE projection, missing client, missing foreign plane and idempotent retry.

### Slice 3 — Reliability signal and retry/run evidence

- Add `finance.nubox_export.unprojected_invoice` or equivalent signal that detects export invoices in conformed Nubox with no matching `income`.
- Ensure `source_sync_failures` receives stable error codes and payload context for unresolved export projection failures.
- Add a read-only diagnostic script or extend existing dry-run to report all unprojected export invoices by period/client, not only Berel.
- Wire the signal into the reliability overview if needed.

### Slice 4 — Historical Berel repair as one-time rollout

- Run Berel dry-run and verify payload before mutation.
- Apply the existing allowlisted repair for `28800562` only after explicit Finance/operator sign-off and required flags.
- Verify one `greenhouse_finance.income` row with native MXN + functional CLP + pending payment status.
- Verify June 2026 Finance dashboard/source summary rises from Sky-only `$6.902.000` to Sky+Berel `$11.519.647`.

### Slice 5 — Monthly forward smoke and worker rollout

- Redeploy or verify the worker bundle/environment that runs Nubox postgres projection.
- Run a controlled staging/prod smoke over a period containing an emitted export invoice.
- Document the forward invariant: future Berel monthly invoices enter only when Nubox emits them, through the recurring sync.
- Update architecture docs and handoff with the verified run ids, signals and rollback posture.

## Out of Scope

- No UI changes in this task.
- No synthetic recurring invoice generation inside Greenhouse.
- No per-client monthly scripts for Berel.
- No manual creation of future Berel income rows before Nubox emits the invoice.
- No broad redesign of Q2C; coordinate commercial close semantics with `TASK-1206`.
- No cash settlement/collection recording for Berel; that happens when payment arrives and belongs to AR/cash operations.

## Detailed Spec

The intended operating model is:

```text
Nubox emits monthly invoice
  -> raw/conformed Nubox sales evidence exists
  -> postgres_projection reads conformed sale
  -> export DTE foreign plane is sourced from SII XML / conformed enrichment
  -> org/client resolves by canonical tax identity / lifecycle
  -> upsertIncomeFromSale writes or updates greenhouse_finance.income
  -> finance.income.created outbox/event emitted for new income
  -> dashboard/readers/fiscal materializers consume the income row
  -> reliability is ok
```

If any precondition fails, the pipeline must produce a visible failure:

- client unresolved -> `nubox_export_client_unresolved`
- foreign plane missing -> `nubox_export_foreign_plane_missing`
- FX snapshot missing/stale -> `nubox_export_fx_snapshot_missing`
- writer failure -> `nubox_income_projection_failed`

Berel `28800562` is the acceptance fixture for the already-emitted historical invoice. It is not a code branch.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Do not apply the historical Berel repair before recurring projection behavior and failure visibility are understood.
- Do not flip production recurring behavior without staging/worker verification.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Future invoices require manual backfill again | finance sync | high | recurring projection contract + forward smoke | `finance.nubox_export.unprojected_invoice` |
| Duplicate AR on retry | finance AR | medium | idempotent upsert by Nubox document/source id + concurrency test | duplicate income diagnostic |
| Export invoice flattened to CLP-only | multi-currency finance | medium | foreign-plane enrichment before writer + native drift signal | `finance.nubox_export.foreign_amount_missing` |
| Valid invoice skipped because client incomplete | client lifecycle | medium | failure row + signal + actionable reason | `nubox_export_client_unresolved` |
| Historical repair mutates wrong row | finance data | low-medium | allowlist sale id + dry-run + expected row count + sign-off | before/after SQL |
| Worker has code/env drift from local | ops-worker | medium | redeploy/verify revision + source_sync_runs evidence | `finance.nubox.source_freshness` |

### Feature flags / cutover

- Existing flags: `FINANCE_CORE_MXN_ENABLED`, `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`, `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED`.
- Recurring projection should remain controlled by the existing MXN/export flags until staging smoke is green.
- One-time Berel historical repair requires `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED=true` and explicit actor/reason.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Read-only; sin mutación. Si el diagnóstico se publica con datos erróneos, corregir el reporte y repetir queries; no hay estado runtime que revertir. | inmediato | si |
| Slice 2 | Disable flags / revert projection change before next cron | <15 min | si |
| Slice 3 | Revert signal/query or leave as warning-only | <10 min | si |
| Slice 4 | Finance-approved supersede/reprojection from dry-run evidence; no blind delete | variable | parcial |
| Slice 5 | Revert worker revision or turn flags off and redeploy | <30 min | si |

### Production verification sequence

1. Run read-only diagnostic: export invoices conformed vs projected income.
2. Deploy projection/signal changes with flags in safe state.
3. Enable staging flags and run projection over controlled period.
4. Verify `source_sync_runs`, `source_sync_failures`, `income`, FX snapshots and reliability signals.
5. Apply Berel historical repair only with sign-off.
6. Verify finance summary/dashboard source totals.
7. Monitor next scheduled Nubox emission/sync; confirm new invoices enter without per-client script.

### Out-of-band coordination required

- Finance/operator approval is required before applying the historical Berel repair in any shared/prod-like database.
- Worker env/redeploy coordination is required before declaring recurring automation operationally complete.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] A recurring Nubox postgres projection path automatically materializes valid export invoices into `greenhouse_finance.income`.
- [ ] Berel historical invoice `28800562` is repaired once, with native `89.960 MXN`, functional `4.617.647 CLP`, due date `2026-07-01`, `payment_status='pending'` and no duplicate income rows.
- [ ] Future Berel invoices are explicitly covered by the recurring sync contract, not by a Berel-specific script.
- [ ] Invalid or incomplete export invoices produce actionable `source_sync_failures` and reliability signals.
- [ ] The Finance monthly facturación source includes Sky + Berel after historical repair. **Cifra recalibrada 2026-06-20:** apareció una 2ª factura Berel (`29062197`, folio 51, CLP 4.463.462) en conformed, así que el total junio 2026 esperado es **`$15.983.109`** (Sky 6.902.000 + Berel 4.617.647 + 4.463.462), no el `$11.519.647` original.
- [ ] CLP-only income projection remains compatible and covered by regression tests.
- [ ] Worker/runtime evidence proves the deployed sync path contains the projection changes and the required flags/env.
- [ ] No UI-only or manual-only operating path is introduced.

## Verification

- `pnpm test src/lib/nubox`
- `pnpm test src/lib/reliability/queries/multi-currency-fx-signals.test.ts`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm task:lint --task TASK-1209`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --runtime --data --docs`
- Read-only SQL:
  - conformed export invoices with no income row
  - Berel `nubox_document_id=28800562` before/after
  - June 2026 income total by client
  - `source_sync_runs` / `source_sync_failures` for `postgres_projection`
- Staging/prod smoke: run or observe Nubox projection and verify no unprojected export invoice signal remains.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` documenta el contrato recurrente si cambia el pipeline
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` documenta la evidencia de cierre si cambia la semántica operativa

## Follow-ups

- **Simetría exento en expenses (compras).** `src/lib/finance/expense-tax-snapshot.ts:431` tiene el mismo patrón que el bug de income corregido en Slice 2 (`expectedTotalAmount = snapshot.totalAmount` sin sumar el exento). Las compras 100% exentas (DTE 34 de proveedor, etc.) podrían rechazarse igual. Fuera del scope income/AR de esta task; crear task derivada para el lado expense.
- API/governed manual retry surface only if `TASK-1194` does not already cover the needed finance sync retry boundary.
- Cash settlement of Berel payment when funds arrive in the Global66 MXN account.
- Broader multi-country export invoice fixtures beyond Berel if another non-CLP finance-core client appears.

## Open Questions

- Debe el cron mensual/hot lane de Nubox reducir latencia para facturas emitidas, o basta el full ETL diario para el SLA de facturación?
- Cual será el owner operativo que revisa `finance.nubox_export.unprojected_invoice` cuando el error sea cliente incompleto vs Nubox/FX?
