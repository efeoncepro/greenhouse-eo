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
  ;(host.querySelector('.ghm-calendar-day[aria-pressed="true"]') as HTMLButtonElement).click()
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
  it('no atribuye la fecha preseleccionada hasta una acción humana', async () => {
    const { host, renderer } = await mount()
    const dataLayer = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer

    expect(dataLayer.filter(item => item.meeting_step === 'date_selected')).toHaveLength(0)
    ;(host.querySelector('.ghm-calendar-day[aria-pressed="true"]') as HTMLButtonElement).click()
    expect(dataLayer.filter(item => item.meeting_step === 'date_selected')).toHaveLength(1)
    expect(dataLayer.find(item => item.meeting_step === 'date_selected')).toMatchObject({
      presentation_variant: 'guided',
      activation_mode: 'inline',
    })
    renderer.destroy()
  })

  it('cambia recipe sin reconstruir el DOM ni perder selección', async () => {
    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-calendar-day[aria-pressed="true"]') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    const selectedSlot = host.querySelector<HTMLButtonElement>('.ghm-slot[aria-pressed="true"]')!

    Object.defineProperty(host, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 760, height: 700, top: 0, right: 760, bottom: 700, left: 0, x: 0, y: 0, toJSON() {} }),
    })
    renderer.updatePresentation({ activationMode: 'dialog', maxRecipe: 'split' })

    expect(host.dataset.ghmRecipe).toBe('split')
    expect(host.dataset.ghmActivation).toBe('dialog')
    expect(host.querySelector('.ghm-slot[aria-pressed="true"]')).toBe(selectedSlot)
    expect(host.querySelector('[data-navigation="slots"]')).not.toBeNull()
    renderer.destroy()
  })

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

  it('usa el subset canónico Iconify/Tabler para los campos, sin SVG manual', async () => {
    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-agenda-action') as HTMLButtonElement).click()
    await Promise.resolve()

    expect(host.querySelectorAll('.ghm-field-icon')).toHaveLength(4)
    expect(host.querySelector('.ghm-field-icon.tabler-user')).not.toBeNull()
    expect(host.querySelector('.ghm-field-icon.tabler-id')).not.toBeNull()
    expect(host.querySelector('.ghm-field-icon.tabler-mail')).not.toBeNull()
    expect(host.querySelector('.ghm-field-icon.tabler-building-skyscraper')).not.toBeNull()
    expect(host.querySelector('svg.ghm-field-icon')).toBeNull()
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
