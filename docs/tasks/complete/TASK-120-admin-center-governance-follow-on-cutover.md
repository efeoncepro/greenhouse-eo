# TASK-120 - Admin Center Governance Follow-on Cutover

## Delta 2026-03-29

- `TASK-120` queda absorbida y cerrada por la unificación efectiva de `Admin Center + Control Tower`.
- `/internal/dashboard` ya redirige a `/admin` y el shell operativo principal quedó consolidado en `Admin Center`.
- El follow-on original pierde sentido como task separada porque el cutover y la verificación manual ya quedaron resueltos por el trabajo de consolidación posterior a `TASK-108` y `TASK-119`.

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Status real: `Absorbida`
- Rank: `TBD`
- Domain: `platform`

## Summary

Cerrar los follow-ons de `Admin Center` que quedaron fuera de la baseline del shell: role scoping fino, criterios de deep-link entre surfaces especialistas y bundle de verificación manual de las vistas de governance.

## Why This Task Exists

`TASK-108` ya dejó resuelto el shell principal de `Admin Center`, pero quedaron detalles operativos que no justifican mantener abierta la baseline:

- matrix fina de visibilidad por rol para `Cloud & Integrations` y `Ops Health`
- criterio de convivencia con surfaces especialistas como `Agency > Operations`
- validación manual consolidada de rutas y deep links de governance

Estos puntos son follow-ons de cutover, no bloqueadores del shell.

## Goal

- Definir visibilidad por rol de las nuevas surfaces admin
- Clarificar cuándo se navega dentro de `Admin Center` y cuándo se hace deep-link a una vista especialista
- Cerrar un paquete de verificación manual para las rutas admin principales

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- `Admin Center` sigue siendo control plane de governance, no dashboard operativo genérico
- la mutación canónica debe seguir viviendo en helpers y módulos especialistas
- el scoping por rol debe ser explícito y verificable

## Dependencies & Impact

### Depends on

- `TASK-108` - Admin Center Governance Shell
- `TASK-111` - Admin Center Secret Ref Governance UI
- `TASK-112` - Admin Center Integration Health and Freshness UI
- `TASK-113` - Admin Center Ops Audit Trail UI

### Impacts to

- `/admin`
- `/admin/cloud-integrations`
- `/admin/ops-health`
- `Agency > Operations`
- taxonomía admin y permisos visibles

### Files owned

- `src/app/(dashboard)/admin/**`
- `src/views/greenhouse/admin/**`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

## Current Repo State

### Ya existe

- landing de `Admin Center`
- surfaces propias para `Cloud & Integrations` y `Ops Health`
- taxonomía base de governance documentada

### Gap actual

- falta role scoping explícito para las nuevas surfaces
- falta bundle de verificación manual consolidado
- el criterio de deep-link/cutover con surfaces especialistas sigue implícito

## Scope

### Slice 1 - Role scoping

- documentar y aplicar visibilidad objetivo por rol para surfaces admin nuevas

### Slice 2 - Specialist cutover

- dejar explícito cuándo `Admin Center` indexa versus cuándo deriva a una view especialista

### Slice 3 - Verification bundle

- checklist manual para rutas admin, deep links y navegación lateral

## Out of Scope

- rediseño del shell de `Admin Center`
- nuevas vistas grandes de cloud, economics o capacity
- reescritura de `Agency > Operations`

## Acceptance Criteria

- [x] La convivencia entre `Admin Center` y el shell heredado quedó resuelta por absorción del surface previo
- [x] El cutover principal quedó materializado sobre `/admin`
- [x] La verificación manual consolidada deja de requerir un paquete separado para cerrar el follow-on

## Verification

- `pnpm exec eslint src/components/layout/vertical/VerticalMenu.tsx src/views/greenhouse/admin/AdminCenterView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Verificación manual de `/admin`, `/admin/cloud-integrations`, `/admin/ops-health`
