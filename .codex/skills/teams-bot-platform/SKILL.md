---
name: teams-bot-platform
description: Build, deploy, and operate Microsoft Teams bots end-to-end. Covers Azure AD app registration, Bot Service provisioning via Bicep, manifest with RSC + webApplicationInfo, install + consent flow, the Bot Framework Connector API for proactive sends (channel, chat 1:1, group chat), Action.Submit handlers, region failover, conversation reference cache, JWT validation for inbound activities, and the gotchas that took Greenhouse multiple iterations to discover. Invoke when building a new Teams bot, debugging a 403 / "Teamwork.Migrate.All required", refactoring an existing bot from Microsoft Graph to the Bot Framework Connector, or when an upload to Teams Admin Center fails with a generic "No podemos cargar la aplicación" error.
---

# Teams Bot Platform — Build, Deploy, Operate

This is a **production-tested** playbook for building Microsoft Teams bots. It distills lessons learned from shipping the Greenhouse Teams Bot (TASK-671) end-to-end against `efeoncepro.com`. Every claim here was verified by smoke against a live tenant. Rules marked **HARD RULE** were learned the hard way; do not "improve" them without a fresh smoke.

## Mental model

A Teams bot has 5 distinct concerns, each with its own gotchas:

1. **Azure AD app registration** — bot identity in the directory; mints app-only tokens.
2. **Azure Bot Service** — declares the bot to Teams (msaAppId, messaging endpoint, MsTeams channel).
3. **Teams app manifest** — published to the org's app catalog; declares scopes, RSC, surfaces.
4. **Outbound dispatcher** — your code that posts cards to channels / chats.
5. **Inbound endpoint** — your HTTP handler for Activities (messages, conversationUpdate, invoke / Action.Submit).

Each concern has its own auth audience, error surface, and consent model. Mixing them is the #1 cause of "I tried everything and the 403 won't go away".

## HARD RULE 1 — outbound sends use Bot Framework Connector, NOT Microsoft Graph

> Microsoft Graph `POST /v1.0/teams/{}/channels/{}/messages` rejects general bot proactive sends with `Forbidden — API requires Teamwork.Migrate.All`. The RSC scope `ChannelMessage.Send.Group` declared in the manifest is consented but Graph still says no, because that scope is reserved for Teams **migration scenarios**.

The path that actually works:

| Aspect | Verified value |
| --- | --- |
| Token audience | `https://api.botframework.com/.default` |
| Token endpoint | `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` (NOT `botframework.com` — that errors with `AADSTS700016` for SingleTenant bots) |
| Service URL | `https://smba.trafficmanager.net/teams` (primary), `/amer`, `/emea`, `/apac` (regional fallbacks) |
| Endpoint to channel | `POST {serviceUrl}/v3/conversations` |
| Endpoint to existing chat | `POST {serviceUrl}/v3/conversations/{chatId}/activities` |
| Endpoint create 1:1 | `POST {serviceUrl}/v3/conversations` with `members: [{ id: "29:<aadObjectId>" }]` |

Microsoft Graph **is** used for two ancillary lookups (audience `graph.microsoft.com`):
- `GET /v1.0/users?$filter=mail eq '<email>'` — recipient resolver fallback
- `POST /v1.0/users/{userId}/teamwork/installedApps` — auto-install bot for a user

## HARD RULE 2 — manifest with RSC must declare `webApplicationInfo`

Teams Admin Center rejects manifest uploads with the generic "No podemos cargar la aplicación / We can't load the app" if `authorization.permissions.resourceSpecific[]` is declared without a `webApplicationInfo` block. The CLI validator reveals the actual error:

```bash
npx --yes -p '@microsoft/teamsapp-cli@latest' teamsapp validate \
  --package-file ./greenhouse-teams.zip \
  --validate-method validation-rules \
  --debug 2>&1 | grep -iE "(✖|×|fail|warn)"
```

Always run this before uploading the zip. Invalid scope names also fail the upload silently — `ChatMessage.Send.Chat` does **not** exist; use `Chat.Manage.Chat` instead. Use `manifestVersion: "1.16"` (most stable with RSC); `1.17` triggers a non-blocking `supportsChannelFeatures tier1` warning.

## HARD RULE 3 — RSC scopes are consented per-team at install time

Microsoft Graph application permissions (`User.Read.All`, `Chat.Create`, …) are consented at the **tenant level** via `az ad app permission admin-consent`. RSC scopes are different: they're consented **per-team when the bot is installed in that team**, and the consent flow requires the installer to have authority to grant team-scope consent — which the Azure CLI delegated token does NOT have.

When you update the manifest with new RSC scopes, existing installs **do not** inherit them automatically. The path that works:

1. Install the bot via **Teams Desktop → Apps → Greenhouse → Add to a team → select team → Set up a bot**.
   - Teams shows a consent modal for the RSC scopes; the user (Global Admin or Team Owner) clicks Accept.
2. (Alternative for fresh installs only) `POST /v1.0/teams/{teamId}/installedApps` via Graph CLI works **only the first time** and only for scopes that don't need admin consent.

