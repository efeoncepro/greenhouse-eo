# TASK-1648 — Guard `is_operating_entity` en los readers client-facing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

Agregar `AND is_operating_entity = FALSE` (o el equivalente en el reader) a las 5 superficies
client-facing que hoy filtran sólo por `organization_type IN ('client','both')`, para que la
entidad legal operadora nunca pueda aparecer —ni ser seleccionada— como cliente.

## Why This Task Exists

El 2026-08-06 se detectó que `EO-ORG-0007` (Efeonce, `is_operating_entity=true`) tenía
`organization_type='client'` y por eso aparecía **primera** en `/finance/clients` (17 filas,
orden por `updated_at DESC`) y en el picker de organizaciones del wizard de onboarding. Peor:
`resolveFinanceClientContext` la aceptaba como cliente válido para emitir un ingreso, siendo
la misma org el emisor fiscal — autofacturación posible.

El tipo ya se corrigió a `'other'`
(`scripts/commercial/reset-organization-commercial-role.ts`, 2026-08-06), así que el síntoma
está apagado. Pero **la causa sigue**: los readers no consultan `is_operating_entity`. Si
mañana cualquier puerta vuelve a promover la org a `client` —y `deriveOrganizationType` es
monótona, o sea promueve fácil y nunca degrada— el problema reaparece idéntico y en silencio.

El patrón correcto ya existe y está probado en el repo: `src/app/(dashboard)/growth/aeo/page.tsx:107`
filtra `!org.isOperatingEntity`. Es hoy la **única** superficie de negocio que lo hace.

## Goal

Que ninguna superficie client-facing pueda listar, resolver o aceptar la entidad legal operadora
como cliente, con independencia del valor de `organization_type`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` §Organization Types — los tres
  ejes ortogonales (identidad legal / rol comercial / capabilities) y por qué la operadora lleva
  `'other'`.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Cliente` como objeto canónico.
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` — invariantes org/cliente.

## Normative Docs

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — puerta canónica de cliente en Finance.
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — lifecycle y puerta única de nacimiento.

## Dependencies & Impact

### Depends on

- Nada. La corrección de datos de `EO-ORG-0007` (`organization_type` → `'other'`) ya está
  aplicada vía `scripts/commercial/reset-organization-commercial-role.ts` el 2026-08-06.

### Blocks / Impacts

- `TASK-1649` (revisión del `space` y `client_profiles` de Efeonce): si esta task cierra la
  puerta por flag, aquella decide si además hay que retirar las filas heredadas de marzo 2026.

### Files owned

- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/client-onboarding/org-search.ts`

## Current Repo State

### Already exists

- Patrón correcto aplicado por flag: `src/app/(dashboard)/growth/aeo/page.tsx:107`
  (`.filter(org => org.active && !org.isOperatingEntity && …)`).
- Guards por flag en brand assets: `src/lib/account-360/organization-brand-assets.ts:201,365,490`,
  `src/lib/account-360/organization-brand-assets-discovery.ts:281,420`.
- Columna `is_operating_entity` expuesta por la vista `organization_360`
  (`migrations/20260608230303037_task-999-*.sql:146`).

### Gap

- `src/app/api/finance/clients/route.ts:102-105` — filtra `o.active = TRUE` +
  `COALESCE(o.organization_type,'other') IN ('client','both')`. Sin guard de flag.
- `src/app/api/finance/clients/[id]/route.ts:273-274` — idem.
- `src/lib/finance/canonical.ts:196-197` y `:241-242` — `resolveFinanceClientContext`, la
  validación estricta de los write paths de income. Sin guard.
- `src/lib/finance/postgres-store-slice2.ts:1374-1375` — backfill `INSERT…SELECT` a
  `client_profiles`. Sin guard.
- `src/lib/client-onboarding/org-search.ts:36-44` — picker del wizard, `ORDER BY updated_at DESC`.
  Sin guard.
