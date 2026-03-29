# TASK-119 - Home Landing Rollout and Navigation Cutover

## Delta 2026-03-29 — Task closed after runtime cutover

- `TASK-119` queda cerrada.
- La policy aplicada en runtime queda así:
  - usuarios internos/admin sin override explícito aterrizan por defecto en `/home`
  - roles especialistas mantienen su landing funcional (`/hr/payroll`, `/finance`, `/my`) antes del fallback general
- `portalHomePath` fallback dejó de resolver a `/internal/dashboard` para internos y ahora cae en `/home`.
- La navegación principal ya deja de presentar `Control Tower` como home ambiguo:
  - el item principal interno pasa a `Home`
  - el runtime ya no usa `Control Tower` como landing institucional
  - el `UserDropdown` y las sugerencias globales distinguen `Home` del surface admin
- La verificación manual ya quedó confirmada para `login -> /auth/landing -> /home`.
- `Control Tower` dejó de ser surface separada de navegación y quedó absorbida por `Admin Center`, por lo que el cutover documental se cierra sobre `/admin`.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `home`

## Summary

Cerrar el rollout operativo de `/home` como landing real del portal donde aplique, alineando `portalHomePath`, sidebar y el cutover definitivo fuera del viejo `internal dashboard` sin reabrir la baseline principal de `TASK-009`.

## Why This Task Exists

`TASK-009` dejó materializado el runtime de `Home + Nexa`, pero el corte final de navegación quedó pendiente.

Hoy siguen existiendo señales mezcladas:

- `/home` ya existe como superficie real
- el menú sigue tomando `portalHomePath` como entrada principal
- usuarios internos siguen resolviendo fallback a `/internal/dashboard`
- la salida definitiva del viejo `internal dashboard` no estaba cerrada como cutover operativo

Eso ya no bloquea la baseline de Home, pero sí bloquea que el rollout quede consistente.

## Goal

- Definir y aplicar la policy final de landing para los cohorts que deben usar `/home`
- Alinear sidebar, redirects y `portalHomePath` con esa policy
- Reubicar el patrón heredado de `Control Tower` sin ambigüedad de navegación
- Validar manualmente el cutover en staging antes de promoverlo como default

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- `/home` no debe romper los boundaries reales por route group
- `portalHomePath` sigue siendo el contrato canónico de aterrizaje
- el landing institucional no debe depender de `Control Tower` ni del `internal dashboard` legado

## Dependencies & Impact

### Depends on

- `TASK-009` - Greenhouse Home Nexa v2
- `TASK-108` - Admin Center Governance Shell
- `TASK-120` - Admin Center Governance Follow-on Cutover

### Impacts to

- landing por defecto del portal
- navegación principal del sidebar
- `/internal/dashboard`
- `portalHomePath` y auth landing

### Files owned

- `src/lib/tenant/access.ts`
- `src/app/(dashboard)/home/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/app/auth/landing/page.tsx`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- `/home` ya renderiza `HomeView`
- `Home + Nexa` ya es superficie real del portal
- `Admin Center` ya existe como shell de gobernanza

### Gap actual

- cerrados en esta task

## Scope

### Slice 1 - Landing policy

- definir cohorts exactos que aterrizan en `/home`
- alinear `portalHomePath` fallback con esa decisión

### Slice 2 - Navigation cutover

- ajustar sidebar y accesos visibles para reflejar Home como entrada principal donde aplique
- reubicar `Control Tower` dentro de `Administración` o surface especialista equivalente

### Slice 3 - Validation

- smoke manual en staging
- confirmar que login y auth landing respetan el nuevo path

## Out of Scope

- rediseño mayor de Nexa
- nuevas capacidades backend del snapshot
- floating modal o feedback persistence

## Acceptance Criteria

- [x] Existe una policy explícita de landing por cohort para `/home`
- [x] `portalHomePath` queda alineado con esa policy
- [x] El sidebar deja de mezclar Home y `Control Tower` como entradas principales conflictivas
- [x] `Control Tower` deja de operar como home ambiguo y el cutover institucional queda absorbido por `Admin Center`
- [x] Staging queda validado manualmente para login, landing y navegación base

## Verification

- `pnpm exec eslint src/lib/tenant/access.ts src/components/layout/vertical/VerticalMenu.tsx src/app/auth/landing/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Verificación manual en staging de `/home`, `/internal/dashboard` y auth landing
