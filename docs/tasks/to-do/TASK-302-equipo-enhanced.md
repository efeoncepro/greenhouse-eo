# TASK-302 — Equipo Enhanced: Workload Indicators

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo-Medio`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `18`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-302-equipo-enhanced`

## Summary

Agregar indicadores de carga (light/balanced/heavy) y historial de cambios de composicion al equipo asignado. Un Marketing Manager necesita saber si su equipo esta sobrecargado antes de pedir mas trabajo en Q4.

## Why This Task Exists

La vista de Equipo muestra un roster estatico con FTE y roles. No indica si el equipo esta sobrecargado, disponible o balanceado. Tampoco muestra cuando cambio la composicion (entrada/salida de miembros).

## Goal

- Indicador de carga por miembro: light / balanced / heavy
- Historial de cambios de composicion (ultimos 6 meses)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M7

## Dependencies & Impact

### Depends on

- `/api/team/capacity` — API existente
- Datos de capacity y FTE

### Files owned

- `src/app/(dashboard)/equipo/page.tsx` (modificar)

## Scope

### Slice 1 — Workload indicators

- Calcular carga: FTE asignado vs capacity disponible
- Badges: light (<60%), balanced (60-85%), heavy (>85%)
- Agregar badge por miembro en la card

### Slice 2 — Composition history

- Query: cambios de equipo (nuevos miembros, salidas) ultimos 6 meses
- Timeline simple o lista cronologica

## Out of Scope

- Solicitar cambios de equipo desde el portal
- Capacity planning detallado

## Acceptance Criteria

- [ ] Cada miembro tiene badge de carga (light/balanced/heavy)
- [ ] Historial de cambios visible
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
