/**
 * TASK-1739 Slice 4 — Marcado gobernado de procedencia sobre datos de Hiring ya existentes.
 *
 * Protocolo canónico del dominio: `dry-run → allowlist humana podada línea a línea → apply con
 * actor + motivo → rollback por registro`. Un flag jamás autoriza un backfill; la puerta es la poda
 * humana. El apply opera en lotes de 1 con compare-and-set y escribe una fila de audit por registro.
 *
 * Uso:
 *   # 1. DRY-RUN (default, read-only): imprime las propuestas con la evidencia que las disparó.
 *   pnpm hiring:data:mark-synthetic
 *
 *   # 2. Emitir allowlist para poda humana (archivo local GITIGNOREADO):
 *   pnpm hiring:data:mark-synthetic --emit-allowlist ./task-1739.synthetic-origin-allowlist.json
 *
 *   # 3. APPLY sólo de lo aprobado:
 *   pnpm hiring:data:mark-synthetic --apply \
 *     --allowlist ./task-1739.synthetic-origin-allowlist.json \
 *     --actor <user-id> --reason "TASK-1739 marcado autorizado por <quien>"
 *
 *   # 4. ROLLBACK por registro desde el audit:
 *   pnpm hiring:data:mark-synthetic --rollback <auditId> \
 *     --actor <user-id> --reason "TASK-1739 rollback: <motivo>"
 *
 * La salida trae identificadores de registros, no nombres ni correos. Aun así es stdout local del
 * operador: no pegarla en logs compartidos, issues ni chat.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import {
  applySyntheticOriginMarking,
  planSyntheticOriginMarking,
  rollbackSyntheticOriginMarking,
  type DataOriginMarkAllowlistEntry,
} from '@/lib/hiring/data-origin/mark'

const argValue = (flag: string): string | null => {
  const i = process.argv.indexOf(flag)

  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const hasFlag = (flag: string): boolean => process.argv.includes(flag)

const DEFAULT_PROPOSED = 'smoke_test'

const runDryRun = async (emitPath: string | null): Promise<void> => {
  const plan = await planSyntheticOriginMarking()

  console.log('\n══ TASK-1739 · Propuestas de procedencia (DRY-RUN, read-only) ══\n')
  console.log(`Generado: ${plan.generatedAt}`)
  console.log(`Candidatos: ${plan.candidates.length}\n`)

  if (plan.candidates.length === 0) {
    console.log('Sin candidatos: nada que marcar.\n')

    return
  }

  const blocked = plan.candidates.filter(c => c.blockers.length > 0)

  for (const candidate of plan.candidates) {
    const signals = candidate.signals.map(s => `${s.signal}(${s.confidence})`).join(' + ')

    console.log(`  ${candidate.recordType.padEnd(17)} ${candidate.recordId}`)
    console.log(`      señales: ${signals}`)

    for (const signal of candidate.signals) console.log(`        · ${signal.detail}`)

    if (candidate.blockers.length > 0) {
      console.log(`      ⛔ NO MARCABLE: ${candidate.blockers.join(', ')}`)
    }
  }

  console.log('')

  if (blocked.length > 0) {
    console.log(
      `⛔ ${blocked.length} registro(s) con vida laboral quedan FUERA de la allowlist: marcar sintética a`,
    )
    console.log('   una persona con relación laboral tocaría payroll y está prohibido.\n')
  }

  console.log('⚠️  Estas son PROPUESTAS con su evidencia, no veredictos. Poda la allowlist línea a')
  console.log('   línea antes del apply: la señal de nombre es notoriamente falible y por eso no se usa.\n')

  if (!emitPath) return

  if (!emitPath.endsWith('.synthetic-origin-allowlist.json')) {
    throw new Error('El archivo de allowlist debe terminar en `.synthetic-origin-allowlist.json` (gitignoreado).')
  }

  const entries: DataOriginMarkAllowlistEntry[] = plan.candidates
    .filter(c => c.blockers.length === 0)
    .map(c => ({
      recordType: c.recordType,
      recordId: c.recordId,
      expectedCurrentOrigin: c.currentOrigin,
      proposedOrigin: DEFAULT_PROPOSED,
    }))

  writeFileSync(emitPath, `${JSON.stringify({ generatedAt: plan.generatedAt, entries }, null, 2)}\n`, 'utf8')
  console.log(`Allowlist emitida en ${emitPath} (${entries.length} entradas).`)
  console.log('Revísala y PODA lo que no corresponda antes de correr --apply.\n')
}

const runApply = async (): Promise<void> => {
  const allowlistPath = argValue('--allowlist')
  const actor = argValue('--actor')
  const reason = argValue('--reason')

  if (!allowlistPath) throw new Error('Falta --allowlist <archivo>.')
  if (!actor) throw new Error('Falta --actor <user-id>.')
  if (!reason) throw new Error('Falta --reason "<motivo>".')

  const parsed = JSON.parse(readFileSync(allowlistPath, 'utf8')) as { entries?: DataOriginMarkAllowlistEntry[] }
  const entries = parsed.entries ?? []

  if (entries.length === 0) throw new Error('La allowlist no tiene entradas.')

  console.log(`\n══ TASK-1739 · APPLY de ${entries.length} entrada(s) ══\n`)

  const summary = await applySyntheticOriginMarking({ entries, actorUserId: actor, reason })

  for (const result of summary.results) {
    const detail = result.reasonCode ? ` (${result.reasonCode})` : ''

    const propagated =
      result.propagatedApplications !== undefined ? ` · postulaciones re-derivadas: ${result.propagatedApplications}` : ''

    console.log(`  ${result.outcome.padEnd(12)} ${result.recordType.padEnd(17)} ${result.recordId}${detail}${propagated}`)
  }

  console.log(
    `\napplied=${summary.applied}  skipped=${summary.skipped}  needs_review=${summary.needsReview}\n`,
  )

  if (summary.needsReview > 0) {
    console.log('⚠️  Hay registros en needs_review: revisa cada uno antes de reintentar.')
    console.log('   `cas_mismatch` significa que la fila cambió desde el dry-run — regenera el plan.\n')
  }
}

const runRollback = async (auditId: string): Promise<void> => {
  const actor = argValue('--actor')
  const reason = argValue('--reason')

  if (!actor) throw new Error('Falta --actor <user-id>.')
  if (!reason) throw new Error('Falta --reason "<motivo>".')

  const result = await rollbackSyntheticOriginMarking({ auditId, actorUserId: actor, reason })

  console.log(`\n══ TASK-1739 · ROLLBACK de ${auditId} ══\n`)
  console.log(`  outcome: ${result.outcome}${result.reasonCode ? ` (${result.reasonCode})` : ''}`)

  if (result.outcome === 'applied') {
    console.log(`  ${result.recordType} ${result.recordId} restaurado a '${result.restoredTo}'\n`)
  } else {
    console.log('  Sin mutar. Si es `cas_mismatch`, el valor vigente ya no es el que dejó ese apply.\n')
    process.exitCode = 1
  }
}

const main = async (): Promise<void> => {
  applyGreenhousePostgresProfile('runtime')

  const rollbackId = argValue('--rollback')

  if (rollbackId) {
    await runRollback(rollbackId)

    return
  }

  if (hasFlag('--apply')) {
    await runApply()

    return
  }

  await runDryRun(argValue('--emit-allowlist'))
}

main()
  .catch(error => {
    console.error(`\n[TASK-1739] ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
