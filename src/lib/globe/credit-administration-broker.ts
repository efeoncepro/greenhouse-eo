import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

import { createGreenhouseGlobeClient, type GreenhouseGlobeClientDependencies } from './client'

/**
 * Broker del carril gobernado de fondeo de crédito de Globe (TASK-1566 / ADR-015 Slice 5).
 *
 * ¿Por qué existe del lado de Greenhouse y no como un comando más de Globe?
 *
 * Globe ya tiene `propose`/`confirm` y su propia máquina de estados, pero su
 * `assertHumanAttribution` es **shape-only**: rechaza `globe:service:` y exige un entitlement no
 * vacío, y **no puede** verificar que la atribución humana venga de una sesión autenticada, porque
 * Globe no tiene las sesiones. Sin este broker, el caller de workload que Greenhouse puede asumir
 * confirmaría con una atribución humana **fabricada** — el mismo maker-checker vacuo que ADR-015
 * documenta, movido un nivel.
 *
 * Acá la atribución se vuelve exigible: sale de la sesión del operador, se persiste append-only, y
 * la disyunción confirmante ≠ proponente la impone un `CHECK` en la base, no una convención.
 *
 * **NUNCA** un cliente paralelo: reusa `createGreenhouseGlobeClient`, que es el único seam con
 * credenciales, audiencia y reintentos gobernados.
 */

const PROPOSE_COMMAND = 'globe.credits.month.fund.propose'
const CONFIRM_COMMAND = 'globe.credits.month.fund.confirm'

/**
 * Razón del asiento, del vocabulario de Globe. Coincide con la que su `confirm` estampa en el grant
 * (`reasonCode: 'month_funding'`): dos vocabularios para el mismo hecho harían que el ledger se lea
 * distinto según por dónde entró.
 */
const FUNDING_REASON_CODE = 'month_funding'

/**
 * `sourceId` deriva de la clave de idempotencia, y eso NO es cosmético: el `fingerprint` de la
 * propuesta se calcula sobre el payload completo salvo `proposedBy`, así que un `sourceId` con
 * `Date.now()` o un UUID daría un fingerprint distinto en cada intento y el replay idempotente
 * dejaría de serlo justo en el camino del dinero.
 */
const fundingSourceId = (idempotencyKey: string) => `greenhouse:${idempotencyKey}`

export type GlobeCreditFundingActor = Readonly<{
  /** Identidad de Greenhouse, resuelta de la sesión server-side. NUNCA viene del cliente. */
  userId: string
  /** El entitlement con el que actúa, para que la evidencia diga con qué autoridad se aprobó. */
  entitlement: string
  /** Proveniencia autenticada de la sesión; gobierna la delegación de agentes. */
  authMode: string
}>

export type GlobeCreditFundingProposeInput = Readonly<{
  globeWorkspaceId: string
  poolId: string
  grantCredits: number
  monthlyCap?: number
  periodStart: string
  periodEnd: string
  actor: GlobeCreditFundingActor
  idempotencyKey: string
  correlationId?: string
}>

export type GlobeCreditFundingConfirmInput = Readonly<{
  globeWorkspaceId: string
  proposalId: string
  fingerprint: string
  actor: GlobeCreditFundingActor
  idempotencyKey: string
  correlationId?: string
}>

export class GlobeCreditFundingBrokerError extends Error {
  readonly code:
    | 'proposal_not_found'
    | 'confirmer_is_proposer'
    | 'already_recorded'
    | 'agent_confirmation_forbidden'
    | 'agent_funding_limit_exceeded'
    | 'fingerprint_mismatch'
    | 'actor_auth_mode_not_allowed'
    | 'globe_unavailable'
    /** Globe respondió 4xx: negó la operación. Estructural — reintentar no la resuelve. */
    | 'rejected_by_globe'

  constructor(code: GlobeCreditFundingBrokerError['code']) {
    super(code)
    this.name = 'GlobeCreditFundingBrokerError'
    this.code = code
  }
}

/**
 * Propone un plan de fondeo. **No muta nada en Globe** — devuelve el plan para que un humano lo
 * revise, y deja la intención registrada.
 *
 * Un agente puede llegar hasta acá; confirmar es de una persona.
 */
