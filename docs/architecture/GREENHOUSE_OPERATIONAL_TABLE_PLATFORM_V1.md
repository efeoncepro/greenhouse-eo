# GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1

> **Tipo:** Spec de arquitectura de plataforma UI
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes (TASK-743)
> **Estado:** Activa
> **Documentacion funcional:** [docs/documentation/plataforma/tablas-operativas.md](../documentation/plataforma/tablas-operativas.md)

## Resumen ejecutivo

Toda tabla operativa de Greenhouse con celdas editables inline o con > 8 columnas vive bajo un **contrato canonico de densidad de tabla** que resuelve el overflow horizontal contra el `compactContentWidth: 1440` del portal de manera declarativa, robusta y escalable.

El contrato consta de:

1. **Density tokens** — 3 densidades canonicas con tokens fijos.
2. **`useTableDensity` hook** — resuelve la densidad efectiva via prop > cookie > container query > default.
3. **`<DataTableShell>` wrapper** — envuelve la tabla, expone container queries, sticky-first column y scroll fade.
4. **`<InlineNumericEditor>` primitive** — primitiva editable canonica que respeta densidad.
5. **Lint gate `greenhouse/no-raw-table-without-shell`** — bloquea tablas que ignoran el contrato.
6. **Visual regression Playwright** — detecta overflow horizontal en estados criticos.

## Motivacion

`PayrollEntryTable` (14 columnas, `BonusInput` en 2 columnas con `minWidth: 160` + slider + min/max captions) desbordaba horizontalmente el contenedor del portal cuando el periodo entraba en `calculated`/`reopened` (estado editable). El contenedor esta topado en `compactContentWidth: 1440` por `src/configs/themeConfig.ts`. La tabla, en modo editable, alcanzaba ~1500-1600px.

El problema NO era especifico de payroll. Era de plataforma:

- Cada tabla decide ad-hoc cuanto espacio ocupan sus celdas editables.
- No hay container-query awareness — las tablas no se adaptan al contenedor real (sidebar colapsado, customizer abierto, viewport pequeño).
- No hay guardrails — la proxima task que agregue una columna o un nuevo input editable rompe la tabla otra vez.
- No hay test que detecte overflow antes de prod.

Patches puntuales (bajar `minWidth`, sacar el slider) son cortoplacistas — la deuda regresa con la siguiente columna o tabla.

## Capa 1 — Density tokens

Tres densidades canonicas, declaradas en `src/components/greenhouse/data-table/density.ts`:

```ts
export type TableDensity = 'compact' | 'comfortable' | 'expanded'

export interface DensityTokens {
  rowHeight: number
  cellPaddingX: number
  cellPaddingY: number
  inlineEditorMinWidth: number
  showSliderInline: boolean
  showMinMaxCaption: boolean
  fontSize: string
}

export const DENSITY_TOKENS: Record<TableDensity, DensityTokens> = {
  compact: {
    rowHeight: 32,
    cellPaddingX: 6,
    cellPaddingY: 8,
    inlineEditorMinWidth: 110,
    showSliderInline: false,
    showMinMaxCaption: false,
    fontSize: '0.8125rem'
  },
  comfortable: {
    rowHeight: 44,
    cellPaddingX: 10,
    cellPaddingY: 12,
    inlineEditorMinWidth: 130,
    showSliderInline: false,
    showMinMaxCaption: false,
    fontSize: '0.875rem'
  },
  expanded: {
    rowHeight: 56,
    cellPaddingX: 12,
    cellPaddingY: 16,
    inlineEditorMinWidth: 160,
    showSliderInline: true,
    showMinMaxCaption: true,
    fontSize: '0.875rem'
  }
}
```

**Default del tema**: `comfortable`. Razonamiento: balance entre densidad operativa (compact a veces sacrifica legibilidad) y wow factor (expanded ya pierde espacio en tablas anchas).

## Capa 2 — Density resolution

`useTableDensity({ prop?: TableDensity })` resuelve la densidad efectiva con esta precedencia:

