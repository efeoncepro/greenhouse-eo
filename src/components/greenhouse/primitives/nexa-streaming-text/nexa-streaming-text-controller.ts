/** Default de revelado `value` mode: 60% del plain-text, mínimo 24 chars — paridad con el mockup del canvas. */
export const NEXA_STREAMING_TEXT_DEFAULT_FRACTION = 0.6
export const NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS = 24

/**
 * Calcula el slice revelado del plain-text en `value` mode. Mismo cómputo que el canvas
 * (`slice(0, max(minChars, ceil(len * fraction))).trimEnd()`) → la migración es byte-idéntica.
 * Pura + determinística → testeable sin DOM.
 */
export const computeRevealedPlainText = (
  fullText: string,
  options?: { fraction?: number; minChars?: number }
): string => {
  const fraction = options?.fraction ?? NEXA_STREAMING_TEXT_DEFAULT_FRACTION
  const minChars = options?.minChars ?? NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS
  // Clamp defensivo: una fracción >= 1 (o NaN tratado como settled) revela todo el texto.
  const safeFraction = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 1

  if (safeFraction >= 1) return fullText

  const revealedLen = Math.max(minChars, Math.ceil(fullText.length * safeFraction))

  
return fullText.slice(0, revealedLen).trimEnd()
}

/** `true` cuando todavía hay contenido por revelar (caret visible mientras esto sea `true`). */
export const isRevealing = (fullText: string, revealedText: string): boolean => revealedText.length < fullText.length
