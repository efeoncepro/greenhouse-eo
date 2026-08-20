# TASK-1747 — Wireframe: Application 360 Assessment Access Recovery

## Product design source

- Direction: [TASK-1747 visual direction](../visual-directions/TASK-1747-application360-assessment-access-recovery.md)
- Mode: `repo-native-benchmark`
- Surface: existing Application 360, Evaluación tab; no navigation destination.

## Desktop wireframe

```text
┌ Evaluation by competency ────────────────────────────────────────┐
│ Test del candidato     [Enviado]                                  │
│ EO-ASM-0042 · 45 minutos                                         │
│                                                                    │
│ Estado de entrega: Aceptado para envío · sin confirmación          │
│ [Reenviar por email]  [Generar enlace temporal]   [Revisar ...]  │
│                                                                    │
│ Alert contextual: No confirma recepción. Si la candidata no lo    │
│ recibió, recupera acceso mediante uno de los canales.             │
└──────────────────────────────────────────────────────────────────┘
```

If no assessment exists, the recovery cluster is absent and the only primary action is `Asignar test` through the policy proposal/confirmation flow. If the test is terminal, all recovery actions are absent and the card explains why.

## Compact wireframe (390px)

```text
┌ Test del candidato                   [Enviado] ┐
│ EO-ASM-0042 · 45 minutos                        │
│ Aceptado para envío · sin confirmación          │
│ [Reenviar por email                    ]        │
│ [Generar enlace temporal               ]        │
│ [Revisar evaluación                    ]        │
└────────────────────────────────────────────────┘
```

## Recovery dialog

```text
┌ Recuperar acceso al test ──────────────────────────┐
│ Generarás un enlace nuevo. El anterior dejará de    │
│ funcionar.                                          │
│ Canal: ( ) Email   ( ) Enlace temporal              │
│ Motivo: [No recibió el correo                    ]  │
│ [Cancelar]                 [Confirmar recuperación] │
└────────────────────────────────────────────────────┘

success / secure-link only
┌ Enlace temporal listo ─────────────────────────────┐
│ Se muestra una sola vez. Compártelo solo con la     │
│ candidata y considera su vencimiento.               │
│ [Copiar enlace]                                     │
│ [Cerrar]                                             │
└────────────────────────────────────────────────────┘
```

## Implementation Mapping

- Route/surface: `Application360View.tsx`, Evaluation tab.
- Reuse: assessment card, `GreenhouseChip`, `GreenhouseButton`, `Alert`, `Dialog`, `Snackbar`.
- Data: canonical assignment, delivery lifecycle and recovery DTOs only.
- Copy: Hiring Desk dictionary, es-CL + locale peer.
- Browser boundary: no token is persisted in URL, storage, toast or reloadable component state.

## State Copy

Copy visible por estado, todo desde `hiringDesk` (es-CL + par en-US). Ninguna frase vive en JSX.

| Estado | Copy visible | Comportamiento de recuperación |
|---|---|---|
| ready | `accessRecovery.cta` + cuota restante de 24 h | Abre el diálogo de confirmación; el operador declara canal y motivo |
| loading | `accessRecovery.confirming`, con `aria-busy` | Acciones deshabilitadas; una sola petición en vuelo; la llave de idempotencia es por intención |
| empty | `assignment.errorPolicyMissing` | Deriva a configurar la política de la vacante; NO fabrica una elección de plantilla |
| partial | `accessRecovery.emailQueued` / `emailPending` / `emailUnknown` / `emailFailed` | Cuatro desenlaces del PROVEEDOR con su propio siguiente paso; ninguno afirma que el correo llegó |
| error | mapa por código; `errorStructural` cuando reintentar no resuelve | El diálogo queda abierto con la causa; el reintento sólo se ofrece si puede funcionar |
| degraded | `accessRecovery.errorReadFailed` | Botón `common.retry` con pendiente visible; el texto aclara que el test NO cambió — la falla es de nuestra consulta |
| denied | `accessRecovery.errorPermission` — "No tienes permiso para recuperar acceso. Pídeselo a Admin o a People Ops." | La tarjeta queda read-only: el servidor ni siquiera consulta la disponibilidad, así que no hay affordance que ocultar. Nunca se dibuja un botón que dé 403 |
| denied por canal | `accessRecovery.noticeSkip.*` según la causa | Dice cuál canal está cerrado y por qué; el otro sigue disponible si lo hay |
| long content | motivo del proveedor resumido | El detalle técnico no entra a la tarjeta |