1. **Prop explicita** — si la pasa el caller, gana.
2. **Cookie `gh-table-density`** — preferencia del usuario, persistida 365 dias. Set via UI `<DataTableShell.DensityToggle>` (futuro) o por env override.
3. **Container query auto-degrade** — el wrapper observa el ancho real del contenedor con `ResizeObserver`. Si el contenedor mide `< 1280px` y la densidad propuesta es `expanded`, degrada a `comfortable`. Si mide `< 960px` y es `comfortable`, degrada a `compact`.
4. **Default tema** — `comfortable`.

El hook expone:

```ts
const { density, tokens, containerWidth, autoDegrade } = useTableDensity({
  prop: 'comfortable',
  containerRef
})
```

## Capa 3 — `<DataTableShell>` wrapper

Componente canonico que TODA tabla operativa debe usar como ancestro directo del `<TableContainer>` MUI.

```tsx
<DataTableShell
  density="comfortable"            // opcional, override prop
  stickyFirstColumn                // opcional
  identifier="payroll-entries"     // requerido por Playwright
  ariaLabel="Tabla de nomina mensual"
>
  <Table size='small'>
    {/* ... */}
  </Table>
</DataTableShell>
```

Responsabilidades:

- Establece `container-type: inline-size` y `container-name: data-table-shell` para habilitar container queries.
- Provee `<TableDensityProvider>` con la densidad efectiva resuelta.
- Mide el ancho real con `ResizeObserver` y dispara auto-degrade.
- Cuando el contenido desborda incluso con densidad mas baja:
  - Aplica `position: sticky; left: 0` a la primera celda de cada row si `stickyFirstColumn`.
  - Renderiza un gradient fade `linear-gradient(to right, transparent, var(--mui-palette-background-paper))` en el borde derecho.
  - Aplica `role="region" aria-label={ariaLabel} tabindex={0}` para a11y de scroll horizontal.
- Expone atributo `data-table-shell={identifier}` para que Playwright pueda anclar visual regression tests.

## Capa 4 — `<InlineNumericEditor>` primitive

Primitiva canonica para inputs numericos en celdas de tabla, en `src/components/greenhouse/primitives/InlineNumericEditor.tsx`.

```tsx
<InlineNumericEditor
  value={entry.bonusOtdAmount}
  min={entry.bonusOtdMin}
  max={entry.bonusOtdMax}
  step={entry.currency === 'CLP' ? 1000 : 10}
  currency={entry.currency}
  qualifies={entry.kpiOtdQualifies}
  label="Bono OTD"
  onChange={v => onEntryUpdate(entry.entryId, 'bonusOtdAmount', v)}
/>
```

Comportamiento por densidad:

- **`compact`**: solo `<input type="number">` (110px), formato monospace, alineado a la derecha. Para ajustar al min/max, el usuario puede usar `Shift + ArrowUp/Down` (a11y).
- **`comfortable`**: input (130px) + chevron-down a la derecha. Click en chevron abre `<Popper>` con slider + caption min/max + boton reset. Patron Linear/Notion/Stripe.
- **`expanded`**: input (160px) + slider inline + caption min/max debajo (modo legacy `BonusInput`).

Estado disabled (`disabled || !qualifies || max === 0`): renderiza `<Typography color='text.disabled'>{formatCurrency(0, currency)}</Typography>` (sin input).

A11y:

