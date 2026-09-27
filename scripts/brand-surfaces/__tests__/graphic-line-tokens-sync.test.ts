/**
 * Sincronía de los tokens de «La órbita» en los catálogos del composer: lo commiteado tiene que ser lo que
 * `pnpm brand:tokens` produce con la versión INSTALADA de @efeoncepro/axis-tokens. Si AXIS publica y nadie
 * recompila, este test lo dice antes de que una pieza salga con un acento viejo.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildGraphicLineTokenArtifacts } from '../graphic-line-tokens'

const CATALOGS = path.resolve(__dirname, '../../../src/lib/artifact-composer/catalogs')

describe('tokens de La órbita', () => {
  const artifacts = buildGraphicLineTokenArtifacts()

  it('el snapshot JSON de los resolvers está sincronizado', () => {
    expect(fs.readFileSync(path.join(CATALOGS, 'graphic-line-shared/graphic-line-tokens.json'), 'utf8')).toBe(artifacts.json)
  })

  it.each(['graphic-line-deck', 'graphic-line-stills', 'graphic-line-overlays'])('el CSS de %s está sincronizado', catalog => {
    expect(fs.readFileSync(path.join(CATALOGS, catalog, 'graphic-line-tokens.css'), 'utf8')).toBe(artifacts.css)
  })
})
