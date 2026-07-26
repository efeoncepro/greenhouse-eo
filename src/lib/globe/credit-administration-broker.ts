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

export type GlobeCreditFundingActor = Readonly<{
  /** Identidad de Greenhouse, resuelta de la sesión server-side. NUNCA viene del cliente. */
  userId: string
  /** El entitlement con el que actúa, para que la evidencia diga con qué autoridad se aprobó. */
  entitlement: string
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
    | 'globe_unavailable'

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
          proposedBy: { principalId: input.actor.userId, entitlement: input.actor.entitlement }
        },
        {
          workspaceId: input.globeWorkspaceId,
          idempotencyKey: input.idempotencyKey,
          correlationId
        }
      )
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

  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  return dispatch(() =>
    client.dispatchCommand(
      CONFIRM_COMMAND,
      {
        proposalId: input.proposalId,
        fingerprint: input.fingerprint,
        confirmedBy: { principalId: input.actor.userId, entitlement: input.actor.entitlement }
      },
      {
        workspaceId: input.globeWorkspaceId,
        idempotencyKey: input.idempotencyKey,
        correlationId
      }
    )
  )
}

async function dispatch<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch {
    // El detalle del upstream NUNCA cruza: puede traer saldos, política o prosa del proveedor. El
    // código dice que Globe no respondió; el diagnóstico vive en sus logs, del lado del servidor.
    throw new GlobeCreditFundingBrokerError('globe_unavailable')
  }
}

async function readProposedIntent(
  globeWorkspaceId: string,
  proposalId: string
): Promise<Readonly<{ actorUserId: string; plan: unknown }> | undefined> {
  const rows = await query<{ actor_user_id: string; plan: unknown }>(
    `SELECT actor_user_id, plan
       FROM greenhouse_core.globe_credit_funding_intents
      WHERE globe_workspace_id = $1 AND proposal_id = $2 AND phase = 'proposed'
      LIMIT 1`,
    [globeWorkspaceId, proposalId]
  )

  const row = rows[0]

  return row ? { actorUserId: row.actor_user_id, plan: row.plan } : undefined
}

async function recordIntent(
  input: Readonly<{
    globeWorkspaceId: string
    proposalId: string
    phase: 'proposed' | 'confirmed'
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
         (globe_workspace_id, proposal_id, phase, actor_user_id, actor_entitlement,
          proposed_by_user_id, plan_fingerprint, plan, correlation_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.globeWorkspaceId,
        input.proposalId,
        input.phase,
        input.actor.userId,
        input.actor.entitlement,
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

    if (message.includes('globe_credit_funding_intents_confirmer_not_proposer')) {
      throw new GlobeCreditFundingBrokerError('confirmer_is_proposer')
    }

    if (message.includes('globe_credit_funding_intents')) {
      throw new GlobeCreditFundingBrokerError('already_recorded')
    }

    throw error
  }
}
