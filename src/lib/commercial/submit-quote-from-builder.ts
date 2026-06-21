import 'server-only'

import { randomUUID } from 'node:crypto'

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

import {
  resolveQuoteDeliveryModel,
  type CommercialModel,
  type StaffingModel
} from '@/lib/commercial/delivery-model'
import { getCommercialDealByHubSpotId } from '@/lib/commercial/deals-store'
import { validateHubSpotQuoteCommercialContext } from '@/lib/commercial/quote-hubspot-sync-context'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { recordTemplateUsage } from '@/lib/commercial/governance/templates-store'
import { seedQuotationDefaultTerms } from '@/lib/commercial/governance/terms-store'
import {
  publishQuoteCreated,
  publishQuotationUpdated,
  publishTemplateUsed
} from '@/lib/commercial/quotation-events'
import {
  requestQuotationIssue,
  type RequestQuotationIssueResult
} from '@/lib/commercial/quotation-issue-command'
import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'

import {
  persistQuotationPricing,
  resolveQuotationIdentity,
  type QuotationBillingFrequency,
  type QuotationDiscountType,
  type QuotationLineInput,
  type QuotationPricingCurrency
} from '@/lib/finance/pricing'
import { buildPricingEngineOutputV2 } from '@/lib/finance/pricing/pricing-engine-v2'
import type { PricingLineOutputV2, PricingOutputCurrency } from '@/lib/finance/pricing/contracts'
import {
  UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE,
  isUnpricedQuotationLineItemsError
} from '@/lib/finance/pricing/quotation-line-input-validation'
import {
  buildQuotePricingInput,
  buildPersistedQuoteLineItems,
  type QuoteBuilderLineDraft,
  type QuoteBuilderPricingContext
} from '@/lib/finance/pricing/quote-builder-line-items'

/**
 * TASK-1212 — Command canónico de autoría/emisión de cotización.
 *
 * SSOT de la escritura del cotizador: extrae la coreografía que vivía client-side en
 * `QuoteBuilderShell.handleSubmit` (fresh-simulate → build → persist [→ issue]) a un
 * único writer server-side, consumible por la UI, las rutas Product-API y la Nexa
 * governed action. La UI deja de ser source of truth del pricing.
 *
 * Postura de atomicidad (ADR TASK-1212, arch-architect + commercial-expert):
 * **atomicidad por etapa + idempotencia + rollback honesto**, NO total.
 * - `persistQuotationPricing` ya hace header + líneas + versión en UNA transacción propia
 *   (el zombie "líneas viejas" es imposible: DELETE+INSERT atómico).
 * - **create**: si el persist falla tras el INSERT del header, se borra el header huérfano
 *   (rollback honesto — aún no es cotización real, no emitió eventos).
 * - **issue** es una etapa separada post-commit (no se puede meter approval/FX/outbox en la
 *   misma tx). Si el issue falla, la cotización queda como `draft` válido recuperable.
 * - **idempotencia** opcional vía el ledger canónico `api_platform_command_executions`
 *   (sin migración nueva): replay con el mismo `idempotencyKey` devuelve el resultado previo.
 */

const QUOTE_CONTACT_MEMBERSHIP_TYPES = [
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'partner',
  'advisor'
] as const

const isPricingEngineCommercialModel = (value: unknown): value is CommercialModelCode =>
  value === 'on_going' ||
  value === 'on_demand' ||
  value === 'hybrid' ||
  value === 'license_consulting'

const generateQuotationNumber = () => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()

  return `EO-QUO-${y}${m}-${suffix}`
}

// ── Public contract ─────────────────────────────────────────

export interface SubmitQuoteFromBuilderHeader {
  /** Requerido en create. La cotización se ancla a una organización (cliente o prospecto). */
  organizationId?: string | null
  clientId?: string | null
  contactIdentityProfileId?: string | null
  hubspotDealId?: string | null
  /** Solo create: aplica defaults de un template (currency, billing, items, terms). */
  templateId?: string | null
  businessLineCode?: string | null
  currency: PricingOutputCurrency
  quoteDate?: string | null
  dueDate?: string | null
  validUntil?: string | null
  billingFrequency?: QuotationBillingFrequency
  contractDurationMonths?: number | null
  description?: string | null
  internalNotes?: string | null
  pricingModel?: 'staff_aug' | 'retainer' | 'project'
  commercialModel?: CommercialModel | null
  staffingModel?: StaffingModel | null
  /** CommercialModelCode del motor de pricing (on_going/on_demand/hybrid/license_consulting). */
  pricingEngineCommercialModel?: string | null
  countryFactorCode?: string | null
  globalDiscountType?: QuotationDiscountType | null
  globalDiscountValue?: number | null
  targetMarginPct?: number | null
  marginFloorPct?: number | null
  exchangeRates?: Record<string, number>
  exchangeSnapshotDate?: string | null
}

