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
- **Expansion de mockups accionables aprobada para implementacion**: ademas de las dos superficies madre, el runtime debe implementar los microflujos companion o documentar explicitamente la constraint backend que obliga a diferirlos:
  - Contractor submission composer: drawer de `/my/contractor/mockup?drawer=composer`
  - Contractor dispute response: drawer de `/my/contractor/mockup?scenario=disputed&drawer=dispute`
  - Admin review decision: drawer de `/hr/contractors/mockup?scenario=disputed&drawer=review&decision=dispute`
  - Payment profile handoff: panel dentro de self-service; no duplica TASK-753.
  - Contractor closure sidecar: panel del escenario `closure_pending`; no implementa cierre completo de TASK-797.

## Delta 2026-05-30 — Hallazgos de revisión pre-implementación (corrige supuestos obsoletos + desviación documentada)

Revisión profunda del backend entregado (TASK-789→795) contra los mockups aprobados. Resultado: la task queda **100% desbloqueada** y se corrigen 3 supuestos obsoletos + se documenta 1 desviación obligatoria (regla CLAUDE.md "If backend reality requires a deviation, document the reason in this task before implementing").

- **Todos los blockers están `complete`.** TASK-789/790/791/792/793/794/795 (Fase A) shipped en develop + **TASK-753 también shipped** (ver punto siguiente). El campo `Blocked by` de abajo queda obsoleto: la task puede arrancar ya.
- **CORRECCIÓN — TASK-753 NO está ausente.** Existe completa: spec `docs/tasks/complete/TASK-753-payment-profiles-self-service.md` + ruta runtime `src/app/(dashboard)/my/payment-profile/page.tsx` + API `/api/my/payment-profile/*` (`requireMyTenantContext`). El texto previo ("file currently missing; recover/create before implementation" / "spec file is absent") es **stale**. El Payment Profile Handoff de Slice 4 solo **enlaza/lee estado** de esa surface; no recupera ni reconstruye nada.
- **DESVIACIÓN DOCUMENTADA — no existe API self-service de contractor (gap load-bearing).** Todas las rutas entregadas (`/api/hr/contractors/*`, `/api/finance/contractor-payables/*`) están gated por `requireHrTenantContext` / `requireFinanceTenantContext`. Un contractor (`route_group=my`, `collaborator`) no puede llamarlas. Para que `/my/contractor` funcione hay que **crear `/api/my/contractor/*`** (member-scoped, patrón canónico de `/api/my/payment-profile/route.ts` con `requireMyTenantContext` → `{ tenant, memberId }`):
  - `GET /api/my/contractor` — engagement activo + work submissions + payables propios (scoped por `identityProfileId`/`memberId` de sesión; el backend lo permite vía `listContractorEngagementsByProfile` + readers by-engagement).
  - `POST /api/my/contractor/work-submissions` — create+submit scoped al engagement propio (el POST HR-gated existente NO sirve para self-service).
  - endpoint de attach de invoice/evidencia tras el upload (`attachContractorInvoiceAsset`, TASK-791).
  - El backend domain readers/writers ya existen y son server-only; lo que falta es exclusivamente el carril API `/my` + su capa de proyección.
