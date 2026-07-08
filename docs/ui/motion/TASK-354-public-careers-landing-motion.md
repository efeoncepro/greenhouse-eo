# TASK-354 — Public Careers Landing Motion Contract

## Meta

- Task: `TASK-354`
- Superficie: Careers pública (listing + detalle + apply)
- Wireframe: `docs/ui/wireframes/TASK-354-public-careers-landing.md` · Flow: `docs/ui/flows/TASK-354-public-careers-landing-flow.md` · Master: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- Rigor de motion: **estándar/trivial** (feedback, no motion cinemático). Todo tokenizado + reduced-motion-aware.
- Estado: `draft` (UI ready: no)

## Motion Brief

El movimiento en careers es **funcional, no decorativo**: confirma carga, jerarquiza el descubrimiento de vacantes y da feedback claro al postular. Nada compite con el contenido ni retrasa la comprensión (entrada ≤ 400ms). Es el motion mínimo que hace que una superficie pública se sienta enterprise sin caer en efectos.

## Motion Inventory

| # | Elemento | Comportamiento | Cuándo |
|---|---|---|---|
| M1 | VacancyCards (listing) | Aparición suave + stagger corto al montar la lista | Listing loaded |
| M2 | VacancyCard | Elevación/realce en hover/focus | Puntero/teclado |
| M3 | Skeletons | Shimmer estándar | Listing loading |
| M4 | Transición listing↔detalle | Cross-fade breve (sin desplazamientos grandes) | Navegación entre nodos |
| M5 | Botón submit | Estado de carga (spinner inline) durante el envío | Apply submitting |
| M6 | Confirmación genérica | Aparición del mensaje de éxito | Apply success |
| M7 | Errores inline | Aparición del mensaje de error por campo | Validación |
| M8 | Attract (N0): hero + pilares + stepper de proceso | Aparición suave al entrar (opacidad/leve subida), stepper sin auto-avance | Careers home load |
| — | Turnstile widget / consent | SIN motion propio (el widget maneja lo suyo; el checkbox no anima) | Apply |

## Microinteraction States

- **Hover/focus (M2):** realce sutil de la card (elevación tokenizada); focus visible ≥2px 3:1 SIEMPRE presente (no depende del efecto).
- **Submitting (M5):** botón en estado de carga ("Enviando…") + spinner inline; campos readonly; sin doble submit. El botón NO se deshabilita por validación (forms-ux); solo durante el envío en curso.
- **Success (M6):** el mensaje genérico aparece; foco se mueve a él (`role="status"`).
- **Attract (M8):** el stepper de proceso es estático (no auto-avanza ni sugiere pasos automáticos); solo aparición al entrar en viewport.

## Transition Specs

- Duración entrada: 200–300ms; salida/cross-fade: ≤200ms. Nunca > 400ms.
- Easing desde tokens de motion (`theme.axis.*` / MOTION tokens), NUNCA `ms`/curvas inline.
- Stagger de cards (M1): delay corto acumulado, tope ~6 cards; el resto entra sin delay (no penalizar listas largas).

## Primitive & Token Mapping

- Duración/easing: tokens de motion del design system (`MOTION_*` / `theme.axis.*`); NUNCA magic numbers inline (lint `no-untokenized-motion` cuando aplique).
- Shimmer/skeleton: primitive de skeleton existente (no rodar uno propio).
- Elevación hover: token de elevación/shadow del sistema.
- Spinner submit: primitive de loading existente.

## Reduced Motion Contract

`@media (prefers-reduced-motion: reduce)` (preferencia de movimiento reducido del sistema):

- M1 stagger/aparición → sin desplazamiento; las cards aparecen con opacidad instantánea o cross-fade mínimo.
- M4 transición de superficie → corte directo (sin cross-fade).
- M3 shimmer → estático o desactivado.
- M2 hover → cambio de estado inmediato (sin easing).
- M5/M6 feedback esencial (carga/éxito) se conserva pero sin adornos: **el feedback nunca se pierde**, solo se simplifica.

## Accessibility & Feedback

- El movimiento NUNCA es el único canal de información: cada estado tiene texto/ícono/foco (M5 spinner + texto; M6 mensaje + foco).
- Foco visible siempre presente e independiente del efecto de hover.
- Sin autoplay, sin parpadeos > 3Hz, sin desplazamientos grandes en entrada.

## Performance Guardrails

- Animar solo `opacity`/`transform` (compositor-friendly); nunca layout/reflow en la animación.
- Stagger acotado (tope de cards) para no penalizar listas largas ni CLS.
- Skeletons dimensionados al contenido final (anti-CLS).

## GVC / Micro Evidence

- Capturar M1 (listing entrada), M5→M6 (submit→success) en desktop 1440 + mobile 390.
- Verificar reduced-motion: `animationName=none`/corte directo, feedback conservado.
- Consola limpia; `scrollWidth==clientWidth`.

## Design Decision Log

- **Funcional, no decorativo:** el motion confirma/jerarquiza/da feedback; nada cinemático en una superficie pública de conversión.
- **Feedback esencial sobrevive a reduced-motion:** carga y éxito nunca desaparecen; solo se simplifica el adorno.
- **Stagger acotado:** listas largas de vacantes no pagan latencia de entrada.
- **Todo tokenizado:** duraciones/easing desde el sistema, nunca inline.

## Acceptance Checklist

- [ ] M1–M7 implementados con tokens de motion (0 magic numbers inline).
- [ ] Reduced-motion: feedback esencial (carga/éxito) conservado; adornos simplificados/desactivados.
- [ ] Foco visible independiente del hover; movimiento nunca único canal.
- [ ] Solo `opacity`/`transform`; sin reflow; skeletons anti-CLS.
- [ ] GVC micro-evidencia (entrada + submit→success) desktop+mobile + reduced-motion mirada.
