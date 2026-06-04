# Runbook — TeamBot 1:1 payroll and honorarios payment announcements

> Scope: manual 1:1 Microsoft Teams announcements from the Greenhouse TeamBot after payroll or contractor/honorarios payments have been executed.
> Transport: Bot Framework Connector, not Microsoft Graph chat message APIs.

## Purpose

Use this runbook when Finance or Payroll needs to notify specific collaborators that their payment is ready, without posting to a group chat or channel.

This procedure is for short, friendly, low-risk payment status messages with a single Greenhouse link button.

## Hard rules

- Do not use Microsoft Graph `POST /chats/{id}/messages` for TeamBot outbound messages.
- Use the Bot Framework Connector path implemented in `src/lib/integrations/teams/bot-framework/sender.ts`.
- Prefer the governed CLI `pnpm teams:payment-announcement` over ad-hoc scripts.
- For 1:1 messages, target the user by Microsoft Graph/Azure AD object id (`aadObjectId`) through `recipient_kind='chat_1on1'`.
- A first send may create or recover the 1:1 Bot Framework conversation and cache it in `greenhouse_core.teams_bot_conversation_references` under `reference_key='user:<aadObjectId>'`.
- For one-on-one conversation creation, pass the raw `aadObjectId` as `members[0].id`. Do not prefix it with `29:`. The `29:` prefix is for Teams pairwise user ids/mention entities, not for creating a conversation from an Entra object id.
- Use `Action.OpenUrl` buttons for portal links. Do not use `Action.Submit` unless a server-side handler is intentionally implemented and tested.
- Keep one clear button per message.
- Do not include amounts, bank details, transfer references, tokens, or any sensitive data in the Teams body.
- Always run `--dry-run` before `--yes`.
- Do not bypass duplicate protection with `--allow-duplicate` unless the operator explicitly asks for a resend.

## Current TeamBot config

| Field | Value |
| --- | --- |
| Bot app id | `a1397477-4aae-4f16-a0a2-a213cb1b00b2` |
| Azure tenant id | `a80bf6c1-7c45-4d70-b043-51389622a0e4` |
| Secret ref | `greenhouse-teams-bot-client-credentials` |
| Primary service URL | `https://smba.trafficmanager.net/teams` |

## Governed CLI

Preview:

```bash
pnpm teams:payment-announcement --period 2026-06-04 --dry-run
```

Send:

```bash
pnpm teams:payment-announcement --period 2026-06-04 --yes --triggered-by codex
```

Duplicate protection:

- The command checks `greenhouse_sync.source_sync_runs` before sending each recipient.
- A prior successful `manual payment announcement sent` row for the same `memberId` and `period` skips that recipient.
- Legacy compatibility: for the 2026-06-04 first run, where `period=` was not yet persisted in final notes, the command also treats a successful same-day row for the same `memberId` as a duplicate.
- `--allow-duplicate` overrides the guard and should be treated as an explicit resend.

The command is still intentionally narrow: it targets the current five-recipient payment announcement cohort. For recurring operations, replace the hardcoded cohort with a reader from Payment Orders / payroll period state.

## Notification Hub alignment

This runbook is a manual bridge for a flow that should become part of the Greenhouse Notification Hub (`TASK-690` to `TASK-693`).

Target canonical shape once the Hub exists:

- A domain event marks the payment aggregate as paid.
- The Hub records one `notification_intent` per recipient member.
- The router selects `teams_dm` according to defaults/preferences.
- The Teams DM adapter creates one `notification_delivery` and calls the existing TeamBot dispatcher.
- The dispatcher resolves `member_id -> aadObjectId` at runtime and posts through Bot Framework.

Recommended event sources:

- Honorarios / contractor: `workforce.contractor_payable.paid`.
- Payment orders: `finance.payment_order.paid` or `finance.payment_order.settled`.
- Payroll employee payments: use or add a canonical per-member paid event if the existing payment order/obligation event does not carry recipient grain.

