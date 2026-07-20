# TASK-1505 — Globe Creative Producer Surface Flow

Este flow describe el Producer como un **sistema de nodos** (no pantallas aisladas): las tres modalidades, sus
modos, el feed unificado y Recrear son estados de una misma consola. Cada nodo declara su command/reader
(Full API Parity) y su resolución por entitlement.

## Sistema de nodos (mapa)

```text
                         ┌──────────────────────────────┐
                         │  MODALITY BAND               │
                         │  Imagen · Video · Audio       │
                         └───────────────┬──────────────┘
                                         │  (cambia el panel del Composer — The Seam)
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
 ┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
 │ IMAGEN      │                  │ VIDEO       │                  │ AUDIO       │
 │ (generar)   │                  │ Crear/Editar│                  │ Locución    │
 │             │                  │ /Movimiento │                  │ Cambiar voz │
 │             │                  │ Crear→Elem/ │                  │ Traducir    │
 │             │                  │ Cuadros     │                  │             │
 └──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
        │  prompt (+refs) → ruta → output-shape → ✨N (estimate) → Generar │
        └────────────────────────────────┼────────────────────────────────┘
                                          ▼
                              ┌──────────────────────┐
                              │ RUN (prepare→execute) │  ← contrato discriminado, fail-closed pre-spend
                              │ generating → candidate│
                              └───────────┬───────────┘
                                          ▼
                              ┌──────────────────────┐
                              │ GENERATION FEED       │  ← unificado cross-modal (mezcla las 3)
                              └───────────┬───────────┘
                        ┌─────────────────┼───────────────────┐
                        ▼                 ▼                    ▼
                 [preview/descargar] [favorito]      [usar como referencia] ──┐
                        │                                                      │
                        ▼                                                      ▼
                 ┌─────────────┐                                      ┌─────────────┐
                 │ VIEWER      │                                      │ RECREAR     │ ──▶ nuevo RUN
                 │ (Floating)  │                                      │ (recipe /   │     (reproducible,
                 └─────────────┘                                      │  editFrom)  │      cross-model opcional)
                                                                      └─────────────┘
```

## Primary flow (por modalidad — nodos, no pantallas)

### Imagen (modo único: generar)

1. Operador escribe prompt; opcionalmente agrega referencias (`+` upload / `@` mención) que cruzan como
   **hash + rights** (private-ingest), nunca bytes crudos.
2. Elige **ruta** del catálogo (**modelo público**: nombre+versión, p.ej. "Seedance · 2.0", sin slug; la casa interna solo la ve el operador); la UI muestra constraints + specialty (HD,
   idiomas) — reader de `TASK-1500`.
3. Ajusta el **output-shape** `{ quality, aspectRatio, count }`; cada opción está acotada por los constraints de
   la ruta (fail-closed: no ofrece lo que la ruta no soporta) — contrato de `TASK-1501`.
4. Ve el costo `✨N` = `ruta × output-shape` **antes** de generar — estimate reader de `TASK-1502`
   (read-only, idempotente; recomputa al cambiar shape).
5. `Generar` → command discriminado (`prepare → execute`); el run pasa `prepared → estimated → reserved →
   running → candidate_ready` (o `failed`); el candidato aparece en el feed.

### Video (modos: Crear[Elementos/Cuadros] · Editar · Movimiento)

1. Elige **modo** → determina el `inputMode` del contrato: Crear→`elements[]` o `frames{start,end?}`;
   Movimiento→`motion{source}`; Editar→`edit{targetId}`.
2. Output-shape `{ resolution, duration, aspectRatio, audioMode }` acotado por la ruta.
3. Las capabilities **video-frames** y **video-motion-control** y el **multi-output omni** (`TASK-1504`) se
   muestran **`policy-blocked`** hasta su gate: control visible, deshabilitado, copy honesto.
4. `✨N` → Generar → feed; el multi-output omni (un run → `{video, audio}`) declara cada output con su `sha256`
   en el manifest; ningún output se descarta en silencio.

### Audio (modos: Locución · Cambiar voz · Traducir)

1. Elige **modo** → determina el `mode` del contrato: Locución→`voiceover{script}`; Cambiar
   voz→`changeVoice{sourceId}`; Traducir→`translate{sourceId, targetLang}`.
2. Output-shape `{ voicePreset?, sampleRate, format, speed, volume, pitch }`; **voice-preset** desde el registry
   de `TASK-1504` (voces reutilizables/clonadas — `policy-blocked` hasta gate).
3. `audio-change-voice` y `audio-translate` son capabilities `policy-blocked` hasta su gate.
4. `✨N` → Generar → feed (mezcla con imagen/video: feed cross-modal real).

## El feed y Recrear (nodos compartidos)

