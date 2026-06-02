import type { FailureCategory } from './manifest'

export const classifyCaptureFailure = (message?: string): FailureCategory | undefined => {
  if (!message) return undefined

  const normalized = message.toLowerCase()

  if (normalized.startsWith('readiness failed')) {
    return 'visual_timeout'
  }

  if (
    normalized.includes('/login') ||
    normalized.includes('/signin') ||
    normalized.includes('/auth/') ||
    normalized.includes('agent session') ||
    normalized.includes('storage')
  ) {
    return 'auth_redirect'
  }

  if (normalized.includes('assertion failed') || normalized.includes('assertion')) {
    return 'assertion_failed'
  }

  if (normalized.includes('quality') || normalized.includes('frame')) {
    return 'frame_quality'
  }

  if (normalized.includes('error boundary') || normalized.includes('application error') || normalized.includes('app error')) {
    return 'app_error'
  }

  if (normalized.includes('timeout') && (normalized.includes('selector') || normalized.includes('locator'))) {
    return 'selector_timeout'
  }

  if (normalized.includes('timeout') || normalized.includes('ready')) {
    return 'visual_timeout'
  }

  return 'helper_error'
}
