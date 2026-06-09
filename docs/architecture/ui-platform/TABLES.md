# Greenhouse UI Platform — Tables & Data Density

> Parte de **Greenhouse UI Platform**. Índice: [README.md](./README.md). Historial: [HISTORIAL.md](./HISTORIAL.md).

## Operational Data Table Density Contract

Toda tabla operativa con celdas editables inline o > 8 columnas vive bajo el contrato de densidad (3 densidades `compact` / `comfortable` / `expanded`, wrapper `DataTableShell`, primitive editable `InlineNumericEditor`).

**Fuente canónica:** [GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md](../GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md) (spec completa: tokens de densidad, resolución prop > cookie > container-query, lint rule `greenhouse/no-raw-table-without-shell`, visual regression).

Delta de origen: [HISTORIAL.md](./HISTORIAL.md) → Delta 2026-05-01 (TASK-743).

## TanStack React Table

Componentes avanzados extraídos de Vuexy full-version (sorting, filtering, pagination, column visibility) → ver [HISTORIAL.md](./HISTORIAL.md) Delta 2026-04-04.

## Numéricos en tablas

Montos / IDs / KPIs usan **Geist + `tabular-nums`** vía variantes `monoId` / `monoAmount` / `kpiValue` — nunca monospace. Ver la skill `typography-design` + [GREENHOUSE_DESIGN_TOKENS_V1.md](../GREENHOUSE_DESIGN_TOKENS_V1.md) §3.

## Charts en superficies de datos

Para visualizaciones (no tablas) ver `dataviz-design` + las primitives de chart cards en [PRIMITIVES.md](./PRIMITIVES.md).
