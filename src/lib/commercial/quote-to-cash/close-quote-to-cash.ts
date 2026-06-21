import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { query, withTransaction } from '@/lib/db'

import {
  claimCommandExecution,
  completeCommandExecution,
  computeRequestFingerprint,
  failCommandExecution,
  incrementReplayCount,
  IDEMPOTENCY_TTL_MS,
  loadCommandExecutionByKey,
  resolveIdempotencyDecision
} from '@/lib/api-platform/core/idempotency'

import { convertQuoteToCash } from '@/lib/commercial/party/commands/convert-quote-to-cash'
import {
  QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP,
  type ConversionTriggeredBy
} from '@/lib/commercial/party/commands/convert-quote-to-cash-types'
import {
  completeOperation,
  startCorrelatedOperation
} from '@/lib/commercial/party/commands/commercial-operations-audit'
import {
  ensureIncomeFromQuotation
} from '@/lib/finance/quote-to-cash/materialize-invoice-from-quotation'
import { ensureIncomeFromHes } from '@/lib/finance/quote-to-cash/materialize-invoice-from-hes'

import { CONTRACT_ONLY_SLA_DAYS, isQ2cContractOnlyEnabled } from './flags'

/**
 * TASK-1206 — Comando canónico de cierre Quote-to-Cash.
 *
 * SSOT del cierre Q2C: compone los primitives existentes en UNA operación gobernada que la UI,
 * las rutas y los futuros agentes/API Platform consumen. No copia SQL de los materializers ni
 * del substrate; orquesta.
 *
 * Postura de atomicidad (decisión del operador, ADR de la task):
 * **income idempotente PRIMERO → convertir DESPUÉS** (NO una sola tx compartida que toque
 * primitives compartidos). Así NUNCA queda una cotización `converted` sin income (AR faltante):
 *  1. Si la estrategia requiere income, se materializa de forma IDEMPOTENTE (lookup income
 *     existente ANTES de insertar; replay devuelve el incomeId previo, NUNCA un segundo AR).
 *  2. RECIÉN DESPUÉS `convertQuoteToCash` (substrate: audit Q2C + contrato + party + marca
 *     `converted` + enlaza `converted_to_income_id` + eventos). Si el income falla, la quote
 *     sigue `issued` (recuperable); si el convert falla, el income queda pero la quote sigue
 *     `issued` y un replay lo retoma.
 *
 * Idempotencia global vía el ledger canónico `api_platform_command_executions` (sin migración,
 * patrón TASK-1212): replay con el mismo `idempotencyKey` devuelve el resultado previo. Los
 * primitives subyacentes son idempotentes por construcción, así que un replay SIN key también es
 * seguro (defensa en profundidad).
 */

// ── Public contract ─────────────────────────────────────────

export type CloseQuoteToCashStrategy = 'simple_invoice' | 'enterprise_hes' | 'contract_only'

export interface CloseQuoteToCashActor {
  userId: string
  tenantScope: string
  name?: string | null
}

export interface CloseQuoteToCashInput {
  quotationId: string
  strategy: CloseQuoteToCashStrategy
  /** Sujeto de autorización (capability). Identidad SIEMPRE del caller, nunca del payload. */
  subject: TenantEntitlementSubject
  actor: CloseQuoteToCashActor
  dueDate?: string | null
  /** Requerido para `enterprise_hes`. */
  sourceHesId?: string | null
  /** Requerido para `contract_only` (queda auditado como motivo de la suspensión). */
  reason?: string | null
  conversionTriggeredBy?: ConversionTriggeredBy
  /** Camino de aprobación resuelta — solo el flujo gobernado debe pasarlo. */
  skipApprovalGate?: boolean
  idempotencyKey?: string | null
  correlationId?: string | null
}

