# TASK-355 — Hiring Desk Motion Contract

## Meta

- Task: `TASK-355`
- Superficie: Hiring Desk interno (kanban + 360 + publication). Wireframe: `docs/ui/wireframes/TASK-355-hiring-desk.md` · Flow: `docs/ui/flows/TASK-355-hiring-desk-flow.md` · Master: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- Rigor de motion: **funcional** (feedback de estado del pipeline), no cinemático. Todo tokenizado + reduced-motion-aware. El motion del drag SIEMPRE tiene equivalente sin-motion (teclado).
- Estado: `draft` (UI ready: no)

## Motion Brief

El movimiento en el desk confirma cambios de estado (mover una card de etapa, aplicar una decisión, revelar PII) y da feedback de las acciones optimistas. Nada decorativo: cada motion comunica "esto cambió / esto se está guardando / esto se revirtió". El drag del kanban es una conveniencia visual, NUNCA el único canal (el teclado hace lo mismo sin motion).

## Motion Inventory

| # | Elemento | Comportamiento | Cuándo |
|---|---|---|---|
| M1 | Card del kanban (drag) | Lift sutil (elevación) al tomar; sigue el puntero; drop-zone resalta | Drag activo |
| M2 | Card — optimistic move | La card se reubica en la etapa destino inmediatamente al soltar/confirmar (transición corta) | Mover etapa |
| M3 | Card — rollback | Vuelve a su etapa original con transición + toast de error | `updateHiringApplicationStage` falla |
| M4 | Card — teclado move | Cambio de columna sin drag (misma transición M2), foco sigue a la card | Menú "Mover a etapa" |
| M5 | Tabs (360) | Cross-fade breve del contenido del tab | Cambio de tab |
| M6 | Reveal PII | Transición del estado masked→revealed (sin llamar la atención) | Reveal (post-motivo) |
| M7 | Decisión / publish | Estado de carga del botón + confirmación al aplicar | Decidir / publicar |
| M8 | Columna del kanban | Skeleton/shimmer al cargar postulantes | Pipeline loading |

## Microinteraction States

- **Drag-active (M1):** la card levanta (elevación tokenizada); la drop-zone de la etapa destino resalta; el resto atenúa levemente. Foco/aria intactos.
- **Optimistic-moving (M2/M4):** la card ya está en destino; si el server confirma, se asienta; si falla → M3.
- **Rollback (M3):** transición de regreso + toast "No se pudo mover, se revirtió" (`role=alert`). El estado NUNCA queda ambiguo.
- **Decidir (M7):** botón "Confirmando…" + confirmación; el estado de la ficha se actualiza.

## Transition Specs

- Duración: 150–300ms (feedback), nunca > 400ms. Easing desde tokens de motion (`MOTION_*`/`theme.axis.*`), NUNCA `ms`/curvas inline.
- El lift del drag y el resalte de drop-zone usan elevación/color tokenizados.
- El optimistic move se asienta rápido; el rollback es visible (el usuario debe percibir que se revirtió).

## Primitive & Token Mapping

- Kanban drag: `RoadmapBoard`/`GreenhouseDragList` (motion propio del primitive) — extender con teclado, no rodar un drag nuevo.
- Elevación (lift/hover): tokens de elevación/shadow del sistema.
- Skeleton (M8): primitive de skeleton existente.
- Duración/easing: tokens de motion; 0 magic numbers inline (lint `no-untokenized-motion`).

## Reduced Motion Contract

`@media (prefers-reduced-motion: reduce)`:

- M1 drag lift → sin elevación animada; el drag sigue funcionando pero sin adorno (y el teclado es la vía primaria).
- M2/M4 move → **cambio de columna instantáneo** (sin transición); el feedback de "se movió" se conserva vía el reposicionamiento + anuncio `aria-live`.
- M3 rollback → sin animación de regreso, pero **el toast de error se conserva** (el feedback esencial nunca se pierde).
- M5 tabs → corte directo. M8 skeleton → estático.
- El feedback esencial (movido / se revirtió / guardando / éxito) SIEMPRE sobrevive; solo se simplifica el adorno.

## Accessibility & Feedback

- El movimiento NUNCA es el único canal: cada cambio de estado tiene texto/foco/aria (M2 reposiciona + anuncia; M3 toast; M7 label + estado).
- **Kanban a11y (2.5.7):** el drag (M1) tiene equivalente por teclado (M4) — el motion es aditivo, no requerido.
- Foco visible e independiente de la elevación de hover.
- Sin parpadeos > 3Hz; sin desplazamientos grandes.

## Performance Guardrails

- Animar solo `opacity`/`transform` (compositor-friendly); nunca layout/reflow en la animación.
- Con muchas cards, el drag no debe re-renderizar todo el board (virtualización/keys estables).
- Skeletons dimensionados al contenido (anti-CLS).

## GVC / Micro Evidence

- Capturar M1→M2 (drag→move), M4 (teclado move), M3 (rollback) y M7 (decidir) en desktop 1440 + mobile 390.
- Verificar reduced-motion: move instantáneo, feedback (reposición + toast) conservado.
- a11y: mover una card SOLO con teclado (sin drag) funciona. Consola limpia; `scrollWidth==clientWidth`.

## Design Decision Log

- **Funcional, no cinemático:** el motion confirma cambios de estado del pipeline.
- **Drag = conveniencia, teclado = equivalente:** el motion nunca es el único canal (a11y 2.5.7).
- **Feedback esencial sobrevive a reduced-motion:** movido/revertido/guardando nunca desaparecen.
- **Reusar el motion del primitive del board:** no rodar un drag/motion paralelo.
- **Todo tokenizado:** duraciones/easing/elevación desde el sistema.

## Acceptance Checklist

- [ ] M1–M8 con tokens de motion (0 magic numbers inline).
- [ ] Drag (M1) tiene equivalente por teclado (M4); mover una card solo con teclado funciona.
- [ ] Optimistic move (M2/M4) + rollback (M3) con feedback claro (reposición + toast).
- [ ] Reduced-motion: cambios instantáneos, feedback esencial conservado.
- [ ] Solo `opacity`/`transform`; sin reflow; board no re-renderiza todo en drag.
- [ ] GVC micro-evidencia (drag/teclado/rollback/decidir) desktop+mobile + reduced-motion mirada.
