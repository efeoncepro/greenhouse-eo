# TASK-1001 — Invitar personas del portal en el onboarding (sembrado desde HubSpot + roles client_*)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto` (sin esto, las personas del cliente no quedan asociadas en el alta → no se les pueden dar roles de portal sin un paso manual desconectado)
- Effort: `Medio` (las primitivas existen; lo nuevo es 1 helper + 1 ítem de checklist + 1 UI con loop GVC)
- Type: `feature`
- Epic: `EPIC-CLIENT-360`
- Derived from: `TASK-992` (client lifecycle) / `TASK-998` (mismo principio: provisioning al checklist)
- Domain: `identity` · `commercial` · `client_portal` · `ui`

## Why This Task Exists

Cada organización cliente tiene **personas** (CMO, marketing managers, especialistas) que deben
poder recibir roles de portal (`client_executive` / `client_manager` / `client_specialist`).
Hoy el onboarding (TASK-992) crea **org + cliente + Space + Notion/Teams** pero **NO asocia
personas**: los usuarios de portal nacen por un flujo separado y manual (`POST /api/admin/invite`,
solo `EFEONCE_ADMIN`), desconectado del alta. Los contactos de HubSpot **se capturan** (sync
TASK-706 → `greenhouse_crm.contacts`; finance contacts → `client_profiles.finance_contacts`) pero
son datos, no usuarios con rol.

**Gap**: para darle a alguien un rol de portal hoy hay que invitarlo a mano. Debe ser parte del
onboarding (sembrado desde lo ya capturado).

## Architecture Decision (arch-architect + greenhouse-ux)

Igual que Notion/Teams (TASK-998): **nacimiento ≠ provisioning de personas → al checklist**.
Ítem `provision_client_portal_users` en el caso de onboarding (auditable, reintentar­ble, las
personas pueden ir llegando después del alta — el checklist lo soporta).

### Las primitivas YA existen (esto es buena noticia)

- **Seed de personas**: `listFinanceContactSuggestionsForCompany(hubspotCompanyId)` +
  `fetchHubSpotCompanyContactsFromBridge` (`src/lib/client-onboarding/finance-contact-suggestions.ts`,
  `src/lib/hubspot/list-company-contacts.ts`) — devuelven los contactos de HubSpot de la company.
- **Flujo de invitación**: `POST /api/admin/invite` → `client_users` (linkeado a `client_id`) +
  `user_role_assignments` (rol) + email de invitación (idempotente por email).
- **Roles canónicos**: `client_executive` / `client_manager` / `client_specialist` (ver
  `src/config/role-codes.ts`; snapshot ROLE_CODES en CLAUDE.md).

### Lo nuevo (scope)

1. **Helper reusable de invite** — extraer la lógica de creación de `client_users` +
   `user_role_assignments` + email de `/api/admin/invite` a un helper (`inviteClientPortalUser`)
   reusable desde el contexto lifecycle (gateado por `authorizeLifecycle('client.lifecycle.case.open')`
   o capability dedicada, no solo `EFEONCE_ADMIN`). Idempotente (dedup por email).
2. **Reader de candidatos** — `listClientPortalPersonCandidates(hubspotCompanyId)`: reusa el seed de
   HubSpot + sugiere rol por heurística de cargo (CMO/VP/Director → `client_executive`; Manager →
   `client_manager`; resto → `client_specialist`). El operador confirma/ajusta.
3. **Ítem de checklist** `provision_client_portal_users` en el template de onboarding (TASK-992) +
   endpoint que liste candidatos + invite a los elegidos con su rol.
4. **UI** (loop design+GVC obligatorio): lista de personas sembrada de HubSpot + picker de rol por
   persona + invitar. Estados honestos (loading/empty/error). greenhouse-ux + forms-ux + state-design
   + greenhouse-ux-writing + GVC en loop. Mirror del patrón de los paneles Notion/Teams (TASK-998).

## Hard Rules

- **NUNCA** crear `client_users` ni `user_role_assignments` por SQL inline. Pasar por el helper
  canónico de invite (extraído de `/api/admin/invite`).
