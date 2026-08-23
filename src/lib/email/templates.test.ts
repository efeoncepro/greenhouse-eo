import { describe, expect, it } from 'vitest'

import { getPreviewCatalog, listRegisteredTemplates, resolveTemplate } from './templates'

describe('email templates registry', () => {
  it('registers the core Greenhouse templates', () => {
    expect(listRegisteredTemplates()).toEqual(expect.arrayContaining([
      'password_reset',
      'invitation',
      'verify_email',
      'notification',
      'payroll_export',
      'payroll_receipt',
      'weekly_executive_digest'
    ]))
  })

  it('exposes every registered template in the admin preview catalog', () => {
    const previewTypes = new Set(getPreviewCatalog().map(template => template.emailType))

    expect([...previewTypes].sort()).toEqual([...listRegisteredTemplates()].sort())
  })

  it('resolves the notification template with the provided context', () => {
    const template = resolveTemplate('notification', {
      title: 'Nuevo servicio disponible',
      body: 'Revisa el nuevo servicio en Greenhouse.',
      actionUrl: '/agency/services',
      recipientName: 'Ada Lovelace'
    })

    expect(template.subject).toBe('Nuevo servicio disponible')
    expect(template.text).toContain('Nuevo servicio disponible')
    expect(template.text).toContain('/agency/services')
  })

  it('renders the internal assessment-completed notice without a score or automatic decision', () => {
    const template = resolveTemplate('hiring_assessment_submitted_internal', {
      candidateName: 'María González',
      openingTitle: 'Content Creator',
      applicationPublicId: 'EO-APP-0001',
      submittedAt: '2026-08-15T21:30:00.000Z',
      timeLimitMinutes: 90,
      applicationUrl: 'https://greenhouse.efeoncepro.com/agency/hiring/applications/happ-1',
    })

    expect(template.subject).toBe('Test completado: María González — Content Creator')
    expect(template.text).toContain('Las respuestas quedaron listas para revisión')
    expect(template.text).toContain('/agency/hiring/applications/happ-1')
    expect(template.text.toLowerCase()).not.toContain('seleccionado')
    expect(template.text.toLowerCase()).not.toContain('score')
  })

  it('renders assessment recovery as a new link that invalidates the previous one', () => {
    const template = resolveTemplate('hiring_assessment_access_recovery', {
      recipientName: 'María González',
      openingTitle: 'Content Creator',
      assessmentUrl: 'https://greenhouse.example/public/assessment/access#access=memory-only',
      timeLimitMinutes: 45,
      tokenTtlDays: 14,
      locale: 'es',
    })

    expect(template.subject).toContain('nuevo acceso')
    expect(template.text).toContain('Cualquier enlace anterior dejó de ser válido')
    expect(template.text).toContain('#access=memory-only')
  })

  it('describes an in-progress recovery with its exact unchanged deadline', () => {
    const template = resolveTemplate('hiring_assessment_access_recovery', {
      recipientName: 'María González',
      openingTitle: 'Content Creator',
      assessmentUrl: 'https://greenhouse.example/public/assessment/access#access=memory-only',
      timeLimitMinutes: 45,
      tokenTtlDays: 14,
      inProgress: true,
      expiresAt: '2026-08-19T14:30:00.000Z',
      locale: 'es',
    })

    expect(template.text).toContain('tiempo de la evaluación ya está corriendo')
    expect(template.text).toContain('Continúa ahora')
    expect(template.text).toContain('hora de Chile')
    expect(template.text).not.toContain('2026-08-19T14:30:00.000Z')
    expect(template.text).not.toContain('vence en 14 días')
  })

  it('personalizes the selected-candidate subject and preserves the offer-before-contract sequence', () => {
    const template = resolveTemplate('hiring_decision_selected', {
      recipientName: 'María González',
      openingTitle: 'Content Creator',
      locale: 'es',
    })

    expect(template.subject).toBe('María, te elegimos para Content Creator — Efeonce')
    expect(template.text).toContain('carta oferta')
    expect(template.text).toContain('Cuando la revises y aceptes')
    expect(template.text).toContain('firma del contrato')
    expect(template.text).toContain('Equipo de Talento\nEfeonce · efeoncepro.com')
    expect(template.text).not.toContain('Te damos la bienvenida')
  })

  it('resolves the weekly executive digest template with digest context', () => {
    const template = resolveTemplate('weekly_executive_digest', {
      periodLabel: 'Semana del 8 al 14 de abril de 2026',
      totalInsights: 2,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
      spacesAffected: 1,
      portalUrl: 'https://greenhouse.efeoncepro.com',
      closingNote: 'Resumen semanal.',
      window: {
        startAt: '2026-04-08T00:00:00.000Z',
        endAt: '2026-04-14T23:59:59.999Z',
        label: '8 abr 2026 - 14 abr 2026'
      },
      spaces: [
        {
          name: 'Space Operaciones',
          href: 'https://greenhouse.efeoncepro.com/agency/spaces/space-1',
          insights: [
            {
              severity: 'critical',
              headline: 'OTD% · score 98',
              narrative: [{ type: 'text', value: 'Insight semanal.' }],
              actionLabel: 'Abrir Space',
              actionUrl: 'https://greenhouse.efeoncepro.com/agency/spaces/space-1'
            }
          ]
        }
      ]
    })

    expect(template.subject).toBe('Resumen semanal — Nexa Insights')
    expect(template.text).toContain('Resumen semanal')
    expect(template.react).toBeTruthy()
  })
})
