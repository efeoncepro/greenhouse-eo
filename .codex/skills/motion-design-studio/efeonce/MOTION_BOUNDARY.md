# MOTION_BOUNDARY — la costura completa

> Dónde termina `motion-design-studio` y empieza cada skill hermana. Regla de precedencia al
> final. El borde más fino es con `motion-design` (motion de UI).

## La frase que resuelve el 80% de los casos

**`motion-design` es motion como *lenguaje de interfaz* (web/UI, implementado en código, runtime,
`prefers-reduced-motion`); `motion-design-studio` es motion como *cine/craft* — brand film, spot,
explainer, title sequence, motion graphics, video IA — producido con pipeline profesional y
entregado como video renderizado.**

## Tabla de hand-offs

| Si el trabajo es… | Pertenece a… | motion-design-studio aporta… |
|---|---|---|
| Transición/animación de **UI runtime** (scroll-driven, view transition, micro-interacción, hover, reduced-motion, duration tokens, Motion/GSAP) | `motion-design` / `gsap` / `greenhouse-microinteractions-auditor` | nada — es otra disciplina (código, no video) |
| **Imagen fija**, dirección de arte, Key Visual, auditoría, selección de modelo de imagen | `design-studio` | la **animación** de ese KV / dirección de arte compartida |
| **Formato/duración/safe-zone/algoritmo por red social** | `social-media-studio` | el **master cinematográfico** que la red adapta |
| **Estrategia** creativa de campaña / media mix | `digital-marketing` | ejecución del film/spot |
| Craft fino de **tipografía** (peso/variante/escala/tracking) | `typography-design` | la tipo **kinética** (rol en movimiento) |
| **Keyframes/stills** para image-to-video | `greenhouse-ai-image-generator` / `design-studio` | la dirección de la toma que usa esos keyframes |
| Producir el **video IA** concreto | `higgsfield-*` (MCP) | la dirección (storyboard, cámara, ritmo, sonido) |
| Doctrina de **marca/GTM/ASaaS** | `efeonce-agency` | expresión audiovisual de esa marca |

## Zonas donde SÍ mandamos (para no regalarlas)

- Concepto + narrativa + storyboard + animatic · lenguaje cinematográfico (cámara/lente/luz) · los 12
  principios · motion graphics + tipografía kinética + title sequences · edición/montaje/pacing · sound
  design + música · color grading + finishing + upscale · **el pipeline de video IA** (selección de modelo,
  prompt cinematográfico, keyframes, consistencia de personaje, control de cámara) · orquestación humano/IA/
  híbrido + entrega de video.

## El borde con motion-design (detallado)

- **`motion-design`** decide easing de una transición de UI, duration tokens, scroll-driven, view transitions,
  y respeta `prefers-reduced-motion`. Su output **es código que corre en el navegador**.
- **`motion-design-studio`** decide el arco de un brand film, el movimiento de cámara de un spot, el corte de un
  explainer, el sonido y el grade. Su output **es un archivo de video renderizado**.
- Comparten vocabulario (easing, timing) pero **no el medio ni el runtime**. Un logo que se anima *en la web como
  micro-interacción* es `motion-design`; el **logo animation / title sequence renderizado** para un film es esta skill.

## Regla de precedencia

1. Si el output **es código que corre en el navegador** (UI) → `motion-design`/`gsap`/`microinteractions-auditor`.
2. Si es **imagen fija / KV / dirección de arte** → `design-studio` (esta skill lo anima).
3. Si es **formato/red** del video → `social-media-studio` (esta skill produce el master).
4. Si es **producción de video cinematográfico** (concepto→render) → **esta skill manda**.
5. Ante duda genuina, nombra ambas y aclara el hand-off; no invadas silenciosamente.

> Cross-runtime: al encadenar, nombra la sibling y su runtime, y confirma que la mano de producción elegida
> (Higgsfield MCP, Magnific) está disponible en ese runtime.
