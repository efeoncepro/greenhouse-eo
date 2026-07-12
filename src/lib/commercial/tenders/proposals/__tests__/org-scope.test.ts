import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1392 — guard MECÁNICO de tenant isolation (acceptance del Delta b):
 * "test que demuestra que ningún reader del dominio consulta sin filtro de org".
 *
 * Escanea todo SQL embebido del módulo `proposals/` que toque las tablas del aggregate y exige que
 * cada statement filtre por `owner_org_id`. Un reader sin ese filtro es una FUGA CROSS-TENANT, no
 * un descuido de performance — y un `WHERE org_id` agregado tarde siempre deja un reader sin
 * filtrar: por eso el guard existe desde la primera versión del módulo.
 */

const MODULE_DIR = path.resolve(__dirname, '..')

const PROPOSAL_TABLES_RE = /greenhouse_commercial\.(proposals|proposal_state_transitions|proposal_assets|proposal_evidence|proposal_requirements)\b/

const listSourceFiles = (): string[] =>
  fs
    .readdirSync(MODULE_DIR)
    .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map(file => path.join(MODULE_DIR, file))

/** Extrae template literals de SQL (heurística: contienen SELECT/INSERT/UPDATE/DELETE). */
const extractSqlLiterals = (source: string): string[] =>
  [...source.matchAll(/`([^`]*)`/gs)]
    .map(match => match[1]!)
    .filter(text => /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(text))

describe('tenant isolation del módulo proposals (org-scope mecánico)', () => {
  const files = listSourceFiles()

  it('hay fuentes que auditar', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files.map(file => [path.basename(file), file] as const))(
    '%s — todo SQL sobre tablas del aggregate filtra por owner_org_id',
    (_name, file) => {
      const source = fs.readFileSync(file, 'utf8')

      for (const sql of extractSqlLiterals(source)) {
        if (!PROPOSAL_TABLES_RE.test(sql)) continue

        expect(
          /owner_org_id/.test(sql),
          `SQL sin filtro/columna owner_org_id en ${_name}:\n${sql.slice(0, 220)}…`
        ).toBe(true)
      }
    }
  )
})
