# TASK-955 — Contractor Provider Settlement Split + EOR Beneficiary (TASK-795 Fase B)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno — derivada diferida de TASK-795 Fase B (decisiones ya tomadas)`
- Rank: `TBD`
- Domain: `cross-domain`
- Blocked by: `TASK-795 (Fase A), TASK-790, TASK-793`
- Branch: `task/TASK-955-contractor-provider-settlement-split`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el carril **provider/EOR** del contractor payable: payee provider (Deel/Remote/Oyster como `greenhouse_core.providers`), split charge/payout/fee/FX-spread con reconciliación, y clasificación Finance de cada componente. Es la **Fase B diferida de TASK-795** — las decisiones de diseño ya están tomadas y documentadas (D-795-2, D-795-3); esta task las implementa.

> **Alineación EPIC-017 (2026-05-31):** esta task sigue diferida y separada. Cuando emerja un provider/EOR real, su split debe alimentar `PaymentRail`/lineage de la persona, pero no debe adelantar la Unified Workforce Foundation ni convertir provider IDs en identidad persona. `TASK-961` puede mostrar evidencia de rail; `TASK-955` sigue owner del settlement provider.

## Why This Task Exists

TASK-795 Fase A entregó la frontera tributaria + FX policy del contractor internacional/provider, pero **difirió** el carril provider/EOR porque el grueso de contractors de Efeonce son **directos** (entidad contratante `Efeonce Group SpA`, payee = la persona) y el carril plataforma/EOR es minoría — construir el split + reconciliación + EOR antes de tener un contractor real por Deel sería especulativo (YAGNI).

Esta task se ejecuta **cuando emerja un contractor real por plataforma/EOR** (o cuando el operador decida prepararlo). El payable de un EOR le paga a Deel (no al worker), y ese pago compone worker payout + employer burden + margen Deel; sin modelarlo, un pago a Deel "pierde" la atribución del costo al colaborador y mezcla líneas P&L.

## Goal

- Modelar el payee `provider` reusando el Proveedor canónico (el contractor-persona NUNCA es Provider).
- Persistir provider refs en el payable + split charge/payout/fee/FX-spread con reconciliación fail-closed.
- Clasificar cada componente a su `economic_category` canónica (worker / provider fee / FX spread distintos).
- Mantener la atribución de costo laboral SIEMPRE en la persona, sin importar el payee.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-05-30 "Modelo dimensional canónico" + "Invariantes contables" + TASK-795 Fase A Delta)
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` (TASK-768)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Proveedor canónico)
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md` (contexto para PaymentRail lineage)

Decisiones canónicas ya tomadas (NO re-litigar — implementar):

- **D-795-2**: `net_payable` del worker NUNCA absorbe provider fee ni FX spread (invariante TASK-793 intacto). Split en `provider_settlement_breakdown_json` (charge / worker_payout / provider_fee / provider_withheld_tax / fx_spread) + assertion de reconciliación con tolerancia (`charge ≈ worker_payout + provider_fee + provider_withheld_tax + fx_spread`). Provider fee = obligación separada (`payable_source_kind='provider_fee'`); FX spread = metadata + clasificación, no payee. Clasificación: worker → `labor_cost_external`, provider fee → `vendor_cost_professional_services`, FX spread → `financial_cost`, provider-withheld-tax → informativo (NO es retención de Efeonce). El FX realizado en settlement ya fluye por `expense_payments.fx_gain_loss_clp` (TASK-699/766).
- **D-795-3**: el contractor-persona NUNCA es `greenhouse_core.providers`. Solo la plataforma/EOR (Deel) es Provider comercial. Separar **payee de la obligación** (`beneficiary_type='provider'` + `beneficiary_id = providers.provider_id` para EOR/provider-fee) de **sujeto de atribución de costo** (SIEMPRE la persona). Loaded cost en EOR = invoice completo, NO solo payout.
- EPIC-017 boundary: provider IDs son referencias de ejecución/settlement, no identidad persona. Cualquier read model workforce debe mostrar provider rail como evidencia, no como root.

## Dependencies & Impact

### Depends on

