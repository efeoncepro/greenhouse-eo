/**
 * Microcopy en-US: underMaintenance (full-page maintenance).
 *
 * Calm, reassuring tone (greenhouse-ux-writing §6 — maintenance is a temporary
 * state, not a user error): first person plural, sentence case, no emoji, verb +
 * object CTA. Variants are picked once on entry to add personality without
 * losing clarity (what happened + how to recover).
 */

import type { UnderMaintenanceCopy } from '../../types'

export const underMaintenance: UnderMaintenanceCopy = {
  eyebrow: 'Maintenance',
  title: 'We are under maintenance',
  description: "We're making Greenhouse better. We'll be back in a moment — thanks for your patience.",
  messages: [
    {
      title: 'We are under maintenance',
      description: "We're making Greenhouse better. We'll be back in a moment — thanks for your patience."
    },
    {
      title: "We'll be right back",
      description: "We're polishing a few details. Try again in a few minutes or head back home."
    },
    {
      title: 'Greenhouse is taking a short break',
      description: "We paused briefly to make things better. You'll be able to pick up where you left off soon."
    },
    {
      title: 'Working on improvements',
      description: 'This section is under maintenance for a few minutes. Try again or go back home.'
    },
    {
      title: "We're polishing Greenhouse",
      description: 'A quick maintenance window to make everything run better. Check back in a few minutes.'
    }
  ],
  cta: 'Back to home',
  secondaryCta: 'Try again'
}
