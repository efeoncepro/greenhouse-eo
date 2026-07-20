# TASK-1505 — Globe Creative Producer Surface Wireframe

## Visual direction

El Creative Producer es una **consola de producción prompt-first**: el composer y el feed de candidatos son el
momento visual dominante; los controles (ruta, output-shape, estimación) son instrumentos precisos, nunca cards
equivalentes compitiendo por atención. La dirección se ancla en la **referencia Higgsfield (Image/Video/Audio)**
—su lógica de "prompt bar + selector de modelo + shape + Generate con costo + feed"— **ADAPTADA** a la marca
Globe, los tokens AXIS (`theme.palette.*` / `theme.axis.*`, nunca HEX/px/fontFamily crudos), la Composition
Shell y los primitives de Globe. **Nunca se copia el look de Higgsfield.** Este documento fija estructura y
contrato, no valores literales.

## Directions considered

1. **Prompt form + resultados (clásico):** simple, pero template genérico, sin momento visual dominante; débil
   para un feed cross-modal rico. Rechazada.
2. **Superficie por modalidad separada (3 páginas):** clara por modalidad, pero rompe el feed unificado
   cross-modal y triplica el chassis. Rechazada.
3. **Producer Console — seleccionada:** un chassis compartido (Modality band + Composer + Generation Feed +
   Candidate Viewer) con paneles por modalidad que adaptan **dentro** de la región Composer (The Seam). Preserva
   craft, mantiene bajo el ceremony y hace visibles el contrato discriminado, el estimate y el retrieval que el
   Workbench (`TASK-1474`) reutiliza.

## Desktop wireframe (chassis compartido)

```text
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Globe · Producer      [ Imagen | Video | Audio ]           Créditos: ●●●○  ·   Operador │  ← Modality band
├──────────────────────────────────────────┬────────────────────────────────────────────┤
│ COMPOSER (dominante, prompt-first)        │ GENERATION FEED (unificado cross-modal)     │
│                                           │ "Mis generaciones"                          │
│ ┌───────────────────────────────────────┐│ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │  Describe lo que quieres crear…       ││ │ [IMG]  │ │ [VID▶] │ │ [AUD∿] │  …feed       │
│ │  [ + agregar ref ]  [ @ mencionar ]   ││ │ ruta   │ │ ruta   │ │ ruta   │            │
│ └───────────────────────────────────────┘│ │ recipe │ │ recipe │ │ recipe │            │
│                                           │ └────────┘ └────────┘ └────────┘            │
│ Modo:   (por modalidad — ver paneles)     │  hover/focus → Asset Action Bar:            │
│ Ruta:   [ Seedance · 2.0 ▾ ]  ⓘ HD·idiomas │  [preview] [descargar] [★ favorito]         │
│                                           │  [usar como referencia] [↻ Recrear]         │
│ Output-shape:  (tray discriminado)        │                                             │
│   (image: Calidad · Proporción · Cantidad)│                                             │
│                                           │                                             │
│ ┌──────────────────────────────┐          │                                             │
│ │        Generar   ✨24         │  ← estimate inline pre-spend (ruta × shape)            │
│ └──────────────────────────────┘          │                                             │
└──────────────────────────────────────────┴────────────────────────────────────────────┘
      (al seleccionar un candidato → Candidate Viewer como Floating Surface / focus overlay:
       imagen lightbox · player de video · waveform de audio + recipe + Recrear)
```

## Layout por modalidad (la región Composer adapta — The Seam)

El chassis es idéntico; **solo el Modo y el Output-Shape Tray cambian por modalidad**, derivados del contrato
discriminado (`TASK-1501`) y validados contra los constraints de la ruta seleccionada (`TASK-1500`). Ningún
control existe si su param no está validado en el contrato.

### Imagen — `{ prompt, references[]?, quality, aspectRatio, count }`

```text
Modo:  (implícito: generar)
Output-shape:  [ Calidad ▾ ]   [ Proporción ▾ 1:1·3:4·16:9 ]   [ Cantidad  1–4 ]
Refs: chips de referencia (private-ingest: hash + rights, nunca bytes crudos)
Generar ✨3
```

