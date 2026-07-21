// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeetingFixtureApi } from '../fixtures'
import { MeetingRenderer } from '../renderer'
import type { MeetingTurnstilePort } from '../turnstile'

const turnstile: MeetingTurnstilePort = {
  mount({ onToken }) {
    onToken('preview-captcha-token')

    return { destroy() {} }
  },
}

const mount = async (outcome: 'confirmed' | 'ambiguous' = 'confirmed') => {
  const host = document.createElement('div')

  document.body.append(host)

  const renderer = new MeetingRenderer(host, {
    api: createMeetingFixtureApi(outcome),
    turnstile,
    surfaceId: 'efeonce-public-site',
    schedulerKey: 'efeonce-discovery-30',
    requestedTimezone: 'America/Santiago',
    emergencyFallbackUrl: 'https://meetings.hubspot.com/efeonce',
    dataLayerEnabled: true,
    now: () => new Date('2026-07-21T12:00:00.000Z'),
    telemetryBase: {
      scheduler_key: 'efeonce-discovery-30',
      surface_id: 'efeonce-public-site',
      placement: 'contact_scheduler',
      renderer_version: '1.0.0',
      contract_version: 'growth-meeting-scheduler.v1',
    },
  })

  await renderer.load()

  return { host, renderer }
}

const completeBooking = async (host: HTMLElement) => {
  ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
  ;(host.querySelector('.ghm-agenda .ghm-primary') as HTMLButtonElement).click()

  const values: Record<string, string> = {
    firstName: 'Ada', lastName: 'Lovelace', email: 'ada@empresa.cl', company: 'Empresa',
  }

  for (const [name, value] of Object.entries(values)) {
    const input = host.querySelector<HTMLInputElement>(`[name='${name}']`)!

    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const consent = host.querySelector<HTMLInputElement>(".ghm-check input[type='checkbox']")!

  consent.click()
  ;(host.querySelector('.ghm-form') as HTMLFormElement).requestSubmit()
  await vi.waitFor(() => expect(host.dataset.ghmState).not.toBe('submitting'))
}

beforeEach(() => {
  document.body.innerHTML = ''
  ;(window as Window & { dataLayer?: unknown[] }).dataLayer = []
})

describe('MeetingRenderer', () => {
  it('muestra errores locales y enfoca el resumen después de validar', async () => {
    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-agenda-action') as HTMLButtonElement).click()
    await Promise.resolve()

    expect(document.activeElement).toBe(host.querySelector('.ghm-form-title'))
    ;(host.querySelector('.ghm-form') as HTMLFormElement).requestSubmit()
    await Promise.resolve()

    expect(host.querySelectorAll('.ghm-field-error')).toHaveLength(5)
    expect(document.activeElement).toBe(host.querySelector('.ghm-error-summary'))
    expect(host.querySelector("[name='email']")?.getAttribute('aria-describedby')).toContain('email-error')
    renderer.destroy()
  })

  it('completa la reserva y emite la conversión sin PII ni receipt', async () => {
    const { host, renderer } = await mount()

    await completeBooking(host)

    expect(host.dataset.ghmState).toBe('confirmed')
    expect(host.textContent).toContain('Tu reunión quedó agendada')
    expect(host.querySelector('.ghm-fallback')).toBeNull()

    const conversion = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer
      .find(item => item.event === 'gh_meeting_booking_confirmed')

    const dateSelected = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer
      .find(item => item.meeting_step === 'date_selected')

    expect(conversion).toBeDefined()
    expect(dateSelected).toMatchObject({ days_ahead_bucket: '1_3_days' })
    expect(JSON.stringify(conversion)).not.toContain('ada@empresa.cl')
    expect(conversion).not.toHaveProperty('conversionReceipt')
    renderer.destroy()
  })

  it('muestra recovery ambiguo y oculta fallback para evitar duplicados', async () => {
    const { host, renderer } = await mount('ambiguous')

    await completeBooking(host)

    expect(host.dataset.ghmState).toBe('ambiguous')
    expect(host.textContent).toContain('Revisa tu correo')
    expect(host.querySelector('.ghm-fallback')).toBeNull()
    renderer.destroy()
  })

  it('explica un conflicto y ofrece refrescar disponibilidad', async () => {
    const host = document.createElement('div')

    document.body.append(host)

    const renderer = new MeetingRenderer(host, {
      api: createMeetingFixtureApi('slot_unavailable'),
      turnstile,
      surfaceId: 'efeonce-public-site',
      schedulerKey: 'efeonce-discovery-30',
      requestedTimezone: 'America/Santiago',
      telemetryBase: {
        scheduler_key: 'efeonce-discovery-30', surface_id: 'efeonce-public-site', placement: 'contact_scheduler',
        renderer_version: '1.0.0', contract_version: 'growth-meeting-scheduler.v1',
      },
    })

    await renderer.load()
    await completeBooking(host)

    expect(host.textContent).toContain('Ese horario acaba de ocuparse')
    expect(host.textContent).toContain('Actualizar horarios')
    renderer.destroy()
  })
})
