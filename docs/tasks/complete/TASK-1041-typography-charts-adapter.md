# TASK-1041 — Adapter de tipografía para charts (deriva del SoT)

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `refactor`
- Epic: `none`
- Status real: `Complete — gobernanza central vía wrappers (supera el sweep de 47 archivos)`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (local-first)
- Legacy ID: `TASK-1038 FU3`

## Resolution — gobernanza central vía wrappers (2026-06-06)

El sweep de "~47 archivos" resultó **innecesario** — una solución más robusta y escalable. Hallazgos al aterrizar:

- **Solo hay 2 librerías de chart**: ApexCharts (33 charts) + Recharts (10). **ECharts NO se usa** (los "13 ECharts" eran falsos positivos: "Recharts" contiene "echart").
- **100% de cobertura por wrapper**: los 33 Apex usan `AppReactApexCharts`, los 10 Recharts usan `AppRecharts` (incl. `MetricTrendCard`). **0 bypass.**
- Ambos wrappers son `styled()` que ya gobernaban la **familia** del texto SVG con CSS `!important` desde el theme — pero **les faltaba el tamaño** (cada chart lo ponía inline).

**Solución:** agregar `fontSize: theme.typography.caption.fontSize !important` a la regla CSS existente de cada wrapper (ejes/leyenda/tooltip/datalabels; NO títulos). Resultado: **los 43 charts del portal consumen familia + tamaño del SoT desde un solo lugar (el theme)**. Cambiar el SoT → los 2 wrappers → los 43 charts se actualizan solos. **Nunca más chart por chart.** 2 archivos tocados, no 47.

- **Fuente única:** el SoT (`theme.typography`, alimentado por `typography-tokens.ts`).
- **Gobernanza primaria (SVG/DOM charts):** los wrappers CSS — `AppReactApexCharts` + `AppRecharts`.
- **Single-source JS (canvas / futuras libs):** el helper `getChartTypographyFromTheme(theme)` (`src/components/theme/chart-typography.ts`, 6 tests) — para charts que configuren tipografía vía JS options (p.ej. si entra ECharts canvas-rendered, donde el CSS no llega).

Verificado: tsc 0, 6 tests verde, GVC `/agency` sin breakage.

## Summary

Los charts (ECharts / ApexCharts / Recharts, ~47 archivos) definen el texto de ejes, leyendas, tooltips y labels con tamaños/familias **inline**, fuera del SoT de tipografía (TASK-1036/1038). Esta task crea un adapter `getChartTypographyFromTheme(theme)` que deriva esos valores del SoT y migra los wrappers de chart a consumirlo — para que la tipografía de los charts se mueva junto con la escala canónica.

## Why This Task Exists

El SoT de tipografía gobierna texto web y (vía adapter) PDF. Los charts son el tercer "medio" sin adapter: cada chart hardcodea `fontSize: 11/12/13` y a veces la familia. Cuando la escala cambia (como en TASK-1038), los charts quedan desincronizados. La política transversal canonizada (DESIGN.md / V1 §3) dice **"charts derivan del SoT"** — falta el adapter que lo haga real.

## Goal

- Helper `getChartTypographyFromTheme(theme)` que exponga `fontFamily` + tamaños para axis / legend / tooltip / label / title, derivados del SoT.
- Migrar los wrappers de chart canónicos a consumirlo.
- Cero `fontSize` inline de texto en charts nuevos.

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` §Typography (charts derivan del SoT)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 (políticas transversales)
- `CLAUDE.md` "Charts — política canónica" (ECharts > Apex > Recharts) + "Typography System"

Reglas obligatorias:

- El adapter LEE del SoT (`typographyScale` / theme), no redefine tamaños.
- Respetar la política de charts vigente (ECharts default para vistas nuevas de alto impacto).
- No romper los charts existentes — migración oportunista por wrapper.

## Dependencies & Impact

### Depends on

- `src/components/theme/typography-tokens.ts` (SoT)
- Wrappers de chart: `AppReactApexCharts`, `AppRecharts`, `MetricTrendCard`, y consumidores ECharts.

### Blocks / Impacts

- Cierra el último "medio" sin adapter de tipografía (web ✓, PDF → TASK-1040, charts → esta).

### Files owned

- `src/components/theme/chart-typography.ts` (nuevo helper)
- Wrappers de chart bajo `src/@core/components/` / `src/components/greenhouse/`

## Current Repo State

### Already exists

- SoT de tipografía (TASK-1036/1038).
- 2 librerías de chart activas (ApexCharts + Recharts) + ECharts para vistas nuevas.

### Gap

- ~47 archivos con `fontSize` inline en config de chart.
- No hay helper que derive tipografía de chart del SoT.

## Scope

### Slice 1 — Helper

- `getChartTypographyFromTheme(theme) → { fontFamily, axisLabel, legend, tooltip, dataLabel, title }`.
- Tests del helper (deriva del SoT, no hardcodea).

### Slice 2 — Migración (sweep)

- Migrar wrappers canónicos (Apex/Recharts/ECharts) a consumir el helper.
- Sweep de ~47 archivos — oportunista, por wrapper.

## Out of Scope

- Cambiar la librería de chart de una vista (eso es política de charts / TASK-518).
- Tamaños no-tipográficos (grosor de línea, colores — esos son tokens de color).

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Chart se ve distinto post-migración | UI | medium | GVC por vista migrada; migración oportunista no big-bang | revisión visual |

Sin flag — additive (el helper convive con los charts no migrados). Rollback: revertir el wrapper migrado.

## Acceptance Criteria

- [ ] Helper `getChartTypographyFromTheme` con tests.
- [ ] Wrappers canónicos consumen el helper.
- [ ] GVC de las vistas migradas sin regresión visual.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test` verdes.

## Verification

- `pnpm test src/components/theme`
- `pnpm tsc --noEmit`
- GVC de dashboards con charts migrados.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` si aplica

## Follow-ups

- El sweep completo (~47 archivos) puede partirse en sub-slices por dominio (finance / delivery / agency).
