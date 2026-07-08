# TASK-1363 — Assessment Taking + Review Motion Contract

## Meta

- Task: `TASK-1363`
- Superficie: rendición del candidato (público tokenizado) + review interno (scorecard en Application 360). Wireframe: `docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md` · Flow: `docs/ui/flows/TASK-1363-assessment-taking-review-surface-flow.md` · Master: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- Rigor de motion: **funcional** (feedback temporal de un test cronometrado — afecta confianza), NUNCA decorativa ni ansiógena. Todo tokenizado + reduced-motion-aware.
- Estado: `draft` (UI ready: no)

## Motion Brief

El movimiento acá comunica tiempo y progreso en una situación sensible (un candidato rindiendo un test con límite). Cada motion debe **reducir ansiedad, no crearla**: el countdown informa sin alarmar, las transiciones de pregunta son suaves, el autosave confirma que nada se pierde, y el submit es deliberado (irreversible → confirmación clara). El review interno es sobrio (sin motion que ancle el juicio del corrector).

## Motion Inventory

| # | Elemento | Comportamiento | Cuándo |
|---|---|---|---|
| M1 | Countdown timer | Tick discreto del tiempo restante (numérico + barra sutil); NO pulso/parpadeo constante | Durante la rendición |
| M2 | Aviso de tiempo | Cambio de estado a `warning` en umbrales (p.ej. 5 min / 1 min) — color + texto, transición corta | Umbral de tiempo |
| M3 | Transición de pregunta | Cross-fade breve entre preguntas/bloques de competencia | Avanzar/retroceder |
| M4 | Autosave | Micro-confirmación "Guardado" (fade in/out) tras responder | Autosave por respuesta |
| M5 | Submit | Botón "Enviando…" + confirmación de envío (irreversible) | Submit |
| M6 | Enviado / expirado | Estado terminal claro (confirmación o "tiempo agotado") | Post-submit / timeout |
| M7 | (Interno) Scorecard | Aparición sobria de competencias; SIN animación que enfatice un score sobre otro | Review |
| M8 | (Interno) Sugerencia IA | Expandir/colapsar la sugerencia (1361) — colapsada por defecto (anti-anclaje) | Corrección |

## Microinteraction States

- **Countdown (M1):** informativo, no ansiógeno; sin pulso rojo constante. El `warning` (M2) aparece solo en umbrales, con texto ("Quedan 5 minutos") además del color.
- **Autosave (M4):** confirmación breve que da tranquilidad ("Guardado") — el candidato nunca duda si su respuesta se perdió.
- **Submit (M5):** deliberado; confirmación previa (irreversible) + estado de envío + terminal.
- **Sugerencia IA (M8):** colapsada por defecto; el corrector abre la rúbrica/respuesta primero (independent-before-debrief).

## Transition Specs

- Duración: 120–300ms (feedback), nunca > 400ms. Easing/duración desde tokens de motion (`MOTION_*`/`theme.axis.*`), NUNCA `ms`/curvas inline (lint `no-untokenized-motion`).
- El countdown actualiza a intervalos legibles (por segundo/minuto), sin animación continua que distraiga.

## Primitive & Token Mapping

- Timer/barra: primitive de progreso + tokens de color de estado (`warning`). Cross-fade (M3)/autosave (M4): opacidad tokenizada. Dialog de submit (M5): dialog primitive. Colapsable IA (M8): disclosure primitive. 0 magic numbers inline.

## Reduced Motion Contract

`@media (prefers-reduced-motion: reduce)`:

- M1 countdown → **solo numérico** (sin barra animada); el tiempo restante se comunica por texto.
- M2 aviso → cambio de estado instantáneo (color+texto), sin transición.
- M3 pregunta → corte directo. M4 autosave → texto estático "Guardado" (sin fade). M5 submit → sin animación, confirmación textual conservada.
- M7/M8 → estático.
- **El feedback esencial (tiempo restante, guardado, enviado, tiempo agotado) SIEMPRE sobrevive**; solo se quita el adorno. Crítico: el countdown nunca depende de animación para ser legible.

## Accessibility & Feedback

- El tiempo NUNCA se comunica solo por color/animación: siempre texto ("Quedan 5 minutos") + `aria-live` en umbrales (M2).
- El countdown es perceptible por lectores de pantalla (anuncios en umbrales, no cada segundo).
- **Accommodations:** si la instancia tiene `accommodations_json` (tiempo extendido), el timer refleja el tiempo real concedido — el motion no asume un tiempo fijo.
- Autosave/submit con estado textual + foco; dialog de submit con foco atrapado + retorno. Sin parpadeos > 3Hz (evitar countdown ansiógeno).

## Performance Guardrails

- Animar solo `opacity`/`transform`; el timer actualiza texto sin reflow. Sin animación continua que consuma CPU durante toda la rendición.

## GVC / Micro Evidence

- Capturar M1/M2 (countdown + aviso de tiempo), M4 (autosave), M5 (submit) en desktop 1440 + mobile 390.
- Verificar reduced-motion: countdown numérico legible, avisos instantáneos, feedback conservado.
- Verificar accommodation: instancia con tiempo extendido → el timer lo refleja.

## Design Decision Log

- **Informar sin alarmar:** el countdown reduce ansiedad, no la crea (sin pulso rojo constante).
- **Anti-anclaje en review:** la sugerencia IA arranca colapsada (M8).
- **Reduced-motion:** el tiempo restante nunca depende de animación.
- **Accommodations respetadas:** el timer refleja el tiempo real concedido.
- **Todo tokenizado; reusar primitives** (progreso/dialog/disclosure), no motion paralelo.

## Acceptance Checklist

- [ ] M1–M8 con tokens de motion (0 magic numbers inline).
- [ ] Countdown informativo no-ansiógeno + aviso de tiempo (M2) con texto+`aria-live`.
- [ ] Autosave (M4) y submit (M5) con feedback claro; submit irreversible con confirmación.
- [ ] Sugerencia IA colapsada por defecto (M8, anti-anclaje).
- [ ] Reduced-motion: countdown numérico, avisos instantáneos, feedback esencial conservado.
- [ ] Accommodation (tiempo extendido) reflejada en el timer.
- [ ] GVC micro-evidencia (countdown/aviso/autosave/submit) desktop+mobile + reduced-motion mirada.
