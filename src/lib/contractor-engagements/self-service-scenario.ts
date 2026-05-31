/**
 * TASK-796 — Contractor self-service scenario mapper (PURE, no IO).
 *
 * The canonical derivation that turns real domain rows (engagement + work
 * submissions + payables + invoice assets + payable readiness) into the
 * contractor-facing `ContractorSelfServiceScenario` view-model. Kept pure so it
 * is fully unit-testable with fixtures; the server orchestrator
 * (`self-service-projection.ts`) does the IO + cache + degraded handling.
 *
 * Finance-only artifacts (provider statements, payout receipts, FX receipts) are
 * filtered OUT here — the contractor never sees provider fees/margins by default.
 */

import { formatCurrency } from '@/lib/format'

import type { ContractorInvoiceAsset } from './invoice-asset-contracts'
import type { PayableReadinessBlocker, PayableReadinessResult } from './payables/readiness'
import type { ContractorPayable } from './payables/types'
import type { ContractorEngagement } from './types'
import type { ContractorWorkSubmission } from './work-submissions/types'

import type {
  ContractorBlockerResponsable,
  ContractorRemittanceItem,
  ContractorScenarioBlocker,
  ContractorScenarioKind,
  ContractorScenarioKpi,
  ContractorSelfServiceScenario,
  ContractorSubmissionItem,
  ContractorSupportItem,
  ContractorTimelineStep,
  ContractorTone
} from './projection-types'

export interface MapSelfServiceScenarioInput {
  engagement: ContractorEngagement
  submissions: ContractorWorkSubmission[]
  payables: ContractorPayable[]
  invoiceAssets: ContractorInvoiceAsset[]
  /** Readiness of the latest non-terminal payable (null when no payable yet). */
  latestPayableReadiness: PayableReadinessResult | null
  /** Display label of the contracting legal entity (resolved server-side). */
  legalEntityLabel: string
  /** Display name of the contractor person (resolved server-side). */
  contractorName: string
  /** Masked payment-profile status line (resolved server-side; never raw account data). */
  paymentProfileLabel: string
  paymentProfileDetail: string
  /** Paid payables' remittance advices, resolved server-side (TASK-960). */
  paidRemittances: ContractorRemittanceItem[]
}

// ── Blocker responsable mapping ───────────────────────────────────────────────
// Contractor-actionable blockers vs everything else (HR/Finance owns).
const CONTRACTOR_ACTIONABLE_CODES = new Set<string>(['invoice_asset_missing', 'source_not_approved'])

const resolveBlockerResponsable = (code: string): ContractorBlockerResponsable =>
  CONTRACTOR_ACTIONABLE_CODES.has(code) ? 'Contractor' : 'Finance'

const blockerTone = (responsable: ContractorBlockerResponsable): ContractorTone =>
  responsable === 'Contractor' ? 'warning' : 'error'

// ── Invoice/evidence asset roles the contractor may see ───────────────────────
const CONTRACTOR_VISIBLE_ASSET_ROLES = new Set<string>([
  'invoice_pdf',
  'tax_xml',
  'tax_certificate',
  'work_evidence',
  'other_supporting_doc'
])

const INVOICE_ASSET_ROLES = new Set<string>(['invoice_pdf', 'tax_xml', 'tax_certificate'])
const EVIDENCE_ASSET_ROLES = new Set<string>(['work_evidence', 'other_supporting_doc'])

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatShortDate = (iso: string | null): string | null => {
  if (!iso) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)

  if (!match) return null

  const day = match[3]
  const monthIdx = Number(match[2]) - 1
  const month = MONTHS_ES[monthIdx] ?? match[2]

  return `${day} ${month}`
}

const formatServicePeriod = (
  start: string | null,
  end: string | null,
  fallback: string
): string => {
  const a = formatShortDate(start)
  const b = formatShortDate(end)
  const year = (end ?? start ?? '').slice(0, 4)

  if (a && b) return `${a} - ${b}${year ? ` ${year}` : ''}`
  if (a) return `${a}${year ? ` ${year}` : ''}`

  return fallback
}

