import type { TypographyProps } from '@mui/material/Typography'

import type { NexaExpressiveTextValue } from '../nexa-expressive-text/nexa-expressive-text-types'

/**
 * Modo de alimentación del revelado.
 * - `value`: la primitive recibe el contenido completo y revela una fracción (depiction estática, mockup).
 *   Bajo `prefers-reduced-motion` colapsa al estado asentado (texto completo, sin caret).
 * - `stream`: la primitive consume chunks reales (shape del `NexaChatProvider`, TASK-1091) y acumula.
 *   Abort-safe: si el stream se corta, asienta lo recibido (never-hidden).
 */
export type NexaStreamingTextMode = 'value' | 'stream'

export interface NexaStreamingTextProps {
  /** Default `value`. */
  mode?: NexaStreamingTextMode
  /** `value` mode: contenido completo (string o expressive value); la primitive revela `revealedFraction`. */
  value?: NexaExpressiveTextValue
  /** `value` mode: fracción 0..1 del plain-text a revelar. Default `0.6` (paridad con el mockup del canvas). 1 = asentado. */
  revealedFraction?: number
  /** `value` mode: mínimo de caracteres revelados aunque la fracción sea baja. Default `24` (paridad mockup). */
  minRevealedChars?: number
  /** `stream` mode: iterable async de chunks de texto; se appendean conforme llegan. */
  stream?: AsyncIterable<string>
  /** `stream` mode: callback cuando el stream se asienta (o se aborta). Recibe el texto acumulado. */
  onSettled?: (fullText: string) => void
  /** Muestra el caret final mientras revela. Default `true`; se suprime al asentar y bajo reduced-motion. */
  showCaret?: boolean
  /** Variant MUI Typography del texto revelado. Default `body2`. */
  variant?: TypographyProps['variant']
  /** Color del texto (token MUI). Default `text.secondary`. */
  color?: TypographyProps['color']
  dataCapture?: string
}
