import type { Event } from '@sentry/nextjs'

const FACEBOOK_ANDROID_BRIDGE_MESSAGE = 'Error invoking postMessage: Java object is gone'
const FACEBOOK_ANDROID_BRIDGE_FRAME = 'app://navigation_performance_logger_android'

/**
 * Facebook's Android in-app browser injects this native performance bridge into
 * every page. It can throw after its Java object has been torn down during the
 * host browser lifecycle, outside of Greenhouse's JavaScript ownership.
 *
 * Keep this deliberately conjunctive: message-only or browser-only filtering
 * would hide application, Turnstile, or host integration failures that need
 * investigation. See ISSUE-151.
 */
export const isFacebookAndroidBridgeTeardownEvent = (event: Event): boolean => {
  const hasExactMessage = event.exception?.values?.some(exception => exception.value === FACEBOOK_ANDROID_BRIDGE_MESSAGE)

  if (!hasExactMessage) return false

  const browserName = event.contexts?.browser?.name ?? event.tags?.['browser.name']

  if (browserName !== 'Facebook') return false

  return Boolean(
    event.exception?.values?.some(exception =>
      exception.stacktrace?.frames?.some(frame => frame.filename?.startsWith(FACEBOOK_ANDROID_BRIDGE_FRAME))
    )
  )
}
