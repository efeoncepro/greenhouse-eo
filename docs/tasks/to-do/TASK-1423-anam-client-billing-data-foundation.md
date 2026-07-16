# TASK-1423 — ANAM Client Billing Data Foundation + No-Write Workbook Profiler

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseño`
- Rank: `1`
- Domain: `crm|hubspot|data`
- Blocked by: `none`
- Branch: `task/TASK-1423-anam-client-billing-data-foundation`

## Summary

Implementar la foundation tenant-scoped del servicio administrado de carga de facturación para clientes, usando ANAM como primer tenant y su workbook `Ticket facturación` como evidencia real. La task crea el contrato físico reusable `client_billing_*`, reutiliza los assets privados y el scan canónicos, implementa un parser/versionado y entrega un profiler/change plan sin escrituras HubSpot. ANAM es propietario del dato; Greenhouse es sólo control plane y nunca proyecta estas filas a su CRM o finanzas internas.

## Why This Task Exists

ANAM mantiene 16.898 hechos operativos de facturación fuera de HubSpot. El archivo permite conectar venta, unidad operativa, servicio prestado, referencias administrativas, estado e importe, pero cargarlo directamente produciría errores de identidad, mezcla de monedas, duplicación por asociaciones e interpretación incorrecta de filas como Tickets, Services o Invoices. La UI propuesta depende de un contrato server-side reproducible, aislado por cliente e idempotente; por eso el modelo/profiler precede a la superficie visible.

## Goal

- Materializar el modelo reusable y tenant-scoped definido en `client-billing-intake-data-model-spec-v1.md`.
- Reutilizar `greenhouse_core.assets`, scan/quarantine y `attachAssetToAggregate`; cero storage paralelo.
- Parsear los 22 campos del workbook con decimal/date semantics explícitas y raw evidence preservada.
- Producir un run no-write con conteos, montos por moneda, mediana/promedio, invoice grain, matching coverage y excepciones.
- Probar idempotencia, aislamiento A≠B y ausencia total de llamadas/escrituras HubSpot, CRM o Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/kortex/hubspot-as-a-service/client-billing-intake-data-model-spec-v1.md` — spec canónica de esta task.
- `docs/architecture/kortex/hubspot-as-a-service/anam-account-unit-billing-event-converged-model-2026-07-16.md` — grain Account Unit + Billing Event.
- `docs/architecture/kortex/hubspot-as-a-service/anam-monthly-billing-etl-operating-model-2026-07-16.md` — ejecución mensual, reconciliación y KPI grain.
- `docs/architecture/kortex/hubspot-as-a-service/anam-managed-billing-intake-ui-2026-07-16.md` — consumer UI futuro; no se implementa aquí.
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` y `TASK-173`/`TASK-721` — assets privados, scan y descarga gobernada.
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — schemas/grants sin DDL runtime.

Reglas obligatorias:

- ANAM es cliente/tenant y dueño del dato; sus clientes no son Companies de Efeonce.
- `space_id` proviene de la sesión y filtra todas las lecturas/escrituras; nunca se acepta desde input browser.
- La instalación/portal objetivo sale del dataset aprobado; nunca de un portal ID libre en el request.
- Cero llamadas HubSpot en esta task. Cero proyección a `greenhouse_crm`, Finance, Income o Account 360 internos.
- Una fila = Billing Event; Código ANAM = Account Unit; invoice number = agrupación, no Invoice V1.
- Monedas nunca se suman/median juntas; montos usan decimal, no `number` flotante como persistencia.
- El workbook real no se convierte en fixture versionado con PII; tests usan data sintética.

## Normative Docs

- `src/lib/storage/greenhouse-assets.ts`
- `src/lib/storage/asset-scan/gate.ts`
- `src/app/api/assets/private/route.ts`
- `src/lib/sync/reactive-run-tracker.ts` y `greenhouse_sync.source_sync_runs` como patrón de heartbeat, no como reemplazo del aggregate de importación.
- Workbook local de evidencia: `docs/architecture/kortex/hubspot-as-a-service/anam-source-attachments-2026-07-16/maria-paz-haeger/2026-07-01_ticket-facturacion.xlsx`.

## Dependencies & Impact

### Depends on

- Shared private-assets runtime y asset-scan ya implementados.
- Instalación Kortex de ANAM conocida, sin usarla todavía para writes.
- Aprobación explícita del operador para perfilar localmente el workbook ya descargado; concedida en esta conversación.

### Blocks / Impacts

- Bloquea `TASK-1424` UI de carga/revisión.
- Bloquea la task futura de maker-checker + HubSpot batch upsert/readback.
- Entrega los conteos/gates que habilitarán después dashboards de facturación ANAM.

### Files owned

- `src/lib/client-billing/**` (nuevo dominio reusable, server-only salvo contratos browser-safe explícitos)
- `src/types/client-billing.ts` o contrato browser-safe equivalente decidido en Discovery
- `migrations/*task-1423-client-billing-data-foundation*.sql`
- `scripts/client-billing/profile-workbook.ts`
- fixtures sintéticos bajo `src/lib/client-billing/__fixtures__/`
- tests bajo `src/lib/client-billing/**/__tests__/`

## Current Repo State

### Already exists

- Asset registry privado, content-hash dedup, scan/quarantine y aggregate attachment.
- `source_sync_runs` para heartbeat operativo.
- Evidencia y análisis del workbook real: 16.898 IDs únicos, 22 columnas, siete statuses, tres monedas más un blank, 112 montos cero, invoice fan-out y outliers documentados.
- Modelo HubSpot propuesto Account Unit + Billing Event, todavía sin schema/record writes.

### Gap

- No existen dataset/run/raw/projection/crosswalk/exception tables tenant-scoped para este servicio.
- No existe parser versionado ni profiler reproducible sobre el workbook.
- No existe command/reader con full API parity para que la UI futura sea un consumer delgado.
- La arquitectura anterior hablaba de upload GCS directo; runtime debe reutilizar assets privados canónicos.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/client-billing/` + `greenhouse_sync.client_billing_*` + worker/CLI consumer del command canónico
- Future candidate home: `domain-package`
- Boundary: un command server-side perfila un private asset scan-cleared en un dataset tenant-scoped; UI, CLI, Nexa y sync HubSpot futuros consumen commands/readers, no reimplementan parsing.
- Server/browser split: parser, DB, asset reads y profiler son server-only; sólo DTOs de run/findings allowlisted podrán ser browser-safe.
- Build impact: dependencia XLSX ya existe en el repo; no agregar parser/SDK paralelo.
- Extraction blocker: transacción DB + asset registry + sesión/capabilities compartidas; una extracción futura debe preservar estos ports.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` por datos financieros, RUT, observaciones y futuro write CRM.
- Impacto principal: `migration`.
- Source of truth afectado: nuevo control plane `greenhouse_sync.client_billing_*`; source bytes siguen en `greenhouse_core.assets`/GCS privado y HubSpot permanece sin cambios.
- Consumidores afectados: CLI/profiler inicial; UI `TASK-1424`; futuro sync HubSpot; Reliability/Ops.
- Runtime target: local + dev PG; staging sólo después de evidencia y sin producción.

### Contract surface

- Contrato existente a respetar: `createPrivatePendingAsset`, `scanAndGatePrivateAsset`, `attachAssetToAggregate`, private asset authorization y `source_sync_runs` heartbeat.
- Contrato nuevo: `profileClientBillingWorkbook({ assetId, declaredPeriod, idempotencyKey })` y `readClientBillingImportRun({ importRunId })`; contexto autenticado resuelve space/dataset.
- Backward compatibility: aditivo; ningún consumer vigente cambia.
- Full API parity: command/reader canónicos primero; UI/CLI/Nexa son adapters. Esta task entrega CLI + primitive; endpoint/UI quedan en tasks dependientes.

### Data model and invariants

- Entidades: datasets, import runs, raw rows append-only, latest event projections, effective-dated identity crosswalks y exceptions.
- Invariantes: `space_id` requerido; dataset fija portal; source key = stable dataset key + source ID; raw append-only; exact decimal/date parsing; currency-separated aggregates; missing-in-snapshot nunca borra; no overlapping reviewed crosswalk periods.
- Tenant/space boundary: every query scopes by session-derived `space_id`; test A≠B obligatorio.
- Idempotency/concurrency: asset content hash + `(dataset, source_item_id)` + payload hash; idempotency key; claim/lock para impedir dos profiles simultáneos del mismo asset/dataset.
- Audit/outbox/history: run aggregate + `source_sync_runs` heartbeat; raw versions preservadas; no row payload/PII en generic logs.

### Migration, backfill and rollout

- Migration posture: `additive`, tablas/FKs/CHECKs/índices/grants explícitos; cero DDL runtime; down migration sólo mientras no existan production runs.
- Default state: capability no expuesta a UI y feature flag `CLIENT_BILLING_INTAKE_ENABLED=false` si Discovery confirma que requiere flag; registrar en ledger en el mismo cambio.
- Backfill plan: no backfill automático. El workbook actual se ejecuta como dry-run local/dev y produce evidencia, no HubSpot writes.
- Rollback path: flag/capability disabled + stop worker/CLI + revert code; conservar assets/runs durante investigación, sin DELETE destructivo.
- External coordination: aprobación posterior de ANAM para roles, retención, Código ANAM y reglas Finance.

### Security and access

- Auth/access gate: client-space membership + capabilities nuevas/read/write separadas decididas en Discovery; dataset/portal no vienen del request.
- Sensitive data posture: raw rows y observations sólo en readers autorizados; RUT/PII redacted en logs/errors; fixture real no se copia a tests.
- Error contract: stable rule/failure codes + canonical redacted response; parser failure no devuelve empty-success.
- Abuse/rate-limit: internal authenticated upload; size/type limits and one active profile per dataset/asset.

### Runtime evidence

- Local checks: parser fixtures + golden aggregate assertions + typecheck/lint/tests.
- DB/runtime checks: migrations up/down in isolated DB; idempotent second run; append-only guards; A≠B tenant test.
- Integration checks: current workbook profile reproduces verified manifest/counts/hash without HubSpot network calls.
- Reliability signals/logs: failed/stuck/quarantined run signals with steady state 0; logs only IDs/counts/codes.
- Production verification sequence: none in this task; production stays disabled.

### Acceptance criteria additions

- [ ] Network guard/test proves zero HubSpot calls during profile.
- [ ] SQL/code search and runtime evidence prove zero writes to Efeonce `greenhouse_crm`, Finance, Income or Account 360 tables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que tome esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reference parser + synthetic contract fixtures

- Implementar el header/schema contract de 22 columnas, parser decimal/date/string y normalization versioning.
- Crear fixture sintético que cubra todas las monedas/statuses, invoice fan-out, zero, invalid code/RUT/date y snapshot change; cero datos reales.
- Congelar golden aggregates del fixture y manifest esperado del workbook real como assertions de runtime, no como row fixture.

### Slice 2 — Tenant-scoped control-plane schema

- Migración aditiva para datasets, runs, raw rows, projections, crosswalks y exceptions según la spec.
- FKs a `greenhouse_core.assets` y `source_sync_runs`; CHECKs/state machines; append-only/uniqueness/idempotency indices; grants estrechos.
- Dataset ANAM de dev/config controlado con target portal assertion `19893546`; nunca portal libre en command input.

### Slice 3 — Canonical no-write command + reader

- Implementar profile command y run reader; attach del asset sólo tras scan clearance.
- Persistir raw/conformed/findings y change-plan sin llamar HubSpot.
- Exponer CLI adapter para ejecutar el workbook local contra el primitive canónico.

### Slice 4 — Real workbook dry-run + reconciliation

- Ejecutar el workbook real local/dev y reconciliar hash, filas, IDs, statuses, monedas, zero, invoice fan-out, mean/median y period range contra la spec.
- Comparar cobertura Account Unit/Company sin crear asociaciones fuzzy ni records.
- Emitir informe Markdown/JSON redacted y registrar evidencia; no publicar source rows.

## Out of Scope

- UI/upload screen (`TASK-1424`).
- Provisionar bucket o signed-URL API propios.
- HubSpot schema, records, associations, workflows, Tickets, Services, Invoices o Payments.
- Approval/maker-checker and batch upsert/readback.
- CLP/CLF normalization, UF/FX lookup, credit notes, collections or accounting settlement.
- Projection of ANAM facts into Efeonce CRM, Finance, Account 360 or internal revenue.
- Committing the real workbook as a test fixture.

## Detailed Spec

La spec ejecutable es `docs/architecture/kortex/hubspot-as-a-service/client-billing-intake-data-model-spec-v1.md`. Discovery puede ajustar nombres físicos sólo si preserva las invariantes, actualiza la spec antes de migration y documenta la razón. No puede cambiar el grain, tenant boundary, portal binding, currency separation ni no-write posture.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3 → 4. No crear tablas antes de validar el parser contra fixture sintético; no correr el workbook real antes de tenant/asset guards; no habilitar UI/HubSpot writes en esta task.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Mezclar datos ANAM con Efeonce | tenant/data | low | mandatory `space_id`, dataset-bound portal, forbidden-table tests | cross-tenant/write guard failure |
| PII en logs/fixtures | security | medium | synthetic fixtures, redacted errors, log tests | secret/PII scan finding |
| Montos duplicados por invoice/associations | reporting | medium | Billing Event grain + invoice+currency grouping + fan-out tests | reconciliation delta |
| Full snapshot tratado como delete delta | data | medium | `source_missing_review`, nunca delete | removal queue count |
| Parser cambia fechas/decimales | data | medium | typed parser version + exact golden totals | manifest mismatch |
| Task llama HubSpot accidentalmente | integration | low | no adapter import + network test | outbound call detected |

### Feature flags / cutover

- `CLIENT_BILLING_INTAKE_ENABLED=false` if required after Discovery; no UI route or production scheduler exists in this task.
- ANAM dataset config remains dev/no-write until approvals close.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 | revert parser/fixtures | yes |
| 2 | migration down only before production data; otherwise disable and retain evidence | conditional |
| 3 | disable command/CLI + revert | yes |
| 4 | retain redacted report, mark run rejected/superseded; never delete source evidence ad hoc | yes operationally |

### Production verification sequence

Not applicable: production upload and HubSpot mutation are explicit NO-GO. Completion evidence is local/dev only.

### Out-of-band coordination required

- ANAM approval of Código ANAM lifecycle, owners and retention is required before later production intake, not before the local no-write profiler.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] The six client billing control-plane tables exist through an additive migration with required `space_id`, FKs, CHECKs, indexes and grants; no runtime DDL.
- [ ] Parser accepts exactly the approved 22-column `query` contract and fails closed on schema drift.
- [ ] Amounts persist as exact decimals; date-only fields do not shift by timezone; raw values remain available through authorized evidence.
- [ ] Synthetic fixtures cover statuses, currencies, duplicate invoice rows, zero, invalid identity/date and snapshot changes without real client PII.
- [ ] A≠B tenant test proves another space cannot profile/read ANAM asset, run, rows, findings or dataset.
- [ ] Repeating the same asset/idempotency key produces no duplicate run/event state; changed rows version, missing rows become review and never delete.
- [ ] Real workbook dry-run reproduces SHA-256, 16,898 IDs, seven statuses, currency counts, 112 zero rows, invoice fan-out and mean/median benchmarks or documents an approved parser-version delta.
- [ ] Profiler reports sums only by original currency and never emits a mixed-currency total.
- [ ] Five invoiced-without-invoice and 818 non-invoiced-with-invoice cases surface as findings, not silent repairs.
- [ ] Network guard proves zero HubSpot API calls; no HubSpot schema/record/workflow mutation occurs.
- [ ] Runtime/SQL evidence proves zero ANAM-row writes to Efeonce CRM, Finance, Income or Account 360.
- [ ] Private asset path reuses canonical asset upload, scan and attachment; no new bucket/signed URL API exists.
- [ ] `pnpm task:lint --task TASK-1423`, `pnpm ops:lint --changed`, targeted tests, typecheck and docs gates pass.

## Verification

- `pnpm task:lint --task TASK-1423`
- Targeted Vitest suites for parser, normalization, tenancy, idempotency and no-network/no-internal-write guards.
- Migration up/down in an isolated database plus information-schema/readback checks.
- CLI dry-run against the current local workbook; compare redacted manifest/report to spec benchmarks.
- `pnpm local:check` and proportional full test/build based on changed shared surfaces.
- `pnpm qa:gates --changed` and `pnpm docs:closure-check` before closure.

## Closing Protocol

- [ ] Move task/lifecycle and synchronize `docs/tasks/README.md` + registry.
- [ ] Update spec with actual physical names/parser version and runtime evidence.
- [ ] Update `Handoff.md`, `changelog.md`, `project_context.md` and HubSpot as a Service skill mirrors.
- [ ] Record explicit state: `code complete, rollout pendiente`; production and HubSpot writes remain blocked.

## Follow-ups

- `TASK-1424` authenticated ANAM client upload/review UI with wireframe/flow/GVC.
- Maker-checker approval + immutable HubSpot change set + Kortex OAuth batch upsert/readback.
- Two shadow monthly closes and HubSpot billing dashboards.

## Open Questions

- Which ANAM users receive uploader, reviewer and operator roles?
- What retention/export/deletion period applies to client-owned source assets and parsed raw rows?
- Can one Código ANAM be reassigned between legal Companies, and from what effective date?
- What is the approved treatment of zero, `Refacturado`, invoice reuse, cancellations and credit notes?
- Can one source row span multiple contracted Services, requiring a future allocation grain?
