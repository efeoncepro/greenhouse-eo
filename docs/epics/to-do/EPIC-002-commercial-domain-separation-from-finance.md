# EPIC-002 — Commercial Domain Separation from Finance

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-002-commercial-domain-separation-from-finance`
- GitHub Issue: `[optional]`

## Summary

Coordina la separacion canonica entre `Comercial` y `Finanzas` en el portal Greenhouse sin romper los paths legacy `/finance/...` en la primera etapa. El objetivo es alinear navegacion, surfaces y autorizacion con el dominio real `commercial.*` que ya existe en datos, eventos y runtime.

## Why This Epic Exists

Quotes, contracts, SOW, master agreements, products y pipeline comercial hoy viven conceptualmente en `commercial`, pero la UI y parte del access model los siguen proyectando como `Finance`. Eso ya no cabe bien en una sola task porque mezcla:

- sidebar y nomenclatura
- `routeGroups`, `authorizedViews` y entitlements
- adopcion de surfaces ya existentes
- extraccion del pipeline comercial desde `Finance > Intelligence`

## Outcome

- `Comercial` existe como dominio top-level del portal, hermano de `Finanzas`.
- Las surfaces comerciales tienen dueños, `view_code` y acceso coherentes con su dominio.
- `Finanzas` conserva sus labels actuales y deja de ser el contenedor canonico de objetos pre-venta / comerciales.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

## Child Tasks

- `TASK-554` — separar `Comercial` del sidebar y la navegacion sin tocar URLs legacy
- `TASK-555` — crear la foundation de access model (`routeGroup commercial`, `comercial.*`, compat legacy)
- `TASK-556` — adoptar quotes / contracts / SOW / MSA / products como surfaces comerciales
- `TASK-557` — extraer `Pipeline comercial` del encuadre `Finance > Intelligence`

## Existing Related Work

- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/tasks/complete/TASK-460-contract-sow-canonical-entity.md`
- `docs/tasks/complete/TASK-486-commercial-quotation-canonical-anchor.md`
- `docs/tasks/complete/TASK-457-ui-revenue-pipeline-hybrid.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Exit Criteria

- [ ] El sidebar top-level expone `Comercial` y `Finanzas` como dominios distintos sin renombrar los labels actuales de Finanzas
- [ ] Las surfaces comerciales tienen `routeGroup`/`view_code`/compatibilidad transicional documentados y aplicados
- [ ] `Pipeline comercial` deja de depender del framing financiero como surface primaria

## Non-goals

- Mover de inmediato todos los paths a `/commercial/...`
- Introducir la familia de roles `sales*` en el mismo lote
- Cambiar `portalHomePath` o startup policy

## Delta 2026-04-21

Epic creado a partir de la decision arquitectonica `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`. Se formaliza que esta separacion no cabe en una sola task y requiere al menos 4 child tasks por blast radius y capas de acceso afectadas.
