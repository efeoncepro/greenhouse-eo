# TASK-796 — Contractor Self-Service Hub

## Delta 2026-05-30

- Desbloqueado (parcial) por **TASK-792 ✅ complete**: el backend de work submissions existe (`/api/hr/contractors/work-submissions` + store). La UI self-service consume estos endpoints (crear/editar borrador/enviar timesheet/milestone/deliverable + ver estado approved/disputed/rejected). La revisión (approve/dispute/reject) es surface de HR, no del contractor (capability `hr.contractor_work_submission.review`). El backend ya está; esta task agrega la UI.
- Desbloqueado (parcial) por **TASK-791 ✅ complete**: el contractor puede subir su propia boleta/invoice + evidencia con `<GreenhouseFileUploader contextType='contractor_invoice_draft' | 'contractor_work_evidence_draft'>` (self-upload ya permitido vía member facet) y luego adjuntar con `attachContractorInvoiceAsset`. El access policy ya garantiza que el contractor ve solo lo propio y NO ve provider statements. La UI self-service consume esta infra; no inventar uploader nuevo.
- **Mockups aprobados por operador**: la implementacion debe dar vida a los mockups versionados, no reinterpretar el flujo desde cero. Rutas aprobadas:
  - Contractor self-service: `/my/contractor/mockup`
  - HR/admin workbench: `/hr/contractors/mockup`
  - Captura GVC final del admin workbench: `.captures/2026-05-30T12-42-40_contractor-admin-workbench`
  - Capturas de apoyo: `.captures/2026-05-30T12-20-24_inline-my-contractor-mockup` y `.captures/2026-05-30T12-26-35_inline-hr-contractors-mockup`
  - Dossier UI: `.captures/2026-05-30T12-42-40_contractor-admin-workbench/review-dossier.md`

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

Crear la surface self-service para contractors y su companion HR/admin workbench: contractor ve engagement activo, sube invoice/boleta/evidencia, revisa approval/payment state y gestiona o enlaza perfil de pago sin duplicar `TASK-753`; HR/admin revisa cola, disputa/evidencia, timeline y paso hacia Finance sin exponer datos Finance-only al contractor.

## Why This Task Exists

Si contractors envian invoices por correo o chat, Greenhouse pierde ownership, audit, dedup, access policy y readiness. La surface debe ser portal-first, pero el perfil de pago debe reutilizar Payment Profiles Self-Service.

## Goal

