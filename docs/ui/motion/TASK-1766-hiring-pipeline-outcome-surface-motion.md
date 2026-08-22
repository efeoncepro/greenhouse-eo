# TASK-1766 — Motion Contract · el desenlace en el kanban de Hiring

## Meta

- Status: `draft`
- Owner task: `TASK-1766 — Superficie del desenlace en el kanban de Hiring`
- Related wireframe: `docs/ui/wireframes/TASK-1766-hiring-pipeline-outcome-surface.md`
- Related flow: `docs/ui/flows/TASK-1766-hiring-pipeline-outcome-surface-flow.md`
- Surface: `/agency/hiring/pipeline` — tarjeta, columna «Cerrado» y diálogo de desenlace
- Motion rigor: `ui-standard, reuse-only`
- Primitive: keyframes ya existentes de la vista (`ghHiringCardIn`, `ghHiringMoved`, `ghHiringDropPulse`,
  `ghHiringToast`) + la transición canónica del `Dialog`. **No se introduce ningún keyframe nuevo.**

## Intent

El motion de esta superficie tiene un solo trabajo: **no mentir sobre cuándo ocurrió la escritura**. Hoy el
tablero celebra la llegada de una tarjeta a su columna con `ghHiringMoved`. Cuando el destino es «Cerrado»,
esa llegada dejará de ser inmediata: primero hay una pregunta. Si la animación se dispara al soltar, el
operador ve «llegó» cuando todavía no se escribió nada — y eso es exactamente el tipo de señal falsa que
esta task existe para eliminar.

Y hay un segundo trabajo, más silencioso: **no dramatizar el desenlace de una persona**. Ni celebración en
«Selección», ni alarma en «Descarte», ni pulso en «Sin selección».

## State Transitions

| From | To | Behavior | Reduced motion |
|---|---|---|---|
| `idle` → `dragging` | tarjeta levantada | opacidad reducida de la tarjeta arrastrada, como hoy | sin cambio de opacidad animado; estado final idéntico |
| `dragging` sobre «Evaluación» | columna resaltada | el resaltado existente de la columna; el aviso **ya estaba visible**, no aparece con el hover | resaltado inmediato, sin transición |
| `dragging` sobre «Cerrado» | columna resaltada | mismo resaltado. **`ghHiringDropPulse` NO se dispara al soltar**: nada se escribió todavía | resaltado inmediato |
| `decision_requested` → `dialog_open` | diálogo entra | transición canónica del `Dialog`; el tablero de fondo no se mueve ni se desenfoca | aparición inmediata con foco en el título |
| `dialog_open` → `cause_required` | grupo de causa revelado | **aparición sin morph de altura**; el foco se mueve a su primer radio | idéntico |
| `dialog_open` → `submitting` | CTA en envío | el CTA conserva su ancho; el indicador reemplaza la etiqueta sin desplazar «Cancelar» | idéntico, sin spinner animado |
| `submitting` → `settled` | tarjeta llega a «Cerrado» | recién **acá** corre `ghHiringMoved` (640 ms) sobre la tarjeta ya en su columna nueva, con su chip puesto | reposicionamiento inmediato + anuncio en la live region |
| `submitting` → `command_error` | error en el diálogo | el mensaje aparece sin sacudida ni parpadeo; el diálogo no se mueve | aparición inmediata |
| cualquiera → `cancelled` | diálogo cerrado | salida canónica del `Dialog`; **la tarjeta no se mueve, porque nunca se movió** | cierre inmediato + foco restaurado |
| `settled` → `idle` | toast | `ghHiringToast`, el existente | aparición inmediata |

## Interaction Rules

- **`ghHiringMoved` se dispara después de la escritura, nunca al soltar.** Es la regla que sostiene todo este
  contrato: la animación de llegada es la señal de «esto quedó guardado», y usarla antes la vuelve mentira.
- **Sin celebración en `selected`.** Ni confeti, ni destello, ni chip animado. La primitive tiene variants
  `spotlight` y `signal` con shimmer y dot pulsante: **ninguna se usa acá**. Un chip que brilla junto al
  nombre de una persona convierte un registro en un anuncio.
- **Sin alarma en `rejected` ni en `not_selected`.** Sin sacudida, sin pulso, sin parpadeo, sin color de
  alarma. El desenlace se lee, no se dramatiza — es la misma regla que ya fijó el contrato de `TASK-1763`.
- **El bloque de causa aparece sin crecimiento animado.** Un morph de altura desplaza el CTA justo bajo el
  cursor del operador que acaba de hacer click, y el gesto siguiente manda un correo irreversible.
