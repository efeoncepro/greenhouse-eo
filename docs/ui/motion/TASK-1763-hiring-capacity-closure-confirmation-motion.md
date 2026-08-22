# TASK-1763 — Motion Contract · cierre de vacante por capacidad

## Meta

- Status: `draft`
- Owner task: `TASK-1763`
- Surface: `Application 360 / capacity closure dialog`
- Motion rigor: `ui-standard, reuse-only`
- Primitive: `Dialog transition existente + feedback de estado estático`

## Intent

La transición sólo explica que comienza o termina un segundo paso. No celebra una contratación ni dramatiza el
desenlace. El cambio importante se comunica por título, conteos, desenlace y causa, copy y foco; motion nunca carga
significado exclusivo.

## State Transitions

| From | To | Behavior | Reduced motion |
| --- | --- | --- | --- |
| decision complete | preview opening | transición canónica del Dialog | aparición inmediata con foco en título |
| preview loading | ready | reemplazo estable del contenido, sin stagger | reemplazo inmediato |
| ready | confirm pending | botón conserva tamaño; spinner/label accesible sin layout shift | idéntico |
| pending | run status | status surface reemplaza acciones sin celebración | reemplazo inmediato + anuncio live |
| open | closed | transición canónica y focus restore | cierre inmediato + focus restore |

## Interaction Rules

- No countdown, confetti, pulse, animated counter ni auto-dismiss.
- El CTA reserva ancho para que el estado pending no mueva acciones.
- Escape/click-away sólo funcionan antes de submit; motion no retrasa ni altera esta regla.
- `partial_failed` permanece visible y estático; no se representa con color o animación intermitente.
- El chip de desenlace («Sin selección») y su causa aparecen sin énfasis punitivo: ni sacudida, ni pulso, ni color de
  alarma. El desenlace se lee, no se dramatiza.
- El live region anuncia una sola transición semántica por cambio de status.

## Tokens and implementation

- Reutilizar `dialogMotionProps` o la primitive canónica que lo sustituya; no duplicar keyframes/timings.
- Todos los valores vienen del theme/primitive existente; no introducir ms/easing literales nuevos.
- `prefers-reduced-motion: reduce` llega al mismo estado, foco y anuncio.

## GVC Evidence

- Capturar apertura, pending, partial/completed y focus restore en 1440×1000 y 390×844.
- Repetir la secuencia con reduced motion y demostrar estado final equivalente.
- Verificar que el botón no cambia de ancho y que no aparece scroll horizontal durante transiciones.

## Acceptance Criteria

- [ ] Sólo se reutiliza la transición modal canónica.
- [ ] Pending/status no producen layout shift ni double-submit.
- [ ] Reduced motion conserva significado, foco y resultado.
- [ ] No existe motion celebratoria, punitiva o auto-dismiss para este flujo.
- [ ] El desenlace y la causa entran con la misma transición que el resto del contenido, sin acento propio.
