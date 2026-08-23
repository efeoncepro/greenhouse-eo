# GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1 — El pipeline es el recorrido de la persona: etapa y desenlace son dos ejes, y cerrar obliga a declarar cómo

- **Status**: Accepted (2026-08-22) — **§4, §4.1 y §6 implementados parcialmente el 2026-08-22 por [`TASK-1765`](../tasks/in-progress/TASK-1765-hiring-application-outcome-axis.md). El §3 lo cierra [`TASK-1754`](../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md): EXPAND aplicado el 2026-08-22, CONTRACT escrito y revisado el 2026-08-23 y **pendiente de aplicar** — el `CHECK` de la base sigue admitiendo trece valores. De §5, `archived_at` quedó aplicado; el `CHECK` del invariante está escrito y parqueado. El contract del enum de desenlaces va DESPUÉS del release.** Ver §16, §17 y §18.
- **Date**: 2026-08-22
- **Deciders**: operador (CEO) — decisión de producto sobre el vocabulario y sus etiquetas · agente de diseño (skills `state-design`, `info-architecture`, `greenhouse-ux-writing`, `greenhouse-talent-people-operator`)
- **Tags**: hiring, ats, pipeline, vocabulary, kanban, privacy, retención, fairness, talent-pool, full-api-parity
- **Task owner**: [`TASK-1754`](../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md) (`EPIC-011`)
- **Evidencia base**: [Auditoría del vocabulario de etapas — 2026-08-22](../audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md) (30 hallazgos, verificación adversarial completa)
- **Primer ADR del vocabulario**: el enum de etapas nació el 2026-07-07 (`TASK-353`) **sin decisión registrada** — la spec que lo creó no menciona la palabra `stage` ni una sola vez, y ninguna fila del índice de decisiones lo justifica. Este documento no supersede nada: **crea el primero**.
- **Enmienda**: modifica el modelo de disposición de [`GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1`](GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md) (`Proposed`) — ver §9.

---

## 1. Decisión (resumen ejecutivo)

El pipeline de Hiring modela **tres ejes ortogonales**, no uno:

- **Etapa (`stage`)** — *dónde va la persona en el recorrido*. Seis valores, uno por columna del kanban. `closed` es el sexto y significa **el recorrido terminó**; es escribible, porque una columna terminal que no puede recibir una tarjeta no es un kanban.
- **Desenlace** — *cómo terminó ese recorrido*. Seis valores, más una **causa gobernada** obligatoria en uno de ellos.
- **Archivado (`archived_at`)** — *si el registro se muestra*. Eje de **visibilidad del registro**, no de estado del proceso: **archivar NO declara desenlace** y NUNCA escribe `stage`. Confundirlos produjo las 32 filas `closed` sin decisión que ensuciaron el diagnóstico. Su único escritor hoy es `archiveSyntheticRecords` (CLI, sin superficie de portal).

Corolario: **«proceso activo» se responde con los tres ejes** (`decision IS NULL AND archived_at IS NULL`), nunca infiriéndolo desde `stage`. Dueño: `TASK-1772`.

El invariante que los une, y que se implementa como `CHECK` en la base:

> **`stage = 'closed'` ⟺ el desenlace está declarado.**

Cerrar **es** decidir. No existe un cierre sin desenlace, y por lo tanto el `PATCH` de etapa no puede escribir `closed`: cerrar pasa siempre por el command de decisión. Eso convierte la denylist de cuatro valores del guard actual —por donde se colaron `closed` y `handoff_ready`— en una regla estructural.

El desenlace describe **qué le pasó a la persona**, nunca el estado de la vacante. Cuando la causa del cierre es de la vacante (cupo lleno, búsqueda cerrada, proceso cancelado), el desenlace sigue siendo **«Sin selección»** y la vacante entra como **causa**, no como etiqueta de la persona.

---

## 2. La premisa, que nunca estuvo escrita

> **El pipeline es el recorrido de la persona candidata en el proceso de selección.**

Todo lo demás se deriva de ahí, y su ausencia explica los defectos que la auditoría encontró: sin esa premisa escrita, `stage` fue absorbiendo cosas que no son posiciones del recorrido (el estado del handoff), y la última columna quedó sin significado.

---

## 3. Eje 1 — Etapa: seis posiciones del recorrido

| Etapa | Columna | Qué significa |
|---|---|---|
| `sourced` | Sourced | Entró al pipeline, sin revisar |
| `screening` | Screening | En revisión inicial |
| `shortlisted` | Evaluación | Se evalúa con evidencia (prueba, muestra de trabajo) — **dispara la policy de assessment** |
| `interview` | Entrevista | En conversación con el equipo |
| `decision_pending` | Decisión | Evaluada, esperando desenlace |
| `closed` | Cerrado | **El recorrido terminó.** El desenlace dice cómo |

**Se retiran del enum:** `qualified` y `client_review` (absorbidas por `shortlisted`; nunca fueron elegibles desde ninguna superficie, así que no hay intención humana que preservar), y las cuatro proyecciones de desenlace (`selected`, `backup`, `rejected`, `withdrawn`), que dejan de ser etapas porque el desenlace tiene eje propio.

