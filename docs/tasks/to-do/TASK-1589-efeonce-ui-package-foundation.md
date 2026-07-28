# TASK-1589 — Efeonce UI Package Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `primitive`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; package local inicial creado`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `TASK-1588`
- Branch: `task/TASK-1589-efeonce-ui-package-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el foundation portable de AXIS —tokens, contracts y registry— en `../axis-design-system`.
La capa portable no puede importar MUI, Vuexy, Next, browser globals ni lógica de producto.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../axis-design-system/packages/{tokens,contracts,registry}`
- Future candidate home: `ui-package`
- Boundary: tokens/contracts/registry; adapters y composiciones quedan fuera
- Server/browser split: build-time package; sin secretos ni side effects de browser
- Build impact: workspace package build/typecheck/test y publicación privada posterior
- Extraction blocker: inventario de primitives MUI todavía no separado por contrato

## Acceptance Criteria

- [ ] Tokens semanticamente nombrados con provenance y CSS exportable.
- [ ] Contracts incluyen anatomy, states, a11y, responsive, motion, owner y evidence.
- [ ] Registry valida lifecycle, consumers y evidence.
- [ ] La capa portable no importa MUI/Vuexy.
- [ ] Build, typecheck y tests locales verdes.

## Rollout / Rollback

- Solo local/preview en este slice; no publish estable.
- Rollback: borrar consumo del package en cualquier piloto; no se elimina runtime existente.
