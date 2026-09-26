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
  (v1.1; los tiempos viven en el script hasta que existan tokens, nunca se transcriben a otro); render en
  `scripts/creative/brand-motion/{render-orbit-motion,orbit-sound,encode-orbit-motion}.mjs`. **La animación de la
  órbita sin logo es otra pieza:** sale de `@efeoncepro/axis-graphic-line` (`ORBIT_MOTION_CSS`,
  `orbitMotionFrameCss`) y se exporta a MP4 con `pnpm orbit:video` en AXIS. Web y fichas en el Lab 4.4.2
  (`axis.efeonce.org/references/graphic-line/#animaciones`); masters (MP4, ProRes 4444, WebM/HEVC con alfa) en
  `gs://efeonce-group-axis-public-media/motion/logo/v1.1/<anim>/<formato>/<fondo>/`; MP4, GIF, cuadros y LEEME en
  OneDrive `13- Branding/Motion Órbita Efeonce/v1.1`; nunca en git. **Una sola cola de render a la vez** (dos en
  paralelo corrompieron 4 MP4; `run-all.sh` lleva candado).
  Reglas y checklist: [graphic-line-orbit.md](../../efeonce-brand-studio/references/graphic-line-orbit.md).
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
