# TASK-1766 — Flow Contract · cerrar es decidir, en el kanban de Hiring

## Meta

- Status: `draft`
- Owner task: `TASK-1766 — Superficie del desenlace en el kanban de Hiring`
- Related wireframe: `docs/ui/wireframes/TASK-1766-hiring-pipeline-outcome-surface.md`
- Related motion: `docs/ui/motion/TASK-1766-hiring-pipeline-outcome-surface-motion.md`
- Normative source: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` §8, §12
- Intended route / surface: `/agency/hiring/pipeline`
- Flow type: `command-backed`
- Primary primitives: `GreenhouseChip`, `Dialog`, `RadioGroup`, `GreenhouseButton`, `Snackbar`, live region
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`

## Flow Brief

- Primary user: operador de Talento/People con `hiring.application.decide`.
- Entry moment: el proceso de una persona terminó y hay que declarar **cómo** terminó.
- Successful outcome: el desenlace queda escrito una sola vez, la tarjeta se mueve a «Cerrado» con su chip, y
  la persona recibe el correo que corresponde a ese desenlace.
- Primary decision/action: elegir el desenlace y, en «Sin selección», su causa.
- Non-goals: cambiar de etapa, cerrar la vacante, editar la evaluación, mandar un correo distinto al que el
  desenlace determina.

**La premisa que gobierna todo el flujo:** soltar en «Cerrado» **no es un cambio de etapa, es una decisión**
(ADR §8). Las otras cinco columnas conservan el arrastre simple porque son posiciones del recorrido y el
cambio es reversible. Ésta no lo es: manda un correo irreversible y arranca el reloj de retención de los
documentos de una persona.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Tablero del pipeline | contexto y origen del gesto | seis columnas, scroll contenido | scroll con snap, una columna visible | `PipelineDeskView` |
| Tarjeta de postulación | objeto que se mueve; portadora del chip | arrastrable, con menú `⋮` | el menú `⋮` es el camino principal | `Paper` + `GreenhouseChip` |
| Columna «Evaluación» | declara su efecto antes del drop | aviso persistente en la cabecera | aviso a dos líneas | `Typography` + `aria-describedby` |
| Columna «Cerrado» | destino que no acepta escritura directa | abre el diálogo al soltar | abre el diálogo desde el menú | zona de drop |
| Diálogo de desenlace | registra la decisión | modal centrado, radios en dos columnas | `fullWidth`, radios en una columna, acciones apiladas | `Dialog` |
| Snackbar | confirma o explica el fallo | esquina inferior derecha | igual | `Snackbar` + `Alert` |
| Live region | anuncia el resultado a lectores de pantalla | invisible | invisible | `aria-live='polite'` |

## Flow Map

1. **Entry.** El operador arrastra una tarjeta, o abre su menú `⋮`.
2. **Bifurcación por destino.**
   - Destino entre las cinco primeras columnas → cambio de etapa directo, optimista, con rollback. Sin
     diálogo. Es el comportamiento actual y no cambia.
   - Destino «Evaluación» → mismo arrastre simple, pero la columna **ya declaró** que soltar ahí asigna la
     prueba. El aviso está antes del gesto, no después.
   - Destino «Cerrado» → **no escribe**. Abre el diálogo de desenlace.
3. **Decisión.** El diálogo pide desenlace. Ningún radio viene preseleccionado.
4. **Causa condicional.** Si el desenlace es «Sin selección», aparece el grupo de causa, obligatorio.
5. **Nota de respaldo.** Obligatoria mientras el command la exija (`src/lib/hiring/decide.ts:38-53`).
6. **Confirmación.** El CTA envía al command canónico con la clave de idempotencia generada al abrir.
7. **Completion.** La tarjeta se mueve a «Cerrado» con su chip; el toast y la live region nombran el
   desenlace; el correo lo dispara el dominio, no la pantalla.
