# TASK-1766 — Superficie del desenlace en el kanban de Hiring

> **Tipo:** wireframe de superficie. Aterriza en píxeles, regiones y estados el vocabulario que ya fijó
> el ADR. **No redefine el vocabulario.**
>
> **Fuente normativa:** [`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md)
> (`Accepted` 2026-08-22) — §7 vocabulario visible, §8 contrato de interacción, §12 reglas duras.
>
> **Reparto con el wireframe vecino:** [`TASK-1754-hiring-stage-vocabulary`](TASK-1754-hiring-stage-vocabulary.md)
> es **el wireframe del vocabulario** —qué estados existen, cómo se llaman, qué se pregunta al cerrar—.
> **Éste es el wireframe de la superficie** —dónde vive cada cosa en pantalla, con qué primitive, en qué
> estado y con qué evidencia—. Aquel documento se **consume**; no se contradice ni se copia. Si algo
> diverge, manda el ADR.
>
> **Estado:** `UI ready: no`. Falta la mirada de diseño sobre el frame real para cerrar el reparto de
> tonos, y falta que `TASK-1765` fije la forma final del command. Ambas cosas están declaradas abajo.

## Alcance de esta página

| Sí | No |
|---|---|
| El chip de desenlace en la tarjeta de «Cerrado» | El enum de desenlace, la causa y su `CHECK` (`TASK-1765`) |
| La causa bajo el chip, sólo en «Sin selección» | El colapso del enum de etapas y `LaneDefinition` (`TASK-1754`) |
| El diálogo que se abre al soltar en «Cerrado» | El diálogo de cierre de cohorte en Application 360 (`TASK-1763`) |
| El aviso de la columna «Evaluación» | El `EmailType` nuevo y su cuerpo por causa (ADR §7.3 + `TASK-1764`) |
| La migración del tag de assessment a la misma primitive | El rediseño de la tarjeta o del tablero |

## Visual Direction

- Visual direction mode: `repo-native-benchmark` — la superficie ya existe en runtime y su benchmark es el
  propio tablero vivo, capturado por `scripts/frontend/scenarios/task355-hiring-pipeline-board.scenario.ts`.
  No hay archivo de Figma para esta pantalla, y no se inventa uno.
- El objetivo visual no es rediseñar: es que **dos etiquetas vecinas en la misma tarjeta dejen de tener
  acabados distintos**. Hoy el tag de assessment es un `<Box>` con `sx` inline y `fontSize: 12` literal
  (`PipelineDeskView.tsx:408`); el chip nuevo nace con la primitive. Si sólo nace el nuevo, la tarjeta queda
  peor que antes.
- El durable asset queda pendiente: la primera corrida del GVC de esta task establece la baseline de la
  superficie. **Por eso `UI ready` permanece en `no`.**

## Desktop Target

Viewport de referencia: **1440 × 900**. El tablero conserva su forma: seis columnas de 264 px de ancho fijo,
scroll horizontal contenido dentro del tablero (nunca de página), tarjeta con avatar de 34 px, nombre a dos
líneas máximo, fuente y fecha de postulación.

Lo que cambia en desktop:

```
 ┌─ Pipeline ─────────────────────────────────────────────────────────────────────────────┐
 │  🔍 Buscar…                                              ⌨  Arrastra o usa el menú ⋮    │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                        │
 │  SOURCED 3   SCREENING 2   EVALUACIÓN 4        ENTREVISTA 1   DECISIÓN 2   CERRADO 6    │
 │  ─────────   ───────────   ──────────────────  ────────────   ──────────   ──────────   │
 │                            ⓘ Al mover aquí se                                          │
 │                              asigna la prueba.  ← aviso persistente, no tooltip         │
 │                                                                                        │
 │  ┌────────┐  ┌────────┐    ┌────────────────┐  ┌─────────┐   ┌────────┐   ┌──────────┐ │
 │  │ tarjeta│  │ tarjeta│    │ tarjeta        │  │ tarjeta │   │ tarjeta│   │ ┌──┐     │ │
 │  └────────┘  └────────┘    │ [Test asignado]│  └─────────┘   └────────┘   │ │RL│ Rox…│ │
 │                            └────────────────┘                             │ └──┘     │ │
 │                                                                           │ [Sin sel…]│ │
 │                                                                           │ cupo tom… │ │
 │                                                                           └──────────┘ │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

Anatomía de la tarjeta en «Cerrado»:

```
┌───────────────────────────────────────────┐
│ ┌────┐  Roxana Lezama                 ⋮   │  ← el ⋮ conserva su posición y su z-index
│ │ RL │  🌐 Careers público                │
│ └────┘                                    │
│                                           │
│ [ Sin selección ]                         │  ← GreenhouseChip · status · label · small
│ El cupo lo tomó otra persona              │  ← causa, sólo en «Sin selección», caption
│                                           │
│ Postuló hace 12 días                      │
└───────────────────────────────────────────┘
```

Anatomía de la tarjeta en cualquier otra columna, después de la migración:

```
│ [ Test entregado ]                        │  ← el MISMO GreenhouseChip, mismo tamaño,
│                                           │    mismo radio, mismo anillo de foco
```

El chip ocupa la misma ranura vertical que hoy ocupa el tag: entre el bloque de identidad y la fila de
metadatos. **La altura de la tarjeta no cambia** —es el before/after que el GVC tiene que probar—.

## Mobile Target

Viewport de referencia: **390 × 844**.

- El tablero conserva `scrollSnapType: 'x proximity'` y su scroll contenido; las columnas siguen midiendo
  264 px, así que se ve una columna completa y el borde de la siguiente. **No se apila el tablero en
  vertical**: perdería la lectura de flujo que es la razón de ser del kanban.
- El aviso de «Evaluación» se mantiene en la cabecera de la columna, a dos líneas si hace falta.
- El diálogo pasa a `fullWidth` con `maxWidth='sm'`: los seis radios en **una sola columna**, la causa
  debajo, y las acciones apiladas al pie con el CTA primario arriba. En 390 px, dos botones lado a lado con
  etiquetas de esta longitud producen un target por debajo del mínimo.
- El arrastre táctil no es el camino principal en móvil: el menú `⋮` lo es. Por eso **el ítem «Cerrado» del
  menú tiene que abrir el mismo diálogo**; si no, el operador móvil no tiene ninguna forma de cerrar bien.

## Action Hierarchy

| Nivel | Elemento | Peso visual | Razón |
|---|---|---|---|
| 1 | «Cerrar proceso» (CTA del diálogo) | botón primario, contained | Es la única acción que escribe, manda correo y arranca el reloj de retención |
| 2 | Los seis radios de desenlace | grupo obligatorio, **ninguno preseleccionado** | Un default preseleccionado invita a confirmar sin leer; la decisión tiene que ser un acto |
| 3 | Los tres radios de causa | grupo condicional, obligatorio cuando aparece | Sólo existe bajo «Sin selección»; fuera de ahí no ocupa espacio |
| 4 | Nota de respaldo | campo de texto | Obligatoria hoy por contrato del command, no por diseño |
| 5 | «Cancelar» | botón de texto | Salida sin efecto; visible pero no compite |
| 6 | Aviso de correo | `Alert` informativo | No es una acción; es la consecuencia que el operador tiene que leer antes de confirmar |
| — | Chip de desenlace en la tarjeta | etiqueta, no interactiva | Informa; no es un control. No abre nada al hacer click |

En el tablero, el chip **no compite con el nombre**: el nombre sigue siendo el elemento dominante de la
tarjeta, y el chip es su calificador.

## Visual Fidelity Mapping

| Intención | Implementación | Prohibido |
|---|---|---|
| Etiqueta de estado compacta | `GreenhouseChip` `kind='status'` `variant='label'` `size='small'` (24 px de alto, `labelSm`) | Un `<Box>` con `sx` inline; un `HiringOutcomeChip` local |
| Color del desenlace | `tone` desde `HIRING_OUTCOME_TONE`, resuelto por `theme.greenhouseSemantic` (tonal AA) | HEX crudo; `color: 'info.dark'` decidido por comparación de strings |
| Tamaño del texto del chip | la variante tipográfica que trae la primitive | `fontSize: 12` literal, como el que existe hoy en `:408` |
| Causa bajo el chip | `Typography variant='caption' color='text.secondary'` | Un segundo chip: la causa no es un estado paralelo, es un calificador del desenlace |
| Radio y elevación del diálogo | `theme.shape.customBorderRadius` + elevación canónica del `Dialog` | valores literales |
| Aviso de «Evaluación» | `Typography variant='caption'` en la cabecera de la columna + `aria-describedby` | `title=` sólo-hover |
| Aviso de correo del diálogo | `Alert severity='info'` | texto suelto sin rol semántico |
| Estados de foco | los que ya trae `GreenhouseChip` y `GreenhouseButton` | `outline: none` |

## Copy Ledger

Todo el copy visible sale de `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`. Ningún literal en JSX.

| Clave | es-CL | Dónde se ve |
|---|---|---|
| `outcome.labels.selected` | `Selección` | chip de la tarjeta · radio del diálogo |
| `outcome.labels.backup_selected` | `Reserva` | chip · radio |
| `outcome.labels.not_selected` | `Sin selección` | chip · radio |
| `outcome.labels.rejected` | `Descarte` | chip · radio |
| `outcome.labels.withdrawn` | `Retiro` | chip · radio |
| `outcome.labels.unresponsive` | `Sin respuesta` | chip · radio |
| `outcome.causes.capacity_filled` | `El cupo lo tomó otra persona` | causa bajo el chip · radio de causa |
| `outcome.causes.opening_closed` | `Se cerró la búsqueda` | causa · radio |
| `outcome.causes.process_cancelled` | `Se canceló el proceso` | causa · radio |
| `outcome.unknown` | `Sin desenlace registrado` | chip del estado degradado |
| `pipeline.outcomeDialog.title` | `Cerrar el proceso de {name}` | título del diálogo |
| `pipeline.outcomeDialog.outcomeLegend` | `¿Cómo terminó?` | leyenda del grupo de desenlace |
| `pipeline.outcomeDialog.causeLegend` | `Causa` | leyenda del grupo de causa |
| `pipeline.outcomeDialog.causeRequired` | `Elige la causa para poder cerrar el proceso.` | error de causa |
| `pipeline.outcomeDialog.outcomeRequired` | `Elige cómo terminó el proceso.` | error de desenlace |
| `pipeline.outcomeDialog.noteLabel` | `Nota de respaldo` | etiqueta del campo |
| `pipeline.outcomeDialog.noteHelper` | `Queda en el registro interno. La persona no la lee.` | helper del campo |
| `pipeline.outcomeDialog.noteRequired` | `Escribe al menos 8 caracteres.` | error del campo |
| `pipeline.outcomeDialog.emailNotice` | `Se enviará un correo a la persona, salvo «Sin respuesta».` | aviso informativo |
| `pipeline.outcomeDialog.submit` | `Cerrar proceso` | CTA primario |
| `pipeline.outcomeDialog.submitting` | `Cerrando…` | CTA en envío |
| `pipeline.outcomeDialog.saved` | `Proceso cerrado: {outcome}.` | toast y live region |
| `pipeline.outcomeDialog.deniedTitle` | `No puedes cerrar procesos` | estado sin capability |
| `pipeline.outcomeDialog.deniedBody` | `Pídele a Talento que registre el desenlace.` | estado sin capability |
| `pipeline.assessmentLaneNotice` | `Al mover aquí se asigna la prueba.` | cabecera de «Evaluación» |

`Cancelar` reusa `common.cancel`, que ya existe en ambos diccionarios.

**El mirror `en-US` no lo garantiza el tipo, y por eso hay test.** `en-US` hace `...esCL` en el nivel raíz
(`dictionaries/en-US/hiringDesk.ts:6`) y otra vez dentro de `pipeline` (`:47`): una clave definida sólo en
castellano compila y se renderiza en castellano dentro del diccionario inglés — es el mismo defecto que el
wireframe de `TASK-1754` ya señala para `stages`. Agregar el bloque a `src/lib/copy/types.ts` **con claves
literales** (no `Record<string, string>`, que es como está tipado `stages` en `:546`) es obligatorio para
que el consumidor compile, pero **no** obliga a traducir. El guard es un test de paridad.

## State Copy

| Estado | Qué se ve | Copy visible | Recuperación |
|---|---|---|---|
| ready | Tarjetas de «Cerrado» con su chip; causa bajo el chip sólo en «Sin selección» | etiquetas del ledger | — |
| loading | El diálogo abre con las opciones ya presentes: son un enum, no una lectura remota. No hay skeleton | — | — |
| empty | Columna «Cerrado» sin tarjetas: se conserva el empty state actual | `pipeline.emptyLane` | soltar una tarjeta |
| partial | `stage='closed'` sin desenlace resoluble (fila anterior al `CHECK`) | `outcome.unknown` en chip neutro | queda **visible** a propósito: el vacío es lo que el ADR viene a hacer imposible, esconderlo lo perpetúa |
| error | El command falló; el diálogo sigue abierto con lo escrito intacto | mensaje canónico es-CL del endpoint | reintentar **sólo** si `actionable=true`; si es estructural, no se ofrece botón |
| denied | Sin `hiring.application.decide`: la columna no acepta el drop y el ítem «Cerrado» del menú no aparece | `outcomeDialog.deniedTitle` + `deniedBody` | ninguna acción propia; sin botón «Reintentar» |
| pending | Acciones deshabilitadas, CTA con ancho reservado | `outcomeDialog.submitting` | esperar; el doble click no duplica por la clave de idempotencia |
| settled | La tarjeta se mueve a «Cerrado» con su chip ya puesto | `outcomeDialog.saved` en toast y live region | — |
| cause-required | El grupo de causa marca error y toma el foco | `outcomeDialog.causeRequired` | elegir causa |
| long content | Nombre a dos líneas; causa a una línea con `title` completo | — | — |
| mobile | Diálogo `fullWidth`, radios en una columna, acciones apiladas | — | — |
| reduced motion | Mismo estado final, sin transición del diálogo ni animación de llegada de la tarjeta | — | — |

## El diálogo — regiones reales

```
┌─ Cerrar el proceso de Roxana Lezama ───────────────────────────┐  ← aria-labelledby
│                                                                │
│  ¿Cómo terminó?                                     (fieldset) │  ← legend, radiogroup
│   ( ) Selección        ( ) Reserva        (•) Sin selección    │     ninguno preseleccionado
│   ( ) Descarte         ( ) Retiro         ( ) Sin respuesta    │
│                                                                │
│  ── sólo con «Sin selección» ───────────────────────────────── │
│  Causa                                          (aria-required)│
│   ( ) El cupo lo tomó otra persona                             │
│   ( ) Se cerró la búsqueda                                     │
│   ( ) Se canceló el proceso                                    │
│   ⚠ Elige la causa para poder cerrar el proceso.               │  ← aria-describedby
│                                                                │
│  Nota de respaldo                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Queda en el registro interno. La persona no la lee.           │
│                                                                │
│  ⓘ Se enviará un correo a la persona, salvo «Sin respuesta».   │  ← Alert info
│                                                                │
│                             [ Cancelar ]  [ Cerrar proceso ]   │
└────────────────────────────────────────────────────────────────┘
```

Cuatro regiones, en este orden: **desenlace**, **causa condicional**, **nota de respaldo**, **aviso de
correo**. El aviso va último y pegado a las acciones porque es lo que el operador tiene que haber leído
justo antes de confirmar.

**La nota existe porque el command la exige**, no porque el diseño la pida: `decideHiringApplication` valida
`reason.summary` entre 8 y 1600 caracteres y lanza `hiring_decision_reason_required` si falta
(`src/lib/hiring/decide.ts:38-53`). Si `TASK-1765` la vuelve opcional para los desenlaces sin juicio, el
diálogo sigue esa forma. El contrato es del command, no de la pantalla.

**El bloque de causa no hace morph de altura.** Aparece de golpe y el foco se mueve a su primer radio. Un
crecimiento animado desplazaría el CTA justo bajo el cursor del operador que acaba de hacer click.

## El aviso de «Evaluación»

```
 EVALUACIÓN  4
 ─────────────────────────────
 ⓘ Al mover aquí se asigna la prueba.
```

- Persistente en la cabecera de la columna, **no tooltip sólo-hover**: el wireframe de `TASK-1754` lo
  descarta explícitamente, y el ADR §12 lo pide como `SIEMPRE`.
- Asociado por `aria-describedby` a la región de la columna, para que llegue también al operador que usa el
  menú `⋮` y nunca pasa el cursor por encima.
- Se refuerza mientras se arrastra por encima, reusando el estado `dragOverLane` que la vista ya tiene.

## Accessibility Contract

- El diálogo es un modal con **foco atrapado**, título asociado por `aria-labelledby` y descripción por
  `aria-describedby`. `Escape` cancela mientras no se haya enviado. **Click fuera no cierra**: el gesto
  manda un correo irreversible a una persona real.
- Cada grupo de radios es un `fieldset` con `legend` visible. El grupo de causa lleva `aria-required` y su
  error se asocia por `aria-describedby`, no sólo por color.
- **Ningún radio viene preseleccionado.** Un default convierte «confirmar» en un reflejo.
- El chip forma parte del **nombre accesible de la tarjeta**: quien navega por teclado escucha
  «Roxana Lezama, Sin selección», no sólo el nombre. Se implementa extendiendo el `aria-label` del botón de
  apertura de la tarjeta, no agregando un `aria-label` al chip.
- El chip **no depende del color para comunicar**: la etiqueta ya lo dice. Tres desenlaces comparten tono
  neutro justamente por eso.
- La live region existente (`aria-live='polite'`) anuncia el desenlace tras el cierre, con una sola
  transición semántica por cambio.
- Foco restaurado al origen —la tarjeta o el ítem del menú— al confirmar y al cancelar.
- Los targets del diálogo cumplen el mínimo de tamaño en 390 px; por eso las acciones se apilan.

## Implementation Mapping

| Pieza | Archivo | Nota |
|---|---|---|
| Tablero y tarjeta | `src/views/greenhouse/hiring/PipelineDeskView.tsx` | sólo la tarjeta, el drop de «Cerrado», el ítem «Cerrado» del menú y el aviso de «Evaluación». `LaneDefinition` es de `TASK-1754` |
| Diálogo | `src/views/greenhouse/hiring/PipelineOutcomeDialog.tsx` | nuevo, local a la vista; composición de `Dialog` + `RadioGroup` + `GreenhouseButton` |
| Chip | `src/components/greenhouse/primitives/GreenhouseChip.tsx` | **se reusa sin tocar**; `kind='status'` `variant='label'` `size='small'` |
| Mapa de tono | `src/views/greenhouse/hiring/hiring-client.ts` | junto a `scoreTone` (`:44-53`) y bajo su misma doctrina de fuente única |
| Copy | `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` + `src/lib/copy/types.ts` | claves literales, mirror real en inglés |
| Capability | `src/app/(dashboard)/agency/hiring/pipeline/page.tsx` | resuelve `hiring.application.decide` y la pasa como `canDecide`; la vista no llama `can()` |
| Escritura | `POST /api/hiring/applications/[id]/decide` | command existente; la forma final del cuerpo la fija `TASK-1765` |
| Test de invariante | `src/views/greenhouse/hiring/pipeline-outcome-contract.test.ts` | cobertura del mapa de tono, chip obligatorio en «Cerrado», paridad de locale |

**Lo que NO se toca:** `src/types/hiring.ts`, `src/lib/hiring/decide.ts`, `src/lib/hiring/store.ts` y
cualquier migración — son de `TASK-1765`. `Application360View.tsx` es de `TASK-1747` y `TASK-1763`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/hiring-pipeline-outcome-surface.scenario.ts`
- Route: `/agency/hiring/pipeline?captureOutcomes=all`
- Quality profile: `premium`
- Viewports: `1440x900` desktop y `390x844` mobile (390px obligatorio)
- Pasos: abrir el tablero → marcar la columna «Cerrado» completa → abrir el menú `⋮` y elegir «Cerrado» →
  marcar el diálogo por defecto → elegir «Sin selección» → intentar confirmar sin causa → marcar el error →
  elegir causa → escribir la nota → marcar el estado de envío → confirmar → marcar la tarjeta ya movida →
  repetir la secuencia con reduced motion → marcar el estado sin capability.
- Capturas: `outcome-column-chips`, `outcome-dialog-default`, `outcome-dialog-cause-required`,
  `outcome-dialog-cause-error`, `outcome-dialog-pending`, `outcome-card-settled`, `assessment-lane-notice`,
  `outcome-dialog-reduced-motion`, `outcome-permission-denied`.
- Marcadores `data-capture`: `hiring-outcome-chip`, `hiring-outcome-cause`, `hiring-assessment-tag`,
  `hiring-outcome-dialog`, `hiring-outcome-cause-group`, `hiring-lane-notice-shortlist`,
  `hiring-lane-outcome`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, `failOnConsoleError`, layout gate con
  `allowHorizontalScrollSelectors` limitado al tablero y a las tabs, igual que el scenario vigente.
- Scroll-width: sin scroll horizontal de página en desktop ni en 390 px; el único scroll horizontal
  permitido sigue siendo el del tablero.
- Reduced motion / foco: secuencia completa repetida con `prefers-reduced-motion: reduce`, más captura del
  anillo de foco en el primer radio y en el CTA.
- Review dossier: `pnpm fe:capture:review hiring-pipeline-outcome-surface`
- Baseline decision / surface ID: superficie nueva `hiring-pipeline-outcome`; nace sin baseline y la primera
  corrida la establece, declarada en el dossier. El scenario `task355-hiring-pipeline-board` **conserva su
  baseline** y sirve de before/after para probar que la tarjeta no cambió de altura.
- Dato real necesario: sólo existe **1 fila terminal real** en el sistema (ADR §13), así que las seis
  variantes de chip no se pueden capturar con datos productivos. Por eso el switch `?captureOutcomes=all`,
  gateado por `process.env.NODE_ENV !== 'production'`, siguiendo el precedente vivo de `?captureFailure=stage`
  (`src/app/(dashboard)/agency/hiring/pipeline/page.tsx:19` y `:50`).

## Design Decision Log

| Decisión | Alternativas | Por qué ésta |
|---|---|---|
| Reusar `GreenhouseChip` | Crear `HiringOutcomeChip` local | El contrato de UI Platform lo prohíbe por nombre (`HISTORIAL.md:804`); la primitive ya resuelve altura, radio AXIS, foco, contraste AA tonal y reduced-motion — un chip local perdería las cinco |
| Migrar el tag de assessment en el mismo paso | Dejarlo como está y sólo agregar el chip nuevo | Dejarlo produce dos etiquetas vecinas con acabados distintos **y conserva vivo** el bug de tono por comparación de strings, que en `en-US` pinta el tono equivocado sin romper el build |
| Un `Record` único de tono | Un ternario por pantalla | Es el defecto que ya existe; `scoreTone` fija la doctrina contraria en su docstring |
| Tono en el cliente, por ahora | Tono en el VM del snapshot, como `statusTone` en `hr-workbench-projection.ts:109-160` | El VM es la dirección correcta, pero `HiringDeskApplicationSummary` es territorio de `TASK-1765`. Se difiere como follow-up y el `Record` nace en un módulo único para que mudarlo no toque consumidores |
| `not_selected` en tono neutro | Rojo, como un descarte | Es la población objetivo del Talent Pool; pintarla de alarma la vuelve un descarte a la vista, que es exactamente la distinción que el ADR §4.2 crea |
| `rejected` en `warning`, no en `error` | `error` | `error` se reserva a fallas del sistema. Un juicio desfavorable para un rol no es una falla, y el rojo junto al nombre de una persona lee como castigo |
| Modal bloqueante | Sidecar o popover | El gesto manda un correo irreversible: una superficie descartable por click fuera es la forma incorrecta |
| Ningún radio preseleccionado | Preseleccionar el desenlace más frecuente | Un default convierte «confirmar» en un reflejo, y aquí el reflejo manda un correo |
| La tarjeta no se mueve hasta confirmar | Movimiento optimista con reversión al cancelar | Cancelar no debe escribir **ni parecer** que escribió. En las otras cinco columnas el optimismo es correcto porque el cambio es reversible; acá no lo es |
| El menú `⋮` entra al mismo diálogo | Interceptar sólo el arrastre | `LANES.filter(lane => lane.destination)` incluye «Cerrado» y llama `persistStage(..., 'closed')` (`:714-725`): interceptar sólo el drop deja el carril de teclado escribiendo directo, y en móvil el menú **es** el camino principal |
| Bloque `outcome` de primer nivel en el copy | Anidarlo dentro de `pipeline` | Lo consumen dos superficies (kanban y Application 360); anidarlo obligaría a `TASK-1763` a importar vocabulario desde una superficie ajena |
| Guard de locale por test | Confiar en el tipado | El tipado no lo garantiza: `en-US` hace `...esCL` en dos niveles, así que una clave sólo en castellano compila y se renderiza en castellano |

## Preguntas abiertas — por las que `UI ready` sigue en `no`

1. **El reparto de tonos.** Tres desenlaces comparten `default`. Si la columna queda plana en el frame real,
   la alternativa es dar a `withdrawn` y `unresponsive` la variant `outlined` en lugar de otro tono. Se
   resuelve mirando la captura, no discutiéndolo en abstracto.
2. **La nota de respaldo.** Falta que `TASK-1765` declare si sigue siendo obligatoria para `unresponsive` y
   `withdrawn`, donde no hay juicio de Efeonce que fundamentar.
3. **`backup_selected` y su correo.** El ADR §7.2 deja su `EmailType` a decidir en otra task; hasta que
   exista, el aviso de correo del diálogo tiene que decir la verdad sobre ese desenlace.

## Referencias

- [`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md) — §7, §8, §12
- [`TASK-1754-hiring-stage-vocabulary`](TASK-1754-hiring-stage-vocabulary.md) — el wireframe del vocabulario
- [Flow contract](../flows/TASK-1766-hiring-pipeline-outcome-surface-flow.md) · [Motion contract](../motion/TASK-1766-hiring-pipeline-outcome-surface-motion.md)
- `docs/architecture/ui-platform/HISTORIAL.md:804` — el contrato Primitive+Variants+Kinds que prohíbe el chip local
- `docs/architecture/ui-platform/PRIMITIVES.md:54` — `GreenhouseChip` como primitive canónica de chips
- `src/views/greenhouse/hiring/PipelineDeskView.tsx:262` y `:408` — el tag actual y su tono por comparación de strings
- `src/views/greenhouse/hiring/PipelineDeskView.tsx:714-725` — el ítem «Cerrado» del menú `⋮`
- `src/views/greenhouse/hiring/hiring-client.ts:44-53` — `scoreTone`, el precedente de fuente única
- `src/lib/contractor-engagements/hr-workbench-projection.ts:109-160` — `statusTone` en el VM, el precedente diferido
- `src/lib/hiring/decide.ts:38-53` — la validación que obliga la nota de respaldo
- `src/lib/copy/types.ts:546` — `stages: Record<string, string>`, el tipo suelto que dejó pasar el drift
