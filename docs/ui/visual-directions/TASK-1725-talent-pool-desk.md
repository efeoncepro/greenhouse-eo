# TASK-1725 — Talent Pool Desk Visual Direction

## Direction mode

`repo-native-benchmark`. Sources: Hiring Desk/Application 360, SurfaceRecipe `listDetail`, WorkbenchHeader and the
enterprise analysis-sheet standard. Greenhouse internal chrome and Hiring terminology remain authoritative.

## Alternatives

### A — Candidate card gallery

Visually approachable but weak for comparison, coverage and freshness; tends toward card soup and photo-led bias.
Rejected.

### B — Talent Kanban

Useful for stages, but Talent Pool is not another pipeline and a person may relate to multiple openings. Rejected
because it would duplicate TASK-355 semantics.

### C — Evidence workbench — selected

A dense searchable inventory with one comparison plane and an anchored profile/evidence inspector. The first fold
answers “who is discoverable, why, how fresh and what action is allowed?” without inventing a fit score.

## Decision

Select the evidence workbench. It optimizes repeated sourcing and comparison while preserving person-first identity,
application lineage and a visible permission/contactability boundary.

## Desktop target

At 1440px a shared WorkbenchHeader carries title, scope, freshness and one primary action. Filters sit above one
dominant table/list plane; selecting a row opens an in-flow AdaptiveSidecar with profile, evidence timeline and actions.

## Mobile target

At 390px filters collapse behind the canonical disclosure and results become compact rows. Selection navigates to a
full-width detail state rather than compressing a sidecar. Back restores query, cursor, selection and focus.

## Token mapping

Use SurfaceRecipe/listDetail, WorkbenchHeader, Greenhouse table/list, chips, disclosure, sidecar, dialog and MUI/AXIS
tokens. No candidate photos, traffic-light backgrounds, literal values or custom card primitive.

## Signature details

- Evidence coverage/freshness appears in the row, not hidden in profile.
- “Por qué aparece” uses source-linked reason lines, never an opaque percentage.
- Allowed action is explicit: `Invitar`, `Requiere autorización`, `No contactar` or `Retirado`.

## Anti-patterns

- Fit score, leaderboard, profile photos, swiping, card gallery, colored status rails or another pipeline board.
- Email/phone/CV preview in search results, inferred protected attributes or a one-click irreversible invite.

