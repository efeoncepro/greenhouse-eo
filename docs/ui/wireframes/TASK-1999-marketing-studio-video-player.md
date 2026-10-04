# TASK-1999 / Marketing Studio — Reproductor de video en el panel de la pieza

## Meta

- Status: `approved-direction-extension`
- Owner task: `TASK-1999 — Marketing Studio: reproductor de video en el panel de la pieza`
- Product Design asset: docs/ui/visual-sources/TASK-1999-marketing-studio-video-player/before-desktop.png (estado vigente del inspector en producción, capturado el 2026-10-04 sobre `studio.efeonce.org/campaigns/CMP-001?piece=CMP001-08-video-16x9`; complemento `before-mobile.png`). La dirección aprobada de origen es el canvas de Claude Design «Efeonce Marketing Studio», página `v2 · Claro y oscuro` (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), artboards `Studio-Campaign` (tablero + inspector con vista en el feed) y `Studio-Mobile`, aprobados el 2026-09-25 e implementados en TASK-1887.
- Visual direction mode: `source-led`
- Intended consumers: operador de marketing de Efeonce, revisor creativo, responsable de medios (lectura en modo `open`).
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (objeto `COPY`, namespace nuevo `COPY.player` + `COPY.workspace.watchVideo`), cubierto por `apps/web/src/copy.test.ts`.
- Primitive decision: `extend` — `MediaImage` sigue para imágenes; nace `MediaVideo` como hermano local (misma falla honesta: un reintento y texto en el mismo espacio). Se extienden `.feed-media`, `.story-media` y `.piece`.
- UI ready target: `yes` — el reproductor ocupa exactamente el espacio de medios que la dirección aprobada ya dibuja (feed con proporción real, historia 9:16); no agrega regiones, superficies ni navegación.

## Brief

- Primary user: la persona que revisa una campaña en Studio y necesita ver el spot antes de aprobarlo, de pedir cambios o de armar la pauta.
- User moment: elige un video en el tablero (pestaña «Videos») o llega por el enlace `?piece=<assetId>`; hoy ve un cuadro fijo y tiene que ir a OneDrive para ver el video.
- Job to be done: «Ver el video completo donde estoy revisando la pieza, con su copy y su formato real, sin bajar el archivo.»
- Primary decision signal: el propio video dentro de la vista en el feed, con su duración en la línea de metadatos.
- Non-goals: editar, recortar o subtitular; autoplay; reproducir en el tablero; descargar el original (TASK-1895/1893); métricas de reproducción.

## Desktop Target — 1440×1000

Se conserva todo el primer pliegue de `before-desktop.png`: `Shell` con rail de 76 px, hero con la pista de tres
estados y pestañas, tablero concepto × formato a la izquierda e `inspector` de 430 px a la derecha.

1. **Tablero (pestaña Videos):** cada celda dibuja **todas** las piezas del concepto con ese tipo y formato (hoy sólo
   la primera). La segunda pieza de un mismo formato (p. ej. «Los Sparks · con intro para Instagram») aparece como
   otra miniatura en la misma celda, con su etiqueta de formato y un sufijo corto derivado del título. Cada
   miniatura de video lleva su duración («0:50») junto a la etiqueta de formato.
2. **Tablero (pestaña Imágenes):** la celda fantasma «solo video» pasa a ser un botón «Ver video» que cambia a la
   pestaña Videos y selecciona esa pieza; «no producido» sigue siendo texto.
3. **Inspector:** en la tarjeta de feed (1:1, 4:5, 16:9, 1,91:1) la imagen se reemplaza por el reproductor con la
   proporción real (`aspect-ratio`), póster = cuadro del segundo 1, controles nativos. En la tarjeta de historia
   (9:16) el reproductor ocupa `story-media`; las capas de la historia (cabecera y texto) dejan libre la franja
   inferior de 48 px de los controles y no capturan clics.
4. **Línea de metadatos:** «Los Sparks · 16:9 · 1920×1080 · 0:50 · 34,8 MB · v1» (duración agregada después de la
   resolución; el tamaño sigue siendo el del original).

## Mobile Target — 390×844

- Regla vigente bajo 1180 px: el inspector pasa debajo del tablero; el reproductor ocupa el ancho de la tarjeta.
- Celdas con dos piezas del mismo formato hacen scroll horizontal dentro de la fila del tablero (contenido en
  `.board-cells`, nunca en la página).
- `playsInline`: en iOS el video se reproduce dentro de la tarjeta; pantalla completa sólo con el control nativo.
- Objetivos táctiles: los controles nativos del navegador; el botón «Ver video» de la celda mide ≥ 44 px de alto.

## Action Hierarchy

