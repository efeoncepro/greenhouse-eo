---
name: greenhouse-teams-message-operator
description: Send, preview, test, and troubleshoot Greenhouse TeamBot messages with the `pnpm teams:announce` CLI. Use when the user wants to draft or send a Teams/TeamBot announcement, locate a manual Teams destination, mention/arrobar someone for real, resolve Microsoft Entra identities, test safely in a 1:1 chat, or avoid duplicate TeamBot card rendering.
---

# Greenhouse Teams Message Operator

Use this skill for **message operations** with the Greenhouse TeamBot: drafting, previewing, identity lookup, real mentions, dry-runs, sends, and audit checks.

For Azure Bot Service, Teams manifest, RSC consent, inbound actions, or platform provisioning, use `teams-bot-platform` instead.

## Hard Safety Rules

- **Do not test in public or group chats.** If testing mention/card rendering, use the operator's 1:1 chat first.
- **Never send to `eo-team` / `EO Team` unless the user explicitly asks to send there in the current turn.** It is a public group chat.
- **Always run `--dry-run` before a real send** unless the user explicitly provides a pre-approved body and asks for immediate send.
- **A real CLI send requires `--yes`.** Do not bypass the confirmation gate.
- **Do not send raw Bot Framework payloads as the normal path.** Use `pnpm teams:announce`; use direct payloads only for diagnosis or while improving the CLI.
- **Do not add `activity.text` when sending an Adaptive Card announcement.** Teams renders it as a separate duplicate bubble above the card.
- **For Adaptive Card mentions, do not use `29:<aadObjectId>`.** Use Microsoft Entra Object ID or UPN as `mentioned.id`.
- **Do not expose secrets, bearer tokens, or client secrets.** Report IDs, run IDs, fingerprints, and status only.

## Canonical Files

- CLI: `scripts/send-manual-teams-announcement.ts`
- Message helper: `src/lib/communications/manual-teams-announcements.ts`
- Destination registry: `src/config/manual-teams-announcements.ts`
- Contract tests: `src/lib/communications/manual-teams-announcements.test.ts`
- Runbook: `docs/operations/manual-teams-announcements.md`
- Architecture: `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- Platform skill: `.claude/skills/teams-bot-platform/skill.md`

## Locate Destinations

Manual destinations are **registered in code**, not searched by free text at send time.

```bash
rg -n "'eo-team'|manual-eo-team-announcement|recipientChatId" src/config src/lib docs/operations
pnpm teams:announce --help
```

Known durable destination:

- `--destination eo-team`
- Label: `EO Team`
- Type: `recipientKind='chat_group'`
- Not a Teams channel with `teamId/channelId`
- Public/group destination: do not use for tests

## Resolve Identity For Mentions

To mention a person in an Adaptive Card, resolve their Microsoft identity first.

Use Microsoft Graph through authenticated Azure CLI:

```bash
az rest --method GET --headers ConsistencyLevel=eventual \
  --url "https://graph.microsoft.com/v1.0/users?\$search=\"displayName:Maria Fernanda\"&\$select=id,displayName,mail,userPrincipalName,accountEnabled,jobTitle,department&\$top=10"
