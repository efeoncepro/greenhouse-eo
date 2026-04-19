# TASK-492 — Document Manager, Access Model & UI Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-489`
- Branch: `task/TASK-492-document-manager-access-model-ui-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el primer gestor documental visible del portal: surfaces, componentes y access model V2 para listar, filtrar, descargar, cargar y revisar documentos desde una base shared, sin obligar a cada módulo a inventar su propia UI.

## Why This Task Exists

Una plataforma documental sin gestor/document admin termina escondida en APIs. Greenhouse necesita una surface reusable con permisos explícitos, tanto para administración interna como para vistas personales o de dominio. Además, el acceso documental toca ambos planos de Identity Access V2: `views` y `entitlements`.

## Goal

- Definir el access model documental del portal.
- Crear componentes/shared views para document list, viewer meta, history y actions.
- Dejar listo el portal para que HR y Finance/Legal monten sus vistas específicas sobre esta base.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- documentar explícitamente qué vive en `views` y qué vive en `entitlements`
- reutilizar componentes shared en `src/components/greenhouse/**`
- mantener copy, estados y accesibilidad alineados al portal

## Dependencies & Impact

### Depends on

- `TASK-489`
- `greenhouse-agent`
- `greenhouse-ui-orchestrator`
- `greenhouse-ux-content-accessibility`

### Blocks / Impacts

- `TASK-494`
- `TASK-495`
- futuras lanes documentales cross-domain

### Files owned

- `src/components/greenhouse/documents/**`
- `src/views/greenhouse/**`
- `src/app/(dashboard)/**`
- `src/config/**` si cambia access model

## Current Repo State

### Already exists

- patterns shared de portal/UI
- access model V2
- private assets serving

### Gap

- no hay un document manager shared
- no hay capabilities/document views canónicas
- cada dominio tendría que inventar su propia screen y tabla

## Scope

### Slice 1 — Access model

- definir `views`, entitlements y route groups si aplican

### Slice 2 — Shared UI

- table/list, filters, states, history panel, version chips, signer state badges

### Slice 3 — Shared routes/pages

- document hub interno y patterns de embedding para módulos específicos

## Out of Scope

- lógica particular de HR o MSA
- provider adapter de firma
- rendering de templates

## Acceptance Criteria

- [ ] existe una surface shared y reusable para documentos
- [ ] el access model queda explícito en `views` y/o `entitlements`
- [ ] HR y Finance/Legal pueden montar sus vistas sin reescribir la base UI

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- validación manual visual

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado

