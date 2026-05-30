# TASK-796 — Contractor Self-Service Hub

## Delta 2026-05-30

- Desbloqueado (parcial) por **TASK-791 ✅ complete**: el contractor puede subir su propia boleta/invoice + evidencia con `<GreenhouseFileUploader contextType='contractor_invoice_draft' | 'contractor_work_evidence_draft'>` (self-upload ya permitido vía member facet) y luego adjuntar con `attachContractorInvoiceAsset`. El access policy ya garantiza que el contractor ve solo lo propio y NO ve provider statements. La UI self-service consume esta infra; no inventar uploader nuevo.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-790, TASK-791, TASK-793, TASK-753`
- Branch: `task/TASK-796-contractor-self-service-hub`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la surface self-service para contractors: ver engagement activo, subir invoice/boleta/evidencia, revisar approval/payment state y gestionar o enlazar perfil de pago sin duplicar `TASK-753`.

## Why This Task Exists

Si contractors envian invoices por correo o chat, Greenhouse pierde ownership, audit, dedup, access policy y readiness. La surface debe ser portal-first, pero el perfil de pago debe reutilizar Payment Profiles Self-Service.

## Goal

- Crear `/my/contractor` or equivalent route/view.
- Allow invoice/evidence submission through `GreenhouseFileUploader`.
- Show approval, payable and payment order status.
- Reuse payment profile self-service instead of rebuilding it.

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No expose provider statements containing provider fees to contractor by default.
- Copy visible must be simple and not imply employee payroll/finiquito.
- `views`/`authorizedViews` and entitlements must both be documented.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-791`
- `TASK-793`
- `TASK-753` registered but file currently missing; recover/create before implementation.

### Blocks / Impacts

- Impacts `/my` navigation, startup policy if new view is introduced, and payment profile self-service.

### Files owned

- `src/app/(dashboard)/my/**` `[verificar]`
- `src/views/greenhouse/my/**`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`

## Current Repo State

### Already exists

- My Payroll/payment surfaces exist.
- Uploader is reusable after `TASK-791`.
- Payment Profile self-service is registered as `TASK-753` but spec file is absent in the current tree.

### Gap

- No contractor self-service route.
- No contractor invoice submission UX.
- No contractor-facing payment status timeline.

## Scope

### Slice 1 — Access and navigation

- Add view/route/capability for contractor self-service.
- Show only if user has active contractor engagement or relevant feature flag.

### Slice 2 — Invoice/evidence submission

- Use `GreenhouseFileUploader` contexts from `TASK-791`.
- Submit invoice metadata and asset refs.

### Slice 3 — Status timeline

- Show invoice submitted/approved/disputed, payable ready, obligation/order status and paid state.

### Slice 4 — Payment profile integration

- Link or embed the canonical `TASK-753` self-service payment profile flow.

## Payroll Non-Regression Guardrails (hard rules)

796 es UI self-service de contractor; no toca cálculo. Riesgo de presentación: confundir al contractor con semántica de empleado/nómina. Copy validado con `greenhouse-ux-writing`.

- **NUNCA** mostrar copy que implique nómina dependiente, sueldo, finiquito, AFP/salud ni liquidación. El contractor ve invoices/payables/payment state, no recibos de nómina.
- **NUNCA** mezclar la surface `/my/contractor` con `/my/payroll`. Audiencias y regímenes distintos; no reutilizar el componente de recibo de nómina dependiente.
- **NUNCA** filtrar al contractor datos de payroll dependiente ni montos de otros regímenes/colaboradores.
- **SIEMPRE** validar el copy con `greenhouse-ux-writing` (es-CL) para no sugerir relación laboral dependiente.

## Out of Scope

- Rebuilding payment profiles.
- HR admin contractor workbench.
- Provider import automation.

## Acceptance Criteria

- [ ] Contractor can submit invoice/boleta with asset upload.
- [ ] Contractor can see approval/payment state without Finance-only data leaks.
- [ ] Contractor cannot see provider statements by default.
- [ ] Payment profile call-to-action reuses `TASK-753` surface.
- [ ] UI passes `DESIGN.md` and design lint where applicable.

## Verification

- `pnpm design:lint`
- `pnpm exec tsc --noEmit --pretty false`
- Focused component/API tests.
- Browser smoke for desktop/mobile if UI implemented.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Manual de uso updated if visible workflow ships.
