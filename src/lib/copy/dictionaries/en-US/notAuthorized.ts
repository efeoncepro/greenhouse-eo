/**
 * Microcopy en-US: notAuthorized (full-page 401).
 *
 * Generic surface for an authenticated user without permission (distinct from
 * the SSO rejection at /auth/access-denied). Calm tone (greenhouse-ux-writing
 * §6 — permanent error): first person, sentence case, no emoji, verb + object
 * CTA. The "401" glyph is the HTTP code and lives in the component, not here.
 */

import type { NotAuthorizedCopy } from '../../types'

export const notAuthorized: NotAuthorizedCopy = {
  title: "You'll need a key for this",
  description: "This area is out of reach for now. If you think that's a mistake, reach out to your administrator.",
  cta: 'Back to home'
}