**`shortlisted` conserva su identificador** aunque la columna se llame «Evaluación»: reusarlo evita migrar 15 políticas, 20 filas de ledger append-only y dos de las tres `CHECK` que lo nombran. El operador nunca ve el identificador.

---

## 4. Eje 2 — Desenlace: seis formas de terminar

Cada categoría se gana su existencia sólo si **difiere en al menos una consecuencia real**. Ninguna de las seis falla esa prueba:

| Desenlace | Qué pasó | Quién puso fin | Correo | ¿Talent Pool? | ¿Cuenta en el embudo de equidad? |
|---|---|---|---|---|---|
| `selected` | La elegimos | Efeonce | oferta | no — pasa a workforce | sí, como avance |
| `backup_selected` | La elegimos como respaldo | Efeonce | «quedaste en reserva» | no — compromiso vigente | sí, como avance |
| `not_selected` | Llegó al final y no quedó | Efeonce / el contexto | según la **causa** | **sí — es la población objetivo** | **depende de la causa** |
| `rejected` | Juicio desfavorable para este rol | Efeonce | agradecimiento | no por defecto | sí, como no-avance |
| `withdrawn` | Se retiró, **declarado** | la persona | acuse de recibo | según su consentimiento | **no** — no es resultado del proceso |
| `unresponsive` | Dejó de responder, **sin declarar nada** | nadie | ninguno | no | **no** |

### 4.1 Causa — obligatoria en `not_selected`, enum gobernado

| Causa | Qué pasó | ¿Cuenta en el embudo? | Mensaje al candidato |
|---|---|---|---|
| `capacity_filled` | El cupo lo tomó otra persona | **sí** — el proceso concluyó y hubo comparación | «esta vez elegimos a otra persona» |
| `opening_closed` | Se cerró la búsqueda | **no** — el proceso no concluyó | «cerramos esta búsqueda» |
| `process_cancelled` | Se canceló el proceso | **no** | «cancelamos este proceso» |

**La causa NO es una nota al pie: es un enum gobernado**, porque hay consumidores que ramifican por ella. Si algo ramifica por un valor, ese valor no puede ser texto libre — es la regla que este dominio ya aprendió a la mala.

### 4.2 Las tres distinciones nuevas, y por qué no son lujo

1. **`not_selected` ≠ `rejected`.** «Descarte» dice algo **sobre la persona**; «Sin selección» no. Es la diferencia entre un Talent Pool útil y uno inútil: la gente que quieres re-contactar es la que llegó lejos y no quedó, no la que no daba el ancho. Hoy las dos caen en `rejected` y son indistinguibles.
2. **`unresponsive` ≠ `withdrawn`.** Hoy, a alguien que dejó de responder sólo puedes marcarlo como retirado (le inventas una decisión que no tomó) o como descartado (le inventas un juicio que no hubo). **Las dos son atribución falsa**, prohibida por el corolario 2 del patrón §9 y por la doctrina de talento.
3. **La causa `opening_closed` no puede contarse como rechazo.** Si cierras una vacante con 33 personas en proceso y las marcas `rejected`, **inflas la tasa de rechazo de la cohorte demográfica que estuviera ahí**, y el ratio 4/5 leería un impacto adverso que no ocurrió — con evidencia AI-Act append-only firmando el resultado falso.

---

## 5. El invariante, y los dos defectos que cierra estructuralmente

```
stage = 'closed'  ⟺  outcome IS NOT NULL
```

Como `CHECK` de base, no como disciplina de capa aplicación. De ahí caen solos dos hallazgos P0 de la auditoría:

- **La puerta abierta de `closed` (H-02) deja de existir.** El `PATCH` de etapa no acepta desenlace, luego no puede escribir `closed`. Cerrar pasa siempre por el command de decisión, que emite `hiring.application.decided`, dispara el correo y arranca el reloj de retención.
- **La retención congelada (H-01) deja de existir con ella**, porque `closed` sin desenlace se vuelve **irrepresentable**. Hoy una sola fila así bloquea, vía `NOT EXISTS` por `identity_profile_id`, el borrado de **todos** los documentos de esa persona en todas sus postulaciones.

**Consecuencia obligatoria:** el archivado de registros sintéticos (`data-origin/purge.ts`) **deja de usar `closed`** y pasa a un campo propio (`archived_at` o equivalente). Archivar el registro no es cerrar el proceso de una persona, y confundirlos es lo que produjo las 32 filas `closed` sin decisión que ensuciaron el diagnóstico.

---

## 6. Lo que se retira, y por qué

