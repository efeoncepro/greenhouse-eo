---
name: motion-design-studio
description: Dirige y produce video, animación cinematográfica y motion graphics enterprise con IA y humanos. Use for spots, reels, brand films, explainers, storyboards, edición, VFX, finishing, Studio Credits audiovisuales y delivery renderizado; no para motion de interfaz.
---

# Motion Design Studio — Animación cinematográfica/broadcast 2026

> **Qué es esto.** Una skill de **dos manos**: **(1) conocimiento experto** de producción de
> animación cinematográfica/broadcast al estado del arte 2026 — el craft que no caduca *y* el
> pipeline IA del año — y **(2) un estudio de ejecución** que dirige, produce, edita, finaliza
> y entrega video. No es "genera un video": es el **director/estudio** que decide el concepto,
> el storyboard, la cámara, el ritmo, el sonido, el grade y qué mano (humana o IA) lo hace.

> **La distinción de una frase.** **`motion-design` es motion como *lenguaje de interfaz*
> (web/UI, implementado en código, runtime, `prefers-reduced-motion`); `motion-design-studio`
> es motion como *cine/craft* — brand film, spot, explainer, title sequence, motion graphics,
> video IA — producido con pipeline profesional y entregado como video renderizado.** Si es una
> transición de UI, scroll-driven, micro-interacción o view transition → **NO es esta skill** →
> `motion-design`/`gsap`/`greenhouse-microinteractions-auditor`. Ver §5 y `efeonce/MOTION_BOUNDARY.md`.

> **"Humano + IA" de verdad.** Los módulos **01–08 y 11 son craft atemporal** (12 principios,
> lenguaje de cámara, edición, sonido, grade, VFX/compositing): aplican igual si anima una persona
> o si genera una IA. El **módulo 09 es el pipeline IA profesional**; el **10 es la orquestación
> híbrida**; el **11 suma VFX/compositing** (craft estable con capa AI-VFX volátil). El estándar de
> calidad manda; la herramienta es medio.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. El **craft** (principios, cámara,
> edición, sonido, grade) es **estable** y no se reverifica. El **landscape de video IA** es
> **muy volátil** (cambia por mes: qué modelo lidera, features de cámara/consistencia, pricing).
> Antes de afirmar qué modelo/feature/pipeline usar, **reverifica con WebSearch/WebFetch y marca
> el `as-of`**. Tabla de volatilidad en `SOURCES.md`.

---

## 1. Cómo se usa esta skill (router)

1. **Clasifica la intención** (§2). ¿Es producción cinematográfica/broadcast? Si es motion de UI
   runtime, **delega** (§5) y para.
2. **Carga el módulo o módulos** que apliquen (§3). No cargues todos — carga lo justo. Si la tarea
   estima, reserva, explica o liquida Studio Credits, carga siempre el módulo 13.
3. **Chequea frescura**: si vas a nombrar un modelo IA de video, feature o pipeline, reverifica
   (`SOURCES.md`).
4. **Si hay que ejecutar** (dirigir/producir/editar/finalizar), abre `efeonce/STUDIO_TOOLING.md`
   y usa el pipeline con las herramientas conectadas + confirmación humana antes de producir/entregar.
   Para **recetas de producción validadas** (qué combinación funcionó y cómo — reference→Omni enhance,
   reference-chaining, UI-sin-AE, híbrido), consulta la **biblioteca viva** `workflows/README.md`; el
   **contrato completo de Gemini Omni en Vertex** está en `efeonce/GEMINI_OMNI_VERTEX.md`. La capacidad
   investigada de previs 3D exportada → Seedance reference-to-video vive en
   `docs/documentation/ai-tooling/previs-3d-y-referencias-seedance.md`: no es receta validada ni autoriza
   reciclar el blocking Glitch rechazado. La doctrina/market research de **Creative Operations**
   (exploración vs. producción, builder → runner, memoria y agencia humana) vive en
   `docs/research/RESEARCH-009-creative-operations-agentic-workflows.md`; cuando algo nuevo funcione,
   **documéntalo en `workflows/`** (es como crece la skill).
5. **Aterriza a Efeonce** si es marca/canales propios o un cliente Globe:
   `efeonce/EFEONCE_OVERLAY.md` / `efeonce/CLIENT_DELIVERY.md`.
6. **Cierra con un artefacto** de `templates/` (brief, storyboard, animatic/shotlist, prompt sheet,
   EDL, brief de sonido, spec de entrega, crítica), no con prosa suelta.

## 2. Árbol de decisión (a qué skill pertenece)

- ¿Transición/animación de **UI runtime** (scroll-driven, view transition, micro-interacción,
  hover, reduced-motion, librería Motion/GSAP)? → **`motion-design` / `gsap` / `greenhouse-microinteractions-auditor`**.
- ¿**Imagen fija**, dirección de arte, Key Visual, auditoría de KV, selección de modelo de imagen? →
  **`design-studio`** (esta skill anima ese KV).
- ¿**Formato/duración/safe-zone/algoritmo por red social**? → **`social-media-studio`** (esta skill
  produce el master cinematográfico; social lo adapta por red).
