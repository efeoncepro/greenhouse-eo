# Overlay Efeonce / Greenhouse — índice (motion-design-studio)

> Aterriza el conocimiento portable de motion cinematográfico en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van la marca, las herramientas y los boundaries reales.
> **Reverifica el estado en el repo y en las plataformas** (el landscape IA cambia por mes).

## Cuándo usar este overlay

Cuando el motion toca la marca Efeonce, sus canales/superficies (Think/Glitch/grader, sitio
público) o un cliente Globe. Para motion genérico basta `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real: Higgsfield (Cinema Studio/Soul ID/MCP) + Runway/Seedance/Veo/Kling + Magnific + AE/Blender/DaVinci + handoff. |
| `MOTION_BOUNDARY.md` | La costura vs motion-design / gsap / microinteractions-auditor / design-studio / social-media-studio / digital-marketing. |
| `CLIENT_DELIVERY.md` | Motion as-a-service para clientes Globe: films/spots multi-marca, aprobaciones, licencia limpia. |

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo público/audiovisual es **marca Efeonce** (agencia). SSOT: `src/config/efeonce-brand.ts`
  (arquitectura de marca, eslogan, footer). Importar de ahí; nunca hardcodear.
- **Mascota Nexa**: hay una decisión de **mascota viva** (tilt hero / Rive / la imagen IA alimenta el
  rig, no el runtime — parkeada). Un **brand film** o **title sequence** con Nexa es caso directo de esta
  skill: dirige el arco, la cámara y el sonido; la consistencia del personaje se ancla con Soul ID/refs.
  Nexa e ilustraciones propietarias (`characters/greenhouse-*.png`) son **obra del equipo creativo**, NO stock.
- **AXIS** es el design system **interno**; el `AxisWordmark` NUNCA en piezas públicas/marketing.
- **Assets de logo REALES para overlays/end-cards (usar estos, NO generar con IA):**
  `public/branding/logo-full.svg` · `logo-full.png` · `logo-negative.svg` (para fondo oscuro) ·
  `SVG/isotipo-efeonce-negativo.svg` (isotipo) · `pdf/efeonce-wordmark-white.png`. Embeber el asset real
  (mograph/HTML `<img src>`); el logo se compone en post, nunca lo renderiza un modelo de video.
- **Sonido de marca Efeonce (identidad sonora recomendada, 2026-09-26; no canon):** el logo sonoro «Tres puntos que se
  vuelven uno» (Mi · Mi · Mi → La) re-sonoriza reveal, apertura y sting V1.1 sin tocar la imagen (la esfera cae con el
  golpe: 0,58 / 1,87 / 1,15 s) y trae dos registros (fondo y energía) y la etiqueta con voz de Brian. Para sonorizar una
  pieza de marca, **usa los archivos del kit** por URL + sha256 (`https://axis.efeonce.org/references/sonic-brand.json`),
  nunca regeneres logo, voz ni esfera; el craft lo lleva `audio-studio`. Glitch no usa este kit: el diseño
  sonoro del motion de Glitch (APROBADO, versión B, 2026-09-27; sólo Glitch, nunca en piezas de Efeonce) es aparte: WAV sidecar por `.mov`,
  en `efeonce-graphic-line` → `references/glitch.md` §13; y su **música aprobada** (tema B + cama post-punk,
  2026-09-27) se monta junto al motion desde los másteres del bucket por URL + sha256, sin regenerarla (§13.7). Canon:
  [`EFEONCE_SONIC_IDENTITY_V1.md`](../../../../docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md).
