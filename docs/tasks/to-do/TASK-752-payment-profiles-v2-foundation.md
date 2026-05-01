# TASK-752 — Payment Profiles V2 Foundation (Suppliers + Tax authorities + Autocomplete + Scheduled rotation)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-749`
- Branch: `task/TASK-752-payment-profiles-v2-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuatro extensiones que comparten fundamento técnico y desbloquean cobertura
universal del módulo Payment Profiles: aceptar supplier como beneficiary
creable, pre-seedear tax authorities como perfiles del sistema (sin
maker-checker), agregar autocomplete de beneficiary en el dialog de
creación, y hacer que el resolver respete `active_from/to` para soportar
scheduled rotation sin downtime.

## Why This Task Exists

V1 (TASK-749) entregó el modelo dual-surface enfocado en `member` y
`shareholder`. Hoy tres caminos quedan abiertos como deuda:

1. **Suppliers no son creables**: el CHECK constraint los acepta pero
   `createPaymentProfile` los rechaza con `beneficiary_type_unsupported_v1`.
   Cuando aparezcan facturas recurrentes (Adobe, Notion, Cloud Run), el
   operator no puede registrar el rail de pago canónico una sola vez.
2. **Tax authorities requieren maker-checker innecesario**: SII y Previred
   son rails fijos del sistema, no decisiones humanas. Forzar maker-checker
   ahí genera fricción operativa.
3. **Autocomplete de beneficiary**: hoy el operator pega el `member_id` a
   mano. Es lento y propenso a error.
4. **Scheduled rotation no funciona**: el schema ya tiene `active_from` y
   `active_to` pero el resolver no los respeta. Cuando un colaborador
   cambia de banco, hoy hay que editarlo en el momento exacto del cambio
   en lugar de programarlo con anticipación.

## Goal

- Habilitar `beneficiary_type='supplier'` end-to-end (helper + UI mount en Supplier 360)
- Pre-seedear tax authorities (SII, Previred, Mutual) como perfiles `system=true` exentos de maker-checker
- Autocomplete de beneficiary en CreateProfileDialog (lookup por nombre)
- Resolver y queries de "active" respetan `active_from <= today AND (active_to IS NULL OR active_to >= today)`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` (Delta TASK-749)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Supplier como objeto canónico)

Reglas obligatorias:

- Mantener el contrato del componente `<PaymentProfilesPanel>`. La extensión es agregar mounts, no romper el existente.
- Tax authorities tienen `system=true` flag — el trigger DB de maker-checker debe exceptuarlos (constraint nuevo).
- Autocomplete debe degradar a input libre si el endpoint falla.
- Scheduled rotation no debe permitir overlap entre dos perfiles activos para la misma key — el partial unique index ya lo enforce, pero el resolver debe escoger por `active_from <= today` cuando hay 2 rows con status='active' en transición.

## Dependencies & Impact

### Depends on

- `TASK-749` (V1 dual-surface)
- `greenhouse_finance.payment_provider_catalog` (Previred, SII ya seedados)
- Supplier Detail page existente

### Blocks / Impacts

- Bloquea cobertura universal del resolver en `createPaymentOrderFromObligations`
- Impacta Supplier 360 (nuevo mount) y CreateProfileDialog

### Files owned

- `migrations/<timestamp>_task-752-payment-profiles-system-flag.sql`
- `migrations/<timestamp>_task-752-seed-tax-authority-profiles.sql`
- `src/lib/finance/beneficiary-payment-profiles/active-window.ts`
- `src/app/api/admin/finance/payment-profiles/lookup/route.ts` (autocomplete)
- `src/views/greenhouse/finance/payment-profiles/CreateProfileDialog.tsx` (modificar)
- `src/views/greenhouse/finance/suppliers/SupplierDetailView.tsx` (modificar — mount)

## Current Repo State

### Already exists

- `<PaymentProfilesPanel>` reutilizable con `constrainedBeneficiary`
- Schema `beneficiary_payment_profiles` con `active_from`/`active_to`
- CHECK constraint que acepta supplier/tax_authority

### Gap

- Helper `createPaymentProfile` rechaza supplier
- No hay `system` flag en el schema → maker-checker se aplica a todo
- CreateProfileDialog no tiene autocomplete
- `getActivePaymentProfile` y resolver no filtran por `active_from`

## Scope

### Slice 1 — Supplier mount

- Quitar guard `beneficiary_type_unsupported_v1` para `supplier` en `create-profile.ts`.
- Mount `<PaymentProfilesPanel constrainedBeneficiary={{type: 'supplier', id: supplierId}} />` en Supplier Detail.
- Capability check: misma `finance.payment_profiles.create`.

### Slice 2 — Tax authority system profiles

- Migration: agregar columna `system BOOLEAN NOT NULL DEFAULT FALSE` a `beneficiary_payment_profiles`.
- Migration: actualizar trigger `assert_payment_profile_maker_checker` para EXIMIR rows con `system=TRUE`.
- Migration seed: insertar perfiles del sistema para `cl_sii`, `cl_previred`, `cl_mutual` con provider `previred` o `sii_pec` según corresponda, status='active', `system=true`, `created_by='system:migration'`.
- UI: en surface ops queue, mostrar badge "Sistema" para esos perfiles y bloquear edit/cancel.

### Slice 3 — Autocomplete de beneficiary

- API `GET /api/admin/finance/payment-profiles/lookup?type=member|supplier&query=...` retorna top 10 matches con id+nombre.
- En CreateProfileDialog, reemplazar input `beneficiaryId` por CustomAutocomplete.
- Reusar el patrón del Quote Builder member picker si existe.

### Slice 4 — Scheduled rotation

- Helper `getActivePaymentProfileAt(input, asOfDate)` que filtra por `active_from <= asOfDate AND (active_to IS NULL OR active_to >= asOfDate)`.
- `resolvePaymentRoute` usa `getActivePaymentProfileAt(today)` por default.
- UI Create/Edit: agregar campo opcional "Vigente desde" (defaults to hoy) y "Vigente hasta" (opcional).
- Test: crear perfil con `active_from=tomorrow` → resolver hoy debe seguir tomando el viejo; resolver mañana toma el nuevo.

## Out of Scope

- Vault externo (queda en TASK-754)
- Splits multi-method (queda en TASK-755)
- Self-service del colaborador (TASK-753)
- Bulk approve real (TASK-755)

## Acceptance Criteria

- [ ] Crear perfil para supplier desde Supplier Detail funciona end-to-end
- [ ] Tax authority perfil `system=true` se aprueba sin checker
- [ ] Autocomplete sugiere beneficiarios al tipear 2+ caracteres
- [ ] Crear perfil con `active_from=tomorrow` no afecta routing hoy
- [ ] Tests cubren los 4 slices

## Verification

- `pnpm vitest run src/lib/finance/beneficiary-payment-profiles src/lib/finance/payment-routing`
- `pnpm exec eslint src/lib/finance/beneficiary-payment-profiles src/lib/finance/payment-routing src/views/greenhouse/finance/suppliers`
- `pnpm build`
- `pnpm pg:connect:migrate`
- Smoke manual: crear perfil supplier → ver en Supplier 360 + ver en surface ops queue

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] Archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] Chequeo de impacto cruzado sobre TASK-754, TASK-755 (depende de active-window)
