# TASK-550 — Pricing Catalog Phase-5 Follow-ups (Governance Revert + Tab Gating + Approval Notifications + Excel Create/Delete)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-550-pricing-catalog-phase-5-followups`
- Legacy ID: `phase-5 follow-up de TASK-471 (post V1 gap completion)`
- GitHub Issue: `none`

## Summary

Cuatro items que quedaron honestamente declarados como fuera del scope V1 de TASK-471 al cerrar su gap completion. Cada uno toca un dominio distinto y es independiente del resto: se pueden shippear como slices separadas dentro de la misma task, o spawnearse en tasks hijas si un slice crece en alcance.

## Why This Task Exists

TASK-471 cerró V1 con scope honesto en changelog + Handoff. Los siguientes 4 items quedaron explicitos como no-entregados:

1. **Governance types no se pueden revertir con un click** — sus tablas (role_tier_margin, service_tier_margin, commercial_model_multiplier, country_pricing_factor, employment_type) tienen composite keys (effective_from + entity_code) y effective-dating, por lo que el shared writer `applyPricingCatalogEntityChanges` (que asume PK simple + `updated_at = NOW()`) no sirve. Operador debe revertir manualmente via PATCH al governance router.

2. **High-impact gate sólo bloquea 1 de 4 tabs del SellableRoleDrawer** — la señal `impactBlocking` se propaga al CTA del tab Info pero no a `handleSubmitCost` (tab Componentes de costo), `handleSaveCompatibility` (tab Modalidades), `handleSubmitPricing` (tab Pricing por moneda). Un admin puede saltarse el gate cambiando de tab antes de confirmar.

3. **Approval queue persiste propuestas sin notificar** — cuando un efeonce_admin crea una propuesta high/critical, los otros efeonce_admin no se enteran salvo que visiten manualmente `/admin/pricing-catalog/approvals`. Esto mata el tiempo-a-aprobar en la práctica.

4. **Excel import apply sólo soporta updates** — el parser de TASK-471 detecta correctamente rows nuevas (`action='create'`) y faltantes (`action='delete'`) pero el apply endpoint las rechaza con `action_not_supported`. Adopción masiva inicial desde Excel requiere creates en bulk; cleanup de catálogos stale requiere deletes.

## Goal

