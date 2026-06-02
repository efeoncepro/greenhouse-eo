# TASK-991 — Canonical Client Birth: Organization Write SSOT + Lifecycle Orchestrator + Single Front Door

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial` (owner) — touches `finance` (client_profiles facet), `integrations` (HubSpot/Nubox doors), `identity` (organizations canonical), `reliability` (drift signals), `data` (BQ projection). Domain boundary per `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`: Commercial owns party + lifecycle birth; Finance completes the `client_profiles` facet.
- Blocked by: `none`. Depende de specs ya aceptadas (ver Dependencies). Coordina con `TASK-990` (facet financiero MXN de Berel).
- Branch: `task/TASK-991-canonical-client-birth-lifecycle`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Cerrar la fragmentación del nacimiento del cliente: hoy ≥4 puertas de escritura independientes se reparten las columnas de `greenhouse_core.organizations` sin un helper SSOT, ninguna escribe la fila completa, no hay señal que detecte la organización a medio cocinar, y el operador no tiene una puerta única para dar de alta un cliente. Esta task implementa (1) un helper de escritura canónico `upsertCanonicalOrganization` como SSOT de la fila, (2) la reconciliación `organization_type ↔ lifecycle_stage` con CHECK constraint, (3) derivación de `country`/`tax_id` desde el origin (sin defaults ciegos), (4) 4 reliability signals de completitud, (5) la activación del orquestador `client_lifecycle_case` (onboarding) por contrato ya aceptado en `GREENHOUSE_CLIENT_LIFECYCLE_V1`, (6) una puerta única de onboarding (wizard) + timeline de lifecycle en el Account 360, y (7) la remediación de organizaciones a medias (Berel como caso de validación, coordinado con TASK-990).

## Why This Task Exists

Auditoría `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` (verificada contra código + DB real). Caso fuente: Grupo Berel nació por la puerta HubSpot (`createPartyFromHubSpotCompany`) que escribe `lifecycle_stage` + `hubspot_company_id` pero NUNCA `organization_type`/`tax_id`/`country`/`legal_name`. Resultado real en producción: org `org-32333527…` con `organization_type='other'` (invisible en Finanzas), `tax_id=NULL` (factura Nubox `28800562` no matchea), `country='CL'` (debería MX), sin perfil financiero, sin Space. El estado a medias es **estructural** (las columnas de identidad solo son alcanzables por la puerta Finance) y **completamente invisible** (`rg organization_type src/lib/reliability/` = 0 matches). La UX terrible que reportó el operador es el síntoma de este problema de datos, no de pantallas.

## Goal

- Existe UN solo punto de escritura de la fila `organizations` (`upsertCanonicalOrganization`); todas las puertas existentes son callers, no escritores paralelos.
- `organization_type` se deriva/valida desde `lifecycle_stage` + relaciones; imposible que un `active_client` quede `organization_type='other'`. CHECK constraint enforced en DB.
- `country`/`tax_id`/`legal_name` se derivan del origin (HubSpot/Nubox), nunca defaults ciegos; cuando no hay dato, queda NULL + signal lo marca incompleto.
- El operador da de alta un cliente por UNA puerta canónica (wizard de onboarding) que compone un solo comando atómico; el drawer de Finanzas pasa a completar el facet financiero de un cliente existente.
- El nacimiento es un `client_lifecycle_case` observable (origin + etapas + completitud), con timeline visible en el Account 360.
- 4 signals detectan cualquier org a medias en steady=0.
- Berel queda completo (identidad MX/RFC + perfil MXN vía TASK-990 + Space) por la puerta canónica, como validación end-to-end.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar (leer cada uno antes de planificar; si un doc no existe, reportar):

- `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` — la auditoría que origina esta task (matriz de fragmentación + propuesta + 4-pillar).
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — **Aceptada, NO implementada.** Contrato canónico del `client_lifecycle_case` (state machine §6, comandos §7, capabilities §8, API §9, eventos §10, HubSpot integration §11). Esta task la ACTIVA — implementar §5-§11 verbatim, NO re-especificar.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `organizations` = anchor del lifecycle comercial; `clients` = extensión financiera solo en `active_client`. NUNCA identidad paralela.
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (TASK-535) — máquina de estados `lifecycle_stage` + `instantiateClientForParty`. NO reemplazar; reconciliar `organization_type` con ella.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — frontera Commercial (party) vs Finance (client_profiles).
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611/612/613) — facets + projection + entry routes del Account 360.
- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md` (TASK-990) — facet financiero MXN de Berel; coordinar la remediación.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — patrón de signals + subsystem rollup.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — registrar los eventos `client.lifecycle.*` v1.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` + `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`.

Reglas obligatorias (de las 3 lentes — arch + finance + product design):

- **(arch SSOT)** NUNCA escribir la fila `greenhouse_core.organizations` fuera de `upsertCanonicalOrganization`. Toda puerta (HubSpot/Finance/Supplier/adopt/Nubox/admin) es caller.
- **(arch)** NUNCA dejar nacer una org con `lifecycle_stage='active_client'` y `organization_type='other'`. El helper los reconcilia; el CHECK constraint lo bloquea; el signal lo detecta.
- **(arch)** NUNCA mezclar dimensiones ortogonales: `organization_type` se DERIVA de `lifecycle_stage` + roles (client/supplier), no se hand-setea independiente.
- **(arch)** Expand-and-contract para el CHECK sobre `organization_type` (columna sin constraint previo): `NOT VALID` → remediar filas legacy → `VALIDATE`. Verificar DDL aplicado vía `information_schema` post-`migrate:up`.
- **(finance)** `tax_id`/`country`/`legal_name` son gate de conciliación SII/Nubox, no cosméticos. Derivar del origin; si falta, NULL explícito (NUNCA default ciego como el `'CL'` que rompió Berel).
- **(finance)** El `client_profiles` es un FACET completado dentro del lifecycle, NUNCA una puerta de nacimiento paralela con defaults divergentes. Coordinar moneda con TASK-990 (MXN).
- **(product design / IA)** UNA puerta canónica de alta (wizard). El drawer de Finanzas se redefine a "completar facet financiero de cliente existente", no parir clientes.
- **(product design / forms-ux)** El wizard compone UN comando atómico (el onboarding case), NO N llamadas a N puertas. Smart prefill desde el origin (HubSpot/Nubox), mostrando qué se infirió (editable).
- NUNCA `Sentry.captureException` directo: `captureWithDomain(err, 'commercial', { tags: { source: 'client_birth'|'client_lifecycle'|'org_canonical_write' } })`.
- NUNCA error API crudo al cliente: `canonicalErrorResponse(code)` es-CL. `redactErrorForResponse` en boundaries.
- NUNCA seedear capability sin grant en `src/lib/entitlements/runtime.ts` en el mismo PR (guard `capability-grant-coverage.test.ts`, TASK-873/935).
- NUNCA DELETE de audit/historial. Append-only + supersede.

## Normative Docs

- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- Doc funcional del Account 360 / organization workspace (verificar en Plan Mode: `docs/documentation/` agency/identity).

## Dependencies & Impact

### Depends on

- Specs aceptadas: `GREENHOUSE_CLIENT_LIFECYCLE_V1` (activación), `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1` (TASK-535, `lifecycle_stage`), `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1` (facets).
- Runtime existente a refactorizar (verificado en auditoría — paths reales):
  - `src/lib/account-360/organization-identity.ts` — `ensureOrganizationForClient`, `ensureOrganizationForSupplier`, `promoteToClientCapableType`.
  - `src/lib/commercial/party/commands/create-party-from-hubspot-company.ts` (líneas 84-99 omiten `organization_type`/`tax_id`/`country`).
  - `src/lib/commercial/party/commands/promote-party.ts`, `instantiate-client-for-party.ts`.
  - `src/lib/commercial/party/hubspot-lifecycle-mapping.ts` (`DEFAULT_HUBSPOT_STAGE_MAP`).
  - `src/lib/hubspot/sync-hubspot-companies.ts`, `src/lib/hubspot/sync-company-by-id.ts`.
  - `src/app/api/finance/clients/route.ts` (POST + filtro `organization_type` línea 104).
  - `src/app/api/commercial/parties/adopt/route.ts`.
  - `src/lib/services/service-sync.ts` (`createSpaceForClient`, `resolveOrgIdForClient`).
- Migración base del lifecycle: `migrations/20260421113910459_task-535-organization-lifecycle-ddl.sql` (define `lifecycle_stage`, `lifecycle_stage_source`).
- Backfill previo: `migrations/20260402020611201_finance-clients-organization-canonical-backfill.sql`.

### Blocks / Impacts

- TASK-990 (Berel MXN finance-core): el facet financiero de Berel se completa por la puerta canónica de esta task.
- Cualquier feature que liste/cuente clientes (Finanzas, Comercial, dashboards) — pasa a ver orgs consistentes.
- Account 360 facets — el timeline de lifecycle es nueva superficie.

### Files owned

- `src/lib/account-360/organization-identity.ts` (extiende con `upsertCanonicalOrganization` + `deriveOrganizationType`)
- `src/lib/account-360/organization-type.ts` [verificar/crear] — pure `deriveOrganizationType`
- `src/lib/client-lifecycle/**` — orquestador `client_lifecycle_case` (nuevo, per CLIENT_LIFECYCLE_V1)
- `src/lib/reliability/queries/commercial-organization-type-lifecycle-drift.ts` (nuevo)
- `src/lib/reliability/queries/commercial-organization-incomplete-identity.ts` (nuevo)
- `src/lib/reliability/queries/commercial-client-active-without-profile.ts` (nuevo)
- `src/lib/reliability/queries/commercial-client-active-without-space.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up)
- `scripts/commercial/remediate-half-baked-orgs.ts` (nuevo)
- `src/app/api/admin/clients/**` (lifecycle endpoints per CLIENT_LIFECYCLE_V1 §9)
- `src/views/greenhouse/**/onboarding-wizard/**` [verificar path en Plan Mode]
- `migrations/*task-991*.sql`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta eventos `client.lifecycle.*`)

## Current Repo State

### Already exists

- `lifecycle_stage` + state machine (TASK-535): `src/lib/commercial/party/lifecycle-state-machine.ts`, mapping HubSpot `customer→active_client`.
- `instantiateClientForParty` — único path autorizado que crea `clients` + `client_profiles` (al llegar a `active_client`).
- Account 360 facets + projection (TASK-611): `src/lib/organization-workspace/projection.ts`, entry routes `/agency/organizations/[id]`, `/finance/clients/[id]`.
- Drawer Finanzas (a redefinir): `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` → `POST /api/finance/clients` → `ensureOrganizationForClient` + `upsertFinanceClientProfileInPostgres`.
- Adopt (Cotizador): `adoptParty` en `QuoteBuilderShell.tsx` → `POST /api/commercial/parties/adopt`.
- Space create: `createSpaceForClient` + `AdminAccountDetailView` "Crear space".
- Contrato del orquestador: `GREENHOUSE_CLIENT_LIFECYCLE_V1` (tablas, comandos, eventos, capabilities — **specced, no implementado**).

### Gap

- No existe `upsertCanonicalOrganization` (SSOT). 4 puertas escriben subconjuntos distintos.
- `organization_type` sin CHECK constraint (la tabla precede a `migrations/`), hand-set solo por Finance/Supplier; diverge de `lifecycle_stage`.
- HubSpot sync no deriva `country`/`tax_id`; usa default `'CL'` ciego.
- `client_lifecycle_case` no existe (0 implementación de CLIENT_LIFECYCLE_V1).
- No hay puerta única de alta; 4 caminos sin canónica declarada.
- 0 reliability signals de completitud de org (verificado: `rg organization_type src/lib/reliability/` = 0).
- Account 360 no muestra estado de nacimiento/lifecycle.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Drift signals + inventario de orgs a medias (read-only, no cambia escritura)

Detectar el problema antes de tocar escritura. Cero cambio de comportamiento.

- Crear 4 readers en `src/lib/reliability/queries/` (subsystem rollup `Commercial Health`; severity `error` si count>0; steady=0):
  - `commercial.organization.type_lifecycle_drift` — orgs con `lifecycle_stage='active_client'` AND `COALESCE(organization_type,'other') NOT IN ('client','both')`. (El drift exacto de Berel.)
  - `commercial.organization.incomplete_identity` — orgs con `hubspot_company_id IS NOT NULL` AND (`tax_id IS NULL` OR `legal_name IS NULL`).
  - `commercial.client.active_without_profile` — orgs `lifecycle_stage='active_client'` sin fila en `greenhouse_finance.client_profiles` (LEFT JOIN por `organization_id`).
  - `commercial.client.active_without_space` — orgs `lifecycle_stage='active_client'` sin fila en `greenhouse_core.spaces` (LEFT JOIN por `organization_id`).
- Wire-up en `src/lib/reliability/get-reliability-overview.ts` con `catch(()=>null)` (degradación honesta).
- **Validación SQL contra PG real ANTES de mergear** (gate TASK-893): cada query ejecutada vía proxy; las columnas de fecha son DATE (`active_client_since`/`created_at` → `date - date = integer`, NO `EXTRACT(EPOCH …)`).
- Script de inventario one-shot `scripts/commercial/inventory-half-baked-orgs.ts` (read-only) que lista cuántas orgs están en cada estado de drift (cuántas "Bereles" hay).
- Tests por reader (ok / warning / SQL anti-regresión / degraded), patrón `src/lib/reliability/queries/finance-client-profile-unlinked.ts`.

### Slice 1 — `upsertCanonicalOrganization` SSOT + reconciliación `organization_type` ↔ `lifecycle_stage`

- Crear pure `deriveOrganizationType({ lifecycleStage, hasClientRole, hasSupplierRole }) → 'client'|'supplier'|'both'|'other'|'efeonce_internal'` en `src/lib/account-360/organization-type.ts`. Regla canónica:
  - `lifecycle_stage='active_client'` ⇒ al menos `client` (o `both` si también supplier).
  - `lifecycle_stage='provider_only'` ⇒ `supplier`.
  - prospect/opportunity/etc SIN rol cliente ⇒ `other` (un prospect legítimamente no es cliente).
  - dual (client + supplier) ⇒ `both`.
- Crear `upsertCanonicalOrganization(input, client?)` en `src/lib/account-360/organization-identity.ts` — **único** writer de la fila `organizations`. Dueño del set completo: `organization_name`, `legal_name`, `organization_type` (derivado), `lifecycle_stage`, `tax_id`, `tax_id_type`, `country`, `hubspot_company_id`, `origin`. Idempotente (upsert por `organization_id` → `hubspot_company_id` → `tax_id`). Acepta `client?: Kysely|Transaction` para tx compartida (dual-mode).
- Refactorizar a callers (sin cambiar su contrato externo): `ensureOrganizationForClient`, `ensureOrganizationForSupplier`, `createPartyFromHubSpotCompany`, `promoteParty` (cuando toque la fila), el handler de adopt. Cada uno deja de hacer INSERT/UPDATE directo y delega en el helper.
- Migración `task-991` (expand-and-contract):
  - Agregar columna `origin` a `organizations` (enum `hubspot_sync|nubox|manual|adopt|quote_converted|migration|bootstrap`, nullable + DEFAULT por backfill).
  - CHECK constraint `organizations_type_lifecycle_consistent` (`NOT VALID` primero): rechaza `lifecycle_stage='active_client'` con `organization_type NOT IN ('client','both')`.
  - DO block anti pre-up-marker que verifica el CHECK + columna post-DDL (patrón TASK-768).
  - **NO** `VALIDATE` aún (filas legacy a medias lo romperían) — el `VALIDATE` ocurre en Slice 3 tras remediar.
- Tests: pure `deriveOrganizationType` (matriz completa), `upsertCanonicalOrganization` idempotencia + tx, no-regresión bit-for-bit de cada caller (mismos efectos observables salvo que ahora completa type/origin).

### Slice 2 — Derivación de `country`/`tax_id`/`legal_name` desde el origin (sin defaults ciegos)

- HubSpot door: mapear la company HubSpot `country`/`hs_country` → `org.country` (Berel: MX), `name`/`legal_name`, y `tax_id` cuando exista una property fiscal. Eliminar el default ciego `'CL'`.
- Nubox door: cuando el origin es Nubox, derivar `tax_id` (RUT/RFC) del documento.
- Si no hay dato: `NULL` explícito (NUNCA inventar). El signal `commercial.organization.incomplete_identity` (Slice 0) lo marca.
- Tests con fixture HubSpot MX (Berel) verificando `country='MX'`, sin default CL.

### Slice 3 — Remediación de orgs a medias + VALIDATE del CHECK

- Script `scripts/commercial/remediate-half-baked-orgs.ts` con contrato canónico: `--dry-run` / `--apply` / `--allowlist-organization-id <id>` / `--actor <user-id>` / `--reason "<>=10>"` / `--max-rows <n>`. Pasa por `upsertCanonicalOrganization` (NUNCA SQL directo). Dry-run imprime: candidate count, rows skipped por razón, before/after preview, exact mutation count; apply aborta si el count real difiere del esperado.
- Remediar TODAS las filas legacy a medias detectadas en Slice 0 (idempotente). Luego aplicar migración `VALIDATE CONSTRAINT organizations_type_lifecycle_consistent` (segundo paso del expand-and-contract) + DO block que aborta si quedan violadores.
- Verificar signals Slice 0 en steady=0 post-remediación.

### Slice 4 — Orquestador `client_lifecycle_case` (activar CLIENT_LIFECYCLE_V1)

Implementar **verbatim** el contrato de `GREENHOUSE_CLIENT_LIFECYCLE_V1` (NO re-especificar — referenciar):

- Tablas + state machine §6 (case status + checklist item status + transitions matrix + triggers PG).
- Comandos canónicos §7 en `src/lib/client-lifecycle/commands/`: `provisionClientLifecycle`, `advanceLifecycleChecklistItem`, `resolveLifecycleCase` (+ `addLifecycleBlocker`/`resolveLifecycleBlocker`). `deprovisionClientLifecycle` (offboarding) queda OUT (ver Out of Scope) — esta task implementa SOLO el `caseKind='onboarding'`.
- Capabilities §8 (`client.lifecycle.case.open|advance|resolve|read|override_blocker`) + grant en `runtime.ts` mismo PR (guard grant-coverage). **Nota:** la spec V1 menciona `commercial_admin`/`operations` que NO existen en `ROLE_CODES` (ver TASK-935 anti-rol-fantasma) — colapsar a `EFEONCE_ADMIN` + `FINANCE_ADMIN` (open/resolve) y route_groups reales para advance/read. Verificar contra `src/config/role-codes.ts`.
- API §9 (`/api/admin/clients/[organizationId]/lifecycle/onboarding`, items advance, resolve, list, health) con `requireServerSession` + capability granular + `canonicalErrorResponse`.
- Eventos §10 `client.lifecycle.*` v1 + registro en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta.
- El `resolveLifecycleCase` (onboarding completed) cascade: `instantiateClientForParty` si no existe + materializa facets pendientes (profile, space) como pasos del checklist.

### Slice 5 — Puerta única de onboarding (wizard) + redefinición del drawer Finanzas

- Wizard canónico (forms-ux Lane C — anatomía de 7 elementos): pasos `Origen → Identidad → Comercial → Finanzas → Space → Confirmar`. Ruta `[verificar en Plan Mode: /agency/clients/new o /admin/clients/new]`. Smart prefill desde el origin (HubSpot company / Nubox sale), mostrando qué se infirió (editable). Un solo commit atómico = `provisionClientLifecycle` (Slice 4), NO N llamadas. Autosave por paso (>3 pasos). Back preserva data. Validación per-step. Identidad tributaria (tax_id/country) como gate del paso Identidad.
- Redefinir `CreateClientDrawer` → "Completar perfil financiero de cliente existente" (facet finance), NO parir clientes. El adopt del Cotizador dispara `provisionClientLifecycle` con `origin='adopt'`. El sync HubSpot dispara un onboarding case en estado `pending_completion` en vez de dejar la org a medias.
- Microcopy validada con `greenhouse-ux-writing` (es-CL); strings en `src/lib/copy/*`.

### Slice 6 — Timeline de lifecycle/touchpoints en Account 360 + remediación Berel end-to-end

- Agregar al Account 360 (organization workspace shell, TASK-611) un timeline en cabecera: origin + etapas del lifecycle + completitud de facets ("falta tax_id", "falta space"). Wayfinding "you are here" del nacimiento. Read-only desde el `client_lifecycle_case` + `organization_lifecycle_history`.
- Remediar Grupo Berel por la puerta canónica como validación end-to-end: identidad MX/RFC `PBE970101718`, facet financiero MXN (coordinado con TASK-990), Space operativo. Verificar Account 360 con todas las facets pobladas + factura `28800562` proyectada.

## Out of Scope

- `deprovisionClientLifecycle` (offboarding) y `reactivation` cases — esta task implementa SOLO `caseKind='onboarding'`. Offboarding queda como task derivada (CLIENT_LIFECYCLE_V1 §7.2).
- Cambiar la máquina de estados `lifecycle_stage` (TASK-535) — se respeta tal cual.
- Materializar `client_kind` (Active/Self-Serve/Project) como columna — se captura como campo del case (`triggerSource`/metadata) pero NO se agrega columna a `organizations` en esta task (decisión de gobernanza, ver Open Questions).
- El facet financiero MXN en sí (motor multi-currency) — es TASK-990; esta task solo lo invoca para completar el perfil de Berel.
- Templates de checklist management UI (`/api/admin/clients/lifecycle/templates`) más allá del template `standard_onboarding_v1` necesario para el onboarding.
- Migrar pricing/quotes/sample sprints — fuera; solo se benefician de orgs consistentes.

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

`organization_type` deja de ser hand-set. `deriveOrganizationType` es la única fuente. CHECK constraint `organizations_type_lifecycle_consistent` enforce a nivel DB que `active_client ⇒ type ∈ {client, both}`.

### Berel acceptance (end-to-end, Slice 6)

```txt
organization: org-32333527… (existente)
  organization_type: client          (derivado de active_client)
  lifecycle_stage:  active_client
  country:          MX                (derivado de HubSpot, NO default CL)
  tax_id:           PBE970101718 (RFC)
  legal_name:       PINTURAS BEREL SA DE CV
  origin:           hubspot_sync
client_profiles:    ✅ (moneda MXN vía TASK-990)
spaces:             ✅ Space operativo
income 28800562:    ✅ proyectada (MXN/CLP/USD, vía TASK-990)
reliability signals: los 4 en steady=0
```

### Fail-closed

- Onboarding case no transiciona a `completed` sin items required done (CHECK + trigger, CLIENT_LIFECYCLE_V1 §6).
- `upsertCanonicalOrganization` no permite `active_client` + type inconsistente (CHECK).
- Identidad tributaria es gate del wizard (no se completa onboarding sin tax_id/country o disposición explícita).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (signals) PRIMERO — detecta el universo de orgs a medias antes de tocar escritura.
- Slice 1 (SSOT helper + CHECK NOT VALID) antes que cualquier derivación.
- Slice 2 requiere Slice 1.
- Slice 3 (remediación + VALIDATE) requiere Slices 0-2 (el VALIDATE solo pasa tras remediar; el CHECK NOT VALID de Slice 1 no rompe inserts nuevos correctos).
- Slice 4 (orquestador) requiere Slice 1 (escribe vía el helper SSOT).
- Slice 5 (wizard) requiere Slice 4.
- Slice 6 (timeline + Berel) requiere Slices 1-5 + TASK-990 para el facet MXN.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| SSOT helper mal hecho rompe TODAS las puertas | commercial/identity | medium | refactor incremental, no-regresión bit-for-bit por puerta, expand-and-contract | tests por caller |
| CHECK rechaza filas legacy a medias | data | high (si se valida antes de remediar) | `NOT VALID` → remediar (Slice 3) → `VALIDATE`; nunca validar antes | DO block migración aborta si quedan violadores |
| HubSpot deja de mapear country → orgs sin país | integrations | medium | derivar de la company; NULL explícito si falta (no default) | `commercial.organization.incomplete_identity` |
| Orquestador duplica primitivas existentes | commercial | medium | reusar `instantiateClientForParty`; el case lo referencia, no lo duplica (CLIENT_LIFECYCLE_V1 §1) | code review |
| Wizard escribe por N puertas (estado parcial) | product/data | medium | un solo commit atómico = `provisionClientLifecycle` | tests de atomicidad |
| Capability sin grant → 403 | identity | medium | grant en runtime.ts mismo PR | `capability-grant-coverage.test.ts` |
| Berel remediado mal (datos productivos) | data | low-medium | dry-run + allowlist + expected-count abort; coordinar TASK-990 | script output + Sentry |

### Feature flags / cutover

- `CLIENT_LIFECYCLE_ONBOARDING_ENABLED=false` default — gatea el orquestador + wizard.
- `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED=false` default — gatea que las puertas deleguen en el SSOT helper (Slice 1 puede correr en shadow: helper disponible, puertas aún no delegan, hasta validar no-regresión).
- Flags presentes en Production + staging + Preview develop antes de rollout-ready. Redeploy tras cambios de env.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revert PR (signals read-only) | <15 min | yes |
| 1 | flag off (puertas vuelven a escritura directa); CHECK NOT VALID no afecta inserts correctos | <30 min | yes |
| 2 | revert mapper origin | <15 min | yes |
| 3 | remediación es idempotente vía supersede; VALIDATE no se revierte pero no rompe (filas ya consistentes) | 30-90 min | partial |
| 4 | flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` off; tablas nuevas quedan vacías sin consumirse | <15 min | yes |
| 5 | flag off; drawer Finanzas legacy sigue disponible | <15 min | yes |
| 6 | timeline read-only revert; Berel remediación vía supersede con evidencia dry-run | 1-2h | partial |

### Production verification sequence

1. `pnpm pg:doctor` local + staging.
2. Migraciones en staging; `information_schema` confirma columna `origin` + CHECK.
3. Deploy staging flags off → verificar puertas existentes sin cambio (HubSpot sync, Finance create, adopt).
4. Activar `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` staging → re-test puertas (no-regresión + ahora completan type/origin/country).
5. Correr inventario half-baked orgs (Slice 0) + remediar en staging (dry-run → apply allowlist) → VALIDATE constraint.
6. Activar `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` staging → crear cliente por wizard end-to-end (fixture).
7. Verificar Account 360 timeline + los 4 signals en steady=0.
8. Repetir en Production con flags off → activar uno a uno → remediar Berel con allowlist + actor/reason (coordinado TASK-990) → monitorear signals 7 días.

### Out-of-band coordination required

- Coordinar con TASK-990 el momento de completar el facet financiero MXN de Berel (necesita `FINANCE_CORE_MXN_ENABLED`).
- Confirmar con Comercial el template `standard_onboarding_v1` (qué items, owner_role, required, evidence).
- Confirmar valores de `ROLE_CODES` reales para las capabilities (anti-rol-fantasma TASK-935).
- Redeploy Vercel tras cambios de env vars.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `upsertCanonicalOrganization` y es el ÚNICO writer de `greenhouse_core.organizations`; las 4 puertas (HubSpot/Finance/Supplier/adopt) son callers (grep confirma 0 INSERT/UPDATE directos a `organizations` fuera del helper + migraciones).
- [ ] `organization_type` se deriva de `lifecycle_stage`+roles vía `deriveOrganizationType`; CHECK `organizations_type_lifecycle_consistent` está `VALID` en DB.
- [ ] Imposible crear/quedar `lifecycle_stage='active_client'` + `organization_type='other'` (CHECK lo bloquea; signal en steady=0).
- [ ] HubSpot sync deriva `country` real (Berel MX, no default CL) y `tax_id`/`legal_name` cuando existen; NULL explícito si faltan.
- [ ] Los 4 reliability signals existen, wired a `Commercial Health`, validados contra PG real, y en steady=0 post-remediación.
- [ ] Script `remediate-half-baked-orgs.ts` con dry-run/apply/allowlist/actor/reason; apply aborta si mutation count difiere.
- [ ] `client_lifecycle_case` (onboarding) implementado per CLIENT_LIFECYCLE_V1 §6-§10: tablas, state machine, comandos, capabilities (con grants), API, eventos v1 registrados en EVENT_CATALOG.
- [ ] Wizard único de onboarding compone UN comando atómico (`provisionClientLifecycle`); prefill desde origin; tax_id/country como gate.
- [ ] `CreateClientDrawer` redefinido a "completar facet financiero de cliente existente" (ya no pare clientes).
- [ ] Account 360 muestra timeline de lifecycle/completitud.
- [ ] Berel queda completo por la puerta canónica (MX/RFC + perfil MXN + Space + factura proyectada) y los 4 signals en steady=0.
- [ ] Capabilities seedeadas tienen grant en `runtime.ts` (guard `capability-grant-coverage.test.ts` verde).
- [ ] Errores API usan `canonicalErrorResponse`; code paths usan `captureWithDomain(err, 'commercial', …)`.

## Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test`
- Targeted: `pnpm vitest run src/lib/account-360 src/lib/client-lifecycle src/lib/reliability src/lib/commercial/party`
- SQL signals validados contra PG real vía `pnpm pg:connect` (gate TASK-893, columnas DATE).
- Migración: `pnpm pg:connect` + inspeccionar `information_schema` (columna `origin` + CHECK VALID).
- Runtime: wizard end-to-end en staging + Account 360 timeline + reliability overview signals.
- Si cambia UI visible: `pnpm fe:capture --route=<wizard route> --env=staging --hold=3000`.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con carpeta (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-990, TASK-611, TASK-535)
- [ ] `GREENHOUSE_CLIENT_LIFECYCLE_V1` actualizado de "Aceptada, no implementada" → "Implementada (onboarding)"
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` registra los `client.lifecycle.*` v1
- [ ] Auditoría `CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` marcada como resuelta (parcial: onboarding) con fecha
- [ ] Flags verificados con CLI en staging + production; redeploy donde cambió env
- [ ] Evidencia de remediación Berel adjunta en Handoff (dry-run + apply)
- [ ] Gate de cierre: `pnpm test && pnpm build` + verificar workers Cloud Run si se tocó `src/lib/**` consumido por ellos

## Follow-ups

- TASK derivada: `deprovisionClientLifecycle` (offboarding) + `reactivation` cases (CLIENT_LIFECYCLE_V1 §7.2).
- TASK derivada: materializar `client_kind` (Active/Self-Serve/Project) como dimensión si Comercial lo requiere para playbook/NRR.
- TASK derivada: template management UI completa para checklists de lifecycle.
- Considerar derivar `organization_type` 100% (eliminar la columna hand-set) si el CHECK + helper demuestran estabilidad 90 días.

## Open Questions

- ¿`organization_type` se deriva 100% (columna read-only computada) o se mantiene gobernada con CHECK? (recomendación arch: derivar/validar; decidir en Plan Mode con el operador).
- ¿`client_kind` se materializa en esta task o se difiere? (recomendación: diferir; capturar como metadata del case).
- ¿La ruta canónica del wizard es `/agency/clients/new` (Commercial owner) o `/admin/clients/new`? (resolver en Plan Mode con IA + domain boundary).
- ¿El template `standard_onboarding_v1` lo define Comercial o se arranca con un default mínimo (identidad + finanzas + space) extensible? (coordinación out-of-band).
- ¿Berel se remedia al cierre de esta task o se espera a que TASK-990 active `FINANCE_CORE_MXN_ENABLED` en producción? (recomendación: coordinar; el facet financiero MXN depende de TASK-990).
