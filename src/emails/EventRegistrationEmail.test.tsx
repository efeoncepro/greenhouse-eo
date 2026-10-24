import { render } from '@react-email/render'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AGENCY_BRANDED_EMAIL_TYPES, EMAIL_PRIORITY_MAP } from '@/lib/email/types'
import { resolveTemplate } from '@/lib/email/templates'

const JOIN_URL = 'https://efeoncepro.com/eventos/sala/test-private-room'
const EVENT_PAGE_URL = 'https://efeoncepro.com/eventos/como-aparecer-en-chatgpt'

const baseContext = {
  recipientName: 'María González',
  eventTitle: 'Cómo aparecer en las respuestas de ChatGPT',
  whenLabel: 'jueves 12 de noviembre · 10:00 (Chile)',
  durationLabel: '45 minutos',
  modalityLabel: 'En línea',
  joinUrl: JOIN_URL,
  eventPageUrl: EVENT_PAGE_URL,
  locale: 'es' as const
}

const renderTemplate = async (emailType: 'growth_event_registration' | 'growth_event_reminder', context: object) => {
  const template = resolveTemplate(emailType, context as Record<string, unknown>)
  const html = await render(template.react)

  return { ...template, html }
}

describe('EventRegistrationEmail (growth_event_registration / growth_event_reminder)', () => {
  it('registers both types as transactional and agency-branded', () => {
    expect(EMAIL_PRIORITY_MAP.growth_event_registration).toBe('transactional')
    expect(EMAIL_PRIORITY_MAP.growth_event_reminder).toBe('transactional')
    expect(AGENCY_BRANDED_EMAIL_TYPES.has('growth_event_registration')).toBe(true)
    expect(AGENCY_BRANDED_EMAIL_TYPES.has('growth_event_reminder')).toBe(true)
  })

  it('confirmed: subject, room link as primary CTA, calendar line and event page link', async () => {
    const { subject, html, text } = await renderTemplate('growth_event_registration', {
      ...baseContext,
      variant: 'confirmed'
    })

    expect(subject).toBe('Tu lugar en «Cómo aparecer en las respuestas de ChatGPT» está reservado — Efeonce')
    expect(html).toContain(`href="${JOIN_URL}"`)
    expect(html).toContain('Entrar a la sala')
    expect(html).toContain('Adjuntamos el evento para que lo agregues a tu calendario.')
    expect(html).toContain(`href="${EVENT_PAGE_URL}"`)
    expect(html).toContain('45 minutos')
    expect(html).toContain('En línea')
    expect(html).not.toContain('Te enviaremos el enlace antes del evento')
    expect(text).toContain(JOIN_URL)
  })

  it('confirmed without joinUrl: promises the link later and the button goes to the event page', async () => {
    const { html, text } = await renderTemplate('growth_event_registration', {
      ...baseContext,
      joinUrl: undefined,
      variant: 'confirmed'
    })

    expect(html).toContain('Te enviaremos el enlace antes del evento.')
    expect(html).toContain('Ver el evento')
    expect(html).not.toContain('Entrar a la sala')
    expect(html).toContain(`href="${EVENT_PAGE_URL}"`)
    expect(text).toContain('Te enviaremos el enlace antes del evento.')
  })

  it('confirmed: an empty calendarNote omits the calendar line', async () => {
    const { html } = await renderTemplate('growth_event_registration', {
      ...baseContext,
      calendarNote: '',
      variant: 'confirmed'
    })

    expect(html).not.toContain('Adjuntamos el evento')
  })

  it('waitlisted: never exposes the private room link, even when it is passed', async () => {
    const { subject, html, text } = await renderTemplate('growth_event_registration', {
      ...baseContext,
      variant: 'waitlisted'
    })

    expect(subject).toBe('Quedaste en lista de espera: Cómo aparecer en las respuestas de ChatGPT — Efeonce')
    expect(html).not.toContain(JOIN_URL)
    expect(text).not.toContain(JOIN_URL)
    expect(html).not.toContain('Entrar a la sala')
    expect(html).toContain('lista de espera')
    expect(html).toContain('Si se libera un lugar, te avisamos')
    expect(html).toContain(`href="${EVENT_PAGE_URL}"`)
  })

  it('reminder: forces the reminder variant, with the room link as primary CTA', async () => {
    const { subject, html, text } = await renderTemplate('growth_event_reminder', {
      ...baseContext,
      variant: 'confirmed'
    })

    expect(subject).toBe('Empieza pronto: Cómo aparecer en las respuestas de ChatGPT — Efeonce')
    expect(html).toContain(`href="${JOIN_URL}"`)
    expect(html).toContain('Entrar a la sala')
    expect(html).toContain('Empieza pronto')
    expect(html).not.toContain('Adjuntamos el evento')
    expect(text).toContain(JOIN_URL)
  })

  it('reminder without joinUrl falls back to the event page', async () => {
    const { html } = await renderTemplate('growth_event_reminder', { ...baseContext, joinUrl: undefined })

    expect(html).toContain('Ver el evento')
    expect(html).toContain(`href="${EVENT_PAGE_URL}"`)
  })

  it('renders the English copy when locale is en', async () => {
    const confirmed = await renderTemplate('growth_event_registration', {
      ...baseContext,
      locale: 'en',
      variant: 'confirmed'
    })

    const waitlisted = await renderTemplate('growth_event_registration', {
      ...baseContext,
      locale: 'en',
      variant: 'waitlisted'
    })

    const reminder = await renderTemplate('growth_event_reminder', { ...baseContext, locale: 'en' })

    expect(confirmed.subject).toBe('Your spot at «Cómo aparecer en las respuestas de ChatGPT» is reserved — Efeonce')
    expect(confirmed.html).toContain('Join the room')
    expect(waitlisted.subject).toBe("You're on the waitlist: Cómo aparecer en las respuestas de ChatGPT — Efeonce")
    expect(reminder.subject).toBe('Starting soon: Cómo aparecer en las respuestas de ChatGPT — Efeonce')
  })
})
