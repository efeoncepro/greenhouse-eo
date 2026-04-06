import { NextResponse } from 'next/server'

import { render } from '@react-email/render'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { sendEmail } from '@/lib/email/delivery'
import { getPreviewCatalog, getPreviewMeta, resolveTemplate } from '@/lib/email/templates'
import type { EmailType } from '@/lib/email/types'

export const dynamic = 'force-dynamic'

const VALID_LOCALES = ['es', 'en'] as const

/**
 * GET /api/admin/emails/preview
 *
 * Renders an email template to HTML for preview.
 *
 * Query params:
 *   - template: EmailType (required, or omit to get catalog)
 *   - locale: 'es' | 'en' (default 'es')
 *   - props: JSON-encoded override props (optional)
 *
 * Returns:
 *   - If no template param: { catalog: PreviewMeta[] }
 *   - If template param: { html, subject, text }
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const templateName = searchParams.get('template')

  if (!templateName) {
    return NextResponse.json({ catalog: getPreviewCatalog() })
  }

  const meta = getPreviewMeta(templateName as EmailType)

  if (!meta) {
    return NextResponse.json({ error: `Template "${templateName}" no encontrado.` }, { status: 404 })
  }

  const locale = VALID_LOCALES.includes(searchParams.get('locale') as typeof VALID_LOCALES[number])
    ? searchParams.get('locale') as 'es' | 'en'
    : 'es'

  let overrideProps: Record<string, unknown> = {}

  try {
    const propsParam = searchParams.get('props')

    if (propsParam) {
      overrideProps = JSON.parse(propsParam)
    }
  } catch {
    return NextResponse.json({ error: 'props debe ser JSON valido.' }, { status: 400 })
  }

  const mergedProps = {
    ...meta.defaultProps,
    ...overrideProps,
    ...(meta.supportsLocale ? { locale } : {})
  }

  try {
    const resolved = resolveTemplate(templateName as EmailType, mergedProps)
    const html = await render(resolved.react)

    return NextResponse.json({
      html,
      subject: resolved.subject,
      text: resolved.text,
      meta: {
        label: meta.label,
        domain: meta.domain,
        supportsLocale: meta.supportsLocale
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al renderizar template.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/emails/preview
 *
 * Sends a test email using the delivery layer.
 *
 * Body:
 *   - template: EmailType (required)
 *   - locale: 'es' | 'en' (default 'es')
 *   - props: override props (optional)
 *   - recipientEmail: string (optional, defaults to admin's email)
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { template, locale: bodyLocale, props, recipientEmail } = body

    if (!template) {
      return NextResponse.json({ error: 'template es requerido.' }, { status: 400 })
    }

    const meta = getPreviewMeta(template as EmailType)

    if (!meta) {
      return NextResponse.json({ error: `Template "${template}" no encontrado.` }, { status: 404 })
    }

    const locale = VALID_LOCALES.includes(bodyLocale) ? bodyLocale : 'es'

    const mergedProps = {
      ...meta.defaultProps,
      ...(props || {}),
      ...(meta.supportsLocale ? { locale } : {})
    }

    const targetEmail = recipientEmail || tenant.userId

    const result = await sendEmail({
      emailType: template as EmailType,
      domain: meta.domain,
      recipients: [{ email: targetEmail }],
      context: mergedProps,
      sourceEntity: 'email_preview_test',
      actorEmail: tenant.userId
    })

    return NextResponse.json({
      sent: result.status === 'sent',
      deliveryId: result.deliveryId,
      recipientEmail: targetEmail,
      status: result.status,
      ...(result.error ? { error: result.error } : {})
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al enviar correo de prueba.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
