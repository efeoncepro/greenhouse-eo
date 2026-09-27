# TASK-1924 — Glitch en movimiento con HyperFrames

## Delta 2026-09-27

- **Guttery:** el operador confirmó la licencia para web y video (2026-09-27, segunda respuesta). La Open Question de Guttery queda resuelta; la task registra la referencia del contrato de licencia y sella la fuente.

Decisiones del operador (Julio Reyes) registradas en el [Delta 2026-09-27 del ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--decisiones-del-operador):

- **Numeración resuelta** (Open Question 8): la próxima edición es la **#17**, en la serie del blog y del pipeline
  editorial; la última frase («el #N+1 sale el …») toma N del manifiesto. Los «#11»–«#14» del canvas son ejemplos de
  diseño.
- **Aprobados la manzana como esfera y el verde `#6ec207` como acento de franquicia**, y **Glitch es línea Growth**:
  la apertura y la tarjeta final (puntos → manzana) ya no dependen de esa aprobación; siguen dependiendo de TASK-1922 y
  TASK-1923 y de la aprobación del kit de overlays y las tarjetas finales, que siguen en PROPUESTA.
- **Mnemónico (Open Question 3, abierta):** el operador pidió **evaluarlo y aprobarlo** en una evaluación dedicada.
  Hasta entonces los clips salen mudos con marcador de sincronía y ningún mnemónico se usa como canon.
- **Lower third (Open Question 2, abierta):** su contenido está **en definición con el operador** (sesión en curso).
  La pieza `lower-third` no se construye con contenido inventado.
- **Sigue abierto también:** el paso del flujo de composición del ADR a `Accepted` (sin respuesta).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
  > Razón: las composiciones son piezas de marca que se renderizan a video para un editor externo; no hay ruta,
  > componente, copy ni interacción del portal Greenhouse. La revisión visual es aprobación del operador sobre
  > previews y cuadros clave, no GVC.
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
  > Razón: el campo `Motion` gobierna microinteracciones de UI de Greenhouse. El movimiento de esta task es de marca
  > y su canon es el lenguaje de movimiento de La órbita + el token `glitchLine.motion` de AXIS (TASK-1922) + la spec
  > de producción que crea el Slice 8 (`docs/operations/brand-graphic-line/glitch/GLITCH_MOTION_OVERLAYS_V1.md`).
- Backend impact: `none`
- Epic: `EPIC-031`
- Status real: `Diseno — bloqueada por TASK-1922 (token glitchLine.motion, zonas y archivos) y TASK-1923 (manifiesto de edición); el video de Glitch sigue en PROPUESTA`
- Rank: `TBD`
- Domain: `creative|brand`
- Blocked by: `TASK-1922, TASK-1923, aprobación del operador del kit de overlays y de las tarjetas finales (gate del Slice 2)`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> Prioridad `P2`, impacto `Medio` y esfuerzo `Alto` son inferencia del planificador: todo el video de Glitch está en
> PROPUESTA y el carrusel (TASK-1923) llega antes al público. Ajustar si el operador quiere el vlog para la edición #17.

## Summary

Convierte los overlays del reel 9:16 y del vlog 16:9 de Glitch —apertura (los tres puntos; el tercero se desarma en
bytes y se arma en la manzana, sincronizado con el mnemónico), cabecera noticia n/3 + wordmark, lower third, subtítulo,
tarjeta de noticia, imagen de la fuente en plano dividido, Glitch Drop, última frase y tarjeta final en loop— en
composiciones HyperFrames (HTML + GSAP) que se renderizan **por edición** a video con alfa desde el **mismo manifiesto
de edición** de TASK-1923. Entrega ProRes 4444 `.mov` y WebM VP9 con alfa más un manifiesto de entrega para el editor,
con un comando `pnpm glitch:motion` y una verificación automática (duración, alfa real, cuadros clave, zonas).

## Why This Task Exists

- Hoy el video de Glitch existe sólo como maquetas estáticas en el canvas («Glitch en La órbita») y en los webp del Lab
  de AXIS (`apps/lab/public/media/glitch/reel-*.webp`, `vlog-*.webp`). Cada edición semanal obligaría a un editor o a un
  agente a reanimar las piezas a mano, que es exactamente la reinterpretación que el ADR de Glitch quiere evitar
  («los agentes llenan datos; nunca eligen coordenadas ni plantilla a mano»).
- El host está en cámara todo el tiempo (decisión del operador): el kit son **overlays encima de la toma**, y un
  overlay mal puesto tapa la cara del host o la interfaz de la app. Sin una verificación automática de zonas, ese error
  sólo se detecta cuando el reel ya está publicado.
- La apertura y la tarjeta final son un par espejo que debe empalmar en loop y caer con el golpe del mnemónico; eso sólo
  se sostiene si los tiempos salen de un token, no de un script de sesión.
- El motion de La órbita ya demostró el patrón (render determinista desde tokens, masters con alfa, sin modelo de
  video), pero con un pipeline propio en `scripts/creative/brand-motion/` que no lee manifiestos editoriales ni produce
  kits por edición.

## Goal

- Un kit de overlays de Glitch animado, aprobado por el operador, que un editor monta sobre la toma del host sin tocar
  texto, tiempos ni posiciones.
- Un comando `pnpm glitch:motion` que, desde el manifiesto de edición de TASK-1923, renderiza todas las piezas de la
  edición en 9:16 y 16:9 con alfa real y escribe un manifiesto de entrega (clip, formato, duración, timecode de entrada
  sugerido, texto, marcadores de sincronía).
- Una verificación automática que falla cerrada si un clip no dura lo declarado, no trae alfa real, se desvía de sus
  cuadros clave aprobados o pinta sobre la cara del host o la interfaz de la app.
- Cero valores de movimiento literales: entradas, salidas, curva de los bytes y punto de sincronía salen de
  `glitchLine.motion` (TASK-1922).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` — sobre todo «Decisión propuesta — flujo de composición»
  (punto 4, Motion con HyperFrames) y «Encaje verificado en el Artifact Composer (2026-09-27)» («el movimiento sigue
  fuera del Composer: HyperFrames»). El flujo está **Proposed**: esta task lo implementa sólo para el movimiento.
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` — La órbita, línea madre que Glitch hereda.
- `docs/architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md` — la pieza sonora de Glitch está pendiente.
- `docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md` — **Superseded** en su ubicación de runtime: HyperFrames
  no se implementa como módulo de producto dentro de Greenhouse (el producto es Efeonce Creative Studio / Globe). Esta
  task es tooling local de marca propia, no un servicio de video del portal.
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` — dueño de las piezas estáticas; esta task no
  lo modifica.

Reglas obligatorias:

- **Una sola manzana por pantalla**, también cuando el editor apila dos overlays: el manifiesto de entrega declara
  qué clips llevan manzana y en qué ventana, y la verificación rechaza ventanas sugeridas que se solapen.
- **Nada sobre la cara del host ni sobre la interfaz de la app.** Mapa de zonas del reel 1080 × 1920 (norma §7.2):
  interfaz arriba 0–220 vacía, cabecera 240–440, texto 1150–1480, interfaz abajo desde 1500 vacía, botones desde x 940
  vacíos, la cara nunca se tapa. Las zonas se leen del token de TASK-1922, nunca de este documento.
- **Nunca la falla en bytes sobre un rostro**; la dirección de la falla sale del mismo layout hook determinista de
  TASK-1923, no de una elección del agente.
- **Valores de movimiento desde el token** `glitchLine.motion` (TASK-1922) y, por herencia, `efeonceGraphicLine.motion`
  + `axisMotion.ease` (curvas por papel: llega `emphasized`, se transforma `standard`, se va `emphasizedAccelerate`).
  Si falta un valor, se agrega al token en AXIS con su razón; **nunca** se escribe en la composición.
- **Gramática de movimiento heredada** (lenguaje de La órbita): ritmo lento-rápido-lento, llegar con golpe
  (sobrepaso, pulso), un protagonista a la vez, la velocidad no salta en los relevos.
- **Nunca generar la animación con un modelo de video**: HTML + GSAP determinista, archivos oficiales.
- **Imágenes de terceros**: embebidas o licenciadas, nunca descargadas sin licencia; en navy, con bytes en el borde y
  crédito. Una pieza cuya foto no trae crédito y licencia en el manifiesto no se renderiza.
- **Rasgos exclusivos de Glitch** (manzana, verde `#6ec207`, bytes, Guttery, «EDICIÓN #N») nunca salen de este kit
  hacia piezas de Efeonce.
- **La identidad sonora de Glitch no es canon**: la task no usa ni documenta como canon ningún mnemónico de Glitch
  hasta que el operador decida (norma sonora, «Qué no hacer»).

## Normative Docs

- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` — §3.2 falla en bytes, §3.3 los tres puntos,
  §3.4 tipografía, §7 video (vlog, reel, zonas, 8 piezas, tarjeta final, 16:9), §8 límites, §9 estado de cada pieza.
- `docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md` — las siete reglas del movimiento.
- `docs/operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md` — §6 entregables (ProRes 4444 master, WebM,
  alfa directo sRGB) y §8 QA (alfa limpio sobre negro, blanco y cuadriculado; abre en su aplicación de destino).
- `docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md` — motivo «Puntos suspensivos» (Mi Mi Mi → La, notas de
  140 ms, pausa de 370 ms), niveles por destino, y Glitch pendiente.
- `.claude/skills/efeonce-graphic-line/references/glitch.md` — criterio para agentes de toda pieza de Glitch.
- Skills a cargar al ejecutar: `hyperframes`, `hyperframes-cli`, `motion-design-studio` (+ su overlay
  `efeonce/EFEONCE_OVERLAY.md`), `efeonce-graphic-line`, `gsap`.
- Canvas de referencia visual (privado): https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS (secciones «blog y vlog» y
  «vlog en reel»); renders en AXIS `apps/lab/public/media/glitch/{reel-*,vlog-*}.webp`.

## Dependencies & Impact

### Depends on

- `TASK-1922` (`docs/tasks/to-do/TASK-1922-glitch-axis-franchise-token-contract.md` [verificar]) — token
  `glitchLine` en `@efeoncepro/axis-tokens` con, como mínimo: `motion` (entradas y salidas de overlays, curva y
  escalonamiento de los bytes, punto de sincronía con el mnemónico, permanencias mínimas), zonas seguras por formato y
  por pieza (9:16 y 16:9), color, tipo y cabecera; wordmark light/dark y manzana en `@efeoncepro/axis-brand-assets`;
  contrato `efeonce.glitch-line` 0.1.0. **Sin ese token la task no arranca**: no hay valores que leer.
- `TASK-1923` (`docs/tasks/to-do/TASK-1923-glitch-artifact-composer-catalogs.md` [verificar]) — esquema y validador
  del **manifiesto de edición**, layout hook determinista de la falla en bytes, extensión `glitch` del brand pack
  `axis` (Guttery sellada por checksum) y el catálogo `glitch-overlays` (PNG con alfa) cuyos estáticos son la
  referencia del cuadro asentado de cada overlay animado.
- Aprobación del operador del kit de overlays del reel y de las tarjetas finales (hoy PROPUESTA; gate del Slice 2).
- HyperFrames (CLI `hyperframes`, requiere Node ≥ 22 y FFmpeg). Verificado 2026-09-27: **no** está en
  `package.json`; existe sólo en la caché de `npx` del equipo (`~/.npm/_npx/…/hyperframes` versión `0.6.69`).
- FFmpeg local con `prores_ks`, `libvpx-vp9` (codificador y decodificador) y `hevc_videotoolbox` (verificado
  2026-09-27 en `/opt/homebrew/bin/ffmpeg`).
- `gsap` `^3.15.0`, `sharp` `0.34.5`, `pixelmatch` `^5.3.0`, `pngjs` `^5.0.0`, `playwright` `1.59.1` ya en
  `package.json`.

### Blocks / Impacts

- Flujo semanal de Glitch (ADR punto 5): el editor monta los overlays renderizados del mismo manifiesto.
- `TASK-1441` (piloto de la edición) y `TASK-1442` (dominio/API de ediciones): cuando exista el dominio, el manifiesto
  de edición vendrá de `TASK-1442`; esta task lo consume como archivo, igual que TASK-1923.
- Identidad sonora (pieza de Glitch pendiente): el día que se decida, el Slice 7 agrega la pista del mnemónico sin
  cambiar la imagen.
- Follow-ups: plantillas MOGRT de Premiere; ruta productiva gobernada del render de video (ver Open Questions).

### Files owned

- `scripts/creative/glitch-motion/**` (nuevo): CLI, verificador, adaptador de tokens y manifiesto, composiciones
  HyperFrames por pieza, fixtures, pruebas.
- `package.json` y `pnpm-lock.yaml`: sólo los scripts `glitch:motion` y `glitch:motion:verify` y la dependencia de
  desarrollo `hyperframes` fijada exacta.
- `docs/operations/brand-graphic-line/glitch/GLITCH_MOTION_OVERLAYS_V1.md` (nuevo, spec de producción).
- Deltas acotados en: `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (§7, §9, §10),
  `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` («Trabajo a crear», fila c),
  `docs/documentation/creative/linea-grafica-glitch.md`, `docs/manual-de-uso/creative/componer-piezas-glitch.md`
  (sección de movimiento; el resto es de TASK-1923), `.claude/skills/efeonce-graphic-line/references/glitch.md` y su
  espejo en `.codex/skills/`, `.claude/skills/motion-design-studio/efeonce/EFEONCE_OVERLAY.md` y su espejo.

## Current Repo State

### Already exists

- Wordmark de Glitch: `public/branding/glitch/glitch-light.svg` y `glitch-dark.svg` (fuente temporal hasta que
  TASK-1922 lo publique en `@efeoncepro/axis-brand-assets`).
- Pipeline de motion de marca determinista: `scripts/creative/brand-motion/` (`render-orbit-motion.mjs`,
  `orbit-scene.js`, `orbit-sound.mjs`, `encode-orbit-motion.mjs`). Usa Playwright + sharp + FFmpeg (no HyperFrames),
  lee `efeonceGraphicLine.motion` y `axisMotion.ease`, supermuestrea subcuadros para el desenfoque real y entrega
  ProRes 4444 (`yuva444p10le`), WebM VP9 con alfa (`yuva420p`) y HEVC con alfa. Es el precedente de naming, QA de alfa
  y lectura de tokens.
- Token `efeonceGraphicLine.motion` en AXIS (`packages/tokens/src/tokens.ts`, líneas ~1619–1700 en `main` cf77452):
  curvas por papel, sobrepasos, pulso, resorte, onda, desenfoque por subcuadros, piezas `reveal`/`open`/`sting`.
- HyperFrames `0.6.69` (caché de `npx`, no instalado en el repo): `render --format` acepta `mp4`, `webm`
  (VP9 `yuva420p` con `alpha_mode=1`), `mov` (ProRes 4444 `yuva444p10le`) y `png-sequence` (RGBA), y el render local
  acepta `--fps` entero de 1 a 240 o racional estilo FFmpeg (`30000/1001` para 29,97; `24000/1001`). La skill
  `hyperframes-cli` sólo documenta `mp4`/`webm` y 24/30/60 fps: está desactualizada respecto del binario (verificado
  leyendo `dist/cli.js`; el render en Lambda sí se limita a 24/30/60).
- Fuentes: `src/assets/fonts/BricolageGrotesque-Variable.ttf` (+ OFL) y la familia Poppins. **Guttery no está en el
  repo** (licencia para video y web pendiente).
- Toma de prueba del host (sólo de prueba, generada con IA): `ai-generations/2026-09-21_copiloto/plates/G-podcast-v5.png`.
- Glifos Plastilina de Glitch (alta en AXIS pendiente): `ai-generations/2026-09-26_glitch-iconos/elegidos/*.json`.
- Referencias visuales en AXIS: `apps/lab/src/data/glitch.ts` (`glitchVideo`, `glitchReelKit`, estados «propuesta») y
  `apps/lab/public/media/glitch/{reel-apertura,reel-narrador,reel-noticia,reel-drop,reel-ultima-frase,reel-cierre,reel-kit,reel-mapa,vlog-apertura,vlog-cierre,vlog-guion}.webp`.
  Nota de deriva: el brief y el inventario dicen que el Lab de Glitch está «sin publicar» en `feat/glitch-line`, pero
  el commit `d5846e8` ya es ancestro de `origin/main` de AXIS (verificado 2026-09-27) [verificar con el operador si el
  Lab está desplegado].
- `.gitignore` ya excluye `ai-generations/**/*.{mp4,webm,mov,png}` y existe `pnpm media:archive-ai-generation`.
- Vitest ya incluye `scripts/**/*.test.ts`.

### Gap

- No existe ninguna composición HyperFrames de Glitch ni plantilla animada del kit.
- No existe `glitchLine.motion` ni zonas seguras de Glitch como token (TASK-1922).
- No existe el esquema del manifiesto de edición (TASK-1923) ni un bloque de datos para el video (qué tres noticias
  van al vlog, segmentos del guion, lower third, última frase).
- No hay verificación automática de alfa real, zonas prohibidas ni «una manzana por pantalla» para video.
- No hay manifiesto de entrega para el editor ni timecodes sugeridos.
- HyperFrames no está fijado en el repo: `npx hyperframes` resolvería la última versión publicada en cada corrida.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/creative/glitch-motion/` (CLI, verificador, composiciones HyperFrames y fixtures; corre en la
  máquina del operador o del agente, nunca en Vercel ni en un worker)
- Future candidate home: `undecided`
- Boundary: el adaptador `scripts/creative/glitch-motion/lib/edition-to-compositions.ts` es una función pura
  manifiesto de edición + tokens → datos por composición; el CLI y el verificador son sus únicos consumers. Consume el
  validador del manifiesto y el layout hook de los bytes de TASK-1923 sólo por su entrada pura exportada, y los valores
  sólo desde `@efeoncepro/axis-tokens` / `@efeoncepro/axis-brand-assets`.
- Server/browser split: `sólo CLI local — Node lee archivos y lanza HyperFrames/FFmpeg; el HTML de cada composición corre sólo dentro del Chrome headless de HyperFrames y recibe los datos ya resueltos como JSON inyectado; nada de esto se importa desde src/app ni llega al bundle del portal`
- Build impact: `nueva devDependency exacta hyperframes (trae su propio Chrome y requiere FFmpeg del sistema); no la importa ningún código de src/** ni de services/**, así que no toca el build de Next ni el worker:runtime-deps-gate; los .mov/.webm/.png de salida quedan fuera de git`
- Extraction blocker: `la ruta productiva del render de video no está decidida (Efeonce Creative Studio / Globe vs un consumer tipo artifact-worker de TASK-1921); hasta entonces es tooling local`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fundación: HyperFrames fijado, adaptador y humo con alfa

- Fijar `hyperframes` como devDependency exacta (versión vigente verificada con `pnpm view hyperframes version`; hoy
  `0.6.69` en caché) y confirmar `pnpm exec hyperframes doctor` en verde (Chrome, FFmpeg, Node).
- `scripts/creative/glitch-motion/lib/tokens.ts`: lee `glitchLine` (incluido `motion` y zonas) y
  `efeonceGraphicLine.motion` + `axisMotion.ease` desde `@efeoncepro/axis-tokens`; falla cerrado con un error que nombra
  la clave si falta un valor requerido.
- `scripts/creative/glitch-motion/lib/edition-to-compositions.ts` (puro): manifiesto de edición validado con el
  validador de TASK-1923 + tokens → `{ pieceId, format, width, height, fps, durationMs, data, keyframes, zones,
  hasApple, syncMarkers }` por pieza. Semilla determinista para los bytes = número de edición + id de pieza (la misma
  que usa el layout hook de TASK-1923).
- Plantilla base HyperFrames (`scripts/creative/glitch-motion/compositions/_base/`) con `@font-face` local de Bricolage
  Grotesque y Poppins, fondo transparente, `window.__timelines` síncrono, sin `Math.random`/`Date.now`, y los datos de la
  pieza inyectados como JSON (`window.__glitch`), no escritos en el HTML.
- Prueba de humo: una composición mínima (los tres puntos estáticos) renderizada con `--format mov` y `--format webm`;
  `ffprobe` confirma `yuva444p10le` en el `.mov` y `alpha_mode=1` en el `.webm`; el cuadro extraído con el
  decodificador `libvpx-vp9` tiene esquinas con alfa 0.
- Fixture `scripts/creative/glitch-motion/fixtures/edicion-ejemplo.json` con titulares y noticias **de ejemplo**
  (norma §8), válido contra el esquema de TASK-1923.

### Slice 2 — Animatic de aprobación: apertura y tarjeta final (GATE del operador)

- Composiciones `apertura` y `tarjeta-final` en 9:16 (1080 × 1920) y 16:9 (1920 × 1080; 4K según la Open Question de
  resolución): dos puntos + el tercero se desarma en bytes y se arma en la manzana; la tarjeta final es el espejo exacto
  (los puntos se resuelven en la manzana) y su último cuadro coincide con el primero de la apertura para empalmar en loop.
- El instante en que la manzana termina de armarse es `glitchLine.motion` (punto de sincronía con el mnemónico); se
  registra como marcador en el manifiesto de entrega. Los clips salen **mudos** (identidad sonora de Glitch pendiente).
- Tarjeta final: un mensaje, una acción («Sigue a Glitch»), firma de Efeonce centrada; sin texturas finas (la compresión
  las ensucia).
- Previews para el operador: MP4 H.264 con los overlays compuestos sobre la toma de prueba del host y un storyboard de
  cuadros clave (entrada, sincronía, asentado, salida). Viven en `ai-generations/<fecha>_glitch-motion-animatic/`, fuera
  de git.
- **Gate:** el operador aprueba la apertura, la tarjeta final y los valores del token que usan. Si pide cambios, se
  cambian en el token de AXIS (TASK-1922 o PR de AXIS), se fija la versión y se vuelve a renderizar. Sin aprobación
  registrada no se ejecuta el Slice 3.

### Slice 3 — Kit de overlays del reel 9:16 (GATE del operador)

- Composiciones con fondo transparente, cada una dentro de sus zonas del token: `cabecera` (noticia n/3 + wordmark),
  `lower-third` (contenido según Open Question; no se construye con contenido inventado), `tarjeta-noticia`,
  `imagen-fuente` (plano dividido: la foto de la noticia en navy arriba se desarma en bytes hacia el host, que el editor
  reencuadra abajo; crédito visible; dirección de la falla desde el layout hook de TASK-1923), `glitch-drop` (POV con la
  manzana, la única de la pantalla) y `ultima-frase` («el #N+1 sale el …» en Guttery + píldora «Sigue a Glitch»).
- Entradas y salidas desde `glitchLine.motion` con la curva por papel; permanencia mínima legible desde el token.
- Guttery: la pieza que la usa falla cerrada con `font_unlicensed` mientras la licencia no esté confirmada y la fuente no
  esté sellada en la extensión `glitch` de TASK-1923.
- Previews compuestos sobre la toma de prueba + hoja del kit (equivalente animado de `reel-kit.webp`).
- **Gate:** el operador aprueba el kit. Al aprobar, la norma §9 pasa «Reel (kit de overlays y mapa de zonas)» y
  «Tarjetas finales de video» a APROBADO con fecha (Slice 8).

### Slice 4 — Versiones 16:9 del vlog

- Las mismas piezas en 16:9 con las zonas 16:9 del token. Mientras la norma §7.4 mantenga la noticia y el Drop como
  pantallas completas en 16:9, esas dos salen como clips a pantalla completa con fondo navy (MP4 H.264 + ProRes 4444
  sin alfa) y el resto como overlays con alfa. Si el operador decide overlays también en 16:9, se reusa la variante
  overlay sin cambiar el adaptador.
- Si el token no trae zonas 16:9, el slice queda bloqueado (no se inventan zonas).

### Slice 5 — Subtítulos (post-grabación)

- Única pieza que necesita un segundo insumo: la transcripción con marcas de tiempo por palabra de la toma real
  (`pnpm exec hyperframes transcribe` local o el STT ya usado en la identidad sonora; ver Open Questions).
- Composición `subtitulo`: Poppins 600, blanco sobre navy al 78 %, una palabra en el acento por frase (criterio de
  elección según Open Question), dentro de la zona de texto (1150–1480 en 9:16).
- `pnpm glitch:motion -- --manifest <json> --transcript <json>` rinde el clip de subtítulos por formato y refina los
  timecodes sugeridos del resto del kit con la transcripción.

### Slice 6 — Verificación automática `pnpm glitch:motion:verify`

- `scripts/creative/glitch-motion/verify.ts` sobre un manifiesto de entrega:
  - **Duración:** `ffprobe` del clip = `durationMs` declarado ± 1 cuadro; conteo de cuadros = duración × fps.
  - **Alfa real:** `.mov` en `yuva444p10le`; `.webm` con `alpha_mode=1`; en cuadros extraídos con decodificador
    `libvpx-vp9` hay píxeles con alfa 0 y con alfa 255 (un alfa plano en 255 falla) y, en overlays que no son pantalla
    completa, las cuatro esquinas tienen alfa 0.
  - **Cuadros clave:** se extraen en los tiempos declarados por pieza (entrada, sincronía, asentado, salida) y se comparan
    con `pixelmatch` contra la línea base aprobada del fixture; el cuadro asentado de cada overlay se compara además con
    su PNG estático de `glitch-overlays` (TASK-1923). Tolerancia: sólo antialias (umbral declarado en la spec).
  - **Zonas:** en cuadros muestreados cada N cuadros (N en la spec, nunca sólo los clave), la cantidad de píxeles con
    alfa > 0 dentro de las zonas prohibidas de la pieza (interfaz de la app, botones, cara del host) es 0.
  - **Una manzana:** ningún clip tiene más de un nodo `[data-glitch-apple]` visible en ningún tiempo muestreado
    (lectura del DOM de la composición en el Chrome de HyperFrames) y las ventanas sugeridas de clips con
    `hasApple=true` no se solapan en el montaje propuesto.
  - **Sin literales:** una prueba recorre `compositions/**` y falla si encuentra duraciones, retrasos, curvas o
    coordenadas numéricas literales en GSAP o CSS de posición (todo debe venir de `window.__glitch`).
  - Además corre `pnpm exec hyperframes lint --json` e `inspect --json --strict` por composición.
- Sale con código distinto de cero y un reporte JSON legible si falla cualquier chequeo.

### Slice 7 — CLI `pnpm glitch:motion` y manifiesto de entrega

- `pnpm glitch:motion -- --manifest <json> [--formats 9x16,16x9] [--pieces …] [--transcript <json>]
  [--quality draft|high] [--out <dir>] [--preview-plate <png>]` (nombre a confirmar con el operador). Por defecto
  `--out ai-generations/<fecha>_glitch-edicion-<N>/`.
- Por clip: ProRes 4444 `.mov` (master para Premiere, DaVinci o Final Cut) y WebM VP9 con alfa (revisión web);
  opcionalmente MP4 de preview compuesto sobre la toma de prueba. Nombres
  `glitch-e<N>_<pieza>_<formato>[_n<k>]_alpha_prores4444.mov`, etc.
- Manifiesto de entrega `entrega.json` (esquema `glitch-motion-delivery.v1`): edición, versiones fijadas
  (hyperframes, axis-tokens, contrato `efeonce.glitch-line`, esquema del manifiesto), y por clip: id, pieza, formato,
  resolución, fps, códec, `pix_fmt`, duración, cuadros, timecode de entrada sugerido (SMPTE a los fps de la toma),
  texto visible, `hasApple`, zonas usadas, marcadores de sincronía, SHA-256 y estado (`propuesta`/`aprobado`).
- Corre la verificación del Slice 6 al final y no marca la entrega como lista si falla.
- Si el operador decide la pieza sonora de Glitch, agrega la pista del mnemónico a la apertura y la tarjeta final en
  el marcador de sincronía, nivelada a −14 LUFS y pico −1 dBFS; mientras no, los clips salen mudos con el marcador.

### Slice 8 — Documentación y skills

- Spec de producción nueva `docs/operations/brand-graphic-line/glitch/GLITCH_MOTION_OVERLAYS_V1.md` (piezas, entregables,
  cómo se produce, QA, qué no hacer; los números en el token, no en el doc).
- Deltas: norma de Glitch §7/§9/§10 (estado de piezas aprobadas por el operador, sin adelantar aprobaciones), ADR
  («Trabajo a crear» fila c → TASK-1924), documentación funcional `linea-grafica-glitch.md`, manual
  `componer-piezas-glitch.md` (sección «Overlays en movimiento» paso a paso para el operador y para el editor),
  skill `efeonce-graphic-line/references/glitch.md`, overlay `motion-design-studio/efeonce/EFEONCE_OVERLAY.md` y
  la nota en `hyperframes-cli` de que `mov` y `png-sequence` existen en `0.6.69`, con espejos en `.codex/skills/`.

## Out of Scope

- Grabación del host, edición y montaje del video, color y mezcla final: los hace el editor.
- Publicación en Instagram, TikTok, LinkedIn o YouTube, y el embebido del vlog en el blog.
- Catálogos PNG estáticos (portada del reel, miniatura 1280 × 720, `glitch-overlays` estáticos, carrusel, banners):
  TASK-1923.
- Tokens, archivos y contrato de Glitch en AXIS: TASK-1922 (esta task sólo los consume y, si falta un valor, lo
  pide ahí).
- Componer o decidir la pieza sonora de Glitch: es decisión de la identidad sonora.
- Plantillas MOGRT de Premiere: follow-up sólo si el editor necesita editar texto en su programa.
- Ruta productiva gobernada (command, API, worker, MCP) del render de video.
- Historia 9:16 y carrusel panorámico (EXPLORACIÓN, no canon); acentos teal y naranja.
- Cambiar la numeración de ediciones o el pipeline editorial (EPIC-031, TASK-1440…1448).

## Detailed Spec

### Piezas y formatos

| Pieza | 9:16 (1080 × 1920) | 16:9 | Alfa | Manzana | Insumo del manifiesto |
|---|---|---|---|---|---|
| `apertura` | pantalla completa | pantalla completa | sí (fondo transparente; el editor decide si va sobre navy o sobre la toma) | sí | número de edición |
| `cabecera` | overlay en zona cabecera | overlay | sí | no | número de edición, índice n/3 |
| `lower-third` | overlay | overlay | sí | no | pendiente (Open Question) |
| `subtitulo` | overlay en zona texto | overlay | sí | no | transcripción por palabra (post-grabación) |
| `tarjeta-noticia` | overlay en zona texto | overlay o pantalla completa (§7.4) | sí | no | sección, titular, medio |
| `imagen-fuente` | plano dividido, mitad superior | overlay | sí | no | foto + crédito + licencia (+ caja de rostros si TASK-1923 la define) |
| `glitch-drop` | overlay bajo la cara | overlay o pantalla completa (§7.4) | sí | sí (la única) | POV remate + porqué |
| `ultima-frase` | overlay en zona texto | overlay | sí | no | número de la próxima edición y día |
| `tarjeta-final` | pantalla completa (espejo de la apertura) | pantalla completa | sí | sí | — |

Una edición del vlog comenta tres de las ocho noticias: `cabecera`, `tarjeta-noticia`, `imagen-fuente` y `glitch-drop`
se renderizan una vez por noticia del video (sufijo `_n1`…`_n3`).

### Datos de video en el manifiesto

El manifiesto de edición es de TASK-1923. El video necesita datos que el carrusel no usa; se proponen como bloque
opcional `video` del mismo manifiesto (una sola fuente por edición), agregado en el esquema de TASK-1923 de forma
aditiva y coordinada con su dueña (ver Open Questions):

```json
{
  "video": {
    "news": [1, 4, 6],
    "segments": [
      { "id": "apertura", "estimatedMs": 0 },
      { "id": "noticia", "news": 1, "estimatedMs": 0 },
      { "id": "drop", "news": 1, "estimatedMs": 0 },
      { "id": "cierre", "estimatedMs": 0 }
    ],
    "lowerThird": null,
    "nextEdition": { "number": 12, "day": "lunes" },
    "take": { "fps": 30, "timeline9x16": [1080, 1920], "timeline16x9": [1920, 1080] }
  }
}
```

Los `estimatedMs` salen del guion y sólo alimentan los timecodes sugeridos; los ceros del ejemplo son marcadores del
esquema, no valores. Copy fijo de marca («El micrófono se abre», «GLITCH DROP», «Sigue a Glitch», «El micrófono se
cierra») sale del contrato o del token de TASK-1922 [verificar dónde lo publica], nunca de la composición.

### Contrato de movimiento que se consume

Claves mínimas que esta task espera en `glitchLine.motion` (nombres finales los fija TASK-1922):

- `overlay.enter` / `overlay.exit`: duración, curva por papel (`arrive`/`exit` de `efeonceGraphicLine.motion.curves`),
  desplazamiento relativo al tamaño de la pieza.
- `overlay.minHoldMs` por pieza (legibilidad).
- `bytes`: tamaño de celda (8 bits por celda), escalonamiento, duración por celda, dirección (desde el layout hook),
  curva.
- `dots`: tiempos de los dos puntos y del tercero, desarme y armado de la manzana.
- `mnemonicSyncMs`: instante de la apertura (y del espejo en la tarjeta final) en que la manzana termina de armarse;
  es donde caería la esfera sonora si el operador aprueba un mnemónico.
- `loop`: garantía de espejo (último cuadro de la tarjeta final = primer cuadro de la apertura).

Si una composición necesita un valor que no está, el agente lo pide en TASK-1922 o abre PR en AXIS; no lo escribe.

### Entrega al editor

- Master: ProRes 4444 `.mov`, `yuva444p10le`, alfa directo, sRGB (mismo criterio que los masters de La órbita).
- Revisión web: WebM VP9 `yuva420p` con alfa.
- HEVC con alfa (Safari/Keynote) y secuencias PNG sólo si el editor las pide.
- Los binarios nunca van a git; se archivan con `pnpm media:archive-ai-generation` y se entregan al editor en la
  carpeta de Glitch en OneDrive [verificar ruta con el operador].

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (gate del operador) → Slice 3 (gate del operador) → Slice 4 → Slice 5 → Slice 7 → Slice 8.
- Slice 6 (verificador) se construye en paralelo desde el cierre del Slice 1 y MUST estar verde sobre el fixture antes
  de pedir la aprobación del Slice 3 y antes de cerrar el Slice 7.
- Ningún slice posterior al 2 arranca sin la aprobación registrada de la apertura y la tarjeta final; ninguno posterior
  al 3 sin la aprobación del kit.
- El Slice 1 no arranca hasta que `@efeoncepro/axis-tokens` publique `glitchLine.motion` y el esquema del manifiesto de
  TASK-1923 exista en el repo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `npx hyperframes` resuelve otra versión y cambian los cuadros | tooling / marca | medium | devDependency exacta; versión registrada en `entrega.json`; líneas base por versión | cuadros clave fuera de tolerancia en `glitch:motion:verify` |
| El WebM pierde el alfa al decodificarse con el decodificador VP9 por defecto de FFmpeg | tooling | high | el verificador fuerza `libvpx-vp9`; el master para el editor es ProRes 4444 | chequeo de alfa real rojo |
| Bordes oscuros al montar por alfa premultiplicado vs directo | edición | medium | alfa directo documentado; QA sobre negro, blanco y cuadriculado; prueba de importación del editor antes de la primera edición real | reporte del editor |
| Un overlay pinta sobre la cara del host o la interfaz de la app | marca / publicación | medium | zonas por pieza desde el token; verificación con muestreo denso que falla cerrada | chequeo de zonas rojo |
| Dos manzanas en pantalla al apilar overlays en el montaje | marca | medium | `hasApple` + ventanas sugeridas en `entrega.json`; verificación de solapes; nota al editor en el manual | chequeo «una manzana» rojo |
| Un agente escribe tiempos o coordenadas en la composición | marca | medium | prueba de «sin literales» sobre `compositions/**`; datos sólo por `window.__glitch` | prueba de literales roja |
| Guttery sin licencia para video llega a un clip publicado | legal / marca | medium | la pieza falla cerrada con `font_unlicensed` hasta que TASK-1923 selle la fuente | error `font_unlicensed` en el CLI |
| Se usa un mnemónico no aprobado como canon de Glitch | identidad sonora | low | clips mudos + marcador; la pista sólo entra tras decisión del operador | revisión del operador |
| Los clips se rinden a fps distintos de los de la toma (p. ej. 30 contra 29,97) y derivan en el montaje | edición | medium | fps leídos de `video.take.fps` y pasados tal cual a `--fps` (HyperFrames `0.6.69` acepta racionales como `30000/1001`); timecodes sugeridos a esos fps; la verificación compara el `r_frame_rate` del clip con el de la toma | desfase reportado por el editor o `r_frame_rate` distinto en la verificación |
| Foto de terceros sin licencia en `imagen-fuente` | legal | low | el adaptador rechaza fotos sin crédito y licencia en el manifiesto | error de validación del manifiesto |
| Líneas base inestables entre máquinas por Chrome distinto | tooling | medium | Chrome propio de HyperFrames fijado por versión; tolerancia sólo antialias; `--docker` si está disponible [verificar] | diferencias sólo en antialias o en toda la pieza |
| Otra sesión edita `package.json`/`pnpm-lock.yaml` en paralelo | checkout compartido | medium | commits acotados a los paths propios; `git status --short` antes de cada commit | conflicto en `git status` |

### Feature flags / cutover

Sin flag: herramienta local, additive, sin runtime de producción (repo-only). El cutover es por aprobación del
operador: mientras el kit esté en PROPUESTA, `entrega.json` marca cada clip `propuesta` y la norma no lo lista como
aprobado; sólo tras el gate del Slice 3 los clips salen `aprobado`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir `scripts/creative/glitch-motion/` y la devDependency en `package.json`/`pnpm-lock.yaml` | minutos | si |
| Slice 2 | revertir las composiciones `apertura`/`tarjeta-final`; si cambió un valor del token, volver a fijar la versión anterior de `axis-tokens` | minutos | si |
| Slice 3 | revertir las composiciones del kit y sus líneas base | minutos | si |
| Slice 4 | revertir las variantes 16:9 | minutos | si |
| Slice 5 | revertir `subtitulo` y la lectura de `--transcript` | minutos | si |
| Slice 6 | revertir `verify.ts` y el script `glitch:motion:verify` | minutos | si |
| Slice 7 | revertir el CLI y el script `glitch:motion`; los clips ya entregados al editor no se retiran solos (se avisa al editor) | minutos | parcial |
| Slice 8 | revertir los deltas de docs y skills | minutos | si |

### Production verification sequence

Sin runtime de producción (repo-only, no production runtime impact). Verificación en orden:

1. `pnpm exec hyperframes doctor` verde y humo con alfa del Slice 1.
2. `pnpm glitch:motion -- --manifest scripts/creative/glitch-motion/fixtures/edicion-ejemplo.json --quality draft`
   rinde todas las piezas habilitadas.
3. `pnpm glitch:motion:verify` verde sobre esa entrega (duración, alfa, cuadros clave, zonas, una manzana).
4. Previews sobre la toma de prueba → aprobación del operador (Slices 2 y 3).
5. Prueba de importación del editor: el `.mov` abre en su programa, el alfa se ve limpio sobre la toma y los timecodes
   sugeridos caen donde dice `entrega.json`.
6. Primera edición real con su manifiesto → `--quality high` → verificación → entrega.
7. `pnpm local:check` y `pnpm test` completo antes de cerrar.

### Out-of-band coordination required

- Operador (Julio Reyes): aprobación de la apertura, la tarjeta final y el kit; contenido del lower third; decisión de
  la pieza sonora de Glitch; numeración de ediciones.
- Editor de video: fps y resolución de la línea de tiempo, programa de edición, formato preferido (ProRes 4444 vs
  HEVC con alfa), carpeta de entrega y prueba de importación.
- Licencia de Guttery para video (operador o legal).
- Sesión de AXIS / TASK-1922: publicación de `glitchLine.motion` y de las zonas antes del Slice 1; cualquier cambio de
  valor pedido en los gates pasa por un PR de AXIS.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `hyperframes` figura como devDependency con versión exacta (sin `^` ni `~`) y `pnpm exec hyperframes doctor` pasa.
- [ ] Ningún archivo de `src/**` ni de `services/**` importa `hyperframes` ni nada de `scripts/creative/glitch-motion/`.
- [ ] Todos los valores de movimiento (duraciones, retrasos, curvas, desplazamientos, punto de sincronía) y las zonas
      vienen de `@efeoncepro/axis-tokens`; la prueba de «sin literales» sobre `compositions/**` pasa y falla si se le
      inyecta un `duration: 0.4` literal.
- [ ] Faltar una clave requerida de `glitchLine` hace fallar el CLI con un error que nombra la clave, sin renderizar.
- [ ] Renderizar dos veces el mismo manifiesto produce cuadros clave idénticos dentro de la tolerancia de antialias.
- [ ] La apertura y la tarjeta final existen en 9:16 y 16:9; el último cuadro de la tarjeta final coincide con el
      primero de la apertura (pixelmatch dentro de tolerancia) y el marcador de sincronía está en `entrega.json`.
- [ ] La aprobación del operador de la apertura y la tarjeta final quedó registrada con fecha en la norma de Glitch
      antes de empezar el Slice 3.
- [ ] Las piezas `cabecera`, `tarjeta-noticia`, `imagen-fuente`, `glitch-drop` y `ultima-frase` existen en 9:16 con
      fondo transparente, y `lower-third` existe sólo si el operador definió su contenido.
- [ ] La aprobación del operador del kit del reel quedó registrada con fecha en la norma de Glitch (§9) antes de marcar
      clips como `aprobado`.
- [ ] Cada `.mov` entregado reporta `yuva444p10le` en `ffprobe` y cada `.webm` reporta `alpha_mode=1`.
- [ ] En todo overlay que no es pantalla completa, las cuatro esquinas del cuadro asentado tienen alfa 0 y el cuadro
      tiene píxeles con alfa 255.
- [ ] La verificación de zonas encuentra 0 píxeles con alfa > 0 en las zonas prohibidas de cada pieza, con muestreo
      cada N cuadros según la spec, y falla si se desplaza a propósito la cabecera sobre la franja 0–220.
- [ ] La verificación «una manzana» falla si se agrega un segundo `[data-glitch-apple]` a una composición o si dos
      clips con `hasApple=true` se solapan en los timecodes sugeridos.
- [ ] El cuadro asentado de cada overlay coincide con su PNG estático de `glitch-overlays` (TASK-1923) dentro de la
      tolerancia declarada.
- [ ] Una pieza que usa Guttery falla con `font_unlicensed` mientras la fuente no esté sellada en la extensión `glitch`.
- [ ] Una foto sin crédito o sin licencia en el manifiesto hace fallar `imagen-fuente` sin renderizar.
- [ ] `pnpm glitch:motion` escribe `entrega.json` con, por clip: id, pieza, formato, resolución, fps, códec, `pix_fmt`,
      duración, cuadros, timecode de entrada sugerido, texto visible, `hasApple`, marcadores y SHA-256.
- [ ] Con `--transcript`, el clip `subtitulo` resalta exactamente una palabra por frase en el acento y queda dentro de
      la zona de texto.
- [ ] Los clips de apertura y tarjeta final salen sin pista de audio mientras la pieza sonora de Glitch no esté decidida.
- [ ] `pnpm glitch:motion:verify` sale con código 0 sobre la entrega del fixture y con código distinto de 0 si se
      corrompe el alfa, la duración o una zona.
- [ ] El editor abrió un `.mov` en su programa y confirmó alfa limpio y timecodes correctos (evidencia en Handoff).
- [ ] La spec `GLITCH_MOTION_OVERLAYS_V1.md`, la documentación funcional y el manual tienen la sección de movimiento.

## Verification

- `pnpm exec hyperframes doctor`
- `pnpm exec hyperframes lint --json` e `inspect --json --strict` por composición
- `pnpm test scripts/creative/glitch-motion`
- `pnpm glitch:motion -- --manifest scripts/creative/glitch-motion/fixtures/edicion-ejemplo.json --quality draft`
- `pnpm glitch:motion:verify -- --delivery <out>/entrega.json`
- `pnpm local:check`
- `pnpm test` (completo, gate de cierre)
- `pnpm docs:closure-check`
- Revisión del operador sobre previews y storyboard; prueba de importación del editor.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La norma de Glitch §9 refleja sólo las aprobaciones que el operador dio, con fecha.
- [ ] TASK-1922 y TASK-1923 tienen un `## Delta` si esta task les pidió valores o campos nuevos.
- [ ] Los binarios de las corridas quedaron archivados con `pnpm media:archive-ai-generation` y fuera de git.

## Follow-ups

- Plantillas MOGRT de Premiere si el editor necesita editar texto en su programa.
- Ruta productiva gobernada del render de video (Efeonce Creative Studio / Globe, o un consumer análogo a TASK-1921).
- Pista del mnemónico de Glitch cuando la identidad sonora lo decida.
- HEVC con alfa y secuencias PNG si el editor las pide.
- Leer el manifiesto desde el dominio de ediciones de TASK-1442 en vez de un archivo, cuando exista.

## Open Questions

1. **Motor:** el ADR propuesto y el brief piden HyperFrames, pero el motion de La órbita usa su propio pipeline
   (Playwright + sharp + FFmpeg) con desenfoque real por subcuadros, que HyperFrames no ofrece de forma documentada
   [verificar]. ¿HyperFrames para todo el kit, o el pipeline de `brand-motion` para la apertura y la tarjeta final si
   necesitan desenfoque real?
2. **Lower third (abierta, en definición con el operador):** ¿qué lleva (nombre del host y rol, «Glitch en voz alta»,
   sección + IA, número de edición)? El operador preguntó qué lleva y pidió definirlo en conjunto (2026-09-27).
3. **Mnemónico (abierta, pendiente de evaluación dedicada):** la pieza sonora de Glitch está pendiente (serena con falla
   vs rock) y el operador pidió **evaluarla y aprobarla** (2026-09-27). ¿Los clips salen mudos con marcador de
   sincronía, y el punto de sincronía es la caída de la esfera (La) del motivo «Puntos suspensivos»?
4. **Toma y línea de tiempo:** ¿a qué fps graba el host (HyperFrames `0.6.69` acepta enteros y racionales como
   29,97 en render local) y en qué resolución edita el 16:9 (1920 × 1080 o 3840 × 2160)?
5. **Zonas:** ¿rango vertical de la columna de botones del reel (desde x 940), zona de la cara en el plano dividido y
   zonas seguras del 16:9? Deben quedar en el token de TASK-1922.
6. **Subtítulos:** ¿los rinde esta task desde la transcripción de la toma, o el editor con su herramienta de captions
   usando un estilo? ¿Qué transcriptor (Whisper local de HyperFrames o el STT de la identidad sonora) y cómo se elige la
   palabra en el acento (marcada en el guion o por regla)?
7. **Datos de video:** ¿bloque opcional `video` dentro del manifiesto de TASK-1923 (recomendado: una sola fuente por
   edición) o un manifiesto de video aparte que referencie la edición?
8. ~~**Numeración:** la próxima edición es la #11 para el operador y la #16+ para el ADR del pipeline; afecta
   «el #N+1 sale el lunes» de la última frase.~~ **Resuelta el 2026-09-27:** la próxima es la **#17**, en la serie del
   blog y del pipeline editorial; «el #N+1 sale el lunes» toma N del manifiesto.
9. **16:9:** ¿la noticia y el Drop siguen como pantallas completas o pasan a overlays (norma §7.4 «a revisar»)?
10. **Instalación:** ¿devDependency exacta de `hyperframes` (recomendado) o `pnpm dlx hyperframes@<versión>`? El
    paquete descarga su propio Chrome.
11. **Entrega:** ¿carpeta de OneDrive de Glitch para el editor y si quiere también HEVC con alfa?
12. **Ruta productiva:** ¿basta el CLI local para el flujo semanal o hace falta una ruta gobernada (Creative Studio /
    Globe o un consumer tipo TASK-1921)?
13. **Nombre del comando:** `pnpm glitch:motion` / `pnpm glitch:motion:verify` o convivir con `pnpm glitch:compose`
    de TASK-1923 bajo un prefijo común.