| Se retira | Razón |
|---|---|
| `qualified`, `client_review` como etapas | Nunca fueron elegibles desde ninguna superficie. Absorbidas por `shortlisted` — colapso **con pérdida declarada**: ningún campo recupera cuál era, y se acepta porque no hay intención humana que preservar |
| `selected`, `backup`, `rejected`, `withdrawn` como etapas | Son espejo redundante del desenlace. `decide` escribía ambos campos con el mismo valor; la etapa no aportaba un bit |
| `handoff_ready` como etapa | **No es una posición del recorrido de la persona**: es un estado del agregado `handoff`, que ya tiene su propia máquina de estados (`TASK-356`). Verificado: **ningún escritor lo produce jamás** — es alcanzable sólo por llamada directa a la API, y aun así gobierna seis listas de decisión |
| `on_hold` como desenlace | **Una pausa no es un cierre.** Vive en la columna «Decisión». Hoy está en el enum de desenlaces *y* mapea a `decision_pending`, que es de donde sale el doble sentido de esa columna |

**El campo físico `decision` conserva su nombre**; el concepto de dominio es **desenlace**. `withdrawn` y `unresponsive` no son decisiones de Efeonce, así que **NUNCA** debe leerse ese campo como «lo que Efeonce decidió»: significa «cómo terminó el proceso». El rename físico queda fuera de alcance y necesita su propia migración.

---

## 7. Vocabulario visible

### 7.1 Operador — chip en la tarjeta, columna «Cerrado»

Sustantivos neutros. Describen el desenlace del proceso, **no a la persona**, y evitan la concordancia de género en una etiqueta que va junto al nombre de alguien:

**`Selección` · `Reserva` · `Sin selección` · `Descarte` · `Retiro` · `Sin respuesta`**

**La tarjeta DEBE mostrar el chip.** Una columna «Cerrado» que no dice cuál cierre fue recrea exactamente el colapso que este ADR viene a cerrar (patrón §9).

### 7.2 Persona candidata — correo

**Nunca lee la etiqueta interna.** Misma regla que ya rige el correo de avance de etapa: vocabulario interno adentro, mensaje humano afuera.

| Desenlace | Lo que lee | `EmailType` |
|---|---|---|
| `selected` | la oferta / felicitación | `hiring_decision_selected` *(existe)* |
| `backup_selected` | «quedaste en reserva para esta vacante» | variante de `hiring_decision_selected` o tipo propio, a decidir en su task |
| `not_selected` + `capacity_filled` | «esta vez elegimos a otra persona» | **`hiring_decision_not_selected`** *(nuevo)* |
| `not_selected` + `opening_closed` | «cerramos esta búsqueda» — **explícitamente no es sobre ti** | **`hiring_decision_not_selected`** — misma causa, cuerpo distinto |
| `not_selected` + `process_cancelled` | «cancelamos este proceso» | **`hiring_decision_not_selected`** |
| `rejected` | agradecimiento, sin razón interna ni score | `hiring_decision_rejected` *(existe)* |
| `withdrawn` | acuse de recibo | acuse existente |
| `unresponsive` | **ninguno** | — |

Copy definitivo: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`, validado con `greenhouse-ux-writing`. Ningún literal en JSX.

### 7.3 Un `EmailType` por desenlace. La causa modula el CUERPO, no el tipo

`EmailType` **no es una etiqueta descriptiva: el sistema ramifica por ella** en tres lugares verificados:

1. **El kill-switch por tipo** — `greenhouse_notifications.email_type_config`, consultado en
   `src/lib/email/delivery.ts:131` y otra vez bajo lock (`FOR SHARE`) en `:336`.
2. **El perfil de footer**, que `TASK-1764` (`EPIC-042`) resuelve **por `EmailType`**.
3. **El selector del propio envío de decisión** — `src/lib/hiring/notifications/send.ts:358` es hoy un
   ternario binario, `decision === 'selected' ? 'hiring_decision_selected' : 'hiring_decision_rejected'`, que
   **colapsa todo lo no-seleccionado en `rejected`**. Es el callsite exacto que mislabelaría el envío, y hay
   que tocarlo sí o sí.

Es el patrón canónico §9 aplicado a la capa de correo: si algo ramifica por un valor, ese valor no se colapsa.

> **El dedupe NO es argumento, y no debe reintroducirse como tal.** `wasEmailAlreadySent`
> (`src/lib/email/delivery.ts:1404-1418`) filtra por `source_event_id + source_entity + recipient_email`; el
> tipo **no entra en la clave**. Verificado 2026-08-22 tras haberlo afirmado mal.

**Por eso un cierre por capacidad NO reusa `hiring_decision_rejected`.** El argumento decisivo es operativo,
no semántico: un cierre de cohorte manda **N correos de golpe** (las vacantes vivas tienen 15 y 33 personas)
y un descarte individual manda uno. Si un run sale mal a mitad, hay que poder **pausar ese envío sin
silenciar los correos de decisión individual** — y con un tipo compartido el kill-switch apaga los dos.

El repo ya tomó esta decisión antes, y lo dice por escrito: `hiring_decision_selected` y
`hiring_decision_rejected` **ya son tipos separados** (`src/lib/email/types.ts:33-34`), y
`services/ops-worker/deploy.sh:399` declara literalmente que `hiring_decision_rejected` es
**«pausable aparte en `email_type_config`»**. El tipo nuevo sigue el diseño existente, no inventa una carga.

Que el log append-only quedaría diciendo «rechazado» de quien no lo fue es cierto, pero es **refuerzo
secundario**: el registro autoritativo es el desenlace, no el correo.

**La regla que fija el techo y evita la explosión combinatoria:**

> **Un `EmailType` por desenlace. La causa modula el cuerpo del mensaje, nunca el tipo.**

De los 6 desenlaces sólo **4 comunican** (`selected`, `rejected`, `not_selected`, `withdrawn`);
`unresponsive` no manda nada y `backup_selected` resuelve en su propia task. Las 3 causas viven **dentro** del
cuerpo de `not_selected`. El vocabulario de correo queda acotado por el mismo enum del dominio.

**Dos condiciones sin las cuales el tipo nuevo nace roto:**

1. **`TASK-1764` (`EPIC-042`) resuelve los perfiles de footer por `EmailType`.** Un tipo que no se declara ahí
   cae al perfil legacy **en silencio**.
2. **El envío es asíncrono y vive en el `ops-worker`, NO en Vercel.** El seed de `email_type_config` y
   cualquier flag asociado van en `services/ops-worker/deploy.sh` —que usa `--set-env-vars`
   **destructivo**— y **además** aplicados en vivo con `--update-env-vars`, con su fila en
   `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. Declararlo sólo en Vercel deja el envío apagado sin que
   nada avise; ya ocurrió en este repo con un correo que la UI prometía y nunca salió.

