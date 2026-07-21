import { describe, expect, it } from 'vitest'

import { meetingAvailabilityFixture, meetingConfigFixture } from '../fixtures'
import { initialMeetingRendererState, reduceMeetingState } from '../state'

describe('meeting state machine', () => {
  it('preserva selección y formulario en el viaje schedule → details → submitting → confirmed', () => {
    const availability = meetingAvailabilityFixture()
    let state = reduceMeetingState(initialMeetingRendererState(), {
      type: 'loaded', config: meetingConfigFixture(), availability,
    })

    state = reduceMeetingState(state, { type: 'select_slot', slot: availability.days[0].slots[0] })
    state = reduceMeetingState(state, { type: 'details', idempotencyKey: 'booking-intent' })
    state = reduceMeetingState(state, { type: 'form', values: { email: 'persona@empresa.cl' } })
    state = reduceMeetingState(state, { type: 'submit' })

    expect(state.phase).toBe('submitting')
    expect(state.form.email).toBe('persona@empresa.cl')
  })

  it('trata check_email como ambiguo para impedir una segunda reserva inmediata', () => {
    const state = reduceMeetingState(initialMeetingRendererState(), {
      type: 'booking_result',
      result: { outcome: 'error', error: { code: 'provider_degraded', recovery: 'check_email', retryable: false } },
    })

    expect(state.phase).toBe('ambiguous')
  })
})
