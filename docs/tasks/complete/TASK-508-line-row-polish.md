# TASK-508 — Line items editor polish: chip consolidation + warning inline + density

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (mejoras visibles en cada fila de cada quote)
- Effort: `Medio`
- Type: `ux` + `refactor`
- Status real: `En implementación`
- Rank: `Post-TASK-507`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-508-line-row-polish`

## Summary

Audit módulo post-TASK-507 identificó 3 mejoras modern-bar en la tabla de ítems del Quote Builder:

1. **Column Tipo con 3 chips apilados** (Tipo, Source, Tier) rompe el rhythm visual y agrega ~60px vertical por row.
2. **Warning inline como Alert full-width** entre rows rompe la grid de la tabla; patrón enterprise: ícono-button con popover en la row.
3. **Row density** alta (~60-70px por row) — los enterprise tables (Linear, Notion, GitHub Issues) ruedan a ~44-48px default.

## Why This Task Exists

Línea a línea del audit completo que hice con modern-ui + greenhouse-ux + microinteractions-auditor. Estas 3 mejoras tienen máximo impact × visibility (cada fila, cada quote) con effort contenido.

## Goal

1. **Chip consolidation**: reducir la columna "Tipo" de 3 chips apilados (Tipo / Source / Tier) a **un chip de tipo + chip de tier** con source como caption text debajo. Menos ruido visual, misma información.
2. **Warning inline**: reemplazar el `<Alert>` full-row por un `<IconButton>` con ícono `tabler-alert-triangle`/`circle`/`info` según severity en la columna de acciones. Click abre un Popover con el mensaje del warning.
3. **Row density**: `<Table size='small'>` ya lo usamos pero los `TableCell` tienen padding default. Bajar a densidad compact via sx o `size='small'` + padding custom. Target: 48-52px por row.

## Acceptance Criteria

- [ ] Columna "Tipo" muestra chip Tipo (Rol/Persona/Entregable/Costo directo) + chip Tier (Óptimo/Atención/Crítico). Source (Catálogo/Servicio/Template/Manual) se muestra como caption text debajo o como ícono al inicio de la columna Ítem.
- [ ] Warnings por row: `IconButton` con color semantic (warning/error/info) en la columna de acciones. Al click, Popover con el mensaje y el badge de severidad. Ya no hay fila extra de `Alert`.
- [ ] Row density: target ~48px height per row (header + data).
- [ ] Warnings globales (sin `lineIndex`) siguen como `Alert` arriba del dock, sin cambio.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: tabla más densa y limpia; warnings no rompen grid.

## Scope

### `QuoteLineItemsEditor.tsx`

**Chip consolidation**:
- Columna "Tipo": dos chips en Stack vertical — tipo (primary color mapping) + tier (semantic color). Caption muted con el source label abajo (o ícono pequeño en Ítem cell).
- Elimina el chip "Source" de la columna tipo.

**Warning inline**:
- En la columna de acciones (ya existe con ajustes + eliminar), agregar tercer IconButton cuando `rowWarnings.length > 0`.
- Color del icon segun severity más alta de los warnings.
- Click abre `Popover` con `QuoteLineWarning` adentro como contenido.
- Elimina el `<TableRow>` extra con `<Alert>` full-width debajo de la row con warning.

**Row density**:
- `<TableCell sx={{ py: 1 }}>` en todas las celdas (half default padding).
- `<TableRow>` sin cambio estructural.
- Target: row height ~48-52px.

## Out of Scope

- Consolidación del tier chip con el margen chip del dock.
- Column sort / filter (futuro).
- Bulk actions (checkbox column).
- Redesign del cost stack expanded.

## Follow-ups

- Polish backlog restante en TASK-499 (CS1-CS4, LI2/4-7, etc.).
