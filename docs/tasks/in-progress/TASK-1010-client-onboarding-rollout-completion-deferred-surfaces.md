# TASK-1010 — Client Onboarding: rollout completion + superficies diferidas (split de TASK-992/997/1001)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto` (cierra el rollout real del onboarding de clientes — invitación, readiness externo, superficies diferidas)
- Effort: `Medio-Alto`
- Type: `implementation + rollout`
- Epic: `EPIC-CLIENT-360`
- Domain: `commercial|identity|integrations.notion|integrations.teams|ui|api`
- Blocked by: `none` (foundation TASK-992/997/1001/1006 en `develop`)
- Derived from: `TASK-992`, `TASK-997`, `TASK-1001` (cerradas con su núcleo; estos pendientes se splitearon acá — decisión operador 2026-06-04, opción A)

## Summary

TASK-992 (puerta única / orquestador), TASK-997 (anclaje de referencias externas) y TASK-1001 (invitación de personas al portal) cerraron su **núcleo** (código shipped + verificado + docs). Esta task agrupa los pendientes de **rollout real + integración externa + superficies diferidas** que requieren coordinación operador-side, credenciales externas o trabajo de UI adicional, para no dejarlos como "code complete, rollout pendiente" perpetuo dentro de las tasks núcleo.

## Why This Task Exists

El núcleo del onboarding de clientes funciona end-to-end en código (Berel onboardeado live, alta atómica, perfil financiero persistido, panel de invitación GVC-verificado). Pero hay ítems que NO se pueden cerrar solo con código:
- requieren **enviar un email real** a una persona (verificación end-to-end de invitación),
- requieren **permisos Azure Graph** nuevos (búsqueda de canales Teams),
- requieren **suscripción de webhook HubSpot** (deal → onboarding case),
- o son **scope de UI adicional** explícitamente diferido (drawer → facet).

Mantenerlos dentro de 992/997/1001 dejaba esas tasks bloqueadas indefinidamente por el Runtime Rollout Completion Gate. Splitearlos acá las deja cerrar limpio y este task trackea el cierre operativo real.

## Scope (pendientes splitteados)

