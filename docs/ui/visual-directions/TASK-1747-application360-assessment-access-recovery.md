# TASK-1747 — Dirección visual: recuperación de acceso al test

## Source and mode

- Mode: `repo-native-benchmark`
- Surface: Application 360 → tab Evaluación → card de assessment.
- Targets: desktop 1440px and compact 390px.
- Constraint: this is an extension of an operational card, not a new dashboard or navigation destination.

## Alternatives

1. **Link persistente inline.** Rejected: creates a misleading/stale bearer credential after token rotation.
2. **Página separada de soporte.** Rejected: separates the recovery decision from candidate, assessment and delivery evidence.
3. **Lifecycle strip + deliberate recovery cluster.** Selected: keeps status, next action and proof in one compact operational surface.

## Selected thesis

The assessment card remains one dominant paper surface. A terse lifecycle row gives the operator the fact first; a single action hierarchy follows it: assign only when no assessment exists, recover when one is open, review only when work exists. Recovery is a small Dialog, not an always-visible link or nested card.

## Token and primitive mapping

| Intent | Greenhouse implementation |
|---|---|
| Assessment lifecycle | existing `GreenhouseChip` status variant plus textual status label |
| Delivery uncertainty | `Alert`/caption with semantic warning/info tone, never color-only |
| Primary operator action | existing `GreenhouseButton` contained action |
| Exceptional recovery | outlined/text action in the same action cluster |
| Secure link reveal | `Dialog` with explicit expiry/copy action and focus trap |
| Layout | theme spacing/radius/elevation only; no literal values or color strings |

## Signature details and anti-patterns

- Status communicates a fact and next step; it is not a decorative traffic-light strip.
- Do not add KPI cards, persistent URL text, colored rails or a card inside the card.
- At 390px, actions stack after the status line and the current value never clips.
- Copy says “aceptado para envío” or “entregado” precisely; it never promises inbox receipt from a dispatch record.

## Direction decision log

- Reuse existing assessment card and MUI/Greenhouse primitives.
- Extend local composition only; no global primitive unless implementation finds repeated cross-domain need.
- Motion is intentionally absent; recovery confidence comes from clear state and focus behavior, not animation.
