# TASK-853 — Azure Infra Release Gating + Bicep Diff Detector (TASK-848 V1.1 follow-up)

## Closure 2026-05-10

**SHIPPED en `develop`** con 4 commits incrementales sin PR ceremony, mantenida en develop per instrucción del usuario.

**Slices entregados**:

- `8b041228` Slice 0 — 2 Azure workflows refactor (5 jobs canónicos + workflow_call interface)
- `c8f9c235` Slice 1 — production-release.yml 2 jobs nuevos `deploy-azure-{teams-notifications, teams-bot}` con `secrets: inherit`
- `d4845438` Slice 2 — 11 tests anti-regresion + runbook §6.1/§6.2/§6.3 ampliado
- (este commit) Slice 3 — Docs canónicas + cierre

**Tests**: 21/21 verdes (10 originales TASK-851 + 11 nuevos TASK-853).

**Decisiones foundational arch-architect 4-pillar validadas**:

1. Diff detection live via git (NO desde manifest histórico) — ✓
2. Annotation explícita ::notice:: + GITHUB_STEP_SUMMARY (NO skip silencioso) — ✓
3. Mantener 2 workflows separados (NO consolidate) — ✓
4. Health check siempre incluso si Bicep skip (preflight-style) — ✓

**Acceptance criteria**:

- [x] Bicep deploy gated por diff paths o input explicito.
- [x] Health check Azure corre siempre como preflight-style.
- [x] WIF subjects documentados (ref:refs/heads/main Y environment:production).
- [x] Runbook actualizado con scripts canonicos `az deployment group what-if` + apply.

**Componentes shipped**:

- 2 workflows Azure refactoreados a 5 jobs canónicos (health-check, validate, diff-detection, deploy, skip-deploy-summary)
- workflow_call interface canónico (inputs.environment + target_sha + force_infra_deploy + secrets.AZURE_*)
- Orquestador (TASK-851) wires los 2 jobs Azure en paralelo con workers Cloud Run via `secrets: inherit`
- Tests anti-regresion `concurrency-fix-verification.test.ts` extendido con sección TASK-853
- Runbook ampliado §6.1 (gating auto), §6.2 (WIF subjects + comandos `az ad app federated-credential`), §6.3 (rollback V2 contingente)

**Capabilities, Outbox events, Reliability signals**: 0 nuevos. Reusa el control plane V1.0/V1.1 completo.

**Critical path optimization**: ~80% releases sin diff Azure ahorran 3-7 min en deploy total (Bicep apply skip).

**Hard Rules** canonizadas en CLAUDE.md sección "Azure Infra Release Gating invariants (TASK-853)" con 11 reglas duras.

**Docs canonizadas**: CLAUDE.md + AGENTS.md secciones nuevas, DECISIONS_INDEX entry, GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md Delta TASK-853 SHIPPED, manual operador, doc funcional, runbook ampliado.

**Pendiente fuera de scope**:

- Rollback automatizado Azure (V2 contingente, NO V1) — Bicep reapply destructivo, requiere `what-if` mandatory + restore desde commit previo + smoke test obligatorio. Documentado en runbook §6.3.
- TASK-854 Release Observability Completion: 2 reliability signals nuevos + dashboard UI consume manifest histórico.

---

## Status

- Lifecycle: `complete`
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
