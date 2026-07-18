import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Boundary duro arch §12/§20: el motor de CTAs consume Growth Forms SOLO como
 * action target (reader de contrato publicado) + crypto de embed key. NUNCA importa
 * el field schema, los validators, el policy-compiler ni el submit path del form —
 * duplicarlos rompería la autoridad del form sobre validación/consent.
 */
const CTAS_DIR = join(process.cwd(), 'src/lib/growth/ctas')

const FORBIDDEN_IMPORTS = [
  '@/lib/growth/forms/validators',
  '@/lib/growth/forms/policy-compiler',
  '@/lib/growth/forms/commands',
  '@/lib/growth/forms/store',
  '@/lib/growth/forms/contracts',
  '@/lib/growth/forms/dispatch',
  '@/lib/growth/forms/destinations',
  '@/lib/growth/forms/pii',
]

const ALLOWED_FORMS_IMPORTS = ['@/lib/growth/forms/readers', '@/lib/growth/forms/embed-key']

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => join(dir, entry.name))

describe('growth.cta ↔ growth.forms boundary', () => {
  it('ningún archivo del motor de CTAs importa internals de forms (solo readers + embed-key)', () => {
    for (const file of listSourceFiles(CTAS_DIR)) {
      const source = readFileSync(file, 'utf8')

      for (const forbidden of FORBIDDEN_IMPORTS) {
        expect(source, `${file} importa ${forbidden}`).not.toContain(`'${forbidden}'`)
      }

      const formsImports = source.match(/@\/lib\/growth\/forms\/[a-z-]+/g) ?? []

      for (const found of formsImports) {
        expect(ALLOWED_FORMS_IMPORTS, `${file} importa ${found} (fuera del allowlist)`).toContain(found)
      }
    }
  })
})