- `src/lib/api-platform/resources/organizations.ts:207-210` — lane `?type=client` sobre
  `organization_360`; la vista expone el flag pero el filtro no lo usa `[verificar si aplica]`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/app/api/finance/**` + `src/lib/finance/**` + `src/lib/client-onboarding/**`
- Future candidate home: `remain-shared`
- Boundary: el reader canónico de cliente de Finance (`resolveFinanceClientContext`) y el
  buscador de orgs del onboarding; consumers autorizados son las rutas de Finanzas y el wizard.
- Server/browser split: el predicado vive en route handlers y readers server-side; el browser
  sólo recibe la lista ya filtrada y nunca decide la exclusión.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_core.organizations` (columna `is_operating_entity`)
- Consumidores afectados: `/finance/clients` (lista y detalle), drawers de ingreso/OC/HES,
  wizard de onboarding, backfill de `client_profiles`, lane ecosystem `organizations`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: filtro canónico `organization_type IN ('client','both')`
  citado como referencia por `src/lib/reliability/queries/commercial-organization-type-lifecycle-drift.ts:14-16`
- Contrato nuevo o modificado: el mismo filtro + `AND is_operating_entity = FALSE`
- Backward compatibility: `compatible` — sólo excluye la operadora, que no es un cliente real
- Full API parity: el guard vive en el reader/command server-side, no en cada consumer UI

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.organizations`, vista `organization_360`,
  `greenhouse_finance.client_profiles`
- Invariantes que no se pueden romper:
  - La entidad legal operadora NUNCA es seleccionable ni resoluble como cliente.
  - El guard es por **flag**, nunca por `organization_type` (que es rol comercial y es mutable).
  - Ningún cliente real queda excluido: el flag es `TRUE` en exactamente una fila.
- Tenant/space boundary: sin cambio; el filtro es global por org.
- Idempotency/concurrency: `n/a` — cambio de lectura.
- Audit/outbox/history: `none` — no hay mutación.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — es una corrección de lectura, sin flag.
- Backfill plan: `n/a`
- Rollback path: `revert PR + redeploy`
- External coordination: `none`

### Security and access

- Auth/access gate: sin cambio (sesión + capability de Finance).
- Sensitive data posture: `no sensitive data` — sólo se excluye una fila de un listado.
- Error contract: sin cambio.
- Abuse/rate-limit posture: `none with rationale` — lectura interna autenticada.

### Runtime evidence

- Local checks: tests focales de los readers tocados + `pnpm lint` + `pnpm typecheck`.
- DB/runtime checks: correr el filtro corregido contra PG y confirmar que
  `EO-ORG-0007` NO aparece y que el conteo de clientes reales no cambia.
- Integration checks: `n/a`
- Reliability signals/logs: `commercial.organization.type_lifecycle_drift` no debe cambiar.
- Production verification sequence: abrir `/finance/clients` y el picker del wizard, confirmar
  ausencia de Efeonce y presencia de los clientes reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1** — Guard en los 3 readers de Finanzas (`clients/route.ts`, `clients/[id]/route.ts`,
  `canonical.ts`) + test que fija que la operadora no es resoluble como cliente.
- **Slice 2** — Guard en `org-search.ts` (picker de onboarding) y en el backfill de
  `postgres-store-slice2.ts`.
- **Slice 3** — Evaluar el lane `api-platform/resources/organizations.ts`: si `?type=client`
  debe excluir la operadora, aplicarlo; si no, documentar por qué no.

## Out of Scope

- Retirar el `space` de cliente ni la fila de `client_profiles` de Efeonce → `TASK-1649`.
- Renombrar `organization_type` a `commercial_role` (cambio de gran alcance, no priorizado).
- Cambiar `deriveOrganizationType` o su monotonía.
- Tocar `lifecycle_stage` de ninguna org.

## Detailed Spec

El guard canónico es por flag, no por tipo:

```sql
WHERE o.active = TRUE
  AND COALESCE(o.organization_type, 'other') IN ('client', 'both')
  AND o.is_operating_entity = FALSE   -- entidad legal operadora nunca es cliente
```

En readers que ya proyectan el flag al VM (por ejemplo los que alimentan
`growth/aeo/page.tsx`), basta reusar la propiedad ya expuesta en vez de re-consultar.

Preferir un helper compartido si los 5 sitios terminan repitiendo el predicado, para que el
próximo reader client-facing lo herede en vez de olvidarlo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (readers de Finanzas, incluido el write path) → Slice 2 (picker + backfill).
- Slice 1 primero porque `resolveFinanceClientContext` es la puerta que hoy permitiría emitir
  un ingreso contra la operadora; es el riesgo material.
- Slice 3 puede correr en paralelo con Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Excluir por error un cliente real | Finanzas | Baja | El flag es `TRUE` en exactamente 1 fila; verificar conteo antes/después | Conteo de clientes en `/finance/clients` cambia en más de 1 |
| Un consumer nuevo olvida el guard | Finanzas/onboarding | Media | Extraer helper compartido en Slice 1 | Reaparición de la operadora en la lista |
| El lane ecosystem queda inconsistente con la UI | API/MCP | Media | Slice 3 decide y documenta | Consumer MCP recibe la operadora con `?type=client` |

### Feature flags / cutover

Sin flag: es una corrección de lectura, aditiva y reversible por revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR + redeploy | <10 min | Sí |
| 2 | revert PR + redeploy | <10 min | Sí |
| 3 | revert PR + redeploy | <10 min | Sí |

### Production verification sequence

1. `/finance/clients` — Efeonce ausente, clientes reales presentes.
2. Drawer "Crear ingreso" — Efeonce ausente del dropdown.
3. Wizard de onboarding, abrir el picker sin query — Efeonce ausente.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los 5 readers listados excluyen la entidad legal operadora por **flag**, no por tipo.
- [ ] `resolveFinanceClientContext` rechaza la operadora como cliente facturable, con test.
- [ ] El conteo de clientes reales en `/finance/clients` no cambia (sólo desaparece la operadora).
- [ ] El picker del wizard no la ofrece ni con query vacía.
- [ ] Decisión sobre el lane `?type=client` tomada y documentada.
- [ ] `pnpm lint` + `pnpm typecheck` + tests focales verdes.

## Verification

- Tests focales de los readers tocados.
- Query contra PG real con el filtro corregido, antes/después.
- Smoke manual de las 3 superficies de la secuencia de verificación.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1649`)
- [ ] Delta en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` si el guard cambia el contrato

## Follow-ups

- Índice único parcial que garantice una sola `is_operating_entity = TRUE` (gap real con el
  roadmap multi-entidad declarado en `PERSON_ORGANIZATION_MODEL_V1:7-12`).
- Evaluar renombrar `organization_type` → `commercial_role` y `'other'` → `'none'`.

## Open Questions

1. ¿El lane ecosystem `?type=client` debe excluir la operadora, o algún consumer programático
   legítimamente la espera? Resolver en Slice 3 contra los consumers reales del lane.
