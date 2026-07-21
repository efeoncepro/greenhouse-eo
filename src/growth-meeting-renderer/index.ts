import { defineMeetingSchedulerElement } from './element'

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  defineMeetingSchedulerElement()
}

export { defineMeetingSchedulerElement, EfeonceMeetingSchedulerElement, MEETING_SCHEDULER_TAG } from './element'
export { MEETING_RENDERER_VERSION } from './version'
