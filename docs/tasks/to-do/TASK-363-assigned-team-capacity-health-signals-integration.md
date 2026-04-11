# TASK-363 — Assigned Team Capacity Coverage & Health Signals Integration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-358`
- Branch: `task/TASK-363-assigned-team-capacity-health-signals-integration`
- Legacy ID: `follow-on de TEAM_CAPACITY + Space 360`
- GitHub Issue: `none`

## Summary

Traducir la capacidad y el health operativo existente a un carril enterprise cliente-safe para `Assigned Team`: FTE contratado, saturation, backup coverage, capability coverage y health resumida por talento y por portafolio.

## Why This Task Exists

Greenhouse ya calcula capacidad y loaded cost, pero esos datos nacieron para Agency/ops. `Assigned Team` necesita consumirlos con semántica cliente-facing: claridad, thresholds estables, lenguaje premium y sin filtrar ruido interno. Si esto no se resuelve como bridge canónico, el módulo terminará reescribiendo fórmulas o mostrando señales inconsistentes entre surfaces.

## Goal

- Crear un bridge canónico desde `Team Capacity` hacia `Assigned Team`
- Unificar thresholds, badges y cobertura por miembro/equipo
- Publicar health signals resumidas listas para UI y alerts

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `Assigned Team` consume semántica shared de capacidad; no recalcula fórmulas localmente
- cost/load interno solo se expone si la policy cliente lo permite
- los indicadores deben poder leerse a nivel portfolio, segment y member

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md`

## Dependencies & Impact

### Depends on

- `src/lib/team-capacity/shared.ts`
- `src/lib/team-capacity/internal-assignments.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/app/api/team/capacity/route.ts`
- `src/app/api/team/capacity-breakdown/route.ts`
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx`
- `TASK-358`

### Blocks / Impacts

- `TASK-361`
- `TASK-364`
- `TASK-365`

### Files owned

- `src/lib/assigned-team/capacity-signals.ts`
- `src/lib/assigned-team/health-signals.ts`
- `src/app/api/team/assigned/health/route.ts`
- `docs/tasks/to-do/TASK-363-assigned-team-capacity-health-signals-integration.md`

## Current Repo State

### Already exists

- team capacity APIs y readers con usage/FTE
- `Space 360 > Team` ya resume overcommitment, skill coverage y allocated FTE

### Gap

- no existe traducción cliente-safe enterprise de esos indicadores
- no existe health summary reusable por cards y alerts
- no existe contrato de thresholds y severities compartido con `Assigned Team`

## Scope

### Slice 1 — Capacity translation

- mapear FTE contratado, FTE activo, saturation, slack y backup semantics
- publicar shapes resumidos y detallados

### Slice 2 — Health scoring

- definir thresholds y labels enterprise para healthy/watch/at-risk
- soportar resumen a nivel member, segment y portfolio

### Slice 3 — Tests & integration

- cubrir edge cases de 0 FTE, overallocated, no backup, data stale
- integrar con semantic layer y consumers básicos

## Out of Scope

- performance scoring profundo o scorecards ejecutivos completos
- notificaciones o alerting automático

## Acceptance Criteria

- [ ] `Assigned Team` consume capacidad y health desde un bridge canónico
- [ ] Los thresholds y severities quedan centralizados y testeados
- [ ] La semántica cliente-safe coincide con la arquitectura y no filtra ruido interno

## Verification

- `pnpm test -- assigned-team capacity`
- `pnpm lint`
- `pnpm tsc --noEmit`

## Closing Protocol

- [ ] documentar en `Handoff.md` cualquier threshold que impacte otras surfaces cliente-facing

## Follow-ups

- `TASK-361`
- `TASK-364`
- `TASK-365`
