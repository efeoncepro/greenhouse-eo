import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1696 — Paridad entre los vocabularios TS y los CHECK de la base.
 *
 * Molde: `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts` (TASK-1300), y el mismo
 * modo de falla que aquél cierra: si alguien agrega un consumidor (`llm`, `content`…) o una base
 * de costo en el TS sin migrar el CHECK, la llamada gasta de verdad, el INSERT del contador
 * falla, el transporte lo observa pero NO invalida un resultado ya cobrado — y el gasto de ese
 * consumidor queda en cero en el ledger para siempre. Se descubriría en la factura.
 *
 * El drift rompe el build en vez de manejarse.
 */

import { DATAFORSEO_SPEND_CONSUMERS } from '@/lib/ai/dataforseo-families'
import { SEO_PROVIDER_SPEND_COST_BASES } from '../provider-spend'

const MIGRATION = join(
  process.cwd(),
  'migrations',
  '20260828015655472_task-1696-seo-provider-spend-consumer-dimension.sql'
)

const readCheckVocabulary = (sql: string, column: string): string[] => {
  const match = sql.match(new RegExp(`CHECK \\(${column} IN \\(([^)]+)\\)\\)`))

  expect(match, `no se encontró el CHECK de ${column} en la migración`).not.toBeNull()

  return (match?.[1] ?? '')
    .split(',')
    .map(value => value.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)
    .sort()
}

describe('paridad vocabularios TS ↔ CHECK de seo_provider_spend_daily (TASK-1696)', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('el CHECK de consumer enumera exactamente los consumidores del TS', () => {
    // Si esto falla: agregaste (o quitaste) un consumidor en el TS sin migrar el CHECK.
    // NO relajes el test — escribe la migración additive que sincroniza la base.
    expect(readCheckVocabulary(sql, 'consumer')).toEqual([...DATAFORSEO_SPEND_CONSUMERS].sort())
  })

  it('el CHECK de cost_basis enumera exactamente las bases de costo del TS', () => {
    expect(readCheckVocabulary(sql, 'cost_basis')).toEqual([...SEO_PROVIDER_SPEND_COST_BASES].sort())
  })

  it('el CHECK acopla cost_basis con price_table_version en las dos direcciones', () => {
    // La equivalencia booleana es lo que impide las DOS mentiras: un 'estimated' sin decir con
    // qué tabla se estimó, y un 'invoiced' con una versión inventada. Un CHECK escrito como
    // implicación simple (`cost_basis <> 'estimated' OR price_table_version IS NOT NULL`) sólo
    // cubriría la primera.
    expect(sql).toContain(
      "CHECK ((cost_basis = 'estimated') = (price_table_version IS NOT NULL))"
    )
  })
})
