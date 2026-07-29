---
name: greenhouse-ai-design-studio
description: Canonical end-to-end orchestrator for new or materially redesigned Greenhouse product UI; requires versioned visual direction, first-fold review, GVC premium evidence and an enterprise score gate.
---

# Greenhouse AI Design Studio

Use the canonical implementation at:

- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`

Claude must follow that file as the shared repo contract. Map its specialist
lanes to the locally available Claude skills, but do not change the order,
artifacts, readiness fields, GVC premium requirements, score dimensions or
thresholds.

## AXIS foundation pointer

AXIS is Efeonce's portable foundation and Lab. Keep adapters native to each
consumer: MUI for Greenhouse and Tailwind v4 for Globe. Use semantic tokens and
`tokens.ts`; never add literal design values. Consult the shared UI ADR and
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`. `TASK-1591` now
has an opt-in consumer pilot verified at package `0.1.4`; do not infer product-promotion
readiness from the pilot alone.

Materialization lanes (Claude namespace) — how the approved direction becomes
code. They own craft only; they never re-declare the score gate, the Figma
Implementation Contract or GVC:

- `tailwind-engineer` — theme, utilities, variants, layers, SSOT → class.
- `css-architect` — cascade, layers, specificity, layout, platform CSS.
- `html-react-engineer` — HTML element, platform behaviour, React 19 composition.

Render topology (RSC, boundaries, streaming) stays with `frontend-architect`.

Hard requirements:

1. Persist external source or a repo-native direction.
2. Compare 2–3 directions and select one before JSX.
3. Map to surface recipe, Composition Shell, primitives and tokens.
4. Pass substantive readiness.
5. Review desktop/mobile first fold.
6. Capture/review GVC with `qualityProfile: 'premium'`.
7. Score fourteen dimensions; average ≥4.5, none <4; hierarchy, surface
   economy, visual impact, fidelity and template resistance each ≥4.5.
8. Treat enterprise `BLOCK` as blocking.

Greenhouse product typography is Geist + theme-applied Poppins display, never
DM Sans for new product UI.
