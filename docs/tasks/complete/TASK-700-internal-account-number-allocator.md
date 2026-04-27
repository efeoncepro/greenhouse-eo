# TASK-700 — Internal Account Number Allocator (CCA + future wallets)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`

## Summary

Las cuentas accionistas (CCA) hoy no tienen número de cuenta legible — `accounts.account_number` queda `NULL`. Esta task introduce un **algoritmo canónico, reusable, multi-tenant** para asignar números de cuenta internos con formato bank-style (`01-90-7-0001`), validable con check digit Luhn mod-10, y diseñado para ser la base que también va a alimentar wallets, préstamos intercompañía, factoring y cualquier otra "cuenta interna" que aparezca después. La masking estándar `•••• {last4}` produce los 4 dígitos del secuencial puro (cero colisión visual).

## Why This Task Exists

1. La card "Cuenta accionista" (`/finance/shareholder-account`) y el admin (`/admin/payment-instruments`) muestran identificador vacío para CCAs porque nunca tuvieron un número formal asignado.
2. Cuando lleguen wallets de empleados/freelancers/clientes, NO queremos repetir la discusión de "qué formato usar". El algoritmo de hoy debe ser la base reusable.
3. El número debe ser:
   - **Bank-style** (numérico, separado por guiones) para coherencia con el resto del workspace
   - **Tenant-scoped** (multi-space sin colisión)
   - **Type-discriminator** (CCA vs wallet vs loan distinguibles en el número)
   - **Masking-friendly** (últimos 4 caracteres = secuencial puro de 4 dígitos)
   - **DV validable** (Luhn mod-10, todo numérico, sin caso `K`)
   - **Inmutable + auditable** (cada número emitido queda en un registry)
   - **Future-proof** (`format_version` permite evolucionar sin invalidar emitidos)

## Goal

- Algoritmo canónico de asignación implementado en SQL (función + tabla registry) y TS (allocator runtime + helpers).
- 1 sola CCA existente (Julio Reyes) recibe número en migración: `01-90-7-0001`.
- `createShareholderAccount` invoca el allocator para nuevas CCAs, persiste el número, publica outbox event.
- UI de shareholder muestra número completo + copy. Admin enmascara `•••• {last4}` (sin cambios al serializer existente, porque el slice(-4) ya produce el secuencial puro).
- Algoritmo listo para reutilizarse cuando lleguen wallets — solo agregar fila al catálogo.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- Numeric tenant code **explícito** en `greenhouse_core.spaces.numeric_code` — no derivado.
- Type code **explícito** en tabla catálogo `greenhouse_finance.internal_account_type_catalog` — extensible sin migrar generador.
- Allocator atómico con `pg_advisory_xact_lock` por `(space, type)` — sin race conditions.
- TS y SQL del Luhn deben coincidir bit-a-bit (paridad regresión-testeada).

## Dependencies & Impact

### Depends on

- `greenhouse_finance.accounts` con `account_number` y `instrument_category`
- `greenhouse_finance.shareholder_accounts` con `space_id`
- `greenhouse_core.spaces` (tabla existente)

### Blocks / Impacts

- **Habilita** futuras tasks de wallets, factoring accounts, intercompany loans — todas pueden reutilizar `allocateAccountNumber({ typeCode })` sin migrar el generador.
- TASK-697 admin payment instruments hereda automáticamente el número visible (sin cambios).

### Files owned

- `migrations/20260427134952999_task-700-internal-account-number-allocation.sql`
- `src/lib/finance/internal-account-number/luhn.ts`
- `src/lib/finance/internal-account-number/allocate.ts`
- `src/lib/finance/internal-account-number/format.ts`
- `src/lib/finance/internal-account-number/mask.ts`
- `src/lib/finance/internal-account-number/index.ts`
- `src/lib/finance/internal-account-number/__tests__/*.test.ts`
- `src/lib/finance/shareholder-account/store.ts` (wiring de allocator)

## Current Repo State

### Already exists

- `accounts.account_number` y `account_number_full` columnas (NULL para shareholder)
- API admin/payment-instruments enmascara con `•••• {last4}` via `slice(-4)`
- `serializer.ts` canónico con masking
- 1 CCA: `sha-cca-julio-reyes-clp` (Efeonce)

### Gap (resuelto en esta task)

- Sin generador canónico
- Sin registry de números emitidos
- Sin numeric_code en spaces
- Sin catálogo de tipos
- CCAs sin número visible

## Scope

### Slice 1 — Schema + función SQL + backfill (DONE)

