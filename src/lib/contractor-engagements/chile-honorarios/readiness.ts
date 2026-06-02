import 'server-only'

/**
 * TASK-794 — Chile honorarios readiness (server-only).
 *
 * Resolves whether an honorarios contractor can be paid out from a tax/identity
 * compliance standpoint. Per arch GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_
 * ARCHITECTURE_V1 §Chile Honorarios Policy, readiness must consume
 * `person-legal-profile` with use case `honorarios_closure`: a VERIFIED Chilean
 * RUT (CL_RUT) is a fail-closed blocker. Address is NOT required for a boleta de
 * honorarios (the `honorarios_closure` use case already excludes it).
 *
 * Fail-closed: if the legal-profile lookup throws, we treat the RUT as NOT
 * verified (blocked) and capture to Sentry — never let an honorarios payable
 * reach Finance when we cannot confirm the identity document.
 */
import { assessPersonLegalReadiness } from '@/lib/person-legal-profile'
import { captureWithDomain } from '@/lib/observability/capture'

export interface HonorariosReadinessResult {
  /** True only when the profile has a CL_RUT with verification_status='verified'. */
  rutVerified: boolean
  /**
   * The person-legal-profile blocker code that explains why the RUT is not
   * usable (e.g. `cl_rut_missing`, `cl_rut_pending_review`, `cl_rut_rejected`,
   * `profile_missing`). Null when verified. `lookup_failed` on transient error.
   */
  blockerCode: string | null
}

/**
 * Resolve honorarios RUT readiness for a profile. Returns `rutVerified=false`
 * with a blocker code when the verified CL_RUT gate fails (or when the lookup
 * itself fails — fail-closed for tax compliance).
 */
export const resolveHonorariosReadiness = async (params: {
  profileId: string
}): Promise<HonorariosReadinessResult> => {
  try {
    const readiness = await assessPersonLegalReadiness({
      profileId: params.profileId,
      useCase: 'honorarios_closure'
    })

    if (readiness.ready) {
      return { rutVerified: true, blockerCode: null }
    }

    return {
      rutVerified: false,
      blockerCode: readiness.blockers[0] ?? 'cl_rut_missing'
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'chile_honorarios_readiness', stage: 'assess_person_legal' },
      extra: { profileId: params.profileId }
    })

    // Fail-closed: cannot confirm the RUT → not payable.
    return { rutVerified: false, blockerCode: 'lookup_failed' }
  }
}