Do not create one static Teams channel row per human for recurring Greenhouse sends. The Hub path should use `teams_dm` + `recipient_kind='dynamic_user'` with payload field `recipientMemberId`.

Temporary bridge rule: while the Hub is not canonical, this CLI is acceptable only for operator-authorized manual sends with `--dry-run`, explicit `--yes`, low-PII copy and duplicate protection.

## Recipient discovery snapshot

Discovery date: 2026-06-04.

All 5 recipients were active Greenhouse members and had the Greenhouse Teams app installed in personal scope.

| Person | Greenhouse member id | Teams/AAD object id | Message type | Greenhouse URL |
| --- | --- | --- | --- | --- |
| Felipe Zurita | `e603fade-b262-43d3-896f-09f04dd6ddd7` | `ec1b7fd0-87c9-43cd-a46f-1e8c37297258` | Honorarios | `https://greenhouse.efeoncepro.com/my/contractor` |
| Daniela Ferreira | `daniela-ferreira` | `e4c8ddee-74e0-43ec-846c-c0379e1bdaff` | Nómina | `https://greenhouse.efeoncepro.com/my/payroll` |
| Valentina Hoyos | `valentina-hoyos` | `f60d5730-1aab-45ec-a435-45ffe8be6f54` | Honorarios | `https://greenhouse.efeoncepro.com/my/contractor` |
| Melkin Hernandez | `melkin-hernandez` | `76a1194f-f999-4bdf-9aaa-3f8d08936082` | Nómina | `https://greenhouse.efeoncepro.com/my/payroll` |
| Andres Carlosama | `andres-carlosama` | `1e1053db-eb2c-4ac4-877e-87ddbb828a5a` | Nómina | `https://greenhouse.efeoncepro.com/my/payroll` |

## Additional 1:1 discovery candidates

Discovery date: 2026-06-04.

Maggie was requested for discovery only. No Teams message was sent and no Bot Framework conversation was created during discovery.

| Person | Greenhouse member id | Email | Teams/AAD object id | Teams personal app install | Conversation reference cache | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Maggie Borralles | `0e6a896e-f1d2-481c-9c97-ee43ab1714d8` | `mborralles@efeoncepro.com` | `e0f8f69a-c1f5-40a1-a159-dced9087b318` | Installed, app display name `Greenhouse`, app definition version `1.0.4` | Not present yet for `reference_key='user:e0f8f69a-c1f5-40a1-a159-dced9087b318'` | User request spelled the last name as `Borrales`; Greenhouse and Graph currently store `Borralles`. |

For Maggie, use this transient `TeamsChannelRecord` shape when a future send is explicitly authorized:

```ts
{
  channel_code: 'manual-1on1-maggie-borralles',
  channel_kind: 'teams_bot',
  display_name: 'Maggie Borralles 1:1 Teams notification',
  description: 'Manual 1:1 Teams notification',
  secret_ref: 'greenhouse-teams-bot-client-credentials',
  logic_app_resource_id: null,
  bot_app_id: 'a1397477-4aae-4f16-a0a2-a213cb1b00b2',
  team_id: null,
  channel_id: null,
  azure_tenant_id: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null,
  recipient_kind: 'chat_1on1',
  recipient_user_id: 'e0f8f69a-c1f5-40a1-a159-dced9087b318',
  recipient_chat_id: null,
  recipient_routing_rule_json: null
}
```

Because there is no cached conversation reference yet, the first authorized real send will call `getOrCreateOneOnOneChat()` and should then cache:

- `bot_app_id='a1397477-4aae-4f16-a0a2-a213cb1b00b2'`
- `reference_key='user:e0f8f69a-c1f5-40a1-a159-dced9087b318'`
- `conversation_id=<Bot Framework chat id>`
- `service_url=https://smba.trafficmanager.net/teams` or a regional fallback

## Card shape

