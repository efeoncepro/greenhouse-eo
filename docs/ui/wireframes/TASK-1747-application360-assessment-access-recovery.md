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

- Scenario: `assessment-access-recovery` with synthetic fixture.
- Viewports: 1440px and 390px.
- Capture: no-test, unknown lifecycle, delivered, recovery channel selector, secure-link one-time success, error and permission denied.
- Assertions: accessible labels/focus restore; no page overflow; no raw link after dialog close/reload.

## Design Decision Log

- Selected lifecycle strip + compact recovery cluster over persistent link or separate page.
- The card remains the owner of assessment context; recovery dialog is deliberate because it invalidates a credential.
- No new navigation, no motion and no card-within-card treatment.