- **Motion de Glitch (APROBADO 2026-09-27; sólo Glitch):** apertura y tarjeta final v2, pre-roll de la intro, kit de
  overlays, transición de bytes entre piezas y entre escenas y héroe. Se produce con **HyperFrames en el repo taller**
  `efeoncepro/efeonce-brand-workshop` (`tools/glitch-motion`), operado desde `greenhouse-eo` con
  `pnpm -C ../efeonce-brand-workshop --filter glitch-motion <doctor|render|kit|transiciones|heroe>`; cada render entrega
  el WAV del sonido B y la música aprobada junto a cada `.mov`. La **música está integrada** (`src/music.mjs` baja y
  verifica los másteres por sha256, nunca los regenera): el **pre-roll animado de la intro** (3,2 s, los tres puntos
  laten Mi · Mi · Mi y empalman exacto con la apertura, PSNR ∞) lo **eligió el operador**; con música, la intro y la
  salida **reemplazan** a `apertura.wav` y `cierre.wav`; `--music off` entrega como antes. **Único pendiente:** probar
  la mezcla con la voz real del host. **La transición de la manzana en bytes es exclusiva de
  Glitch**: nunca en piezas de Efeonce, su familia ni clientes. Nunca la animes a mano ni la reproduzcas fuera del
  taller. Detalle: `efeonce-graphic-line` → `references/glitch.md` §12; comandos: norma de Glitch §13.13.
- **Cierre de marca 4,5 s — línea gráfica «La órbita» (canónica desde 2026-09-25):** el end-card de la marca propia
  Efeonce y su familia (nunca de un cliente) sigue el
  [manual §10.1](../../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md). La línea de tiempo
  **es un token**: `efeonceGraphicLine.brandClose` de `@efeoncepro/axis-tokens` (`totalMs` + `steps` con `part`,
  `startMs`, `endMs`: anillo → arco → la esfera asienta → halo → logo → eslogan) y el kind `brand-close` del
  contrato `efeonce.graphic-line-orbit` 0.3.0. El motion **consume** esos valores; nunca transcribe los tiempos a
  mano (si el token cambia, el cierre cambia con él). `brand-close` no va en canal print; con movimiento reducido,
  cuadro final fijo. Hay versión 16:9 y variante 1:1; referencias renderizadas y generador en
  `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/motion/` (`cierre-16x9.mp4`, `cierre-1x1.mp4`,
  `orbita-motion.mjs`; ese generador de exploración trae los tiempos escritos a mano: es referencia visual, no
  fuente de valores). Se construye en mograph desde tokens `efeonceGraphicLine` y el logo real de
  `@efeoncepro/axis-brand-assets`, nunca con un modelo de video. El eslogan «Empower your …» sólo cierra: nunca en
  mayúsculas ni con esfera. El foco (§1.4) se anima barriendo la escena hasta posarse sobre el cliente, una sola luz.
  La órbita no reemplaza la composición del plano: se declara donde aporta (cierre, foco), no en cada escena.
  **Animaciones del logo V1.1** (aprobadas 2026-09-26; conviven con el cierre): **reveal** línea → logo 3,6 s,
  **apertura** logo → línea 2,4 s y **sting** 1,6 s (anticipación, impacto `backOut`, onda de acento, eslogan al 64 %
  del logotipo). Spec, tiempos, oclusión, sonido, entregables y QA en
  [`EFEONCE_ORBIT_REVEAL_MOTION_V1.md`](../../../../docs/operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md)
  (v1.1; tiempos y proporciones en el token `efeonceGraphicLine.motion`, nunca en un script); render en
  `scripts/creative/brand-motion/{render-orbit-motion,orbit-sound,encode-orbit-motion}.mjs`. **La animación de la
  órbita sin logo es otra pieza:** sale de `@efeoncepro/axis-graphic-line` (`ORBIT_MOTION_CSS`,
  `orbitMotionFrameCss`) y se exporta a MP4 con `pnpm orbit:video` en AXIS. Web y fichas en el Lab 4.4.2
  (`axis.efeonce.org/references/graphic-line/#animaciones`); masters (MP4, ProRes 4444, WebM/HEVC con alfa) en
  `gs://efeonce-group-axis-public-media/motion/logo/v1.1/<anim>/<formato>/<fondo>/`; MP4, GIF, cuadros y LEEME en
  OneDrive `13- Branding/Motion Órbita Efeonce/v1.1`; nunca en git. **Una sola cola de render a la vez** (dos en
  paralelo corrompieron 4 MP4; `run-all.sh` lleva candado).
  Reglas y checklist: [graphic-line-orbit.md](../../efeonce-brand-studio/references/graphic-line-orbit.md).
