import 'server-only'

/**
 * TASK-796 — Contractor self-service projection (server-only orchestrator).
 *
 * Pattern fuente: `src/lib/commercial/sample-sprints/runtime-projection.ts`
 * (TASK-835) y `src/lib/organization-workspace/projection.ts` (TASK-611).
 *
 * Única capa que compone los readers de dominio (engagement + work submissions +
 * payables + invoice assets + payable readiness + payment-profile status) en el
 * view-model contractor-facing `ContractorSelfServiceScenario`. La UI runtime de
 * `/my/contractor` NO re-deriva nada — consume `scenario` del payload.
 *
 * Cada source secundario corre via `withSourceTimeout`: una caída produce
 * `degraded[]` honest (nunca 5xx, nunca `$0` falso). Cache TTL 30s in-memory por
 * `identityProfileId`. Finance-only data (provider statements/fees) se filtra en
 * el mapper puro.
 */

import { query } from '@/lib/db'
import { listSelfServicePaymentProfiles } from '@/lib/finance/beneficiary-payment-profiles/self-service'
import { captureWithDomain } from '@/lib/observability/capture'
import { isSourceDegraded, withSourceTimeout, type SourceResult } from '@/lib/platform-health/with-source-timeout'

import { listContractorInvoiceAssetsByEngagement } from './invoice-assets'
import { assessPayableReadiness, listContractorPayablesByEngagement } from './payables/store'
import type { PayableReadinessResult } from './payables/readiness'
import type { ContractorPayable } from './payables/types'
import { listContractorEngagementsByProfile } from './store'
import { mapEngagementToSelfServiceScenario } from './self-service-scenario'
import type { ContractorEngagement, ContractorEngagementStatus } from './types'
import { listContractorWorkSubmissionsByEngagement } from './work-submissions/store'

import {
  CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION,
  type ContractorProjectionDegradedReason,
  type ContractorSelfServiceProjection
} from './projection-types'

const SOURCE_TIMEOUT_MS = 4_000
const CACHE_TTL_MS = 30_000