- Governance types soportan revert desde el timeline del audit log con la misma UX que los 4 entity types ya cubiertos (sellable_role, tool_catalog, overhead_addon, service_catalog).
- `impactBlocking` bloquea los 4 save CTAs del SellableRoleDrawer (Info + Compat + Cost + Pricing).
- Nuevo cambio high/critical en la queue notifica a los otros efeonce_admin via Slack y/o email.
- Excel import apply soporta `action='create'` y `action='delete'` con workflow de approval antes de persistir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (primitives, GH_PRICING_GOVERNANCE nomenclature ya existente)
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (maker-checker patterns introducidos por TASK-504)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` [verificar] — referencia para Slack webhook patterns si existe
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — emitir eventos de `approval_proposed` al outbox si decidimos que la notificación va por consumer reactivo
- TASK-471 shipped (merge 547106ed + docs d3eca4bb) — self-contained dependency

Reglas obligatorias:

- **Payroll isolation**: ningún write a `greenhouse_payroll.*`. Tests baseline mantenidos.
- **Audit coherente**: cada write emite `pricing_catalog_audit_log` con `action` canónico. Slice 4 usa `action='bulk_imported'` + metadata `source='excel_import'`; slice 1 usa `action='reverted'` con `change_summary.reverts_audit_id`.
- **Governance writes** NO usan el shared writer `applyPricingCatalogEntityChanges` porque las tablas governance tienen composite keys. Usar `pricing-governance-store.ts` helpers existentes o PATCH al governance router.
- **Copy via `greenhouse-ux-writing`** para cualquier string nuevo (mensajes de notificación, labels de create/delete en Excel view).
- **Capability gates**: `canRevertPricingCatalogChange` (ya existe, efeonce_admin) reutilizable para slice 1. `canReviewPricingCatalogApproval` (ya existe) reutilizable para slice 3. Slice 4 respeta `canAdministerPricingCatalog`.
- **Secretos Slack/email** vía Secret Manager + `*_SECRET_REF` pattern; nunca hardcodear webhooks.

## Normative Docs

- `docs/tasks/complete/TASK-471-pricing-catalog-phase-4-ui-polish.md` — contiene los deltas que declararon estos 4 items como V1 gaps
- `Handoff.md` — sesión de V1 gap completion registró los 4 follow-ups reales
- `changelog.md` — entrada de TASK-471 gap completion

## Dependencies & Impact

### Depends on

- TASK-471 shipped completo (V1 inicial + Gap-1..Gap-5). ✅
- `src/lib/commercial/pricing-catalog-entity-writer.ts` — shared writer para entity types con PK simple (slice 4 lo extiende para create/delete; slice 1 lo SUSTITUYE con un path paralelo para governance)
- `src/lib/commercial/pricing-catalog-approvals.ts` — store + `decideApproval` ya tienen auto-apply (TASK-471 Gap-1); slice 3 añade notification emit
- `src/lib/commercial/pricing-governance-store.ts` — helpers existentes para writes a tablas governance (slice 1 los consume)
- `src/app/api/admin/pricing-catalog/governance/route.ts` — governance router existente (slice 1 puede invocarlo)
- `greenhouse_commercial.pricing_catalog_approval_queue` — tabla ya existe (slice 4 la usa para gated creates/deletes)
- `GH_PRICING_GOVERNANCE` nomenclature ya existe en `src/config/greenhouse-nomenclature.ts` — extender con entries nuevas no reemplazar

### Blocks / Impacts

- Cierra la deuda honesta de TASK-471 — no hay más "V1 scope" sin implementar.
- Notificaciones (slice 3) habilita adopción real de maker-checker workflow en producción (sin notif, la queue se vuelve un backlog invisible).
- Excel create/delete (slice 4) habilita onboarding masivo de catálogo desde snapshot offline (ej. migración de datos legacy) + cleanup periódico.
- Tab gating (slice 2) cierra un bypass de seguridad: hoy un admin puede saltarse la confirmación de high-impact navegando tabs.

### Files owned

**Slice 1 — Governance revert:**
- `src/lib/commercial/pricing-catalog-revert.ts` (modificación — extender `REVERT_DISABLED_ACTIONS` fuera de governance + whitelist gov types como revertibles)
- `src/lib/commercial/pricing-catalog-governance-writer.ts` [nuevo — path paralelo al entity-writer que entiende composite keys + effective-dating]
- `src/app/api/admin/pricing-catalog/audit-log/[auditId]/revert/route.ts` (modificación — detectar governance entity_type y routear al governance-writer)
- `src/views/greenhouse/admin/pricing-catalog/AuditLogTimelineView.tsx` (modificación — extender `revertibleEntities` con los 5 governance types)

**Slice 2 — Tab gating:**
- `src/views/greenhouse/admin/pricing-catalog/drawers/EditSellableRoleDrawer.tsx` (modificación — gate `handleSubmitCost`, `handleSaveCompatibility`, `handleSubmitPricing` con `impactBlocking` además del Info tab que ya está cubierto)

**Slice 3 — Approval notifications:**
- `src/lib/commercial/pricing-catalog-approvals.ts` (modificación — emit evento outbox `commercial.pricing_catalog_approval.proposed` + `.decided` en `proposeApproval` + `decideApproval`)
- `src/lib/sync/event-catalog.ts` (modificación — declarar los 2 eventos canónicos)
- `src/lib/sync/projections/pricing-catalog-approval-notifier.ts` [nuevo — proyección reactiva que envía Slack + email cuando entra un `proposed`]
- `src/lib/integrations/slack-webhook.ts` [verificar — ver si existe integración Slack en el repo; si no, crearla mínima]
- Resend email template: `src/emails/PricingCatalogApprovalRequested.tsx` [nuevo]
- Resend email template: `src/emails/PricingCatalogApprovalDecided.tsx` [nuevo]

**Slice 4 — Excel create/delete:**
- `src/lib/commercial/pricing-catalog-excel.ts` (modificación — parser ya detecta create/delete; hoy no emite warnings. Agregar warnings obligatorios de review)
- `src/app/api/admin/pricing-catalog/import-excel/apply/route.ts` (modificación — aceptar `action='create' | 'delete'` pero SOLO si vienen con `approvalId` válido resolved + approved. Si no, rechazar 400 `needs_approval`.)
- `src/lib/commercial/pricing-catalog-entity-writer.ts` (modificación opcional — agregar `createPricingCatalogEntity` + `softDeletePricingCatalogEntity` respetando whitelists, o hacer esos métodos dedicados en el apply route)
- `src/views/greenhouse/admin/pricing-catalog/ExcelImportView.tsx` (modificación — diffs con action create/delete muestran banner "Requiere aprobación antes de aplicar" + botón "Proponer aprobación" que crea un approval_queue entry con los diffs como `proposed_changes.excel_batch`)

## Current Repo State

### Already exists

- Shared writer `pricing-catalog-entity-writer.ts` con `PRICING_CATALOG_ENTITY_WHITELIST` para 4 entity types (sellable_role, tool_catalog, overhead_addon, service_catalog)
- `pricing-governance-store.ts` con stores para las 5 governance tables (role_tier_margin, etc.)
- Approval queue table + store + endpoints (`proposeApproval`, `decideApproval` con auto-apply)
- Approval queue UI (`/admin/pricing-catalog/approvals`) operativa
- Excel parser detecta create/update/delete/noop correctamente (solo update tiene apply handler)
- `ImpactPreviewPanel` con `onBlockingStateChange` callback
- `SellableRoleDrawer` tiene `impactBlocking` state + gate del tab Info (`handleSaveInfo`)
- `GH_PRICING_GOVERNANCE.auditRevert`, `approvals`, `excel` nomenclature entries
- Audit action enum incluye `reverted`, `approval_applied`, `bulk_edited` (migration de TASK-471)
- `canRevertPricingCatalogChange` + `canReviewPricingCatalogApproval` capabilities
- Resend configurado en el repo ([verificar] buscar `@react-email/components` usage actual)

### Gap

- Governance entity types (`role_tier_margin`, `service_tier_margin`, `commercial_model_multiplier`, `country_pricing_factor`, `employment_type`) + `fte_hours_guide` NO están en `PRICING_CATALOG_ENTITY_WHITELIST` y NO se pueden revertir (el revert route 400s con `revert_entity_not_supported`).
- `REVERT_DISABLED_ACTIONS` en `pricing-catalog-revert.ts` incluye governance como "not supported" — hay que cambiar esa semántica para algunos.
- Los 3 save handlers (`handleSubmitCost`, `handleSaveCompatibility`, `handleSubmitPricing`) en EditSellableRoleDrawer NO consultan `impactBlocking` antes de ejecutar el write.
- `proposeApproval` + `decideApproval` NO emiten eventos al outbox — la tabla approval_queue queda como sink silencioso.
- No existe proyección reactiva `pricing-catalog-approval-notifier.ts`.
- No existe integración Slack concreta para approvals (buscar patterns en `src/lib/integrations/` [verificar]).
- Excel parser reporta diffs con `action='create'` / `'delete'` pero apply route 400s con `action_not_supported`.
- `ExcelImportView` muestra chips create/delete pero el flujo de aprobación previo no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Governance types revert (medio-alto)

Extender el revert flow para soportar los 5 governance types + `fte_hours_guide`.

Pasos:

- Crear `src/lib/commercial/pricing-catalog-governance-writer.ts` paralelo al entity-writer. Diferencias clave:
  - Composite keys: ej. `role_tier_margin` usa `(role_code, effective_from)`. El revert necesita recrear una nueva fila con `effective_from = CURRENT_DATE` + los valores previos (effective-dating: no se UPDATE-ea la fila histórica, se INSERT-a una nueva que supersedea).
  - Writes van vía `pricing-governance-store.ts` helpers existentes (no raw SQL).
  - Whitelist por entity type con columnas + handler dedicado.
- Extender `buildRevertPayload` en `pricing-catalog-revert.ts`:
  - Quitar governance de `REVERT_DISABLED_ACTIONS`.
  - Ruta endpoint devuelta debe matchear el governance router (ya lo hace: `?type=&id=`).
- Extender POST `/revert` route:
  - Detectar `entityType ∈ governance types` → usar `pricing-catalog-governance-writer.ts` en vez del shared writer.
  - Audit row sigue emitiéndose con `action='reverted'` + `change_summary.reverts_audit_id`.
- `AuditLogTimelineView.revertibleEntities` agrega los 5 governance types (deja `fte_hours_guide` como read-only).
- `ENTITY_LABELS` ya tiene los 5 governance labels.
- Tests unitarios del governance-writer cubriendo: insert efectivo-dateado, reject si la fila target no existe, reject si el audit es un bulk_imported.

**V1 decisión pragmática**: si `fte_hours_guide` no tiene un store write público, queda explícitamente read-only — documentar en el helper.

### Slice 2 — High-impact gate en los 4 tabs del SellableRoleDrawer (bajo)

3 modificaciones puntuales en `EditSellableRoleDrawer.tsx`:

- `handleSubmitCost` (línea ~1662): early return + toast si `impactBlocking` es true. CTA copy cambia a "Confirmar impacto alto".
- `handleSaveCompatibility` (línea ~853): igual.
- `handleSubmitPricing` (línea ~2125): igual.
- Copy del CTA disabled via nomenclature entry nueva `GH_PRICING_GOVERNANCE.impactPreview.confirmRequiredCopy`.

### Slice 3 — Approval notifications (Slack + email) (medio)

- 2 eventos canónicos nuevos al catálogo:
  - `commercial.pricing_catalog_approval.proposed`
  - `commercial.pricing_catalog_approval.decided`
- Emit en `proposeApproval` (post-insert) + `decideApproval` (post-update).
- Proyección reactiva `pricing-catalog-approval-notifier.ts`:
  - Domain: `governance` [verificar — crear si no existe] o `cost_intelligence`.
  - Consume `.proposed` → resuelve lista de destinatarios (query `user_profiles` con role_code=efeonce_admin, excluir al proposer) → envía Slack webhook + email Resend.
  - Consume `.decided` → envía notif solo al proposer con el resultado + comment.
- Slack webhook integration `src/lib/integrations/slack-webhook.ts` [verificar si existe; si no, crearlo mínimo] con URL desde Secret Manager `PRICING_CATALOG_SLACK_WEBHOOK_SECRET_REF`.
- Email templates `PricingCatalogApprovalRequested.tsx` + `PricingCatalogApprovalDecided.tsx` en `src/emails/` siguiendo patterns de templates existentes.
- Copy del email + Slack via `greenhouse-ux-writing` skill.
- Feature flag `GREENHOUSE_PRICING_APPROVAL_NOTIFICATIONS` para rollout gradual (off en staging hasta validar entrega; on en production tras verify).

### Slice 4 — Excel create/delete con workflow de approval (alto)

- Parser actualizado: cada diff con `action='create'` o `'delete'` agrega warning estructurado (`warnings: ['needs_approval']`) en lugar de pasarlo libre.
- Apply route endpoint:
  - `action='update'` → sigue funcionando igual (V1 behavior).
  - `action='create'` o `'delete'` sin `approvalId` en el body → 400 `{ code: 'needs_approval', pendingDiffs: [...] }`.
  - `action='create'` o `'delete'` CON `approvalId` resolved a `status='approved'` → proceder.
- Approval queue integration:
  - Nuevo endpoint `POST /api/admin/pricing-catalog/import-excel/propose` que toma los diffs create/delete, los persiste en un approval_queue entry con `proposed_changes.excel_batch: [diffs]` + `criticality='high'` por default (decidible case-by-case por criticality detector si lo extendemos).
  - Al aprobar ese entry via `decideApproval`, un slice-specific handler aplica el batch create/delete (en vez del update-only auto-apply del Gap-1). Extender `decideApproval` con un discriminador por `proposed_changes.excel_batch` presente.
- ExcelImportView UI:
  - Diffs create/delete renderan chip + banner "Requiere aprobación".
  - Botón "Proponer aprobación" aparece si hay ≥1 create/delete seleccionado.
  - Al proponerlo: navega a `/admin/pricing-catalog/approvals` con el new entry highlighted.
- Create handler per entity type respeta el `PRICING_CATALOG_ENTITY_WHITELIST` + valida constraints via `pricing-catalog-constraints.ts`.
- Delete = soft delete (set `active=false` o `is_active=false`) — hard delete sigue fuera de scope V2.

## Out of Scope

- Hard delete de entities desde Excel (V2).
- Governance types bulk edit o excel apply (solo revert en este task).
- Notificaciones a actores no-admin (ej. proposer finance_analyst futuro).
- Aprobaciones multi-nivel (ej. requires 2-of-3 admins) — sigue siendo 1 approver.
- Rollback de un batch excel completo (solo rollback individual por row via revert del audit entry).
- Backup/snapshot pre-create/delete (se confía en el audit log como trail).

## Detailed Spec

### Slice 1 — governance-writer helpers

Shape aproximada:

```typescript
// src/lib/commercial/pricing-catalog-governance-writer.ts
export const PRICING_CATALOG_GOVERNANCE_WHITELIST: Record<string, {
  store: 'role_tier_margins' | 'service_tier_margins' | 'commercial_model_multipliers' | 'country_pricing_factors' | 'employment_types'
  keyFields: string[] // composite key
  columns: readonly string[]
}> = { /* ... */ }

