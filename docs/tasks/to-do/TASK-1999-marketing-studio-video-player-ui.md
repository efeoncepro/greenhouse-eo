# TASK-1999 — Marketing Studio: reproductor de video en el panel de la pieza

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1999-marketing-studio-video-player.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-10-04; consumidora de TASK-1998`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1998` (campo `AssetDto.playback` y transporte con `302`)
- Branch: `efeonce-marketing-studio main (componentes y copy) · Greenhouse develop (docs, capturas, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El panel de la pieza de Studio muestra un video como imagen fija y el tablero dibuja una sola pieza por concepto ×
formato, de modo que la versión «con intro para Instagram» de «Los Sparks» no se puede abrir. Esta task pone un
reproductor nativo en la tarjeta de feed o de historia (póster = cuadro del segundo 1, sin autoplay), muestra todas
las piezas de cada formato en el tablero, agrega la duración y convierte «solo video» en un acceso a la pieza de
video.

## Why This Task Exists

- Verificado el 2026-10-04: `apps/web/src/components/PiecesWorkspace.tsx` dibuja `MediaImage` también para videos;
  no existe ningún `<video>` en `apps/web/src`. Revisar un spot exige ir a OneDrive.
- `PiecesWorkspace` busca la pieza de cada celda con `assets.find(...)`: si un concepto tiene dos piezas del mismo
  tipo y formato (CMP001-08 tiene `video-16x9` y `video-16x9-instagram`), la segunda queda invisible (contador
  «Videos 5», 4 celdas con video).
- La celda «solo video» de la pestaña Imágenes informa que existe un video pero no lleva a él.

## Goal

- Reproducir cualquier video con derivado de reproducción dentro del inspector, con su proporción real, controles
  nativos y sin autoplay.
- Ver y elegir todas las piezas de un formato en el tablero.
- Estados honestos cuando el derivado aún no existe o el video no carga.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (nodo `MS-N3.3` Piezas)
- Skill `efeonce-marketing-studio`

Reglas obligatorias:

- La UI sólo pinta campos del reader (`AssetDto.playback`, `currentVersion.durationMs`); no arma URLs ni firma nada.
- Copy en `apps/web/src/copy.ts`, español neutro sin voseo; `null` = ausente (sin duración → no se muestra).
- Tokens AXIS de `theme.generated.css`; sin hex nuevos fuera del fondo negro del medio de video.
- Sin autoplay; `prefers-reduced-motion` respetado (nada arranca solo ni se anima).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-1999-marketing-studio-video-player.md`

## Dependencies & Impact

### Depends on

- TASK-1998: `AssetDto.playback { url, posterUrl, mimeType, widthPx, heightPx, byteSize } | null` y `GET /api/v1/media/{token}` con `302` para video.
- TASK-1893: `currentVersion.durationMs`.

### Blocks / Impacts

- TASK-1895 (edición y revisión en el inspector) recibe el inspector con el reproductor; sus bloques de versiones y derechos van debajo, sin cambiar la vista en el feed.

### Files owned

- `efeonce-marketing-studio/apps/web/src/components/MediaVideo.tsx` (nuevo)
- `efeonce-marketing-studio/apps/web/src/components/PiecesWorkspace.tsx`
- `efeonce-marketing-studio/apps/web/src/copy.ts` + `copy.test.ts`
- `efeonce-marketing-studio/apps/web/src/app/globals.css` o la hoja de estilos vigente del inspector `[verificar]`
- Greenhouse: `docs/ui/wireframes/TASK-1999-marketing-studio-video-player.md`, `docs/ui/visual-sources/TASK-1999-marketing-studio-video-player/*`, `docs/ui/reviews/TASK-1999-marketing-studio-video-player.scorecard.json`

## Current Repo State

### Already exists

- `PiecesWorkspace.tsx`: tablero concepto × formato (`ratiosFor`, columnas por proporción presente), selector Imágenes/Videos, inspector con `feed-card` (proporción real por `aspectOf`) y `story-card` (9:16), enlace `?piece=`.
- `MediaImage.tsx`: falla honesta (un reintento, `.media-fallback` con «Vista previa no disponible»).
- `copy.ts`: `COPY.workspace.onlyVideo` («solo video»), `ratioLabel`, `COPY.preview.unavailable`.
- Captura del estado vigente: `docs/ui/visual-sources/TASK-1999-marketing-studio-video-player/before-{desktop,mobile}.png`.

### Gap

