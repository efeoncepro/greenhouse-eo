# CODEX TASK — Typography Variant Adoption: Migración de fontWeight/fontFamily hardcodeados a theme variants

## Delta 2026-05-02 — supersedida parcialmente por TASK-567 (EPIC-004)

El barrido de `fontFamily` hardcodeada en UI productiva fue ejecutado por **TASK-567** (Slices 2-3) bajo el contrato Geist + Poppins (post TASK-566 pivot). Ese trabajo:

- Eliminó 300 occurrences de `fontFamily: 'monospace'`/`'Poppins'`/composite mono stacks vía codemod conservador (262 + 38 reemplazos automáticos en 135 archivos)
- 6 casos especiales resueltos manualmente (InputProps.sx anidado, ternarios, NexaThread `<code>` con eslint-disable justificado)
- Activó la regla `greenhouse/no-hardcoded-fontfamily` en modo `error` para bloquear regresiones desde CI
- Excluye legítimamente: `src/components/theme/**`, `src/@core/theme/**`, `src/app/global-error.tsx`, `src/app/public/**`, `src/emails/**`, `src/lib/finance/pdf/**`

**Lo que TASK-021 sigue cubriendo** (no superado por TASK-567):

- Migración de `fontWeight` hardcodeado a variants semánticos (TASK-567 explícitamente declaró fontWeight como out-of-scope; queda como follow-up si discovery posterior lo justifica)
- Adopción opt-in de `monoId`/`monoAmount`/`kpiValue` en componentes que tras el sweep perdieron tabular-nums (TASK-567 eliminó la fontFamily redundante; TASK-021 puede subir variants donde el contexto lo amerite — IDs, montos, KPIs)

Nota: las menciones a "DM Sans" en este documento son obsoletas — el contrato vigente es **Geist Sans (default) + Poppins (display)**.

## Resumen

El theme MUI de Greenhouse (`mergedTheme.ts`) ya define la jerarquía tipográfica correcta — DM Sans como default, Poppins para headings/buttons/overline, y tres custom variants (`monoId`, `monoAmount`, `kpiValue`). Sin embargo, **56+ instancias** en 37 archivos siguen hardcodeando `fontWeight`, `fontFamily` o ambos en `sx` props, lo que:

- Duplica lo que el theme ya provee (15+ instancias redundantes)
- Impide que un cambio de theme se propague consistentemente
- Dificulta auditar el sistema tipográfico
- Genera confusión sobre qué peso/familia usar al crear componentes nuevos

Esta task migra esas instancias al sistema de variants del theme de forma controlada y por slices.

## Contexto técnico

### Ya implementado (CODEX_TASK_Typography_Hierarchy_Fix — cerrada)

- `mergedTheme.ts`: DM Sans default, Poppins h1-h6/button/overline con pesos 600-800
- `layout.tsx`: fonts cargadas via `next/font/google` con CSS vars `--font-dm-sans` y `--font-poppins`
- Custom variants en theme:
  - `monoId` — `fontFamily: monospace, fontWeight: 600, fontSize: 0.875rem` — para EO-IDs, códigos
  - `monoAmount` — `fontFamily: monospace, fontWeight: 700, fontSize: 0.8125rem` — para montos
  - `kpiValue` — `fontFamily: Poppins, fontWeight: 800, fontSize: 1.75rem` — para números hero
- Type augmentation en `types.ts`: `TypographyVariants`, `TypographyVariantsOptions`, `TypographyPropsVariantOverrides`

### Regla de `@core/`

`src/@core/theme/typography.ts` **NO se toca**. Todos los overrides viven en `mergedTheme.ts`.

## Inventario completo

### Categoría 1: Redundantes — remover sx (el theme ya cubre)

Instancias donde el `variant` MUI ya lleva el `fontWeight` y/o `fontFamily` correcto desde `mergedTheme.ts`, haciendo la prop `sx` innecesaria.

