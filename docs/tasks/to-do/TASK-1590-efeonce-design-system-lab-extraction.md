# TASK-1590 — AXIS Design System Lab Extraction

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1590-efeonce-design-system-lab.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1590-efeonce-design-system-lab-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; Lab independiente pendiente`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `none` (foundation publicada; extracción del Lab sigue pendiente)
- Branch: `task/TASK-1590-efeonce-design-system-lab-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Separar el Pattern Lab del runtime Greenhouse y desplegarlo como proyecto Vercel
internal-only. `/design-system` seguirá siendo catálogo/control plane durante la migración.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/app/(dashboard)/design-system` en Greenhouse
- Future candidate home: `ui-package`
- Boundary: Lab consume packages y fixtures; no lógica de dominio ni secretos
- Server/browser split: browser-safe fixtures; Vercel estático/React en primera wave
- Build impact: proyecto Vercel separado y build reproducible
- Extraction blocker: rutas internas y handoff Figma siguen viviendo en Greenhouse

## UI/UX Contract

- Primitive decision: `reuse` del lenguaje y fixtures existentes; `extend` sólo cuando el Lab necesite un shell propio.
- Responsive: 1440 px y 390 px.
- Accessibility: keyboard, focus, reduced motion, contrast y labels.
- Evidence: captures del Lab y diff contra primitives Greenhouse seleccionadas.

## Acceptance Criteria

- [ ] Lab corre fuera de Greenhouse.
- [ ] Tiene catálogo searchable con owner, SoT, lifecycle y consumers.
- [ ] Tiene fixtures desktop/mobile/keyboard/reduced-motion.
- [ ] Preview Vercel definida sin mover producción ni retirar `/design-system`.

## Rollout / Rollback

- Preview primero; dominio interno después de revisión humana.
- `/design-system` queda como fallback y catálogo Greenhouse.
