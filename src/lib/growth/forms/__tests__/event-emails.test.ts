import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { eventRegistrationPolicySchema, resolveEventRegistrationPolicy } from '../contracts'
import { eventEmailLabels } from '../event-emails'
import { buildEventIcs, escapeIcsText, foldIcsLine } from '../event-ics'

const EVENT = {
  title: 'Cómo aparecer en las respuestas de ChatGPT',
  startUtc: '2026-11-12T13:00:00Z',
  timezone: 'America/Santiago',
  durationMin: 45,
  modality: 'online' as const,
  pageUrl: 'https://efeoncepro.com/eventos/webinar-aeo-chatgpt-2026-11-12/'
}

const JOIN = 'https://us02web.zoom.us/j/00000000000?pwd=ejemplo'

describe('.ics de una reserva de evento', () => {
  const ics = buildEventIcs({ event: EVENT, eventKey: 'webinar-aeo-chatgpt-2026-11-12', joinUrl: JOIN, now: new Date('2026-10-24T12:00:00Z') })

  it('es un VCALENDAR con CRLF, inicio y fin en UTC y UID estable por evento', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261112T130000Z')
    expect(ics).toContain('DTEND:20261112T134500Z')
    expect(ics).toContain('UID:webinar-aeo-chatgpt-2026-11-12@efeoncepro.com')
    expect(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75)).toBe(true)
  })

  it('lleva el enlace de la sala sólo cuando el caller lo pasa', () => {
    expect(ics.replace(/\r\n /g, '')).toContain(JOIN)
    const withoutJoin = buildEventIcs({ event: EVENT, eventKey: 'x', now: new Date('2026-10-24T12:00:00Z') })

    expect(withoutJoin).not.toContain('zoom.us')
    expect(withoutJoin).toContain(`LOCATION:${EVENT.pageUrl}`)
  })

  it('escapa y pliega sin cortar caracteres multibyte', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    const folded = foldIcsLine('SUMMARY:' + 'ñ'.repeat(60))

    expect(folded.split('\r\n ').join('')).toBe('SUMMARY:' + 'ñ'.repeat(60))
    expect(folded.split('\r\n').every(line => Buffer.byteLength(line) <= 75)).toBe(true)
  })
})

describe('etiquetas del correo del evento', () => {
  it('lee la hora en la zona del evento y nombra el país', () => {
    const labels = eventEmailLabels(EVENT)

    expect(labels.whenLabel).toBe('jueves 12 de noviembre · 10:00 (Chile)')
    expect(labels.durationLabel).toBe('45 minutos')
    expect(labels.modalityLabel).toBe('En línea')
  })

  it('arma duración en horas y modalidad presencial con sede', () => {
    const labels = eventEmailLabels({ ...EVENT, durationMin: 90, modality: 'presencial', venue: 'Santiago' })

    expect(labels.durationLabel).toBe('1 h 30 min')
    expect(labels.modalityLabel).toBe('Presencial · Santiago')
  })
})

describe('política de reserva con datos del evento', () => {
  it('acepta el evento, el enlace https y el recordatorio por defecto de 120 minutos', () => {
    const parsed = eventRegistrationPolicySchema.parse({ event: EVENT, joinUrl: JOIN })

    expect(parsed.reminderMinutesBefore).toBe(120)
    expect(parsed.event?.title).toBe(EVENT.title)
  })

  it('rechaza un enlace que no sea https y claves desconocidas', () => {
    expect(eventRegistrationPolicySchema.safeParse({ joinUrl: 'http://zoom.us/j/1' }).success).toBe(false)
    expect(eventRegistrationPolicySchema.safeParse({ event: { ...EVENT, extra: 1 } }).success).toBe(false)
  })

  it('sólo un formulario event_registration resuelve la política', () => {
    expect(resolveEventRegistrationPolicy('subscribe', { eventRegistration: { event: EVENT } })).toBeNull()
    expect(resolveEventRegistrationPolicy('event_registration', { eventRegistration: { event: EVENT, joinUrl: JOIN } })?.joinUrl).toBe(JOIN)
  })
})
