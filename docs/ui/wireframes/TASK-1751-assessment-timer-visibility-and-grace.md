# Wireframe — Gracia de envío usable y errores honestos en la rendición del candidato

> **Recalibrado el 2026-08-26 (Slice 0).** La versión original describía cuatro defectos; **dos ya no
> existen** y se retiraron: el reloj es `position: sticky` desde `bc69e5a75` (2026-08-19, 2h43m después de
> crearse la task) y los avisos de 5 y 1 minuto **nunca** fueron sólo `srOnly` — la insignia visible
> `.timerBadge` convive con el canal de lector de pantalla desde el ship original `9b69ca7cd` (2026-07-13).
> El discovery agregó tres hallazgos que sí son ciertos. **NUNCA** "arreglar" `.timerBadge` ni el `srOnly`
> partiendo de este documento: ambos funcionan.

## Por qué existe este documento

El 2026-08-19 una candidata real (`EO-ASM-0128`) perdió una respuesta escrita y quedó sin poder enviar,
teniendo 26 minutos de gracia disponibles. Este wireframe fija cómo se comporta la pantalla entre el plazo
de respuesta y el de envío, para que ese trabajo no se pierda y, si se pierde, la pantalla lo diga.

- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/wireframes/TASK-1751-assessment-timer-visibility-and-grace.md (benchmark repo-native; la fuente visual viva es `src/components/greenhouse/hiring/assessment/AssessmentTaking.module.css`)
- **Benchmark declarado:** la propia superficie, ya shipeada y en producción, más su hermana pública
  `src/components/greenhouse/careers/TalentPoolSelfServiceClient.tsx` para el patrón de error por `code`.
  No hay dirección visual nueva que explorar: es un fix de defecto sobre una pantalla existente, y la
  fidelidad se mide contra lo que ya está en pantalla, no contra una propuesta.

## Los defectos vigentes, con su evidencia

### 1. La gracia de 30 minutos es inservible con texto sin guardar

`resolveAssessmentTiming` (`src/lib/hiring/assessment/public-taking.ts:191-250`) define dos plazos:
`answerDeadline = startedAt + effectiveMinutes` cierra el **guardado**; `closeDeadline = answerDeadline +
30 min` cierra el **envío**. Entre ambos, `phase = 'submit_grace'`.

`instances.ts:578-580` rechaza cualquier guardado pasado `answer_deadline` con `assessment_not_open` (409),
en `>=` y **sin epsilon**.

El defecto no es el corte: es que el borrador en vuelo **se descarta**. `canAnswer` es dependencia del
efecto de autosave, así que al pasar a `false` React corre su cleanup (`AssessmentTakingClient.tsx:276-278`)
y **cancela el `setTimeout` pendiente**. El texto queda sólo en el `useState` de `:121`.

**Agravante verificado:** el autosave es un debounce que **se reinicia con cada tecla** (450 ms para
`open_text`, `:274`). Quien escribe de corrido sin pausar medio segundo **no guarda nada**: no pierde los
últimos milisegundos, puede perder la respuesta entera.

### 2. El paso entre preguntas borra el borrador en silencio

Los botones de paso (`:543`) y "Anterior" (`:642`) **no consultan `canAnswer`**. Al cambiar de pregunta, el
efecto de `:207-221` ejecuta `setAnswer(responseAnswerFor(...))` y sobreescribe el borrador local con el
valor del servidor — vacío. Sin aviso. Un clic destruye el texto que esta pantalla promete preservar.

### 3. El error final no dice la causa, y el autosave miente igual

`hiringAssessment.ts:13` — `errorBody: 'Prueba de nuevo en unos minutos. Si el problema sigue, avisa a
quien te contactó.'` Aquí la causa es conocida y estructural, y reintentar **no puede funcionar nunca**.

Se usa en **dos** catches, no uno: submit (`:334-348`) y autosave (`:259-264`). Ambos son `catch` sin
binding, y el `code` ya se había perdido antes en `apiRequest` (`:100-104`), que tipa el payload sin él.