const formatAmount = (amount: number | null, currency: string): string => {
  if (amount === null || !Number.isFinite(amount)) return '—'

  return formatCurrency(amount, currency as 'CLP' | 'USD', { currencySymbolSpacing: ' ' }, 'es-CL')
}

// ── Scenario kind derivation ──────────────────────────────────────────────────

const isCrossCurrency = (engagement: ContractorEngagement): boolean =>
  engagement.paymentCurrency !== null && engagement.paymentCurrency !== engagement.currency

const hasFinanceBoundaryBlocker = (readiness: PayableReadinessResult | null): boolean =>
  (readiness?.blockers ?? []).some(b =>
    b.code === 'fx_policy_unresolved' ||
    b.code === 'fx_unresolved' ||
    b.code === 'tax_owner_review_required' ||
    b.code === 'payment_profile_unresolved'
  )

export const deriveScenarioKind = (
  engagement: ContractorEngagement,
  latestSubmission: ContractorWorkSubmission | null,
  latestPayable: ContractorPayable | null,
  latestPayableReadiness: PayableReadinessResult | null
): ContractorScenarioKind => {
  if (engagement.status === 'ending' || engagement.status === 'ended') {
    return 'closure_pending'
  }

  if (latestPayable?.status === 'paid') {
    return 'paid'
  }

  if (latestSubmission?.status === 'disputed') {
    return 'disputed'
  }

  if (
    latestPayable?.status === 'blocked' &&
    (isCrossCurrency(engagement) || hasFinanceBoundaryBlocker(latestPayableReadiness))
  ) {
    return 'international_blocked'
  }

  if (latestSubmission?.status === 'submitted') {
    return 'submitted_review'
  }

  return 'honorarios_ready'
}

// ── Readiness label/tone/detail per kind ──────────────────────────────────────

const READINESS_BY_KIND: Record<
  ContractorScenarioKind,
  { label: string; tone: ContractorTone; detail: string }
> = {
  honorarios_ready: {
    label: 'Falta soporte',
    tone: 'warning',
    detail: 'Se puede enviar cuando exista la boleta/invoice principal y la evidencia del servicio.'
  },
  submitted_review: {
    label: 'En revisión',
    tone: 'info',
    detail: 'No necesitas reenviar archivos mientras la revisión esté abierta.'
  },
  disputed: {
    label: 'Disputado',
    tone: 'error',
    detail: 'El pago está bloqueado hasta responder la observación.'
  },
  international_blocked: {
    label: 'Preparación bloqueada',
    tone: 'error',
    detail: 'La obligación no puede generarse hasta resolver el bloqueo de preparación (FX/cuenta/tributario).'
  },
  paid: {
    label: 'Pagado',
    tone: 'success',
    detail: 'El estado de pago viene de Finance, no de la aprobación operacional.'
  },
  closure_pending: {
    label: 'Cierre con pendientes',
    tone: 'warning',
    detail: 'El cierre contractor revisa pagos y evidencias pendientes sin usar finiquito laboral.'
  },
  no_engagement: {
    label: 'Sin engagement activo',
    tone: 'secondary',
    detail: 'No hay un engagement contractor activo asociado a tu cuenta.'
  }
}

// ── Hero copy per kind ────────────────────────────────────────────────────────

const COPY_BY_KIND: Record<
  ContractorScenarioKind,
  {
    eyebrow: string
    title: string
    summary: string
    primaryAction: string
    primaryActionIcon: string
    primaryActionDisabled?: boolean
    primaryActionReason?: string
  }
