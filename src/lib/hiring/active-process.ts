/**
 * TASK-1772 — Definición canónica de «postulación en proceso activo».
 *
 * Responde UNA pregunta: **¿esta postulación sigue en juego?** Y son TRES ejes ortogonales, no uno.
 *
 * El ADR del vocabulario
 * (`docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`) separó
 * dos ejes que estaban colapsados: **dónde va la persona** (`stage`) y **cómo terminó** (`decision`).
 * Lo que no alcanzó a reconocer —porque `archived_at` nació en su propio Slice 1, el mismo día— es
 * que hay un TERCER eje: **si el registro se muestra**.
 *
 * ```sql
 * decision IS NULL          -- el recorrido no ha terminado
 * AND archived_at IS NULL   -- y el registro no fue retirado de la vista
 * ```
 *
 * ## Los cuatro cuadrantes
 *
 * | `decision` | `archived_at` | ¿activo? | caso real |
 * |---|---|---|---|
 * | `NULL` | `NULL`  | **sí** | la persona está en el pipeline |
 * | `NULL` | fecha   | no | registro retirado de la vista sin declarar desenlace |
 * | valor  | `NULL`  | no | el recorrido terminó |
 * | valor  | fecha   | no | terminó y además se archivó |
 *
 * El **segundo** cuadrante es el que motiva este módulo: existe (32 filas al 2026-08-23) y hasta hoy
 * ningún consumidor lo cubría. `archived_at` es ortogonal a `decision` **por contrato explícito** —
 * archivar NO declara desenlace, y el ADR §12 lo prohíbe expresamente— así que la conjunción no es
 * redundante: cubre un cuadrante que ninguna de las dos condiciones cubre sola.
 *
 * ## Por qué `stage` NO participa, y no queda como tercera condición «por si acaso»
 *
 * Con el `CHECK` `hiring_application_closed_outcome_check` aplicado en base
 * (`(stage = 'closed') = (decision IS NOT NULL)`), `stage <> 'closed'` ⟺ `decision IS NULL`:
 * agregarlo sería repetir la primera condición con otras palabras. Y si el `CHECK` no estuviera, la
 * única combinación que `stage` añadiría es `closed AND decision IS NULL` — exactamente las filas
 * que este predicado NO quiere contar. En los dos mundos, `stage` es ruido.
 *
 * Medición contra PostgreSQL real (2026-08-23), que es la que retira el último argumento a favor de
 * seguir preguntando por etapa:
 *
 * ```
 * stage NOT IN ('rejected','withdrawn','closed')  →  82
 * decision IS NULL                                 →  82   ← convergieron
 * decision IS NULL AND archived_at IS NULL         →  50   ← el canónico
 * ```
 *
 * ## Composición: dos preguntas ortogonales, nunca fundidas
 *
 * «¿sigue en juego?» (este módulo) y «¿es una persona real?» (`realOnlyPredicate`, TASK-1739) son
 * preguntas DISTINTAS que comparten una mitad. Se componen con `AND` en el callsite; NUNCA se
 * fusionan en un predicado único que responda las dos a medias — eso reintroduce el colapso de ejes
 * que este módulo existe para cerrar.
 *
 * Módulo PURO a propósito: sin IO y sin `server-only`. Lo consumen readers server-side, la
 * projection del Banco de Talento (que corre en el `ops-worker`), la señal de reliability y la vista
 * del desk, que es un componente cliente.
 *
 * Contrato vinculante: `docs/tasks/complete/TASK-1772-hiring-active-process-canonical-predicate.md`.
 */

/**
 * Fragmento SQL canónico. Ningún reader escribe su propio WHERE de «proceso activo».
 *
 * `alias` debe ser un alias de tabla controlado por el llamador (nunca input de usuario): se
 * interpola como identificador, no como valor — mismo contrato que `realOnlyPredicate`.
 */
export const activeProcessPredicate = (alias: string): string =>
  `${alias}.decision IS NULL AND ${alias}.archived_at IS NULL`

/**
 * Negación explícita, para los `FILTER`/`NOT EXISTS` que preguntan por lo contrario.
 *
 * Existe para que nadie escriba `NOT (${activeProcessPredicate(a)})` a mano y se equivoque con la
 * precedencia: sin paréntesis, el `NOT` sólo alcanzaría la primera condición y el predicado diría
 * algo distinto de lo que aparenta, en silencio.
 */
export const notActiveProcessPredicate = (alias: string): string =>
  `NOT (${activeProcessPredicate(alias)})`

/**
 * Forma mínima que necesita el predicado TS. Deliberadamente estructural en vez de atada a
 * `HiringApplication`: la consumen también VMs parciales y filas crudas normalizadas.
 */
export interface ActiveProcessInput {
  decision: string | null | undefined
  archivedAt: string | Date | null | undefined
}

/**
 * Espejo TS del fragmento SQL. Es la MISMA regla, así que cualquier cambio toca las dos mitades de
 * este archivo a la vez — que es justo el motivo de que vivan juntas en vez de en dos módulos.
 *
 * `undefined` se trata igual que `null`: un VM que todavía no expone la columna no debe convertir a
 * toda su población en archivada.
 */
export const isActiveProcess = (application: ActiveProcessInput): boolean =>
  (application.decision ?? null) === null && (application.archivedAt ?? null) === null
