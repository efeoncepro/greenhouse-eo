# GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1 — El pipeline es el recorrido de la persona: etapa y desenlace son dos ejes, y cerrar obliga a declarar cómo

- **Status**: Accepted (2026-08-22 — decisión del operador en sesión de diseño. **NO implementada**: cero código, cero migración, cero cambio de runtime. Autoriza el vocabulario, no la ejecución)
- **Date**: 2026-08-22
- **Deciders**: operador (CEO) — decisión de producto sobre el vocabulario y sus etiquetas · agente de diseño (skills `state-design`, `info-architecture`, `greenhouse-ux-writing`, `greenhouse-talent-people-operator`)
- **Tags**: hiring, ats, pipeline, vocabulary, kanban, privacy, retención, fairness, talent-pool, full-api-parity
- **Task owner**: [`TASK-1754`](../tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md) (`EPIC-011`)
- **Evidencia base**: [Auditoría del vocabulario de etapas — 2026-08-22](../audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md) (30 hallazgos, verificación adversarial completa)
- **Primer ADR del vocabulario**: el enum de etapas nació el 2026-07-07 (`TASK-353`) **sin decisión registrada** — la spec que lo creó no menciona la palabra `stage` ni una sola vez, y ninguna fila del índice de decisiones lo justifica. Este documento no supersede nada: **crea el primero**.
- **Enmienda**: modifica el modelo de disposición de [`GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1`](GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md) (`Proposed`) — ver §9.

---

## 1. Decisión (resumen ejecutivo)

El pipeline de Hiring modela **dos ejes ortogonales**, no uno:

- **Etapa (`stage`)** — *dónde va la persona en el recorrido*. Seis valores, uno por columna del kanban. `closed` es el sexto y significa **el recorrido terminó**; es escribible, porque una columna terminal que no puede recibir una tarjeta no es un kanban.
- **Desenlace** — *cómo terminó ese recorrido*. Seis valores, más una **causa gobernada** obligatoria en uno de ellos.

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

| Desenlace | Lo que lee |
|---|---|
| `selected` | la oferta / felicitación |
| `backup_selected` | «quedaste en reserva para esta vacante» |
| `not_selected` + `capacity_filled` | «esta vez elegimos a otra persona» |
| `not_selected` + `opening_closed` | «cerramos esta búsqueda» — **explícitamente no es sobre ti** |
| `rejected` | agradecimiento, sin razón interna ni score |
| `withdrawn` | acuse de recibo |
| `unresponsive` | **ninguno** |

Copy definitivo: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`, validado con `greenhouse-ux-writing`. Ningún literal en JSX.

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

---

## 15. Preguntas abiertas

- ¿La causa se extiende también a `rejected` (motivo del descarte: requisitos, evidencia, entrevista)? Útil para calibrar selección; **no** es requisito de este ADR y no debe frenarlo.
- ¿`unresponsive` se puede derivar automáticamente tras N días sin respuesta, o siempre lo declara una persona? Deriva automática toca comunicación al candidato y necesita su propia decisión.
- Rename físico `decision` → `outcome`: deferido, con su propia migración.