> = {
  honorarios_ready: {
    eyebrow: 'Acción pendiente',
    title: 'Sube tu boleta o invoice y la evidencia del servicio',
    summary: 'El engagement está activo. Falta adjuntar el soporte del periodo para enviarlo a revisión.',
    primaryAction: 'Preparar envío',
    primaryActionIcon: 'tabler-upload'
  },
  submitted_review: {
    eyebrow: 'Seguimiento',
    title: 'Tu envío está en revisión operacional',
    summary: 'La evidencia ya fue enviada. El siguiente paso depende del aprobador del servicio.',
    primaryAction: 'Ver envío',
    primaryActionIcon: 'tabler-eye'
  },
  disputed: {
    eyebrow: 'Requiere acción',
    title: 'Corrige la evidencia solicitada',
    summary: 'El aprobador pidió aclarar el envío antes de liberar el pago.',
    primaryAction: 'Responder observación',
    primaryActionIcon: 'tabler-message-reply'
  },
  international_blocked: {
    eyebrow: 'Bloqueo de preparación',
    title: 'Hay un bloqueo antes de enviar a Finance',
    summary: 'La obligación no puede generarse hasta que se resuelva el bloqueo de preparación.',
    primaryAction: 'Ver bloqueo',
    primaryActionIcon: 'tabler-lock',
    primaryActionDisabled: true,
    primaryActionReason: 'Este bloqueo lo resuelve HR/Finance, no el contractor.'
  },
  paid: {
    eyebrow: 'Historial',
    title: 'El pago del periodo fue ejecutado',
    summary: 'El envío fue aprobado, convertido en obligación Finance y pagado por la orden correspondiente.',
    primaryAction: 'Ver comprobante',
    primaryActionIcon: 'tabler-receipt'
  },
  closure_pending: {
    eyebrow: 'Cierre contractor',
    title: 'Hay items abiertos antes del cierre',
    summary: 'El engagement termina pronto. El cierre contractor revisa pagos y evidencias pendientes sin usar finiquito.',
    primaryAction: 'Ver pendientes',
    primaryActionIcon: 'tabler-list-check'
  },
  no_engagement: {
    eyebrow: 'Sin actividad',
    title: 'No tienes un engagement contractor activo',
    summary: 'Cuando tengas un contrato de servicios activo, aquí verás el soporte, la revisión y el estado de pago.',
    primaryAction: 'Ver cuenta de pago',
    primaryActionIcon: 'tabler-credit-card'
  }
}

// ── Support items ─────────────────────────────────────────────────────────────

const buildSupportItems = (
  engagement: ContractorEngagement,
  invoiceAssets: ContractorInvoiceAsset[]
): ContractorSupportItem[] => {
  const visible = invoiceAssets.filter(a => CONTRACTOR_VISIBLE_ASSET_ROLES.has(a.assetRole))

  const invoiceAsset = visible.find(a => INVOICE_ASSET_ROLES.has(a.assetRole))
  const evidenceAsset = visible.find(a => EVIDENCE_ASSET_ROLES.has(a.assetRole))

  const items: ContractorSupportItem[] = []

  if (engagement.requiresInvoice || invoiceAsset) {
    items.push({
      id: 'invoice',
      label: engagement.relationshipSubtype === 'honorarios_cl' ? 'Boleta principal' : 'Invoice principal',
      kind: 'invoice',
      status: invoiceAsset ? 'Adjunta' : 'Pendiente',
      tone: invoiceAsset ? 'success' : 'warning',
      filename: invoiceAsset?.publicId
    })
  }

  items.push({
    id: 'evidence',
    label: 'Evidencia del servicio',
    kind: 'evidence',
    status: evidenceAsset ? 'Adjunta' : 'Pendiente',
    tone: evidenceAsset ? 'success' : 'warning',
    filename: evidenceAsset?.publicId
  })

  return items
}

// ── Blockers ──────────────────────────────────────────────────────────────────

