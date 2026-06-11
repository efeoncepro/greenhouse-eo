# Product Design QA — Knowledge Answer Trace

source visual truth path: `/Users/jreye/.codex/generated_images/019eb8d6-d806-7630-b501-83c1a9642d45/ig_0a14e43ed2c923e0016a2b3dbc84448191a5cba6d19b3cdd4e.png`

implementation screenshot path: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-11T23-31-10_inline-knowledge-mockup-answer-trace/frames/01-snapshot.png`

mobile screenshot path: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-11T23-31-11_inline-knowledge-mockup-answer-trace/frames/01-snapshot.png`

comparison evidence: `/Users/jreye/Documents/greenhouse-eo/.captures/2026-06-11T23-31-10_inline-knowledge-mockup-answer-trace/comparison-source-vs-implementation.png`

viewport: desktop 1440x900; mobile iPhone 15

state: default authenticated dashboard mockup, Human mode, Sources tab

## Findings

No P0/P1/P2 blockers remain after the quality pass.

## Required Fidelity Surfaces

- Fonts and typography: passed. Runtime uses Greenhouse Poppins/Geist tokens; hierarchy is clear with one page title, compact panel titles, and dense body copy. Mobile wraps command/query text without clipping.
- Spacing and layout rhythm: passed. Desktop preserves the intended answer-trace split in the first fold. Mobile stacks command, trace steps, answer, and proof without horizontal clipping. The real Greenhouse shell is wider/darker than the source mock, but this is an intentional portal constraint.
- Colors and visual tokens: passed. Uses theme tokens and semantic MUI/Greenhouse tones; states include text plus badges/dots, not color alone.
- Image quality and asset fidelity: passed. No custom image assets were needed beyond the real app shell/avatar/Nexa mark already present in the product.
- Copy and content: passed. Reusable UX copy lives in `src/lib/copy/knowledge.ts`. Copy now distinguishes published-guide evidence from unqueried live operational data.

## Patches Made Since Previous QA Pass

- Added mode-context helper copy for Human/Nexa/MCP to clarify why the surface changes.
- Changed top action copy from `Enviar feedback` to `Reportar mejora`.
- Changed `Reportar gap` to `Reportar falta`.
- Rewrote partial-data warning to `No consulté datos actuales` with clearer recovery copy.
- Added copy-to-URI confirmation state with accessible label and icon change.
- Added feedback submit confirmation state with `role="status"`.
- Marked command/query fields read-only to avoid controlled input ambiguity.
- Fixed mobile trace rail from horizontal clipped rail to stacked vertical steps.

## Follow-Up Polish

- P3: Consider a compact mobile header variant for this mockup route if the page title and top actions feel too tall on iPhone-sized screens.
- P3: Add a small hover/focus preview for source chips once the prototype needs richer interactive review.
- P3: Promote repeated answer-trace regions into a primitive only after one more surface uses the same pattern.

final result: passed