export async function proposeGlobeCreditFunding(
  input: GlobeCreditFundingProposeInput,
  dependencies: GreenhouseGlobeClientDependencies = {}
): Promise<Readonly<{ proposalId: string; fingerprint: string; plan: unknown }>> {
  const correlationId = input.correlationId ?? randomUUID()
  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  const outcome = await dispatch(
    () =>
      client.dispatchCommand(
        PROPOSE_COMMAND,
        {
          poolId: input.poolId,
          grantCredits: input.grantCredits,
          ...(input.monthlyCap === undefined ? {} : { monthlyCap: input.monthlyCap }),
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          // `sourceId` y `reasonCode` son OBLIGATORIOS en `parsePropose` de Globe. Omitirlos hacía
          // que cada `propose` muriera en un `400 invalid_request` — medido en staging el
          // 2026-07-26, la primera vez que el puente Vercel→Globe estuvo vivo para acusarlo.
          sourceId: fundingSourceId(input.idempotencyKey),
          reasonCode: FUNDING_REASON_CODE,
          // `at` también es obligatorio: `attribution()` lo exige como ISO. La evidencia dice
          // CUÁNDO se propuso, no sólo quién.
          proposedBy: {
            principalId: input.actor.userId,
            entitlement: input.actor.entitlement,
            at: new Date().toISOString()
          }
        },
        {
          workspaceId: input.globeWorkspaceId,
          idempotencyKey: input.idempotencyKey,
          correlationId
        }
      ),
    'propose'
  )

  // El SDK devuelve un SOBRE (`{schemaVersion, command, status, …, outcome}`); la propuesta vive en
  // `outcome`. Leer el sobre como si fuera el resultado es cómo se llega a un `proposalId` undefined
  // que recién falla al confirmar.
  const proposal = outcome.outcome as Readonly<{
    proposalId: string
    fingerprint: string
    plan: unknown
  }>

  await recordIntent({
    globeWorkspaceId: input.globeWorkspaceId,
    proposalId: proposal.proposalId,
    phase: 'proposed',
    actor: input.actor,
    planFingerprint: proposal.fingerprint,
    plan: proposal.plan,
    correlationId,
    idempotencyKey: input.idempotencyKey
  })

  return proposal
}

/**
 * Confirma un plan propuesto. **Único punto que dispara la mutación en Globe.**
 *
 * El orden importa y no es intercambiable: la intención se registra **ANTES** de despachar. Si se
 * registrara después, un fallo entre la mutación y el registro dejaría dinero movido sin evidencia
 * de quién lo aprobó — y esa evidencia es justamente lo que este carril existe para producir. Al
 * revés, un fallo posterior al registro deja una intención sin mutación, que es visible y reversible.
 */
export async function confirmGlobeCreditFunding(
  input: GlobeCreditFundingConfirmInput,
  dependencies: GreenhouseGlobeClientDependencies = {}
): Promise<unknown> {
  const correlationId = input.correlationId ?? randomUUID()
  const proposed = await readProposedIntent(input.globeWorkspaceId, input.proposalId)

  if (!proposed) throw new GlobeCreditFundingBrokerError('proposal_not_found')

  if (input.fingerprint !== proposed.planFingerprint) {
    throw new GlobeCreditFundingBrokerError('fingerprint_mismatch')
  }

  let decision = await readConfirmationDecision(input.globeWorkspaceId, input.proposalId)

  if (decision?.terminalPhase === 'completed') return decision.outcome

  if (decision?.terminalPhase === 'confirm_failed') {
    throw new GlobeCreditFundingBrokerError('rejected_by_globe')
  }

  if (decision) {
    if (
      decision.actorUserId !== input.actor.userId ||
      decision.actorAuthMode !== input.actor.authMode ||
      decision.planFingerprint !== input.fingerprint
    ) {
      throw new GlobeCreditFundingBrokerError('already_recorded')
    }
  } else {
    try {
      await recordIntent({
        globeWorkspaceId: input.globeWorkspaceId,
        proposalId: input.proposalId,
        phase: 'confirmed',
        actor: input.actor,
        proposedByUserId: proposed.actorUserId,
        planFingerprint: input.fingerprint,
        plan: proposed.plan,
        correlationId,
        idempotencyKey: input.idempotencyKey
      })
    } catch (error) {
      if (!(error instanceof GlobeCreditFundingBrokerError) || error.code !== 'already_recorded') throw error

      decision = await readConfirmationDecision(input.globeWorkspaceId, input.proposalId)

      if (
        !decision ||
        decision.actorUserId !== input.actor.userId ||
        decision.actorAuthMode !== input.actor.authMode ||
        decision.planFingerprint !== input.fingerprint ||
        decision.idempotencyKey !== input.idempotencyKey
      ) {
        throw error
      }
    }
  }

  if (decision?.terminalPhase === 'completed') return decision.outcome

  if (decision?.terminalPhase === 'confirm_failed') {
    throw new GlobeCreditFundingBrokerError('rejected_by_globe')
  }

  const dispatchIdempotencyKey = decision?.idempotencyKey ?? input.idempotencyKey

  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  try {
    const outcome = await dispatch(
      () =>
        client.dispatchCommand(
          CONFIRM_COMMAND,
          {
            proposalId: input.proposalId,
            fingerprint: input.fingerprint,
            // Mismo contrato que `proposedBy`: `attribution()` exige `at`. Sin él, el `confirm` moría
            // en `400 invalid_request` — y como el broker colapsaba todo a `globe_unavailable`, se
            // leía como "Globe no respondió" cuando Globe respondía perfectamente que el payload
            // estaba incompleto.
            confirmedBy: {
              principalId: input.actor.userId,
              entitlement: input.actor.entitlement,
              at: new Date().toISOString()
            }
          },
          {
            workspaceId: input.globeWorkspaceId,
            idempotencyKey: dispatchIdempotencyKey,
            correlationId
          }
        ),
      'confirm'
    )

    await recordTerminalIntent({
      globeWorkspaceId: input.globeWorkspaceId,
      proposalId: input.proposalId,
      phase: 'completed',
      actor: input.actor,
      proposedByUserId: proposed.actorUserId,
      planFingerprint: input.fingerprint,
      plan: proposed.plan,
      outcome,
      correlationId,
      idempotencyKey: dispatchIdempotencyKey
    })

    return outcome
  } catch (error) {
    if (error instanceof GlobeCreditFundingBrokerError && error.code === 'rejected_by_globe') {
      await recordTerminalIntent({
        globeWorkspaceId: input.globeWorkspaceId,
        proposalId: input.proposalId,
        phase: 'confirm_failed',
        actor: input.actor,
        proposedByUserId: proposed.actorUserId,
        planFingerprint: input.fingerprint,
        plan: proposed.plan,
        outcome: { code: 'rejected_by_globe' },
        correlationId,
        idempotencyKey: dispatchIdempotencyKey
      })
    }

    throw error
  }
}

