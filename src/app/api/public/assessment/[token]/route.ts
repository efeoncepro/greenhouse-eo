import { NextResponse } from 'next/server'

import {
  capturePublicAssessmentSelfId,
  resolvePublicAssessmentViewByToken,
  savePublicAssessmentResponse,
  startPublicAssessment,
  submitPublicAssessment,
} from '@/lib/hiring/assessment'
import { HiringValidationError, isHiringError } from '@/lib/hiring/errors'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

interface PublicAssessmentBody {
  action?: 'start' | 'save' | 'submit' | 'self_id'
  questionId?: string
  answer?: unknown
  consentGranted?: boolean
  consentPolicyVersion?: string
  selections?: Array<{ dimensionKey: string; categoryKey: string }>
}

const PUBLIC_MESSAGES = {
  unavailable: 'La evaluación no está disponible.',
  invalid: 'No pudimos procesar la solicitud.',
  error: 'No pudimos completar la operación.',
}

const toPublicAssessmentError = (error: unknown) => {
  if (error instanceof HiringValidationError) {
    const status = error.statusCode === 404 ? 404 : error.statusCode

    return NextResponse.json({ ok: false, code: error.code, message: PUBLIC_MESSAGES.invalid }, { status })
  }

  if (isHiringError(error)) {
    return NextResponse.json({ ok: false, code: error.code, message: PUBLIC_MESSAGES.unavailable }, { status: 404 })
  }

  captureWithDomain(error, 'hiring', { tags: { source: 'public_assessment' } })

  return NextResponse.json({ ok: false, code: 'assessment_public_error', message: PUBLIC_MESSAGES.error }, { status: 502 })
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const view = await resolvePublicAssessmentViewByToken(token)

    if (!view) {
      return NextResponse.json({ ok: false, code: 'assessment_unavailable', message: PUBLIC_MESSAGES.unavailable }, { status: 404 })
    }

    return NextResponse.json({ ok: true, assessment: view })
  } catch (error) {
    return toPublicAssessmentError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let body: PublicAssessmentBody

  try {
    body = (await request.json()) as PublicAssessmentBody
  } catch {
    return NextResponse.json({ ok: false, code: 'assessment_invalid_body', message: PUBLIC_MESSAGES.invalid }, { status: 400 })
  }

  try {
    if (body.action === 'start') {
      return NextResponse.json({ ok: true, assessment: await startPublicAssessment(token) })
    }

    if (body.action === 'save') {
      if (!body.questionId) {
        return NextResponse.json({ ok: false, code: 'assessment_question_required', message: PUBLIC_MESSAGES.invalid }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        assessment: await savePublicAssessmentResponse(token, { questionId: body.questionId, answer: body.answer }),
      })
    }

    if (body.action === 'submit') {
      return NextResponse.json({ ok: true, assessment: await submitPublicAssessment(token) })
    }

    if (body.action === 'self_id') {
      const result = await capturePublicAssessmentSelfId(token, {
        consentGranted: body.consentGranted,
        consentPolicyVersion: body.consentPolicyVersion,
        selections: body.selections,
      })

      return NextResponse.json({ ok: true, selfId: result }, { status: 201 })
    }

    return NextResponse.json({ ok: false, code: 'assessment_invalid_action', message: PUBLIC_MESSAGES.invalid }, { status: 400 })
  } catch (error) {
    return toPublicAssessmentError(error)
  }
}
