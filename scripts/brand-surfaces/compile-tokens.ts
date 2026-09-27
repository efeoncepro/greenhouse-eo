/**
 * pnpm brand:tokens            # compila efeonceGraphicLine → snapshot JSON + CSS de los catálogos graphic-line-*
 * pnpm brand:tokens --check    # falla si lo commiteado no coincide con la versión instalada de axis-tokens
 *
 * Detalle en `graphic-line-tokens.ts`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { buildGraphicLineTokenArtifacts } from './graphic-line-tokens'

const CATALOGS = path.resolve('src/lib/artifact-composer/catalogs')

const TARGETS: { file: string; pick: 'json' | 'css' }[] = [
  { file: path.join(CATALOGS, 'graphic-line-shared/graphic-line-tokens.json'), pick: 'json' },
  { file: path.join(CATALOGS, 'graphic-line-deck/graphic-line-tokens.css'), pick: 'css' },
  { file: path.join(CATALOGS, 'graphic-line-stills/graphic-line-tokens.css'), pick: 'css' },
  { file: path.join(CATALOGS, 'graphic-line-overlays/graphic-line-tokens.css'), pick: 'css' }
]

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

if (check) {
  if (drift > 0) process.exit(1)
  console.log('✓ Tokens de La órbita sincronizados con @efeoncepro/axis-tokens.')
}
