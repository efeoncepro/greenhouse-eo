/**
 * TASK-1739 Slice 5 — Purga gobernada de datos sintéticos: archivar por defecto, borrar por excepción.
 *
 * TASK-1772 — **el archivado exige allowlist.** Antes `--archive` mandaba el plan ENTERO
 * (`plan.candidates.map(...)`), así que la única forma de limpiar 8 filas era mutar las 43. Eso
 * dejaba a quien necesitara una limpieza acotada sin más salida que un script ad-hoc, sobre la
 * ÚNICA instancia Cloud SQL que comparten dev, staging y producción.
 *
 * La biblioteca nunca tuvo ese problema: `ApplyPurgeInput` recibe allowlist en los tres niveles y su
 * contrato dice «Omitirlo NO archiva ninguna: nada se escribe sin allowlist». Era el CLI el que
 * pasaba por encima de esa garantía. Ahora la respeta, y «todo» pasa a ser un acto deliberado
 * (`--all`) en vez del default.
 *
 * Uso:
 *   # 1. DRY-RUN (default, read-only): clasifica cada postulación no-real por lane y dice POR QUÉ.
 *   pnpm hiring:data:purge-synthetic
 *
 *   # 2. Emitir allowlist para poda humana (archivo local GITIGNOREADO):
 *   pnpm hiring:data:purge-synthetic --emit-allowlist ./task-xxxx.synthetic-purge-allowlist.json
 *
 *   # 3. Lane A — ARCHIVAR sólo lo aprobado (reversible, preserva toda la auditoría):
 *   pnpm hiring:data:purge-synthetic --archive \
 *     --allowlist ./task-xxxx.synthetic-purge-allowlist.json \
 *     --actor <user-id> --reason "<motivo>"
 *
 *   # 3b. Archivar el plan COMPLETO — deliberado, nunca por omisión:
 *   pnpm hiring:data:purge-synthetic --archive --all --actor <user-id> --reason "<motivo>"
 *
 *   # 4. Lane B — BORRAR (IRREVERSIBLE; sólo huérfanas sin rastro auditable y en `sourced`).
 *   #    Aborta la corrida COMPLETA si una sola fila no califica.
 *   pnpm hiring:data:purge-synthetic --delete --actor <user-id> --reason "<motivo>"
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import {
  archiveSyntheticRecords,
  countPurgeAllowlistEntries,
  deleteOrphanSyntheticRecords,
  findPurgeAllowlistEntriesOutsidePlan,
  planSyntheticPurge,
  PURGE_ALLOWLIST_SUFFIX,
  type PurgeAllowlist,
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

/**
 * TASK-1772 — el CLI ya no define la forma ni la validación de la allowlist: las consume de
 * `data-origin/purge.ts`. Lo que decide qué se muta sobre la base compartida vive en la biblioteca,
 * donde otro consumidor gobernado puede reusarlo y donde un test lo puede fijar.
 */
const readAllowlist = (path: string): PurgeAllowlist => {
  if (!path.endsWith(PURGE_ALLOWLIST_SUFFIX)) {
    throw new Error(`El archivo de allowlist debe terminar en \`${PURGE_ALLOWLIST_SUFFIX}\` (gitignoreado).`)
  }

  const parsed = JSON.parse(readFileSync(path, 'utf8')) as PurgeAllowlist

  if (countPurgeAllowlistEntries(parsed) === 0) {
    throw new Error('La allowlist no tiene entradas en ninguna de las tres entidades.')
  }

  return parsed
}

const assertAllowlistIsInPlan = (
  allowlist: PurgeAllowlist,
  plan: Awaited<ReturnType<typeof planSyntheticPurge>>,
): void => {
  const unknown = findPurgeAllowlistEntriesOutsidePlan(allowlist, plan)

  if (unknown.length > 0) {
    throw new Error(
      `La corrida se aborta: ${unknown.length} id(s) de la allowlist no están en el plan vigente.\n` +
        unknown.map(u => `  - ${u}`).join('\n') +
        '\nO el plan cambió desde que la emitiste, o la allowlist apunta a otra realidad. Re-emítela.',
    )
  }
}