---

## 8. Contrato de interacción del kanban

- **Soltar una tarjeta en «Cerrado» NO es un cambio de etapa: es una decisión.** La superficie abre el diálogo de desenlace **antes** de escribir, y la causa es obligatoria cuando el desenlace es `not_selected`. Es el corolario 1 del patrón §9: si la superficie ramifica, lo declara en el punto de decisión.
- Las cinco columnas anteriores conservan el arrastre simple: son posiciones del recorrido.
- **Mover a «Evaluación» declara su efecto antes de soltar** («al mover aquí se asigna la prueba»), porque esa etapa dispara automatización.
- Una etapa desconocida **nunca** cae silenciosamente en la primera columna. Con un valor por columna, el traductor de tres campos desaparece y el fallback deja de existir.

---

## 9. Enmienda a la decisión de cierre por capacidad (`Proposed`)

`GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1` modela hoy la disposición de la cohorte como **`rejected` con causa `capacity_filled`**, y compensa personalizando el correo. Este ADR lo modifica:

> El desenlace de una cohorte cerrada por capacidad es **`not_selected`**, con la causa correspondiente. **No es `rejected`.**

Razón: `rejected` es un juicio sobre la persona. Aplicarlo a 33 personas que no fueron juzgadas les atribuye una causa falsa en el registro (aunque el correo diga otra cosa), las deja fuera del Talent Pool por defecto, sesga a cualquier revisor futuro que lea su historia, y distorsiona el análisis de impacto adverso. El nombre de la causa (`capacity_filled`) se conserva tal como esa decisión ya lo especifica.

---

## 10. Consecuencias por consumidor

| Consumidor | Qué cambia |
|---|---|
| **Kanban / Hiring Desk** | La definición de carril pierde los tres campos de traducción y queda con uno. `pipeline-lane-contract.test.ts` se vuelve innecesario y **se borra** — la señal de que el arreglo fue estructural |
| **Policy de assessment** | El trigger sigue en `shortlisted`, ahora **alcanzable**. Al ensancharse la etapa, el default de la policy debe revisarse: `on_stage_entry` sobre una etapa ancha manda trabajo no pagado a todo el que pase screening |
| **Correo al candidato** | La allowlist candidate-facing no cambia (`shortlisted` → «Preselección», `interview` → «Entrevista»). **La divergencia «Preselección» ≠ «Evaluación» es deliberada** (decisión del operador 2026-08-22): registro más suave hacia afuera. Se documenta como decisión, no como drift |
| **Retención de PII** | Deja de existir el estado que congelaba ambos relojes. La escalera de retención debe además enumerar `backup_selected` y `on_hold`, que hoy caen a `ELSE NULL` (H-23) |
| **Equidad / AI Act** | Las escaleras de rango deben **conservar los literales retirados mapeados al rango nuevo**: los payloads históricos de `outbox_events` son inmutables y son la única memoria del avance de un rechazado dentro de la VIEW. Y el embudo debe ramificar por desenlace **+ causa** |
| **Talent Pool** | `not_selected`, con cualquier causa, es la población objetivo. No hay que mirar la causa para eso |
| **Expediente de evaluación** | La etapa cruda entra al prompt del modelo. **Hay que decidir qué token recibe por cada etapa fusionada** antes de migrar (H-15) |
| **Correo al candidato (tipos)** | `not_selected` estrena `EmailType` propio; la causa modula el cuerpo. Requiere fila en `TASK-1764` (footers por tipo) y seed en el `ops-worker`, no en Vercel — ver §7.3 |
| **Carril programático** | Un desenlace no se escribe por `PATCH`. La API de cierre nombra el paso, no el literal — el modelo a copiar es `HiringHandoff` (`POST /api/hiring/handoffs/[id]/[action]`), no el `PATCH {stage}` genérico |

