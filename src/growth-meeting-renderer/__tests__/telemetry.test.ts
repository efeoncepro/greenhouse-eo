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
    expect(first.effects[0].payload).toMatchObject({ meeting_step: 'date_selected', days_ahead_bucket: '1_3_days' })
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
  })

  it('descarta bases manipuladas en vez de reenviar valores arbitrarios', () => {
    const result = reduceMeetingTelemetry(initialMeetingTelemetryState(), {
      ...base,
      placement: 'contact scheduler<script>',
    }, { type: 'step_reached', step: 'viewed' })

    expect(result.effects).toHaveLength(0)
  })
})
