---
paths:
  - "public/branding/glitch/**"
  - "ai-generations/*glitch*/**"
  - "docs/operations/brand-graphic-line/glitch/**"
  - "docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md"
  - "docs/manual-de-uso/creative/editar-video-glitch.md"
---

# Glitch — sub-línea gráfica (auto-load por path)

Glitch (el magazine semanal de Efeonce: portadas, carrusel, blog, vlog/reel) tiene una **sub-línea complementaria de
«La órbita» que aplica SÓLO a Glitch**. Carga la skill **`efeonce-graphic-line`** → `references/glitch.md` (+
`efeonce-advertising-creative` si lleva texto, `social-media-studio`, `motion-design-studio` para video). Canon:
`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (motion en §13) + ADR
`docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md`. AXIS `/references/glitch/` y `/references/glitch.json`:
publicados (2026-09-27); los tokens y el contrato de Glitch llegan con TASK-1922.

Reglas duras:

- **Nunca** la manzana, el verde Glitch, la falla en bytes, Guttery ni la cabecera «EDICIÓN #N» en una pieza de Efeonce.
- **La transición de la manzana en bytes (entre piezas y entre escenas) es exclusiva de Glitch**: nunca en Efeonce.
- **Una sola esfera por pieza**: manzana **o** lente/órbita, nunca las dos.
- El verde nunca como texto, borde ni separador sobre claro; la falla nunca sobre un rostro, **tampoco en
  transiciones** (hacia o desde el host a cámara: corte seco o transición de tarjeta, salvo aprobación del operador);
  ningún overlay sobre la cara del host ni la interfaz de la app. Firma: logo de Efeonce centrado abajo, **nunca con
  falla** (en el corte sólo se corta).
- Lower third: la **órbita real** (anillo fijo al 28 % que la manzana recorre con la estela de 50°), nunca un arco
  suelto girando.
- Motion: repo taller `efeonce-brand-workshop`, `tools/glitch-motion/` (HyperFrames); desde `greenhouse-eo`:
  `pnpm -C ../efeonce-brand-workshop --filter glitch-motion {doctor|render|kit|transiciones|heroe|sonido|deliver|test}`
  (`--sound b` y `--music on` por defecto: los aprobados; `--deliver`, `--skip-render`; `deliver` re-entrega una
  corrida desde su manifiesto sin verificar ni renderizar; `test` = 13 pruebas). Argumentos completos: norma
  §13.13. El texto sale del archivo de edición: nunca editar los `.mov` ni tocar tiempos o coordenadas de las
  composiciones. **Nunca animar, sonorizar ni mezclar a mano** una pieza de Glitch: se corre el comando y se entrega sólo
  lo que pasa sus verificaciones (una FALLA bloquea la entrega).
- Sonido de Glitch = **APROBADO, versión B (2026-09-27), sólo Glitch** (nunca Efeonce; la A quedó descartada): un WAV
  sidecar por `.mov` (sólo los de `b/`); dos golpes graves (apertura y Drop); nunca la falla sonora sobre la voz del
  host ni sonido de transición hacia o desde el host; nunca whooshes. Archivos por URL + SHA-256 en
  `gs://efeonce-group-axis-public-media/glitch/sound/v1/` (`/references/glitch.json` → `sound`). Canon §13.11 de la
  norma; operativo en `references/glitch.md` §13.
- Música de Glitch = **APROBADA (2026-09-27), sólo Glitch**: tema B (intro, cortina, salida) + **cama post-punk bajo la
  voz de las noticias** (reemplaza «voz sola»): 15 dB bajo la voz, ducking por sidechain, **nunca recortar los medios** y
  **nunca síntesis pura** (lo «arcade» es falta de medios). Másteres por URL + sha256 en
  `gs://efeonce-group-axis-public-media/glitch/music/v1/`; nunca regenerarlos. Canon §13.12 de la norma.
  La cama **nunca bajo el host fuera de las noticias** (tampoco el cierre sobre el host), el Drop ni la tarjeta final.
  La intro y la salida **reemplazan** a `apertura.wav` y `cierre.wav` (ya los traen: nunca soltar ambos). En el taller
  la música sale junto al motion (`src/music.mjs`); `--music off` la apaga. Publicada en AXIS (`#musica`, campo `music`).
- Aprobado: sistema de portada A/B/C con rotación, lámina interior, contraportada; manzana como esfera y verde como acento; línea Growth; próxima edición #17; alta de los 5 glifos Plastilina (2026-09-27); diseño sonoro de Glitch, versión B (2026-09-27); música de Glitch, tema B + cama post-punk (2026-09-27); **motion de Glitch (2026-09-27)**: apertura y tarjeta final v2, kit de overlays con el lower third, transición de bytes entre piezas y transición entre escenas, con los tableros de video del canvas (vlog 16:9 y reel); pre-roll de la intro «los tres puntos al ritmo» (3,2 s, opaco, empalma exacto con la apertura), **sólo en el vlog**: el reel abre directo con la apertura (decisión del operador del 2026-09-27; bucle exacto) y su intro, `glitch-intro-reel.wav`, es la intro aprobada desde 3,2 s (4,0 s, en 0 junto a la apertura). Cada render entrega el WAV junto a cada `.mov` (`--sound b|a|off`, `b` por defecto) y la música (el reel usa los másteres de vlog).
  **Blog y lente APROBADOS (2026-09-27)**: banners 16:9 A/B/C, 1:1 con plantilla propia (nunca recortar la portada
  4:5), maqueta del post completa, banner interno con crédito obligatorio, callout «DROP» v2 **desde la #17** (el bloque
  `efeoncepro/glitch-drop` se actualiza antes de publicarla; posts anteriores con v1) y la lente como variante ocasional
  (sin manzana en esa lámina). Ya no hay piezas estáticas en propuesta. Pendientes del motion
  (no decidir por el operador): fps, prueba con editores, ritmo, a qué piezas va la transición de bytes, subtítulos,
  textos reales de la #17, autoservicio, tokens (TASK-1922), archivo en GCS, mezcla de la música con la voz real del host y excepción de rostros.
