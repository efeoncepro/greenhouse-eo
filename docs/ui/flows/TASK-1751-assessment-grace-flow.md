# Flow — La rendición del candidato entre el plazo de respuesta y el de envío

> Contrato de flujo de `TASK-1751`. Complementa el wireframe
> (`docs/ui/wireframes/TASK-1751-assessment-timer-visibility-and-grace.md`), que fija layout, estados y
> copy. Acá se fija **la coordinación entre estados y el diálogo**, que es donde nace el defecto.

## Por qué este documento existe

La task nació con `Flow: none` porque parecía una pantalla sola. El discovery del 2026-08-26 mostró que
no lo es: el diálogo de confirmación **se abre durante la gracia sin verificar completitud**
(`AssessmentTakingClient.tsx:299-303`), y el paso entre preguntas **no está gateado**
(`:543`, `:642`). Ahí es donde el candidato pierde su texto y donde nace el error imposible de resolver.

Hay tres superficies coordinándose dentro de un mismo componente: el **formulario** (textarea + opciones),
la **barra de sesión** (reloj y banda de estado) y el **diálogo** de confirmación. El defecto vive en sus
transiciones, no en ninguna de las tres por separado.

## Las tres fases y quién manda en cada una

`timingPhase` se deriva en el cliente (`:145-160`) del reloj proyectado de base
(`projectAssessmentDatabaseNow`), y se re-evalúa en el tick de 1 s (`:200-202`). **Nunca de `Date.now()`.**

| Fase | Ventana | Puede editar | Puede guardar | Puede enviar |
|---|---|---|---|---|
| `answering` | hasta `answerDeadline` | sí | sí | sólo en la última pregunta |
| `submit_grace` | +30 min | **no** | **no** (servidor corta en `>=`) | **sí** |
| `closed` | tras `closeDeadline` | no | no | no |

El invariante que ninguna transición puede relajar: **el plazo de respuesta cierra el guardado.** La gracia
existe para enviar lo ya guardado, no para seguir escribiendo.

## Transición `answering` → `submit_grace`

Es el momento del defecto. Hoy ocurre así:

1. El tick cruza `answerDeadline` y `canAnswer` pasa a `false`.
2. React corre el cleanup del efecto de autosave (`:276-278`) y **cancela el `setTimeout` pendiente**.
3. El borrador queda sólo en el `useState` de `:121`. Nunca llega al servidor.

**Lo que el flujo debe garantizar:**

- **Antes de la transición**, un guardado preventivo por umbral ya persistió el borrador. Es la única
  defensa que evita la pérdida; todo lo demás la administra.
- **En la transición**, el texto **permanece a la vista** en solo lectura. Nunca se vacía ni se desmonta:
  destruir el trabajo de alguien delante de sus ojos es el peor resultado posible.
- **Después de la transición**, ninguna acción del candidato puede sobreescribir ese texto.

## El paso entre preguntas durante la gracia

Hoy los botones de paso (`:543`) y "Anterior" (`:642`) no consultan `canAnswer`. Al cambiar de pregunta,
el efecto de `:207-221` ejecuta `setAnswer(responseAnswerFor(...))` y **sobreescribe el borrador local con
el valor del servidor** — vacío, porque nunca se guardó. Sin aviso.

Contrato: durante `submit_grace` el candidato **puede navegar para revisar**, y esa navegación **nunca
sobreescribe un borrador no guardado**. Si el flujo no puede garantizar ambas cosas a la vez, gana la
segunda: es preferible bloquear el paso que borrar el texto en silencio.

## El diálogo de confirmación

`goNext` bloquea el submit incompleto en el flujo normal (`:319-328`), pero en `submit_grace` el diálogo
se abre sin esa verificación (`:299-303`). Resultado: el candidato confirma, el servidor responde
`assessment_incomplete`, y el mensaje genérico lo manda a reintentar algo imposible.

Contrato del diálogo:

- **No promete lo que no puede cumplir.** Si el envío va a fallar por completitud, eso se dice **antes**
  de abrirlo, no después de confirmar.
- **Declara qué se va a enviar**: cuántas respuestas quedaron guardadas, derivado en cliente desde
  `assessment.responses` — **nunca** un campo nuevo en el DTO (hay allowlists exactos testeados en
  `public-boundary.test.ts:199-224`).
- **El envío en gracia no intenta guardar.** Envía lo que ya está persistido.
- Su nombre accesible no puede colisionar con `copy.taking.submit`: el test de diálogo resuelve por
  `getByRole('button', { name: copy.taking.submit })` y un segundo botón homónimo lo rompe.

