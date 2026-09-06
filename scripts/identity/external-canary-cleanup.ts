import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

type Args = {
  canaryRegistrationId: string
  reason: string
  actorId: string
  apply: boolean
  confirmRegistration: string | null
}

const valueAfter = (argv: string[], flag: string) => {
  const inline = argv.find(argument => argument.startsWith(`${flag}=`))

  if (inline) return inline.slice(flag.length + 1)

  const index = argv.indexOf(flag)

  return index >= 0 ? argv[index + 1] : undefined
}

const parseArgs = (argv: string[]): Args => {
  const canaryRegistrationId = valueAfter(argv, '--registration') ?? ''
  const reason = valueAfter(argv, '--reason') ?? 'TASK-1832 governed canary cleanup inspection'
  const actorId = valueAfter(argv, '--actor') ?? 'operator:task-1832-canary-cleanup'
  const apply = argv.includes('--apply')
  const confirmRegistration = valueAfter(argv, '--confirm-registration') ?? null

  if (!canaryRegistrationId) {
    throw new Error(
      'Usage: pnpm identity:external-canary:cleanup -- --registration <xcr-id> [--reason <text>] [--apply --confirm-registration <same-xcr-id>]'
    )
  }

  if (apply && confirmRegistration !== canaryRegistrationId) {
    throw new Error('--apply requires --confirm-registration with the exact canary registration id')
  }

  return { canaryRegistrationId, reason, actorId, apply, confirmRegistration }
}

const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) return { message: 'Unexpected canary cleanup failure' }

  const candidate = error as Error & { code?: unknown; details?: unknown }

  return {
    message: candidate.message,
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    ...(candidate.details && typeof candidate.details === 'object' ? { details: candidate.details } : {})
  }
}

const main = async () => {
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: pnpm identity:external-canary:cleanup -- --registration <xcr-id> [--reason <text>] [--apply --confirm-registration <same-xcr-id>]'
    )

    return
  }

  const args = parseArgs(process.argv.slice(2))

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile(args.apply ? 'migrator' : 'ops')

  const [{ cleanupExternalCanaryFixture }, { closeGreenhousePostgres }] = await Promise.all([
    import('@/lib/identity/external-access'),
    import('@/lib/db')
  ])

  try {
    const result = await cleanupExternalCanaryFixture(
      {
        canaryRegistrationId: args.canaryRegistrationId,
        apply: args.apply,
        reason: args.reason
      },
      { actorId: args.actorId }
    )

    console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', ...result }, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: serializeError(error) }))
  process.exitCode = 1
})
