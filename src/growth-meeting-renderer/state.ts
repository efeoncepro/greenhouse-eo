import type {
  MeetingAvailability,
  MeetingAvailabilitySlot,
  MeetingBookingConfirmed,
  MeetingPublicError,
  MeetingSchedulerConfig,
} from './contract'

export type MeetingPhase = 'loading' | 'schedule' | 'details' | 'submitting' | 'confirmed' | 'error' | 'ambiguous' | 'fallback_only'

export interface MeetingFormValues {
  firstName: string
  lastName: string
  email: string
  company: string
  processingAccepted: boolean
  communicationKeys: string[]
}

export interface MeetingRendererState {
  phase: MeetingPhase
  config: MeetingSchedulerConfig | null
  availability: MeetingAvailability | null
  selectedDate: string | null
  selectedSlot: MeetingAvailabilitySlot | null
  form: MeetingFormValues
  captchaToken: string | null
  idempotencyKey: string | null
  fieldErrors: string[]
  publicError: MeetingPublicError | null
  confirmation: MeetingBookingConfirmed | null
}

export type MeetingStateAction =
  | { type: 'loaded'; config: MeetingSchedulerConfig; availability: MeetingAvailability | null }
  | { type: 'availability_loading' }
  | { type: 'load_failed' }
  | { type: 'select_date'; date: string }
  | { type: 'select_slot'; slot: MeetingAvailabilitySlot }
  | { type: 'details'; idempotencyKey: string }
  | { type: 'form'; values: Partial<MeetingFormValues> }
  | { type: 'captcha'; token: string | null }
  | { type: 'validation_failed'; fields: string[] }
  | { type: 'submit' }
  | { type: 'booking_result'; result: MeetingBookingConfirmed | MeetingPublicError }
  | { type: 'back' }

export const initialMeetingRendererState = (): MeetingRendererState => ({
  phase: 'loading',
  config: null,
  availability: null,
  selectedDate: null,
  selectedSlot: null,
  form: {
    firstName: '', lastName: '', email: '', company: '',
    processingAccepted: false, communicationKeys: [],
  },
  captchaToken: null,
  idempotencyKey: null,
  fieldErrors: [],
  publicError: null,
  confirmation: null,
})

export const reduceMeetingState = (state: MeetingRendererState, action: MeetingStateAction): MeetingRendererState => {
  switch (action.type) {
    case 'loaded': {
      const firstDate = action.availability?.days[0]?.date ?? null

      return {
        ...state,
        phase: action.config.state === 'available' && action.availability ? 'schedule' : 'fallback_only',
        config: action.config,
        availability: action.availability,
        selectedDate: firstDate,
        selectedSlot: null,
        idempotencyKey: null,
      }
    }

    case 'load_failed': return { ...state, phase: 'error' }
    case 'availability_loading': return {
      ...state,
      phase: 'loading',
      selectedDate: null,
      selectedSlot: null,
      idempotencyKey: null,
    }
    case 'select_date': return { ...state, phase: 'schedule', selectedDate: action.date, selectedSlot: null, idempotencyKey: null }
    case 'select_slot': return { ...state, selectedSlot: action.slot, idempotencyKey: null, publicError: null }
    case 'details': return state.selectedSlot ? { ...state, phase: 'details', idempotencyKey: action.idempotencyKey, fieldErrors: [] } : state
    case 'form': return { ...state, form: { ...state.form, ...action.values }, fieldErrors: [] }
    case 'captcha': return { ...state, captchaToken: action.token }
    case 'validation_failed': return { ...state, phase: 'details', fieldErrors: action.fields }
    case 'submit': return { ...state, phase: 'submitting', publicError: null }

    case 'booking_result': {
      if (action.result.outcome === 'confirmed') {
        return { ...state, phase: 'confirmed', confirmation: action.result, publicError: null }
      }

      return {
        ...state,
        phase: action.result.error.recovery === 'check_email' ? 'ambiguous' : 'error',
        publicError: action.result,
      }
    }

    case 'back': return { ...state, phase: 'schedule', publicError: null, fieldErrors: [] }
  }
}
