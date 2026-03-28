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
      'payroll_receipt'
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
})
