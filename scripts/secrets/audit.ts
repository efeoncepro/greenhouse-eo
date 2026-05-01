#!/usr/bin/env tsx
/**
 * TASK-742 Capa 7 — Secret hygiene audit.
 *
 * Iterates the catalog of critical secrets (NEXTAUTH_SECRET, AZURE_AD_CLIENT_SECRET,
 * GOOGLE_CLIENT_SECRET, NEXTAUTH_URL, CRON_SECRET, AGENT_AUTH_SECRET) and reports
 * for each:
 *   - resolution source (env vs secret_manager)
 *   - hygiene score (length, charset, anomaly flags)
 *   - rotation freshness (last GCP version create time, if available)
 *
 * Output is JSON consumable by Reliability dashboard or grep.
 *
 * Usage:
 *   pnpm secrets:audit
 *   pnpm secrets:audit --json
 *   pnpm secrets:audit --secret NEXTAUTH_SECRET
 */

import { resolveSecret } from '../../src/lib/secrets/secret-manager'
import { validateSecretFormat, getSecretFormatDescription } from '../../src/lib/secrets/format-validators'

type AuditEntry = {
  envVarName: string
  description: string | null
  source: 'secret_manager' | 'env' | 'unconfigured'
  byteLen: number
  hygiene: {
    ok: boolean
    violations: string[]
  }
  secretRef: string | null
  hasFallbackEnvValue: boolean
  notes: string[]
}

const AUDITED_SECRETS = [
  'NEXTAUTH_SECRET',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'NEXTAUTH_URL',
  'CRON_SECRET',
  'AGENT_AUTH_SECRET'
]

const auditOne = async (envVarName: string): Promise<AuditEntry> => {
  const notes: string[] = []
  const resolution = await resolveSecret({ envVarName })
  const value = resolution.value ?? ''
  const validation = validateSecretFormat(envVarName, value)

  const hasFallbackEnvValue = Boolean(process.env[envVarName])

  if (resolution.source === 'env' && resolution.secretRef) {
    notes.push(
      'CRITICAL: SECRET_REF configured but Secret Manager lookup failed; runtime is using process.env. Investigate.'
    )
  }

  if (resolution.source === 'unconfigured') {
    notes.push('Secret unresolved. Provider/feature using this var is degraded.')
  }

  if (resolution.source === 'env' && hasFallbackEnvValue) {
    notes.push('Resolved from process.env. Migrate to Secret Manager via *_SECRET_REF for production.')
  }

  if (resolution.formatViolations && resolution.formatViolations.length > 0) {
    notes.push(`Payload rejected by format validator: ${resolution.formatViolations.join(',')}`)
  }

  return {
    envVarName,
    description: getSecretFormatDescription(envVarName),
    source: resolution.source,
    byteLen: validation.byteLen,
    hygiene: {
      ok: validation.ok,
      violations: validation.violations
    },
    secretRef: resolution.secretRef,
    hasFallbackEnvValue,
    notes
  }
}

const main = async () => {
  const args = process.argv.slice(2)

  const onlySecret = (() => {
    const idx = args.indexOf('--secret')

    return idx >= 0 ? args[idx + 1] : null
  })()

  const targets = onlySecret ? [onlySecret] : AUDITED_SECRETS

  const results = await Promise.all(targets.map(auditOne))

  const output = {
    auditedAt: new Date().toISOString(),
    totalSecrets: results.length,
    healthy: results.filter(r => r.hygiene.ok && r.source !== 'unconfigured').length,
    degraded: results.filter(r => !r.hygiene.ok || r.source === 'unconfigured').length,
    secrets: results
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(output, null, 2))

    return
  }

  console.log(`\n=== Secret Hygiene Audit (${output.auditedAt}) ===\n`)
  console.log(`Healthy:  ${output.healthy}/${output.totalSecrets}`)
  console.log(`Degraded: ${output.degraded}/${output.totalSecrets}\n`)

  for (const entry of results) {
    const status = entry.hygiene.ok && entry.source !== 'unconfigured' ? '✓' : '✗'

    console.log(`${status} ${entry.envVarName}`)
    console.log(`  source:  ${entry.source}`)
    console.log(`  byteLen: ${entry.byteLen}`)
    console.log(`  ok:      ${entry.hygiene.ok ? 'true' : 'false'}`)

    if (entry.hygiene.violations.length > 0) {
      console.log(`  violations: ${entry.hygiene.violations.join(', ')}`)
    }

    if (entry.notes.length > 0) {
      for (const note of entry.notes) console.log(`  note: ${note}`)
    }

    console.log('')
  }

  if (output.degraded > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('[secrets:audit] failed', error)
  process.exit(2)
})
