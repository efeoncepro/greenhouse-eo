# TASK-991 — Canonical Organization Write SSOT + Birth Completeness

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Status real: `En ejecucion` (develop directo, sin branch — instrucción operador 2026-06-02)
- Rank: `TBD`
- Domain: `commercial` (owner) — touches `identity` (organizations canonical), `integrations` (HubSpot/Nubox doors), `finance` (lectura del filtro client), `reliability` (drift signals), `data`.
- Blocked by: `none`. **Es el FOUNDATION/prerequisito.** Va PRIMERO en la secuencia `991 → 990 → 992`.
- Branch: `develop` (directo, sin branch dedicada — instrucción operador)
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Establecer UN solo punto de escritura canónico para la fila `greenhouse_core.organizations` (`upsertCanonicalOrganization`), reconciliar la dimensión `organization_type` con `lifecycle_stage` (CHECK constraint), derivar `country`/`tax_id`/`legal_name` desde el origin (sin defaults ciegos), agregar 4 reliability signals que detecten organizaciones a medio cocinar, y remediar la **identidad** de las orgs incompletas existentes (Berel: RFC `PBE970101718` + país MX + `organization_type='client'`). Es la base estructural que destraba el matching por RFC de TASK-990 y sobre la que se construye el orquestador de lifecycle (TASK-992).

## Delta 2026-06-02 — Implementación Slices 0-3 (CODE COMPLETE, CHECK+flag = rollout pendiente)

Implementado directo en `develop` (instrucción operador, sin branch). Skills aplicadas como lente: arch-architect + finance-accounting-operator + commercial-expert.

- **Slice 0 (commit 37591de0):** 4 reliability signals (`commercial.organization.type_lifecycle_drift`, `…incomplete_identity`, `commercial.client.active_without_profile`, `…active_without_space`) + wire-up en `get-reliability-overview.ts` + registry `commercial` (expectedSignalKinds += data_quality) + `scripts/commercial/inventory-half-baked-orgs.ts`. Read-only. 17 tests.
- **Slice 1 (commit siguiente):** `deriveOrganizationType` (SSOT, `src/lib/account-360/organization-type.ts`) + `upsertCanonicalOrganization` (writer canónico) + las puertas finance/supplier delegan + puerta HubSpot setea type/public_id/origin detrás del flag `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` (default OFF, shadow) + migración `organizations.origin` (nullable, backfill heurístico: 124 hubspot_sync + 29 migration). 35 tests.
- **Slice 2 (commit 30a5690d):** `country_code` HubSpot propagado a la puerta party (flag ON) — MX real, no 'CL' ciego; NULL honesto si falta. 5 tests party.
- **Slice 3 (commit 03fafebf):** script `remediate-half-baked-orgs.ts` (dry-run/apply/allowlist/actor/reason/override/expected-count) + modo `overrideIdentity` del helper. **Remediación LIVE aplicada:** Berel (type→client, country→MX, tax_id=PBE970101718 RFC, legal_name="PINTURAS BEREL SA DE CV") + Aguas Andinas + Motogas (type→client). Signal `type_lifecycle_drift`: **3 → 0**. `incomplete_identity`: 11→10 (Berel resuelto; resto = data-completion ops).

**Gate de cierre verde:** `pnpm test` full 5817 passed + `pnpm build` exit 0 + tsc 0 + lint 0.

**ROLLOUT PENDIENTE (operador) — code complete ≠ operationally complete:**
1. Flipear `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED=true` en staging → validar que orgs HubSpot nuevas nacen con type/country correctos → flipear en producción (Vercel + ops-worker, requiere redeploy).
2. SOLO DESPUÉS del flag ON en todos los runtimes: agregar el CHECK `organizations_type_lifecycle_consistent` (NOT VALID + VALIDATE, patrón TASK-708/708b). Con el flag OFF la puerta party legacy aún produce `active_client+other` → el CHECK rompería el HubSpot sync. El CHECK es el paso final de hardening (la garantía DB), gated en el flag.

Por eso la task queda `in-progress` (rollout pendiente), NO `complete`. El flag OFF garantiza cero cambio de comportamiento al merge; la remediación de datos ya está aplicada y los signals en steady (drift=0).

## Why This Task Exists

