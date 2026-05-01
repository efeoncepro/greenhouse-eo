# TASK-749 — Beneficiary Payment Profiles + Routing Policies

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `V1 entregado 2026-05-01 con modelo dual-surface (Person 360 + Shareholder 360 + Finance Ops)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-748`
- Branch: `task/TASK-749-beneficiary-payment-profiles-routing`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introduce perfiles versionados de pago por beneficiario y un resolver de routing policy para decidir instrumento/plataforma de pago por obligación. Soporta que Andrés, Daniela, Melkin u otros colaboradores se paguen por instrumentos distintos sin hardcodear reglas.

## Why This Task Exists

El beneficiario de una obligación no es suficiente para saber cómo pagar. Un colaborador puede pagarse por banco local, Deel, Global66, Wise u otro rail según moneda, país, contrato, payroll_via y perfil vigente. Cambios de datos bancarios son sensibles y requieren maker-checker.

## Goal

- Crear `beneficiary_payment_profiles` versionado y seguro.
- Resolver payment route por obligación.
- Congelar snapshot de perfil/routing usado por cada orden futura.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

Reglas obligatorias:

- No guardar cuentas completas en texto plano si puede evitarse.
- Mostrar datos sensibles enmascarados por defecto.
- Cambios de perfil requieren maker-checker.
- No hardcodear "internacional = Global66".
- Routing debe ser policy-driven.

## Dependencies & Impact

### Depends on

- `TASK-748`
- `greenhouse_finance.accounts`
- `greenhouse_finance.payment_provider_catalog`
- `greenhouse_core.members`
- `greenhouse_core.identity_profiles`

### Blocks / Impacts

- Bloquea `TASK-750`.
- Impacta Person 360 y Finance Admin.

### Files owned

- `migrations/<timestamp>_task-749-beneficiary-payment-profiles.sql`
- `src/lib/finance/beneficiary-payment-profiles/`
- `src/lib/finance/payment-routing/`
- `src/app/api/finance/beneficiary-payment-profiles/**`
- `docs/documentation/finance/perfiles-de-pago-beneficiarios.md`
- `docs/manual-de-uso/finance/perfiles-de-pago-beneficiarios.md`

## Current Repo State

### Already exists

- `greenhouse_finance.accounts` con instrumentos y provider catalog.
- Admin de instrumentos de pago.
- Payment providers seed incluyendo processors/plataformas.

### Gap

- No existe perfil de pago por beneficiario.
- No hay snapshot auditable de payout profile.
- No hay maker-checker para cambios de cuenta del colaborador.
- No hay resolver de ruta de pago.

## Scope

### Slice 1 — Schema profiles

- Crear `greenhouse_finance.beneficiary_payment_profiles`.
- Soportar beneficiary types: `member`, `supplier`, `tax_authority`, `processor`, `shareholder`, `manual`.
- Campos: currency, country, provider_slug, payment_instrument_id, masked_account_ref, vault_ref opcional, active_from/to, status, requested/approved audit.

### Slice 2 — Routing resolver

- Crear `resolvePaymentRoute(obligation)`.
- Inputs: source, beneficiary, pay_regime, payroll_via, currency, country, active profile, amount.
- Outputs: direct bank, processor, provider payroll, multi-leg required, blocked.

### Slice 3 — APIs + audit

- CRUD controlado de perfiles.
- Approve/supersede profile.
- Capability gates:
  - `finance.payment_profiles.read`
  - `finance.payment_profiles.create`
  - `finance.payment_profiles.approve`
  - `finance.payment_profiles.reveal_sensitive`

## Out of Scope

- Crear payment orders.
- Enviar pagos a bancos/proveedores.
- Integración con vault externo real si no existe; puede usar `vault_ref` como contrato.

## Acceptance Criteria

- [ ] Perfiles versionados existen con estados y audit.
- [ ] Routing resolver retorna instrumento/plataforma por obligación.
- [ ] Cambios de perfil sensible requieren aprobación.
- [ ] Datos sensibles se muestran enmascarados.
- [ ] Tests cubren CLP local, Deel, Global66/Wise-style, profile missing y profile superseded.

## Verification

- `pnpm vitest run src/lib/finance/beneficiary-payment-profiles src/lib/finance/payment-routing`
- `pnpm exec eslint src/lib/finance/beneficiary-payment-profiles src/lib/finance/payment-routing`
- `pnpm build`
- `pnpm pg:connect:migrate`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