const emitAllowlist = (path: string, plan: Awaited<ReturnType<typeof planSyntheticPurge>>): void => {
  if (!path.endsWith(PURGE_ALLOWLIST_SUFFIX)) {
    throw new Error(`El archivo de allowlist debe terminar en \`${PURGE_ALLOWLIST_SUFFIX}\` (gitignoreado).`)
  }

  const payload: PurgeAllowlist = {
    generatedAt: plan.generatedAt,
    applicationIds: plan.candidates.map(c => c.applicationId),
    candidateFacetIds: plan.facets.map(f => f.candidateFacetId),
    openingIds: plan.openings.map(o => o.openingId),
  }

  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\nAllowlist emitida en ${path}:`)
  console.log(`  applicationIds:   ${payload.applicationIds?.length}`)
  console.log(`  candidateFacetIds: ${payload.candidateFacetIds?.length}`)
  console.log(`  openingIds:        ${payload.openingIds?.length}`)
  console.log('\n⚠️  Es el plan COMPLETO, no un veredicto. PÓDALA línea a línea antes del --apply.')
  console.log('   Las tres listas se podan por separado: se puede archivar una postulación dejando')
  console.log('   viva su ficha y su vacante, que es justo lo que exige un fixture todavía en uso.\n')
}

const main = async (): Promise<void> => {
  applyGreenhousePostgresProfile('runtime')

  const plan = await planSyntheticPurge()
  const deletable = plan.candidates.filter(c => c.deleteBlockers.length === 0 && c.stage === 'sourced')
  const archivable = plan.candidates.filter(c => c.deleteBlockers.length > 0 || c.stage !== 'sourced')

  // TASK-1772 — el allowlist es SÓLO del carril de archivado, y la asimetría es el motivo:
  // archivar es reversible (el audit guarda el estado anterior), borrar no. Nombrar filas a mano en
  // un carril irreversible es una capacidad que hoy nadie necesita y que no vale la pena tener
  // disponible «por si acaso». Si alguna vez hace falta, que se agregue deliberadamente y con su
  // propia justificación — no de arrastre por compartir un flag.
  if (hasFlag('--delete') && (hasFlag('--allowlist') || hasFlag('--all'))) {
    throw new Error(
      'El carril de BORRADO no acepta --allowlist ni --all: su población la decide la calificación ' +
        'contra PG (cero dependientes, stage sourced), no una lista escrita a mano. Un allowlist ' +
        'diría QUÉ considerar, y acá lo que decide es SI califica.',
    )
  }

  if (hasFlag('--archive')) {
    const { actor, reason } = requireActorAndReason()
    const allowlistPath = argValue('--allowlist')

    if (!allowlistPath && !hasFlag('--all')) {
      throw new Error(
        'Falta --allowlist <archivo>. El archivado exige allowlist: el plan completo son ' +
          `${plan.candidates.length} postulación(es), ${plan.facets.length} ficha(s) y ` +
          `${plan.openings.length} vacante(s) sobre la ÚNICA instancia que comparten dev, staging y ` +
          'producción. Emítela con --emit-allowlist y pódala. Para el plan entero, --all explícito.',
      )
    }

    const allowlist = allowlistPath ? readAllowlist(allowlistPath) : null

    if (allowlist) assertAllowlistIsInPlan(allowlist, plan)

    // TASK-1748 — el archivado cubre las TRES entidades. Antes sólo tocaba la postulación, y por eso
    // quedaron 11 fichas `active` y 14 vacantes en `draft`/`active` con el lane dado por terminado.
    //
    // TASK-1772 — con allowlist, cada entidad viaja podada por separado: `?? []` y NO `?? plan.*`,
    // porque omitir una lista significa «ninguna», nunca «todas». Es el contrato de la biblioteca
    // («Omitirlo NO archiva ninguna») y el default seguro: el error de omisión no debe archivar de
    // más sobre una base compartida.
    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: allowlist ? (allowlist.applicationIds ?? []) : plan.candidates.map(c => c.applicationId),
      candidateFacetIds: allowlist ? (allowlist.candidateFacetIds ?? []) : plan.facets.map(f => f.candidateFacetId),
      openingIds: allowlist ? (allowlist.openingIds ?? []) : plan.openings.map(o => o.openingId),
      actorUserId: actor,
      reason,
    })

    const count = (recordType: string, outcome: string) =>
      summary.results.filter(r => r.recordType === recordType && r.outcome === outcome).length

    console.log('\n══ Lane A · ARCHIVADO ══')
    console.log(`  postulaciones  archivadas=${count('hiring_application', 'archived')}  saltadas=${count('hiring_application', 'skipped')}`)
    console.log(`  fichas         archivadas=${count('candidate_facet', 'archived')}  saltadas=${count('candidate_facet', 'skipped')}`)
    console.log(`  vacantes       archivadas=${count('hiring_opening', 'archived')}  saltadas=${count('hiring_opening', 'skipped')}\n`)
    console.log('  La postulación se archiva en `archived_at`, NUNCA moviendo `stage` a `closed`:')
    console.log('  archivar un registro no declara el desenlace de nadie (ADR del vocabulario §5).')
    console.log('  Reversible: el audit guarda el estado anterior de cada fila.\n')

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

  const emitPath = argValue('--emit-allowlist')

  console.log('\n══ TASK-1739 · Plan de purga (DRY-RUN, read-only) ══\n')
  console.log(`Generado: ${plan.generatedAt}`)
  console.log(`Postulaciones no reales: ${plan.candidates.length}\n`)
  console.log(`  Lane A · ARCHIVAR (tienen historia auditable o ya fueron trabajadas): ${archivable.length}`)
  console.log(`  Lane B · BORRAR (huérfanas, sin rastro, en 'sourced'):                ${deletable.length}\n`)
  console.log(`  Fichas de candidato sin archivar:  ${plan.facets.length}`)
  console.log(`  Vacantes sin archivar:             ${plan.openings.length}\n`)

  for (const candidate of archivable) {
    const why = candidate.deleteBlockers.join(', ') || 'ya fue trabajada por alguien'

    console.log(`  archivar  ${candidate.applicationId}  stage=${candidate.stage}`)
    console.log(`            no se borra porque: ${why}`)
  }

  for (const candidate of deletable) {
    console.log(`  borrable  ${candidate.applicationId}  stage=${candidate.stage}  (sin dependientes)`)
  }

  for (const facet of plan.facets) {
    console.log(`  archivar  ${facet.candidateFacetId}  ficha status=${facet.status} -> archived`)
  }

  for (const opening of plan.openings) {
    console.log(
      `  archivar  ${opening.openingId}  vacante status=${opening.status}/${opening.publicationStatus} -> cancelled`,
    )
  }

  console.log('\n⚠️  El borrado es IRREVERSIBLE y aborta la corrida completa si una sola fila no califica.')
  console.log('   Archivar cubre casi todo, preserva la auditoría y se revierte desde el audit.\n')

  if (emitPath) emitAllowlist(emitPath, plan)
}

main()
  .catch(error => {
    console.error(`\n[TASK-1739] ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
