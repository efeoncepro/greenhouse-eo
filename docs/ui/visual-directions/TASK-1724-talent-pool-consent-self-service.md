# TASK-1724 — Talent Pool Consent and Self-Service Visual Direction

## Direction mode

`repo-native-benchmark`. Sources: Careers/apply from TASK-354/1688, the public Greenhouse form language, the
`settingsFlow` recipe, AXIS/MUI runtime primitives and the official Chrome Modern Web Guidance for native form
semantics, validation timing, dialogs and focus. Brand remains Efeonce on public surfaces; Greenhouse internal
chrome never appears.

## Alternatives

### A — One checkbox only

Add an optional Talent Pool checkbox below mandatory process consent. Lowest friction, but no durable place to
explain expiry, update availability or withdraw. Rejected as incomplete and likely to make consent feel bundled.

### B — Two-moment trust flow — selected

Keep a short independent opt-in in apply, then provide a tokenized self-service page for confirmation, purpose,
expiry, availability and withdrawal. The first fold is a calm trust sheet, not an account dashboard. It separates
“this application” from “future opportunities” and keeps every action explicit.

### C — Candidate portal/account

Create login, profile completion and opportunity feed. Rejected for V1: introduces identity/account recovery,
content and engagement obligations beyond a consent surface.

## Selected thesis

- Reading order: purpose → data used → duration/status → action → privacy/help.
- One dominant paper surface; no card grid, progress gamification or marketing pressure.
- The dominant visual moment is the trust ledger: status, purpose, duration and candidate control read as one
  editorial sequence, not as equal widgets.
- Mandatory application consent and optional future-opportunity consent are visually and semantically independent.
- Withdrawal is as easy to find and execute as opt-in; expired/invalid tokens reveal no candidate existence.

## Decision

Select direction B, a two-moment trust flow. It is the smallest composition that makes future-opportunity consent
independent, understandable and reversible without creating a candidate account or hiding policy in legal copy.

## Desktop target

At 1440px the existing apply rhythm remains intact; self-service becomes one centered settings-flow paper with
purpose/status, evidence classes, availability and actions in that order. No dashboard chrome or card grid.

## Mobile target

At 390px all copy wraps, actions stack in semantic order, dialogs fit the viewport and neither consent nor expiry
truncates. The document and every control satisfy `scrollWidth <= clientWidth`.

## Token mapping

Use existing public Careers typography/brand tokens plus MUI/AXIS semantic surface, border, spacing, focus and state
tokens. The implementation contains no literal color, radius, spacing or timing values.

## Desktop and mobile targets

- Desktop 1440px: public shell, centered content width, one trust sheet with clear sections and a quiet evidence rail.
- Mobile 390px: single column, sticky-safe primary action, full labels, no truncated policy/expiry text, no horizontal scroll.
- 200% zoom and keyboard preserve order; status is never conveyed only by color.

## Token and system mapping

- Public Efeonce typography/brand tokens from the existing Careers shell.
- MUI/AXIS semantic surfaces, borders, spacing, focus and state tokens; no literal HEX/px values in product code.
- `SurfaceRecipe kind='settingsFlow'` semantics are materialized through the existing public Careers shell and its
  route-local trust sheet. No internal dashboard chrome and no new platform primitive.
- Motion limited to tokenized disclosure/status feedback; reduced motion resolves immediately to the same state.

## Product UI and modern-web decision

- Pattern: public `settingsFlow`, one dominant contained trust sheet with open editorial sub-sections.
- Primitive lookup: reuse the Careers public shell, `GreenhouseButton`, MUI form controls, `Alert`, `Chip` and
  `Dialog`; do not create local substitutes or a new design-system primitive.
- Semantics: native form controls and DOM order; validation appears after interaction/submit and clears when fixed.
- Confirmation: withdrawal is modal because it changes a legal state; MUI `Dialog` supplies focus trap, Escape and
  focus restoration while preserving the same semantics recommended for native `<dialog>`.
- Feedback: one persistent polite live region receives authoritative server receipts; errors remain adjacent and
  persistent, not toast-only.
- Typography: one Poppins page identity; Geist for purpose, controls, metadata and receipts. Copy measure remains
  readable and status/expiry never truncate.

## Signature details

- A plain-language “Qué significa” ledger with purpose, evidence classes and expiry.
- Independent consent controls with short reason text, not a dense legal block.
- Status header states `En el banco`, `Sólo este proceso`, `Retirado` or `Vencido` with explicit next action.

## Anti-patterns

- Prechecked/bundled consent, dark patterns, urgency, countdowns or “mejora tus posibilidades”.
- A generic settings dashboard, celebratory confetti, card soup or fake profile completeness score.
- Showing application status, other openings, internal notes, assessment results or dedupe outcome.