## Estados de error y a dónde llevan

El servidor devuelve `{ok, code, message}` con `message` **genérico por diseño** — es un endpoint público
sin autenticación, y el test anti-leak (`route.test.ts:146-161`) lo fija. El mensaje honesto se construye
**en el cliente desde el `code`**, siguiendo el precedente de `TalentPoolSelfServiceClient.tsx:84-89`.

| Situación | `code` | A dónde lleva al candidato |
|---|---|---|
| Faltan respuestas | `assessment_incomplete` | A la pregunta que falta, si aún puede responder; si no, a enviar lo guardado |
| Venció el plazo de respuesta | `assessment_not_open` (409) | A copiar su texto y enviar lo guardado. **Nunca** a reintentar |
| Venció el plazo de envío | `assessment_unavailable` (404, carril sesión) | A la pantalla terminal; no hay acción posible |
| Demasiados intentos | `assessment_unavailable` (429) | A esperar. Es el único caso donde reintentar sirve |
| Falla nuestra | `assessment_public_error` (502) | A reintentar. Es su caso legítimo |

Regla: **el botón de reintentar sólo aparece donde reintentar puede funcionar.** Los dos primeros casos no
lo llevan. Hoy los cinco rinden el mismo texto, y ese es el defecto (d) de la task.

## GVC Scenario Plan

El escenario del flujo es el mismo archivo que el del wireframe
(`scripts/frontend/scenarios/task1751-assessment-grace.scenario.ts`, `qualityProfile: 'premium'`,
variantes desktop 1440 y mobile 390, `reducedMotionCheck: true`), pero lo que este contrato exige capturar
son **las transiciones**, no los estados quietos:

1. **`answering` con borrador en vuelo** — texto escrito y aún no persistido, antes del umbral.
2. **Cruce del umbral de guardado preventivo** — evidencia de que el borrador quedó guardado *antes* del
   plazo, no después. Es la aserción que distingue esta task de un maquillaje.
3. **`answering` → `submit_grace`** — el texto **sigue en pantalla**, el textarea queda en solo lectura con
   su señal visual propia, y la banda aparece.
4. **Paso entre preguntas dentro de la gracia** — ida y vuelta; el borrador **no se sobreescribe**. Es la
   transición que hoy destruye el texto en silencio.
5. **Apertura del diálogo de envío en gracia** — no promete lo que no puede cumplir.

**Baseline decision:** sin baseline previo; ninguna captura existente cubre `submit_grace`. Esta task fija
la primera.

**Seed:** la fase de gracia no se alcanza navegando — requiere `started_at` pasado el `answerDeadline` y
antes del `closeDeadline`. Se siembra con `resolveLiveTestCandidateFixture('task-1751-gvc')`, nunca sobre
un perfil real de la base compartida.

**Review dossier:** `pnpm fe:capture:review` sobre la captura, con la evidencia de ancho en 390px.

## Design Decision Log

| Decisión de flujo | Alternativa descartada | Por qué |
|---|---|---|
| Guardar **antes** del umbral, no en el cruce | Flush en la transición | El cliente va atrás del servidor ≥1 RTT; en el cruce el guardado ya llega tarde y cobra 409 |
| Durante la gracia se puede **navegar para revisar** | Congelar también la navegación | Revisar lo respondido antes de enviar es legítimo y no rompe ningún invariante |
| Si navegar y preservar el borrador entran en conflicto, **gana preservar** | Priorizar la navegación | Bloquear un paso es reversible; borrar texto en silencio no |
| Verificar completitud **antes** de abrir el diálogo | Dejar que falle en el submit | Un diálogo que promete un envío que fallará es la mentira que produjo el caso fuente |
| El CTA de reintentar **no existe** donde reintentar no sirve | Mostrarlo deshabilitado | Un control deshabilitado invita a buscar cómo habilitarlo; la acción correcta es otra y debe ser la visible |
| El conteo de guardadas se declara en la banda | Dejarlo implícito | "Enviar" durante la gracia es una decisión con consecuencia; sin el conteo se toma a ciegas |

## Lo que este flujo NO cambia

- La duración del límite base ni la de la gracia.
- El corte server-side del guardado (`instances.ts:578-580`). Si una implementación necesita relajarlo,
  la implementación está mal.
- El shape del error público. Se lee el `code`; no se afloja el `message`.
- Ninguna superficie de operador.
