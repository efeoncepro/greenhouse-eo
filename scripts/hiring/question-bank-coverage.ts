/**
 * TASK-1384 — Reporte de cobertura del banco de preguntas (criterio binario de "banco listo").
 *
 * Compara el banco REAL (PG) contra la matriz de cobertura (question-bank-matrix.ts):
 * por celda (competencia × nivel) reporta activas vs target, drafts en cola SME y veredicto.
 * Exit 1 si alguna celda del lote evaluado está bajo target (para usarlo como gate).
 *
 * Uso (proxy 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/question-bank-coverage.ts [--batch lote-1-account-manager] [--no-fail]
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { QUESTION_BANK_MATRIX } from './question-bank-matrix'

const batchArg = process.argv.find((a) => a.startsWith('--batch='))?.split('=')[1]
const noFail = process.argv.includes('--no-fail')

interface BankRow extends Record<string, unknown> {
  key: string
  level: string
  status: string
  n: number
}

const main = async () => {
  const targets = QUESTION_BANK_MATRIX.filter((t) => !batchArg || t.batch === batchArg)

  if (targets.length === 0) {
    console.error(`[coverage] sin targets para batch="${batchArg}"`)
    process.exit(1)
  }

  const rows = await runGreenhousePostgresQuery<BankRow>(
    `SELECT comp.key, q.level, q.status, COUNT(*)::int AS n
     FROM greenhouse_hiring.hiring_question q
     JOIN greenhouse_hiring.hiring_competency comp ON comp.competency_id = q.competency_id
     GROUP BY comp.key, q.level, q.status`,
  )

  const count = (key: string, level: string, statuses: string[]) =>
    rows.filter((r) => r.key === key && r.level === level && statuses.includes(r.status)).reduce((sum, r) => sum + r.n, 0)

  let failing = 0

  console.log(`\nCobertura del banco de preguntas${batchArg ? ` — ${batchArg}` : ''}\n`)
  console.log('competencia × nivel'.padEnd(42), 'activas/target', 'en SME', 'draft', 'veredicto')

  for (const t of targets) {
    const active = count(t.competencyKey, t.level, ['active'])
    const inReview = count(t.competencyKey, t.level, ['sme_review'])
    const draft = count(t.competencyKey, t.level, ['draft'])
    const ok = active >= t.targetActive

    if (!ok) failing += 1
    console.log(
      `${t.competencyKey} × ${t.level}`.padEnd(42),
      `${active}/${t.targetActive}`.padEnd(14),
      String(inReview).padEnd(6),
      String(draft).padEnd(5),
      ok ? '✅' : inReview + draft > 0 ? '🟡 pendiente SME' : '🔴 sin contenido',
    )
  }

  console.log(`\n${failing === 0 ? '✅ Cobertura completa' : `🔴 ${failing}/${targets.length} celdas bajo target`}`)

  if (failing > 0 && !noFail) process.exitCode = 1
}

main().catch((error) => {
  console.error('[coverage] fatal:', error)
  process.exit(1)
})
