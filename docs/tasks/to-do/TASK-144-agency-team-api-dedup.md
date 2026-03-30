# TASK-144 — Agency Team Dedicated API

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Medio |
| Effort | Bajo |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Team |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Create dedicated `/api/agency/team` endpoint that consolidates capacity data. Eliminate duplicate BigQuery queries between the Capacity tab and Team view. Encapsulate in a `TeamCapacityStore` that serves as the single source for team + capacity data across Agency views.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.3 Team Capacity Engine, §7.1 Canonical Store Contracts

## Dependencies & Impact

- **Depende de:** `src/lib/agency/agency-queries.ts` `getAgencyCapacity()` (exists), `src/app/api/agency/capacity/route.ts` (exists)
- **Impacta a:** TASK-149 (Capacity Engine extends TeamCapacityStore), TASK-153 (Capacity Forecast uses store), TASK-157 (Skills Matrix builds on team data), TASK-160 (Enterprise Hardening)
- **Archivos owned:** `src/app/api/agency/team/route.ts`, `src/lib/agency/team-capacity-store.ts`

## Scope

### Slice 1 — TeamCapacityStore + API (~4h)

Create `src/lib/agency/team-capacity-store.ts` encapsulating `getTeamWithCapacity()`, `getUtilizationByRole()`, `getMemberAssignments()`. Single BigQuery query with capacity data joined. New `GET /api/agency/team` endpoint exposing the store.

### Slice 2 — View refactor (~3h)

Refactor Team page (`/agency/team`) and Capacity page (`/agency/capacity`) to consume the new API instead of making direct duplicate queries. Remove redundant query paths from `agency-queries.ts` if fully replaced.

## Acceptance Criteria

- [ ] `GET /api/agency/team` returns team members with capacity data
- [ ] `TeamCapacityStore` is the single source for team + capacity queries
- [ ] Team view and Capacity view both consume the new API
- [ ] No duplicate BigQuery queries for the same capacity data
- [ ] Response includes: member identity, role, FTE total, FTE allocated, utilization %, assignments by space
- [ ] Existing functionality preserved (no regression)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/team-capacity-store.ts` | New — canonical store |
| `src/app/api/agency/team/route.ts` | New — dedicated team API |
| `src/app/(dashboard)/agency/team/page.tsx` | Refactor to use new API |
| `src/app/(dashboard)/agency/capacity/page.tsx` | Refactor to use new API |
| `src/lib/agency/agency-queries.ts` | Deprecate duplicated capacity functions |
