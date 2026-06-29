# TASK-1286 — Command gobernado `assignAeoTier` (asignar tiers AEO on-demand)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1286-aeo-assign-tier-governed-command`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte la asignación de tiers AEO (`trial` / `contracted` / `pilot` / `none`) de **scripts CLI** (`provision-aeo-trials.ts`, `provision-grader-profile-for-org.ts`) a un **command gobernado** `assignAeoTier({ organizationId, tier, reason })`. El command **compone** el writer canónico de módulos (`enableClientPortalModule`, TASK-826) para escribir `module_assignments` (SSOT del entitlement AEO, `metadata_json.aeo_tier`) con audit + outbox; es capability-gated (`growth.ai_visibility.entitlement.manage`), idempotente y reversible (`tier='none'` = supersede del assignment); y **auto-provisiona el `grader_profile` desde `organizations.website_url`** (habilitado por TASK-1285), cerrando el `aeo_profile_required` para todo tier (no solo Berel). Es la **foundation backend** que TASK-1276 (cockpit operador) y un panel AEO en Account-360 consumen — y, por Full API Parity, que Nexa opera por construcción.

## Why This Task Exists

Hoy provisionar AEO a un cliente es un script que solo un agente con shell puede correr: sin capability check, sin audit gobernado, sin idempotencia transaccional uniforme, y sin camino para que el AM (o Nexa) lo haga on-demand. Asignar un tier es una **decisión comercial recurrente** (cross-sell PLG, Motor 1) — exactamente la clase de acción que el Full API Parity Principle exige modelar como command canónico (un primitive, muchos consumers: cockpit + Account-360 + Nexa). Además, el binding `grader_profile.organization_id` que el run trial exige se crea hoy a mano; con la web de la org ya canónica (TASK-1285), el command puede auto-provisionarlo de forma robusta.

## Goal

- `assignAeoTier({ organizationId, tier, reason })`: command único, capability-gated, idempotente, auditado, que asigna/cambia el tier AEO de una org **componiendo** `enableClientPortalModule` (no un writer paralelo).
- Auto-provisión del `grader_profile` enlazado a la org **desde `organizations.website_url`** cuando se asigna un tier que habilita run; degradación honesta si la org no tiene web canónica (no inventar dominio).
- `tier='none'` = supersede del assignment AEO activo (reversible, append-only, sin DELETE).
- Capability `growth.ai_visibility.entitlement.manage` + grant a `efeonce_account` + `efeonce_admin` + coverage, en el mismo PR.
- Endpoint(s) Product API que exponen el command (consumido por TASK-1276 / Account-360 / Nexa).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (un primitive, muchos consumers; Nexa por construcción)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant + coverage)
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (module_assignments + `enableClientPortalModule`)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (entitlement & metering, TASK-1277)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (capability⇒grant+coverage · state-machine+audit · outbox)

Reglas obligatorias:

- **NUNCA** escribir `module_assignments` con raw INSERT desde este command: componer `enableClientPortalModule` (TASK-826, ya hace tx única + audit + outbox + cache invalidation).
- Capability + grant + coverage en el mismo PR; el grant es a roles reales de `role-codes.ts` (`efeonce_account`, `efeonce_admin`), NUNCA branch `roleCodes.includes(...)` inline.
- `tier='none'` NO borra: supersede del assignment (append-only).
- La auto-provisión del profile reusa la lógica de `scripts/growth/provision-grader-profile-for-org.ts` extraída a un helper `src/lib/**` (no llamar el script).
- Errores canónicos es-CL (`canonicalErrorResponse`); el write muta solo en el endpoint de confirmación humana (Nexa nunca escribe directo).

## Normative Docs

- `docs/tasks/complete/TASK-1277-aeo-entitlement-metering-platform.md` (entitlement/module/chokepoint)
- `docs/tasks/complete/TASK-1285-canonical-organization-website-url.md` (org.website_url canónica → auto-profile)
- `docs/tasks/to-do/TASK-1276-aeo-operator-view-growth-account360.md` (consumer cockpit)
- `src/lib/client-portal/commands/enable-module.ts` (writer canónico a componer)

## Dependencies & Impact

### Depends on