## Decision

**Dirección visual: `repo-native-benchmark`. No se explora dirección nueva, y esa es la decisión.**

Esta superficie ya está en producción, tiene lenguaje visual propio y resolvió su primera impresión hace
meses. Lo que falla no es cómo se ve: es que **miente sobre lo que está pasando** y destruye trabajo sin
avisar. Inventar una dirección visual para arreglar eso sería confundir el problema.

El benchmark es doble y ambos lados viven en el repo:

- **La propia pantalla**, para todo lo estructural: la banda de fase hereda la familia de superficie de
  `.sessionBar`, el textarea conserva su caja, el pie de navegación no se reordena.
- **`TalentPoolSelfServiceClient.tsx:84-89`**, para el patrón de error por `code` en una superficie pública
  sin auth. Es el mismo problema resuelto por otro equipo en el mismo repo; se copia la forma, no se
  reinventa.

Consecuencia de alcance: **no hay exploración de conceptos ni comparación de direcciones**, porque no hay
decisión visual abierta. Lo que sí hay es una decisión de comportamiento —qué se preserva, qué se declara y
qué se deja de ofrecer— y ese es el contenido de este documento.

## Token mapping

La superficie usa CSS modules propios y **no** consume el theme del portal, así que el mapa es contra las
variables ya definidas en `AssessmentTaking.module.css`, no contra `theme.palette.*`.

| Elemento | Variable / regla | Origen |
|---|---|---|
| Banda de fase — fondo | misma familia de superficie que `.sessionBar` (`:86-98`) | existente, se reusa |
| Banda de fase — texto | `--text-primary` | existente |
| Conteo de guardadas | `--text-secondary` | existente |
| Textarea congelado | `.textArea:read-only` | **regla nueva**, obligatoria |
| Mensaje de plazo cerrado | tono `warning` del reloj | existente |
| Mensaje de fallo real | tono de error | existente |
| Espaciado de la banda | escala `4n` ya vigente en el módulo | existente |

Ninguna entrada introduce un valor literal nuevo. La única regla nueva es `.textArea:read-only`, y existe
porque `readOnly` **pierde** el gris que hoy pone el navegador vía `:disabled`.

## Anti-patterns

Prohibiciones derivadas del discovery. Cada una tiene un caso que la justifica.

- **NUNCA** tocar `.timerBadge` ni el canal `srOnly` de los avisos de tiempo. Funcionan desde el ship
  original; la spec afirmaba lo contrario y era falso.
- **NUNCA** confiar en el gris del navegador para señalar "congelado". `.textArea` no tiene variante
  `:disabled` propia: al pasar a `readOnly` la señal desaparece y el campo parece editable.
- **NUNCA** usar `Date.now()` para decidir la ventana de guardado. El reloj autoritativo es
  `projectAssessmentDatabaseNow`; el contract test prohíbe el reloj de pared explícitamente.
- **NUNCA** agregar un campo al DTO público para el conteo de guardadas. Se deriva en cliente desde
  `assessment.responses`; hay allowlists exactos testeados.
- **NUNCA** aflojar el `message` del servidor para que "diga la verdad". Es un endpoint público sin auth y
  el genérico es deliberado. La verdad se construye en el cliente desde el `code`.
- **NUNCA** relajar `answerDeadline` en `instances.ts` para que un guardado tardío entre. Si una
  implementación lo necesita, la implementación está mal.
- **NUNCA** ofrecer "Reintentar" donde reintentar no puede funcionar. Un control que no puede tener efecto
  es peor que ninguno: manda a la persona a insistir en vez de a la acción que sí le queda.
- **NUNCA** arreglar sólo el catch del submit. `errorBody` se usa también en el autosave, con la misma
  deshonestidad.

## Desktop Target

Viewport de referencia **1440×900**. La superficie es pública y **no consume el shell del portal**: no hay
sidebar, no hay topbar de aplicación. La composición es una columna centrada con ancho máximo acotado
(`.shell`), sobre fondo propio del módulo.

