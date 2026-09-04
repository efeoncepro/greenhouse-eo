import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

/**
 * TASK-1631 — Smoke live del binding de identidad externa contra PostgreSQL real.
 *
 *   pnpm identity:external-access:smoke            # sólo lecturas: readers + las 4 señales
 *   pnpm identity:external-access:smoke -- --apply # ciclo completo sobre el fixture de smoke
 *
 * Con `--apply` ejercita, en este orden y con filas etiquetadas como smoke:
 *   environment `smoke-task-1631` (active) → bind org fixture → grant → invitación → accept
 *   (persona `smoke_test`) → resolve = bound → revoke member → resolve = revoked → revoke binding
 *   → environment `retired`. El audit es append-only y queda como evidencia.
 *
 * Requiere el proxy Cloud SQL en 127.0.0.1:15432 (`pnpm pg:connect`) y `.env.local` con el
 * perfil `runtime` (verifica los GRANTs reales del runtime, no los del owner).
 */

const ORGANIZATION_FIXTURE_ID = process.env.EXTERNAL_ACCESS_SMOKE_ORGANIZATION_ID ?? 'org-ddd962ae-6417-4325-92d0-f1994dc06cc5'
const ENVIRONMENT_ID = 'smoke-task-1631'
const SUBJECT = `smoke-sub-${Date.now()}`
const EMAIL = `smoke-task-1631+${Date.now()}@efeonce.invalid`