export const applyPricingCatalogGovernanceRevert = async (input: {
  client: PoolClient
  entityType: string
  entityId: string // el PK lógico (role_code, etc.)
  previousValues: Record<string, unknown>
  effectiveFrom: string // YYYY-MM-DD; default = today
}): Promise<{ insertedKey: string; fieldsRestored: string[] }> => {
  // INSERT nueva fila en la tabla governance con effective_from y previous_values.
  // Usa helpers de pricing-governance-store.ts para respetar effective-dating.
}
```

### Slice 3 — event payloads

```typescript
// commercial.pricing_catalog_approval.proposed
{
  approvalId: string
  entityType: string
  entityId: string
  entitySku: string | null
  proposedByUserId: string
  proposedByName: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  justification: string
  proposedAt: string
}

// commercial.pricing_catalog_approval.decided
{
  approvalId: string
  decision: 'approved' | 'rejected' | 'cancelled'
  decidedByUserId: string
  decidedByName: string
  decidedAt: string
  comment: string
  applied: boolean // cuando decision=approved, si el auto-apply funciono
}
```

### Slice 4 — flujo excel con approval

```
┌─ user sube excel ──┐
│                    ▼
│  parser detecta create/delete diffs
│                    │
│                    ▼
│  UI: "Requiere aprobación" banner + botón "Proponer"
│                    │
│                    ▼
│  POST /import-excel/propose → crea approval_queue entry
│                    │
│                    ▼
│  segundo admin aprueba en /approvals
│                    │
│                    ▼
│  decideApproval detecta excel_batch en proposed_changes
│                    │
│                    ▼
│  apply handler itera diffs → INSERT/soft-DELETE con audit rows
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Slice 1 — Governance revert
- [ ] El audit timeline muestra botón "Revertir" habilitado para entries de los 5 governance types (role_tier_margin, service_tier_margin, commercial_model_multiplier, country_pricing_factor, employment_type).
- [ ] `fte_hours_guide` queda explícitamente read-only con tooltip explicativo.
- [ ] Click en "Revertir" sobre una entry governance inserta una nueva fila effective-dated (no UPDATE-ea la histórica) con los previous_values + audit row con `action='reverted'`.
- [ ] Intento de revert sobre una entry cuya entidad fue borrada responde 409 con mensaje claro.
- [ ] Tests del governance-writer cubren: happy path per entity type + reject de bulk_imported + reject si la entidad no existe.