Regiones, de arriba a abajo:

1. **Barra de sesión** (`.sessionBar`, `:86-98`) — `position: sticky` con `inset-block-start` igual a la
   altura del header de careers. Contiene título de la vacante a la izquierda y el reloj a la derecha, con
   su insignia de aviso y su barra de progreso. **Ya implementada; no se toca.**
2. **Banda de estado de fase** — región nueva de esta task, entre la barra y el enunciado. Sólo existe en
   `submit_grace`. Es la única superficie `contained` que la task agrega.
3. **Enunciado y control de respuesta** — la pregunta y su textarea u opciones.
4. **Pie de navegación** — "Anterior", indicador de paso, y el CTA de avance o envío.

El momento visual dominante en `answering` es el reloj; en `submit_grace` pasa a ser **la banda**, que es
lo que explica por qué la pantalla dejó de aceptar texto. Ese traspaso es deliberado: la persona necesita
entender el cambio de reglas antes que seguir mirando el contador.

Presupuesto de chrome: barra de sesión + banda + card de pregunta = **tres superficies `contained`**, que
es el techo. Por eso la banda **reemplaza** al aviso inline de guardado durante la gracia en vez de sumarse.

## Mobile Target

Viewport de referencia **390×844**.

- `.sessionBar` ya colapsa a columna en ≤560px (`:733-738`). El `sticky` conserva altura mínima y no debe
  tapar el enunciado; los controles llevan `scroll-margin-block-start` igual a la altura de la barra
  (`:110-112`, ya implementado).
- La banda de fase ocupa el ancho completo, con el conteo de respuestas guardadas en su propia línea. En
  390px el texto no debe truncarse ni forzar scroll horizontal de página.
- El textarea en solo lectura conserva su altura: **no colapsa**. Que el texto siga visible es el punto.
- El pie de navegación mantiene el CTA de envío como acción de ancho completo; "Anterior" queda secundario
  arriba de él, no al costado.

Objetivo duro: **cero scroll horizontal de página** en 390px, verificado con evidencia de ancho.

## Action Hierarchy

| Nivel | Acción | Fase | Tratamiento |
|---|---|---|---|
| Primaria | **Enviar evaluación** | `submit_grace` y última pregunta | CTA sólido, ancho completo en móvil |
| Primaria | **Siguiente** | `answering` | CTA sólido |
| Secundaria | **Anterior** | ambas | Contorno, nunca sólido |
| Terciaria | Paso directo por número | ambas | Control sutil; en `submit_grace` **no puede destruir borrador** |
| Ausente | **Reintentar** | sólo donde reintentar puede funcionar | No se pinta en `assessment_not_open` ni en `assessment_incomplete` |

La regla que gobierna la tabla: **una acción que no puede tener efecto no se ofrece.** El botón de
reintentar es hoy la mentira más cara de esta pantalla, y su tratamiento correcto es no existir en los dos
casos donde el reintento es imposible.

## Visual Fidelity Mapping

La superficie usa **CSS modules propios**, no MUI: es pública y no consume el theme del portal
(`Primitive decision: one-off`, ver `## Implementation Mapping`). La fidelidad se mide contra las
variables ya definidas en `AssessmentTaking.module.css`, no contra `theme.palette.*`.

| Intención | Token/variable existente | Prohibido |
|---|---|---|
| Fondo de la banda de fase | la misma familia de superficie que `.sessionBar` | HEX literal nuevo |
| Texto principal de la banda | `--text-primary` | color crudo |
| Texto del conteo guardado | `--text-secondary` | `--text-disabled` (no está deshabilitado, es secundario) |
| Textarea congelado | regla explícita `.textArea:read-only` | heredar el gris del navegador |
| Mensaje de error de plazo | el tono de advertencia ya usado por el reloj en `warning` | rojo de error (no es un fallo del sistema) |