- ¿**Estrategia** creativa de campaña / media mix? → **`digital-marketing`**.
- ¿Craft fino de **tipografía**? → **`typography-design`** (la tipo kinética lo usa).
- ¿**Keyframes/stills** para alimentar image-to-video? → **`greenhouse-ai-image-generator`** / `design-studio`.
- ¿Producir el **video IA** concreto? → **`higgsfield-*`** (esta skill dirige, ellos producen).
- ¿**VFX / compositing** (keying/green screen, rotoscoping, tracking/matchmove, integración CGI,
  simulaciones, cleanup, AI-VFX)? → **acá** (`modules/11`).
- **Todo lo demás de motion cinematográfico** (concepto, storyboard, cámara, ritmo, mograph,
  title sequence, edición, sonido, grade, VFX, pipeline IA, entrega de video) → **acá**.

## 3. Módulos (carga selectiva)

| # | Módulo | Cárgalo cuando… |
|---|---|---|
| 01 | `modules/01_MOTION_PRINCIPLES.md` | los 12 principios / peso / anticipación / arcos a nivel pro |
| 02 | `modules/02_TIMING_EASING_RHYTHM.md` | timing/spacing, curvas de easing, tempo, sync a música |
| 03 | `modules/03_CINEMATIC_LANGUAGE.md` | cámara, lente, luz, composición en movimiento, tipos de plano |
| 04 | `modules/04_STORYBOARD_ANIMATIC.md` | brief→concepto→storyboard→animatic→previs, arco y beats |
| 05 | `modules/05_MOTION_GRAPHICS_KINETIC.md` | mograph, tipografía kinética, animación de logo, title sequences |
| 06 | `modules/06_EDITING_MONTAGE_PACING.md` | corte, montaje, ritmo del edit, continuidad, transiciones |
| 07 | `modules/07_SOUND_MUSIC_DESIGN.md` | sound design, sync a música, foley, mezcla |
| 08 | `modules/08_COLOR_GRADE_FINISH.md` | color grading, LUTs, look dev, finishing, render, entregables |
| 09 | `modules/09_AI_VIDEO_PIPELINE.md` | dirigir el pipeline IA (modelos, image-to-video, cámara, consistencia) |
| 10 | `modules/10_PRODUCTION_STUDIO.md` | orquestar humano/IA/híbrido + gasto gobernado + handoff |
| 11 | `modules/11_VFX_COMPOSITING.md` | compositing, keying, roto, tracking/matchmove, CGI, simulaciones, AI-VFX |
| 12 | `modules/12_CREATIVE_WORKFLOWS.md` | elegir receta validada; clean shot→15/10/6; routing Omni/Seedance/post |
| 13 | `modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md` | créditos por operación/duración/tier/attempt, lifecycle, retries, ejemplos reel/spot/cutdown y accountability |

## 4. La mano de ejecución (por qué es "studio")

Cierra el loop **idear → storyboard → animatic → producir → editar → finalizar → entregar**
(detalle en `efeonce/STUDIO_TOOLING.md`):

- **Dirigir**: brief + storyboard + animatic + shotlist (`modules/04` + `templates/`).
- **Producir (IA)**: elige el modelo por toma (`modules/09`): **Higgsfield** (Cinema Studio para
  cámara/lente/focal, Soul ID para consistencia de personaje, LipSync — vía MCP), **Runway Gen-4.5**
  (cine dirigido, beats/coreografía de cámara), **Seedance** (refs + camera moves), **Kling** (Voice
  Binding), **Veo** (broadcast), **Gemini Omni** (edición conversacional).
- **Producir (humano)**: After Effects (mograph/compositing), Blender/C4D (3D), Nuke/Fusion
  (compositing/VFX), Mocha (tracking), Houdini (FX/simulaciones) — handoff con spec (`modules/11`).
- **Editar + finalizar**: montaje, sonido, color grade, render, entrega (`modules/06`, `07`, `08`, `10`).
- **Profusionar una campaña motion**: desde un clean shot aprobado, construir 15/10/6 como tres argumentos
  editoriales con copy/logo exactos y audio medido (`workflows/single-shot-to-deterministic-campaign-hero.md`).
  Omni sirve para microescena reinterpretada; Seedance 2.0 sólo para una toma/acción/continuidad nueva que
  preserve el mundo. Timing, crop, safe zone, copy/logo, grade, foley y mezcla pertenecen a post.

> **Regla dura (director, no dictador).** El estudio **decide y dirige**. Las **operaciones
> generativas gobernadas** consumen créditos según duración/tier/attempt; storyboard, animatic, edición,
> conform, mix/master y export determinísticos consumen **0 credits** aunque sí requieren capacidad.
> Todo spend sigue `estimate → reservation → approval → execution → settlement/release/refund`, y
> entregar/publicar pasa SIEMPRE por confirmación humana. Ver módulo 13.

## 5. Boundaries duros (lo que esta skill NO hace)

- **NUNCA** diseñes motion de **UI runtime** acá (transición, scroll, micro-interacción, view
  transition, reduced-motion, duration tokens) → `motion-design`/`gsap`/`greenhouse-microinteractions-auditor`.
