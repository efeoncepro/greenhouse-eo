# Categoría económica de pagos

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-05-03 por TASK-768
> **Documentación técnica:** [`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) Delta 2026-05-03

## Para qué sirve

Cada pago que registra Greenhouse vive en dos dimensiones distintas al mismo tiempo:

1. **¿Qué es legalmente?** (taxonomía contable, lo que necesita el SII y la contadora). Ej: "factura de proveedor", "recibo de honorarios", "impuesto", "previsional".
2. **¿Qué es económicamente?** (categoría operativa, lo que necesitan los KPIs y dashboards). Ej: "costo en personas", "costo en herramientas SaaS", "costo regulatorio", "comisión bancaria".

A veces coinciden. Frecuentemente no. **Ejemplo real:** un pago a Deel Inc. es:

- **Legalmente** un proveedor (Deel emite factura a Greenhouse).
- **Económicamente** nómina (Deel paga a un colaborador internacional como costo de labor para Greenhouse).

Antes de TASK-768, Greenhouse usaba una sola columna para las dos cosas (`expense_type`). El bank reconciler defaulteaba a `'supplier'` cuando no podía inferir mejor → KPIs Nómina sub-counted en mil-millones, Proveedores inflado en lo mismo.

TASK-768 introdujo una **segunda columna independiente** llamada `economic_category` que vive junto a `expense_type` sin tocarlo. Cada pago tiene **ambas** clasificaciones.

## Las dos dimensiones lado a lado

### `expense_type` (legacy `accounting_type`) — fiscal/SII

Solo lo lee:

- VAT engine / IVA ledger
- Reportes SII
- Chile-tax engine
- Contabilidad regulatoria

Valores actuales: `supplier | payroll | social_security | tax | miscellaneous | financial_cost | bank_fee`.

**Esta columna NO se modifica nunca.** Es legacy intocable.

### `economic_category` (nueva) — analítica/operativa

Lo lee:

- KPIs cash-out / cash-in / dashboard
- ICO Engine (cost-per-FTE)
- P&L gerencial
- Member Loaded Cost program
- Budget Engine
- Cost Attribution
- Reliability dashboards

Valores canónicos para expense (11):

- `labor_cost_internal` — nómina chilena interna (Luis, Humberly, etc.)
- `labor_cost_external` — nómina internacional (Deel a Melkin, Global66 a Daniela/Andrés, transferencias directas)
- `vendor_cost_saas` — suscripciones SaaS (Adobe, Vercel, Notion, Anthropic, GitHub, ElevenLabs, Claude.ai, OpenAI)
- `vendor_cost_professional_services` — servicios profesionales (Beeconta, contadora externa, legal, consultoría)
- `regulatory_payment` — Previred, AFP, Mutual de Seguridad, Isapre, FONASA, TGR, Dirección del Trabajo
- `tax` — IVA, F29, retenciones SII directas
- `financial_cost` — intereses, cuotas créditos, factoring fees
- `bank_fee_real` — comisiones bancarias operativas (mantención de cuenta, comisión de transferencia local)
- `overhead` — costos generales no atribuibles
- `financial_settlement` — settlements internos (placeholder para wallets/loans/factoring futuros)
- `other` — fallback explícito; emite alerta si count > 0

Valores canónicos para income (8):

- `service_revenue` | `client_reimbursement` | `factoring_proceeds` | `partner_payout_offset` | `internal_transfer_in` | `tax_refund` | `financial_income` | `other`

## Cómo se decide la categoría

### Paths automáticos

Cada vez que se registra un pago, **dos motores independientes** intentan clasificarlo:

1. **Trigger de base de datos** (default seguro): mapeo simple de `expense_type` → `economic_category`. Por ejemplo, `expense_type='tax'` → `economic_category='tax'`. Esto cubre el 80% de los casos sin tocar el código de los 12 writers existentes.

2. **Resolver canónico TS** (más rico): cuando se invoca explícitamente (en backfill o reclassify), aplica 10 reglas en orden:
   1. **Identity match por member_id explícito** — el pago ya viene con member_id resuelto → consulta `team_members.employment_type` para decidir interno vs externo.
   2. **Identity match por RUT** — busca el RUT en la description del pago, lo busca contra `organizations.tax_id` → `person_legal_entity_relationships` → `members`. Si encuentra → `labor_cost_internal/external` según employment_type.
   3. **Identity match por email** — beneficiary email → members.primary_email o email_aliases.
   4. **Identity match por nombre** — fuzzy match contra members.display_name + legal_name.
   5. **Vendor de payroll conocido** — regex match contra `known_payroll_vendors` (Deel, Remote, Velocity Global, Oyster, Globalization Partners, Papaya Global, Multiplier, Rippling Global) → `labor_cost_external`.
   6. **Regulador conocido** — regex match contra `known_regulators` (Previred, SII, Mutual CChC, FONASA, 4 Isapres, 7 AFPs, TGR, Dirección del Trabajo) → `regulatory_payment`.
   7. **Supplier marcado como partner** (factoring) → `financial_settlement`.
   8. **Mapeo transparente desde accounting_type** (tax/social_security/financial_cost).
   9. **Fallback ambiguo** (supplier/bank_fee/miscellaneous sin más contexto) → `vendor_cost_saas` con confidence baja → manual queue.
   10. **Fallback final** → `other` con confidence `manual_required` → manual queue.

Cada decisión guarda **evidencia auditable** (qué regla matcheó, con qué confianza, qué identity/lookup se usó) en `economic_category_resolution_log`.

### Path manual

Cuando el resolver tiene confidence baja (low/manual_required), la fila va a **manual queue** (`economic_category_manual_queue`). El operador la resuelve via UI:

- Endpoint: `PATCH /api/admin/finance/expenses/{id}/economic-category`
- Capability: `finance.expenses.reclassify_economic_category` (FINANCE_ADMIN + EFEONCE_ADMIN)
- Body: `{economicCategory, reason (min 10 chars), bulkContext?}`
- Atomic: UPDATE + audit log + manual queue resolved + outbox event v1

## Lookup tables seedeadas

Greenhouse mantiene dos tablas de "diccionarios" para que el resolver auto-clasifique sin código nuevo:

**`greenhouse_finance.known_regulators`** (17 entries, jurisdicción Chile):

- Previred, SII, Mutual de Seguridad CChC, FONASA, Isapre Banmédica, Colmena, Cruz Blanca, Vida Tres, AFP Habitat, ProVida, Modelo, Capital, Cuprum, PlanVital, Uno, TGR, Dirección del Trabajo.

**`greenhouse_finance.known_payroll_vendors`** (8 entries):

- Deel, Remote.com, Velocity Global, Oyster HR, Globalization Partners, Papaya Global, Multiplier, Rippling Global.

**Para agregar nuevos:** simplemente INSERT row en la tabla. Cero código nuevo.

## Defensa-en-profundidad

- **Trigger BEFORE INSERT** (`populate_economic_category_default_trigger`): garantiza que toda fila INSERTed tiene `economic_category` poblada con un default razonable.
- **CHECK constraint `canonical_values`** (VALIDATED): bloquea valores fuera del enum (11 expense / 8 income).
- **CHECK constraint `required_after_cutover`** (NOT VALID inicial; VALIDATE post-cleanup manual queue): garantiza que toda fila post-cutover tenga la columna poblada.
- **Lint rule `greenhouse/no-untokenized-expense-type-for-analytics`** mode `error`: bloquea cualquier código nuevo que filtre/agrupe por `expense_type` para análisis económico.
- **Reliability signals** `finance.expenses.economic_category_unresolved` + `finance.income.economic_category_unresolved`: count > 0 → severity error → `safeMode.financeReadSafe=false` en `/api/admin/platform-health`.
- **Audit log append-only** `economic_category_resolution_log` con trigger anti-update/delete (TASK-765 pattern).

## Qué NO toca

- Saldos bancarios (cash flow es ortogonal a la dimensión bucket).
- P&L tributario / SII reports (siguen leyendo `expense_type`).
- Total Pagado del mes (se mantiene; solo cambia distribución entre buckets).
- Migraciones VAT / IVA / chile-tax (TASK-529-533) — usan `expense_type` legítimamente.

## Qué SÍ cambia visiblemente

- KPI Nómina cash-out abril 2026: $1.030.082 (broken) → ~$4M (canónico).
- KPI Proveedores baja en proporción.
- ICO, costos por persona, presupuestos, allocations a clientes — todos quedan correctos automáticamente porque leen `economic_category` post-Slice 8.
- Botón "Reclasificar" disponible en `/finance/expenses` para corregir mis-clasificaciones (UI dialog futura; mientras tanto, vía endpoint admin).

> **Detalle técnico:**
>
> - Spec arquitectónica: [`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) Delta 2026-05-03
> - Reliability spec: [`GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md) Delta 2026-05-03
> - Outbox events: [`GREENHOUSE_EVENT_CATALOG_V1.md`](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) Delta 2026-05-03
> - Spec de tarea: [`TASK-768`](../../tasks/complete/TASK-768-finance-expense-economic-category-dimension.md)
> - Manual operativo: [reclasificar pagos por categoría económica](../../manual-de-uso/finance/reclasificar-pagos-categoria-economica.md)
> - Código fuente:
>   - Resolver: [`src/lib/finance/economic-category/`](../../../src/lib/finance/economic-category/)
>   - Endpoints: [`src/app/api/admin/finance/{expenses,income}/[id]/economic-category/`](../../../src/app/api/admin/finance/)
>   - Backfill: [`scripts/finance/backfill-economic-category.ts`](../../../scripts/finance/backfill-economic-category.ts)
>   - Reliability: [`src/lib/reliability/queries/economic-category-unresolved.ts`](../../../src/lib/reliability/queries/economic-category-unresolved.ts)
>   - Lint rule: [`eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs`](../../../eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs)
