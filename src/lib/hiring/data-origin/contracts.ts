/**
 * TASK-1739 Slice 1 — Contrato canónico de procedencia de datos de Hiring.
 *
 * Responde UNA pregunta: **¿este dato representa a una persona/vacante del mundo real?**
 * Es ORTOGONAL a `source` (`public_careers|manual|referral|…`), que responde *por qué canal llegó*.
 * NUNCA agregar `synthetic`/`test` al CHECK de `source`: colapsaría dos preguntas distintas en una
 * columna y haría imposible saber por qué canal llegó un seed (mismo patrón con que Finance separó
 * `economic_category` de `expense_type`).
 *
 * Módulo PURO a propósito: sin IO, sin `server-only`. Lo consumen readers server-side, los CLIs de
 * marcado/purga, la señal de reliability y los tests. La escritura vive en los commands; acá sólo
 * viven el tipo, el predicado de filtro y la derivación.
 *
 * Contrato vinculante: `docs/tasks/in-progress/TASK-1739-hiring-synthetic-data-provenance.md`.
 */

/**
 * Enum cerrado. Los tres valores no-real se distinguen porque su CICLO DE VIDA y su política de
 * purga difieren — no por matiz semántico:
 * - `synthetic_seed`: fixture persistente de desarrollo (vive mientras viva el entorno).
 * - `smoke_test`: dato de una verificación puntual (no debería sobrevivir a su corrida).
 * - `demo`: dato para mostrar la plataforma (puede TENER que sobrevivir).
 */
export const HIRING_DATA_ORIGIN_VALUES = ['real', 'synthetic_seed', 'smoke_test', 'demo'] as const

export type HiringDataOrigin = (typeof HIRING_DATA_ORIGIN_VALUES)[number]

/** Default del dominio. Omitir la declaración deja el dato VISIBLE, jamás oculto (ver `isRealDataOrigin`). */
export const HIRING_DATA_ORIGIN_DEFAULT: HiringDataOrigin = 'real'

export const isHiringDataOrigin = (value: unknown): value is HiringDataOrigin =>
  typeof value === 'string' && (HIRING_DATA_ORIGIN_VALUES as readonly string[]).includes(value)

/**
 * `real` es el default y ESO es la mitigación principal de la task: un valor desconocido o ausente
 * se trata como real. Omitir la declaración produce suciedad (molesto y visible); el default
 * inverso produciría la desaparición silenciosa de un candidato real (grave e invisible).
 */
export const isRealDataOrigin = (value: unknown): boolean => !isHiringDataOrigin(value) || value === 'real'

export const isSyntheticDataOrigin = (value: unknown): boolean => !isRealDataOrigin(value)

/**
 * Fragmento SQL canónico del filtro. Ningún reader escribe su propio WHERE de procedencia.
 *
 * `alias` debe ser un alias de tabla controlado por el llamador (nunca input de usuario): se
 * interpola como identificador, no como valor.
 */
export const realOnlyPredicate = (alias: string): string => `${alias}.data_origin = 'real'`

/**
 * Precedencia para derivar `hiring_application.data_origin` desde sus DOS raíces (persona y vacante).
 *
 * Regla 1 — **gana el no-real**: una postulación de persona real a una vacante inventada no es
 * evidencia real, y viceversa.
 *
 * Regla 2 — cuando AMBAS raíces son no-real pero DISTINTAS, gana la MÁS PROTECTORA (mayor índice
 * acá abajo). La fila derivada nunca debe quedar sujeta a una política de purga más agresiva que la
 * de cualquiera de sus raíces: si una raíz es `demo` y debe sobrevivir, la derivada también.
 */
const SURVIVAL_PRECEDENCE: readonly HiringDataOrigin[] = ['smoke_test', 'synthetic_seed', 'demo']

const survivalRank = (value: HiringDataOrigin): number => {
  const index = SURVIVAL_PRECEDENCE.indexOf(value)

  return index === -1 ? -1 : index
}

/**
 * Deriva la procedencia de una `hiring_application` desde persona + vacante.
 *
 * ⚠️ Esta función es el ESPEJO EN TS del trigger `BEFORE INSERT OR UPDATE` que enforcea la misma
 * regla en la base. La base es la autoridad; esta copia existe para readers, tests y planificación
 * del backfill. Un live test de paridad debe probar que ambas coinciden — dos implementaciones de
 * la misma regla derivan si nadie las confronta.
 */
export const deriveApplicationDataOrigin = (
  personOrigin: unknown,
  openingOrigin: unknown
): HiringDataOrigin => {
  const person: HiringDataOrigin = isHiringDataOrigin(personOrigin) ? personOrigin : 'real'
  const opening: HiringDataOrigin = isHiringDataOrigin(openingOrigin) ? openingOrigin : 'real'

  if (person === 'real' && opening === 'real') return 'real'
  if (person === 'real') return opening
  if (opening === 'real') return person
  if (person === opening) return person

  return survivalRank(person) >= survivalRank(opening) ? person : opening
}
