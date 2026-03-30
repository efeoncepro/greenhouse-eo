# TASK-161 — Agency Permissions, Data Retention & Operational Onboarding

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Medio |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Governance |
| Sequence | Agency Layer V2 — Cross-cutting |

## Summary

Implement field-level permission model within Agency (6 roles x 16 fields visibility matrix). Define and implement data retention policy (hot/warm/cold archiving for agency data). Create operational glossary (20+ terms with tooltips throughout Agency views) and playbook templates for anomaly responses.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §7 Enterprise Hardening (permissions + operational depth)

## Dependencies & Impact

- **Depende de:** TASK-136 (View Access Governance — permission infrastructure), TASK-152 (Anomaly Engine — playbook templates respond to anomalies)
- **Impacta a:** All Agency views (permissions apply), operational team onboarding
- **Archivos owned:** `src/lib/agency/agency-permissions.ts`, `src/lib/agency/agency-glossary.ts`

## Scope

### Slice 1 — Permission model (~5h)

Define 6 Agency roles: Agency Admin, Operations Lead, Account Lead, Finance Viewer, Team Lead, Observer. Define 16 field groups: revenue, margin, cost breakdown, team assignments, FTE allocation, salary data, risk scores, health scores, anomalies, recommendations, SLAs, scope data, campaigns, budget, forecasts, client engagement. Build visibility matrix (role x field). Integrate with existing authorization layer from TASK-136.

### Slice 2 — Data retention policy + cron (~4h)

Define retention tiers: Hot (0-3 months, full access), Warm (3-12 months, queryable but archived), Cold (12+ months, BigQuery only). Implement archival cron for agency serving views (`agency_anomalies`, `space_health_scores`, `team_capacity_forecast`). Move old records to `_archive` suffix tables or BigQuery.

### Slice 3 — Operational glossary + tooltips (~3h)

Define 20+ terms: Space, Service, OTD, RPA, FTE, Capacity, Utilization, Margin, Scope Creep, Health Score, Risk Score, Pipeline, Anomaly, etc. Implement `AgencyGlossary` with tooltip component. Wire tooltips to column headers, KPI labels, and badge labels throughout Agency views.

### Slice 4 — Playbook templates (~3h)

Define response playbooks for common anomalies: OTD Drop (investigate stuck assets, check capacity, consider reassignment), Margin Erosion (check scope creep, review pricing, audit costs), Capacity Overload (prioritize, redistribute, hire). Store as structured templates. Show relevant playbook in anomaly detail and notification.

## Acceptance Criteria

- [ ] 6 Agency roles defined with field-level visibility matrix
- [ ] Permissions enforced: restricted fields hidden for unauthorized roles
- [ ] Data retention policy implemented with hot/warm/cold tiers
- [ ] Archival cron moves old data per retention schedule
- [ ] 20+ glossary terms defined with tooltips throughout Agency
- [ ] Playbook templates available for top anomaly types
- [ ] Anomaly notifications include relevant playbook link
- [ ] Permission model integrates with TASK-136 governance infrastructure

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/agency-permissions.ts` | New — role x field permission matrix |
| `src/lib/agency/agency-glossary.ts` | New — glossary terms + tooltip config |
| `src/lib/agency/agency-playbooks.ts` | New — anomaly response playbook templates |
| `src/lib/tenant/authorization.ts` | Extend with Agency role definitions |
| `src/app/api/cron/agency-retention/route.ts` | New — data archival cron |
