/**
 * Audit del registro de forms (capa delgada de robustez — ADR
 * GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1).
 *
 * Compara los forms PUBLISHED+ACTIVE de la DB (`greenhouse_growth.form_definition`)
 * contra las filas del `TRACKING-PLAN.md`. Lista los que están live sin fila en el
 * registro (drift entre "lo que existe" y "lo que documentamos que está taggeado").
 * Advisory (no despliega). Análogo de `pnpm flags:audit`.
 *
 * Uso:  pnpm growth:forms-tracking-audit  [--strict]   (--strict → exit 1 si hay faltantes)
 */

import { readFileSync } from 'node:fs'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const TRACKING_PLAN = 'docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md'

const main = async () => {
  const strict = process.argv.includes('--strict')

  const rows = await runGreenhousePostgresQuery<{ slug: string; form_kind: string }>(`
    SELECT DISTINCT d.slug, d.form_kind
    FROM greenhouse_growth.form_definition d
    JOIN greenhouse_growth.form_version v ON v.form_id = d.form_id AND v.status = 'published'
    WHERE d.status = 'active'
    ORDER BY d.slug
  `)

  const plan = readFileSync(TRACKING_PLAN, 'utf8')
  const missing = rows.filter((r) => !plan.includes(r.slug))

  console.log(`=== Forms tracking audit — ${rows.length} forms published+active ===`)

  if (missing.length === 0) {
    console.log('✅ Todos los forms live están en el TRACKING-PLAN.md.')
    
return
  }

  console.log(`⚠️ ${missing.length} form(s) live SIN fila en el TRACKING-PLAN.md (registrar su estado de tagging):`)
  for (const m of missing) console.log(`  - ${m.slug} (${m.form_kind})`)
  console.log(`\nAgregar su fila en ${TRACKING_PLAN} (mandato de la skill greenhouse-growth-forms).`)
  if (strict) process.exit(1)
}

main().catch((e: unknown) => { console.error('FAIL:', e instanceof Error ? e.message : e); process.exit(1) })
