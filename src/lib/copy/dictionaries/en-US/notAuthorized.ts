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
  eyebrow: 'Restricted access',
  title: "You'll need a key for this",
  description:
    'Your session is active, but this view requires additional permissions. If you expected access, ask your administrator.',
  messages: [
    {
      title: "You'll need a key for this",
      status: 'Session active. Permission pending.',
      detail: 'This view requires additional permissions.',
      recovery: 'If you expected access, ask your administrator.'
    },
    {
      title: 'This door needs permission',
      status: 'You are inside Greenhouse.',
      detail: 'This section is reserved for another role or scope.',
      recovery: 'Go home or ask for access.'
    },
    {
      title: "Your pass doesn't cover this view",
      status: 'The route exists.',
      detail: 'Your profile is not authorized to open it yet.',
      recovery: 'If it should be available, an administrator can enable it.'
    },
    {
      title: 'An authorization is missing here',
      status: 'Greenhouse protected this screen.',
      detail: 'The information requires a specific permission.',
      recovery: 'You can go back or request the right permission.'
    },
    {
      title: 'Controlled access zone',
      status: 'This view needs an additional key.',
      detail: 'Access depends on your role and scope.',
      recovery: 'If you came here for work, ask for your role to be reviewed.'
    }
  ],
  cta: 'Back to home',
  secondaryCta: 'Go back'
}
