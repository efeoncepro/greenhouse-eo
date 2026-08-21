import { render } from '@react-email/render'
import { describe, expect, it } from 'vitest'

import HiringDecisionEmail from './HiringDecisionEmail'

describe('HiringDecisionEmail', () => {
  it('uses a personalized in-body heading without duplicating a greeting', async () => {
    const html = await render(
      HiringDecisionEmail({
        recipientName: 'María González',
        openingTitle: 'Content Creator',
        variant: 'selected',
        locale: 'es',
      }),
    )

    expect(html).toContain('¡Te elegimos, María!')
    expect(html).toContain('/emails/hiring-selected-email-illustration-v3.png')
    expect(html).toContain('alt=""')
    expect(html).not.toMatch(/<h[1-6][^>]*>Content Creator<\/h[1-6]>/)
    expect(html).toContain('carta oferta')
    expect(html).toContain('firma del contrato')
    expect(html).not.toContain('Hola María')
    expect(html).not.toContain('Te damos la bienvenida')
  })

  it('keeps the rejected-candidate greeting independent from the selected variant', async () => {
    const html = await render(
      HiringDecisionEmail({
        recipientName: 'María González',
        openingTitle: 'Content Creator',
        variant: 'rejected',
        locale: 'es',
      }),
    )

    expect(html).toContain('Hola María')
    expect(html).toContain('Sobre tu postulación')
    expect(html).not.toContain('/emails/hiring-selected-email-illustration-v3.png')
  })
})