export interface SubmitQuoteFromBuilderInput {
  mode: 'create' | 'edit'
  /** Requerido en edit. */
  quotationId?: string | null
  header: SubmitQuoteFromBuilderHeader
  /** Líneas crudas del builder; el command re-simula fresco y construye server-side. */
  lines: QuoteBuilderLineDraft[]
  issueAfterSave: boolean
  /** Sujeto de autorización (capability enforcement). Identidad SIEMPRE del caller, nunca del payload. */
  subject: TenantEntitlementSubject
  actor: { userId: string; name: string }
  /** Opt-in idempotencia: replay con el mismo key devuelve el resultado previo. */
  idempotencyKey?: string | null
  correlationId?: string | null
  reason?: string | null
}

export interface SubmitQuoteFromBuilderResult {
  operationId: string
  quotationId: string
  mode: 'create' | 'edit'
  finalState: 'draft' | 'issued' | 'pending_approval'
  lineCount: number
  issued: boolean
  approvalRequired: boolean
  replayed: boolean
}

export type SubmitQuoteErrorCode =
  | 'forbidden'
  | 'invalid_input'
  | 'organization_not_found'
  | 'contact_invalid'
  | 'deal_invalid'
  | 'template_not_found'
  | 'quotation_not_found'
  | 'unpriced_line_items'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'

export class SubmitQuoteError extends Error {
  code: SubmitQuoteErrorCode
  /** true cuando reintentar puede resolver (in_progress); false para causas estructurales. */
  actionable: boolean

  constructor(code: SubmitQuoteErrorCode, message: string, actionable = false) {
    super(message)
    this.name = 'SubmitQuoteError'
    this.code = code
    this.actionable = actionable
  }
}

// ── Line resolution (fresh-simulate server-side) ────────────

const resolveBuilderLineItems = async (
  header: SubmitQuoteFromBuilderHeader,
  lines: QuoteBuilderLineDraft[]
): Promise<QuotationLineInput[]> => {
  if (lines.length === 0) return []

  const pricingContext: QuoteBuilderPricingContext = {
    quoteDate: (header.quoteDate || new Date().toISOString().slice(0, 10)).slice(0, 10),
    businessLineCode: header.businessLineCode ?? null,
    commercialModel: isPricingEngineCommercialModel(header.pricingEngineCommercialModel)
      ? header.pricingEngineCommercialModel
      : (isPricingEngineCommercialModel(header.commercialModel) ? header.commercialModel : 'on_going'),
    countryFactorCode: header.countryFactorCode ?? ''
  }

  const engineInput = buildQuotePricingInput(pricingContext, header.currency, lines)

  let simulationLines: PricingLineOutputV2[] | null = null

  if (engineInput) {
    // Fresh-simulate server-side: el precio SIEMPRE del engine. Audiencia interna →
    // output crudo (sin redacción) porque `buildPersistedQuoteLineItems` necesita
    // costStack + suggestedBillRate completos.
    const output = await buildPricingEngineOutputV2(engineInput)

    simulationLines = output.lines
  }

  const persisted = buildPersistedQuoteLineItems({
    lines,
    currency: header.currency,
    simulationLines,
    missingPriceMessage: UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE
  })

  // PersistedQuoteLineItem es estructuralmente asignable a QuotationLineInput (mismo
  // shape que las rutas /quotes + /lines ya pasan a persistQuotationPricing).
  return persisted as unknown as QuotationLineInput[]
}

// ── Create save ─────────────────────────────────────────────