- **TASK-1277** (complete) — módulo `ai_visibility_v1` + tiers en `module_assignments.metadata_json.aeo_tier` + `resolveAeoEntitlement`.
- **TASK-1285** (complete) — `organizations.website_url` canónica (fuente del auto-profile).
- `enableClientPortalModule` (TASK-826) — writer atómico de module_assignments.
- `entitlement.ts` (`resolveAeoEntitlement`) + `store.ts` (`getGraderProfileForOrganization`, grader_profiles).

### Blocks / Impacts

- **TASK-1276** (vista operador AEO) — consume `assignAeoTier` + el reader de tiers; el cockpit lista orgs + acción asignar.
- **Account-360** — un panel AEO puntual (follow-up ui-ux) consume el mismo command.
- **Nexa** — opera "dar trial a Cliente X" por parity (read + write gobernado).
- Reemplaza el rol operativo de `scripts/growth/provision-aeo-trials.ts` (queda como bootstrap/bulk).

### Files owned

- `src/lib/growth/ai-visibility/assign-tier.ts` (`assignAeoTier` command) `[verificar naming]`
- `src/lib/growth/ai-visibility/provision-profile.ts` (helper auto-provisión extraído del script) `[verificar]`
- `src/app/api/admin/growth/ai-visibility/assign-tier/route.ts` (endpoint Product API) `[verificar lane]`
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability + grant)
- `migrations/<ts>_task-1286-aeo-entitlement-manage-capability.sql` (seed capability en `capabilities_registry`)

## Current Repo State

### Already exists

- `enableClientPortalModule` (writer atómico module_assignments + audit + outbox + cache).
- `module_assignments` con tier AEO (`metadata_json.aeo_tier`) + `resolveAeoEntitlement` (TASK-1277).
- Lógica de auto-provisión del profile en `scripts/growth/provision-grader-profile-for-org.ts` (a extraer a helper).
- `organizations.website_url` canónica (TASK-1285).
- Capabilities `growth.ai_visibility.run.portal` / `run.operator` (patrón de seed + grant a seguir).

### Gap

- No hay command gobernado para asignar/cambiar tier AEO on-demand; la provisión es CLI-only, sin capability/audit uniforme ni auto-profile desde la org, y sin camino para Account-360/Nexa.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (acceso + costo-adyacente: habilitar un tier abre el run gobernado/metered)
- Impacto principal: `command` (+ `api` + `migration` del capability seed)
- Source of truth afectado: `greenhouse_client_portal.module_assignments` (entitlement AEO) + `greenhouse_growth.grader_profiles` (binding)
- Consumidores afectados: TASK-1276 cockpit · Account-360 panel · Nexa/MCP
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `enableClientPortalModule` (atomic, TASK-826), `resolveAeoEntitlement` (TASK-1277), `getGraderProfileForOrganization` (TASK-1277).
- Contrato nuevo: `assignAeoTier({ organizationId, tier, reason, requestedBy })` + endpoint Product API + helper `provisionGraderProfileForOrganization`.
- Backward compatibility: `compatible` (los scripts CLI siguen funcionando como bulk; el command es additive).
- Full API parity: el command es UN primitive; cockpit/Account-360/Nexa son clientes; Nexa escribe vía propose→confirm→execute.

### Data model and invariants

- Entidades: `module_assignments` (write via `enableClientPortalModule`), `grader_profiles` (auto-provisión binding).
- Invariantes:
  - El tier AEO se escribe SOLO componiendo `enableClientPortalModule` (nunca raw INSERT).
  - `tier='none'` = supersede del assignment activo (append-only, NUNCA DELETE).
  - `pilot` ⇒ `expires_at` NOT NULL (CHECK existente, heredado del writer).
  - El auto-profile usa `organizations.website_url`; si es NULL → degradación honesta (`website_required`, no inventar dominio).
  - Tier inválido → rechazo (enum cerrado `trial|contracted|pilot|none`).
- Tenant/space boundary: el command opera por `organizationId` explícito (operador/AM); NO deriva de sesión cliente.
- Idempotency/concurrency: hereda la idempotencia de `enableClientPortalModule` (re-call mismo tier = no-op); auto-profile idempotente (skip si ya hay profile activo).
- Audit/outbox/history: audit + outbox v1 vía `enableClientPortalModule`; evento `growth.ai_visibility.tier.assigned` `[verificar catálogo]`.

