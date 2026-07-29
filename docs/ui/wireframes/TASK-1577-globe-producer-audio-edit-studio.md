# TASK-1577 — Globe Producer Audio Edit Studio

## Visual direction

- Thesis: **Sonic Edit Desk** — el sonido sigue siendo protagonista mientras la edición se vuelve visible y controlable.
- Reuse: Sonic Canvas, AudioDock, waveform real, transcript lane y primitives existentes.
- No-goal: DAW ni consola de proveedor.

## Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Producer / feed                                                          │
│                                                                            │
│ Sonic Stage                                                               │
│ ┌─────────────────────────────────────────────┬──────────────────────────┐ │
│ │ waveform + playhead + transcript            │ Editar audio             │ │
│ │ [play] [00:12.4 / 00:31.0] [solo/mute]      │ [Voz] [SFX] [Música]      │ │
│ │ ├──────────── rango seleccionado ────────┤  │ [Limpiar]                │ │
│ └─────────────────────────────────────────────┴──────────────────────────┘ │
│ Capa: [Diálogo] [Música] [Ambiente] [SFX]                                  │
│ Cambiar / agregar / limpiar…                                               │
│ Preservar: [voz] [emoción] [timing] [ambiente]                             │
│ Ruta compatible · rights · costo estimado                   [Editar audio] │
└────────────────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe (390px)

```text
┌───────────────────────────────┐
│ ← Editar audio                │
│ waveform + playhead           │
│ [play] 00:12.4 / 00:31.0      │
│ transcript phrase             │
│ [Diálogo] [Música] [SFX]      │
│ Cambiar / agregar…            │
│ Preservar voz y timing        │
│ Ruta · derechos · costo       │
│ [Editar audio]                │
└───────────────────────────────┘
```

## Implementation Mapping

- Surface: `/producer` → `SonicStage`/`AudioDock`.
- Pattern: contextual `AudioEditRail`; no second player.
- Source: waveform/transcript/layers from governed readers.
- Copy: `producerAudioEdit` namespace.

## GVC Scenario Plan

- Quality profile: `premium`.
- Viewports: desktop 1440px and mobile 390px.
- Captures: default, selected range, layer selection, estimate, gated, running, result, compare and degraded.
- Assertions: playback único, focus restore, reduced motion and `scrollWidth === clientWidth`.

## Design Decision Log

- Use temporal range + semantic layer instead of spatial mask.
- Keep provider hidden from primary UI; expose capability/fidelity and rights state.
- Reuse Sonic Canvas and create only a scoped rail if primitive lookup requires it.
