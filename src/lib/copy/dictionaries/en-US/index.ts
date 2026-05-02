/**
 * TASK-265 — en-US dictionary (seed)
 *
 * Stub locale para que TASK-266 (i18n activation) tenga un slot listo
 * sin reescribir la API pública. **NO está traducido**: re-exporta el
 * dictionary es-CL para garantizar paridad de claves type-safe.
 *
 * Cuando TASK-266 / TASK-430 active i18n real, esta carpeta se llena
 * con archivos por namespace traducidos. La importación pública (`getMicrocopy`)
 * no cambia.
 */

import { esCL } from '../es-CL'

export const enUS = esCL
