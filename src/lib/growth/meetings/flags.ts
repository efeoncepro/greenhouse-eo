export const GROWTH_NATIVE_MEETING_SCHEDULER_FLAG = 'GROWTH_NATIVE_MEETING_SCHEDULER_ENABLED'
export const GROWTH_NATIVE_MEETING_SCHEDULER_READ_FLAG = 'GROWTH_NATIVE_MEETING_SCHEDULER_READ_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Booking kill switch. Default OFF in every environment. */
export const isNativeMeetingSchedulerEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_NATIVE_MEETING_SCHEDULER_FLAG])

/** Read-only config/availability gate used for shadow verification. Default OFF. */
export const isNativeMeetingSchedulerReadEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_NATIVE_MEETING_SCHEDULER_READ_FLAG]) || isNativeMeetingSchedulerEnabled(env)
