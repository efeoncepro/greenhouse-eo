# TASK-743 — Operational Data Table Density Contract

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Cerrada 2026-05-01`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (tronco activo, doc-first + UI primitives — sin DB writes ni superficies externas)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Toda tabla operativa de Greenhouse desborda el `compactContentWidth: 1440` cuando un input editable inline (BonusInput, etc.) hincha una columna. La causa raiz es que **no hay un contrato de densidad de tabla a nivel plataforma** — cada tabla decide ad-hoc cuanto ocupa cada celda editable. Esta task introduce el contrato canonico (`compact` / `comfortable` / `expanded`), una primitiva editable canonica (`<InlineNumericEditor>`), un wrapper de tabla con container queries (`<DataTableShell>`) y guardrails (lint + visual regression) para que ninguna futura tabla reproduzca el bug.

## Why This Task Exists

PayrollEntryTable scrollea horizontalmente al pasar el periodo a `calculated`/`reopened` porque `BonusInput` (`minWidth: 160` + slider + min/max captions) infla las columnas Bono OTD y Bono RpA cuando `isEditable` es true. La tabla tiene 14 columnas; sumadas alcanzan ~1500-1600px, pero el contenedor del portal esta topado en 1440px (`src/configs/themeConfig.ts`).

El problema NO es de payroll. Es de plataforma:
- No hay un contrato declarativo para "que tan denso debe pintarse este input cuando vive dentro de una tabla operativa".
- No hay container-query awareness — las tablas no se adaptan al contenedor real.
- No hay guardrails — manana cualquier task agrega una columna o un nuevo input editable y rompe la tabla otra vez.
- No hay test que detecte overflow antes de prod.

Necesitamos un contrato que:
1. Defina densidades canonicas con tokens fijos.
2. Provea una primitiva editable que respete la densidad.
3. Envuelva tablas operativas con container queries para auto-degradar densidad.
4. Bloquee por lint+test que se introduzca una tabla nueva sin el contrato.

## Goal

- Eliminar el overflow horizontal actual de PayrollEntryTable cuando el periodo esta en `calculated`/`reopened`.
- Establecer `<DataTableShell>` + `<InlineNumericEditor>` + `useTableDensity` como contrato canonico para toda tabla operativa con celdas editables.
- Documentar la spec en `GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` y manual funcional.
- Cerrar el loop con guardrails (lint rule + visual regression) para que el bug no regrese.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (stack UI, primitivas existentes)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (contrato payroll, no tocar logica)
- `src/configs/themeConfig.ts` (`compactContentWidth: 1440` es restriccion dura — la solucion respeta este limite)

Reglas obligatorias:

- NO mover `contentWidth` a `wide` globalmente — rompe consistencia con dashboards disenados a 1440.
- NO duplicar BonusInput — la primitiva canonica reemplaza, no convive con dos versiones.
- Toda tabla operativa con > 8 columnas o input editable inline DEBE usar `<DataTableShell>`. Lint gate lo enforcea.
- Densidad NO se hardcodea en el componente — se resuelve via contexto + container query + cookie de preferencia.

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` — primer consumer migrado.
- `src/views/greenhouse/payroll/BonusInput.tsx` — primitiva legacy reemplazada por `<InlineNumericEditor>`.
- `src/configs/themeConfig.ts` — `compactContentWidth: 1440` es la restriccion dura que motiva la task.

### Blocks / Impacts

- Cualquier tabla operativa futura con celdas editables inline (PayrollProjected, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed, etc.) debe migrar al contrato. La migracion oportunista NO bloquea esta task; la spec + primitivas + lint gate si.
- Spec `GREENHOUSE_UI_PLATFORM_V1.md` se extiende con seccion "Operational Data Tables".

### Files owned

- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` (nuevo)
- `docs/documentation/plataforma/tablas-operativas.md` (nuevo)
- `src/components/greenhouse/data-table/density.ts` (nuevo)
- `src/components/greenhouse/data-table/useTableDensity.tsx` (nuevo)
- `src/components/greenhouse/data-table/DataTableShell.tsx` (nuevo)
- `src/components/greenhouse/data-table/index.ts` (nuevo)
- `src/components/greenhouse/primitives/InlineNumericEditor.tsx` (nuevo)
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` (migracion)
- `src/views/greenhouse/payroll/BonusInput.tsx` (deprecado, redirige a InlineNumericEditor)

## Current Repo State

### Already exists

- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` — tabla de 14 columnas con celdas editables inline.
- `src/views/greenhouse/payroll/BonusInput.tsx` — input + slider + min/max labels, `minWidth: 160`.
- `src/configs/themeConfig.ts` — `compactContentWidth: 1440` (restriccion dura).
- MUI v7 + Vuexy primitives — base UI stack.

### Gap

- No existe contrato de densidad de tabla operativa.
- No existe primitiva editable canonica que respete densidad.
- No existe wrapper con container queries para auto-degradar densidad cuando el contenedor es estrecho.
- No existe lint gate que detecte tablas nuevas sin shell.
- No existe visual regression que detecte overflow horizontal.

## Scope

### Slice 1 — Spec canonica

- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`: densidades, primitivas, container query rules, scroll behavior, fallback strategy.
- Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con cross-link y resumen.
- `CLAUDE.md`: regla dura nueva — toda tabla operativa con input editable inline debe usar `<DataTableShell>`.

### Slice 2 — Density contract + hook

- `src/components/greenhouse/data-table/density.ts`: tokens canonicos (`compact` / `comfortable` / `expanded`) con row height, padding, editor min-width, slider visibility.
- `src/components/greenhouse/data-table/useTableDensity.tsx`: hook + provider que resuelve densidad via prop > cookie > container query > tema default.

### Slice 3 — Editable primitive

- `src/components/greenhouse/primitives/InlineNumericEditor.tsx`: reemplaza BonusInput. En `compact` solo input, en `comfortable` input + slider en popover-on-focus, en `expanded` input + slider inline.
- Incluye `qualifies`, `disabled`, `min`/`max`, `currency`, formato monospace y a11y (aria-label, role).

### Slice 4 — Shell wrapper

- `src/components/greenhouse/data-table/DataTableShell.tsx`: wrapper canonico con `ResizeObserver`, `container-type: inline-size`, density auto-degrade, scroll horizontal con primera columna sticky + gradient fade en borde derecho.
- Export `<DataTableShell>` + `<DataTableShell.Sticky>` (helper para columna sticky).

### Slice 5 — Migracion PayrollEntryTable

- Envolver `PayrollEntryTable` en `<DataTableShell>`.
- Reemplazar `BonusInput` por `<InlineNumericEditor>` en celdas Bono OTD y Bono RpA.
- Marcar `BonusInput.tsx` como deprecated re-export para no romper imports legacy (PayrollProjected etc. seguiran funcionando hasta migrar oportunisticamente).
- Verificar manualmente: periodo en `calculated` no debe scrollear horizontalmente en viewport 1440px.

### Slice 6 — Guardrails

- ESLint custom rule `greenhouse/no-raw-table-without-shell`: falla si un archivo importa `Table` de `@mui/material` con > 8 `<TableCell>` columnas O con `<input>`/`<TextField>`/`<Slider>` adentro y NO esta envuelto en `<DataTableShell>`.
- Playwright visual regression: snapshot de `/hr/payroll` en estados `draft` (vacio), `calculated` (editable), `approved` (read-only), `exported` (read-only) en viewport 1440x900. Si el `body.scrollWidth > 1440 + sidebar`, falla.
- Doc funcional `docs/documentation/plataforma/tablas-operativas.md`: como usar el contrato sin leer codigo.

## Out of Scope

- Migrar las demas tablas operativas (ProjectedPayrollView, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed). Quedan como follow-up oportunista; el contrato + lint gate las forzaran cuando se toquen.
- Cambiar `compactContentWidth` global.
- Refactorizar layout de PayrollPeriodTab — solo cambia el render de la tabla.
- Reemplazar otras primitivas editable (CompensationDrawer, PayrollEntryExplainDialog) — solo BonusInput por estar en hot path.

## Detailed Spec

### Density tokens

```ts
export type TableDensity = 'compact' | 'comfortable' | 'expanded'

export const DENSITY_TOKENS = {
  compact: {
    rowHeight: 32,
    cellPaddingX: 6,
    cellPaddingY: 8,
    inlineEditorMinWidth: 110,
    showSliderInline: false,    // slider va en popover
    showMinMaxCaption: false,    // captions solo en popover/expanded
    fontSize: '0.8125rem'
  },
  comfortable: {
    rowHeight: 44,
    cellPaddingX: 10,
    cellPaddingY: 12,
    inlineEditorMinWidth: 130,
    showSliderInline: false,    // slider va en popover-on-focus
    showMinMaxCaption: false,
    fontSize: '0.875rem'
  },
  expanded: {
    rowHeight: 56,
    cellPaddingX: 12,
    cellPaddingY: 16,
    inlineEditorMinWidth: 160,
    showSliderInline: true,     // slider inline (modo legacy)
    showMinMaxCaption: true,
    fontSize: '0.875rem'
  }
} as const
```

### Density resolution order

1. Prop `density` explicita en `<DataTableShell density="...">`.
2. Cookie `gh-table-density` (preferencia usuario, persistida 365 dias).
3. Container query: si el contenedor mide < 1280px y la densidad pedida fue `expanded` o `comfortable`, degradar un nivel.
4. Default del tema: `comfortable`.

### Container query

