/**
 * TASK-1739 Slice 5 — Purga gobernada de datos sintéticos: archivar por defecto, borrar por excepción.
 *
 * Uso:
 *   # 1. DRY-RUN (default, read-only): clasifica cada postulación no-real por lane y dice POR QUÉ.
 *   pnpm hiring:data:purge-synthetic
 *
 *   # 2. Lane A — ARCHIVAR (reversible, preserva toda la auditoría):
 *   pnpm hiring:data:purge-synthetic --archive --actor <user-id> --reason "<motivo>"
 *
 *   # 3. Lane B — BORRAR (IRREVERSIBLE; sólo huérfanas sin rastro auditable y en `sourced`).
 *   #    Aborta la corrida COMPLETA si una sola fila no califica.
 *   pnpm hiring:data:purge-synthetic --delete --actor <user-id> --reason "<motivo>"
 */
import { applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import {
  archiveSyntheticRecords,
  deleteOrphanSyntheticRecords,
  planSyntheticPurge,
} from '@/lib/hiring/data-origin/purge'

const argValue = (flag: string): string | null => {
  const i = process.argv.indexOf(flag)

  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const hasFlag = (flag: string): boolean => process.argv.includes(flag)

const requireActorAndReason = (): { actor: string; reason: string } => {
  const actor = argValue('--actor')
  const reason = argValue('--reason')

  if (!actor) throw new Error('Falta --actor <user-id>.')
  if (!reason) throw new Error('Falta --reason "<motivo>".')

  return { actor, reason }
}

const main = async (): Promise<void> => {
  applyGreenhousePostgresProfile('runtime')

  const plan = await planSyntheticPurge()
  const deletable = plan.candidates.filter(c => c.deleteBlockers.length === 0 && c.stage === 'sourced')
  const archivable = plan.candidates.filter(c => c.deleteBlockers.length > 0 || c.stage !== 'sourced')

  if (hasFlag('--archive')) {
    const { actor, reason } = requireActorAndReason()

    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: plan.candidates.map(c => c.applicationId),
      actorUserId: actor,
      reason,
    })

    const archived = summary.results.filter(r => r.outcome === 'archived').length
    const skipped = summary.results.filter(r => r.outcome === 'skipped').length

    console.log(`\n══ Lane A · ARCHIVADO ══\n  archivadas=${archived}  saltadas=${skipped}\n`)
    console.log('  Reversible: el audit guarda el stage anterior de cada fila.\n')

    return
  }

  if (hasFlag('--delete')) {
    const { actor, reason } = requireActorAndReason()

    console.log(`\n══ Lane B · BORRADO IRREVERSIBLE de ${deletable.length} postulación(es) ══\n`)

    const summary = await deleteOrphanSyntheticRecords({
      lane: 'delete',
      applicationIds: deletable.map(c => c.applicationId),
      actorUserId: actor,
      reason,
    })

    console.log(`  borradas=${summary.processed}\n`)

    return
  }

  console.log('\n══ TASK-1739 · Plan de purga (DRY-RUN, read-only) ══\n')
  console.log(`Generado: ${plan.generatedAt}`)
  console.log(`Postulaciones no reales: ${plan.candidates.length}\n`)
  console.log(`  Lane A · ARCHIVAR (tienen historia auditable o ya fueron trabajadas): ${archivable.length}`)
  console.log(`  Lane B · BORRAR (huérfanas, sin rastro, en 'sourced'):                ${deletable.length}\n`)

  for (const candidate of archivable) {
    const why = candidate.deleteBlockers.join(', ') || 'ya fue trabajada por alguien'

    console.log(`  archivar  ${candidate.applicationId}  stage=${candidate.stage}`)
    console.log(`            no se borra porque: ${why}`)
  }

  for (const candidate of deletable) {
    console.log(`  borrable  ${candidate.applicationId}  stage=${candidate.stage}  (sin dependientes)`)
  }

  console.log('\n⚠️  El borrado es IRREVERSIBLE y aborta la corrida completa si una sola fila no califica.')
  console.log('   Archivar cubre casi todo, preserva la auditoría y se revierte desde el audit.\n')
}

main()
  .catch(error => {
    console.error(`\n[TASK-1739] ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
