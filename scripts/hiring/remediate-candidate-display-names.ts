/**
 * TASK-1736 Slice 3 — CLI de remediación histórica gobernada de display names de candidatos.
 *
 * Contrato ADR GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1 §D4:
 * `dry-run → allowlist humana revisada → apply CAS en lotes de 1 + audit → rollback`. La LÓGICA
 * vive en `src/lib/hiring/candidate-intake/{detect-degenerate,remediate}.ts`; la única puerta de
 * mutación es `reconcileCandidateIdentityDisplayName` (CAS + audit fuente `reconcile`). Este CLI
 * NO lee el flag `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED`: la remediación es un acto
 * humano explícito con allowlist + actor + reason (el flag por sí solo jamás autoriza backfill).
 *
 * Uso:
 *   # 1. DRY-RUN (default, read-only): imprime el plan sin mutar nada.
 *   pnpm hiring:candidates:remediate-display
 *
 *   # 2. Emitir allowlist para revisión humana línea a línea (archivo local GITIGNOREADO —
 *   #    el nombre DEBE terminar en `.candidate-remediation-allowlist.json`):
 *   pnpm hiring:candidates:remediate-display --emit-allowlist \
 *     ./task-1736.candidate-remediation-allowlist.json
 *
 *   # 3. APPLY sólo de lo aprobado (el humano poda el archivo antes):
 *   pnpm hiring:candidates:remediate-display --apply \
 *     --allowlist ./task-1736.candidate-remediation-allowlist.json \
 *     --actor <user-id> --reason "TASK-1736 remediación casing histórico"
 *
 *   # 4. ROLLBACK per-record de un apply (CAS del before-value del audit reconcile/applied):
 *   pnpm hiring:candidates:remediate-display --rollback <auditId> \
 *     --actor <user-id> --reason "TASK-1736 rollback: <motivo>"
 *
 * Salida con PII (nombres before/proposed): SOLO stdout local del operador y el archivo
 * gitignoreado de allowlist. Jamás pegar este output en logs compartidos, issues ni chat.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import {
  applyCandidateIdentityRemediation,
  planCandidateIdentityRemediation,
  rollbackCandidateIdentityRemediation,
  CANDIDATE_REMEDIATION_REASON_MIN,
  type CandidateIdentityRemediationAllowlistEntry
} from '../../src/lib/hiring/candidate-intake/remediate'
import { CANDIDATE_NAME_NORMALIZATION_VERSION } from '../../src/lib/hiring/candidate-intake/normalize-name'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const ALLOWLIST_SUFFIX = '.candidate-remediation-allowlist.json'

interface AllowlistFile {
  task: string
  generatedAt: string
  normalizationVersion: string
  entries: CandidateIdentityRemediationAllowlistEntry[]
}

const arg = (name: string): string | undefined => {
  const idx = process.argv.indexOf(name)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const fail = (message: string): never => {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

const printPlanSummary = (plan: Awaited<ReturnType<typeof planCandidateIdentityRemediation>>) => {
  console.log(`perfiles candidatos escaneados: ${plan.totalCandidateProfiles}`)
  console.log(`clasificación (versión ${plan.normalizationVersion}):`)

  for (const [classification, count] of Object.entries(plan.countsByClassification)) {
    console.log(`  - ${classification}: ${count}`)
  }

  console.log(`excluidos por corrección humana previa: ${plan.excludedByHumanCorrectionCount}`)
  console.log(`remediables (degenerado evidente, sin corrección humana): ${plan.allowlistEntries.length}`)

  if (plan.allowlistEntries.length > 0) {
    console.log('\npropuestas (revisión humana línea a línea):')

    for (const entry of plan.allowlistEntries) {
      console.log(
        `  ${entry.publicId ?? entry.profileId} [${entry.classification}] ` +
          `"${entry.beforeFullName}" → "${entry.proposedFullName}" (app: ${entry.applicationId ?? 'sin application'})`
      )
    }
  }
}

const runDryRun = async (emitAllowlistPath: string | undefined) => {
  const plan = await planCandidateIdentityRemediation()

  console.log('\n=== TASK-1736 remediación display names — modo DRY-RUN (read-only) ===')
  printPlanSummary(plan)

  if (!emitAllowlistPath) {
    console.log('\nDRY-RUN: no se escribió nada. Usa --emit-allowlist <file> para generar la allowlist.')

    return
  }

  if (!emitAllowlistPath.endsWith(ALLOWLIST_SUFFIX)) {
    fail(
      `el archivo de allowlist debe terminar en "${ALLOWLIST_SUFFIX}" ` +
        '(patrón gitignoreado — el archivo contiene PII y jamás se commitea).'
    )
  }

  const payload: AllowlistFile = {
    task: 'TASK-1736',
    generatedAt: plan.generatedAt,
    normalizationVersion: plan.normalizationVersion,
    entries: plan.allowlistEntries
  }

  writeFileSync(emitAllowlistPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\nallowlist emitida: ${emitAllowlistPath} (${plan.allowlistEntries.length} entries)`)
  console.log('Revísala línea a línea y ELIMINA toda entry que no apruebes antes del --apply.')
}

const readAllowlist = (allowlistPath: string): AllowlistFile => {
  let parsed: unknown

  try {
    parsed = JSON.parse(readFileSync(allowlistPath, 'utf8'))
  } catch (error) {
    return fail(`no se pudo leer la allowlist ${allowlistPath}: ${error instanceof Error ? error.message : String(error)}`)
  }

  const file = parsed as AllowlistFile

  if (!file || file.task !== 'TASK-1736' || !Array.isArray(file.entries)) {
    return fail('allowlist inválida: se espera { task: "TASK-1736", generatedAt, normalizationVersion, entries: [...] }.')
  }

  return file
}

const runApply = async () => {
  const allowlistPath = arg('--allowlist')
  const actor = arg('--actor')
  const reason = arg('--reason')

  if (!allowlistPath) fail('--apply requiere --allowlist <file>.')

  // El apply exige el MISMO sufijo gitignoreado que el emit: si el archivo no lo lleva, no vino
  // del flujo canónico (o quedó en riesgo de commitearse con PII) — no se procesa.
  if (!(allowlistPath as string).endsWith(ALLOWLIST_SUFFIX)) {
    fail(
      `la allowlist del --apply debe terminar en "${ALLOWLIST_SUFFIX}" ` +
        '(patrón gitignoreado — el archivo contiene PII y jamás se commitea).'
    )
  }

  if (!actor) fail('--apply requiere --actor <user-id>.')

  if (!reason || reason.trim().length < CANDIDATE_REMEDIATION_REASON_MIN) {
    fail(`--apply requiere --reason "<≥${CANDIDATE_REMEDIATION_REASON_MIN} chars>".`)
  }

  const allowlist = readAllowlist(allowlistPath as string)

  if (allowlist.entries.length === 0) {
    fail('la allowlist no tiene entries: nada que aplicar.')
  }

  if (allowlist.normalizationVersion !== CANDIDATE_NAME_NORMALIZATION_VERSION) {
    fail(
      `la allowlist se generó con la versión de policy "${allowlist.normalizationVersion}" y la vigente es ` +
        `"${CANDIDATE_NAME_NORMALIZATION_VERSION}": regenera el dry-run + allowlist antes de aplicar.`
    )
  }

  console.log('\n=== TASK-1736 remediación display names — modo APPLY ===')
  console.log(`allowlist: ${allowlistPath} (generada ${allowlist.generatedAt})`)
  console.log(`actor: ${actor} | reason: "${reason}"`)
  console.log(`conteo esperado (entries aprobadas): ${allowlist.entries.length}`)
  console.log('aplicando en lotes de 1 vía reconcileCandidateIdentityDisplayName (CAS + audit)...\n')

  const summary = await applyCandidateIdentityRemediation({
    entries: allowlist.entries,
    actorUserId: actor as string,
    reason: reason as string
  })

  for (const result of summary.results) {
    console.log(`  ${result.publicId ?? result.profileId}: ${result.outcome} (${result.reasonCode})`)
  }

  console.log(
    `\nresumen: expected=${summary.expected} applied=${summary.applied} ` +
      `skipped=${summary.skipped} (already_canonical=${summary.skippedAlreadyCanonical}) ` +
      `needs_review=${summary.needsReview}`
  )

  if (!summary.countMatchesExpected) {
    console.error(
      `\nABORT: applied+already_canonical (${summary.applied + summary.skippedAlreadyCanonical}) != esperado (${summary.expected}). ` +
        'El estado en DB cambió desde el dry-run (CAS/searchKey lo detectó) o hay corrección humana nueva. ' +
        'Regenera el dry-run + allowlist y revisa los needs_review/skipped uno a uno.'
    )
    process.exitCode = 1

    return
  }

  // Retry idempotente (A6): un skipped already_canonical ES el estado prometido por la allowlist.
  console.log(
    `✓ estado prometido alcanzado: ${summary.applied} aplicados + ${summary.skippedAlreadyCanonical} ya canónicos ` +
      `de ${summary.expected}.`
  )
}

const runRollback = async (auditId: string) => {
  const actor = arg('--actor')
  const reason = arg('--reason')

  if (!actor) fail('--rollback requiere --actor <user-id>.')

  if (!reason || reason.trim().length < CANDIDATE_REMEDIATION_REASON_MIN) {
    fail(`--rollback requiere --reason "<≥${CANDIDATE_REMEDIATION_REASON_MIN} chars>".`)
  }

  console.log('\n=== TASK-1736 remediación display names — modo ROLLBACK (per-record) ===')
  console.log(`audit: ${auditId} | actor: ${actor} | reason: "${reason}"`)

  const result = await rollbackCandidateIdentityRemediation({
    auditId,
    actorUserId: actor as string,
    reason: reason as string
  })

  console.log(`  ${result.profileId}: ${result.outcome} (${result.reasonCode})`)

  if (result.outcome !== 'applied') {
    console.error(
      '\nROLLBACK NO APLICADO: el full_name vigente ya no es el after de ese apply (o el before no es ' +
        'restaurable). Nada se mutó; resuelve caso a caso con el command de corrección humana.'
    )
    process.exitCode = 1

    return
  }

  console.log('✓ display restaurado al before-value exacto del audit (queda registrado como corrección humana).')
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const apply = process.argv.includes('--apply')
  const rollbackAuditId = arg('--rollback')
  const emitAllowlistPath = arg('--emit-allowlist')

  if ([apply, Boolean(rollbackAuditId), Boolean(emitAllowlistPath)].filter(Boolean).length > 1) {
    fail('--apply, --rollback y --emit-allowlist son mutuamente excluyentes.')
  }

  try {
    if (rollbackAuditId) {
      await runRollback(rollbackAuditId)
    } else if (apply) {
      await runApply()
    } else {
      await runDryRun(emitAllowlistPath)
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