```tsx
<Box sx={{ containerType: 'inline-size', containerName: 'data-table' }}>
  <Box
    sx={{
      '@container data-table (max-width: 1280px)': {
        // auto-degrade signaled via CSS var, hook lee la var
        '--gh-density-degrade': '1'
      }
    }}
  >
    {children}
  </Box>
</Box>
```

### Sticky-first-column + scroll fade

Cuando el ancho del contenido excede el contenedor (despues de auto-degrade), `<DataTableShell>` activa:
- `position: sticky; left: 0` en la primera celda de cada row (Colaborador en payroll).
- Gradient fade `linear-gradient(to right, transparent, var(--mui-palette-background-paper))` en el borde derecho cuando hay scroll restante.
- Indicador a11y: `role="region" aria-label="Tabla con scroll horizontal"`.

### InlineNumericEditor API

```tsx
<InlineNumericEditor
  value={number}
  min={number}
  max={number}
  step={number}
  currency="CLP" | "USD"
  qualifies={boolean}
  disabled={boolean}
  label={string}                  // a11y label
  onChange={(value: number) => void}
  onBlur?={() => void}
/>
```

Comportamiento por densidad:
- `compact`: solo `<input type="number">` con formato monospace, `width: 110`. Slider accesible via shift-arrow keys (a11y).
- `comfortable`: input + boton chevron-down a la derecha que abre popover con slider + min/max + reset. Popover usa `<Popper>` MUI.
- `expanded`: input + slider inline + caption min/max debajo (modo BonusInput legacy).

`disabled || !qualifies || max === 0` -> render `<Typography color='text.disabled'>{formatCurrency(0, currency)}</Typography>`.

### Lint rule pseudocode

```
rule: no-raw-table-without-shell
files: src/views/**/*.tsx, src/components/**/*.tsx
when:
  - imports `Table` from '@mui/material'
  - count of <TableCell> direct children of <TableRow> > 8
  OR
  - any descendant input/Slider/TextField/CustomTextField inside TableBody
then:
  - require ancestor <DataTableShell>
  - if not present: report error "Operational table requires <DataTableShell> (TASK-743 contract)"
```

### Visual regression

```ts
// e2e/visual/payroll-table-density.spec.ts
test.describe('PayrollEntryTable density contract', () => {
  for (const status of ['draft', 'calculated', 'approved', 'exported']) {
    test(`no horizontal overflow in ${status}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await loginAsAgent(page)
      await page.goto(`/hr/payroll?periodStatus=${status}`)
      await page.waitForSelector('[data-table-shell="payroll-entries"]')
      const overflow = await page.evaluate(() => {
        const el = document.querySelector('[data-table-shell="payroll-entries"]') as HTMLElement
        return el.scrollWidth - el.clientWidth
      })
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
```

## Acceptance Criteria

- [ ] PayrollEntryTable no scrollea horizontalmente en viewport 1440px en estado `calculated`/`reopened`.
- [ ] `<DataTableShell>` + `<InlineNumericEditor>` + `useTableDensity` viven en `src/components/greenhouse/data-table/` y `src/components/greenhouse/primitives/`.
- [ ] Density auto-degrade funciona: en contenedor < 1280px, `expanded` degrada a `comfortable`, `comfortable` a `compact`.
- [ ] Cookie `gh-table-density` persiste preferencia y la respeta en proximo render.
- [ ] Lint rule `greenhouse/no-raw-table-without-shell` corre en `pnpm lint` y bloquea tablas que violan el contrato.
- [ ] Visual regression test cubre 4 estados de periodo y falla si hay overflow.
- [ ] Spec `GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` documenta el contrato.
- [ ] Doc funcional `docs/documentation/plataforma/tablas-operativas.md` explica el uso sin leer codigo.
- [ ] CLAUDE.md tiene la regla dura nueva.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual smoke: `/hr/payroll` con periodo en `calculated` en viewport 1440 — no scroll horizontal.
- Manual smoke: collapse sidebar — densidad degrada visualmente.
- Manual smoke: cambiar densidad via cookie/preferencia — persiste tras reload.

## Closing Protocol

- [ ] `Lifecycle` -> `complete`
- [ ] Archivo movido a `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado a `complete`
- [ ] `Handoff.md` actualizado con la migracion del contrato
- [ ] `changelog.md` actualizado con seccion "Operational Data Table Density Contract"
- [ ] Chequeo de impacto cruzado en `to-do/` (PayrollProjected, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed) — agregar nota de migracion oportunista.

## Follow-ups

- Migrar `ProjectedPayrollView` al contrato (probable TASK-744).
- Migrar `ReconciliationWorkbench` (TASK-722 followup).
- Migrar `IcoScorecard` y `FinanceMovementFeed`.
- Considerar densidad en CompensationDrawer (no es tabla pero comparte sliders).
- Telemetria: log densidad efectiva por vista para entender si users prefieren `compact` o `comfortable` (deferred).