### Slice 2 — Tab gating
- [ ] `impactBlocking=true` deshabilita los 4 save CTAs del SellableRoleDrawer (Info + Compat + Cost + Pricing).
- [ ] Los 4 CTAs cambian su copy a "Confirmar impacto alto" cuando `impactBlocking=true`.
- [ ] Unconfirmed user no puede saltarse el gate cambiando de tab antes de confirmar.

### Slice 3 — Notifications
- [ ] Crear una propuesta high/critical emite evento `commercial.pricing_catalog_approval.proposed` al outbox.
- [ ] La proyección reactiva envía Slack + email a los otros efeonce_admin (excluye al proposer).
- [ ] Decidir una propuesta emite `commercial.pricing_catalog_approval.decided` y notifica al proposer.
- [ ] Flag `GREENHOUSE_PRICING_APPROVAL_NOTIFICATIONS=false` suprime notificaciones.
- [ ] Fallo en Slack/email NO rollback-ea la queue write (approval queue es source of truth; notification es best-effort).

### Slice 4 — Excel create/delete
- [ ] Parser marca diffs `create`/`delete` con warning `needs_approval`.
- [ ] Apply endpoint rechaza create/delete sin `approvalId` con 400 `code='needs_approval'`.
- [ ] Botón "Proponer aprobación" en ExcelImportView crea entry en approval_queue con diffs en `proposed_changes.excel_batch`.
- [ ] Al aprobar ese entry, `decideApproval` aplica los creates/deletes en una transacción + emite audit rows individuales.
- [ ] Delete es soft (active=false / is_active=false) — no hard DELETE de rows.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Smoke test manual en staging por slice:
  - Slice 1: revert de una entry role_tier_margin → verificar que una nueva fila quedó en la tabla
  - Slice 2: abrir SellableRoleDrawer, disparar preview high-impact, intentar save desde cada tab
  - Slice 3: crear propuesta crítica, verificar que llega Slack/email a otros admins
  - Slice 4: subir Excel con una row nueva, proponer, aprobar desde otro admin, validar create

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-471 delta marcando los 4 gaps como cerrados)