| # | Archivo | Línea | Código actual | Por qué es redundante |
|---|---------|-------|---------------|----------------------|
| 1 | `components/greenhouse/ExecutiveHeroCard.tsx` | 87 | `fontWeight: 700` en Chip eyebrow | Chip hereda button (600); si 700 no es intencional, remover |
| 2 | `components/greenhouse/ExecutiveHeroCard.tsx` | 101 | `fontWeight: 800` en `variant='h3'` | h3 = 600 en theme; si se necesita 800, cambiar a `variant='h1'` |
| 3 | `components/greenhouse/ExecutiveHeroCard.tsx` | 141 | `fontWeight: 700` en `variant='overline'` | overline = 600 en theme |
| 4 | `components/greenhouse/ExecutiveHeroCard.tsx` | 173 | `fontWeight: 700` en `variant='overline'` | overline = 600 en theme |
| 5 | `components/greenhouse/ExecutiveHeroCard.tsx` | 181 | `fontWeight: 800` en `variant='h2'` | h2 = 700 en theme; si 800 es intencional, cambiar a `variant='h1'` |
| 6 | `components/greenhouse/ExecutiveHeroCard.tsx` | 210 | `fontWeight: 600` en Chip | Chip button = 600 |
| 7 | `components/greenhouse/ExecutiveHeroCard.tsx` | 221 | `fontWeight: 600` en Chip | Chip button = 600 |
| 8 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 218 | `fontWeight: 700` en `variant='overline'` | overline = 600 |
| 9 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 241 | `fontWeight: 700` en `variant='h6'` | h6 = 600 |
| 10 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 279 | `fontWeight: 700` en `variant='overline'` | overline = 600 |
| 11 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 285 | `fontWeight: 700` en `variant='h6'` | h6 = 600 |
| 12 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 355 | `fontWeight: 700` en `variant='h6'` | h6 = 600 |
| 13 | `views/greenhouse/finance/SupplierDetailView.tsx` | 249 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 14 | `views/greenhouse/finance/ExpenseDetailView.tsx` | 190 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 15 | `views/greenhouse/finance/IncomeListView.tsx` | 248 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 16 | `views/greenhouse/finance/IncomeListView.tsx` | 276 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 17 | `views/greenhouse/finance/FinanceDashboardView.tsx` | 510 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 18 | `views/greenhouse/finance/FinanceDashboardView.tsx` | 544 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 19 | `views/greenhouse/finance/ClientsListView.tsx` | 117 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 20 | `views/greenhouse/finance/ClientsListView.tsx` | 145 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 21 | `views/greenhouse/finance/ReconciliationView.tsx` | 238 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 22 | `views/greenhouse/finance/ReconciliationView.tsx` | 266 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 23 | `views/greenhouse/finance/ReconciliationDetailView.tsx` | 254 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 24 | `views/greenhouse/finance/ClientDetailView.tsx` | 227 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 25 | `views/greenhouse/finance/SuppliersListView.tsx` | 136 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 26 | `views/greenhouse/finance/SuppliersListView.tsx` | 164 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 27 | `views/greenhouse/finance/ExpensesListView.tsx` | 179 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 28 | `views/greenhouse/finance/IncomeDetailView.tsx` | 359 | `fontFamily: 'Poppins', fontWeight: 600` en `variant='h4'` | h4 = Poppins + 600 |
| 29 | `views/greenhouse/finance/ClientEconomicsView.tsx` | 514 | `fontWeight: 600` en `variant='h5'` | h5 = 600 |
| 30 | `views/greenhouse/finance/ClientEconomicsView.tsx` | 539 | `fontWeight: 600` en `variant='h5'` | h5 = 600 |
| 31 | `views/greenhouse/admin/tenants/TenantCrmPanel.tsx` | 301 | `fontWeight: 600` en `variant='h6'` | h6 = 600 |

**Total: 31 instancias redundantes.**

### Categoría 2: Migrables a `variant='monoId'`

Patrón: `fontFamily: 'monospace'` + `fontWeight: 600` (o solo monospace) para identificadores.

| # | Archivo | Línea | Contexto |
|---|---------|-------|----------|
| 1 | `views/greenhouse/people/PersonLeftSidebar.tsx` | 121 | EO-ID del colaborador |
| 2 | `views/greenhouse/GreenhouseAdminTenantDetail.tsx` | 122 | publicId del tenant |
| 3 | `views/greenhouse/organizations/OrganizationLeftSidebar.tsx` | 116 | publicId de la organización |
| 4 | `views/greenhouse/admin/users/UserDetailHeader.tsx` | 60 | EO-ID en Chip (necesita sx fontSize) |
| 5 | `views/greenhouse/people/tabs/PersonIdentityTab.tsx` | ~137 | EO-ID en KeyValue |
| 6 | `views/greenhouse/people/tabs/PersonMembershipsTab.tsx` | ~202 | FTE monospace |
| 7 | `views/greenhouse/people/PeopleListTable.tsx` | ~108 | FTE monospace |

