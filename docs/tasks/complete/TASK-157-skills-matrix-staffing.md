# TASK-157 — Skills Matrix + Intelligent Staffing Engine

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | P2 |
| Impact | Alto |
| Effort | Alto |
| Status real | `Implementado` |
| Rank | — |
| Domain | Agency / Team |
| Sequence | Agency Layer V2 — Phase 6 |

## Summary

Implement `skill_catalog`, `member_skills`, and `service_skill_requirements` as canonical PostgreSQL tables in `greenhouse_core`. Build a staffing engine that matches member skills to service requirements with seniority scoring plus current availability. Detect skill gaps per space/service. Show the result in Space 360 Team tab with fit recommendations for assignment decisions.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.3 Team Member, §4.3 Team Capacity Engine

Notas de alineación obligatoria:

- El contrato canónico de arquitectura usa `skill_code` y `seniority_level` textual (`junior`, `mid`, `senior`, `lead`), no `skill_id` + escala numérica 1-5.
- `TASK-144` y `TASK-149` siguen `to-do`; para esta task se deben reutilizar los equivalentes runtime ya existentes (`/api/team/capacity-breakdown`, `src/lib/team-queries.ts`, `src/lib/agency/space-360.ts`) en vez de asumir que esos follow-ons ya cerraron.
- `member_profiles.skills` en HR Core y `staff_aug_placements.required_skills` / `matched_skills` pueden servir como seed o fallback visual, pero no deben tratarse como source of truth de la matriz canónica.

## Dependencies & Impact

- **Depende de:** runtime real de Team/Capacity ya existente en `src/lib/team-queries.ts`, `src/app/api/team/capacity-breakdown/route.ts`, `src/lib/agency/space-360.ts`; `greenhouse_core.services`; `greenhouse_core.client_team_assignments`; `member_capacity_economics`
- **Impacta a:** TASK-153 (Capacity Forecast — skill-aware gap detection), TASK-159 (Nexa `execute_reassignment` tool uses staffing)
- **Archivos owned:** `src/lib/agency/skills-staffing.ts`, `src/app/api/agency/skills/route.ts`, `src/app/api/agency/skills/members/[memberId]/route.ts`, `src/app/api/agency/staffing/route.ts`, `src/lib/agency/space-360.ts`

## Scope

### Slice 1 — Data model + catalog (~4h)

`skill_catalog` table: `skill_code`, `skill_name`, `skill_category` (design, development, account, strategy, media, operations), `description`, `seniority_levels`. `member_skills` table: `member_id`, `skill_code`, `seniority_level`, `verified_by`, `verified_at`. `service_skill_requirements` table: `service_id`, `skill_code`, `required_seniority`, `required_fte`. Migration + seed with initial skill catalog.

Reglas:

- `member_id` debe referenciar miembros reales de `greenhouse_core.members`
- `service_id` debe referenciar `greenhouse_core.services`
- no reutilizar `staff_aug_placements.required_skills` como storage canónico; solo como bridge de compatibilidad si hace falta

### Slice 2 — Member skill assignment UI (~4h)

Admin UI for managing member skills: skill selector, seniority selector, bulk assignment. Skill profile view per member. API: `GET/POST/PUT /api/agency/skills/members/[memberId]`.

### Slice 3 — Staffing engine (~6h)

`StaffingEngine`: given a service's skill requirements, find best-fit available members. Score = seniority match (`exact` / `over_qualified` / `under_qualified`) + availability (`required_fte` vs remaining capacity). Rank candidates. Detect gaps: required skills with no available member. Output: `StaffingRecommendation[]` with candidates and gap report.

### Slice 4 — UI in Space 360 Team tab (~5h)

Team tab: skill tags per assigned member. Fit score per member for the space's services. Gap alert when services need skills not covered by assigned team. Staffing recommendation drawer: "Suggested assignments for [service]" with ranked candidates.

## Acceptance Criteria

- [x] Skill catalog with categories populated
- [x] Member skills assignable with canonical seniority levels (`junior`, `mid`, `senior`, `lead`)
- [x] Service skill requirements definable per service
- [x] Staffing engine scores and ranks candidates by seniority fit + availability
- [x] Skill gaps detected when service requires uncovered skills
- [x] Space 360 Team tab shows skill tags and fit indicators
- [x] Staffing recommendation available when assigning team to service
- [x] Handles services without skill requirements (standard assignment flow)
- [x] Reuses the existing Team/Capacity runtime instead of requiring `TASK-144` / `TASK-149` to be closed first

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/skills-staffing.ts` | New — staffing engine + skill matching |
| `src/app/api/agency/skills/route.ts` | New — skill catalog CRUD |
| `src/app/api/agency/staffing/route.ts` | New — staffing recommendations API |
| `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` | Add skill tags + fit indicators |
