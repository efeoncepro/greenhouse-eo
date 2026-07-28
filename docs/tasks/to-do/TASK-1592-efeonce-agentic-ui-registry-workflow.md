# TASK-1592 — Efeonce Agentic UI Registry Workflow

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `primitive`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; workflow pendiente`
- Rank: `TBD`
- Domain: `ui-platform|agent-workflow`
- Blocked by: `TASK-1589`
- Branch: `task/TASK-1592-efeonce-agentic-ui-registry-workflow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer ejecutable para agentes el lookup del registry, la decisión `reuse | extend | new`,
la promoción por lifecycle y los gates de duplicación, tokens, a11y y evidencia.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: Greenhouse skills, docs y gates de UI
- Future candidate home: `remain-shared`
- Boundary: workflow de agentes y conformance; no runtime de producto
- Server/browser split: n/a; gates locales/CI
- Build impact: lint/registry checks y documentación de handoff
- Extraction blocker: definir el formato final del registry package

## Acceptance Criteria

- [ ] Un agente recibe instrucción canónica de buscar registry antes de crear primitive.
- [ ] `reuse`, `extend` y `new` dejan evidencia y owner.
- [ ] Se detectan duplicados y literales visuales fuera del SSOT.
- [ ] Lifecycle y rollback están documentados.
