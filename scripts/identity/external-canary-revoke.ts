import { createHash } from 'node:crypto'
import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

type Mode = 'inspect' | 'authority' | 'auth'

type Args = {
  canaryRegistrationId: string
  reason: string
  actorId: string
  mode: Mode
  confirmRegistration: string | null
  confirmedRunOwnedOAuthClientIds: string[]
}

type AuthTargetPlan = {
  subjectCount: number
  subjectDigest: string
  consentTuples: number
  grantFamilies: number
  authorizationContexts: number
  activeMagicLinks: number
  activeAuthorizationCodes: number
  activePasskeyChallenges: number
}

const valueAfter = (argv: string[], flag: string) => {
  const inline = argv.find(argument => argument.startsWith(`${flag}=`))

  if (inline) return inline.slice(flag.length + 1)

  const index = argv.indexOf(flag)

  return index >= 0 ? argv[index + 1] : undefined
}

const valuesAfter = (argv: string[], flag: string) => {
  const values: string[] = []

  for (const [index, argument] of argv.entries()) {
    if (argument.startsWith(`${flag}=`)) values.push(argument.slice(flag.length + 1))
    else if (argument === flag && argv[index + 1]) values.push(argv[index + 1]!)
  }

  return [...new Set(values)]
}

const usage =
  'Usage: pnpm identity:external-canary:revoke -- --registration <xcr-id> [--confirm-owned-client <dcr-id> ...] [--reason <text>] [--apply-authority|--apply-auth --confirm-registration <same-xcr-id>]'

const parseArgs = (argv: string[]): Args => {
  const canaryRegistrationId = valueAfter(argv, '--registration') ?? ''
  const reason = valueAfter(argv, '--reason') ?? 'TASK-1832 governed external canary retirement'
  const actorId = valueAfter(argv, '--actor') ?? 'operator:task-1832-canary-retirement'
  const confirmRegistration = valueAfter(argv, '--confirm-registration') ?? null
  const applyAuthority = argv.includes('--apply-authority')
  const applyAuth = argv.includes('--apply-auth')

  if (!canaryRegistrationId) throw new Error(usage)
  if (applyAuthority && applyAuth) throw new Error('Choose exactly one apply mode at a time')

  const mode: Mode = applyAuthority ? 'authority' : applyAuth ? 'auth' : 'inspect'

  if (mode !== 'inspect' && confirmRegistration !== canaryRegistrationId) {
    throw new Error('Apply requires --confirm-registration with the exact canary registration id')
  }

  return {
    canaryRegistrationId,
    reason,
    actorId,
    mode,
    confirmRegistration,
    confirmedRunOwnedOAuthClientIds: valuesAfter(argv, '--confirm-owned-client')
  }
}

const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) return { message: 'Unexpected canary revocation failure' }

  const candidate = error as Error & { code?: unknown; details?: unknown }

  return {
    message: candidate.message,
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    ...(candidate.details && typeof candidate.details === 'object' ? { details: candidate.details } : {})
  }
}

const digest = (values: readonly string[]) =>
  createHash('sha256')
    .update([...values].sort().join('\n'))
    .digest('hex')