- **El CTA reserva su ancho** durante el envío: el estado pendiente no debe mover «Cancelar» de su sitio.
- **Sin auto-dismiss** del diálogo, en ningún estado. Ni éxito, ni error.
- **Sin animación de entrada propia para el chip.** Entra con la tarjeta, en `ghHiringCardIn`, como un
  elemento más de su composición.
- Los avisos —el de «Evaluación» y el de correo— **no titilan ni se anuncian con motion**: son texto
  persistente. Un aviso que se mueve se lee como notificación y se ignora como notificación.
- `Escape` y la cancelación no esperan a que termine ninguna transición.

## Tokens and implementation

- Se reusan los keyframes ya declarados en la vista (`ghHiringCardIn`, `ghHiringMoved`, `ghHiringDropPulse`,
  `ghHiringToast`, `ghHiringPop`) y la transición canónica del `Dialog`. **No se agrega ningún keyframe ni
  duración nueva.**
- Duraciones y curvas salen del tema (`theme.transitions.duration.*`) o de los keyframes existentes. **Ningún
  valor de milisegundos ni de easing literal nuevo** entra en el diff.
- `GreenhouseChip` ya trae su propio bloque `@media (prefers-reduced-motion: reduce)`; no se le agrega motion
  por encima ni se le pasa una variant animada.
- El bloque `@media (prefers-reduced-motion: reduce)` que la tarjeta y la columna ya tienen se extiende a las
  piezas nuevas: mismo estado final, mismo foco, mismo anuncio.

## GVC / Micro Evidence

- Capturar en `1440x900` y `390x844`: apertura del diálogo, revelado del grupo de causa, estado de envío,
  llegada de la tarjeta a «Cerrado» y cancelación sin efecto.
- **Frame decisivo:** el instante posterior al drop en «Cerrado». Debe mostrar la tarjeta **quieta en su
  columna de origen** con el diálogo abierto. Si en ese frame la tarjeta ya está en «Cerrado», el contrato
  está roto.
- Capturar el revelado del grupo de causa en dos frames (`feedback` y `settled`) para probar que el CTA no
  se desplaza.
- Repetir la secuencia completa con `prefers-reduced-motion: reduce` y demostrar estado final, foco y
  anuncio equivalentes.
- Verificar que el CTA no cambia de ancho entre reposo y envío.
- Verificar que no aparece scroll horizontal de página durante ninguna transición, en ninguno de los dos
  viewports.

## Design Decision Log

| Decisión | Alternativas | Por qué ésta |
|---|---|---|
| `ghHiringMoved` sólo después de la escritura | Dispararla al soltar, como en las otras columnas | En las otras cinco columnas la escritura ocurre al soltar, así que la animación es honesta. Acá no: usarla antes señalaría una escritura que no existe |
| `ghHiringDropPulse` no corre al soltar en «Cerrado» | Conservarlo por consistencia visual entre columnas | La consistencia visual no puede comprarse mintiendo sobre el estado. La columna se resalta igual; lo que no ocurre es la celebración del aterrizaje |
| Chip sin variant animada | `spotlight` o `signal`, que ya existen en la primitive | Un chip que brilla junto al nombre de una persona convierte un registro operativo en un anuncio; y `signal` significa «live», que es lo contrario de un proceso terminado |
| Revelado de causa sin morph de altura | Colapso/expansión animado | El morph desplaza el CTA bajo el cursor y el gesto siguiente manda un correo irreversible |
| Sin auto-dismiss en ningún estado | Cerrar solo tras el éxito | El operador tiene que ver el resultado; un cierre automático le quita la única confirmación visual de una acción irreversible |
| Reuse total de keyframes | Escribir motion propio para el diálogo | La vista ya tiene su lenguaje de movimiento; agregar otro para una sola superficie produce dos dialectos en la misma pantalla |

## Acceptance Criteria

- [ ] `ghHiringMoved` corre **sólo** después de que el command confirmó; el frame posterior al drop muestra
      la tarjeta quieta en su columna de origen.
- [ ] `ghHiringDropPulse` no se dispara al soltar en «Cerrado».
- [ ] El chip no usa las variants `spotlight` ni `signal`, y no tiene animación de entrada propia.
- [ ] El revelado del grupo de causa no desplaza el CTA.
- [ ] El CTA conserva su ancho entre reposo y envío.
- [ ] No existe motion celebratoria en `selected` ni punitiva en `rejected` o `not_selected`.
- [ ] Ningún milisegundo ni easing literal nuevo entra en el diff.
- [ ] `prefers-reduced-motion: reduce` llega al mismo estado final, con el mismo foco y el mismo anuncio.
- [ ] Ninguna transición introduce scroll horizontal de página en desktop ni en 390 px.