- `TASK-795` (Fase A — gates + boundary; este carril extiende el mismo readiness)
- `TASK-790` (engagement: `providerContractId`, `providerWorkerId`, `payrollVia`)
- `TASK-793` (contractor_payables: state machine, readiness, beneficiary)
- `TASK-768` (economic_category canónica)

### Blocks / Impacts

- Impacta Finance cost classification (member loaded cost / client economics), provider reconciliation y payment routing.
- TASK-798 (Contractor Reliability + Ops): el signal `provider_reconciliation_drift` lo consolida ahí.

### Files owned

- `src/lib/contractor-engagements/payables/readiness.ts` (nuevo blocker `provider_settlement_unreconciled`)
- `src/lib/contractor-engagements/payables/store.ts` (split + beneficiary provider + reconciliación)
- `src/lib/contractor-engagements/payables/types.ts`
- `src/lib/contractor-engagements/international/**` `[verificar — crear si emerge un helper reusable]`
- `src/lib/reliability/queries/contractor-payable-provider-reconciliation-drift.ts`
- `migrations/**`

## Current Repo State

### Already exists (verificado en TASK-795 Fase A)

- Engagement guarda `providerContractId`, `providerWorkerId`, `payrollVia` (deel/remote/oyster), `fxPolicyCode`.
- `contractor_payables` tiene `beneficiary_type` (`member`/`other`), `payable_source_kind` (`work_submission`/`fixed_recurring`/`invoice`/`off_cycle`), `readiness_json`, `source_snapshot_json`.
- `greenhouse_core.providers` existe (Proveedor canónico); el catálogo TASK-701 contempla `provider_type='payroll_processor'/'payment_platform'`.
- `economic_category` (TASK-768) tiene `labor_cost_external`, `vendor_cost_professional_services`, `financial_cost`, `tax`.
- Gate `tax_owner_review_required` + `fx_policy_unresolved` (Fase A) ya en readiness.

### Gap

- NO existe `beneficiary_type='provider'` ni el seed de Deel/Remote/Oyster como `greenhouse_core.providers`.
- NO existe `payable_source_kind='provider_fee'`.
- NO existe el split charge/payout/fee/FX-spread (`provider_settlement_breakdown_json`) ni su reconciliación ni el blocker `provider_settlement_unreconciled`.
- NO existe el signal `provider_reconciliation_drift`.

## Scope

### Slice 1 — Provider data contract + payee provider

- Migration: extender CHECK `beneficiary_type` con `'provider'` (additivo); extender CHECK `payable_source_kind` con `'provider_fee'` (additivo); columna `provider_settlement_breakdown_json JSONB` (nullable). Anti pre-up-marker check.
- Seed Deel/Remote/Oyster como `greenhouse_core.providers` (`provider_type='payroll_processor'`) — idempotente.
- Resolver beneficiary: para EOR/provider-fee, `beneficiary_type='provider'` + `beneficiary_id = providers.provider_id`. Persistir provider contract/worker/invoice/payout IDs en el payable (hoy solo en el engagement).

### Slice 2 — Settlement split + reconciliación

- Helper puro `reconcileProviderSettlement(breakdown)` → assertion `charge ≈ worker_payout + provider_fee + provider_withheld_tax + fx_spread` con tolerancia (espejo del CHECK `net = gross − withholding`).
- Nuevo blocker readiness `provider_settlement_unreconciled` (solo cuando hay breakdown provider). `net_payable` del worker NUNCA absorbe fee/spread.
- Provider fee = obligación separada (`payable_source_kind='provider_fee'`).

### Slice 3 — Finance classification

- Mapear worker payout → `labor_cost_external`, provider fee → `vendor_cost_professional_services`, FX spread → `financial_cost` via `resolveExpenseEconomicCategory` (TASK-768). Provider-withheld-tax informativo.
- Atribución de costo laboral SIEMPRE a la persona contractor (loaded cost EOR = charge completo, no payout).

### Slice 4 — Reliability

- Signal `finance.contractor_payable.provider_reconciliation_drift` (drift, moduleKey finance, steady=0): payables provider con breakdown que no reconcilia. Wire en `getReliabilityOverview`. Validar SQL contra PG live.

## Out of Scope

- Sync completo API Deel/Remote/Oyster.
- Motor tributario por país (`international_internal` / TASK-905/906/907).
- Mecánica del contractor directo (Fase A, TASK-795 — ya shipped).
- Expansión multi-moneda de Finance (`payment_obligations`/`account_balances` siguen CLP/USD — task de Finance separada).