8. **Recovery / exit.** Cancelar o `Escape` cierra sin escribir y la tarjeta **no se movió nunca**. Un fallo
   del command deja el diálogo abierto con lo escrito intacto.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| arrastrar sobre «Evaluación» | drag | columna resaltada + aviso reforzado | el aviso llega por `aria-describedby` de la columna | el aviso ya estaba visible antes del gesto |
| soltar en «Evaluación» | drop | etapa escrita, optimista | ítem «Evaluación» del menú `⋮` | comportamiento actual, sin diálogo |
| soltar en «Cerrado» | drop | diálogo abierto, **nada escrito** | ítem «Cerrado» del menú `⋮` → **mismo diálogo** | los dos carriles convergen; interceptar sólo el drop deja el teclado escribiendo directo |
| elegir «Sin selección» | radio | grupo de causa revelado, foco en su primer radio | flechas dentro del radiogroup | sin morph de altura |
| confirmar sin causa | CTA | error de causa, foco al grupo | Enter | `aria-required` + `aria-describedby` |
| confirmar sin nota válida | CTA | error del campo, foco al campo | Enter | el mínimo lo fija el command, no la pantalla |
| confirmar completo | CTA | envío, acciones deshabilitadas | Enter | clave de idempotencia de la apertura |
| cancelar | botón | diálogo cerrado, **cero escritura** | `Escape` | foco de vuelta al origen |
| click fuera | backdrop | **no cierra** | — | el gesto manda un correo irreversible |
| command falla | respuesta | diálogo abierto con error canónico | — | reintentar sólo si `actionable=true` |
| sin capability | drop / menú | mensaje explicativo | el ítem no aparece en el menú | sin botón «Reintentar» |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| `idle` | tablero en reposo | carga / cierre del diálogo | inicio de arrastre o apertura del menú | tarjetas de «Cerrado» con su chip |
| `dragging` | tarjeta en vuelo | `dragstart` | `drop` o `dragend` | la columna destino se resalta; «Evaluación» refuerza su aviso |
| `decision_requested` | se soltó en «Cerrado» y **no se escribió nada** | `drop` en «Cerrado» o ítem «Cerrado» del menú | apertura del diálogo | la tarjeta **permanece en su columna**; no hay movimiento optimista |
| `dialog_open` | esperando desenlace | `decision_requested` | selección, cancelación o `Escape` | ningún radio preseleccionado; aviso de correo visible |
| `cause_required` | desenlace «Sin selección» sin causa | intento de confirmar | elegir causa | error anunciado, foco al grupo, CTA no bloquea el foco |
| `note_required` | nota bajo el mínimo del command | intento de confirmar | nota válida | mensaje con el mínimo real |
| `submitting` | command en vuelo | CTA | respuesta | acciones deshabilitadas, ancho del CTA reservado, sin doble envío |
| `settled` | decisión escrita | respuesta correcta | cierre del diálogo | la tarjeta se mueve a «Cerrado» con su chip; toast + live region nombran el desenlace |
| `command_error` | el command falló | respuesta de error | reintento o cancelación | diálogo abierto con lo escrito intacto; **la tarjeta no se movió**; reintento sólo si `actionable=true` |
| `cancelled` | salida sin efecto | «Cancelar» o `Escape` | — | cero escritura, foco restaurado, nada en la live region |
| `denied` | sin `hiring.application.decide` | intento de cerrar | — | mensaje explicativo, el ítem «Cerrado» ausente del menú, sin botón «Reintentar» |
| `degraded` | fila `closed` sin desenlace resoluble | render | — | chip neutro visible; **no se esconde**: el vacío es lo que el ADR viene a hacer imposible |

Transición prohibida: `dragging → settled` sin pasar por `dialog_open`. Es exactamente el camino que existe
hoy (`PipelineDeskView.tsx:243-256`) y el que esta task cierra.

## Routing Contract