### Video — `{ prompt, inputMode, resolution, duration, aspectRatio, audioMode }`

```text
Modo:  [ Crear ] [ Editar ] [ Movimiento ]
        └ Crear → sub: [ Elementos ] [ Cuadros ]
Output-shape:  [ Resolución ▾ ]  [ Duración ▾ ]  [ Proporción ▾ ]  [ Audio: on/off ]
Refs por modo: Elementos (elements[]) · Cuadros (frames{start,end?}) · Movimiento (motion{source}) · Editar (edit{targetId})
Capabilities gated (policy-blocked, visibles): video-frames · video-motion-control · multi-output omni
Generar ✨24
```

### Audio — `{ mode, voicePreset?, sampleRate, format, speed, volume, pitch }`

```text
Modo:  [ Locución ] [ Cambiar voz ] [ Traducir ]
        └ Locución → script · Cambiar voz → sourceId · Traducir → sourceId + idioma destino
Output-shape:  [ Voz (preset) ▾ ]  [ Frecuencia ▾ ]  [ Formato ▾ ]  [ Velocidad ]  [ Volumen ]  [ Tono ]
Capabilities gated (policy-blocked, visibles): audio-change-voice · audio-translate · voice-preset registry
Generar ✨N
```

## Mobile 390px

- El Composer colapsa a **bottom sheet / stepper**: prompt visible siempre; Modo → Ruta → Output-shape → Generar
  en pasos contenidos; el `✨N`, la ruta y el estado crítico viven en una **banda sticky** (nunca se recortan).
- El Generation Feed pasa a **lista de una columna**; el Candidate Viewer abre como **sidecar temporal** que
  devuelve foco al disparador y no deja acciones críticas detrás del overlay.
- **No existe scroll horizontal de página**; solo el feed puede tener scroll propio etiquetado.

## Region inventory + controles reales

| Región | Qué hace | Controles / params del contrato | Reader / command |
|---|---|---|---|
| Modality band | cambia modalidad; muestra créditos (spend fence) y actor | Imagen · Video · Audio; balance disponible/reservado | catálogo `TASK-1500`; fence del run |
| Prompt bar | prompt + referencias | texto; `+` agregar ref, `@` mencionar asset (private-ingest: hash + rights) | contrato `TASK-1501`; reference intelligence `TASK-1494` |
| Route Selector | elige ruta; muestra el modelo público + constraints + specialty | ruta (**modelo público**: nombre+versión, p.ej. "Seedance · 2.0"; **sin slug**); ⓘ HD/idiomas/long-form/multi-speaker | catálogo `TASK-1500` |
| Output-Shape Tray | controles discriminados | image: quality/aspectRatio/count · video: resolution/duration/aspectRatio/audioMode/inputMode · audio: mode/voicePreset/sampleRate/format/speed/volume/pitch | contrato `TASK-1501` validado vs constraints `TASK-1500` |
| Estimate + Generar | costo pre-spend + disparo | `✨N` (ruta × output-shape); CTA Generar | estimate reader `TASK-1502`; command `TASK-1501` |
| Generation Feed | feed unificado cross-modal | grid de candidatos (badge modalidad, ruta curada, recipe) | feed/candidate readers `TASK-1498`/`TASK-1503` |
| Asset Action Bar | acciones por candidato | preview · descargar · favorito · usar-como-referencia · Recrear | retrieval + acciones `TASK-1503`; Recrear `TASK-1496`/`editFrom` `TASK-1490` |
| Candidate Viewer | preview dominante | lightbox / player / waveform + recipe + Recrear | retrieval `TASK-1503` (hash→bytes tenant-safe) |

## States and copy contract

- **Default:** composer listo; ruta y shape por defecto de la modalidad; `✨N` calculado cuando el shape es
  válido.
- **Loading:** catálogo y feed cargan con skeleton dimensionado al contenido final (no spinner de página).
- **Empty:** sin generaciones → copy de arranque + foco al prompt.
- **Generating:** run en vuelo → progreso por attempt honesto, cancelación real (command `cancel`), placeholder
  "en curso" en el feed; sin porcentaje inventado; live region moderada.