const insertQuotationHeader = async (
  header: SubmitQuoteFromBuilderHeader,
  resolved: {
    organizationId: string
    quotationNumber: string
    businessLineCode: string | null
    currency: QuotationPricingCurrency
    billingFrequency: QuotationBillingFrequency
    contractDurationMonths: number | null
    quoteDate: string
    contactIdentityProfileId: string | null
    hubspotDealId: string | null
    deliveryModel: ReturnType<typeof resolveQuoteDeliveryModel>
    createdBy: string
  }
): Promise<string> =>
  withTransaction(async client => {
    const insert = await client.query<{ quotation_id: string }>(
      `INSERT INTO greenhouse_commercial.quotations (
         quotation_number, client_id, organization_id, contact_identity_profile_id,
         business_line_code, pricing_model, commercial_model, staffing_model,
         status, current_version, currency, exchange_rate_to_clp, exchange_rates,
         exchange_snapshot_date, target_margin_pct, margin_floor_pct,
         global_discount_type, global_discount_value, revenue_type, billing_frequency,
         payment_terms_days, contract_duration_months, quote_date, due_date,
         valid_until, expiry_date, description, internal_notes,
         source_system, source_quote_id, hubspot_deal_id, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, 'draft', 1,
         $9, NULL, $10::jsonb, $11::date, $12, $13, $14, $15,
         'one_time', $16, 30, $17, $18::date, $19::date, $20::date, $21::date,
         $22, $23, 'manual', $1, $24, $25
       )
       RETURNING quotation_id`,
      [
        resolved.quotationNumber,
        header.clientId ?? null,
        resolved.organizationId,
        resolved.contactIdentityProfileId,
        resolved.businessLineCode,
        resolved.deliveryModel.pricingModel,
        resolved.deliveryModel.commercialModel,
        resolved.deliveryModel.staffingModel,
        resolved.currency,
        JSON.stringify(header.exchangeRates ?? {}),
        header.exchangeSnapshotDate ?? null,
        header.targetMarginPct ?? null,
        header.marginFloorPct ?? null,
        header.globalDiscountType ?? null,
        header.globalDiscountValue ?? null,
        resolved.billingFrequency,
        resolved.contractDurationMonths,
        resolved.quoteDate,
        header.dueDate ?? null,
        header.validUntil ?? null,
        header.validUntil ?? null,
        header.description ?? null,
        header.internalNotes ?? null,
        resolved.hubspotDealId,
        resolved.createdBy
      ]
    )

    return insert.rows[0].quotation_id
  })