- Route changes: `none`. El flujo entero ocurre dentro de `/agency/hiring/pipeline`.
- Canonical URL: `/agency/hiring/pipeline` con el `openingId` vigente, que el diálogo no altera.
- Deep-link behavior: el diálogo **no** se deep-linkea. Es una decisión sobre una persona con una clave de
  idempotencia efímera; una URL que lo abra invita a compartirlo y a dispararlo por accidente.
- Back button behavior: no cambia de ruta; el botón del navegador no cierra el diálogo ni deshace nada.
- Reload behavior: recargar durante `dialog_open` descarta el diálogo sin efecto —nada se escribió—. Si la
  recarga ocurre durante `submitting`, la decisión pudo escribirse: el tablero recargado muestra el estado
  real, y un reintento con la misma clave de idempotencia hace replay en vez de duplicar.
- Shareability: ninguna. Superficie interna, gateada por capability.
- Query params: sólo `?captureOutcomes=all`, de captura y no de producto, gateado por
  `process.env.NODE_ENV !== 'production'` igual que el `?captureFailure=stage` que ya existe.

## Focus & Accessibility

- Al abrir, el foco entra al diálogo y queda **atrapado**; el título se asocia por `aria-labelledby`.
- El primer elemento enfocado es el `legend` del grupo de desenlace, no el CTA: el operador debe leer la
  pregunta antes de poder confirmarla.
- Cada grupo es un `fieldset` con `legend` visible. El grupo de causa lleva `aria-required` y su error se
  asocia por `aria-describedby`, nunca sólo por color.
- Ningún radio viene preseleccionado: un default vuelve «confirmar» un reflejo, y aquí el reflejo manda un
  correo.
- Al revelarse el grupo de causa, el foco se mueve a su primer radio y el bloque aparece sin morph de altura,
  para que el CTA no se deslice bajo el cursor.
- `Escape` cancela mientras no se haya enviado. **Click fuera no cierra.**
- Al cerrar —confirmando o cancelando— el foco vuelve al origen: la tarjeta o el ítem del menú `⋮`.
- La live region existente anuncia una sola transición semántica: `«{nombre}: {desenlace}»`.
- El chip forma parte del nombre accesible de la tarjeta, extendiendo el `aria-label` del botón de apertura.
- El aviso de «Evaluación» se asocia por `aria-describedby` a la región de la columna, para que llegue
  también a quien nunca pasa el cursor por encima.

## Error & Recovery

| Falla | Qué ve el operador | Qué NO pasa |
|---|---|---|
| El command rechaza el cuerpo | error canónico es-CL del endpoint, diálogo abierto con lo escrito intacto | la tarjeta no se mueve; no se pierde lo que ya eligió |
| Error de red | mismo tratamiento; reintentar es seguro por la clave de idempotencia | no se crean dos decisiones |
| `actionable=false` (permiso revocado, estado inconsistente) | mensaje explicativo **sin** botón «Reintentar» | no se le receta un reintento a una causa estructural |
| `TASK-1765` aún no está en producción y alguien fuerza el `PATCH` | el `CHECK` lo rechaza y el tablero muestra el rollback | ninguna fila `closed` sin desenlace |
| Fila `closed` heredada sin desenlace | chip neutro «Sin desenlace registrado» | no se inventa un desenlace ni se esconde la fila |

## GVC Scenario Plan

- Scenario: `hiring-pipeline-outcome-surface` (`scripts/frontend/scenarios/hiring-pipeline-outcome-surface.scenario.ts`)
- Route: `/agency/hiring/pipeline?captureOutcomes=all`
- Quality profile: `premium`
- Viewports: `1440x900` y `390x844`
- Secuencia de flujo a capturar: tablero → menú `⋮` → «Cerrado» → diálogo por defecto → «Sin selección» →
  intento de confirmar sin causa → error → causa elegida → nota → envío → tarjeta movida → cancelación sin
  efecto → estado sin capability.