- **Generation Feed:** unificado cross-modal; cada candidato lleva badge de modalidad, ruta curada y recipe.
  Selección → **Candidate Viewer** (lightbox / player / waveform) — retrieval `hash → bytes` tenant-safe de
  `TASK-1503`.
- **Asset actions:** preview / descargar / favorito / usar-como-referencia (copia el candidato como referencia
  de un nuevo run) — todas gobernadas por `TASK-1503`.
- **Recrear:** dispara un nuevo run desde la recipe del candidato (reproducible) — motor de `TASK-1496`; si se
  elige otra ruta/modelo para el hijo, es **edit cross-model** vía `editFrom` de `TASK-1490` (el derivado hereda
  `derived-internal` + los derechos del padre; nunca se blanquea a `internal-owned`).

## Resolución por entitlement (nodos gated)

- La consola exige `globe.studio.access`; es **internal-only, behind flag**.
- Cada modo/panel de capability nueva se resuelve por **coverage**: `policy-blocked` → visible pero
  deshabilitado con copy honesto; nunca se renderiza un panel cuyo backend no existe.
- Un asset o experimento **cross-workspace** → `not_found` (sin revelar existencia).
- La UI **no** promueve una surface a `available`: eso es un gate separado (broker grant + flip de coverage).

## Command / reader map (Full API Parity)

| Nodo | Command / reader | Task |
|---|---|---|
| Cargar rutas + constraints + specialty + naming | reader catálogo | `TASK-1500` |
| Serializar prompt/refs/output-shape → generar | command discriminado (`prepare` → `execute`) | `TASK-1501` |
| Costo `✨N` pre-spend | estimate reader (read-only) | `TASK-1502` |
| Feed unificado + candidatos | feed/candidate readers | `TASK-1498` / `TASK-1503` |
| Preview / descargar (hash→bytes tenant-safe) | retrieval reader | `TASK-1503` |
| Favorito / usar-como-referencia | asset action commands | `TASK-1503` |
| Recrear (recipe / cross-model) | recipe/variación + `editFrom` | `TASK-1496` / `TASK-1490` |
| Capabilities nuevas (frames/motion/change-voice/translate/omni/voice-preset) | commands gated | `TASK-1504` |

## Recovery branches

- **Shape inválido (pre-spend):** proporción/duración/frecuencia fuera de constraints → `Generar` deshabilitado
  con motivo, **antes** de reservar crédito; jamás en runtime.
- **Estimate stale:** ruta/shape cambiaron → recalcular el `✨N` antes de generar; nunca gastar con costo
  desactualizado.
- **Fence bloqueado:** el run supera el cap → ajustar el alcance (count/duración/ruta) y recalcular; sin gasto.
- **Provider fallido:** mostrar attempt y error tipado con recovery; retry/fallback conserva la ruta real y no
  oculta el fallback; ningún raw provider/DB error a la vista.
- **Degradado (retrieval):** el candidato existe por su `hash` pero el archivo no resuelve → badge honesto; el
  candidato no se pierde; se puede reintentar la descarga.
- **Policy-blocked:** capability apagada → copy honesto de "aún no habilitada", sin filtrar detalle.
- **Cross-workspace:** `not_found` sin revelar existencia.

## Accessibility and navigation

- Orden de foco: header/modality band → composer (prompt → referencias → modo → ruta → output-shape → Generar) →
  feed → candidate viewer / asset actions.
- El Candidate Viewer (overlay/sidecar en móvil) devuelve foco al disparador y no deja acciones críticas detrás
  del overlay.
- Cambios async importantes (generating, candidate-ready, error) usan **live region moderada**; el progreso
  visual no es la única señal.
- Reduced-motion: entrada de candidatos, stagger del feed y progreso degradan a fade/estático; el progreso
  mantiene señal textual.
- Sin scroll horizontal de página en desktop ni 390px; solo el feed puede tener scroll propio etiquetado.

## Conexión con el Workbench (`TASK-1474`)

- El Producer es **hermano** del Workbench, no su subpágina: **Producer = prompt-first** (composer dominante,
  producción atómica, low-ceremony); **Workbench = brief-first** (brief → dirección → estimate → aprobación →
  candidatos → delivery, encima del Producer).
- Comparten **primitivos, no layout**: catálogo (`TASK-1500`), contrato discriminado (`TASK-1501`), estimate
  (`TASK-1502`), retrieval (`TASK-1503`) y el feed unificado. El chassis validado aquí prima al Workbench.
- Lo exclusivo del Workbench (paso "Dirección" `TASK-1499`, aprobación humana, delivery/release) **no** aparece
  en el Producer; un candidato del Producer que deba ir a delivery formal se retoma desde el Workbench sobre los
  mismos contratos, sin duplicar lógica.