### De TASK-1001 — invitación de personas al portal (rollout)
- [ ] **Invitación real end-to-end verificada**: con el flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` ON, invitar una persona real del portal (o de prueba controlada) → confirmar **email de invitación + activación de cuenta** funcionando. La GVC de TASK-1001 NO clickeó "Invitar" (para no emailear personas reales) → el path de email/activación nunca se ejecutó en vivo.

### De TASK-997 — referencias externas (readiness + consumers)
- [ ] **Consumers async del checklist**: materializar `space_notion_sources` (desde `notionAnchors` del case metadata, ítem `provision_notion_workspace`) y `teams_notification_channels` (desde `teamsAnchor`, ítem `provision_communication_channels`). Verificar que el ancla del wizard fluye al registry canónico.
- [ ] **Readiness real Notion/Teams**: conectar la integración **Greenhouse PRD** al teamspace del cliente + conceder permiso Graph **`Group.Read.All`** (sin eso, ambos search degradan a "crear nuevo" — comportamiento correcto pero no es el flujo completo).
- [ ] **Channel-level selection en Teams**: V1 ancla el equipo; el canal General lo resuelve el async. Permitir elegir canal específico.

### De TASK-992 — superficies diferidas
- [ ] **Slice 2c — `CreateClientDrawer` → "completar facet"**: redefinir el drawer de Finanzas (que NO pare clientes) a una superficie de "completar el facet financiero" de un cliente existente. El wizard es la única puerta de nacimiento.
- [ ] **Webhook HubSpot deal (§11)**: deal de HubSpot dispara/abre un caso de onboarding `draft` (trigger comercial del alta).
- [ ] **Rondas GVC de estados `state-design` faltantes**: pickers loading/degraded (requiere inyección de falla) + código + visual del **SuccessScreen** (requiere un create real). (Ya GVC-verificados: los 5 pasos del wizard + Confirmar + nav entry discoverable en el sidebar + el panel de portal users — TASK-992/1001/1006/sesión 2026-06-04.)

### Rollout transversal
- [ ] **Verificar flag en todos los targets** (`CLIENT_LIFECYCLE_ONBOARDING_ENABLED` / `NEXT_PUBLIC_*`): staging (ON, verificado), Production (env var existe — confirmar value=true + nav discoverable en prod).

## Out of Scope

- Reescribir el wizard o el orquestador (núcleo cerrado en 992).
- Reescribir el anclaje de referencias externas (núcleo cerrado en 997).
- Reescribir el helper de invitación `inviteClientPortalUser` (núcleo cerrado en 1001).

## Hard Rules (heredadas)

- **NUNCA** crear cliente fuera de `provisionClientFromWizard` (puerta única) ni escribir `lifecycle_stage` fuera de `promoteParty`.
- **NUNCA** texto libre para un campo con fuente de verdad externa (combobox sobre SSOT / suggest + External Reference con provenance).
- **NUNCA** invitar al portal con un rol fuera de los 3 `client_*` ni pegar tokens Notion en texto plano (Secret Manager).
- **SIEMPRE** acabado enterprise moderno 2026 verificado en loop GVC para cualquier superficie nueva.

## Referencias

- Núcleo: `complete/TASK-992-*.md`, `complete/TASK-997-*.md`, `complete/TASK-1001-*.md`.
- Specs: `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`, `GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`.
- Doc funcional: `docs/documentation/agency/alta-de-cliente.md`. Manual: `docs/manual-de-uso/agency/alta-de-cliente.md`.

## Progress Log

### Discovery + Audit (2026-06-04)

**Audit findings (2 supuestos rotos del spec heredado, verificados contra código/PG real):**
1. **"Consumer async que materializa `space_notion_sources`" → YA RESUELTO.** El composer escribe `space_notion_sources` **inline** en la tx atómica (`writeSpaceNotionSourcesFromIntent`, `provision-client-from-wizard.ts:302-307`). No es async, es síncrono y funciona (Berel quedó escrito). ✅ Cerrado como ya-hecho.
2. **La spec de 997 asumía `space_id` en `teams_notification_channels`; el PG real NO lo tenía** (registry global keyed por `channel_code`, 22 columnas verificadas). → fix robusto en Slice 1: migración aditiva `space_id`.

**Verificado además:** `channel_kind='teams_bot'` exige (CHECK) `bot_app_id + team_id + channel_id + azure_tenant_id`; `secret_ref='greenhouse-teams-bot-client-credentials'` (compartido, vía `readBotFrameworkSecret`). El wizard captura `teamsAnchor` (teamId/teamName/channelId?/channelName?) vía `TeamsConnectPanel`.

### ✅ Slice 1 — Teams channel materialización (commit `101cab770`, develop)
- Migración `20260604171604517` (aditiva `space_id` + FK + index, anti pre-up-marker).
- Helper `writeTeamsChannelFromAnchor` (`src/lib/client-onboarding/teams-connect-store.ts`): UPSERT idempotente por `channel_code` determinístico (`client-teams-<spaceId>` sanitizado), `teams_bot`, bot creds del secret, SAVEPOINT anti-poison, degrada honesto sin `channelId` (`channel_pending`) o sin bot secret (`bot_secret_unavailable`). 3 tests.
- Wireado inline en el composer junto al write de Notion.

### 🔄 PENDIENTE (lo que falta para cerrar TASK-1010)

**Slice 2 — `CreateClientDrawer` → "completar facet financiero"** (UI + loop GVC). EN CURSO.
- Redefinir `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` (hoy "crea cliente" desde Finanzas) → superficie de **completar el facet financiero** de un cliente existente. El wizard es la ÚNICA puerta de nacimiento (`provisionClientFromWizard`) — el drawer NO debe parir clientes.
- Mockup aprobado del target: `src/views/greenhouse/agency/clients/mockup/FinanceFacetDrawerMockup.tsx`.
- Consumer del drawer: `src/views/greenhouse/finance/ClientsListView.tsx`.
- Loop GVC (bar enterprise 2026) antes de declarar listo.

**Slice 3 — Webhook `hubspot-deals.ts`** (backend, spec §11.1). PENDIENTE.
- Handler nuevo `src/lib/webhooks/handlers/hubspot-deals.ts`: deal stage `closedwon` → abre onboarding case en `status='draft'` (semi-automático: operador activa). Patrón: `hubspot-companies.ts`/`hubspot-services.ts` (HMAC v3, dedup, captureWithDomain).
- §11.1 de `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`.
- La **suscripción** del webhook en el portal HubSpot es operator-gated (config aparte).

**Slice 4 — GVC SuccessScreen + degraded pickers** (GVC). PENDIENTE.
- SuccessScreen: requiere un create real contra staging (cliente de prueba rollback-safe).
- Degraded pickers (loading/falla de HubSpot/Graph): requiere inyección de falla.

**Operator-gated (requieren acción del operador o confirmación CLI):**
- **Azure Graph `Group.Read.All`** al App Registration del bot: **grant tenant-wide read** — requiere OK explícito del scope (o un permiso más acotado si existe) antes de aplicar por `az`.
- **Suscripción webhook HubSpot deal**: config en el portal/API HubSpot.
- **Invitación real e2e** (1001): enviar invitación a un **email de PRUEBA** (no cliente real — el producto no está listo para invitar clientes); verificar email (Resend) + activación de cuenta con flag ON.
- **Flag prod verificado**: `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` value=true en Production + nav discoverable.
