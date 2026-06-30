import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Captcha verifier.
 *
 * El port nació acá (TASK-1240) y se PROMOVIÓ a compartido en TASK-1229
 * (`src/lib/growth/public-submission/captcha.ts`) para que el motor Growth Forms y
 * el grader usen el MISMO port (no hay captcha paralelo). Este archivo re-exporta el
 * canónico — los consumers existentes del grader siguen importando de acá sin cambio.
 */
export {
  type CaptchaVerification,
  type CaptchaVerifier,
  turnstileCaptchaVerifier,
} from '@/lib/growth/public-submission/captcha'
