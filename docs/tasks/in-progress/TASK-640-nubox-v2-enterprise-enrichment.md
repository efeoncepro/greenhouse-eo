# TASK-640 — Nubox V2 Enterprise Enrichment Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `optional`
- Status real: `Slice 1 discovery/plan`
- Rank: `TBD`
- Domain: `finance`, `data`, `ops`
- Blocked by: `none for Slice 1; runtime slices depend on TASK-212 / TASK-399 / child tasks`
- Branch: `task/TASK-640-nubox-v2-enterprise-enrichment`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Coordinar Nubox V2 como programa enterprise para traer el grafo completo de documentos, detalles, referencias, pagos/cobros, impuestos, maestros fiscales y hot lanes adicionales sin romper el contrato actual. El programa no reemplaza el ETL existente: lo extiende sobre la topologia canonica `Nubox API -> BigQuery raw -> BigQuery conformed -> PostgreSQL projections -> UI/events`.

## Why This Task Exists

Greenhouse ya sincroniza Nubox para ventas, compras, movimientos bancarios, saldos, PDF/XML y cotizaciones. El incidente de frescura de cotizaciones y el cierre de Secret Manager dejaron resuelta la base operativa, pero todavia hay brechas enterprise:

- los documentos se leen mayormente como headers, sin grafo completo de lineas y referencias
- los cobros/pagos Nubox no estan plenamente reconciliados como grafo de liquidacion contra documentos
- la informacion tributaria avanzada de Nubox todavia no alimenta toda la posicion IVA con fidelidad fiscal
- clientes/proveedores Nubox pueden enriquecer identidad, pero no deben convertirse en writer ciego del modelo canonico
- solo cotizaciones tienen hot lane liviana; facturas, compras, saldos y movimientos siguen dependiendo del full ETL diario

Sin un programa coordinado, el equipo corre el riesgo de sumar endpoints Nubox de forma puntual y crear nuevos drift paths entre raw, conformed, Postgres, Finance UI y eventos.

## Goal

- Convertir Nubox en una fuente enterprise-grade para quote-to-cash, procure-to-pay y tax operations.
- Mantener el contrato robusto source-led: raw durable, conformed normalizado, proyecciones Postgres idempotentes y observabilidad por etapa.
- Reutilizar y coordinar tasks existentes (`TASK-212`, `TASK-224`, `TASK-399`, `TASK-531`, `TASK-532`, `TASK-533`) en vez de duplicarlas.
- Dejar slices ejecutables para detalles/referencias, pagos/cobros, IVA avanzado, maestros fiscales, documentos persistidos y hot lanes.

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
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- Nada escribe directo a Finance desde Nubox sin evidencia previa en raw/conformed, salvo comandos outbound ya existentes y auditados de emision.
- `raw` es append-only y preserva el payload fuente completo.
- `conformed` opera como snapshot normalizado y los readers resuelven latest-by-source-id.
- Las proyecciones Postgres son idempotentes por `nubox_*_id`, `source_system` y/o claves canonicas de documento.
- Ventas/compras Nubox son documentos/devengo; cobros/pagos reales viven en ledgers de pago/caja.
- Los maestros Nubox enriquecen identidad por RUT, pero no reemplazan `greenhouse_core.organizations`, `clients`, `spaces` ni `greenhouse_finance.suppliers` como roots canonicos.
- Los secretos Nubox deben resolverse por Secret Manager en todos los ambientes (`NUBOX_BEARER_TOKEN_SECRET_REF`, `NUBOX_X_API_KEY_SECRET_REF`).

## Normative Docs

- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`
- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md`
- `docs/tasks/to-do/TASK-399-native-integrations-runtime-hardening-source-adapters-control-plane-replay.md`
- `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/complete/TASK-532-purchase-vat-recoverability.md`
- `docs/tasks/complete/TASK-533-chile-vat-ledger-monthly-position.md`
- `docs/tasks/complete/CODEX_TASK_Nubox_DTE_Integration.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/documentation/finance/iva-compras-recuperabilidad.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Dependencies & Impact

### Depends on

- Pipeline Nubox actual:
  - `src/lib/nubox/client.ts`
  - `src/lib/nubox/types.ts`
  - `src/lib/nubox/mappers.ts`
  - `src/lib/nubox/sync-nubox-raw.ts`
  - `src/lib/nubox/sync-nubox-conformed.ts`
  - `src/lib/nubox/sync-nubox-to-postgres.ts`
  - `src/lib/nubox/sync-nubox-quotes-hot.ts`
  - `src/app/api/cron/nubox-sync/route.ts`
  - `src/app/api/cron/nubox-quotes-hot-sync/route.ts`
  - `src/app/api/cron/nubox-balance-sync/route.ts`
- Existing Finance ledgers and projections:
  - `greenhouse_finance.income`
  - `greenhouse_finance.expenses`
  - `greenhouse_finance.income_payments`
  - `greenhouse_finance.expense_payments`
  - `greenhouse_finance.quotes`
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_failures`
- `TASK-212` for line items and multiline emission scope.
- `TASK-399` for reusable integration runtime hardening.

### Blocks / Impacts

- Quote-to-cash document graph and quotation lineage.
- Procure-to-pay, supplier payments and payable aging.
- VAT monthly position and Finance tax data quality.
- Finance document detail surfaces for income, expenses and quotes.
- HubSpot invoice mirror artifact attachment follow-ups.
- Admin/Ops visibility for Nubox freshness and replay.