- `aria-label={label}` siempre presente.
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` en el slider.
- Popover en `comfortable` con `role="dialog"` y trap de foco.

## Capa 5 — Lint gate

`greenhouse/no-raw-table-without-shell` (custom ESLint rule, en `.eslintrc.greenhouse-rules.js`).

**Cuando activa**:

Un archivo `.tsx` que importa `Table` desde `@mui/material` (o re-export equivalente) y cumple alguna condicion:

- count de `<TableCell>` directos en un `<TableRow>` declarativo es > 8.
- algun descendiente directo o indirecto de `<TableBody>` es `<input>`, `<TextField>`, `<CustomTextField>` o `<Slider>`.

**Que reporta**:

> Operational table requires `<DataTableShell>` wrapper (TASK-743 contract). See `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`.

**Que evita**:

Que un dev nuevo (humano o agente) introduzca una tabla con celdas editables sin envolverla, regresionando el overflow.

## Capa 6 — Visual regression

`e2e/visual/payroll-table-density.spec.ts` (Playwright).

```ts
test.describe('PayrollEntryTable density contract', () => {
  for (const status of ['draft', 'calculated', 'approved', 'exported']) {
    test(`no horizontal overflow in ${status} viewport=1440`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await loginAsAgent(page)
      await page.goto(`/hr/payroll`)
      // setup period in target status via API or fixture
      await page.waitForSelector('[data-table-shell="payroll-entries"]')
      const overflowPx = await page.evaluate(() => {
        const shell = document.querySelector('[data-table-shell="payroll-entries"]') as HTMLElement
        return shell.scrollWidth - shell.clientWidth
      })
      // After auto-degrade, overflow should be 0 (comfortable) or scroll within shell, not page.
      const bodyOverflow = await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth)
      expect(bodyOverflow).toBeLessThanOrEqual(0)
    })
  }
})
```

Falla si el `<body>` tiene `scrollWidth > clientWidth` — eso significa que el overflow escapo del shell y empuja la pagina. La tabla puede seguir scrolleando internamente (eso es valido), pero NUNCA debe empujar el body.

## Estados editables y density mapping

Para PayrollEntryTable, la densidad efectiva por estado del periodo:

| Period status | `isEditable` | InlineNumericEditor renders | Default density | Overflow risk @ 1440 |
|---|---|---|---|---|
| `draft` | false (no entries) | n/a | n/a | none |
| `calculated` | **true** | input + popover slider | `comfortable` | resuelto |
| `reopened` | **true** | input + popover slider | `comfortable` | resuelto |
| `approved` | false | static `<Typography>` | `comfortable` | none |
| `exported` | false | static `<Typography>` | `comfortable` | none |

## Migracion oportunista

Tablas operativas restantes a migrar al contrato (NO bloquean cierre de TASK-743):

- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` — usa BonusInput tambien.
- `src/components/greenhouse/finance/ReconciliationWorkbench.tsx` — celdas editables (matching, notes).
- `src/components/agency/SpaceIcoScorecard.tsx` — > 8 columnas, sin editables.
- `src/components/finance/FinanceMovementFeed.tsx` — densidad ya manejada propia, alinear con el contrato.

La lint rule las flagea al primer toque significativo. Cierre del cross-task se documenta en cada task derivada.

## Decisiones explicitas

### ¿Por que no `contentWidth: 'wide'`?

Mover `compactContentWidth` global a `wide` rompe consistencia con dashboards diseñados a 1440 (HomeShellV2, AgencyDashboard, FinanceIntelligence). Resuelve el sintoma para una vista a costa de degradar 30+ surfaces. Descartado.

### ¿Por que popover-on-focus para `comfortable`?

Patrón canonico de Linear, Notion, Stripe para edicion inline en tablas densas: el input es siempre estrecho (~130px), pero el control rico (slider, opciones, reset) aparece on-demand. Mantiene `wow factor` sin sacrificar densidad.

### ¿Por que mantener `BonusInput.tsx` como deprecated re-export?

Cero riesgo de breakage. Consumers legacy (ProjectedPayrollView, etc.) siguen funcionando. Migracion oportunista. Eventualmente borramos cuando el ultimo consumer migre.

### ¿Por que `compact` no muestra slider?

En `compact` el row es 32px — no hay espacio fisico para slider sin romper densidad. El usuario que quiere ver/usar slider activa `comfortable` o `expanded` via toggle (futuro) o cookie.

### ¿Por que CSS container queries y no media queries?

Container queries permiten que la tabla se adapte al contenedor real (sidebar abierto/colapsado, customizer abierto, viewport pequeño). Media queries solo veen el viewport — son ciegas al espacio que el contenedor realmente tiene.

## Fuentes canonicas relacionadas

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI base.
- `src/configs/themeConfig.ts` — `compactContentWidth: 1440` (restriccion dura).
- `docs/documentation/plataforma/tablas-operativas.md` — guia funcional para implementadores.
