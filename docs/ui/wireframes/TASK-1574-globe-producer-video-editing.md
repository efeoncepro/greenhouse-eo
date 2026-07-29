# TASK-1574 — Globe Producer Video Editing

## Visual direction

- Thesis: **Temporal Edit Desk** — la toma permanece visible mientras el usuario define qué cambiar, qué preservar y
  en qué momento.
- Reuse: Cinematic Canvas de `TASK-1570`, `MediaStage`, timeline real, MediaDock y primitives existentes.
- No-goal: construir una suite de montaje tipo Premiere o un editor de máscaras temporales.

## Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Producer shell / feed                                                      │
│                                                                            │
│ Cinematic Stage                                                            │
│ ┌─────────────────────────────────────────────┬──────────────────────────┐ │
│ │                                             │ Editar video              │ │
│ │              video stage                    │ [Editar toma]             │ │
│ │                                             │ [Continuar edición]       │ │
│ │ [play] [00:02.4 / 00:06.8] [mute]          │                          │ │
│ └─────────────────────────────────────────────┴──────────────────────────┘ │
│ [Escena 01] [Escena 02] [Escena 03]                                        │
│                         ├──── intervalo ────┤                              │
│                       00:02.4             00:06.8                          │
│                                                                            │
│ Edit Rail                                                                  │
│ Cambiar: [Agregar] [Eliminar] [Reemplazar] [Cambiar acción]                │
│ Referencias: [Objeto] [Personaje] [Estilo] [Movimiento]                   │
│ Describe el cambio…                                                        │
│ Preservar: [Cámara] [Sujeto] [Timing] [Audio si es compatible]             │
│ Ruta compatible · costo estimado                            [Editar toma]  │
└────────────────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe (390px)

```text
┌───────────────────────────────┐
│ ← Editar video                │
│                               │
│         video stage           │
│ [play] 00:02.4 / 00:06.8      │
├───────────────────────────────┤
│ [Escena 01] [Escena 02]       │
│ ├──── intervalo ────┤         │
│ [Editar toma]                │
│ [Agregar] [Eliminar]         │
│ [Reemplazar]                 │
│ Referencias con rol          │
│ Describe el cambio…          │
│ Preservar cámara y sujeto    │
│ Costo estimado               │
│ [Editar toma]                │
└───────────────────────────────┘
```

## Component and token mapping

- Surface: `/producer` → `CinematicStage`/`MediaDock` de `TASK-1570`.
- Pattern: `VideoEditRail` contextual; no second player or route.
- Timeline: consume derivative/projection real; no synthetic progress or invented scene map.
- References: role chips/cards, no untyped file drawer.
- Copy: `apps/studio-client/src/copy/` namespace `producerVideoEdit`.
- Typography: Poppins sólo para display; Geist para controls, metadata and state.

## State inventory

- Eligible generated video, eligible external video, missing governance, no editable interaction.
- Scene selected, interval selected, whole-shot, prompt empty/ready, reference roles pending/ready.
- Route available/gated/unsupported, estimate loading/stale/available/insufficient.
- Preparing, running, result ready, degraded, provider failure, unknown outcome, retryable.
- Mobile, keyboard/focus, reduced motion, no audio, audio preservation unsupported.
