# Greenhouse EO — Finance Module Architecture V1

> **Version:** 1.0
> **Created:** 2026-03-30
> **Last updated:** 2026-05-07 (TASK-815 Direct Service Expense Allocation Primitive)

## Delta 2026-05-07 — TASK-815 Direct Service Expense Allocation Primitive

Finance agrega una primitive gerencial explícita para asociar gastos directos de cliente a services sin mutar el documento fiscal ni inferir por heurística:

- Tabla: `greenhouse_finance.expense_service_allocations`.
- Scope V1: solo `expenses.cost_is_direct=TRUE` con `allocated_client_id` y `is_annulled=FALSE`.
- Estado: `draft | approved | rejected`; solo `approved` afecta serving.
- Guardrails DB: service activo, no `legacy_seed_archived`, no `hubspot_sync_status='unmapped'`, cliente consistente y suma no mayor al monto efectivo/total del expense.
- Consumers: `greenhouse_serving.commercial_cost_attribution_v2` expone lane `expense_direct_service`; `src/lib/service-attribution/materialize.ts` la consume como direct cost high-confidence.
- Boundary: no cambia pagos, payment obligations, cash-out, impuestos, IVA, settlement ni economic_category. Es management accounting / attribution, no contabilidad legal.

## Delta 2026-05-05 — TASK-753 Payment Profiles Self-Service (regime-aware + inline drain)

### Why

Antes de TASK-753 los colaboradores no tenían visibilidad de su cuenta de pago registrada y abrian tickets manuales a finance para cualquier cambio. La spec original asumía que el self-service era simple "form → POST → finance approves" pero al implementar emergieron 3 problemas no contemplados que requirieron rediseño:

1. **Decisión cruzada operacional vs. declarativa**: el form original mezclaba inputs declarativos del colaborador (banco, número de cuenta, RUT) con decisiones operacionales de finance (proveedor, método de envío). El colaborador NO tiene contexto para elegir provider/method (depende de costo + corridor + relación bancaria + KYC). Solución: se eliminaron esos campos del form self-service. Finance los completa al aprobar.

2. **Discoverability cero**: la ruta `/my/payment-profile` existía pero no estaba ni en el menú ni como tab dentro de `/my/profile`. Solución: 3-capa canonica (viewCode catalog + nomenclatura `GH_MY_NAV.paymentProfile` + menu lateral + tab dentro de Mi Perfil) — single source of truth en React (`MyPaymentProfileView` rendered en ambas surfaces), doble entrypoint visible.

3. **Latencia 5-7 min en notificaciones**: el email transaccional ("solicitud registrada", "aprobada", "cancelada") dependía del cron `ops-outbox-publish` (cada 2min) + cron `ops-reactive-finance` (cada 5min). Worst-case 7 min entre submit y email — UX pobre. Solución: drain inline del pipeline outbox+reactive en el response cycle (idempotency-by-design preserva el cron como safety net).

### Schema (sin migration nueva — reusa TASK-749)

`greenhouse_finance.beneficiary_payment_profiles` ya existe (TASK-749). El self-service usa `metadata_json` para extras:

```json
{
  "regime": "chile_dependent | honorarios_chile | international",
  "source": "my_payment_profile_self_service",
  "requested_by": "member",
  "requested_at": "ISO 8601",
  "account_type_cl": "cuenta_corriente | cuenta_vista | cuenta_rut | chequera_electronica",
  "rut_titular": "12.345.678-5"
}
```

Finance lee `metadata_json` al revisar la cola para evaluar KYC + diferenciar self-service de admin-creado. NO requiere columnas nuevas.

### Regime-aware form (3 ramas + estado degradado)

Helper canonico `resolveSelfServicePaymentProfileContext(memberId)` infiere régimen + currency desde `members.pay_regime + location_country`, pre-rellena identidad legal desde TASK-784 (`person_identity_documents.canonical_email`, `legal_full_name`, `display_mask`).

| Regime | Campos del form | Currency inferida |
| --- | --- | --- |
| `chile_dependent` / `honorarios_chile` | banco · tipo cuenta · número · RUT (módulo-11) · titular | CLP |
| `international` | país · banco · SWIFT/BIC · IBAN/cuenta · titular legal | USD |
| `unset` | (degraded — sin form, CTA "Contactar finance") | null |

**Validators schema-driven** (`self-service-validators.ts`) corren cliente Y servidor (defense in depth). RUT módulo-11 + SWIFT regex `^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$` + CL account types enum.

### Inline drain pattern (canonico para self-service surfaces)

Después del commit del `createPaymentProfile` (o `cancelPaymentProfile`), el helper `drainOutboxPipelineForFinance` invoca **inline** dentro del response cycle:

1. `publishPendingOutboxEvents({ batchSize: 50 })` → flip `pending → published` para el evento recién insertado.
2. `processReactiveEvents({ domain: 'finance', batchSize: 25 })` → procesa la projection `payment_profile_notifications` → email transaccional via `sendEmail`.

**Idempotency-by-design** (sin migration ni nueva infra):
- `publishPendingOutboxEvents` usa `FOR UPDATE SKIP LOCKED` — concurrencia segura con cron `ops-outbox-publish`.
- `processReactiveEvents` usa `outbox_reactive_log` con `UNIQUE (event_id, handler)` + `ON CONFLICT DO UPDATE` — concurrencia segura con cron `ops-reactive-finance`.
- Si ambos (inline + cron) procesan el mismo evento, **solo uno gana el lock / inserta la log row** → cero duplicados de email.

**Failure mode preservado** (eventual consistency):
- Si la llamada inline falla (network blip, lambda timeout, Resend down): `captureWithDomain('finance', ...)` reporta a Sentry, NO se relanza al caller.
- El profile y el outbox event ya están persistidos atómicamente.
- El cron de outbox publica en ≤2 min; el reactive consumer procesa en ≤5 min. **Worst-case latency idéntica al diseño previo**.
- **El contract con el caller no cambió**: 201 con el shape original incluso si drain falla.

**Latencia resultante**:

| Camino | Latencia | Cuándo |
| --- | --- | --- |
| Drain inline exitoso | ~1-2 s | ~99% de los casos |
| Cron de respaldo | ≤5 min | Si Resend caído / network blip / lambda timeout |

### Idempotency entre inline y cron — análisis formal

Caso A: drain inline exitoso → cron al próximo tick (`SELECT FROM outbox_events WHERE status='published' AND NOT EXISTS log row`) → fetcha 0 → no-op.

Caso B: drain inline falla en step 1 (publish) → evento sigue `pending` → cron `ops-outbox-publish` lo recoge → cron `ops-reactive-finance` lo procesa al próximo tick.

Caso C: drain inline exitoso en step 1 pero falla en step 2 (react) → evento `published`, log row ausente → cron `ops-reactive-finance` lo procesa.

Caso D: drain inline + cron concurrente en step 2 → `outbox_reactive_log` tiene `UNIQUE (event_id, handler)`. Primer `INSERT ... ON CONFLICT DO UPDATE` gana, el segundo hace UPDATE no-op. **Solo un email se envía** (porque sendEmail se llama solo cuando la log row se INSERT-a, no cuando se UPDATE-a).

### Capabilities granulares (least privilege)

| Capability | Module | Scope | Acción permitida |
| --- | --- | --- | --- |
| `personal_workspace.payment_profile.read_self` | my_workspace | own | Leer perfiles propios masked |
| `personal_workspace.payment_profile.request_change_self` | my_workspace | own | Crear solicitud de cambio (entra como `pending_approval`) + cancelar la propia |
| `finance.payment_profiles.approve` | finance | tenant | Aprobar perfiles (con guard: `actorUserId !== createdBy`) |

**Maker-checker enforced en 2 capas**:
- TS: `approvePaymentProfile` rechaza si `row.created_by === input.approvedBy` (status 403).
- DB trigger `assert_payment_profile_maker_checker` enforce a nivel database para defense in depth.

### Discoverability — 3 capas canónicas

| Capa | Archivo | Contenido |
| --- | --- | --- |
| ViewCode | `src/lib/admin/view-access-catalog.ts` | `mi_ficha.mi_cuenta_pago` con `routePath: /my/payment-profile`, `routeGroup: my` |
| Access persistido | `migrations/20260505183808725_seed-my-payment-profile-view-access.sql` | Siembra `mi_ficha.mi_cuenta_pago` y `mi_ficha.onboarding` en `greenhouse_core.view_registry` + grants para roles internos con `mi_ficha` completa |
| Nomenclatura | `src/config/greenhouse-nomenclature.ts` | `GH_MY_NAV.paymentProfile = { label: 'Mi Cuenta de Pago', subtitle: 'Donde recibes tus pagos' }` |
| Discovery | `src/components/layout/vertical/VerticalMenu.tsx` | Item en sección "Mi Ficha" gated por `canSeeView('mi_ficha.mi_cuenta_pago', true)` (defense in depth: capability + viewCode + page guard) |
| Discovery (alterno) | `src/views/greenhouse/my/MyProfileView.tsx` | Tab "Cuenta de pago" que renderiza el mismo `<MyPaymentProfileView />` (single source of truth en React) |

### Reglas duras (TASK-753 invariants)

- **NUNCA** auto-aprobar (TS + DB trigger).
- **NUNCA** exponer `provider_slug` ni `payment_method` en el form self-service. Esos los decide finance al aprobar.
- **NUNCA** lanzar errores del drain inline al caller. El contract con el colaborador (perfil persistido + outbox queued) ya está cumplido. Drain es accelerator best-effort.
- **NUNCA** ejecutar inline drain con batchSize > 100 (latencia inline acotada).

### Frontera con TASK-754 / TASK-755 (futuro)

- **TASK-754** Vault externo: `account_number_full` movido a GCP Secret Manager con `vault_ref` opaco. Reveal sensitive con second factor + audit. Pendiente.
- **TASK-755** Ops avanzadas: bulk approve queue real, diff viewer, splits multi-method, routing por amount threshold. Pendiente — esperar feedback de uso real antes de construir.

### Files owned

- `src/lib/finance/beneficiary-payment-profiles/self-service.ts` (helpers + drain)
- `src/lib/finance/beneficiary-payment-profiles/resolve-self-service-context.ts` (regime resolver)
- `src/lib/finance/beneficiary-payment-profiles/self-service-validators.ts` (schema-driven validators)
- `src/lib/finance/beneficiary-payment-profiles/notify-beneficiary.ts` (email helper)
- `src/lib/sync/projections/payment-profile-notifications.ts` (reactive consumer)
- `src/app/api/my/payment-profile/{route.ts, context/route.ts, [profileId]/cancel-request/route.ts}`
- `src/app/(dashboard)/my/payment-profile/page.tsx`
- `src/views/greenhouse/my/{MyPaymentProfileView.tsx, payment-profile/RequestChangeDialog.tsx}`
- `src/emails/BeneficiaryPaymentProfileChangedEmail.tsx`

### Spec canónica

`docs/tasks/complete/TASK-753-payment-profiles-self-service.md` (lifecycle: complete; 4 commits a develop)

### Doc funcional

`docs/documentation/finance/mi-cuenta-de-pago-self-service.md`

## Delta 2026-05-05 — TASK-799 Processor/source separation for payment orders

Payment Orders separa tres conceptos que no deben conflarse:

- `processor_slug` / `payment_method`: rail operativo (`deel`, `global66`, `previred`, etc.).
- `source_account_id`: instrumento financiero real que se rebaja o contrae deuda.
- `settlement_groups` / `settlement_legs`: cadena conciliable de funding, FX, fee y payout cuando el pago no es directo.

Reglas canónicas:

- Deel no debe usarse como `source_account_id` cuando opera solo como processor/rail. Para el flujo operativo actual, Deel se financia desde `santander-corp-clp` (TC Santander Corp); el pago de la TC desde Santander CLP es un settlement interno separado.
- Global66 puede ser processor y también source instrument cuando existe como fintech/cuenta activa (`global66-clp` hoy). Si el flujo requiere fondeo previo Santander -> Global66, se modela con `settlement_legs` de funding/internal transfer, no como una segunda orden de payroll.
- `payment_platform` solo contribuye a cash si el producto mantiene saldo propio explícito. Si un provider opera solo como processor, no debe aparecer en el selector de instrumento de salida.

Runtime:

- `greenhouse_finance.payment_order_processor_funding_policies` es el registry runtime de funding por processor/metodo/moneda. Evita hardcodes en UI y permite agregar rails nuevos con seed/migracion auditada.
- `src/lib/finance/payment-orders/source-instrument-policy.ts` es el helper V1 que lee ese registry y conserva fallback seguro cuando el schema todavia no existe.
- `GET /api/admin/finance/payment-orders/[orderId]/source-options` entrega al selector las opciones elegibles desde backend; Finance UI no decide la compatibilidad de cuentas localmente.
- `createPaymentOrderFromObligations` guarda snapshot `metadata_json.treasury_source_policy`.
- PATCH de `source_account_id` y `markPaymentOrderPaidAtomic` validan la policy antes de registrar downstream.
- Para Deel, el settlement usa `santander-corp-clp` como source real y `deel-clp` como intermediario/counterparty con `intermediaryMode='counterparty_only'`; no se crea un funding leg adicional que doble-rebaje saldos.

## Delta 2026-05-05 — Contractor payables bridge