## Mobile Target

390px (iPhone 13) es el objetivo declarado, y no es hipotético: el operador de People revisa
candidaturas desde el teléfono entre reuniones, que es cuando llega el mensaje de la persona
diciendo que su enlace no funciona.

- El cluster conserva título y cuerpo completos: dos líneas legibles, sin truncado ni ellipsis.
- Las acciones de AMBOS diálogos pasan a `column-reverse` con la **primaria a ancho completo** y la
  secundaria debajo. El orden invertido pone la acción esperada bajo el pulgar.
- El campo del enlace revelado es `multiline`, no una línea con scroll horizontal: una credencial
  que hay que arrastrar para leer es una credencial que se copia mal.
- Sin scroll horizontal de página, verificado globalmente por el gate de layout.
- ⚠️ **Oclusión conocida:** la mascota flotante de Nexa es `position: fixed` con `right: 12` y
  `zIndex: speedDial`. A 390px se superpone al borde derecho del cluster. Hoy no corta texto, pero
  en la rama con CTA ese borde aloja el botón y su cuota. El gate de layout **no detecta oclusión**,
  así que su verde no es evidencia sobre esto.

## Action Hierarchy

Una sola acción primaria por superficie, y nunca dos caminos compitiendo por el mismo problema.

| Nivel | Acción | Cuándo aparece |
|---|---|---|
| Primaria (tarjeta) | `Asignar test` | Sólo sin test abierto y con capability de autoría |
| Primaria (cluster) | `Recuperar acceso` | Sólo con test recuperable y alguna de las dos puertas abiertas |
| Primaria (diálogo) | `Confirmar y asignar` / `Recuperar acceso` | Se deshabilita con bloqueo declarado o intención consumida |
| Secundaria | `Cancelar` / `Cerrar` | La etiqueta cambia según si hay algo que cancelar |
| Terciaria | `Copiar enlace` | Sólo dentro de la revelación única |
| Recuperación | `Reintentar` | Sólo en el degradado, donde reintentar puede funcionar |

**Regla que sostiene la jerarquía:** asignar y recuperar NUNCA se ofrecen juntas. Un test abierto
hace desaparecer la asignación y aparecer la recuperación — ofrecer ambas fue el defecto original
que llevaba al operador a crear un segundo test en vez de rescatar el primero.

## Visual Fidelity Mapping

Ningún valor literal: todo sale del sistema.

| Elemento | Origen |
|---|---|
| Tono del bloqueo | `Alert severity='info'` — informa, no alarma |
| Tono de la advertencia | `Alert severity='warning'` — el operador puede seguir, con contexto |
| Tono del error | `Alert severity='error'` con `role='alert'` |
| Ícono del bloqueo | `tabler-lock`; del CTA `tabler-key`; del aviso `tabler-mail` |
| Botones | `GreenhouseButton` (`kind='secondaryAction'` en el cluster) y `Button` MUI para la secundaria |
| Espaciado | escala `4n` vía `spacing`; nada en px literales |
| Tipografía | variantes `body2` y `caption`; peso 700 para el título del bloqueo. Sin `fontSize` inline |
| Diálogo | primitive `Dialog` con `dialogMotionProps` del sistema; sin motion propia |

**El estado nunca depende sólo del color:** cada tono viaja con su frase. Un daltónico lee la misma
información que cualquier otro operador.

## Copy Ledger

Todo el copy visible vive en `hiringDesk` (`src/lib/copy/dictionaries/{es-CL,en-US}/`), y su tipo
está atado a las uniones del dominio: un motivo nuevo en `access-recovery` o en la policy de
asignación **rompe el build** en vez de resolverse a `undefined` y dejar un estado sin causa.

