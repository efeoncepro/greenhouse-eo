# TASK-1485 — Globe Design System Governance and Incremental Pattern Registry

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `component`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Boundary aprobada por operador; contrato/implementación pendientes`
- Rank: `TBD`
- Domain: `creative|ui-platform|governance|accessibility`
- Blocked by: `TASK-1455`
- Branch: `task/TASK-1485-globe-design-system-governance-pattern-registry`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el Design System propio de Globe como sistema incremental: Greenhouse gobierna decisiones, registry,
lifecycle, QA, evidencia y promoción; Globe posee e implementa tokens seleccionados, patterns, components,
motion y runtime sin heredar el Design System de Greenhouse.

## Why This Task Exists

La shell inicial resolvió identidad, pero los workbenches siguientes necesitan consistencia sin acoplar Globe
a Vuexy/MUI/CompositionShell ni improvisar patterns aislados por pantalla.

## Goal

Entregar un registry versionado y un Pattern Lab Globe donde cada pattern nazca `candidate`, demuestre anatomy,
states, responsive, a11y, motion y evidence, y sólo entonces se promueva para reuso.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/ui/visual-directions/TASK-1474-globe-studio-workbench-direction.md`
- `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` sólo como quality/evidence bar, no inheritance.

## Dependencies & Impact

### Depends on

- `TASK-1455` para shell Orbital Threshold, brand assets y runtime UI verificado.

### Blocks / Impacts

- `TASK-1474` y `TASK-1483` registran/extienden patterns Globe mediante este lifecycle.
- Futuras surfaces Globe deben decidir `reuse | extend | new`, sin copiar patterns Greenhouse por defecto.

### Files owned

- En Greenhouse: decision log, registry metadata, lifecycle, QA/evidence y baseline references de Globe.
- En Globe: `apps/studio-web` Pattern Lab y packages/paths UI propios que Plan Mode defina.

No posee el Design System de Greenhouse ni autoriza dependencias Vuexy/MUI/React.

## Current Repo State

### Already exists

- Globe tiene shell branded HTML/CSS/TS y assets/tokens iniciales de Orbital Threshold.

### Gap

- No hay registry/lifecycle propio, pattern contracts ni ownership formal entre gobierno Greenhouse y runtime Globe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `governance/evidence Greenhouse; source/runtime Globe`
- Future candidate home: `remain-shared`
- Boundary: `Globe Design System`
- Server/browser split: `pattern metadata build-time; runtime browser-safe sin secrets`
- Build impact: `Globe pattern lab + Greenhouse gates/GVC`
- Extraction blocker: `ninguno`

## UI/UX Contract

- Visual direction: `docs/ui/visual-directions/TASK-1485-globe-design-system-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Ownership: `Greenhouse governs; Globe designs/implements/owns its UI language`.
- Inheritance: `none by default`; selected shared brand colors require explicit token decision/provenance.
- Registry lifecycle: `candidate -> trial -> stable -> deprecated -> retired` con owner/version/evidence.
- Pattern contract: anatomy, slots, variants, states, density, responsive, content, a11y, motion, do/don't.
- Visual evidence: Pattern Lab desktop/mobile, keyboard, reduced motion, contrast y regression baselines.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Ownership, tokens and registry

- ADR/delta load-bearing con boundary Greenhouse-governance/Globe-runtime y no-inheritance.
- Registry machine-readable con IDs `globe.*`, lifecycle, version, owner, consumers y evidence refs.
- Taxonomía de Globe tokens: brand-selected, semantic, surface, type, space, radius, elevation, motion.

### Slice 2 — Pattern Lab and starter contracts

- Implementar Pattern Lab Globe y fixtures multi-state/responsive/audience.
- Registrar la shell vigente y contracts fundacionales, sin crear una biblioteca big-bang.
- Habilitar propuestas de `Creative Desk` y `Runway Control Plane` como candidates independientes.

### Slice 3 — Promotion gates

- Lint anti-unregistered-pattern/anti-cross-system-import y decision `reuse | extend | new` por task.
- Gates a11y/GVC/reduced-motion/overflow y proceso de deprecation/migration.

## Out of Scope

- Copiar Greenhouse UI, Vuexy, MUI, CompositionShell, recipes, layouts o motion patterns.
- Diseñar todos los patterns futuros por adelantado.
- Forzar los mismos tokens salvo colores de marca compartidos deliberadamente y documentados.
- Business logic, credits calculations o provider workflows.

## Detailed Spec

Ejecutar con `pnpm codex:task-hook TASK-1485 --develop` tras goal aprobado. La primera decisión de Plan Mode
es el package/path owner dentro de Globe; el registry canónico y su evidencia permanecen gobernados desde
Greenhouse. Cada nueva surface puede crear candidates en su task, pero promueve sólo por este contrato.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| Globe hereda Greenhouse accidentalmente | lint dependency/import + ADR no-inheritance | import cross-system |
| registry sin runtime truth | conformance Pattern Lab/source/evidence | entry sin consumer/source |
| big-bang design system | candidate on demand + consumers reales | pattern sin use case |
| drift visual/a11y | baseline multi-state + promotion gates | regression/axe/overflow |

- Feature flag: Pattern Lab internal-only.
- Rollback: retirar candidate/consumer, conservar version/evidence; stable usa deprecation, no delete.
- Verification: registry lint -> Pattern Lab -> keyboard/a11y -> GVC desktop/mobile -> consumers pilot.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR/decision declara Greenhouse governance, Globe ownership/runtime y no inheritance automática.
- [ ] Registry machine-readable valida ID/version/lifecycle/owner/consumer/evidence.
- [ ] Cada pattern documenta anatomy, states, responsive, a11y, motion y content contract.
- [ ] Pattern Lab muestra fixtures desktop/mobile/keyboard/reduced motion y estados honestos.
- [ ] No existen imports/dependencies de UI Greenhouse en Globe salvo contrato explícitamente aprobado.
- [ ] Compartir colores queda token-by-token documentado; no arrastra patterns ni semantics completas.
- [ ] `TASK-1474`/`1483` pueden registrar candidates sin esperar una biblioteca exhaustiva.

## Verification

- `pnpm task:lint --task TASK-1485`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- GVC Pattern Lab desktop/mobile cuando exista runtime.

## Closing Protocol

- [ ] `UI ready: yes` sólo con registry/decision/Pattern Lab/gates/evidence completos.
- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- Cada product task conserva ownership de su composition y propone candidates; esta task gobierna promoción.