const buildBlockers = (
  kind: ContractorScenarioKind,
  readiness: PayableReadinessResult | null,
  supportItems: ContractorSupportItem[],
  latestSubmission: ContractorWorkSubmission | null
): ContractorScenarioBlocker[] => {
  const fromReadiness: ContractorScenarioBlocker[] = (readiness?.blockers ?? []).map(
    (b: PayableReadinessBlocker) => {
      const responsable = resolveBlockerResponsable(b.code)

      return {
        id: b.code,
        title: b.message,
        detail: 'Este bloqueo impide que el pago pase a Finance.',
        tone: blockerTone(responsable),
        responsable
      }
    }
  )

  if (fromReadiness.length > 0) return fromReadiness

  // No payable yet: synthesize the contractor-actionable "missing support" blocker.
  if (kind === 'honorarios_ready') {
    const invoicePending = supportItems.some(i => i.kind === 'invoice' && i.tone !== 'success')
    const evidencePending = supportItems.some(i => i.kind === 'evidence' && i.tone !== 'success')

    if (invoicePending || evidencePending) {
      return [
        {
          id: 'missing_support',
          title: 'Soporte pendiente',
          detail: 'El pago no pasa a Finance hasta que exista el soporte adjunto del periodo.',
          tone: 'warning',
          responsable: 'Contractor'
        }
      ]
    }
  }

  if (kind === 'disputed') {
    return [
      {
        id: 'dispute_open',
        title: latestSubmission?.reviewReason ?? 'Observación abierta',
        detail: 'Responde la observación para reabrir la revisión operacional.',
        tone: 'error',
        responsable: 'Contractor'
      }
    ]
  }

  return []
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

const buildKpis = (
  engagement: ContractorEngagement,
  latestPayable: ContractorPayable | null
): ContractorScenarioKpi[] => {
  if (latestPayable) {
    const currency = latestPayable.currency

    return [
      {
        id: 'gross',
        title: 'Monto bruto',
        value: formatAmount(latestPayable.grossAmount, currency),
        subtitle: 'Monto del payable',
        tone: 'info',
        icon: 'tabler-file-invoice'
      },
      {
        id: 'withholding',
        title: 'Retención',
        value: formatAmount(latestPayable.withholdingAmount, currency),
        subtitle: engagement.taxWithholdingPolicyCode ?? 'Según política tributaria',
        tone: 'warning',
        icon: 'tabler-percentage'
      },
      {
        id: 'net',
        title: latestPayable.status === 'paid' ? 'Neto pagado' : 'Neto estimado',
        value: formatAmount(latestPayable.netPayable, currency),
        subtitle: latestPayable.status === 'paid' ? 'Conciliado por Finance' : 'No es pago ejecutado',
        tone: 'success',
        icon: 'tabler-wallet'
      }
    ]
  }

  // No payable yet — best-effort honorarios estimate from the engagement rate.
  const gross = engagement.rateAmount
  const rate = engagement.taxWithholdingRateSnapshot
  const withholding = gross !== null && rate !== null ? Math.round(gross * rate) : null
  const net = gross !== null && withholding !== null ? gross - withholding : null

  return [
    {
      id: 'gross',
      title: 'Monto bruto',
      value: formatAmount(gross, engagement.currency),
      subtitle: 'Según tarifa del engagement',
      tone: 'info',
      icon: 'tabler-file-invoice'
    },
    {
      id: 'withholding',
      title: 'Retención estimada',
      value: formatAmount(withholding, engagement.currency),
      subtitle: engagement.taxWithholdingPolicyCode ?? 'Según política tributaria',
      tone: 'warning',
      icon: 'tabler-percentage'
    },
    {
      id: 'net',
      title: 'Neto estimado',
      value: formatAmount(net, engagement.currency),
      subtitle: 'Sujeto a revisión',
      tone: 'success',
      icon: 'tabler-wallet'
    }
  ]
}

// ── Submissions history ─────────────────────────────────────────────────────────

const SUBMISSION_STATUS_TONE: Record<ContractorWorkSubmission['status'], ContractorTone> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'success',
  disputed: 'error',
  rejected: 'error',
  cancelled: 'secondary'
}

const SUBMISSION_STATUS_LABEL: Record<ContractorWorkSubmission['status'], string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  disputed: 'Disputado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado'
}

