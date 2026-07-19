# Greenhouse UI Delivery Loop V1

Status: accepted
Last updated: 2026-05-11

## Purpose

This loop defines how agents deliver UI that is modern, usable, accessible, and repo-safe. It is designed to capture the speed of tools like Lovable and Google Stitch while preserving Greenhouse production quality.

## When Required

Run this loop for:

- new user-facing surfaces;
- meaningful redesigns;
- mockups requested for approval;
- "modern", "world-class", "enterprise", "Lovable", "Stitch", or similar quality requests;
- UI changes where mobile/responsive behavior is non-trivial.

## Loop

The single orchestrator is `greenhouse-ai-design-studio`.

1. **Intent + rigor** — user/job/decision/risk; `ui-lite|standard|platform`.
2. **Durable direction** — persist source or compare/select repo-native direction.
3. **Greenhouse mapping** — recipe, Shell, primitives, variants/kinds and tokens.
4. **UX + motion contracts** — states, copy, a11y, responsive and causal feedback.
5. **Readiness** — substantive contract gate; no JSX while failing.
6. **First fold** — build/capture desktop+mobile composition only.
7. **Checkpoint** — `ACCEPT FIRST FOLD` or revise exact findings.
8. **Full build** — behavior, data, access, states, keyboard and reduced motion.
9. **GVC premium** — capture then generate/review dossier.
10. **Visual scorecard** — fourteen dimensions; surface economy and visual impact are critical floors; iterate to threshold.
11. **Implementation + enterprise gates** — neither may `BLOCK`.
12. **Verify and close** — four UI gates, tests, QA and docs.

## Screenshot Requirements

Minimum:

- desktop: 2048x1280 or similar
- laptop: 1440x900/1000
- mobile: 390x844

Capture after meaningful layout changes and after final polish. Primary evidence must be the structured `.captures/<ISO>_<scenario>/` output: `.webm`, marker PNG frames, `manifest.json`, optional `flipbook.gif`, and `review-dossier.md` when using `pnpm fe:capture:review`.

For `ui-standard`/`ui-platform`, `review-dossier.md` is required and the scenario
declares `qualityProfile: 'premium'`. Source-led work declares a durable
baseline. A versioned scorecard under `docs/ui/reviews/` links desktop/mobile
frames and passes the premium standard thresholds.

Use `pnpm fe:capture:diff <previous-run> <current-run>` for before/after comparisons and `pnpm fe:capture:health` before long review loops. A focused Playwright/Chromium script is allowed only when console logs, network/API payloads, local-only auth state, or an unsupported interaction is required; keep its artifacts under `.captures/`, explain why the canonical helper was insufficient, and prefer promoting the flow to a scenario afterwards.

## Stop Conditions

Do not ship UI if:

- enterprise review is `BLOCK`;
- mobile screenshot has clipping or unusable layout;
- primary action is unclear;
- partial/degraded state is misleading;
- verification commands fail.

## Notes

This process is proportional. Small local polish can use a lightweight pass. High-impact product surfaces must use the full loop.
