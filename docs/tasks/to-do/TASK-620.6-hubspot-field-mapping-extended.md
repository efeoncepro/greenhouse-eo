# TASK-620.6 — HubSpot Field Mapping Extended (sellable_tools + sellable_artifacts + nested service_modules)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C complemento)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-620, TASK-620.1, TASK-620.2, TASK-620.3`
- Branch: `task/TASK-620.6-hubspot-field-mapping-extended`

## Summary

Field mapping detallado HubSpot Products outbound v3 para las nuevas tablas del catalogo unificado: sellable_tools (vendor + partner_id + license_type), sellable_artifacts (deliverable_format + is_priced_directly + estimated_hours), nested service_modules (representacion en HubSpot bundles via flattening con bundle_parent_path). Documenta mapeo bidireccional (outbound + inbound rehydration).

## Why This Task Exists

TASK-620.1.1 menciona `product_type='tool_license'` pero no detalla campos. TASK-620.3 menciona "HubSpot flattening" pero sin spec. TASK-620.2 (artifacts) no aborda HubSpot. Sin este mapping detallado:

- Sales rep en HubSpot no ve metadata partner ni licencia
- Inbound sync rehydration no sabe a que tabla de Greenhouse corresponde un producto HubSpot
- Nested service modules pierden jerarquia visible en HubSpot

## Goal

- Field mapping documentado para sellable_tools (incluye partner attribution)
- Field mapping documentado para sellable_artifacts
- Estrategia de flattening de nested service_modules con `bundle_parent_path` property
- Outbound adapter v3 implementado
- Inbound rehydration v2 actualizado para reconocer los 3 nuevos product_types
- Doc canonico publicado

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)

## Dependencies & Impact

### Depends on

- TASK-620 + 620.1 + 620.1.1 + 620.2 + 620.3 (catalogo unificado existe)
- HubSpot custom properties API access

### Blocks / Impacts

- TASK-619.4 (HubSpot signature sync usa products mapping)
- HubSpot portal admin tareas (crear ~15 custom properties)

### Files owned

- `src/lib/integrations/hubspot/products-outbound-adapter.ts` (modificado a v3)
- `src/lib/integrations/hubspot/products-inbound-rehydration.ts` (modificado)
- `src/lib/integrations/hubspot/property-definitions.ts` (modificado: agregar 15 properties)
- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` (updated v3)
- `scripts/hubspot-create-properties.ts` (script idempotente para crear properties via API)

## Scope

### Slice 1 — Property definitions (0.5 dia)

15 custom properties HubSpot:

| Property | Type | Source table | Purpose |
| --- | --- | --- | --- |
| `gh_product_kind` | enum | all | role / tool / artifact / service_module / service_module_child |
| `gh_sellable_tool_vendor` | string | sellable_tools.vendor | "Adobe", "Microsoft", "HubSpot" |
| `gh_sellable_tool_partner_id` | string | sellable_tools.partner_id | PARTNER-ADOBE, etc. |
| `gh_sellable_tool_license_type` | enum | sellable_tools.license_type | per_seat / per_org / usage_based / one_time |
| `gh_sellable_tool_unit_label` | string | sellable_tools.unit_label | seat / user / GB/month |
| `gh_partner_revenue_share_pct` | number | tool_partners.commission_pct | 10.00, 15.00, 20.00 |
| `gh_artifact_format` | string | sellable_artifacts.deliverable_format | "PDF + Figma" |
| `gh_artifact_priced_directly` | bool | sellable_artifacts.is_priced_directly | true / false |
| `gh_artifact_estimated_hours` | number | sellable_artifacts.estimated_hours | nullable |
| `gh_service_module_tier` | enum | service_modules.tier | 1 / 2 / 3 / 4 |
| `gh_service_module_commercial_model` | enum | service_modules.commercial_model | on_going / on_demand / hybrid / license_consulting |
| `gh_bundle_parent_path` | string | service_module_children resolved | "Brand Launch Premium > Brand Foundation Pkg" |
| `gh_bundle_depth` | number | depth in tree | 0, 1, 2, 3 |
| `gh_bundle_optional` | bool | service_module_children.is_optional | true / false |
| `gh_bundle_pricing_override_pct` | number | service_module_children.override_pricing_pct | -100 to 100 |

### Slice 2 — Outbound adapter v3 (0.75 dia)

Modificar `products-outbound-adapter.ts`:

- Switch en `gh_product_kind` para construir payload diferente per type
- Para `sellable_tool` con partner_id: incluir `product_type='tool_license'` + 5 partner properties
- Para `sellable_artifact`: incluir `product_type='deliverable'` (nuevo) + 3 artifact properties
- Para nested service_module child: incluir `gh_bundle_parent_path` + `gh_bundle_depth` (flattening)

### Slice 3 — Inbound rehydration v2 (0.5 dia)

Lookup por `gh_product_kind` -> tabla destino:
- `tool` -> sellable_tools.merge or insert
- `artifact` -> sellable_artifacts.merge or insert
- `service_module` -> service_modules.merge
- `service_module_child` -> service_module_children.merge

Conflict resolution: `last_modified_by_source_system` ya existente.

### Slice 4 — Properties bootstrap script + doc (0.25 dia)

`scripts/hubspot-create-properties.ts`:

- Idempotente (skip si property ya existe)
- Crea las 15 properties en HubSpot portal via API
- Documenta en `docs/operations/runbooks/hubspot-properties-bootstrap.md`

## Out of Scope

- Sync de tool_partners como HubSpot entity separada (custom object)
- HubSpot bundles nativos (esperan beta Q3 2026 — ver Delta v1.7 nota)

## Acceptance Criteria

- [ ] 15 properties creadas en HubSpot prod via script
- [ ] outbound adapter v3 emite correctamente per product_kind
- [ ] inbound rehydration reconoce y rutea
- [ ] nested service_modules visibles en HubSpot con bundle_parent_path
- [ ] tests passing
- [ ] script bootstrap re-ejecutable sin side effects
- [ ] doc spec updated v3

## Verification

- E2E: crear sellable_tool con partner Adobe -> verificar HubSpot product con product_type=tool_license + 5 properties
- E2E: crear nested service module 3 niveles -> verificar HubSpot products con bundle_parent_path
- Inbound: editar product en HubSpot -> verificar rehydration en Greenhouse

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con HubSpot properties listadas + screenshots
- [ ] `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` v3 publicado
