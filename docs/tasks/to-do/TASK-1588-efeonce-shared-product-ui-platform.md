# TASK-1588 — AXIS Shared Product UI Platform

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `standard`
- UI impact: `primitive`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; ejecución por slices pendiente`
- Rank: `TBD`
- Domain: `ui-platform|architecture|cross-runtime`
- Blocked by: `none`
- Branch: `task/TASK-1588-efeonce-shared-product-ui-platform`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear AXIS como plataforma UI compartida de Efeonce que permita reutilizar tokens, contratos,
primitives y evidencia entre Greenhouse, Globe y futuros productos sin forzar un único
runtime de componentes. Greenhouse conserva gobierno y el catálogo; un package versionado
con adapters permite MUI/Vuexy, Tailwind y futuros runtimes.

## Why This Task Exists

Greenhouse ya tiene primitives y un Lab valiosos, pero están acoplados al portal. Globe está
construyendo un Design System paralelo y los futuros productos repetirían el costo. Copiar
componentes preserva apariencia por poco tiempo, pero pierde contratos, ownership, lifecycle,
accesibilidad y evidencia.

## Goal

- Aceptar y ejecutar `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1`.
- Separar gobierno, contratos, adapters, consumers y Lab.
- Producir un package foundation y un Lab independiente sin romper Greenhouse ni Globe.
- Definir lifecycle y gates para que el desarrollo agéntico reutilice antes de crear.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md` — supersedida
  parcialmente por la decisión nueva
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Normative Docs

- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `TASK-1455` — shell y baseline de Globe.
- `TASK-1485` — registry/pattern governance de Globe, a reencuadrar como piloto.
- `TASK-1556` — foundation del payload Globe, ya completa.

### Blocks / Impacts

- Futuros productos Efeonce que necesiten primitives compartidas.
- `TASK-1485`, `TASK-1552`, `TASK-1474` y `TASK-1483` como consumers/pilotos.
- Greenhouse `/design-system` como catálogo/control plane durante la transición.

### Files owned

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1588-efeonce-shared-product-ui-platform.md`
- Registry y package repository de la plataforma, definidos por child tasks.

## Current Repo State

### Already exists

- Greenhouse tiene tokens AXIS/MUI, primitives, recipes, motion y `/design-system`.
- Globe tiene tokens SSOT, Tailwind v4, primitives y gates propios.
- Existe gobierno documental cross-runtime en Greenhouse.

### Gap

- No existe package portable versionado.
- No existe contrato compartido entre adapters MUI y Tailwind.
- El Lab vive dentro del runtime Greenhouse.
- `TASK-1485` todavía declara un Design System Globe independiente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `greenhouse-eo` governance + Greenhouse UI runtime + Globe UI runtime
- Future candidate home: `ui-package`
- Boundary: tokens/contracts/registry compartidos; adapters y composiciones permanecen en cada consumer
- Server/browser split: metadata y contracts build-time; Lab browser-safe; sin secretos ni lógica de dominio
- Build impact: package privado versionado + Lab Vercel independiente; consumers fijan versiones
- Extraction blocker: primitives actuales mezclan contrato portable con MUI/Vuexy y deben separarse por slices

## Child slices

- `TASK-1589` — package foundation: tokens, contracts, registry schema y release checks.
- `TASK-1590` — Lab independiente: fixtures, catalog, visual/a11y evidence y Vercel project definition.
- `TASK-1591` — adapters y piloto: una primitive simple y una compleja en Greenhouse/MUI y Globe/Tailwind.
- `TASK-1592` — agent workflow: registry lookup, reuse/extend/new, gates y migration guide.

## Acceptance Criteria

- [ ] ADR nueva indexada y decisión Globe anterior marcada como parcialmente supersedida.
- [ ] Child tasks creadas, con ownership y orden de ejecución.
- [ ] Ningún runtime actual pierde funcionalidad por la foundation.
- [ ] Existe un package foundation versionable sin importar MUI/Vuexy desde la capa portable.
- [ ] Existe un Lab ejecutable con fixtures desktop/mobile/keyboard/reduced-motion.
- [ ] Un mismo contrato se consume desde un adapter MUI y uno Tailwind.
- [ ] El flujo de agentes queda documentado y gateado.

## Rollout / Rollback

- Rollout inicial: local y preview; no publicar package estable ni cambiar flags de producción.
- Consumers adoptan versiones fijadas y pueden volver a la versión anterior sin migración de runtime.
- El Lab nuevo convive con `/design-system` hasta demostrar paridad suficiente.
- Rollback: retirar imports de package en el consumer y mantener el runtime actual; no borrar
  primitives ni rutas existentes durante la primera wave.