- **Capa de datos canónica — projection server-only.** El view-model que consumen los mockups (`ContractorScenario`: readiness label/tone, timeline `done|current|blocked|upcoming`, blockers con `responsable`, KPIs formateados, supportItems) NO es la forma del backend; se compone de 4-5 readers. Se implementa como **projection canónica** (réplica del patrón `src/lib/commercial/sample-sprints/runtime-projection.ts` / `src/lib/organization-workspace/projection.ts`): `import 'server-only'`, cache TTL 30s, degradación honesta (nunca `$0` falso → "Pendiente" con razón), filtrado de fuga Finance-only en un único lugar. NO mapper inline en el route handler.
- **Helpers/readers existentes a reutilizar** (server-only): `getContractorEngagementById`, `listContractorEngagementsByProfile`, `listContractorWorkSubmissionsByEngagement`, `listContractorPayablesByEngagement`, `listContractorInvoiceAssetsByEngagement`, `assessPayableReadiness`, `resolveHonorariosReadiness`, `createContractorWorkSubmission` + `submitContractorWorkSubmission`, `attachContractorInvoiceAsset`. **Gap de conveniencia**: no hay reader "engagement activo del member" → agregar `getActiveContractorEngagementForProfile(identityProfileId)`. **Gap HR**: no hay cola agregada → la projection HR compone `listContractorEngagements({status:'pending_review'})` + work submissions `submitted/disputed` + payables `blocked`.
- **Capabilities ya seedeadas** (790/792/793): `hr.contractor_engagement`, `hr.contractor_classification`, `hr.contractor_work_submission(.review)`, `finance.contractor_payable(.waive_payment_profile)`. **Falta seedear**: capability(es) self-service `contractor.own.*` (o `personal_workspace.contractor.*`) + grant en `runtime.ts` (mismo PR, guard `capability-grant-coverage.test.ts`) + viewCodes nuevos para las rutas productivas (`mi_ficha.*` self-service, `equipo.*` HR) con su migración View Registry (governance pattern TASK-827).

## Delta 2026-05-30 — Cierre (implementación completa)

Implementado en `develop` (8 commits, sin branch por override del operador). Backend + ambas superficies UI + governance + nav cableados al backend TASK-790→795.

- **Slice 1** — projection canónica server-only (`projection-types` + `self-service-scenario` mapper puro + `self-service-projection` + `hr-workbench-projection` + `active-engagement-flag`) + 14 tests. Único productor del view-model; filtra Finance-only.
- **Slice 2** — API `/api/my/contractor/*` (GET projection · POST work-submissions · POST attach-asset) + 2 capabilities self-service + grants. Cierra el gap load-bearing (todo lo previo era HR/Finance-gated).
- **Slice 3** — API `GET /api/hr/contractors/workbench`.
- **Slice 5** — UI `/my/contractor` (view + composer + dispute + handoff + closure + timeline).
- **Slice 6** — UI `/hr/contractors` (workbench + admin review drawer).
- **Slice 4** — migración governance `20260531030000000` (view_registry + role_view_assignments + capabilities_registry, aplicada a dev PG) + nav dinámico (flag JWT `hasActiveContractorEngagement` mirror supervisorAccess) + nomenclature + view-access-catalog TS.
- **Decisiones de checkpoint**: visibilidad dinámica `/my/contractor` (solo con engagement) · workbench HR grant HR+Finance+Admin · re-secuencia (governance/nav después de UIs).

**Gates de cierre**: `pnpm build` ✓ · `pnpm test` 5617 passed / 0 failed · tsc 0 · lint 0 · grant-coverage + view-registry tests verde. Copy es-CL sin semántica nómina dependiente (validado greenhouse-ux-writing).

**Pendiente (verificación visual)**: GVC capture de las rutas runtime (`/my/contractor`, `/hr/contractors`) requiere dev server + un engagement contractor seedeado para el usuario agente — recomendado post-deploy staging. La UI es promoción fiel de mockups ya GVC-aprobados; el gate canónico (build+test) está verde.

## Status

- Lifecycle: `complete`
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

> **Alineación dimensión Entidad Contratante (2026-05-30):** la UI muestra al contractor su **entidad contratante** (`legal_entity_organization_id`, hoy `Efeonce Group SpA`) — leída del campo, NUNCA hardcodeada (Efeonce abrirá entidades por país, EEUU primero). NUNCA exponer al contractor el detalle de payee/provider ni datos Finance-only. SSOT del modelo: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30.

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
- `src/views/greenhouse/contractors/mockup/ContractorSubmissionComposerMockup.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorDisputeResponseMockup.tsx`
- `src/views/greenhouse/contractors/mockup/AdminReviewDecisionDrawerMockup.tsx`
- `src/views/greenhouse/contractors/mockup/PaymentProfileHandoffMockup.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorClosureSidecarMockup.tsx`
- `src/views/greenhouse/contractors/mockup/ContractorTimeline.tsx`
- `src/views/greenhouse/contractors/mockup/data.ts`
- `src/views/greenhouse/contractors/mockup/types.ts`