- **NUNCA** asignar un rol que no exista en `ROLE_CODES` (verificar contra `src/config/role-codes.ts`
  — solo `client_executive`/`client_manager`/`client_specialist` para portal).
- **NUNCA** invitar en el wizard de nacimiento. Vive en el checklist de onboarding (separación de
  concerns — mismo principio que Notion/Teams).
- **NUNCA** pintar la UI freehand. Loop product-design + GVC como en TASK-998 (paneles Notion/Teams).
- **SIEMPRE** sembrar desde los contactos de HubSpot ya capturados; el operador confirma/ajusta rol.
- **SIEMPRE** idempotente (dedup por email; re-invitar no duplica).

## References

- Invite actual: `src/app/api/admin/invite/route.ts` (lógica a extraer al helper).
- Seed HubSpot: `src/lib/client-onboarding/finance-contact-suggestions.ts` + `src/lib/hubspot/list-company-contacts.ts`.
- Roles: `src/config/role-codes.ts`; ROLE_CODES snapshot en CLAUDE.md.
- Patrón checklist/provisioning: TASK-998 (paneles Notion/Teams) + TASK-992 (client lifecycle).
- Modelo persona↔org: `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`.

## Lifecycle status (2026-06-03) — `code complete, rollout pendiente`

Shipped en `develop` (3 slices, flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` OFF → cero impacto al merge):

- **Slice 1 (`376ca175`)** — helper SSOT `inviteClientPortalUser` (extraído de `/api/admin/invite`, idempotente `onExisting='error'|'ensure'`, asignación additive, emite `role.assigned` v1 in-tx) + heurística `suggestClientPortalRole(jobTitle)` + reader `listClientPortalPersonCandidates` (seed HubSpot + alreadyInvited + degradación honesta). `/api/admin/invite` refactor a SSOT (409 preservado). 18 tests.
- **Slice 2 (`739b21c1`)** — capability dedicada `client.lifecycle.portal_user.invite` (catalog + runtime grant tier advance + api-helpers; **sin migración registry**, mirror de la familia TASK-992) + `GET portal-user-candidates` (case.read) + `POST portal-users/invite` (client_id server-side, idempotente, resultados por persona). grant-coverage + parity verdes.
- **Slice 3 (`a8cde8f1`)** — `PortalUsersPanel` interactivo cableado al ítem **canónico existente `provision_client_users_access`** del timeline + copy `portalUsers` (es-CL). design:lint 0/0.

**Decisiones clave** (pre-execution): reuso del ítem `provision_client_users_access` (NO ítem paralelo); capability dedicada least-privilege (no reusar `case.advance`); refactor admin/invite a SSOT sin romper el 409; sin reliability signal nuevo (ítem `required=FALSE`, sería falso-positivo) ni evento nuevo (reuso `role.assigned`).

**Gates**: tsc 0 · lint 0 · design:lint 0/0 · `pnpm build` ✓ · 20 tests focales + 70 blast-radius verdes.

**GVC ✅ hecha (2026-06-03, local, flag ON)**: capturado el panel en el ítem `provision_client_users_access` del timeline (org GOBIERNO REGIONAL, caso temporal sembrado + cancelado tras la captura, 5 contactos HubSpot reales). Estado "ready" verificado enterprise: filas con nombre/email·cargo, select de rol (sugerido), botón Invitar primario, "Con acceso" verde para ya-invitados, footer de seguridad. Fix de pulido aplicado en el loop (`86cb0bf0`): el seed HubSpot cae a email como name cuando no hay display_name → se mostraba el email duplicado; corregido (email una sola vez + warning "Sin email" explícito). NO se clickeó Invitar (emailearía a personas reales). Capturas en `.captures/` (gitignored).

**Pendiente rollout (NO cerrar)**:
1. **Flag flip** (`CLIENT_LIFECYCLE_ONBOARDING_ENABLED`) en los targets + invitación real end-to-end (email + activación de cuenta) verificada — bundled con el rollout de TASK-992.
2. **Docs funcional** (`docs/documentation/identity/`) + **manual** (`docs/manual-de-uso/`).
