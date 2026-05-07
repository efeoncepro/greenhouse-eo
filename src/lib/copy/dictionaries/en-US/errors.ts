import type { ErrorsCopy } from '../../types'

export const errors: ErrorsCopy = {
  generic: 'Something did not work as expected. Try again in a few seconds.',
  networkOffline: 'You are offline. Check your connection and try again.',
  networkTimeout: 'The operation took longer than expected. Try again.',
  unauthorized: 'You do not have access to this section. Contact your administrator.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'We could not find what you were looking for.',
  serverError: 'Server error. Try again or contact support.',
  validationFailed: 'Some fields need correction before you can continue.',
  requiredField: 'This field is required',
  invalidFormat: 'The format is invalid',
  tryAgain: 'Try again',
  contactSupport: 'Contact support'
}
