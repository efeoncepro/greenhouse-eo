# TASK-111 - Admin Center Secret Ref Governance UI

## Delta 2026-03-28
- Implementada tabla de governance con columnas: Secret ref, Dirección (Inbound/Outbound), Auth, Owner, Scope, Estado, Verificación
- Separación inbound (endpoint) vs outbound (subscription) con Chip de dirección
- Estados de governance: Vigente, Por vencer, Vencida, Sin verificar (todos inician como Sin verificar)
- Empty state para cuando no hay secret refs registradas
- Nunca se exponen valores crudos — solo metadata de governance

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Status real: `Implementada`
- Rank: `38`
- Domain: `platform`

## Summary

Crear la mini-surface de `secret_ref governance` dentro de `Admin Center` para que credenciales e integraciones sensibles se gestionen como metadata gobernada y no como texto suelto o placeholders.

## Why This Task Exists

`TASK-108` ya dejó visible la idea de `secret_ref`, pero todavía como preparación inicial:

- faltan campos reales y consistentes para `owner`, `scope`, `rotation_status` y `last_verified_at`
- no existe una UI clara para diferenciar credenciales inbound vs outbound
- no está resuelto el patrón visual para crecer sin exponer secretos crudos

La necesidad ahora es de UX/admin governance, no de infraestructura secreta en sí.

## Goal

- Diseñar una surface clara para `secret_ref` dentro de `Admin Center`.
- Mostrar metadata gobernada de credenciales sin exponer valores.
- Separar estado, ownership, scope y verificación en una lectura administrativa consistente.
- Dejar lista la composición para que luego se conecte a datos reales sin rehacer la UI.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`

Reglas obligatorias:

- nunca exponer secretos en claro
- la surface debe hablar en lenguaje de governance, no de consola vendor-specific
- `secret_ref` debe verse como metadata operacional auditada, no como formulario de edición raw

## Dependencies & Impact

### Depends on

- `TASK-108` - Admin Center Governance Shell
- `src/lib/operations/get-operations-overview.ts`
- modelo actual de `webhook_endpoints` / `webhook_subscriptions`

### Impacts to

- `/admin/cloud-integrations`
- futura taxonomía de credenciales gobernadas
- follow-ups de seguridad / secret management

### Files owned

- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/components/greenhouse/admin/**`
- `src/lib/operations/get-operations-overview.ts`
- `docs/tasks/to-do/TASK-111-admin-center-secret-ref-governance-ui.md`

## Current Repo State

### Ya existe

- `Cloud & Integrations` ya muestra `secret refs` como KPI.
- La surface ya evita exponer secretos crudos.
- Existe una primera lista visual con placeholders de ownership/rotation.

### Gap actual

- no hay patrón UI canon para leer `secret_ref`
- ownership y scope aún no tienen jerarquía visual clara
- rotation/verification no tienen semántica estable de estado

## Scope

### Slice 1 - Information architecture

- definir jerarquía visual para `secret_ref`
- separar inbound / outbound / future integrations
- proponer layout de tabla, cards o hybrid list según densidad real

### Slice 2 - Governance states

- modelar estados `ok`, `warning`, `stale`, `missing-owner`, `unverified`
- mostrar `owner`, `scope`, `rotation_status`, `last_verified_at`
- definir empty/loading/partial states

### Slice 3 - Ready-for-runtime composition

- dejar componentes listos para recibir datos reales
- evitar rehacer `Cloud & Integrations` cuando se conecte a metadata runtime

## Out of Scope

- integración con Secret Manager
- edición real de secretos
- rotación automática o manual de credenciales
- cambios de IAM o backend de seguridad

## Acceptance Criteria

- [ ] existe diseño/brief ejecutable para la UI de `secret_ref governance`
- [ ] la surface separa claramente metadata segura vs valores sensibles
- [ ] ownership, scope, rotation y verification tienen semántica visual consistente
- [ ] el patrón puede conectarse a runtime sin reestructurar toda la página

## Verification

- revisión de diseño/brief contra `TASK-108`
- validación visual sobre `/admin/cloud-integrations`
- checklist de nomenclatura + estados admin
