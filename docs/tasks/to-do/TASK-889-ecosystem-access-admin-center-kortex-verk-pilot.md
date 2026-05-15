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

- View `administracion.ecosystem_access` o nombre definido por Discovery.
- Capability `ecosystem.access.governance.manage`.
- Route `/admin/ecosystem-access`.

### Slice 2 — Platform & Capability Browser

- Lista de plataformas, status, mode y capabilities.
- Link a bindings existentes.

### Slice 3 — Assignment Flow

- Drawer para asignar colaborador/persona a plataforma.
- Seleccion de cliente/organization/space cuando aplique.
- Confirmacion con impacto y audit reason.

### Slice 4 — Drift Queue

- Queue + inspector para `unauthorized_local_access`, `pending_provisioning`, `identity_unresolved`, etc.
- Acciones aprobar/rechazar/revocar cuando APIs existan.

### Slice 5 — Kortex Pilot

- Configurar Kortex sandbox/consumer con mode `hybrid_approval` o `platform_managed_observed`.
- Probar assignment Greenhouse -> command -> observed/applied.

### Slice 6 — Verk/Public Website Readiness

- Registrar Verk/public website como plataformas listas para governance aunque no apliquen provisioning real aun.
- Manual operativo.

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
