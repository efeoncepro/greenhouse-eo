// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import { meetingConfirmedFixture } from '../fixtures'
import {
  emitMeetingTelemetry,
  initialMeetingTelemetryState,
  reduceMeetingTelemetry,
  type MeetingTelemetryBase,
} from '../telemetry'

const base: MeetingTelemetryBase = {
  scheduler_key: 'efeonce-discovery-30',
  surface_id: 'efeonce-public-site',
  placement: 'contact_scheduler',
  renderer_version: '1.0.0',
  contract_version: 'growth-meeting-scheduler.v1',
  presentation_variant: 'split',
  activation_mode: 'dialog',
}

beforeEach(() => {
  ;(window as Window & { dataLayer?: unknown[] }).dataLayer = []
})

describe('meeting telemetry', () => {
  it('deduplica cada paso y exige el par step/context correcto', () => {
    const initial = initialMeetingTelemetryState()

    const invalid = reduceMeetingTelemetry(initial, base, {
      type: 'step_reached',
      step: 'date_selected',
      context: {},
    })

    expect(invalid.effects).toHaveLength(0)

    const first = reduceMeetingTelemetry(initial, base, {
      type: 'step_reached',
      step: 'date_selected',
      context: { days_ahead_bucket: '1_3_days' },
    })

    const replay = reduceMeetingTelemetry(first.state, base, {
      type: 'step_reached',
      step: 'date_selected',
      context: { days_ahead_bucket: '1_3_days' },
    })

    expect(first.effects).toHaveLength(1)
    expect(first.effects[0].payload).toMatchObject({
      meeting_step: 'date_selected',
      days_ahead_bucket: '1_3_days',
      presentation_variant: 'split',
      activation_mode: 'dialog',
    })
    expect(replay.effects).toHaveLength(0)
  })

  it('confirma una sola conversión, sin receipt ni evento DOM', () => {
    const response = meetingConfirmedFixture()

    const first = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'booking_confirmed', response,
    })

    const replay = reduceMeetingTelemetry(first.state, base, {
      type: 'booking_confirmed', response,
    })

    const host = document.createElement('div')
    let domEvents = 0

    host.addEventListener('gh_meeting_booking_confirmed', () => { domEvents += 1 })
    emitMeetingTelemetry(host, first.effects[0])

    const pushed = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer[0]

    expect(replay.effects).toHaveLength(0)
    expect(domEvents).toBe(0)
    expect(pushed).toMatchObject({ event: 'gh_meeting_booking_confirmed', scheduler_key: 'efeonce-discovery-30' })
    expect(pushed).not.toHaveProperty('conversionReceipt')
    expect(pushed).not.toHaveProperty('email')
    expect(pushed.event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(pushed.event_id).not.toBe(response.conversionReceipt)
  })

  it('conserva el UUID cuando el dataLayer falla y no repite una emisión confirmada', () => {
    const effect = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'booking_confirmed', response: meetingConfirmedFixture(),
    }).effects[0]

    const host = document.createElement('div')
    const failingLayer = { push: () => { throw new Error('blocked') } }
    const win = window as unknown as Window & { dataLayer: unknown }

    win.dataLayer = failingLayer
    let generated = 0

    const createConversionEventId = () => {
      generated += 1

return '00000000-0000-4000-8000-000000000001'
    }

    emitMeetingTelemetry(host, effect, { createConversionEventId })
    win.dataLayer = []
    emitMeetingTelemetry(host, effect, { createConversionEventId })
    emitMeetingTelemetry(host, effect, { createConversionEventId })

    expect(generated).toBe(1)
    expect(win.dataLayer).toEqual([expect.objectContaining({
      event: 'gh_meeting_booking_confirmed',
      event_id: '00000000-0000-4000-8000-000000000001',
    })])
  })

  it('no crea identidad para interacción, replay ni telemetría deshabilitada', () => {
    const host = document.createElement('div')

    const step = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'step_reached', step: 'viewed',
    }).effects[0]

    const disabled = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'booking_confirmed', response: meetingConfirmedFixture(),
    }).effects[0]

    const replay = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'booking_confirmed', response: { ...meetingConfirmedFixture(), conversionEligible: false },
    })

    let generated = 0

    const createConversionEventId = () => {
      generated += 1

return '00000000-0000-4000-8000-000000000001'
    }

    emitMeetingTelemetry(host, step, { createConversionEventId })
    emitMeetingTelemetry(host, disabled, { dataLayerEnabled: false, createConversionEventId })

    expect(generated).toBe(0)
    expect(replay.effects).toHaveLength(0)
    expect((window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer[0]).not.toHaveProperty('event_id')
  })

  it('mantiene el espejo GA4 sin inventar un ID si falla la entropía segura', () => {
    const effect = reduceMeetingTelemetry(initialMeetingTelemetryState(), base, {
      type: 'booking_confirmed', response: meetingConfirmedFixture(),
    }).effects[0]

    expect(() => emitMeetingTelemetry(document.createElement('div'), effect, {
      createConversionEventId: () => { throw new Error('unavailable') },
    })).not.toThrow()
    const pushed = (window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer[0]

    expect(pushed.event).toBe('gh_meeting_booking_confirmed')
    expect(pushed).not.toHaveProperty('event_id')
  })

  it('descarta bases manipuladas en vez de reenviar valores arbitrarios', () => {
    const result = reduceMeetingTelemetry(initialMeetingTelemetryState(), {
      ...base,
      placement: 'contact scheduler<script>',
    }, { type: 'step_reached', step: 'viewed' })

    expect(result.effects).toHaveLength(0)
  })

  it('rechaza recipes y modos de activación fuera del contrato cerrado', () => {
    const invalidRecipe = reduceMeetingTelemetry(initialMeetingTelemetryState(), {
      ...base,
      presentation_variant: 'mini' as 'guided',
    }, { type: 'step_reached', step: 'viewed' })

    const invalidActivation = reduceMeetingTelemetry(initialMeetingTelemetryState(), {
      ...base,
      activation_mode: 'popover' as 'dialog',
    }, { type: 'step_reached', step: 'viewed' })

    expect(invalidRecipe.effects).toHaveLength(0)
    expect(invalidActivation.effects).toHaveLength(0)
  })
})