```

Cross-check Greenhouse when useful:

```bash
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs -e '
void (async () => {
  const { loadGreenhouseToolEnv } = await import("./scripts/lib/load-greenhouse-tool-env");
  loadGreenhouseToolEnv();
  const pg = await import("./src/lib/postgres/client");
  try {
    const rows = await pg.runGreenhousePostgresQuery(
      "select user_id, member_id, full_name, email, microsoft_email, microsoft_oid, status, active from greenhouse_core.client_users where full_name ilike \\$1 or lower(email)=lower(\\$2) or lower(microsoft_email)=lower(\\$2) limit 10",
      ["%Maria%Fernanda%", "mfgonzalez@efeoncepro.com"]
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await pg.closeGreenhousePostgres();
  }
})().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
'
```

For Adaptive Card mentions, pass either:

- Entra Object ID: `6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c`
- UPN: `mfgonzalez@efeoncepro.com`

Do **not** pass `29:6a6...` for Adaptive Cards.

## Real Mentions In Adaptive Cards

Verified live in Teams on 2026-06-08:

- `mentioned.id=<Entra Object ID>` rendered a real mention in a 1:1 smoke.
- `mentioned.id=29:<aadObjectId>` rendered plain text in Adaptive Card smoke.
- `activity.text` + card caused a visible duplicate bubble above the card.

Canonical card shape:

```json
{
  "type": "AdaptiveCard",
  "version": "1.0",
  "body": [
    {
      "type": "TextBlock",
      "text": "Hola <at>Maria Fernanda</at>"
    }
  ],
  "msteams": {
    "entities": [
      {
        "type": "mention",
        "text": "<at>Maria Fernanda</at>",
        "mentioned": {
          "id": "6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c",
          "name": "Maria Fernanda Gonzalez"
        }
      }
    ]
  }
}
```

`pnpm teams:announce` builds this automatically from `--mention`.

## CLI Workflow

1. Draft the body in a temporary markdown/text file. Separate paragraphs with a blank line.
2. Use `--mention "Texto visible|entraObjectIdOrUpn|Nombre de perfil"` for each real mention.
3. Run `--dry-run`.
4. Inspect destination, normalized paragraphs, mentions, CTA, and fingerprint.
5. For public/group destinations, get explicit operator confirmation if the exact final content was not already approved.
6. Send with the same command plus `--yes`.
7. Report the `sync_run_id`/fingerprint/outcome when available.

Example dry-run:

```bash
pnpm teams:announce \
  --destination eo-team \
  --title "Bienvenida al equipo, Maria Fernanda 🌱" \
  --body-file ./tmp/maria-fernanda-welcome.md \
  --mention "Maria Fernanda|6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c|Maria Fernanda Gonzalez" \
  --triggered-by claude \
  --dry-run
```

Example send:

```bash
pnpm teams:announce \
  --destination eo-team \
  --title "Bienvenida al equipo, Maria Fernanda 🌱" \
  --body-file ./tmp/maria-fernanda-welcome.md \
  --mention "Maria Fernanda|6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c|Maria Fernanda Gonzalez" \
  --triggered-by claude \
  --yes
```

CTA is optional. If used, `--cta-url` must be `https`.

## Testing Pattern

Use the operator's 1:1 chat for rendering tests. Resolve Julio as:

- Display name: `Julio Reyes Rangel`
- UPN/email: `jreyes@efeoncepro.com`
- Entra Object ID: `71acd85d-15a6-4eb6-953d-125370032e93`

For tests, send a tiny card-only payload to 1:1 only. Do not send mention experiments to `EO Team`.

## Audit Checks

Manual sends write audit rows in `greenhouse_sync.source_sync_runs` with `sync_run_id` like `teams-manual-*`.

```bash
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs -e '
void (async () => {
  const { loadGreenhouseToolEnv } = await import("./scripts/lib/load-greenhouse-tool-env");
  loadGreenhouseToolEnv();
  const pg = await import("./src/lib/postgres/client");
  try {
    const rows = await pg.runGreenhousePostgresQuery(
      "select sync_run_id, status, sync_mode, triggered_by, notes, started_at, finished_at from greenhouse_sync.source_sync_runs where sync_run_id=\\$1",
      ["teams-manual-..."]
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await pg.closeGreenhousePostgres();
  }
})().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
'
```

## Troubleshooting

- **Card duplicated with a text bubble above it:** `activity.text` was sent along with the card. Remove `activity.text`.
- **Name appears as plain text instead of mention:** for Adaptive Cards, use Entra Object ID or UPN, not `29:<aadObjectId>`; ensure `<at>Visible Text</at>` exactly matches `msteams.entities[].text`.
- **Mention still plain text:** user may not be in the chat/team, or Teams client rendered fallback. Test in 1:1, then validate membership before public send.
- **CLI rejects mention:** the visible text must appear exactly in the title or body; `29:` IDs are intentionally blocked for Adaptive Cards.
- **Need platform auth/RSC/manifest fixes:** switch to `teams-bot-platform`.

## Closure

If this skill or the TeamBot message workflow changes, update:

- `docs/operations/manual-teams-announcements.md`
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- `.codex/skills/teams-bot-platform/SKILL.md` and `.claude/skills/teams-bot-platform/skill.md` if platform knowledge changed
- `project_context.md`, `Handoff.md`, and `changelog.md` for durable operating capability changes

Run focal tests:

```bash
pnpm test src/lib/communications/manual-teams-announcements.test.ts
pnpm exec eslint scripts/send-manual-teams-announcement.ts src/lib/communications/manual-teams-announcements.ts src/lib/communications/manual-teams-announcements.test.ts src/lib/integrations/teams/types.ts
pnpm exec tsc --noEmit --pretty false
```
