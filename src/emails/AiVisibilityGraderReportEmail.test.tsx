import { render } from '@react-email/render'
import { describe, expect, it } from 'vitest'

import AiVisibilityGraderReportEmail from './AiVisibilityGraderReportEmail'

const baseProps = {
  organizationName: 'Acme Corp',
  scoreValue: 72,
  levelLabel: 'Intermedio',
  primaryGapTitle: 'Autoridad temática',
  isPartial: false,
  insight: {
    detection: 'Baja asociación temática en tu categoría.',
    importance: 'Limita tu visibilidad en respuestas generativas.',
    action: 'Publica contenidos pilar sobre tus temas clave.'
  },
  reportUrl: 'https://greenhouse.efeoncepro.com/grader/r/grt-abc',
  attachmentFilename: 'informe-visibilidad-ia-acme.pdf',
  attachmentSizeLabel: '~2 MB'
}

describe('AiVisibilityGraderReportEmail', () => {
  it('renders the report packet (score, insight, CTA, attachment) in es-CL', async () => {
    const html = await render(AiVisibilityGraderReportEmail({ ...baseProps, locale: 'es' }))

    expect(html).toContain('lang="es"')
    expect(html).toContain('Recibiste tu informe completo')
    expect(html).toContain('Acme Corp')
    expect(html).toContain('Visibilidad estimada')
    expect(html).toContain('72')
    expect(html).toContain('Autoridad temática')
    expect(html).toContain('Abrir informe seguro')
    expect(html).toContain('informe-visibilidad-ia-acme.pdf')
    // Insight block (qué detectamos / por qué importa / qué hacer ahora)
    expect(html).toContain('Qué detectamos')
    expect(html).toContain('Por qué importa')
    expect(html).toContain('Qué hacer ahora')
  })

  it('carries the Efeonce (agency) masthead, never the Greenhouse portal brand', async () => {
    const html = await render(AiVisibilityGraderReportEmail({ ...baseProps, locale: 'es' }))

    // Efeonce agency masthead, not the portal logo.
    expect(html).toContain('efeonce-wordmark-white')
    expect(html).not.toContain('logo-white-email.png')
    // "Efeonce Greenhouse" is carried brand debt — must never appear on this public surface.
    expect(html).not.toContain('Efeonce Greenhouse')
    // Efeonce slogan in the footer.
    expect(html).toContain('Empower your Growth')
  })

  it('renders an honest partial-delivery banner when the snapshot is partial', async () => {
    const html = await render(AiVisibilityGraderReportEmail({ ...baseProps, isPartial: true, locale: 'es' }))

    expect(html).toContain('Tu informe de visibilidad está listo')
    expect(html).toContain('Entrega parcial')
  })

  it('falls back to "Sin dato" when the score is null and omits the insight block when absent', async () => {
    const html = await render(
      AiVisibilityGraderReportEmail({ ...baseProps, scoreValue: null, levelLabel: null, insight: null, locale: 'es' })
    )

    expect(html).toContain('Sin dato')
    expect(html).not.toContain('Prioridad #1')
  })

  it('renders the English fallback copy', async () => {
    const html = await render(AiVisibilityGraderReportEmail({ ...baseProps, locale: 'en' }))

    expect(html).toContain('lang="en"')
    expect(html).toContain('Your full report is here')
    expect(html).toContain('Estimated visibility')
    expect(html).toContain('Open secure report')
  })
})
