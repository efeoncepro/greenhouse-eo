# TASK-157 — Skills Matrix + Intelligent Staffing Engine

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P2 |
| Impact | Alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Team |
| Sequence | Agency Layer V2 — Phase 6 |

## Summary

Implement `skill_catalog`, `member_skills`, and `service_skill_requirements` tables. Build a staffing engine that matches member skills to service requirements with seniority scoring. Detect skill gaps per space/service. Show in Space 360 Team tab with fit recommendations for assignment decisions.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.3 Team Member, §4.3 Team Capacity Engine

## Dependencies & Impact

- **Depende de:** TASK-144 (Team API — TeamCapacityStore), TASK-149 (Capacity Engine — utilization constraints)
- **Impacta a:** TASK-153 (Capacity Forecast — skill-aware gap detection), TASK-159 (Nexa `execute_reassignment` tool uses staffing)
- **Archivos owned:** `src/lib/agency/skills-staffing.ts`, `src/app/api/agency/skills/route.ts`, `src/app/api/agency/staffing/route.ts`

## Scope

### Slice 1 — Data model + catalog (~4h)

`skill_catalog` table: `skill_id`, `name`, `category` (design, development, account, strategy), `description`. `member_skills` table: `member_id`, `skill_id`, `proficiency_level` (1-5), `verified_at`. `service_skill_requirements` table: `service_id`, `skill_id`, `min_proficiency`, `fte_needed`. Migration + seed with initial skill catalog.

### Slice 2 — Member skill assignment UI (~4h)

Admin UI for managing member skills: skill selector, proficiency level slider, bulk assignment. Skill profile view per member. API: `GET/POST/PUT /api/agency/skills/members/[memberId]`.

### Slice 3 — Staffing engine (~6h)

`StaffingEngine`: given a service's skill requirements, find best-fit available members. Score = skill match (proficiency vs requirement) * availability (FTE remaining). Rank candidates. Detect gaps: required skills with no available member. Output: `StaffingRecommendation[]` with candidates and gap report.

### Slice 4 — UI in Space 360 Team tab (~5h)

Team tab: skill tags per assigned member. Fit score per member for the space's services. Gap alert when services need skills not covered by assigned team. Staffing recommendation drawer: "Suggested assignments for [service]" with ranked candidates.

## Acceptance Criteria

- [ ] Skill catalog with categories populated
- [ ] Member skills assignable with proficiency levels 1-5
- [ ] Service skill requirements definable per service
- [ ] Staffing engine scores and ranks candidates by fit + availability
- [ ] Skill gaps detected when service requires uncovered skills
- [ ] Space 360 Team tab shows skill tags and fit indicators
- [ ] Staffing recommendation available when assigning team to service
- [ ] Handles services without skill requirements (standard assignment flow)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/skills-staffing.ts` | New — staffing engine + skill matching |
| `src/app/api/agency/skills/route.ts` | New — skill catalog CRUD |
| `src/app/api/agency/staffing/route.ts` | New — staffing recommendations API |
| `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` | Add skill tags + fit indicators |
