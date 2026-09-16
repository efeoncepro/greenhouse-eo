import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1845 — boundary negativo DOMAIN-WIDE de Efeonce Insights (molde: hiring/boundary-domain).
 *
 * (1) Write-target allowlist: cada write SQL bajo `src/lib/efeonce-insights/**` apunta sólo a
 *     tablas del dominio (+ el outbox canónico). Los módulos productores (SEO/AEO/ICO) se LEEN,
 *     jamás se escriben desde aquí (arquitectura §3: "métricas en su dueño").
 * (2) Imports prohibidos: el BFF `client-portal` (hoja del DAG) y los probes privados de AEO.
 *     Los adapters consumen readers públicos de cada dominio productor.
 * (3) `contracts/**` es browser-safe: sin `server-only`, DB, secretos ni providers.
 */

const ROOT = join(process.cwd(), 'src/lib/efeonce-insights')

const collect = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) out.push(...collect(full))
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full)
  }

  return out
}

/** Tablas donde el dominio Insights PUEDE escribir (SoT del boundary; extender con criterio). */
const ALLOWED_WRITE_TARGETS = new Set([
  // Slice 1 (TASK-1845): aggregates propios + historial append-only + evidencia/plan congelados.
  'greenhouse_insights.insight_reports',
  'greenhouse_insights.insight_editions',
  'greenhouse_insights.insight_edition_transitions',
  'greenhouse_insights.insight_evidence_snapshots',
  'greenhouse_insights.insight_editorial_plans',
  // TASK-1846 — render durable: solicitud por edición, unidad reclamable por target y su
  // historial append-only. Siguen siendo tablas DEL dominio: el boundary no se ensancha
  // hacia módulos productores, que se siguen leyendo y nunca escribiendo.
  'greenhouse_insights.insight_render_runs',
  'greenhouse_insights.insight_outputs',
  'greenhouse_insights.insight_render_events',
  // Outbox canónico (vía publishOutboxEvent; el literal no aparece aquí, se lista por completitud).
  'greenhouse_sync.outbox_events'
])

const WRITE_PATTERN = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+\.[a-z_]+)/gi

const FORBIDDEN_IMPORTS = [
  /@\/lib\/client-portal(\/|')/,
  /@\/lib\/growth\/ai-visibility\/probes(\/|')/,
  /from ['"]pg['"]/
]

describe('TASK-1845 — boundary del dominio efeonce-insights', () => {
  const files = collect(ROOT)

  it('todo write SQL apunta a una tabla del allowlist del dominio', () => {
    const violations: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')

      for (const match of source.matchAll(WRITE_PATTERN)) {
        const target = match[2]!.toLowerCase()

        if (!ALLOWED_WRITE_TARGETS.has(target)) violations.push(`${file.replace(ROOT, '')}: ${match[0]}`)
      }
    }

    expect(violations).toEqual([])
  })

  it('no importa el BFF client-portal, los probes privados de AEO ni `pg` directo', () => {
    const violations: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')

      for (const pattern of FORBIDDEN_IMPORTS) {
        // `import type { PoolClient } from 'pg'` es un tipo (borrado en build), no un cliente.
        const lines = source.split('\n').filter(line => pattern.test(line) && !line.startsWith('import type'))

        if (lines.length > 0) violations.push(`${file.replace(ROOT, '')}: ${lines[0]}`)
      }
    }

    expect(violations).toEqual([])
  })

  it('contracts/** es browser-safe (sin server-only, DB, secretos ni providers)', () => {
    const contractFiles = files.filter(file => file.includes('/contracts/'))
    const violations: string[] = []

    expect(contractFiles.length).toBeGreaterThan(0)

    for (const file of contractFiles) {
      const source = readFileSync(file, 'utf8')

      if (/server-only|@\/lib\/db|@\/lib\/postgres|@\/lib\/secrets|@\/lib\/ai\/|node:crypto|node:fs/.test(source)) {
        violations.push(file.replace(ROOT, ''))
      }
    }

    expect(violations).toEqual([])
  })
})
