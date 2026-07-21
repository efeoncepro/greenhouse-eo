# TASK-1483 — Globe Credits Operations Workbench Wireframe

## Desktop 1440

```text
┌ Globe / Credits ─ Workspace ─ Period ─ Freshness ─ Audience ───────────┐
│ RUNWAY:  Available ━━ Reserved ━━ Consumed     Horizon / confidence      │
├───────────────────────────────────────────────┬──────────────────────┤
│ POOLS / PROJECT BUDGETS                       │ RISK RAIL            │
│ Workspace pool > Campaign A > Social         │ low / hold / drift   │
├───────────────────────────────────────────────┴──────────────────────┤
│ LEDGER  filters: period project source type capability run          │
│ time | entry | credits | pool/project | actor | run | status        │
└──────────────────────────────────────────────────────────────────────┘
                                           [DETAIL / COMMAND SIDECAR ->]
```

## Mobile 390

- Sticky workspace/period/audience y runway textual compacto.
- Risk rail como lista priorizada; pools y ledger usan list-detail.
- Sidecar/drawer ocupa viewport, trap/restore de foco y dirty-close guard.
- Sólo scroller interno etiquetado cuando una tabla no admita representación lista.

## Required states

Loading por región; first allocation empty; healthy; low/exhausted; reservation-heavy; paused; expiring o
expiry-disabled; stale/partial/insufficient forecast; anomaly/drift; proposal pending/expired; conflict;
idempotent replay; denied; redacted; cross-workspace deny; sanitized error; success con ledger entry.

## Command sidecar

`select target -> propose -> server impact/preconditions/fingerprint/TTL -> confirm + reason/evidence -> execute
-> canonical refresh -> ledger/audit link`. No optimistic balance ni UI rollback.

## Accessibility

H1 y sections; runway con alternativa textual/tabular exacta; 44px compact targets; named rows/actions;
keyboard list-detail; polite live region sólo al completar cambio material; IDs y valores accesibles.

## GVC

Scenario: `scripts/frontend/scenarios/globe-credits-operations-workbench.scenario.ts`. Capturas 1440×1000 y
390×844: healthy, low, paused, drift, filtered+sidecar, proposal/confirm, denied/redacted, empty, error,
reduced motion y keyboard. Assert `scrollWidth <= clientWidth`, no raw errors/secrets/cost/margin no autorizado.
