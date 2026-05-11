import type { ProductionPreflightV1 } from './types'

/**
 * CLI fail policy for production preflight.
 *
 * `readyToDeploy` is the canonical deploy gate. The broader `overallStatus`
 * remains useful for human triage, but a degraded or unknown preflight must
 * not return success when the caller explicitly asked for fail-fast behavior.
 */
export const shouldFailPreflightCommand = (
  payload: Pick<ProductionPreflightV1, 'readyToDeploy'>,
  failOnError: boolean
): boolean => {
  if (!failOnError) return false

  return !payload.readyToDeploy
}
