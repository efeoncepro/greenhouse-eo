# TASK-1754 — Mapa de etapas y desenlaces visible del pipeline de Hiring

> **Tipo:** contrato de vocabulario, no layout. El pipeline ya existe y no cambia de forma; lo que
> cambia es **qué estados existen, cómo se nombran y qué se pregunta al cerrar**.
>
> **Fuente normativa:** [`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md)
> (`Accepted` 2026-08-22). Este wireframe **proyecta** ese ADR a la superficie; si algo diverge, manda
> el ADR.
>
> **Reparto de superficies:** el mapa de etapas y sus nombres visibles los ejecuta `TASK-1754`. **El
> chip de desenlace en la tarjeta y el diálogo de cierre los implementa `TASK-1766`**; el eje de
> desenlace y su `CHECK`, `TASK-1765`. Están acá porque sin ellos este mapa no se entiende, no porque
> esta task los construya.

## El problema que resuelve

Hoy el dominio tiene más etapas que la interfaz, tres de ellas comparten nombre visible, y la columna
terminal absorbe cinco estados sin decir cuál fue:

```
DOMINIO (13)                    UI (6)              CORREO AL CANDIDATO
─────────────────────────────────────────────────────────────────────
sourced ─────────────────────→  Sourced             (sin correo)
screening ───────────────────→  Screening           (sin correo)
qualified ───────┐
shortlisted ─────┼───────────→  Evaluación          "Preselección"  ← divergencia deliberada
client_review ───┘
interview ───────────────────→  Entrevista          "Entrevista"
decision_pending ────────────→  Decisión            (sin correo)
selected ────────┐
backup ──────────┤
rejected ────────┼───────────→  Cerrado             (según desenlace)
withdrawn ───────┤
handoff_ready ───┤
closed ──────────┘
```

Son **13**, no 12: el conteo viejo de esta página omitía uno. Verificado contra
`src/types/hiring.ts:109` y contra el `CHECK` `hiring_application_stage_check` (readback 2026-08-20).

Tres consecuencias medidas:

1. **La automatización es inalcanzable.** La política de assessment sólo acepta `shortlisted` o
   `interview` como disparador, y `shortlisted` no se puede elegir desde el menú. Al elegir
   "Evaluación" la postulación cae en `qualified`. Dos candidatas reales pasaron por ahí sin recibir
   su test.
2. **El operador no puede trazar.** Dos postulaciones en "Evaluación" pueden estar en estados
   distintos y comportarse distinto, sin nada que lo explique en pantalla.
3. **"Cerrado" no dice cómo se cerró.** Cinco estados terminales caen en una columna que en pantalla
   no distingue una selección de un descarte.

## Estado objetivo — dos ejes, no uno

El pipeline es **el recorrido de la persona candidata**. De ahí salen dos ejes ortogonales: dónde va
(etapa) y cómo terminó (desenlace).

### Eje 1 — Etapa: seis columnas, un identificador por columna

| Etapa (identificador) | Columna | Qué significa | ¿Dispara assessment? |
|---|---|---|---|
| `sourced` | Sourced | Entró al pipeline, sin revisar | no |
| `screening` | Screening | En revisión inicial | no |
| `shortlisted` | **Evaluación** | Se evalúa con evidencia (prueba, muestra de trabajo) | **sí** |
| `interview` | Entrevista | En conversación con el equipo | opcional |
| `decision_pending` | Decisión | Evaluada, esperando desenlace | no |
| `closed` | Cerrado | **El recorrido terminó.** El desenlace dice cómo | no |

> ### ⛔ El identificador de la tercera columna es `shortlisted`, NO `evaluation`
>
> Una versión anterior de este wireframe proponía `evaluation` como valor de dominio. **Está
> prohibido** (decisión de arquitectura + talento 2026-08-20, ratificada por el ADR §3). El operador
> nunca ve el identificador, y reusar `shortlisted` evita migrar 15 políticas, 20 filas de un ledger
> append-only y dos de las tres `CHECK` que lo nombran. La columna se llama «Evaluación»; el literal
> sigue siendo `shortlisted`. **Quien copie una tabla de este documento, copia ésta.**

### Eje 2 — Desenlace: seis formas de terminar

No es un atributo decorativo de la columna «Cerrado»: es el segundo eje del modelo. Cada valor existe
porque **difiere en al menos una consecuencia real** (correo, Talent Pool, embudo de equidad).

| Desenlace | Chip en la tarjeta | Qué pasó | Quién puso fin | ¿Correo? | ¿Talent Pool? |
|---|---|---|---|---|---|
| `selected` | **Selección** | La elegimos | Efeonce | oferta | no — pasa a workforce |
| `backup_selected` | **Reserva** | La elegimos como respaldo | Efeonce | «quedaste en reserva» | no — compromiso vigente |
| `not_selected` | **Sin selección** | Llegó al final y no quedó | Efeonce / el contexto | según la **causa** | **sí — es la población objetivo** |
| `rejected` | **Descarte** | Juicio desfavorable para este rol | Efeonce | agradecimiento | no por defecto |
| `withdrawn` | **Retiro** | Se retiró, **declarado** | la persona | acuse de recibo | según su consentimiento |
| `unresponsive` | **Sin respuesta** | Dejó de responder, **sin declarar nada** | nadie | **ninguno** | no |

Etiquetas en **sustantivo neutro**: describen el desenlace del proceso, no a la persona, y evitan la
concordancia de género en un chip que va junto al nombre de alguien.

### La causa — obligatoria en «Sin selección», enum gobernado

| Causa | Qué pasó | ¿Cuenta en el embudo de equidad? | Lo que lee la persona |
|---|---|---|---|
| `capacity_filled` | El cupo lo tomó otra persona | **sí** — el proceso concluyó y hubo comparación | «esta vez elegimos a otra persona» |
| `opening_closed` | Se cerró la búsqueda | **no** — el proceso no concluyó | «cerramos esta búsqueda» — explícitamente no es sobre ti |
| `process_cancelled` | Se canceló el proceso | **no** | «cancelamos este proceso» |

**El desenlace describe qué le pasó a la persona, nunca el estado de la vacante.** Cuando la causa es
de la vacante, el desenlace sigue siendo «Sin selección» y la vacante entra como **causa**. Y la causa
no es una nota al pie: el embudo de equidad y el correo ramifican por ella, así que es enum gobernado,
nunca texto libre.

## El invariante que une los dos ejes

```
stage = 'closed'  ⟺  desenlace declarado
```

Como `CHECK` de base, no como disciplina de capa aplicación (`TASK-1765`). **Cerrar es decidir.** El
`PATCH` de etapa no acepta desenlace, luego no puede escribir `closed`: cerrar pasa siempre por el
command de decisión, que emite `hiring.application.decided`, dispara el correo y arranca el reloj de
retención.

Consecuencia visible: **una tarjeta en «Cerrado» sin chip es irrepresentable**, no sólo indeseable.

## Contrato de interacción del kanban

| Gesto | Qué hace la superficie |
|---|---|
| Arrastrar entre las **cinco primeras** columnas | Cambio de etapa directo. Arrastre simple, sin diálogo — son posiciones del recorrido |
| Arrastrar a **«Evaluación»** | Declara su efecto **antes de soltar**: «al mover aquí se asigna la prueba». Esa etapa dispara automatización, y el operador debe poder anticiparlo, no descubrirlo |
| Soltar en **«Cerrado»** | **NO es un cambio de etapa: es una decisión.** Abre el diálogo de desenlace **antes** de escribir. Si el desenlace elegido es «Sin selección», la causa es **obligatoria** en el mismo diálogo. Cancelar el diálogo devuelve la tarjeta a su columna: no queda nada escrito |
| Etapa desconocida | **Nunca** cae silenciosamente en la primera columna. Con un valor por columna el traductor de tres campos desaparece y el fallback deja de existir |

**Diálogo de cierre — forma mínima** (lo implementa `TASK-1766`):

```
┌─ Cerrar el proceso de <nombre> ─────────────────────────────┐
│                                                             │
│  ¿Cómo terminó?                                             │
│   ( ) Selección        ( ) Reserva      ( ) Sin selección   │
│   ( ) Descarte         ( ) Retiro       ( ) Sin respuesta    │
│                                                             │
│  ── sólo si "Sin selección" ──────────────────────────────  │
│  Causa (obligatoria)                                        │
│   ( ) El cupo lo tomó otra persona                          │
│   ( ) Se cerró la búsqueda                                  │
│   ( ) Se canceló el proceso                                 │
│                                                             │
│  ⓘ  Se enviará un correo a la persona, salvo "Sin respuesta"│
│                                                             │
│                              [ Cancelar ]  [ Cerrar proceso ]│
└─────────────────────────────────────────────────────────────┘
```

El aviso de correo es parte del contrato, no cortesía: el operador tiene que saber que el gesto manda
un mensaje irreversible a una persona real antes de confirmarlo.

## Tarjeta en «Cerrado» — el chip es obligatorio

```
┌──────────────────────────────────┐
│  Roxana Lezama                   │
│  Diseñadora · EO-OPN-0009        │
│                                  │
│  [ Sin selección ]  ← chip       │
│  cupo tomado por otra persona    │
└──────────────────────────────────┘
```

- **NUNCA mostrar una tarjeta en «Cerrado» sin su chip de desenlace** (ADR §12). Una columna terminal
  que no dice cuál cierre fue recrea exactamente el colapso que este trabajo viene a cerrar.
- La causa se muestra **sólo** en «Sin selección», en texto secundario bajo el chip.
- **NUNCA** exponer el identificador interno del desenlace ni el de su causa a la persona candidata.
- El chip usa el copy de `hiringDesk.ts`, nunca literal en JSX, y no depende del color para comunicar:
  la etiqueta ya lo dice.

## Lo que se retira, y con qué naturaleza

La versión anterior de esta página afirmaba que **«Cerrado» colapsa SIN pérdida** porque `decision`
sobrevive como campo aparte. **Es falso para dos de los cinco literales**, y creerlo lleva a migrar a
ciegas:

| Literal retirado | ¿Lo recupera el eje de desenlace? | Naturaleza |
|---|---|---|
| `selected`, `backup`, `rejected`, `withdrawn` | **sí** | Espejo redundante: `decide` escribía ambos campos con el mismo valor. Colapso sin pérdida real |
| `handoff_ready` | **NO** | **No tiene contraparte en `decision`.** No es un desenlace: es un estado del agregado `handoff`, con su propia máquina (`TASK-356`). Se retira porque **ningún escritor lo produce jamás**, no porque otro campo lo preserve |
| `qualified`, `client_review` | **NO** | Colapso **CON pérdida declarada**: ningún campo recupera cuál era. Se acepta porque nunca fueron elegibles desde ninguna superficie — no hay intención humana que preservar. Es pérdida real y se declara, no se descubre después |

Y **`on_hold` deja de ser un desenlace**: hoy vive en `HIRING_DECISIONS` *y* mapea a la etapa
`decision_pending` (`src/lib/hiring/decide.ts:32`). Una pausa no es un cierre — vive en la columna
«Decisión». De ahí salía el doble sentido de esa columna.

## Correo al candidato — decisión CERRADA

**El candidato conserva «Preselección».** Resuelto por el operador el 2026-08-22; **no reabrir**.

Es una **divergencia deliberada** con el «Evaluación» que ve el operador, no un drift:

- Hacia afuera el registro es más suave, y el correo de avance sólo sale en el camino de *fallback*
  (cuando la automatización no disparó).
- En castellano, «Evaluación» chocaría con el nombre del artefacto: el correo del test ya dice «tienes
  una evaluación pendiente». En inglés esa colisión no existe (`assessment` ≠ `evaluation`), pero el
  par se mantiene alineado por consistencia.
- La recomendación de Talento del 2026-08-20 («En evaluación» / «Under evaluation») queda
  **descartada**.

Consecuencias de superficie: la allowlist candidate-facing
(`src/lib/hiring/notifications/stage-policy.ts:15`) **no se toca**, y la divergencia se **documenta con
su razón** en la doc funcional para que un agente futuro no la lea como defecto y la «arregle».

La persona candidata **nunca lee vocabulario interno**: ni el identificador de etapa, ni el del
desenlace, ni el de la causa. Lee el mensaje humano de la tabla de la §7.2 del ADR.

## Accesibilidad y copy

- Los seis nombres de columna y las seis etiquetas de desenlace van en
  `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`, nunca literales en JSX.
- **`en-US` debe redefinir `stages`**: hoy hace `...esCL` y nunca sobreescribe esa clave
  (`dictionaries/en-US/hiringDesk.ts:6`), así que el desk en inglés muestra los nombres en castellano.
- La columna del pipeline anuncia su nombre y su conteo a lectores de pantalla.
- El aviso «al mover aquí se asigna la prueba» se asocia al control con `aria-describedby`, no como
  tooltip sólo-hover.
- El diálogo de cierre es un modal con foco atrapado, título asociado por `aria-labelledby`, y la causa
  obligatoria anunciada como `aria-required` con su error asociado por `aria-describedby`.
- El chip de desenlace forma parte del nombre accesible de la tarjeta: quien navega por teclado escucha
  «Roxana Lezama, Sin selección», no sólo el nombre.

## Verificación

**De esta task (`TASK-1754`):**

- GVC del pipeline en desktop y 390 px, antes y después, con las seis columnas nombradas distinto.
- El desk leído con locale `en-US`: las seis columnas en inglés, no heredadas del castellano.
- Una postulación real movida a «Evaluación» que recibe su test, con su fila en el ledger — la prueba
  de que el disparador dejó de apuntar al vacío.
- El correo de progreso recibido diciendo «Preselección», confirmando que la divergencia es la decisión
  y no un olvido.
- Readback del conteo por etapa antes y después de cada migración.

**De las tasks vecinas, declarado acá para que nadie lo dé por hecho:**

- `TASK-1765`: el `CHECK` rechaza un `stage='closed'` sin desenlace, y el `PATCH` de etapa no puede
  escribir `closed`. Sin esa evidencia, el contract de etapas terminales no se ejecuta.
- `TASK-1766`: GVC de la columna «Cerrado» con las seis variantes de chip, y del diálogo de cierre con
  la causa obligatoria en estado de error.

## Referencias

- [`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md) — vocabulario normativo (§3 etapas, §4 desenlaces, §5 invariante, §7 copy, §8 interacción, §12 reglas duras)
- [Auditoría del vocabulario de etapas — 2026-08-22](../../audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md) — 30 hallazgos verificados
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts:97` — el mapa actual de nombres visibles
- `src/lib/copy/dictionaries/en-US/hiringDesk.ts:6` — el spread que hace heredar castellano
- `src/types/hiring.ts:109` — `HIRING_APPLICATION_STAGES` (13) · `:126` — `HIRING_DECISIONS` (5)
- `src/types/hiring-assessment-policy.ts:42` — `OPENING_ASSESSMENT_TRIGGER_STAGES`
- `src/lib/hiring/notifications/stage-policy.ts:15` — allowlist candidate-facing («Preselección»)
- `src/views/greenhouse/hiring/PipelineDeskView.tsx` — `LaneDefinition` y sus tres campos de etapa
- `GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9 — el patrón que este trabajo aplica a sí mismo
