/**
 * TASK-1231 — Growth Forms portable renderer · evaluación declarativa de condiciones.
 *
 * `visibleWhen` / `requiredWhen` son DATA declarativa, NUNCA JavaScript arbitrario
 * (Arch §11.1). El renderer las usa solo para UX; el backend es la autoridad y
 * **re-evalúa** en submit (Arch §20: no confía en campos omitidos por el renderer).
 */
import type { RendererFieldCondition, RendererFieldDefinition } from './contract'

export type FieldValues = Record<string, string | string[] | boolean>

const matches = (condition: RendererFieldCondition, values: FieldValues): boolean => {
  const current = values[condition.field]

  if (condition.equals !== undefined) {
    if (typeof current === 'boolean') return current === condition.equals
    if (Array.isArray(current)) return current.includes(String(condition.equals))

    return String(current ?? '') === String(condition.equals)
  }

  if (condition.includes !== undefined) {
    if (Array.isArray(current)) return current.includes(condition.includes)

    return String(current ?? '').includes(condition.includes)
  }

  // Condición sin `equals`/`includes` = "campo tiene algún valor".
  if (Array.isArray(current)) return current.length > 0

  return Boolean(current)
}

/** Una lista de condiciones se satisface con AND (todas verdaderas). */
const allMatch = (conditions: RendererFieldCondition[] | undefined, values: FieldValues): boolean => {
  if (!conditions || conditions.length === 0) return true

  return conditions.every(c => matches(c, values))
}

/** ¿El campo debe mostrarse dado el estado actual? `visibleWhen` vacío → siempre visible. */
export const isFieldVisible = (field: RendererFieldDefinition, values: FieldValues): boolean =>
  allMatch(field.visibleWhen, values)

/**
 * ¿El campo es requerido dado el estado actual? Required base OR `requiredWhen`.
 * Un campo oculto NUNCA es requerido (no se puede llenar lo que no se ve).
 */
export const isFieldRequired = (field: RendererFieldDefinition, values: FieldValues): boolean => {
  if (!isFieldVisible(field, values)) return false
  if (field.required) return true
  if (field.requiredWhen && field.requiredWhen.length > 0) return allMatch(field.requiredWhen, values)

  return false
}