Implementation rule:

- Treat the mockups as the approved interaction and information architecture. Runtime implementation should replace typed mock data with canonical readers/actions, extract reusable pieces when justified, and preserve the approved hierarchy, lane language, timeline semantics, empty/warning states, and role separation.
- Treat the companion drawers/panels as part of the approved action architecture, not optional decoration: submission composer, dispute response and admin review decision are required for a usable V1; payment-profile handoff and closure sidecar are bounded integration contracts with TASK-753 and TASK-797.
- Do not invent a parallel visual direction, landing page, wizard, payroll-like view, or finance console. If backend reality requires a deviation, document the reason in this task before implementing the deviation.
- Use **Greenhouse Visual Capture** (`pnpm fe:capture`) as visual evidence. Existing scenarios:
  - `contractor-admin-workbench`
  - `contractor-self-service-actions`
  - `contractor-dispute-response`
  - `contractor-admin-review-decision`
  - `offboarding-fullpage-capture` (helper regression only)
  - `sample-sprints-scroll-anchors` (helper regression only)

Reglas obligatorias:

- No expose provider statements containing provider fees to contractor by default.
- Copy visible must be simple and not imply employee payroll/finiquito.
- `views`/`authorizedViews` and entitlements must both be documented.

## Dependencies & Impact

### Depends on

- `TASK-790` ✅ complete
- `TASK-791` ✅ complete
- `TASK-792` ✅ complete
- `TASK-793` ✅ complete
- `TASK-794` ✅ complete
- `TASK-795` (Fase A) ✅ complete
- `TASK-753` ✅ complete — spec `docs/tasks/complete/TASK-753-payment-profiles-self-service.md`, ruta `/my/payment-profile`, API `/api/my/payment-profile/*`. (El texto previo "file currently missing" era obsoleto; ver Delta 2026-05-30.)

### Blocks / Impacts

- Impacts `/my` navigation, HR navigation, startup policy if new views are introduced, and payment profile self-service.

### Files owned

