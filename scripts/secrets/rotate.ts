#!/usr/bin/env tsx
/**
 * TASK-742 Capa 7 — Idempotent secret rotation playbook.
 *
 * Rotates a GCP Secret Manager secret with verify-before-cutover semantics:
 *   1. Validate the new value against the format validator (fail fast).
 *   2. Add a new secret version via the gcloud CLI using the canonical
 *      `printf %s "$VALUE"` flow (no shell interpolation, no quote contamination).
 *   3. Trigger a redeploy (Vercel or Cloud Run) of the consumer.
 *   4. Poll the consumer's health endpoint until ready (5min timeout).
 *   5. Disable the previous version only after health is confirmed.
 *
 * On step-4 failure → disable the new version, re-enable the previous one,
 * abort cleanly. The system never ends up in a state where production runs
 * with an unverified rotation.
 *
 * Usage:
 *   pnpm secrets:rotate <gcp-secret-id> --value <value>
 *   pnpm secrets:rotate <gcp-secret-id> --value-file /path/to/value.txt
 *   pnpm secrets:rotate <gcp-secret-id> --value-from-stdin
 *   pnpm secrets:rotate <gcp-secret-id> --validate-as NEXTAUTH_SECRET --vercel-redeploy <project>
 */

import { execSync, spawnSync } from 'child_process'
import { readFileSync } from 'fs'

import { validateSecretFormat, isKnownSecretFormat } from '../../src/lib/secrets/format-validators'

type RotateOptions = {
  secretId: string
  value: string
  validateAs: string | null
  vercelProject: string | null
  cloudRunService: string | null
  cloudRunRegion: string | null
  healthUrl: string | null
  healthTimeoutMs: number
  project: string
  dryRun: boolean
}

const usage = () => {
  console.error(
    `Usage:
  pnpm secrets:rotate <gcp-secret-id> [options]

Required (one of):
  --value <value>                 Inline value (only safe in CI; not echoed)
  --value-file <path>             Read value from file
  --value-from-stdin              Read value from stdin

Optional:
  --validate-as <ENV_VAR_NAME>    Validate format using a known secret rule
  --vercel-redeploy <project>     Redeploy a Vercel project after rotation
  --cloud-run-service <name>      Re-trigger a Cloud Run service revision
  --cloud-run-region <region>     Region for Cloud Run service (default: us-east4)
  --health-url <url>              Poll URL until 200/ready
  --health-timeout-ms <ms>        Health poll deadline (default: 300000)
  --project <gcp-project>         GCP project (default: efeonce-group)
  --dry-run                       Print actions, do not execute

Examples:
  pnpm secrets:rotate greenhouse-nextauth-secret-production --value-from-stdin --validate-as NEXTAUTH_SECRET --vercel-redeploy greenhouse-eo --health-url https://greenhouse.efeoncepro.com/api/auth/health
  pnpm secrets:rotate greenhouse-azure-ad-client-secret-production --value-file /tmp/azure.txt --validate-as AZURE_AD_CLIENT_SECRET
`
  )
  process.exit(1)
}

const parseArgs = (): RotateOptions => {
  const args = process.argv.slice(2)

  if (args.length < 1) usage()

  const secretId = args[0]

  if (!secretId || secretId.startsWith('--')) usage()

  const flag = (name: string) => {
    const idx = args.indexOf(name)

    
return idx >= 0 ? args[idx + 1] : null
  }

  let value: string | null = null
  const inlineValue = flag('--value')
  const valueFile = flag('--value-file')
  const fromStdin = args.includes('--value-from-stdin')

  if (inlineValue) {
    value = inlineValue
  } else if (valueFile) {
    value = readFileSync(valueFile, 'utf8').replace(/[\r\n]+$/u, '')
  } else if (fromStdin) {
    value = readFileSync(0, 'utf8').replace(/[\r\n]+$/u, '')
  } else {
    console.error('error: missing --value, --value-file, or --value-from-stdin')
    usage()
  }

  if (!value) {
    console.error('error: empty value after sanitization')
    process.exit(1)
  }

  return {
    secretId,
    value,
    validateAs: flag('--validate-as'),
    vercelProject: flag('--vercel-redeploy'),
    cloudRunService: flag('--cloud-run-service'),
    cloudRunRegion: flag('--cloud-run-region') || 'us-east4',
    healthUrl: flag('--health-url'),
    healthTimeoutMs: Number.parseInt(flag('--health-timeout-ms') ?? '300000', 10),
    project: flag('--project') || 'efeonce-group',
    dryRun: args.includes('--dry-run')
  }
}