### Files owned

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `src/lib/nubox/**`
- `src/app/api/cron/nubox-*`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/vat-ledger.ts`
- `src/lib/finance/income-hubspot/**`
- `src/lib/storage/greenhouse-media.ts`
- `src/app/api/finance/**`
- `services/ops-worker/**`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/**`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Nubox client with Secret Manager-backed credentials and shared fetch/retry logic.
- Full daily ETL over `/sales`, `/purchases`, `/expenses`, `/incomes`.
- Hot sync every 15 minutes for Nubox quotes (`COT` / DTE 52).
- Raw BigQuery snapshots for sales, purchases, expenses and incomes.
- Conformed BigQuery snapshots for sales, purchases and bank movements.
- Postgres projections into Finance `income`, `expenses`, `quotes` and payment-related structures.
- Balance sync lane that updates `balance_nubox` for income and expenses.
- PDF/XML download proxies for DTE documents.
- VAT foundations for income, purchases and monthly position.
- `income_line_items` and `quote_line_items` tables already exist, but Nubox does not feed them yet.
- Income-side Nubox bank movements already write through `recordPayment()` into `income_payments`.
- `expense_payments`, `settlement_groups`, `settlement_legs`, `vat_ledger_entries`, `vat_monthly_positions`, `greenhouse_core.assets` and `quote_pdf_assets` already exist as reusable foundations.
- Canonical quotation bridge now also syncs legacy finance quotes into `greenhouse_commercial.quotations`.

### Gap

- Document details and references are not modeled as a first-class graph across raw, conformed, Postgres and UI.
- `TASK-212` covers line items, but the broader document graph also needs references, artifacts, lineage and replay controls.
- Bank movements from Nubox are available. Income-side is mostly canonical through `recordPayment()`, but expense-side still marks documents paid directly instead of writing through `recordExpensePayment()` and settlement legs.
- Advanced tax fields from Nubox purchases are partially promoted through TASK-531/TASK-532/TASK-533; the remaining gap is Nubox-specific tax graph, line/reference fidelity and data quality comparison against Nubox/SII evidence.
- Nubox client/supplier master data enrichment needs a governed policy to avoid overwriting canonical Greenhouse identities.
- Additional hot lanes for invoices, purchases, balances and bank movements do not yet exist.
- PDF/XML persistence in GCS is not yet a canonical durable artifact flow for Nubox.
- `docs/architecture/schema-snapshot-baseline.sql` is stale for Finance/Nubox recent runtime. Treat migrations and runtime code as the real source for recent tables/columns until the snapshot is regenerated.

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

### Slice 1 — Program Discovery & Gap Confirmation

- Auditar endpoints Nubox realmente disponibles en la New API usada por `src/lib/nubox/client.ts`.
- Confirmar qué gaps ya están cubiertos por `TASK-212`, `TASK-399`, `TASK-224`, `TASK-531`, `TASK-532` y `TASK-533`.
- Producir `docs/tasks/plans/TASK-640-plan.md` con secuencia de child tasks o slices ejecutables.
- Marcar explícitamente qué se implementa aquí y qué se delega a tasks existentes.

### Slice 2 — Document Graph Foundation

- Modelar detalles, referencias y relaciones documentales Nubox como grafo.
- Extender raw/conformed para detalles y referencias sin perder replay.
- Proyectar a Postgres con idempotencia y lineage:
  - cotizacion Nubox -> factura
  - factura -> nota de credito/debito
  - documento -> PDF/XML/artifacts
- Coordinar con `TASK-212` para line items en vez de duplicar su scope.

### Slice 3 — Durable PDF/XML Artifact Persistence

- Persistir PDF/XML Nubox en GCS usando el registry canonico de assets.
- Vincular artifacts a `income`, `expenses`, `quotes` y/o grafo documental.
- Mantener links Nubox como metadata, no como fuente durable unica.
- Preparar evento/adapter para attachment downstream en HubSpot invoice/deal/company.

### Slice 4 — Payment Graph & Reconciliation

- Promover `incomes` y `expenses` Nubox bancarios a un grafo de cobros/pagos reconciliables.
- Reconciliar contra `income_payments` y `expense_payments` con soporte de pagos parciales.
- Exponer aging, balance, discrepancias y status de conciliacion.
- Mantener clara la semantica documento/devengo vs caja definida por `TASK-224`.

### Slice 5 — Tax Graph & VAT Enrichment

- Promover campos fiscales avanzados de Nubox a snapshots tributarios canonicos:
  - IVA recuperable
  - IVA no recuperable
  - activo fijo
  - uso comun
  - exento/no afecto
- Conectar con `vat-monthly-position` y data quality.
- No recalcular impuestos fuera de los helpers canonicos de Finance.

### Slice 6 — Master Data Enrichment Policy

- Definir politica de enrichment para clientes y proveedores Nubox por RUT.
- Separar campos Greenhouse-owned vs Nubox-observed.
- Persistir source links o metadata cuando aplique sin reescribir roots canonicos.
- Crear reportes de drift/enrichment candidates para revision humana cuando el cambio sea riesgoso.

### Slice 7 — Additional Hot Lanes

- Agregar hot lanes livianas para:
  - facturas emitidas recientes
  - compras recientes
  - saldos recientes
  - cobros/pagos recientes
- Mantener full ETL diario como safety net.
- Usar advisory locks, ventanas configurables, source_sync_runs y source_sync_failures.

### Slice 8 — Ops, Replay & Promotion

- Agregar runbooks de replay/backfill por periodo, objeto y etapa.
- Exponer freshness por raw/conformed/projection en surfaces operativas existentes.
- Definir criterios de promotion para declarar Nubox V2 enterprise-grade.
- Evaluar si lanes pesadas deben moverse a `ops-worker` por tiempo/costo.

## Out of Scope

- Reemplazar Nubox como sistema de emision tributaria.
- Migrar la contabilidad legal completa fuera de Nubox.
- Inventar un catalogo de productos Nubox cuando la API solo entrega descripciones de line items.
- Reescribir todos los conectores nativos; eso pertenece a `TASK-399`.
- Mezclar cambios visuales grandes de Finance que no dependan de Nubox V2.
- Automatizar notas de credito por reliquidacion de Payroll; eso pertenece al programa de Payroll.

## Detailed Spec

### Contracto de flujo

```text
Nubox API
  -> source adapter (auth, retry, pagination, rate-limit, timeout)
  -> sync planner (hot window, historical sweep, replay)
  -> BigQuery raw snapshots (append-only)
  -> BigQuery conformed snapshots (latest-by-source-id)
  -> PostgreSQL projections (idempotent by Nubox/source id)
  -> UI / events / downstream mirrors
```

### Promocion de datos

- `raw` conserva payloads fuente y evidencia de ingesta.
- `conformed` normaliza tipos, RUTs, folios, status, montos, fechas y relaciones.
- `Postgres` conserva el grafo operacional para Finance, documentos, pagos, impuestos y UX.
- `assets` en GCS/PG conservan PDF/XML durables.
- `source_sync_runs` y `source_sync_failures` son obligatorios para cada etapa nueva.

### Observabilidad minima

Cada lane nueva debe reportar:

- `records_read`
- `records_written_raw`
- `records_written_conformed`
- `records_written_projection`
- `watermark_start_value`
- `watermark_end_value`
- `source_object_type`
- `status`
- errores clasificados (`auth`, `rate_limit`, `transient`, `schema_drift`, `fatal`)

### Semantica financiera

- Sales/purchases Nubox son documentos.
- Incomes/expenses Nubox bancarios son movimientos de caja.
- `balance_nubox` es señal de estado fuente, no sustituto automatico de payment ledger.
- Payment ledgers deben poder explicar diferencias entre Greenhouse y Nubox.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un plan aprobado para Nubox V2 con slices/child tasks y sin duplicar `TASK-212` ni `TASK-399`.
- [ ] Document graph Nubox queda definido con detalles, referencias, artifacts y lineage.
- [ ] Payment graph Nubox queda definido con reconciliacion contra ledgers de cobro/pago y soporte de parciales.
- [ ] Tax graph Nubox queda definido sobre snapshots tributarios canonicos y VAT monthly position.
- [ ] Master data enrichment queda gobernado por politica de ownership y source links.
- [ ] Hot lanes adicionales quedan definidas con ventanas, locks, replay y observabilidad.
- [ ] Cada implementacion mantiene `raw -> conformed -> Postgres`, idempotencia y source_sync tracking.
- [ ] Documentacion funcional de Finance queda actualizada para los flujos visibles.

## Verification

- Revision documental contra:
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- Cuando se implementen child slices:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build` o `npx tsc --noEmit --pretty false`
  - replay manual por periodo usando scripts operativos Nubox
  - verificacion de `source_sync_runs` y `source_sync_failures`
  - smoke de Finance para income, expenses, quotes y payments

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Se actualizaron o cerraron las child tasks derivadas (`TASK-212` y nuevas tasks que nazcan de este programa)

## Follow-ups

- `TASK-662` — Nubox Document Graph Foundation.
- `TASK-663` — Nubox Durable PDF/XML Artifact Persistence.
- `TASK-664` — Nubox Payment Graph & Expense Ledger Reconciliation.
- `TASK-665` — Nubox Tax Graph & VAT Data Quality Enrichment.
- `TASK-666` — Nubox Master Data Enrichment Governance.
- `TASK-667` — Nubox Additional Hot Lanes.
- `TASK-668` — Nubox Ops Replay & Enterprise Promotion.

## Open Questions

- Que endpoints adicionales de la New API Nubox estan habilitados para referencias documentales y detalles de compras?
- Cual es el rate limit efectivo de Nubox para calls detail-heavy?
- Deben los artifacts PDF/XML historicos backfillearse para todo el historico o solo desde una fecha de corte?
- Que nivel de reconciliacion automatica es aceptable antes de requerir revision humana?

## Delta 2026-04-26 — Slice 1 discovery cerrada

- Se confirmó que `TASK-640` no debe intentar implementar todo Nubox V2 en un solo lote. El corte actual cierra discovery, corrige supuestos y crea plan/child tasks ejecutables.
- Supuestos corregidos:
  - `schema-snapshot-baseline.sql` está stale para Finance/Nubox reciente.
  - line item tables existen, pero Nubox no las alimenta.
  - income-side payment graph ya usa `recordPayment`; el mayor gap de caja está en expense-side y settlement/document linkage.
  - VAT foundation ya existe por TASK-531/TASK-532/TASK-533; falta enriquecer evidencia Nubox y data quality.
- Plan canónico: `docs/tasks/plans/TASK-640-plan.md`.
