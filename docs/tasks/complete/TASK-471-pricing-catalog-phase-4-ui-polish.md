# TASK-471 — Pricing Catalog Phase-4 UI Polish (Diff Viewer + Revert + Bulk + Impact UI + Maker-Checker + Excel)

## Delta 2026-04-20 — Revisión contra codebase real

La revisión del repo confirma que esta task **sigue vigente**, pero ya no debe presentarse como dependiente de foundations backend pendientes:

1. `TASK-470` ya está cerrada y los endpoints/validators de `preview-impact` ya existen.
2. `AuditLogTimelineView.tsx` sigue mostrando `JSON.stringify(changeSummary)` y no hay diff viewer ni revert UI.
3. No existen todavía `BulkEditDrawer`, `ApprovalsQueueView`, roundtrip Excel ni integración visual del impact preview.

Conclusión: esta task queda como **follow-on UI/gobernanza** del catálogo, no como hardening backend.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2` (valor incremental UX, no bloqueante operativo)
- Impact: `Medio`
- Effort: `Alto` (múltiples features UI independientes)
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-471-pricing-catalog-phase-4-ui`
- Legacy ID: `follow-on UI de TASK-467 phase-4 (split de TASK-467 y TASK-470)`
- GitHub Issue: `none`

## Summary

Cierra los gaps de UX que quedaron fuera de TASK-467 (MVP + phase-2 + phase-3) y están listos una vez que los catálogos están maduros. No son blockers operativos — son features que elevan la experiencia de Finance/Admin cuando el catálogo crece y los cambios requieren más governance y observabilidad.

Cada slice es independiente en tiempo de entrega, pero comparten la misma branch/PR para mantener coherencia visual del admin center.

## Why This Task Exists

TASK-467 shipped admin UI funcional. Después de 3 fases el admin puede crear/editar/activar/desactivar roles, tools, overheads, employment types, compatibility y governance. Lo que falta es **elevar el piso de governance visible**:

- Auditar un cambio requiere leer JSON raw → **diff viewer visual**
- Revertir un cambio erróneo requiere DB intervention → **one-click revert**
- Actualizar 30 roles +5% salary requiere 30 clicks → **bulk edit**
- Bajar un `margin_min` sin saber si afecta deals activos → **impact preview UI**
- Cambios críticos sin second-eye review → **maker-checker workflow**
- Snapshot exportable del catálogo vigente → **Excel export + re-import con diff**

Ninguno es P1 hoy para una agencia de ~50 personas, pero son los que un catálogo serio con Finance + Growth + Delivery editando rates necesita antes de llegar a 150-200 personas.

## Goal

- Audit timeline muestra **diff visual side-by-side** en vez de JSON raw
- Audit entries editables (admin puede **revertir** un cambio con un click)
- List views soportan **bulk select + apply change** con impact preview previo
- Drawers de edit muestran **"esto afectará N quotes, $X CLP pipeline"** antes de guardar
- Governance critical changes (ej. bajar `margin_min`) requieren **aprobación second-eye** (otro efeonce_admin)
- **Excel export** del catálogo vigente + **re-import** con preview de diff y confirm antes de persistir

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (componentes Vuexy reuse)
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (v2.19+ post-TASK-467)
- TASK-470 backend hardening (items 2 y 3 consumen su impact-preview endpoint)

Reglas obligatorias:

- **Payroll isolation**: ningún write a `greenhouse_payroll.*`. 194 tests baseline mantenidos
- **Audit coherente**: bulk edit, revert y maker-checker emiten entries nuevas en `pricing_catalog_audit_log` con `action` semántico (`bulk_imported` / `reverted` / `approval_applied`)
- **Copy via `greenhouse-ux-writing`** skill para toda la UI nueva
- **Reuse de primitives**: `PricingCatalogNavCard`, `MarginIndicatorBadge`, `CostStackPanel` cuando aplique

## Dependencies & Impact

### Depends on

- TASK-467 shipped completo (MVP + phase-2 + phase-3) ✅
- `TASK-470` ya dejó disponibles los endpoints `preview-impact` y el validator central que esta UI debe consumir, no volver a implementar

### Blocks / Impacts

- Eleva el piso de observabilidad del admin sin agregar tablas nuevas (lee del audit log ya persistente)
- Reduce drift cost de catálogos que crecen (bulk edit evita 30-click updates manuales)
- Prepara el terreno para RBAC granular por BL (phase-5 potencial) — maker-checker ya introduce el patrón de multi-actor approvals

### Files owned

**Slice 1 — Diff Viewer (independiente):**
- `src/views/greenhouse/admin/pricing-catalog/AuditLogTimelineView.tsx` (refactor)
- `src/components/greenhouse/pricing/AuditDiffViewer.tsx` (nuevo)

