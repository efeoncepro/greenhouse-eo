import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { deckAxisCatalogDir } from '../catalogs/deck-axis'

/**
 * TASK-1393 Slice 3c — RATCHET de gradientes locales (contrato de dos vías).
 *
 * Las 4 recipes canónicas del molde (rich-content, cover-hero, back-cover, light-surface) viven
 * como DATO del catálogo (`gradient-recipes.json`) compilado a tokens. Lo que queda declarado
 * localmente en una plantilla son gradientes de CONTENIDO/variante (fills de barras derivadas,
 * variantes de grano deliberadas, glass) — con sus COLORES ya tokenizados.
 *
 * Este guard congela ese inventario: un gradiente NUEVO o CAMBIADO sin actualizar
 * `gradient-inventory.json` rompe el build (crecer el molde se DECLARA — como recipe o como
 * entrada de inventario con rationale — nunca se cuela), y un gradiente que desaparece sin salir
 * del inventario TAMBIÉN falla: la lista no puede mentir.
 */

const INVENTORY_PATH = path.join(deckAxisCatalogDir, 'brand', 'gradient-inventory.json')

const scan = (): Record<string, string[]> => {
  const files = fs
    .readdirSync(deckAxisCatalogDir)
    .filter(file => (file.endsWith('.html') && !file.startsWith('_')) || file === 'deck-signature.css')
    .sort()

  const found: Record<string, string[]> = {}

  for (const file of files) {
    const source = fs.readFileSync(path.join(deckAxisCatalogDir, file), 'utf8')
    const gradients: string[] = []

    for (const match of source.matchAll(/(?:linear|radial|conic)-gradient\(/g)) {
      let index = match.index! + match[0].length
      let depth = 1

      while (depth > 0 && index < source.length) {
        if (source[index] === '(') depth += 1
        else if (source[index] === ')') depth -= 1
        index += 1
      }

      const gradient = source.slice(match.index!, index).replace(/\s+/g, ' ')
      const hash = crypto.createHash('sha256').update(gradient).digest('hex').slice(0, 16)

      gradients.push(`${hash} ${gradient.slice(0, 80)}`)
    }

    if (gradients.length > 0) found[file] = gradients.sort()
  }

  return found
}

describe('inventario ratchet de gradientes locales del catálogo deck-axis', () => {
  it('los gradientes locales coinciden EXACTO con gradient-inventory.json (dos vías)', () => {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as { files: Record<string, string[]> }
    const measured = scan()

    expect(
      measured,
      'Gradiente local nuevo/cambiado/eliminado sin declarar. Si es molde compartido → recipe en ' +
        'gradient-recipes.json; si es contenido/variante deliberada → actualizá gradient-inventory.json ' +
        'en el mismo PR, con el porqué en el commit.'
    ).toEqual(inventory.files)
  })
})
