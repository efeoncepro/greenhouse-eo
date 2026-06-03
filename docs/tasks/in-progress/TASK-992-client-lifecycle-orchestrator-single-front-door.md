# TASK-992 — Client Lifecycle Orchestrator + Single Front Door

## Delta 2026-06-03 — el ítem `provision_client_users_access` ahora es interactivo (TASK-1001)

El ítem #9 del checklist `standard_onboarding_v1` (`provision_client_users_access`, owner identity) dejó de ser solo lectura: TASK-1001 cableó un `PortalUsersPanel` interactivo en el timeline (`LifecycleTimeline.tsx`) que siembra candidatos desde HubSpot e invita personas al portal (`client_*`) vía el helper SSOT `inviteClientPortalUser` + capability `client.lifecycle.portal_user.invite`. **La GVC de ese panel queda incluida en la ronda GVC pendiente de esta task** (misma surface flag-gated, requiere flag ON + caso sembrado — p.ej. la validación Berel end-to-end). Nada de TASK-1001 cambia el wizard de nacimiento (vive en el checklist). Spec: `in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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

## Delta 2026-06-02 — Lifecycle → in-progress + Open Questions resueltas (pre-FASE-1)

Movida a `in-progress`. Se trabaja **en `develop`** (instrucción del operador: NO crear branch `task/TASK-992-*`). Las 3 Open Questions resueltas con la opción más robusta/canónica (rationale documentado pre-Discovery, regla del proceso):

