# TASK-1484 — Globe Commercial Monetization, Billing and Revenue Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Epic: `EPIC-028`
- Status real: `Bloqueada por decisiones Finance/Legal/Commercial y readiness gate`
- Rank: `TBD`
- Domain: `commercial|finance|tax|payments|legal|reliability`
- Blocked by: `TASK-1481, TASK-1468, TASK-1478, TASK-1480, TASK-1482`
- Branch: `task/TASK-1484-globe-commercial-monetization-billing-revenue-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar, sin inventarlos, los packages, price books, billing, tax snapshots, revenue projections,
top-up/overage, payments y reconciliation aprobados por el `commercial_decision_record` de `TASK-1480`.

## Why This Task Exists

Un go comercial aprueba parámetros; no debe desplegar código ni cobrar automáticamente. Esta task separa la
decisión cross-functional de su implementación técnica fail-closed y evita mezclar Studio Credits con un GL,
tax engine o pass-through de tokens.

## Goal

Conectar contrato/orden, entitlement/allocation, invoice, payment y Finance con snapshots e idempotencia,
preservando las tres dimensiones comerciales y cinco líneas económicas separadas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1480` produce record firmado/machine-readable aplicable al scope.
- `TASK-1478` aporta calibración; `TASK-1468`/`1482` ledger y allocation; `TASK-1481` parity spine.

### Blocks / Impacts

- Cualquier rollout que venda top-ups, cobre self-serve o reconozca credits comercialmente.
- No habilita clientes ni cobros por sí sola: requiere rollout task/sign-off posterior.

### Files owned

- Contratos/módulos Globe de commercial catalog, pricing snapshot, order/entitlement bridge y payments adapter.
- Proyecciones/eventos versionados hacia Finance; no tablas GL ni invoice source-of-truth duplicados.

## Current Repo State

### Already exists

- Business/credit model aprobado para medir/pilotear; pricing público, expiry, top-up y checkout siguen TBD.

### Gap

- No hay decision record ni runtime autorizado. Esta task permanece bloqueada hasta resolverlos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Globe commercial primitives + Finance integrations gobernadas`
- Future candidate home: `remain-shared`
- Boundary: `monetization implementation, no policy invention ni GL`
- Server/browser split: `pricing/tax/payment/authority server-only; DTOs redactados`
- Build impact: `Globe + integraciones Finance/payment seleccionadas`
- Extraction blocker: `selección y aprobación formal de merchant, invoice/AR y payment systems of record en
  el commercial decision record de TASK-1480`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration + integration`
- Source of truth afectado: `catalog/snapshots Globe; invoice/AR/payment/GL permanecen en sistemas aprobados`
- Consumidores afectados: `commercial ops, Finance, allocation admin y futuro checkout`
- Runtime target: `sibling-service + governed integrations`

### Contract surface

- Package/SKU catalog versionado con delivery model, engagement form, operating scope y cinco líneas.
- Price book effective-dated/multi-moneda, quote/contract snapshots y discount/promotion policy.
- Commands/readers para entitlement/allocation desde order, top-up/overage, refund/chargeback y reconciliation;
  nombres definitivos se fijan tras seleccionar systems of record.
- Tax snapshot por entidad/jurisdicción/fecha y revenue obligation projections reconocidas/diferidas.
- Full API parity: contracts transport-neutral, private API/SDK/events/coverage/conformance desde nacimiento.

### Data model and invariants

- Ningún SKU mezcla governance/platform, human capacity, Studio Credits, implementation y rights/pass-through.
- Precio/descuento/provider no cambia consumo técnico; no existe provider->money/credit table pública.
- Promotions son grants separados; no reescriben paid settlements. Governance sólo baja con scope explícito.
- Cada transacción pinnea price, tax, FX, contract y credit-rate snapshots efectivos.
- Tax falta/ambiguo falla cerrado; no estimación silenciosa.
- Revenue projection reconcilia obligaciones, usage/período/milestone, unused balance/breakage/refund; no es GL.
- No hay purchased allocation sin order/payment conciliable ni cobro sin entitlement/allocation resultante.
- Top-up/payment/refund/chargeback son idempotentes, capped, maker-checker y auditables.

### Migration, backfill and rollout

