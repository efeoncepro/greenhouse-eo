# TASK-1924 — Glitch en movimiento con HyperFrames

## Delta 2026-09-27 — motion de Glitch aprobado y sonido integrado

- **Motion APROBADO** por el operador (Julio Reyes, 2026-09-27): «Si, el tuyo también está aprobado». Cubre la apertura
  y la tarjeta final v2 (golpes f24/f48/f69 y f6/f57/f74), el kit de overlays (cabeceras, lower third del host con la
  órbita, invitado, tarjeta de noticia, imagen de la fuente, Glitch Drop y cierre sobre el host), la transición de
  piezas «manzana en bytes» y la transición entre escenas (paquete máscara + capa, y versión héroe); con ellos, los
  tableros de video del canvas que ese motion anima (vlog 16:9 y reel: mapa de zonas, host, noticia, Drop, tarjetas
  finales y hoja del kit). Registrado en la [norma §9](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#9-estado-de-cada-pieza-2026-09-27)
  y en el [ADR, Delta «motion aprobado»](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--motion-aprobado).
  Supersede el «nada aprobado / PILOTO / PROPUESTA» de los Deltas de abajo, que quedan como historia.
- **Sonido integrado al motion** en el taller: `2d411b8` (el sonido aprobado, versión B, dentro de `glitch-motion`,
  con los tiempos leídos del código; `render`, `kit`, `transiciones` y `heroe` entregan el WAV junto a cada `.mov` con
  `--sound b|a|off`, `b` por defecto) y `b40565e` (entregas re-hechas con el WAV junto a cada pieza; los manifiestos
  registran el estado aprobado). Los `.mov` siguen siendo ProRes 4444 sin pista de audio.
- **Open Questions:** la 1 (motor) queda respondida en la práctica (el kit aprobado se hizo entero con HyperFrames) y la 9
  (16:9) también (el kit del vlog aprobado lleva la tarjeta de noticia como overlay y el Drop a pantalla completa).
- **Siguen pendientes:** fps de grabación (hoy 30) y prueba con los editores en una edición real; parámetro de ritmo; a
  qué piezas se aplica la transición de bytes (recomendación: tarjetas y Drop); estilo de subtítulos; textos reales de
  la #17; formulario de autoservicio en Marketing Studio; tokens `glitchLine` (TASK-1922); archivo en GCS; push del
  repo taller; excepción de rostros (por defecto, la falla nunca sobre un rostro). Los desvíos respecto de esta spec
  (manifiesto de TASK-1923, `yuva444p10le`/WebM, nombres de pieza, `entrega.json`, `verify`, PR y CI) siguen abiertos.
  El Lifecycle no cambia: la task sigue en `to-do`.

## Delta 2026-09-27 — sonido de Glitch aprobado, versión B (sólo Glitch)

- El **diseño sonoro de Glitch** (sólo Glitch, nunca Efeonce) quedó **APROBADO en su versión B** («más punch») el
  2026-09-27: el operador dijo «La b me encanta más. Sus sonidos están aprobados». La A queda como alternativa
  descartada. Esa aprobación resuelve las cuatro decisiones del sonido (B; dos golpes graves, apertura y Drop; voz sola
  bajo las noticias; clic del micrófono y trazo del plumón sintetizados se quedan) y **cierra, para el sonido, la Open
  Question 3 (mnemónico)**. Es aprobación del sonido, no del motion. Está sincronizado cuadro a cuadro con el piloto de
  motion: un WAV por `.mov` más pistas por transición. Archivos aprobados (sólo B) en
  `gs://efeonce-group-axis-public-media/glitch/sound/v1/` (`masters/` y `web/`); página AXIS
  `/references/glitch/#sonido` y `/references/glitch.json`, campo `sound` (publicados 2026-09-27). Observación no
  bloqueante: en B, el golpe del cuadro 74 de la tarjeta final queda más tapado que en A. Detalle en la [norma §13.11](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1311-sonido--sólo-glitch-aprobado-versión-b).
- El motor de sonido **ya está migrado** al taller (commit `2d411b8`, 2026-09-27): `dsp.mjs` pasó sin cambios a
  `tools/brand-sound` (con pruebas) y `glitch-sfx.mjs` pasó a `tools/glitch-motion/src/sound.mjs`, que lee todos los
  tiempos del código (`TIMING` de `pieces.mjs`; `KIT_TIMING`, `APPLE_BYTES` y `ANIMATIC` de `overlays.mjs`; `schedule()`
  de `transitions.mjs`). Migración fiel: los 30 WAV de la B salen idénticos byte a byte; se agregó la transición héroe
  desde izquierda y marca (antes sólo centro) sin alterar la secuencia aprobada. `render`, `kit`, `transiciones` y
  `heroe` entregan el WAV B junto a cada `.mov` en OneDrive, con la duración verificada y vistas previas con sonido. La
  copia de `greenhouse-eo` (`ai-generations/2026-09-26_branding-sonoro/motor/glitch-sfx.mjs` y su `dsp.mjs`, commits
  `2fee1f487` y `556c83ae2`) queda como histórico.
- **Si esta task cambia tiempos del motion** (piezas, overlays o transiciones), basta con volver a correr el mismo
  comando del motion: el sonido se regenera con los tiempos nuevos y sigue calzando.
- **No cambia el alcance de esta task:** los overlays siguen saliendo mudos (ProRes 4444 sin audio); el sonido va aparte.

## Delta 2026-09-27

- **Guttery:** el operador confirmó la licencia para web y video (2026-09-27, segunda respuesta). La Open Question de Guttery queda resuelta; la task registra la referencia del contrato de licencia y sella la fuente.
- **Reubicación al repo taller (2026-09-27):** todo el trabajo que esta task ubicaba en `scripts/creative/glitch-motion/**`
  de Greenhouse pasa a `tools/glitch-motion/**` del repo taller privado `efeoncepro/efeonce-brand-workshop`, según la
  [decisión del taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) (Accepted por el operador el
  2026-09-27). Greenhouse no gana ninguna dependencia ni script en su `package.json`; HyperFrames se fija exacto en el
  `package.json` del paquete del taller. Las corridas (`entrega.json`, `manifiesto.json`, fichas) van a
  `corridas/AAAA-MM-DD_<tema>/` del taller y los binarios (ProRes, WebM, PNG, MP4) a GCS por sha256 u OneDrive, nunca a
  git. Globe queda descartado como ubicación (ni como repositorio): su CI corre en cada push, sus gates barren
  `git ls-files` y es un producto comercial (ADR-010). La documentación gobernante (spec de producción, norma, ADR,
  manual) sigue en Greenhouse. Se opera desde sesiones de `greenhouse-eo` con sus skills, invocando
  `pnpm -C ../efeonce-brand-workshop …`. `tools/foto/` y `tools/brand-motion/` son de TASK-1925, no de esta task.

Decisiones del operador (Julio Reyes) registradas en el [Delta 2026-09-27 del ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--decisiones-del-operador):

- **Numeración resuelta** (Open Question 8): la próxima edición es la **#17**, en la serie del blog y del pipeline
  editorial; la última frase («el #N+1 sale el …») toma N del manifiesto. Los «#11»–«#14» del canvas son ejemplos de
  diseño.
- **Aprobados la manzana como esfera y el verde `#6ec207` como acento de franquicia**, y **Glitch es línea Growth**:
  la apertura y la tarjeta final (puntos → manzana) ya no dependen de esa aprobación; siguen dependiendo de TASK-1922 y
  TASK-1923 y de la aprobación del kit de overlays y las tarjetas finales, que siguen en PROPUESTA.
- **Mnemónico (Open Question 3 — resuelta el 2026-09-27: el sonido de Glitch quedó aprobado en su versión b y se integró al taller, ver Deltas de arriba):** el operador pidió **evaluarlo y aprobarlo** en una evaluación dedicada.
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
- Status real: `Motion APROBADO por el operador (2026-09-27) en el repo taller efeonce-brand-workshop, tools/glitch-motion (commits locales sin push): apertura/tarjeta final v2, kit de overlays reel y vlog, lower third con la órbita real y transiciones de bytes (piezas y escenas); sonido aprobado (B) integrado: cada render entrega el WAV junto a cada .mov (2d411b8, b40565e); falta reconciliar con TASK-1922 (token glitchLine.motion) y TASK-1923 (manifiesto), PR con CI del taller, archivo en GCS, prueba de los editores en una edición real, fps, subtítulos y textos reales de la #17`
- Rank: `TBD`
- Domain: `creative|brand`
- Blocked by: `TASK-1922, TASK-1923, CI mínimo del taller de TASK-1925 antes de integrar código a su main` (la aprobación del operador del kit de overlays y de las tarjetas finales, gate del Slice 2, quedó dada el 2026-09-27)
- Branch: `efeonce-brand-workshop: rama de trabajo + PR a main (el CI del taller sólo corre en pull_request); Greenhouse develop sólo para docs y skills; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> Prioridad `P2`, impacto `Medio` y esfuerzo `Alto` son inferencia del planificador: todo el video de Glitch está en
> PROPUESTA y el carrusel (TASK-1923) llega antes al público. Ajustar si el operador quiere el vlog para la edición #17.

## Delta 2026-09-27 — piloto de motion producido en el taller

> **Todo esto es SÓLO para Glitch.** La transición de la manzana en bytes es exclusiva de Glitch y nunca se usa en
> piezas de Efeonce. Nada está aprobado: la task sigue en `to-do` y cada pieza es PILOTO / PROPUESTA.

Se produjo un **piloto** en `tools/glitch-motion/` del repo taller (paquete pnpm `glitch-motion`), **antes** de
TASK-1922 y TASK-1923 y fuera del orden de slices, para que el operador evaluara el movimiento. Commits locales **sin
push**: `38ac584` piloto v1, `f4782cb` v2 «más punch», `5282f80` kit, `9f6a1ea` órbita + transición de bytes en piezas,
`c2a08c3` transiciones entre escenas; manifiestos de corrida `95cf425`, `8dfa69c`, `17f80f2`, `ac5d021`, `2ae0f65`.
Detalle operativo en la [norma de Glitch §13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#13-motion-y-transiciones--solo-glitch)
y decisiones en el [ADR de Glitch, Delta «piloto de motion en el taller»](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--piloto-de-motion-en-el-taller).

Qué existe:

- Motor HyperFrames 0.6.69 + GSAP 3.14.2 con CustomEase (copiados al build: render sin red); `@efeoncepro/axis-tokens`
  0.3.8 y `@efeoncepro/axis-brand-assets` 0.3.4; paleta y manzana de Glitch como propuesta espejada del AXIS Lab (sin
  token `glitchLine` todavía). Fuentes: Bricolage, Poppins y Guttery (licenciada, instalada en la máquina, nunca en git).
- Scripts del paquete: `doctor`, `render` (apertura + tarjeta final), `kit` (overlays), `transiciones` (paquete máscara +
  capa), `heroe` (transición de un corte) y `test` (7 pruebas: registro de timelines, determinismo, sin red, datos de
  edición en pantalla). No hay un script `verify` separado: la verificación corre dentro de cada comando.
- Apertura (4 s) y tarjeta final (3 s) v1 y v2 en reel y vlog, mudas, con golpes marcados en f24/f48/f69 y f6/f57/f74;
  bucle exacto entre el último cuadro de la tarjeta y el primero de la apertura (PSNR ∞).
- Kit de overlays reel y vlog (cabeceras, lower third del host con la órbita real y del invitado, noticias, fuente,
  Drop, CTA) desde el archivo de edición `ejemplos/edicion-17.ejemplo.json`; verificación 60/60 (códec, cuadros, alfa de
  entrada y salida) y animatic de 45 s por formato.
- Transición de piezas «manzana en bytes» (prototipo en tarjeta y Drop, 18/18); transición entre escenas: paquete
  máscara + capa (72/72) y héroe (6/6), con la regla de rostros aplicada por defecto.
- Entregas en OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/` (resuelve la ruta de la Open Question 11).

Desvíos respecto de esta spec, a reconciliar antes de cerrar:

- El texto sale de un archivo de edición propio del taller, no del manifiesto ni del JSON Schema de TASK-1923; la falla
  en bytes se calcula en el taller y no llega resuelta en un plan de movimiento.
- La salida es ProRes 4444 `yuva444p12le` (la spec pedía `yuva444p10le`) y no se produjo WebM VP9 con alfa.
- Los nombres de pieza difieren: `noticia-N` (spec: `tarjeta-noticia`), `fuente-N` (`imagen-fuente`), `drop`
  (`glitch-drop`), `cta` (`ultima-frase`).
- Los valores de Glitch no vienen de `glitchLine.motion`; no hay `entrega.json` con timecodes sugeridos; los binarios
  están en OneDrive y todavía no archivados en GCS (el manifiesto guarda su sha256); el código no pasó por PR ni por el CI del taller.

Open Questions que cambian: la 1 (motor) se probó con HyperFrames para todo el kit, pendiente de aprobación; la 2 (lower
third) queda **resuelta** (ver abajo); la 4 (fps) sigue abierta, el piloto rinde a 30 fps; la 6 (subtítulos) sigue
abierta, el estilo de captions en Premiere no está hecho; la 11 (entrega) tiene carpeta de OneDrive. Pendiente de
decisión del operador: intensidad v2, prueba de los editores en Premiere y After Effects, parámetro de ritmo (posible,
no implementado), a qué piezas va la transición de bytes, textos reales de la #17, formulario de autoservicio
en Marketing Studio (recomendado; `.mogrt` descartado), excepción de rostros, tokens (TASK-1922) y push de los repos.

## Summary

Convierte los overlays del reel 9:16 y del vlog 16:9 de Glitch —apertura (los tres puntos; el tercero se desarma en
bytes y se arma en la manzana, sincronizado con el mnemónico), cabecera noticia n/3 + wordmark, lower third, subtítulo,
tarjeta de noticia, imagen de la fuente en plano dividido, Glitch Drop, última frase y tarjeta final en loop— en
composiciones HyperFrames (HTML + GSAP) que se renderizan **por edición** a video con alfa desde el **mismo manifiesto
de edición** de TASK-1923. Entrega ProRes 4444 `.mov` y WebM VP9 con alfa más un manifiesto de entrega para el editor,
con un comando de render y una verificación automática (duración, alfa real, cuadros clave, zonas). Todo vive en
`tools/glitch-motion/` del repo taller `efeoncepro/efeonce-brand-workshop` y se opera desde `greenhouse-eo` con
`pnpm -C ../efeonce-brand-workshop --filter glitch-motion …`.

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
- El operador no quiere producción de video fuera del scope de Greenhouse dentro de Greenhouse, y Globe está hibernado:
  el render nace en el repo taller de producción de marca, que converge con Globe cuando Globe se reactive.

## Goal

- Un kit de overlays de Glitch animado, aprobado por el operador, que un editor monta sobre la toma del host sin tocar
  texto, tiempos ni posiciones.
- Un comando del taller (`pnpm -C ../efeonce-brand-workshop --filter glitch-motion render`) que, desde el manifiesto de
  edición de TASK-1923, renderiza todas las piezas de la edición en 9:16 y 16:9 con alfa real y escribe, en la corrida
  del taller, un manifiesto de entrega (clip, formato, duración, timecode de entrada sugerido, texto, marcadores de
  sincronía, sha256) y el `manifiesto.json` de binarios con su ubicación en GCS u OneDrive.
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

- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` — sobre todo «Decisión — flujo de composición» (punto 4,
  Motion con HyperFrames), «Encaje verificado en el Artifact Composer (2026-09-27)» («el movimiento sigue fuera del
  Composer: HyperFrames») y «Delta — flujo aceptado, hogar del movimiento y Marketing Studio». El flujo está
  **Accepted** (2026-09-27) y el hogar del movimiento quedó decidido: el repo taller. Esta task lo implementa sólo para
  el movimiento.
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` — La órbita, línea madre que Glitch hereda.
- `docs/architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md` — la pieza sonora de Glitch está pendiente.
- `docs/architecture/GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md` — **Superseded** en su ubicación de runtime: HyperFrames
  no se implementa como módulo de producto dentro de Greenhouse (el producto es Efeonce Creative Studio / Globe). Esta
  task es tooling de marca propia en el repo taller, no un servicio de video del portal.
- `docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` — **Accepted** (2026-09-27): el repo taller
  `efeoncepro/efeonce-brand-workshop` es la ubicación de esta task (`tools/glitch-motion/`). Reglas duras que aplican:
  cero binarios en git, cero rutas absolutas versionadas, cero documentación gobernante en el taller, cero despliegue ni
  runtime, nunca copiar skills al taller, se opera desde `greenhouse-eo`, converge con Globe cuando Globe se reactive.
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
- `TASK-1923` (`docs/tasks/to-do/TASK-1923-glitch-artifact-composer-catalogs.md`, verificado 2026-09-27) — esquema y
  validador del **manifiesto de edición** (`GlitchEditionManifest`, `schemaVersion: 1`, zod en
  `src/lib/glitch-composition/manifest.ts` de Greenhouse), función pura de la falla en bytes (`computeByteFracture`) y
  layout hook `glitch-fracture`, extensión `glitch` del brand pack `axis` (Guttery sellada por checksum) y el catálogo
  `glitch-overlays` (PNG con alfa) cuyos estáticos son la referencia del cuadro asentado de cada overlay animado.
  **El taller no importa código de Greenhouse**: consume archivos JSON que Greenhouse exporta (ver «Cómo se comparte el
  manifiesto con el taller» en Detailed Spec).
- `TASK-1925` (migración al taller) — dueña del CI mínimo del taller (sólo `pull_request`: lint + gate de binarios y
  rutas absolutas), del bucket de binarios por sha256 y del formato de `corridas/<id>/manifiesto.json`. Si esta task
  llega primero al taller, el primer código de `tools/glitch-motion/` no se integra a `main` sin ese CI: se coordina con
  TASK-1925 para que entre antes o en el mismo PR; esta task **no** crea un CI ni un formato de manifiesto paralelos.
- Aprobación del operador del kit de overlays del reel y de las tarjetas finales (hoy PROPUESTA; gate del Slice 2).
- HyperFrames (CLI `hyperframes`, requiere Node ≥ 22 y FFmpeg). Verificado 2026-09-27: **no** está en ningún
  `package.json` (ni de Greenhouse ni del taller); existe sólo en la caché de `npx` del equipo (versión `0.6.69`).
  Se fija exacto como dependencia del paquete `tools/glitch-motion/` del taller; nunca en Greenhouse.
- FFmpeg local con `prores_ks`, `libvpx-vp9` (codificador y decodificador) y `hevc_videotoolbox` (verificado
  2026-09-27 en el Homebrew del equipo del operador; la ruta de la máquina nunca se versiona en el taller).
- Dependencias del paquete del taller (todas con versión exacta en `tools/glitch-motion/package.json`): `hyperframes`,
  `gsap`, `sharp`, `pixelmatch`, `pngjs`, `playwright`, un validador genérico de JSON Schema (p. ej. `ajv`), `vitest`,
  `@efeoncepro/axis-tokens` y `@efeoncepro/axis-brand-assets` (hoy Greenhouse fija `0.3.8` y `0.3.4`; el taller fija la
  versión que publique TASK-1922). Los paquetes `@efeoncepro/*` vienen de GitHub Packages: el taller necesita el
  registro del scope en su `.npmrc` y el token por variable de entorno, nunca versionado [verificar si lo crea TASK-1925].
- Verificado 2026-09-27 en el taller (`main` `430d5b0`): `pnpm-workspace.yaml` declara `tools/*`, `tools/` sólo tiene
  `README.md` (con la fila `glitch-motion/` «Nace aquí (TASK-1924)») y el `.gitignore` ya excluye imágenes, video, audio,
  PDF, 3D y `out/`. El paquete `glitch-motion` todavía no existe: lo crea el Slice 1 con `"name": "glitch-motion"`, que es
  el nombre que usan los comandos `--filter glitch-motion` de esta task.

### Blocks / Impacts

- Flujo semanal de Glitch (ADR punto 5): el editor monta los overlays renderizados del mismo manifiesto.
- `TASK-1441` (piloto de la edición) y `TASK-1442` (dominio/API de ediciones): cuando exista el dominio, el manifiesto
  de edición vendrá de `TASK-1442`; esta task lo consume como archivo, igual que TASK-1923.
- Identidad sonora (pieza de Glitch pendiente): el día que se decida, el Slice 7 agrega la pista del mnemónico sin
  cambiar la imagen.
- Follow-ups: plantillas MOGRT de Premiere; ruta productiva gobernada del render de video (ver Open Questions).

### Files owned

En el repo taller `efeoncepro/efeonce-brand-workshop`:

- `tools/glitch-motion/**` (nuevo): `package.json` del paquete `glitch-motion` (scripts `render`, `verify`, `test`,
  `doctor`; dependencias exactas, incluida `hyperframes`), CLI, verificador, adaptador de tokens y manifiesto,
  composiciones HyperFrames por pieza, copia versionada del JSON Schema del manifiesto, fixtures de texto y pruebas.
- `pnpm-lock.yaml` del taller: sólo las entradas del paquete `glitch-motion`.
- `corridas/AAAA-MM-DD_glitch-*/` que produzca esta task: `entrega.json`, `manifiesto.json`, fichas y logs (texto);
  sus binarios sólo en GCS u OneDrive.
- **No** son de esta task: `tools/foto/`, `tools/brand-motion/`, el CI del taller, el bucket ni el formato de
  `manifiesto.json` (TASK-1925), ni los routers `README.md`/`CLAUDE.md`/`AGENTS.md` del taller (salvo la fila de
  `glitch-motion` en `tools/README.md`).

En Greenhouse (sólo documentación y skills; ningún cambio en `package.json`, `pnpm-lock.yaml`, `scripts/` ni `src/`):

- `docs/operations/brand-graphic-line/glitch/GLITCH_MOTION_OVERLAYS_V1.md` (nuevo, spec de producción).
- Deltas acotados en: `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (§7, §9, §10),
  `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` («Trabajo a crear», fila c),
  `docs/documentation/creative/linea-grafica-glitch.md`, `docs/manual-de-uso/creative/componer-piezas-glitch.md`
  (sección de movimiento; el resto es de TASK-1923), `.claude/skills/efeonce-graphic-line/references/glitch.md` y su
  espejo en `.codex/skills/`, `.claude/skills/motion-design-studio/efeonce/EFEONCE_OVERLAY.md` y su espejo.

## Current Repo State

### Already exists

- Repo taller `efeoncepro/efeonce-brand-workshop` (privado, clonado como hermano de `greenhouse-eo`, `main` `430d5b0`):
  esqueleto con routers, workspace `tools/*`, `corridas/` con su README y `.gitignore` de binarios. Sin código, sin CI y
  sin bucket todavía (TASK-1925). Verificado 2026-09-27.
- Wordmark de Glitch: `public/branding/glitch/glitch-light.svg` y `glitch-dark.svg` en Greenhouse (fuente temporal
  hasta que TASK-1922 lo publique en `@efeoncepro/axis-brand-assets`; el taller lo toma **sólo** del paquete de AXIS,
  nunca de `public/` de Greenhouse).
- Pipeline de motion de marca determinista en Greenhouse (lo migra TASK-1925 a `tools/brand-motion/` del taller; esta
  task lo usa sólo como precedente, no lo toca): `scripts/creative/brand-motion/` (`render-orbit-motion.mjs`,
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
- Fuentes en Greenhouse: `src/assets/fonts/BricolageGrotesque-Variable.ttf` (+ OFL) y la familia Poppins. **Guttery no
  está en ningún repo** (licencia para web y video confirmada por el operador el 2026-09-27; falta registrar la
  referencia del contrato). El taller no versiona fuentes (son binarios) ni las lee de `src/assets/` de Greenhouse: las
  toma de un paquete de AXIS sellado por checksum [verificar que TASK-1922 publique Bricolage, Poppins y Guttery en
  `@efeoncepro/axis-brand-assets`; si no, se pide ahí].
- Toma de prueba del host (sólo de prueba, generada con IA), en Greenhouse:
  `ai-generations/2026-09-21_copiloto/plates/G-podcast-v5.png`. El taller la recibe por argumento de CLI en tiempo de
  ejecución (`--preview-plate`) o por su sha256 en GCS; nunca como ruta versionada.
- Glifos Plastilina de Glitch (alta en AXIS aprobada, publicación pendiente en TASK-1922):
  `ai-generations/2026-09-26_glitch-iconos/elegidos/*.json`.
- Referencias visuales en AXIS: `apps/lab/src/data/glitch.ts` (`glitchVideo`, `glitchReelKit`, estados «propuesta») y
  `apps/lab/public/media/glitch/{reel-apertura,reel-narrador,reel-noticia,reel-drop,reel-ultima-frase,reel-cierre,reel-kit,reel-mapa,vlog-apertura,vlog-cierre,vlog-guion}.webp`.
  Nota de deriva: el brief y el inventario dicen que el Lab de Glitch está «sin publicar» en `feat/glitch-line`, pero
  el commit `d5846e8` ya es ancestro de `origin/main` de AXIS (verificado 2026-09-27) [verificar con el operador si el
  Lab está desplegado].
- El `.gitignore` del taller ya excluye `*.png`, `*.mov`, `*.webm`, `*.mp4`, audio, PDF, 3D y `out/`. El archivo a GCS
  del taller todavía no existe (TASK-1925); `pnpm media:archive-ai-generation` es de Greenhouse y sirve sólo a
  `ai-generations/`, no a las corridas del taller.

### Gap

- No existe el paquete `tools/glitch-motion/` en el taller (ni `package.json`, ni pruebas, ni configuración de Vitest).
- No existe ninguna composición HyperFrames de Glitch ni plantilla animada del kit.
- No existe `glitchLine.motion` ni zonas seguras de Glitch como token (TASK-1922).
- No existe el esquema del manifiesto de edición (TASK-1923) ni un bloque de datos para el video (qué tres noticias
  van al vlog, segmentos del guion, lower third, última frase).
- No hay verificación automática de alfa real, zonas prohibidas ni «una manzana por pantalla» para video.
- No hay manifiesto de entrega para el editor ni timecodes sugeridos.
- HyperFrames no está fijado en ningún repo: `npx hyperframes` resolvería la última versión publicada en cada corrida.
- No existe una exportación del manifiesto de edición que el taller pueda leer sin importar código de Greenhouse (JSON
  Schema del manifiesto y plan de movimiento con la falla en bytes resuelta; ver Detailed Spec).

## Modular Placement Contract

- Topology impact: `tooling`
  > Fuera de Greenhouse: el código nace en el repo taller hermano; en Greenhouse sólo cambian documentación y skills.
- Current home: `efeonce-brand-workshop/tools/glitch-motion` (repo taller privado efeoncepro/efeonce-brand-workshop; CLI, verificador, composiciones HyperFrames y fixtures de texto; corre en la máquina del operador o del agente, invocado desde greenhouse-eo con pnpm -C ../efeonce-brand-workshop, nunca en Vercel, Cloud Run ni un cron)
- Future candidate home: `domain-package`
  > Razón: converge con Efeonce Creative Studio (Globe) como paquete, con su historia, cuando Globe reactive su
  > capacidad de generación ([decisión del taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) §2.7).
  > No es un paquete de Greenhouse ni vuelve a Greenhouse.
- Boundary: `el adaptador tools/glitch-motion/src/edition-to-compositions.ts es una función pura (plan de movimiento exportado por Greenhouse + tokens de AXIS a datos por composición); sus únicos consumers son el CLI y el verificador del paquete; los valores salen sólo de @efeoncepro/axis-tokens y @efeoncepro/axis-brand-assets; el manifiesto de edición llega como archivo JSON validado contra el JSON Schema versionado, sin importar código de Greenhouse`
- Server/browser split: `sólo CLI local — Node lee archivos y lanza HyperFrames/FFmpeg; el HTML de cada composición corre sólo dentro del Chrome headless de HyperFrames y recibe los datos ya resueltos como JSON inyectado; nada llega al portal Greenhouse`
- Build impact: `cero en Greenhouse (ninguna dependencia ni script nuevo en el package.json de greenhouse-eo); en el taller, hyperframes fijado exacto en tools/glitch-motion/package.json (trae su propio Chrome y requiere FFmpeg del sistema), aislado de foto y brand-motion por el workspace tools/*; los .mov/.webm/.png/.mp4 de salida quedan fuera de git`
- Extraction blocker: `Globe hibernado: la convergencia con Globe espera a que el operador reactive su capacidad de generación; hasta entonces el render es tooling local del taller y no tiene ruta productiva gobernada`

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

### Slice 1 — Fundación en el taller: paquete, HyperFrames fijado, adaptador y humo con alfa

En el repo taller, clonado como hermano de `greenhouse-eo` (`../efeonce-brand-workshop`); en sus archivos versionados
sólo rutas relativas:

- Crear el paquete `tools/glitch-motion/` con `package.json` `"name": "glitch-motion"`, `"private": true`, scripts
  `render`, `verify`, `test` y `doctor`, y todas las dependencias con versión exacta (sin `^` ni `~`). Fijar `hyperframes`
  a la versión vigente verificada con `pnpm view hyperframes version` (hoy `0.6.69` en caché) y confirmar
  `pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor` (envuelve `hyperframes doctor`) en verde (Chrome,
  FFmpeg, Node). Actualizar la fila `glitch-motion/` de `tools/README.md` del taller.
- Registro del scope `@efeoncepro` (GitHub Packages) para instalar `@efeoncepro/axis-tokens` y
  `@efeoncepro/axis-brand-assets` en el taller, con el token por variable de entorno y nunca versionado; si TASK-1925 ya
  dejó un `.npmrc` en la raíz del taller, se reusa.
- `tools/glitch-motion/src/tokens.ts`: lee `glitchLine` (incluido `motion` y zonas) y `efeonceGraphicLine.motion` +
  `axisMotion.ease` desde `@efeoncepro/axis-tokens`; falla cerrado con un error que nombra la clave si falta un valor
  requerido.
- `tools/glitch-motion/src/edition-manifest.ts`: valida el archivo del manifiesto (o el plan de movimiento) contra la
  copia versionada del JSON Schema (`tools/glitch-motion/schema/`) con un validador genérico; rechaza un `schemaVersion`
  o un sha256 de schema que no conozca. No reimplementa reglas de negocio del validador de TASK-1923.
- `tools/glitch-motion/src/edition-to-compositions.ts` (puro): plan de movimiento validado + tokens →
  `{ pieceId, format, width, height, fps, durationMs, data, keyframes, zones, hasApple, syncMarkers }` por pieza. La
  falla en bytes llega **ya resuelta** por Greenhouse (`computeByteFracture` de TASK-1923) en el plan exportado; el
  taller sólo la anima con los tiempos del token.
- Plantilla base HyperFrames (`tools/glitch-motion/compositions/_base/`) con `@font-face` de Bricolage Grotesque y Poppins
  resuelto desde el paquete de AXIS instalado (nunca fuentes versionadas en el taller ni leídas de Greenhouse), fondo
  transparente, `window.__timelines` síncrono, sin `Math.random`/`Date.now`, y los datos de la pieza inyectados como JSON
  (`window.__glitch`), no escritos en el HTML.
- Prueba de humo: una composición mínima (los tres puntos estáticos) renderizada con `--format mov` y `--format webm` a
  `corridas/<fecha>_glitch-motion-humo/out/` (ignorada por git); `ffprobe` confirma `yuva444p10le` en el `.mov` y
  `alpha_mode=1` en el `.webm`; el cuadro extraído con el decodificador `libvpx-vp9` tiene esquinas con alfa 0.
- Fixture `tools/glitch-motion/fixtures/edicion-ejemplo.json` (texto) con titulares y noticias **de ejemplo** (norma §8),
  válido contra el JSON Schema del manifiesto de TASK-1923.
- Antes del primer PR: el gate de binarios y rutas absolutas del CI de TASK-1925 existe en el taller o entra en el mismo
  PR (coordinado con TASK-1925).

### Slice 2 — Animatic de aprobación: apertura y tarjeta final (GATE del operador)

- Composiciones `apertura` y `tarjeta-final` en 9:16 (1080 × 1920) y 16:9 (1920 × 1080; 4K según la Open Question de
  resolución): dos puntos + el tercero se desarma en bytes y se arma en la manzana; la tarjeta final es el espejo exacto
  (los puntos se resuelven en la manzana) y su último cuadro coincide con el primero de la apertura para empalmar en loop.
- El instante en que la manzana termina de armarse es `glitchLine.motion` (punto de sincronía con el mnemónico); se
  registra como marcador en el manifiesto de entrega. Los clips salen **mudos** (identidad sonora de Glitch pendiente).
- Tarjeta final: un mensaje, una acción («Sigue a Glitch»), firma de Efeonce centrada; sin texturas finas (la compresión
  las ensucia).
- Previews para el operador: MP4 H.264 con los overlays compuestos sobre la toma de prueba del host y un storyboard de
  cuadros clave (entrada, sincronía, asentado, salida). Viven en la corrida del taller
  `corridas/<fecha>_glitch-motion-animatic/`: `manifiesto.json` y fichas en git; los binarios en `out/` (ignorada) y
  archivados en GCS por sha256, con la copia para el operador en OneDrive.
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
  (`hyperframes transcribe` local desde el paquete del taller o el STT ya usado en la identidad sonora; ver Open Questions).
- Composición `subtitulo`: Poppins 600, blanco sobre navy al 78 %, una palabra en el acento por frase (criterio de
  elección según Open Question), dentro de la zona de texto (1150–1480 en 9:16).
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion render --manifest <json> --transcript <json>` rinde el clip
  de subtítulos por formato y refina los timecodes sugeridos del resto del kit con la transcripción. La transcripción
  es texto y vive en la corrida; el audio de la toma nunca entra a git.

### Slice 6 — Verificación automática (`--filter glitch-motion verify`)

- `tools/glitch-motion/src/verify.ts` sobre un manifiesto de entrega:
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
  - **Sin rutas absolutas:** `entrega.json` y `manifiesto.json` no contienen rutas de una máquina (ni `/Users/…`, ni
    rutas de OneDrive locales): sólo nombres relativos a la corrida, sha256 y URIs de GCS o referencias de OneDrive.
  - Además corre `hyperframes lint --json` e `inspect --json --strict` por composición (desde el paquete del taller).
- Sale con código distinto de cero y un reporte JSON legible si falla cualquier chequeo.

### Slice 7 — CLI de render del taller y manifiesto de entrega

- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion render --manifest <json> [--formats 9x16,16x9]
  [--pieces …] [--transcript <json>] [--quality draft|high] [--run <AAAA-MM-DD_tema>] [--preview-plate <png>]`. Por
  defecto la corrida es `corridas/<fecha>_glitch-edicion-<N>/` del taller; los binarios se escriben en su `out/`
  (ignorada por git). Las rutas que recibe por argumento (manifiesto, transcripción, toma de prueba) se usan en tiempo
  de ejecución y nunca se escriben en un archivo versionado.
- Por clip: ProRes 4444 `.mov` (master para Premiere, DaVinci o Final Cut) y WebM VP9 con alfa (revisión web);
  opcionalmente MP4 de preview compuesto sobre la toma de prueba. Nombres
  `glitch-e<N>_<pieza>_<formato>[_n<k>]_alpha_prores4444.mov`, etc.
- Manifiesto de entrega `entrega.json` (esquema `glitch-motion-delivery.v1`, versionado en la corrida): edición,
  versiones fijadas
  (hyperframes, axis-tokens, contrato `efeonce.glitch-line`, esquema del manifiesto), y por clip: id, pieza, formato,
  resolución, fps, códec, `pix_fmt`, duración, cuadros, timecode de entrada sugerido (SMPTE a los fps de la toma),
  texto visible, `hasApple`, zonas usadas, marcadores de sincronía, SHA-256 y estado (`propuesta`/`aprobado`).
- `manifiesto.json` de la corrida con el formato que define TASK-1925: cada binario por sha256 y su ubicación (URI de
  GCS y, para la entrega al editor, la referencia de OneDrive). Sin binarios en git.
- Corre la verificación del Slice 6 al final y no marca la entrega como lista si falla.
- Si el operador decide la pieza sonora de Glitch, agrega la pista del mnemónico a la apertura y la tarjeta final en
  el marcador de sincronía, nivelada a −14 LUFS y pico −1 dBFS; mientras no, los clips salen mudos con el marcador.

### Slice 8 — Documentación y skills

- Spec de producción nueva en Greenhouse `docs/operations/brand-graphic-line/glitch/GLITCH_MOTION_OVERLAYS_V1.md`
  (piezas, entregables, cómo se produce desde `greenhouse-eo` con `pnpm -C ../efeonce-brand-workshop`, QA, qué no hacer;
  los números en el token, no en el doc). Ninguna documentación gobernante se escribe en el taller.
- Deltas: norma de Glitch §7/§9/§10 (estado de piezas aprobadas por el operador, sin adelantar aprobaciones), ADR
  («Trabajo a crear» fila c → TASK-1924), documentación funcional `linea-grafica-glitch.md`, manual
  `componer-piezas-glitch.md` (sección «Overlays en movimiento» paso a paso para el operador y para el editor),
  skill `efeonce-graphic-line/references/glitch.md`, overlay `motion-design-studio/efeonce/EFEONCE_OVERLAY.md` y
  la nota en `hyperframes-cli` de que `mov` y `png-sequence` existen en `0.6.69`, con espejos en `.codex/skills/`. Las
  skills siguen en `greenhouse-eo`; nunca se copian al taller.

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
- Migrar `scripts/foto` y `scripts/creative/brand-motion` al taller, el CI del taller, el bucket de binarios y el formato
  de `manifiesto.json`: TASK-1925.
- Cualquier cambio en `package.json`, `pnpm-lock.yaml`, `scripts/` o `src/` de Greenhouse.
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

### Cómo se comparte el manifiesto con el taller

El manifiesto de edición es de Greenhouse (TASK-1923 hoy; el dominio de ediciones de TASK-1442 mañana). El taller lo
consume **como archivo JSON** y nunca importa ni copia código de Greenhouse (ni el zod de
`src/lib/glitch-composition/manifest.ts`, ni `computeByteFracture`). Decisión de esta task, a confirmar con la dueña de
TASK-1923 [verificar]:

1. **El schema es de Greenhouse y se publica como dato.** TASK-1923 genera, desde su zod, un JSON Schema versionado
   (`glitch-edition-manifest.v<schemaVersion>.schema.json`) y lo deja en su repo junto al ejemplo. No va al contrato de
   AXIS de TASK-1922: AXIS es dueño de los valores de marca (`glitchLine`, `efeonce.glitch-line`), no del contenido
   editorial de una edición.
2. **El taller guarda una copia versionada del JSON Schema** en `tools/glitch-motion/schema/` con su sha256 anotado. Es
   un archivo de datos, no código, y se actualiza sólo cuando cambia `schemaVersion`. La verificación rechaza un
   manifiesto cuyo `schemaVersion` no coincide con una copia conocida.
3. **La falla en bytes llega resuelta.** Greenhouse exporta, junto al manifiesto validado, un **plan de movimiento**
   JSON con las celdas de `computeByteFracture` por pieza (posición de origen, desplazamiento, opacidad, dirección) y la
   semilla usada; el taller sólo las anima con los tiempos de `glitchLine.motion`. Así hay una sola implementación del
   layout de los bytes y el cuadro asentado del video coincide con el PNG estático de `glitch-overlays`. El comando
   exacto de exportación lo define TASK-1923 (p. ej. una salida adicional de `pnpm glitch:compose`) [verificar].
4. Si TASK-1923 prefiere otra forma (por ejemplo, publicar el schema en un paquete), esta sección se actualiza con un
   `## Delta`; lo que no cambia es que el taller no importa código de Greenhouse ni reimplementa sus reglas.

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
- Los binarios nunca van a git: se escriben en `out/` de la corrida del taller (ignorada), se archivan en GCS por
  sha256 con el mecanismo del taller que define TASK-1925 y se entregan al editor en la carpeta de Glitch en OneDrive
  [verificar ruta con el operador]. `entrega.json` y `manifiesto.json` quedan versionados en la corrida, sin rutas
  absolutas. `pnpm media:archive-ai-generation` de Greenhouse no aplica (sirve a `ai-generations/`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (gate del operador) → Slice 3 (gate del operador) → Slice 4 → Slice 5 → Slice 7 → Slice 8.
- Slice 6 (verificador) se construye en paralelo desde el cierre del Slice 1 y MUST estar verde sobre el fixture antes
  de pedir la aprobación del Slice 3 y antes de cerrar el Slice 7.
- Ningún slice posterior al 2 arranca sin la aprobación registrada de la apertura y la tarjeta final; ninguno posterior
  al 3 sin la aprobación del kit.
- El Slice 1 no arranca hasta que `@efeoncepro/axis-tokens` publique `glitchLine.motion` y TASK-1923 publique el JSON
  Schema del manifiesto y el plan de movimiento exportado (ver «Cómo se comparte el manifiesto con el taller»).
- Ningún código de `tools/glitch-motion/` se integra a `main` del taller sin el CI mínimo de TASK-1925 (sólo
  `pull_request`: lint + gate de binarios y rutas absolutas).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `npx hyperframes` resuelve otra versión y cambian los cuadros | tooling / marca | medium | dependencia exacta en `tools/glitch-motion/package.json` del taller; versión registrada en `entrega.json`; líneas base por versión | cuadros clave fuera de tolerancia en `verify` |
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
| Un binario (ProRes, WebM, PNG, MP4, fuente) entra a git del taller | taller | medium | salidas sólo en `out/` de la corrida (ignorada); `.gitignore` del taller; gate de binarios del CI de TASK-1925; fuentes desde el paquete de AXIS, nunca versionadas | CI del taller en rojo o `git status` del taller con un binario |
| Una ruta absoluta de la máquina queda versionada (en `entrega.json`, un fixture o un script) | taller | medium | rutas recibidas sólo por argumento; `entrega.json` con nombres relativos, sha256 y URIs; chequeo «sin rutas absolutas» del Slice 6; gate del CI de TASK-1925 | chequeo del Slice 6 o CI del taller en rojo |
| El CI del taller sólo corre en `pull_request`: un push directo a `main` salta el gate | taller | medium | todo el código de esta task entra por PR; correr lint y el gate localmente antes de cada commit | commit en `main` del taller sin PR |
| El token de GitHub Packages para `@efeoncepro/*` queda en un archivo versionado del taller | taller / secretos | low | registro del scope en `.npmrc` sin token; token por variable de entorno | `git diff` del taller con `_authToken` |
| El manifiesto de Greenhouse cambia de forma y el taller valida contra un schema viejo | contrato de datos | medium | `schemaVersion` + sha256 de la copia del JSON Schema; la validación rechaza versiones desconocidas; `## Delta` cruzado con TASK-1923 | error de schema en el render |
| El taller se vuelve un segundo Greenhouse (docs gobernantes o servicios ahí) | arquitectura | low | reglas duras del ADR del taller §4; docs sólo en Greenhouse; sin despliegue | un ADR, runbook, servicio o cron en el taller |

### Feature flags / cutover

Sin flag: herramienta local del repo taller, additive, sin runtime de producción (repo-only; el taller no despliega
nada). El cutover es por aprobación del
operador: mientras el kit esté en PROPUESTA, `entrega.json` marca cada clip `propuesta` y la norma no lo lista como
aprobado; sólo tras el gate del Slice 3 los clips salen `aprobado`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir el PR del taller que crea `tools/glitch-motion/` (paquete, dependencias y entradas de `pnpm-lock.yaml` del taller); Greenhouse no cambia | minutos | si |
| Slice 2 | revertir las composiciones `apertura`/`tarjeta-final`; si cambió un valor del token, volver a fijar la versión anterior de `axis-tokens` | minutos | si |
| Slice 3 | revertir las composiciones del kit y sus líneas base | minutos | si |
| Slice 4 | revertir las variantes 16:9 | minutos | si |
| Slice 5 | revertir `subtitulo` y la lectura de `--transcript` | minutos | si |
| Slice 6 | revertir `verify.ts` y el script `verify` del paquete del taller | minutos | si |
| Slice 7 | revertir el CLI y el script `render` del paquete del taller; los clips ya entregados al editor (GCS/OneDrive) no se retiran solos (se avisa al editor) | minutos | parcial |
| Slice 8 | revertir los deltas de docs y skills | minutos | si |

### Production verification sequence

Sin runtime de producción (repo-only, no production runtime impact). Verificación en orden:

Todos los comandos se corren desde `greenhouse-eo`, con el taller clonado como hermano:

1. `pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor` verde y humo con alfa del Slice 1.
2. `pnpm -C ../efeonce-brand-workshop --filter glitch-motion render --manifest tools/glitch-motion/fixtures/edicion-ejemplo.json --quality draft`
   rinde todas las piezas habilitadas en una corrida del taller (la ruta del manifiesto es relativa al paquete o se
   pasa por argumento).
3. `pnpm -C ../efeonce-brand-workshop --filter glitch-motion verify --delivery <corrida>/entrega.json` verde (duración,
   alfa, cuadros clave, zonas, una manzana, sin rutas absolutas).
4. Previews sobre la toma de prueba → aprobación del operador (Slices 2 y 3).
5. Prueba de importación del editor: el `.mov` abre en su programa, el alfa se ve limpio sobre la toma y los timecodes
   sugeridos caen donde dice `entrega.json`.
6. Primera edición real con su manifiesto → `--quality high` → verificación → archivo en GCS + entrega por OneDrive.
7. CI del taller verde en el PR; en Greenhouse, sólo docs y skills: `pnpm task:lint --task TASK-1924`,
   `pnpm docs:closure-check` y `pnpm local:check` (Greenhouse no tiene código nuevo que probar).

### Out-of-band coordination required

- Operador (Julio Reyes): aprobación de la apertura, la tarjeta final y el kit; contenido del lower third; decisión de
  la pieza sonora de Glitch; numeración de ediciones.
- Editor de video: fps y resolución de la línea de tiempo, programa de edición, formato preferido (ProRes 4444 vs
  HEVC con alfa), carpeta de entrega y prueba de importación.
- Licencia de Guttery para video (operador o legal).
- Sesión de AXIS / TASK-1922: publicación de `glitchLine.motion` y de las zonas antes del Slice 1; cualquier cambio de
  valor pedido en los gates pasa por un PR de AXIS. Fuentes (Bricolage, Poppins, Guttery) en un paquete de AXIS.
- Sesión de TASK-1923: exportación del JSON Schema del manifiesto y del plan de movimiento con la falla en bytes
  resuelta.
- Sesión de TASK-1925: CI mínimo del taller, bucket de binarios, formato de `manifiesto.json` y registro del scope
  `@efeoncepro` en el taller.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El paquete `glitch-motion` existe en `tools/glitch-motion/` del taller; `hyperframes` y el resto de sus
      dependencias figuran en su `package.json` con versión exacta (sin `^` ni `~`) y
      `pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor` pasa.
- [ ] Greenhouse no cambió `package.json`, `pnpm-lock.yaml`, `scripts/` ni `src/` por esta task (sin `hyperframes` ni
      scripts `glitch:motion*` en Greenhouse); sólo documentación y skills.
- [ ] El taller no importa ni copia código de Greenhouse: el manifiesto se valida contra la copia versionada del JSON
      Schema y la falla en bytes llega resuelta en el plan de movimiento exportado por TASK-1923.
- [ ] `git ls-files` del taller no lista ningún binario (imagen, video, audio, PDF, 3D, fuente) ni ningún archivo con
      una ruta absoluta de una máquina, y el CI del taller (sólo `pull_request`) está verde en el PR.
- [ ] Todos los valores de movimiento (duraciones, retrasos, curvas, desplazamientos, punto de sincronía) y las zonas
      vienen de `@efeoncepro/axis-tokens`; la prueba de «sin literales» sobre `compositions/**` pasa y falla si se le
      inyecta un `duration: 0.4` literal.
- [ ] Faltar una clave requerida de `glitchLine` hace fallar el CLI con un error que nombra la clave, sin renderizar.
- [ ] Renderizar dos veces el mismo manifiesto produce cuadros clave idénticos dentro de la tolerancia de antialias.
- [ ] La apertura y la tarjeta final existen en 9:16 y 16:9; el último cuadro de la tarjeta final coincide con el
      primero de la apertura (pixelmatch dentro de tolerancia) y el marcador de sincronía está en `entrega.json`.
- [x] La aprobación del operador de la apertura y la tarjeta final quedó registrada con fecha en la norma de Glitch
      antes de empezar el Slice 3.
      > 2026-09-27: registrada en la norma §7, §9 y §13 («Si, el tuyo también está aprobado»), apertura y tarjeta final
      > v2. El kit se produjo antes de la aprobación, como piloto fuera del orden de slices (ver el Delta del piloto).
- [x] Las piezas `cabecera`, `tarjeta-noticia`, `imagen-fuente`, `glitch-drop` y `ultima-frase` existen en 9:16 con
      fondo transparente, y `lower-third` existe sólo si el operador definió su contenido.
      > 2026-09-27, piloto: existen en reel y vlog como `cabecera-1..3`, `noticia-1..3`, `fuente-N`, `drop` y `cta`
      > (verificación del kit 60/60, alfa de entrada y salida); el lower third se hizo con el contenido definido con el
      > operador. Los nombres difieren de esta spec. Las piezas quedaron aprobadas por el operador el 2026-09-27.
- [x] La aprobación del operador del kit del reel quedó registrada con fecha en la norma de Glitch (§9) antes de marcar
      clips como `aprobado`.
      > 2026-09-27: registrada en la norma §9 (kit del reel y del vlog); los manifiestos de las entregas del taller
      > (`b40565e`) registran el estado aprobado.
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
- [ ] El render del taller escribe en `corridas/<id>/` un `entrega.json` con, por clip: id, pieza, formato, resolución,
      fps, códec, `pix_fmt`, duración, cuadros, timecode de entrada sugerido, texto visible, `hasApple`, marcadores y
      SHA-256, y un `manifiesto.json` con cada binario por sha256 y su ubicación en GCS u OneDrive; los binarios quedan
      fuera de git.
- [ ] Con `--transcript`, el clip `subtitulo` resalta exactamente una palabra por frase en el acento y queda dentro de
      la zona de texto.
- [x] Los clips de apertura y tarjeta final salen sin pista de audio mientras la pieza sonora de Glitch no esté decidida.
      > 2026-09-27, piloto: la salida es ProRes 4444 con alfa, 30 fps, sin audio; los golpes quedan marcados por cuadro.
      > 2026-09-27, después: la pieza sonora quedó decidida (versión B aprobada). Los `.mov` siguen sin pista de audio
      > y el sonido va en un WAV aparte, con el mismo nombre, junto a cada `.mov` (taller `2d411b8`, `b40565e`).
- [ ] `pnpm -C ../efeonce-brand-workshop --filter glitch-motion verify` sale con código 0 sobre la entrega del fixture y
      con código distinto de 0 si se corrompe el alfa, la duración o una zona, o si `entrega.json` contiene una ruta
      absoluta.
- [ ] El editor abrió un `.mov` en su programa y confirmó alfa limpio y timecodes correctos (evidencia en Handoff).
- [ ] La spec `GLITCH_MOTION_OVERLAYS_V1.md`, la documentación funcional y el manual (todos en Greenhouse) tienen la
      sección de movimiento y dicen cómo operarlo desde `greenhouse-eo` con `pnpm -C ../efeonce-brand-workshop`.

> **Criterios sin tildar al 2026-09-27 y por qué** (evidencia: motion del taller, aprobado el 2026-09-27; ver los Deltas
> de arriba):
>
> - Paquete con versiones exactas y `doctor` verde: el paquete y el script `doctor` existen, pero no hay registro de
>   las versiones fijadas ni del resultado de `doctor`. Hoy: versiones exactas en `package.json` (hyperframes 0.6.69, gsap
>   3.14.2, axis-tokens 0.3.8, axis-brand-assets 0.3.4); `doctor` da Node, FFmpeg y Chrome en verde, con avisos de
>   memoria libre baja y Docker apagado (no bloquean), así que no se tilda hasta que salga verde completo.
> - Greenhouse sin cambios de código: en el trabajo del 2026-09-27 Greenhouse sólo recibió documentación (norma, ADR,
>   task, manuales, skill y regla); no se tilda hasta cerrar la task completa.
> - Taller sin código de Greenhouse / JSON Schema / plan de movimiento: el piloto usa su propio archivo de edición, no
>   el manifiesto de TASK-1923.
> - `git ls-files` sin binarios y CI verde: commits sin push, sin PR ni CI del taller.
> - Valores desde tokens, prueba «sin literales» y clave faltante: no existe `glitchLine`; la paleta y la manzana son
>   propuesta espejada del AXIS Lab.
> - Determinismo: el render es determinista y existe una prueba de determinismo entre las 7 del paquete, pero no está
>   registrado el resultado. Hoy: 7/7 en verde; la prueba es estática (sin azar, reloj ni red) y falta la comparación
>   cuadro a cuadro entre dos renders.
> - Apertura y tarjeta final: existen en reel y vlog con bucle exacto (PSNR ∞), pero no hay `entrega.json` con el
>   marcador de sincronía.
> - `yuva444p10le` y WebM `alpha_mode=1`: el piloto sale en `yuva444p12le` y no produce WebM.
> - Esquinas con alfa 0, zonas, «una manzana» y cuadro asentado contra `glitch-overlays`: la verificación 60/60 cubre
>   códec, cuadros y alfa de entrada y salida, no estos chequeos; `glitch-overlays` (TASK-1923) no existe.
> - `font_unlicensed` en Guttery: Guttery ya está licenciada; el criterio queda para cuando exista la extensión `glitch`.
> - Foto sin crédito o licencia: no implementado; en el archivo de edición el crédito es opcional.
> - `entrega.json` con timecodes y `manifiesto.json` en GCS: hay manifiestos por corrida con sha256, pero sin push y con
>   los binarios en OneDrive.
> - Subtítulos con `--transcript`: no hechos.
> - `verify` con códigos de salida: no hay un script `verify` separado.
> - Prueba de importación del editor: pendiente (abrir y montar el motion aprobado en una edición real).
> - Spec `GLITCH_MOTION_OVERLAYS_V1.md`: no existe; la documentación del piloto quedó en la norma de Glitch §13 y en el
>   manual `docs/manual-de-uso/creative/editar-video-glitch.md`.

## Verification

Desde `greenhouse-eo`, con el taller clonado como hermano (`../efeonce-brand-workshop`):

- `pnpm -C ../efeonce-brand-workshop install --frozen-lockfile`
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor`
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion exec hyperframes lint --json` e `inspect --json --strict` por
  composición
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion test`
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion render --manifest tools/glitch-motion/fixtures/edicion-ejemplo.json --quality draft`
- `pnpm -C ../efeonce-brand-workshop --filter glitch-motion verify --delivery <corrida>/entrega.json`
- `git -C ../efeonce-brand-workshop ls-files` sin binarios ni rutas absolutas; CI del taller verde en el PR
- En Greenhouse (sólo docs y skills): `pnpm task:lint --task TASK-1924`, `pnpm docs:closure-check`, `pnpm local:check`
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
- [ ] Los binarios de las corridas del taller quedaron en GCS por sha256 (y la entrega en OneDrive), listados en su
      `manifiesto.json` y fuera de git.
- [ ] TASK-1925 tiene un `## Delta` si esta task llegó primero al taller o necesitó algo de su CI, bucket o manifiesto.

## Follow-ups

- **Registro en Marketing Studio (aceptado por el operador, 2026-09-27):** los clips de cada edición se registran como piezas con versión en el calendario orgánico de Marketing Studio.
- **Hogar del movimiento (resuelto, 2026-09-27):** el render vive en el repo taller `efeoncepro/efeonce-brand-workshop`,
  `tools/glitch-motion/` ([decisión del taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md)). AXIS
  define los valores, Greenhouse compone los estáticos (TASK-1923) y guarda el canon, Marketing Studio registra. Globe
  quedó descartado como ubicación mientras esté hibernado; el taller converge con Globe como paquete cuando Globe
  reactive su capacidad de generación.
- Plantillas MOGRT de Premiere si el editor necesita editar texto en su programa.
- Convergencia del taller con Globe (Efeonce Creative Studio) cuando se reactive, que es también la ruta productiva
  gobernada del render de video.
- Pista del mnemónico de Glitch cuando la identidad sonora lo decida.
- HEVC con alfa y secuencias PNG si el editor las pide.
- Leer el manifiesto desde el dominio de ediciones de TASK-1442 en vez de un archivo, cuando exista.

## Open Questions

1. **Motor:** el ADR propuesto y el brief piden HyperFrames, pero el motion de La órbita usa su propio pipeline
   (Playwright + sharp + FFmpeg) con desenfoque real por subcuadros, que HyperFrames no ofrece de forma documentada
   [verificar]. ¿HyperFrames para todo el kit, o el pipeline de `brand-motion` para la apertura y la tarjeta final si
   necesitan desenfoque real?
2. ~~**Lower third (abierta, en definición con el operador):** ¿qué lleva (nombre del host y rol, «Glitch en voz alta»,
   sección + IA, número de edición)? El operador preguntó qué lleva y pidió definirlo en conjunto (2026-09-27).~~
   **Resuelta el 2026-09-27:** «AL AIRE · GLITCH #N», nombre y cargo del host, con la órbita real como ícono (anillo
   fijo al 28 % que la manzana recorre con la estela de 50°); variante «INVITADO» sólo si hay invitado; sólo en la
   primera aparición del host.
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
10. ~~**Instalación:** ¿devDependency exacta de `hyperframes` o `pnpm dlx hyperframes@<versión>`?~~ **Resuelta el
    2026-09-27:** dependencia exacta en `tools/glitch-motion/package.json` del taller (el paquete descarga su propio
    Chrome y queda aislado de `foto` y `brand-motion` por el workspace `tools/*`); nunca en el `package.json` de
    Greenhouse.
11. **Entrega:** ¿carpeta de OneDrive de Glitch para el editor y si quiere también HEVC con alfa?
12. ~~**Hogar y ruta productiva:** ¿basta el CLI local o hace falta una ruta gobernada (Creative Studio / Globe o un
    consumer tipo TASK-1921)?~~ **Resuelta el 2026-09-27:** el render vive ahora en el repo taller
    (`tools/glitch-motion/`, CLI local operado desde `greenhouse-eo`); la ruta gobernada llega cuando el taller converja
    con Globe al reactivarse. No se construye un consumer en Greenhouse.
13. **Nombre del comando:** los scripts del paquete del taller son `render`, `verify`, `test` y `doctor`
    (`pnpm -C ../efeonce-brand-workshop --filter glitch-motion <script>`). ¿Hace falta además un alias corto para el
    operador? Si se agrega, vive en el `package.json` raíz del taller, nunca en Greenhouse.
14. **Schema del manifiesto:** ¿TASK-1923 acepta exportar el JSON Schema del manifiesto y un plan de movimiento con la
    falla en bytes resuelta (ver Detailed Spec), o prefiere otra forma que tampoco obligue al taller a importar código de
    Greenhouse?
