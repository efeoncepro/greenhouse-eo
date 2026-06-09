# TASK-1060 — Organization Workspace Compact Signals Projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Derivada de TASK-1059`
- Rank: `TBD`
- Domain: `agency|organization|data|finance|delivery`
- Blocked by: `none`
- Branch: `task/TASK-1060-organization-workspace-compact-signals-projection`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear una projection compacta y gobernada para el sidecar enterprise de Organization Workspace: salud de cuenta, readiness cross-facet, señales recientes, próximas acciones y procedencia compacta. TASK-1059 implementa el runtime visual usando datos reales disponibles y degradación honesta, pero hoy no existe un contrato único para estas señales.

## Why This Task Exists

El mockup aprobado incluye un sidecar ejecutivo con señales recientes, próximos hitos, readiness y linaje. El runtime actual puede derivar parte desde `organization_360`, Account Complete 360 y finance/delivery facets, pero no tiene una fuente canónica para acciones/hitos ni un timeline compacto cross-domain. Mantener esa lógica como derivación JSX sería deuda y violaría full API parity.

## Goal

- Exponer un reader/projection server-side reusable para `OrganizationWorkspaceCompactSignals`.
- Consolidar señales de Finance, Delivery, CRM, Services, Staff Aug y onboarding/lifecycle sin duplicar lógica de esos dominios.
- Dar payload estable a Organization Workspace, futuras APIs/MCP y notificaciones.
- Mantener estados honestos cuando una fuente no esté lista.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- TASK-1059 runtime promotion.
- Existing Account Complete 360 facets.
- Existing finance/delivery/service/staffAug readers.

### Blocks / Impacts

- Runtime sidecar quality for `/agency/organizations/[id]`.
- Future app/API/MCP parity for organization executive signals.

### Files owned

- `src/lib/organization-workspace/**`
- `src/app/api/platform/app/**` or product API path if promoted
- `src/views/greenhouse/organizations/**`
- `docs/tasks/**`

## Scope

- Define `OrganizationWorkspaceCompactSignals` DTO.
- Implement reader with source timeouts and partial-source degradation.
- Include readiness, health, recent signals, next actions and provenance.
- Add tests for source failures and no-data states.
- Wire TASK-1059 sidecar to consume the reader when available.

## Out of Scope

- New ledger, AR aging or finance calculations.
- New delivery materializers.
- Creating autonomous actions; this is read-only.

## Acceptance Criteria

- [ ] Reader returns compact signals for a known organization without crashing on partial sources.
- [ ] Payload identifies source/provenance per section.
- [ ] Organization Workspace sidecar consumes the reader or has a documented migration path.
- [ ] Tests cover ready, partial and empty states.
- [ ] Full API parity path is declared for app/MCP consumption.

## Rollout Plan

Ship as additive read model. Runtime can keep the TASK-1059 derived fallback until this reader is verified with live data and GVC.
