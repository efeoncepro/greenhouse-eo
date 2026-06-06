/**
 * Microcopy en-US: notFound (full-page 404).
 *
 * Calm tone (greenhouse-ux-writing §6 — permanent error): first person
 * plural, sentence case, no emoji, verb + object CTA. The "404" glyph is the
 * HTTP code and lives in the component, not here.
 */

import type { NotFoundCopy } from '../../types'

export const notFound: NotFoundCopy = {
  title: 'Page not found',
  description: "We couldn't find the page you're looking for. The link may be broken or the page may have moved.",
  cta: 'Back to home',
  secondaryCta: 'Go back'
}