**Slice 2 — Revert (independiente):**
- `src/app/api/admin/pricing-catalog/audit-log/[auditId]/revert/route.ts` (nuevo endpoint POST)
- `src/lib/commercial/pricing-catalog-revert.ts` (nuevo helper — convierte audit entry → PATCH payload inverso)
- `src/views/greenhouse/admin/pricing-catalog/AuditLogTimelineView.tsx` (botón revert por entry)

**Slice 3 — Bulk Edit (bloqueado por TASK-470 impact preview):**
- `src/views/greenhouse/admin/pricing-catalog/SellableRolesListView.tsx` (multi-select + bulk action bar)
- `src/views/greenhouse/admin/pricing-catalog/drawers/BulkEditDrawer.tsx` (nuevo)
- `src/app/api/admin/pricing-catalog/roles/bulk/route.ts` (nuevo POST bulk update)

**Slice 4 — Impact Preview UI (bloqueado por TASK-470 preview-impact endpoint):**
- Extension en EditSellableRoleDrawer / EditToolDrawer / EditOverheadDrawer: botón "Preview impacto" antes de Guardar
- `src/components/greenhouse/pricing/ImpactPreviewPanel.tsx` (nuevo)

**Slice 5 — Maker-Checker Approval (independiente del backend, requiere schema opcional):**
- `migrations/[verificar]-task-471-pricing-catalog-approval-queue.sql` (opcional — tabla `pricing_catalog_approval_queue`)
- `src/lib/commercial/pricing-catalog-approvals.ts` (nuevo store)
- `src/app/api/admin/pricing-catalog/approvals/route.ts` + `[id]/route.ts` (nuevos)
- `src/views/greenhouse/admin/pricing-catalog/ApprovalsQueueView.tsx` (nuevo)
- Integración en drawers de edit: cambios críticos (margin_min, multiplier, factors) van a queue en vez de aplicar directo

**Slice 6 — Excel Export/Import (independiente):**
- `src/app/api/admin/pricing-catalog/export-excel/route.ts` (nuevo — usa ExcelJS)
- `src/app/api/admin/pricing-catalog/import-excel/preview/route.ts` (nuevo — parser + diff)
- `src/app/api/admin/pricing-catalog/import-excel/apply/route.ts` (nuevo — aplica diff confirmado)
- `src/views/greenhouse/admin/pricing-catalog/ExcelImportView.tsx` (nuevo — drag+drop + diff viewer + confirm)
- `src/lib/commercial/pricing-catalog-excel.ts` (nuevo — parser + serializer)

## Current Repo State

### Already exists

- Audit log table + store + GET endpoint (TASK-467)
- Edit drawers de roles/tools/overheads/employment-types (TASK-467 phase-2+3)
- `pricing_catalog_audit_log` con `change_summary` JSONB que incluye `previous_values` y `new_values` — base perfecta para diff viewer + revert
- ExcelJS en dependencias (usado por `src/lib/payroll/generate-payroll-excel.ts`) — solo escritura; parsing no implementado todavía

### Gap

- No hay diff visual — timeline muestra JSON dump
- No hay revert action — cambios erróneos requieren DB manual
- No hay multi-select en list views
- Drawers editan sin visibility de blast radius aunque el backend ya lo puede calcular
- No hay approval queue
- No hay Excel roundtrip

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Diff Viewer visual side-by-side (independiente, ~medio)

Componente nuevo `AuditDiffViewer.tsx` que recibe `{ previousValues, newValues, fieldsChanged }` (directo desde `change_summary` JSONB) y renderiza:

- Dos columnas side-by-side: "Antes" | "Después"
- Fields que no cambiaron: collapsados en `<details>` con resumen "N campos sin cambio"
- Fields que sí cambiaron: highlighted con color (rojo para removido, verde para agregado); valores numéricos con delta absoluto + pct (ej. `$5,000 USD → $5,500 USD (+10%)`)
- Handle de tipos: objetos/arrays anidados con tree view, nulls/undefined explícitos
- Copy a clipboard del diff JSON (para debugging)

Reemplaza el `<pre>{JSON.stringify(changeSummary)}</pre>` actual del `AuditLogTimelineView`.

### Slice 2 — One-click Revert (independiente, ~medio)

Endpoint nuevo `POST /api/admin/pricing-catalog/audit-log/[auditId]/revert`:

- Lee audit entry por `auditId`
- Construye PATCH payload inverso usando `previousValues` del `change_summary`
- Aplica el patch al entity (roles/tools/overheads/employment-types/governance) usando los helpers existentes
- Emite **nueva** audit entry con `action='reverted'` + `changeSummary: { reverts_audit_id: <original>, new_values: previousValues }`
- Response 200 con la entity actualizada