- Migración aplicada (`20260427134952999`)
- `spaces.numeric_code`, `internal_account_type_catalog`, `account_number_registry`, `luhn_check_digit()`, `allocate_account_number()`
- Backfill: Julio Reyes → `01-90-7-0001`

### Slice 2 — Módulo TS canónico

- `luhn.ts` mirror exacto del PL/pgSQL — paridad regresión testeada
- `allocate.ts` invoca SQL function via Kysely (no re-deriva en TS)
- `format.ts` parse + format helpers
- `mask.ts` `maskAccountNumber(number)` → `•••• 0001`
- Tests: Luhn paridad, allocator end-to-end, format round-trip

### Slice 3 — Wiring shareholder

- `createShareholderAccount` en `store.ts` invoca `allocateAccountNumber()` antes del INSERT en `accounts`
- Outbox event `finance.shareholder_account.number_assigned` con `accountNumber`, `formatVersion`
- Update existing helpers que devuelven CCA para incluir `accountNumber`

### Slice 4 — UI shareholder

- `ShareholderAccountView` muestra `accountNumber` completo con botón copy
- Drawer detalle CCA: header con número
- Admin lista (sin cambios — ya enmascara)

### Slice 5 — Tests + verificación

- `pnpm test src/lib/finance/internal-account-number`
- `pnpm test src/lib/finance` (regresión)
- `pnpm lint`, `npx tsc --noEmit`
- Smoke staging via `pnpm staging:request`

## Out of Scope

- Wallets (employee, freelancer, client) — solo se reserva el rango `10-29` en el catálogo conceptualmente, NO se materializan.
- Factoring accounts, intercompany loans — rango `70-89` reservado, NO materializados.
- Format v2 (5+ dígitos secuenciales) — `format_version` ya existe, no se ejerce.
- Reveal endpoint con audit para CCAs — innecesario porque el número no es sensible.

## Detailed Spec

Formato canónico v1: `TT-XX-D-NNNN`
- `TT` = `spaces.numeric_code`
- `XX` = `internal_account_type_catalog.type_code` (`90` = shareholder_account)
- `D` = Luhn(TT‖XX‖NNNN)
- `NNNN` = secuencial monotónico zero-padded por `(space, type)`

Allocator API TS:

```ts
export const allocateAccountNumber = async (input: {
  spaceId: string
  typeCode: string
  targetTable: string
  targetId: string
  client?: QueryableClient
}): Promise<{
  accountNumber: string
  formatVersion: number
  sequentialValue: number
}>

export const luhnCheckDigit = (payload: string): string
export const formatAccountNumber = (parts: { tenantCode: string; typeCode: string; sequential: number }): string
export const parseAccountNumber = (number: string): { tenantCode: string; typeCode: string; dv: string; sequential: number; formatVersion: number } | null
export const validateAccountNumber = (number: string): boolean
export const maskAccountNumber = (number: string): string
```

## Acceptance Criteria

- [x] Migración aplicada en Cloud SQL `greenhouse-pg-dev`, `pg:doctor` healthy.
- [x] Backfill Julio Reyes → `01-90-7-0001`. Verificado vía staging API: `accountNumber: "•••• 0001"`.
- [ ] Módulo TS `internal-account-number/` con paridad Luhn vs SQL (test).
- [ ] `createShareholderAccount` invoca allocator en transacción.
- [ ] Outbox event `finance.shareholder_account.number_assigned` se publica.
- [ ] `ShareholderAccountView` muestra número completo con copy.
- [ ] `pnpm lint`, `npx tsc --noEmit`, `pnpm test src/lib/finance` verde.

## Verification

- `pnpm pg:connect:status`
- `npx tsc --noEmit`
- `pnpm lint`
- `pnpm test src/lib/finance`
- `pnpm staging:request "/api/admin/payment-instruments?category=shareholder_account"` muestra `•••• 0001`.

## Closing Protocol

- [ ] Lifecycle `complete`
- [ ] Archivo movido a `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] CLAUDE.md sección "Finance" extendida con bloque "Internal Account Number Allocator"

## Follow-ups

- Cuando se cree el módulo de wallets, agregar fila al catálogo (`('10', 'employee_wallet', ...)`) y reusar `allocateAccountNumber({ typeCode: '10', targetTable: 'wallets', ... })`.
- UI: agregar `<InternalAccountNumber>` componente reusable con copy + disclaimer "Identificador interno · No es bancario".
- Reliability signal: incidente si `account_number_registry` queda desincronizada de `accounts.account_number`.
