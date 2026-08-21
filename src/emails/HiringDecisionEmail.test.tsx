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
    expect(html).toContain('/emails/hiring-selected-email-mail-icon-v4.png')
    expect(html).toContain('alt=""')
    expect(html).not.toMatch(/<h[1-6][^>]*>Content Creator<\/h[1-6]>/)
    expect(html).toContain('carta oferta')
    expect(html).toContain('firma del contrato')
    expect(html).toMatch(
      /<strong style="[^"]*font-weight:700[^"]*">te elegimos para «(?:<!-- -->)?Content Creator(?:<!-- -->)?» en Efeonce<\/strong>/,
    )
    expect(html).toMatch(
      /<strong style="[^"]*font-weight:700[^"]*">El próximo paso es preparar y enviarte la carta oferta\.<\/strong>/,
    )
    expect(html).toMatch(
      /<strong style="[^"]*font-weight:700[^"]*">Cuando la revises y aceptes, avanzaremos con la firma del contrato\.<\/strong>/,
    )
    expect(html).toMatch(/<strong style="[^"]*font-weight:700[^"]*">Equipo de Talento<\/strong>/)
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
    expect(html).toMatch(/<strong style="[^"]*font-weight:700[^"]*">Equipo de Talento<\/strong>/)
    expect(html).not.toContain('/emails/hiring-selected-email-mail-icon-v4.png')
  })
})