const buildSubmissions = (
  submissions: ContractorWorkSubmission[],
  engagement: ContractorEngagement
): ContractorSubmissionItem[] =>
  submissions.map(s => ({
    id: s.publicId,
    title: s.title ?? 'Envío de trabajo',
    period: formatServicePeriod(s.servicePeriodStart, s.servicePeriodEnd, 'Sin periodo'),
    amount: s.grossAmount ?? 0,
    currency: s.currency ?? engagement.currency,
    status: SUBMISSION_STATUS_LABEL[s.status],
    tone: SUBMISSION_STATUS_TONE[s.status],
    responsable:
      s.status === 'submitted' ? 'Revisor HR' : s.status === 'disputed' ? 'Contractor' : 'Finance',
    nextAction:
      s.status === 'submitted'
        ? 'Revisión de evidencia'
        : s.status === 'disputed'
          ? 'Adjuntar evidencia corregida'
          : s.status === 'approved'
            ? 'Preparación del payable'
            : 'Sin acciones pendientes'
  }))

// ── Timeline ──────────────────────────────────────────────────────────────────

type TimelineStatus = ContractorTimelineStep['status']

const buildTimeline = (
  kind: ContractorScenarioKind,
  engagement: ContractorEngagement,
  latestSubmission: ContractorWorkSubmission | null,
  latestPayable: ContractorPayable | null
): ContractorTimelineStep[] => {
  const supportSent = Boolean(latestSubmission && latestSubmission.status !== 'draft')
  const reviewDone = latestSubmission?.status === 'approved' || latestPayable !== null
  const reviewBlocked = latestSubmission?.status === 'disputed'

  const financeReady =
    latestPayable?.status === 'ready_for_finance' ||
    latestPayable?.status === 'obligation_created' ||
    latestPayable?.status === 'payment_order_created' ||
    latestPayable?.status === 'paid'

  const paid = latestPayable?.status === 'paid'

  const reviewStatus: TimelineStatus = reviewBlocked
    ? 'blocked'
    : reviewDone
      ? 'done'
      : supportSent
        ? 'current'
        : 'upcoming'

  const financeStatus: TimelineStatus =
    kind === 'international_blocked'
      ? 'blocked'
      : paid
        ? 'done'
        : financeReady
          ? 'current'
          : 'upcoming'

  return [
    {
      id: 'engagement',
      label: 'Engagement activo',
      detail: 'Relación contractor separada de cualquier relación laboral dependiente.',
      status: 'done',
      timestamp: formatShortDate(engagement.startDate) ?? undefined
    },
    {
      id: 'support',
      label: supportSent ? 'Soporte enviado' : 'Soporte del periodo',
      detail: supportSent ? 'Boleta/invoice y evidencia recibidas.' : 'Boleta/invoice y evidencia aún no enviadas.',
      status: supportSent ? 'done' : 'current'
    },
    {
      id: 'review',
      label: reviewBlocked ? 'Disputa abierta' : 'Revisión operacional',
      detail: reviewBlocked
        ? 'Se requiere aclaración de evidencia.'
        : 'HR revisa la evidencia y puede aprobar o disputar.',
      status: reviewStatus
    },
    {
      id: 'finance',
      label: 'Obligación Finance',
      detail: 'Se crea solo cuando el payable queda listo.',
      status: financeStatus
    },
    {
      id: 'paid',
      label: paid ? 'Pago ejecutado' : 'Pago',
      detail: paid ? 'Pago conciliado por Finance.' : 'Finance ejecuta y concilia el pago.',
      status: paid ? 'done' : 'upcoming'
    }
  ]
}

// ── Tax responsable copy ──────────────────────────────────────────────────────

const resolveTaxResponsable = (engagement: ContractorEngagement): string => {
  if (engagement.relationshipSubtype === 'honorarios_cl') {
    const rate = engagement.taxWithholdingRateSnapshot
    const pct = rate !== null ? `${(rate * 100).toFixed(2)}%` : ''

    return `Política Greenhouse: retención SII${pct ? ` ${pct}` : ''}`
  }

  switch (engagement.taxComplianceOwner) {
    case 'provider_owned':
      return 'Compliance gestionado por el proveedor (Deel/Remote/Oyster)'
    case 'manual_review_required':
      return 'Revisión tributaria manual requerida'
    case 'country_engine_owned':
      return 'Tratamiento tributario por motor de país'
    default:
      return 'Política Greenhouse'
  }
}

