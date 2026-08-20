# TASK-1747 — Wireframe: Application 360 Assessment Access Recovery

## Product design source

- Direction: [TASK-1747 visual direction](../visual-directions/TASK-1747-application360-assessment-access-recovery.md)
- Mode: `repo-native-benchmark`
- Surface: existing Application 360, Evaluación tab; no navigation destination.

## Desktop wireframe

```text
┌ Evaluation by competency ────────────────────────────────────────┐
│ Test del candidato     [Enviado]                                  │
│ EO-ASM-0042 · 45 minutos                                         │
│                                                                    │
│ Estado de entrega: Aceptado para envío · sin confirmación          │
│ [Reenviar por email]  [Generar enlace temporal]   [Revisar ...]  │
│                                                                    │
│ Alert contextual: No confirma recepción. Si la candidata no lo    │
│ recibió, recupera acceso mediante uno de los canales.             │
└──────────────────────────────────────────────────────────────────┘
```

If no assessment exists, the recovery cluster is absent and the only primary action is `Asignar test` through the policy proposal/confirmation flow. If the test is terminal, all recovery actions are absent and the card explains why.

## Compact wireframe (390px)

```text
┌ Test del candidato                   [Enviado] ┐
│ EO-ASM-0042 · 45 minutos                        │
│ Aceptado para envío · sin confirmación          │
│ [Reenviar por email                    ]        │
│ [Generar enlace temporal               ]        │
│ [Revisar evaluación                    ]        │
└────────────────────────────────────────────────┘
```

## Recovery dialog

```text
┌ Recuperar acceso al test ──────────────────────────┐
│ Generarás un enlace nuevo. El anterior dejará de    │
│ funcionar.                                          │
│ Canal: ( ) Email   ( ) Enlace temporal              │
│ Motivo: [No recibió el correo                    ]  │
│ [Cancelar]                 [Confirmar recuperación] │
└────────────────────────────────────────────────────┘

success / secure-link only
┌ Enlace temporal listo ─────────────────────────────┐
│ Se muestra una sola vez. Compártelo solo con la     │
│ candidata y considera su vencimiento.               │
│ [Copiar enlace]                                     │
│ [Cerrar]                                             │
└────────────────────────────────────────────────────┘
```

## Implementation Mapping

- Route/surface: `Application360View.tsx`, Evaluation tab.
- Reuse: assessment card, `GreenhouseChip`, `GreenhouseButton`, `Alert`, `Dialog`, `Snackbar`.
- Data: canonical assignment, delivery lifecycle and recovery DTOs only.
- Copy: Hiring Desk dictionary, es-CL + locale peer.
- Browser boundary: no token is persisted in URL, storage, toast or reloadable component state.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1747-assessment-access-recovery.scenario.ts`
- Route: `/agency/hiring/applications/[id]?tab=assessment`
- Viewports: `desktop` 1440x900 y `mobile` iPhone 13 (390px).
- Quality profile: `premium`.
- Required captures: `assessment-tab-full` (fullPage), `recovery-cluster` (clip del cluster).
- Required `data-capture` markers: `hiring-application-tabs`, `assessment-scorecard`,
  `assessment-access-recovery`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, y `notVisible` sobre
  `a[href*="/public/assessment/access"]` — la pantalla NUNCA vuelve a mostrar una credencial, que es
  la causa directa del incidente del 2026-08-19.
- Keyboard probe: `recovery-cta-focus` desde el CTA del cluster, con `reducedMotionCheck`.
- Scroll-width check: cubierto por el gate de layout sobre `assessment-scorecard`.

**No cubierto por el escenario, y se declara para que nadie lo dé por hecho:** la revelación única
del enlace exige una emisión REAL (rotaría el acceso de una candidata real y consumiría su cuota de
24 h), y el estado `provider_blocked` exige una dirección con rebote registrado. Ambos se verifican
en la secuencia de staging del Rollout Plan, no en la captura. El escenario NO es `mutating`: abre
la superficie, nunca confirma.

## Design Decision Log

- Selected lifecycle strip + compact recovery cluster over persistent link or separate page.
- The card remains the owner of assessment context; recovery dialog is deliberate because it invalidates a credential.
- No new navigation, no motion and no card-within-card treatment.