Helper `src/lib/commercial/pricing-catalog-revert.ts` maneja la conversión audit entry → PATCH payload. Debe soportar los 9 entity types del audit catalog.

UI: botón "Revertir" en cada audit entry del timeline (solo habilitado si no es ya un revert, y el entity aún existe). Confirm dialog con diff inverso previo.

### Slice 3 — Bulk Edit (bloqueado por TASK-470 preview-impact)

List view de roles (y extensible a tools/overheads) con:

- Checkbox por row + "select all" en header
- Action bar que aparece cuando ≥1 row seleccionado: "Editar N seleccionados" → abre `BulkEditDrawer`
- BulkEditDrawer: form con solo campos que tiene sentido bulk-edit (active toggle, category change, tier change, notes append). Campos salary/cost/pricing excluídos del bulk (demasiado específicos)
- Antes de aplicar: llama `preview-impact` de TASK-470 para cada entity → agrega counts → muestra agregado "Este bulk edit afectará 127 quotes activas, $340M CLP en pipeline"
- Confirm → POST `/bulk/route.ts` que aplica transaction con todas las entities + audit batch

### Slice 4 — Impact Preview UI (bloqueado por TASK-470 preview-impact)

Extension de EditSellableRoleDrawer / EditToolDrawer / EditOverheadDrawer:

- Antes del botón "Guardar cambios", un link/botón "Ver impacto" que llama `POST /preview-impact` con el changeset actual
- Muestra `ImpactPreviewPanel` con:
  - Count de quotes afectadas + sample de 5
  - Total pipeline CLP afectado
  - Deals afectados (si hay deal_id)
  - Warnings del validator (si hay)
- Si el impacto es "alto" (>20 quotes o >$100M CLP), botón "Guardar" requiere checkbox de confirmación "Entiendo el impacto"

### Slice 5 — Maker-Checker Approval Workflow (independiente)

Nueva tabla `greenhouse_commercial.pricing_catalog_approval_queue`:

```sql
CREATE TABLE greenhouse_commercial.pricing_catalog_approval_queue (
  approval_id text PRIMARY KEY DEFAULT 'pcapr-' || gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_sku text,
  proposed_changes jsonb NOT NULL,  -- payload que se aplicaría
  proposed_by_user_id text NOT NULL,
  proposed_by_name text NOT NULL,
  proposed_at timestamptz NOT NULL DEFAULT NOW(),
  justification text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_user_id text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_comment text,
  criticality text NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical'))
);
```

Reglas de criticality (configurable):
- `critical`: bajar `margin_min` de cualquier tier, cambiar `commercial_model_multiplier` de `license_consulting`, desactivar rol con >10 quotes activas
- `high`: cambiar `margin_opt`, cambiar `country_factor_opt`, desactivar tool con pricing assignments
- `medium`: cambiar cost components, agregar/quitar employment_type compatibility
- `low`: todo lo demás — bypass queue, aplica directo

Cuando un drawer detecta cambio `high`/`critical` via `validatePricingCatalogConstraints` (de TASK-470), en vez de aplicar directo inserta en queue y muestra mensaje "Propuesto para revisión. Otro admin debe aprobar."

Vista `/admin/pricing-catalog/approvals` con:
- Pending approvals count (badge en menu)
- Lista con diff preview
- Botones "Aprobar" / "Rechazar" con comentario obligatorio
- Approver ≠ proposer (enforced server-side)
- Al aprobar: aplica el cambio, emite audit `action='approval_applied'`, marca approval status
- Al rechazar: marca status, notifica al proposer (follow-up: notificación Slack/email)

### Slice 6 — Excel Export/Import con diff preview (independiente)

Export: `GET /api/admin/pricing-catalog/export-excel`
- Genera Excel multi-sheet (Roles, Employment Types, Tools, Overheads, Tier Margins, Commercial Models, Country Factors, FTE Hours Guide)
- Cada sheet con headers + rows actuales
- Metadata sheet: timestamp, actor, version de schema
- Response: `Content-Type: application/vnd.openxmlformats...` + download

Import preview: `POST /api/admin/pricing-catalog/import-excel/preview`
- Body: multipart form con file
- Parsea Excel, genera diff contra estado actual de DB
- Response: `{ diffs: Array<{ entityType, entityId, action: 'create'|'update'|'delete'|'noop', currentValues?, newValues? }> }`
- No persiste nada

Import apply: `POST /api/admin/pricing-catalog/import-excel/apply`
- Body: `{ diffsToApply: Array<{ entityType, entityId, action }> }` — user selecciona qué diffs aplicar
- Transaction: aplica cada diff + emite audit batch con `action='bulk_imported'`
- Response: `{ applied: N, failed: M, errors: [...] }`

