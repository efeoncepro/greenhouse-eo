# TASK-1628 — Globe Producer Credit Capacity Self-View Wireframe

## Product design source

- Direction mode: `source-led`.
- Approved durable source: `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
  y su prototipo versionado `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`.
- Frame/state adopted: control de créditos del header + popover del Producer ya portado por TASK-1559. Esta task
  corrige jerarquía y semántica dentro del pattern existente; no rediseña el shell ni crea otra superficie.
- Selected direction: effective capacity first, cuatro dimensiones contables separadas y una sola salida hacia
  Greenhouse para actores autorizados.
- Rejected alternatives: conservar ledger como cifra primaria; abrir readers admin al browser; crear una pantalla
  de administración dentro de Globe.
- Token mapping: Tailwind v4 consume el theme generado desde `tokens.ts`; ningún valor literal del prototipo entra
  a `className`.
- Baseline: `globe.creative-producer-surface` como fuente; el estado específico se promueve como
  `globe.producer.credit-capacity-self-view` después de la primera captura aceptada.

## Desktop 1440×1000

```text
┌ Producer header ──────────────────────────────────────────────┐
│ ...                                      [Disponible · 1.120] │
└───────────────────────────────────────────────────────────────┘
                                                   │ open
                                                   ▼
                                ┌ Capacidad de producción ──────┐
                                │ Disponible efectivo      1.120 │
                                │ Agosto 2026 · actualizado 8 s  │
                                │                                │
                                │ Período   350 usados            │
                                │           30 reservados         │
                                │           1.500 cap             │
                                │ Funding   1.200 vigente         │
                                │ Ledger    500.836 histórico     │
                                │ Fence     120 / 500 hoy         │
                                │                                │
                                │ Estado: Disponible              │
                                │ [Ver operaciones en Greenhouse] │
                                └────────────────────────────────┘
```

La cifra primaria siempre es `effectiveAvailable`. El ledger nunca usa el label `disponible` sin el calificativo
histórico/contable.

## Mobile 390×844

- El chip conserva estado + cifra corta; no fuerza scroll horizontal del header.
- El popover se posiciona dentro del viewport y usa filas label/value apilables.
- El deep link es la única navegación administrativa del rollout interno. No transporta authority y Greenhouse
  revalida sesión/entitlement; ocultarlo no es un control de seguridad.

## Required states

- Loading sin cero provisional.
- Healthy y low.
- Ledger positivo + effective cero.
- Funding ausente/vencido.
- Monthly cap agotado.
- Project paused/capped.
- Daily fence agotado.
- Policy ausente.
- Partial/stale/unknown.
- Permission denied y sanitized error.

## Implementation Mapping

- Surface: `../efeonce-globe/apps/studio-client/src/surfaces/producer/ProducerHeader.tsx`.
- Pattern: extender chip y `CreditsPopover` existentes.
- Data: `CreditCapacitySelfStatusV1`, sin math de dominio en browser.
- Action: deep link `/admin/globe/credits`; ningún command admin dentro de Globe.

## GVC Scenario Plan

- Scenario: `globe-producer-credit-capacity-self-view`.
- Viewports: 1440×1000 y 390×844, `qualityProfile: premium`.
- Captures: todos los required states, popover abierto y teclado/focus.
- Assertions: `scrollWidth === clientWidth`, cifra primaria effective, ledger secundario, sin raw errors/admin writes.
- Fixture scenario: auth/data deterministas, sin hardcodear ni leer perfiles Chrome.
- Live canary: exclusivamente la sesión Chrome autenticada indicada por el operador.

## Design Decision Log

- Se extiende el control existente; no nace otro widget.
- Se separan cuatro dimensiones: capacidad del período, funding, ledger y daily fence.
- Greenhouse es el destino administrativo por ADR-015.
- Motion no es protagonista: reduced motion abre/cierra sin transición y no hay count-up.
- Primitive decision: `extend` del chip/`CreditsPopover` local; no nueva primitive base.
- Recipe/CompositionShell: no aplica, porque es una interacción contextual dentro del header existente.
- Rejected: widget paralelo, budget rail nueva o modal; duplicarían jerarquía y administración.