- Primary: reproducir (control nativo play dentro de la tarjeta). No hay botón propio que compita con él.
- Secondary: «Ver video» en la celda fantasma de la pestaña Imágenes; «Reintentar» en el estado de error.
- Destructive: ninguna.
- Selection vs action: elegir pieza, canal y variante son selección (`aria-pressed`); reproducir no escribe nada.
- Pending / disabled: mientras carga, el póster queda visible y el navegador muestra su indicador nativo; sin
  derivado de reproducción, no se dibujan controles muertos: se muestra el póster con una nota.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Medio de la tarjeta de feed con proporción real (`Studio-Campaign`, `before-desktop.png`) | `.feed-media` + `style.aspectRatio` vigente sobre `<video>` | el video se ve como se verá en el feed | alto fijo o recorte del video |
| Historia 9:16 con capas (`Studio-Campaign`) | `.story-media` + capas con `pointer-events: none` y franja de controles | la historia sigue leyéndose como historia | ocultar el texto de la historia para hacer sitio |
| Falla honesta de `MediaImage` («Vista previa no disponible») | `.media-fallback` reutilizado por `MediaVideo` | nunca un ícono roto | un reproductor negro sin explicación |
| Etiqueta de formato sobre la miniatura (`.piece-ratio`) | misma pastilla con «16:9 · 0:50» | el tablero dice formato y duración | un ícono de play sobre cada miniatura |
| Claro y oscuro (AXIS 0.2.5) | roles `--card`, `--line`, `--t2`, `--t3` vigentes; fondo del video `#000` sólo dentro del medio | el reproductor no cambia el tema | colores nuevos fuera de `theme.generated.css` |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 2 | Tablero · celda | una o más piezas del formato; duración | `PiecesWorkspace` | `AssetDto` (`currentVersion.durationMs`) |
| 2 | Tablero · celda fantasma | «Ver video» hacia la pieza de video | `PiecesWorkspace` | `AssetDto` del otro tipo |
| 2 | Inspector · feed | reproductor con proporción real | `MediaVideo` | `AssetDto.playback` (TASK-1998) |
| 2 | Inspector · historia | reproductor 9:16 bajo las capas | `MediaVideo` | `AssetDto.playback` |
| 2 | Inspector · metadatos | duración | `PiecesWorkspace` | `currentVersion.durationMs` |

## Copy Ledger

| Id | Texto (es, neutro) | Uso |
|---|---|---|
| `player.label(title)` | «Video: {title}» | `aria-label` del `<video>` |
| `player.unsupported` | «Tu navegador no puede reproducir este video.» | contenido de respaldo dentro de `<video>` |
| `player.notReady` | «La versión para reproducir todavía no está lista. Se muestra el cuadro del segundo 1.» | video sin `playback` (null) |
| `player.failed` | «No se pudo cargar el video.» | error tras un reintento |
| `player.retry` | «Reintentar» | botón del estado de error |
| `workspace.watchVideo` | «Ver video» | celda fantasma de la pestaña Imágenes |
| `duration(ms)` | «0:50», «1:05:09» | miniatura y línea de metadatos (minutos:segundos; horas si corresponde) |

## State Copy

| State | Copy visible | Recovery behavior |
|---|---|---|
| ready | póster + controles nativos; `aria-label` «Video: {title}» | la persona pulsa play |
| loading | póster visible + indicador nativo del navegador (sin texto propio) | se resuelve solo; si falla pasa a error |
| empty | póster (o «Vista previa no disponible») + «La versión para reproducir todavía no está lista. Se muestra el cuadro del segundo 1.» | aparece al recargar cuando el worker genera el derivado |
| partial | sin póster: controles nativos sobre fondo negro del medio; reproduce igual | ninguna acción; el póster aparece cuando exista el `preview` |
| error | «No se pudo cargar el video.» + botón «Reintentar» | «Reintentar» vuelve a pedir el enlace; recargar la página renueva el enlace firmado |
| denied | la campaña ajena responde 404 antes de dibujar la página (regla vigente); el enlace vencido cae en error | recargar la página |

## Accessibility Contract

- Heading order: sin cambios (h1 campaña; el inspector no agrega encabezados).
- Media: `<video controls preload="metadata" playsInline>` con `aria-label` «Video: {title}»; sin `autoplay`, sin `loop`, sin `muted` forzado; el sonido sólo empieza cuando la persona pulsa play.
- Reduced motion: el reproductor nunca arranca solo (con o sin `prefers-reduced-motion`); no se agregan transiciones.
- Keyboard: los controles nativos son alcanzables con Tab; «Ver video» y «Reintentar» son `<button>` con foco visible (`--action`).
- Color-independent state labels: los estados vacío y error llevan texto; la duración es texto, no un ícono.
- Subtítulos: no hay pistas de texto en el catálogo hoy; declarado como deuda (Follow-up), no se simula.

## Implementation Mapping

