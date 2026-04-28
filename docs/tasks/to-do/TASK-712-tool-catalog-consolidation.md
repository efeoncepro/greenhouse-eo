# TASK-712 — Tool Catalog Consolidation: provisioning, cost models, lifecycle

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Domain | AI Tooling / Cost Intelligence |
| Sequence | Paralelo a TASK-710, prerequisito de TASK-711 (UI) |

## Summary

Consolidar `tool_catalog` como **fuente de verdad del cost model de cada tool** y de su ciclo de vida (active / deprecated / archived). Hoy el catálogo está parcialmente poblado, no declara cost model de forma estructurada, y no tiene lifecycle claro.

Esta task entrega:

- Schema enriquecido de `tool_catalog` (cost_model, unit_cost_clp, currency_native, revenue_attribution_default, lifecycle_status, vendor_id)
- Provisioning de las ~40-60 tools en uso real (Adobe CC, Notion, Vercel, Anthropic, OpenAI, GitHub, Asana, Slack, etc.)
- Cost model declarativo:
  - `subscription` — costo fijo per seat/month (Adobe CC, Notion, GitHub Pro)
  - `per_credit` — pay-per-use (Anthropic API, OpenAI API, Vercel functions)
  - `hybrid` — base subscription + overage (Vercel Pro, Cloudflare Workers)
  - `included` — bundled, no incremental cost (gmail, calendar)
- FK `vendor_id` apuntando a `greenhouse_core.providers` (tool ↔ proveedor canonical)
- VIEW `tool_catalog_active` con filtro `lifecycle_status='active'` para consumers downstream

## Why This Task Exists

El programa MLCM_V1 (`docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`) requiere que cada tool declare cómo se computa su costo (per-seat fijo, per-credit consumido, etc.) para que el materializer de Fact 2 (TASK-710) elija correctamente entre:

- Distribución igual entre members con assignment activo (subscription model)
- Distribución prorrateada por consumo medido (per_credit model con telemetría)
- Distribución mixta (hybrid model)

Sin un catálogo robusto, el materializer cae a fallback uniforme que produce drift no auditable.

## Scope

### In scope

- Migración ALTER TABLE `tool_catalog` agregando columnas faltantes con defaults seguros
- Migración seed de las tools en uso real con cost model declarado
- Helper `getToolCatalogEntry(toolId)` con cache in-memory 60s
- Reliability signal `tool_catalog.coverage` — % expenses con `tool_id` resuelto contra catálogo activo
- Procedimiento de onboarding de tool nueva: documentar en `docs/operations/tool-catalog-onboarding.md`
- Tests vitest:
  - Cada cost_model produce el split correcto en materializer (paridad con TASK-710)
  - lifecycle_status='archived' no aparece en `tool_catalog_active`
  - FK vendor_id resuelve a provider válido

### Out of scope

- Auto-discovery de tools nuevas via expense classification ML — futuro
- Renewal management / contract tracking — futuro
- License count reconciliation con vendor APIs — futuro

## Architecture Reference

Spec raíz: `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` §3 Cost Models por Tool

Provider model: `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Proveedor canonical)

## Dependencies & Impact

### Depende de

- `greenhouse_core.providers` table — ya existe
- TASK-705 cost rules — provee mapping `expense → tool_id` para tools conocidas

### Impacta a

- TASK-710 (Tool Consumption Bridge) — consume `tool_catalog.cost_model` para decidir el split
- TASK-711 (Tool Assignment UI) — selectores leen del catálogo activo
- Reliability dashboard — nueva signal `tool_catalog.coverage`

### Archivos owned

- `migrations/<ts>_task-712-tool-catalog-enrichment.sql`
- `migrations/<ts>_task-712-tool-catalog-seed.sql`
- `src/lib/cost-intelligence/tool-catalog.ts`
- `docs/operations/tool-catalog-onboarding.md`

## Acceptance Criteria

- Catalog cubre 100% de tools que aparecen en expenses 90 últimos días
- Cada entrada tiene `cost_model`, `unit_cost_clp`, `currency_native`, `vendor_id`
- Lifecycle workflow documentado y aplicado
- Reliability signal `tool_catalog.coverage` >95%
- Tests passing
- Documentación de onboarding clara para Ops

## Notes

Esta task es prerequisito para que TASK-711 (Tool Assignment UI) tenga un selector confiable, y para que TASK-710 (materializer) tenga semántica correcta del cost split.
