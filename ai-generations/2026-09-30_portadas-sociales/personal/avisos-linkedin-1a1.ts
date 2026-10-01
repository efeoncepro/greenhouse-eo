// Aviso 1:1 «tu portada de LinkedIn» (operador, 2026-10-01: «agrega también las portadas de LinkedIn para que ellos
// elijan la que quieran y se las envías 1:1 por Teambot»). Mismo método que el aviso del avatar del 2026-09-29. Script de un solo uso, según greenhouse-teams-message-operator §«Generic 1:1 Messages»: identidad resuelta en
// Entra justo antes de enviar (accountEnabled=true), chat_1on1 con el Object ID crudo, tarjeta sin mención ni
// activity.text, un TextBlock por párrafo, --dry-run/--yes excluyentes, sourceObjectId determinístico, duplicados y
// resultado auditado en source_sync_runs. Correr desde la raíz del repo:
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs <este archivo> --dry-run | --yes
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

import { loadGreenhouseToolEnv } from '/Users/jreye/Documents/greenhouse-eo/scripts/lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const BOT_APP_ID = 'a1397477-4aae-4f16-a0a2-a213cb1b00b2'
const AZURE_TENANT_ID = 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
const SECRET_REF = 'greenhouse-teams-bot-client-credentials'
const KEY = '2026-10-01-linkedin-portadas'
const KIT = 'https://storage.googleapis.com/efeonce-group-axis-public-media/team/kit'

type Recipient = { slug: string; firstName: string; displayName: string; upn: string; aadObjectId: string }

// Verificados en Entra el 2026-09-29 (accountEnabled=true); se re-verifican antes de cada envío.
const recipients: Recipient[] = [
  { slug: 'andres-carlosama', firstName: 'Andrés', displayName: 'Andrés Carlosama', upn: 'acarlosama@efeoncepro.com', aadObjectId: '1e1053db-eb2c-4ac4-877e-87ddbb828a5a' },
  { slug: 'daniela-ferreira', firstName: 'Daniela', displayName: 'Daniela Ferreira', upn: 'dferreira@efeoncepro.com', aadObjectId: 'e4c8ddee-74e0-43ec-846c-c0379e1bdaff' },
  { slug: 'melkin-hernandez', firstName: 'Melkin', displayName: 'Melkin Hernandez', upn: 'mhernandez@efeoncepro.com', aadObjectId: '76a1194f-f999-4bdf-9aaa-3f8d08936082' },
  { slug: 'humberly-henriquez', firstName: 'Humberly', displayName: 'Humberly Henriquez', upn: 'hhumberly@efeoncepro.com', aadObjectId: '2041f234-c5d4-4a79-9849-0278c7176438' },
  { slug: 'valentina-hoyos', firstName: 'Valentina', displayName: 'Valentina Hoyos', upn: 'valentina.hoyos@efeonce.org', aadObjectId: 'a2334f27-11af-4952-8303-718091982662' }
]

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const yes = args.has('--yes')

if (dryRun === yes) {
  console.error('Usa exactamente uno: --dry-run o --yes.')
  process.exit(2)
}

const url = (r: Recipient) => `${KIT}/${r.slug}.html#linkedin`

const paragraphs = (r: Recipient) => [
  `Hola, ${r.firstName} 👋`,
  'Sumamos a tu kit Efeonce ocho portadas de LinkedIn con la nueva línea gráfica 🎨 Elige la que más te guste.',
  'Todas dejan libre el espacio de tu foto de perfil y ya vienen en el tamaño de LinkedIn. En tu página tienes los pasos para cambiarla.',
  'Con tu avatar y tu portada, nos vemos como un solo equipo ✨'
]

const buildCard = (r: Recipient) => ({
  type: 'AdaptiveCard' as const,
  version: '1.5' as const,
  body: [
    { type: 'TextBlock' as const, text: 'Elige tu portada de LinkedIn', weight: 'Bolder' as const, size: 'Large' as const, wrap: true },
    ...paragraphs(r).map((text, i) => ({ type: 'TextBlock' as const, text, wrap: true, spacing: (i === 0 ? 'Medium' : 'Small') as 'Medium' | 'Small' }))
  ],
  actions: [{ type: 'Action.OpenUrl' as const, title: 'Elegir mi portada', url: url(r) }]
})