- **🔴 Antes de animar CUALQUIER pieza de Efeonce (cortinilla, cierre, transición, otra marca de la familia), cargar
  la norma [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../../../../docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)**
  (lenguaje de movimiento de la órbita, 2026-09-26). Si una pieza no la sigue, no es el movimiento de Efeonce aunque
  use el logo. Las siete reglas, en corto:
  1. **Lento–rápido–lento:** anticipación antes de cada arranque (la nave retrocede un 3,5 % en la apertura) y
     **un protagonista a la vez** (arco → giro → nave → cámara → letras).
  2. **Llegar con golpe:** sobrepaso *back-out* por papel (nave 0,9 · esfera al nacer 2 · letras 1,6 · por defecto
     1,2), pulso de impacto con eco al 55 %, onda de acento sólo en un encaje y resorte casi crítico (≤ 1,5 %, una
     sola vuelta). Nada se detiene suave.
  3. **Curvas por papel:** llega `emphasized`, se transforma `standard`, se va `emphasizedAccelerate`
     (`axisMotion.ease`).
  4. **La velocidad no salta en los relevos;** la cámara acerca en escala logarítmica.
  5. **Movimiento real:** desenfoque de verdad (obturador 180°) sólo en los tramos rápidos; color mezclado en OKLab.
  6. **Geometría oficial:** archivos de `@efeoncepro/axis-brand-assets`, oclusión coherente, la esfera protagonista,
     letras escalonadas 28 ms; jerarquía: anillo héroe 78/80/84 % y logo final **50/56/66 %** del lado corto
     (16:9 / cuadrado / vertical), eslogan al 64 % del logo.
  7. **El sonido acompaña el golpe:** sintetizado, un golpe por impacto, cierre con fundido de 0,45 s.
  Para el criterio de la línea, las piezas de motion y dónde viven los masters, cargar la skill viva [`efeonce-graphic-line`](../../efeonce-graphic-line/references/motion.md).

  **Los números viven en el token `efeonceGraphicLine.motion`** (`@efeoncepro/axis-tokens` ≥ 0.3.3; Greenhouse lo fija
  en `develop`). Se importan, nunca se escriben en un script ni se copian de la norma; si falta un valor, se agrega al
  token con su razón. Cambiar un valor: token + prueba en AXIS → publicar → fijar en Greenhouse → comparar storyboard →
  aprobación del operador si altera una pieza aprobada.
