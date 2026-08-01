# TASK-1483 — Greenhouse Globe Credits Operations Workbench Wireframe

Canonical route: `/admin/globe/credits`. Globe Producer is a separate read-only consumer owned by TASK-1628.

## Desktop 1440

```text
┌ Admin / Globe / Credits ─ Workspace ─ Period ─ Freshness ─────────────┐
│ CAPACIDAD: Effective ━━ Cap / spent / held ━━ Funding ━━ Ledger history │
│ BLOCKER / NEXT ACTION                                      [Ensure cycle] │
├───────────────────────────────────────────────┬──────────────────────┤
│ OPERATIONS / POOLS / PROJECT BUDGETS          │ RISK RAIL            │
│ Pending · expired · outcome unknown           │ low / hold / drift   │
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

`status -> preview exacto -> proposal durable -> confirm humano/agente según policy -> execute -> operation/status
readback -> ledger/audit link`. Un solo `operationKey`; no optimistic balance ni retry ciego.

`outcome_unknown` conserva el sidecar y ofrece `Verificar estado`; nunca `Reintentar fondeo`.

## Implementation Mapping

- Route: `src/app/(dashboard)/admin/globe/credits/page.tsx`.
- View: `src/views/greenhouse/admin/globe/credits/**`.
- Reuse: `CompositionShell`, `WorkbenchHeader`, `SignalStrip`, `OperationalSection`, `InventoryList`,
  `SelectionRow`, `AdaptiveSidecarLayout`, `ContextualSidecar`, `ContextCommandBar` y `Dialog`.
- Route-local composition: capacity/runway plane; no primitive base nueva hasta existir un segundo consumer.
- Data: TASK-1586 status/preview/operations + TASK-1629 confirm/readback.

## GVC Scenario Plan

- Route: `/admin/globe/credits` con sesión admin autenticada.
- Viewports: 1440×1000 y 390×844; `qualityProfile: premium`.
- Captures: healthy, ledger positivo/effective cero, pool vencido, monthly cap, project cap/paused,
  stale/partial, proposal pending/expired, human confirm, agent confirm/deny/over-limit, outcome unknown y reconcile.
- Assertions: una CTA primaria, cero raw error/secret/cost/margin, focus restore, reduced motion y
  `scrollWidth === clientWidth`.

## Design Decision Log

- Se conserva Runway Control Plane porque prioriza operabilidad y evita metáforas wallet/crypto.
- Se reubica de Globe a Greenhouse por ADR-015.
- Se reusan primitives Greenhouse; el runway permanece composición local hasta demostrar reuso real.

## Accessibility

H1 y sections; runway con alternativa textual/tabular exacta; 44px compact targets; named rows/actions;
keyboard list-detail; polite live region sólo al completar cambio material; IDs y valores accesibles.

## GVC

Scenario: `scripts/frontend/scenarios/globe-credits-operations-workbench.scenario.ts`. Capturas 1440×1000 y
390×844: healthy, low, paused, drift, filtered+sidecar, proposal/confirm, denied/redacted, empty, error,
reduced motion y keyboard. Assert `scrollWidth <= clientWidth`, no raw errors/secrets/cost/margin no autorizado.
