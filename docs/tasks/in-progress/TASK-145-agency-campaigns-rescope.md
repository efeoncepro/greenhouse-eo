# TASK-145 — Agency Campaigns API Rescope

## Delta 2026-04-17 — spec corregida contra runtime real

- La lane ya no debe tratarse como un simple rename `Agency-only`:
  - hoy el runtime real de campañas sirve a tres surfaces distintas:
    - Agency: `/agency/campaigns`
    - internal/global: `/campaigns` y `/campaigns/[campaignId]`
    - client-facing: `/campanas` y `/campanas/[campaignId]`
  - todas consumen el mismo árbol API actual bajo `src/app/api/campaigns/**`
- El problema real no es solo de namespace:
  - Agency list vive bajo `/agency/campaigns` pero llama a `GET /api/campaigns`
  - además existe un bug de contrato tenant-safe en `GET /api/campaigns`: para usuarios client se pasa `tenant.clientId` a un reader que filtra por `campaigns.space_id`
  - varias sub-routes por `campaignId` dependen solo de `campaignScopes` y no resuelven pertenencia por `space_id`/tenant cuando ese subset viene vacío
- La implementación correcta para esta lane pasa a ser:
  - crear wrappers `GET /api/agency/campaigns/**` sobre el runtime actual para la surface Agency
  - mantener `src/app/api/campaigns/**` como namespace compartido para client/internal mientras siga siendo necesario
  - extraer un helper tenant-safe reusable para resolver `space`/subset/tenant de campañas sin depender de `clientId -> spaceId`
  - corregir consumers Agency al namespace `/api/agency/campaigns/**`
- `/agency/campaigns` hoy solo tiene list view:
  - no existe page detail bajo `/agency/campaigns/[campaignId]`
  - los details runtime siguen viviendo en `/campaigns/[campaignId]` y `/campanas/[campaignId]`
- El dominio ya existe y debe reutilizarse:
  - `greenhouse_core.campaigns`
  - `greenhouse_core.campaign_project_links`
  - `src/lib/campaigns/campaign-store.ts`
  - `src/lib/campaigns/campaign-metrics.ts`
  - `src/lib/campaigns/campaign-extended.ts`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | P1 |
| Impact | Bajo |
| Effort | Bajo |
| Status real | `Discovery + spec correction` |
| Rank | — |
| Domain | Agency / Campaigns |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Rescope Agency Campaigns over a dedicated `/api/agency/campaigns` namespace without breaking the existing shared campaign runtime for internal and client surfaces. Fix both the Agency namespace inconsistency and the current tenant-isolation drift in campaign resolution so the Campaign-Service bridge can build on a clean, tenant-safe contract.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.4 Campaigns ↔ Services Bridge

## Dependencies & Impact

- **Depende de:** `src/app/api/campaigns/**`, `src/lib/campaigns/campaign-store.ts`, `src/lib/campaigns/campaign-metrics.ts`, `src/lib/campaigns/campaign-extended.ts`, `docs/tasks/complete/TASK-017-campaign-360.md`, `greenhouse_core.campaigns`, `greenhouse_core.campaign_project_links`
- **Impacta a:** TASK-147 (Campaign ↔ Service Bridge), client-facing campaigns (`/campanas`), internal/global campaigns (`/campaigns`), `campaignScopes` / Identity Access V2
- **Archivos owned:** `src/app/api/agency/campaigns/**`, helper tenant-safe de resolución campaign scope

## Scope

### Slice 1 — Agency namespace wrappers + tenant-safe resolution (~3h)

Create `/api/agency/campaigns/**` wrappers over the existing campaign runtime for the Agency surface. Introduce a shared tenant-safe helper so campaign reads resolve by `space_id` / tenant subset instead of relying on the current `clientId -> spaceId` mismatch.

### Slice 2 — Agency consumers cleanup (~2h)

Update Agency Campaigns UI to consume `/api/agency/campaigns`. Keep `/api/campaigns/**` alive for internal and client-facing surfaces unless the implementation proves a broader cutover can happen safely in the same lane.

## Acceptance Criteria

- [ ] `/api/agency/campaigns` serves campaign data for the Agency surface
- [ ] Agency Campaigns view at `/agency/campaigns` calls the new API path
- [ ] Existing `/api/campaigns/**` runtime stays functional for internal/client surfaces or is safely wrapped without regressions
- [ ] Campaign resolution is tenant-safe by `space_id` / subset and no longer depends on the `clientId -> spaceId` mismatch
- [ ] Any new Agency sub-routes added in this lane preserve parity with the existing runtime contract where needed
- [ ] No broken references in the codebase

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/api/agency/campaigns/route.ts` | New — Agency campaign namespace wrapper |
| `src/app/api/agency/campaigns/[campaignId]/**` | New — Agency wrappers for any sub-routes this lane needs |
| `src/app/api/campaigns/route.ts` | Keep shared runtime or wrap with tenant-safe helper |
| `src/app/api/campaigns/[campaignId]/**` | Align tenant-safe resolution where required |
| `src/views/agency/AgencyCampaignsView.tsx` | Update Agency fetches to new namespace |
| `src/lib/campaigns/*` | Reuse runtime readers and factor shared tenant-safe helper if missing |