**Decisión de fidelidad load-bearing:** hoy el textarea deshabilitado se ve gris **sólo por el estilo por
defecto del navegador** — `.textArea` (`:606-624`) no tiene variante `:disabled`. Al pasar a `readOnly` esa
señal desaparece y **no hay CSS que la reemplace**. La regla `.textArea:read-only` es obligatoria, no
cosmética: sin ella el candidato no distingue un campo editable de uno congelado.

## Copy Ledger

Todo en `src/lib/copy/dictionaries/es-CL/hiringAssessment.ts` + par `en-US` + tipo en
`src/lib/copy/types.ts`. Tuteo es-CL, sin culpar al candidato, sin jerga técnica. El tipo
`HiringAssessmentCopy` **obliga** las dos lenguas: una clave que falte en un diccionario rompe `typecheck`.

| Key | Estado | Texto propuesto |
|---|---|---|
| `graceTitle` | nueva | `El tiempo para responder terminó` |
| `graceBody` | nueva | `Ya no puedes editar ni agregar respuestas, pero todavía puedes enviar lo que alcanzaste a guardar.` |
| `graceSavedCount` | nueva | `Guardadas: {saved} de {total}.` |
| `saveClosedTitle` | nueva | `Tu tiempo de respuesta terminó` |
| `saveClosedBody` | nueva | `No pudimos guardar esta respuesta porque el plazo se cumplió. Tu texto sigue en pantalla: cópialo si lo necesitas. Puedes enviar lo que ya está guardado.` |
| `submitIncompleteBody` | nueva | mensaje para `assessment_incomplete` que nombra la causa sin exponer qué pregunta falta |
| `timeWarningFive` / `timeWarningOne` | **ya existen y ya se usan** | no tocar |
| `errorBody` | existe | queda **sólo** para el fallo genuino de sistema (5xx/red), que es su caso legítimo |
| `retry` | existe, **sin consumer** | se activa sólo donde reintentar puede funcionar |

Todo copy visible pasa por `greenhouse-ux-writing` antes de commitearse.

## State Copy

Seis estados, cada uno con copy visible y comportamiento de recuperación declarado.

| Estado | Fase | Copy visible | Recuperación ofrecida |
|---|---|---|---|
| ready | `answering` | Reloj con cuenta regresiva, insignia de aviso en `warning`/`critical`, textarea editable, chip "Guardado" del autosave | Ninguna necesaria. El guardado preventivo actúa solo, sin pedirle nada a la persona |
| loading | resolución de token | `loadingTitle` / `loadingBody` ya existentes | Ninguna: es transitorio. Si falla, cae a error |
| empty | evaluación sin preguntas | `noQuestionsTitle` / `noQuestionsBody` ya existentes | Sin acción del candidato; la salida es el contacto humano |
| partial | `submit_grace` | Banda con `graceTitle` + `graceBody` + `graceSavedCount`; textarea en solo lectura con el texto **preservado y visible**; CTA de envío habilitado | **Copiar el texto** y **enviar lo guardado**. Ambas posibles, ambas ofrecidas. Nunca "reintentar" |
| error | cualquiera | Distinto por causa: `saveClosedBody` si venció el plazo; `submitIncompleteBody` si faltan respuestas; `errorBody` genérico **sólo** en fallo real de sistema | Reintentar **sólo** en el genérico y en el 429. En los otros la recuperación es enviar lo guardado |
| denied | token inválido, rotado o consumido | `invalidTitle` / `invalidBody` ya existentes | Ninguna en pantalla: la salida es el contacto humano. **No** se ofrece reintentar |

Regla transversal: **ningún estado ofrece una acción que no puede tener efecto.**

## Fase `submit_grace` — honesta y sin trampa

```
┌────────────────────────────────────────────────────────────┐
│ 💼 Account Manager      ⏱ Para enviar te quedan  26:12     │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⏱ El tiempo para responder terminó. Ya no puedes       │ │
│ │   editar ni agregar respuestas, pero todavía puedes    │ │
│ │   enviar lo que alcanzaste a guardar.                  │ │
│ │   Guardadas: 5 de 6.                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│  [textarea EN SOLO LECTURA, contenido preservado]          │
│  Atrás                              Enviar evaluación      │
└────────────────────────────────────────────────────────────┘
```