- Route / surface: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (sin cambios de ruta; ya pasa `AssetDto[]`).
- Primitives: `apps/web/src/components/MediaVideo.tsx` (nuevo, cliente) junto a `MediaImage.tsx`; reutiliza `.media-fallback`.
- Variants / kinds: `MediaVideo` con `className` `feed-media` o `story-media`; sin variantes nuevas.
- Component candidates: `PiecesWorkspace` (celdas con varias piezas, «Ver video», duración, reproductor en feed e historia).
- Copy source: `apps/web/src/copy.ts` (`COPY.player`, `COPY.workspace.watchVideo`, `formatDuration`).
- Data reader / command: `listCampaignAssets` → `AssetDto.playback { url, posterUrl, mimeType, widthPx, heightPx, byteSize }` (TASK-1998); `currentVersion.durationMs` (TASK-1893).
- API parity: la UI sólo pinta el campo del reader; el mismo campo lo leen `GET /api/v1/campaigns/{id}/assets` y la tool `studio.campaign.assets.list`.
- Access / capability: sin cambios (lectura en modo `open`).
- Runtime consumers: web de Studio.
- Print/email/PDF considerations: ninguna.
- GVC markers: `data-capture="piece-inspector"`, `data-capture="piece-player"`, `data-capture="pieces-board"`.

## GVC Scenario Plan

Studio es una app Next.js separada (repo `efeonce-marketing-studio`): `pnpm fe:capture` de Greenhouse no la alcanza. La
evidencia equivalente se produce con Playwright (el de Greenhouse, por `createRequire`) contra `http://localhost:3100`
(`pnpm dev` de Studio sobre la base de staging) con el mismo rigor que GVC premium.

- Scenario file: script de captura en el scratchpad de la sesión (no se versiona en Studio hasta que exista su harness de Playwright de TASK-1895).
- Route: `/campaigns/CMP-001?piece=CMP001-08-video-16x9`, `?piece=CMP001-08-video-16x9-instagram`, `?piece=CMP001-01-video-9x16`.
- Viewports: 1440×1000 desktop y 390×844 mobile; tema claro y oscuro (cookie `studio-theme`).
- Quality profile: `premium`
- Required steps: abrir la pieza 16:9 → esperar `loadedmetadata` → reproducir 2 s → adelantar a 30 s (petición `Range`) → captura; historia 9:16 → captura; pestaña Imágenes → «Ver video» → captura con la pieza de video seleccionada; celda con dos piezas 16:9 → elegir la versión con intro.
- Required captures: reproductor en feed (pausado tras avanzar), historia, celda con dos piezas, estado vacío (pieza sin `playback` forzada en local), mobile 390.
- Required `data-capture` markers: `piece-inspector`, `piece-player`, `pieces-board`.
- Assertions: `video.readyState >= 1`, `duration` ≈ `durationMs` (± 0,5 s), `currentTime` avanza tras play, `error === null`; la petición de medios responde `302` y la final `206`; ningún `autoplay`.
- Scroll-width checks: `document.documentElement.scrollWidth <= clientWidth` en desktop y 390.
- Accessibility/focus checks: Tab llega a los controles; `aria-label` del video; «Ver video» con foco visible.
- Reduced-motion evidence: captura con `reducedMotion: 'reduce'` y el video en pausa (nunca arranca solo).
- Review dossier: capturas `after-*.png` en `docs/ui/visual-sources/TASK-1999-marketing-studio-video-player/` junto a `before-*.png`, y scorecard en `docs/ui/reviews/TASK-1999-marketing-studio-video-player.scorecard.json`.
- Baseline decision: surface ID `studio-campaign-piece-inspector`; la línea base nueva son las capturas `after-*` de esta task.

## Design Decision Log

- Decision: reproductor nativo dentro de la tarjeta que ya muestra la pieza (feed o historia), con el cuadro del segundo 1 como póster; celdas que muestran todas las piezas del formato; «Ver video» desde la pestaña Imágenes.
- Alternatives considered: (a) reproductor propio con controles AXIS — descartado: el pedido es controles nativos, accesibles por defecto, y un control propio agrega trabajo de teclado/lectores sin ganancia; (b) modal o pantalla completa al hacer clic — descartado: saca el video de su contexto (copy, formato, anuncios) y agrega una superficie nueva a la dirección aprobada; (c) autoplay silenciado en el inspector — descartado: el pedido excluye autoplay y Studio es una herramienta de revisión, no un feed; (d) selector de variantes en el inspector — descartado: la variante debe verse en el tablero, que es donde se elige.
- Why this pattern: no agrega regiones ni navegación, respeta la proporción real y deja al navegador la parte difícil (búfer, rangos, pantalla completa, accesibilidad de controles).
- Reuse / extend / new primitive: `MediaVideo` nuevo y local, hermano de `MediaImage` y con su misma falla honesta.
- Open risks: subtítulos ausentes; el enlace firmado vence (HMAC semanal + V4 de 1 h): una pestaña abierta días seguidos cae en error y se recupera recargando.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives (no aplica: sin gráficos).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for a scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