UI: `/admin/pricing-catalog/import-excel` con:
- Drag+drop file uploader
- Preview table de diffs agrupados por entity type
- Checkbox por diff para aplicar/saltar
- Confirm dialog antes de apply con summary
- Post-apply: refresh del catálogo + toast "N items actualizados"

### Out of Scope

- RBAC granular por BL (phase-5 potencial cuando business justifique)
- API versioning `/v1/` (premature optimization hoy)
- Rate limiting de admin endpoints (bajo riesgo operativo hoy)
- Notification Slack/email para approvals (follow-up)
- Webhook para terceros consumiendo catálogo (no hay demanda)

## Detailed Spec

### Diff viewer behavior para tipos conocidos

- **Numéricos**: `$5,000.00 USD → $5,500.00 USD (+500, +10%)`, formato por locale según campo (CLP usa es-CL, USD en-US)
- **Booleans**: `false → true` con icon check/cross
- **Strings**: side-by-side con highlight char-level si es corto, con `<ins>`/`<del>` tags
- **Arrays** (ej. `applicable_business_lines`): diff set-style con items agregados/removidos en verde/rojo
- **Objetos anidados** (ej. governance payloads): recursive tree con mismo pattern
- **null vs undefined vs ""**: mostrar explícitamente como "(sin valor)" con tooltip

### Revert logic por entity type

Para cada entity type del audit catalog, el helper revert construye el payload correcto:

| entity_type | Logic |
|---|---|
| `sellable_role` | PATCH roles/[id] con previousValues |
| `tool_catalog` | PATCH tools/[id] |
| `overhead_addon` | PATCH overheads/[id] |
| `employment_type` | PATCH governance con type=employment_type, payload=previousValues |
| `role_tier_margin` / `service_tier_margin` / `commercial_model_multiplier` / `country_pricing_factor` | PATCH governance con type correspondiente |
| `fte_hours_guide` | Read-only hoy → revert deshabilitado con tooltip |

**Edge cases**:
- Si la entity fue borrada después del audit → revert con 409 "entity no longer exists"
- Si el audit es un `bulk_imported` → revert de bulk no soportado en V1 (tooltip)
- Si el audit ya fue revertido (hay otro audit con `reverts_audit_id=este`) → botón deshabilitado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Slice 1 — Diff Viewer
- [ ] Audit timeline muestra diff visual en vez de JSON raw
- [ ] Cambios numéricos muestran delta + pct
- [ ] Arrays muestran items agregados/removidos
- [ ] Colapso de fields sin cambio con contador

### Slice 2 — Revert
- [ ] Botón "Revertir" en audit entries activas
- [ ] Confirm dialog con diff inverso previo
- [ ] Audit entry nueva con `action='reverted'` + `reverts_audit_id`
- [ ] Edge cases manejados (entity borrada, ya revertido, bulk)

### Slice 3 — Bulk Edit (requiere TASK-470)
- [ ] Multi-select en list view de roles
- [ ] BulkEditDrawer con campos bulk-safe
- [ ] Preview agregado antes de aplicar
- [ ] Transaction idempotente + audit batch

### Slice 4 — Impact Preview (requiere TASK-470)
- [ ] Botón "Ver impacto" en drawers de edit
- [ ] Count + sample de quotes afectadas
- [ ] Confirmation checkbox si impacto alto

### Slice 5 — Maker-Checker
- [ ] Tabla approval_queue con criticality
- [ ] Criticality detector (mapping reglas → level)
- [ ] Changes high/critical van a queue, low bypass
- [ ] Vista de approvals con diff + approve/reject
- [ ] Approver ≠ proposer enforced server-side

### Slice 6 — Excel Roundtrip
- [ ] Export Excel multi-sheet con estado actual
- [ ] Parse Excel + diff preview
- [ ] Selective apply con audit batch

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Manual staging: full flow por slice

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Architecture doc actualizado con sección "Pricing Catalog Governance UX"
- [ ] Doc funcional `administracion-catalogo-pricing.md` actualizado v1.2

## Follow-ups (phase-5)

- Notificaciones Slack/email para approvals
- RBAC granular por BL/región
- API versioning
- Rate limiting
- Consumer reactivo de overcommit event (de TASK-470) en dashboard de delivery

## Open Questions

- ¿Entregar como PR único con 6 slices o 6 PRs separados? Propuesta: 2-3 PRs agrupando por dependencia (PR1 = slices 1+2+6 independientes; PR2 = slices 3+4 post-TASK-470; PR3 = slice 5 con migration)
- ¿Criticality thresholds son hardcoded o configurables? Propuesta: hardcoded V1 en `pricing-catalog-approvals.ts`; si el negocio lo pide luego, mover a DB config table
- ¿Excel import debe validar contra TASK-470 validator? Propuesta: sí, rechazar diffs que violen constraints antes de mostrar preview
