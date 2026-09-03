import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { can } from '@/lib/entitlements/runtime'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import {
  getOffboardingCase,
  previewOffboardingCaseReview,
  reviewOffboardingCase,
  type ReviewOffboardingCaseInput
} from '@/lib/workforce/offboarding'

/**
 * TASK-1349 — Full API Parity for the offboarding case review.
 *
 * The `app` lane is an ADAPTER: transport + authorization, then delegate to the
 * canonical command. Every rule (reason, version conflict, explicit cause and
 * dates, lane recompute, approval invalidation) lives in `reviewOffboardingCase`
 * — the portal, this lane and Nexa share it by construction.
 */

type CommandBody = Record<string, unknown>

const DOMAIN_409_CODES: Record<string, 'offboarding_case_version_conflict' | 'offboarding_case_review_required'> = {
  offboarding_case_version_conflict: 'offboarding_case_version_conflict',
  offboarding_case_review_required: 'offboarding_case_review_required'
}

const run = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof HrCoreValidationError) {
      const statusCode = error.statusCode ?? 400
      const domainCode = error.code ?? ''

      throw new ApiPlatformError(error.message, {
        statusCode,
        errorCode:
          statusCode === 404
            ? 'not_found'
            : statusCode === 403
              ? 'forbidden'
              : statusCode === 409
                ? (DOMAIN_409_CODES[domainCode] ?? 'bad_request')
                : 'bad_request'
      })
    }

    throw error
  }
}

const assertInternalReviewCapability = (context: AppPlatformRequestContext) => {
  if (
    context.tenant.tenantType !== 'efeonce_internal' ||
    !can(context.tenant, 'workforce.offboarding.review_case', 'execute', 'tenant')
  ) {
    throw new ApiPlatformError('Offboarding case review is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }
}

const toReviewInput = (body: CommandBody): ReviewOffboardingCaseInput => ({
  decision: body.decision as ReviewOffboardingCaseInput['decision'],
  reason: typeof body.reason === 'string' ? body.reason : '',
  expectedUpdatedAt: typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : '',
  separationType: (body.separationType as ReviewOffboardingCaseInput['separationType']) ?? null,
  effectiveDate: typeof body.effectiveDate === 'string' ? body.effectiveDate : null,
  lastWorkingDay: typeof body.lastWorkingDay === 'string' ? body.lastWorkingDay : null,
  lastWorkingDayAfterEffectiveReason:
    typeof body.lastWorkingDayAfterEffectiveReason === 'string' ? body.lastWorkingDayAfterEffectiveReason : null,
  notes: typeof body.notes === 'string' ? body.notes : null,
  approveNow: body.approveNow === true
})

export const previewAppOffboardingCaseReview = async ({
  context,
  caseId,
  body
}: {
  context: AppPlatformRequestContext
  caseId: string
  body: CommandBody
}) => {
  assertInternalReviewCapability(context)

  return run(async () => {
    const current = await getOffboardingCase(caseId)

    if (!current) {
      throw new ApiPlatformError('Offboarding case not found.', { statusCode: 404, errorCode: 'not_found' })
    }

    return previewOffboardingCaseReview({
      current,
      input: toReviewInput(body),
      actorUserId: context.tenant.userId,
      canApprove: can(context.tenant, 'hr.offboarding_case', 'approve', 'tenant')
    })
  })
}

/**
 * 🔴 Confirming is fail-closed for delegated agents (same split as Hiring):
 * a delegated token may preview; reviewing a person's exit needs a human session.
 */
export const reviewAppOffboardingCase = async ({
  context,
  caseId,
  body
}: {
  context: AppPlatformRequestContext
  caseId: string
  body: CommandBody
}) => {
  assertInternalReviewCapability(context)

  if (context.authSource === 'sister_platform_oauth') {
    throw new ApiPlatformError('Offboarding case review requires a human session.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const input = toReviewInput(body)
  const canApprove = can(context.tenant, 'hr.offboarding_case', 'approve', 'tenant')

  if (input.approveNow && !canApprove) {
    throw new ApiPlatformError('Approving the case is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }

  return run(() => reviewOffboardingCase({ caseId, input, actorUserId: context.tenant.userId, canApprove }))
}