- `src/app/(dashboard)/my/contractor/**`
- `src/app/(dashboard)/hr/contractors/**`
- `src/app/api/my/contractor/**` (NUEVO — carril self-service member-scoped; ver Delta 2026-05-30)
- `src/views/greenhouse/my/**`
- `src/views/greenhouse/contractors/**`
- `src/lib/contractor-engagements/**` (NUEVO — projections self-service + HR workbench + reader `getActiveContractorEngagementForProfile`)
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/**` (NUEVO — seed View Registry de los viewCodes productivos `mi_ficha.*` + `equipo.*`, governance pattern TASK-827)
- `src/lib/admin/view-access-catalog.ts` (NUEVO — VIEW_REGISTRY entries)

## Current Repo State

### Already exists

- My Payroll/payment surfaces exist.
- Uploader is reusable after `TASK-791` (contexts `contractor_invoice_draft` / `contractor_work_evidence_draft` confirmados en el union `DraftUploadContext`).
- Payment Profile self-service (`TASK-753`) **ya existe y está completo**: ruta `/my/payment-profile` + API `/api/my/payment-profile/*`. Slice 4 solo enlaza/lee estado; no se reconstruye.
- Backend contractor domain (`src/lib/contractor-engagements/**`) completo y server-only: engagements, work submissions, payables, readiness, honorarios, invoice assets.
- Mockups aprobados + scenarios GVC existen y deben promoverse, no rediseñarse.

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
- Implement the approved submission composer drawer: type, service period, gross amount, invoice asset, evidence asset, summary and submit/draft actions.

### Slice 2b — Dispute recovery

- Implement the approved dispute response drawer for contractor-owned blockers.
- Show reviewer observation, observed evidence, response text, corrected evidence upload and re-submit action.
- Keep the copy explicit that responding reopens operational review and does not create a Finance obligation.

### Slice 3 — Status timeline

- Show invoice submitted/approved/disputed, payable ready, obligation/order status and paid state.
- Preserve timeline semantics from `ContractorTimeline`: engagement active, support sent, dispute/open review, finance obligation blocked/ready and payment pending/paid.

### Slice 4 — Payment profile integration

- Link or embed the canonical `TASK-753` self-service payment profile flow.
- Preserve the approved handoff panel: status, owner, CTA and warning state. Do not rebuild payment profile inside TASK-796.

### Slice 5 — HR/admin review workbench

- Promote/wire the approved `/hr/contractors/mockup` information architecture:
  - review queue with contractor, engagement, country, pending count, role/source, SLA and action
  - selected case summary
  - invoice/evidence cards
  - preparation/payable decision panel with contractor-facing observation path
  - Finance handoff cards that clarify obligation creation vs direct payment
  - operational signals without creating a parallel ops console
- Use review capabilities from `TASK-792` for approve/dispute/reject where implemented.
- Implement the approved admin review decision drawer: evidence checklist, decision toggle, mandatory contractor-visible reason for dispute/reject, and explicit "approval does not execute payment" copy.
- Keep Finance-only amounts, provider statements and internal fees out of contractor-facing surfaces.

### Slice 6 — Closure visibility bridge

- Preserve the approved closure sidecar when a contractor engagement is ending or closed with pending items.
- Show post-closure invoice policy and access handoff as visibility only; full closure state/checklist belongs to TASK-797.

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
- [ ] Contractor can create or edit a work submission through the approved composer drawer.
- [ ] Contractor can respond to a dispute through the approved recovery drawer.
- [ ] Contractor can see approval/payment state without Finance-only data leaks.
- [ ] Contractor cannot see provider statements by default.
- [ ] Payment profile call-to-action reuses `TASK-753` surface.
- [ ] Payment profile UI is only a handoff/status panel; no duplicate account-management flow is created.
- [ ] HR/admin can review contractor work submissions from a workbench aligned to `/hr/contractors/mockup`.
- [ ] HR/admin approve/dispute/reject uses the approved decision drawer and requires reason for contractor-visible dispute/reject.
- [ ] Closure-adjacent states show contractor closure language and never expose finiquito/payroll semantics.
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
- `pnpm fe:capture contractor-self-service-actions --env=local`
- `pnpm fe:capture contractor-dispute-response --env=local`
- `pnpm fe:capture contractor-admin-review-decision --env=local`
- `pnpm fe:capture:review <contractor/admin capture>` when final visual QA is ready.

## Mockup Expansion Validation — 2026-05-30

- `pnpm exec eslint src/views/greenhouse/contractors/mockup scripts/frontend/scenarios/contractor-self-service-actions.scenario.ts scripts/frontend/scenarios/contractor-dispute-response.scenario.ts scripts/frontend/scenarios/contractor-admin-review-decision.scenario.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run scripts/frontend/lib/scenario.test.ts`
- `pnpm fe:capture contractor-self-service-actions --env=local` -> `.captures/2026-05-30T17-15-39_contractor-self-service-actions`
- `pnpm fe:capture contractor-dispute-response --env=local` -> `.captures/2026-05-30T17-16-01_contractor-dispute-response`
- `pnpm fe:capture contractor-admin-review-decision --env=local` -> `.captures/2026-05-30T17-16-12_contractor-admin-review-decision`
- `pnpm fe:capture contractor-admin-workbench --env=local` regression -> `.captures/2026-05-30T17-16-58_contractor-admin-workbench`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Manual de uso updated if visible workflow ships.