- Crear `/my/contractor` or equivalent route/view.
- Crear `/hr/contractors` or equivalent HR/admin route/view for review and operational follow-up.
- Allow invoice/evidence submission through `GreenhouseFileUploader`.
- Show approval, payable and payment order status.
- Show HR/admin queue, case timeline, dispute/review panel and operational signals.
- Reuse payment profile self-service instead of rebuilding it.

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`

Approved mockup source:

- `src/app/(dashboard)/my/contractor/mockup/page.tsx`
- `src/app/(dashboard)/hr/contractors/mockup/page.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorSelfServiceMockupView.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorAdminWorkbenchMockupView.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorTimeline.tsx`
- `src/views/greenhouse/contractors/mockup/data.ts`
- `src/views/greenhouse/contractors/mockup/types.ts`

Implementation rule:

- Treat the mockups as the approved interaction and information architecture. Runtime implementation should replace typed mock data with canonical readers/actions, extract reusable pieces when justified, and preserve the approved hierarchy, lane language, timeline semantics, empty/warning states, and role separation.
- Do not invent a parallel visual direction, landing page, wizard, payroll-like view, or finance console. If backend reality requires a deviation, document the reason in this task before implementing the deviation.
- Use **Greenhouse Visual Capture** (`pnpm fe:capture`) as visual evidence. Existing scenarios:
  - `contractor-admin-workbench`
  - `offboarding-fullpage-capture` (helper regression only)
  - `sample-sprints-scroll-anchors` (helper regression only)

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

- Impacts `/my` navigation, HR navigation, startup policy if new views are introduced, and payment profile self-service.

### Files owned

- `src/app/(dashboard)/my/contractor/**`
- `src/app/(dashboard)/hr/contractors/**`
- `src/views/greenhouse/my/**`
- `src/views/greenhouse/contractors/**`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`

## Current Repo State

### Already exists

- My Payroll/payment surfaces exist.
- Uploader is reusable after `TASK-791`.
- Payment Profile self-service is registered as `TASK-753` but spec file is absent in the current tree.

### Gap

- No production contractor self-service route.
- No contractor invoice submission UX.
- No contractor-facing payment status timeline.
- No production HR/admin workbench for contractor submissions/review that matches the approved mockup.
- Mockup routes exist and are approved; they must be promoted/wired rather than redesigned.

## Scope

### Slice 1 — Access and navigation

- Add view/route/capability for contractor self-service.
- Add view/route/capability for HR/admin contractor workbench.
- Show only if user has active contractor engagement or relevant feature flag.
- Preserve contractor/admin separation: contractor route under `/my`, HR/admin route under `/hr`.

### Slice 2 — Invoice/evidence submission

- Use `GreenhouseFileUploader` contexts from `TASK-791`.
- Submit invoice metadata and asset refs.
- Preserve approved self-service composition from `/my/contractor/mockup`: engagement summary, work submission lane, upload/evidence panel, payment profile CTA and status timeline.

### Slice 3 — Status timeline

- Show invoice submitted/approved/disputed, payable ready, obligation/order status and paid state.
- Preserve timeline semantics from `ContractorTimeline`: engagement active, support sent, dispute/open review, finance obligation blocked/ready and payment pending/paid.

### Slice 4 — Payment profile integration

- Link or embed the canonical `TASK-753` self-service payment profile flow.

### Slice 5 — HR/admin review workbench

- Promote/wire the approved `/hr/contractors/mockup` information architecture:
  - review queue with contractor, engagement, country, pending count, role/source, SLA and action
  - selected case summary
  - invoice/evidence cards
  - preparation/payable decision panel with contractor-facing observation path
  - Finance handoff cards that clarify obligation creation vs direct payment
  - operational signals without creating a parallel ops console
- Use review capabilities from `TASK-792` for approve/dispute/reject where implemented.
- Keep Finance-only amounts, provider statements and internal fees out of contractor-facing surfaces.

## Payroll Non-Regression Guardrails (hard rules)

796 es UI self-service de contractor; no toca cálculo. Riesgo de presentación: confundir al contractor con semántica de empleado/nómina. Copy validado con `greenhouse-ux-writing`.

- **NUNCA** mostrar copy que implique nómina dependiente, sueldo, finiquito, AFP/salud ni liquidación. El contractor ve invoices/payables/payment state, no recibos de nómina.
- **NUNCA** mezclar la surface `/my/contractor` con `/my/payroll`. Audiencias y regímenes distintos; no reutilizar el componente de recibo de nómina dependiente.
- **NUNCA** filtrar al contractor datos de payroll dependiente ni montos de otros regímenes/colaboradores.
- **SIEMPRE** validar el copy con `greenhouse-ux-writing` (es-CL) para no sugerir relación laboral dependiente.

## Out of Scope

- Rebuilding payment profiles.
- Provider import automation.
- Full Finance payment-order execution UI.
- Provider statement review UI.

## Acceptance Criteria

- [ ] Contractor can submit invoice/boleta with asset upload.
- [ ] Contractor can see approval/payment state without Finance-only data leaks.
- [ ] Contractor cannot see provider statements by default.
- [ ] Payment profile call-to-action reuses `TASK-753` surface.
- [ ] HR/admin can review contractor work submissions from a workbench aligned to `/hr/contractors/mockup`.
- [ ] Runtime UI preserves the approved mockup hierarchy and role separation unless a documented backend constraint forces a task update.
- [ ] UI passes `DESIGN.md` and design lint where applicable.
- [ ] GVC evidence exists for contractor and admin runtime routes, including at least one long/scrolling admin capture.

## Verification

- `pnpm design:lint`
- `pnpm exec tsc --noEmit --pretty false`
- Focused component/API tests.
- Browser smoke for desktop/mobile if UI implemented.
- `pnpm fe:capture --route=/my/contractor --env=local --hold=3000` or scenario equivalent.
- `pnpm fe:capture contractor-admin-workbench --env=local` updated to target the runtime route once `/hr/contractors` ships.
- `pnpm fe:capture:review <contractor/admin capture>` when final visual QA is ready.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Manual de uso updated if visible workflow ships.
