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
  await vi.waitFor(() => expect(['details', 'submitting']).not.toContain(host.dataset.ghmState))
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
    expect(host.querySelector("[name='email']")?.getAttribute('aria-describedby')).toContain('email-feedback')
    renderer.destroy()
  })

  it('valida progresivamente al salir del campo y confirma la corrección mientras se escribe', async () => {
    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-agenda-action') as HTMLButtonElement).click()

    const firstName = host.querySelector<HTMLInputElement>("[name='firstName']")!
    const field = firstName.closest<HTMLElement>('.ghm-field')!
    const feedback = field.querySelector<HTMLElement>('.ghm-field-feedback')!

    expect(field.dataset.validation).toBe('neutral')
    expect(firstName.getAttribute('aria-invalid')).toBe('false')

    firstName.dispatchEvent(new Event('blur'))

    expect(field.dataset.validation).toBe('invalid')
    expect(feedback.textContent).toBe('Este campo es obligatorio.')
    expect(field.querySelector('.tabler-alert-circle')).not.toBeNull()

    firstName.value = 'Ada'
    firstName.dispatchEvent(new Event('input', { bubbles: true }))

    expect(field.dataset.validation).toBe('valid')
    expect(firstName.getAttribute('aria-invalid')).toBe('false')
    expect(feedback.textContent).toBe('Listo.')
    expect(field.querySelector('.tabler-circle-check')).not.toBeNull()
    renderer.destroy()
  })

  it('separa la validación sintáctica del correo de la verificación corporativa', async () => {
    vi.useFakeTimers()

    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-agenda-action') as HTMLButtonElement).click()

    const email = host.querySelector<HTMLInputElement>("[name='email']")!
    const field = email.closest<HTMLElement>('.ghm-field')!

    email.value = 'correo-incompleto'
    email.dispatchEvent(new Event('input', { bubbles: true }))
    email.dispatchEvent(new Event('blur'))

    expect(field.dataset.validation).toBe('invalid')
    expect(field.textContent).toContain('Escribe un correo válido.')

    email.value = 'ada@empresa.cl'
    email.dispatchEvent(new Event('input', { bubbles: true }))

    expect(field.dataset.validation).toBe('pending')
    expect(field.textContent).toContain('Verificando correo de trabajo')
    expect(field.querySelector('.tabler-loader-2')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(450)

    expect(field.dataset.validation).toBe('valid')
    expect(field.textContent).toContain('Correo corporativo verificado.')
    renderer.destroy()
    vi.useRealTimers()
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

  it('expone navegación roving de calendario con flechas y estados no basados sólo en color', async () => {
    const { host, renderer } = await mount()
    const activeDate = host.querySelector<HTMLButtonElement>('.ghm-calendar-day[tabindex="0"]')!

    expect(host.querySelectorAll('.ghm-calendar-day[tabindex="0"]')).toHaveLength(1)
    expect(activeDate.dataset.date).toBe('2026-07-22')
    expect(activeDate.querySelector('.ghm-availability-meter')).not.toBeNull()
    expect(activeDate.querySelector('.tabler-check')).not.toBeNull()

    activeDate.focus()
    activeDate.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

    expect(document.activeElement).toBe(host.querySelector('[data-date="2026-07-23"]'))
    expect(host.querySelectorAll('.ghm-calendar-day[tabindex="0"]')).toHaveLength(1)
    renderer.destroy()
  })

  it('bloquea un correo personal con feedback inline antes de reservar', async () => {
    vi.useFakeTimers()

    const { host, renderer } = await mount()

    ;(host.querySelector('.ghm-slot') as HTMLButtonElement).click()
    ;(host.querySelector('.ghm-agenda-action') as HTMLButtonElement).click()

    const email = host.querySelector<HTMLInputElement>("[name='email']")!

    email.value = 'persona@gmail.com'
    email.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(450)

    expect(host.querySelector('.ghm-email-verification')?.textContent).toContain('correo de tu empresa')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector<HTMLButtonElement>('.ghm-form-actions .ghm-primary')?.disabled).toBe(true)

    renderer.destroy()
    vi.useRealTimers()
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