| Bloque | Cubre |
|---|---|
| `application.assignment` | Preview, 6 desenlaces, 10 motivos, 9 errores, empty state |
| `application.accessRecovery` | CTA, canales, 5 motivos, 9 no-disponibilidades, cuota, cooldown, revelación única, 5 omisiones del aviso |
| `common` | `cancel`, `close`, `retry`, `loading`, `confirm` — **no se duplican** en el bloque de dominio |

Reglas que el copy sostiene: nadie afirma que un correo llegó (el sistema sólo sabe despacho); los
motivos conservan el "dice que" porque entran a un ledger append-only; y ninguna frase culpa a la
persona candidata ni al operador.

## Accessibility Contract

- **Regiones vivas:** el rol se declara EN el Alert, nunca en un envoltorio. Envolver un Alert en un
  contenedor `aria-live` es inerte: en regiones anidadas gana la más cercana al nodo que cambia.
  El desenlace es `role='status'` (polite) porque llega tras una acción deliberada del operador;
  el error es `role='alert'` (assertive) porque cambia lo que puede hacer a continuación.
- **Foco:** vuelve al disparador cuando el diálogo **terminó de salir** (`TransitionProps.onExited`),
  no al despachar el cierre. Llamarlo dentro del handler no sirve: la trampa de foco sigue activa y
  lo devuelve a su propia raíz. En el traspaso confirmación → revelación el nodo que la trampa
  guardó ya está desmontado, así que sin esto el foco cae al `body` — justo al cerrar la pantalla
  que mostró una credencial irrepetible.
- **Trampa de foco:** la del primitive `Dialog`, sin override.
- **ESC:** cierra el diálogo de confirmación cuando no hay petición en vuelo. En la revelación única
  está **deshabilitado a propósito**: un reflejo de teclado destruiría una credencial que no se
  vuelve a mostrar.
- **Estados deshabilitados:** todo control en vuelo lleva `aria-busy`, y el progreso circular declara
  su `aria-label`.
- **Reduced motion:** no se agrega motion propia; el escenario ejerce el check con
  `expectedVisibleSelector`, sin el cual el gate lo salta en silencio.
- **Contraste y target size:** verificados por el gate de accesibilidad del escenario con
  `failOnViolations: true`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1747-assessment-access-recovery.scenario.ts`
- Route: `/agency/hiring/applications/[id]?tab=assessment`
- Viewports: `desktop` 1440x900 y `mobile` iPhone 13 (390px).
- Quality profile: `premium`.
- Required captures: `assessment-tab-full` (fullPage), `recovery-cluster` (clip del cluster).
- Required `data-capture` markers: `hiring-application-tabs`, `assessment-scorecard`,
  `assessment-access-recovery`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, y `notVisible` sobre
  `a[href*="/public/assessment/access"]` — la pantalla NUNCA vuelve a mostrar una credencial, que es
  la causa directa del incidente del 2026-08-19.
- Keyboard probe: `recovery-cta-focus` desde el CTA del cluster, con `reducedMotionCheck`.
- Scroll-width check: cubierto por el gate de layout sobre `assessment-scorecard`.

- Review dossier: `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.review.md`
  (scorecard: `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.scorecard.json`).
- Baseline decision: **sin baseline de píxeles**. Esta superficie extiende una tarjeta existente y su
  contenido depende del estado real de la candidatura —que cambia entre corridas—, así que un
  baseline congelaría un dato, no un diseño. El control es el scorecard más los gates de
  accesibilidad, layout y teclado del escenario. Surface ID: `hiring-application-360/assessment-tab`.

**No cubierto por el escenario, y se declara para que nadie lo dé por hecho:** la revelación única
del enlace exige una emisión REAL (rotaría el acceso de una candidata real y consumiría su cuota de
24 h), y el estado `provider_blocked` exige una dirección con rebote registrado. Ambos se verifican
en la secuencia de staging del Rollout Plan, no en la captura. El escenario NO es `mutating`: abre
la superficie, nunca confirma.

## Design Decision Log

- Selected lifecycle strip + compact recovery cluster over persistent link or separate page.
- The card remains the owner of assessment context; recovery dialog is deliberate because it invalidates a credential.
- No new navigation, no motion and no card-within-card treatment.
