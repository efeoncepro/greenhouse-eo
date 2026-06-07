import type { MicrocopyDictionary } from '../../types'

import { emails as esCLEmails } from '../es-CL/emails'
import { actions } from './actions'
import { aria } from './aria'
import { comingSoon } from './comingSoon'
import { empty } from './empty'
import { errors } from './errors'
import { feedback } from './feedback'
import { loading } from './loading'
import { months } from './months'
import { notAuthorized } from './notAuthorized'
import { notFound } from './notFound'
import { states } from './states'
import { time } from './time'
import { underMaintenance } from './underMaintenance'

export const enUS: MicrocopyDictionary = {
  actions,
  states,
  loading,
  empty,
  months,
  aria,
  errors,
  notFound,
  notAuthorized,
  comingSoon,
  underMaintenance,
  feedback,
  time,
  // Email localization is intentionally deferred to the email rollout child task.
  emails: esCLEmails
}