### Migration, backfill and rollout

- Migration posture: `seed` (capability en `capabilities_registry`; sin DDL de tablas — `module_assignments`/`grader_profiles` ya existen).
- Default state: `flag OFF` o capability sin grant amplio hasta sign-off (el command existe pero solo roles con la capability lo invocan).
- Backfill plan: ninguno (los assignments existentes siguen válidos; el command es para nuevos/cambios).
- Rollback path: revert PR (command + endpoint) + reverse migration (drop capability seed); los assignments creados quedan (append-only, no se revierten salvo supersede manual).
- External coordination: sign-off comercial de a qué roles se grantea (default `efeonce_account` + `efeonce_admin`).

### Security and access

- Auth/access gate: capability `growth.ai_visibility.entitlement.manage` (en el endpoint handler); el command helper enforce shape.
- Sensitive data posture: sin PII nueva (org_id + tier + reason); el `reason` es audit, no PII.
- Error contract: `canonicalErrorResponse` (`forbidden`, `website_required`, `invalid_tier`, `org_not_found`) + `captureWithDomain(err,'growth',…)`.
- Abuse/rate-limit posture: capability-gated (operador interno); sin rate-limit adicional (no es superficie pública).

### Runtime evidence

- Local checks: tests del command (assign trial/contracted/pilot/none + idempotencia + supersede + auto-profile + website_required) + capability coverage.
- DB/runtime checks: `assignAeoTier` contra PG real (proxy): crea assignment + auto-profile desde web de la org + `resolveAeoEntitlement` refleja el tier; `tier='none'` supersede.
- Integration checks: tras asignar `trial` a una org con web, `requestGraderRunForOrganization` deja de devolver `profile_required`.
- Reliability signals: reusar los signals de entitlement de TASK-1277 (runs sin entitlement = 0); opcional signal de assignments AEO sin profile.

### Acceptance criteria additions

- [ ] Source of truth (`module_assignments` + `grader_profiles`), contract surface (`assignAeoTier` + endpoint + helper) y consumers nombrados.
- [ ] Invariantes (compone `enableClientPortalModule`, `none`=supersede, pilot expiry, auto-profile desde web, enum cerrado) explícitos.
- [ ] Capability + grant + coverage en el mismo PR; migración seed del capability con bloque DO de verificación.
- [ ] DB/runtime evidence (assign + auto-profile + entitlement refleja + supersede) listada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability + grant

- Seed `growth.ai_visibility.entitlement.manage` en `capabilities_registry` (migración con bloque DO) + `entitlements-catalog.ts` (TS) + grant a `efeonce_account` + `efeonce_admin` en `runtime.ts` + coverage test (mismo PR).

### Slice 2 — Helper de auto-provisión del profile

- Extraer la lógica de `scripts/growth/provision-grader-profile-for-org.ts` a `provisionGraderProfileForOrganization(organizationId)` en `src/lib/**`: deriva brand/market/locale/website de `organizations` (web canónica TASK-1285); idempotente; `website_required` honesto si NULL. El script pasa a llamar el helper.

### Slice 3 — Command `assignAeoTier` + endpoint

- `assignAeoTier({ organizationId, tier, reason, requestedBy })`: valida tier (enum), mapea tier→`{ status, metadata.aeo_tier, expiresAt? }`, compone `enableClientPortalModule`; si el tier habilita run → `provisionGraderProfileForOrganization`; `tier='none'` → supersede. Endpoint Product API `POST /api/admin/growth/ai-visibility/assign-tier` (capability + canonical errors). Evento outbox.

### Slice 4 — Tests + docs

- Tests del command (todos los tiers + idempotencia + supersede + auto-profile + website_required + coverage) + Delta en la arch spec del grader + triple doc proporcional.

## Out of Scope

- **UI del cockpit operador (TASK-1276)** y el **panel AEO en Account-360** — consumers ui-ux separados, bloqueados por esta foundation.
- El chokepoint de run (TASK-1277, ya existe).
- Billing/facturación del tier (solo entitlement, no invoice).
- Bulk provisioning masivo (los scripts CLI siguen para eso).

