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

1. **Intent**
   - user, job, primary decision, risk.
2. **Design Architecture**
   - invoke `product-design-architect-2026`.
3. **Visual Direction**
   - invoke `ai-ui-generation-director` when alternatives or high-fidelity direction are needed.
4. **UX and Accessibility**
   - invoke UX/content skill for labels, state language, error recovery, accessibility.
5. **Microinteractions**
   - invoke `microinteraction-systems-architect`.
6. **Greenhouse Mapping**
   - invoke `greenhouse-product-ui-architect`.
7. **Implementation Review**
   - invoke `frontend-product-implementation-reviewer`.
8. **Build**
   - implement in the repo or mockup route.
9. **Screenshot QA**
   - capture desktop, laptop, mobile with `pnpm fe:capture` or `pnpm fe:capture:review`; use scenario files for repeated or interactive flows and `--route` only for quick route evidence.
10. **Critique**
   - invoke `visual-regression-product-critic`.
11. **Enterprise Gate**
   - invoke `greenhouse-ui-enterprise-review`.
12. **Verify**
   - run relevant lint/type/test/design checks.
13. **Close**
   - document what changed, what was validated, and any remaining risk.

## Screenshot Requirements

Minimum:

- desktop: 2048x1280 or similar
- laptop: 1440x900/1000
- mobile: 390x844

Capture after meaningful layout changes and after final polish. Primary evidence must be the structured `.captures/<ISO>_<scenario>/` output: `.webm`, marker PNG frames, `manifest.json`, optional `flipbook.gif`, and `review-dossier.md` when using `pnpm fe:capture:review`.

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
