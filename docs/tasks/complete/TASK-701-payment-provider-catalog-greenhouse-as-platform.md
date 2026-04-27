# TASK-701 — Payment Provider Catalog + Greenhouse as platform_operator

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Cerrada 2026-04-27`
- Domain: `finance`
- Branch: `develop`

## Summary

El campo "Proveedor" del admin de payment instruments era un text input libre, lo cual mezclaba dos conceptos distintos (proveedor externo de banco/tarjeta/fintech vs operador interno de ledger), no se filtraba por categoría, y para CCAs salía vacío con un warning falso "Proveedor pendiente". Esta task introduce un **catálogo canónico de proveedores** + **reglas declarativas por categoría**, promueve a **Greenhouse como `platform_operator`** (proveedor first-class de la CCA y futuras wallets internas), y refactoriza el form para ser declarativo según la regla.

## Why This Task Exists

1. La CCA es un wallet operado por la propia plataforma (Greenhouse). El proveedor externo no aplica — pero "no aplica" es distinto de "vacío", y el modelo anterior no podía expresar la diferencia.
2. Greenhouse-as-provider unifica el modelo: TODA cuenta tiene proveedor (quién opera el ledger). Bancos custodian saldo bancario, fintechs custodian saldo digital, Greenhouse custodia ledger interno. Mismo rol funcional.
3. Mezclar `provider_slug` libre y reglas hardcoded en form/readiness producía drift cuando aparecía cada categoría nueva.
4. El próximo módulo (wallets de empleado/freelancer/cliente) necesita reusar el mismo modelo sin re-discutir formato.

## Goal

- Catálogo `payment_provider_catalog` como FK de `accounts.provider_slug`.
- Greenhouse como `platform_operator` first-class.
- Reglas declarativas por `instrument_category` que driven form + readiness.
- UI del form usa rule (dropdown filtrado, Greenhouse pre-seteado read-only para CCA, counterparty panel visible).
- Eliminar el "Proveedor pendiente" falso para CCA.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- TASK-281 (Payment Instruments registry) — extiende
- TASK-697 (Payment Instrument Admin Workspace Enterprise) — refactor form
- TASK-700 (Internal Account Number Allocator) — alinea con la familia de "instrumentos internos operados por Greenhouse"

## Files owned

- `migrations/20260427143400960_task-701-payment-provider-catalog-greenhouse-as-platform.sql`
- `src/lib/finance/payment-instruments/category-rules.ts`
- `src/lib/finance/payment-instruments/admin-detail.ts` (`buildReadiness` + `readCounterpartyId`)
- `src/lib/finance/payment-instruments/__tests__/category-rules.test.ts`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView.tsx`
- `src/views/greenhouse/admin/payment-instruments/paymentInstrumentAdminAdapters.ts`
- `src/config/payment-instruments.ts` (entry `greenhouse`)

## Scope (Done)

### Slice 1 — Schema + seed + backfill
- `payment_provider_catalog` table con 20 proveedores seedeados (banks, card networks, fintech, payment platforms, payroll processors, **Greenhouse**)
- `instrument_category_provider_rules` table con seed de 7 categorías
- FK `accounts.provider_slug → payment_provider_catalog`
- Backfill: la CCA de Julio recibe `provider_slug = 'greenhouse'`

### Slice 2 — Helpers TS canónicos
- `getCategoryProviderRule(category)` mirror del seed SQL
- `hasFixedProvider(rule)` type-guard para casos auto-asignados
- `PROVIDER_CATALOG.greenhouse` con logo `greenhouse-blue.svg` + compactLogo isotipo
- `buildReadiness` lee la rule para producir labels dinámicos y agregar check de counterparty

### Slice 3 — UI declarativa
- `PaymentInstrumentDetailView` reemplaza `<TextField>` libre por `<Select>` filtrado por `providerTypesAllowed` + `instrumentCategory`
- Cuando `defaultProviderSlug` está set → field disabled + helper "La plataforma opera este instrumento"
- Cuando `requiresProvider = false` → DetailField "No aplica"
- Pre-fill defensivo del slug con `defaultProviderSlug` si la fila vino sin provider (legacy safety)

### Slice 4 — Counterparty panel
- Card outlined nuevo "Accionista" en el right column, antes del bloque Ruteo y readiness
- Lee `metadataJsonSafe.shareholderProfileId` + `shareholderName`
- Avatar + nombre + profile_id; Alert warning cuando falta
- Adapter fallback alineado con la nueva lógica de readiness

## Acceptance Criteria

- [x] `pnpm pg:connect:migrate` aplica sin errores
- [x] `accounts.provider_slug` para CCA = `'greenhouse'` (verificado en staging API: `"providerSlug":"greenhouse"`)
- [x] `<ProviderSelect>` muestra "Greenhouse" pre-seteado y disabled para CCA
- [x] `<ProviderSelect>` muestra solo bancos para `bank_account`, solo card networks para `credit_card`, solo fintechs para `fintech`
- [x] Counterparty panel renderiza para CCA con profile + nombre
- [x] Readiness check "Plataforma configurado" pasa para CCA (no más "Proveedor pendiente" falso)
- [x] `pnpm lint`, `npx tsc --noEmit`, `pnpm test src/lib/finance` (382/382 verde, +7 nuevos)

## Closing Protocol

- [x] Lifecycle complete
- [x] Spec en `docs/tasks/complete/`
- [x] README + TASK_ID_REGISTRY sincronizados
- [x] Handoff actualizado
- [x] changelog actualizado
- [x] CLAUDE.md sección Finance ampliada

## Follow-ups

- Cuando el módulo de wallets ship: agregar `('10','employee_wallet',...)` etc al catálogo de tipos (TASK-700) + `applicable_to` de greenhouse += ['employee_wallet','client_wallet',...] + INSERT rule en `instrument_category_provider_rules`. Cero código nuevo en form.
- Migrar `PROVIDER_CATALOG` constante TS a fetcheo del catálogo SQL si la cantidad de proveedores escala (hoy son 20, manejable como constante con sync vía test).
- Persistir `counterparty_profile_id` en columna dedicada de `accounts` (en vez de `metadata_json`) para queries más limpias.