- Capturas: `outcome-column-chips`, `outcome-dialog-default`, `outcome-dialog-cause-required`,
  `outcome-dialog-cause-error`, `outcome-dialog-pending`, `outcome-card-settled`,
  `outcome-dialog-cancelled-noop`, `assessment-lane-notice`, `outcome-permission-denied`.
- Marcadores: `hiring-outcome-dialog`, `hiring-outcome-cause-group`, `hiring-outcome-chip`,
  `hiring-outcome-cause`, `hiring-assessment-tag`, `hiring-lane-notice-shortlist`, `hiring-lane-outcome`.
- Evidencia de foco: anillo visible en el primer radio, en el grupo de causa en error y en el CTA.
- Scroll-width: sin scroll horizontal de página en desktop ni en 390 px.
- Review dossier: `pnpm fe:capture:review hiring-pipeline-outcome-surface`
- Baseline decision / surface ID: superficie nueva `hiring-pipeline-outcome`; la primera corrida establece la
  baseline. `task355-hiring-pipeline-board` conserva la suya y sirve de before/after de la tarjeta.

## Design Decision Log

| Decisión | Alternativas | Por qué ésta |
|---|---|---|
| El drop en «Cerrado» no escribe | Escribir y abrir el diálogo después para completar | Escribir primero produce exactamente el estado que el ADR declara irrepresentable: un `closed` sin desenlace |
| La tarjeta no se mueve hasta confirmar | Movimiento optimista con reversión al cancelar | Cancelar no debe escribir **ni parecer** que escribió. El optimismo es correcto en las cinco columnas reversibles, no acá |
| El menú `⋮` entra al mismo diálogo | Interceptar sólo el arrastre | El menú también llama `persistStage(..., 'closed')` (`PipelineDeskView.tsx:714-725`); dejarlo fuera deja el carril de teclado escribiendo directo, y en móvil el menú **es** el camino principal |
| Modal con foco atrapado | Sidecar o popover descartable | El gesto manda un correo irreversible a una persona real |
| Click fuera no cierra | Cierre por backdrop, como el resto de los diálogos | Un descarte accidental con el desenlace ya elegido es barato de provocar y caro de explicar |
| Ningún radio preseleccionado | Preseleccionar el desenlace más frecuente | Un default convierte «confirmar» en un reflejo |
| Clave de idempotencia generada al abrir | Generarla al enviar | Generada al enviar, un reintento crea una decisión nueva. Generada al abrir, replayea la misma |
| El diálogo no se deep-linkea | Abrirlo por query param | Una URL que abre una decisión sobre una persona se comparte y se dispara por accidente |
| El aviso de «Evaluación» es persistente | Tooltip sólo-hover | El wireframe de `TASK-1754` lo descarta y el ADR §12 lo pide como `SIEMPRE`; además un tooltip nunca llega a quien usa el menú `⋮` |
| La fila degradada muestra chip neutro visible | Ocultarla u ocultar el chip | Esconder el vacío perpetúa exactamente el defecto que el ADR viene a cerrar |

## Acceptance Criteria

- [ ] Ninguna transición lleva de `dragging` a `settled` sin pasar por `dialog_open`.
- [ ] El drop en «Cerrado» y el ítem «Cerrado» del menú `⋮` abren el mismo diálogo y no llaman al camino de
      cambio de etapa.
- [ ] Cancelar o `Escape` deja la base sin cambios y la tarjeta en su columna original.
- [ ] Click fuera no cierra el diálogo.
- [ ] Sin causa, «Sin selección» no se puede confirmar, y el error se anuncia por `aria-describedby`.
- [ ] El foco entra al diálogo, queda atrapado y vuelve al origen al cerrar.
- [ ] El aviso de «Evaluación» está visible antes del gesto y llega por `aria-describedby`.
- [ ] Un doble envío no crea dos decisiones.
- [ ] El estado `denied` no ofrece botón «Reintentar».
- [ ] La secuencia completa está capturada en desktop y en 390 px, y fue mirada.