## Detailed Spec

Referencia canónica: TASK-795 D-795-2 + D-795-3 + "Invariantes contables" del arch doc (Delta 2026-05-30). NO duplicar — esta task implementa esas decisiones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migration + seed providers) antes que todo: el split y el beneficiary provider dependen de los enums/columna nuevos.
- Slice 2 (reconciliación) antes de Slice 3 (clasificación): la clasificación consume el breakdown reconciliado.
- Slice 4 (signal) al final: observa el estado de los slices previos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| net_payable del worker absorbe fee/spread (rompe TASK-793) | finance/payroll | medium | breakdown separado + CHECK reconciliación; net = gross − withholding intacto; tests anti-regresión | `provider_reconciliation_drift` |
| Costo EOR subatribuido (solo payout, no charge) | finance | medium | atribución = charge completo; test member loaded cost | revisión client economics |
| Deel registrado dos veces (provider + duplicado) | core | low | seed idempotente por provider_id; UNIQUE | — |
| Provider-withheld-tax tratado como retención Efeonce | finance/tax | medium | informativo explícito; NUNCA `economic_category='tax'` de Efeonce | code review + test |
| Migration enum CHECK rompe inserts existentes | hr | low | additivo (solo agrega valores); NOT VALID + VALIDATE atomic | migration verify block |

### Feature flags / cutover

- Sin flag: el carril provider solo se activa cuando un engagement declara `payrollVia ∈ {deel,remote,oyster}` con `tax_compliance_owner='provider_owned'` y un payable provider-fee. Los payables directos (mayoría) no tocan este código.
- Migration additiva (nuevos enum values + columna nullable) → no afecta payables existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Down migration (DROP columna, los enum values additivos quedan inertes sin filas que los usen) + revert seed | <15 min | si |
| Slice 2 | Revert PR (blocker nuevo; sin él los payables provider no llegan a ready, fail-closed seguro) | <10 min | si |
| Slice 3 | Revert PR (clasificación; el economic_category cae al default del resolver) | <10 min | si |
| Slice 4 | Revert PR (signal read-only) | <10 min | si |

### Production verification sequence

1. `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` verde (non-regression).
2. SQL del signal `provider_reconciliation_drift` validado contra PG live (steady=0).
3. Crear un engagement provider-owned de prueba + payable provider-fee en staging → verificar split reconcilia + beneficiary='provider'.

### Out-of-band coordination required

- Confirmar con Finanzas el registro de Deel/Remote/Oyster como Proveedores (datos de la contraparte comercial) antes del seed.

## Acceptance Criteria

- [ ] El contractor-persona NUNCA se persiste como `greenhouse_core.providers`; el payee `provider` es solo la plataforma/EOR (Deel) (D-795-3).
- [ ] Provider-owned/EOR payable almacena provider refs + `beneficiary_type='provider'`; el split charge/payout/fee/FX-spread reconcilia (`charge ≈ payout + fee + provider_withheld_tax + fx_spread`) o bloquea (`provider_settlement_unreconciled`).
- [ ] `net_payable` del worker nunca absorbe provider fee ni FX spread (invariante TASK-793 intacto; test anti-regresión).
- [ ] La atribución de costo laboral apunta SIEMPRE a la persona contractor, sin importar el payee; loaded cost EOR = charge completo.
- [ ] Worker payout / provider fee / FX spread mapean a `labor_cost_external` / `vendor_cost_professional_services` / `financial_cost` respectivamente (categorías canónicas existentes, sin enum nuevo).
- [ ] Signal `finance.contractor_payable.provider_reconciliation_drift` en steady=0; `pnpm vitest run src/lib/payroll` sin deltas.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` — non-regression + reconciliación.
- SQL del signal validado contra PG live.
- `pnpm build` (Turbopack).

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` + `changelog.md` updated.
- [ ] Arch Delta + CLAUDE.md (si emergen invariantes nuevos) + EVENT_CATALOG/RELIABILITY si aplica.

## Follow-ups

- Cuando exista volumen real provider/EOR, evaluar provider invoice ingestion (sync Deel) como task separada.
