# TASK-155 — Scope Intelligence: Automatic Scope Creep Detection

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 5 |

## Summary

Compare planned scope (from service contract) vs actual delivery (from ICO metrics). Compute a scope creep score 0-100 from 5 signals: assets delivered / planned ratio, actual months / planned months ratio, actual FTE / planned FTE ratio, RPA degradation trend, new asset types not in original scope. Alert when score exceeds 40. Surface in Space 360 Services tab and Anomaly Engine.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.3A Anomaly Detection (scope creep rule)

## Dependencies & Impact

- **Depende de:** Service scope fields (contract data in services table), ICO task data (actual delivery metrics), TASK-152 (Anomaly Engine for alert delivery)
- **Impacta a:** TASK-156 (SLA/SLO uses scope data for compliance), TASK-159 (Nexa can query scope status)
- **Archivos owned:** `src/lib/agency/scope-intelligence.ts`

## Scope

### Slice 1 — Scope contract model + computation (~5h)

Extend service data model with scope fields: `planned_assets`, `planned_months`, `planned_fte`, `allowed_asset_types`. `ScopeIntelligence` module: compare planned vs actual from ICO. Compute 5 signal scores, weighted average = scope creep score 0-100. Classify: Normal (0-25), Watch (26-40), Creep (41-70), Critical (71+).

### Slice 2 — Anomaly rule integration (~3h)

Add `scope_creep` rule to Anomaly Detection registry (TASK-152). Trigger when scope creep score >40 for a service. Auto-generate suggestion: "Revisar scope creep en [service] — ratio de assets entregados vs planificados: [ratio]". Link to Space 360 Services tab.

### Slice 3 — UI in Space 360 Services tab (~4h)

Services tab: scope creep indicator per service (badge with score). Expandable detail showing 5 signal breakdown. Alert banner when any service has scope creep >40. Scope comparison: planned vs actual in table format.

## Acceptance Criteria

- [ ] Scope creep score computed 0-100 from 5 signals per service
- [ ] Classification: Normal/Watch/Creep/Critical
- [ ] Service data model extended with planned scope fields
- [ ] Anomaly rule triggers when scope creep score >40
- [ ] Space 360 Services tab shows scope creep indicator
- [ ] Signal breakdown visible in expandable detail
- [ ] Handles services without scope data (skip computation, show "no scope defined")

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/scope-intelligence.ts` | New — scope computation |
| `src/lib/agency/anomaly-detector.ts` | Add scope_creep rule to registry |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add scope creep indicators |
| `src/app/api/agency/services/[serviceId]/route.ts` | Extend with scope fields |
