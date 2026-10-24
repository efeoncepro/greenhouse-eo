/**
 * 2026-10-24 — `.ics` de una reserva de evento (adjunto del correo de confirmación). PURO: sin I/O ni reloj implícito.
 *
 * RFC 5545 mínimo y compatible con Google, Apple y Outlook: CRLF, escape de `\ ; , \n`, líneas plegadas a 75 octetos,
 * horas en UTC (`Z`). El enlace privado de la sala va en LOCATION/DESCRIPTION sólo cuando el caller lo pasa (el correo
 * de confirmación lo pasa; nada público lo hace).
 */
import type { EventRegistrationEvent } from './contracts'

export interface EventIcsInput {
  event: EventRegistrationEvent
  /** Identidad estable del evento (`event_key`): mismo UID en cada reserva → el calendario no duplica. */
  eventKey: string
  joinUrl?: string
  /** Marca de tiempo de emisión (DTSTAMP). */
  now: Date
}

const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export const escapeIcsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Pliega una línea a 75 octetos UTF-8 sin cortar un carácter multibyte. */
export const foldIcsLine = (line: string): string => {
  const out: string[] = []
  let current = ''
  let bytes = 0

  for (const char of line) {
    const size = Buffer.byteLength(char)
    const limit = out.length === 0 ? 75 : 74

    if (bytes + size > limit) {
      out.push(current)
      current = ''
      bytes = 0
    }

    current += char
    bytes += size
  }

  out.push(current)

  return out.join('\r\n ')
}

export const buildEventIcs = ({ event, eventKey, joinUrl, now }: EventIcsInput): string => {
  const start = new Date(event.startUtc)
  const end = new Date(start.getTime() + event.durationMin * 60_000)
  const where = joinUrl ?? (event.modality === 'online' ? event.pageUrl : event.venue ?? event.pageUrl)
  const description = [joinUrl ? `Entrar a la sala: ${joinUrl}` : null, `Página del evento: ${event.pageUrl}`].filter(Boolean).join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Efeonce//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(eventKey)}@efeoncepro.com`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(where)}`,
    `URL:${event.pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ]

  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}