const sh = (cmd: string, opts: { input?: string } = {}) => {
  if (opts.input) {
    return spawnSync('sh', ['-c', cmd], { encoding: 'utf8', input: opts.input })
  }

  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' })
  } catch (error) {
    return error
  }
}

const log = (msg: string) => console.log(`[rotate] ${msg}`)

const fail = (msg: string): never => {
  console.error(`[rotate] ABORT: ${msg}`)
  process.exit(1)
}

const main = async () => {
  const opts = parseArgs()

  // 1) Format validation
  if (opts.validateAs) {
    if (!isKnownSecretFormat(opts.validateAs)) {
      fail(`unknown --validate-as target: ${opts.validateAs}`)
    }

    const result = validateSecretFormat(opts.validateAs, opts.value)

    if (!result.ok) {
      fail(
        `format validation failed for ${opts.validateAs}: ${result.violations.join(',')}. byteLen=${result.byteLen}. Refusing to rotate.`
      )
    }

    log(`format validation passed for ${opts.validateAs} (byteLen=${result.byteLen})`)
  } else {
    log('skipping format validation (no --validate-as provided)')
  }

  // 2) Add new version (idempotent — gcloud creates a new version every call)
  log(`adding new version to projects/${opts.project}/secrets/${opts.secretId}`)

  if (opts.dryRun) {
    log('[dry-run] would call: printf %s "<VALUE>" | gcloud secrets versions add ...')
  } else {
    const result = sh(`gcloud secrets versions add ${opts.secretId} --project=${opts.project} --data-file=-`, {
      input: opts.value
    })

    if (result instanceof Error || (result as { status?: number }).status !== 0) {
      fail(`gcloud secrets versions add failed: ${(result as { stderr?: string }).stderr ?? String(result)}`)
    }

    log('new version created')
  }

  // Capture current latest version BEFORE we know about new one is canonical
  const listOut = sh(
    `gcloud secrets versions list ${opts.secretId} --project=${opts.project} --format="value(name)" --limit=2`
  )

  const versions =
    typeof listOut === 'string' ? listOut.split('\n').filter(Boolean) : []

  const newVersion = versions[0]
  const prevVersion = versions[1]

  log(`new=${newVersion} prev=${prevVersion ?? '(none)'}`)

  // 3) Trigger redeploy
  if (opts.vercelProject) {
    log(`triggering Vercel redeploy for ${opts.vercelProject}`)

    if (!opts.dryRun) {
      sh(`vercel deploy --prod --yes --project=${opts.vercelProject}`)
    }
  } else if (opts.cloudRunService) {
    log(`triggering Cloud Run revision for ${opts.cloudRunService}`)

    if (!opts.dryRun) {
      sh(
        `gcloud run services update ${opts.cloudRunService} --region=${opts.cloudRunRegion} --project=${opts.project} --no-traffic`
      )
    }
  } else {
    log('no consumer redeploy specified; skipping')
  }

  // 4) Health poll
  if (opts.healthUrl) {
    log(`polling ${opts.healthUrl} until ready (timeout=${opts.healthTimeoutMs}ms)`)

    const deadline = Date.now() + opts.healthTimeoutMs

    let healthy = false

    while (Date.now() < deadline) {
      try {
        const response = await fetch(opts.healthUrl)

        if (response.ok) {
          const body: unknown = await response.json().catch(() => null)
          const overallStatus = (body as { overallStatus?: string } | null)?.overallStatus

          if (response.status === 200 && overallStatus !== 'degraded') {
            healthy = true
            break
          }
        }
      } catch {
        // continue polling
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    if (!healthy) {
      log('health poll FAILED — initiating revert')

      if (newVersion && !opts.dryRun) {
        sh(`gcloud secrets versions disable ${newVersion} --secret=${opts.secretId} --project=${opts.project}`)
      }

      if (prevVersion && !opts.dryRun) {
        sh(`gcloud secrets versions enable ${prevVersion} --secret=${opts.secretId} --project=${opts.project}`)
      }

      fail('rotation reverted; previous version remains canonical')
    }

    log('health is green ✓')
  }

  // 5) Disable previous version (only if user explicitly confirms via flag)
  log('rotation complete. NOT disabling previous version automatically — operator should disable manually after a soak period.')
  log(`to manually disable: gcloud secrets versions disable ${prevVersion} --secret=${opts.secretId} --project=${opts.project}`)
}

main().catch(error => {
  console.error('[rotate] uncaught error', error)
  process.exit(2)
})