**Total: ~7 instancias.**

### Categoría 3: Migrables a `variant='monoAmount'`

Patrón: `fontFamily: 'monospace'` + `fontWeight: 700` para montos de dinero.

| # | Archivo | Línea | Contexto |
|---|---------|-------|----------|
| 1 | `views/greenhouse/people/PersonLeftSidebar.tsx` | 153 | Salario base |
| 2 | `views/greenhouse/people/tabs/PersonFinanceTab.tsx` | ~203 | Costo por cliente |
| 3 | `views/greenhouse/people/tabs/PersonFinanceTab.tsx` | ~264 | Monto en tabla |
| 4 | `views/greenhouse/people/tabs/PersonFinanceTab.tsx` | ~269 | Total neto monospace |
| 5 | `views/greenhouse/payroll/PayrollEntryTable.tsx` | 252 | Neto en tabla payroll |
| 6 | `views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx` | 431 | Neto en tabla expense |
| 7 | `views/greenhouse/payroll/MemberPayrollHistory.tsx` | 329 | Neto en historial |
| 8 | `views/greenhouse/finance/FinanceDashboardView.tsx` | 797 | Monto payroll en P&L |
| 9 | `views/greenhouse/finance/FinanceDashboardView.tsx` | 803 | Monto payroll en P&L |
| 10 | `views/greenhouse/dashboard/ClientAiCreditsSection.tsx` | 160 | Monto de créditos AI |

**Total: ~10 instancias.**

### Categoría 4: Migrables a `variant='kpiValue'`

Patrón: `fontWeight: 800` + tamaño grande para números hero.

| # | Archivo | Línea | Contexto |
|---|---------|-------|----------|
| 1 | `components/greenhouse/ExecutiveHeroCard.tsx` | 145 | Valor hero principal |
| 2 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 261 | Valor compacto hero |
| 3 | `components/greenhouse/ExecutiveMiniStatCard.tsx` | 332 | Valor compacto hero |
| 4 | `views/greenhouse/dashboard/ClientDashboardHero.tsx` | 63 | Título hero del dashboard |

**Total: ~4 instancias.**

### Categoría 5: Legítimas — no tocar

Instancias donde el override es intencional y no tiene variant equivalente.

| Patrón | Archivos | Count | Justificación |
|--------|----------|-------|---------------|
| `fontWeight: 600` en `variant='body1/body2'` | PersonIdentityTab, ProjectTeamSection, TeamCapacitySection, finance views | ~12 | body1/body2 no define weight en theme; 600 es énfasis inline intencional |
| `fontWeight: 700` en `<TableCell>` | FinanceDashboardView, PayrollEntryTable, PersonFinanceTab, MemberPayrollHistory | ~12 | TableCell no es Typography; es énfasis de fila resumen |
| `fontWeight: 700` en `variant='caption'` | BrandLogo, AccountTeamDossierSection, TeamDossierSection, ExecutiveMiniStatCard | ~5 | caption no define weight; 700 es tratamiento visual para badges/etiquetas |
| `fontFamily/fontWeight` en config ApexCharts | chart-options.ts, OrganizationIcoTab.tsx | ~6 | Objetos de configuración de librería, no componentes React |

**Total: ~35 instancias legítimas que se quedan.**

## Fases de implementación

### Slice 1: Limpiar redundantes en Finance (15 archivos, ~16 instancias)

El bloque más grande y más mecánico. Todas son `variant='h4'` o `variant='h5'` con `fontFamily: 'Poppins'` y/o `fontWeight: 600` que el theme ya provee.

**Cambio tipo:**
```tsx
// Antes
<Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>

// Después
<Typography variant='h4' sx={{ mb: 1 }}>
```

Archivos:
- `SupplierDetailView.tsx` (1)
- `ExpenseDetailView.tsx` (1)
- `IncomeListView.tsx` (2)
- `FinanceDashboardView.tsx` (2)
- `ClientsListView.tsx` (2)
- `ReconciliationView.tsx` (2)
- `ReconciliationDetailView.tsx` (1)
- `ClientDetailView.tsx` (1)
- `SuppliersListView.tsx` (2)
- `ExpensesListView.tsx` (1)
- `IncomeDetailView.tsx` (1)
- `ClientEconomicsView.tsx` (2 — h5)
- `TenantCrmPanel.tsx` (1 — h6)