**Don't** call `POST /teams/{}/installedApps/{appInstallationId}/upgrade` from the Azure CLI delegated token — it returns 400 "The required permissions have not been consented to by the caller". Use Teams Desktop instead.

**Don't** uninstall + reinstall via Graph CLI without a clear escape plan: the uninstall succeeds, but the reinstall fails with the same 400 if scopes need admin consent. Verify per-team RSC grants with:

```bash
az rest --method get --url "https://graph.microsoft.com/v1.0/teams/{teamId}/permissionGrants"
```

A row showing `clientAppId=<your bot appId>, permission=ChannelMessage.Send.Group, type=Application` means consent is in place.

## HARD RULE 4 — robustness is non-negotiable

A Teams bot is a customer-visible communication channel. Treat it as such:

- **Region failover** for serviceUrl. Don't hardcode `/teams`; fall back to `/amer`, `/emea`, `/apac` on `404 Unknown cloud`.
- **Conversation reference cache** in your DB. After the first successful send to a target, cache `(serviceUrl, conversationId)`. Subsequent sends skip the failover loop. Without this, every send pays ~1.5s of latency.
- **Circuit breaker per cached reference.** After N consecutive failures (3 is a good default), invalidate the cache so the dispatcher re-discovers from scratch. Self-healing on the next success.
- **Backoff with jitter** on 429/5xx. Respect `Retry-After`. Cap total retry time so you don't compound a transient outage.
- **Per-request timeout** via `AbortSignal.timeout(8_000)`. Without it, a hung connection consumes a Vercel function slot.
- **Token cache** keyed by `(tenantId, clientId, audience)`. Two audiences coexist (BF Connector + Graph); don't share the cache key across them.
- **Redact errors before persisting.** Strip JWTs (`eyJ…`), `Bearer <token>`, GCP secret URIs, and emails. Logs of inbound endpoints, source_sync_runs notes, and circuit breaker reasons must all pass through the same redactor.

## Reference implementation (Greenhouse)

The Greenhouse Teams Bot (TASK-671) implements all of the above. Use it as a starting template:

| Concern | File |
| --- | --- |
| Connector client (channel, chat send, 1:1 create) | `src/lib/integrations/teams/bot-framework/connector-client.ts` |
| Token cache (BF + Graph audiences) | `src/lib/integrations/teams/bot-framework/token-cache.ts` |
| Conversation reference cache (PG + memory) | `src/lib/integrations/teams/bot-framework/conversation-references.ts` |
| Conversation reference table | `migrations/*_create-teams-bot-conversation-references.sql` |
| Dispatcher with 4 surfaces | `src/lib/integrations/teams/bot-framework/sender.ts` |
| Recipient resolver (member → aadObjectId cascade) | `src/lib/integrations/teams/recipient-resolver.ts` |
| Inbound endpoint (JWT validate + dispatch) | `src/app/api/teams-bot/messaging/route.ts` |
| Action registry + handlers | `src/lib/teams-bot/action-registry.ts`, `src/lib/teams-bot/handlers/` |
| JWT validator (login.botframework.com JWKS) | `src/lib/integrations/teams/bot-framework/jwt-validator.ts` |
| Inbound audit + idempotency | `migrations/*_create-teams-bot-inbound-actions.sql` |
| Channel registry table | `migrations/*_create-teams-notification-channels.sql` (TASK-669) |
| Bicep stack | `infra/azure/teams-bot/main.bicep` |
| Manifest v1.0.5 (canonical RSC + webApplicationInfo) | `infra/azure/teams-bot/manifest/manifest.json` |
| Deploy workflow | `.github/workflows/azure-teams-bot-deploy.yml` |
| Runbook | `docs/operations/azure-teams-bot.md` |

## Day 1 deploy runbook (interactive)

Follow this once per environment.

```bash
# 1. App registration
APP_ID=$(az ad app create --display-name "Greenhouse Teams Bot" --sign-in-audience "AzureADMyOrg" --query appId -o tsv)
az ad sp create --id "$APP_ID"

# 2. Microsoft Graph application permissions (tenant-wide consent)
GRAPH_APP_ID="00000003-0000-0000-c000-000000000000"
for ROLE_ID in \
  "df021288-bdef-4463-88db-98f22de89214" `# User.Read.All` \
  "59a6b24b-4225-4393-8165-ebaec5f55d7a" `# Channel.ReadBasic.All` \
  "2280dda6-0bfd-44ee-a2f4-cb867cfc4c1e" `# Team.ReadBasic.All` \
  "d9c48af6-9ad9-47ad-82c3-63757137b9af" `# Chat.Create` \
  "74ef0291-ca83-4d02-8c7e-d2391e6a444f" `# TeamsAppInstallation.ReadWriteForUser.All`
do
  az ad app permission add --id "$APP_ID" --api "$GRAPH_APP_ID" --api-permissions "${ROLE_ID}=Role"
done
az ad app permission admin-consent --id "$APP_ID"