Auditoría `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md`: ≥4 puertas escriben subconjuntos distintos de la fila `organizations` sin helper SSOT. Las puertas HubSpot (`createPartyFromHubSpotCompany`) escriben `lifecycle_stage`+`hubspot_company_id` pero NUNCA `organization_type`/`tax_id`/`country`/`legal_name` → una org nacida por HubSpot no puede auto-completarse. Caso real: Grupo Berel quedó `organization_type='other'` (invisible en Finanzas), `tax_id=NULL` (factura Nubox `28800562` no matchea), `country='CL'` (default ciego, debería MX). Y nada lo detecta (`rg organization_type src/lib/reliability/` = 0). **Esta task cierra la causa raíz estructural** (el resto del programa — orquestador + wizard — es TASK-992).

## Goal

- UN solo writer de `organizations` (`upsertCanonicalOrganization`); las 4 puertas son callers.
- `organization_type` derivado/validado desde `lifecycle_stage`+roles; imposible `active_client`+`other`. CHECK enforced en DB.
- `country`/`tax_id`/`legal_name` derivados del origin; NULL explícito si falta (NUNCA default ciego).
- 4 signals detectan orgs a medias en steady=0.
- Identidad de Berel remediada (MX/RFC/type=client) por la puerta canónica → destraba el RFC match de TASK-990.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` — origen (matriz + propuesta + 4-pillar).
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `organizations` anchor; `clients` extensión financiera solo en `active_client`. NUNCA identidad paralela.
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (TASK-535) — `lifecycle_stage` + `instantiateClientForParty`. NO reemplazar; reconciliar `organization_type` con ella.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — Commercial (party) vs Finance (client_profiles).
- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md` (TASK-990) — consume la identidad de org que esta task provee (RFC match Berel).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — patrón signals + subsystem rollup.

Reglas obligatorias (lentes arch + finance):

- **(arch SSOT)** NUNCA escribir `greenhouse_core.organizations` fuera de `upsertCanonicalOrganization`. Toda puerta es caller.
- **(arch)** NUNCA `lifecycle_stage='active_client'` con `organization_type='other'`. El helper reconcilia; el CHECK lo bloquea; el signal lo detecta.
- **(arch)** `organization_type` se DERIVA de `lifecycle_stage`+roles (`deriveOrganizationType`), no hand-set independiente.
- **(arch)** Expand-and-contract para el CHECK (columna sin constraint previo): `NOT VALID` → remediar → `VALIDATE`. Verificar DDL vía `information_schema` post-`migrate:up` + DO block anti pre-up-marker.
- **(finance)** `tax_id`/`country`/`legal_name` son gate de conciliación SII/Nubox, no cosméticos. Derivar del origin; NULL explícito si falta. NUNCA default ciego (`'CL'`).
- **(arch)** SQL de signals validado contra PG real antes de mergear (gate TASK-893); columnas DATE (`date - date = integer`, no `EXTRACT(EPOCH …)`).
- NUNCA `Sentry.captureException` directo: `captureWithDomain(err, 'commercial', { tags: { source: 'org_canonical_write' } })`.
- NUNCA DELETE de audit/historial. Append-only + supersede (remediación vía helper, nunca SQL directo).

## Normative Docs

- `docs/documentation/identity/sistema-identidad-roles-acceso.md`

## Dependencies & Impact

### Depends on

- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1` (TASK-535, `lifecycle_stage`, `instantiateClientForParty`).
- Runtime a refactorizar (paths verificados en auditoría):
  - `src/lib/account-360/organization-identity.ts` — `ensureOrganizationForClient`, `ensureOrganizationForSupplier`, `promoteToClientCapableType`.
  - `src/lib/commercial/party/commands/create-party-from-hubspot-company.ts` (líneas 84-99 omiten type/tax/country).
  - `src/lib/commercial/party/commands/promote-party.ts`.
  - `src/lib/commercial/party/hubspot-lifecycle-mapping.ts`.
  - `src/lib/hubspot/sync-hubspot-companies.ts`, `src/lib/hubspot/sync-company-by-id.ts`.
  - `src/app/api/finance/clients/route.ts` (POST + filtro `organization_type` línea 104).
  - `src/app/api/commercial/parties/adopt/route.ts`.
- `migrations/20260421113910459_task-535-organization-lifecycle-ddl.sql` (`lifecycle_stage`).

### Blocks / Impacts

- **TASK-990 (Berel MXN):** su RFC match + proyección de income consume la identidad de org que esta task provee. **Va después de esta.**
- **TASK-992 (orquestador + wizard):** construye sobre `upsertCanonicalOrganization`. **Va después de esta.**
- Toda feature que liste/cuente clientes pasa a ver orgs consistentes.

### Files owned

- `src/lib/account-360/organization-identity.ts` (extiende: `upsertCanonicalOrganization`)
- `src/lib/account-360/organization-type.ts` [crear] — pure `deriveOrganizationType`
- `src/lib/reliability/queries/commercial-organization-type-lifecycle-drift.ts` [crear]
- `src/lib/reliability/queries/commercial-organization-incomplete-identity.ts` [crear]
- `src/lib/reliability/queries/commercial-client-active-without-profile.ts` [crear]
- `src/lib/reliability/queries/commercial-client-active-without-space.ts` [crear]
- `src/lib/reliability/get-reliability-overview.ts` (wire-up)
- `scripts/commercial/inventory-half-baked-orgs.ts` [crear]
- `scripts/commercial/remediate-half-baked-orgs.ts` [crear]
- `migrations/*task-991*.sql`

## Current Repo State

### Already exists

- `lifecycle_stage` + state machine (TASK-535); mapping HubSpot `customer→active_client`.
- `instantiateClientForParty` (único path que crea `clients`+`client_profiles` en `active_client`).
- Puertas dispersas: `ensureOrganizationForClient`, `createPartyFromHubSpotCompany`, `ensureOrganizationForSupplier`, adopt.

### Gap

- No existe `upsertCanonicalOrganization` (SSOT). 4 puertas escriben subconjuntos.
- `organization_type` sin CHECK; hand-set solo por Finance/Supplier; diverge de `lifecycle_stage`.
- HubSpot sync no deriva `country`/`tax_id`; default `'CL'` ciego.
- 0 reliability signals de completitud (`rg organization_type src/lib/reliability/` = 0).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Drift signals + inventario (read-only, no cambia escritura)

- 4 readers en `src/lib/reliability/queries/` (subsystem rollup `Commercial Health`; severity `error` si count>0; steady=0):
  - `commercial.organization.type_lifecycle_drift` — `lifecycle_stage='active_client'` AND `COALESCE(organization_type,'other') NOT IN ('client','both')`.
  - `commercial.organization.incomplete_identity` — `hubspot_company_id IS NOT NULL` AND (`tax_id IS NULL` OR `legal_name IS NULL`).
  - `commercial.client.active_without_profile` — `active_client` sin `client_profiles` (LEFT JOIN por `organization_id`).
  - `commercial.client.active_without_space` — `active_client` sin `spaces` (LEFT JOIN por `organization_id`).
- Wire-up en `get-reliability-overview.ts` con `catch(()=>null)`.
- SQL validado contra PG real vía proxy ANTES de mergear (gate TASK-893; columnas DATE).
- `scripts/commercial/inventory-half-baked-orgs.ts` (read-only): cuenta orgs por estado de drift.
- Tests por reader (ok / warning / SQL anti-regresión / degraded), patrón `finance-client-profile-unlinked.ts`.

### Slice 1 — `upsertCanonicalOrganization` SSOT + reconciliación `organization_type` ↔ `lifecycle_stage`

- Pure `deriveOrganizationType({ lifecycleStage, hasClientRole, hasSupplierRole })` en `src/lib/account-360/organization-type.ts`:
  - `active_client` ⇒ `client` (o `both` si también supplier).
  - `provider_only` ⇒ `supplier`.
  - prospect/opportunity/etc sin rol cliente ⇒ `other`.
  - dual ⇒ `both`.
- `upsertCanonicalOrganization(input, client?)` en `src/lib/account-360/organization-identity.ts` — único writer. Set completo: `organization_name`, `legal_name`, `organization_type` (derivado), `lifecycle_stage`, `tax_id`, `tax_id_type`, `country`, `hubspot_company_id`, `origin`. Idempotente (resolve by `organizationId` → `hubspotCompanyId` → `taxId`). Dual-mode `client?: Kysely|Transaction`. Firma completa en Detailed Spec.
- Refactor a callers (sin cambiar contrato externo): `ensureOrganizationForClient`, `ensureOrganizationForSupplier`, `createPartyFromHubSpotCompany`, `promoteParty` (cuando toque la fila), adopt handler. Cero INSERT/UPDATE directo a `organizations` fuera del helper.
- Migración `task-991` (expand-and-contract):
  - Columna `origin` (`hubspot_sync|nubox|manual|adopt|quote_converted|migration|bootstrap`, nullable + DEFAULT backfill).
  - CHECK `organizations_type_lifecycle_consistent` (`NOT VALID`): rechaza `active_client` con `organization_type NOT IN ('client','both')`.
  - DO block anti pre-up-marker (verifica columna + CHECK post-DDL).
  - **NO** `VALIDATE` aún (Slice 3).
- Flag `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED=false` default — gatea que las puertas deleguen (shadow: helper disponible, puertas aún directas, hasta validar no-regresión).
- Tests: pure `deriveOrganizationType` (matriz completa); `upsertCanonicalOrganization` idempotencia + tx; no-regresión bit-for-bit por caller.

### Slice 2 — Derivación de `country`/`tax_id`/`legal_name` desde el origin (sin defaults ciegos)

- HubSpot door: mapear company `country`/`hs_country` → `org.country` (Berel MX), `legal_name`, `tax_id` cuando exista property fiscal. Eliminar default ciego `'CL'`.
- Nubox door: derivar `tax_id` (RUT/RFC) del documento cuando el origin es Nubox.
- Sin dato → `NULL` explícito; el signal `incomplete_identity` lo marca.
- Tests con fixture HubSpot MX (Berel): `country='MX'`, sin default CL.

### Slice 3 — Remediación de orgs a medias + VALIDATE + identidad de Berel

- `scripts/commercial/remediate-half-baked-orgs.ts`: `--dry-run`/`--apply`/`--allowlist-organization-id <id>`/`--actor <user-id>`/`--reason "<>=10>"`/`--max-rows <n>`. Pasa por `upsertCanonicalOrganization` (NUNCA SQL directo). Dry-run: candidate count, skipped por razón, before/after, exact mutation count; apply aborta si difiere.
- Remediar filas legacy a medias (idempotente). Aplicar migración `VALIDATE CONSTRAINT organizations_type_lifecycle_consistent` (paso 2) + DO block que aborta si quedan violadores.
- Remediar **identidad** de Grupo Berel: `tax_id='PBE970101718'` (`tax_id_type='RFC'`), `country='MX'`, `legal_name='PINTURAS BEREL SA DE CV'`, `organization_type='client'`. **Solo identidad** — el facet financiero MXN y el Space NO son de esta task (TASK-990 / TASK-992).
- Verificar los 4 signals en steady=0 post-remediación.

## Out of Scope

- Orquestador `client_lifecycle_case`, wizard único de onboarding, timeline Account 360 → **TASK-992**.
- Facet financiero MXN de Berel (perfil + income projection) → **TASK-990**.
- Space operativo de Berel → TASK-992 / flujo de spaces existente.
- Cambiar la máquina de estados `lifecycle_stage` (TASK-535).
- Materializar `client_kind` (Active/Self-Serve/Project).

## Detailed Spec

### Helper SSOT canónico

```ts
// src/lib/account-360/organization-identity.ts
async function upsertCanonicalOrganization(input: {
  organizationId?: string
  hubspotCompanyId?: string | null
  taxId?: string | null
  taxIdType?: string | null
  legalName?: string | null
  organizationName: string
  country?: string | null            // derivado del origin; NUNCA default ciego
  lifecycleStage?: OrganizationLifecycleStage
  origin: 'hubspot_sync'|'nubox'|'manual'|'adopt'|'quote_converted'|'migration'|'bootstrap'
  hasClientRole?: boolean
  hasSupplierRole?: boolean
}, client?: Kysely | Transaction): Promise<{ organizationId: string; organizationType: string }>
// organization_type = deriveOrganizationType(lifecycleStage, hasClientRole, hasSupplierRole)
// idempotente: resolve by organizationId → hubspotCompanyId → taxId; upsert.
```

### Reconciliación (regla canónica)

`organization_type` deja de ser hand-set. `deriveOrganizationType` es la única fuente. CHECK `organizations_type_lifecycle_consistent` enforce `active_client ⇒ type ∈ {client, both}`.

### Berel identity acceptance (Slice 3)

```txt
organization: org-32333527… (existente)
  organization_type: client          (derivado de active_client)
  country:           MX               (derivado de HubSpot, NO default CL)
  tax_id:            PBE970101718 (RFC)
  legal_name:        PINTURAS BEREL SA DE CV
  origin:            hubspot_sync
# El facet financiero (profile MXN) + income + Space NO son de esta task.
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 PRIMERO (detecta universo de orgs a medias antes de tocar escritura).
- Slice 1 (SSOT helper + CHECK NOT VALID) antes de derivación.
- Slice 2 requiere Slice 1.
- Slice 3 (remediación + VALIDATE) requiere 0-2; el `VALIDATE` solo tras remediar.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| SSOT helper rompe todas las puertas | commercial/identity | medium | refactor incremental + no-regresión bit-for-bit + flag shadow | tests por caller |
| CHECK rechaza filas legacy a medias | data | high si valida antes de remediar | `NOT VALID`→remediar→`VALIDATE`; nunca validar antes | DO block aborta si quedan violadores |
| HubSpot deja de mapear country | integrations | medium | derivar de company; NULL explícito si falta | `commercial.organization.incomplete_identity` |
| Capability/grant N/A (esta task no crea capabilities) | — | — | — | — |
| Berel remediado mal (datos productivos) | data | low-medium | dry-run + allowlist + expected-count abort | script + Sentry |

### Feature flags / cutover

- `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED=false` default — gatea delegación de puertas al helper. Presente en Production + staging + Preview develop antes de rollout-ready. Redeploy tras cambios de env.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revert PR (signals read-only) | <15 min | yes |
| 1 | flag off (puertas vuelven a escritura directa); CHECK NOT VALID no afecta inserts correctos | <30 min | yes |
| 2 | revert mapper origin | <15 min | yes |
| 3 | remediación idempotente vía supersede; VALIDATE no se revierte pero no rompe (filas ya consistentes) | 30-90 min | partial |

### Production verification sequence

1. `pnpm pg:doctor` local + staging.
2. Migración staging; `information_schema` confirma columna `origin` + CHECK presente.
3. Deploy staging flag off → puertas existentes sin cambio.
4. Activar `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` staging → re-test puertas (no-regresión + ahora completan type/origin/country).
5. Inventario half-baked (Slice 0) + remediar staging (dry-run→apply allowlist) → `VALIDATE`.
6. Verificar 4 signals en steady=0.
7. Repetir Production flag off → activar → remediar identidad Berel con allowlist + actor/reason → monitorear signals 7 días.

### Out-of-band coordination required

- Confirmar valores reales de `ROLE_CODES` si se tocan capabilities (no aplica en esta task — sin capabilities nuevas).
- Avisar a TASK-990 cuando la identidad de Berel esté remediada (destraba su RFC match).
- Redeploy Vercel tras cambios de env.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `upsertCanonicalOrganization` existe y es el ÚNICO writer de `organizations` (grep: 0 INSERT/UPDATE directos fuera del helper + migraciones).
- [ ] `organization_type` derivado vía `deriveOrganizationType`; CHECK `organizations_type_lifecycle_consistent` está `VALID`.
- [ ] Imposible `active_client` + `organization_type='other'` (CHECK bloquea; signal steady=0).
- [ ] HubSpot deriva `country` real (Berel MX, no default CL) + `tax_id`/`legal_name` cuando existen; NULL explícito si faltan.
- [ ] 4 reliability signals existen, wired a `Commercial Health`, validados contra PG real, steady=0 post-remediación.
- [ ] Script `remediate-half-baked-orgs.ts` con dry-run/apply/allowlist/actor/reason; apply aborta si count difiere.
- [ ] Identidad de Berel remediada (MX/RFC/legal_name/type=client) por el helper canónico.
- [ ] Errores usan `canonicalErrorResponse`/`captureWithDomain('commercial', …)`.

## Verification

- `pnpm pg:doctor`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm test`
- `pnpm vitest run src/lib/account-360 src/lib/reliability src/lib/commercial/party`
- SQL signals validados contra PG real vía `pnpm pg:connect` (gate TASK-893).
- Migración: `information_schema` (columna `origin` + CHECK VALID).
- Gate de cierre: `pnpm test && pnpm build` + verificar workers Cloud Run si se tocó `src/lib/**` consumido por ellos (HubSpot/Nubox sync corren en ops-worker).

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-990, TASK-992, TASK-535)
- [ ] Flags verificados con CLI staging + production; redeploy donde cambió env
- [ ] Evidencia de remediación Berel (dry-run + apply) en Handoff
- [ ] Avisar a TASK-990 que la identidad de Berel está lista

## Follow-ups

- TASK-992 (orquestador lifecycle + wizard + timeline) — construye sobre este SSOT.
- TASK-990 (facet financiero MXN de Berel + income projection) — consume esta identidad.

## Open Questions

- ¿`organization_type` se deriva 100% (columna computada) o se mantiene gobernada con CHECK? (recomendación arch: derivar/validar; decidir en Plan Mode).
- ¿El `origin` se backfillea para filas legacy (mejor analítica) o se deja NULL salvo nuevas escrituras? (recomendación: backfill best-effort por heurística `hubspot_company_id IS NOT NULL → hubspot_sync`).