---

## 11. Lo que este ADR NO autoriza

- **No autoriza tocar código, migrar filas ni cambiar runtime.** Fija el vocabulario; la ejecución es de `TASK-1754` y sus hijas, con su propio orden de slices.
- No autoriza renombrar la columna física `decision`.
- No autoriza retirar un literal del enum mientras una política, una `CHECK`, una escalera de la VIEW de equidad o una fila del ledger lo nombren. **`assertEnum` corre en el camino de LECTURA** de la policy y del ledger: retirar un literal que alguna fila histórica nombre produce un `500` al releerla, y esas filas son irreescribibles por diseño (H-05).
- No autoriza invertir el default de la policy de assessment — es necesario, y va en su propia task.
- No autoriza implementar el eje de causa fuera del command canónico de decisión.

---

## 12. Reglas duras

- **NUNCA** un `stage = 'closed'` sin desenlace declarado. Es irrepresentable por `CHECK`, y esa es la única garantía que no depende de que alguien se acuerde.
- **NUNCA** etiquetar a una persona con el estado de la vacante. La vacante entra como **causa** de `not_selected`, jamás como desenlace.
- **NUNCA** usar `rejected` para un cierre en el que no hubo juicio sobre la persona — ni por capacidad, ni por cancelación, ni por silencio.
- **NUNCA** atribuirle a la persona una conducta que no declaró: quien deja de responder es `unresponsive`, no `withdrawn`.
- **NUNCA** dejar la causa como texto libre. Ramifica el embudo de equidad y el correo: es enum gobernado.
- **NUNCA** archivar un registro escribiendo `closed`. Archivar es un eje aparte.
- **NUNCA** mostrar una tarjeta en «Cerrado» sin su chip de desenlace.
- **NUNCA** exponer el identificador interno del desenlace ni su causa a la persona candidata.
- **NUNCA** reusar el `EmailType` de un desenlace para otro. El sistema ramifica por ese valor (kill-switch, dedupe, perfil de footer): colapsarlos deja un cierre de cohorte y un descarte individual bajo el mismo interruptor.
- **NUNCA** crear un `EmailType` por causa. Un tipo por desenlace; la causa modula el cuerpo.
- **NUNCA** sembrar un `EmailType` nuevo sólo en Vercel: el envío es del `ops-worker`, y el flag declarado fuera de su `deploy.sh` desaparece en el siguiente deploy, en silencio.
- **NUNCA** retirar un literal de las escaleras de rango de la VIEW de equidad: son **tabla de traducción histórica**, no espejo del vocabulario vigente.
- **SIEMPRE** declarar en el punto de decisión que soltar en «Evaluación» dispara la prueba.

---

## 13. Evidencia que sostiene esta decisión

- **Cero postulaciones reales han estado jamás en `closed`.** Las 32 filas son sintéticas, escritas por el archivado; el `PATCH` nunca escribió ese literal. La columna «Cerrado» es un arma cargada que no se disparó — por eso el vocabulario se puede fijar sin migrar datos reales.
- **La única terminal real del sistema es 1 fila `rejected`**, y sí tiene su decisión.
- **Ningún operador escribió jamás `shortlisted`** (27 escrituras históricas, todas de scripts o de la persona agente). La etapa que la automatización vigilaba era inalcanzable desde el tablero: 15 políticas apuntando al vacío y dos candidatas reales sin prueba el 2026-08-19.
- **`handoff_ready` no tiene ningún escritor** y gobierna seis listas de decisión.
- Detalle completo, con `archivo:línea` y verificación adversarial: [la auditoría](../audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md).

---

## 14. Orden de ejecución (no es plan de slices; es la restricción)

El orden no es preferencia: cada paso destruye el discriminante que el siguiente necesita si se invierte.

1. **La mitigación vigente sube a producción** o se declara que espera. Hoy, en producción, mover a «Evaluación» sigue escribiendo `qualified` y sigue sin disparar.
2. **El invariante `closed ⟺ desenlace`** entra **antes** que cualquier colapso terminal. Al revés se pierde el último discriminante.
3. **Expand antes que contract, y la política antes que la etapa.** Si un literal desaparece del enum mientras una policy lo nombra, esa policy queda inerte sin avisar.
4. **El contract es irreversible** y no se ejecuta hasta verificar el expand en producción.

### 14.1 Cómo se verifica la precondición del paso 4 (y por qué contar filas no sirve)

El paso 4 exige verificar el expand en producción antes del contract. **Esa verificación se hace sobre el CÓDIGO DESPLEGADO, no sobre la tabla.** «Cero filas» sólo dice que nadie escribió el literal *todavía*; no dice que la superficie desplegada no pueda escribirlo mañana. Es el mismo razonamiento del §16, acá bajado a método ejecutable.

El método, tal como se aplicó al contract del eje de etapa el 2026-08-23 (§18):

