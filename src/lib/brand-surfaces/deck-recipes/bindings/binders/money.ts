/**
 * Binder `money` (TASK-1930, Slice 5).
 *
 * Los montos sólo pueden venir de los hechos económicos de TASK-1417: la proyección congelada de la cotización de la
 * propuesta, ya redactada (`pricing-output-redaction.ts`: sin loaded cost ni margen). Esos hechos todavía no existen,
 * así que este binder NO calcula nada: todo monto se imprime `[MONTO]` (`no-frozen-quote`), que es la regla del catálogo
 * hasta que la propuesta tenga cotización congelada. Cuando TASK-1417 exponga sus hechos, este binder los consume sin
 * recalcularlos; nunca una segunda derivación.
 *
 * Las líneas de la cotización en vivo (`lineItems`) conservan su nombre y descripción, pero cada una lleva `[MONTO]` y
 * ninguna trae un monto escrito: una línea con un monto de texto se quita y la lámina falla cerrada.
 */

import { textOf, unbound, type Binder } from './shared'

export const MONEY_PLACEHOLDER = '[MONTO]'

/** Un monto escrito: moneda junto a una cifra, o una cifra con separador de miles. */
const WRITTEN_AMOUNT = /(?:US\$|\$|USD|CLP|UF|MXN|COP|PEN)\s?\d|\d[\d.,]*\s?(?:USD|CLP|UF|MXN|COP|PEN|pesos|dólares)\b|\b\d{1,3}(?:[.,]\d{3})+\b/i

export const moneyBinder: Binder = input => {
  const slot = input.recipe.slots.find(entry => entry.name === input.slot)

  if (slot?.type !== 'list') return unbound('no-frozen-quote', { set: MONEY_PLACEHOLDER })

  const items = input.slots[input.slot]

  const placeholdersOnly =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(item => {
      const text = textOf(item)

      return text.includes(MONEY_PLACEHOLDER) && !WRITTEN_AMOUNT.test(text)
    })

  return unbound('no-frozen-quote', placeholdersOnly ? { keep: true } : { remove: true })
}
