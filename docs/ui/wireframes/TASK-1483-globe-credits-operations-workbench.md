# TASK-1483 — Greenhouse Globe Credits Operations Workbench Wireframe

Canonical route: `/admin/globe/credits`. Globe Producer is a separate read-only consumer owned by TASK-1628.

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`
- Visual direction mode: `repo-native-benchmark`

## Desktop Target — 1440x1000

El first fold coloca capacidad, estado y una única acción primaria antes del inventario operacional. La zona
inferior conserva list-detail para pools, operaciones y ledger sin competir con la lectura de capacidad.

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

## Mobile Target — 390x844

- Sticky workspace/period/audience y runway textual compacto.
- Risk rail como lista priorizada; pools y ledger usan list-detail.
- Sidecar/drawer ocupa viewport, trap/restore de foco y dirty-close guard.
- Sólo scroller interno etiquetado cuando una tabla no admita representación lista.

## Action Hierarchy

`Asegurar capacidad` es la única acción primaria y sólo aparece con authority server-side. Preview, confirmación
y recovery viven en el contexto de la operación; filtros y selección son secundarios. No existe undo sin command
compensatorio.

## Visual Fidelity Mapping

Runway Control Plane mapea a `SurfaceRecipe operationalWorkbench`, `WorkbenchHeader`, `SignalStrip` y
`OperationalSection`. Profundidad, color, densidad y spacing provienen de AXIS/Greenhouse; no se introducen
literals visuales ni una cuadrícula de cards genéricas.

## Copy Ledger

| id | región | texto visible |
| --- | --- | --- |
| credits.title | header | Operaciones de créditos de Globe |
| credits.ensure | acción | Asegurar capacidad |
| credits.reconcile | recovery | Verificar y reconciliar |
| credits.ledger | evidencia | Ledger de créditos |

## State Copy

| state | título visible | recuperación |
| --- | --- | --- |
| ready | Capacidad disponible | Revisar evidencia o asegurar el período |
| loading | Consultando capacidad | Esperar sin mostrar cero provisional |
| empty | Aún no hay operaciones | Asegurar capacidad si la autoridad lo permite |
| partial | Información parcial | Reintentar sólo la sección no disponible |
| error | No pudimos consultar esta sección | Reintentar la lectura |
| denied | Acceso restringido | Solicitar el entitlement correcto |

## Accessibility Contract

Orden H1→secciones, selección por teclado, focus restore en dialog/drawer, estados no dependientes de color,
targets cómodos y live region sólo para cambios materiales. Mobile debe mantener
`scrollWidth === clientWidth`.

## Required states

Loading por región; first allocation empty; healthy; low/exhausted; reservation-heavy; paused; expiring o
expiry-disabled; stale/partial/insufficient forecast; anomaly/drift; proposal pending/expired; conflict;
`selection_required`; `second_actor_required`; confirming; confirm_failed; completed; reconciled; fingerprint
mismatch; timeout recovered; timeout outcome unknown; idempotent replay; denied; redacted; cross-workspace deny;
sanitized error; success con ledger entry.

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

- Quality profile: premium.
- Fixture scenario: route determinista `/admin/globe/credits` con auth/data fixture; no hardcodea ni lee perfiles.
- Live canary: misma route usando exclusivamente la sesión Chrome autenticada indicada por el operador.
- Viewports: 1440×1000 y 390×844; `qualityProfile: premium`.
- Captures: healthy, ledger positivo/effective cero, pool vencido, monthly cap, project cap/paused,
  stale/partial, selection required, second actor required, proposal pending/expired, confirming, confirm failed,
  completed, fingerprint mismatch, agent confirm/deny/over-limit, timeout recovered/unknown y reconciled.
- Assertions: una CTA primaria, cero raw error/secret/cost/margin, focus restore, reduced motion y
  `scrollWidth === clientWidth`.
- Review dossier: `docs/ui/reviews/TASK-1483-globe-credits-operations-workbench-first-fold-review-2026-08-01.md`.
- Baseline: se decide después del rollout; el corte local permanece como evidencia, no baseline de producción.
- Scroll-width checks: desktop y 390px mobile.

## Design Decision Log

- Se conserva Runway Control Plane porque prioriza operabilidad y evita metáforas wallet/crypto.
- Se reubica de Globe a Greenhouse por ADR-015.
- Se reusan primitives Greenhouse; el runway permanece composición local hasta demostrar reuso real.
