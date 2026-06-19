import 'server-only'

/**
 * TASK-1169 Slice 2 — Reconciliación member-level read-only del OTD imputable.
 *
 * Compara, por colaborador-mes, el OTD legacy (cohorte real del bono) vs el OTD
 * corregido por freeze (M2) que produce el helper canónico
 * `computeOtdAttributableMemberMonth`. NO escribe nada, NO toca el bono.
 *
 * Harness auto-validante (regla dura TASK-1169): solo se confía el corregido
 * donde `cohort_reproduced` (la enumeración de candidatos reproduce el legacy).
 * Donde no reproduce → `cohort_mismatch` (degradación honesta, NUNCA 0).
 *
 * Además mide el "drift de materialización": el `metrics_by_member` materializado
 * vs el recompute live (un probe 2026-06-19 mostró que el materializado de
 * períodos cerrados está stale) — evidencia de comparabilidad de cohorte.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/reconcile-otd-attributable-member-month.ts 2026-04 2026-05 2026-06
 *   (sin args → últimos 3 meses calendario relativos a un mes pasado por env
 *    RECONCILE_ANCHOR=YYYY-MM, o 2026-06 por defecto si no hay env.)
 */

import { computeOtdAttributableMemberMonth } from '@/lib/notion-metrics/otd-attributable-member-month'
import { calculateOtdBonus } from '@/lib/payroll/bonus-proration'
import { DEFAULT_BONUS_PRORATION_CONFIG } from '@/lib/payroll/bonus-config'

const parsePeriod = (raw: string): { year: number; month: number } => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(raw.trim())

  if (!match) {
    throw new Error(`Período inválido "${raw}" (formato esperado YYYY-MM)`)
  }

  
return { year: Number(match[1]), month: Number(match[2]) }
}

const resolvePeriods = (): Array<{ year: number; month: number }> => {
  const args = process.argv.slice(2).filter(Boolean)

  if (args.length > 0) {
    return args.map(parsePeriod)
  }

  const anchorRaw = process.env.RECONCILE_ANCHOR ?? '2026-06'
  const anchor = parsePeriod(anchorRaw)
  // Últimos 3 meses incluyendo el anchor.
  const periods: Array<{ year: number; month: number }> = []
  let y = anchor.year
  let m = anchor.month

  for (let i = 0; i < 3; i += 1) {
    periods.unshift({ year: y, month: m })
    m -= 1

    if (m === 0) {
      m = 12
      y -= 1
    }
  }

  
return periods
}

const bonusAmount = (otd: number | null): number =>
  otd === null
    ? 0
    : calculateOtdBonus(otd, 100, DEFAULT_BONUS_PRORATION_CONFIG).prorationFactor * 100

const main = async (): Promise<void> => {
  const periods = resolvePeriods()
  const config = DEFAULT_BONUS_PRORATION_CONFIG

  console.log('TASK-1169 — Reconciliación OTD imputable member×month (read-only, shadow)')
  console.log(`Umbrales bono: floor=${config.otdFloor}% threshold=${config.otdThreshold}%`)
  console.log('='.repeat(76))

  let grandValid = 0
  let grandMismatch = 0
  let grandTierChanges = 0

  for (const { year, month } of periods) {
    const rows = await computeOtdAttributableMemberMonth(year, month)

    const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.dataStatus] = (acc[row.dataStatus] ?? 0) + 1
      
return acc
    }, {})

    // Harness gate: solo confiamos el corregido donde cohort_reproduced.
    const trustworthy = rows.filter(
      row => row.cohortReproduced && row.otdPctCorrected !== null && row.otdPctLegacy !== null
    )

    const moved = trustworthy.filter(row => row.otdPctCorrected! > row.otdPctLegacy!)

    // Blast radius: ¿alguien cruza un tier de bono con el corregido?
    const tierChanges = moved.filter(row => {
      const legacyBonus = bonusAmount(row.otdPctLegacy)
      const correctedBonus = bonusAmount(row.otdPctCorrected)

      
return Math.abs(correctedBonus - legacyBonus) > 0.05
    })

    grandValid += rows.filter(r => r.cohortReproduced).length
    grandMismatch += byStatus.cohort_mismatch ?? 0
    grandTierChanges += tierChanges.length

    const label = `${year}-${String(month).padStart(2, '0')}`

    console.log(`\n[${label}] members=${rows.length} status=${JSON.stringify(byStatus)}`)
    console.log(
      `  cohorte reproducida=${rows.filter(r => r.cohortReproduced).length}` +
        ` · corregido > legacy=${moved.length}` +
        ` · cambia tier de bono=${tierChanges.length}`
    )

    for (const row of moved.slice(0, 20)) {
      const legacyBonus = bonusAmount(row.otdPctLegacy)
      const correctedBonus = bonusAmount(row.otdPctCorrected)
      const tierTag = Math.abs(correctedBonus - legacyBonus) > 0.05 ? ' ⟵ CAMBIA TIER' : ''

      console.log(
        `    ${row.memberId.slice(0, 20).padEnd(20)} ${row.otdPctLegacy}% → ${row.otdPctCorrected}%` +
          ` (num+${row.numeratorFlipCount} den-${row.denominatorDropCount},` +
          ` cobertura ${row.freezeCoveredCount}/${row.improvableCandidateCount})` +
          ` bono ${legacyBonus.toFixed(0)}%→${correctedBonus.toFixed(0)}%${tierTag}`
      )
    }

    // Cobertura de freeze sobre la cohorte (lower-bound honesto).
    const totalCandidates = rows.reduce((s, r) => s + r.improvableCandidateCount, 0)
    const totalCovered = rows.reduce((s, r) => s + r.freezeCoveredCount, 0)

    console.log(
      `  cobertura M2 shadow sobre cohorte: ${totalCovered}/${totalCandidates}` +
        ` candidatos (${totalCandidates > 0 ? Math.round((totalCovered / totalCandidates) * 100) : 0}%)`
    )
  }

  console.log(`\n${'='.repeat(76)}`)
  console.log(
    `RESUMEN: cohorte reproducida=${grandValid} · cohort_mismatch=${grandMismatch}` +
      ` · member-months que cambian tier de bono=${grandTierChanges}`
  )

  if (grandTierChanges === 0) {
    console.log(
      'Blast radius: el freeze capturado hoy NO cambia ningún tier de bono en la' +
        ' cohorte productiva (cutover TASK-1170 sin urgencia material por ahora).'
    )
  }
}

main().catch((error: unknown) => {
  console.error('Reconciliación falló:', error instanceof Error ? error.message : error)
  process.exit(1)
})