const runCreateSave = async (
  input: SubmitQuoteFromBuilderInput
): Promise<{ quotationId: string; lineCount: number; organizationId: string }> => {
  const header = input.header
  const organizationId = typeof header.organizationId === 'string' ? header.organizationId.trim() : ''

  if (!organizationId) {
    throw new SubmitQuoteError(
      'invalid_input',
      'organizationId es obligatorio. Cada cotización se ancla a una organización (cliente o prospecto).'
    )
  }

  const orgRows = await query<{ organization_id: string; hubspot_company_id: string | null }>(
    `SELECT organization_id, hubspot_company_id
       FROM greenhouse_core.organizations
       WHERE organization_id = $1 AND active = TRUE
       LIMIT 1`,
    [organizationId]
  )

  if (orgRows.length === 0) {
    throw new SubmitQuoteError('organization_not_found', `Organization ${organizationId} no existe o está inactiva.`)
  }

  const contactIdentityProfileId =
    typeof header.contactIdentityProfileId === 'string' && header.contactIdentityProfileId.trim()
      ? header.contactIdentityProfileId.trim()
      : null

  const hubspotDealId =
    typeof header.hubspotDealId === 'string' && header.hubspotDealId.trim()
      ? header.hubspotDealId.trim()
      : null

  const hubspotContextError = validateHubSpotQuoteCommercialContext({
    organizationId,
    hubspotCompanyId: orgRows[0]?.hubspot_company_id ?? null,
    contactIdentityProfileId,
    hubspotDealId,
    sourceSystem: null,
    hubspotQuoteId: null
  })

  if (hubspotContextError) {
    throw new SubmitQuoteError('contact_invalid', hubspotContextError)
  }

  if (contactIdentityProfileId) {
    const memberships = await query<{ membership_type: string }>(
      `SELECT pm.membership_type
         FROM greenhouse_core.person_memberships pm
         WHERE pm.profile_id = $1 AND pm.organization_id = $2 AND pm.active = TRUE
         LIMIT 1`,
      [contactIdentityProfileId, organizationId]
    )

    if (memberships.length === 0) {
      throw new SubmitQuoteError(
        'contact_invalid',
        'contactIdentityProfileId no tiene una membership activa en esa organización.'
      )
    }

    const membershipType = memberships[0].membership_type

    if (!QUOTE_CONTACT_MEMBERSHIP_TYPES.includes(membershipType as (typeof QUOTE_CONTACT_MEMBERSHIP_TYPES)[number])) {
      throw new SubmitQuoteError(
        'contact_invalid',
        `membership_type='${membershipType}' no aplica como contacto comercial.`
      )
    }
  }

  if (hubspotDealId) {
    const deal = await getCommercialDealByHubSpotId(hubspotDealId)

    if (!deal) {
      throw new SubmitQuoteError('deal_invalid', `HubSpot deal ${hubspotDealId} no existe en el runtime comercial.`)
    }

    if (deal.organizationId !== organizationId) {
      throw new SubmitQuoteError('deal_invalid', 'El HubSpot deal no pertenece a la organización de esta cotización.')
    }
  }

  // Template resolution (opcional) — defaults + items + terms.
  let templateSnapshot: Awaited<ReturnType<typeof recordTemplateUsage>> = null
  let templateBusinessLineCode: string | null = null

  if (header.templateId && typeof header.templateId === 'string') {
    templateSnapshot = await recordTemplateUsage(header.templateId)

    if (!templateSnapshot) {
      throw new SubmitQuoteError('template_not_found', 'Template no encontrado.')
    }

    templateBusinessLineCode = templateSnapshot.defaults.businessLineCode
  }

  const businessLineCode =
    header.businessLineCode !== undefined ? header.businessLineCode ?? null : templateBusinessLineCode

  const currency = (header.currency ||
    (templateSnapshot?.defaults.currency as QuotationPricingCurrency | undefined) ||
    'CLP') as QuotationPricingCurrency

  const billingFrequency = (header.billingFrequency ||
    (templateSnapshot?.defaults.billingFrequency as QuotationBillingFrequency | undefined) ||
    'one_time') as QuotationBillingFrequency

  const quoteDate = (header.quoteDate || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const quotationNumber = generateQuotationNumber()

  const templatePricingModel = templateSnapshot?.defaults.pricingModel as
    | 'staff_aug'
    | 'retainer'
    | 'project'
    | undefined

  const deliveryModel = resolveQuoteDeliveryModel({
    pricingModel: header.pricingModel ?? templatePricingModel ?? 'project',
    commercialModel: header.commercialModel ?? undefined,
    staffingModel: header.staffingModel ?? undefined
  })

  const contractDurationMonths =
    header.contractDurationMonths !== undefined
      ? header.contractDurationMonths
      : templateSnapshot?.defaults.contractDurationMonths ?? null

  const quotationId = await insertQuotationHeader(header, {
    organizationId,
    quotationNumber,
    businessLineCode,
    currency,
    billingFrequency,
    contractDurationMonths,
    quoteDate,
    contactIdentityProfileId,
    hubspotDealId,
    deliveryModel,
    createdBy: input.actor.userId
  })

  // Líneas: del builder (drafts → engine → persist) o del template.
  const builderLineItems =
    input.lines.length === 0 && templateSnapshot && templateSnapshot.items.length > 0
      ? (templateSnapshot.items.map(item => ({
          productId: item.productId ?? null,
          lineType: item.lineType,
          sortOrder: item.sortOrder,
          label: item.label,
          description: item.description ?? null,
          roleCode: item.roleCode ?? null,
          hoursEstimated: item.suggestedHours ?? null,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.defaultUnitPrice ?? 0
        })) as unknown as QuotationLineInput[])
      : await resolveBuilderLineItems({ ...header, businessLineCode, currency, billingFrequency }, input.lines)

  try {
    const snapshot = await persistQuotationPricing(
      {
        quotationId,
        versionNumber: 1,
        businessLineCode,
        quoteCurrency: currency,
        quoteDate,
        billingFrequency,
        contractDurationMonths,
        exchangeRates: header.exchangeRates ?? {},
        exchangeSnapshotDate: header.exchangeSnapshotDate ?? null,
        globalDiscountType: header.globalDiscountType ?? null,
        globalDiscountValue: header.globalDiscountValue ?? null,
        marginTargetPct: header.targetMarginPct ?? null,
        marginFloorPct: header.marginFloorPct ?? null,
        pricingContext: {
          commercialModelCode: isPricingEngineCommercialModel(header.pricingEngineCommercialModel)
            ? header.pricingEngineCommercialModel
            : null,
          countryFactorCode: header.countryFactorCode ?? null,
          autoResolveAddons: 'internal_only'
        },
        lineItems: builderLineItems,
        createdBy: input.actor.userId
      },
      { createVersion: true, versionNotes: 'Draft created via submitQuoteFromBuilder.' }
    )

    if (templateSnapshot && templateSnapshot.defaults.termIds.length > 0) {
      await seedQuotationDefaultTerms({
        quotationId,
        pricingModel: deliveryModel.pricingModel,
        businessLineCode,
        variables: {
          paymentTermsDays: templateSnapshot.defaults.paymentTermsDays,
          contractDurationMonths,
          billingFrequency,
          validUntil: header.validUntil ?? null,
          organizationName: null,
          escalationPct: null
        }
      })
    }

    if (templateSnapshot) {
      await publishTemplateUsed({
        templateId: templateSnapshot.templateId,
        templateCode: templateSnapshot.templateCode,
        quotationId,
        usedBy: input.actor.userId
      })

      await recordAudit({
        quotationId,
        versionNumber: 1,
        action: 'template_used',
        actorUserId: input.actor.userId,
        actorName: input.actor.name,
        details: {
          templateId: templateSnapshot.templateId,
          templateCode: templateSnapshot.templateCode,
          itemsSeeded: builderLineItems.length,
          termsSeeded: templateSnapshot.defaults.termIds.length
        }
      })
    }

    await publishQuoteCreated({
      quoteId: quotationId,
      quotationId,
      hubspotQuoteId: null,
      hubspotDealId,
      sourceSystem: 'manual',
      direction: 'outbound',
      organizationId,
      spaceId: null,
      amount: snapshot.totals.totalPrice,
      currency,
      lineItemCount: snapshot.lineItems.length,
      pricingModel: deliveryModel.pricingModel,
      commercialModel: deliveryModel.commercialModel,
      staffingModel: deliveryModel.staffingModel
    })

    return { quotationId, lineCount: snapshot.lineItems.length, organizationId }
  } catch (error) {
    // Rollback honesto: el header se creó en ESTA operación y el persist falló →
    // no es una cotización real (status draft, sin líneas, sin eventos). Lo borramos
    // para no dejar un draft huérfano. Best-effort: si el DELETE falla, queda un draft
    // vacío recuperable, nunca un zombie con líneas viejas.
    await query('DELETE FROM greenhouse_commercial.quotations WHERE quotation_id = $1', [quotationId]).catch(() => {})

    if (isUnpricedQuotationLineItemsError(error)) {
      throw new SubmitQuoteError('unpriced_line_items', error.message)
    }

    throw error
  }
}

// ── Edit save ───────────────────────────────────────────────

const runEditSave = async (
  input: SubmitQuoteFromBuilderInput
): Promise<{ quotationId: string; lineCount: number; organizationId: string | null }> => {
  const header = input.header
  const targetId = typeof input.quotationId === 'string' ? input.quotationId.trim() : ''

  if (!targetId) {
    throw new SubmitQuoteError('invalid_input', 'quotationId es obligatorio en modo edit.')
  }

  const identity = await resolveQuotationIdentity(targetId)

  if (!identity) {
    throw new SubmitQuoteError('quotation_not_found', 'Cotización no encontrada.')
  }

  const currentRows = await query<{
    organization_id: string | null
    contact_identity_profile_id: string | null
    hubspot_deal_id: string | null
    hubspot_quote_id: string | null
    source_system: string | null
    hubspot_company_id: string | null
    pricing_model: string | null
    commercial_model: string | null
    staffing_model: string | null
  }>(
    `SELECT q.organization_id, q.contact_identity_profile_id, q.hubspot_deal_id,
            q.hubspot_quote_id, q.source_system, org.hubspot_company_id,
            q.pricing_model, q.commercial_model, q.staffing_model
       FROM greenhouse_commercial.quotations q
       LEFT JOIN greenhouse_core.organizations org ON org.organization_id = q.organization_id
      WHERE q.quotation_id = $1
      LIMIT 1`,
    [identity.quotationId]
  )

  const current = currentRows[0]
  const organizationId = current?.organization_id ?? null

  const updates: string[] = []
  const values: unknown[] = [identity.quotationId]
  let idx = 1

  const push = (column: string, value: unknown, cast?: string) => {
    idx += 1
    updates.push(`${column} = $${idx}${cast ?? ''}`)
    values.push(value)
  }

  if (header.description !== undefined) push('description', header.description ?? null)
  if (header.internalNotes !== undefined) push('internal_notes', header.internalNotes ?? null)
  if (header.currency) push('currency', header.currency)
  if (header.billingFrequency) push('billing_frequency', header.billingFrequency)
  if (header.contractDurationMonths !== undefined) push('contract_duration_months', header.contractDurationMonths)
  if (header.businessLineCode !== undefined) push('business_line_code', header.businessLineCode ?? null)
  if (header.globalDiscountType !== undefined) push('global_discount_type', header.globalDiscountType ?? null)
  if (header.globalDiscountValue !== undefined) push('global_discount_value', header.globalDiscountValue ?? null)
  if (header.targetMarginPct !== undefined) push('target_margin_pct', header.targetMarginPct ?? null)
  if (header.marginFloorPct !== undefined) push('margin_floor_pct', header.marginFloorPct ?? null)
  if (header.exchangeRates !== undefined) push('exchange_rates', JSON.stringify(header.exchangeRates), '::jsonb')
  if (header.exchangeSnapshotDate !== undefined) push('exchange_snapshot_date', header.exchangeSnapshotDate ?? null, '::date')

  if (header.validUntil !== undefined) {
    push('valid_until', header.validUntil ?? null, '::date')
    push('expiry_date', header.validUntil ?? null, '::date')
  }

  if (header.dueDate !== undefined) push('due_date', header.dueDate ?? null, '::date')

  // Contact context — valida membership cuando se setea un contacto.
  if (header.contactIdentityProfileId !== undefined) {
    const contactId =
      typeof header.contactIdentityProfileId === 'string' && header.contactIdentityProfileId.trim()
        ? header.contactIdentityProfileId.trim()
        : null

    if (contactId !== null) {
      if (!organizationId) {
        throw new SubmitQuoteError('contact_invalid', 'Esta cotización no tiene organización; asigna una antes de setear contacto.')
      }

      const memberships = await query<{ membership_type: string }>(
        `SELECT pm.membership_type FROM greenhouse_core.person_memberships pm
          WHERE pm.profile_id = $1 AND pm.organization_id = $2 AND pm.active = TRUE LIMIT 1`,
        [contactId, organizationId]
      )

      if (memberships.length === 0) {
        throw new SubmitQuoteError('contact_invalid', 'contactIdentityProfileId no tiene membership activa en la organización.')
      }

      const membershipType = memberships[0].membership_type

      if (!QUOTE_CONTACT_MEMBERSHIP_TYPES.includes(membershipType as (typeof QUOTE_CONTACT_MEMBERSHIP_TYPES)[number])) {
        throw new SubmitQuoteError('contact_invalid', `membership_type='${membershipType}' no aplica como contacto comercial.`)
      }
    }

    push('contact_identity_profile_id', contactId)
  }

  if (header.hubspotDealId !== undefined) {
    const dealId =
      typeof header.hubspotDealId === 'string' && header.hubspotDealId.trim()
        ? header.hubspotDealId.trim()
        : null

    if (dealId !== null) {
      if (!organizationId) {
        throw new SubmitQuoteError('deal_invalid', 'Esta cotización no tiene organización; asigna una antes de vincular un deal.')
      }

      const deal = await getCommercialDealByHubSpotId(dealId)

      if (!deal) {
        throw new SubmitQuoteError('deal_invalid', `HubSpot deal ${dealId} no existe en el runtime comercial.`)
      }

      if (deal.organizationId !== organizationId) {
        throw new SubmitQuoteError('deal_invalid', 'El HubSpot deal no pertenece a la organización de esta cotización.')
      }
    }

    push('hubspot_deal_id', dealId)
  }

  if (
    header.pricingModel !== undefined ||
    header.commercialModel !== undefined ||
    header.staffingModel !== undefined
  ) {
    const fallback = resolveQuoteDeliveryModel({
      pricingModel: current?.pricing_model,
      commercialModel: current?.commercial_model,
      staffingModel: current?.staffing_model
    })

    const deliveryModel = resolveQuoteDeliveryModel({
      pricingModel: header.pricingModel ?? undefined,
      commercialModel: header.commercialModel ?? fallback.commercialModel,
      staffingModel: header.staffingModel ?? fallback.staffingModel,
      fallback
    })

    push('pricing_model', deliveryModel.pricingModel)
    push('commercial_model', deliveryModel.commercialModel)
    push('staffing_model', deliveryModel.staffingModel)
  }

  const nextContactIdentityProfileId =
    header.contactIdentityProfileId !== undefined
      ? typeof header.contactIdentityProfileId === 'string' && header.contactIdentityProfileId.trim()
        ? header.contactIdentityProfileId.trim()
        : null
      : current?.contact_identity_profile_id ?? null

  const nextHubspotDealId =
    header.hubspotDealId !== undefined
      ? typeof header.hubspotDealId === 'string' && header.hubspotDealId.trim()
        ? header.hubspotDealId.trim()
        : null
      : current?.hubspot_deal_id ?? null

  const hubspotContextError = validateHubSpotQuoteCommercialContext({
    organizationId,
    hubspotCompanyId: current?.hubspot_company_id ?? null,
    contactIdentityProfileId: nextContactIdentityProfileId,
    hubspotDealId: nextHubspotDealId,
    sourceSystem: current?.source_system ?? null,
    hubspotQuoteId: current?.hubspot_quote_id ?? null
  })

  if (hubspotContextError) {
    throw new SubmitQuoteError('contact_invalid', hubspotContextError)
  }

  // Metadata UPDATE primero (persist re-lee currency/businessLine actualizados),
  // luego el persist atómico de líneas+pricing.
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    await query(`UPDATE greenhouse_commercial.quotations SET ${updates.join(', ')} WHERE quotation_id = $1`, values)
  }

  const headerForPricing: SubmitQuoteFromBuilderHeader = {
    ...header,
    currency: (header.currency as PricingOutputCurrency) ?? input.header.currency
  }

  const builderLineItems = await resolveBuilderLineItems(headerForPricing, input.lines)

  try {
    // Re-lee el header efectivo para los campos que el builder no manda explícitos.
    const headerRows = await query<{
      business_line_code: string | null
      currency: string
      quote_date: string | Date | null
      billing_frequency: string
      contract_duration_months: number | null
      global_discount_type: string | null
      global_discount_value: string | number | null
      target_margin_pct: string | number | null
      margin_floor_pct: string | number | null
      exchange_rates: Record<string, unknown> | null
      exchange_snapshot_date: string | Date | null
      current_version: number
    }>(
      `SELECT business_line_code, currency, quote_date, billing_frequency, contract_duration_months,
              global_discount_type, global_discount_value, target_margin_pct, margin_floor_pct,
              exchange_rates, exchange_snapshot_date, current_version
         FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
      [identity.quotationId]
    )

    const row = headerRows[0]

    if (!row) {
      throw new SubmitQuoteError('quotation_not_found', 'Cotización no encontrada.')
    }

    const quoteDate =
      row.quote_date instanceof Date
        ? row.quote_date.toISOString().slice(0, 10)
        : (row.quote_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10)

    const exchangeRates: Record<string, number> = {}

    if (row.exchange_rates && typeof row.exchange_rates === 'object') {
      for (const [key, val] of Object.entries(row.exchange_rates)) {
        const num = Number(val)

        if (Number.isFinite(num) && num > 0) exchangeRates[key] = num
      }
    }

    const snapshot = await persistQuotationPricing(
      {
        quotationId: identity.quotationId,
        versionNumber: row.current_version,
        businessLineCode: row.business_line_code,
        quoteCurrency: (row.currency as QuotationPricingCurrency) || 'CLP',
        quoteDate,
        billingFrequency: (row.billing_frequency as QuotationBillingFrequency) || 'one_time',
        contractDurationMonths: row.contract_duration_months,
        exchangeRates,
        exchangeSnapshotDate:
          row.exchange_snapshot_date instanceof Date
            ? row.exchange_snapshot_date.toISOString().slice(0, 10)
            : row.exchange_snapshot_date?.slice(0, 10) ?? null,
        globalDiscountType: row.global_discount_type as QuotationDiscountType | null,
        globalDiscountValue: row.global_discount_value != null ? Number(row.global_discount_value) : null,
        marginTargetPct: row.target_margin_pct != null ? Number(row.target_margin_pct) : null,
        marginFloorPct: row.margin_floor_pct != null ? Number(row.margin_floor_pct) : null,
        pricingContext: {
          commercialModelCode: isPricingEngineCommercialModel(header.pricingEngineCommercialModel)
            ? header.pricingEngineCommercialModel
            : isPricingEngineCommercialModel(header.commercialModel)
              ? header.commercialModel
              : null,
          countryFactorCode: header.countryFactorCode ?? null,
          autoResolveAddons: 'internal_only'
        },
        lineItems: builderLineItems,
        createdBy: input.actor.userId
      },
      { createVersion: false, versionNotes: null }
    )

    await publishQuotationUpdated({
      quotationId: identity.quotationId,
      quoteId: identity.financeQuoteId ?? identity.quotationId,
      hubspotQuoteId: current?.hubspot_quote_id ?? null,
      hubspotDealId: nextHubspotDealId,
      sourceSystem: current?.source_system ?? null,
      organizationId,
      spaceId: null,
      updatedBy: input.actor.userId,
      changedFields: ['line_items', ...updates.filter(u => !u.startsWith('updated_at'))],
      pricingModel: current?.pricing_model ?? null,
      commercialModel: current?.commercial_model ?? null,
      staffingModel: current?.staffing_model ?? null
    })

    return { quotationId: identity.quotationId, lineCount: snapshot.lineItems.length, organizationId }
  } catch (error) {
    if (isUnpricedQuotationLineItemsError(error)) {
      throw new SubmitQuoteError('unpriced_line_items', error.message)
    }

    throw error
  }
}

// ── Issue stage (separate, post-commit) ─────────────────────

const runIssueStage = async (
  quotationId: string,
  organizationId: string | null,
  actor: { userId: string; name: string }
): Promise<RequestQuotationIssueResult> =>
  requestQuotationIssue({
    quotationId,
    organizationId,
    spaceId: null,
    actor: { userId: actor.userId, name: actor.name }
  })

// ── Orchestrator core (no idempotency wrapper) ──────────────

const executeSubmit = async (input: SubmitQuoteFromBuilderInput, operationId: string): Promise<SubmitQuoteFromBuilderResult> => {
  // Capability enforcement (least-privilege). create→create, edit→update; issue→approve.
  const saveAction = input.mode === 'create' ? 'create' : 'update'

  if (!can(input.subject, 'commercial.quotation', saveAction, 'tenant')) {
    throw new SubmitQuoteError('forbidden', 'No tienes permiso para autorar cotizaciones.')
  }

  if (input.issueAfterSave && !can(input.subject, 'commercial.quotation', 'approve', 'tenant')) {
    throw new SubmitQuoteError('forbidden', 'No tienes permiso para emitir cotizaciones.')
  }

  const save =
    input.mode === 'create' ? await runCreateSave(input) : await runEditSave(input)

  if (!input.issueAfterSave) {
    return {
      operationId,
      quotationId: save.quotationId,
      mode: input.mode,
      finalState: 'draft',
      lineCount: save.lineCount,
      issued: false,
      approvalRequired: false,
      replayed: false
    }
  }

  const issueResult = await runIssueStage(save.quotationId, save.organizationId, input.actor)

  return {
    operationId,
    quotationId: save.quotationId,
    mode: input.mode,
    finalState: issueResult.newStatus === 'issued' ? 'issued' : 'pending_approval',
    lineCount: save.lineCount,
    issued: issueResult.issued,
    approvalRequired: issueResult.approvalRequired,
    replayed: false
  }
}

// ── Public entrypoint (idempotency wrapper) ─────────────────

export const submitQuoteFromBuilder = async (
  input: SubmitQuoteFromBuilderInput
): Promise<SubmitQuoteFromBuilderResult> => {
  const idempotencyKey = input.idempotencyKey?.trim() || null

  if (!idempotencyKey) {
    return executeSubmit(input, `EO-QAUTH-${randomUUID().slice(0, 8).toUpperCase()}`)
  }

  // Idempotencia vía el ledger canónico api_platform_command_executions (sin migración).
  const principalId = input.actor.userId
  const routeKey = 'commercial.quotation.author'

  const fingerprint = computeRequestFingerprint({
    method: 'POST',
    path: routeKey,
    body: {
      mode: input.mode,
      quotationId: input.quotationId ?? null,
      header: input.header,
      lines: input.lines,
      issueAfterSave: input.issueAfterSave
    }
  })

  const claim = await claimCommandExecution({
    principal: { lane: 'app', principalKind: 'app_user', principalId, userId: principalId },
    scope: {
      greenhouseScopeType: input.subject.tenantType === 'client' ? 'client' : 'internal',
      organizationId: input.header.organizationId ?? null,
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

      return { ...(decision.responseBody as SubmitQuoteFromBuilderResult), replayed: true }
    }

    if (decision.kind === 'in_progress') {
      throw new SubmitQuoteError('idempotency_in_progress', 'La operación anterior con este key sigue en curso.', true)
    }

    throw new SubmitQuoteError('idempotency_conflict', 'El idempotency key fue reusado con un payload distinto.')
  }

  try {
    const result = await executeSubmit(input, claim.commandExecutionId!)

    await completeCommandExecution({
      commandExecutionId: claim.commandExecutionId!,
      responseStatus: 200,
      responseBody: result
    })

    return result
  } catch (error) {
    await failCommandExecution({
      commandExecutionId: claim.commandExecutionId!,
      responseStatus: error instanceof SubmitQuoteError ? 422 : 500,
      errorCode: error instanceof SubmitQuoteError ? error.code : 'internal_error'
    }).catch(() => {})

    throw error
  }
}
