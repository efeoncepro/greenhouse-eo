import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  buildPublicAssessmentViewWithClient,
  savePublicAssessmentResponseWithClient,
  startPublicAssessmentWithClient,
  submitPublicAssessmentWithClient,
} from '@/lib/hiring/assessment/public-taking'
import { getAssessmentByIdWithClient } from '@/lib/hiring/assessment/instances'
import {
  captureVoluntaryDemographicSelfIdWithClient,
  getSelfIdSubjectByAssessmentWithClient,
} from '@/lib/hiring/assessment/fairness/capture-self-id'
import type { DemographicSelection } from '@/lib/hiring/assessment/fairness/contracts'
import { HiringValidationError, isHiringError } from '@/lib/hiring/errors'
import {
  PUBLIC_ASSESSMENT_SESSION_COOKIE,
  hasExactSameOrigin,
  hasOnlyKeys,
  publicAssessmentResponseHeaders,
  readBoundedJsonObject,
} from '@/lib/hiring/assessment/public-session/http'
import { withPublicAssessmentSession } from '@/lib/hiring/assessment/public-session/service'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const messages = {
  unavailable: 'La evaluación no está disponible.',
  invalid: 'No pudimos procesar la solicitud.',
  error: 'No pudimos completar la operación.',
}

const json = (body: object, status = 200) => NextResponse.json(body, {
  status,
  headers: publicAssessmentResponseHeaders,
})

const unavailable = () => json({ ok: false, code: 'assessment_unavailable', message: messages.unavailable }, 404)

const toPublicError = (error: unknown) => {
  if (error instanceof HiringValidationError) {
    return json({ ok: false, code: error.code, message: messages.invalid }, error.statusCode === 404 ? 404 : error.statusCode)
  }

  if (isHiringError(error)) return unavailable()

  captureWithDomain(error, 'hiring', { tags: { source: 'public_assessment_session' } })

  return json({ ok: false, code: 'assessment_public_error', message: messages.error }, 502)
}

const sessionTokenFrom = (request: NextRequest) =>
  request.cookies.get(PUBLIC_ASSESSMENT_SESSION_COOKIE)?.value ?? ''

export async function GET(request: NextRequest) {
  try {
    const view = await withPublicAssessmentSession(sessionTokenFrom(request), async (client, session) => {
      const assessment = await getAssessmentByIdWithClient(client, session.assessmentId)

      return assessment ? buildPublicAssessmentViewWithClient(client, assessment) : null
    })

    return view ? json({ ok: true, assessment: view }) : unavailable()
  } catch (error) {
    return toPublicError(error)
  }
}

export async function POST(request: NextRequest) {
  if (!hasExactSameOrigin(request)) return json({ ok: false, code: 'assessment_unavailable', message: messages.unavailable }, 403)

  const body = await readBoundedJsonObject(request)

  if (!body || typeof body.action !== 'string' || typeof body.expectedAssessmentPublicId !== 'string') {
    return json({ ok: false, code: 'assessment_invalid_body', message: messages.invalid }, 400)
  }

  try {
    const result = await withPublicAssessmentSession(sessionTokenFrom(request), async (client, session) => {
      const assessment = await getAssessmentByIdWithClient(client, session.assessmentId)

      if (!assessment || assessment.publicId !== body.expectedAssessmentPublicId) return null

      if (body.action === 'start' && hasOnlyKeys(body, ['action', 'expectedAssessmentPublicId'])) {
        const started = await startPublicAssessmentWithClient(client, assessment.assessmentId)

        return started.outcome === 'ok'
          ? { kind: 'assessment' as const, value: await buildPublicAssessmentViewWithClient(client, started.value) }
          : null
      }

      if (body.action === 'save'
        && hasOnlyKeys(body, ['action', 'expectedAssessmentPublicId', 'questionId', 'answer'])
        && typeof body.questionId === 'string') {
        const saved = await savePublicAssessmentResponseWithClient(client, assessment, {
          questionId: body.questionId,
          answer: body.answer,
        })

        if (saved.outcome !== 'ok') return null

        const updated = await getAssessmentByIdWithClient(client, assessment.assessmentId)

        return updated
          ? { kind: 'assessment' as const, value: await buildPublicAssessmentViewWithClient(client, updated) }
          : null
      }

      if (body.action === 'submit' && hasOnlyKeys(body, ['action', 'expectedAssessmentPublicId'])) {
        const submitted = await submitPublicAssessmentWithClient(client, assessment)

        if (submitted.outcome !== 'ok') return null

        const updated = await getAssessmentByIdWithClient(client, assessment.assessmentId)

        return updated
          ? { kind: 'assessment' as const, value: await buildPublicAssessmentViewWithClient(client, updated) }
          : null
      }

      if (body.action === 'self_id'
        && hasOnlyKeys(body, ['action', 'expectedAssessmentPublicId', 'consentGranted', 'consentPolicyVersion', 'selections'])) {
        if (body.consentGranted !== true || typeof body.consentPolicyVersion !== 'string' || !Array.isArray(body.selections)) {
          throw new HiringValidationError(messages.invalid, 'assessment_invalid_body', 400)
        }

        const subject = await getSelfIdSubjectByAssessmentWithClient(client, assessment.assessmentId)

        if (!subject) return null

        const captured = await captureVoluntaryDemographicSelfIdWithClient(client, {
          identityProfileId: subject.identityProfileId,
          applicationId: subject.applicationId,
          consentGranted: true,
          consentPolicyVersion: body.consentPolicyVersion,
          selections: body.selections as DemographicSelection[],
          actorKind: 'candidate_token',
        })

        return { kind: 'self_id' as const, value: captured }
      }

      throw new HiringValidationError(messages.invalid, 'assessment_invalid_action', 400)
    })

    if (!result) return unavailable()

    return result.kind === 'assessment'
      ? json({ ok: true, assessment: result.value })
      : json({ ok: true, selfId: result.value }, 201)
  } catch (error) {
    return toPublicError(error)
  }
}
