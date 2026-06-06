/**
 * Microcopy en-US: notFound (full-page 404).
 *
 * Calm tone (greenhouse-ux-writing §6 — permanent error): first person
 * plural, sentence case, no emoji, verb + object CTA. The "404" glyph is the
 * HTTP code and lives in the component, not here.
 */

import type { NotFoundCopy } from '../../types'

export const notFound: NotFoundCopy = {
  eyebrow: 'Page not found',
  title: 'This page wandered off',
  description: "We couldn't find what you're looking for. The link may be broken or the page may have moved.",
  messages: [
    {
      title: 'This page wandered off',
      description: "We couldn't find what you're looking for. The link may be broken or the page may have moved."
    },
    {
      title: "This link doesn't live here anymore",
      description: 'The route is not pointing to an available page. Go home or try going back.'
    },
    {
      title: "We couldn't find this route",
      description: 'The link may be incomplete, expired, or the page may have moved.'
    },
    {
      title: 'The page moved somewhere else',
      description: "We couldn't open this destination. Go home to get back on track."
    },
    {
      title: 'This path has no exit',
      description: 'The address does not point to an active page. Go back or return home.'
    }
  ],
  cta: 'Back to home',
  secondaryCta: 'Go back'
}
