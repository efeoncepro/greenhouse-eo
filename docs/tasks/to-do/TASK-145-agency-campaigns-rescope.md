# TASK-145 — Agency Campaigns API Rescope

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Bajo |
| Effort | Bajo |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Campaigns |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Move `/api/campaigns` to `/api/agency/campaigns` or create a proxy route. Fix namespace inconsistency where the Campaigns view lives under Agency (`/agency/campaigns`) but the API is at the global `/api/campaigns` path. This is a routing hygiene fix that unblocks clean Campaign-Service bridging.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.4 Campaigns ↔ Services Bridge

## Dependencies & Impact

- **Depende de:** Nothing — standalone fix
- **Impacta a:** TASK-147 (Campaign ↔ Service Bridge builds on rescoped API)
- **Archivos owned:** `src/app/api/agency/campaigns/route.ts`

## Scope

### Slice 1 — Route move + redirect (~3h)

Create `/api/agency/campaigns` route that proxies or replaces `/api/campaigns`. Update Campaigns view to call new endpoint. Add redirect or keep old route as deprecated proxy for backwards compatibility. Update all sub-routes (`[campaignId]`, `metrics`, `financials`, `roster`, `projects`, `360`).

## Acceptance Criteria

- [ ] `/api/agency/campaigns` serves campaign data
- [ ] Campaigns view at `/agency/campaigns` calls the new API path
- [ ] Old `/api/campaigns` routes either redirect or proxy to new location
- [ ] All campaign sub-routes (`[campaignId]/metrics`, `financials`, etc.) work under new namespace
- [ ] No broken references in the codebase

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/api/agency/campaigns/route.ts` | New — rescoped campaign API |
| `src/app/api/agency/campaigns/[campaignId]/` | New — sub-routes under agency namespace |
| `src/app/api/campaigns/route.ts` | Deprecate or proxy to new location |
| `src/app/(dashboard)/agency/campaigns/page.tsx` | Update API calls to new path |
