import { describe, expect, it } from 'vitest'

import { isFacebookAndroidBridgeTeardownEvent } from './sentry-client-event-filter'

const facebookBridgeEvent = {
  exception: {
    values: [
      {
        value: 'Error invoking postMessage: Java object is gone',
        stacktrace: {
          frames: [{ filename: 'app://navigation_performance_logger_android:1:10025' }]
        }
      }
    ]
  },
  contexts: {
    browser: { name: 'Facebook' }
  }
}

describe('isFacebookAndroidBridgeTeardownEvent', () => {
  it('drops only the exact Facebook Android bridge teardown signature', () => {
    expect(isFacebookAndroidBridgeTeardownEvent(facebookBridgeEvent)).toBe(true)
  })

  it.each([
    [{ ...facebookBridgeEvent, contexts: { browser: { name: 'Chrome' } } }],
    [
      {
        ...facebookBridgeEvent,
        exception: {
          values: [
            {
              value: 'Error invoking postMessage: Java object is gone',
              stacktrace: { frames: [{ filename: 'https://greenhouse.efeoncepro.com/_next/app.js' }] }
            }
          ]
        }
      }
    ],
    [
      {
        ...facebookBridgeEvent,
        exception: {
          values: [
            {
              value: 'Turnstile failed to initialize',
              stacktrace: { frames: [{ filename: 'app://navigation_performance_logger_android:1:10025' }] }
            }
          ]
        }
      }
    ]
  ])('keeps near matches observable', event => {
    expect(isFacebookAndroidBridgeTeardownEvent(event)).toBe(false)
  })
})
