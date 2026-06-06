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
