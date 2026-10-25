# Dots (OpenAI) — inventario del motor `orbit-character`

> Fuente: `/Applications/ChatGPT.app` (com.openai.codex 26.1016), motor `orbit-web-0.12.0` (revisión
> `958e5233d334`), ejecutado **sin modificar** en Chromium local (WebGL2 por software). 2026-10-22.
> Scripts: `../brief/motor-*.mjs` (arnés `motor-harness.mjs`). Nada generado con IA.

## Árbol de opciones

| Categoría | Cantidad | Valores |
|---|---|---|
| Forma | 11 | circle, rounded_triangle, capsule, rounded_head_two_ears (sapo), six_lobed_flower, heart, four_lobed_butterfly, circle_two_ears (conejo), twelve_scalloped_rosette, rounded_cube, rounded_diamond |
| Color de cuerpo | 9 (+1 oculto) | pink, orchid, violet, blue, cyan, teal, lime, yellow, coral · **oculto:** `light_yellow` (sólo lo usa Thelma; no se puede elegir) |
| Ojos | 9 | swept_lids, oval, sparkle_capsules, highlight_capsules, dots, double_highlights, round_inset, crescent_inset, sleepy_lids |
| Lentes | 6 | none, monocle, tall_oval_frames, separate_trapezoid_lenses, classic_sunglasses, round_sunglasses |
| Accesorio | 8 (+1 retirado) | headphones (orejas), bow (cuello), beanie, hat, beret, orb, three_lobe, crown (cabeza) · **retirado:** `antennae` («Antenna») |
| Color de utilería | 11 | los 9 del cuerpo + charcoal y brown (negro por defecto) |
| Profundidad | 0–1 | deformación de la vista previa; los presets usan 0,5 |
| Reacciones | 2 | Wave (saludo, aparecen dos esferas-mano) · Signature (firma propia de cada héroe) |
| Actividades | 9 | Working, Searching, Creating, Payment, Thinking, NeedsInput, Ready, Paused, Error (utilería: tarjeta de entrada, ampolleta, «Zzz», degradado rojo de error) |

Combinaciones posibles: 11 × 9 × 9 × 6 × 9 (sin accesorio + 8) × 11 colores de utilería ≈ cientos de miles.

## ¿Hay más dots que los 108?

- **Presets:** el motor declara exactamente 108 (`presetPage().totalCount = 108`); `reference-characters.json`
  (FS interno) trae los mismos 108 con sus ajustes finos (posición y escala de ojos, materiales). No hay presets ocultos.
- **Sí hay dots nuevos:** el motor trae un **generador curado** (`generateCuratedAppearance(seed)`, versión 14)
  que arma dots válidos fuera de los 108 a partir de una semilla. `curados/` tiene 24 (algunas semillas caen en
  combinaciones parecidas a héroes).
- **Piezas ocultas:** el accesorio retirado **`antennae` («Antenna»)** sigue soportado para estados guardados; no se
  puede elegir en la app, pero sí cargar un estado que lo trae. Render en `ocultos/` (se armó el estado editando el
  nombre de la pieza en los bytes de entrada; el motor lo validó como estado válido). El color `light_yellow` existe
  sólo para Thelma. En el binario también aparecen `crested_rounded_cube` y `round_head_small_lobes`, pero
  `findSupportedItem` no los reconoce: son restos de desarrollo, no piezas cargables.

## Giros — qué se pudo y cómo

- **Arrastre (`pointer` Down/Move/Up):** el motor gira y ladea al personaje siguiendo el puntero, con tope
  aproximado de 30–45° (tres cuartos suave) y picado/contrapicado leves; vuelve solo al soltar. Un arrastre rápido
  («fling») da el mayor ángulo un instante. **No llega a perfil ni a espalda.** Capturado para los 8 héroes en
  `giros/<héroe>/` (01–06).
- **Firma (`playReaction(Signature)`):** cada héroe tiene una animación propia. **Sólo Jojo da la vuelta completa**:
  de ahí salen su **espalda, espalda tres cuartos y perfil derecho oficiales** (`giros/jojo/08–12`). Los demás saltan,
  se ladean o parpadean. Todos los cuadros en `giros/<héroe>/firma-cuadro-a-cuadro/` (40 cuadros) y el saludo en
  `saludo-cuadro-a-cuadro/` (20).
- No hay API de cámara ni de rotación: `captureNeutral()` siempre devuelve la pose frontal.

## Calidad

`Quality.Balanced` es el tier más alto del motor (Automatic/Compact/Balanced). `captureNeutral` aceptó **4096 px**
para los 8 héroes (`heroes-hd/`). Los giros y actividades son capturas del canvas en vivo a 1000/900 px.

## Carpetas

| Carpeta | Contenido |
|---|---|
| `heroes-hd/` | 8 héroes a 4096 px, fondo transparente |
| `formas/` | 11 formas × 9 colores (99), ojos ovalados, sin utilería |
| `piezas/` | 9 ojos, 5 lentes, 8 accesorios, 11 colores de utilería |
| `ocultos/` | accesorio retirado «Antenna» |
| `curados/` | 24 dots del generador curado |
| `giros/` | arrastre, fling, picado/contrapicado, firma y saludo cuadro a cuadro de los 8 héroes |
| `actividades/` | 9 actividades × Felipe, Alfred, Jojo, Todd |
| `studio-renders/` | 23 miniaturas internas de estudio de cada pieza (@3x) |
| `reference-characters.json`, `native-resources.json`, `motor-meta.json`, `catalogo-renders.json` | metadatos |

## Límites

- `round_inset` no se aplica sobre la cápsula (`ojos-07` sale con los ojos por defecto) y la forma sapo no acepta
  `oval` (salen sus ojos propios).
- Las actividades son un cuadro por estado: la utilería aparece en un momento de la animación y en algunos cuadros
  no se ve (searching, working, creating).
- Render por software (SwiftShader): el pelo es el del motor de la app, no el del video de campaña.
- Uso interno: mismo trato de marca que Codex (OpenAI Brand).