- Sin `<video>`; sin duración; segunda pieza del mismo formato invisible; «solo video» sin acción.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-marketing-studio` — componentes de la web (`PiecesWorkspace`, `MediaVideo`) en `apps/web/src/components`
- Future candidate home: `remain-shared`
- Boundary: consume `AssetDto` de `listCampaignAssets` (TASK-1998); sin commands
- Server/browser split: `MediaVideo` y `PiecesWorkspace` son Client Components que reciben DTOs ya serializados; sin DB, secretos ni SDKs en el navegador
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de marketing, revisor creativo y responsable de medios de Efeonce.
- Momento del flujo: revisión de piezas en `/campaigns/[campaignId]` (nodo `MS-N3.3`).
- Resultado perceptible esperado: el spot se reproduce dentro de la tarjeta de feed o historia, con su copy al lado.
- Friccion que debe reducir: ir a OneDrive para ver un video; no encontrar la variante para Instagram.
- No-goals UX: autoplay, edición, subtítulos, métricas de reproducción, reproducción en el tablero.

### Surface & system decision

- Surface: inspector de pieza y tablero de `PiecesWorkspace`.
- Nav placement: `none`
- Composition Shell: `no aplica` — Studio no es el portal Greenhouse; se respeta su `Shell` + hero + pestañas + inspector.
- Primitive decision: `extend` — `MediaVideo` nuevo local, hermano de `MediaImage`.
- Adaptive density / The Seam: `no aplica` — el reproductor hereda el ancho de la tarjeta existente.
- Floating/Sidecar/Dialog decision: ninguna superficie nueva.
- Copy source: `local one-off` en `apps/web/src/copy.ts` de Studio (`COPY.player`, `COPY.workspace.watchVideo`).
- Access impact: `none`

### State inventory

- Default: póster + controles nativos.
- Loading: póster + indicador nativo del navegador.
- Empty: video sin `playback` → póster + nota «La versión para reproducir todavía no está lista…».
- Error: «No se pudo cargar el video.» + «Reintentar».
- Degraded / partial: sin póster → controles sobre fondo negro del medio.
- Permission denied: campaña ajena = 404 de la página (vigente).
- Long content: título largo con elipsis en la línea de metadatos (vigente); videos largos con duración `h:mm:ss`.
- Mobile / compact: inspector bajo el tablero; `playsInline`; celdas con varias piezas con scroll interno de la fila.
- Keyboard / focus: Tab a los controles nativos, «Ver video» y «Reintentar».
- Reduced motion: nunca arranca solo; sin transiciones nuevas.

### Interaction contract

- Primary interaction: play/pausa/adelantar con los controles nativos.
- Hover / focus / active: nativos; botones con `:focus-visible` vigente.
- Pending / disabled: sin botones deshabilitados propios.
- Escape / click-away: nativo (pantalla completa).
- Focus restore: al cambiar de pieza, el foco queda en la miniatura elegida (vigente).
- Latency feedback: indicador nativo del navegador.
- Toast / alert behavior: ninguno.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: ninguno.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: sin autoplay en ningún caso.
- Non-goal motion: vista previa animada al pasar el cursor por la miniatura.

### Implementation mapping

- Route / surface: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (sin cambios) → `PiecesWorkspace`.
- Primitive / variant / kind: `MediaVideo` (`feed-media` | `story-media`).
- Component candidates: `MediaVideo`, `PiecesWorkspace`.
- Copy source: `apps/web/src/copy.ts` (`COPY.player`, `COPY.workspace.watchVideo`, `formatDuration`).
- Data reader / command: `listCampaignAssets` → `AssetDto.playback`, `currentVersion.durationMs`.
- API parity: mismo campo para `/api/v1` y `studio.campaign.assets.list`.
- Access / capability: sin cambios.
- States to implement: ready, loading, empty, partial, error (denied ya cubierto por la página).

### GVC scenario plan

- Scenario file: script Playwright en el scratchpad de la sesión contra `http://localhost:3100` (ver wireframe).
- Route: `/campaigns/CMP-001?piece=CMP001-08-video-16x9` (+ `-instagram`, `CMP001-01-video-9x16`).
- Viewports: 1440×1000 y 390×844, claro y oscuro.
- Quality profile: `premium`
- Required steps: abrir, `loadedmetadata`, play 2 s, adelantar a 30 s, historia 9:16, «Ver video» desde Imágenes, celda con dos piezas.
- Required captures: `after-desktop.png`, `after-mobile.png`, `after-story.png`, `after-variants.png`, `after-dark.png`.
- Required `data-capture` markers: `piece-inspector`, `piece-player`, `pieces-board`.
- Assertions: `readyState >= 1`, duración ± 0,5 s, `currentTime` avanza, `error === null`, `302` + `206`, sin `autoplay`.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Reduced-motion / focus evidence: `reducedMotion: 'reduce'` sin reproducción automática; Tab a los controles.
- Review dossier: capturas `after-*` + scorecard `docs/ui/reviews/TASK-1999-marketing-studio-video-player.scorecard.json`.
- Baseline decision / surface ID: `studio-campaign-piece-inspector`; las `after-*` son la línea base nueva.

### Design decision log