export interface CloseQuoteToCashResult {
  operationId: string
  correlationId: string
  quotationId: string
  strategy: CloseQuoteToCashStrategy
  finalState: 'converted' | 'suspended'
  contractId: string | null
  incomeId: string | null
  clientId: string | null
  organizationId: string | null
  hubspotDealId: string | null
  totalAmountClp: number
  requiresApproval: boolean
  approvalId: string | null
  replayed: boolean
}

export type CloseQuoteToCashErrorCode =
  | 'forbidden'
  | 'invalid_input'
  | 'quotation_not_found'
  | 'quotation_not_convertible'
  | 'missing_organization'
  | 'missing_hes'
  | 'contract_only_disabled'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'

export class CloseQuoteToCashError extends Error {
  code: CloseQuoteToCashErrorCode
  statusCode: number
  /** true cuando reintentar puede resolver (in_progress); false para causas estructurales. */
  actionable: boolean

  constructor(code: CloseQuoteToCashErrorCode, message: string, statusCode = 422, actionable = false) {
    super(message)
    this.name = 'CloseQuoteToCashError'
    this.code = code
    this.statusCode = statusCode
    this.actionable = actionable
  }
}

// ── Quote close context (read) ──────────────────────────────

interface QuotationCloseContextRow extends Record<string, unknown> {
  quotation_id: string
  status: string
  organization_id: string | null
  client_id: string | null
  hubspot_deal_id: string | null
  converted_to_income_id: string | null
  total_amount_clp: string | number | null
  total_amount: string | number | null
}

interface QuotationCloseContext {
  quotationId: string
  status: string
  organizationId: string | null
  clientId: string | null
  hubspotDealId: string | null
  convertedToIncomeId: string | null
  totalAmountClp: number
}

const CONVERTIBLE_STATUSES = new Set(['issued', 'sent', 'approved', 'converted'])

const toNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const readQuotationCloseContext = async (quotationId: string): Promise<QuotationCloseContext | null> => {
  const rows = await query<QuotationCloseContextRow>(
    `SELECT quotation_id, status, organization_id, client_id, hubspot_deal_id,
            converted_to_income_id, total_amount_clp, total_amount
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
       LIMIT 1`,
    [quotationId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    quotationId: row.quotation_id,
    status: row.status,
    organizationId: row.organization_id,
    clientId: row.client_id,
    hubspotDealId: row.hubspot_deal_id,
    convertedToIncomeId: row.converted_to_income_id,
    totalAmountClp: toNum(row.total_amount_clp) || toNum(row.total_amount)
  }
}

// ── contract_only (suspended, never terminal) ───────────────

const runContractOnly = async (
  input: CloseQuoteToCashInput,
  context: QuotationCloseContext
): Promise<CloseQuoteToCashResult> => {
  if (!isQ2cContractOnlyEnabled()) {
    throw new CloseQuoteToCashError(
      'contract_only_disabled',
      'La estrategia contract_only está deshabilitada. Requiere el flag COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED.',
      409
    )
  }

  const reason = input.reason?.trim()

  if (!reason) {
    throw new CloseQuoteToCashError(
      'invalid_input',
      'contract_only requiere un reason que justifique la suspensión (deal sin AR todavía).'
    )
  }

  if (!context.organizationId) {
    throw new CloseQuoteToCashError('missing_organization', 'La cotización no tiene organización; no se puede cerrar Q2C.', 409)
  }

  // Suspensión observable: audit `status='suspended'` con reason + SLA. NUNCA marca la
  // cotización `converted` (eso sería un deal ganado sin AR = revenue leakage). El signal
  // `contract_only_sla_breach` detecta suspensiones más allá del SLA.
  const { operationId, correlationId } = await withTransaction(async client => {
    const started = await startCorrelatedOperation(client, {
      correlationId: input.correlationId,
      operationType: 'quote_to_cash',
      triggerSource: input.conversionTriggeredBy ?? 'operator',
      actorUserId: input.actor.userId,
      tenantScope: input.actor.tenantScope,
      quotationId: context.quotationId,
      organizationId: context.organizationId,
      hubspotDealId: context.hubspotDealId,
      totalAmountClp: context.totalAmountClp,
      metadata: { strategy: 'contract_only', reason, slaDays: CONTRACT_ONLY_SLA_DAYS }
    })

    await completeOperation(client, started.operationId, {
      status: 'suspended',
      metadataPatch: { suspendedReason: reason, slaDays: CONTRACT_ONLY_SLA_DAYS }
    })

    return started
  })

  return {
    operationId,
    correlationId,
    quotationId: context.quotationId,
    strategy: 'contract_only',
    finalState: 'suspended',
    contractId: null,
    incomeId: null,
    clientId: context.clientId,
    organizationId: context.organizationId,
    hubspotDealId: context.hubspotDealId,
    totalAmountClp: context.totalAmountClp,
    requiresApproval: false,
    approvalId: null,
    replayed: false
  }
}

// ── income-requiring strategies (simple_invoice / enterprise_hes) ────

const runIncomeClose = async (
  input: CloseQuoteToCashInput,
  context: QuotationCloseContext
): Promise<CloseQuoteToCashResult> => {
  // Pre-gate de aprobación: si supera el umbral y no es el camino de aprobación resuelta,
  // dejamos que el substrate persista el `pending_approval` audit y lance — ANTES de
  // materializar income (NUNCA AR antes de la aprobación). convertQuoteToCash es la fuente
  // única del gate; aquí solo decidimos no materializar income todavía.
  const needsApprovalGate =
    context.totalAmountClp > QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP && !input.skipApprovalGate

  if (needsApprovalGate) {
    // Lanza QuoteToCashApprovalRequiredError (mapeado a 202 en la ruta). No materializa income.
    await convertQuoteToCash({
      quotationId: context.quotationId,
      conversionTriggeredBy: input.conversionTriggeredBy ?? 'operator',
      correlationId: input.correlationId,
      skipApprovalGate: false,
      actor: input.actor
    })

    // convertQuoteToCash sin skip y sobre umbral SIEMPRE lanza; este return es defensivo.
    throw new CloseQuoteToCashError('quotation_not_convertible', 'Q2C requiere aprobación.', 409)
  }

  // 1) income idempotente PRIMERO (no marca converted, contract_id NULL).
  const income =
    input.strategy === 'enterprise_hes'
      ? await ensureIncomeFromHes({
          hesId: (input.sourceHesId ?? '').trim(),
          actor: { userId: input.actor.userId, name: input.actor.name ?? input.actor.userId },
          dueDate: input.dueDate ?? null
        })
      : await ensureIncomeFromQuotation({
          quotationId: context.quotationId,
          actor: { userId: input.actor.userId, name: input.actor.name ?? input.actor.userId },
          dueDate: input.dueDate ?? null
        })

  // 2) convertir DESPUÉS (substrate: audit + contrato + party + converted + enlace income).
  //    skipApprovalGate=true: el gate ya lo evaluó este orquestador arriba.
  const convert = await convertQuoteToCash({
    quotationId: context.quotationId,
    conversionTriggeredBy: input.conversionTriggeredBy ?? 'operator',
    correlationId: input.correlationId,
    skipApprovalGate: true,
    incomeId: income.incomeId,
    actor: input.actor
  })

  return {
    operationId: convert.operationId,
    correlationId: convert.correlationId,
    quotationId: context.quotationId,
    strategy: input.strategy,
    finalState: 'converted',
    contractId: convert.contractId,
    incomeId: convert.incomeId ?? income.incomeId,
    clientId: convert.clientId ?? context.clientId,
    organizationId: convert.organizationId ?? context.organizationId,
    hubspotDealId: convert.hubspotDealId ?? context.hubspotDealId,
    totalAmountClp: income.totalAmountClp || context.totalAmountClp,
    requiresApproval: false,
    approvalId: null,
    replayed: false
  }
}

// ── Orchestrator core (no idempotency wrapper) ──────────────

const executeClose = async (input: CloseQuoteToCashInput): Promise<CloseQuoteToCashResult> => {
  if (!can(input.subject, 'commercial.quote_to_cash.execute', 'approve', 'tenant')) {
    throw new CloseQuoteToCashError('forbidden', 'No tienes permiso para cerrar Quote-to-Cash.', 403)
  }

  const quotationId = input.quotationId?.trim()

  if (!quotationId) {
    throw new CloseQuoteToCashError('invalid_input', 'quotationId es obligatorio.')
  }

  if (input.strategy === 'enterprise_hes' && !input.sourceHesId?.trim()) {
    throw new CloseQuoteToCashError('missing_hes', 'enterprise_hes requiere sourceHesId.')
  }

  const context = await readQuotationCloseContext(quotationId)

  if (!context) {
    throw new CloseQuoteToCashError('quotation_not_found', `Quotation ${quotationId} no existe.`, 404)
  }

  if (!CONVERTIBLE_STATUSES.has(context.status)) {
    throw new CloseQuoteToCashError(
      'quotation_not_convertible',
      `Quotation ${quotationId} está en estado '${context.status}'. Solo 'issued'/'sent'/'approved' pueden cerrar Q2C.`,
      409
    )
  }

  if (input.strategy === 'contract_only') {
    return runContractOnly(input, context)
  }

  return runIncomeClose(input, context)
}

// ── Public entrypoint (idempotency wrapper) ─────────────────

export const closeQuoteToCash = async (input: CloseQuoteToCashInput): Promise<CloseQuoteToCashResult> => {
  const idempotencyKey = input.idempotencyKey?.trim() || null

  if (!idempotencyKey) {
    return executeClose(input)
  }

  // Idempotencia vía el ledger canónico api_platform_command_executions (sin migración).
  const principalId = input.actor.userId
  const routeKey = 'commercial.quote_to_cash.close'

  const fingerprint = computeRequestFingerprint({
    method: 'POST',
    path: routeKey,
    body: {
      quotationId: input.quotationId,
      strategy: input.strategy,
      dueDate: input.dueDate ?? null,
      sourceHesId: input.sourceHesId ?? null
    }
  })

  const claim = await claimCommandExecution({
    principal: { lane: 'app', principalKind: 'app_user', principalId, userId: principalId },
    scope: {
      greenhouseScopeType: input.subject.tenantType === 'client' ? 'client' : 'internal',
      clientId: input.subject.tenantType === 'client' ? input.subject.userId : null
    },
    routeKey,
    method: 'POST',
    path: routeKey,
    idempotencyKey,
    fingerprint,
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS)
  })

  if (!claim.claimed) {
    const existing = await loadCommandExecutionByKey({ principalId, idempotencyKey })
    const decision = resolveIdempotencyDecision(existing, fingerprint)

    if (decision.kind === 'replay') {
      await incrementReplayCount({ principalId, idempotencyKey })

      return { ...(decision.responseBody as CloseQuoteToCashResult), replayed: true }
    }

    if (decision.kind === 'in_progress') {
      throw new CloseQuoteToCashError('idempotency_in_progress', 'La operación anterior con este key sigue en curso.', 409, true)
    }

    throw new CloseQuoteToCashError('idempotency_conflict', 'El idempotency key fue reusado con un payload distinto.', 409)
  }

  try {
    const result = await executeClose(input)

    await completeCommandExecution({
      commandExecutionId: claim.commandExecutionId!,
      responseStatus: 200,
      responseBody: result
    })

    return result
  } catch (error) {
    await failCommandExecution({
      commandExecutionId: claim.commandExecutionId!,
      responseStatus: error instanceof CloseQuoteToCashError ? error.statusCode : 500,
      errorCode: error instanceof CloseQuoteToCashError ? error.code : 'internal_error'
    }).catch(() => {})

    throw error
  }
}
