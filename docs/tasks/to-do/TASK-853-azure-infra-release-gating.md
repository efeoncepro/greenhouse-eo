# TASK-853 — Azure Infra Release Gating + Bicep Diff Detector (TASK-848 V1.1 follow-up)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform / cloud / azure`
- Blocked by: `TASK-851` (orquestador require gating decision)
- Branch: `task/TASK-853-azure-infra-release-gating`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar TASK-848 Slice 5: separar health checks de Azure (preflight) del deploy real de Azure Bicep. Bicep deploy real corre solo si el diff toca paths de infra (`infra/azure/**`) o si `force_infra_deploy=true` en dispatch. Documentar subject WIF requerido para `ref:refs/heads/main` Y `environment:production`. Ampliar runbook con automatic rollback path para Azure cuando ofrezca dry-run safety en el futuro.

## Why

TASK-848 V1.0 deja Azure config rollback como manual gated en runbook. Pero el deploy real de Azure tampoco esta gated: corre en cada release de app aunque no haya diff de infra. Sin esta task, releases puramente de app re-applican Bicep innecesariamente.

## Scope

- `.github/workflows/azure-teams-deploy.yml` + `azure-teams-bot-deploy.yml`:
  - Agregar input `force_infra_deploy` (default false)
  - Job step nuevo: detectar diff de paths `infra/azure/**` desde el commit anterior
  - Skip Bicep deploy real si no hay diff Y `force_infra_deploy != true`
  - Health check Azure Bot Service + WIF + secrets corre siempre (preflight-style)
- Documentacion:
  - Runbook `production-release.md` ampliar Sec 6 (rollback manual Azure) con scripts canonicos
  - Spec V1 §2.8 Azure manual gated
- Capability `platform.release.execute` requerida para `force_infra_deploy=true`

## Acceptance Criteria

- [ ] Bicep deploy gated por diff paths o input explicito.
- [ ] Health check Azure corre siempre como preflight-style.
- [ ] WIF subjects documentados (ref:refs/heads/main Y environment:production).
- [ ] Runbook actualizado con scripts canonicos `az deployment group what-if` + apply.

## Out of Scope

- No automatizar Azure rollback en V1 (queda manual con `what-if` mandatory).
