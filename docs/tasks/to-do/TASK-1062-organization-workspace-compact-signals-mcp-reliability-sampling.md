# TASK-1062 — Organization Workspace Compact Signals MCP + Reliability Sampling

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Follow-up de TASK-1060; Product API y first-party App API ya existen, falta MCP wrapper y sampling durable si se requiere reliability rate`
- Rank: `TBD`
- Domain: `agency|organization|api|mcp|reliability`
- Blocked by: `TASK-1060`
- Branch: `task/TASK-1062-organization-workspace-compact-signals-mcp-reliability-sampling`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el wrapper MCP/app-tool `get_organization_workspace_compact_signals` sobre el contrato entregado por TASK-1060 y, si el equipo necesita alerting operacional, implementar sampling durable de degradación por request para el read model `OrganizationWorkspaceCompactSignals`.

## Why This Task Exists

TASK-1060 entregó el reader canónico, Product API, first-party App API y consumo runtime del sidecar enterprise. No registró un reliability signal porque la degradación actual existe en el payload por request, pero no hay todavía almacenamiento durable de tasas/series por fuente. Registrar un signal sin sampling persistente produciría falsos positivos o invisibilidad histórica.

## Scope

- Agregar un MCP/tool wrapper read-only que consuma el mismo contrato de TASK-1060 sin duplicar queries.
- Definir si el wrapper vive sobre Product API, App API o un adapter server-side autorizado.
- Si se requiere Reliability Control Plane:
  - persistir sampling mínimo de `status`, `degradedSources[]`, duración y source ids;
  - crear una query estable `organization.workspace.compact_signals_degraded` con steady state claro;
  - registrar el signal solo si el sampling permite baja tasa de falsos positivos.
- Documentar auth, tenant safety y redacción de errores.

## Out of Scope

- Cambiar el DTO de TASK-1060 salvo ajuste compatible.
- Crear nuevas métricas finance/delivery.
- Acciones autónomas desde el sidecar.

## Acceptance Criteria

- [ ] MCP/tool wrapper read-only existe o queda descartado con razón documentada.
- [ ] Si hay reliability signal, usa evidencia durable y steady state verificable.
- [ ] No se duplican readers ni se salta `resolveOrganizationWorkspaceProjection(...)`.
- [ ] Tests cubren auth/scope, missing org y degraded-source sampling si aplica.
- [ ] Docs/API/MCP quedan actualizados.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Tests focales del wrapper/sampling.
- `pnpm docs:closure-check`

## Follow-ups

- Integrar el tool con Nexa/Teams solo cuando exista consumer concreto.