interface CacheEntry {
  value: ContractorSelfServiceProjection
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const cacheKey = (identityProfileId: string): string => `self-service:${identityProfileId}`

const readCache = (key: string): ContractorSelfServiceProjection | null => {
  const entry = cache.get(key)

  if (!entry) return null

  if (entry.expiresAt < Date.now()) {
    cache.delete(key)

    return null
  }

  return entry.value
}

const writeCache = (key: string, value: ContractorSelfServiceProjection): void => {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Test/consumer helper — drop the cached projection for a profile. */
export const clearContractorSelfServiceCacheForProfile = (identityProfileId: string): void => {
  cache.delete(cacheKey(identityProfileId))
}

/** Test helper — clear the whole cache. */
export const __clearContractorSelfServiceCache = (): void => {
  cache.clear()
}

// ── Active engagement resolution (gap helper) ─────────────────────────────────
// The store has no member-scoped reader; resolve by profileId and pick the most
// relevant engagement (active > ending > pending_review > paused > draft, then
// most-recently-updated within the same priority).
const STATUS_PRIORITY: Record<ContractorEngagementStatus, number> = {
  active: 6,
  ending: 5,
  pending_review: 4,
  paused: 3,
  draft: 2,
  ended: 1,
  cancelled: 0
}

export const getActiveContractorEngagementForProfile = async (
  identityProfileId: string
): Promise<ContractorEngagement | null> => {
  const engagements = await listContractorEngagementsByProfile(identityProfileId)

  if (engagements.length === 0) return null

  const ranked = [...engagements].sort((a, b) => {
    const byStatus = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status]

    if (byStatus !== 0) return byStatus

    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  })

  return ranked[0] ?? null
}

// ── Secondary source resolvers ────────────────────────────────────────────────

const resolveContractorName = async (profileId: string): Promise<string> => {
  const rows = await query<{ full_name: string | null }>(
    `SELECT full_name FROM greenhouse_core.identity_profiles WHERE identity_profile_id = $1`,
    [profileId]
  )

  return rows[0]?.full_name?.trim() || 'Contractor'
}

const resolveLegalEntityLabel = async (organizationId: string): Promise<string> => {
  const rows = await query<{ organization_name: string | null; legal_name: string | null }>(
    `SELECT organization_name, legal_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [organizationId]
  )

  const row = rows[0]

  return row?.legal_name?.trim() || row?.organization_name?.trim() || 'Entidad contratante'
}

interface PaymentProfileStatusView {
  label: string
  detail: string
}

const resolvePaymentProfileStatus = async (memberId: string): Promise<PaymentProfileStatusView> => {
  const profiles = await listSelfServicePaymentProfiles({ memberId })

  const hasActive = profiles.some(p => p.status === 'active')
  const hasPending = profiles.some(p => p.status === 'pending_approval' || p.status === 'draft')

  const label = hasActive ? 'Cuenta activa' : hasPending ? 'Cuenta en revisión' : 'Sin cuenta de pago'

  const detail = hasActive
    ? 'Los cambios se solicitan en Mi cuenta de pago.'
    : hasPending
      ? 'Tu solicitud está en revisión de Finance (maker-checker).'
      : 'Configura tu cuenta de pago para habilitar el pago.'

  return { label, detail }
}

/** Latest non-terminal payable (for readiness assessment + scenario derivation). */
const pickLatestPayableForReadiness = (payables: ContractorPayable[]): ContractorPayable | null => {
  // payables come newest-first; readiness only matters for non-paid/cancelled.
  return payables.find(p => p.status !== 'paid' && p.status !== 'cancelled') ?? payables[0] ?? null
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface ResolveContractorSelfServiceProjectionInput {
  identityProfileId: string
  memberId: string
}

const buildEmptyProjection = (
  degraded: ContractorProjectionDegradedReason[]
): ContractorSelfServiceProjection => ({
  state: 'no_engagement',
  scenario: null,
  degraded,
  generatedAt: new Date().toISOString(),
  contractVersion: CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION
})

export const resolveContractorSelfServiceProjection = async (
  input: ResolveContractorSelfServiceProjectionInput
): Promise<ContractorSelfServiceProjection> => {
  const { identityProfileId, memberId } = input
  const key = cacheKey(identityProfileId)

  const cached = readCache(key)

  if (cached) return cached

  const degraded: ContractorProjectionDegradedReason[] = []

  // Source 0 — active engagement. If THIS fails, degrade to honest empty state.
  let engagement: ContractorEngagement | null = null

  try {
    engagement = await getActiveContractorEngagementForProfile(identityProfileId)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_self_service_projection', stage: 'resolve_engagement' },
      extra: { identityProfileId }
    })
    degraded.push({
      code: 'engagement_unresolved',
      source: 'engagement',
      severity: 'error',
      message: 'No pudimos resolver tu engagement contractor en este momento.'
    })

    return buildEmptyProjection(degraded)
  }

  if (!engagement) {
    const empty = buildEmptyProjection(degraded)

    writeCache(key, empty)

    return empty
  }

  const engagementId = engagement.contractorEngagementId

  // Secondary sources in parallel, each timeout-wrapped (degraded honest).
  const [
    submissionsResult,
    payablesResult,
    invoiceAssetsResult,
    contractorNameResult,
    legalEntityResult,
    paymentProfileResult
  ] = await Promise.all([
    withSourceTimeout(() => listContractorWorkSubmissionsByEngagement(engagementId), {
      source: 'work_submissions',
      timeoutMs: SOURCE_TIMEOUT_MS
    }),
    withSourceTimeout(() => listContractorPayablesByEngagement(engagementId), {
      source: 'payables',
      timeoutMs: SOURCE_TIMEOUT_MS
    }),
    withSourceTimeout(() => listContractorInvoiceAssetsByEngagement(engagementId), {
      source: 'invoice_assets',
      timeoutMs: SOURCE_TIMEOUT_MS
    }),
    withSourceTimeout(() => resolveContractorName(engagement.profileId), {
      source: 'contractor_name',
      timeoutMs: SOURCE_TIMEOUT_MS
    }),
    withSourceTimeout(() => resolveLegalEntityLabel(engagement.legalEntityOrganizationId), {
      source: 'legal_entity',
      timeoutMs: SOURCE_TIMEOUT_MS
    }),
    withSourceTimeout(() => resolvePaymentProfileStatus(memberId), {
      source: 'payment_profile',
      timeoutMs: SOURCE_TIMEOUT_MS
    })
  ])

  const recordIfDegraded = (
    result: SourceResult<unknown>,
    severity: 'warning' | 'error',
    message: string
  ): void => {
    if (isSourceDegraded(result)) {
      degraded.push({ code: `${result.source}_unavailable`, source: result.source, severity, message })
    }
  }

  recordIfDegraded(submissionsResult, 'warning', 'No pudimos cargar tus envíos de trabajo.')
  recordIfDegraded(payablesResult, 'warning', 'No pudimos cargar el estado de tus pagos.')
  recordIfDegraded(invoiceAssetsResult, 'warning', 'No pudimos cargar tus documentos de soporte.')
  recordIfDegraded(legalEntityResult, 'warning', 'No pudimos resolver la entidad contratante.')
  recordIfDegraded(paymentProfileResult, 'warning', 'No pudimos cargar el estado de tu cuenta de pago.')

  const submissions = submissionsResult.value ?? []
  const payables = payablesResult.value ?? []
  const invoiceAssets = invoiceAssetsResult.value ?? []

  // Readiness for the latest non-terminal payable (best-effort; degrade silently).
  let latestPayableReadiness: PayableReadinessResult | null = null
  const latestPayable = pickLatestPayableForReadiness(payables)

  if (latestPayable && latestPayable.status !== 'paid') {
    const readinessResult = await withSourceTimeout(() => assessPayableReadiness(latestPayable), {
      source: 'payable_readiness',
      timeoutMs: SOURCE_TIMEOUT_MS
    })

    latestPayableReadiness = readinessResult.value
    recordIfDegraded(readinessResult, 'warning', 'No pudimos evaluar la preparación del pago.')
  }

  const projection: ContractorSelfServiceProjection = {
    state: 'active',
    scenario: mapEngagementToSelfServiceScenario({
      engagement,
      submissions,
      payables,
      invoiceAssets,
      latestPayableReadiness,
      legalEntityLabel: legalEntityResult.value ?? 'Entidad contratante',
      contractorName: contractorNameResult.value ?? 'Contractor',
      paymentProfileLabel: paymentProfileResult.value?.label ?? 'Cuenta de pago',
      paymentProfileDetail:
        paymentProfileResult.value?.detail ?? 'Revisa el estado de tu cuenta en Mi cuenta de pago.'
    }),
    degraded,
    generatedAt: new Date().toISOString(),
    contractVersion: CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION
  }

  writeCache(key, projection)

  return projection
}