- **Candidate-ready:** el candidato aparece en el feed; comparar/anotar no aplica (eso es Workbench) — aquí es
  descargar/favorito/usar-como-referencia/Recrear.
- **Error (shape inválido pre-spend):** proporción/duración/frecuencia fuera de constraints → `Generar`
  deshabilitado con motivo, **antes** de gastar.
- **Error (provider/fence):** provider error tipado + recovery; fence block con motivo; estimate stale →
  recalcular.
- **Degraded / partial:** el candidato existe por su `hash` pero el archivo no resuelve → badge honesto, nunca
  se descarta ni se finge estado sano.
- **Permission denied / policy-blocked:** modo/panel gated → control visible pero deshabilitado con copy
  honesto; `not_found` sin revelar existencia cross-workspace.
- **Long content / mobile / keyboard / reduced-motion:** ver secciones de layout y State inventory del UI/UX
  Contract.

## Copy ledger (es-CL, sin voseo — namespace `GLOBE_PRODUCER.*`)

- `modality.image` / `modality.video` / `modality.audio`: `Imagen` / `Video` / `Audio`
- `composer.prompt_placeholder`: `Describe lo que quieres crear`
- `composer.add_reference`: `Agregar referencia`
- `composer.mention_reference`: `Mencionar un asset`
- `route.label`: `Ruta`
- `route.specialty.hd` / `.longform` / `.multispeaker` / `.languages`: `HD` / `Formato largo` / `Multi-voz` / `Idiomas`
- `shape.quality`: `Calidad` · `shape.aspect_ratio`: `Proporción` · `shape.count`: `Cantidad`
- `shape.resolution`: `Resolución` · `shape.duration`: `Duración` · `shape.audio`: `Audio`
- `shape.sample_rate`: `Frecuencia` · `shape.format`: `Formato` · `shape.speed`: `Velocidad` · `shape.volume`: `Volumen` · `shape.pitch`: `Tono` · `shape.voice_preset`: `Voz`
- `mode.video.create` / `.edit` / `.motion`: `Crear` / `Editar` / `Movimiento`
- `mode.video.elements` / `.frames`: `Elementos` / `Cuadros`
- `mode.audio.voiceover` / `.change_voice` / `.translate`: `Locución` / `Cambiar voz` / `Traducir`
- `mode.audio.target_lang`: `Idioma destino`
- `generate.cta`: `Generar` · `generate.estimate`: `✨{n}` (glifo de estimación pre-spend)
- `feed.title`: `Mis generaciones`
- `feed.empty`: `Aún no has generado nada. Escribe un prompt y genera tu primera pieza.`
- `asset.preview`: `Ver` · `asset.download`: `Descargar` · `asset.favorite`: `Favorito` · `asset.copy_reference`: `Usar como referencia` · `asset.recreate`: `Recrear`
- `state.generating`: `Generando…` · `state.cancel`: `Cancelar`
- `state.shape_invalid`: `Esta proporción o duración no es compatible con la ruta. Ajusta antes de generar.`
- `state.fence_blocked`: `Este run supera el límite disponible. Ajusta el alcance.`
- `state.estimate_stale`: `La ruta o el formato cambiaron. Recalcula el costo antes de generar.`
- `state.degraded`: `El candidato existe, pero su archivo no está disponible por ahora.`
- `state.policy_blocked`: `Esta capacidad aún no está habilitada.`
- `state.not_found`: `No encontramos ese asset en tu espacio.`
- `error.generic`: `No se pudo completar la generación. Intenta de nuevo o ajusta la ruta.` (mensaje sanitizado; ningún raw provider/DB error)

## Implementation Mapping

