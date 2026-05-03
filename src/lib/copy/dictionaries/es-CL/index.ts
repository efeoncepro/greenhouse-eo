/**
 * TASK-265 — es-CL dictionary
 *
 * Composición de namespaces para el locale es-CL (default canónico de
 * Greenhouse mientras opera como portal es-only).
 *
 * Cuando se agreguen locales en TASK-266 / TASK-431, replicar este
 * archivo en `dictionaries/<locale>/index.ts` con paridad de namespaces.
 */

import type { MicrocopyDictionary } from '../../types'

import { actions } from './actions'
import { aria } from './aria'
import { empty } from './empty'
import { errors } from './errors'
import { feedback } from './feedback'
import { loading } from './loading'
import { months } from './months'
import { states } from './states'
import { time } from './time'

export const esCL: MicrocopyDictionary = {
  actions,
  states,
  loading,
  empty,
  months,
  aria,
  errors,
  feedback,
  time
}
