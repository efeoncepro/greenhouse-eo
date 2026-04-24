/**
 * ICO Weekly Digest — Threshold Preview (TASK-598 Slice 3.5)
 *
 * One-shot tool. Corre `buildWeeklyDigest` con una matriz de thresholds
 * (minQualityScore × severityFloor) contra el dataset real de los últimos 7
 * días y reporta cuántos insights pasan por cada combinación. Sirve para
 * elegir defaults informadamente antes del deploy final.
 *
 * Uso:
 *
 *   pnpm tsx scripts/ico-digest-threshold-preview.ts
 *
 * Requiere:
 *   - .env.local con GREENHOUSE_POSTGRES_* configurado
 *   - Cloud SQL Proxy corriendo (pnpm pg:connect) si usas host local
 *
 * Output:
 *   - Matriz N×M con total insights, distribution per severity y per space.
 *   - Default recomendado al final (primer combo con >= 3 insights).
 */

import { createRequire } from 'node:module'

// Shim `server-only` antes de cargar módulos del repo.
const _require = createRequire(import.meta.url)

_require('module').Module._cache[_require.resolve('server-only')] = {
  id: 'server-only',
  exports: {}
}

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

type SeverityFloor = 'info' | 'warning' | 'critical'

interface PreviewCell {
  minQualityScore: number
  severityFloor: SeverityFloor
  totalInsights: number
  criticalCount: number
  warningCount: number
  infoCount: number
  spacesAffected: number
  sampleSpaceNames: string[]
}

const QUALITY_FLOORS = [0, 0.3, 0.4, 0.5, 0.6, 0.7] as const
const SEVERITY_FLOORS: SeverityFloor[] = ['info', 'warning', 'critical']

const FIXED_NOW = new Date()

const run = async () => {
  // Dynamic import para que el shim de server-only esté activo antes de cargar
  // el módulo del digest que tiene `import 'server-only'` up-top.
  const { buildWeeklyDigest } = await import('@/lib/nexa/digest/build-weekly-digest')
  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

  const cells: PreviewCell[] = []

  console.log(`[preview] ventana: últimos 7 días, now=${FIXED_NOW.toISOString()}`)
  console.log(`[preview] matriz ${QUALITY_FLOORS.length} × ${SEVERITY_FLOORS.length}`)

  try {
    for (const minQualityScore of QUALITY_FLOORS) {
      for (const severityFloor of SEVERITY_FLOORS) {
        const digest = await buildWeeklyDigest({
          now: FIXED_NOW,
          limit: 10,
          filters: { minQualityScore, severityFloor, maxPerSpace: 3 }
        })

        cells.push({
          minQualityScore,
          severityFloor,
          totalInsights: digest.totalInsights,
          criticalCount: digest.criticalCount,
          warningCount: digest.warningCount,
          infoCount: digest.infoCount,
          spacesAffected: digest.spacesAffected,
          sampleSpaceNames: digest.spaces.slice(0, 3).map(s => s.name)
        })
      }
    }

    console.log('\n[preview] resultados:\n')
    console.table(cells)

    const recommended = cells.find(
      c => c.minQualityScore === 0 && c.severityFloor === 'warning' && c.totalInsights >= 3
    )

    if (recommended) {
      console.log('\n[preview] defaults sugeridos (cumplen ≥3 insights):')
      console.log(`  minQualityScore = ${recommended.minQualityScore}`)
      console.log(`  severityFloor   = ${recommended.severityFloor}`)
      console.log(`  totalInsights   = ${recommended.totalInsights}`)
    } else {
      const fallback = [...cells]
        .filter(c => c.totalInsights >= 3)
        .sort((a, b) => {
          const severityPriority: Record<SeverityFloor, number> = {
            critical: 0,
            warning: 1,
            info: 2
          }

          const severityDiff = severityPriority[a.severityFloor] - severityPriority[b.severityFloor]

          if (severityDiff !== 0) return severityDiff

          return b.minQualityScore - a.minQualityScore
        })[0]

      if (fallback) {
        console.log('\n[preview] defaults originales no cumplen ≥3 insights.')
        console.log('[preview] alternativa encontrada (primera combo con ≥3 y severity más dura):')
        console.log(`  minQualityScore = ${fallback.minQualityScore}`)
        console.log(`  severityFloor   = ${fallback.severityFloor}`)
        console.log(`  totalInsights   = ${fallback.totalInsights}`)
      } else {
        console.log('\n[preview] ⚠️  NINGUNA combo produce ≥3 insights.')
        console.log('[preview] opciones: (a) bajar maxPerSpace para diversificar, (b) ampliar')
        console.log('[preview] ventana, o (c) aceptar 0 insights → email del lunes será skipped.')
      }
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

run().catch(err => {
  console.error('[preview] error:', err instanceof Error ? err.stack || err.message : err)
  process.exitCode = 1
})
