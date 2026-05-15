# TASK-889 — Ecosystem Access Admin Center + Kortex/Verk Pilot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|identity|platform`
- Blocked by: `TASK-888`
- Branch: `task/TASK-889-ecosystem-access-admin-center-kortex-verk-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la surface operativa en Greenhouse para administrar accesos del ecosistema: asignar usuarios a Kortex/Verk/sitio publico, ver provisioning local observado, aprobar/rechazar drift y ejecutar un piloto controlado con Kortex y Verk.

## Why This Task Exists

La arquitectura solo aporta valor si el operador puede usarla desde Greenhouse. Esta task cierra el loop humano: Greenhouse debe permitir seleccionar colaborador, plataforma, cliente/space, capability, aprobar y ver si la plataforma aplico o reporto drift.

## Goal

- Crear Admin Center `Ecosistema Efeonce`.
- UI para plataformas, capabilities, assignments y drift.
- Acciones: asignar, revocar, suspender, aprobar acceso local, rechazar/revocar drift.
- Piloto Kortex con un scope real/sandbox.
- Preparar Verk como platform registered sin depender de runtime productivo si aun no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`

Reglas obligatorias:

- UI visible debe usar `views` + `entitlements`; no solo routeGroup admin.
- Copy reusable en `src/lib/copy/`, no literals repetidos en JSX.
- No construir landing page; construir herramienta operativa.
- Usar primitives Vuexy/MUI y componentes Greenhouse existentes.
- `pnpm design:lint` requerido.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/README.md`
- `docs/documentation/README.md`

## Dependencies & Impact

### Depends on

- `TASK-884`
- `TASK-885`
- `TASK-886`
- `TASK-887`
- `TASK-888`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `src/app/(dashboard)/admin/integrations/page.tsx`
- `src/components/greenhouse/**`

### Blocks / Impacts

- Operacion real Kortex.
- Verk development kickoff.
- Sitio publico CMS access governance.

### Files owned

- `src/app/(dashboard)/admin/ecosystem-access/page.tsx`
- `src/views/greenhouse/admin/ecosystem-access/**`
- `src/lib/copy/ecosystem-access.ts`
- `src/config/greenhouse-nomenclature.ts` (solo si hay nomenclatura estable)
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/*_ecosystem_access_admin_surface.sql`
- `docs/documentation/identity/ecosystem-access-governance.md`
- `docs/manual-de-uso/plataforma/gobernar-accesos-ecosistema.md`

## Current Repo State

### Already exists

- Admin integrations page con sister-platform bindings.
- Admin Center entitlements governance.
- UI patterns para queues/drawers en Workforce Activation.
- API foundations planeadas en tasks previas.

### Gap

- No existe surface humana para asignar usuarios a plataformas hermanas.
- No existe cola de drift cross-platform.
- Kortex/Verk no tienen piloto de acceso gobernado desde Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Access Model + Route

- View `administracion.ecosystem_access` (alineado a spec V1 §7.1).
- Page guard capability `ecosystem.access.governance.read` (view-level read; alineado spec V1 §3.5).
- Las acciones especificas dentro de la pagina (asignar/revocar/suspender/aprobar/resolver drift) usan capabilities granulares ya seedeadas en TASK-886 + TASK-887 (NO `governance.manage` coarse del draft):
  - `ecosystem.access.assignment.read | grant | revoke | suspend | approve`
  - `ecosystem.access.drift.read | resolve`
  - `ecosystem.access.platform.read | manage`
- Route `/admin/ecosystem-access`.

### Slice 2 — Platform & Capability Browser

- Lista de plataformas, status, **provisioning_mode declarado por binding**, capabilities catalog.
- Link a bindings existentes; UI muestra mode por binding (no por platform global — un binding puede ser `hybrid_approval` para scope `client` mientras otro del mismo platform es `greenhouse_managed` para scope `internal`).

### Slice 3 — Assignment Flow

- Drawer para asignar colaborador/persona a plataforma.
- Seleccion de cliente/organization/space cuando aplique — resuelve binding canonico (TASK-376) automaticamente.
- Confirmacion con impacto + audit reason (>=10 chars per CHECK constraint TASK-886).
- UI affordances per platform mode del binding seleccionado (alineado spec V1 §7.1):
  - `greenhouse_managed`: todas las acciones habilitadas.
  - `hybrid_approval`: grant habilitado, queue approval si capability `requires_approval=true`.
  - `platform_managed_observed`: solo desired state, sin push (UI muestra warning).
  - `read_only_observed`: CTAs disabled con tooltip "Plataforma no acepta provisioning".

### Slice 4 — Drift Queue

- Queue + inspector para los **7 drift types canonicos** (alineado spec V1 §4.4): `pending_provisioning`, `pending_deprovisioning`, `unauthorized_local_access`, `missing_identity_link`, `scope_mismatch`, `capability_mismatch`, `platform_apply_failed`.
- Severity per drift resuelto via `resolveDriftSeverity(driftType, platformMode)` — NUNCA hardcodear severity inline en componentes.
- Acciones: `Aprobar acceso local` (materializa assignment retroactivo), `Rechazar acceso local` (queue revoke command), `Forzar reconciliacion` (refresh drift detector), `Reintentar dispatch` (re-enqueue failed command).

### Slice 5 — Kortex Pilot

- Configurar **un binding sandbox Kortex** con `provisioning_mode='hybrid_approval'` para scope `internal` (mode es per binding, NO per platform).
- Habilitar flag `provisioning_dispatch_enabled=true` solo para este binding sandbox.
- Probar end-to-end: assignment Greenhouse → command queued → dispatched → applied → observed snapshot confirma → drift queue clean.
- Verificar 10 smoke tests canonicos del spec V1 §15.

### Slice 6 — Verk/Public Website Readiness

- Registrar Verk como platform con `default_provisioning_mode='read_only_observed'` (no provisioning real aun).
- Registrar `public_website` con `default_provisioning_mode='platform_managed_observed'` (gestiona via admin propio, Greenhouse observa).
- Manual operativo: `docs/manual-de-uso/plataforma/gobernar-accesos-ecosistema.md`.

## Out of Scope

- Construir la UI de Kortex o Verk.
- Cambiar auth runtime de plataformas hermanas.
- Crear app mobile/first-party sessions.
- Reemplazar Admin Center de entitlements interno.

## Detailed Spec

La UI debe privilegiar un patron operacional denso:

- Summary strip: plataformas activas, assignments activos, drift abierto, commands fallidos.
- Tabla principal: plataformas o assignments segun tab.
- Inspector lateral: detalle de subject/plataforma/scope/capabilities.
- Acciones claras: `Asignar`, `Suspender`, `Revocar`, `Aprobar acceso local`, `Rechazar acceso local`, `Forzar reconciliacion`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Slice 5 solo despues de staging verde con Kortex sandbox.
- Slice 6 puede correr despues de Slice 2 si no tiene provisioning real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Operador revoca acceso productivo por error | UI/security | medium | confirmation + reason + maker-checker para sensitive | audit log |
| UI muestra applied cuando solo esta desired | UI | high | estados separados desired/observed/applied | visual regression/manual QA |
| Kortex pilot afecta cliente real | integrations | medium | sandbox binding + dispatch flag off por default | provisioning apply lag/drift |

### Feature flags / cutover

- Usar platform mode/dispatch flag de `TASK-888`.
- Kortex pilot debe arrancar con sandbox binding y no production global.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Retirar view/capability o route | <30 min | si |
| Slice 2 | Revert browser UI | <30 min | si |
| Slice 3 | Disable assignment action server-side | <10 min | si |
| Slice 4 | Hide drift actions, keep read-only | <10 min | si |
| Slice 5 | Disable Kortex dispatch flag + suspend consumer | <10 min | si |
| Slice 6 | Mark platform draft/suspended | <10 min | si |

### Production verification sequence

- `pnpm design:lint`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- Focused Vitest/component tests.
- `pnpm fe:capture --route=/admin/ecosystem-access --env=staging`.
- Manual sandbox pilot with Kortex.

## Acceptance Criteria

- Operador puede crear assignment desde Greenhouse.
- UI separa desired, observed y applied states.
- UI muestra provisioning local no aprobado como drift, no como permiso valido.
- Kortex pilot demuestra al menos un assignment y una reconciliacion.
- Verk/public website quedan registrados con estado y readiness visible.
- Manual y doc funcional actualizados.

## Verification

- `pnpm design:lint`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm vitest run src/views/greenhouse/admin/ecosystem-access`
- `pnpm fe:capture --route=/admin/ecosystem-access --env=staging`
