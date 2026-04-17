# TASK-144 — Agency Team Dedicated API

## Delta 2026-04-17 — spec corregida contra runtime real

- La duplicación principal ya no está entre `AgencyTeamView` y `getAgencyCapacity()` como consumers equivalentes:
  - los consumers visibles reales (`/agency/team`, `/agency?tab=capacidad`, `AssignMemberDrawer`) ya consumen `GET /api/team/capacity-breakdown`
  - el carril legacy aislado es `GET /api/agency/capacity` + `getAgencyCapacity()` en `agency-queries.ts`
- La implementación correcta para esta lane pasa a ser:
  - extraer un store canónico reusable desde el runtime hoy embebido en `src/app/api/team/capacity-breakdown/route.ts`
  - crear `GET /api/agency/team` sobre ese store
  - repuntar los consumers Agency actuales al contrato nuevo
  - dejar `GET /api/team/capacity-breakdown` como wrapper/deprecated solo si sigue siendo útil para compatibilidad
- `member_capacity_economics` es la source canónica para la capa capacity/economics por miembro. No se debe crear una query nueva `BigQuery-first` como base del store.
- `/agency/capacity` hoy no es una page autónoma a refactorizar:
  - `src/app/(dashboard)/agency/capacity/page.tsx` solo redirige a `/agency?tab=capacidad`
  - la UI real del tab vive en `src/views/agency/AgencyWorkspace.tsx`
- `client_team_assignments` no tiene `space_id` nativo:
  - el contrato nuevo debe seguir siendo Agency-global
  - si hace falta derivar `space`, debe tratarse como enrichment derivado y no como FK base del módulo
- El drift actual de `client_team_assignments` entre snapshot/tipos y runtime (`relevance_note_override`, `contact_channel_override`, `contact_handle_override`) no bloquea esta lane, pero no debe ignorarse al diseñar el store.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | P1 |
| Impact | Medio |
| Effort | Bajo |
| Status real | `Implementado localmente`, `validado` |
| Rank | — |
| Domain | Agency / Team |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Create dedicated `/api/agency/team` endpoint that consolidates Agency team + capacity data over the existing Postgres/serving runtime. Eliminate duplicate Agency consumers around `GET /api/team/capacity-breakdown` and retire the legacy BigQuery-only `getAgencyCapacity()` path behind a canonical `TeamCapacityStore`.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.3 Team Capacity Engine, §7.1 Canonical Store Contracts, `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

## Dependencies & Impact

- **Depende de:** `src/app/api/team/capacity-breakdown/route.ts`, `src/lib/member-capacity-economics/store.ts`, `src/lib/team-capacity/shared.ts`, `src/lib/team-capacity/internal-assignments.ts`, `src/app/api/agency/capacity/route.ts` (legacy path a cortar o envolver)
- **Impacta a:** TASK-149 (Capacity Engine extends TeamCapacityStore), TASK-153 (Capacity Forecast uses store), TASK-157 (Skills Matrix builds on team data), TASK-160 (Enterprise Hardening)
- **Archivos owned:** `src/app/api/agency/team/route.ts`, `src/lib/agency/team-capacity-store.ts`

## Scope

### Slice 1 — TeamCapacityStore + API (~4h)

Create `src/lib/agency/team-capacity-store.ts` encapsulating `getTeamWithCapacity()`, `getUtilizationByRole()`, `getMemberAssignments()`. Base contract should be extracted from the current `capacity-breakdown` runtime: Postgres roster + assignments + staff-aug placement metadata + `member_capacity_economics` overlay. New `GET /api/agency/team` endpoint exposing the store.

### Slice 2 — View refactor (~3h)

Refactor Team page (`/agency/team`) and the Agency capacity tab (`/agency?tab=capacidad`) to consume the new API instead of hitting the current shared route directly. Remove or deprecate redundant query paths from `agency-queries.ts` / `/api/agency/capacity` if fully replaced.

## Acceptance Criteria

- [x] `GET /api/agency/team` returns team members with capacity data
- [x] `TeamCapacityStore` is the single source for team + capacity queries
- [x] Team view and Capacity view both consume the new API
- [x] No duplicate Agency query paths for the same team/capacity data
- [x] Response includes: member identity, role, FTE total, FTE allocated, utilization %, assignments by client plus any derived/enriched space context when defensible
- [x] Existing functionality preserved (no regression)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/team-capacity-store.ts` | New — canonical store |
| `src/app/api/agency/team/route.ts` | New — dedicated team API |
| `src/app/(dashboard)/agency/team/page.tsx` | Refactor to use new API |
| `src/views/agency/AgencyWorkspace.tsx` | Refactor tab capacidad to use new API |
| `src/views/agency/AgencyTeamView.tsx` | Refactor to use new API |
| `src/views/agency/drawers/AssignMemberDrawer.tsx` | Refactor to use new API if it still depends on the same contract |
| `src/app/api/agency/capacity/route.ts` | Deprecate or wrap legacy capacity path |
| `src/lib/agency/agency-queries.ts` | Deprecate BigQuery-only capacity function if fully replaced |
