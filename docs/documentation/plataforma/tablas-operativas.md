# Tablas Operativas — Density Contract

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes (TASK-743)
> **Ultima actualizacion:** 2026-05-01
> **Documentacion tecnica:** [GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md](../../architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md)

## Que es

Toda tabla operativa del portal con celdas editables o muchas columnas vive bajo un contrato de densidad declarativo. Esto evita que la tabla "se salga" de la pagina y empuje scroll horizontal hacia el layout cuando el periodo entra en estado editable o cuando agregamos una columna.

Antes, cada tabla decidia ad-hoc cuanto espacio ocupaba cada input editable. Una rotacion del estado del periodo (de `aprobado` a `calculado`) hacia que aparecieran sliders inline y la tabla excediera el ancho maximo del contenedor (1440px). Ahora la densidad se resuelve a nivel plataforma y la tabla se adapta.

## Tres densidades canonicas

| Densidad | Altura row | Editor inline | Slider | Cuando se usa |
| --- | --- | --- | --- | --- |
| `compact` | 32px | 110px | en popover | viewport o contenedor estrecho (< 960px) |
| `comfortable` (default) | 44px | 130px | en popover-on-focus | uso normal — balance densidad y wow factor |
| `expanded` | 56px | 160px | inline + min/max | usuarios que quieren control visual maximo |

## Como se decide la densidad efectiva

En este orden (gana la primera que aplique):

1. **Override por prop** — si el desarrollador pasa `<DataTableShell density="compact">`, gana.
2. **Cookie del usuario** — `gh-table-density` persiste 365 dias. Set via UI (futuro toggle) o por preferencia explicita.
3. **Container query** — la tabla mide su contenedor real con `ResizeObserver`. Si es < 1280px, baja un nivel automatico (`expanded` → `comfortable`). Si es < 960px, `comfortable` → `compact`.
4. **Default del tema** — `comfortable`.

Esto significa que con sidebar colapsada, customizer abierto, viewport pequeño, etc., la tabla degrada sola sin tocar codigo.

## Como usarlo en una vista nueva

```tsx
import { DataTableShell } from '@/components/greenhouse/data-table'
import { InlineNumericEditor } from '@/components/greenhouse/primitives'

const MyOperationalTable = ({ rows, isEditable, onChange }) => (
  <DataTableShell
    identifier="my-table"
    ariaLabel="Tabla operativa de ejemplo"
    stickyFirstColumn
  >
    <Table size="small">
      <TableHead>{/* ... */}</TableHead>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell align="right">
              {isEditable ? (
                <InlineNumericEditor
                  value={row.amount}
                  min={row.min}
                  max={row.max}
                  currency="CLP"
                  qualifies={row.qualifies}
                  label="Monto"
                  onChange={v => onChange(row.id, v)}
                />
              ) : (
                <Typography>{formatCurrency(row.amount)}</Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </DataTableShell>
)
```

## Que no hacer

- **No hardcodear** `minWidth` en una primitiva editable inline. Debe leer densidad via `useTableDensity()`.
- **No** envolver una tabla en un `<TableContainer>` MUI plano sin `<DataTableShell>` cuando tiene > 8 columnas o inputs editables. El lint rule `greenhouse/no-raw-table-without-shell` lo bloquea.
- **No** mover `compactContentWidth` global a `wide` para resolver overflow. Es cortoplacista.
- **No** importar `BonusInput` para codigo nuevo — esta deprecated. Usar `InlineNumericEditor` directo.

## Como funciona el sticky-first-column

Cuando el contenido de la tabla es mas ancho que el shell (incluso despues de auto-degrade), `<DataTableShell stickyFirstColumn>` activa:

- la primera columna queda fija al borde izquierdo mientras se hace scroll horizontal.
- aparece un gradient fade en el borde derecho indicando que hay mas contenido.
- el shell se vuelve `tabindex={0}` para permitir scroll por teclado (a11y).

Solo se activa cuando es realmente necesario; si la tabla cabe, no hay seam visual.

## Como cambiar la densidad como usuario

Hoy la densidad se resuelve por contenedor + default. La cookie `gh-table-density` ya esta cableada y persiste preferencia. El toggle UI publico es follow-up — se agregara como un selector en el header de cada `<DataTableShell>` cuando lo prioricemos.

Para developers que quieran probar manualmente: setear la cookie en DevTools.

```js
document.cookie = 'gh-table-density=compact; path=/; max-age=31536000'
```

## Problemas comunes

| Sintoma | Causa probable | Como verificar |
| --- | --- | --- |
| La pagina scrollea horizontal en `/hr/payroll` | `<DataTableShell>` no esta envolviendo la tabla, o BonusInput legacy en uso | inspeccionar DOM por `[data-table-shell="payroll-entries"]` |
| Lint falla con `no-raw-table-without-shell` | tabla MUI con > 8 cols o input editable sin `<DataTableShell>` | envolver con `<DataTableShell>` |
| InlineNumericEditor no muestra slider en mi celda | densidad efectiva es `compact` o `comfortable` (slider va en popover) | click en chevron o subir densidad |
| Visual regression test rompe en CI | algo en la pagina empuja `body.scrollWidth > body.clientWidth` | inspeccionar elementos absolute/sr-only con `width: 1` (ver TASK-742 fix) |

## Referencias tecnicas

- Spec: [`GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`](../../architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md)
- Tokens: `src/components/greenhouse/data-table/density.ts`
- Hook + provider: `src/components/greenhouse/data-table/useTableDensity.tsx`
- Wrapper: `src/components/greenhouse/data-table/DataTableShell.tsx`
- Primitiva editable: `src/components/greenhouse/primitives/InlineNumericEditor.tsx`
- Lint rule: `eslint-plugins/greenhouse/rules/no-raw-table-without-shell.mjs`
- Visual regression: `tests/e2e/smoke/payroll-table-density.spec.ts`
- Reglas duras: `CLAUDE.md` y `AGENTS.md` (seccion "Operational Data Table Density Contract")
