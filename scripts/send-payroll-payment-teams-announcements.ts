import { randomUUID } from 'node:crypto'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const BOT_APP_ID = 'a1397477-4aae-4f16-a0a2-a213cb1b00b2'
const AZURE_TENANT_ID = 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
const SECRET_REF = 'greenhouse-teams-bot-client-credentials'

type MessageType = 'nomina' | 'honorarios'

type Recipient = {
  memberId: string
  displayName: string
  firstName: string
  aadObjectId: string
  messageType: MessageType
}

type CliOptions = {
  period: string
  dryRun: boolean
  yes: boolean
  allowDuplicate: boolean
  triggeredBy: string
}

const recipients: Recipient[] = [
  {
    memberId: 'daniela-ferreira',
    displayName: 'Daniela Ferreira',
    firstName: 'Daniela',
    aadObjectId: 'e4c8ddee-74e0-43ec-846c-c0379e1bdaff',
    messageType: 'nomina'
  },
  {
    memberId: 'melkin-hernandez',
    displayName: 'Melkin Hernandez',
    firstName: 'Melkin',
    aadObjectId: '76a1194f-f999-4bdf-9aaa-3f8d08936082',
    messageType: 'nomina'
  },
  {
    memberId: 'andres-carlosama',
    displayName: 'Andres Carlosama',
    firstName: 'Andres',
    aadObjectId: '1e1053db-eb2c-4ac4-877e-87ddbb828a5a',
    messageType: 'nomina'
  },
  {
    memberId: 'valentina-hoyos',
    displayName: 'Valentina Hoyos',
    firstName: 'Valentina',
    aadObjectId: 'f60d5730-1aab-45ec-a435-45ffe8be6f54',
    messageType: 'honorarios'
  },
  {
    memberId: 'e603fade-b262-43d3-896f-09f04dd6ddd7',
    displayName: 'Felipe Zurita',
    firstName: 'Felipe',
    aadObjectId: 'ec1b7fd0-87c9-43cd-a46f-1e8c37297258',
    messageType: 'honorarios'
  }
]

const usage = `Usage:
  pnpm teams:payment-announcement --period YYYY-MM-DD --dry-run
  pnpm teams:payment-announcement --period YYYY-MM-DD --yes

Options:
  --period YYYY-MM-DD     Required. Operational payment announcement period/key.
  --dry-run              Preview recipients and cards without sending.
  --yes                  Send real Teams 1:1 messages.
  --allow-duplicate      Override duplicate protection for this period.
  --triggered-by VALUE   Audit actor. Defaults to codex.
`

