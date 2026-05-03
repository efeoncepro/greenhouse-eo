#!/usr/bin/env tsx
/**
 * TASK-742 hardening — Audit Azure AD App Registration against expected config.
 *
 * Drives a CLI smoke that catches the 2026-04-30 root cause class (App config
 * drift) BEFORE it shows as `?error=Callback` in production. Run on demand or
 * via cron alongside `pnpm secrets:audit`.
 *
 * Verifies:
 *   - signInAudience matches expected value (default: AzureADMultipleOrgs)
 *   - all canonical redirect URIs are registered (production + staging)
 *   - at least one client secret exists and is not expiring within 30 days
 *   - publisher domain is the expected one
 *
 * Usage:
 *   pnpm auth:audit-azure-app
 *   pnpm auth:audit-azure-app --json
 *   pnpm auth:audit-azure-app --client-id <id>
 *
 * Requirements:
 *   - Azure CLI authenticated against the Efeonce tenant
 *     (a80bf6c1-7c45-4d70-b043-51389622a0e4)
 */

import { execSync } from 'child_process'

const DEFAULT_CLIENT_ID = '3626642f-0451-4eb2-8c29-d2211ab3176c'
const DEFAULT_TENANT_ID = 'a80bf6c1-7c45-4d70-b043-51389622a0e4'

const EXPECTED = {
  signInAudience: 'AzureADMultipleOrgs',
  redirectUris: [
    'https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad',
    'https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad'
  ],
  publisherDomain: 'efeonce.cl',
  secretExpiryWarningDays: 30
}

interface AuditFinding {
  level: 'pass' | 'warn' | 'fail'
  check: string
  message: string
  expected?: unknown
  actual?: unknown
}

const sh = (cmd: string): string => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (error) {
    const e = error as { stderr?: Buffer }

    throw new Error(`Command failed: ${cmd}\n${e.stderr?.toString() ?? String(error)}`)
  }
}

const parseFlags = () => {
  const args = process.argv.slice(2)

  const get = (name: string) => {
    const idx = args.indexOf(name)

    return idx >= 0 ? args[idx + 1] : null
  }

  return {
    clientId: get('--client-id') || DEFAULT_CLIENT_ID,
    expectedTenantId: get('--tenant-id') || DEFAULT_TENANT_ID,
    json: args.includes('--json'),
    failOnWarn: args.includes('--strict')
  }
}

const verifyTenant = (expectedTenantId: string): AuditFinding[] => {
  const findings: AuditFinding[] = []

  try {
    const account = JSON.parse(sh('az account show -o json'))

    if (account.tenantId !== expectedTenantId) {
      findings.push({
        level: 'fail',
        check: 'azure_cli_tenant',
        message: 'Azure CLI is authenticated against a different tenant than expected.',
        expected: expectedTenantId,
        actual: account.tenantId
      })
    } else {
      findings.push({
        level: 'pass',
        check: 'azure_cli_tenant',
        message: `Azure CLI authenticated against expected tenant ${expectedTenantId}`
      })
    }
  } catch {
    findings.push({
      level: 'fail',
      check: 'azure_cli_tenant',
      message: 'Azure CLI is not authenticated. Run `az login`.'
    })
  }

  return findings
}

