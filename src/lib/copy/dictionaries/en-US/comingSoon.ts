/**
 * Microcopy en-US: comingSoon (full-page launch placeholder + countdown +
 * email capture).
 *
 * Warm, creative tone anchored to the Greenhouse brand (greenhouse → grow /
 * take root / bloom). First person plural, sentence case. A single 🌱 emoji
 * consistently marks the growth/bloom metaphor lines (description + toasts +
 * launching) — NEVER on the title/eyebrow/labels or on error pages. Countdown
 * units are kept separate for pluralization.
 */

import type { ComingSoonCopy } from '../../types'

export const comingSoon: ComingSoonCopy = {
  eyebrow: 'Coming soon',
  title: 'Something new is growing',
  description:
    "We're cultivating the next evolution of your ecosystem. Leave your email and we'll let you know the moment it blooms. 🌱",
  messages: [
    {
      title: 'Something new is growing',
      status: "We're cultivating the next evolution of your ecosystem.",
      recovery: "Leave your email and we'll let you know the moment it blooms."
    },
    {
      title: 'The next signal is on its way',
      status: "We're refining a new way to see and move your operation.",
      recovery: "Join the list and we'll let you know when it is available."
    },
    {
      title: 'We are preparing the greenhouse',
      status: 'The next Greenhouse capability is taking shape.',
      recovery: "Leave your email and we'll let you know when we open the door."
    },
    {
      title: 'An upgrade is on the way',
      status: "We're closing the final details before activation.",
      recovery: "Sign up and we'll let you know as soon as it is ready."
    },
    {
      title: 'Opening soon',
      status: 'This section is being prepared with the right context.',
      recovery: 'Ask for the notice and come back when it is available.'
    }
  ],
  emailLabel: 'Email address',
  emailPlaceholder: 'e.g. name@company.com',
  notifyCta: 'Notify me',
  notifyCtaLoading: 'Subscribing…',
  useAnotherEmail: 'Prefer a different email?',
  invalidEmail: 'Enter a valid email (e.g. name@company.com).',
  successToast: "Done. We'll let you know the moment it blooms. 🌱",
  alreadySubscribedToast: "You're already on the list. We'll let you know the moment it blooms. 🌱",
  errorToast: "We couldn't save your email. Please try again.",
  countdownDays: 'Days',
  countdownHours: 'Hours',
  countdownMinutes: 'Minutes',
  countdownSeconds: 'Seconds',
  launching: 'Opening the greenhouse… 🌱'
}
