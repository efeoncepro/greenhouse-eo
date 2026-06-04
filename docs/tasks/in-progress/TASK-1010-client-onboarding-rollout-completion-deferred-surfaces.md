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
