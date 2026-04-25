# TASK-582 — Monthly Project Provisioning Admin Surface with Preview

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-005`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `admin-ui / commercial / delivery`
- Blocked by: `TASK-577` (Notion Write Bridge), `TASK-578` (Mapping Registry)
- Branch: `task/TASK-582-monthly-project-provisioning-admin-surface`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Reemplazar el monthly project auto-provisioning silent que hoy hace el sibling (`forward_sync/services/project_resolution.py`, 150 LOC) por una vista admin con **preview + override + approve-to-commit** en Admin Center de Greenhouse. El admin ve ex ante qué proyectos Notion se van a crear, qué deals se van a adjuntar a cada uno, qué owners se van a resolver, y decide aprobar, skip individual, merge con proyecto existente, o renombrar. Auditable, reversible antes del commit. El orchestrator (TASK-579) solo ejecuta cuando el admin aprobó.

## Why This Task Exists

- Hoy el sibling hace auto-silent: cuando detecta un deal del mes nuevo sin proyecto asociado, crea un Notion project con el nombre derivado (business-line + mes), sin preview, sin aprobación. Resultado: proyectos mal nombrados, proyectos duplicados, deals asignados al proyecto equivocado — todos recuperables solo después de que ya existieron.
- EPIC-005 explicitly promueve la regla a **admin surface con preview + approve-to-commit**. No auto-silent.
- Greenhouse es el lugar natural para esto porque tiene la history del cliente, el lifecycle de la org, el mapping registry, y el canonical state.
- Habilita capability gating (`commercial.project_provisioning.approve`) para separar quién puede ver el preview de quién puede commit.

## Goal

- Vista nueva en Admin Center `/admin/commercial/project-provisioning`:
  - Lista del próximo mes (y los 2 siguientes como preview).
  - Tabla preview: deals detectados → proyecto target sugerido → owner resuelto → warnings (ambiguity, missing mapping, orfaned deal).
  - Acciones por fila: Skip / Merge con proyecto existente / Rename / Force business-line.
  - Botón "Approve + Commit this month" con confirmación.
  - Bulk actions + drill-down a deal individual.
- API endpoints:
  - `GET /api/admin/commercial/project-provisioning/preview?year=YYYY&month=MM&business_line?=code`
  - `POST /api/admin/commercial/project-provisioning/commit`
  - `GET /api/admin/commercial/project-provisioning/history`
- Audit log de cada commit: quién aprobó, cuándo, con qué overrides, resultado por deal.
- Capability gate: `commercial.project_provisioning.preview` (read) + `commercial.project_provisioning.approve` (commit).
- Drena el buffer `pending_notion_projections` de TASK-579 tras approve.
- Tests + staging validation.

## Architecture Alignment

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability pattern)
- Admin Center patterns — TASK-573 `deal-governance` route + view es referencia
- `docs/tasks/to-do/TASK-577-notion-write-bridge.md` (provee `POST /notion/projects`)
- `docs/tasks/to-do/TASK-578-canonical-mapping-registry-notion.md` (provee owner resolution + business-line mapping)
- `docs/tasks/to-do/TASK-579-forward-orchestrator-commercial-to-delivery.md` (consume el commit output)

Reglas obligatorias:

- **Approve-to-commit obligatorio**. No hay auto-silent path — si nadie aprueba, nada se crea.
- **Preview pure-read**. Computa desde canonical state, no llama Notion (excepto para verificar existencia de proyecto via `GET /notion/projects/current`).
- **Override respetado**: si admin hace Skip, ese deal NO se proyecta; buffer `pending_notion_projections` queda con el override `skipped_by_admin`.
- **Audit log completo**. Cada commit registra admin user id + timestamp + overrides aplicados + resultados + errores.
- **Capability gate estricto**: `preview` es más laxo (Finance Lead puede verlo), `approve` más estricto (solo Ops Lead o CRO).

## Normative Docs

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `src/views/greenhouse/admin/commercial/` (patrón de views admin)
- `src/app/api/admin/commercial/deal-governance/route.ts` (patrón API admin)
- `/tmp/hbi-sibling/cesargrowth11/notion-hubspot-sync/hubspot-notion-sync/forward_sync/services/project_resolution.py` (lógica de resolution a portar canonical — no el auto-create)

## Dependencies & Impact

### Depends on

- `TASK-577` cerrada (`POST /notion/projects` + `GET /notion/projects/current` live).
- `TASK-578` cerrada (Mapping Registry resuelve owner + business-line + service modules).
- `greenhouse_commercial.deals` + `greenhouse_core.organizations` (canonical ya live).
- `greenhouse_commercial.pending_notion_projections` (creado por TASK-579).

### Blocks / Impacts

- Bloquea TASK-581 cutover — el auto-silent del sibling no puede apagarse hasta que exista esta surface replacing.
- Habilita la policy "approve-to-commit" declarada en EPIC-005.
- Follow-up natural: notifications (Slack/email) al admin cuando hay items pending.

### Files owned

- Migration: `migrations/<timestamp>_task-582-monthly-project-provisioning-audit.sql` (audit log table)
- `src/lib/commercial/project-provisioning.ts` (nuevo — core logic: preview + commit)
- `src/lib/commercial/__tests__/project-provisioning.test.ts`
- `src/app/api/admin/commercial/project-provisioning/preview/route.ts`
- `src/app/api/admin/commercial/project-provisioning/commit/route.ts`
- `src/app/api/admin/commercial/project-provisioning/history/route.ts`
- `src/views/greenhouse/admin/commercial/MonthlyProjectProvisioningView.tsx`
- `src/app/(dashboard)/admin/commercial/project-provisioning/page.tsx`
- `src/config/entitlements-catalog.ts` (agregar capabilities + capability groups)
- `src/config/greenhouse-nomenclature.ts` (labels + messages para la view)
- `src/lib/admin/view-access-catalog.ts` (registrar la nueva view)

## Current Repo State

### Already exists

- Admin Center pattern vivo en `/admin/commercial/` (TASK-573 deal-governance es el último ejemplo).
- `greenhouse_commercial.deals` + `greenhouse_core.organizations` con todo el state necesario.
- Entitlements runtime + catalog pattern (`src/lib/entitlements/runtime.ts`).
- View access catalog + route groups (TASK-535/TASK-543 foundation).

### Gap

- Cero admin surface para monthly provisioning.
- No hay logic canonical para resolver "qué proyecto mensual corresponde a este deal" — vive en el sibling como Python.
- No hay audit log de provisioning decisions.
- Capability `commercial.project_provisioning.*` no declaradas.

## Scope

### Slice 1 — Migration: audit log

```sql
CREATE TABLE greenhouse_commercial.project_provisioning_audit (
  audit_id text PRIMARY KEY DEFAULT ('prov-' || gen_random_uuid()::text),
  target_year integer NOT NULL,
  target_month integer NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  business_line_code text,
  committed_by text NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  preview_snapshot jsonb NOT NULL,
  overrides jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL,
  deals_projected_count integer NOT NULL DEFAULT 0,
  deals_skipped_count integer NOT NULL DEFAULT 0,
  projects_created_count integer NOT NULL DEFAULT 0,
  projects_merged_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_provisioning_target ON greenhouse_commercial.project_provisioning_audit (target_year, target_month);
CREATE INDEX idx_project_provisioning_committed_by ON greenhouse_commercial.project_provisioning_audit (committed_by, committed_at DESC);
```

### Slice 2 — Core logic module `project-provisioning.ts`

Exports:

```ts
export interface PreviewRow {
  dealId: string
  dealName: string
  hubspotDealId: string
  organizationId: string
  organizationName: string
  businessLineCode: string | null
  businessLineLabel: string | null
  currentStage: string
  dealCreatedAt: string
  suggestedProjectName: string
  suggestedProjectOwnerIdentityProfileId: string | null
  suggestedProjectOwnerNotionUserId: string | null
  existingNotionProjectPageId: string | null
  existingNotionProjectAction: 'create' | 'reuse' | 'conflict'
  warnings: Array<{ code: string; message: string }>
}

export interface ProvisioningPreview {
  targetYear: number
  targetMonth: number
  businessLineCode: string | null
  rows: PreviewRow[]
  totalDeals: number
  totalProjects: number
  generatedAt: string
}

export const computeProvisioningPreview = async (params: {
  year: number
  month: number
  businessLineCode?: string | null
}): Promise<ProvisioningPreview>

export interface CommitInput {
  targetYear: number
  targetMonth: number
  businessLineCode?: string | null
  overrides: Array<{
    dealId: string
    action: 'skip' | 'merge_with' | 'rename'
    mergeWithProjectPageId?: string
    renameTo?: string
    forceBusinessLineCode?: string
  }>
  committedBy: string
}

export interface CommitResult {
  auditId: string
  projectedDeals: string[]
  skippedDeals: string[]
  projectsCreated: Array<{ projectPageId: string; projectName: string }>
  projectsMerged: Array<{ projectPageId: string; mergedDealCount: number }>
  errors: Array<{ dealId: string; message: string }>
}

export const commitProvisioning = async (input: CommitInput): Promise<CommitResult>
```

Logic:

- Preview: query deals del mes target (`deal_created_at BETWEEN first_business_day(year, month) AND last_day(year, month)`), resuelve owner via `identity_profile_source_links`, resuelve business-line via `mappings-store`, detecta proyecto existente via `GET /notion/projects/current`, calcula warnings.
- Commit: valida permissions, valida que no haya commit previo para el mismo (year, month, business_line), aplica overrides, llama al bridge para cada project (create o merge via reusing page_id), proyecta deals al proyecto, drena `pending_notion_projections` marcando como resolved, persiste audit row.

### Slice 3 — API endpoints

**`GET /api/admin/commercial/project-provisioning/preview?year=YYYY&month=MM&business_line?=code`**

- Auth: `requireFinanceTenantContext` + capability `commercial.project_provisioning.preview`.
- Response: `ProvisioningPreview` JSON.

**`POST /api/admin/commercial/project-provisioning/commit`**

- Auth: capability `commercial.project_provisioning.approve`.
- Body: `CommitInput`.
- Response: `CommitResult`.
- Idempotency: si ya existe audit row para (year, month, business_line), devuelve 409 con el audit row existente.

**`GET /api/admin/commercial/project-provisioning/history?limit=N`**

- Auth: `preview` capability.
- Response: últimas N audit rows con resumen.

### Slice 4 — Admin View `MonthlyProjectProvisioningView.tsx`

- Lives en `src/views/greenhouse/admin/commercial/`.
- Page route `/admin/commercial/project-provisioning`.
- Componentes:
  - Header con month picker (default: mes siguiente) + business-line filter + refresh
  - Stats: total deals detectados + total proyectos suggested + warnings count
  - Table TanStack con las rows del preview. Columnas: deal name + stage + org + suggested project + suggested owner + warnings + action picker.
  - Row actions dropdown: Skip / Merge with existing / Rename / Force business-line.
  - Bulk actions: Skip all warnings / Accept defaults / Clear overrides.
  - Botón "Approve + Commit" con modal de confirmación que muestra diff final (overrides aplicados).
  - Tabs opcionales: Preview current / Preview next+1 / History.
- UX writing per skill guidelines (Spanish neutral, tuteo, clarity over cleverness).
- Microinteractions: skeleton loading, toast success/error, empty state first-use ("Aún no hay deals para el próximo mes").

### Slice 5 — Capabilities + nomenclature

- `src/config/entitlements-catalog.ts`:
  - `commercial.project_provisioning.preview`
  - `commercial.project_provisioning.approve`
- Bind a roles: `efeonce_admin` + `ops_lead` para approve; `finance_lead` agrega preview.
- `src/config/greenhouse-nomenclature.ts`: labels para la view.
- `src/lib/admin/view-access-catalog.ts`: registrar `commercial.project-provisioning` view + route group.

### Slice 6 — Tests + staging

- Unit tests de `project-provisioning.ts`: preview computation con deals fixture, commit con overrides, dedupe via audit.
- Integration test de los 3 endpoints API.
- Component tests de la view con fixtures.
- Staging smoke: preview del próximo mes → aprobar con algunos skips → verificar proyectos Notion creados + pending buffer drenado.

## Out of Scope

- Notifications automáticas al admin cuando hay items pending. Follow-up.
- Bulk-edit avanzado tipo spreadsheet. V1 es row-by-row.
- Projections multi-month (batch commit Jan + Feb). V1 es month-by-month.
- Surface para forecasted deals (deals aún no ganados). V1 es solo deals ya-existentes del mes target.

## Detailed Spec

### Resolución canónica de proyecto target

Porta la lógica del sibling (`forward_sync/services/project_resolution.py`) pero expresada como reglas canónicas:

1. Target month es el mes de creación del deal en HubSpot (`deal.created_in_hubspot_at` o `deal_created_at` canonical).
2. Project name canonical: `{business_line_code} — {Mes} {YYYY}` (ej. `PERF — Abril 2026`).
3. Si ya existe un proyecto Notion con ese nombre en el mes target → `action='reuse'`.
4. Si existen múltiples proyectos candidatos (colisión) → `action='conflict'` con warning; admin resuelve via override.
5. Si no existe → `action='create'`.

### Preview warnings

- `owner_missing_notion_mapping`: HubSpot owner no tiene row en `identity_profile_source_links` con source_system='notion'.
- `business_line_unmapped`: deal tiene `business_line_code` pero no hay row en `commercial_business_line_mapping`.
- `organization_lifecycle_prospect`: deal existe pero la org aún está prospect — ¿provisioning prematuro?
- `existing_project_conflict`: múltiples proyectos Notion candidatos para el mismo slot.
- `pending_too_old`: deal ya tiene row en `pending_notion_projections` con `requested_at` hace más de 30 días.

### Overrides semantics

- `skip`: no proyectar este deal. Marca buffer row como `resolved` con `skipped_by_admin`.
- `merge_with`: en vez de crear proyecto nuevo, usar `mergeWithProjectPageId` existente.
- `rename`: al crear, usar `renameTo` en lugar del suggested name.
- `force_business_line`: override el business-line-code que canonical resuelve.

## Acceptance Criteria

- [ ] Tabla `project_provisioning_audit` creada con seed vacío.
- [ ] `src/lib/commercial/project-provisioning.ts` implementado con `computeProvisioningPreview` + `commitProvisioning`.
- [ ] 3 API endpoints live con capability gates funcionando.
- [ ] Admin view renderiza preview en menos de 3s para un mes con <50 deals.
- [ ] Overrides se aplican correctamente en commit.
- [ ] Commit es idempotente: re-commit del mismo (year, month, BL) devuelve 409 con audit existente.
- [ ] `pending_notion_projections` buffer se drena post-commit.
- [ ] Audit log completo: admin user + overrides + results persisten.
- [ ] Capabilities `commercial.project_provisioning.preview` + `.approve` declaradas + bindeadas.
- [ ] View registrada en `view-access-catalog.ts` + menu entry en Admin Center.
- [ ] Tests unitarios + integration + component verdes.
- [ ] Staging smoke: preview → override → commit → verificar Notion staging projects + buffer drenado.
- [ ] UX writing en español (tuteo) per skill `greenhouse-ux-writing`.

## Verification

- `pnpm test src/lib/commercial/__tests__/project-provisioning.test.ts` verde.
- Admin view rendering en staging con fixtures reales.
- Audit row persistida post-commit con shape esperado.
- `pnpm staging:request GET /api/admin/commercial/project-provisioning/preview?year=2026&month=05 --pretty` devuelve JSON válido.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` documentan
- [ ] EPIC-005 cross-check: acceptance "Monthly Project Admin Surface live" marcado

## Follow-ups

- Notifications (Slack/email) al admin cuando hay pending buffer growing.
- Preview multi-month en una vista.
- Forecast mode: proyectar deals en pipeline (no solo los del mes cerrado).
- Mobile-friendly responsive (V1 optimizado desktop).

## Open Questions

- ¿Cuál es la política si un deal fue creado en mes N pero aprobado en mes N+1? ¿Va al proyecto de N o de N+1? Inclinación: mes de creación (N), excepto si admin override explícito.
- ¿Se puede commit parcial (aprobar solo subset de rows del preview)? Inclinación V1: sí — skip los que no quieres + commit el resto.