- [ ] Doc funcional `administracion-catalogo-pricing.md` actualizado con workflow de governance revert + notificaciones + excel create/delete

## Follow-ups

- Hard delete desde Excel (V2 si aparece caso real).
- Governance types bulk edit (no solo revert).
- Approval queue con multi-level review (N-of-M approvers).
- Rollback de batch excel completo desde una sola acción.
- Auto-trigger de re-run del Excel parser cuando cambia el catálogo subyacente mientras el diff está pending approval.

## Open Questions

- **¿Effective-dating del revert de governance es con CURRENT_DATE o con la fecha original del audit?** Propuesta: CURRENT_DATE, porque un revert es una acción nueva (no una edición de la fila histórica). Confirmar en Discovery.
- **¿Notificación Slack obligatoria o opcional per-admin?** Propuesta: emisión siempre; delivery silenciosamente skip si el admin no tiene Slack identifier mapeado en su profile. Confirmar.
- **¿Criticality detector aplica también a los excel_batch proposals?** Propuesta: default `high` para cualquier batch con ≥1 delete; `medium` para batches solo create. Confirmar en Discovery.
- **¿Email HTML templates requieren branding completo Efeonce o versión simple?** Propuesta: versión simple V1 (similar al reset-password template existente) y iterar post-adopción.
