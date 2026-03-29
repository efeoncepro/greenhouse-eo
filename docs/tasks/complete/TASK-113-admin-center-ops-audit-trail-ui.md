# TASK-113 - Admin Center Ops Audit Trail UI

## Delta 2026-03-28
- ActivityTimeline (patrón Vuexy @mui/lab) en sección "Audit trail operativo"
- Eventos del bus operativo + handlers degradados fusionados y ordenados por timestamp
- Cada entrada muestra: título (monospace), resultado (Chip tonal), detalle, timestamp, actor label, follow-up
- Leyenda visual: success/warning/error/info con TimelineDot
- Placeholder para acciones manuales: aparecerán cuando exista ledger de auditoría persistido

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Status real: `Implementada`
- Rank: `40`
- Domain: `platform`

## Summary

Diseñar la mini-surface de `ops audit trail` para que `Ops Health` no solo exponga acciones manuales, sino también historial, resultado y contexto de ejecución dentro del control plane.

## Why This Task Exists

`TASK-108` ya dejó visibles acciones operativas como replay/retry/publish, pero todavía falta la mitad del patrón de governance:

- quién ejecutó qué
- cuándo se ejecutó
- con qué resultado
- dónde quedó el siguiente paso o troubleshooting

Hoy existe acción manual sin suficiente audit trail visual.

## Goal

- Diseñar un panel de auditoría de acciones operativas dentro de Admin Center.
- Unificar lenguaje de `action`, `result`, `status`, `actor`, `timestamp` y `follow-up`.
- Separar acciones manuales, ejecuciones automáticas y errores relevantes.
- Dejar lista la UI para que luego se conecte a logs o ledger runtime.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`

Reglas obligatorias:

- la surface debe servir para auditoría administrativa, no para debug raw de backend
- debe distinguir ejecución manual vs automática
- debe mostrar resultado y siguiente acción sin exigir abrir SQL o logs de entrada

## Dependencies & Impact

### Depends on

- `TASK-108` - Admin Center Governance Shell
- rutas/admin actions ya expuestas en `/admin/ops-health`
- futura fuente de ledger o historial de ejecución

### Impacts to

- `/admin/ops-health`
- runbooks operativos en admin
- futuras decisiones de persistencia de action history

### Files owned

- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/components/greenhouse/admin/**`
- `src/app/api/admin/ops/**`
- `docs/tasks/to-do/TASK-113-admin-center-ops-audit-trail-ui.md`

## Current Repo State

### Ya existe

- acciones operativas manuales en `Ops Health`
- señales recientes del outbox y handlers reactivos
- focos actuales y vistas mínimas de failures

### Gap actual

- no hay historial visible de ejecución manual
- el feedback actual es transitorio y no auditable
- no existe patrón estable para action result / actor / timestamp / follow-up

## Scope

### Slice 1 - Audit model UI

- definir lista o timeline de acciones ejecutadas
- modelar actor, acción, estado, timestamp y resultado
- separar manual vs automático

### Slice 2 - Runbook visibility

- mostrar troubleshooting o next step por resultado
- clarificar qué acciones son seguras para reintento y cuáles no
- reforzar contexto sin meter ruido de backend

### Slice 3 - Ready-for-ledger composition

- dejar la UI preparada para conectar datos persistidos
- evitar rediseño cuando exista audit trail real

## Out of Scope

- persistencia backend del action history
- sistema completo de logs centralizados
- rediseño total de `Ops Health`
- cambios de permisos o autorización operativa

## Acceptance Criteria

- [ ] existe brief ejecutable para `ops audit trail`
- [ ] la UI separa acciones manuales, automáticas y fallidas
- [ ] resultado, actor y timestamp tienen semántica visible y consistente
- [ ] el patrón puede conectarse a un ledger futuro sin rehacer la surface

## Verification

- revisión del brief contra `/admin/ops-health`
- chequeo de consistencia con acciones ya expuestas en `TASK-108`
- walkthrough visual del patrón propuesto