1. **Enumerar los escritores de la columna sobre `origin/main`** —el release efectivamente desplegado, con su SHA anotado en la migración—, nunca sobre el working tree ni sobre `develop`.
2. **Comprobar que cada escritor está acotado por tipo**, no por convención: un `assertEnum` / `assertOptionalEnum` contra el subconjunto escribible, o un mapa total desde otro enum.
3. **La unión de lo escribible por esos escritores es la cota superior de lo alcanzable.** Si esa unión cabe dentro del vocabulario nuevo, el contract es seguro. Si un solo escritor acepta `string` libre, no lo es: la cota se vuelve infinita y el paso 3 falla, sin importar cuántas filas haya.

Trampa del método, que hay que nombrar porque es la que se comete: **un `grep` laxo confunde filtro con escritura.** Un `stage = $n` dentro del `WHERE` de un reader de lista es un filtro y no autoriza nada. Contarlo como escritor invalida el barrido hacia el falso positivo; omitir un escritor real lo invalida hacia el daño. Cada hit se clasifica, no se cuenta.

---

## 15. Preguntas abiertas

- ¿La causa se extiende también a `rejected` (motivo del descarte: requisitos, evidencia, entrevista)? Útil para calibrar selección; **no** es requisito de este ADR y no debe frenarlo.
- ¿`unresponsive` se puede derivar automáticamente tras N días sin respuesta, o siempre lo declara una persona? Deriva automática toca comunicación al candidato y necesita su propia decisión.
- Rename físico `decision` → `outcome`: deferido, con su propia migración.

---

## 16. Delta de implementación — 2026-08-22 (`TASK-1765`)

### Aplicado en base y en código

| Sección | Qué entró | Dónde |
|---|---|---|
| §4 | Los dos desenlaces nuevos, `not_selected` y `unresponsive`, admitidos en el `CHECK` y en el enum TS | `migrations/20260822202243572_*`, `src/types/hiring.ts` |
| §4.1 | `decision_cause` con su `CHECK` de enum y su `CHECK` de pareja **bicondicional**: obligatoria en `not_selected`, prohibida en el resto | misma migración |
| §5 | `archived_at` — el campo de archivado ortogonal que `TASK-1748` necesita para dejar de archivar escribiendo `closed` | misma migración |
| §4 | El command recibe y persiste desenlace **y** causa en el mismo `UPDATE`, en el historial y en `sameReplayPayload` (distinta causa ⇒ 409) | `src/lib/hiring/decide.ts` |
| §3 | Todo desenlace terminal escribe `stage='closed'`; ninguna etapa espejo se vuelve a escribir | `DECISION_STAGE` |
| §5 | El cambio de etapa **no puede cerrar, por tipo**: nace `HIRING_PIPELINE_STAGES` y la denylist se borró | `src/types/hiring.ts`, `src/lib/hiring/store.ts` |
| §7.3 | El selector de `EmailType` pasa a mapa explícito con no-op declarado: un desenlace sin tipo propio nace mudo | `src/lib/hiring/notifications/send.ts` |
| — | Señal `hiring.application.closed_without_outcome`, que nace **antes** que el `CHECK` para medir el drift que ese `CHECK` va a impedir | `src/lib/reliability/queries/hiring-application-outcome-signals.ts` |

### Pendiente, con condición de ejecución declarada

Ambas viven en `docs/tasks/pending-migrations/` y **no** en `migrations/` — ver ahí el porqué.

1. **Contract del enum de desenlaces** (retirar `on_hold` del `CHECK`) — cuando `origin/main` ya no ofrezca «Dejar en espera».
2. **§5, el `CHECK` del invariante** `(stage='closed') = (decision IS NOT NULL)` — cuando `TASK-1748` haya movido sus 32 filas sintéticas. Readback esperado: **33 → 0**.

### Enmienda a §14 — el orden vale para CUALQUIER enum, no sólo para el de etapas

El §14 dice «el contract es irreversible y no se ejecuta hasta verificar el expand en producción», y estaba escrito pensando en el enum de **etapas**. El 2026-08-22 se aplicó el contract del enum de **desenlaces** contra la instancia compartida mientras producción todavía ofrecía `on_hold`: la acción «Dejar en espera» quedó rota (`23514`) durante ~7 minutos, con cero filas afectadas, hasta un forward fix permisivo.

La regla generalizada, y la razón por la que ningún guard de SQL puede sustituirla:

> **Un contract de enum se aplica DESPUÉS del release que retira el valor del código, nunca antes.** La alcanzabilidad se deriva del **contrato de la superficie desplegada** (`origin/main`), jamás del contenido de la tabla: «cero filas» sólo dice que nadie lo escribió *todavía*. Un `RAISE EXCEPTION` dentro de la migración **no puede** validar esto — sólo ve datos, y la precondición es sobre código desplegado.

Pesa el doble en este repo porque **hay una sola instancia de Cloud SQL** compartida por dev, staging y producción. Detalle canónico en `GREENHOUSE_DATABASE_TOOLING_V1.md`.

### Lo que este delta NO cambia

