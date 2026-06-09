# TASK-357 — Assigned Team Approved Mockup

## Approved Evidence

- Approved desktop first fold: `docs/mockups/TASK-357/assigned-team-command-portfolio-approved.png`
- Approved talent dossier state: `docs/mockups/TASK-357/assigned-team-dossier-approved.png`
- Approved intelligence band: `docs/mockups/TASK-357/assigned-team-intelligence-band-approved.png`
- Source GVC run: `.captures/2026-06-09T11-16-25_assigned-team-command-portfolio-mockup`
- Route used for approval: `/equipo/mockup`
- Scenario: `scripts/frontend/scenarios/assigned-team-command-portfolio-mockup.scenario.ts`
- Approval date: 2026-06-09

## Runtime Contract

This mockup is the approved product/design target for `TASK-357` through `TASK-366`.

When implementing runtime, agents must not treat this as a static UI-only artifact. Every visible capability in the approved surface must map to a real contract:

- Portfolio and roster data must come from `TASK-358` semantic readers.
- Field visibility and premium degradation must come from `TASK-359` policy.
- Cards, badges, bars, verification marks, health surfaces and attention lists must be promoted through `TASK-360` shared UI primitives/cards where reusable.
- `/equipo` runtime parity belongs to `TASK-361`.
- The dossier/side rail belongs to `TASK-362`.
- Capacity, health, coverage and capability signals belong to `TASK-363`.
- Attention, risk and continuity signals belong to `TASK-364`.
- Dashboard/Home/Organization snippets belong to `TASK-365`.
- Freshness, export, observability and rollout hardening belong to `TASK-366`.

## Gap Loop

If a runtime implementer finds a visible element in the approved mockup without a backend/model/source-of-truth contract, they must add the missing data/model/API work to the relevant task before shipping the UI.

If a backend capability already exists but is not represented in the approved UI, the implementer must run the same product-design + GVC loop used here before adding it to runtime UI:

1. Map source-of-truth and policy.
2. Add or extend shared UI primitive/card only when reusable.
3. Update `/equipo/mockup` or the relevant mockup route.
4. Run `pnpm fe:capture assigned-team-command-portfolio-mockup --env=local`.
5. Inspect frames and iterate until enterprise-grade.
6. Only then copy/paste/adapt into runtime.

## Final QA

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/views/greenhouse/assigned-team/mockup/AssignedTeamCommandPortfolioMockupView.tsx`
- `pnpm fe:capture assigned-team-command-portfolio-mockup --env=local`

Final GVC status: passed, desktop and mobile, enterprise rubric pass.