- Decision: `<video>` nativo en la tarjeta existente; todas las piezas por celda; «Ver video» desde Imágenes.
- Alternatives considered: reproductor propio, modal, autoplay silenciado, selector de variantes en el inspector (ver wireframe).
- Why this pattern: cero superficies nuevas; el navegador resuelve búfer, rangos, pantalla completa y accesibilidad.
- Reuse / extend / new primitive: `MediaVideo` local nuevo, hermano de `MediaImage`.
- Open risks: sin subtítulos; enlace vencido en pestañas abiertas por días (se recupera recargando).

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440×1000, 390×844.
- Required captures: `after-*` listadas.
- Required `data-capture` markers: `piece-inspector`, `piece-player`, `pieces-board`.
- Scroll-width check: sí.
- Accessibility/focus checks: Tab, `aria-label`, contraste de la nota en ambos temas.
- Before/after evidence: `before-*` (2026-10-04) vs `after-*`.
- Known visual debt: subtítulos.
- Visual scorecard: `docs/ui/reviews/TASK-1999-marketing-studio-video-player.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reproductor

- `MediaVideo` (`controls`, `preload="metadata"`, `playsInline`, `poster`, `aria-label`, respaldo de texto, un reintento, estados vacío/error).
- `PiecesWorkspace`: video en `feed-card` y `story-card` (capas sin capturar clics y franja libre de controles); duración en metadatos.

### Slice 2 — Tablero

- Celdas con todas las piezas del formato; duración en la etiqueta de miniaturas de video; «Ver video» en la celda fantasma.
- Copy y tests de copy.

### Slice 3 — Evidencia

- Capturas `after-*`, scorecard, verificación de scroll horizontal y foco.

## Out of Scope

- Derivado, transporte y contrato (TASK-1998).
- Subtítulos, capítulos, miniaturas de línea de tiempo, métricas de reproducción.
- Versiones, derechos y descarga en el inspector (TASK-1895).

## Detailed Spec

Ver `docs/ui/wireframes/TASK-1999-marketing-studio-video-player.md` (copy ledger, estados, mapping y plan de captura).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1998 desplegada en el mismo ambiente antes que esta UI (sin `playback`, la UI muestra el estado vacío: segura, pero sin valor).
- Slice 1 → Slice 2 → Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Capas de la historia tapan los controles | UI | medium | `pointer-events: none` + franja libre de 48 px, verificada en captura | captura `after-story.png` |
| Celdas con varias piezas generan scroll horizontal de página | UI | low | scroll contenido en `.board-cells` | `scrollWidth` en 390 |
| Enlace firmado vencido en una pestaña abierta por días | UI | low | estado de error con reintento; recargar renueva el enlace | ninguno (cliente) |

### Feature flags / cutover

- Sin flag — aditivo y null-safe: sin `playback`, se ve el estado vacío con el póster.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit + push `main` (o `vercel rollback`) | 5 min | sí |
| Slice 2 | igual | 5 min | sí |
| Slice 3 | sin runtime | — | sí |

### Production verification sequence

1. Local contra staging con capturas y aserciones.
2. Push de Studio `main` sólo con autorización del operador → abrir `studio.efeonce.org/campaigns/CMP-001?piece=CMP001-08-video-16x9` y reproducir.

### Out-of-band coordination required

- Autorización del operador para el push de Studio `main` (= deploy de producción).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: interaction`, wireframe existente; `pnpm task:lint --task TASK-1999` sin hallazgos.
- [ ] Un video con `playback` se reproduce en el inspector con controles nativos, póster y proporción real; nunca arranca solo.
- [ ] La historia 9:16 deja los controles utilizables (capas sin capturar clics).
- [ ] Un video sin `playback` muestra el póster y la nota; un fallo de carga muestra «No se pudo cargar el video.» con «Reintentar».
- [ ] El tablero muestra las dos piezas 16:9 de CMP001-08 y permite abrir la versión con intro.
- [ ] «Ver video» en la pestaña Imágenes abre la pieza de video correspondiente.
- [ ] Todo el copy nuevo vive en `apps/web/src/copy.ts` (español neutro, sin voseo) y lo cubre `copy.test.ts`.
- [ ] Sin scroll horizontal de página en 1440 y 390; capturas `after-*` y scorecard registradas.
- [ ] `pnpm check` y `pnpm build` verdes en Studio.

## Verification

- `pnpm check` y `pnpm build` (Studio)
- Captura Playwright contra `localhost:3100` con aserciones del plan
- Revisión visual de `after-*` frente a `before-*`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Manual de uso y documentación funcional de Marketing Studio actualizados; skill `efeonce-marketing-studio` al día

## Follow-ups

- Subtítulos (pistas WebVTT) cuando el catálogo los tenga.
- Harness Playwright versionado en Studio (TASK-1895) para reemplazar el script de la sesión.