### Slice 2: Limpiar redundantes en Executive Cards (~15 instancias)

Requiere decisión de diseño: varios overrides suben el peso de overline de 600→700 y h6 de 600→700. Si la intención visual es que estos elementos sean más pesados que el default del theme, la solución correcta es:
- Opción A: aceptar 600 como peso visual (remover override)
- Opción B: crear variants intermedios (`overlineBold`, `h6Bold`) si realmente se necesita 700

**Archivos:**
- `ExecutiveHeroCard.tsx` (7 instancias)
- `ExecutiveMiniStatCard.tsx` (6 instancias)

**Nota:** este slice necesita revisión visual antes de mergear — cambiar de 700→600 en overline puede aplanar la jerarquía de los KPI cards.

### Slice 3: Migrar a `monoId` y `monoAmount` (~17 instancias)

Reemplazo directo de patrones monospace a custom variants.

**Cambio tipo:**
```tsx
// Antes
<Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{eoId}</Typography>

// Después
<Typography variant='monoId'>{eoId}</Typography>
```

```tsx
// Antes
<Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCLP(neto)}</Typography>

// Después
<Typography variant='monoAmount'>{formatCLP(neto)}</Typography>
```

### Slice 4: Migrar a `kpiValue` (~4 instancias)

Reemplazo de hero numbers a custom variant.

**Cambio tipo:**
```tsx
// Antes
<Typography variant='h5' sx={{ fontWeight: 800, lineHeight: 1.12 }}>{value}</Typography>

// Después
<Typography variant='kpiValue'>{value}</Typography>
```

## Criterios de aceptación

### Por slice
- [ ] `npx tsc --noEmit` limpio
- [ ] `pnpm test` — todos los tests pasan
- [ ] Ningún cambio visual involuntario — verificar contra capturas previas
- [ ] No se toca `src/@core/`

### Globales al cierre
- [ ] Cero instancias de `fontFamily: 'Poppins'` en `sx` props de archivos propios (Finance, People, etc.)
- [ ] Cero instancias de `fontFamily: 'monospace', fontWeight: 600/700` fuera de chart configs
- [ ] Todas las instancias legítimas (Categoría 5) documentadas como intencionales
- [ ] `grep -r "fontWeight" src/views/greenhouse/ src/components/greenhouse/ --include="*.tsx" | wc -l` reduce de 56+ a ~35 (solo legítimas)

## Riesgos

- **Visual regression en Executive Cards (Slice 2)**: bajar overline de 700→600 puede aplanar la jerarquía visual. Requiere QA visual.
- **`monoAmount` vs `monoId` sizing**: `monoId` usa `0.875rem` (body2) y `monoAmount` usa `0.8125rem` (subtitle2). Verificar que el sizing encaje bien en todos los contextos. Si un monto necesita body2 size, puede necesitar `variant='monoId'` con semantica de amount, o un `sx={{ fontSize }}` override puntual.
- **Chip fontWeight**: Chips heredan del theme de `button` (600). Si algunos Chips necesitan 700, el override inline es legítimo — no crear variant para eso.

## Regla operativa

Esta task es de puro cleanup visual. No debe:
- Cambiar lógica de datos
- Agregar o quitar componentes
- Tocar APIs o tipos de dominio
- Modificar `@core/`

Si durante la migración se detecta que un componente tiene un problema de diseño más profundo (ej. la card necesita reestructuración), documentarlo como hallazgo pero no arreglarlo en esta task.

---

## Dependencies & Impact

- **Depende de:**
  - `CODEX_TASK_Typography_Hierarchy_Fix` (cerrada) — custom variants ya definidos en `mergedTheme.ts` y `types.ts`
  - `mergedTheme.ts` typography config estable
- **Impacta a:**
  - `CODEX_TASK_Portal_View_Surface_Consolidation` — reduce deuda visual transversal
  - Ninguna otra task directamente — cambio puramente cosmético/mantenibilidad
- **Archivos owned:**
  - Todos los archivos listados en el inventario de Categorías 1-4
  - No "owns" `mergedTheme.ts` ni `types.ts` (ya cerrados por Typography_Hierarchy_Fix)
