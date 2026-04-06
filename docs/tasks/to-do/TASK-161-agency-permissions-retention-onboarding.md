# TASK-161 — Agency Permissions, Data Retention & Operational Onboarding

## Delta 2026-04-05

- TASK-263 (Permission Sets) implementado — la capa de permisos ahora resuelve `Rol ∪ PermissionSets ∪ UserOverrides`
- `resolveAuthorizedViewsForUser()` en `src/lib/admin/view-access-store.ts` tiene un nuevo Layer 2 (Permission Sets) que es aditivo
- `src/lib/admin/permission-sets.ts` contiene CRUD + resolucion de sets — reutilizar patron para Agency permissions si corresponde
- `src/lib/sync/event-catalog.ts` tiene nuevos eventos: `viewAccessSetAssigned`, `viewAccessSetRevoked`, aggregate `permissionSet`
- La dependency de TASK-136 sigue vigente; TASK-263 extiende sin romper backward compatibility

## Delta 2026-04-03

- El glosario operativo y los playbooks de esta lane deben alinearse a `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Regla nueva:
  - términos como `OTD`, `FTR`, `RpA`, `TTM`, `Iteration Velocity`, `Revenue Enabled`, `Cycle Time` y `BCS` deben definirse según el contrato maestro, no por microcopy heurística
  - los playbooks de anomalías no deben recomendar acciones como si una métrica de baja confianza fuera una verdad operativa cerrada
- Esta task no redefine el significado de métricas `ICO`; solo las traduce a onboarding, permisos y operación diaria.

## Delta 2026-04-03 — roles y jerarquías internas ahora tienen spec canónica propia

- La matriz de permisos y los playbooks de esta lane ya no deben mezclar en un solo plano:
  - role codes
  - supervisoría
  - estructura departamental
  - ownership operativo de cuenta/space
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- Regla nueva:
  - `Agency Permissions` puede definir visibilidad y field-level governance
  - pero no debe inventar por su cuenta una jerarquía de managers/leads si esa semántica ya quedó fijada en la nueva spec

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