# 3. Client secret → JSON blob in your secret manager (GCP example)
az ad app credential reset --id "$APP_ID" --years 1 -o json > /tmp/secret.json
CLIENT_SECRET=$(python3 -c "import json; print(json.load(open('/tmp/secret.json'))['password'])")
TENANT_ID=$(az account show --query tenantId -o tsv)
printf '%s' "$(jq -nc --arg cid "$APP_ID" --arg sec "$CLIENT_SECRET" --arg tid "$TENANT_ID" \
  '{clientId:$cid, clientSecret:$sec, tenantId:$tid}')" \
  | gcloud secrets versions add greenhouse-teams-bot-client-credentials --data-file=-
rm -f /tmp/secret.json

# 4. Bot Service via Bicep
az group create --name rg-teams-bot-prod --location eastus
az deployment group create \
  --resource-group rg-teams-bot-prod \
  --template-file infra/azure/teams-bot/main.bicep \
  --parameters botAppId=$APP_ID azureTenantId=$TENANT_ID

# 5. Validate manifest (CRITICAL — Admin Center error messages are useless)
cd infra/azure/teams-bot/manifest
zip greenhouse-teams.zip manifest.json icons/icon_color.png icons/icon_outline.png
npx --yes -p '@microsoft/teamsapp-cli@latest' teamsapp validate \
  --package-file ./greenhouse-teams.zip \
  --validate-method validation-rules \
  --debug 2>&1 | grep -iE "(✖|×|fail|warn|passed)"

# 6. Upload to Teams Admin Center (interactive — Global Admin GUI required)
# https://admin.teams.microsoft.com/policies/manage-apps → Upload new app → select zip

# 7. Install bot in each target team via Teams Desktop (NOT via CLI — RSC consent needed)
# Teams Desktop → Apps → Greenhouse → Add to a team → select team → Set up a bot → Accept

# 8. Smoke test from CLI
BF_TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -d "client_id=${APP_ID}&client_secret=${CLIENT_SECRET}&scope=https://api.botframework.com/.default&grant_type=client_credentials" \
  | jq -r .access_token)
curl -X POST "https://smba.trafficmanager.net/teams/v3/conversations" \
  -H "Authorization: Bearer ${BF_TOKEN}" -H "Content-Type: application/json" \
  -d '{"isGroup":true,"channelData":{"channel":{"id":"<channelId>"},"tenant":{"id":"'${TENANT_ID}'"}},"activity":{"type":"message","attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","content":<adaptive card>}]}}'
# Expect: HTTP 201 + {id, activityId}
```

## Diagnosis cheatsheet

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Admin Center: "No podemos cargar la aplicación" | Manifest validation error | Run `teamsapp validate --debug` — it surfaces the real error |
| Validator: "RSC permissions require webApplicationInfo.appId" | Missing `webApplicationInfo` block | Add `{ id: <appId>, resource: api://botid-<appId> }` |
| Validator: invalid scope | Typo in RSC scope name | Drop unknown scopes; check the resource-specific permissions catalog |
| `Forbidden — API requires Teamwork.Migrate.All` | You used Microsoft Graph instead of Bot Framework Connector | Switch token audience to `api.botframework.com`, switch endpoint to `smba.trafficmanager.net/teams/v3/conversations` |
| `AADSTS700016: Application not found in directory 'Bot Framework'` | Single-tenant bot trying to mint via `botframework.com` tenant | Mint via your own tenant: `login.microsoftonline.com/{yourTenantId}/oauth2/v2.0/token` |
| 404 "Unknown cloud" | Wrong region serviceUrl | Use the candidate list with failover (`/teams → /amer → /emea → /apac`) |
| 400 "The required permissions have not been consented to by the caller" on `installedApps` | Delegated CLI token lacks team-scope consent authority | Use Teams Desktop GUI to install + consent |
| Admin Center "Permisos" tab shows RSC as "Sin consentir" | Expected; RSC consents at install time, not tenant-wide | Install in each team via Teams Desktop |
| Inbound JWT validation fails | Wrong issuer / audience / clock skew / JWKS cache stale | Verify `iss ∈ {api.botframework.com, sts.windows.net/{tid}/}`, `aud === appId`, 60s clock tolerance, refresh JWKS |

## Tooling and references

- Microsoft Bot Framework Connector REST API: <https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference>
- Resource-Specific Consent permissions catalog: <https://learn.microsoft.com/microsoftteams/platform/graph-api/rsc/resource-specific-consent>
- Teams app manifest schema: <https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json>
- Teams App Validator (CLI): `npx -p '@microsoft/teamsapp-cli@latest' teamsapp validate --debug`
- Teams App Validator (web): <https://dev.teams.microsoft.com/appvalidation.html>

## When NOT to use this skill

- Building a bot for a tenant outside the public commercial cloud (GCC, GovCloud) — the serviceUrl candidates and consent flow change. Microsoft has separate docs.
- Building a Microsoft 365 Copilot agent — different framework, different manifest, different SDK. This skill does NOT cover Copilot extensibility.
- Building a Teams **personal app / tab** without a bot — manifest is similar but no Bot Service / Connector concerns. Drop sections 1, 4, 5.
- Migrating from Logic Apps / Power Automate / Workflows app — see Greenhouse `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` for the channel registry pattern that lets you swap transport via a single PG row update.