const PAYMENT_MODEL_LABEL: Record<ContractorEngagement['paymentModel'], string> = {
  fixed_recurring: 'Recurrente fijo',
  weekly_timesheet: 'Timesheet semanal',
  milestone: 'Milestone',
  project_fee: 'Proyecto cerrado',
  payg_invoice: 'On invoice',
  off_cycle: 'Off-cycle'
}

const PAYMENT_CADENCE_LABEL: Record<ContractorEngagement['paymentCadence'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  semi_monthly: 'Bimensual',
  monthly: 'Mensual',
  milestone: 'Milestone',
  on_invoice: 'On invoice',
  off_cycle: 'Off-cycle'
}

const SUBTYPE_LABEL: Record<ContractorEngagement['relationshipSubtype'], string> = {
  honorarios_cl: 'Honorarios Chile',
  freelance: 'Freelance',
  independent_professional: 'Profesional independiente',
  international_contractor: 'Contractor internacional',
  provider_platform: 'Plataforma proveedor'
}

// ── Main mapper ─────────────────────────────────────────────────────────────────

export const mapEngagementToSelfServiceScenario = (
  input: MapSelfServiceScenarioInput
): ContractorSelfServiceScenario => {
  const { engagement, submissions, payables, invoiceAssets, latestPayableReadiness } = input

  // submissions/payables come newest-first from the store readers.
  const latestSubmission = submissions[0] ?? null
  const latestPayable = payables[0] ?? null

  const kind = deriveScenarioKind(engagement, latestSubmission, latestPayable, latestPayableReadiness)
  const readiness = READINESS_BY_KIND[kind]
  const copy = COPY_BY_KIND[kind]
  const supportItems = buildSupportItems(engagement, invoiceAssets)

  const servicePeriod = latestSubmission
    ? formatServicePeriod(latestSubmission.servicePeriodStart, latestSubmission.servicePeriodEnd, '—')
    : formatServicePeriod(engagement.startDate, engagement.endDate, '—')

  return {
    kind,
    eyebrow: copy.eyebrow,
    title: copy.title,
    summary: copy.summary,
    primaryAction: copy.primaryAction,
    primaryActionIcon: copy.primaryActionIcon,
    primaryActionDisabled: copy.primaryActionDisabled,
    primaryActionReason: copy.primaryActionReason,
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorEngagementId: engagement.contractorEngagementId,
    engagementPublicId: engagement.publicId,
    contractorName: input.contractorName,
    relationshipSubtype: SUBTYPE_LABEL[engagement.relationshipSubtype],
    legalEntityLabel: input.legalEntityLabel,
    country: engagement.countryCode,
    currency: engagement.currency,
    paymentCurrency: engagement.paymentCurrency ?? engagement.currency,
    servicePeriod,
    paymentModel: PAYMENT_MODEL_LABEL[engagement.paymentModel],
    paymentCadence: PAYMENT_CADENCE_LABEL[engagement.paymentCadence],
    taxResponsable: resolveTaxResponsable(engagement),
    agreedRate: {
      rateType: engagement.rateType,
      rateAmount: engagement.rateAmount,
      paymentCadence: engagement.paymentCadence,
      currency: engagement.currency
    },
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    readinessDetail: readiness.detail,
    paymentProfileLabel: input.paymentProfileLabel,
    paymentProfileDetail: input.paymentProfileDetail,
    closureVisible: engagement.status === 'ending' || engagement.status === 'ended',
    kpis: buildKpis(engagement, latestPayable),
    supportItems,
    submissions: buildSubmissions(submissions, engagement),
    timeline: buildTimeline(kind, engagement, latestSubmission, latestPayable),
    blockers: buildBlockers(kind, latestPayableReadiness, supportItems, latestSubmission),
    paidRemittances: input.paidRemittances
  }
}
