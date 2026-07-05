# ANTIPATTERNS — motion-design-studio

> Los errores que arruinan una animación o una entrega. Si detectas uno en lo que te piden (o en
> lo que ibas a hacer), **para y corrige antes de producir**.

## Craft

- ❌ **Empezar produciendo sin storyboard/animatic.** ✅ Concepto → storyboard → animatic (prueba el
  ritmo barato) → recién ahí producir. El ritmo se arregla en el animatic, no en el render.
- ❌ **Movimiento robótico** (velocidad constante, sin ease, sin anticipación/arco). ✅ Timing/spacing
  con ease, anticipación y follow-through — los 12 principios (`modules/01`).
- ❌ **Cámara plana/estática por defecto** cuando el mensaje pide cine. ✅ Dirige la cámara (dolly,
  push-in, DoF) con intención; cada movimiento comunica emoción.
- ❌ **Ignorar el sonido** o pegarlo al final. El sonido es la **mitad** del motion. ✅ Diseña el sonido
  desde el animatic; sincroniza corte y movimiento al beat.
- ❌ **Todo transición fancy** (wipes, spins). ✅ El **corte seco** es el default pro; la transición se
  justifica, no se decora.
- ❌ **Color inconsistente entre tomas** (sobre todo con tomas IA que derivan). ✅ Grade unificado + LUT +
  chequeo de consistencia.

## Video IA

- ❌ **Casarse con un modelo.** ✅ Elige por toma (Higgsfield/Runway/Seedance/Kling/Veo/Omni). Ver `SOURCES.md`.
- ❌ **Citar de memoria qué modelo/feature domina.** Cambia por mes. ✅ Reverifica con WebSearch.
- ❌ **Basar algo nuevo en Sora 2** (API deprecada, shutdown 2026-09-24). ✅ Usa las alternativas vigentes.
- ❌ **Text-to-video puro para tomas con inicio/fin claros.** ✅ **Keyframes primero** → image-to-video (mucho más control).
- ❌ **Prompt vago** ("hazlo cinematográfico", "que se vea cool"). ✅ Framework: `[cámara] + [ritmo] +
  [acción/movimiento] + [atmósfera]` con terminología técnica y verbos de movimiento.
- ❌ **Dejar que el personaje "derive"** entre tomas. ✅ Soul ID / Voice Binding / refs para bloquear rostro y voz.
- ❌ **Pedir tomas >10s, handheld o through-object directo** (fallan). ✅ Chunks 5–8s + montar; grano/shake en
  post; plates estáticos + moves en post.
- ❌ **Generar 30 variantes en 4K sin animatic.** Quema créditos. ✅ Dimensiona el gasto, diverge barato,
  sube calidad de la elegida; upscale final con Magnific.
- ❌ **Delegar el juicio de marca a la IA.** ✅ IA acelera; el humano dirige, cura y hace el finish.

## VFX y compositing

- ❌ **Composite sin matchear los 7 vectores** (perspectiva/luz/sombra/color/grano/bordes/blur). ✅ El elemento
  demasiado limpio, sin sombra de contacto o con borde duro delata el efecto (`modules/11`).
- ❌ **Confiar un roto/key IA sin QC frame-a-frame.** ✅ La IA falla en pelo/oclusión/transiciones; corrige el 20% que se nota.
- ❌ **Meter CGI sin sombra de contacto ni luz matcheada.** ✅ Flota. Iguala HDRI + sombra + reflejo.
- ❌ **Simular caro cuando un stock element resuelve.** ✅ Gasto gobernado: humo/fuego/polvo pregrabado composited.
- ❌ **Olvidar que el mejor VFX es invisible.** ✅ Si se nota el efecto, falló.

## Video IA para UI / texto / logos (duras — aprendizaje 2026-07-05)

- ❌ **Generar UI, texto legible, citas, gauges o logos con video IA.** Los modelos los **deforman/inventan**
  (por eso prompteamos "no text, no logos"). ✅ La UI/producto se hace como **mograph** — mockup HTML/CSS/JS
  animado + captura Playwright (legible, on-brand, cero créditos). Ver `efeonce/STUDIO_TOOLING.md`.
- ❌ **Renderizar el logo de marca con IA.** ✅ Overlay del **asset real** (`public/branding/*`) en post.
- ❌ **Tomas text-to-video independientes** sin activos/POV/transición compartidos → se ven como **escenas
  sueltas** (caso real: rough cut estadio). ✅ **Reference-chaining**: cada toma usa el último frame de la
  anterior como `inlineData` de referencia (verificado: sale casi idéntica) + un POV/hilo + transiciones.

## Boundaries (duras)

- ❌ **Hacer motion de UI runtime acá** (transición, scroll, micro-interacción, view transition, reduced-motion,
  duration tokens). ✅ `motion-design` / `gsap` / `greenhouse-microinteractions-auditor`.
- ❌ **Producir la imagen fija / KV acá.** ✅ `design-studio` (esta skill la anima).
- ❌ **Decidir formato/duración/safe-zone por red acá.** ✅ `social-media-studio` (esta skill produce el master).
- ❌ **Hacer el craft fino de tipografía acá** (peso/variante/escala). ✅ `typography-design` (la kinética lo usa).

## Gobernanza y entrega

- ❌ **Producir/renderizar IA sin dimensionar el gasto de créditos.** ✅ Gasto gobernado; chunks; diverge barato.
- ❌ **Entregar/publicar sin confirmación humana.** ✅ El estudio propone/produce; el operador aprueba antes de que salga.
- ❌ **Pasar IA como real sin criterio de disclosure** cuando el contexto lo exige. ✅ "Ante la duda, revela".
- ❌ **Entregar sin spec** (aspect/fps/codec/loudness/color-space equivocados). ✅ `templates/motion-delivery-spec.md` + checklist.
- ❌ **Usar la mascota Nexa / ilustraciones propietarias de Efeonce como stock**, o transcribir mal la marca
  (Efeonce ≠ Greenhouse; `AxisWordmark` solo interno). ✅ `efeonce/EFEONCE_OVERLAY.md`.