const log = (label: string, value: unknown) => {
  console.log(`[external-access-smoke] ${label}: ${JSON.stringify(value)}`)
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile(process.env.EXTERNAL_ACCESS_SMOKE_PROFILE === 'ops' ? 'ops' : 'runtime')

  const apply = process.argv.includes('--apply')

  const [{ query }, domain, signals] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/identity/external-access'),
    import('@/lib/reliability/queries/external-identity-binding-signals')
  ])

  log('mode', apply ? 'apply' : 'read-only')

  const eligible = await domain.listEligibleClientOrganizations({ limit: 5 })

  log('eligibility.sample', eligible.map(row => ({ id: row.organizationId, eligible: row.eligible, stage: row.lifecycleStage })))
  log('environments', (await domain.listExternalIdentityEnvironments()).map(row => `${row.environmentId}:${row.status}`))
  log('bindings.active', (await domain.listExternalOrganizationBindings({ status: 'active' })).length)

  if (!apply) {
    for (const signal of await signals.getExternalIdentityBindingSignals()) {
      log(`signal ${signal.signalId}`, { severity: signal.severity, summary: signal.summary })
    }

    return
  }

  const actor = { actorId: 'smoke:task-1631' }

  const environment = await domain.upsertExternalIdentityEnvironment(
    {
      environmentId: ENVIRONMENT_ID,
      displayName: 'Smoke TASK-1631',
      provider: 'efeonce_auth',
      issuerUrl: 'https://smoke-task-1631.efeonce.invalid',
      jwksUri: 'https://smoke-task-1631.efeonce.invalid/.well-known/jwks.json',
      audience: 'https://mcp.efeonce.org/mcp',
      issuerClass: 'external',
      subjectType: 'public',
      status: 'active',
      notes: 'Smoke live TASK-1631; nunca configurado en el gateway.'
    },
    actor
  )

  log('environment', { id: environment.environment.environmentId, created: environment.created, status: environment.environment.status })

  const bound = await domain.bindExternalOrganization(
    {
      organizationId: ORGANIZATION_FIXTURE_ID,
      environmentId: ENVIRONMENT_ID,
      externalOrganizationRef: `smoke-org-${ORGANIZATION_FIXTURE_ID}`,
      reason: 'TASK-1631 live smoke'
    },
    actor
  )

  log('binding', { id: bound.binding.bindingId, created: bound.created, gv: bound.binding.grantsVersion })

  const rebound = await domain.bindExternalOrganization(
    {
      organizationId: ORGANIZATION_FIXTURE_ID,
      environmentId: ENVIRONMENT_ID,
      externalOrganizationRef: `smoke-org-${ORGANIZATION_FIXTURE_ID}`
    },
    actor
  )

  log('binding.idempotent', { same: rebound.binding.bindingId === bound.binding.bindingId, created: rebound.created })

  const grant = await domain.grantExternalCapability(
    { bindingId: bound.binding.bindingId, capability: 'globe.producer.fleet.read', reason: 'smoke' },
    actor
  )

  log('grant', { id: grant.grant.grantId, created: grant.created, gv: grant.grantsVersion })

  const profileId = `identity-smoke-task-1631-${Date.now()}`

  await query(
    `INSERT INTO greenhouse_core.identity_profiles (profile_id, profile_type, canonical_email, full_name, status, active, data_origin)
     VALUES ($1, 'external_contact', $2, 'Smoke TASK-1631', 'active', TRUE, 'smoke_test')`,
    [profileId, EMAIL]
  )

  const invitation = await domain.issueExternalInvitation(
    { bindingId: bound.binding.bindingId, email: EMAIL, designatedAdmin: true, profileId, reason: 'smoke', expiresInHours: 1 },
    actor
  )

  if (!invitation.token) throw new Error('smoke: expected a token for a new invitation')

  log('invitation', { id: invitation.invitation.invitationId, status: invitation.invitation.status })

  const unboundBefore = await domain.resolveExternalAccess({ environmentId: ENVIRONMENT_ID, subject: SUBJECT, clientId: 'smoke-client' })

  log('resolve.before-accept', unboundBefore.outcome)

  const accepted = await domain.acceptExternalInvitation(
    { token: invitation.token, environmentId: ENVIRONMENT_ID, subject: SUBJECT, verifiedEmail: EMAIL, displayName: 'Smoke TASK-1631' },
    { actorId: 'smoke:auth-server' }
  )

  log('accept', { profileId: accepted.profileId, linkId: accepted.linkId, status: accepted.invitation.status, created: accepted.profileCreated })

  const boundResolution = await domain.resolveExternalAccess({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })

  log('resolve.bound', {
    outcome: boundResolution.outcome,
    memberships: boundResolution.memberships.map(m => ({ org: m.organizationId, gv: m.grantsVersion, grants: m.grants, admin: m.designatedAdmin }))
  })

  if (boundResolution.outcome !== 'bound' || boundResolution.memberships[0]?.grants[0] !== 'globe.producer.fleet.read') {
    throw new Error('smoke: expected bound resolution with the granted capability')
  }

  const memberRevoked = await domain.revokeExternalAccess(
    { scope: 'member', bindingId: bound.binding.bindingId, profileId: accepted.profileId, reason: 'smoke revoke member' },
    actor
  )

  log('revoke.member', { changed: memberRevoked.changed, gv: memberRevoked.grantsVersion })

  const afterMember = await domain.resolveExternalAccess({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })

  log('resolve.after-member-revoke', afterMember.outcome)

  const bindingRevoked = await domain.revokeExternalAccess(
    { scope: 'binding', bindingId: bound.binding.bindingId, reason: 'smoke revoke binding' },
    actor
  )

  log('revoke.binding', { changed: bindingRevoked.changed, gv: bindingRevoked.grantsVersion, grants: bindingRevoked.revokedGrantIds.length })

  await domain.upsertExternalIdentityEnvironment(
    {
      environmentId: ENVIRONMENT_ID,
      displayName: 'Smoke TASK-1631',
      provider: 'efeonce_auth',
      issuerUrl: 'https://smoke-task-1631.efeonce.invalid',
      jwksUri: 'https://smoke-task-1631.efeonce.invalid/.well-known/jwks.json',
      audience: 'https://mcp.efeonce.org/mcp',
      issuerClass: 'external',
      subjectType: 'public',
      status: 'retired',
      notes: 'Smoke live TASK-1631; retirado al cerrar el smoke.'
    },
    actor
  )

  const detail = await domain.getExternalOrganizationBinding(bound.binding.bindingId)

  log('binding.final', { status: detail?.status, gv: detail?.grantsVersion })

  const audit = await query<{ event_type: string; n: string }>(
    `SELECT event_type, COUNT(*)::text AS n FROM greenhouse_core.external_identity_audit_log
      WHERE binding_id = $1 OR environment_id = $2 GROUP BY event_type ORDER BY event_type`,
    [bound.binding.bindingId, ENVIRONMENT_ID]
  )

  log('audit', audit)

  const denials = await query<{ outcome: string; n: string }>(
    `SELECT outcome, COUNT(*)::text AS n FROM greenhouse_core.external_access_resolution_log
      WHERE environment_id = $1 GROUP BY outcome ORDER BY outcome`,
    [ENVIRONMENT_ID]
  )

  log('resolution_log', denials)

  for (const signal of await signals.getExternalIdentityBindingSignals()) {
    log(`signal ${signal.signalId}`, { severity: signal.severity, summary: signal.summary })
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[external-access-smoke] FAILED', error)
    process.exit(1)
  })
