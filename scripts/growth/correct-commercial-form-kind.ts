/** Explicit operator repair using the Forms command; no SQL against form tables in this client. */
import { readFileSync, statSync, writeFileSync } from 'node:fs'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

async function main() {
  const args = process.argv.slice(2)

  const arg = (key: string) => {
    const i = args.indexOf(key)

    return i >= 0 ? args[i + 1] : undefined
  }

  const inputPath = arg('--input')
  const planPath = arg('--plan')
  const receiptPath = arg('--receipt')
  const actorId = process.env.FORMS_CLASSIFICATION_ACTOR_ID
  const apply = args.includes('--apply')

  if (!actorId || !planPath || (!apply && !inputPath) || (apply && !receiptPath)) throw new Error('explicit_private_plan_actor_and_receipt_required')

  const readPrivate = (path: string) => {
    if (statSync(path).mode & 0o077) throw new Error('private_file_mode_required')

    return JSON.parse(readFileSync(path, 'utf8'))
  }

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')
  process.env.CLOUDSDK_CORE_ACCOUNT = 'julio.reyes@efeonce.org'
  process.env.CLOUDSDK_CORE_PROJECT = 'efeonce-group'
  process.env.GREENHOUSE_POSTGRES_MAX_CONNECTIONS = '1'
  const { query } = await import('../../src/lib/db')
  const guard = await query<{ expected: boolean }>("SELECT current_user='greenhouse_ops' AS expected")

  if (!guard[0]?.expected) throw new Error('operator_database_profile_required')
  const { commercialFormClassificationSchema, formDefinitionFingerprint, FormClassificationConflictError } = await import('../../src/lib/growth/forms/classification-contract')
  const { getFormDefinitionByKey, getPublishedVersionBySlug } = await import('../../src/lib/growth/forms/store')

  if (!apply) {
    const source = readPrivate(inputPath!)
    const definition = await getFormDefinitionByKey(source.formKey)

    if (!definition) throw new Error('source_missing')
    const version = await getPublishedVersionBySlug(definition.slug)

    if (!version || definition.form_kind !== 'lead_magnet' || definition.status !== 'active' || !['low', 'medium'].includes(definition.risk_profile)) throw new Error('source_not_correctable')

    const command = commercialFormClassificationSchema.parse({ formKey: definition.form_key,
      expectedDefinitionSha256: formDefinitionFingerprint(definition), expectedPublishedVersionId: version.form_version_id,
      fromFormKind: 'lead_magnet', toFormKind: 'quote_request', commercialIntentConfirmed: source.commercialIntentConfirmed, reason: source.reason })

    writeFileSync(planPath, JSON.stringify({ at: new Date().toISOString(), actorId, definition, command }, null, 2), { mode: 0o600, flag: 'wx' })
    console.log(JSON.stringify({ planned: true, applied: false, formKey: definition.form_key, formKind: definition.form_kind, targetFormKind: 'quote_request' }))

    return
  }

  const plan = readPrivate(planPath)

  if (plan.actorId !== actorId) throw new Error('actor_plan_mismatch')
  const command = commercialFormClassificationSchema.parse(plan.command)
  const journal = { at: new Date().toISOString(), actorId, command, state: 'dispatching' }

  // Refuse a second mutation after any existing receipt, including an unknown result.
  writeFileSync(receiptPath!, JSON.stringify(journal, null, 2), { mode: 0o600, flag: 'wx' })
  const { correctCommercialFormClassification } = await import('../../src/lib/growth/forms/classification')
  let result

  try {
    result = await correctCommercialFormClassification(command, actorId)
  } catch (error) {
    writeFileSync(receiptPath!, JSON.stringify({ ...journal, state: error instanceof FormClassificationConflictError ? 'rejected_precondition' : 'unknown' }, null, 2), { mode: 0o600 })
    throw new Error('correction_stopped_do_not_retry_mutation')
  }

  writeFileSync(receiptPath!, JSON.stringify({ ...journal, state: 'applied', result }, null, 2), { mode: 0o600 })
  const readback = await getFormDefinitionByKey(command.formKey)

  if (!readback || formDefinitionFingerprint(readback) !== result.afterSha256) throw new Error('readback_requires_reconciliation_no_repeat')
  writeFileSync(receiptPath!, JSON.stringify({ ...journal, state: 'readback_verified', result, verifiedAt: new Date().toISOString() }, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ applied: true, verified: true, formKey: result.formKey, formKind: result.formKind, publishedVersionPreserved: true }))
}

main().then(() => process.exit(0)).catch(() => {
  console.error(JSON.stringify({ ok: false, error: 'classification_operation_stopped_sensitive_details_suppressed', recovery: 'Inspect the private plan/receipt. Never repeat an unknown mutation; read source metadata first.' }))
  process.exit(1)
})