`decision` conserva su nombre físico (§11). Las escaleras de rango de la VIEW de equidad quedan intactas: son tabla de traducción histórica y su definición viva está en `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql`, **no** en la copia superseded de `20260713165547000_*`.

---

## 17. Delta de implementación — 2026-08-22 (`TASK-1754`, eje de ETAPA)

Complementa el §16, que cubrió el eje de desenlace. Acá entra el eje de etapa, en la mitad **expand**.

### Aplicado en base y en código

| Sección | Qué entró | Dónde |
|---|---|---|
| §3 | `qualified` y `client_review` **absorbidas en `shortlisted`** — expand aplicado contra la instancia compartida. Readback: `qualified` 7 → 0, `shortlisted` 4 → 11, total 83 sin cambio; `client_review` ya estaba en 0 | `migrations/20260822222736803_*` |
| §14 paso 3 | El subconjunto escribible `HIRING_PIPELINE_STAGES` pierde los dos literales **antes** que el `CHECK`. Es el orden del §16: primero se corta el escritor, después se angosta la base | `src/types/hiring.ts` |
| §3 | El disparador y el ledger declaran `satisfies` contra `HiringApplicationStage`; el mapa de copy pasa a `Record<HiringApplicationStage, string>`; muere el cast `ctx.stage as 'shortlisted' \| 'interview'` | `src/types/hiring-assessment-policy.ts`, `src/lib/copy/types.ts`, `src/lib/hiring/stage-comms/decide.ts` |
| §8 | El carril del kanban declara **UNA** etapa (`stage`), que titula y se escribe. Lo que agrupa se separó en `absorbs`, con nombre propio: mezclarlos fue lo que permitió que el destino fuera uno de los agrupados | `src/views/greenhouse/hiring/PipelineDeskView.tsx` |
| §7.1 | `en-US` **redefine** `pipeline.stages`. Heredaba por spread, así que el desk en inglés mostraba las seis columnas en castellano — sin línea que mirar en ningún diff | `src/lib/copy/dictionaries/en-US/hiringDesk.ts` |
| — | Paridad enum ↔ `CHECK` derivada de los dos lados, contra PostgreSQL real; y el tablero renderizado con cada diccionario | `stage-enum-check-parity.live.test.ts`, `pipeline-desk-locale.test.tsx`, `hiring-desk-stage-locale-parity.test.ts` |

### Pendiente, con condición de ejecución declarada

**El contract del enum de etapas** —retirar `qualified`, `client_review`, `handoff_ready` y las cuatro proyecciones de desenlace del `CHECK`— quedó **escrito y revisado el 2026-08-23**, y sigue **pendiente de aplicar**. Su precondición, su método de verificación y su estado honesto están en el **§18**.

### Dos hallazgos del expand que la auditoría no tenía

1. **Migrar por SQL no deja las filas mudas del todo.** No emite `stage_changed` —eso lo produce el command, no la base— así que ni correo ni prueba automática. Pero `resolveApplicationsAwaitingAssignment` deriva del **estado vigente**, no del evento, así que las filas migradas **sí aparecen en la cola de reconciliación de su vacante**. Esa cola es read-only (su único consumidor no-test es un `GET`), de modo que nada se asigna solo: queda operable para que una persona decida. Es el resultado correcto y conviene decirlo, porque la spec afirmaba que quedaban «igual de mudas».

2. **La retención de recuperación de acceso ramifica por literales que este eje retira.** El trigger `refresh_assessment_access_recovery_retention_for_application` decide `retention_class` y `retention_expires_at` con `NEW.stage = 'selected'` **y** `NEW.decision = 'selected'`, y con `NEW.stage IN ('rejected','withdrawn')` **o** `NEW.decision IN (…)`. Las ramas por `stage` mueren con el contract; las que sobreviven por `decision` **no cubren `backup_selected`, `not_selected` ni `unresponsive`** — los tres desenlaces que el §4 introdujo. Su rama `ELSE` deja `retention_expires_at` en `NULL`, o sea **sin vencimiento**, y `not_selected` es la población más grande del §4. Hoy no muerde porque la tabla está vacía. Es trabajo del eje de desenlace (`TASK-1765`), no de éste.

---

## 18. Delta de implementación — 2026-08-23 (`TASK-1754` Slice F, el CONTRACT del eje de etapa)

Cierra la mitad que el §17 dejó abierta. `HIRING_APPLICATION_STAGES` (`src/types/hiring.ts`) pasa de **trece a seis** valores: `sourced`, `screening`, `shortlisted`, `interview`, `decision_pending`, `closed`.

Los siete literales que salen lo hacen **por dos razones distintas, y conviene no mezclarlas**:

| Sale | Razón | Desde |
|---|---|---|
| `qualified`, `client_review` | **Absorbidos** por `shortlisted` | Slice B (§17), ya en producción |
| `selected`, `backup`, `rejected`, `withdrawn`, `handoff_ready` | **Espejos terminales.** Dejaron de ser etapas cuando el §16 creó el eje de desenlace: todo recorrido terminado escribe `stage='closed'` y su desenlace vive en la columna `decision` | §16 (`TASK-1765`) |

