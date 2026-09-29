/**
 * Sincronía de los tokens de «La órbita» en los catálogos del composer: lo commiteado tiene que ser lo que
 * `pnpm brand:tokens` produce con la versión INSTALADA de @efeoncepro/axis-tokens. Si AXIS publica y nadie
 * recompila, este test lo dice antes de que una pieza salga con un acento viejo.
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
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

  it('los archivos de marca de cada catálogo son byte a byte los de @efeoncepro/axis-brand-assets', () => {
    const brandAssets = path.join(
      path.dirname(createRequire(path.resolve(__dirname, '../../../package.json')).resolve('@efeoncepro/axis-brand-assets/package.json')),
      'assets'
    )

    // Recorre subdirectorios (p. ej. `partners/`, los assets de terceros de AXIS_PARTNER_ASSETS): también se comparan
    // byte a byte en vez de saltarse, y un directorio nunca se lee como archivo.
    const files = (root: string, rel = ''): string[] =>
      fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap(entry => {
        const child = path.join(rel, entry.name)

        return entry.isDirectory() ? files(root, child) : [child]
      })

    for (const catalog of ['graphic-line-deck', 'graphic-line-stills', 'graphic-line-overlays']) {
      const dir = path.join(CATALOGS, catalog, 'assets')

      for (const file of files(dir).filter(name => fs.existsSync(path.join(brandAssets, name)))) {
        expect(fs.readFileSync(path.join(dir, file)).equals(fs.readFileSync(path.join(brandAssets, file))), `${catalog}/${file}`).toBe(true)
      }
    }
  })
})
