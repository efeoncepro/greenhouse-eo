---
name: greenhouse-ai-design-studio
description: Orchestrate Lovable/Stitch-like design generation inside Greenhouse safely. Use for end-to-end UI design/redesign loops: product intent, variants, UX/content, microinteractions, frontend implementation, Playwright screenshots, critique, and enterprise gate.
---

# Greenhouse AI Design Studio

Use this when the user wants a modern, world-class, high-fidelity Greenhouse UI experience, especially when they reference Lovable, Stitch, v0, mockups, screenshots, or enterprise-grade design.

## Orchestration Order

1. `product-design-architect-2026`
   - choose pattern and Product UI ADR when warranted.
2. `ai-ui-generation-director`
   - generate controlled directions and prompt/spec.
3. `ux-content-accessibility` or `enterprise-ux-systems-designer`
   - state language, copy, accessibility.
4. `microinteraction-systems-architect`
   - feedback and motion model.
5. `greenhouse-product-ui-architect`
   - map to repo primitives and constraints.
6. `frontend-product-implementation-reviewer`
   - implementation plan or review.
7. Implement or mock up.
8. Capture screenshots using Playwright:
   - desktop, laptop, mobile.
9. `visual-regression-product-critic`
   - score and iterate.
10. `greenhouse-ui-enterprise-review`
   - final gate.

## Loop Rule

Do not stop after the first screenshot when the user asks for world-class UI. Iterate until:

- no blockers
- mobile is intentional
- CTA hierarchy is clear
- state model is visible
- screenshots support the design intent

## Output Contract

- skills invoked and why
- design decision
- implementation summary
- screenshots reviewed
- gate verdict
- validation commands