Se agrega arquitectura complementaria para pagos contractor/freelance/profesional independiente:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`

Regla canonica:

- HR/Contractor domain aprueba engagement, evidencia, invoice/boleta y `contractor_payable`.
- Finance recibe solo payables listos y genera `payment_obligations` / `payment_orders`.
- El dominio contractor nunca muta banco, `expense_payments` ni `settlement_legs` directamente.
- Pagos via Deel/Remote/Oyster deben distinguir cargo proveedor, payout contractor, fees y FX; economicamente no deben caer como overhead proveedor generico si representan costo laboral externo.

## Delta 2026-05-03 — TASK-777 Expense distribution resolution

TASK-777 agrega la capa canónica `expense_distribution_resolution` entre `expenses.economic_category` y management accounting. `economic_category` define la naturaleza económica del gasto; `distribution_lane` define dónde puede impactar: labor directa, herramienta directa, cliente directo, overhead operacional compartido, costo financiero compartido, regulatorio, provider payroll, treasury transit o unallocated.

Reglas duras:

- Solo `shared_operational_overhead` puede alimentar el pool de overhead operacional de `member_capacity_economics`.
- `provider_payroll`, `regulatory_payment`, `tax`, `shared_financial_cost` y `treasury_transit` no pueden entrar al overhead operacional por default.
- `direct_overhead_member_id` es legacy evidence/override, no source of truth para payroll/provider. Los readers deben excluir `labor_cost_*`, regulatorio, tax y financiero de direct overhead.
- Cash/treasury queda protegido: `account_balances`, payment ledgers, settlement legs, payment orders y conciliación no se mutan por esta capa.
- IA es advisory-only vía `expense_distribution_ai_suggestions`; no escribe P&L, no cierra períodos ni modifica snapshots sin aprobación/gate explícito.

Runtime entregado:

- `greenhouse_finance.expense_distribution_policy`
- `greenhouse_finance.expense_distribution_resolution`
- `greenhouse_finance.expense_distribution_ai_suggestions`
- `src/lib/finance/expense-distribution/*`
- `src/lib/finance/expense-distribution-intelligence/*`
- `GET/POST /api/admin/finance/expense-distribution/suggestions`
- `POST /api/admin/finance/expense-distribution/suggestions/[suggestionId]`
- `finance.expense_distribution.unresolved`
- `finance.expense_distribution.shared_pool_contamination`
- close gate en `checkPeriodReadiness`: exige resolución activa para cada expense del período y bloquea `manual_required`, `blocked`, `unallocated` o contaminación del pool operacional.

Access model:

- `routeGroups`: sin cambios; las APIs viven bajo Finance/Admin runtime existente.
- `views`: sin nueva entrada visible/menu en TASK-777.
- `entitlements`: `finance.expense_distribution.ai_suggestions.read`, `.generate`, `.review`.
- `startup policy`: sin cambios.

Abril 2026 fue rematerializado con la nueva capa: SKY overhead `$2.278.629,39`, ANAM overhead `$759.543,13`, y contamination/unresolved `0`.

Decisión operativa abril 2026: queda apto para cierre operativo con distribución canónica (`readinessPct=100`, 50/50 resoluciones activas, unresolved `0`). Si abril ya fue comunicado con el P&L anterior, tratar la diferencia como restatement de management accounting, no como corrección de caja.

## Delta 2026-05-03 — TASK-768 Economic Category Dimension (analytical separation)

Cierra ISSUE-065 (KPI Nómina sub-counted ~$3M abril 2026 por mis-clasificación). Separa la dimensión analítica/operativa de la fiscal/contable que estaban conflate en `expense_type` / `income_type`. Subordina el shape del helper `sumExpensePaymentsClpForPeriod` (TASK-766): ahora retorna `byEconomicCategory` breakdown además de los campos legacy.

**Causa raíz**: `expense_type` (legacy `accounting_type` alias) sirve a dos masters semánticos contradictorios:
- **Fiscal/SII**: lo que es la expense desde la perspectiva tributaria (factura proveedor, recibo, impuesto). Lo lee VAT engine, IVA ledger, SII reports, chile-tax (TASK-529-533).
- **Analítico/operativo**: lo que es la expense desde la perspectiva del modelo económico Greenhouse (gasto labor interno, externo, vendor SaaS, regulatorio, etc.). Lo lee P&L gerencial, ICO, KPIs cash-out, cost attribution, member loaded cost (TASK-710-713), budget engine (TASK-178).

A veces coinciden, frecuentemente NO. Ejemplo crítico: pago a Deel Inc. → fiscalmente es proveedor (Deel emite factura a Greenhouse) pero económicamente es nómina (Deel paga a Melkin como costo labor para Greenhouse). El bank reconciler defaulteaba `expense_type='supplier'` cuando ingestaba transacciones bancarias sin metadata para inferir naturaleza payroll → ~$3M abril 2026 (Daniela España, Andrés Colombia, Valentina, Humberly, Previred) caían en bucket equivocado.

**Resolución arquitectónica** (NO lente read-time):

1. **Schema separation**: nueva columna `economic_category TEXT` aditiva en `expenses` + `income`. CHECK `canonical_values` enforces enum (11 valores expense, 8 income). CHECK `required_after_cutover` NOT VALID (cutover 2026-05-03 11:00 UTC; VALIDATE post-cleanup manual queue).
2. **Lookup tables canónicas** (`greenhouse_finance.known_regulators` + `known_payroll_vendors`): regex match seedeado declarativamente (17 reguladores chilenos, 8 international payroll processors). Extender = INSERT row, cero código.
3. **Resolver canónico TS** (`src/lib/finance/economic-category/resolver.ts`): 10 reglas first-match-wins (member_id explicit → RUT lookup → email → name fuzzy → vendor regex → regulator regex → supplier partner → accounting_type transparent map → ambiguous fallback → manual_required). Returns `{category, confidence, matchedRule, evidence}`.
4. **Trigger BEFORE INSERT** (`populate_economic_category_default_trigger`): cero invasivo a 12 canonical writers. Transparent map de `expense_type` → default razonable. NO sobrescribe valores explícitos.
5. **Backfill defensivo** + audit log append-only (`economic_category_resolution_log`, trigger anti-update/delete TASK-765 pattern) + manual queue (`economic_category_manual_queue`).
6. **Reclassification endpoints**: `PATCH /api/admin/finance/expenses/[id]/economic-category` + mirror income, capability granular least-privilege (`finance.expenses.reclassify_economic_category`), atomic UPDATE + audit + outbox event `finance.expense.economic_category_changed` v1.
7. **VIEWs extendidas**: `expense_payments_normalized` + `income_payments_normalized` exponen ambas dimensiones via JOIN. Helpers `sumExpensePaymentsClpForPeriod` retornan `byEconomicCategory` (11 keys) + legacy `supplierClp/payrollClp/fiscalClp` preservados (backwards-compat TASK-766).
8. **Reliability signals**: `finance.expenses.economic_category_unresolved` + mirror income (drift, error si count>0, steady=0 post-cleanup). Subsystem `finance_data_quality`.
9. **Lint rule** `greenhouse/no-untokenized-expense-type-for-analytics` mode `error`. Override block exime SII/VAT/operacional/resolver. Tolerancia cero forward.

**Política consumer (regla dura)**: ningún consumer analítico de Greenhouse puede filtrar/agrupar por `expense_type` o `income_type` para análisis económico. El lint rule lo enforcea, no es convención. Para SII/VAT/IVA, usar `expense_type` (legacy `accounting_type`) sigue siendo legítimo y necesario.

**Cero impacto operacional**:
- Saldos bancarios cuadran (cash flow ortogonal a la dimensión bucket).
- P&L tributario / SII reports siguen usando `expense_type` (preservado intacto).
- Total Pagado canónico se mantiene; solo cambia distribución entre buckets.
- TASK-766 CLP reader 23 tests verdes (backwards-compat preservada).

**Bloqueantes downstream desbloqueados**:
- TASK-178 (Budget Engine) puede iniciar — variance analysis canónica.
- TASK-710-713 (Member Loaded Cost program) puede iniciar — modelo dimensional consume `economic_category`.
- TASK-080+ (ICO Engine) puede beneficiarse via cost-per-FTE canónico.
- TASK-705/706 (Cost Attribution) — allocations con dimensión correcta.

**Tests**: 108 totales TASK-768 verdes — 11 types, 26 resolver, 7 identity-lookup, 5 lookup-tables, 14 endpoints, 11 lint rule RuleTester, 23 TASK-766 preservados, 11 ad-hoc.

**Spec canónica**: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`. Patrones reusados: TASK-571/699/721 (canonical reader + helper + lint), TASK-708/728/766 (CHECK NOT VALID + VALIDATE + cutover), TASK-742/765/766 (capabilities granulares + audit + outbox).

## Delta 2026-05-03 — TASK-766 CLP currency reader contract (KPI integrity)

Cierra el incidente 2026-05-02 (`/finance/cash-out` mostraba **$1.017.803.262** vs el valor canónico **$11.546.493** — 88× inflado). Convierte el cómputo de KPIs CLP de payments en single-source-of-truth con enforcement mecánico anti-regresión. Subordina las queries inline `SUM(ep.amount × exchange_rate_to_clp)` que poblaban dashboards finance: ese anti-patrón ahora es bloqueado por lint.

**Causa raíz**: el campo `exchange_rate_to_clp` vive en `expenses` / `income` (documento original), NO en el payment. Cuando un expense USD se paga en CLP nativo (caso CCA shareholder reimbursable TASK-714c — payment HubSpot CCA $1.106.321 CLP sobre expense documentado en USD con rate 910.55), multiplicar el monto CLP por el rate USD del documento infla los KPIs en mil millones por payment. El bug era estructural: cualquier nuevo callsite del anti-patrón lo iba a reintroducir.

**Resolución arquitectónica** (no fix puntual — refactor de contrato):

1. **VIEW canónica `greenhouse_finance.expense_payments_normalized`** (mirror `income_payments_normalized`). Expone `payment_amount_clp` con COALESCE chain: `amount_clp` first → CLP-trivial fallback (`WHEN currency='CLP' THEN amount`) → `NULL` con `has_clp_drift=TRUE`. Aplica filtro 3-axis supersede inline (`superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL AND superseded_at IS NULL`). Replica el patrón TASK-571 (`income_settlement_reconciliation`) y TASK-699 (`fx_pnl_breakdown`).

2. **Helper TS canónico** `src/lib/finance/expense-payments-reader.ts` + `income-payments-reader.ts`. API mínima:
   - `sumExpensePaymentsClpForPeriod({fromDate, toDate, expenseType?, supplierId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, supplierClp, payrollClp, fiscalClp, driftCount}`
   - `sumIncomePaymentsClpForPeriod({fromDate, toDate, clientProfileId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, driftCount}`
   - `listExpensePaymentsNormalized` / `listIncomePaymentsNormalized` paginados
   - `getExpensePaymentsClpDriftCount` / `getIncomePaymentsClpDriftCount` para reliability signals

3. **Backfill defensivo** (Slice 2 migration `20260503015255538`): UPDATE idempotente `amount_clp = amount WHERE currency='CLP' AND amount_clp IS NULL` (caso seguro único). 23 income_payments backfilled. CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE atomic, mirror TASK-708/728, cutover 2026-05-03): rechaza INSERT/UPDATE post-cutover sin `amount_clp` para non-CLP.

4. **2 reliability signals canónicos** (subsystem `Finance Data Quality`):
   - `finance.expense_payments.clp_drift` (kind=drift, severity=error si count>0, steady=0)
   - `finance.income_payments.clp_drift` (idem)
   - Documentados en `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta 2026-05-03.

5. **Lint rule mecánica** `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error` desde commit-1. Detecta 4 patrones (expense + income, con/sin COALESCE):
   - `ep.amount * exchange_rate_to_clp`
   - `ep.amount * COALESCE(e.exchange_rate_to_clp, 1)`
   - `ip.amount * exchange_rate_to_clp`
   - `ip.amount * COALESCE(i.exchange_rate_to_clp, 1)`
   Override block exime los 2 readers canónicos. Bloquea cualquier futuro callsite. Patrón heredado de `no-untokenized-copy` (TASK-265).

6. **Repair admin endpoint** `POST /api/admin/finance/payments-clp-repair` (capability granular `finance.payments.repair_clp` — FINANCE_ADMIN + EFEONCE_ADMIN, least-privilege). Body: `{kind, paymentIds?, fromDate?, toDate?, batchSize?, dryRun?}`. Resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates` (rate vigente al pago, NO el actual). Per-row atomic. Idempotente. Soporta `dryRun=true`. Outbox audit `finance.payments.clp_repaired` v1 (catálogo en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-05-03).

7. **Migración exhaustiva**: 8 endpoints migrados al helper canónico. Cuatro de ellos tenían leak de supersede pre-migración, fixed automáticamente como bonus:
   - `/api/finance/cash-out` (Slice 3) — primer migrate, anti-regresión hard `< $20M` en tests
   - `/api/finance/cash-in`, `/api/finance/cash-position`, `/api/finance/dashboard/{pnl,summary}` (Slice 4a)
   - `/api/finance/dashboard/cashflow`, `/api/finance/expenses/summary`, `/api/finance/income/summary` (Slice 4b)

**Tests**: 79 totales verdes — 22 readers (Slice 1), 8 reliability signals (Slice 2), 4 cash-out anti-regresión + 10 RuleTester lint cases (Slice 3), 23 endpoint regression (Slice 4), 12 repair helper + endpoint (Slice 5).

**Política consumer (regla dura)**: ningún módulo de Greenhouse puede recomputar saldos CLP de payments fuera de la VIEW + helper canónicos. Replica el patrón de "consumer obligations" definido en `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` sección 5 — el lint rule lo enforcea, no es convención.

**Spec canónica**: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`. Patrones reusados: TASK-571 (VIEW + helper income_settlement), TASK-699 (FX P&L breakdown contract), TASK-708/728 (CHECK NOT VALID + VALIDATE atomic), TASK-721 (canonical helper enforcement), TASK-765 (reliability signals + outbox audit).

## Delta 2026-05-02 — TASK-765 Payment Order Bank Settlement (atomic contract)

Cierra el incidente 2026-05-01 (2 `payment_orders` quedaron `state='paid'` sin afectar Santander CLP). Convierte el path `payment_order.paid → bank impact` en atómico, observable y resiliente end-to-end. Subordina la sección "Payment Orders como capa canónica" del Delta 2026-05-01: el contrato de transición a `paid` ya no depende del outbox para crear ledger downstream.

### Flow canónico

```text
payroll_period.exported
  → finance_expense_reactive_intake (materializa expenses)
    → payment_obligations.generated  (TASK-748)
      → payment_orders.draft → pending_approval → approved → submitted  (TASK-750)
        → markPaymentOrderPaidAtomic  (TASK-765 Slice 5):
          1. SELECT FOR UPDATE order
          2. assertSourceAccountForPaid  (Slice 1 hard-gate, defense in depth)
          3. UPDATE state='paid' (anti-zombie trigger valida)
          4. recordPaymentOrderStateTransition (audit log append-only)
          5. Per line: recordExpensePayment(input, client) → expense_payment + settlement_leg
          6. publishOutboxEvent('finance.payment_order.paid')
          7. ROLLBACK completo si CUALQUIER step falla
        → account_balances rematerializado
        → BANCO REBAJADO
```

Una sola transacción `withTransaction(client => ...)`. Idempotencia preservada por el partial unique index sobre `expense_payments.payment_order_line_id`.

### Path atómico — por qué importa

Antes de TASK-765, los pasos 5 y 6 vivían detrás del outbox + proyección reactiva (`record_expense_payment_from_order`). Si la proyección skipeaba silenciosamente (resolver `expense_not_found`, `out_of_scope_v1`) o fallaba, la order quedaba `paid` con `expense_payment_id` NULL en sus lines, sin impacto en `account_balances`. El operador veía "Pagada" en UI, el banco intacto, cero alerta.

`markPaymentOrderPaidAtomic` ([`src/lib/finance/payment-orders/mark-paid-atomic.ts:163-380`](../../src/lib/finance/payment-orders/mark-paid-atomic.ts)) corre los 7 steps en una sola tx. Si cualquier line falla `recordExpensePayment` (CHECK violation, materializer drift, supersede chain inconsistente), ROLLBACK completo — la order vuelve al estado anterior y nunca queda zombie.

### Proyector reactivo como safety net read-only

`record_expense_payment_from_order` ([`src/lib/sync/projections/record-expense-payment-from-order.ts`](../../src/lib/sync/projections/record-expense-payment-from-order.ts)) **sigue activo post-Slice 5** pero ahora cumple el rol de safety net:

- Toda order que ya pasó por `markPaymentOrderPaidAtomic` tiene sus lines con `expense_payment_id` poblado. El proyector hace SELECT, detecta `already_linked`, devuelve `skipped[].reason='already_linked'`. No hay double-write.
- La idempotencia natural está garantizada por el partial unique index sobre `expense_payments.payment_order_line_id`. Si el proyector intenta INSERT por carrera con la tx atómica, PG rechaza por unique violation y el reactive worker lo rutea a retry.
- El proyector solo crea downstream nuevo cuando una `payment_order` llegó a `paid` por un path NO-atómico (legacy pre-TASK-765, recovery del incidente vía `/api/admin/finance/payment-orders/[orderId]/recover`).

### Hard-gate triple sobre `source_account_id`

Defense in depth de 4 capas:

1. **CHECK constraint DB** `payment_orders_source_account_required_when_paid`: rechaza UPDATE/INSERT con `state='paid' AND source_account_id IS NULL`.
2. **TS guard** `assertSourceAccountForPaid(orderId, sourceAccountId, targetState)` en [`src/lib/finance/payment-orders/transitions.ts`](../../src/lib/finance/payment-orders/transitions.ts) — invocado tanto en `markPaymentOrderPaid` como en `markPaymentOrderPaidAtomic` antes del UPDATE.
3. **UI** `PaymentOrderApprovalForm.tsx` exige `sourceAccountId` Select required antes de submit con tooltip explicativo.
4. **Trigger PG anti-zombie** `payment_orders_anti_zombie_trigger` BEFORE INSERT/UPDATE — segunda capa DB que también valida `paid_at IS NOT NULL` cuando `state='paid'`.

Cualquier camino futuro que mute `payment_orders` (TASK-756 auto-generación, TASK-707 Previred runtime, etc.) hereda automáticamente las 4 capas — no hay que recordarlas en cada caller.

### State machine canónica + matrix de transiciones

Estados válidos: `draft`, `pending_approval`, `approved`, `submitted`, `paid`, `settled`, `closed`, `cancelled`, `failed`.

Transiciones permitidas (mirror exacto del trigger PG y del helper TS `assertValidPaymentOrderStateTransition`):

| Desde | A |
| --- | --- |
| `draft` | `pending_approval`, `cancelled` |
| `pending_approval` | `approved`, `cancelled` |
| `approved` | `submitted`, `paid`, `cancelled` |
| `submitted` | `paid`, `failed`, `cancelled` |
| `paid` | `settled`, `cancelled` |
| `settled` | `closed` |
| `failed` | `approved`, `cancelled` |

Cualquier otra transición (e.g. `paid → submitted`, `cancelled → approved`, `closed → *`) es rechazada por el trigger PG con `RAISE EXCEPTION 'payment_orders_invalid_state_transition: ...'`.

### Audit log append-only `payment_order_state_transitions`

Tabla nueva ([`migrations/...task-765-payment-order-state-transitions-audit.sql`](../../migrations/)):

- PK `transition_id` (`EO-POT-{uuid8}`).
- FK a `payment_orders(order_id) ON DELETE CASCADE`.
- Columnas: `from_state`, `to_state`, `actor_user_id`, `reason`, `metadata_json JSONB`, `occurred_at`.
- Índices `(order_id, occurred_at)` y partial `(to_state, occurred_at) WHERE to_state IN ('paid','settled','closed','cancelled','failed')`.
- Triggers `payment_order_state_transitions_no_update_trigger` + `payment_order_state_transitions_no_delete_trigger` BEFORE UPDATE/DELETE → `RAISE EXCEPTION`. Append-only enforced a nivel DB.

Helper canónico: `recordPaymentOrderStateTransition({orderId, fromState, toState, actorUserId, reason, metadata}, client?)` en [`src/lib/finance/payment-orders/state-transitions-audit.ts`](../../src/lib/finance/payment-orders/state-transitions-audit.ts). Aceptar `client?` permite que `markPaymentOrderPaidAtomic` insert el row dentro de la misma tx que el UPDATE.

Para correcciones (corner case de un actor humano), insertar nueva fila con `metadata_json.correction_of=<transition_id>`. Nunca UPDATE/DELETE.

### Reliability signals nuevos

3 signals registrados en `RELIABILITY_REGISTRY` bajo el módulo `finance.payment_orders` (rolea al subsystem `Finance Data Quality`). Steady state = 0.

| Signal | Kind | Severidad | Steady |
| --- | --- | --- | --- |
| `finance.payment_orders.paid_without_expense_payment` | `drift` | `error` | 0 |
| `finance.payment_orders.dead_letter` | `dead_letter` | `error` | 0 |
| `finance.payroll_expense.materialization_lag` | `lag` | `warning` | 0 |

Detalle, queries SQL y rollup en [`GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`](./GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md) Delta 2026-05-02.

### Outbox events nuevos

#### `finance.payment_order.settlement_blocked` (v1)

Emitido cuando el resolver del proyector detecta una precondición rota (Slice 4). Reasons canónicos:

```ts
type FinancePaymentOrderSettlementBlockedV1 = {
  eventVersion: 'v1'
  orderId: string
  state: 'paid'
  reason:
    | 'expense_unresolved'        // resolver no encontró expenses tras materialize sincrono
    | 'account_missing'            // source_account_id NULL
    | 'cutover_violation'          // CHECK expense_payments_account_required_after_cutover
    | 'materializer_dead_letter'   // upstream payroll materializer en dead-letter
    | 'out_of_scope_v1'            // V1 no cubre este obligation_kind (e.g. employer_social_security)
  detail: string
  affectedLineIds: string[]
  blockedAt: ISODateString
}
```

Consumers: UI banner en `PaymentOrderDetailDrawer.tsx`, AI Observer, futuras notification policies (TASK-716).

#### `finance.payroll_expenses.rematerialized` (v1, audit-only)

Emitido por `POST /api/admin/finance/payroll-expense-rematerialize` para auditar reruns manuales del materializer.

Ambos registrados en [`GREENHOUSE_EVENT_CATALOG_V1.md`](./GREENHOUSE_EVENT_CATALOG_V1.md) Delta 2026-05-02.

### Endpoints admin nuevos

#### `POST /api/admin/finance/payroll-expense-rematerialize`

Gated por capability `finance.payroll.rematerialize` (FINANCE_ADMIN + EFEONCE_ADMIN). Body `{periodId, year, month, dryRun?}`. Idempotente. Devuelve `{ payrollCreated, payrollSkipped, socialSecurityCreated, socialSecuritySkipped, errors[] }`.

#### `POST /api/admin/finance/payment-orders/[orderId]/recover`

Gated por capability `finance.payment_orders.recover` (FINANCE_ADMIN + EFEONCE_ADMIN). Body `{sourceAccountId, paidAt?}`. Recovery atómico para órdenes paid-zombie:

1. Materializa `expenses` para `(period_id, member_id)` si faltan.
2. UPDATE `source_account_id` y `paid_at`.
3. Insert audit log con `reason='recovery_TASK-765'`.
4. Re-publica outbox `finance.payment_order.paid` con `eventVersion='v1.replay'`.
5. Espera al proyector (poll cada 5s, max 30s).

Usado el 2026-05-02 para recuperar las 2 órdenes del incidente (Luis Reyes + Humberly Henriquez, $402,562.50 CLP combinado contra Santander CLP).

### Reglas duras (heredadas en CLAUDE.md)

- **NUNCA** marcar `state='paid'` con `source_account_id IS NULL`. Hard-gate triple bloquea en 4 capas.
- **NUNCA** dejar `state='paid'` sin downstream completo. El path atómico `markPaymentOrderPaidAtomic` corre TODO en una sola tx; ROLLBACK total si algo falla.
- **NUNCA** skipear silencioso desde el resolver. Throw + outbox `settlement_blocked` con reason estructurada (Slice 4).
- **NUNCA** modificar el INSERT de `expenses`/`income`/`income_payments`/`expense_payments` sin verificar paridad column-count. Test `expense-insert-column-parity.test.ts` valida 14 sites canónicos en CI.
- **NUNCA** transicionar fuera del matrix canónico. Trigger PG + helper TS enforce.
- **NUNCA** modificar `payment_order_state_transitions` (audit log). Append-only enforced por trigger PG.

Spec canónica: [`docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`](../tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md).

## Delta 2026-05-01 — Payment Orders como capa canónica de Tesorería

Se define `Payment Orders` como subdominio de Finance/Tesorería para separar obligaciones, órdenes de pago, pagos reales, settlement y conciliación.

Fuente canónica: `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`.

Reglas principales:

- `Payroll` calcula y exporta obligaciones; no decide ni registra pagos reales.
- `Finance/Tesorería` crea órdenes de pago, resuelve instrumentos, registra payments, modela settlement legs y concilia.
- Una nómina exportada genera obligaciones `generated`; no implica `paid`.
- Colaboradores distintos pueden pagarse por instrumentos distintos mediante `beneficiary_payment_profiles` versionados y políticas de routing.
- Previred, Deel, Global66 y otros processors se modelan como processors/plataformas operativas; el cash vive en la cuenta pagadora real o en settlement legs explícitos.
- Reliquidaciones no reescriben pagos conciliados: generan deltas compensatorios.

## Delta 2026-04-29 — TASK-723 AI-assisted reconciliation intelligence

Conciliacion bancaria incorpora una capa AI **consultiva** sobre el workbench existente. El contrato es deliberadamente conservador para proteger saldos ya cuadrados:

- Tabla nueva: `greenhouse_finance.reconciliation_ai_suggestions`, siempre con `space_id`, `period_id` y `account_id`.
- Runtime: `src/lib/finance/reconciliation-intelligence/*`.
- APIs:
  - `GET /api/finance/reconciliation/[id]/intelligence`
  - `POST /api/finance/reconciliation/[id]/intelligence`
  - `POST /api/finance/reconciliation/[id]/intelligence/[suggestionId]`
- Kill switch: `FINANCE_RECONCILIATION_AI_ENABLED=false` por default.
- Access:
  - `finance.reconciliation.ai_suggestions.read` (`read`, `space`)
  - `finance.reconciliation.ai_suggestions.generate` (`create`, `space`)
  - `finance.reconciliation.ai_suggestions.review` (`update`, `space`)

La capa no escribe `bank_statement_rows` como matched, no crea `income_payments` / `expense_payments`, no toca `account_balances`, no re-materializa saldos y no cierra periodos. Solo persiste sugerencias auditables con `prompt_version`, `model_id`, hashes de input/prompt, evidencia estructurada y simulacion. Aplicar un match sigue pasando por el dialog humano y los endpoints existentes de conciliacion.

El prepass rules-first reutiliza `scoreAutoMatches`; los targets preferidos son `settlement_legs` canónicos post TASK-708/TASK-722. Los candidatos legacy payment-only quedan permitidos solo como fallback de baja confianza y marcados en `evidence_factors_json`. Antes de exponer candidatos al modelo, el resolver filtra por `account_id` para evitar sugerencias cruzadas entre instrumentos.

## Delta 2026-04-28 — TASK-708 + 708b: Nubox Documents-Only SoT + External Cash Signals canonical lane

Cierre del cutover canonico **Nubox = documentos / Greenhouse = dinero**. Cinco mecanismos canonicos quedaron disponibles para cualquier modulo finance:

### 1. `external_cash_signals` — lane generica para senales de cash externas

Tabla `greenhouse_finance.external_cash_signals` (TASK-708 D1) actua como buzon write-only para cualquier `source_system` (Nubox, Previred, file imports, HubSpot, Stripe, manual_admin). Idempotencia natural via `UNIQUE (source_system, source_event_id)`. Cualquier sync externo escribe aca; nunca toca `income_payments` / `expense_payments` directo. Promocion a payment canonico solo via:

- `evaluateSignalAccount` (D5 rule engine) + politica `external_signal_auto_adopt_policies` (D3) cuando una sola regla resuelve cuenta con confianza alta.
- Adopcion manual via UI cola admin `/finance/external-signals` con capability `finance.cash.adopt-external-signal`.

Modulo canonico: `src/lib/finance/external-cash-signals/`. APIs: `recordSignal`, `evaluateSignalAccount`, `adoptSignalManually`, `dismissSignal`.

### 2. Reglas declarativas D5 + politica D3

`account_signal_matching_rules` (datos, no codigo) + `external_signal_resolution_attempts` (audit log inmutable con `evaluator_version` pinned). Politica `external_signal_auto_adopt_policies` controla mode `review` vs `auto_adopt` por `(source_system, space_id)`. Default global conservador: `review` (firma humana cada adopcion).

### 3. Tipo branded `AccountId`

`src/lib/finance/types/account-id.ts` exporta `AccountId = string & { __brand }`. Cualquier API canonica de cash (`recordPayment`, `recordExpensePayment`, `orchestrateSettlement`, `listReconciliationCandidatesByAccount`) recibe `AccountId`, NO `string | null`. Falla en `tsc` si se pasa null. `parseAccountId` valida existencia en `accounts`.

### 4. Conviencion `superseded_at` en CHECKs y queries de health

Cualquier supersede chain (TASK-702 payment, TASK-703b OTB, TASK-708b dismissal manual) excluye filas de invariantes activas. CHECKs y queries que miden "phantom activo" deben filtrar las 3 chains:

```sql
WHERE payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_by_otb_id IS NULL
  AND superseded_at IS NULL
```

CHECK `settlement_legs_principal_requires_instrument` se relajo para incluir `OR superseded_at IS NOT NULL OR superseded_by_otb_id IS NOT NULL`.

### 5. Patron canonico de remediacion historica (TASK-708b)

Para limpiar cohortes phantom de cualquier `source_system` futuro:

- **Backfill retroactivo a signals** (`cohort-backfill.ts`): exposicion en cola admin sin tocar payments originales.
- **Classify proposal** (`historical-remediation.ts:classifyHistoricalSignal`): bank_statement_row match → `repaired_with_account`; D5 rule unique → `repaired`; sino → `dismissed_no_cash` conservador.
- **Apply transactional** (`historical-remediation.ts:applyHistoricalRemediation`): UPDATE in-place del phantom poblando `payment_account_id` (estrategia canonica TASK-708b — convierte phantom en payment canonico LIMPIO sin perder audit).
- **Dismiss sin replacement** (`payment-instruments/dismiss-phantom.ts`): marca `superseded_at + superseded_reason` + outbox event `finance.{income,expense}.payment_dismissed_historical`.
- **Migracion VALIDATE idempotente self-checking (Camino E)**: `RAISE NOTICE + RETURN` si quedan residuos; `ALTER TABLE VALIDATE CONSTRAINT` solo cuando count == 0. Sin estados fragiles.
- **Cascade supersede atomico**: una sola migracion hace DROP + CREATE CHECK + UPDATE cleanup + VALIDATE en transaccion.

Plantilla reusable: `docs/operations/runbooks/_template-external-signal-remediation.md`. Runbook ejecutado: `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md`.

### Reglas duras heredadas

- **Cero DELETE destructivo** sobre payments contaminados. Solo supersede chain (preserva audit).
- **Idempotencia natural** en backfill + apply (re-run safe).
- **Audit firmada**: `actorUserId` obligatorio, queda en `resolved_by_user_id` y outbox events.
- **Nubox NO escribe `income_payments` / `expense_payments`**. Solo `income`, `expenses`, `external_cash_signals`. Path runtime cortado en `src/lib/nubox/sync-nubox-to-postgres.ts`.

### Resultado del apply 2026-04-28

86 phantom payments resueltos: 21 `repaired_with_account` (cuenta `santander-clp` resuelta via D5 rule, $39.3M CLP movido al ledger canonico) + 65 `dismissed_no_cash` ($8.8M CLP marcado como deuda historica sin cash real). 4 settlement legs phantom limpias. CHECK `settlement_legs_principal_requires_instrument` VALIDATED + enforced. Las 6 metricas TASK-708 en `ledger-health` = 0.

### Archivos clave

- `migrations/20260428123802881..143356496..150455638..151421785_*` (8 migraciones del ciclo)
- `src/lib/finance/external-cash-signals/` (modulo canonico signals)
- `src/lib/finance/payment-instruments/dismiss-phantom.ts`
- `src/lib/finance/types/account-id.ts`
- `src/lib/finance/ledger-health.ts` (6 metricas TASK-708 + queries actualizadas con superseded_at)
- `scripts/finance/task708b-{inventory,backfill-signals,classify,apply}.ts`
- `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md` (runbook canonico)
- `docs/operations/runbooks/_template-external-signal-remediation.md` (plantilla reusable)

### Follow-ups

- Activar politica `auto_adopt` para Nubox tras 50+ adopciones manuales validadas.
- Promover `CHECK income/expense_payments_account_required_after_cutover` a `NOT NULL` puro tras 30+ dias de estabilidad post-cutover.
- Notificacion Teams cuando `external_cash_signals_unresolved_over_threshold > 0` por mas de N dias.
- Agregar reglas D5 adicionales (TC, USD, Global66) cuando aparezcan patrones reales.

## Delta 2026-04-27 — Payment Instrument responsible candidates

La administracion de instrumentos de pago ya no acepta responsables como texto libre desde la UI.

- Endpoint nuevo: `GET /api/admin/payment-instruments/responsibles`.
- Guard: `requireFinanceTenantContext()` + capability `finance.payment_instruments.update`.
- Fuente canonica: `greenhouse_core.client_users` + `greenhouse_core.user_role_assignments`, enriquecido con `members` e `identity_profiles`.
- Candidatos asignables: usuarios internos activos (`tenant_type='efeonce_internal'`) con rol activo `finance_admin`, `finance_analyst` o `efeonce_admin`, o con señal operacional financiera en Person360/member profile (`resolved_job_title`, `headline`, `job_title`; por ejemplo `Finance Manager`).
- Avatars: el endpoint aplica `resolveAvatarUrl()` para convertir assets `gs://` a `/api/media/users/:userId/avatar`, manteniendo el cliente fuera de rutas privadas de storage.
- `POST /api/admin/payment-instruments` y `PUT /api/admin/payment-instruments/[id]` validan server-side que `responsible_user_id` pertenezca al set asignable; responsables legacy existentes pueden conservarse sin abrir nuevas asignaciones arbitrarias.

## Delta 2026-04-26 — Nubox Quotes Hot Sync para frescura de cotizaciones

Finance mantiene el full ETL Nubox diario como reconciliación completa, pero
las cotizaciones (`COT` / DTE 52) ahora tienen un carril incremental liviano:

- Cron: `GET /api/cron/nubox-quotes-hot-sync` cada 15 minutos.
- Runtime: `src/lib/nubox/sync-nubox-quotes-hot.ts`.
- Alcance: lee `/sales` solo para la ventana caliente de periodos
  (`NUBOX_QUOTES_HOT_WINDOW_MONTHS`, default 2, max 6), filtra documentos tipo
  cotización y reutiliza el mismo upsert canónico de `sync-nubox-to-postgres`.
- Evidencia durable: escribe primero raw snapshots en
  `greenhouse_raw.nubox_sales_snapshots`, luego snapshots conformed en
  `greenhouse_conformed.nubox_sales`, y recién después proyecta a
  `greenhouse_finance.quotes`.
- Observabilidad: cada corrida registra `source_object_type='quotes_hot_sync'`
  en `greenhouse_sync.source_sync_runs`; fallos van a
  `greenhouse_sync.source_sync_failures`.
- Operación manual robusta: `pnpm sync:nubox:quotes-hot -- --period=2026-04`
  ejecuta el mismo pipeline end-to-end, no inserciones manuales.

## Delta 2026-04-24 — `expenses/meta` Postgres-first metadata providers

El endpoint `GET /api/finance/expenses/meta` deja de tratar el schema legacy de BigQuery como precondición global. La metadata del drawer ahora se compone por providers con ownership explícito:

- `suppliers` → `greenhouse_finance.suppliers` / reader Postgres canónico
- `accounts` → `greenhouse_finance.accounts` / reader Postgres canónico
- instituciones históricas de gastos → `greenhouse_finance.expenses` / reader Postgres `listFinanceExpenseSocialSecurityInstitutionsFromPostgres`
- instituciones previsionales/salud de Payroll → `greenhouse_payroll.compensation_versions` / reader Postgres `listPayrollSocialSecurityInstitutionsFromPostgres`

BigQuery queda solo como carril legacy de compatibilidad por slice, no como guard global del endpoint. Si los enrichments opcionales no están disponibles, el drawer mantiene `200` con defaults y payload crítico intacto.

## Delta 2026-04-21 — Chile VAT Ledger & Monthly Position (TASK-533)

Greenhouse ya puede materializar una posicion mensual de IVA Chile por `space_id` sin recalcular inline en UI ni depender de planillas manuales.

### Nuevas tablas

| Tabla | Uso |
|---|---|
| `greenhouse_finance.vat_ledger_entries` | Ledger tributario por documento y bucket (`debit_fiscal`, `credito_fiscal`, `iva_no_recuperable`). |
| `greenhouse_finance.vat_monthly_positions` | Snapshot mensual consolidado por `space_id` + periodo (`year`, `month`). |

El ledger usa como source canonica:

- `greenhouse_finance.income.tax_snapshot_json` para débito fiscal de ventas.
- `greenhouse_finance.expenses.tax_snapshot_json` + `recoverable_tax_amount` + `non_recoverable_tax_amount` para crédito fiscal y IVA no recuperable de compras.

### Runtime nuevo

- Helper central: `src/lib/finance/vat-ledger.ts`
  - `materializeVatLedgerForPeriod(year, month, reason)`
  - `materializeAllAvailableVatPeriods(reason)`
  - readers `getVatMonthlyPosition`, `listVatMonthlyPositions`, `listVatLedgerEntries`
- Projection reactiva: `src/lib/sync/projections/vat-monthly-position.ts`
  - escucha `finance.income.{created,updated,nubox_synced}`
  - escucha `finance.expense.{created,updated,nubox_synced}`
  - publica `finance.vat_position.period_materialized`
- `ops-worker` gana `POST /vat-ledger/materialize` como lane canónica de recomputo/backfill pesado fuera de Vercel serverless.

### Serving y surface mínima

- `GET /api/finance/vat/monthly-position`
  - scope tenant-safe vía `requireFinanceTenantContext()`
  - responde snapshot del periodo, periodos recientes y ledger entries
  - soporta `format=csv` para export operativo
- `POST /api/internal/vat-ledger-materialize`
  - requiere contexto admin
  - permite recomputo de un periodo o backfill bulk
- `FinanceDashboardView` incorpora una card de posición mensual con:
  - débito fiscal
  - crédito fiscal
  - IVA no recuperable
  - saldo fiscal del periodo
  - export CSV

### Reglas operativas

- El ledger se consolida por `space_id`; ningún reader mensual debe mezclar tenants.
- El débito fiscal nace solo desde ventas con snapshot tributario explícito.
- El crédito fiscal nace solo desde `recoverable_tax_amount`; el IVA no recuperable queda separado y no incrementa crédito.
- `vat_common_use_amount` sigue entrando hoy como recoverability parcial ya resuelta en `expenses`; una política tributaria más fina de prorrata futura queda como follow-up y no altera el contrato actual del ledger.

### Archivos clave

- `src/lib/finance/vat-ledger.ts`
- `src/lib/sync/projections/vat-monthly-position.ts`
- `src/app/api/finance/vat/monthly-position/route.ts`
- `src/app/api/internal/vat-ledger-materialize/route.ts`
- `src/views/greenhouse/finance/components/VatMonthlyPositionCard.tsx`
- `services/ops-worker/server.ts`
- Migration: `20260421200121412_task-533-chile-vat-ledger-monthly-position.sql`

## Delta 2026-04-21 — Purchase VAT Recoverability (TASK-532)

`greenhouse_finance.expenses` deja de tratar el IVA de compras como un `tax_rate` suelto y persiste una semántica contable explícita: crédito fiscal recuperable vs IVA no recuperable que debe capitalizarse en costo.

### Nuevas columnas

En `greenhouse_finance.expenses`:

| Columna | Uso |
|---|---|
| `tax_code` | Código canónico de compra (`cl_input_vat_credit_19` / `cl_input_vat_non_recoverable_19` / `cl_vat_exempt` / `cl_vat_non_billable`). |
| `tax_recoverability` | Recoverability persistida en la fila (`full` / `partial` / `none` / `not_applicable`). |
| `tax_rate_snapshot` | Tasa congelada (19% o `null`). |
| `tax_amount_snapshot` | Monto tributario congelado en moneda del documento. |
| `tax_snapshot_json` | Snapshot `ChileTaxSnapshot` v1 del documento de compra. |
| `is_tax_exempt` | Derivado rápido para filtros y bridges. |
| `tax_snapshot_frozen_at` | Timestamp de congelamiento del snapshot. |
| `recoverable_tax_amount` | Parte del IVA que permanece como crédito fiscal. |
| `non_recoverable_tax_amount` | Parte del IVA que se capitaliza a costo/gasto. |
| `effective_cost_amount` | Costo operativo canónico: `subtotal + non_recoverable_tax_amount`. |
| `*_clp` | Espejo CLP de recoverable / non-recoverable / effective cost para consumers downstream. |

### Runtime nuevo

- `POST /api/finance/expenses`, `PUT /api/finance/expenses/[id]` y `POST /api/finance/expenses/bulk` pasan por `buildExpenseTaxWriteFields()`.
- El helper resuelve `tax_code`, congela el snapshot y deriva tres buckets:
  - `recoverableTaxAmount`
  - `nonRecoverableTaxAmount`
  - `effectiveCostAmount`
- `payroll-expense-reactive` y las compras nuevas creadas desde Nubox también escriben el contrato nuevo; los gastos de nómina nacen como `cl_vat_non_billable`.
- El fallback BigQuery de `expenses` ahora persiste y rehidrata el mismo contrato tributario y la metadata relevante (`space_id`, `source_type`, payment provider/rail y purchase metadata).

### Regla operativa

- IVA recuperable NO infla costo operativo.
- IVA no recuperable SÍ entra al costo efectivo.
- `tax_recoverability = 'partial'` conserva la parte recuperable fuera del costo y solo capitaliza `vat_unrecoverable_amount`.
- `vat_common_use_amount` marca recoverability parcial, pero no se capitaliza a costo hasta que el ledger mensual (TASK-533) materialice el tratamiento completo.

### Downstream

- `compute-operational-pl`, `postgres-store-intelligence`, `service-attribution`, `member-capacity-economics`, dashboards P&L y readers de provider/tooling dejan de sumar `expenses.total_amount_clp` bruto y pasan a leer `COALESCE(effective_cost_amount_clp, total_amount_clp)`.
- El contrato nuevo desacopla:
  - **ledger tributario**: `recoverable_tax_amount*`
  - **costo operativo**: `effective_cost_amount*`
- `TASK-533` debe consumir `expenses.tax_snapshot_json` + buckets recoverable/non-recoverable como source canónica de crédito fiscal de compras.

### Backfill

La migración `20260421192902964_task-532-purchase-vat-recoverability.sql` backfillea el histórico usando `tax_amount`, `dte_type_code`, `exempt_amount`, `vat_unrecoverable_amount` y `vat_common_use_amount`, y deja `effective_cost_amount` listo para consumers existentes sin recalcular inline.

### Delta 2026-05-09 — Nubox BHE / honorarios con retención

Las compras Nubox tipo `BHE` (boleta de honorarios electrónica) pueden traer
un `total_amount` pagable neto de retención, por ejemplo:
`net_amount=175000`, `total_withholding_amount=26688`,
`total_amount=148312`.

Contrato canónico en PostgreSQL:

- `expenses.total_amount` conserva el monto pagable/conciliable contra banco.
- `expenses.withholding_amount` conserva la retención informada por Nubox.
- `expenses.effective_cost_amount` y `tax_snapshot_json.totalAmount`
  representan el costo bruto fiscal/operativo antes de retención.
- `sync-nubox-to-postgres` valida el snapshot contra el bruto fiscal
  (`total_amount + withholding_amount`) cuando la retención explica la
  diferencia, sin relajar las validaciones globales de IVA.

Rationale: pagos/conciliación necesitan el neto pagable; P&L y costo operativo
necesitan el bruto antes de retención. Mezclar ambas semánticas en un solo total
rompe conciliación bancaria o margen, según el lado que consuma el dato.

### Archivos clave

- `src/lib/finance/expense-tax-snapshot.ts`
- `src/app/api/finance/expenses/{route,[id]/route,bulk/route}.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payroll-expense-reactive.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/service-attribution/materialize.ts`
- Migration: `20260421192902964_task-532-purchase-vat-recoverability.sql`

### Follow-ups

1. `TASK-533` debe materializar el ledger mensual de IVA sobre los buckets persistidos y resolver explícitamente el tratamiento de `vat_common_use_amount`.
2. Las surfaces UI de compras pueden exponer más adelante `effectiveCostAmount` y `taxRecoverability` como campos visibles si Finance lo necesita operativamente.

## Delta 2026-04-21 — Quote Tax Explicitness Chile IVA (TASK-530)

`greenhouse_commercial.quotations` y `quotation_line_items` ahora persisten un snapshot tributario inmutable por versión. El pricing engine sigue trabajando en **neto**; el IVA se añade como contrato documental en builder / detail / PDF.

### Nuevas columnas

En `greenhouse_commercial.quotations` y `quotation_line_items`:

| Columna | Uso |
|---|---|
| `tax_code` | Canonical code (`cl_vat_19` / `cl_vat_exempt` / `cl_vat_non_billable`). |
| `tax_rate_snapshot` | Tasa congelada (null para exento / no-facturable). |
| `tax_amount_snapshot` | Monto de IVA en moneda del quote. |
| `tax_snapshot_json` | Snapshot completo `ChileTaxSnapshot` v1 con `frozenAt`. |
| `is_tax_exempt` | Derivado — true para `vat_exempt`/`vat_non_billable`. |
| `tax_snapshot_frozen_at` (solo header) | Timestamp del congelamiento. |

CHECK constraints aseguran: `tax_code ∈ {cl_vat_19, cl_vat_exempt, cl_vat_non_billable}` y coherencia `tax_code ⇔ tax_snapshot_json ⇔ tax_snapshot_frozen_at`.

### Flujo de persistencia

`persistQuotationPricing` llama a `buildQuotationTaxSnapshot({ netAmount, taxCode?, spaceId?, issuedAt })` (default `cl_vat_19`) y graba las 5 columnas del header. Cada line item hereda el `tax_code` y graba su propio snapshot proporcional a `subtotalAfterDiscount`. El pricing engine sigue retornando **neto**; el IVA se computa post-engine.

### UI / PDF

- **Builder**: el `QuoteSummaryDock` recibe `ivaAmount` (preview cliente-side con `previewChileTaxAmounts` — 19% Chile default). `subtotal` neto, `total` con IVA. `TotalsLadder` renderiza `Subtotal · IVA · Total` cuando hay IVA.
- **PDF**: `RenderQuotationPdfInput.totals.tax` (opcional) con `{ code, label, rate, amount, isExempt }`. El documento muestra una línea explícita "IVA 19%" / "IVA Exento" / "No Afecto a IVA" entre Subtotal y Total.
- **Detail**: el canonical store expone `taxCode`, `taxRate`, `taxAmount`, `taxSnapshot`, `isTaxExempt` vía `getFinanceQuoteDetailFromCanonical`.

### Backfill

Migración backfilla rows existentes: `tax_rate ≈ 0.19` → `cl_vat_19`; `tax_rate = 0` → `cl_vat_exempt`; `tax_rate IS NULL` → `cl_vat_non_billable`. Cada row obtiene un snapshot sintético que preserva el legacy `tax_amount`.

### Cliente-safe module

`src/lib/finance/pricing/quotation-tax-constants.ts` expone `DEFAULT_CHILE_IVA_RATE`, `QUOTE_TAX_CODE_LABELS`, `QUOTE_TAX_CODE_RATES`, `previewChileTaxAmounts()` sin `server-only` para que builder / dock / detail / PDF renderer hagan preview optimista antes de persistir. El server siempre re-resuelve el rate real desde el catálogo (`resolveChileTaxCode`) al issue time.

### Archivos clave

- `src/lib/finance/pricing/quotation-tax-snapshot.ts` — server helper + serializer.
- `src/lib/finance/pricing/quotation-tax-constants.ts` — client preview constants.
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` — writes persisten snapshot.
- `src/lib/finance/quotation-canonical-store.ts` — reads exponen snapshot.
- `src/lib/finance/pdf/{contracts,quotation-pdf-document}.tsx` — PDF renderiza IVA.
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` — dock wiring.
- Migration: `20260421162238991_task-530-quote-tax-snapshot.sql`.

### Follow-ups

1. Selector explícito de `tax_code` en el builder (dropdown con IVA 19% / Exento / No Afecto). Hoy el default es `cl_vat_19`; el operador no lo puede cambiar sin edit post-issue.
2. Email template que incluya el breakdown de IVA (`src/emails/` no tiene template de quote aún).
3. Per-line override de tax_code cuando haya casos mixtos (schema ya soporta; UI pendiente).
4. Integración con income bridge (TASK-524 / TASK-531): el income hereda `tax_code` del quote al materializarse.

## Delta 2026-04-21 — Income / Invoice Tax Convergence (TASK-531)

`greenhouse_finance.income` y `income_line_items` convergen al mismo contrato tributario canonico que quotations. El write path manual, la materialización quote→invoice y los bridges downstream dejan de depender de `tax_rate = 0.19` como semántica implícita.

### Nuevas columnas

En `greenhouse_finance.income`:

| Columna | Uso |
|---|---|
| `tax_code` | Canonical code (`cl_vat_19` / `cl_vat_exempt` / `cl_vat_non_billable`). |
| `tax_rate_snapshot` | Tasa congelada (null para exento / no facturable). |
| `tax_amount_snapshot` | Monto tributario congelado. |
| `tax_snapshot_json` | Snapshot completo `ChileTaxSnapshot` v1 persistido en el agregado. |
| `is_tax_exempt` | Derivado para filtros / bridges downstream. |
| `tax_snapshot_frozen_at` | Timestamp de congelamiento del snapshot. |

En `greenhouse_finance.income_line_items`:

| Columna | Uso |
|---|---|
| `tax_code` | Carrier tributario por línea. |
| `tax_rate_snapshot` | Tasa congelada por línea. |
| `tax_amount_snapshot` | Monto tributario por línea. |
| `tax_snapshot_json` | Snapshot degradado o explícito por línea. |
| `is_tax_exempt` | Reemplaza el rol exclusivo de `is_exempt`. |

### Runtime nuevo

- `POST /api/finance/income` y `PUT /api/finance/income/[id]` pasan por `buildIncomeTaxWriteFields()`: ya no aceptan el default implícito `0.19`; resuelven `tax_code` y congelan snapshot al momento del write.
- `materializeInvoiceFromApprovedQuotation` y `materializeInvoiceFromApprovedHes` heredan el snapshot tributario de la quotation y lo persisten congelado en `income`.
- `createFinanceIncomeInPostgres()` se vuelve el writer común del agregado para que los materializers publiquen también `finance.income.created`.
- `income_hubspot_outbound` consume `tax_code` / `is_tax_exempt` de header y líneas; el synthetic line item deja de asumir gravado por default.
- `sync-nubox-to-postgres` publica `incomeId` en `finance.income.nubox_synced` y las filas nuevas creadas desde ventas Nubox nacen con `tax_code` + snapshot persistidos.

### Backfill

La migración `20260421183955091_task-531-income-tax-convergence.sql` backfillea:

- header `income`: heurísticas sobre `tax_amount`, `tax_rate`, `dte_type_code`, `exempt_amount`
- `income_line_items`: asignación degradada desde el header y `is_exempt`

El contrato resultante es: `tax_code ⇔ tax_snapshot_json ⇔ tax_snapshot_frozen_at` en header, y `tax_code ⇔ tax_snapshot_json` en line items.

### Archivos clave

- `src/lib/finance/income-tax-snapshot.ts`
- `src/app/api/finance/income/{route,[id]/route,[id]/lines/route}.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-{quotation,hes}.ts`
- `src/lib/finance/income-hubspot/push-income-to-hubspot.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- Migration: `20260421183955091_task-531-income-tax-convergence.sql`

### Follow-ups

1. Exponer selector explícito de `tax_code` en la UI de income cuando el flujo manual lo necesite.
2. Endurecer line items nuevos de `income` para que nazcan con snapshot detallado, no solo degradado por backfill.
3. VAT ledger mensual (TASK-533) debe consumir `income.tax_snapshot_json` como source canónica de débito fiscal.

## Delta 2026-04-21 — Income → HubSpot Invoice Bridge (TASK-524)

`greenhouse_finance.income` es espejado reactivamente a HubSpot como objeto nativo `invoice` (**non-billable mirror**, `hs_invoice_billable=false`). Nubox sigue siendo el emisor tributario; HubSpot es una proyección read-only para continuidad CRM.

### Nuevas columnas en `greenhouse_finance.income`

| Columna | Uso |
|---|---|
| `hubspot_invoice_id` | Id del objeto `invoice` en HubSpot (UNIQUE parcial). |
| `hubspot_last_synced_at` | Timestamp del último attempt (success o failure). |
| `hubspot_sync_status` | `pending` · `synced` · `failed` · `endpoint_not_deployed` · `skipped_no_anchors` |
| `hubspot_sync_error` | Último mensaje de error (limpiado al siguiente success). |
| `hubspot_sync_attempt_count` | Counter monotónico para backoff del retry worker. |
| `hubspot_artifact_note_id` | Id del engagement/note que attacha el DTE (Fase 2 del contrato). |
| `hubspot_artifact_synced_at` | Timestamp del artifact attach. |

### Inheritance de anchors desde quote-to-cash

`materializeInvoiceFromApprovedQuotation` y `materializeInvoiceFromApprovedHes` ahora **heredan** `hubspot_deal_id` (directo de la quote) + `hubspot_company_id` (via `organizations.hubspot_company_id` join). El income nace anclado al mismo hilo comercial que la quote.

### Projection reactiva

`src/lib/sync/projections/income-hubspot-outbound.ts` (domain `cost_intelligence`) escucha `finance.income.created`, `finance.income.updated` y `finance.income.nubox_synced`. Delega a `pushIncomeToHubSpot(incomeId)` que:

1. Guard: sin `hubspot_company_id` ni `hubspot_deal_id` → `skipped_no_anchors` (trace + evento, sin call).
2. Construye payload con `line_items` reales (si hay en `greenhouse_finance.income_line_items`) o synthetic single-line desde `total_amount`.
3. Llama a `upsertHubSpotGreenhouseInvoice()` del Cloud Run service.
4. Si 404 → `endpoint_not_deployed` (sin rethrow, retry worker lo toma cuando aterrice la ruta).
5. Si 5xx/network → `failed` (trace + evento + rethrow para retry backoff).
6. Success → `synced` + persist `hubspot_invoice_id` + emit `finance.income.hubspot_synced`.

### Eventos nuevos emitidos

- `finance.income.hubspot_synced`
- `finance.income.hubspot_sync_failed` (con campo `status` distinguiendo failed / endpoint_not_deployed / skipped_no_anchors)
- `finance.income.hubspot_artifact_attached` (reservado Fase 2)

### Archivos clave

- `src/lib/finance/income-hubspot/` — types, events, bridge
- `src/lib/sync/projections/income-hubspot-outbound.ts` — projection
- `src/lib/integrations/hubspot-greenhouse-service.ts` — `upsertHubSpotGreenhouseInvoice()` con fallback stateless de endpoint_not_deployed
- Migration: `20260421125353997_task-524-income-hubspot-invoice-trace.sql`

### Follow-ups

- Fase 2 del contrato: al `finance.income.nubox_synced` adjuntar PDF/XML/DTE como engagement/note al invoice + deal + company.
- Contact association best-effort via `contact_identity_profile_id` en la quote cuando exista el campo.
- Admin Center surface para listar rows con `hubspot_sync_status ∈ (failed, endpoint_not_deployed, skipped_no_anchors)`.
- Deploy de la ruta `/invoices` en `hubspot-greenhouse-integration` Cloud Run service.
> **Audience:** Backend engineers, finance product owners, agents implementing finance features

---

## Delta 2026-04-21 — TASK-529 Chile Tax Code Foundation

- `TASK-529` crea la capa canónica de tax codes Chile-first sobre la que `TASK-530/531/532/533` van a persistir snapshots de IVA.
- Hasta ahora `tax_rate` (19% hardcoded) era el contrato primario en `income`, `expenses`, `quotes` y `quotations`. A partir de esta task pasa a ser un snapshot derivado de un `tax_code` canónico — la tasa suelta deja de ser first-class semantics.

**Runtime nuevo en `greenhouse_finance`:**

- Tabla `greenhouse_finance.tax_codes` — catálogo jurisdiction-agnostic con effective dating:
  - `tax_code` (ID humano, ej. `cl_vat_19`), `jurisdiction` (`CL`), `kind` (`vat_output` | `vat_input_credit` | `vat_input_non_recoverable` | `vat_exempt` | `vat_non_billable`)
  - `rate` NUMERIC(6,4) nullable (NULL para exempt/non-billable)
  - `recoverability` (`full` | `partial` | `none` | `not_applicable`) — first-class, no inferida
  - `effective_from` / `effective_to` para versionado regulatorio
  - `space_id` nullable: `NULL` = catálogo global; populado = override tenant-specific
  - Unique constraints por `(tax_code, jurisdiction, effective_from)` global + `(tax_code, jurisdiction, effective_from, space_id)` scoped
- Seed Chile v1 (effective_from `2026-01-01`, global):
  - `cl_vat_19` — IVA output 19%
  - `cl_vat_exempt` — IVA exento (DL 825 art.12)
  - `cl_vat_non_billable` — operación no afecta
  - `cl_input_vat_credit_19` — IVA crédito fiscal 19%
  - `cl_input_vat_non_recoverable_19` — IVA sin derecho a crédito

**Helpers canónicos en `src/lib/tax/chile/`:**

- `loadChileTaxCodes(context)` — lee el catálogo aplicando overrides por `spaceId` y filtro `effective_from/to`; cache in-memory 5 min.
- `resolveChileTaxCode(taxCode, context)` — lookup por ID con precedence tenant-scoped > global; lanza `ChileTaxCodeNotFoundError` (dura).
- `computeChileTaxAmounts({ code, netAmount })` → `{ taxableAmount, taxAmount, totalAmount }` — aplica la tasa, redondea a 2 decimales (CLP).
- `computeChileTaxSnapshot({ code, netAmount, issuedAt })` → `ChileTaxSnapshot` — congela la tasa + etiqueta + metadata al momento del issue. Los aggregates downstream persisten este shape verbatim para que re-renders/audits reproduzcan la foto original.
- `validateChileTaxSnapshot(snapshot)` — re-compute vs persisted; tolerancia 1 peso; úsalo en audit pipelines (TASK-533).
- `ChileTaxSnapshot` versión `1`: `{ version, taxCode, jurisdiction, kind, rate, recoverability, labelEs, effectiveFrom, frozenAt, taxableAmount, taxAmount, totalAmount, metadata }`.

**Contrato para aggregates downstream (TASK-530/531/532/533):**

1. Todo documento financiero que soporte impuestos debe persistir `tax_code` explícito más el `ChileTaxSnapshot` (JSONB, junto al registro) en lugar de una columna `tax_rate` suelta.
2. Re-renders (PDF de quote, email, portal cliente) leen del snapshot, no del catálogo live. Un cambio regulatorio posterior no muta documentos ya emitidos.
3. Recoverability se lee del snapshot (`recoverability`), no se infiere por signo ni por tipo de documento. Esto es lo que TASK-532 va a usar para separar IVA crédito fiscal vs. no recuperable en expenses.
4. Sin `tax_code` el documento no se puede emitir — el resolver lanza `ChileTaxCodeNotFoundError` y la aprobación debe fallar antes de persistir.

**Out of scope de TASK-529 (queda para 530–533):**

- UI tributaria del builder / detail / PDF.
- Re-anclar `income.tax_rate` / `expenses.tax_rate` a snapshots persistidos.
- Retenciones (honorarios), boletas, regímenes especiales fuera de IVA v1.
- Multi-country — el shape soporta múltiples jurisdicciones pero sólo Chile está seedeada.

**Referencia:** `src/lib/tax/chile/index.ts` · migración `20260421105127894_task-529-chile-tax-code-foundation.sql` · tests `src/lib/tax/chile/*.test.ts`.

---

## Delta 2026-04-20 — TASK-480 cierra replay input + bulk repricing seguro

- `TASK-480` deja explícito que provenance/confidence no basta por sí sola para repricing fiel: el canon ahora persiste también el contrato mínimo de replay del pricing engine v2.
- Runtime nuevo en `greenhouse_commercial`:
  - `quotations.pricing_context` guarda `commercialModelCode`, `countryFactorCode` y flags de replay del engine
  - `quotation_line_items.pricing_input` guarda el `PricingLineInputV2` persistido por línea
- Regla operativa:
  - `commercial-cost-worker` ya no deja `POST /quotes/reprice-bulk` reservado; ahora ejecuta repricing batch tenant-scoped usando `strictReplay`
  - quotes sin `pricing_context` o sin `pricing_input` suficiente no se repricingean a ciegas: quedan `skipped`
  - el fallback catalog-level de tools deja de quedar implícito; el engine emite `tool_catalog_fallback` como `costBasisKind` explícito
- Read-side:
  - el edit path de quotations rehidrata `pricingInput`/metadata real en vez de deducirla solo desde columnas degradadas
  - document chain y APIs de líneas ya exponen provenance persistida sin recomputar costo inline

## Delta 2026-04-20 — TASK-452 agrega la foundation reusable de attribution por servicio

- Finance/commercial ya no debe intentar derivar P&L por servicio leyendo `income`, `expenses` y `commercial_cost_attribution` directamente desde cada consumer.
- Runtime nuevo:
  - `greenhouse_serving.service_attribution_facts`
  - `greenhouse_serving.service_attribution_unresolved`
  - helper/materializer `src/lib/service-attribution/materialize.ts`
  - projection reactiva `service_attribution`
  - evento `accounting.service_attribution.period_materialized`
- Regla operativa:
  - revenue y direct cost se atribuyen con anchors documentales/comerciales fuertes cuando existen
  - labor/overhead comercial sigue naciendo en `commercial_cost_attribution`; el split a `service_id` ocurre downstream usando share de revenue y fallback conservador
  - Agency y surfaces client-facing siguen sin fabricar `service_economics` hasta que exista el read model derivado (`TASK-146`)

## Delta 2026-04-19 — TASK-479 People Actual Cost + Blended Role Snapshots

- `member_capacity_economics` se reafirma como la fuente factual reusable del lane `member_actual`; no nace una tabla paralela de costo persona-level.
- Runtime nuevo en `greenhouse_commercial`:
  - `member_role_cost_basis_snapshots`: bridge mensual persona -> `sellable_role` con `employment_type_code`, `mapping_source`, `source_ref`, freshness y confidence
  - `role_blended_cost_basis_snapshots`: agregado mensual por `role_id + employment_type_code + period` con weighting por FTE/horas reales, `sample_size` y confidence agregada
- Regla de matching explícita:
  - Identity Access `active_role_codes` NO es source of truth de rol comercial
  - el bridge se resuelve desde evidencia operativa/comercial existente (`assignment_role_title_override`, `person_membership.role_label`, `members.role_title`) contra el catálogo `sellable_roles`
- `commercial-cost-worker` scope `people` ya no refresca solo `member_capacity_economics`; ahora orquesta:
  - costo factual por persona (`member_actual`)
  - bridge persona -> rol comercial
  - snapshot `role_blended`
- `pricing-engine-v2` debe preferir `role_blended` cuando la cotización pide costo por rol y solo caer a `role_modeled` cuando no existe evidencia real reusable para el período.
- Consumers People/Person 360 no deben leer columnas inventadas de `member_capacity_economics`; consumen el reader compartido para evitar drift.

## Delta 2026-04-19 — TASK-477 formaliza role_modeled como lane explícito y materializable

- `greenhouse_commercial.sellable_role_cost_components` deja de ser solo un breakdown editable y pasa a ser también el source estructurado del lane `role_modeled`:
  - nuevos campos persistidos: `direct_overhead_pct`, `shared_overhead_pct`, `source_kind`, `source_ref`, `confidence_score`
  - nuevas columnas generadas: `confidence_label`, `direct_overhead_amount_usd`, `shared_overhead_amount_usd`, `loaded_monthly_cost_usd`, `loaded_hourly_cost_usd`
- Runtime nuevo:
  - `greenhouse_commercial.role_modeled_cost_basis_snapshots`
  - helper `src/lib/commercial-cost-basis/role-modeled-cost-basis.ts`
  - scope `roles` en `src/lib/commercial-cost-worker/materialize.ts`
- Regla operativa:
  - `role_blended` sigue ganando cuando existe evidencia factual reusable para el período
  - `role_modeled` ya no debe resolverse leyendo inline el breakdown crudo desde cualquier consumer; el lane canónico es el reader de snapshots modelados con provenance/confidence
  - la materialización batch de `role_modeled` vive en `commercial-cost-worker`, no en `ops-worker` ni en recomputes ad hoc desde request-response
- Implicación para quotation pricing:
  - el engine puede exponer `costBasisSourceRef`, `costBasisSnapshotDate`, `costBasisConfidenceScore` y `costBasisConfidenceLabel` sin inventar metadata auxiliar
  - country sigue resuelto por `employment_types.country_code` y la seniority sigue baked-in en el `sellable_role` / SKU; esta task no duplica esas dimensiones

## Delta 2026-04-19 — Currency & FX Platform Foundation (TASK-475)

- Se formalizó la matriz canónica de monedas por dominio + política FX + contrato de readiness. El contrato vive en `src/lib/finance/currency-domain.ts` + `currency-registry.ts` y lo consumen el engine, las APIs y los futuros consumers client-facing.
- **Matriz por dominio** (`CURRENCY_DOMAIN_SUPPORT`):
  - `finance_core`: `['CLP', 'USD']` — estable, alineado con `FinanceCurrency` transaccional. NO se expande en esta task.
  - `pricing_output`: `['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN']` — superficie comercial multi-moneda.
  - `reporting`: `['CLP']` — CLP-normalizado por contrato (P&L, metric registry).
  - `analytics`: `['CLP']` — CLP-normalizado (`operational_pl`, `member_capacity_economics`, cost intelligence).
- **FX policy matrix** (`FX_POLICY_DEFAULT_BY_DOMAIN`):
  - `finance_core` → `rate_at_event` (snapshot al reconocer la transacción).
  - `pricing_output` → `rate_at_send` (congela tasa al emitir el artefacto client-facing).
  - `reporting`/`analytics` → `rate_at_period_close` (normaliza al cierre del período).
- **Readiness contract** (`FxReadiness`): estados `supported | supported_but_stale | unsupported | temporarily_unavailable`. Incluye `rate`, `rateDateResolved`, `source`, `ageDays`, `stalenessThresholdDays`, `composedViaUsd`, `message`.
- **Currency registry** (`src/lib/finance/currency-registry.ts`): policy declarativa por moneda — provider, fallback strategies (`inverse`, `usd_composition`, `none`), sync cadence, coverage class (`auto_synced` | `manual_only` | `declared_only`). Hoy `USD`/`CLP` = `auto_synced` (Mindicador + OpenER). `CLF`/`COP`/`MXN`/`PEN` = `manual_only` (pending provider wire-up).
- **Resolver canónico** (`src/lib/finance/fx-readiness.ts`): `resolveFxReadiness({from, to, rateDate, domain})`. Chain: identity → domain gate → direct lookup → inverse (si registry permite) → composición vía USD (si registry permite) → clasificación por threshold. Endpoint HTTP: `GET /api/finance/exchange-rates/readiness?from=X&to=Y&domain=pricing_output`.
- **Engine integration**: el pricing engine v2 llama a `resolvePricingOutputFxReadiness` al inicio del pipeline y emite structured warnings `fx_fallback` (`critical` si unsupported/temporarily_unavailable, `warning` si stale, `info` si composed via USD). El fallback silencioso `?? 1` queda como compat path pero el engine ya no depende de él para decidir; siempre pasa por readiness.
- **Compatibility rule**: los consumers CLP-normalizados existentes (`operational_pl`, `member_capacity_economics`, `tool-cost-reader` target CLP, payroll CLP/USD) NO cambian. Esta task solo endurece el contrato compartido y sus readers.
- **Escalabilidad**: agregar una moneda nueva requiere 3 edits: `CURRENCIES_ALL`, `CURRENCY_DOMAIN_SUPPORT[domain]` y una entrada en `CURRENCY_REGISTRY`. No hay hardcodes en engine/UI que tocar.

## Delta 2026-04-19 — Pricing / Commercial Cost Basis runtime split formalized

- Finance quotation pricing no debe absorber toda la carga de `Commercial Cost Basis` dentro de request-response.
- Contrato nuevo del lane:
  - `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` y sus consumers siguen siendo el carril de preview interactivo y composición de pricing en portal.
  - la materialización de snapshots role/tool/people/provider, el repricing batch y el feedback quoted-vs-actual pertenecen a un worker dedicado de Cloud Run.
- Regla operativa:
  - el quote builder puede leer snapshots, provenance y confidence ya resueltos;
  - no debe disparar recomputes pesados cross-domain cada vez que un usuario cambia una línea o variante comercial;
  - cualquier expansión del engine hacia workloads batch debe seguir la topología definida por `TASK-483`;
  - `ops-worker` no es el runtime base del lane comercial; su scope sigue siendo reactivo/operativo.

Implicación para el backlog:

- `TASK-477` a `TASK-482` ya no se interpretan como mejoras puramente in-app.
- La evolución del pricing lane debe respetar el split `interactive lane` vs `compute lane`.

## Delta 2026-04-19 — TASK-483 formaliza la runtime topology del commercial cost basis engine

- Finance/commercial ya no debe asumir que toda materializacion pesada de costo cabe en Vercel o debe vivir dentro de `ops-worker`.
- Runtime nuevo:
  - tabla `greenhouse_commercial.commercial_cost_basis_snapshots` como manifest/ledger por `scope + period + run`
  - helper `src/lib/commercial-cost-worker/materialize.ts`
  - fallback admin route `POST /api/internal/commercial-cost-basis/materialize`
  - worker dedicado `services/commercial-cost-worker/`
- Contrato operativo:
  - `member_capacity_economics` sigue siendo la fuente people-level
  - `provider_tooling_snapshots` sigue siendo la fuente tools/provider-level
  - `commercial_cost_attribution` y `client_economics` siguen siendo los downstreams de margen/costo real
  - el worker nuevo orquesta people/tools/bundle y publica eventos coarse-grained de periodo; no recalcula metricas ICO inline
  - la siguiente ola (`roles`, `quote repricing`, `margin feedback`) debe acoplarse a este runtime en vez de colgar endpoints pesados nuevos en Vercel

## Delta 2026-04-19 — TASK-478 agrega el read model fino de costo comercial por tool/provider

- `provider_tooling_snapshots` deja de ser la unica capa tools/provider reutilizable: ahora convive con `greenhouse_commercial.tool_provider_cost_basis_snapshots` para granularidad `tool_id + provider_id + period`.
- Contrato nuevo:
  - `provider_tooling_snapshots` sigue siendo el agregado mensual provider-level
  - `tool_provider_cost_basis_snapshots` resuelve costo comercial reusable por herramienta con `source_kind`, `source_ref`, `snapshot_date`, freshness, confidence y metadata FX
  - el worker `commercial-cost-worker` monta ambos cortes dentro del scope `tools`
- Regla operativa:
  - pricing y supplier detail deben preferir este read model fino antes de caer al costo crudo del catálogo
  - el catálogo `greenhouse_ai.tool_catalog` sigue siendo anchor de identidad/prorrateo, no snapshot ni ledger de costo
  - las corridas tenant-aware pueden estampar `organization_id` / `client_id` / `space_id`, pero el baseline actual sigue siendo `global` mientras no exista una asignación tool-cost por tenant más precisa en upstreams

## Delta 2026-04-18 — TASK-464c Tool Catalog + Overhead Addons Foundation

- Finance quotation pricing gana la capa de costos directos y fees complementarios que faltaba para el engine v2:
  - `greenhouse_ai.tool_catalog` ahora expone `tool_sku`, prorrateo, business lines y tags de aplicabilidad
  - `greenhouse_commercial.overhead_addons` modela los 9 fees/overheads de Efeonce fuera del catálogo de tools
- Implicación operativa:
  - el runtime actual de TASK-346 no cambia todavía su cálculo legacy
  - `TASK-464d` ya puede consumir herramientas y overheads desde stores canónicos, sin volver al Excel ni mezclar tool costs con markups/fees
- Guardrails explícitos:
  - el catálogo de tools sigue compartido con AI tooling; no se crea identidad paralela en Finance
  - los addons no viven en `greenhouse_finance.*`; se tratan como inputs comerciales del quote engine
  - reseed idempotente ya verificado para `26` tools activas y `9` addons

## Delta 2026-04-18 — TASK-464b Pricing Governance Tables

- Finance quotation pricing sigue sin cutover inmediato, pero gana la capa de governance que el engine v2 ya puede consumir:
  - `role_tier_margins`
  - `service_tier_margins`
  - `commercial_model_multipliers`
  - `country_pricing_factors`
  - `fte_hours_guide`
- Implicación operativa:
  - el runtime actual de TASK-346 no cambia su surface ni su storage legacy
  - `TASK-464d` ya puede resolver margen óptimo por tier, multiplicador comercial, factor país y equivalencia FTE↔horas sin volver al Excel
- Hallazgo relevante para downstream:
  - el seed dejó `21` drifts entre `role-tier-margins.csv` y `sellable_roles.tier`
  - esos drifts se tratan como señal de reconciliación, no como motivo para sobrescribir el catálogo canónico

## Delta 2026-04-18 — TASK-464a Sellable Roles Catalog Foundation

- Finance quotation pricing gana un backbone comercial más rico, pero sin cutover inmediato:
  - `greenhouse_commercial.role_rate_cards` sigue siendo la fuente consumida por el engine vigente de TASK-346.
  - `greenhouse_commercial.sellable_roles`, `employment_types`, `sellable_role_cost_components`, `role_employment_compatibility` y `sellable_role_pricing_currency` quedan listas para el refactor de TASK-464d.
- Implicación operativa:
  - Finance mantiene su contrato estable actual.
  - El programa pricing/revenue pipeline ya puede modelar costo por SKU `ECG-XXX`, modalidad contractual y moneda de venta sin crear identidades paralelas fuera del schema comercial.
- Guardrail explícito:
  - la foundation comercial no toca `greenhouse_payroll.*`; la convergencia de vocabulario con payroll queda aislada en TASK-468.

## Delta 2026-04-17 — TASK-345 Quotation canonical bridge materialized

- Finance quotations deja de depender solo de `greenhouse_finance.*` como storage leído por APIs.
- Estado nuevo del lane:
  - writers runtime siguen entrando por `greenhouse_finance.quotes`, `quote_line_items` y `products`
  - el anchor canónico ya existe en `greenhouse_commercial.*`
  - `GET /api/finance/quotes`, `GET /api/finance/quotes/[id]` y `GET /api/finance/quotes/[id]/lines` ya leen vía façade canónica manteniendo payload legacy
- `finance.quote.*`, `finance.quote_line_item.*` y `finance.product.*` siguen siendo la familia runtime vigente del outbox.
- HubSpot/Nubox ahora deben tratarse como writers del bridge, no como writers exclusivos de Finance tables.
- La lane sigue siendo `finance-first surface`, pero ya no es `finance-only storage`.

## Delta 2026-04-16 — Finance Signal Engine (TASK-245)

- Primer engine de señales AI fuera del ICO Engine.
- Detecta anomalías estadísticas (Z-score rolling 6m) sobre `greenhouse_finance.client_economics` por cliente:
  - `net_margin_pct`, `gross_margin_pct`, `total_revenue_clp`, `direct_costs_clp`, `indirect_costs_clp`, `net_margin_clp`
- Solo emite deteriorations (improvements no generan signals; mantiene el dashboard limpio).
- Enriquecimiento con LLM (Gemini 2.5 Flash) via prompt domain-aware `finance_signal_enrichment_v1` con glosario financiero y cadena causal propia:
  - Revenue ↓ o Direct Costs ↑ → Gross Margin ↓ → Net Margin ↓ → flujo de caja operativo ↓
- Resultado visible en Finance Dashboard (`/finance`) como `NexaInsightsBlock` entre KPIs y Economic Indicators.
- Infraestructura:
  - Tablas PG: `greenhouse_serving.finance_ai_signals`, `greenhouse_serving.finance_ai_signal_enrichments`, `greenhouse_serving.finance_ai_enrichment_runs`
  - Migración: `migrations/20260416235432829_task-245-finance-ai-signals.sql`
  - Código: `src/lib/finance/ai/` (detector, materializer, llm provider, worker, reader, resolver, types)
  - Cloud Run endpoints: `POST /finance/materialize-signals`, `POST /finance/llm-enrich` en `services/ico-batch/server.ts`
  - Vercel cron: `GET /api/cron/finance-ai-signals` (fallback manual; producción usa Cloud Run)
  - Reader API: `GET /api/finance/intelligence/nexa-insights?year=YYYY&month=MM`
- Eventos outbox: `finance.ai_signals.materialized`, `finance.ai_llm_enrichments.materialized`.
- Advisory-only: nunca bloquea workflows financieros; el disclaimer del componente Nexa se respeta.
- Fuente canónica de contrato: `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`.

## Delta 2026-04-11 — Shareholder account anchored semantically to Person ↔ Legal Entity

- `Finance > Cuenta accionista` sigue siendo owner del instrumento, ledger, settlement y balances.
- Regla nueva:
  - la CCA no debe interpretarse como extensión primaria de `user`, `member` ni `space`
  - su semántica canónica es una relación `person ↔ legal entity`
  - `profile_id`, `member_id` opcional y `space_id` siguen siendo anclas útiles de runtime, pero no sustituyen la contraparte económica primaria
- Regla complementaria:
  - `executive compensation` y `shareholder current account` son carriles distintos
  - cualquier compensación/cruce entre ambos debe ser explícita y auditable
- Fuente canónica complementaria:
  - `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

## Delta 2026-04-07

- **TASK-280**: Módulos de caja implementados
  - Tabla `expense_payments` creada (simétrica a `income_payments`) con trigger de derivación
  - Backfill automático de expenses con `payment_status = 'paid'`
  - 3 surfaces nuevas: Cobros (`/finance/cash-in`), Pagos (`/finance/cash-out`), Posición de caja (`/finance/cash-position`)
  - Componentes UI compartidos: `PaymentRegistrationCard`, `PaymentHistoryTable` — reutilizados en IncomeDetailView y ExpenseDetailView
  - Evento `finance.expense_payment.recorded` registrado en catálogo y 4 projections
  - Navegación Finance actualizada con sección Caja (3 items nuevos)

## Delta 2026-04-10 — Shareholder account canonical traceability completed (TASK-306)

- **La CCA deja de depender de IDs manuales como interfaz primaria**
  - `greenhouse_finance.shareholder_account_movements` ahora persiste `source_type` + `source_id` como contrato canónico de origen
  - `source_type` admite `manual`, `expense`, `income`, `expense_payment`, `income_payment`, `settlement_group`
  - los vínculos legacy (`linked_expense_id`, `linked_income_id`, `linked_payment_id`, `linked_payment_type`, `settlement_group_id`) siguen como compatibilidad operativa, pero ya no gobiernan el UX principal
- **Validación tenant-safe en backend**
  - la resolución de origen corre server-side desde `src/lib/finance/shareholder-account/source-links.ts`
  - `expense` se valida por `space_id`
  - `income` se valida por sus anclas canónicas (`organization_id`, `client_id`, `client_profile_id`) porque no tiene `space_id` directo en el modelo actual
  - `expense_payment`, `income_payment` y `settlement_group` se resuelven contra su documento/pago real antes de persistir o exponer el vínculo
- **Read model enriquecido y navegación cross-module**
  - `GET/POST /api/finance/shareholder-account/[id]/movements` ya devuelve `sourceType`, `sourceId` y un objeto `source` con label, estado, monto, fecha y `href`
  - nueva lookup API `GET /api/finance/shareholder-account/lookups/sources` para búsqueda remota tenant-scoped de egresos, ingresos y pagos
  - `ExpenseDetailView` e `IncomeDetailView` ya abren CCA precontextualizada vía query params (`sourceType`, `sourceId`)
- **Settlement se mantiene como capa derivada**
  - `settlement_group_id` ya no debe capturarse manualmente en el drawer de CCA
  - cuando el origen real es un pago o un documento con settlement existente, backend deriva o resuelve el settlement desde esa entidad
  - las métricas y balances siguen consumiéndose desde settlement / `account_balances`; no se recalculan inline

## Delta 2026-04-08 — Shareholder current account module completed (TASK-284)

- **Nuevo instrumento de tesorería `shareholder_account`**
  - `greenhouse_finance.accounts.instrument_category` ahora admite `shareholder_account`
  - la CCA no vive como identidad paralela: se monta 1:1 encima de `accounts.account_id`
  - mantiene compatibilidad con `account_balances`, settlement orchestration y cierres por instrumento
- **Nuevo subdominio `greenhouse_finance.shareholder_accounts`**
  - extiende el instrumento con `profile_id`, `member_id` opcional, `ownership_percentage`, `status`, `notes`, `space_id` y `metadata_json`
  - el vínculo person-aware se resuelve contra `greenhouse_core.identity_profiles` y `greenhouse_core.members`
  - soporta el caso donde el accionista también es usuario interno / admin del portal
- **Nuevo ledger `greenhouse_finance.shareholder_account_movements`**
  - append-only para cargos/abonos bilaterales entre empresa y accionista
  - cada movimiento persiste `direction` (`credit` = empresa debe, `debit` = accionista debe), `movement_type`, monto, FX, referencias documentales y `running_balance_clp`
  - puede vincular opcionalmente `expense_id`, `income_id`, `payment_id`, `settlement_group_id` y una cuenta contraparte
- **Settlement y proyecciones reutilizadas**
  - registrar un movimiento crea `settlement_group` + `settlement_legs` con `leg_type = funding`
  - la rematerialización de `account_balances` usa el mismo carril reactivo que Banco/Tesorería
  - eventos nuevos publicados al outbox:
    - `finance.shareholder_account.created`
    - `finance.shareholder_account_movement.recorded`
    - `finance.settlement_leg.recorded`
- **Nueva superficie operativa**
  - página `GET /finance/shareholder-account`
  - APIs:
    - `GET/POST /api/finance/shareholder-account`
    - `GET /api/finance/shareholder-account/people`
    - `GET /api/finance/shareholder-account/[id]/balance`
    - `GET/POST /api/finance/shareholder-account/[id]/movements`
  - view code nuevo: `finanzas.cuenta_corriente_accionista`
  - acceso alineado a la misma política que `Banco`: `efeonce_admin`, `finance_admin`, `finance_analyst`, salvo override explícito por authorized views
  - la creación de cuentas ya busca personas por nombre/email en Identity y autocompleta `profile_id` / `member_id`

## Delta 2026-04-08 — Payment Instruments Registry + FX Tracking (TASK-281)

- **Tabla `accounts` evolucionada** con 10 nuevas columnas para Payment Instruments:
  - `instrument_category` (bank_account, credit_card, fintech, payment_platform, cash, payroll_processor, shareholder_account)
  - `provider_slug` — link al catálogo estático de proveedores (`src/config/payment-instruments.ts`)
  - `provider_identifier` — ID de cuenta en el proveedor externo
  - `card_last_four`, `card_network` — campos de tarjeta
  - `credit_limit` — límite de crédito
  - `responsible_user_id` — persona responsable del instrumento
  - `default_for` — array de usos por defecto (payroll, suppliers, tax, etc.)
  - `display_order` — orden en selectores y listas
  - `metadata_json` — campo extensible JSONB
- **FX tracking en payment tables** — `income_payments` y `expense_payments` tienen:
  - `exchange_rate_at_payment` — tipo de cambio al momento del pago
  - `amount_clp` — monto equivalente en CLP al tipo de cambio del pago
  - `fx_gain_loss_clp` — diferencia entre CLP al tipo de cambio del pago vs tipo de cambio del documento
- **FX auto-calculado** en `recordPayment()` y `recordExpensePayment()` via `resolveExchangeRateToClp()`
- **Bidirectional FX resolver** — `resolveExchangeRate({ fromCurrency, toCurrency })` en `shared.ts`
- **Provider catalog** — 20 proveedores con logos SVG en `public/images/logos/payment/`:
  - 10 bancos chilenos (BCI, Chile, Santander, Estado, Scotiabank, Itaú, BICE, Security, Falabella, Ripley)
  - 3 redes de tarjeta (Visa, Mastercard, Amex)
  - 4 fintech (PayPal, Wise, MercadoPago, Global66)
  - 3 plataformas (Deel, Stripe, Previred)
- **Admin Center CRUD** — `/admin/payment-instruments` con TanStack table, 4 KPIs, drawer de creación por categoría
- **`PaymentInstrumentChip`** — componente con logo SVG + fallback a Avatar initials
- **Selectores de instrumento** en RegisterCashIn/OutDrawer, CreateIncome/ExpenseDrawer
- **Columna instrumento** en CashInListView y CashOutListView con logo
- **KPI "Resultado cambiario"** en CashPositionView

### Archivos clave TASK-281

| Archivo | Función |
|---------|---------|
| `migrations/20260408091711953_evolve-accounts-to-payment-instruments.sql` | DDL evolución accounts + FX columns |
| `src/config/payment-instruments.ts` | Catálogo de proveedores, categorías, logos |
| `src/components/greenhouse/PaymentInstrumentChip.tsx` | Chip con logo + fallback |
| `src/app/api/admin/payment-instruments/route.ts` | GET list + POST create |
| `src/app/api/admin/payment-instruments/[id]/route.ts` | GET detail + PUT update |
| `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx` | Admin list view |
| `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx` | Drawer de creación |

## Delta 2026-04-27 — Payment Instrument Admin Workspace Enterprise (TASK-697)

- **Tenant-scope correction gate**
  - `greenhouse_finance.accounts` y tablas relacionadas de ledger/tesoreria ahora exponen `space_id` como boundary operacional:
    - `accounts`
    - `income_payments`
    - `expense_payments`
    - `settlement_groups`
    - `settlement_legs`
    - `account_balances`
    - `reconciliation_periods`
  - El backfill es conservador hacia el espacio interno canonico (`space-efeonce` / `internal_space`) cuando existe.
  - Los readers/admin helpers nuevos resuelven `space_id` desde `TenantContext.spaceId` y fallback interno para `efeonce_admin`.
- **Workspace admin seguro**
  - `/admin/payment-instruments/[id]` deja de ser una ficha defensiva y pasa a workspace con secciones de configuracion, actividad, conciliacion e auditoria.
  - `GET /api/admin/payment-instruments/[id]` entrega un contrato seguro: datos sensibles enmascarados por defecto, readiness, impacto operativo, treasury summary, auditoria y capacidades efectivas.
  - `POST /api/admin/payment-instruments/[id]/reveal-sensitive` revela valores completos solo de forma temporal, con capability, motivo obligatorio y audit redacted.
  - `POST /api/admin/payment-instruments/[id]/reveal` queda como alias compatible del reveal seguro.
- **Audit trail**
  - Nueva tabla `greenhouse_finance.payment_instrument_admin_audit_log`.
  - Registra `created`, `updated`, `deactivated`, `reactivated` y `revealed_sensitive`.
  - Nunca persiste el valor sensible revelado; guarda campo, actor, motivo, diff redacted e impacto.
- **Access model final**
  - Surface visible: `administracion.instrumentos_pago`.
  - Capabilities:
    - `finance.payment_instruments.read`
    - `finance.payment_instruments.update`
    - `finance.payment_instruments.manage_defaults`
    - `finance.payment_instruments.deactivate`
    - `finance.payment_instruments.reveal_sensitive`
  - Backend aplica capabilities por accion; la UI solo refleja disponibilidad.
- **Eventos**
  - El catalogo de eventos formaliza `finance.account.created/updated` y los eventos redacted de payment instruments (`created`, `updated`, `status_changed`, `sensitive_revealed`).

## Delta 2026-04-08 — Reconciliation settlement orchestration completed (TASK-282)

- **Conciliación quedó `ledger-first` de forma operativa**
  - candidatos y matching alineados a `income_payments` / `expense_payments`
  - `matched_settlement_leg_id` persistido en `bank_statement_rows`
  - `auto-match`, `match`, `unmatch` y `exclude` ya usan el store Postgres sin duplicar eventos de pago en las routes
- **Settlement orchestration quedó utilizable desde runtime**
  - helper `getSettlementDetailForPayment()` para inspección del settlement group real de un payment
  - helper `recordSupplementalSettlementLegForPayment()` para agregar `internal_transfer`, `funding`, `fx_conversion` y `fee`
  - endpoint `GET/POST /api/finance/settlements/payment`
  - drawer UI `SettlementOrchestrationDrawer` accesible desde el historial de pagos/cobros
- **Registro operativo de caja ya soporta configuración multi-leg**
  - `POST /api/finance/expenses/[id]/payments` acepta `exchangeRateOverride`, `settlementMode`, `fundingInstrumentId`, `feeAmount`, `feeCurrency`, `feeReference`
  - `POST /api/finance/income/[id]/payments` acepta `exchangeRateOverride`, `feeAmount`, `feeCurrency`, `feeReference`
  - `RegisterCashOutDrawer` y `RegisterCashInDrawer` ya exponen esos campos operativos
- **Settlement + reconciliación ya publican y consumen eventos canónicos**
  - catálogo con `finance.internal_transfer.recorded` y `finance.fx_conversion.recorded`
  - projections `client_economics`, `operational_pl`, `commercial_cost_attribution` y `period_closure_status` escuchan settlement/reconciliation relevante
  - `data-quality` audita drift entre `payments`, `settlement_groups`, `settlement_legs` y períodos cerrados/reconciliados
- **UX operativa de conciliación**
  - `ReconciliationDetailView` muestra snapshots de instrumento/proveedor/moneda del período
  - permite `Marcar conciliado` y `Cerrar período` usando `PUT /api/finance/reconciliation/[id]`
  - la acción queda bloqueada hasta tener extracto importado, diferencia en cero y sin rows pendientes
  - los snapshots (`account_reconciliation_snapshots.pg_closing_balance`) son evidencia de drift al instante declarado, no fuente de apertura contable; la apertura de un periodo nuevo viene del `account_balances` canonico del dia anterior al inicio del periodo, salvo override explicito y auditado

## Delta 2026-04-08 — Bank & Treasury module completed (TASK-283)

- **Nueva tabla `greenhouse_finance.account_balances`**
  - snapshot diario por instrumento (`account_id`, `balance_date`)
  - persiste `opening_balance`, `period_inflows`, `period_outflows`, `closing_balance`
  - guarda equivalente CLP, FX usado, resultado cambiario, conteo transaccional y estado de cierre del período
  - UNIQUE `(account_id, balance_date)` para materialización idempotente
- **Materialización reactiva de tesorería**
  - helper `materializeAccountBalance()` y readers en `src/lib/finance/account-balances.ts`
  - `rematerializeAccountBalanceRange()` distingue dos modos de seed:
    - `active_otb`: replay auditado desde la OTB activa; uso para re-anchors/backfills historicos controlados
    - `explicit`: replay incremental desde un cierre ya materializado; uso obligatorio para crons rolling como `ops-finance-rematerialize-balances`
  - los crons rolling no deben reemplazar su seed explicito por OTB ni mutar `accounts.opening_balance`; esto evita que una corrida diaria de 7 dias reescriba historia bancaria completa
  - si existe un snapshot protegido `reconciled`/`accepted` dentro del lookback, el cron rolling lo usa como seed efectivo y preserva la fila diaria de ese checkpoint; solo reconstruye fechas posteriores para no pisar saldos ya cuadrados
  - antes de confirmar una rematerializacion, `account-balance-evidence-guard` compara los cierres recien materializados contra snapshots protegidos `reconciled` o `accepted`; si hay drift fuera de tolerancia, aborta la transaccion antes de escribir saldos dañados
  - snapshots `reconciled` representan verdad bancaria/proveedor externo y bloquean contra `bank_closing_balance`; snapshots `accepted` representan checkpoints operativos aceptados y bloquean contra `pg_closing_balance`, preservando cualquier drift banco-vs-PG visible como pendiente/aceptado. Ambos bloquean drift futuro sin hardcodear montos en runtime; snapshots `open` siguen siendo evidencia pendiente y no bloquean el materializador
  - projection `accountBalancesProjection` escucha:
    - `finance.income_payment.recorded`
    - `finance.expense_payment.recorded`
    - `finance.settlement_leg.recorded|reconciled|unreconciled`
    - `finance.internal_transfer.recorded`
    - `finance.fx_conversion.recorded`
    - `finance.reconciliation_period.reconciled|closed`
  - la UI `Banco` lee el snapshot materializado como source of truth
- **Transferencias internas como movimiento canónico de tesorería**
  - helper `recordInternalTransfer()` en `src/lib/finance/internal-transfers.ts`
  - crea `settlement_group` con `settlement_mode = 'internal_transfer'`
  - crea legs `internal_transfer` para salida/entrada y `fx_conversion` cuando la transferencia cruza monedas
  - rematerializa balances de ambas cuentas desde la fecha del movimiento
- **Nuevas APIs**
  - `GET/POST /api/finance/bank`
    - overview por instrumento
    - coverage de `payment_account_id`
    - asignación retroactiva de cobros/pagos a una cuenta
  - `GET/POST /api/finance/bank/[accountId]`
    - detalle de cuenta
    - historial de 12 meses
    - movimientos recientes
    - cierre de período por cuenta
  - `POST /api/finance/bank/transfer`
    - alta de transferencias internas standalone
- **Nueva superficie UI**
  - página `GET /finance/bank`
  - vista `BankView`
  - drawers:
    - `AccountDetailDrawer`
    - `AssignAccountDrawer`
    - `InternalTransferDrawer`
  - access view registrado como `finanzas.banco`
- **Integración con el ecosistema**
  - `Banco`, `Cobros`, `Pagos`, `Conciliación` y `Posición de caja` comparten ahora la misma base instrument-aware
  - los drawers operativos de caja ya consumen `/api/finance/accounts` en vez de la route admin-only de instrumentos

---

## Delta 2026-04-07 — Products catalog + Quote Line Items (TASK-211)

Dos nuevas tablas en `greenhouse_finance`:

### `greenhouse_finance.products`

Catalogo de productos sincronizado desde HubSpot o creado manualmente.

- ID: `GH-PROD-{hubspot_product_id}` para HubSpot, UUID para manual
- Columnas clave: `name`, `sku`, `unit_price`, `cost_of_goods_sold`, `is_recurring`, `billing_frequency`
- Margen calculado en API: `(unit_price - cost_of_goods_sold) / unit_price * 100`
- Sync: cron diario `hubspot-products-sync` (8 AM)

### `greenhouse_finance.quote_line_items`

Line items transaccionales vinculados a quotes. FK a `quotes(quote_id)` y opcionalmente a `products(product_id)`.

- ID: `GH-LI-{hubspot_line_item_id}` para HubSpot
- Synced automaticamente con cada quote sync (TASK-210)
- Creados localmente en outbound quotes con product picker

### Sinergia con TASK-210

- Quote sync ahora sincroniza line items despues de cada quote
- Quote outbound persiste line items en transaccion
- CreateQuoteDrawer tiene product picker que auto-fill nombre + precio

### Endpoints

- `GET /api/finance/products` — catalogo con filtros (source, active, search)
- `POST /api/finance/products/hubspot` — crear producto en HubSpot + local
- `GET /api/finance/quotes/{id}/lines` — line items de una quote con JOIN a products

### Archivos clave

| Archivo | Funcion |
|---------|---------|
| `migrations/20260407193443222_create-products-and-quote-line-items.sql` | DDL |
| `src/lib/hubspot/sync-hubspot-products.ts` | Inbound product sync |
| `src/lib/hubspot/sync-hubspot-line-items.ts` | Inbound line items sync per quote |
| `src/lib/hubspot/create-hubspot-product.ts` | Outbound product creation |
| `src/app/api/cron/hubspot-products-sync/route.ts` | Cron endpoint |
| `src/views/greenhouse/finance/ProductCatalogView.tsx` | UI catalogo |
| `scripts/backfill-hubspot-products.ts` | Backfill one-time |

## Delta 2026-04-07 — HubSpot Quotes bidirectional integration (TASK-210)

`greenhouse_finance.quotes` es ahora multi-source. Nuevas columnas: `source_system` (`nubox`/`hubspot`/`manual`), `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`.

### Inbound (HubSpot → Greenhouse)

- Cloud Run service `hubspot-greenhouse-integration` expone `GET /companies/{id}/quotes`
- Client: `getHubSpotGreenhouseCompanyQuotes()` en `src/lib/integrations/hubspot-greenhouse-service.ts`
- Sync: `syncAllHubSpotQuotes()` en `src/lib/hubspot/sync-hubspot-quotes.ts`
- Cron: `GET /api/cron/hubspot-quotes-sync` cada 6 horas, con readiness gate
- Identity resolution: `hubspot_company_id` → `organization_id` → `space_id` + `client_id`
- ID format: `QUO-HS-{hubspot_quote_id}` (coexiste con `QUO-NB-{nubox_sale_id}`)
- Status mapping: HubSpot `hs_status` → Greenhouse normalized (`DRAFT`→`draft`, `APPROVAL_NOT_NEEDED`→`sent`, etc.)

### Outbound (Greenhouse → HubSpot)

- Cloud Run service expone `POST /quotes` (crea quote + line items + asociaciones)
- Client: `createHubSpotGreenhouseQuote()` en `src/lib/integrations/hubspot-greenhouse-service.ts`
- Logic: `createHubSpotQuote()` en `src/lib/hubspot/create-hubspot-quote.ts`
- API: `POST /api/finance/quotes/hubspot` con validacion
- Patron: resolver org → call Cloud Run → persist local → outbox event (transaccional)

### API update

- `GET /api/finance/quotes` ahora devuelve `source`, `hubspotQuoteId`, `hubspotDealId`
- Nuevo query param: `?source=hubspot|nubox|manual`
- `isFromNubox` se mantiene como campo derivado de backward compat

### Outbox events

- `finance.quote.synced` — inbound sync desde HubSpot
- `finance.quote.created` — outbound creation hacia HubSpot (con `direction: 'outbound'`)

### Archivos clave

| Archivo | Funcion |
|---------|---------|
| `migrations/20260407182811937_add-hubspot-quotes-columns.sql` | DDL + backfill |
| `src/lib/hubspot/sync-hubspot-quotes.ts` | Inbound sync |
| `src/lib/hubspot/create-hubspot-quote.ts` | Outbound create |
| `src/app/api/cron/hubspot-quotes-sync/route.ts` | Cron endpoint |
| `src/app/api/finance/quotes/hubspot/route.ts` | POST outbound API |
| `scripts/backfill-hubspot-quotes.ts` | Backfill one-time |

## Delta 2026-04-05 — schema drift in Finance lists now surfaces as explicit degraded payload

Las routes Finance que antes respondían vacío ante `relation/column does not exist` ya no deben ocultar drift de schema como si fuera ausencia sana de datos.

Carriles ajustados:

- `purchase-orders`
- `hes`
- `quotes`
- `intelligence/operational-pl`

Nuevo contrato runtime:

- la shape base de lista se preserva (`items` / `total` o `snapshots`)
- el payload agrega `degraded: true`, `errorCode` y `message`
- el consumer puede distinguir explícitamente schema drift de un estado realmente vacío

Objetivo:

- no romper consumidores existentes que esperan listas
- evitar que Finance oculte incidentes reales como “sin datos”

## Delta 2026-04-05 — create routes reuse request-scoped IDs across dual-store fallback

`POST /api/finance/income` y `POST /api/finance/expenses` ya no deben recalcular un segundo identificador si el path Postgres-first alcanzó a generar uno antes de caer al fallback BigQuery.

Nuevo contrato runtime:

- el request mantiene un ID canónico por operación de create
- si PostgreSQL ya generó `income_id` o `expense_id`, BigQuery fallback debe reutilizar ese mismo valor
- solo cuando no existía ID previo y no se pudo generar en el carril Postgres, el fallback puede asignar uno propio

Objetivo:

- evitar duplicidad lógica cross-store por recalcular secuencias distintas en una misma operación
- preservar el comportamiento de fallback sin degradar integridad básica del ledger

## Delta 2026-04-03 — Currency comparison helpers como módulo compartido de Finance

`src/lib/finance/currency-comparison.ts` es un módulo de funciones puras (sin `'server-only'`) que vive en Finance pero es importable desde cualquier módulo client o server:

- `consolidateCurrencyEquivalents(totals, usdToClp)` — consolida `{ USD, CLP }` → totales CLP y USD usando la tasa canónica
- `computeCurrencyDelta(current, compare, rate, label)` — delta % entre períodos con referencia CLP
- `payrollTrendDirection(deltaPct)` / `formatDeltaLabel(deltaPct, label)` — formateo para `HorizontalWithSubtitle` props

Regla: las conversiones multi-currency deben pasar por estos helpers, no math inline. La tasa se resuelve server-side vía `resolveExchangeRateToClp()` y se pasa como `fxRate` al client.

## Delta 2026-04-03 — Nubox sales/purchases are document ledgers, not pure cash events

Se formaliza una aclaración semántica importante para Finance:

- `greenhouse_finance.income` y `greenhouse_finance.expenses` son ledgers operativos de **devengo/documento**
- cuando el source es `Nubox`, los registros representan primero:
  - documentos de venta
  - documentos de compra
  - notas/ajustes tributarios asociados
- esos registros **no deben leerse como equivalentes directos a cobro/pago**

Carriles correctos:

- venta emitida / documento de venta:
  - `greenhouse_finance.income`
  - fecha relevante: `invoice_date`
- compra / obligación documentada:
  - `greenhouse_finance.expenses`
  - fecha relevante: `document_date`
- cobro real:
  - `greenhouse_finance.income_payments`
  - fecha relevante: `payment_date`
- pago real:
  - `greenhouse_finance.expenses.payment_date`
  - más conciliación y bank movements cuando aplique

Regla operativa:

- las surfaces Finance no deben presentar una factura de Nubox como si fuera por sí misma un cobro
- ni una compra de Nubox como si fuera por sí misma un pago
- el módulo puede seguir usando `income` / `expenses` para P&L devengado, pero debe distinguir visualmente documento/devengo vs caja

### `greenhouse_finance.expense_payments` — Pagos contra compras

Tabla simétrica a `income_payments`. Cada fila es un pago individual ejecutado contra un documento de compra.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payment_id` | TEXT PK | Prefijo `exp-pay-` + UUID |
| `expense_id` | TEXT FK | Referencia al documento de compra |
| `payment_date` | DATE | Fecha del pago real |
| `amount` | NUMERIC(14,2) | Monto pagado (> 0) |
| `currency` | TEXT | Moneda del pago |
| `reference` | TEXT | Referencia bancaria o comprobante |
| `payment_method` | TEXT | transfer, credit_card, etc. |
| `payment_source` | TEXT | manual, payroll_system, nubox_sync, bank_statement |
| `is_reconciled` | BOOLEAN | Vinculado a extracto bancario |

**Trigger `trg_sync_expense_amount_paid`**: Después de INSERT/UPDATE/DELETE, recalcula `expenses.amount_paid = SUM(expense_payments.amount)` y deriva `payment_status`.

**Evento outbox**: `finance.expense_payment.recorded` — consumido por client-economics, commercial-cost-attribution, operational-pl, period-closure-status.

## Delta 2026-04-07 — labor_cost_clp separado en client_economics + type consolidation

`client_economics` ahora tiene una columna `labor_cost_clp` dedicada para el costo laboral (de `commercial_cost_attribution`), separada de `direct_costs_clp` (allocaciones + gastos directos) e `indirect_costs_clp`.

Cambios estructurales:

- **Migración**: `20260407171920933_add-labor-cost-clp-to-client-economics.sql` — agrega columna + backfill desde `commercial_cost_attribution.commercial_labor_cost_target`
- **Compute pipeline**: `computeClientEconomicsSnapshots` ahora trackea `laborCosts` separado de `directCosts` en el `clientMap`
- **Sanitizer**: `sanitizeSnapshotForPresentation` requiere `laborCostClp` (no opcional) — `totalCosts = labor + direct + indirect`. Si un consumer no lo pasa, TypeScript lo rechaza.
- **360 facet**: `AccountClientProfitability.laborCostCLP` expuesto por `fetchEconomicsFacet` → query incluye `COALESCE(ce.labor_cost_clp, 0)`
- **Finance legacy**: `getOrganizationFinanceSummary` incluye `labor_cost_clp` en el SELECT y en `OrganizationClientFinance`
- **Tipos consolidados**: `OrganizationClientFinance` y `OrganizationFinanceSummary` definidas una sola vez en `src/views/greenhouse/organizations/types.ts`. El backend (`organization-store.ts`) importa y re-exporta — no hay duplicados.

Impacto en UI:
- Tab Economics: "Costo laboral" usa `c.laborCostCLP` (antes hardcoded `0`), "C. Directos" = `costCLP - laborCostCLP`
- Tab Finance: nueva columna "Costo laboral" entre Ingreso y C. Directos
- Trend chart: ordenado cronológicamente (ASC) en vez de DESC

---

## Delta 2026-03-30 — Commercial cost attribution ya es contrato operativo de plataforma

Finance ya no debe tratar la atribución comercial como una recomposición local entre bridges de payroll, assignments y overhead.

Estado canónico vigente:

- existe una capa materializada específica:
  - `greenhouse_serving.commercial_cost_attribution`
- esta capa consolida por período y `member_id`:
  - costo base laboral
  - labor comercial atribuida
  - carga interna excluida
  - overhead comercial atribuible
- la capa expone además explainability por cliente/período y health semántico mínimo

Regla arquitectónica:

- `client_labor_cost_allocation` sigue existiendo, pero queda como bridge/input interno
- readers nuevos de Finance no deben volver a depender de `client_labor_cost_allocation` directamente
- el contrato compartido para costo comercial pasa a ser:
  - reader shared de `commercial_cost_attribution`
  - o serving derivado que ya lo consuma (`operational_pl_snapshots`)

Matriz de consumo:

- Finance base / `client_economics`
  - debe consumir `commercial_cost_attribution`
- Cost Intelligence / `operational_pl`
  - debe consumir `commercial_cost_attribution`
- Agency / economics por espacio
  - debe seguir sobre `operational_pl_snapshots`
- People / person finance
  - debe seguir sobre `member_capacity_economics`
  - usando `commercial_cost_attribution` solo para explain cuando aplique

## Delta 2026-03-31 — Expense ledger hardening y intake reactivo desde Payroll

`Finance > Expenses` quedó alineado como ledger canónico con un contrato más explícito para clasificación y tenant isolation:

- el ledger ahora modela de forma separada:
  - `space_id`
  - `source_type`
  - `payment_provider`
  - `payment_rail`
- el drawer de egresos dejó de tratar `Nomina` y `Prevision` como tabs manuales y pasó a una taxonomía visible por naturaleza del gasto:
  - `Operacional`
  - `Tooling`
  - `Impuesto`
  - `Otro`
- `payroll_period.exported` quedó documentado como trigger reactivo para materializar expenses system-generated de:
  - `payroll`
  - `social_security`
- `Finance` sigue siendo el owner del ledger; `Cost Intelligence` consume y atribuye sin recomputar el costo desde cero.
- La regla anti-doble-conteo de payroll se mantiene: los expenses derivados deben convivir con `operational_pl` sin duplicar carga laboral.

## Delta 2026-03-30 — revenue aggregation usa client_id canónico

Regla canónica vigente para agregaciones financieras:

- `client_economics` y `operational_pl` deben agregar revenue por `client_id` comercial canónico.
- Si un income histórico solo trae `client_profile_id`, el runtime debe traducirlo vía `greenhouse_finance.client_profiles` antes de agrupar.
- No se debe usar `client_profile_id` como sustituto directo de `client_id` en snapshots o serving ejecutivo nuevo.

## Delta 2026-04-02 — downstream org-first cutover y residual legacy

`TASK-191` avanza el contrato downstream de Finance para que la entrada operativa deje de depender exclusivamente de `clientId`:

- `purchase-orders` y `hes` deben aceptar `organizationId` como anchor org-first, con `clientId` solo como bridge de compatibilidad cuando el storage legacy lo requiera.
- `expenses`, `expenses/bulk`, `cost allocations` y `client_economics` deben resolver scope downstream desde un helper compartido en vez de repetir bridges ad hoc en UI y API.
- La selección de clientes en drawers Finance debe preferir el identificador org-first y mostrar `clientId` solo como bridge residual.

Regla de persistencia:

- `client_id` sigue siendo un bridge operativo en varias tablas y readers.
- No se debe prometer eliminación física de `client_id` hasta una lane explícita de schema evolution.
- Los readers/materializers que siguen materializando por `client_id` deben documentarse como compat boundary, no como contrato de entrada.

## Delta 2026-04-02 — materialized serving org-first compatibility keys

`TASK-192` endurece la capa materializada de Finance sin eliminar todavía el bridge legado:

- `greenhouse_finance.cost_allocations` ahora persiste `organization_id` y `space_id` además de `client_id`.
- `greenhouse_finance.client_economics` ahora persiste `organization_id` junto al snapshot mensual.
- `greenhouse_serving.commercial_cost_attribution` ahora persiste `organization_id` como contexto compartido de attribution.
- `client_id` sigue vivo como compat boundary para storage/readers legacy, pero ya no es la única llave persistida disponible en serving financiero.
- `GET /api/finance/intelligence/allocations` y `GET /api/finance/intelligence/client-economics` ya pueden resolver lectura org-first sin exigir siempre un bridge legacy previo.

Matiz importante de schema:

- estas columnas nuevas dejan el modelo `org-aware`, pero todavía no `org-enforced`
- en esta lane se agregaron columnas, índices y backfill, pero no `FK` ni `NOT NULL` nuevos sobre `organization_id` / `space_id`
- el bridge canónico real sigue combinando:
  - `greenhouse_finance.client_profiles`
  - `greenhouse_core.spaces`
  - y, para allocations, `greenhouse_finance.expenses.space_id`
- una lane futura de schema cleanup podrá endurecer constraints físicos cuando desaparezcan los consumers legacy que todavía exigen flexibilidad de bridge

## Delta 2026-03-30 — Cost Intelligence ya opera como layer de management accounting

Finance sigue siendo el owner del motor financiero central, pero ya no es la única surface que expone semántica de rentabilidad.

Estado canónico vigente:

- `GET /api/finance/dashboard/pnl` sigue siendo la referencia central del cálculo financiero mensual.
- Cost Intelligence ya materializa esa semántica en serving propio, sin redefinir un P&L paralelo:
  - `greenhouse_serving.period_closure_status`
  - `greenhouse_serving.operational_pl_snapshots`
- `/finance/intelligence` ya es la surface principal de cierre operativo y lectura de P&L del módulo.
- Los consumers downstream ya empezaron a leer ese serving:
  - Agency
  - Organization 360
  - People 360
  - Home
  - Nexa

Regla arquitectónica:

- Finance mantiene ownership de ingresos, gastos, reconciliación, FX y semántica del P&L central.
- Cost Intelligence actúa como layer de materialización y distribución operativa sobre esa base.
- Nuevos consumers que necesiten margen, closure status o snapshots operativos deberían preferir `operational_pl_snapshots` y `period_closure_status` antes de recomputar on-read.

## Delta 2026-03-30 — Atribución comercial debe excluir assignments internos

Se formaliza una regla que ya existía implícitamente en `Agency > Team` y `member_capacity_economics` y ahora también aplica a Finance / Cost Intelligence:

- assignments internos como `space-efeonce`, `efeonce_internal` y `client_internal` pueden seguir existiendo para operación interna
- esos assignments no deben competir como cliente comercial en:
  - atribución de costo laboral
  - auto-allocation comercial
  - snapshots de `operational_pl`
- consecuencia práctica:
  - un colaborador puede tener carga interna operativa y al mismo tiempo `1.0 FTE` comercial hacia un cliente sin que Finance le parta la nómina 50/50 contra `Efeonce`

Regla de implementación:

- la truth comercial compartida debe salir de una regla canónica reusable, no de filtros distintos por consumer
- Cost Intelligence puede purgar snapshots obsoletos de una revisión para evitar que scopes internos antiguos sigan visibles después del recompute

## Overview

Finance es el módulo más grande del portal: 49 API routes, 13 páginas, 28 archivos de librería. Gestiona facturación, gastos, reconciliación bancaria, indicadores económicos, integración DTE/Nubox, y la capa de inteligencia financiera (economics, allocations, P&L).

## Data Architecture

### Dual-Store: Postgres-First with BigQuery Fallback

| Tabla                         | Store primario                          | BigQuery                                | Estado                                                                      |
| ----------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `income`                      | Postgres (`greenhouse_finance`)         | `fin_income` (fallback)                 | Migrado                                                                     |
| `income_payments`             | Postgres only                           | No existe en BQ                         | Nativo Postgres                                                             |
| `expenses`                    | Postgres (`greenhouse_finance`)         | `fin_expenses` (fallback)               | Migrado                                                                     |
| `accounts`                    | Postgres                                | `fin_accounts` (fallback)               | Migrado                                                                     |
| `suppliers`                   | Postgres                                | `fin_suppliers` (fallback)              | Migrado                                                                     |
| `exchange_rates`              | Postgres                                | `fin_exchange_rates` (fallback)         | Migrado                                                                     |
| `economic_indicators`         | Postgres                                | `fin_economic_indicators` (fallback)    | Migrado                                                                     |
| `cost_allocations`            | Postgres only                           | No existe en BQ                         | Nativo Postgres; persiste `organization_id`/`space_id` + `client_id` compat |
| `client_economics`            | Postgres (`greenhouse_finance`)         | No                                      | Nativo; persiste `organization_id` + `client_id` compat                     |
| `reconciliation_periods`      | Postgres                                | `fin_reconciliation_periods` (fallback) | Migrado                                                                     |
| `bank_statement_rows`         | Postgres                                | `fin_bank_statement_rows` (fallback)    | Migrado                                                                     |
| `dte_emission_queue`          | Postgres only                           | No                                      | TASK-139                                                                    |
| `commercial_cost_attribution` | Serving Postgres (`greenhouse_serving`) | No                                      | Canónico materializado; persiste `organization_id` + `client_id` compat     |
| `service_attribution_facts`   | Serving Postgres (`greenhouse_serving`) | No                                      | Foundation factual por `service_id + period + source`; desbloquea `service_economics` |

Nota operativa:

- `commercial_cost_attribution` existe en el schema snapshot y ya es contrato vigente del sistema, pero su DDL base sigue asegurado por runtime/store code además de las migraciones incrementales; todavía no vive como create-table canónico separado dentro de `scripts/` o una migración histórica dedicada.
- `service_attribution_unresolved` acompaña a `service_attribution_facts` como cola auditable de casos ambiguos o sin evidencia suficiente; no debe tratarse como error silencioso ni como fallback inventado en UI.

### BigQuery Cutover Plan

Ver `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` sección "Finance BigQuery → Postgres Cutover Plan" para el plan de eliminación de fallbacks.

Flag de control: `FINANCE_BIGQUERY_WRITE_ENABLED` (default: true).

Estado operativo post `TASK-166`:

- `income`, `expenses`, `accounts`, `suppliers`, `exchange_rates`, `reconciliation` y los sync helpers principales ya respetan el guard fail-closed cuando PostgreSQL falla y el flag está apagado.
- `clients` (`create/update/sync`) ya opera Postgres-first sobre `greenhouse_finance.client_profiles`; BigQuery queda solo como fallback transicional cuando PostgreSQL no está disponible y el flag sigue activo.
- `clients` list/detail ya operan org-first sobre `greenhouse_core.organizations WHERE organization_type IN ('client', 'both')`, con `client_profiles.organization_id` como FK fuerte.
- `client_id` se preserva como bridge operativo para modules, `purchase_orders`, `hes`, `income`, `client_economics` y `v_client_active_modules`; el cutover actual no elimina esa clave legacy.
- El residual de `Finance Clients` queda reducido a fallback transicional, no a dependencia estructural del request path.
- Delta `TASK-589`:
  - ningun `GET /api/finance/**` interactivo debe invocar `ensureFinanceInfrastructure()` como side effect de lectura; el contrato correcto es `Postgres-first` y, si cae al carril legacy, usar una verificacion read-only (`assertFinanceBigQueryReadiness`) antes de consultar BigQuery.
  - esto aplica a `clients`, `suppliers`, `accounts`, `income`, `expenses`, `exchange_rates`, dashboards y summaries Finance; el runtime ya no debe intentar `CREATE TABLE` / `ALTER TABLE` dentro de requests interactivos.
  - `expenses/meta` puede enriquecer instituciones desde Payroll, pero ese enrichment no debe provisionar Payroll en un `GET`; la lectura se considera opcional y no puede tumbar toda la metadata de Finance.

### Delta 2026-04-08 — Ledger-first reconciliation & settlement foundation

- `Finance > Conciliación` ya converge al mismo contrato canónico que `Cobros` y `Pagos`: `income_payments` / `expense_payments` son la unidad primaria de caja conciliable cuando existe ledger real.
- `reconciliation_periods` ahora guarda snapshots del instrumento (`instrument_category_snapshot`, `provider_slug_snapshot`, `provider_name_snapshot`, `period_currency_snapshot`) para que la conciliación no dependa del estado mutable del catálogo.
- `bank_statement_rows` ahora soporta importación idempotente mediante `source_import_batch_id`, `source_import_fingerprint`, `source_imported_at` y `source_payload_json`.
- `greenhouse_finance.settlement_groups` y `greenhouse_finance.settlement_legs` formalizan la base de settlement orchestration para pagos directos y cadenas multi-leg (`internal_transfer`, `funding`, `fx_conversion`, `payout`, `fee`).
- La reconciliación payment-level quedó validada end-to-end contra staging: reimportar el mismo statement row no duplica filas y el loop `unmatch -> match` vuelve a sincronizar `bank_statement_rows`, `income_payments` / `expense_payments` y `settlement_legs` sobre el mismo `reconciliation_row_id`.
- La semántica operativa queda explícita:
  - `pagado/cobrado` != `conciliado`
  - transferencia interna o funding no liquida la obligación
  - el leg que liquida una obligación es el `payout` o `receipt` hacia la contraparte final
- Eventos outbox nuevos de primer nivel del dominio:
  - `finance.income_payment.reconciled`
  - `finance.income_payment.unreconciled`
  - `finance.expense_payment.reconciled`
  - `finance.expense_payment.unreconciled`
  - `finance.settlement_leg.recorded`
  - `finance.settlement_leg.reconciled`
  - `finance.settlement_leg.unreconciled`
  - `finance.reconciliation_period.reconciled`
  - `finance.reconciliation_period.closed`

## P&L Endpoint — Motor Financiero Central

### `GET /api/finance/dashboard/pnl`

Este es el **endpoint más importante del módulo Finance**. Construye un P&L operativo completo por período mensual combinando datos de 3 schemas en 6 queries paralelas.

### Parámetros

| Param   | Default    | Descripción     |
| ------- | ---------- | --------------- |
| `year`  | Año actual | Año del período |
| `month` | Mes actual | Mes del período |

### Queries ejecutadas (en paralelo)

```
Query 1: Income (devengado por invoice_date)
  → greenhouse_finance.income
  → total_amount_clp, partner_share, record_count

Query 2: Collected Revenue (caja por payment_date)
  → greenhouse_finance.income_payments JOIN income
  → collected_clp (pagos reales recibidos)

Query 3: Expenses por cost_category
  → greenhouse_finance.expenses
  → GROUP BY cost_category (direct_labor, indirect_labor, operational, infrastructure, tax_social)

Query 4: Payroll (desde módulo de nómina)
  → greenhouse_payroll.payroll_entries JOIN payroll_periods
  → Solo períodos approved/exported
  → Split CLP/USD: gross, net, deductions, bonuses
  → Headcount (COUNT DISTINCT member_id)

Query 5: Linked Payroll Expenses
  → greenhouse_finance.expenses WHERE payroll_entry_id IS NOT NULL
  → Detecta gastos ya vinculados a entries de nómina (evita doble conteo)

Query 6: Exchange Rate
  → greenhouse_finance.exchange_rates
  → Último USD/CLP para conversión de nómina en dólares
```

### Cálculos derivados

```
Revenue:
  totalRevenue     = SUM(income.total_amount_clp) del período
  partnerShare     = SUM(income.partner_share_amount × exchange_rate)
  netRevenue       = totalRevenue - partnerShare
  collectedRevenue = SUM(income_payments donde payment_date en período)
  accountsReceivable = totalRevenue - collectedRevenue

Payroll (multi-moneda):
  payrollGross     = SUM(gross_clp) + SUM(gross_usd) × usdToClp
  payrollNet       = SUM(net_clp) + SUM(net_usd) × usdToClp
  payrollDeductions = SUM(deductions_clp) + SUM(deductions_usd) × usdToClp
  payrollBonuses   = SUM(bonuses_clp) + SUM(bonuses_usd) × usdToClp

Anti-doble-conteo:
  unlinkedPayrollCost = MAX(0, payrollGross - linkedPayrollExpenses)
  → Payroll cost no representado aún como expense → se suma a directLabor

Costs (por categoría):
  directLabor      = expenses[direct_labor] + unlinkedPayrollCost
  indirectLabor    = expenses[indirect_labor]
  operational      = expenses[operational]
  infrastructure   = expenses[infrastructure]
  taxSocial        = expenses[tax_social]
  totalExpenses    = SUM(all categories) + unlinkedPayrollCost

Margins:
  grossMargin      = netRevenue - directLabor
  grossMarginPct   = (grossMargin / netRevenue) × 100
  operatingExpenses = indirectLabor + operational + infrastructure
  ebitda           = grossMargin - operatingExpenses
  ebitdaPct        = (ebitda / netRevenue) × 100
  netResult        = netRevenue - totalExpenses
  netMarginPct     = (netResult / netRevenue) × 100
```

### Response shape

```json
{
  "year": 2026,
  "month": 3,
  "revenue": {
    "totalRevenue": 20706000,
    "partnerShare": 0,
    "netRevenue": 20706000,
    "collectedRevenue": 15200000,
    "accountsReceivable": 5506000,
    "invoiceCount": 8
  },
  "costs": {
    "directLabor": 3339382,
    "indirectLabor": 0,
    "operational": 1200000,
    "infrastructure": 499279,
    "taxSocial": 0,
    "totalExpenses": 5038661,
    "unlinkedPayrollCost": 3339382
  },
  "margins": {
    "grossMargin": 17366618,
    "grossMarginPercent": 83.87,
    "operatingExpenses": 1699279,
    "ebitda": 15667339,
    "ebitdaPercent": 75.67,
    "netResult": 15667339,
    "netMarginPercent": 75.67
  },
  "payroll": {
    "headcount": 4,
    "totalGross": 3339382,
    "totalNet": 3102918,
    "totalDeductions": 236464,
    "totalBonuses": 229006
  },
  "completeness": "complete",
  "missingComponents": []
}
```

### Quién consume este endpoint

| Consumer                      | Qué usa                                   | Para qué                                                        |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `FinanceDashboardView.tsx`    | Todo el response                          | Card "Facturado vs Costos", Card "Costo de Personal", P&L table |
| KPI "Ratio nómina / ingresos" | `payroll.totalGross / revenue.netRevenue` | Working capital metric                                          |
| Card "Costo de Personal"      | `payroll.*`                               | Desglose bruto, líquido, descuentos, bonos                      |

### Reglas de negocio críticas

1. **Solo períodos `approved` o `exported`** — no incluye nóminas en `draft` o `calculated`
2. **Multi-moneda** — entries en USD se convierten con el último tipo de cambio disponible
3. **Anti-doble-conteo** — si un expense tiene `payroll_entry_id`, su monto no se suma al payroll
4. **Partner share** — se descuenta del revenue total para obtener netRevenue

### Expense ledger contract

La surface de `expenses` expone y persiste un contrato más rico para lecturas y writes nuevos:

- `space_id` para aislamiento por tenant
- `source_type` para distinguir gasto manual, derivado o system-generated
- `payment_provider` y `payment_rail` para separar proveedor de rail/método operativo
- `cost_category` sigue siendo la dimensión analítica usada por P&L y consumers downstream

Para el intake reactivo de nómina:

- `payroll_period.exported` es la señal canónica
- el materializador debe crear gastos para nómina y cargas sociales cuando falten en el ledger
- la publicación downstream sigue usando `finance.expense.created|updated`; no se introdujo un evento nuevo específico para tooling

5. **`completeness`** — `'complete'` solo si hay payroll Y expenses; `'partial'` si falta alguno

## Dashboard Summary Endpoint

### `GET /api/finance/dashboard/summary`

Endpoint complementario al PnL que provee métricas de working capital.

| Campo                   | Cálculo                            | Fuente                                                     |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `incomeMonth`           | Income cash del mes actual         | income_payments                                            |
| `expensesMonth`         | Expenses cash del mes actual       | expenses (paid)                                            |
| `netFlow`               | incomeMonth - expensesMonth        | Derivado                                                   |
| `receivables`           | Facturas pendientes de cobro (CLP) | income WHERE payment_status IN (pending, partial, overdue) |
| `payables`              | Gastos pendientes de pago (CLP)    | expenses WHERE payment_status = 'pending'                  |
| `dso`                   | (receivables / revenue) × 30       | Derivado                                                   |
| `dpo`                   | (payables / expenses) × 30         | Derivado                                                   |
| `payrollToRevenueRatio` | Desde `total-company-cost.ts`      | Payroll module                                             |
| `cash` / `accrual`      | Métricas duales por base contable  | Income/expenses                                            |

## Other Dashboard Endpoints

### `GET /api/finance/dashboard/cashflow`

Cash flow projection basado en pagos reales (income_payments) y gastos pagados.

### `GET /api/finance/dashboard/aging`

AR/AP aging analysis con buckets de 30/60/90+ días.

### `GET /api/finance/dashboard/by-service-line`

Revenue y costs desglosados por línea de servicio (globe, digital, reach, wave, crm).

### Cash management endpoints (TASK-280)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/finance/expenses/[id]/payments` | GET | Pagos registrados contra un documento de compra |
| `/api/finance/expenses/[id]/payments` | POST | Registrar pago contra documento de compra |
| `/api/finance/cash-in` | GET | Lista consolidada de cobros (income_payments) |
| `/api/finance/cash-out` | GET | Lista consolidada de pagos (expense_payments) |
| `/api/finance/cash-position` | GET | Posición de caja: cuentas, por cobrar/pagar, serie 12 meses |

## Outbox Events

### Emitidos por Finance (13 event types)

| Event Type                            | Aggregate          | Cuándo                           |
| ------------------------------------- | ------------------ | -------------------------------- |
| `finance.income.created`              | income             | Nueva factura                    |
| `finance.income.updated`              | income             | Factura modificada               |
| `finance.expense.created`             | expense            | Nuevo gasto                      |
| `finance.expense.updated`             | expense            | Gasto modificado                 |
| `finance.income_payment.created`      | income_payment     | Pago registrado                  |
| `finance.income_payment.recorded`     | income_payment     | Pago finalizado                  |
| `finance.cost_allocation.created`     | cost_allocation    | Gasto asignado a cliente         |
| `finance.cost_allocation.deleted`     | cost_allocation    | Asignación eliminada             |
| `finance.exchange_rate.upserted`      | exchange_rate      | Tipo de cambio actualizado       |
| `finance.economic_indicator.upserted` | economic_indicator | Indicador económico sincronizado |
| `finance.dte.discrepancy_found`       | dte_reconciliation | Discrepancia DTE detectada       |

### Consumidos (proyecciones reactivas)

| Projection                  | Eventos que la disparan                                                                          | Resultado                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `client_economics`          | income._, expense._, payment._, allocation._, payroll._, assignment._, membership.\*             | Recomputa snapshot de rentabilidad por cliente |
| `member_capacity_economics` | expense.updated, exchange*rate.upserted, payroll.*, assignment.\_                                | Recalcula costo por FTE                        |
| `notification_dispatch`     | dte.discrepancy_found, income.created, expense.created, payment.recorded, exchange_rate.upserted | Notificaciones in-app + email                  |

## Notification Mappings

Finance genera 5 tipos de notificación via webhook bus:

| Evento                            | Categoría       | Recipients     |
| --------------------------------- | --------------- | -------------- |
| `finance.income_payment.recorded` | `finance_alert` | Finance admins |
| `finance.expense.created`         | `finance_alert` | Finance admins |
| `finance.dte.discrepancy_found`   | `finance_alert` | Finance admins |
| `finance.income.created`          | `finance_alert` | Finance admins |
| `finance.exchange_rate.upserted`  | `finance_alert` | Finance admins |

## Cross-Module Bridges

### Finance ↔ Payroll

| Bridge                      | Dirección                                            | Mecanismo                                       |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Labor cost in P&L           | Payroll → Finance                                    | PnL endpoint lee `payroll_entries` directamente |
| Expense linking             | Finance → Payroll                                    | `expenses.payroll_entry_id` + `member_id`       |
| Cost allocation             | Payroll → Finance                                    | `client_labor_cost_allocation` serving view     |
| Commercial cost attribution | Payroll/Capacity/Finance → Finance/Cost Intelligence | `commercial_cost_attribution` serving table     |
| Period status               | Payroll → Finance                                    | PnL solo incluye `approved`/`exported`          |

### Finance ↔ People

| Bridge             | Dirección        | Mecanismo                                   |
| ------------------ | ---------------- | ------------------------------------------- |
| Member cost        | Finance → People | `GET /api/people/[memberId]/finance-impact` |
| Capacity economics | Payroll → People | `member_capacity_economics` serving view    |
| Cost/revenue ratio | Finance → People | Finance impact card en HR Profile tab       |

### Finance ↔ Agency

| Bridge               | Dirección        | Mecanismo                                                                               |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| Space revenue/margin | Finance → Agency | `getSpaceFinanceMetrics()` + `GET /api/agency/finance-metrics`                          |
| Org economics        | Finance → Agency | `operational_pl_snapshots` org-first, con fallback a `client_economics.organization_id` |

## Cost Allocation System

### Métodos disponibles

| Método             | Cuándo                               | Implementación                    |
| ------------------ | ------------------------------------ | --------------------------------- |
| `manual`           | Admin asigna explícitamente          | UI en `/finance/cost-allocations` |
| `fte_weighted`     | Distribución por FTE del member      | `auto-allocation-rules.ts`        |
| `revenue_weighted` | Distribución por ingreso del cliente | `auto-allocation-rules.ts`        |
| `headcount`        | Distribución por headcount           | Disponible, no wired              |

### Auto-allocation (TASK-138)

Reglas declarativas ejecutadas fire-and-forget al crear un expense:

1. Expense type `payroll` + `member_id` → allocate to member's clients by FTE
2. Cost category `infrastructure` + no `client_id` → distribute by revenue weight
3. Already has `client_id` → no auto-allocation
4. No match → leave as unallocated overhead

## Canonical Helpers

| Helper                          | Archivo                    | Propósito                                   |
| ------------------------------- | -------------------------- | ------------------------------------------- |
| `getLatestPeriodCompanyCost()`  | `total-company-cost.ts`    | Costo empresa = gross + employer charges    |
| `resolveExchangeRateToClp()`    | `shared.ts`                | Resuelve tipo de cambio, error si no existe |
| `checkExchangeRateStaleness()`  | `shared.ts`                | Detecta rates >7 días                       |
| `resolveAutoAllocation()`       | `auto-allocation-rules.ts` | Auto-asignación de gastos a clientes        |
| `resolveFinanceClientContext()` | `canonical.ts`             | Resuelve clientId/orgId/profileId           |
| `reconcilePaymentTotals()`      | `payment-ledger.ts`        | Reconcilia amount_paid vs SUM(payments)     |

## Data Quality

`GET /api/finance/data-quality` ya no trata cualquier gasto sin `client_id` como drift. La semántica canónica separa:

- **drift real**: ledger divergente, cobros/pagos sin ledger, ingresos sin cliente, cartera vencida, DTE pendientes, etc.
- **allocation policy drift**: costos directos sin cliente o sin asignación efectiva
- **estado permitido**: `shared overhead intentionally unallocated`

Checks relevantes:

| Check                             | Qué verifica                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `income_payment_ledger_integrity` | `income.amount_paid = SUM(income_payments.amount)`                           |
| `income_paid_without_ledger`      | Facturas con `amount_paid > 0` pero sin filas en `income_payments`           |
| `expense_payment_ledger_integrity`| `expenses.amount_paid = SUM(expense_payments.amount)`                        |
| `expense_paid_without_ledger`     | Compras con `amount_paid > 0` pero sin filas en `expense_payments`           |
| `direct_cost_without_client`      | Gastos directos sin `allocated_client_id` / `client_id` efectivo             |
| `shared_overhead_unallocated`     | Overhead compartido sin asignación explícita; visible pero **no** se trata como falla |
| `income_without_client`           | Ingresos sin cliente                                                         |
| `exchange_rate_freshness`         | Rate USD/CLP no tiene >7 días                                                |
| `dte_pending_emission`            | Emisiones DTE en cola de retry                                               |
| `overdue_receivables`             | Facturas vencidas (`due_date < today`)                                       |

Reglas adicionales:

1. Cuando el tenant trae `spaceId`, los checks que tienen `space_id` canónico deben leer en scope tenant.
2. Los checks globales siguen existiendo para tablas que no exponen `space_id` confiable en todas sus filas.
3. `Finance Data Quality` en Ops/Admin no debe volver a mezclar backlog de riesgo con overhead compartido permitido bajo un único contador de “fallas”.

Integrado en Admin Center > Ops Health como subsistema "Finance Data Quality", con summary semántico por buckets en vez de sobrecargar `processed/failed`.

## File Reference

| Archivo                                          | Propósito                                     |
| ------------------------------------------------ | --------------------------------------------- |
| `src/lib/finance/shared.ts`                      | Tipos, validadores, helpers compartidos       |
| `src/lib/finance/postgres-store.ts`              | Slice 1: accounts, suppliers, rates           |
| `src/lib/finance/postgres-store-slice2.ts`       | Slice 2: income, expenses, payments (primary) |
| `src/lib/finance/postgres-store-intelligence.ts` | Client economics snapshots                    |
| `src/lib/finance/payment-ledger.ts`              | Income payment recording                      |
| `src/lib/finance/reconciliation.ts`              | BigQuery reconciliation (@deprecated)         |
| `src/lib/finance/postgres-reconciliation.ts`     | Postgres reconciliation (primary)             |
| `src/lib/finance/exchange-rates.ts`              | Exchange rate sync                            |
| `src/lib/finance/economic-indicators.ts`         | UF, UTM, IPC sync                             |
| `src/lib/finance/dte-coverage.ts`                | DTE/Nubox reconciliation metrics              |
| `src/lib/finance/dte-emission-queue.ts`          | DTE emission retry queue                      |
| `src/lib/finance/auto-allocation-rules.ts`       | Cost allocation automation                    |
| `src/lib/finance/total-company-cost.ts`          | Canonical company cost helper                 |
| `src/lib/finance/payroll-cost-allocation.ts`     | Labor cost bridge to payroll                  |
| `src/app/api/finance/dashboard/pnl/route.ts`     | P&L endpoint (motor central)                  |
| `src/app/api/finance/dashboard/summary/route.ts` | Working capital metrics                       |
| `src/app/api/finance/data-quality/route.ts`      | Data quality checks                           |

## Preventive Test Lane (TASK-599)

A partir de 2026-04-25, Finance tiene una lane preventiva de tests con 3 niveles de defensa que cubre el gap entre unit/route tests y detección tardía por Sentry. La lane es complementaria a la suite Playwright completa que corre post-merge a `develop`.

### Nivel 1 — Playwright smoke

Specs canónicos en `tests/e2e/smoke/`:

| Spec | Cubre |
|------|-------|
| `finance-quotes.spec.ts` | `/finance/quotes` + `/finance/quotes/new` |
| `finance-clients.spec.ts` | `/finance/clients` |
| `finance-suppliers.spec.ts` | `/finance/suppliers` |
| `finance-expenses.spec.ts` | `/finance/expenses` |

Cada spec usa `gotoAuthenticated` y verifica `status<400` + body visible + ausencia de fatal text. Reusa el setup de Agent Auth.

Las 4 specs están registradas en `RELIABILITY_REGISTRY[finance].smokeTests` (`src/lib/reliability/registry.ts`). El **Change-Based Verification Matrix** (TASK-633) las recoge automáticamente cuando un PR toca archivos owned por el módulo finance.

### Nivel 2 — Component tests (Vitest + jsdom)

| Test | Cubre |
|------|-------|
| `src/views/greenhouse/finance/ExpensesListView.test.tsx` | render éxito, empty state, error API, network failure |
| `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.test.tsx` | open=false sin fetch, fetch /meta + /accounts al abrir, payload meta parcial no fatal, meta endpoint 500 no rompe drawer |

Patrón canónico: `vi.stubGlobal('fetch', mockFn)` + `renderWithTheme`. Sin MSW (instalado pero no usado en componentes).

### Nivel 3 — Route degradation hardening

`src/app/api/finance/expenses/meta/route.test.ts` documenta el contrato de degradación parcial del meta provider:

- **Slices críticos** (Postgres-first → BigQuery fallback): `suppliers`, `accounts`. Si falla Postgres, BQ rescata.
- **Slices enrichment** (degradan a empty/default sin tumbar el endpoint): `socialSecurityInstitutions` (finance + payroll), `members`, `spaces`, `supplierToolLinks`.
- **Static enrichment**: `paymentMethods`, `paymentProviders`, `paymentRails`, `recurrenceFrequencies`, `drawerTabs` — siempre presentes (vienen del módulo, no de DB).

Tests TASK-599 explícitos:

- `keeps payload alive when ALL enrichment slices fail`
- `falls back to BigQuery for accounts when Postgres accounts is unavailable`
- `response shape includes static enrichment defaults regardless of dynamic providers`

### Reliability Control Plane integration

`src/lib/reliability/finance/get-finance-smoke-lane-status.ts` parsea `artifacts/playwright/results.json` (Playwright JSON reporter) y filtra suites `tests/e2e/smoke/finance-*.spec.ts`. El adapter `buildFinanceSmokeLaneSignals` emite señales `kind=test_lane` para el módulo `finance` en el Reliability Control Plane:

- 1 señal agregada por lane completo (`finance.test_lane.smoke`).
- N señales adicionales por suite fallida cuando hay errores.

El boundary TASK-599 en `RELIABILITY_INTEGRATION_BOUNDARIES` quedó en status `ready`. Cuando no hay reporte local (runtime portal sin acceso a artifacts CI), degrada a `awaiting_data` con notas explícitas — nunca enmascara regresiones como "todo bien".

## Delta 2026-04-29 — TASK-720 / TASK-721 / TASK-722: Bank ↔ Reconciliation canonical synergy

Tres tasks ejecutadas end-to-end en una sola sesión que cierran el ciclo operativo Banco ↔ Conciliación con disciplina estructural. Cero regresiones (552/552 tests).

### TASK-720 — Bank KPI aggregation policy-driven

**Problema**: el KPI "Saldo CLP" sumaba todas las cuentas CLP sin distinguir asset vs liability — credit_card y shareholder_account aparecían como cash, inflando el total en $1.3M (sobre $4.18M real).

**Solución estructural**: tabla declarativa `greenhouse_finance.instrument_category_kpi_rules` que dicta cómo cada `instrument_category` contribuye a cada KPI (cash / consolidated_clp / net_worth) con `net_worth_sign` (+1 asset, −1 liability) y `display_group` (cash / credit / platform_internal).

```sql
CREATE TABLE greenhouse_finance.instrument_category_kpi_rules (
  instrument_category TEXT PRIMARY KEY,
  account_kind TEXT NOT NULL CHECK (account_kind IN ('asset', 'liability')),
  contributes_to_cash BOOLEAN NOT NULL,
  contributes_to_consolidated_clp BOOLEAN NOT NULL,
  contributes_to_net_worth BOOLEAN NOT NULL,
  net_worth_sign SMALLINT NOT NULL CHECK (net_worth_sign IN (-1, 1)),
  display_label TEXT NOT NULL,
  display_group TEXT NOT NULL CHECK (display_group IN ('cash', 'credit', 'platform_internal')),
  rationale TEXT NOT NULL
);
```

10 categorías seedeadas (6 activas + 4 reservadas: `employee_wallet`, `intercompany_loan`, `factoring_advance`, `escrow_account`).

**Helper canónico**: `aggregateBankKpis(accounts, rules)` en `src/lib/finance/instrument-kpi-rules.ts`. Pure function; throw `MissingKpiRuleError` si una cuenta tiene categoría sin rule (fail-fast).

**Detector**: `task720.instrumentCategoriesWithoutKpiRule` en ledger-health. Steady state = 0.

**FK constraint** (Slice 5): `accounts.instrument_category → instrument_category_kpi_rules.instrument_category`. Cualquier INSERT con categoría unknown falla con FK violation. Anti-reincidencia.

**Reusabilidad**: cuando emerjan wallets / loans / factoring / escrow → 1 INSERT al catálogo + cero refactor de agregador o UI.

### TASK-721 — Finance evidence canonical uploader

**Problema**: el drawer "Declarar conciliación" pedía evidencia como text input libre con path/URL. Operador podía declarar referencias a archivos inexistentes — auditoría futura no podía reproducir snapshots.

**Solución**: reuso completo de la infraestructura `greenhouse_core.assets`:

- Nuevos asset contexts `finance_reconciliation_evidence_draft` + `finance_reconciliation_evidence`
- Retention class `finance_reconciliation_evidence`
- Bucket privado `greenhouse-private-assets-{env}` (existente)
- Columna `assets.content_hash` (SHA-256) para dedup idempotente
- Columna `account_reconciliation_snapshots.evidence_asset_id` FK con `ON DELETE SET NULL`

**Atomic transaction** en `declareReconciliationSnapshot`:
1. Pre-flight: validar asset existe + status correcto + context correcto
2. INSERT snapshot con `evidence_asset_id` FK
3. `attachAssetToAggregate(assetId, 'finance_reconciliation_evidence', snapshotId)` en misma tx — status pending → attached, owner_aggregate_id = snapshotId

**Dedup por content_hash**: `findAssetByContentHash(hash)` reusa asset existente si SHA-256 + context coinciden y status='pending'. Same PDF re-subido → cero duplicados en bucket.

**Detector**: `task721.reconciliationSnapshotsWithBrokenEvidence` flag rows con `evidence_asset_id` apuntando a asset deleted/missing.

**UI**: `<GreenhouseFileUploader contextType='finance_reconciliation_evidence_draft'>` reemplaza text input. Drag & drop, preview, max 10MB, accepta PDF/JPG/PNG/WEBP.

**Reusabilidad**: cuando emerjan loans / factoring / OTB declarations / period closings → agregar context al type union + dictionaries en `greenhouse-assets.ts`. Uploader, dedup, audit, outbox son transversales.

### TASK-722 — Bank Reconciliation Synergy Workbench

**Problema**: `/finance/bank` y `/finance/reconciliation` eran páginas paralelas que no se hablaban. Snapshot declarado en Banco no aparecía en el workbench. Period creado en workbench no veía evidencia.

**Solución estructural**: bridge contract canónico + period-from-snapshot atomic + capabilities granulares.

#### Schema

```sql
-- DB-level idempotency (antes era solo aplicacional via period_id deterministic)
ALTER TABLE greenhouse_finance.reconciliation_periods
  ADD CONSTRAINT uniq_recon_periods_account_year_month UNIQUE (account_id, year, month);

-- Bridge column
ALTER TABLE greenhouse_finance.account_reconciliation_snapshots
  ADD COLUMN reconciliation_period_id TEXT
  REFERENCES greenhouse_finance.reconciliation_periods(period_id) ON DELETE SET NULL;
```

#### Bridge helper canónico

`getReconciliationFullContext({periodId | accountId+year+month})` en `src/lib/finance/reconciliation/full-context.ts` retorna:

```ts
{
  account: { accountId, accountName, currency, instrumentCategory, accountKind },
  period: { periodId, year, month, status, ... } | null,
  latestSnapshot: { snapshotId, driftStatus, driftAmount, evidenceAssetId, ... } | null,
  evidenceAsset: { assetId, filename, downloadUrl, ... } | null,
  statementRows: { total, matched, suggested, excluded, unmatched },
  difference: number | null,
  nextAction: 'declare_snapshot' | 'create_period' | 'import_statement'
            | 'resolve_matches' | 'mark_reconciled' | 'close_period'
            | 'closed' | 'archived'
}
```

State machine `nextAction` deriva la siguiente acción operativa sin persistirse — si la lógica cambia se actualiza en TS sin migration.

`listOrphanSnapshotsForPeriod(year, month)` retorna snapshots sin period linked (alimenta empty state UI).

#### Period-from-snapshot atomic

`createOrLinkPeriodFromSnapshot({snapshotId, actorUserId, openingBalance?, notes?})` en `src/lib/finance/reconciliation/period-from-snapshot.ts`:

1. `FOR UPDATE` lock en snapshot
2. Si ya tiene `reconciliation_period_id` → return idempotente (`alreadyLinked: true`)
3. Build deterministic `period_id = accountId_year_MM`
4. Check existing period por `(account_id, year, month)` con `FOR UPDATE`
5. Si no existe: INSERT period con `opening_balance = snapshot.pg_closing_balance` (audit-consistent)
6. UPDATE `snapshot.reconciliation_period_id = period_id` en misma tx
7. Outbox event `finance.reconciliation_period.created_from_snapshot`

**Race-safe**: la UNIQUE constraint detecta concurrencia; si dos requests con mismo snapshotId concurren, uno gana la tx, el otro hace short-circuit por `alreadyLinked`.

#### Capabilities (TASK-403 motor existente)

5 capabilities `finance.reconciliation.*` agregadas al catalog (`src/config/entitlements-catalog.ts`):

| Capability | Action | Scope | Quién |
|---|---|---|---|
| `finance.reconciliation.read` | read | tenant | finance / FINANCE_ADMIN / EFEONCE_ADMIN |
| `finance.reconciliation.match` | create+update | space | mismo set |
| `finance.reconciliation.import` | create | space | mismo set |
| `finance.reconciliation.declare_snapshot` | create+update | space | mismo set |
| `finance.reconciliation.close` | close | space | **solo FINANCE_ADMIN / EFEONCE_ADMIN** |

`can()` guards en 11 endpoints de mutación. `requireFinanceTenantContext` se mantiene como guard transversal.

#### Surface UI

- **ReconciliationView**: empty state accionable con orphan snapshots cuando hay snapshots sin period — botón "Abrir workbench" → POST `/from-snapshot` → navega
- **ReconciliationDetailView**: panel "Estado bancario" superior (snapshot + drift + evidence con link a cartola) + chip diferenciado en filas (`Canónico` vs `Legacy` según matched_settlement_leg_id) + tooltip blocker explícito en "Marcar conciliado"
- **BankView**: CTA inline "Abrir workbench" en cuentas con `reconciliationPeriodId` (no muta — solo navega)

#### Outbox events nuevos

- `finance.reconciliation_period.created_from_snapshot` — emitido al crear o re-link periodo desde snapshot

### Reglas duras transversales (TASK-720 / 721 / 722)

- **NUNCA** sumar KPIs de Banco inline. Toda agregación pasa por `aggregateBankKpis`.
- **NUNCA** declarar evidencia como text libre. Toda evidence va por `GreenhouseFileUploader` → asset canónico.
- **NUNCA** crear periodo concurrent sin pasar por helper canónico. La UNIQUE constraint detecta race.
- **NUNCA** mezclar match canónico (settlement_leg, TASK-708) y legacy (payment_id) sin distinción visual.
- **Banco es read-only sobre el modelo de conciliación**. Toda mutación va por endpoints del workbench.
- Cuando emerja una nueva categoría / context / surface, reusar los catálogos existentes — no refactor.

### Detectors agregados

| Detector | Fuente | Steady state |
|---|---|---|
| `task720.instrumentCategoriesWithoutKpiRule` | accounts vs instrument_category_kpi_rules | 0 |
| `task721.reconciliationSnapshotsWithBrokenEvidence` | snapshots con FK rota | 0 |

## Delta 2026-05-03 — TASK-774: Account balances FX consistency (extiende TASK-766)

### Bug class cerrada

`materializeAccountBalance` (`src/lib/finance/account-balances.ts`) sumaba directo `payment.amount` (currency original) sin pasar por VIEW canónica TASK-766 que ya resuelve `payment_amount_clp` (FX-resolved). Cuando un payment está en moneda extranjera y la cuenta destino es CLP (caso CCA TASK-714c, payments Deel/Adobe/Figma USD pagados desde TC CLP), el balance se infla/deflaciona porque suma USD nativo en columna CLP. Bug Figma EXP-202604-008 (2026-05-03): balance Santander Corp +$92.9 USD en lugar de +$83,773.5 CLP equivalente.

### Read API canónico (extiende TASK-766)

`getDailyMovementSummary` (helper privado del materializer) consume:

- **`income_payments`** → VIEW `greenhouse_finance.income_payments_normalized` exponiendo `payment_amount_clp` (TASK-766).
- **`expense_payments`** → VIEW `greenhouse_finance.expense_payments_normalized` exponiendo `payment_amount_clp` (TASK-766).
- **`settlement_legs`** → COALESCE inline `COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)`. Settlement_legs no tiene VIEW propia (1 callsite, YAGNI; promover a VIEW si emerge segundo callsite).

Toda agregación SUM se hace sobre el alias resultante del subselect (`SUM(amount)`), NO sobre `SUM(ep.amount)` / `SUM(ip.amount)` / `SUM(sl.amount)` directo.

### Reliability signal nuevo

`finance.account_balances.fx_drift` (kind=`drift`, severity=`error` si count>0, steady=0):

- Reader: `src/lib/reliability/queries/account-balances-fx-drift.ts`.
- Recompute expected delta desde VIEWs canónicas + COALESCE settlement_legs y compara contra persisted (`period_inflows - period_outflows`).
- Tolerancia $1 CLP (anti FP-noise; bug Figma fue $83,680 — un orden de magnitud > threshold).
- Ventana 90 días.
- Subsystem rollup: `Finance Data Quality`.

### Lint rule extendida (TASK-774 sobre TASK-766)

`eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error` desde commit-1. Patrones nuevos:

| Pattern detectado | Fix canónico |
|---|---|
| `SUM(ep.amount)` | `SUM(payment_amount_clp)` via `expense_payments_normalized` |
| `SUM(ip.amount)` | `SUM(payment_amount_clp)` via `income_payments_normalized` |
| `SUM(sl.amount)` | `SUM(COALESCE(sl.amount_clp, CASE WHEN currency='CLP' THEN amount END))` |

### Backfill defensivo

- Cron diario `ops-finance-rematerialize-balances` (Cloud Scheduler) rematerializa últimos 7 días automáticamente — el fix se propaga sin script para casos recientes.
- Para histórico > 7 días: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-account-balances-fx-fix.ts --account-id=<id> --from-date=<YYYY-MM-DD>` (idempotente, dry-run mode, anchor OTB canónico TASK-703).

### Reglas duras (sumadas a TASK-766)

- **NUNCA** leer `expense_payments` / `income_payments` directo en `account-balances.ts` ni en cualquier materializer downstream. Use VIEWs canónicas TASK-766.
- **NUNCA** sumar `settlement_legs.amount` sin COALESCE con `amount_clp`. Settlement_legs tiene columna `amount_clp` opcional desde migration `20260408103211338`.
- **NUNCA** crear materializer nuevo (e.g. `account_balances_monthly`, `treasury_position`, `cashflow_summary`) sin pasar por estas VIEWs. Si emerge necesidad de nueva VIEW (ej. `treasury_movements_normalized`), aplicar el mismo patrón TASK-766 (CTE COALESCE + filtro 3-axis supersede inline + `payment_amount_clp` column).
- Cuando emerja un nuevo callsite que necesite CLP-equivalent, agregar a la VIEW canónica un campo nuevo (e.g. `payment_amount_clp_excluding_fx_gain`) — NO recompute inline.

### Detectors agregados (TASK-774)

| Detector | Fuente | Steady state |
|---|---|---|
| `finance.account_balances.fx_drift` | recompute desde VIEWs vs persisted | 0 |

## Delta 2026-05-03 — TASK-776: Account Detail Drawer Temporal Modes Contract

### Bug class cerrada

`AccountDetailDrawer` (`/finance/bank` → drawer al click en cuenta) mezclaba 4 surfaces con 4 ventanas temporales independientes y sin contract declarado: KPIs (acumulado snapshot), chart (rolling 12 meses), lista de movimientos (período mes seleccionado), banner OTB (pre-anchor preserved). Caso real 2026-05-03: balance Santander Corp $1.225.047 correcto post-fix TASK-774 pero lista "Movimientos" vacía porque filtraba Mayo 2026 mientras el cargo Figma fue 29/04. Operador veía "balance bajó pero no veo el cargo" → confusión + ticket.

### Contract canónico (extiende instrument-presentation)

- `TemporalMode = 'snapshot' | 'period' | 'audit'` enum cerrado declarado en `instrument-presentation.ts`.
- `TemporalDefaults = { mode; windowDays? }` agregado a `InstrumentDetailProfile`.
- Helper `resolveTemporalWindow({mode, year?, month?, anchorDate?, windowDays?, today?})` en `src/lib/finance/temporal-window.ts` retorna `{fromDate, toDate, modeResolved, label, spanDays}`.
- Degradación honesta: input incompleto → cae a snapshot, NO throw silente.

### Defaults declarativos por categoría

| Categoría | Default mode | Caso de uso |
|---|---|---|
| `bank_account` | snapshot 30d | "qué pasa hoy" |
| `credit_card` | snapshot 30d | "qué cargué esta semana" |
| `fintech` | snapshot 30d | "qué pasa hoy" |
| `shareholder_account` (CCA) | audit | auditoría completa desde anchor |
| `processor_transit` (Deel/Stripe/etc.) | period | cierre mensual comisiones |

### API canónico

Endpoint `/api/finance/bank/[accountId]`:

- Query params: `?mode=snapshot|period|audit&windowDays=30&year=2026&month=5&anchorDate=2026-04-07` (todos opcionales).
- Backward compat 100%: `year+month` sin `mode` → behavior legacy intacto (`mode='period'` implícito).
- Response incluye `movementsWindow: {fromDate, toDate, mode, label}`.

### Drawer UI

- Selector inline `ToggleButtonGroup` (Reciente | Período | Histórico) con tooltips MUI.
- Chip header: "Mostrando: Últimos 30 días" / "Mayo 2026" / "Desde 07/04/2026".
- Banner OTB condicional: SOLO en `mode='audit'` o `'period'` pre-anchor. En `'snapshot'` sin movimientos, hint para cambiar a Histórico.
- `useEffect` resetea `temporalMode` cuando cambia `accountId`.

### Reglas duras agregadas

- **NUNCA** calcular `fromDate`/`toDate` inline en drawer/dashboard de finance. Toda resolución pasa por `resolveTemporalWindow`.
- **NUNCA** mezclar modos en surfaces del mismo render.
- **NUNCA** crear drawer/dashboard nuevo de finance sin declarar `temporalDefaults` en su `InstrumentDetailProfile`.
- **NUNCA** hardcodear el `mode` en componente UI. Default viene del profile.
- Nuevos modos (e.g. `quarter`, `ytd`) → agregar al enum + extender helper. NO branchear en consumers.

## Delta 2026-05-08 — TASK-613: Finance Clients ↔ Organization Workspace convergence

### Convergencia Finance + Organization Workspace

`/finance/clients/[id]` ahora se renderiza **a través del Organization Workspace shell canónico** (TASK-612) cuando el flag `organization_workspace_shell_finance` está activo, preservando 1:1 la riqueza del legacy `<ClientDetailView>` (4 sub-tabs Facturación/Contactos/Facturas/Deals + 3 KPIs Por cobrar/Vencidas/Condiciones + AddMembershipDrawer). Cuando el flag está disabled o la organización canónica no es resoluble → cae al legacy `<ClientDetailView>` sin cambios funcionales (zero-risk cutover).

### Patrón canónico: dual-entrypoint dispatch en un facet

Un único componente `<FinanceFacet>` decide qué renderizar inspeccionando `entrypointContext`:

```tsx
const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}
```

- `entrypointContext === 'finance'` → contenido rico legacy del Finance Clients detail.
- `entrypointContext === 'agency' | 'admin' | 'client_portal'` → wrapping Agency-flavored del legacy `OrganizationFinanceTab`.

El facet sigue siendo **self-contained**: queries propias, drawers propios. NO renderiza chrome — el shell ya lo hace. Es el patrón de referencia para cuando otro facet necesite divergir per-entrypoint sin fragmentar el FACET_REGISTRY.

### Server-side gate canónico

El page server component es responsable de:

1. `requireServerSession` — prerender-safe, NUNCA `try/catch + getServerAuthSession()` ad hoc.
2. `isWorkspaceShellEnabledForSubject(subject, 'finance')` — flag-gated rollout via `organization_workspace_shell_finance` (TASK-780 platform).
3. `resolveFinanceClientContext({clientProfileId, organizationId, clientId, hubspotCompanyId})` — la URL `[id]` puede ser cualquiera de los 4 shapes; el resolver hace OR-matching internamente. Postgres-first + BigQuery fallback ya está en la primitiva canónica.
4. `resolveOrganizationWorkspaceProjection({subject, organizationId, entrypointContext: 'finance'})` cuando el shell está enabled.
5. Caer a legacy `<ClientDetailView />` si: flag disabled OR resolver throws OR `organizationId === null`. Errores capturados via `captureWithDomain('finance', ...)`.

### Reliability signal canónico

- **`finance.client_profile.unlinked_organizations`** (kind=`data_quality`, severity=`warning` si count>0). Cuenta `client_profiles` activas con `organization_id IS NULL`. Cuando >0, `/finance/clients/[id]` cae a legacy detail view (degradación honesta). Steady state = 0. Reader: `src/lib/reliability/queries/finance-client-profile-unlinked.ts`. Roll up bajo moduleKey `finance`.

### Reglas duras (TASK-613)

- **NUNCA** ramificar render de un facet por `entrypointContext` afuera del facet mismo. La decisión vive en el facet (self-contained), NO en el page o en el FacetContentRouter.
- **NUNCA** componer la projection en el cliente ni branchear `entrypointContext` desde un client component. Server-side por construcción.
- **NUNCA** llamar `resolveFinanceClientContext` con un solo shape cuando el caller tiene la URL `[id]` (cualquier callsite debe pasar los 4 shapes vía OR-matching).
- **NUNCA** modificar la flag `organization_workspace_shell_finance` directamente vía SQL. Toda mutación pasa por el admin endpoint `POST /api/admin/home/rollout-flags` (TASK-780).
- **NUNCA** crear un nuevo entrypoint Finance (e.g. `/finance/clients/admin/[id]`) que duplique el shell legacy. Extender la projection con un nuevo `entrypointContext` o el dispatch del FinanceFacet.

### Roadmap operativo (rollout)

1. V1 default OFF (flag global `enabled=FALSE` desde migration `20260508132302091`).
2. Activar para pilot users (efeonce admins) via `POST /api/admin/home/rollout-flags` con `scope_type='user'`.
3. Validar en staging E2E, luego flip global cuando reliability signals estén en steady state.
4. Cleanup de `<ClientDetailView />` legacy queda como follow-up post 100% rollout (>= 90 días sin reverts).
