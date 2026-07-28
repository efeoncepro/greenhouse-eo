# TASK-1591 — Efeonce UI Adapters Pilot

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1591-efeonce-ui-adapters-pilot.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; adapters piloto pendientes`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `TASK-1589`
- Branch: `task/TASK-1591-efeonce-ui-adapters-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Probar que un contrato compartido puede tener implementaciones distintas: una primitive
simple y una compleja en Greenhouse/MUI y Globe/Tailwind, con adopción opt-in y rollback.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse `src/components/greenhouse/primitives` y Globe `apps/studio-client/src/primitives`
- Future candidate home: `ui-package`
- Boundary: contract compartido + adapters locales; no cross-import de runtimes
- Server/browser split: browser UI only; commands/data permanecen en cada producto
- Build impact: consumers fijan versión local/privada; no cambio de deploy inicial
- Extraction blocker: APIs actuales y semántica de estados no son equivalentes todavía

## UI/UX Contract

- Primitive decision: `reuse` contract, `extend` adapters; no copy/paste de implementation.
- States: ready, disabled/blocked con razón, loading, error y focus.
- Evidence: desktop/mobile, keyboard, reduced motion, visual diff y screen reader spot check.

## Acceptance Criteria

- [ ] Una primitive simple y una compleja comparten contract.
- [ ] Greenhouse no importa el adapter Globe.
- [ ] Globe no importa MUI/Vuexy.
- [ ] Cada consumer puede rollback por versión.
- [ ] Evidence y ownership quedan en registry.

## Rollout / Rollback

- Feature opt-in en consumers piloto.
- Rollback a implementation local sin modificar el contrato de runtime.

## Execution note — 2026-07-28

La foundation AXIS y el Lab ya están publicados y verificados. La ejecución del piloto
queda bloqueada únicamente en el acceso de consumidores a GitHub Packages: hay que
conceder read access a `efeoncepro/greenhouse-eo` y `efeoncepro/efeonce-globe` desde la
configuración de cada paquete y provisionar una credencial técnica `read:packages` para
Vercel/Cloud Build. El runbook operativo está en
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