const parseArgs = (argv: string[]): CliOptions => {
  const values = new Map<string, string | boolean>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument '${token}'.\n\n${usage}`)
    }

    const key = token.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      values.set(key, true)
      continue
    }

    values.set(key, next)
    index += 1
  }

  const period = typeof values.get('period') === 'string' ? String(values.get('period')).trim() : ''
  const dryRun = values.get('dry-run') === true
  const yes = values.get('yes') === true

  if (!period || !/^\d{4}-\d{2}(-\d{2})?$/.test(period)) {
    throw new Error(`Missing or invalid --period. Use YYYY-MM or YYYY-MM-DD.\n\n${usage}`)
  }

  if (dryRun && yes) {
    throw new Error('Use either --dry-run or --yes, not both.')
  }

  if (!dryRun && !yes) {
    throw new Error(`Refusing to run without --dry-run or --yes.\n\n${usage}`)
  }

  return {
    period,
    dryRun,
    yes,
    allowDuplicate: values.get('allow-duplicate') === true,
    triggeredBy: typeof values.get('triggered-by') === 'string' ? String(values.get('triggered-by')) : 'codex'
  }
}

const getPortalUrl = (messageType: MessageType) =>
  messageType === 'honorarios'
    ? 'https://greenhouse.efeoncepro.com/my/contractor'
    : 'https://greenhouse.efeoncepro.com/my/payroll'

const getButtonTitle = (messageType: MessageType) =>
  messageType === 'honorarios' ? 'Ver mi pago de honorarios' : 'Ver mi nómina'

const buildCard = (recipient: Recipient) => {
  const isHonorarios = recipient.messageType === 'honorarios'

  return {
    type: 'AdaptiveCard' as const,
    version: '1.5' as const,
    body: [
      {
        type: 'TextBlock' as const,
        text: isHonorarios ? 'Pago de honorarios realizado ✅' : 'Pago de nómina realizado ✅',
        weight: 'Bolder' as const,
        size: 'Large' as const,
        wrap: true
      },
      {
        type: 'TextBlock' as const,
        text: `Hola, ${recipient.firstName} 👋`,
        wrap: true,
        spacing: 'Medium' as const
      },
      {
        type: 'TextBlock' as const,
        text: isHonorarios
          ? 'Te aviso que tu pago de honorarios ya fue realizado. Puedes revisar el detalle en Greenhouse cuando quieras.'
          : 'Te aviso que tu pago de nómina ya está listo. Puedes revisar el detalle en Greenhouse cuando quieras.',
        wrap: true,
        spacing: 'Small' as const
      },
      {
        type: 'TextBlock' as const,
        text: 'Gracias por todo el trabajo de este período 🌱',
        wrap: true,
        spacing: 'Small' as const
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl' as const,
        title: getButtonTitle(recipient.messageType),
        url: getPortalUrl(recipient.messageType)
      }
    ]
  }
}

const buildChannel = (recipient: Recipient) => ({
  channel_code: `manual-payment-${recipient.messageType}-${recipient.memberId}`.slice(0, 120),
  channel_kind: 'teams_bot' as const,
  display_name: `${recipient.displayName} payment announcement`,
  description: 'Manual 1:1 payroll/honorarios payment announcement',
  secret_ref: SECRET_REF,
  logic_app_resource_id: null,
  bot_app_id: BOT_APP_ID,
  team_id: null,
  channel_id: null,
  azure_tenant_id: AZURE_TENANT_ID,
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null,
  recipient_kind: 'chat_1on1' as const,
  recipient_user_id: recipient.aadObjectId,
  recipient_chat_id: null,
  recipient_routing_rule_json: null
})

const buildSourceObjectId = (recipient: Recipient, period: string) =>
  `manual-payment-announcement:${period}:${recipient.memberId}`

const hasSuccessfulAnnouncement = async ({
  memberId,
  period,
  runGreenhousePostgresQuery
}: {
  memberId: string
  period: string
  runGreenhousePostgresQuery: <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<T[]>
}) => {
  const legacyDateFilter = /^\d{4}-\d{2}-\d{2}$/.test(period)

  const rows = await runGreenhousePostgresQuery<{ sync_run_id: string }>(
    `SELECT sync_run_id
       FROM greenhouse_sync.source_sync_runs
      WHERE source_system = 'teams_notification'
        AND status = 'succeeded'
        AND notes LIKE '%manual payment announcement sent%'
        AND notes LIKE $1
        AND (
          notes LIKE $2
          OR ($3::boolean = true AND started_at::date = $4::date)
        )
      LIMIT 1`,
    [`%memberId=${memberId}%`, `%period=${period}%`, legacyDateFilter, legacyDateFilter ? period : '1970-01-01']
  )

  return rows[0]?.sync_run_id ?? null
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const correlationId = `manual-payment-announcement-${options.period}`

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          correlationId,
          duplicateProtection: !options.allowDuplicate,
          recipients: recipients.map(recipient => ({
            displayName: recipient.displayName,
            memberId: recipient.memberId,
            messageType: recipient.messageType,
            aadObjectId: recipient.aadObjectId,
            buttonTitle: getButtonTitle(recipient.messageType),
            url: getPortalUrl(recipient.messageType),
            card: buildCard(recipient)
          }))
        },
        null,
        2
      )
    )

    process.exit(0)
  }

  const { sendViaBotFramework } = await import('@/lib/integrations/teams/bot-framework/sender')

  const { writeTeamsSendRunOutcome, writeTeamsSendRunStart } = await import(
    '@/lib/integrations/teams/send-run-log'
  )

  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const results = []

  for (const recipient of recipients) {
    const existingRunId = options.allowDuplicate
      ? null
      : await hasSuccessfulAnnouncement({
          memberId: recipient.memberId,
          period: options.period,
          runGreenhousePostgresQuery
        })

    if (existingRunId) {
      results.push({
        ok: true,
        skipped: true,
        reason: 'duplicate_success',
        existingRunId,
        displayName: recipient.displayName,
        memberId: recipient.memberId,
        messageType: recipient.messageType
      })
      continue
    }

    const runId = `teams-payment-${randomUUID()}`
    const channel = buildChannel(recipient)
    const sourceObjectId = buildSourceObjectId(recipient, options.period)

    await writeTeamsSendRunStart({
      runId,
      channel,
      syncMode: 'manual',
      triggeredBy: options.triggeredBy,
      correlationId,
      sourceObjectId
    })

    const result = await sendViaBotFramework({
      channel,
      card: buildCard(recipient),
      options: {
        syncMode: 'manual',
        triggeredBy: options.triggeredBy,
        correlationId,
        sourceObjectId
      }
    })

    if (result.ok) {
      await writeTeamsSendRunOutcome({
        runId,
        status: 'succeeded',
        recordsWritten: 1,
        notes: [
          'manual payment announcement sent',
          'transport=bot_framework',
          `surface=${result.surface}`,
          `messageType=${recipient.messageType}`,
          `period=${options.period}`,
          `memberId=${recipient.memberId}`,
          `sourceObjectId=${sourceObjectId}`,
          `messageId=${result.messageId}`,
          `conversationId=${result.conversationId}`
        ].join('; ')
      })

      results.push({
        ok: true,
        runId,
        displayName: recipient.displayName,
        memberId: recipient.memberId,
        messageType: recipient.messageType,
        period: options.period,
        messageId: result.messageId,
        conversationId: result.conversationId,
        serviceUrl: result.serviceUrl,
        attempts: result.attempts
      })
    } else {
      await writeTeamsSendRunOutcome({
        runId,
        status: 'failed',
        recordsWritten: 0,
        notes: [
          `${result.reason}: ${result.detail}`,
          'transport=bot_framework',
          'surface=chat_1on1',
          `messageType=${recipient.messageType}`,
          `period=${options.period}`,
          `memberId=${recipient.memberId}`,
          `sourceObjectId=${sourceObjectId}`
        ].join('; ')
      })

      results.push({
        ok: false,
        runId,
        displayName: recipient.displayName,
        memberId: recipient.memberId,
        messageType: recipient.messageType,
        period: options.period,
        reason: result.reason,
        detail: result.detail,
        attempts: result.attempts
      })
    }
  }

  console.log(JSON.stringify({ correlationId, results }, null, 2))

  if (results.some(result => !result.ok)) {
    process.exit(1)
  }

  process.exit(0)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

