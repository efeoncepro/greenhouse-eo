/**
 * Tender Proposal Studio — canonical state machine.
 *
 * Espejo del patrón `src/lib/release/state-machine.ts` (TASK-848): la state
 * machine TS es la fuente de verdad de las transiciones; la DB (futura
 * migración) la enforce con una CHECK constraint + trigger append-only, y este
 * guard TS la enforce en application code para fail-fast antes de tocar DB
 * (defense in depth).
 *
 * Spec canónico: `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §2.
 *
 * NOTA (2026-07-11): primer artefacto de construcción del Studio (status del
 * spec = Proposed). La migración `tenders` + CHECK constraint es el siguiente
 * ladrillo; hasta entonces este módulo es lógica pura testeable, sin DB.
 *
 * El test de paridad vive en `__tests__/tender-state-machine.test.ts`.
 */

/**
 * Estados canónicos del ciclo de vida de una licitación. Enum cerrado.
 * Mirror del diagrama §2 del spec.
 */
export const TENDER_STATES = [
  'intake', // ID creado + folder anclado + RFP ingerido
  'analyzing', // fan-out de lectura del RFP en curso
  'analyzed', // requisito-set + matriz de admisibilidad listos
  'fit_review', // esperando decisión humana bid/no-bid
  'declined', // no-bid (terminal)
  'producing', // diagnóstico · squad · pricing · redacción
  'base_ready', // técnica + económica base listas
  'packaging', // decks branded + económica adapter + otros docs
  'ready_to_submit', // admisibilidad ✅ + PDFs, esperando submit humano
  'submitted', // el humano subió a la plataforma
  // ⚠️ El vocabulario terminal es GENÉRICO a propósito (decisión 2026-07-12, ver bloque de arriba):
  // el aggregate es una PROPUESTA, y una venta directa no se "adjudica" — se gana o se pierde.
  // El texto que ve el usuario se resuelve por `origin`, no por el estado.
  'won', // ganada (terminal) — "Adjudicada" si origin=public_tender · "Ganada" si origin=direct_sales
  'lost' // perdida (terminal)
] as const

export type TenderState = (typeof TENDER_STATES)[number]

/**
 * Estados terminales: no admiten transición de salida. Para "reintentar" una
 * licitación declined/perdida, se crea un Tender nuevo (append-only), no se
 * reabre el terminal.
 */
export const TERMINAL_TENDER_STATES = ['declined', 'won', 'lost'] as const
export type TerminalTenderState = (typeof TERMINAL_TENDER_STATES)[number]

/**
 * Estados activos: el bid está vivo (aún se está trabajando o esperando
 * resultado). Todo lo que no es terminal.
 */
export const ACTIVE_TENDER_STATES = [
  'intake',
  'analyzing',
  'analyzed',
  'fit_review',
  'producing',
  'base_ready',
  'packaging',
  'ready_to_submit',
  'submitted'
] as const
export type ActiveTenderState = (typeof ACTIVE_TENDER_STATES)[number]

/**
 * Matriz canónica de transiciones permitidas. Mirror del diagrama §2:
 *
 *   intake → analyzing
 *   analyzing → analyzed
 *   analyzed → fit_review
 *   fit_review → producing | declined        (GATE HUMANO: bid/no-bid)
 *   producing → base_ready
 *   base_ready → packaging
 *   packaging → ready_to_submit
 *   ready_to_submit → submitted               (GATE HUMANO: el humano sube)
 *   submitted → won | lost
 *
 * Cualquier transición fuera de esta tabla es bug: `assertValidTenderStateTransition`
 * la throw fail-loud antes de tocar DB.
 */
export const TENDER_TRANSITION_MATRIX: Readonly<Record<TenderState, readonly TenderState[]>> = {
  intake: ['analyzing'],
  analyzing: ['analyzed'],
  analyzed: ['fit_review'],
  fit_review: ['producing', 'declined'],
  producing: ['base_ready'],
  base_ready: ['packaging'],
  packaging: ['ready_to_submit'],
  ready_to_submit: ['submitted'],
  submitted: ['won', 'lost'],
  declined: [],
  won: [],
  lost: []
}

/**
 * Transiciones que requieren confirmación HUMANA explícita (`propose → confirm →
 * execute`): el LLM nunca las cruza solo (invariante §7/§8 del spec). Se
 * representan como `from→to`.
 *
 * - `fit_review→producing` / `fit_review→declined`: decisión bid/no-bid.
 * - `ready_to_submit→submitted`: el humano sube y firma.
 *
 * (Los gates intra-fase — precio final, declaraciones sensibles — NO son
 * transiciones de estado; se enforce dentro de `producing`/`packaging`.)
 */
export const HUMAN_GATE_TRANSITIONS: ReadonlySet<string> = new Set([
  'fit_review→producing',
  'fit_review→declined',
  'ready_to_submit→submitted'
])

const transitionKey = (from: TenderState, to: TenderState): string => `${from}→${to}`

/**
 * Verifica que una transición `from → to` está permitida en la matriz canónica.
 */
export const isValidTenderStateTransition = (from: TenderState, to: TenderState): boolean => {
  return TENDER_TRANSITION_MATRIX[from].includes(to)
}

/**
 * ¿Esta transición requiere confirmación humana explícita?
 */
export const requiresHumanGate = (from: TenderState, to: TenderState): boolean => {
  return HUMAN_GATE_TRANSITIONS.has(transitionKey(from, to))
}

export class InvalidTenderStateTransitionError extends Error {
  constructor(
    public readonly fromState: TenderState,
    public readonly toState: TenderState,
    public readonly tenderId?: string
  ) {
    const allowed = TENDER_TRANSITION_MATRIX[fromState].join(', ') || '(none, terminal)'
    const tenderDescriptor = tenderId ? ` tenderId=${tenderId}` : ''

    super(
      `Invalid tender state transition from='${fromState}' to='${toState}'${tenderDescriptor}. Allowed from='${fromState}': ${allowed}.`
    )
    this.name = 'InvalidTenderStateTransitionError'
  }
}

/**
 * Application guard fail-loud. Llamar ANTES de cualquier UPDATE de
 * `tenders.state` o INSERT en `tender_state_transitions`.
 *
 * Patrón canónico (mirror `assertValidReleaseStateTransition`, TASK-848).
 */
export const assertValidTenderStateTransition = (
  from: TenderState,
  to: TenderState,
  tenderId?: string
): void => {
  if (!isValidTenderStateTransition(from, to)) {
    throw new InvalidTenderStateTransitionError(from, to, tenderId)
  }
}

/**
 * Type guard: ¿es un TenderState válido?
 */
export const isTenderState = (value: unknown): value is TenderState => {
  return typeof value === 'string' && (TENDER_STATES as readonly string[]).includes(value)
}

export const isTerminalTenderState = (state: TenderState): state is TerminalTenderState => {
  return (TERMINAL_TENDER_STATES as readonly string[]).includes(state)
}

export const isActiveTenderState = (state: TenderState): state is ActiveTenderState => {
  return (ACTIVE_TENDER_STATES as readonly string[]).includes(state)
}