- **Q1 — Ruta canónica del wizard → `/agency/clients/new` (Commercial owner).** Rationale: el domain boundary `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1` asigna el *nacimiento* del party/lifecycle a **Commercial** (Finance solo completa `client_profiles`); el `Domain` de esta task es `commercial`; `Files owned` ya declara `/agency/clients/new` + las vistas en `src/views/greenhouse/agency/clients/*`; el mockup vive en `/agency/clients/{new,...}/mockup/`. El namespace `/api/admin/clients/.../lifecycle` (CLIENT_LIFECYCLE_V1 §9/§12) es la API/drawer admin del case — NO la puerta de alta. La **puerta** (wizard UI) es Commercial → `/agency/clients/new`.
- **Q2 — Template `standard_onboarding_v1` → default mínimo extensible, seedeado en migración (§5.5).** Items mínimos canónicos: identidad tributaria (`tax_id`+`country`), facet financiero (`client_profiles`, con moneda — MXN si TASK-990 activo), space. Rationale: la "template management UI completa" está Out of Scope; el contrato §5.3/§5.4/§5.5 ya modela templates+items data-driven (extensible sin migración nueva). Se arranca con el mínimo derivable del Goal; Comercial extiende async (no bloqueante). NO hardcodear el checklist — vive en `client_lifecycle_checklist_templates/items`.
- **Q3 — Drawer Finanzas → coexiste (recomendación de la spec).** El wizard **pare** clientes; `CreateClientDrawer` se **redefine** a "completar facet financiero de cliente existente" (ya no pare). Distinto job. Detrás del flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED`, el drawer legacy queda disponible hasta validar el cutover (risk matrix). Rationale: el Goal lo declara redefinido (no eliminado); coexistencia con propósitos separados = no fragmentación (la puerta es una sola: el wizard).

**Roles (anti-rol-fantasma, TASK-935):** CLIENT_LIFECYCLE_V1 §8 menciona `commercial_admin`/`operations` que NO existen en `ROLE_CODES`. Colapso canónico a verificar en FASE-Plan: `client.lifecycle.case.open|resolve` → `EFEONCE_ADMIN` + `FINANCE_ADMIN`; `advance|read` → route_groups reales (`internal`/`finance`) + admins. Verificar contra `src/config/role-codes.ts` + guard `capability-grant-coverage.test.ts`.

> **Estado de ejecución:** la implementación (Slices 1-3, contrato 749 líneas de `CLIENT_LIFECYCLE_V1` verbatim + cablear wizard + timeline) es P1/effort Alto → requiere **checkpoint humano tras el Plan** (FASE 4). Discovery → Audit → Connections → Plan se ejecutan antes de tocar código.

## Delta 2026-06-02 — prerequisito TASK-991 code-complete

TASK-991 (foundation) está **code complete en `develop`**: `upsertCanonicalOrganization` (SSOT) + `deriveOrganizationType` ya existen y son el writer canónico de `organizations` que esta task debe reusar (NO crear otro). La columna `origin` ya existe. Falta solo el rollout de TASK-991 (flag flip + CHECK), que NO bloquea el diseño de esta task pero sí su validación end-to-end. Al implementar: el aggregate/wizard escriben org SOLO vía `upsertCanonicalOrganization`.

## Delta 2026-06-02 — Mockup visual APROBADO (referencia vinculante) + reglas duras de cableado

El wizard completo + sus superficies fueron **mockeados, auditados (greenhouse-ux + modern-ui + state-design + a11y-architect + greenhouse-ux-writing en loop GVC) y APROBADOS por el operador** el 2026-06-02. La implementación de Slice 2 (wizard) y Slice 3 (timeline) **NO es un diseño de cero: es cablear estos mockups a runtime**. El mockup es la referencia visual/UX vinculante.

**Artefactos aprobados (referencia — NO el runtime):**

| Artefacto | Path |
| --- | --- |
| Shell wizard 6 pasos + 6 modales/dialogs + success | `src/views/greenhouse/agency/clients/mockup/ClientOnboardingMockupView.tsx` |
| Drawer Finanzas redefinido ("completar facet", no parir) | `src/views/greenhouse/agency/clients/mockup/FinanceFacetDrawerMockup.tsx` |
| Timeline lifecycle Account 360 | `src/views/greenhouse/agency/clients/mockup/LifecycleTimelineMockup.tsx` |
| Mock data tipada | `src/views/greenhouse/agency/clients/mockup/client-onboarding-data.ts` |
| Copy es-CL (tuteo chileno) | `src/lib/copy/client-onboarding.ts` |
| Rutas mockup | `src/app/(dashboard)/agency/clients/{new,finance-facet,lifecycle}/mockup/page.tsx` |
| Scenario GVC (10 frames del flujo) | `scripts/frontend/scenarios/client-onboarding-wizard.scenario.ts` |

### ⚠️ Reglas duras — Mockup aprobado → Runtime

- **NUNCA borrar, mover ni modificar los archivos `*/mockup/*` ni las rutas `/mockup/` al implementar.** El mockup **se mantiene** como referencia visual aprobada + escenario GVC de regresión (igual que `contractors/mockup/`, `sample-sprints/mockup/`). Es el contrato visual vinculante, no scaffolding desechable.
- **NUNCA implementar el runtime DENTRO de `/mockup/`.** El runtime vive en rutas y vistas **fuera** de `/mockup/`: ruta real `/agency/clients/new` (+ `/agency/clients/[id]/finance` para el drawer, y el timeline en el organization workspace shell TASK-611), vistas en `src/views/greenhouse/agency/clients/*` (sin `/mockup/`). Extraer el shell runtime fuera de `/mockup/` y conectar datos reales — patrón canónico CLAUDE.md ("¿La pantalla viene de `/mockup/` y pasa a runtime? → extraer shell runtime fuera de `/mockup/` y migrar el copy productivo a `src/lib/copy/*`").
- **NUNCA re-diseñar el layout, la jerarquía, los microcopys ni las microinteracciones aprobadas.** El runtime debe **igualar visualmente** el mockup (dos paneles: rail vertical con stepper + progreso + autosave / panel del paso / footer sticky; success conserva el rail al 100%; chips de inferencia; rail con datos derivados). Verificar paridad con `pnpm fe:capture:diff <mockup-capture> <runtime-capture>` antes de cerrar.
- **NUNCA re-escribir el copy desde cero.** `src/lib/copy/client-onboarding.ts` ya está en **es-CL tuteo chileno** (no voseo) y revisado por `greenhouse-ux-writing`. El runtime consume ESE diccionario. Si emergen strings nuevos del cableado, extenderlo respetando el registro (tuteo chileno, `empresa` no "company", errores [qué]+[por qué]+[cómo]).
- **NUNCA reintroducir los bug class ya cazados en el mockup:** (a) `key` spreadeado en `motion.div` (React 19 lo rechaza — pasar `key` directo, no en el spread); (b) hydration por formateo de fecha/hora con Intl en SSR (usar string determinista o `timeZone` fijo + render client-only). El runtime debe quedar **console-limpio** (verificado por probe Playwright en el mockup).
- **NUNCA usar date inputs nativos.** El mockup ya usa `GreenhouseDatePicker` (dd/mm/yyyy). El runtime lo mantiene.
- **SIEMPRE** convertir a comportamiento real (lo que el mockup simula) SIN cambiar la superficie visual:
  - El commit del paso Confirmar invoca `provisionClientLifecycle` (un solo commit atómico), escribe org SOLO vía `upsertCanonicalOrganization`, y navega a `/agency/clients/[id]/lifecycle`.
  - El picker HubSpot/Nubox hace búsqueda real (agregar **skeleton de carga + estado degradado** que el mockup dejó como copy `hubspotPicker.loading`/`degraded*` pero sin cablear — state-design).
  - El diálogo "ya existe" debe **ramificar de verdad**: "Usar el existente" carga la org/cliente existente (no avanzar a crear duplicado); "Seguir creando" continúa. En el mockup ambos avanzan igual — eso es lo que el runtime corrige.
  - El gate de Identidad (`tax_id` + `country`) y el gate del paso Origen (no avanzar sin empresa elegida) ya están en el mockup — preservarlos.
- **SIEMPRE** mantener el mockup sincronizado si el contrato visual cambia durante la implementación: si el operador aprueba un cambio visual nuevo, actualizar el mockup Y el runtime en el mismo PR (el mockup nunca queda desactualizado respecto al runtime aprobado).
- **Capabilities**: la matriz `relationship × capability` del wizard usa `requireServerSession` + capability granular (Slice 1) — el mockup no las gatea (es mock). El runtime SÍ. Grant en `runtime.ts` mismo PR (anti-rol-fantasma, colapsar a roles reales de `role-codes.ts`).

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
- `src/views/greenhouse/agency/clients/mockup/**` + rutas `/agency/clients/{new,finance-facet,lifecycle}/mockup/` + `scripts/frontend/scenarios/client-onboarding-wizard.scenario.ts` — **referencia visual APROBADA, NO modificar/borrar al implementar** (ver Delta 2026-06-02)
- `src/views/greenhouse/agency/clients/*` (vistas runtime del wizard + drawer, FUERA de `/mockup/`) + ruta runtime `/agency/clients/new`
- `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` (redefinir a "completar facet financiero")
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

> **Es cablear el mockup APROBADO a runtime, no diseñar de cero.** Ver "Delta 2026-06-02 — Mockup visual APROBADO" + sus reglas duras. El mockup (`src/views/greenhouse/agency/clients/mockup/**`, copy `src/lib/copy/client-onboarding.ts`, scenario GVC) **se mantiene** como referencia vinculante; el runtime vive FUERA de `/mockup/` e iguala el mockup visualmente (`pnpm fe:capture:diff`).

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

### Berel — activación pendiente (estado real verificado 2026-06-02, post TASK-990)

> ⚠️ Corrección a la suposición previa: Berel **NO** tiene aún facet financiero ni Cliente. Tiene **organización** (TASK-991) pero le falta el registro `clients` + `client_profiles` + el income. **Berel es el caso de validación real del wizard de ESTA task** (no solo del timeline): el wizard lo crea como Cliente con billing MXN, y eso destraba su factura. Documentado acá para que la sesión nueva lo tenga servido.

**Lo que YA está listo (no rehacer):**

- ✅ **Organización** `org-32333527-02a8-487b-819e-6f76a761777d` (TASK-991 remedió: `organization_type='client'`, `country='MX'`, `tax_id='PBE970101718'` RFC, `legal_name='PINTURAS BEREL SA DE CV'`, `lifecycle_stage='active_client'`, `hubspot_company_id='55405407542'`).
- ✅ **Cuenta Global66 MXN** (`account_id='global-66-mxn-mxn'`, `currency='MXN'`, fintech, provider `global66`, CLABE `703180052006860943`, activa, saldo 0) — creada por el operador en la UI de instrumentos de pago. NO recrear (PG es compartida staging/prod).
- ✅ **Flags MXN finance** (`FINANCE_CORE_MXN_ENABLED`, `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`, `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED`, `FINANCE_MXN_PAYMENT_ORDERS_ENABLED`) ON en `staging` + `Preview (develop)`, live. Producción queda para el release `develop→main`.
- ✅ **Backfill del income listo**: `scripts/finance/task-990-berel-income-native-backfill.ts` (allowlist 28800562, reusa `upsertIncomeFromSale`, inyecta plano extranjero del XML, resuelve org por RFC + client por el HubSpot link del org, dry-run default, `--apply` gated por `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED` + `FINANCE_CORE_MXN_ENABLED`). **Hoy falla claro** porque Berel no tiene Cliente ("Onboard Berel as a client first") — por diseño, no fuerza nada.

**Lo que FALTA (orden de activación, post o durante esta task):**

1. **Threadear MXN en el facet financiero del wizard** (gap real de TASK-990 que esta task cierra en el paso Finanzas): `instantiateClientForParty` hoy tipa `billingDefaults.paymentCurrency` como `'CLP' | 'USD' | 'UF' | 'UTM'` — **falta MXN**. El paso Finanzas del wizard (que escribe `client_profiles.payment_currency`) debe aceptar MXN cuando TASK-990 está activo. Verificar también CHECK de `client_profiles.payment_currency` en PG (widen si existe). Single source: derivar del dominio/registry, no hardcodear (mismo patrón que el dropdown del instrumento de pago, fix `CURRENCY_DOMAIN_SUPPORT.finance_core`).
2. **Crear a Berel por el wizard** (origin = HubSpot company `55405407542` / org existente `org-32333527`), billing **MXN**, terms 30 días. El `provisionClientLifecycle` crea el `clients` + `client_profiles` (facet financiero MXN) + space, todo atómico. El diálogo "ya existe" debe cargar el org existente (no duplicar). `tax_id`/`country` ya vienen del org.
3. **Proyectar la factura (income/AR)**: una vez exista el Cliente, correr el backfill `--apply` (con los flags + gate en env). Crea la **factura impaga**: `native_amount=89960 MXN`, `total_amount_clp=4617647` (legal, intacto), snapshot rate 51,33, `is_tax_exempt=true` (DTE 110), `due_date=2026-07-01`, **`payment_status='pending'`, `amount_paid=0` — 30 días de crédito, AÚN NO SE COBRA. El cobro (settlement nativo + resultado cambiario) es un evento futuro y separado, cuando Berel pague.**
4. **Verificar end-to-end**: Account 360 timeline de Berel con todas las facets pobladas (identidad + financiero MXN + space) + la factura con sus 3 planos (native/functional/reporting) + señales MXN (`finance.fx.*`, `finance.multi_currency.native_equivalent_drift`, `finance.fx_gain_loss.unclassified`) en steady `ok`.

**El wizard también se valida con un cliente NUEVO de prueba en staging** (no solo Berel) — Berel es el caso MXN real; el cliente de prueba cubre el flujo genérico CLP.

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