| Región | Primitive/pattern (Globe) | Fuente de datos |
|---|---|---|
| Consola / shell | Composition Shell "Producer Console" | registry de patterns Globe |
| Modality band | pattern band + créditos | catálogo `TASK-1500` + fence del run |
| Composer | `Composer` (prompt bar) + `Route Selector` + `Output-Shape Tray` | contrato `TASK-1501` + constraints `TASK-1500` |
| Estimate + Generar | CTA con `✨N` | estimate reader `TASK-1502` + command `TASK-1501` |
| Generation Feed | `Generation Feed` (Adaptive Card density) | feed/candidate readers `TASK-1498`/`TASK-1503` |
| Asset Action Bar | `Asset Action Bar` | retrieval + acciones `TASK-1503`; Recrear `TASK-1496`/`TASK-1490` |
| Candidate Viewer | `Candidate Viewer` (Floating Surface) | retrieval `TASK-1503` (hash→bytes tenant-safe) |

- **Full API Parity:** cada acción de la UI (generar, estimar, descargar, favorito, usar-como-referencia,
  Recrear) es un command/reader gobernado consumido igual por UI/SDK/MCP/CLI; cero business logic o provider/DB/
  storage en componentes.
- Copy: `GLOBE_PRODUCER.*` en el copy centralizado de Globe (mirror del patrón `src/lib/copy/*`).
- Server/browser split: hash→bytes, provider, writes y secretos server-only; la UI recibe DTOs redactados
  (sin slug, sin costo vendor, sin margen).

## GVC Scenario Plan

- Desktop 1440×1000 y Mobile 390×844.
- Estados: default, loading, empty, generating, candidate-ready, error (shape/provider/fence/estimate),
  degraded, policy-blocked, long-content.
- Recorrido: Imagen (prompt → ref → shape → `✨N` recomputa → Generar → candidato → viewer → acciones →
  Recrear) → Video (Crear/Editar/Movimiento con capabilities `policy-blocked` visibles) → Audio
  (Locución/Cambiar voz/Traducir).
- Medir `scrollWidth <= clientWidth` en ambos viewports; asserts: `✨N` visible y consistente con el estimate
  reader; **cero slug/costo vendor/margen en el DOM**; ningún control cuyo param no exista/valide en el contrato.
- Capturar primer fold tras shell + fixtures antes del cableado exhaustivo; reduced-motion y focus/focus-restore
  del viewer.
- Markers `data-capture`: `producer-console`, `producer-modality-band`, `producer-composer`,
  `producer-prompt-bar`, `producer-route`, `producer-shape`, `producer-estimate`, `producer-feed`,
  `producer-candidate-viewer`, `producer-asset-actions`, `producer-state-*`.
- Baseline futuro: `globe.creative-producer-surface`. Gate final: `design-contract:lint`, `ui:code-lint`,
  `ui:visual-gate`, `ui:quality` y scorecard `>= 4.5` (floor `>= 4`).

## Design Decision Log

- Se elige la **Producer Console prompt-first** (composer dominante + feed unificado + candidate viewer) porque
  mantiene un momento visual dominante y bajo el ceremony, y hace visibles el contrato discriminado + estimate +
  retrieval que el Workbench reutiliza.
- El **contrato discriminado manda la UI**: los controles se derivan del catálogo/contrato; ningún control
  existe sin param validado — la superficie es fail-closed por construcción.
- El **feed es unificado cross-modal** (imagen/video/audio en una superficie), no tres feeds; Adaptive Card
  density absorbe ratios/duraciones dispares sin card wallpaper.
- **Naming, sagrado (invariante invertido TASK-1500):** la superficie muestra el **modelo público** (nombre+versión,
  p.ej. "Seedance · 2.0" — ancla de posicionamiento), **nunca el slug**; la **casa** interna (`house`) solo se
  muestra a operadores con `globe.producer.route.reveal_house`; costo vendor y margen nunca aparecen; `actualRoute`
  = contrato de fidelidad.
- Las **capabilities nuevas** (`TASK-1504`) nacen visibles pero `policy-blocked`; el chassis no se rompe por una
  capability apagada.
- Greenhouse gobierna registry/QA/promoción/evidencia; Globe posee runtime, primitives y datos — la UI no
  hereda layouts/recipes de Greenhouse ni comparte secretos/DB/bucket.
- El Producer **comparte primitivos con el Workbench (`TASK-1474`), no su layout**: Producer = prompt-first
  (composer dominante); Workbench = brief-first (canvas dominante).