Decisiones que esto fija:

- El textarea pasa a **`readOnly`**, no se vacía ni se desmonta, y **gana señal visual propia**. El
  candidato conserva su texto a la vista y puede copiarlo — con `disabled` queda fuera del tab order y del
  árbol de accesibilidad, o sea que un lector de pantalla tampoco puede leérselo.
- El botón de envío **no intenta guardar**: envía lo ya guardado.
- La banda declara cuántas respuestas se guardaron, para que "enviar" sea una decisión informada. El
  conteo se **deriva en cliente** desde `assessment.responses`; **nunca** un campo nuevo en el DTO
  (`public-boundary.test.ts:199-224` afirma allowlists exactos).
- El paso entre preguntas **no puede sobreescribir** el borrador.

## Accessibility Contract

- La banda de fase usa `role='status'`, no `alert`: informa un cambio de reglas, no interrumpe una tarea.
- Se **conserva** el `srOnly` con `aria-live='polite'` de los avisos de tiempo; la banda visible **no**
  lleva `aria-live` propio, para no duplicar el anuncio.
- El reloj mantiene `role='timer'` y su `aria-label` (`:497-499`).
- **`readOnly` sobre `disabled` es una decisión de accesibilidad, no de estilo:** `disabled` saca el campo
  del tab order y su contenido del árbol de accesibilidad. Durante la gracia eso significa que quien usa
  lector de pantalla **no puede releer lo que escribió**. Con `readOnly` conserva foco, lectura y copia.
- `readonly` **no aplica** a `<input type=checkbox|radio>` por spec HTML: esos conservan `disabled`. La
  asimetría es correcta y debe quedar declarada en el contract test, no silenciada.
- Contraste AA en la banda y en los mensajes nuevos. Los tres tonos del reloj ya están shipeados y no se
  re-auditan acá.
- El mensaje de error se asocia al control por `aria-describedby`; no se anuncia como `alert` si la
  persona todavía puede actuar.

## Implementation Mapping

