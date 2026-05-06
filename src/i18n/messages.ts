import { getMicrocopy } from '@/lib/copy'

import type { ActionsCopy, AriaCopy, EmptyCopy, ErrorsCopy, FeedbackCopy, LoadingCopy, Locale, StatesCopy } from '@/lib/copy'

export type GreenhouseSharedMessages = {
  actions: ActionsCopy
  states: StatesCopy
  loading: LoadingCopy
  empty: EmptyCopy
  months: {
    short: readonly string[]
    long: readonly string[]
  }
  aria: AriaCopy
  errors: ErrorsCopy
  feedback: FeedbackCopy
  time: {
    justNow: string
    yesterday: string
    today: string
    tomorrow: string
  }
}

export type GreenhouseIntlMessages = {
  shared: GreenhouseSharedMessages
}

export const getSharedMessages = (locale: Locale): GreenhouseIntlMessages => {
  const copy = getMicrocopy(locale)

  return {
    shared: {
      actions: copy.actions,
      states: copy.states,
      loading: copy.loading,
      empty: copy.empty,
      months: {
        short: copy.months.short,
        long: copy.months.long
      },
      aria: copy.aria,
      errors: copy.errors,
      feedback: copy.feedback,
      time: {
        justNow: copy.time.justNow,
        yesterday: copy.time.yesterday,
        today: copy.time.today,
        tomorrow: copy.time.tomorrow
      }
    }
  }
}