async function dispatch<T>(operation: () => Promise<T>, phase: 'propose' | 'confirm'): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    /*
     * El detalle del upstream NUNCA cruza al caller: puede traer saldos, política o prosa del
     * proveedor. Pero el SERVIDOR sí necesita saber qué falló — y esta es la octava aparición del
     * mismo defecto que ISSUE-127 documenta, cometida acá mismo: la primera versión de este `catch`
     * no dejaba rastro alguno, y medido en vivo el 2026-07-26 fue imposible diagnosticar un `503`
     * propio desde el servidor. Una sanitización sin contraparte de observabilidad no protege
     * información: la destruye.
     *
     * Se emite el NOMBRE del error y la fase, JAMÁS su `message`, su `stack` ni el body del upstream:
     * un fallo de credenciales trae el correo de la identidad, y un fallo de Globe puede traer saldo.
     */
    /*
     * El `status` y el `code` del SDK sí cruzan al log: son un enum cerrado del transporte, no
     * prosa del upstream. Son justamente lo que faltaba para distinguir "Globe no respondió" de
     * "Globe respondió que el payload está incompleto" — dos condiciones que la primera versión
     * colapsaba en la misma, y que el 2026-07-26 costó tres vueltas de diagnóstico.
     */
    const sdk = asGlobeSdkError(error)

    console.error(
      JSON.stringify({
        event: 'greenhouse.globe_credit_funding.dispatch_failed',
        phase,
        errorName: error instanceof Error ? error.name : typeof error,
        ...(sdk === undefined ? {} : { status: sdk.status, sdkCode: sdk.code })
      })
    )

    /*
     * Un 4xx de Globe es una NEGACIÓN, no una indisponibilidad: reintentar no la resuelve, y
     * decirle al operador "inténtalo de nuevo en unos segundos" lo manda a insistir contra una
     * pared. Es el mismo defecto de actionability que `globe_not_configured` cerró en las rutas.
     */
    if (sdk !== undefined && sdk.status !== undefined && sdk.status >= 400 && sdk.status < 500) {
      throw new GlobeCreditFundingBrokerError('rejected_by_globe')
    }

    throw new GlobeCreditFundingBrokerError('globe_unavailable')
  }
}

async function readProposedIntent(
  globeWorkspaceId: string,
  proposalId: string
): Promise<Readonly<{ actorUserId: string; planFingerprint: string; plan: unknown }> | undefined> {
  const rows = await query<{ actor_user_id: string; plan_fingerprint: string; plan: unknown }>(
    `SELECT actor_user_id, plan_fingerprint, plan
       FROM greenhouse_core.globe_credit_funding_intents
      WHERE globe_workspace_id = $1 AND proposal_id = $2 AND phase = 'proposed'
      LIMIT 1`,
    [globeWorkspaceId, proposalId]
  )

  const row = rows[0]

  return row ? { actorUserId: row.actor_user_id, planFingerprint: row.plan_fingerprint, plan: row.plan } : undefined
}