const auditApp = (clientId: string): AuditFinding[] => {
  const findings: AuditFinding[] = []
  let app: {
    appId: string
    displayName: string
    signInAudience: string
    publisherDomain: string
    web?: { redirectUris?: string[] }
    passwordCredentials?: Array<{ keyId: string; displayName?: string; endDateTime: string }>
  }

  try {
    app = JSON.parse(sh(`az ad app show --id ${clientId} -o json`))
  } catch (error) {
    findings.push({
      level: 'fail',
      check: 'app_exists',
      message: `Azure App Registration ${clientId} not found or not accessible.`,
      actual: error instanceof Error ? error.message : 'unknown_error'
    })

    return findings
  }

  findings.push({
    level: 'pass',
    check: 'app_exists',
    message: `App ${app.displayName} (${app.appId}) is reachable.`
  })

  // signInAudience
  if (app.signInAudience !== EXPECTED.signInAudience) {
    findings.push({
      level: 'fail',
      check: 'sign_in_audience',
      message:
        'signInAudience drift detected. Greenhouse is multi-tenant by design — clients from any work/school tenant must be able to sign in.',
      expected: EXPECTED.signInAudience,
      actual: app.signInAudience
    })
  } else {
    findings.push({
      level: 'pass',
      check: 'sign_in_audience',
      message: `signInAudience=${app.signInAudience} (correct multi-tenant config)`
    })
  }

  // publisherDomain
  if (app.publisherDomain !== EXPECTED.publisherDomain) {
    findings.push({
      level: 'warn',
      check: 'publisher_domain',
      message: 'publisherDomain differs from expected.',
      expected: EXPECTED.publisherDomain,
      actual: app.publisherDomain
    })
  } else {
    findings.push({
      level: 'pass',
      check: 'publisher_domain',
      message: `publisherDomain=${app.publisherDomain}`
    })
  }

  // redirect URIs
  const registered = new Set(app.web?.redirectUris ?? [])

  for (const expected of EXPECTED.redirectUris) {
    if (!registered.has(expected)) {
      findings.push({
        level: 'fail',
        check: 'redirect_uri',
        message: `Required redirect URI is NOT registered. SSO will fail with redirect_uri_mismatch.`,
        expected,
        actual: Array.from(registered)
      })
    } else {
      findings.push({
        level: 'pass',
        check: 'redirect_uri',
        message: `Redirect URI registered: ${expected}`
      })
    }
  }

  // client secret expiry
  const credentials = app.passwordCredentials ?? []

  if (credentials.length === 0) {
    findings.push({
      level: 'fail',
      check: 'client_secret_present',
      message: 'No client secret registered. SSO will fail with invalid_client.'
    })
  } else {
    const now = Date.now()
    const warningMs = EXPECTED.secretExpiryWarningDays * 24 * 60 * 60 * 1000

    const future = credentials
      .map(c => ({
        ...c,
        endDate: new Date(c.endDateTime).getTime(),
        daysToExpiry: Math.floor((new Date(c.endDateTime).getTime() - now) / (24 * 60 * 60 * 1000))
      }))
      .filter(c => c.endDate > now)
      .sort((a, b) => b.endDate - a.endDate)

    if (future.length === 0) {
      findings.push({
        level: 'fail',
        check: 'client_secret_expiry',
        message: 'All client secrets are expired. SSO will fail with invalid_client.'
      })
    } else {
      const newest = future[0]
      const expiringSoon = newest.endDate - now < warningMs

      findings.push({
        level: expiringSoon ? 'warn' : 'pass',
        check: 'client_secret_expiry',
        message: `Newest client secret '${newest.displayName ?? newest.keyId}' expires in ${newest.daysToExpiry} days. ${
          expiringSoon ? `Rotate within ${EXPECTED.secretExpiryWarningDays} days.` : 'Healthy.'
        }`
      })
    }
  }

  return findings
}

const main = async () => {
  const flags = parseFlags()

  const findings: AuditFinding[] = [...verifyTenant(flags.expectedTenantId), ...auditApp(flags.clientId)]

  const fails = findings.filter(f => f.level === 'fail').length
  const warns = findings.filter(f => f.level === 'warn').length
  const passes = findings.filter(f => f.level === 'pass').length

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          auditedAt: new Date().toISOString(),
          clientId: flags.clientId,
          expected: EXPECTED,
          summary: { passes, warns, fails },
          findings
        },
        null,
        2
      )
    )
  } else {
    console.log(`\n=== Azure App Registration audit (${flags.clientId}) ===\n`)
    console.log(`Pass: ${passes}   Warn: ${warns}   Fail: ${fails}\n`)

    for (const f of findings) {
      const icon = f.level === 'pass' ? '✓' : f.level === 'warn' ? '⚠' : '✗'

      console.log(`${icon} [${f.check}] ${f.message}`)

      if (f.expected !== undefined && f.level !== 'pass') {
        console.log(`    expected: ${JSON.stringify(f.expected)}`)
      }

      if (f.actual !== undefined && f.level !== 'pass') {
        console.log(`    actual:   ${JSON.stringify(f.actual)}`)
      }
    }

    console.log('')
  }

  if (fails > 0) process.exit(1)
  if (flags.failOnWarn && warns > 0) process.exit(2)
}

main().catch(error => {
  console.error('[auth:audit-azure-app] failed:', error instanceof Error ? error.message : error)
  process.exit(2)
})
