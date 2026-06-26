/**
 * TASK-1255 — Boundary national_id → destinos externos (browser-safe, puro).
 *
 * El RUT/cédula NUNCA viaja a HubSpot ni a ningún destino. Defensa en profundidad:
 *  1. Cifrado ON: national_id ya está fuera de `normalized_fields_json` (storage split) →
 *     este redactor es no-op.
 *  2. Legacy/OFF: la cédula sigue en claro en el blob → este redactor la quita antes de
 *     que el adapter del dispatcher construya el body de salida.
 *
 * Es incondicional respecto del flag: el dispatcher SIEMPRE redacta national_id.
 */
import type { FieldDefinition } from '../contracts'

import { resolvePiiFieldKeys } from './classify'

/**
 * Devuelve una copia del blob normalizado SIN los campos national_id. Si no hay
 * national_id en el schema, devuelve el blob tal cual (no clona innecesariamente).
 */
export const redactNationalIdFromBlob = (
  normalizedFields: Record<string, unknown>,
  fieldDefs: FieldDefinition[],
): Record<string, unknown> => {
  const nationalIdKeys = resolvePiiFieldKeys(fieldDefs).nationalId.map(n => n.key)

  if (nationalIdKeys.length === 0) return normalizedFields

  const clone = { ...normalizedFields }

  for (const key of nationalIdKeys) delete clone[key]

  return clone
}
