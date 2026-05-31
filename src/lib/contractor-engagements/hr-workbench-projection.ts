import 'server-only'

/**
 * TASK-796 — Contractor HR workbench projection (server-only orchestrator).
 *
 * Composes the HR review queue from the existing domain listers (there is no
 * aggregated queue reader): engagements pending review + work submissions
 * submitted/disputed + payables blocked/ready/paid → a single workbench
 * view-model for `/hr/contractors`. Cache TTL 30s; degraded honest per source.
 *
 * Signals are derived HONESTLY from the fetched data (no faked counts). The
 * canonical reliability signals (broken-evidence, etc.) remain owned by the
 * Reliability Control Plane / Ops Health.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveProfileDisplayNames } from '@/lib/identity/profile-display-names'
import { isSourceDegraded, withSourceTimeout, type SourceResult } from '@/lib/platform-health/with-source-timeout'

import { listContractorPayables } from './payables/store'
import type { ContractorPayable } from './payables/types'
import { getRemittanceAdviceNumbersForPayables } from './remittance/remittance-number-allocator'
import { getContractorEngagementById, listContractorEngagements } from './store'
import type { ContractorEngagement } from './types'
import { listContractorWorkSubmissions } from './work-submissions/store'
import type { ContractorWorkSubmission } from './work-submissions/types'

import {
  CONTRACTOR_HR_WORKBENCH_CONTRACT_VERSION,
  type ContractorHrWorkbenchProjection,
  type ContractorProjectionDegradedReason,
  type ContractorRemittanceItem,
  type ContractorTone,
  type ContractorWorkbenchQueueRow,
  type ContractorWorkbenchSignal
} from './projection-types'

const SOURCE_TIMEOUT_MS = 4_000
const CACHE_TTL_MS = 30_000
const PAID_SAMPLE_LIMIT = 200
const REVIEW_OVERDUE_HOURS = 48

let cacheEntry: { value: ContractorHrWorkbenchProjection; expiresAt: number } | null = null

/** Test/consumer helper — drop the cached workbench projection. */
export const __clearContractorHrWorkbenchCache = (): void => {
  cacheEntry = null
}

const SUBTYPE_LABEL: Record<ContractorEngagement['relationshipSubtype'], string> = {
  honorarios_cl: 'Honorarios Chile',
  freelance: 'Freelance',
  independent_professional: 'Profesional independiente',
  international_contractor: 'Contractor internacional',
  provider_platform: 'Plataforma proveedor'
}

const isBlockingRisk = (status: ContractorEngagement['classificationRiskStatus']): boolean =>
  status === 'legal_review_required' || status === 'blocked'

const hoursSince = (iso: string | null): number => {
  if (!iso) return 0

  const t = Date.parse(iso)

  if (Number.isNaN(t)) return 0

  return (Date.now() - t) / 3_600_000
}

