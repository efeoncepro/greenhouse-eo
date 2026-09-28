/**
 * pnpm brand:tokens            # compila efeonceGraphicLine → snapshot JSON + CSS de los catálogos graphic-line-*
 * pnpm brand:tokens --check    # falla si lo commiteado no coincide con la versión instalada de axis-tokens
 *
 * Detalle en `graphic-line-tokens.ts`.
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { buildGraphicLineTokenArtifacts } from './graphic-line-tokens'

const CATALOGS = path.resolve('src/lib/artifact-composer/catalogs')

const TARGETS: { file: string; pick: 'json' | 'css' }[] = [
  { file: path.join(CATALOGS, 'graphic-line-shared/graphic-line-tokens.json'), pick: 'json' },
  { file: path.join(CATALOGS, 'graphic-line-deck/graphic-line-tokens.css'), pick: 'css' },
  { file: path.join(CATALOGS, 'graphic-line-stills/graphic-line-tokens.css'), pick: 'css' },
  { file: path.join(CATALOGS, 'graphic-line-overlays/graphic-line-tokens.css'), pick: 'css' }
]

/**
 * Archivos oficiales que cada catálogo necesita dentro de su árbol (el render es hermético y el catálogo viaja
 * solo al worker). Se copian byte a byte desde @efeoncepro/axis-brand-assets: nunca se editan a mano.
 */
const BRAND_ASSETS: Record<string, string[]> = {
  'graphic-line-deck': ['url-bubble-baked-dark.svg', 'url-bubble-source.svg', 'efeonce-logo-negative.svg', 'efeonce-isotype-negative.svg'],
  'graphic-line-stills': ['url-bubble-baked-dark.svg', 'efeonce-logo-negative.svg', 'efeonce-isotype-negative.svg'],
  'graphic-line-overlays': ['url-bubble-baked-dark.svg']
}

const brandAssetsDir = path.join(
  path.dirname(createRequire(path.join(process.cwd(), 'package.json')).resolve('@efeoncepro/axis-brand-assets/package.json')),
  'assets'
)

const check = process.argv.includes('--check')
const artifacts = buildGraphicLineTokenArtifacts()
let drift = 0

for (const target of TARGETS) {
  const expected = artifacts[target.pick]
  const current = fs.existsSync(target.file) ? fs.readFileSync(target.file, 'utf8') : null

  if (check) {
    if (current !== expected) {
      drift++
      console.error(`✗ ${path.relative(process.cwd(), target.file)} no coincide con @efeoncepro/axis-tokens. Corre: pnpm brand:tokens`)
    }

    continue
  }

  fs.mkdirSync(path.dirname(target.file), { recursive: true })
  fs.writeFileSync(target.file, expected)
  console.log(`✓ ${path.relative(process.cwd(), target.file)}`)
}

for (const [catalog, files] of Object.entries(BRAND_ASSETS)) {
  for (const file of files) {
    const source = fs.readFileSync(path.join(brandAssetsDir, file))
    const target = path.join(CATALOGS, catalog, 'assets', file)
    const current = fs.existsSync(target) ? fs.readFileSync(target) : null

    if (check) {
      if (!current || !current.equals(source)) {
        drift++
        console.error(`✗ ${path.relative(process.cwd(), target)} no es el archivo de @efeoncepro/axis-brand-assets. Corre: pnpm brand:tokens`)
      }

      continue
    }

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
    console.log(`✓ ${path.relative(process.cwd(), target)}`)
  }
}

if (check) {
  if (drift > 0) process.exit(1)
  console.log('✓ Tokens y archivos de marca de La órbita sincronizados con AXIS.')
}