const main = async () => {
  if (process.argv.includes('--help')) {
    console.log(usage)

    return
  }

  const args = parseArgs(process.argv.slice(2))

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const [identity, db, oauthConsent, oauthAudit, oauthStoreModule, personModule, contextStoreModule] =
    await Promise.all([
      import('@/lib/identity/external-access'),
      import('@/lib/db'),
      import('@/lib/auth-server/oauth/consent'),
      import('@/lib/auth-server/oauth/audit'),
      import('@/lib/auth-server/oauth/store/postgres-store'),
      import('@/lib/auth-server/persons'),
      import('@/lib/auth-server/internal/postgres-store')
    ])

  try {
    const inspect = () =>
      identity.inspectExternalCanaryCleanup(args.canaryRegistrationId, {
        confirmedRunOwnedOAuthClientIds: args.confirmedRunOwnedOAuthClientIds
      })

    const plan = await inspect()

    const unexpectedLogicalBlockers = plan.logicalBlockers.filter(
      blocker => !['registration_active', 'active_authority', 'active_auth'].includes(blocker)
    )

    if (plan.unexpectedRefs !== 0 || unexpectedLogicalBlockers.length > 0) {
      throw new Error(
        `Canary retirement preflight failed: unexpectedRefs=${plan.unexpectedRefs}; blockers=${unexpectedLogicalBlockers.join(',') || 'none'}`
      )
    }

    const subjects = await db.query<{ subject: string }>(
      `SELECT DISTINCT source_object_id AS subject
         FROM greenhouse_core.identity_profile_source_links
        WHERE link_id=ANY($1::text[])
          AND source_system=$2
          AND source_object_type='subject'
        ORDER BY source_object_id`,
      [plan.sourceLinkIds, `external_idp:${plan.environmentId}`]
    )

    const subjectIds = subjects.map(row => row.subject)

    const authPredicate = `(client_id=ANY($1::text[])
      OR (client_id=ANY($2::text[]) AND environment_id=$3 AND subject=ANY($4::text[])))`

    const predicateParams = [plan.runOwnedOAuthClientIds, plan.sharedOAuthClientIds, plan.environmentId, subjectIds]

    const [consentRows, grantRows, contextRows, activeNonRevocable] = await Promise.all([
      db.query<{ subject: string; environment_id: string; client_id: string }>(
        `SELECT DISTINCT subject,environment_id,client_id
           FROM greenhouse_auth.client_consents
          WHERE ${authPredicate} AND status='active'
          ORDER BY client_id,environment_id,subject`,
        predicateParams
      ),
      db.query<{ grant_id: string; client_id: string; subject: string }>(
        `SELECT DISTINCT grant_id,client_id,subject FROM (
           SELECT grant_id,client_id,subject FROM greenhouse_auth.refresh_tokens
            WHERE ${authPredicate} AND status<>'revoked'
           UNION
           SELECT grant_id,client_id,subject FROM greenhouse_auth.access_tokens
            WHERE ${authPredicate} AND revoked_at IS NULL AND expires_at>NOW()
         ) grants
         ORDER BY client_id,grant_id`,
        predicateParams
      ),
      db.query<{ context_id: string }>(
        `SELECT context_id FROM greenhouse_auth.authorization_contexts
          WHERE (${authPredicate} OR binding_id=ANY($5::text[]))
            AND revoked_at IS NULL
          ORDER BY context_id`,
        [...predicateParams, plan.bindingIds]
      ),
      db.query<{ magic_links: string; authorization_codes: string; passkey_challenges: string }>(
        `SELECT
          (SELECT count(*)::text FROM greenhouse_auth.magic_link_tokens
            WHERE environment_id=$3 AND subject=ANY($4::text[]) AND consumed_at IS NULL AND expires_at>NOW()) AS magic_links,
          (SELECT count(*)::text FROM greenhouse_auth.authorization_codes
            WHERE ${authPredicate} AND consumed_at IS NULL AND expires_at>NOW()) AS authorization_codes,
          (SELECT count(*)::text FROM greenhouse_auth.passkey_challenges
            WHERE environment_id=$3 AND (subject=ANY($4::text[]) OR correlation_id=$5)
              AND consumed_at IS NULL AND expires_at>NOW()) AS passkey_challenges`,
        [...predicateParams, plan.runId]
      )
    ])

    const nonRevocable = activeNonRevocable[0] ?? {
      magic_links: '0',
      authorization_codes: '0',
      passkey_challenges: '0'
    }

    const authTargets: AuthTargetPlan = {
      subjectCount: subjectIds.length,
      subjectDigest: digest(subjectIds),
      consentTuples: consentRows.length,
      grantFamilies: grantRows.length,
      authorizationContexts: contextRows.length,
      activeMagicLinks: Number(nonRevocable.magic_links),
      activeAuthorizationCodes: Number(nonRevocable.authorization_codes),
      activePasskeyChallenges: Number(nonRevocable.passkey_challenges)
    }

    if (args.mode === 'inspect') {
      console.log(JSON.stringify({ mode: 'inspect', plan, authTargets }, null, 2))

      return
    }

    if (args.mode === 'authority') {
      const authority = await identity.revokeExternalCanaryFixture(
        { canaryRegistrationId: args.canaryRegistrationId, reason: args.reason },
        { actorId: args.actorId }
      )

      const readback = await inspect()

      if (!readback.registrationRevoked || readback.activeAuthorityCount !== 0) {
        throw new Error('Authority revocation readback is not zero')
      }

      console.log(JSON.stringify({ mode: 'authority', authority, readback }, null, 2))

      return
    }

    if (
      authTargets.activeMagicLinks !== 0 ||
      authTargets.activeAuthorizationCodes !== 0 ||
      authTargets.activePasskeyChallenges !== 0
    ) {
      throw new Error('Active one-shot auth artifacts must expire or be consumed before governed revocation')
    }

    const now = () => new Date()
    const personStore = new personModule.PostgresPersonAuthStore()
    const oauthStore = new oauthStoreModule.PostgresOAuthStore()
    const contextStore = new contextStoreModule.PostgresInternalContextStore()
    const persons = []

    for (const subject of subjectIds) {
      persons.push(
        await personModule.revokePersonAuthState(
          { store: personStore, environmentId: plan.environmentId, now },
          { subject, reason: args.reason, actorRef: args.actorId, correlationId: plan.runId }
        )
      )
    }

    const consents = []

    for (const row of consentRows) {
      consents.push(
        await oauthConsent.revokeClientConsent(
          {
            subject: row.subject,
            environmentId: row.environment_id,
            clientId: row.client_id,
            scopes: null,
            reason: args.reason,
            actor: args.actorId,
            via: 'cli'
          },
          { store: oauthStore, now }
        )
      )
    }

    const grants = []

    for (const row of grantRows) {
      const revoked = await oauthStore.revokeGrant({ grantId: row.grant_id, now: now(), reason: args.reason })

      grants.push(revoked)
      await oauthAudit.recordOAuthAudit(
        oauthStore,
        { ipHash: null, userAgentHash: null, correlationId: plan.runId },
        {
          eventType: 'revoke',
          outcome: 'success',
          clientId: row.client_id,
          subject: row.subject,
          grantId: row.grant_id,
          errorCode: null,
          details: { source: 'external_canary_retirement', ...revoked }
        }
      )
    }

    let contextsRevoked = 0

    for (const row of contextRows) {
      if (await contextStore.revoke({ id: row.context_id, now: now(), reason: args.reason })) contextsRevoked += 1
    }

    const readback = await inspect()

    if (readback.activeAuthCount !== 0) throw new Error('Auth revocation readback is not zero')

    console.log(
      JSON.stringify(
        {
          mode: 'auth',
          authTargets,
          result: {
            persons: persons.map(result => ({
              sessionsRevoked: result.sessionsRevoked,
              passkeysRevoked: result.passkeysRevoked,
              totpRevoked: result.totpRevoked
            })),
            consentCommands: consents.length,
            grantCommands: grants.length,
            contextsRevoked
          },
          readback
        },
        null,
        2
      )
    )
  } finally {
    await db.closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: serializeError(error) }))
  process.exitCode = 1
})
