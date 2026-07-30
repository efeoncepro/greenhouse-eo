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
- Blocked by: `none` (foundation publicada; workflow sigue pendiente)
- Branch: `task/TASK-1592-efeonce-agentic-ui-registry-workflow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer ejecutable para agentes el lookup del registry, la decisión `reuse | extend | new`,
la promoción por lifecycle y los gates de duplicación, tokens, a11y y evidencia.

## Delta 2026-07-30 — frontera con `TASK-1601` (gate de promoción)

`TASK-1601` construye el **diff visual cross-runtime**, que es un gate de promoción a `stable`. Esta task
incluye *"la promoción por lifecycle y los gates de … evidencia"*, así que se tocan.

Frontera acordada, para que las dos no discutan qué bloquea una promoción:

| | Alcance |
|---|---|
| **`TASK-1592`** (ésta) | **El proceso**: cómo un agente hace lookup en el registry, decide `reuse \| extend \| new`, y ejecuta la promoción por lifecycle |
| **`TASK-1601`** | **El contrato y el mecanismo**: que la `spec` exista en el contrato, y que el diff cross-runtime la verifique |

Dicho de otra forma: `1601` provee un gate; `1592` decide cuándo se corre y qué pasa con su resultado. Un
pattern no puede promoverse a `stable` sin dos adapters y sin el diff en verde — esa regla vive en el ADR y
las dos tasks la respetan desde su lado.

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
