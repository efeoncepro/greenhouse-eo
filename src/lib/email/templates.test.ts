import { describe, expect, it } from 'vitest'

import { listRegisteredTemplates, resolveTemplate } from './templates'

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
