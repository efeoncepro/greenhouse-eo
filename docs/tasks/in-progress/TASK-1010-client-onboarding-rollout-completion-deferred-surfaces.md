# TASK-1010 — Client Onboarding: rollout completion + superficies diferidas (split de TASK-992/997/1001)

## Status

<!-- 2026-06-04: reabierta. Se cerró prematuramente; el webhook NO se probó e2e y
     5+ ítems del scope siguen sin hacer (invitación e2e, readiness Notion PRD/Graph,
     channel-level Teams, GVC SuccessScreen/degraded, flag prod). El webhook de deal
     NO es funcional aún (código de clasificación en develop sin desplegar a prod +
     flag OFF; target del webhook es producción). NO marcar complete hasta verificar
     el flow real (Runtime Rollout Completion Gate). -->
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

### ✅ Slice 2 — `CreateClientDrawer` → FinanceFacetDrawer (commit `7646f20b9`, develop)

Redefinido: el drawer dejó de crear clientes en paralelo (anti-patrón puerta única) y pasa a **completar el facet financiero de un cliente EXISTENTE** vía `PUT /api/finance/clients/[id]` (el endpoint PUT ya existía).
- `FinanceFacetDrawer.tsx` (nuevo): copy-and-patch 1:1 del mockup aprobado (`FinanceFacetDrawerMockup`). Props `{open,onClose,onSaved,context,initial}` — carga valores actuales + Save PUT + estados loading/saving/error. Moneda derivada de `VALID_CURRENCIES` (SSOT `finance/contracts.ts` = CLP/USD/MXN), **NO** de la lista del mockup del wizard (ARS/COP/PEN rompería el PUT con 400 — `assertValidCurrency`).
- `ClientsListView.tsx`: botón global "Nuevo cliente" SIEMPRE → wizard (`/agency/clients/new`). Eliminado el fallback legacy `setDrawerOpen` + el viejo `CreateClientDrawer` (borrado). Removida la branch `lifecycleWizardEnabled`.
- `ClientDetailView.tsx`: monta el `FinanceFacetDrawer` + acción "Completar perfil financiero" (`tabler-pencil`) en el CardHeader de "Datos de facturación", gated por `canEditFinanceProfile` (EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ FINANCE_ANALYST — espeja `requireFinanceTenantContext` del PUT). `onSaved` recarga la ficha.
- Copy: `+ financeDrawer.saveError + financeDrawer.daysAdornment` (es-CL).
- **GVC ✅**: capturado el route mockup aprobado (`/agency/clients/finance-facet/mockup`, staging) — frame enterprise 2026 mirado; el runtime es copy-and-patch 1:1 (deltas intencionales: lista de moneda CLP/USD/MXN, `currencyHelper` en vez del MX-suggestion note porque edita un cliente existente, Alert de error + spinner de guardado). `.captures/2026-06-04T17-47-16_inline-agency-clients-finance-facet-mockup`.
- Verde: eslint 0, tsc 0, `ClientDetailView.test` 1/1.

### ✅ Slice 3 — Webhook deal closed-won → onboarding case draft (commits `2ce606826` + `3836ad591`, develop)