async function readConfirmationDecision(globeWorkspaceId: string, proposalId: string) {
  const rows = await query<{
    phase: 'confirmed' | 'completed' | 'confirm_failed'
    actor_user_id: string
    actor_auth_mode: string
    plan_fingerprint: string
    plan: unknown
    idempotency_key: string
  }>(
    `SELECT phase, actor_user_id, actor_auth_mode, plan_fingerprint, plan, idempotency_key
       FROM greenhouse_core.globe_credit_funding_intents
      WHERE globe_workspace_id = $1
        AND proposal_id = $2
        AND phase IN ('confirmed', 'completed', 'confirm_failed')
      ORDER BY CASE phase WHEN 'completed' THEN 1 WHEN 'confirm_failed' THEN 2 ELSE 3 END
      LIMIT 1`,
    [globeWorkspaceId, proposalId]
  )

  const row = rows[0]

  if (!row) return undefined

  const plan = row.plan && typeof row.plan === 'object' ? (row.plan as Record<string, unknown>) : {}

  return {
    actorUserId: row.actor_user_id,
    actorAuthMode: row.actor_auth_mode,
    planFingerprint: row.plan_fingerprint,
    idempotencyKey: row.idempotency_key.replace(/^terminal:(?:completed|confirm_failed):/, ''),
    terminalPhase: row.phase === 'confirmed' ? undefined : row.phase,
    outcome: row.phase === 'completed' ? plan.confirmationOutcome : undefined
  } as const
}

async function recordIntent(
  input: Readonly<{
    globeWorkspaceId: string
    proposalId: string
    phase: 'proposed' | 'confirmed' | 'completed' | 'confirm_failed'
    actor: GlobeCreditFundingActor
    proposedByUserId?: string
    planFingerprint: string
    plan: unknown
    correlationId: string
    idempotencyKey: string
  }>
): Promise<void> {
  try {
    await query(
      `INSERT INTO greenhouse_core.globe_credit_funding_intents
         (globe_workspace_id, proposal_id, phase, actor_user_id, actor_entitlement, actor_auth_mode,
          proposed_by_user_id, plan_fingerprint, plan, correlation_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        input.globeWorkspaceId,
        input.proposalId,
        input.phase,
        input.actor.userId,
        input.actor.entitlement,
        input.actor.authMode,
        input.proposedByUserId ?? null,
        input.planFingerprint,
        JSON.stringify(input.plan ?? {}),
        input.correlationId,
        input.idempotencyKey
      ]
    )
  } catch (error) {
    // El CHECK de confirmante ≠ proponente y los UNIQUE son la autoridad: se traducen a códigos
    // accionables en vez de propagar el error de Postgres, que llevaría detalle de esquema.
    const message = error instanceof Error ? error.message : ''

    if (
      message.includes('globe_credit_funding_intents_confirmer_not_proposer') ||
      message.includes('globe_credit_funding_second_confirmer_required')
    ) {
      throw new GlobeCreditFundingBrokerError('confirmer_is_proposer')
    }

    if (message.includes('globe_credit_funding_agent_confirmation_forbidden')) {
      throw new GlobeCreditFundingBrokerError('agent_confirmation_forbidden')
    }

    if (message.includes('globe_credit_funding_agent_limit_exceeded')) {
      throw new GlobeCreditFundingBrokerError('agent_funding_limit_exceeded')
    }

    if (
      message.includes('globe_credit_funding_intent_actor_must_be_authenticated_user') ||
      message.includes('globe_credit_funding_intent_auth_mode_not_allowed')
    ) {
      throw new GlobeCreditFundingBrokerError('actor_auth_mode_not_allowed')
    }

    if (message.includes('globe_credit_funding_intents')) {
      throw new GlobeCreditFundingBrokerError('already_recorded')
    }

    throw error
  }
}

async function recordTerminalIntent(
  input: Readonly<{
    globeWorkspaceId: string
    proposalId: string
    phase: 'completed' | 'confirm_failed'
    actor: GlobeCreditFundingActor
    proposedByUserId: string
    planFingerprint: string
    plan: unknown
    outcome: unknown
    correlationId: string
    idempotencyKey: string
  }>
) {
  try {
    await recordIntent({
      ...input,
      plan: {
        ...(input.plan && typeof input.plan === 'object' ? (input.plan as Record<string, unknown>) : {}),
        confirmationOutcome: input.outcome
      },
      idempotencyKey: `terminal:${input.phase}:${input.idempotencyKey}`
    })
  } catch (error) {
    if (error instanceof GlobeCreditFundingBrokerError && error.code === 'already_recorded') return
    throw error
  }
}

/** Estrecha el error del SDK sin importar su clase: el paquete es del repo hermano. */
function asGlobeSdkError(error: unknown): Readonly<{ status: number | undefined; code: string }> | undefined {
  if (!(error instanceof Error) || error.name !== 'GlobeSdkError') return undefined

  const candidate = error as Error & { status?: unknown; code?: unknown }
  const status = typeof candidate.status === 'number' ? candidate.status : undefined
  const code = typeof candidate.code === 'string' ? candidate.code : 'unknown'

  return { status, code }
}
