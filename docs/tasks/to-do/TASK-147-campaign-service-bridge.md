# TASK-147 — Campaign ↔ Service Bridge

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Medio |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Campaigns |
| Sequence | Agency Layer V2 — Phase 2 |

## Summary

Link services to campaigns. Track budget allocation across services within a campaign. Show service breakdown in campaign detail view. Compute budget used vs remaining per campaign. Today campaigns and services are disconnected — no budget tracking against actual service costs.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.4 Campaign, §4.4 Campaigns ↔ Services Bridge

## Dependencies & Impact

- **Depende de:** TASK-145 (Campaigns rescoped under agency namespace), TASK-146 (Service P&L for cost data)
- **Impacta a:** TASK-154 (Revenue Pipeline uses campaign budget data)
- **Archivos owned:** `src/app/api/agency/campaigns/[campaignId]/services/route.ts`, `src/lib/agency/campaign-store.ts`

## Scope

### Slice 1 — Data model (~3h)

`campaign_services` junction table: `campaign_id`, `service_id`, `budget_allocated`, `created_at`. Migration script. `CampaignStore` with `linkService()`, `unlinkService()`, `getBudgetStatus()`.

### Slice 2 — API (~3h)

`GET/POST/DELETE /api/agency/campaigns/[campaignId]/services` — list linked services, link a service with budget allocation, unlink. `GET /api/agency/campaigns/[campaignId]/budget` — budget summary (total, allocated, spent from service economics, remaining).

### Slice 3 — UI (~4h)

Campaign detail: services section showing linked services with allocated budget. Budget bar: total vs allocated vs spent vs remaining. Link/unlink service dialog. Budget allocation input per service.

## Acceptance Criteria

- [ ] Services can be linked to campaigns with budget allocation
- [ ] Budget status computed: total, allocated to services, spent (from service economics), remaining
- [ ] Campaign detail shows linked services with budget breakdown
- [ ] Budget bar visualizes total/allocated/spent/remaining
- [ ] Link/unlink operations persist correctly
- [ ] Handles campaign with no linked services (empty state)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/campaign-store.ts` | New — campaign store with service bridge |
| `src/app/api/agency/campaigns/[campaignId]/services/route.ts` | New — service link API |
| `src/app/api/agency/campaigns/[campaignId]/budget/route.ts` | New — budget status API |
| `src/app/(dashboard)/agency/campaigns/page.tsx` | Add service breakdown to campaign detail |