- **Motion y audiovisual por superficie (desde el 2026-09-27):** la gráfica animada con foto y el video de marca son
  superficies del contrato AXIS `efeonce.surface-composition` (`candidate`; motion y audiovisual entraron en la 0.1.1, AXIS `v0.3.8`; Greenhouse fija hoy la 0.1.2,
  [Lab](https://axis.efeonce.org/references/surfaces/motion/)). Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
  §4.4 (motion), §4.5 (audiovisual) y §4.3 (spot pDOOH); páginas «Motion» y «Producción audiovisual» del
  [canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7), cada una con su lámina
  «Guía · cómo componer …»; guías AXIS `docs/agent-composition/surfaces/{motion,audiovisual}.md`.
  - **Tiempos desde tokens:** curvas, sobrepaso y pulso de `efeonceGraphicLine.motion`; los tramos de la pieza (lente,
    voz, selección, sostén, cierre; cartela, zócalo, super, subtítulos) de `efeonceGraphicLine.surfaces.motion` y
    `efeonceGraphicLine.surfaces.audiovisual`, que llegan resueltos en el `timeline` del manifest de
    `pnpm surface:resolve`. La maqueta aprobada de la gráfica con foto escribió sus tramos a mano: es referencia de
    dirección, **no** fuente; un master nuevo lee el token. La gráfica con foto aún no tiene render canónico.
  - **Motion (aprobado: animación en bucle foto-para-la-lente + reveal, y su storyboard):** la foto es material fijo
    que pasa el QA fijo antes de animar; se anima la línea, no la foto; la foto sólo se acerca (escala logarítmica,
    hasta el límite del token, nunca mientras entra la voz); el mensaje ocupa ≥ 80 % del tiempo; el último cuadro es
    el estático de respaldo y la versión reducida; la toma nunca lleva logo: firma el cierre (reveal o sting), sólo
    marca propia; nunca modelo de video ni paralaje falso.
  - **Audiovisual (aprobado: storyboard de planos «Cómo trabajamos» y escenas con generadores de texto):** primer
    cuadro de cada plano validado con `pnpm foto:validar`; una luz y un registro por pieza; grade que sólo empareja;
    uniforme por registro y emblema revisado cuadro a cuadro (`pnpm foto:emblema`); texto sólo en reservas, como
    cartela compuesta; formato nativo por plano. Recursos: cartela con la órbita que mide el capítulo, zócalo, callout
    con selección, super de dato con fuente, pantalla dividida y subtítulos quemados sin caja. Una esfera por pantalla.
  - **Vía pública (pDOOH):** sin audio; la voz se arma en 2 s como máximo.
  - **Qué entrega el Artifact Composer y qué no (desde el 2026-09-27, TASK-1919):** con
    `pnpm brand:compose -- --intent <intent.json>` salen el **último cuadro** del loop aprobado
    (`motion.loop-lens-reveal`: el estático de respaldo y la versión reducida), el **storyboard** (`motion.storyboard`)
    y las **capas de video en PNG con alfa** (`audiovisual.cartela`, `zocalo`, `callout-selection`, `data-super`,
    `subtitles`; `split-screen` y `shot-plan` opacas) para montar sobre el plano en la edición. **El composer no
    anima** (decisión del operador, opción b): la animación de la gráfica con foto, el movimiento de las capas y el
    cierre siguen aquí, en motion; `audiovisual.close-reveal` falla en el composer con `recipe-outside-composer` y sale
    de los masters del reveal v1.1 (o `pnpm orbit:video` en AXIS). Un cuadro fijo o una capa del composer que difiera
    del master animado es un bug de uno de los dos: el último cuadro del loop animado debe coincidir con el estático.
    Detalle: norma §2.1 y manual `componer-por-superficie-con-axis.md` (Ruta A).
- **Íconos de la línea (Trazo y Plastilina, canónicos desde 2026-09-26, sólo marca propia):** su motion **no está
  definido todavía** (pendiente en AXIS: necesita los tokens `axisMotion` y la norma de movimiento). No se inventa: en
  una pieza animada, el ícono entra como cualquier elemento del plano y se queda en el estado que `resolveIcon` pinta,
  sin animar la esfera ni el trazo. Criterio: [iconography.md](../../efeonce-graphic-line/references/iconography.md).
  La **Plastilina en volumen** (D24, 2026-09-27) es un PNG **estático** con alfa (`volumeIconUrl(glyph)`): puede entrar
  como objeto protagonista del plano (uno, ≥ 160 px), pero animarlo es otra decisión
  pendiente del operador: no se anima ni se regenera con un modelo de video.
- **`DESIGN.md`** es el contrato visual agent-facing; leerlo si la pieza toca UI (pero recuerda: motion de
  UI runtime NO es esta skill).

## Ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003`)

Dónde entra el motion:

- **Think** (blog *Marketing con Manzanitas* → newsletter *Glitch* + *AI Visibility Grader*): openers/title
  sequences, explainers y brand films que hacen a Think memorable y compartible.
- **`efeoncepro.com`**: hero video de las landings de servicio (ej. `/aeo-2/`), spots.
- **El grader** es la costura top→bottom: un explainer cinematográfico del grader es pieza social-nativa que
  demuestra expertise. Motion + `social-media-studio` lo llevan a cada red (formato por red allá).

## Coherencia con las skills hermanas

motion-design-studio es **producción cinematográfica**. Encadena con: `design-studio` (dirección de arte +
KV que se anima + matriz de modelos de imagen para keyframes), `greenhouse-ai-image-generator` (keyframes/stills),
`social-media-studio` (formato/duración por red del master), `digital-marketing` (estrategia de campaña),
`typography-design` (tipo kinética), `motion-design` (motion de UI runtime, distinto), `efeonce-public-site-wordpress`
(publica el hero video), `efeonce-agency` (doctrina de marca). Detalle en `MOTION_BOUNDARY.md`.