### Cómo se autorizó a angostar el `CHECK` (aplicación del §14.1)

La precondición **no** salió de contar filas. Salió del **contrato de la superficie desplegada**: en `origin/main`, release `304371f73` —ya en producción—, hay **exactamente tres** escritores de `hiring_application.stage`, y los tres están acotados por tipo.

| Escritor | Cota |
|---|---|
| `src/lib/hiring/store.ts:1249` (INSERT) | `assertOptionalEnum(input.stage, HIRING_PIPELINE_STAGES) ?? 'sourced'` |
| `src/lib/hiring/store.ts:1340` (UPDATE) | `assertEnum(stage, HIRING_PIPELINE_STAGES)` + rechazo explícito de `closed` |
| `src/lib/hiring/decide.ts:299` (UPDATE) | `DECISION_STAGE[decision]`, mapa total de los seis desenlaces a `'closed'` |

La unión de lo escribible son exactamente los seis que quedan. Dato para el próximo barrido: `store.ts:666` también tiene `stage = $n`, pero es un **filtro** de lista, no una escritura — el falso positivo típico del grep laxo que el §14.1 advierte.

La propia migración lleva su guarda de datos (aborta con `RAISE EXCEPTION` si alguna fila quedó en una etapa retirada) y su bloque anti pre-up-marker que verifica el `CHECK` **resultante**, no la intención.

### Aplicado en código

| Qué entró | Dónde |
|---|---|
| El enum de etapas en seis valores | `src/types/hiring.ts` |
| `TERMINAL_APPLICATION_STAGES` nace como **fuente única** (`ReadonlySet<string>` = `{'closed'}`). Había **tres copias verbatim** del mismo `Set`, cada una con cinco literales de los que cuatro acaban de volverse irrepresentables; tres copias sin fuente compartida son tres oportunidades de que la próxima corrección alcance sólo a dos | `src/types/hiring.ts`, importada por `assessment/instances.ts`, `assessment/public-session/store.ts` y `assessment/access-recovery/vocabulary.ts` |
| `STAGES_DOWNSTREAM_OF_TRIGGER` **reescrito, no podado**, y tipado con `HiringApplicationStage` para que el próximo literal muerto no compile | `src/lib/hiring/assessment/assignment-policy/readers.ts` |

**Reescrito y no podado, y ésa es la parte que importa:** el mapa declaraba `client_review` como aguas **abajo** de `shortlisted`, y el colapso la absorbió **dentro**. Podar el literal habría dejado la relación al revés y seguido mandando a la cola humana postulaciones que la reconciliación automática sí puede recuperar. Queda `shortlisted → [interview, decision_pending]` e `interview → [decision_pending]`. Lección transferible: cuando un colapso fusiona dos literales, cualquier mapa de **relaciones entre etapas** se revisa entero — podar el nombre no arregla una relación que cambió de sentido.

### Deuda declarada: el cubo terminal del monitor de equidad

`FAIRNESS_REPORTABLE_STAGES` (`src/lib/hiring/assessment/fairness/contracts.ts`) **conserva** `qualified`, `client_review` y `selected`. No es descuido, y no cabía en este slice por dos razones:

- `getSelectionFairness` usa `input.stage ?? 'selected'` como **default**, así que retirarlo rompería toda llamada sin etapa explícita.
- Re-apuntar el cubo terminal al eje de desenlace cambia **QUÉ mide** el monitor — la tasa de selección final es justo el cociente que vigila el four-fifths rule. Eso no es una decisión que corresponda tomar dentro de un contract de vocabulario (§11).

**Mitigación aplicada:** el reader **falla ruidoso** (`hiring_fairness_stage_retired`, 422, `actionable: false`) en vez de devolver cero. Un cero silencioso en una métrica de equidad se lee como «no hay impacto adverso» — exactamente la conclusión contraria a la verdad.

**Condición de retiro:** `TASK-1365` re-apunta el cubo terminal al eje de desenlace **antes** de que `HIRING_FAIRNESS_MONITOR_ENABLED` se prenda en producción. Hoy el flag está OFF y los tres literales tienen cero filas desde el colapso, así que el hueco no está vivo.

### Aviso vigente

`TASK-1718` acepta `stage` como **string libre, sin `assertEnum`**, en su lane programático. Un filtro por un literal retirado no falla ahí: **devuelve cero en silencio**.

### Estado honesto al 2026-08-23

| Pieza | Estado |
|---|---|
| Enum TS en seis valores + los tres consumers apuntados a la fuente única + mapa de aguas abajo reescrito | **aplicado** — `typecheck` y `eslint` limpios, 1.236 tests del dominio verdes |
| `docs/tasks/pending-migrations/TASK-1754-stage-vocabulary-contract.sql.pending` | **escrita y revisada, NO aplicada.** Espera autorización del operador: el `CHECK` de la base **sigue admitiendo trece valores** |

Mientras esa migración no corra, el estado correcto de la task es `code complete, rollout pendiente` — no `complete`.