const buildChannel = (r: Recipient) => ({
  channel_code: `manual-linkedin-cover-${r.slug}`.slice(0, 120),
  channel_kind: 'teams_bot' as const,
  display_name: `${r.displayName} LinkedIn cover announcement`,
  description: 'Manual 1:1 team LinkedIn cover announcement (2026-10-01)',
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
  recipient_user_id: r.aadObjectId,
  recipient_chat_id: null,
  recipient_routing_rule_json: null
})

const sourceObjectId = (r: Recipient) => `manual-linkedin-cover-announcement:${KEY}:${r.slug}`

const verifyEntra = (r: Recipient) => {
  const out = execFileSync('az', ['rest', '--method', 'GET', '--url', `https://graph.microsoft.com/v1.0/users/${r.aadObjectId}?$select=id,userPrincipalName,accountEnabled`], { encoding: 'utf8' })
  const u = JSON.parse(out) as { id: string; userPrincipalName: string; accountEnabled: boolean }

  if (u.id !== r.aadObjectId || u.accountEnabled !== true || u.userPrincipalName.toLowerCase() !== r.upn.toLowerCase()) {
    throw new Error(`Entra no confirma a ${r.displayName}: ${JSON.stringify(u)}`)
  }
}

const main = async () => {
  const correlationId = `manual-linkedin-cover-announcement-${KEY}`

  if (dryRun) {
    await import('@/lib/integrations/teams/bot-framework/sender')
    await import('@/lib/integrations/teams/send-run-log')
    console.log(JSON.stringify({ mode: 'dry-run', correlationId, recipients: recipients.map(r => ({ displayName: r.displayName, aadObjectId: r.aadObjectId, sourceObjectId: sourceObjectId(r), url: url(r), card: buildCard(r) })) }, null, 2))
    process.exit(0)
  }

  const { sendViaBotFramework } = await import('@/lib/integrations/teams/bot-framework/sender')
  const { writeTeamsSendRunOutcome, writeTeamsSendRunStart } = await import('@/lib/integrations/teams/send-run-log')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const results: unknown[] = []

  for (const r of recipients) {
    const dup = await runGreenhousePostgresQuery<{ sync_run_id: string }>(
      `SELECT sync_run_id FROM greenhouse_sync.source_sync_runs
        WHERE source_system = 'teams_notification' AND status = 'succeeded'
          AND notes LIKE '%manual linkedin cover announcement sent%' AND notes LIKE $1 LIMIT 1`,
      [`%sourceObjectId=${sourceObjectId(r)}%`]
    )

    if (dup[0]) {
      results.push({ ok: true, skipped: true, reason: 'duplicate_success', existingRunId: dup[0].sync_run_id, displayName: r.displayName })
      continue
    }

    verifyEntra(r)

    const runId = `teams-linkedin-cover-${randomUUID()}`
    const channel = buildChannel(r)
    const sid = sourceObjectId(r)

    await writeTeamsSendRunStart({ runId, channel, syncMode: 'manual', triggeredBy: 'claude', correlationId, sourceObjectId: sid })

    const result = await sendViaBotFramework({ channel, card: buildCard(r), options: { syncMode: 'manual', triggeredBy: 'claude', correlationId, sourceObjectId: sid } })

    if (result.ok) {
      await writeTeamsSendRunOutcome({
        runId,
        status: 'succeeded',
        recordsWritten: 1,
        notes: ['manual linkedin cover announcement sent', 'transport=bot_framework', `surface=${result.surface}`, `sourceObjectId=${sid}`, `messageId=${result.messageId}`, `conversationId=${result.conversationId}`].join('; ')
      })
      results.push({ ok: true, runId, displayName: r.displayName, messageId: result.messageId })
    } else {
      await writeTeamsSendRunOutcome({
        runId,
        status: 'failed',
        recordsWritten: 0,
        notes: [`${result.reason}: ${result.detail}`, 'transport=bot_framework', 'surface=chat_1on1', `sourceObjectId=${sid}`].join('; ')
      })
      results.push({ ok: false, runId, displayName: r.displayName, reason: result.reason, detail: result.detail })
    }
  }

  console.log(JSON.stringify({ correlationId, results }, null, 2))
  process.exit(results.some(x => (x as { ok: boolean }).ok === false) ? 1 : 0)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