export const resolveContractorHrWorkbenchProjection =
  async (): Promise<ContractorHrWorkbenchProjection> => {
    if (cacheEntry && cacheEntry.expiresAt >= Date.now()) {
      return cacheEntry.value
    }

    const degraded: ContractorProjectionDegradedReason[] = []

    const [submittedRes, disputedRes, blockedRes, readyRes, paidRes, pendingEngRes, missingRateEngRes] = await Promise.all([
      withSourceTimeout(() => listContractorWorkSubmissions({ status: 'submitted', limit: 200 }), {
        source: 'submitted_submissions',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      withSourceTimeout(() => listContractorWorkSubmissions({ status: 'disputed', limit: 200 }), {
        source: 'disputed_submissions',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      withSourceTimeout(() => listContractorPayables({ status: 'blocked', limit: 200 }), {
        source: 'blocked_payables',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      withSourceTimeout(() => listContractorPayables({ status: 'ready_for_finance', limit: 200 }), {
        source: 'ready_payables',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      withSourceTimeout(() => listContractorPayables({ status: 'paid', limit: PAID_SAMPLE_LIMIT }), {
        source: 'paid_payables',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      withSourceTimeout(() => listContractorEngagements({ status: 'pending_review', limit: 200 }), {
        source: 'pending_engagements',
        timeoutMs: SOURCE_TIMEOUT_MS
      }),
      // TASK-968 — engagements without an agreed rate need HR attention (and are
      // reachable here so HR can define the compensation).
      withSourceTimeout(() => listContractorEngagements({ missingRate: true, excludeTerminal: true, limit: 200 }), {
        source: 'missing_rate_engagements',
        timeoutMs: SOURCE_TIMEOUT_MS
      })
    ])

    const record = (
      res: SourceResult<unknown>,
      message: string
    ): void => {
      if (isSourceDegraded(res)) {
        degraded.push({ code: `${res.source}_unavailable`, source: res.source, severity: 'warning', message })
      }
    }

    record(submittedRes, 'No pudimos cargar los envíos en revisión.')
    record(disputedRes, 'No pudimos cargar los envíos disputados.')
    record(blockedRes, 'No pudimos cargar los payables bloqueados.')
    record(readyRes, 'No pudimos cargar los payables listos a Finance.')
    record(paidRes, 'No pudimos cargar los pagos completados.')
    record(pendingEngRes, 'No pudimos cargar los engagements pendientes de revisión.')
    record(missingRateEngRes, 'No pudimos cargar los engagements sin compensación definida.')

    const submitted = submittedRes.value ?? []
    const disputed = disputedRes.value ?? []
    const blocked = blockedRes.value ?? []
    const ready = readyRes.value ?? []
    const paid = paidRes.value ?? []
    const pendingEngagements = pendingEngRes.value ?? []
    const missingRateEngagements = missingRateEngRes.value ?? []

    // Build the union of engagement ids needing attention.
    const submissionsByEngagement = new Map<string, ContractorWorkSubmission[]>()

    for (const s of [...submitted, ...disputed]) {
      const arr = submissionsByEngagement.get(s.contractorEngagementId) ?? []

      arr.push(s)
      submissionsByEngagement.set(s.contractorEngagementId, arr)
    }

    const blockedByEngagement = new Map<string, ContractorPayable[]>()

    for (const p of blocked) {
      const arr = blockedByEngagement.get(p.contractorEngagementId) ?? []

      arr.push(p)
      blockedByEngagement.set(p.contractorEngagementId, arr)
    }

    const engagementIds = new Set<string>([
      ...submissionsByEngagement.keys(),
      ...blockedByEngagement.keys(),
      ...pendingEngagements.map(e => e.contractorEngagementId),
      ...missingRateEngagements.map(e => e.contractorEngagementId)
    ])

    // Resolve engagement rows (reuse pending + missing-rate rows; fetch the rest by id).
    const engagementById = new Map<string, ContractorEngagement>()

    for (const e of pendingEngagements) engagementById.set(e.contractorEngagementId, e)
    for (const e of missingRateEngagements) engagementById.set(e.contractorEngagementId, e)

    const missingIds = [...engagementIds].filter(id => !engagementById.has(id))

    const fetched = await Promise.all(
      missingIds.map(id =>
        getContractorEngagementById(id).catch(error => {
          captureWithDomain(error, 'identity', {
            tags: { source: 'contractor_hr_workbench_projection', stage: 'fetch_engagement' },
            extra: { contractorEngagementId: id }
          })

          return null
        })
      )
    )

    for (const e of fetched) {
      if (e) engagementById.set(e.contractorEngagementId, e)
    }

    const names = await resolveProfileDisplayNames(
      [...engagementById.values()].map(e => e.profileId)
    ).catch(() => new Map<string, string>())

    const queue: ContractorWorkbenchQueueRow[] = [...engagementIds]
      .map(id => engagementById.get(id))
      .filter((e): e is ContractorEngagement => Boolean(e))
      .map(engagement => {
        const subs = submissionsByEngagement.get(engagement.contractorEngagementId) ?? []
        const blockedPayables = blockedByEngagement.get(engagement.contractorEngagementId) ?? []
        const hasBlocked = blockedPayables.length > 0
        const hasDisputed = subs.some(s => s.status === 'disputed')
        const hasSubmitted = subs.some(s => s.status === 'submitted')

        const missingRate = engagement.rateAmount === null

        let statusLabel = missingRate ? 'Falta compensación' : 'Pendiente revisión'
        let statusTone: ContractorTone = 'warning'
        let responsable = 'Revisor HR'
        let nextAction = missingRate ? 'Definir monto acordado' : 'Revisar engagement'

        if (hasBlocked) {
          statusLabel = 'Bloqueado'
          statusTone = 'error'
          responsable = 'Finance'
          nextAction = 'Resolver bloqueo de preparación'
        } else if (hasDisputed) {
          statusLabel = 'Disputado'
          statusTone = 'error'
          responsable = 'Contractor'
          nextAction = 'Esperar respuesta del contractor'
        } else if (hasSubmitted) {
          statusLabel = 'En revisión'
          statusTone = 'info'
          responsable = 'Revisor HR'
          nextAction = 'Revisar evidencia'
        }

        const amountSource =
          blockedPayables[0]?.grossAmount ??
          subs.find(s => s.grossAmount !== null)?.grossAmount ??
          null

        const amountCurrency = blockedPayables[0]?.currency ?? subs[0]?.currency ?? engagement.currency

        return {
          contractorEngagementId: engagement.contractorEngagementId,
          engagementPublicId: engagement.publicId,
          contractorName: names.get(engagement.profileId) ?? 'Contractor',
          relationshipSubtype: SUBTYPE_LABEL[engagement.relationshipSubtype],
          country: engagement.countryCode,
          legalEntityLabel: engagement.legalEntityOrganizationId,
          agreedRate: {
            rateType: engagement.rateType,
            rateAmount: engagement.rateAmount,
            paymentCadence: engagement.paymentCadence,
            currency: engagement.currency
          },
          pendingCount: subs.filter(s => s.status === 'submitted' || s.status === 'disputed').length,
          blockedPayableCount: blockedPayables.length,
          statusLabel,
          statusTone,
          amount:
            amountSource !== null ? `${amountCurrency} ${amountSource.toLocaleString('es-CL')}` : '—',
          responsable,
          nextAction,
          classificationRiskStatus: engagement.classificationRiskStatus,
          lifecycleStatus: engagement.status
        }
      })
      .sort((a, b) => {
        // Blocked first, then disputed/in-review, then pending.
        const rank = (s: string) =>
          s === 'Bloqueado' ? 3 : s === 'Disputado' ? 2 : s === 'En revisión' ? 1 : 0

        return rank(b.statusLabel) - rank(a.statusLabel)
      })

    // ── Remittance advices for paid payables (TASK-960) ────────────────────────
    const paidEngagementIds = [...new Set(paid.map(p => p.contractorEngagementId))]
    const paidEngagementById = new Map<string, ContractorEngagement>()

    for (const id of paidEngagementIds) {
      const existing = engagementById.get(id)

      if (existing) paidEngagementById.set(id, existing)
    }

    const missingPaidIds = paidEngagementIds.filter(id => !paidEngagementById.has(id))

    const fetchedPaidEngagements = await Promise.all(
      missingPaidIds.map(id =>
        getContractorEngagementById(id).catch(error => {
          captureWithDomain(error, 'identity', {
            tags: { source: 'contractor_hr_workbench_projection', stage: 'fetch_paid_engagement' },
            extra: { contractorEngagementId: id }
          })

          return null
        })
      )
    )

    for (const e of fetchedPaidEngagements) {
      if (e) paidEngagementById.set(e.contractorEngagementId, e)
    }

    const paidNames = await resolveProfileDisplayNames(
      [...paidEngagementById.values()].map(e => e.profileId)
    ).catch(() => new Map<string, string>())

    const remittanceNumbers = await getRemittanceAdviceNumbersForPayables(
      paid.map(p => p.contractorPayableId)
    ).catch(() => new Map<string, string>())

    const remittances: ContractorRemittanceItem[] = paid
      .map((p): ContractorRemittanceItem | null => {
        const eng = paidEngagementById.get(p.contractorEngagementId)

        if (!eng) return null

        return {
          payableId: p.contractorPayableId,
          number: remittanceNumbers.get(p.contractorPayableId) ?? null,
          net: p.netPayable,
          currency: p.currency,
          dateIso: (p.updatedAt ?? p.createdAt).slice(0, 10),
          regimeLabel: SUBTYPE_LABEL[eng.relationshipSubtype],
          contractorName: paidNames.get(eng.profileId) ?? names.get(eng.profileId) ?? 'Contractor'
        }
      })
      .filter((r): r is ContractorRemittanceItem => r !== null)
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso))

    // ── Signals derived honestly from fetched data ─────────────────────────────
    const classificationOpen = [...engagementById.values()].filter(e =>
      isBlockingRisk(e.classificationRiskStatus)
    ).length

    const reviewOverdue = submitted.filter(s => hoursSince(s.submittedAt) > REVIEW_OVERDUE_HOURS).length

    const signals: ContractorWorkbenchSignal[] = [
      {
        id: 'classification',
        title: 'Riesgo de clasificación',
        description: 'Engagements activos con riesgo de clasificación laboral que requiere revisión legal.',
        statusLabel: classificationOpen > 0 ? `${classificationOpen} abiertos` : '0 abiertos',
        statusTone: classificationOpen > 0 ? 'error' : 'success',
        statusIcon: classificationOpen > 0 ? 'tabler-shield-x' : 'tabler-shield-check',
        code: 'hr.contractor_engagement.classification_risk_open'
      },
      {
        id: 'review',
        title: 'Envíos vencidos',
        description: `Envíos enviados sin revisión por más de ${REVIEW_OVERDUE_HOURS} h.`,
        statusLabel: reviewOverdue > 0 ? `${reviewOverdue} vencidos` : 'Al día',
        statusTone: reviewOverdue > 0 ? 'warning' : 'success',
        statusIcon: reviewOverdue > 0 ? 'tabler-clock-exclamation' : 'tabler-clock-check',
        code: 'hr.contractor_work_submission.review_overdue'
      },
      {
        id: 'blocked',
        title: 'Payables bloqueados',
        description: 'Payables que no pueden generar obligación Finance por un bloqueo de preparación.',
        statusLabel: blocked.length > 0 ? `${blocked.length} bloqueados` : 'Sin bloqueos',
        statusTone: blocked.length > 0 ? 'error' : 'success',
        statusIcon: blocked.length > 0 ? 'tabler-lock' : 'tabler-lock-open',
        code: 'finance.contractor_payable.ready_without_obligation'
      },
      {
        id: 'finance',
        title: 'Paso a Finance',
        description: 'Payables listos esperando que el bridge genere la obligación idempotente.',
        statusLabel: ready.length > 0 ? `${ready.length} listos` : 'Sin pendientes',
        statusTone: ready.length > 0 ? 'info' : 'success',
        statusIcon: 'tabler-building-bank',
        code: 'workforce.contractor_payable.ready_for_finance.v1'
      }
    ]

    const projection: ContractorHrWorkbenchProjection = {
      queue,
      totals: {
        inReview: submitted.length,
        blocked: blocked.length + disputed.length,
        readyForFinance: ready.length,
        paid: paid.length
      },
      remittances,
      signals,
      degraded,
      generatedAt: new Date().toISOString(),
      contractVersion: CONTRACTOR_HR_WORKBENCH_CONTRACT_VERSION
    }

    cacheEntry = { value: projection, expiresAt: Date.now() + CACHE_TTL_MS }

    return projection
  }