- **Ruta / surface:** `/assessment/[token]`, `/public/assessment/[token]` y `/public/assessment/session` →
  `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- **CSS:** `AssessmentTaking.module.css` — `.sessionBar:86`, `.textArea:606`, `.srOnly:718`
- **Timing (sin cambios de contrato):** `resolveAssessmentTiming`
  (`src/lib/hiring/assessment/public-taking.ts:191`) ya expone `phase`, `answerDeadlineAt`,
  `closeDeadlineAt`, `remainingSeconds`. **La UI ya recibe todo lo que necesita.**
- **Reloj autoritativo:** `projectAssessmentDatabaseNow` (`assessment-taking-clock.ts:7-10`). **NUNCA**
  `Date.now()` — el contract test lo prohíbe explícitamente (`:27`).
- **Guardado a reusar:** `saveAnswer` (`:233`). No se crea función nueva.
- **Origen del 409:** `instances.ts:578-580` (`assessment_not_open`). **No se modifica**: el plazo de
  respuesta debe seguir cerrando. Lo que cambia es cuándo se guarda antes, y cómo se presenta después.
- **Error por `code`, no por `message`:** el servidor devuelve `{ok, code, message}` con `message`
  genérico **por diseño**, fijado por el test anti-leak `route.test.ts:146-161`. El mensaje honesto se
  construye en el cliente. Precedente exacto: `TalentPoolSelfServiceClient.tsx:84-89`.
- **Copy:** `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` + `src/lib/copy/types.ts`
- **Primitive decision:** `one-off` — superficie pública que no consume el shell del portal; CSS modules
  propios, no MUI. No se introduce primitive nueva.
- **Access / capability:** ninguna. Superficie pública autenticada por token o sesión opaca.

## GVC Scenario Plan

- **Scenario file:** `scripts/frontend/scenarios/task1751-assessment-grace.scenario.ts`
- Quality profile: premium
- **Viewports:** variante `desktop` 1440 + variante `mobile` 390
- **Reduced motion:** `reducedMotionCheck: true`
- **Baseline decision:** **sin baseline previo.** Esta task establece la primera línea base de la fase
  `submit_grace`; el escenario existente `task1363-assessment-taking-runtime.scenario.ts` cubre sólo
  `answering` y no tiene perfil premium. No hay rebaseline que declarar en `BASELINE_DELTAS.md`.
- **Review dossier:** `pnpm fe:capture:review` sobre la captura, adjunto en `docs/ui/reviews/`
- **Scroll-width evidence:** ancho de documento vs viewport capturado en 390px; el gate exige la evidencia
  explícita, no la ausencia de findings
- **Seed:** la fase de gracia **no se puede alcanzar navegando** — requiere un assessment con `started_at`
  ya pasado el `answerDeadline` y antes del `closeDeadline`. Es dato, no UI. Se siembra con un script
  dedicado siguiendo el patrón de `scripts/hiring/_seed-task-1422-gvc.ts`, usando
  `resolveLiveTestCandidateFixture('task-1751-gvc')` — **nunca** el primer perfil activo de la base
  (`ISSUE-159`: hay UNA sola instancia Cloud SQL compartida dev/staging/producción).
- **`data-capture`:** `assessment-timer` ya existe (`:497`); **agregar** `assessment-grace-banner` a la
  banda, que hoy existe (`:518-523`) sin marcador
- **Assertions:** en `submit_grace` el textarea tiene `readonly` y conserva texto visible; la banda declara
  el conteo guardado; el CTA de envío está habilitado; **no** aparece un botón de reintentar; sin scroll
  horizontal en 390px

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Guardado preventivo por umbral | Flush al cruzar `answerDeadline` | **Imposible por construcción:** el cliente va atrás del servidor ≥1 RTT y el corte es `>=` sin epsilon. Llegaría siempre tarde y cobraría 409 |
| Guardado preventivo por umbral | Autoguardado continuo sin debounce | Cambia el contrato de guardado y multiplica la carga; el umbral resuelve el caso real sin tocar el resto de la sesión |
| Textarea `readOnly` en gracia | Desmontarlo o vaciarlo | Destruir el texto del candidato delante de él es el peor resultado posible |
| `readOnly` **con señal visual propia** | Confiar en el gris del navegador | `.textArea` no tiene variante `:disabled`; al pasar a `readOnly` la señal desaparece y el campo parece editable |
| `disabled` se queda en radio y checkbox | Uniformar todo a `readOnly` | `readonly` no aplica a esos controles por spec HTML. La asimetría se declara, no se silencia |
| Gatear el paso entre preguntas | Dejarlo libre | Hoy un clic sobreescribe el borrador con el valor del servidor, en silencio. Rompe la promesa central de esta pantalla |
| Mensaje honesto construido en cliente desde `code` | Hacer hablar al `message` del servidor | El endpoint es público sin auth; aflojar el mensaje rompe el test anti-leak y debilita la frontera |
| Tratar **ambos** catches | Especializar sólo el submit | `errorBody` se usa en submit y en autosave; arreglar uno deja la otra mitad igual de deshonesta |
| Conteo derivado en cliente | Campo nuevo en el DTO | `public-boundary.test.ts` afirma allowlists exactos del payload público |
| No tocar `instances.ts` | Permitir guardar durante la gracia | El plazo de respuesta es el invariante del test; extenderlo de facto lo vacía de sentido |

## Fuera de alcance

- Cambiar la duración de la gracia (30 min) o del límite base.
- Autoguardado **continuo** mientras se escribe — follow-up declarado, con su propio riesgo de contrato.
  No confundir con el guardado preventivo por umbral, que dispara una vez antes del plazo.
- El reloj `sticky` y los avisos de 5 y 1 minuto: **ya implementados**, no son defecto.
- El mensaje `invalidBody` del enlace no disponible (dueño distinto, mismo patrón).
- Cualquier superficie de operador, incluido el workbench de revisión.
