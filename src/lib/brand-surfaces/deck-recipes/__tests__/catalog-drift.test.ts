import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repo = path.resolve(__dirname, '../../../../..')

describe('catálogo de runtime ↔ JSON aprobado', () => {
  it('`pnpm brand:deck-recipes -- --check` confirma que el artefacto generado coincide con el JSON y los ejemplos', () => {
    const output = execFileSync('node', ['scripts/creative/deck-recipes/render-index.mjs', '--check'], { cwd: repo, encoding: 'utf8' })

    expect(output).toContain('catálogo de runtime al día')
  })
})