Use Adaptive Card 1.5:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Pago de nómina realizado ✅",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Hola, Daniela 👋",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Te aviso que tu pago de nómina ya está listo. Puedes revisar el detalle en Greenhouse cuando quieras.",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "Gracias por todo el trabajo de este período 🌱",
      "wrap": true,
      "spacing": "Small"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Ver mi nómina",
      "url": "https://greenhouse.efeoncepro.com/my/payroll"
    }
  ]
}
```

For honorarios, use:

- Title: `Pago de honorarios realizado ✅`
- Body: `Te aviso que tu pago de honorarios ya fue realizado. Puedes revisar el detalle en Greenhouse cuando quieras.`
- Button: `Ver mi pago de honorarios`
- URL: `https://greenhouse.efeoncepro.com/my/contractor`

## Channel record shape

For each recipient, build a transient `TeamsChannelRecord`:

```ts
{
  channel_code: `manual-payment-${memberId}`,
  channel_kind: 'teams_bot',
  display_name: `${displayName} payment announcement`,
  description: 'Manual 1:1 payroll/honorarios payment announcement',
  secret_ref: 'greenhouse-teams-bot-client-credentials',
  logic_app_resource_id: null,
  bot_app_id: 'a1397477-4aae-4f16-a0a2-a213cb1b00b2',
  team_id: null,
  channel_id: null,
  azure_tenant_id: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null,
  recipient_kind: 'chat_1on1',
  recipient_user_id: aadObjectId,
  recipient_chat_id: null,
  recipient_routing_rule_json: null
}
```

## Audit pattern

For real sends, write `source_sync_runs` through:

- `writeTeamsSendRunStart()`
- `sendViaBotFramework()`
- `writeTeamsSendRunOutcome()`

Recommended tags:

- `syncMode='manual'`
- `triggeredBy='codex'` or the human operator id
- `correlationId='manual-payment-announcement-<period>'`
- `sourceObjectId='manual-payment-announcement:<period>:<memberId>'`

Successful sends should record:

- `transport=bot_framework`
- `surface=chat_1on1`
- `messageType=payroll` or `messageType=honorarios`
- `period=<period>`
- `memberId=<memberId>`
- `sourceObjectId=<sourceObjectId>`
- Bot Framework `messageId`
- `conversationId`

## Read-only discovery notes

`GET /users/{id}/chats` currently fails with Graph `403` because the app does not have `Chat.ReadBasic.All`, `Chat.Read.All`, or `Chat.ReadWrite.All`.

That is expected and does not block sending: the Bot Framework sender uses `getOrCreateOneOnOneChat()` with the recipient `aadObjectId`, then caches the resulting `chatId` after a successful send.

Discovery gotcha: using `members: [{ id: "29:<aadObjectId>" }]` for `POST /v3/conversations` returns `403` with `Failed to decrypt pairwise id`. The working body uses `members: [{ id: "<aadObjectId>" }]`.

## Copy templates

Nómina:

```text
Hola, {firstName} 👋

Te aviso que tu pago de nómina ya está listo. Puedes revisar el detalle en Greenhouse cuando quieras.

Gracias por todo el trabajo de este período 🌱
```

Honorarios:

```text
Hola, {firstName} 👋

Te aviso que tu pago de honorarios ya fue realizado. Puedes revisar el detalle en Greenhouse cuando quieras.

Gracias por todo el trabajo de este período 🌱
```

## Future automation

The robust long-term path is not to run a hardcoded manual cohort:

1. Payment Orders / Finance marks the relevant payroll or contractor payable as paid.
2. A Notification Hub intent is created per recipient with a stable idempotency key, for example `payment-announcement:<period>:<memberId>:<obligationId>`.
3. A Teams DM adapter builds the same Adaptive Card shape and calls `sendViaBotFramework()`.
4. Delivery state is persisted in a dedicated notification delivery table, with `source_sync_runs` kept as transport audit.

Until that exists, the governed CLI is the supported manual bridge.