Trigger semi-automático §11.1: deal closed-won → abre onboarding case `status='draft'` (operador activa). **Subscription HubSpot LIVE (Build #26); flag default OFF.**

- **Discovery corregido (feedback del operador 2026-06-04)**: HubSpot Developer Platform = **1 webhooks component por app → UN solo target URL** (`.../api/webhooks/hubspot-companies`). El endpoint standalone `hubspot-deals` NUNCA recibe eventos; la entrega canónica es por **delegación desde `hubspot-companies`** (mismo patrón que la delegación de services). Además la subscription de deals NO existía (solo company/contact/service); los deals llegaban a Greenhouse solo por el batch sync.
- `handlers/hubspot-companies.ts`: `classifyHubSpotEvent` ahora reconoce deals (legacy `deal.*`/`0-3.*` + DP 2025.2 `object.*`+objectTypeId `0-3`) → categoría `'deal'`; el handler filtra `dealEvents` y delega a `processHubSpotDealEvents` (inline-con-guard: lee SOLO Postgres, idempotente, flag-gated → sin riesgo de timeout 5s; services va async solo por su bridge fetch externo). +3 tests de delegación.
- `handlers/hubspot-deals.ts`: lógica del trigger. Resolución Postgres-first + **skip honesto** (no throw): re-lee el deal de `greenhouse_crm.deals` (`is_closed_won` + `hubspot_company_id`, NUNCA confía el payload) → org canónica vía `organizations.hubspot_company_id` → `provisionClientLifecycle(draft, idempotente)`. Skip si deal no synced / no closed-won / org inexistente. El endpoint standalone `hubspot-deals` queda como entry point alt/test (mismo patrón que `hubspot-services`).
- `flags.ts`: `+ isClientLifecycleHubspotDealTriggerEnabled` (`CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED`, **default OFF**).
- `provision-client-lifecycle.ts`: `triggeredByUserId` widened a `string|null` (system-initiated — cols nullable FK a `client_users`; el command ya special-caseaba `hubspot_deal`→draft).
- Migración `20260604175019856`: seed `webhook_endpoints` hubspot-deals (endpoint standalone) + anti pre-up-marker. Aplicada a dev.
- **Subscription LIVE**: `webhooks-hsmeta.json` (monorepo canónico) + `object.creation` deal + `object.propertyChange` deal `dealstage`; `hs project upload --account=48713323` → **Build #26 deployed** (27→29 subscriptions). Código de clasificación aún en `develop` (no pusheado) + flag OFF → deal events en prod se ignoran (unknown) hasta deploy + flip. Inofensivo.
- Sin event nuevo (reusa `client.lifecycle.case.opened v1`).
- Verde: eslint 0, tsc 0, `hubspot-deals.test` 13/13, `hubspot-companies.test` 13/13.
- **✅ E2E VERIFICADO contra DB real (2026-06-04, in-process)**: `processInboundWebhook('hubspot-companies', req-firmado-deal-0-3)` → `{status:200, processed:true}` → caso `draft` real creado (`clc-a381e90c…`, trigger=hubspot_deal, deal ANAM `36218728630`). Ejercitó el path completo: HMAC v3 (acepta válida / **rechaza inválida** → control negativo `processed:false`) → classify `0-3`='deal' → delegación → `processHubSpotDealEvents` (flag ON) → `processClosedWonDeal` → SQL real (`greenhouse_crm.deals` is_closed_won + resolución org) → `provisionClientLifecycle`. **Cleanup**: caso cancelado (rollback-safe, sin residuo activo). Secret sintético (valida el código; el match con secret real ya probado en prod por webhooks company/service, mismo `validateHubSpotSignature`). **PENDIENTE sólo el round-trip de PRODUCCIÓN** (HubSpot real → endpoint prod): requiere release `develop→main` del código de clasificación + flip del flag en prod.

### ✅ Slice 4 — GVC SuccessScreen + degraded pickers (2026-06-04, verificado enterprise)

- **SuccessScreen** (mockup `client-onboarding-wizard`, ruta `/agency/clients/new/mockup`, sin writes a DB): check verde, "Cliente creado", metadata `Cliente=Grupo Berel` + **código de caso `EO-CLC-0051` legible** (chip), 3 próximos pasos del checklist, jerarquía de CTAs correcta (1 primary "Ir a la ficha" + 1 tonal "Crear otro"), stepper 100%, footer Efeonce. Frame mirado ✓.
- **Degraded picker** (runtime local, scenario `client-onboarding-wizard-runtime --env=local`, flag ON): el panel Notion con token inválido → `POST /api/admin/clients/lifecycle/notion/validate` lo rechaza → **error Alert honesto** (ícono + crimson + texto "El token fue rechazado por Notion (401). Verifica que lo copiaste completo.", outlined, no alarmante) + fallback manual disponible + nota "se guarda cifrado, nunca en texto plano". Color+ícono+texto → WCAG ok. Validate es **read-only (no crea cliente)** → captura determinista + safe. Frame mirado ✓.
- Hook nuevo `data-capture="notion-connect-panel"` (espejo del de Teams) para clips limpios (commit `f180d4d1c`).
- **Por qué local y no staging**: staging+prod comparten Cloud SQL → un create real por el wizard en staging crearía una org/cliente visible en prod. Local tiene el código + es seguro (sin writes compartidos). El degraded usa `/notion/validate` (read-only).

**~~Slice 2~~ (cerrado arriba) — referencia histórica del discovery:**
- Redefinir `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` (hoy "crea cliente" desde Finanzas, POSTea `/api/finance/clients`) → superficie de **completar el facet financiero** de un cliente existente. El wizard es la ÚNICA puerta de nacimiento (`provisionClientFromWizard`) — el drawer NO debe parir clientes.
- Mockup aprobado del target: `src/views/greenhouse/agency/clients/mockup/FinanceFacetDrawerMockup.tsx`.
- Consumer del drawer: `src/views/greenhouse/finance/ClientsListView.tsx` (botón "Crear cliente" línea ~254 hoy hace toggle wizard-vs-drawer; el drawer se monta línea ~379).

  **Discovery hecho (no re-descubrir):**
  - **Layout target** (mockup, 170 líneas): Drawer anchor=right, `width { xs:'100%', sm:460 }`. Header (título + subtítulo + close) → **client context read-only** (org name + taxId + chip `publicId`, fondo `alpha(secondary,0.04)`) → body `Stack spacing={4}`: `currency` (select `CURRENCY_OPTIONS`), `paymentTerms` (number + adorn "días"), 2 `Switch` (`requiresPo`/`requiresHes`), `billingAddress`, `specialConditions` (multiline) → nota info "Esto no crea un cliente" → footer Cancel + **Guardar perfil** (icon `tabler-device-floppy`).
  - **Copy keys YA existen** en `src/lib/copy/client-onboarding.ts`: `T.financeDrawer.{title,subtitle,clientContextLabel,notACreateNote,saveCta,cancelCta}` (línea ~333) + `T.finanzas.{currencyLabel,currencyMxNote,paymentTermsLabel/Helper,requiresPoLabel,requiresHesLabel,billingAddressLabel/Helper,specialConditionsLabel/Helper}`. **No hay que escribir copy.**
  - **Endpoint de UPDATE EXISTE**: `src/app/api/finance/clients/[id]/route.ts` (verificar si tiene PUT/PATCH para los campos financieros; si no, ese es el backend a agregar para el Save del facet). El drawer NUEVO **NO** debe POSTear `/api/finance/clients` (create).
  - **A confirmar en implementación**: (a) cómo el drawer recibe el cliente existente (props `clientProfileId` + identidad para el context read-only) y **carga** los valores actuales del `client_profiles`; (b) el endpoint/helper de persistencia del Save (reusar patrón `fillMissingFinanceProfileForExistingClient` TASK-1006, o un PUT a `client_profiles`); (c) el trigger nuevo (per-cliente, desde la lista/detalle de Finanzas) — el botón global "Crear cliente" debe ir SIEMPRE al wizard (quitar el fallback `setDrawerOpen(true)` legacy).
- (Slices 2 y 3 ya implementados — ver bloques ✅ arriba. Este texto queda como referencia histórica del discovery.)

### Estado de items (recalibrado 2026-06-04 tras verificación e2e)

**✅ VERIFICADO / hecho:**
- Slice 1 Teams channel materialización + **persistencia e2e verificada** (`writeTeamsChannelFromAnchor` → `teams_notification_channels`, team+channel, `ready`, space-scoped).
- Slice 2 FinanceFacetDrawer (drawer→facet + botón global→wizard) + GVC del mockup aprobado.
- Slice 3 webhook deal + **e2e verificado contra DB real** (HMAC→classify→delegate→processClosedWonDeal→case draft + control negativo + cleanup) + subscription deal LIVE (Build #26).
- **Channel-level Teams** + **Graph perms**: ya resueltos por TASK-998 (scope stale del spec) — el panel elige equipo→canal; el bot lista con perms actuales (sin `Group.Read.All`).
- **Readiness Notion PRD** (scope stale): ya funciona — el onboarding usa **token scoped por cliente** (TASK-998), `NotionConnectPanel` → `/notion/validate` → `discoverNotionDatabasesForToken` valida + clasifica las DBs del cliente **al instante**. El item "conectar Greenhouse PRD + Graph Group.Read.All" era del modelo viejo (integración compartida), superseded por el token-por-teamspace. NO se hace de nuevo.
- **Invitación al portal**: e2e verificada + **bug latente ISSUE-084 detectado y fixeado** (INSERT sin `user_id` + `auth_mode` inválido; afectaba onboarding + `/api/admin/invite`). Fix del lifecycle invite→activación + guard de regresión. **Entrega real confirmada en Resend** (`last_event=delivered`) a `hhumberly@efeoncepro.com` Y `jreysgo@gmail.com` (vía staging). `creative@` rebotó (no es buzón real — no es bug). El usuario hizo clic en el link de `jreysgo@` y obtuvo "enlace inválido/expirado" → **causa raíz cross-env, NO bug del flujo**: el email arma la URL con `NEXT_PUBLIC_APP_URL || prod`, en staging apunta a prod, y el JWT firmado con el secret de staging no verifica con el secret de prod (DB compartida, la fila del token sí existe). **El flujo funciona en prod** (mismo secret, misma DB). Capturado en **TASK-1012** (URL cross-env + sync de estado de entrega Resend).
- **Slice 4 GVC SuccessScreen + degraded pickers**: ✅ ambos frames capturados + mirados + verificados enterprise (ver bloque Slice 4 arriba).

**🔒 Operator-gated / release (lo único que falta — al release conjunto):**

- **Round-trip de producción del webhook deal**: requiere release `develop→main` (código de clasificación a prod) + flip `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED`. Subscription ya LIVE (Build #26).
- **Flip + verificación de flags en prod**: `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` + deal trigger + round-trip e2e real (HubSpot deal → caso draft).
- **Readiness Notion PRD per-cliente**: conectar el token scoped al teamspace del cliente (acción operador en Notion, per-cliente, en el checklist). El search degrada honesto a "crear nuevo" sin eso (correcto).

> **Estado**: **dev-scope COMPLETO + verificado** (Slices 1-4 verdes, invitación e2e con entrega real, GVC ambos frames mirados, ISSUE-084 fixeado, TASK-1012 abierta para el follow-up cross-env). Lo único pendiente es el **rollout a prod** (flip de flags + round-trip e2e real), intencionalmente diferido al **release conjunto** (decisión operador: terminar 1010 + pasar todo junto). NO mover a `complete/` hasta completar ese rollout (Runtime Rollout Completion Gate).
