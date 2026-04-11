# TASK-320 — Talent Ops Analytics, Completeness & Maintenance Automation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-313`, `TASK-316`, `TASK-317`, `TASK-319`
- Branch: `task/TASK-320-talent-ops-analytics-maintenance-automation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-04-11 (TASK-317)

- TASK-317 completada — TalentDiscoverySummary disponible vía API. Analytics puede consumir el mismo aggregation.

## Delta 2026-04-11 (TASK-316)

- TASK-316 completada — cola /admin/talent-review con summary counts. Analytics puede consumir el mismo query UNION de pending/verified/rejected.

## Delta 2026-04-11

- TASK-313 completada — ahora existe: `member_certifications` con `expiry_date` queryable, `member_skills` con `verification_status` y `updated_at`, 10 API routes con datos suficientes para construir métricas de completitud, pendientes de verificación y certificaciones por vencer
- Impacto: las tablas base para analytics de completitud y expiración ya existen; esta task puede diseñar queries y dashboards sobre data real en vez de esperar storage

## Summary

Agregar la capa operativa que mantiene vivo el sistema de talento: analytics de completitud, backlog de revisión, certificados por vencer, perfiles desactualizados y automatizaciones de recordatorio o mantenimiento. Esta task evita que el módulo se degrade con el tiempo.

## Why This Task Exists

Los perfiles de talento se pudren si no hay mantenimiento. Para operar a escala hacen falta:

- métricas de cobertura y completitud
- backlog de revisión
- alertas de vencimiento
- detección de perfiles stale
- recordatorios y seguimiento

Sin esta task, el sistema arranca fuerte y se degrada en meses.

## Goal

- Dar visibilidad operativa del estado del sistema de talento
- Mantener perfiles y certificaciones actualizados
- Reducir deuda manual de revisión y mantenimiento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Notificaciones o recordatorios deben reutilizar el sistema de notificaciones del repo cuando sea razonable.
- Las métricas agregadas deben salir de readers/serving o queries explícitas; no recalcular inline en la UI sin contrato.
- El sistema debe distinguir claramente entre datos faltantes, pendientes de revisión y vencimientos.

## Normative Docs

- `docs/tasks/to-do/TASK-316-talent-trust-ops-verification-governance.md`
- `docs/tasks/to-do/TASK-317-internal-talent-discovery-search-ranking.md`
- `docs/tasks/to-do/TASK-319-reputation-evidence-endorsements.md`

## Dependencies & Impact

### Depends on

- `TASK-313`
- `TASK-316`
- `TASK-317`
- `TASK-319`
- `src/lib/sync/projections/notifications.ts`
- `src/views/greenhouse/admin/**`

### Blocks / Impacts

- mantenimiento sostenible del sistema de talento
- confianza de largo plazo del perfil profesional

### Files owned

- `src/views/greenhouse/admin/**`
- `src/lib/[verificar]`
- `src/lib/sync/projections/notifications.ts`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Current Repo State

### Already exists

- sistema de notificaciones
- surfaces admin
- shells de perfil y admin user

### Gap

- no hay analytics operativa ni mantenimiento automatizado del perfil profesional

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ops metrics

- Exponer al menos:
  - perfiles completos/incompletos
  - pendientes de verificación
  - certificaciones por vencer
  - perfiles stale sin actualización reciente
  - top gaps de skills/certificaciones

### Slice 2 — Admin monitoring surface

- Agregar una vista o bloque admin para revisar esas métricas y navegar a acciones

### Slice 3 — Maintenance automation

- Recordatorios o avisos para:
  - completar perfil
  - revisar pendientes
  - renovar certificaciones
  - corregir links/evidencia faltante

## Out of Scope

- campañas de email marketing
- scoring predictivo complejo

## Detailed Spec

La capa operativa debe responder:

- qué tan sano está el sistema de perfiles
- dónde está el backlog
- qué requiere acción humana hoy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen métricas operativas del sistema de talento
- [ ] Admin puede ver pendientes, vencimientos y perfiles stale desde una surface clara
- [ ] Existen automatizaciones o recordatorios mínimos para evitar drift del sistema

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual del panel/alerts resultantes

## Closing Protocol

- [ ] Documentar la operación y ownership del mantenimiento

## Follow-ups

- forecast de expiración y cobertura por unidad/space

## Open Questions

- si los recordatorios viven como notificaciones in-app, email, o ambos
