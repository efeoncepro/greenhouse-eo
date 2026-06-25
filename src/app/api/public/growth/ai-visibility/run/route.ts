import { NextResponse } from 'next/server'

import { createPublicGraderRun } from '@/lib/growth/ai-visibility/public-intake'
import { type PublicGraderRunInput, type PublicIntakeOutcome } from '@/lib/growth/ai-visibility/public-intake/contracts'
import { createPublicGraderRunViaFormsEngine } from '@/lib/growth/ai-visibility/public-intake/forms-engine-binding'
import { isGraderIntakeOnFormsEngineEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1240 — `POST /api/public/growth/ai-visibility/run` (EPIC-020 B)
 *
 * Único WRITE público del dominio. SIN sesión: protegido por captcha + rate-limit +
 * presupuesto global (en el command). Detrás del flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED`
 * (default OFF → `disabled` 404). Encola un run `public_diagnostic`+`light` (worker async);
 * el EMAIL (PII) vive sólo en el lead, NUNCA viaja a providers. Devuelve `runPublicId` para poll.
 */

export const dynamic = 'force-dynamic'

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

const STATUS_BY_OUTCOME: Record<PublicIntakeOutcome, number> = {
  accepted: 202,
  invalid: 400,
  captcha_failed: 403,
  rate_limited: 429,
  cost_blocked: 503,
  disabled: 404
}

interface IntakeBody {
  brandName?: unknown
  websiteUrl?: unknown
  market?: unknown
  locale?: unknown
  category?: unknown
  competitorsDeclared?: unknown
  email?: unknown
  firstName?: unknown
  lastName?: unknown
  consent?: unknown
  industry?: unknown
  persona?: unknown
  companySize?: unknown
  mainChallenge?: unknown
  captchaToken?: unknown
  idempotencyKey?: unknown
}

export async function POST(request: Request) {
  let body: IntakeBody

  try {
    body = (await request.json()) as IntakeBody
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const input: PublicGraderRunInput = {
    brandName: asString(body.brandName) ?? '',
    websiteUrl: asString(body.websiteUrl),
    market: asString(body.market) ?? '',
    locale: asString(body.locale) ?? '',
    category: asString(body.category) ?? '',
    competitorsDeclared: Array.isArray(body.competitorsDeclared)
      ? body.competitorsDeclared.filter((value): value is string => typeof value === 'string')
      : [],
    email: asString(body.email) ?? '',
    // TASK-1257 — nombre/apellido (PII). Tolerante (nullable): el form los pide, el command no los exige.
    firstName: asString(body.firstName),
    lastName: asString(body.lastName),
    consent: body.consent === true,
    industry: asString(body.industry),
    persona: asString(body.persona),
    companySize: asString(body.companySize),
    mainChallenge: asString(body.mainChallenge)
  }

  try {
    // TASK-1251 — convergencia detrás de flag: con ON, `POST /run` actúa como fachada
    // que persiste un submission del motor (el run lo encola un reactive consumer);
    // con OFF (default), usa el path a-medida que encola inline. Contrato HTTP estable.
    const intakeContext = {
      ip: getClientIp(request),
      captchaToken: asString(body.captchaToken),
      idempotencyKey: asString(body.idempotencyKey)
    }

    const result = isGraderIntakeOnFormsEngineEnabled()
      ? await createPublicGraderRunViaFormsEngine(input, intakeContext)
      : await createPublicGraderRun(input, intakeContext)

    return NextResponse.json(
      {
        outcome: result.outcome,
        // `runPublicId` (EO-GRUN-#####) es display/admin — NO el handle de poll (es secuencial).
        runPublicId: result.runPublicId,
        // Handle de poll (alta entropía): `pollToken` (path a-medida) o `submissionId` (convergente).
        // La página hace poll a `GET /run/[pollToken ?? submissionId]`.
        pollToken: result.pollToken ?? null,
        submissionId: result.submissionId ?? null,
        message: result.reason
      },
      { status: STATUS_BY_OUTCOME[result.outcome] }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_intake_route' } })

    return NextResponse.json({ error: 'No fue posible procesar tu solicitud. Intenta de nuevo en unos minutos.' }, { status: 502 })
  }
}