- Migration posture: `additive, fail-closed`
- Default state: `all commercial writes/payment adapters OFF`
- Backfill plan: `ninguno sin reconciliation design y sign-off`
- Rollback path: `detener purchase/payment, preservar snapshots/audit, reconciliar con SoT`
- External coordination: `Finance, contador/auditor, abogado por jurisdicción, Security y payment/invoice owners`

### Security and access

- Trusted actor/workspace/order/authority server-side; maker-checker para discounts/refunds/top-ups.
- Purchase caps, fraud/chargeback limits, kill switches y no autonomous agent purchase.
- Vendor cost/margin, tax internals y payment data se segregan/redactan por audience.

### Runtime evidence

- Contract/order/allocation/ledger/invoice/payment/export reconciliation y drift signals.
- Replay, concurrent payment callback, partial failure, refund/chargeback y tax-fail-closed tests.
- Coverage parity en API/SDK/worker/E2E; UI puede policy-blocked, nunca missing.

### [NEEDS CLARIFICATION] before Plan Mode closure

- Launch lane: SOW allowance, operator-assisted top-up o self-serve.
- Entidad legal/merchant of record; países, monedas, FX y documentos tributarios iniciales.
- Payment processor e invoice/AR source of truth.
- Tratamiento contable/IFRS 15 por las cinco líneas, principal-vs-agent y breakage.
- Expiry/rollover/cancel/offboarding; cash refund vs adjustment/nota de crédito.
- Packages/prices/minimum/overage; discount caps/stacking/approvers; fraud/chargeback limits.
- Owner de futura checkout UI.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Catalog, pricing and contract snapshots

- Materializar sólo el decision record aprobado: SKUs, five-line decomposition, price books y discounts.
- Preservar effective dates, currency/FX y quote/SOW/order snapshots.

### Slice 2 — Entitlement, billing, tax and revenue bridge

- Implementar order -> entitlement/allocation -> invoice contract y tax snapshot fail-closed.
- Proyectar recognized/deferred obligations hacia Finance sin crear GL/tax engine paralelo.

### Slice 3 — Payments, refunds and reconciliation

- Implementar adapter aprobado de top-up/overage/payment/refund/chargeback con caps/idempotency.
- Conciliar extremo a extremo y emitir drift/dead-letter/stop-loss signals.

## Out of Scope

- Fijar valores que `TASK-1480` no aprobó.
- UI/checkout público, public pricing page o external-client enablement.
- Gift cards, crypto, transferencias cross-tenant o créditos negociables.
- Recalibrar consumo, incluir IP/derechos en credits, construir GL/tax engine o compra autónoma por agentes.

## Detailed Spec

No ejecutar mientras los blockers/clarifications sigan abiertos. Con goal aprobado, iniciar mediante
`pnpm codex:task-hook TASK-1484 --develop`; si checkout/payment resulta separable, extraer child task formal.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| policy inventada en código | decision record hash/version required | parameter outside record |
| tax/accounting incorrecto | fail-closed + professional sign-off | missing tax/obligation mapping |
| paid order sin credits o viceversa | saga/outbox + reconciliation | unmatched order/allocation |
| duplicate charge/refund | durable idempotency + callback claim | duplicate payment event |

- Feature flags: catalog read-only primero; all writes/payments/external OFF.
- Rollback: disable adapters, stop writes, preserve snapshots/audit, reconcile against SoT.
- Verification: contract fixtures -> integration sandbox -> negative/replay -> internal canary -> explicit rollout.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Toda configuración runtime deriva de un `commercial_decision_record` aplicable y firmado.
- [ ] Cinco líneas económicas permanecen separadas; pricing no cambia consumo técnico.
- [ ] Price/tax/FX/contract/rate snapshots hacen reproducible cada transacción.
- [ ] Tax ambiguo falla cerrado y revenue projection reconcilia sin sustituir el GL.
- [ ] Purchase/payment/refund/chargeback son idempotentes, capped, auditados y reconciliables.
- [ ] No hay cobro sin entitlement/allocation ni purchased allocation sin order/payment conciliable.
- [ ] Full API parity, tenant isolation, redaction y kill switches tienen evidencia.
- [ ] Clientes externos, checkout y cobros siguen OFF hasta rollout posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1484`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Validación de contador/auditor y abogado habilitado referenciada, no inferida.
- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] Estado declarado `code complete, rollout pendiente` hasta activación real aprobada.

## Follow-ups

- Crear task UI/rollout separada si se aprueba checkout o pricing público.
