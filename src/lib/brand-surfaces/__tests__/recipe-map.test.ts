/**
 * Paridad del mapa receta → plantilla (TASK-1928). `recipe-map.json` es lo que el índice de recetas publica como
 * «tiene plantilla»; este test lo sostiene con el planificador real: el intent de ejemplo de cada receta se planifica
 * y tiene que caer en el contentType que el mapa promete. Si el mapper cambia de plantilla, el índice miente y esto
 * se pone rojo. La existencia del contentType en `registry.json` la vigila `pnpm brand:deck-recipes -- --check`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { planSurfaceDocument, planSurfacePiece, type SurfaceIntent } from '../index'
import type { SurfaceDocumentIntent } from '../document'

const REPO = path.resolve(__dirname, '../../../..')
const CATALOG = path.join(REPO, 'src/lib/artifact-composer/catalogs/graphic-line-deck')

interface RecipeMapEntry {
  contentType: string | null
  example: string | null
  slots: Record<string, string> | null
  blocked?: string
}

const map = JSON.parse(fs.readFileSync(path.join(CATALOG, 'recipe-map.json'), 'utf8')) as {
  schema: string
  recipes: Record<string, RecipeMapEntry>
}

const templated = Object.entries(map.recipes).filter(([, entry]) => entry.contentType)

/** El contentType que el planificador real le da al ejemplo: una pieza, o la página N de un documento. */
const plannedContentType = (id: string, example: string) => {
  const [file, page] = example.split('#page=')
  const intent = JSON.parse(fs.readFileSync(path.join(REPO, file!), 'utf8'))

  if (page) {
    const document = planSurfaceDocument(intent as SurfaceDocumentIntent, { artifactId: id })

    return { catalog: document.catalog, contentType: document.plan.slides[Number(page) - 1]?.contentType }
  }

  const piece = planSurfacePiece(intent as SurfaceIntent, { artifactId: id })

  return { catalog: piece.catalog, contentType: piece.contentType }
}

describe('recipe-map.json', () => {
  it('declara su esquema', () => {
    expect(map.schema).toBe('efeonce.deck-recipe-map.v1')
  })

  it('toda receta sin plantilla dice por qué', () => {
    for (const [id, entry] of Object.entries(map.recipes)) {
      if (!entry.contentType) expect(entry.blocked, id).toEqual(expect.any(String))
    }
  })

  it.each(templated)('%s planifica a la plantilla que el mapa promete', (id, entry) => {
    // Una receta con plantilla y sin ejemplo sería una promesa del índice que nada comprueba.
    expect(entry.example, `${id} no tiene ejemplo`).toEqual(expect.any(String))

    const planned = plannedContentType(id, entry.example as string)

    expect(planned.catalog).toBe('graphic-line-deck')
    expect(planned.contentType).toBe(entry.contentType)
  })
})