## Detailed Spec

Un command, varios consumers. `assignAeoTier` es el único entrypoint gobernado para asignar/cambiar tier AEO. NO reimplementa la escritura de `module_assignments` — compone `enableClientPortalModule` (que ya hace tx única + audit + outbox + cache). La novedad AEO-específica: (1) mapeo tier→status/metadata/expiry, (2) auto-provisión del `grader_profile` desde la web canónica de la org (cierra `aeo_profile_required`), (3) `none`=supersede. Por Full API Parity, el mismo command lo invocan el cockpit (TASK-1276), el panel Account-360 y Nexa (write vía confirmación humana).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (capability) → Slice 2 (helper auto-profile) → Slice 3 (command + endpoint) → Slice 4 (tests/docs). El command (S3) no se expone sin la capability (S1) ni el auto-profile (S2).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Asignar tier que habilita run sin profile | growth/cost | medium | auto-profile en el command; si web NULL → `website_required` (no asigna a medias) | `profile_required` en runs / assignments sin profile |
| Writer paralelo de module_assignments | client-portal | medium | componer `enableClientPortalModule`; review + lint | drift de audit/outbox |
| Capability sin grant (build roto) | entitlements | low | grant + coverage mismo PR (guard CI) | capability-grant-coverage test |
| `none` borra en vez de supersede | data quality | low | supersede append-only; test | assignment desaparecido del historial |

### Feature flags / cutover

- Sin flag nuevo: la puerta es la **capability** (sin grant → nadie invoca). El run sigue gateado por los flags de TASK-1277.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (drop capability seed) + revert grant | <10 min | sí |
| Slice 2 | revert PR (helper); el script vuelve inline | <5 min | sí |
| Slice 3 | revert PR (command + endpoint) | <5 min | sí |
| Slice 4 | n/a (tests/docs) | — | sí |

### Production verification sequence

1. Migrate staging (capability seed) + verify registry + grant.
2. `assignAeoTier(org, 'trial')` contra una org con web → assignment creado + auto-profile + `resolveAeoEntitlement` refleja trial.
3. `requestGraderRunForOrganization` para esa org ya no devuelve `profile_required`.
4. `assignAeoTier(org, 'none')` → supersede; entitlement vuelve a `not_entitled`.
5. Repetir en prod tras sign-off (gated EPIC-020).

### Out-of-band coordination required

- Sign-off comercial: a qué roles se grantea la capability (default `efeonce_account` + `efeonce_admin`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `assignAeoTier` es el único command gobernado de asignación de tier AEO; **compone** `enableClientPortalModule` (no raw INSERT) + audit + outbox.
- [ ] Auto-provisión del `grader_profile` desde `organizations.website_url`; si NULL → `website_required` honesto (no asigna a medias, no inventa dominio).
- [ ] `tier='none'` = supersede (append-only, NUNCA DELETE); `pilot` exige expiry; tier inválido rechazado.
- [ ] Capability `growth.ai_visibility.entitlement.manage` + grant (`efeonce_account` + `efeonce_admin`) + coverage en el mismo PR; errores canónicos es-CL.
- [ ] Endpoint Product API expone el command (consumible por TASK-1276 / Account-360 / Nexa).
- [ ] DB/runtime evidence: assign trial → auto-profile → entitlement refleja → run deja de pedir profile → `none` supersede.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + verify capability seed + smoke del command contra PG real (assign/none/auto-profile/website_required)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1276, TASK-1277, TASK-1285)
- [ ] Delta en la arch spec del grader (entitlement governance command)

## Follow-ups

- TASK-1276 (cockpit operador) + panel AEO en Account-360 consumen este command (ui-ux).
- Señal de expansión HubSpot cuando se asigna/agota un tier (Motor 1) — follow-up de TASK-1277.
- Evaluar deprecar los scripts CLI de provisión una vez el command + UI cubran el flujo.

## Open Questions

- ¿El command auto-provisiona profile también para `contracted`/`pilot`, o solo `trial`? (default propuesto: para todo tier que habilite run).
- ¿El endpoint vive en `api/admin/growth/**` o en un lane de Product API distinto? (resolver en Discovery según el patrón de TASK-1277).
