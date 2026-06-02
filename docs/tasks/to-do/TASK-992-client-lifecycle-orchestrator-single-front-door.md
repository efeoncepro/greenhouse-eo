# TASK-992 — Client Lifecycle Orchestrator + Single Front Door

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial` (owner) — touches `finance` (client_profiles facet), `identity` (capabilities), `data` (BQ projection), `reliability`.
- Blocked by: `TASK-991` (necesita el helper SSOT `upsertCanonicalOrganization`). Secuencia: `991 → 990 → 992`. NO bloquea el outcome de negocio de Berel (AR en MXN), que se cierra con 991 + 990.
- Branch: `task/TASK-992-client-lifecycle-orchestrator`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Delta 2026-06-02 — prerequisito TASK-991 code-complete

TASK-991 (foundation) está **code complete en `develop`**: `upsertCanonicalOrganization` (SSOT) + `deriveOrganizationType` ya existen y son el writer canónico de `organizations` que esta task debe reusar (NO crear otro). La columna `origin` ya existe. Falta solo el rollout de TASK-991 (flag flip + CHECK), que NO bloquea el diseño de esta task pero sí su validación end-to-end. Al implementar: el aggregate/wizard escriben org SOLO vía `upsertCanonicalOrganization`.

## Summary

Activar el orquestador canónico `client_lifecycle_case` (caseKind `onboarding`) ya especificado en `GREENHOUSE_CLIENT_LIFECYCLE_V1` (Aceptada, no implementada), exponer UNA sola puerta de alta de cliente (wizard de onboarding que compone un comando atómico), redefinir el drawer de Finanzas a "completar el facet financiero de un cliente existente", y agregar un timeline de lifecycle/touchpoints en el Account 360. Construye sobre el helper SSOT de TASK-991.

## Why This Task Exists

Auditoría `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md`: además de la fila a medias (que cierra TASK-991), el operador no tiene una puerta única para dar de alta un cliente — hay ≥4 caminos sin canónica declarada (drawer Finanzas, adopt Cotizador, sync HubSpot automático, admin), y el nacimiento no es un proceso observable con origin + etapas + touchpoints. `GREENHOUSE_CLIENT_LIFECYCLE_V1` ya especifica el `client_lifecycle_case` orquestador (espejo de TASK-760 offboarding de colaboradores) pero **nunca se implementó**. Esta task lo activa para onboarding + cierra la UX terrible reportada (una puerta, un recorrido, un destino 360).

## Goal

- El operador da de alta un cliente por UNA puerta canónica (wizard) que compone `provisionClientLifecycle` (un commit atómico), con prefill desde el origin.
- El nacimiento es un `client_lifecycle_case` observable (origin + etapas + completitud de facets) con timeline en el Account 360.
- El drawer de Finanzas se redefine a "completar facet financiero de cliente existente" — ya no pare clientes.
- El sync HubSpot dispara un onboarding case en `pending_completion` en vez de dejar la org a medias.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — **contrato canónico a implementar VERBATIM** (state machine §6, comandos §7, capabilities §8, API §9, eventos §10, HubSpot §11). NO re-especificar; referenciar e implementar.
- `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` — origen + propuesta (Slices 4-6).
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `clients` = extensión financiera en `active_client`; `instantiateClientForParty` único path.
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611/612/613) — facets + entry routes (`/agency/organizations/[id]`, `/finance/clients/[id]`) donde vive el timeline.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — Commercial pare el party/lifecycle; Finance completa `client_profiles`.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — registrar `client.lifecycle.*` v1.
- TASK-760 (`work_relationship_offboarding_cases`) — patrón fuente battle-tested que CLIENT_LIFECYCLE_V1 espeja.

Reglas obligatorias (lentes arch + finance + product design):

- **(arch SSOT)** El orquestador escribe `organizations` SOLO vía `upsertCanonicalOrganization` (TASK-991). NUNCA INSERT directo.
- **(arch)** NO duplicar `instantiateClientForParty` — el case lo referencia/invoca (CLIENT_LIFECYCLE_V1 §1).
- **(arch)** State machine `client_lifecycle_case` con CHECK + triggers PG append-only (§6). Eventos v1 (§10).
- **(arch capability grant)** Cada capability seedeada (`client.lifecycle.case.*`) con grant en `src/lib/entitlements/runtime.ts` MISMO PR (guard `capability-grant-coverage.test.ts`, TASK-873/935). **OJO roles fantasma:** CLIENT_LIFECYCLE_V1 §8 menciona `commercial_admin`/`operations` que NO existen en `ROLE_CODES` — colapsar a `EFEONCE_ADMIN` + `FINANCE_ADMIN` (open/resolve) + route_groups reales (advance/read). Verificar contra `src/config/role-codes.ts`.
- **(finance)** El `client_profiles` es un FACET completado dentro del lifecycle (con su moneda — MXN si TASK-990 está activo), NUNCA puerta paralela con defaults divergentes. Respetar boundary Commercial↔Finance.
- **(product design / IA)** UNA puerta canónica (wizard). El drawer Finanzas se redefine a "completar facet". El Account 360 con facets es el destino + timeline = wayfinding "you are here".
- **(product design / forms-ux)** Wizard Lane C: pasos + progress + back-preserva-data + autosave (>3 pasos) + validación per-step + commit atómico único. Smart prefill mostrando qué se infirió (editable). NUNCA N llamadas a N puertas.
- NUNCA `Sentry.captureException` directo: `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`.
- NUNCA error API crudo: `canonicalErrorResponse(code)` es-CL + `redactErrorForResponse`.
- Microcopy validada con `greenhouse-ux-writing` (es-CL); strings en `src/lib/copy/*`.

## Normative Docs

- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- Doc funcional Account 360 / organization workspace (verificar path en Plan Mode).

## Dependencies & Impact

### Depends on

- **TASK-991** — `upsertCanonicalOrganization` (SSOT), `deriveOrganizationType`, reconciliación + signals. **Prerequisito duro.**
- `GREENHOUSE_CLIENT_LIFECYCLE_V1` (contrato del aggregate, comandos, eventos, capabilities).
- `instantiateClientForParty` (`src/lib/commercial/party/commands/instantiate-client-for-party.ts`) — reusado por el cascade del case.
- Account 360 projection (TASK-611): `src/lib/organization-workspace/projection.ts`.
- `CreateClientDrawer` (`src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx`) — a redefinir.
- Adopt (`src/app/api/commercial/parties/adopt/route.ts`) + Cotizador (`QuoteBuilderShell.tsx`) — disparan el case.

### Blocks / Impacts

- Todas las puertas de alta convergen en el case → fin de la fragmentación de UX.
- TASK-990: si está activo, el wizard completa el facet financiero MXN en el paso Finanzas.

### Files owned

- `src/lib/client-lifecycle/**` (aggregate + comandos `provisionClientLifecycle`, `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`, `resolveLifecycleBlocker`)
- `src/app/api/admin/clients/[organizationId]/lifecycle/**` + `src/app/api/admin/clients/lifecycle/**` (per CLIENT_LIFECYCLE_V1 §9)
- `src/views/greenhouse/**/onboarding-wizard/**` [verificar path en Plan Mode]
- `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` (redefinir)
- `src/views/greenhouse/**/organization-workspace/**` (timeline en Account 360)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capabilities + grants)
- `src/lib/copy/*` (microcopy es-CL)
- `migrations/*task-992*.sql` (tablas del aggregate)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta eventos `client.lifecycle.*`)

## Current Repo State

### Already exists

- Contrato completo del orquestador: `GREENHOUSE_CLIENT_LIFECYCLE_V1` (specced, 0 implementación).
- `instantiateClientForParty`, Account 360 facets (TASK-611), drawer Finanzas, adopt Cotizador.
- Helper SSOT `upsertCanonicalOrganization` (cuando TASK-991 cierre).

### Gap

- `client_lifecycle_case` no existe (0 implementación de CLIENT_LIFECYCLE_V1).
- No hay puerta única de alta; 4 caminos sin canónica.
- Account 360 no muestra estado de nacimiento/lifecycle.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Aggregate `client_lifecycle_case` (onboarding) per CLIENT_LIFECYCLE_V1

Implementar **verbatim** el contrato §6-§10 (NO re-especificar):

- Tablas + state machine §6 (case status + checklist item status + transitions matrix + triggers PG append-only + CHECK no-completed-con-required-pendientes).
- Comandos §7 en `src/lib/client-lifecycle/commands/`: `provisionClientLifecycle` (caseKind `onboarding`), `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`. Atomic + idempotent + outbox v1. El cascade de `resolveLifecycleCase` (onboarding completed) invoca `instantiateClientForParty` si no existe + marca facets (profile, space) como pasos del checklist. Escribe `organizations` SOLO vía `upsertCanonicalOrganization` (TASK-991).
- `deprovisionClientLifecycle` (offboarding) + `reactivation` → **OUT** (ver Out of Scope).
- Capabilities §8 + grant en `runtime.ts` mismo PR (anti-rol-fantasma: colapsar a roles reales de `role-codes.ts`).
- API §9: `POST /api/admin/clients/[organizationId]/lifecycle/onboarding`, `PATCH …/cases/[caseId]/items/[itemCode]`, `POST …/cases/[caseId]/resolve`, `GET …/cases`, `GET …/lifecycle` (active case + history + checklist), `GET …/lifecycle/health`. `requireServerSession` + capability granular + `canonicalErrorResponse`.
- Eventos §10 `client.lifecycle.*` v1 + registro en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta.
- Template `standard_onboarding_v1` (items mínimos: identidad tributaria, facet financiero, space) extensible.
- Reliability signals del lifecycle (open cases, overdue, blocked) per §11 health contract.
- Tests: state machine (transiciones válidas/ilegales), comandos atómicos + idempotencia, cascade, capability gates.

### Slice 2 — Puerta única de onboarding (wizard) + redefinición del drawer Finanzas

- Wizard canónico (forms-ux Lane C): pasos `Origen → Identidad → Comercial → Finanzas → Space → Confirmar`. Ruta `[verificar Plan Mode: /agency/clients/new (Commercial owner) vs /admin/clients/new]`. Smart prefill desde el origin (HubSpot company / Nubox sale), editable, mostrando qué se infirió. Un solo commit atómico = `provisionClientLifecycle`. Autosave por paso. Back preserva data. Validación per-step. `tax_id`/`country` como gate del paso Identidad.
- Redefinir `CreateClientDrawer` → "Completar perfil financiero de cliente existente" (facet finance), NO parir clientes. Microcopy es-CL.
- El adopt del Cotizador dispara `provisionClientLifecycle` con `origin='adopt'`. El sync HubSpot dispara un onboarding case `pending_completion` en vez de dejar la org a medias.
- Tests: atomicidad del commit, prefill, gate de identidad, redefinición del drawer.
- Evidencia visual: `pnpm fe:capture --route=<wizard> --env=staging --hold=3000`.

### Slice 3 — Timeline de lifecycle/touchpoints en Account 360

- Agregar al organization workspace shell (TASK-611) un timeline en cabecera: origin + etapas del lifecycle + completitud de facets ("falta tax_id", "falta space", "falta perfil"). Wayfinding "you are here". Read-only desde `client_lifecycle_case` + `organization_lifecycle_history`.
- Tests + evidencia visual.

## Out of Scope

- `deprovisionClientLifecycle` (offboarding) + `reactivation` cases → task derivada (CLIENT_LIFECYCLE_V1 §7.2).
- El helper SSOT, reconciliación `organization_type`, derivación country/tax, signals de completitud → **TASK-991**.
- El motor multi-currency MXN → **TASK-990** (el wizard solo invoca el facet financiero existente).
- Materializar `client_kind` como columna (se captura como metadata del case).
- Template management UI completa (más allá de `standard_onboarding_v1`).

## Detailed Spec

Contrato del aggregate, comandos, state machine, eventos, capabilities y API: **`GREENHOUSE_CLIENT_LIFECYCLE_V1` §5-§11 verbatim.** Esta task NO redefine ese contrato; lo implementa. Diferencias de scope respecto a la spec:

- Solo `caseKind='onboarding'` (offboarding/reactivation diferidos).
- Capabilities colapsadas a `ROLE_CODES` reales (anti-rol-fantasma TASK-935): `client.lifecycle.case.open|resolve` → EFEONCE_ADMIN + FINANCE_ADMIN; `advance|read` → route_groups reales (commercial/finance) + admins.
- El wizard (no en la spec V1) es la superficie canónica de la puerta única; compone `provisionClientLifecycle`.

### Berel

Para cuando esta task corra, Berel ya tiene identidad canónica (TASK-991) y facet financiero MXN (TASK-990). El wizard NO se usa para re-crear Berel; Berel valida el **timeline** del Account 360 (todas las facets pobladas + origin + etapas). El wizard se valida con un cliente nuevo de prueba en staging.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Requiere TASK-991 cerrada (helper SSOT disponible).
- Slice 1 (aggregate) antes que Slice 2 (wizard compone `provisionClientLifecycle`).
- Slice 3 (timeline) requiere Slice 1 (lee el case).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| Aggregate duplica primitivas existentes | commercial | medium | reusar `instantiateClientForParty` + `upsertCanonicalOrganization`; el case referencia, no duplica | code review |
| Wizard escribe por N puertas (estado parcial) | product/data | medium | un solo commit atómico = `provisionClientLifecycle` | tests de atomicidad |
| Capability sin grant → 403 | identity | medium | grant en runtime.ts mismo PR; anti-rol-fantasma | `capability-grant-coverage.test.ts` |
| Rol fantasma de la spec V1 (commercial_admin/operations) | identity | high si se copia literal | colapsar a ROLE_CODES reales; verificar `role-codes.ts` | grant-coverage test |
| State machine mal implementada (completed con required pendiente) | commercial | medium | CHECK + trigger PG (§6); tests de transiciones ilegales | trigger DB |
| Drawer Finanzas redefinido rompe flujo legacy | finance/ux | medium | flag; drawer legacy disponible hasta validar | — |

### Feature flags / cutover

- `CLIENT_LIFECYCLE_ONBOARDING_ENABLED=false` default — gatea aggregate + wizard. Presente en Production + staging + Preview develop. Redeploy tras cambios de env.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag off; tablas nuevas quedan vacías sin consumirse | <15 min | yes |
| 2 | flag off; drawer Finanzas legacy sigue disponible | <15 min | yes |
| 3 | timeline read-only revert | <15 min | yes |

### Production verification sequence

1. Confirmar TASK-991 cerrada (helper SSOT live).
2. Migración staging (tablas aggregate); `information_schema` confirma + triggers.
3. Deploy staging flag off → sin cambio.
4. Activar `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` staging → crear cliente nuevo por wizard end-to-end (fixture) → verificar case + checklist + cascade + eventos.
5. Verificar Account 360 timeline + signals del lifecycle steady.
6. Repetir Production flag off → activar → validar con cliente nuevo controlado → monitorear 7 días.

### Out-of-band coordination required

- TASK-991 debe estar cerrada (dependencia dura).
- Confirmar template `standard_onboarding_v1` con Comercial (items, owner_role, required, evidence).
- Confirmar `ROLE_CODES` reales para capabilities (anti-rol-fantasma).
- Confirmar ruta del wizard (`/agency/clients/new` vs `/admin/clients/new`) con IA + domain boundary.
- Redeploy Vercel tras cambios de env.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `client_lifecycle_case` (onboarding) implementado per CLIENT_LIFECYCLE_V1 §6-§10: tablas, state machine (CHECK + triggers append-only), comandos atómicos, API, eventos v1 registrados en EVENT_CATALOG.
- [ ] El aggregate escribe `organizations` SOLO vía `upsertCanonicalOrganization` (TASK-991); reusa `instantiateClientForParty` (no duplica).
- [ ] Wizard único compone UN comando atómico (`provisionClientLifecycle`); prefill desde origin; `tax_id`/`country` gate; autosave; back preserva data.
- [ ] `CreateClientDrawer` redefinido a "completar facet financiero de cliente existente" (ya no pare clientes).
- [ ] Adopt Cotizador + sync HubSpot disparan el onboarding case (HubSpot en `pending_completion`, no org a medias).
- [ ] Account 360 muestra timeline de lifecycle/completitud.
- [ ] Capabilities `client.lifecycle.case.*` seedeadas con grant en `runtime.ts` a ROLE_CODES reales (guard `capability-grant-coverage.test.ts` verde; 0 roles fantasma).
- [ ] State machine rechaza `completed` con required pendientes (test de transición ilegal verde).
- [ ] Errores usan `canonicalErrorResponse`; code paths `captureWithDomain('commercial', …)`; microcopy validada `greenhouse-ux-writing`.

## Verification

- `pnpm pg:doctor`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm test`
- `pnpm vitest run src/lib/client-lifecycle src/lib/commercial/party src/lib/account-360`
- Migración: `information_schema` (tablas + triggers).
- Runtime: wizard end-to-end staging + Account 360 timeline + lifecycle health signals.
- `pnpm fe:capture --route=<wizard route> --env=staging --hold=3000` (UI visible).
- Gate de cierre: `pnpm test && pnpm build`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-991, TASK-990, TASK-611, TASK-535)
- [ ] `GREENHOUSE_CLIENT_LIFECYCLE_V1` → "Implementada (onboarding)"
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` registra `client.lifecycle.*` v1
- [ ] Auditoría `CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md` marcada resuelta (con TASK-991) + fecha
- [ ] Flags verificados con CLI staging + production; redeploy donde cambió env
- [ ] Doc funcional + manual de uso de la puerta única de alta (docs/documentation + docs/manual-de-uso)

## Follow-ups

- TASK derivada: `deprovisionClientLifecycle` (offboarding) + `reactivation` (CLIENT_LIFECYCLE_V1 §7.2).
- TASK derivada: materializar `client_kind` (Active/Self-Serve/Project) si Comercial lo requiere.
- TASK derivada: template management UI completa para checklists de lifecycle.

## Open Questions

- ¿Ruta canónica del wizard `/agency/clients/new` (Commercial owner) o `/admin/clients/new`? (resolver con IA + domain boundary en Plan Mode).
- ¿El template `standard_onboarding_v1` lo define Comercial o se arranca con default mínimo extensible (identidad + finanzas + space)?
- ¿El drawer Finanzas redefinido coexiste con el wizard o se elimina? (recomendación: coexiste — wizard pare, drawer completa facet).
