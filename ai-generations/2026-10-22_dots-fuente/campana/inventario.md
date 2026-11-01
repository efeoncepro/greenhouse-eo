# dots (OpenAI) — inventario de campaña · 2026-10-22

Complemento de [`../LEEME.md`](../LEEME.md), que cubre los 108 presets que trae el motor `orbit-character` de
ChatGPT.app. Aquí está **lo que OpenAI mostró en su comunicación oficial**: el film de lanzamiento, la página de
producto, la nota y los videos de su canal. No se generó ninguna imagen con IA, no se tocó OneDrive y no hay commit.

## Fuentes recorridas

| Fuente | Resultado | Archivo |
|---|---|---|
| Nota [openai.com/index/introducing-dots](https://openai.com/index/introducing-dots/) | 4 videos de Vimeo embebidos, todos bajados (máx. 1080p) | `videos/vimeo-*.mp4` |
| «Dots Vision Film / Live from the Lab» | 146 s; el master se llama `…_3840x2160_…`, pero Vimeo y YouTube sólo sirven 1080p | `videos/vimeo-1231177365-…mp4` |
| Página de producto [chatgpt.com/features/dots](https://chatgpt.com/features/dots) | 30 imágenes originales del CDN, entre ellas **4 pósters en felpa larga** de campaña | `imagenes/chatgpt-features-*` |
| YouTube @OpenAI: [Introducing dots](https://www.youtube.com/watch?v=uXspbC2srEQ), [Put your dot on call](https://www.youtube.com/watch?v=GBOZIRK1ujw), [Set up your dot in the ChatGPT mobile app](https://www.youtube.com/watch?v=p5KxBTUncoE), [The dots demo, take two](https://www.youtube.com/watch?v=fHEIw5CcN5U) | Bajados; dos en 4K (`Put your dot on call` y `Set up your dot`) | `videos/yt-*.mp4` |
| Keynote [DevDay 2026 (FULL)](https://www.youtube.com/watch?v=Fls_onRviPM) | **No bajado**: YouTube pidió verificación anti-bot. Se baja con `yt-dlp --cookies-from-browser` | — |
| Ayuda [20001529](https://help.openai.com/articles/20001529) y [20001530](https://help.openai.com/articles/20001530) | Sólo texto; sin imágenes del personaje | `brief/medios-help-*.json` |
| Ficha de App Store (ChatGPT 1.2026.279) | 8 capturas a 1290×2796: **ninguna muestra dots** | `imagenes/appstore/` |
| X, Instagram, TikTok y LinkedIn de OpenAI | No revisados: exigen sesión | — |

Herramientas: `uvx --from yt-dlp` (sin instalar nada global), ffmpeg, Chromium de Playwright (`brief/recolectar-medios.mjs`)
y sharp (`brief/hoja.mjs`). Las hojas de revisión por video están en `brief/revision/`.

## Hallazgos que el motor no daba

1. **Hoja de modelo oficial con vistas de frente, espalda y perfil.** En el film (8 s) aparece una pared de láminas
   técnicas: **No. 001 Alfred** con *Front*, *Back* y *Side* acotados (70 × 64; perfil 40 × 64, un triángulo que se
   afina hacia arriba), y las piezas acotadas (corbatín 24, lentes 40 × 16, ojos cerrados 32 × 4); **No. 002 Todd**
   (74 × 64) y **No. 003 Felipe** (68 × 74). Junto a ellas, el tablero de piezas sueltas: formas, ojos, lentes,
   boina, orbe, corbatín y audífonos. Es la única fuente oficial de perfil y espalda.
   → `cuadros/film-08s-hoja-de-modelo-oficial-alfred-todd-felipe-y-piezas.png`
2. **Versión física.** Todd en **vinilo liso**, no en felpa, con corbatín de terciopelo; Felipe saliendo de una
   impresora 3D; Felipe y Alfred **de felpa en una repisa**; y un prototipo lima con orbe y gafas de gato.
3. **Felpa larga de campaña.** Los pósters de la web (Alfred, Felipe, Todd y el corazón magenta) usan pelo largo y
   esponjoso. El motor y la nota usan pelo corto.
4. **Dos modos de dot.** En el configurador del teléfono hay **«Colors»**, donde el dot es un anillo «o» de color,
   y **«Characters»**, el personaje. Los anillos también aparecen en las pantallas del laboratorio del film.
5. **El dot asomado.** En los videos de la nota, Todd y Alfred se asoman desde una esquina del cuadro.

## Inventario: dots distintos

| Dot | Fuente / URL | Tiempo | ¿Preset? | Vistas disponibles |
|---|---|---|---|---|
| **Alfred** (amarillo, triángulo, lentes, corbatín) | Film; chatgpt.com/features/dots (`poster-alfred`, `alfred-profile`, `conn-mascot`); video Codex | 8 s, 13 s, 28,5 s; Codex 4 s | Sí · 002 `alfred` | **frente, espalda y perfil (hoja de modelo)**, piezas acotadas, felpa larga, felpa física, asomado |
| **Todd** (rana lima, corbatín) | Film; web (`poster-todd`); video del blog | 8 s, 9 s, 10,5 s; blog 2 s | Sí · 004 `lime_frog` | frente acotado (hoja), **físico en vinilo liso**, felpa larga, asomado |
| **Felipe** (nube azul, boina) | Film; web (`poster-felipe`, `phone-felipe`) | 6,5 s, 8 s, 13 s, 23,5 s | Sí · 001 `blue_beret` | frente acotado (hoja), impreso en 3D, felpa física, felpa larga |
| **Corazón magenta con gafas redondas** | Film; web (`poster-iggy`, `slack-jojo`); carrusel de la nota | 32,5 s | Sí · 003 `purple_heart` (**Jojo**) | frente, felpa larga. ⚠️ La web nombra el póster `poster-iggy`, pero el motor, Slack y la nota lo llaman **Jojo**. El Iggy del motor (008) y de la captura `4079-26650` es rosado con audífonos |
| **Iggy** (rosado con orejas y audífonos) | web, captura `4079-26650`; carrusel de la nota | — | Sí · 008 `lime_headphones` | sólo dentro de capturas de UI, pequeño |
| **Iris** (rosa festoneada coral, monóculo) | web `task-coral` | — | Sí · 005 `coral_monocle` | frente (512 px) |
| **Rio** (triángulo coral con gafas de sol) | Film, pantalla del personalizador | 24 s | Sí · 074 `rio` | frente en pantalla |
| Verde triángulo con gafas redondas | Film, personalizador | 25 s | **No** (estado intermedio) | frente en pantalla |
| Verde triángulo con mechón morado | Film, personalizador | 26 s | **No** (estado intermedio) | frente en pantalla |
| Verde triángulo con aureola amarilla | Film, personalizador | 27,5 s | **No** (estado intermedio) | frente en pantalla |
| Prototipo lima con orbe y gafas de gato | Film, mesa del laboratorio | 9 s | **No exacto**: se parece a Thelma (006 `gus`, amarillo, rombo, orbe, gafas) en color lima y forma de pera | físico, desenfocado |
| **Dot cian (flor de seis lóbulos) con boina**, creado por el presentador («Bloss…», probablemente «Blossom», cortado en pantalla) | YouTube «Set up your dot», 4K | 63–72 s | **No** (Felipe es azul; éste es cian) | frente en el configurador |
| Dot «Colors» (anillos o en blanco, cian y amarillo) | YouTube «Set up your dot»; pantallas del film | 63 s; film 4 s | No es personaje | anillo plano |
| Corazón rosado sin cara | web `heart.png` | — | No (es la reacción «corazón») | ícono 150 px |

**Total: 13 dots distintos con cara** (sin contar los anillos ni el corazón de reacción): **7 presets**
(Alfred, Todd, Felipe, Jojo, Iggy, Iris y Rio) y **6 que no están entre los 108**: los 3 estados intermedios del
personalizador, el prototipo lima, el dot cian del configurador y, como variante de material, la felpa larga.
Ninguno nuevo tiene vistas más allá del frente.

## Archivos

- `videos/` (344 MB): 8 videos.
- `cuadros/` (14 MB): 23 archivos: 19 cuadros a resolución completa (1920×1080 del film y de los videos; recortes 4K
  del configurador) y 4 pósters de felpa larga en PNG.
- `imagenes/` (10 MB): 30 originales de chatgpt.com/features/dots y 8 capturas de App Store.
- `hoja-de-contacto.png` (5,2 MB): 29 celdas con rótulo.
- `brief/`: scripts, JSON de medios por página, hojas de revisión por video y `descartes/` (2 cuadros duplicados).

## Huecos

- Las vistas de perfil y espalda sólo existen en la hoja de modelo, y sólo de **Alfred**, a 1080p dentro de una
  escena; no hay archivo limpio. El master 4K del film no está publicado.
- El keynote de DevDay y las redes sociales no se revisaron (verificación anti-bot y login).
- Ningún estudio aparece acreditado en el film ni en la página.