- **NUNCA** produzcas la imagen fija / KV acá → `design-studio` (esta skill lo anima).
- **NUNCA** afirmes qué modelo/feature/pipeline de video IA domina de memoria. Reverifica (§Frescura).
- **NUNCA** produzcas/entregues sin confirmación humana ni sin dimensionar el gasto de créditos.
- **NUNCA** cotices credits por pieza/hora, conviertas costo vendor en credits, cobres un retry técnico o
  escondas derechos de voz/música/likeness en el saldo. Usa `modules/13` y el rate versionado del Studio.
- **NUNCA** uses IA que confunda con real sin criterio de disclosure cuando aplique, ni la mascota
  Nexa / ilustraciones propietarias de Efeonce como si fueran stock. Ver `efeonce/EFEONCE_OVERLAY.md`.
- **NUNCA** transcribas mal la marca: Efeonce ≠ Greenhouse; `AxisWordmark` solo interno.

## 6. Doctrina 2026 (lo que hay que creer este año)

Cada apuesta con su volatilidad en `SOURCES.md`:

1. **El craft manda sobre el modelo.** Un video IA 8K con mal timing, mala cámara o mal sonido es
   mal motion. Los 12 principios, el corte y el sonido deciden si funciona.
2. **El cine vuelve a la publicidad.** Arcos emocionales, personajes, luz dramática, texturas ricas
   y movimiento de cámara real — no lo flashy/rápido de años anteriores.
3. **Title sequences = identidad de marca.** Openers cinematográficos (tipografía film, cámara lenta,
   sombras profundas, flares, humo, polvo, sound design) son parte de la identidad, no solo de películas.
4. **Tipografía kinética.** El texto ES la animación; empuja el mensaje sin depender de personaje.
5. **Estética hecha a mano / imperfecta.** Grano, grit, bordes de papel, cinta, rayones, jump cuts,
   tipografía audaz, collage/zine/street — imperfecto a propósito.
6. **Consistencia de personaje es el diferenciador IA.** Soul ID / Voice Binding / refs bloquean rostro
   y voz entre tomas; sin eso, el personaje "deriva" y se rompe la ilusión.
7. **Keyframes primero, luego image-to-video.** Para tomas con inicio/fin claros (spots, narrativas),
   genera keyframes precisos y úsalos como referencia — mucha más controlabilidad que text-to-video puro.
8. **Creatividad híbrida radical.** IA + craft tradicional; la IA colapsa timelines de meses a minutos,
   pero el humano dirige, cura y da el finish. No IA vs humano — IA + humano.

## 7. Artefactos (cierra con uno)

`templates/motion-brief.md` · `storyboard.md` · `animatic-shotlist.md` · `shot-prompt-sheet.md` ·
`kinetic-type-spec.md` · `edit-decision-list.md` · `sound-design-brief.md` ·
`motion-delivery-spec.md` · `motion-critique.md` · `vfx-shot-breakdown.md`

## 8. Archivos de apoyo

- `SOURCES.md` — fuentes + **tabla de volatilidad-por-tema** + matriz de modelos de video IA + `as-of`.
- `GLOSSARY.md` — vocabulario de motion/cine 2026 (easing, animatic, EDL, LUT, Soul ID, i2v…).
- `ANTIPATTERNS.md` — los errores que arruinan una animación.
- `workflows/` — **biblioteca viva de recetas creativas validadas** (`README.md` índice + un archivo por
  workflow). Crece con cada producción: cuando algo funciona, se documenta acá.
- `docs/research/RESEARCH-009-creative-operations-agentic-workflows.md` — doctrina y research de mercado
  para distinguir exploración creativa, receta de producción, roles builder/runner y límites del agente;
  no es una receta ejecutable.
- `modules/12_CREATIVE_WORKFLOWS.md` — router compacto de esas recetas y de la regla: un output de IA
  completado es candidato técnico, no aprobación creativa.
- `modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md` — frontera económica audiovisual: operación vs.
  pieza, lifecycle, retries, modos y ejemplos ilustrativos de reel/spot/cutdown.
- `spot-studio/SPOT_STUDIO.md` — **sistema de producción de spots** (IA + humano): pipeline por etapas +
  gates que garantizan el acabado final + lanes (UI-crisp/Omni/product-real) + checklists (animatic gate,
  finish pre-flight) + 4 pilares. Léelo al producir un **spot/brand film completo** (no una toma suelta).
- `efeonce/` — overlay: `EFEONCE_OVERLAY.md`, `STUDIO_TOOLING.md`, `MOTION_BOUNDARY.md`, `CLIENT_DELIVERY.md`,
  y el **par Gemini Omni**: **`GEMINI_OMNI_VERTEX.md`** (contrato operativo: endpoint/auth/pricing/gotchas +
  §9.1 capacidades verificadas en vivo) + **`GEMINI_OMNI_CAPABILITIES.md`** (catálogo a todo nivel + **mapa
  de sinergia con las skills hermanas** + playbook de máximo aprovechamiento). Léelos al operar/dirigir Omni.
