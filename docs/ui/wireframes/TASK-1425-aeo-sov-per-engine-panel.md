# TASK-1425 / Panel "Cómo te ve cada motor" (SoV per-motor) + estado honesto de run sin score

## Meta

- Status: `draft`
- Owner task: TASK-1425
- Product Design asset: **mockup aprobado de Claude Design "AEO Operator View"** (proyecto
  `f146e98a-fd29-407d-8f9e-2c4782fcb76a`, archivo `AEO Operator View.dc.html`, Región 7
  "per-engine competitive") — el operador aprobó ese diseño para TASK-1276; esta task materializa
  la región que quedó degradada por falta de datos en el modelo (cerrada por TASK-1424).
- Intended consumers: workbench AEO compartido — vista cliente `/aeo` (TASK-1248) y vista operador
  `/growth/aeo/[organizationId]` (TASK-1276) renderizan el MISMO `AiVisibilityClientReportView`.
- Copy source: `src/lib/copy/growth.ts` (extender `GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT.detail` +
  `GH_GROWTH_AEO_OPERATOR.states`)
- Primitive decision: `reuse` — nuevo `PanelShell` (patrón existente del workbench) + barras
  Recharts/Box como los paneles hermanos (`TrendPanel`/`PlatformPanel`); CERO primitive nueva.
- UI ready target: `no` (pasa a `yes` con mapping + GVC plan validados por lint)

## Brief

- Primary user: operador Growth/AM (gancho de cross-sell) y cliente contratado (entender su brecha).
- User moment: leer el Resumen del informe AEO y entender la brecha competitiva POR CANAL.
- Job to be done: ver marca vs competidores en cada motor (AI Overviews · ChatGPT · Perplexity ·
  Gemini) — el agregado único esconde que cada motor cuenta una historia distinta (~11% de solape
  de citas entre motores).
- Secondary job (fix de estado): cuando el último run terminó SIN score (caso real Grupo Berel,
  runs `partial` con 0 findings), la superficie NO debe decir "se está preparando… vuelve en unos
  minutos" — debe decir la verdad y ofrecer la salida (Correr AEO).

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 1 | Header del panel | Título "Cómo te ve cada motor" + subtítulo "Share of voice por motor — no es un agregado único" + leyenda (Marca=primary · Competidores=neutral) | `PanelShell` header (patrón del workbench) | copy |
| 2 | Grid de motores | Grid responsive `auto-fit minmax(280px, 1fr)`; una columna por motor presente en el desglose | `Box` grid (espejo del mockup Región 7) | `model.competitiveSovByEngine` (TASK-1424) |
| 3 | Columna de motor | Header: isotipo del motor (`EngineIsotype` existente) + nombre producto (`ENGINE_DISPLAY_NAME`); filas: marca primero (bold, barra primary) y top competidores (barra neutral), cada fila = nombre (ellipsis) + barra horizontal (ancho relativo al máximo del motor) + label % `tabular-nums` | filas Box (mismo lenguaje de barras de `SignalVisualCue`/mockup) | derivado del modelo |
| 4 | Fallback accesible | Tabla sr-only "Motor / Marca o competidor / Share of voice" (el mockup la trae; replicar) | `<table>` visually-hidden | mismo dato |
| 5 | Estado honesto por-motor | Motor presente sin menciones → fila "Sin datos de este motor" (texto, sin barra fabricada) | Typography caption | modelo (honest null/0) |
| 6 | (Fix estado) Detalle sin score | Estado del detalle operador cuando el último run terminó sin score: título "El último diagnóstico no generó score" + body honesto + CTA "Correr AEO" (reusa `AeoOperatorRunButton`); "preparándose" queda SOLO para runs realmente en vuelo (`pending`/`running`) | `EmptyState` + CTA existente | run status real (page server) |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `detail.engineSovTitle` | 1 | Cómo te ve cada motor | — | espeja el mockup aprobado |
| `detail.engineSovHelp` | 1 | Share of voice por motor — no es un agregado único | — | |
| `detail.engineSovLegendBrand` | 1 | {brand} | brand | leyenda primary |
| `detail.engineSovLegendCompetitors` | 1 | Competidores | — | leyenda neutral |
| `detail.engineSovAria` | 4 | Share of voice por motor: porcentaje por marca y competidor en cada motor. Detalle en la tabla siguiente. | — | `role='img'` del grid |
| `detail.engineSovNoData` | 5 | Sin datos de este motor | — | honesto, sin barra |
| `states.noScoreTitle` | 6 | El último diagnóstico no generó score | — | reemplaza el "preparándose" falso |
| `states.noScoreBody` | 6 | El run terminó sin datos suficientes para puntuar. Corre un diagnóstico nuevo para medir a este cliente. | — | caso Berel |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | panel con ≥1 motor con datos | — | |
| sin desglose (runs previos a TASK-1424) | — | panel NO se renderiza (campo ausente) — sin hueco ni skeleton | — | degradación aditiva |
| motor sin menciones | — | fila "Sin datos de este motor" | — | nunca % fabricado |
| run en vuelo real (`pending`/`running`) | El informe se está preparando | copy actual (minutos) | — | se conserva SOLO para este caso |
| run terminado sin score | El último diagnóstico no generó score | body honesto | Correr AEO | fix del caso Berel |

## Accessibility Contract

- Grid con `role='img'` + aria-label resumen; **tabla sr-only completa** como alternativa (patrón
  ya presente en el mockup aprobado — replicar tal cual).
- Valor codificado por LONGITUD + label numérico (`tabular-nums`), color solo como identidad
  (marca=primary, competidores=neutral) — Cleveland-McGill, nunca color-only.
- Nombres largos con ellipsis + `title`; contraste AA en labels.
- El estado "sin score" es `EmptyState` con heading + CTA accesible por teclado.

## Implementation Mapping

- Route / surface: workbench compartido — `AiVisibilityClientReportView` (DetailCanvas, sección
  Resumen/charts) renderiza el panel cuando `model.competitiveSovByEngine` existe; visible en
  `/aeo` (cliente) y `/growth/aeo/[organizationId]` (operador) sin fork.
- Primitives: `PanelShell` interno existente + Box bars; `EngineIsotype` + `ENGINE_DISPLAY_NAME`
  existentes para identidad de motores.
- Data reader / command: SOLO `ReportArtifactModel` (campo de TASK-1424). CERO fetch nuevo.
- Fix estado sin score: `src/app/(dashboard)/growth/aeo/[organizationId]/page.tsx` distingue
  `report_unavailable` + run terminado (estado nuevo) vs run en vuelo (estado actual)
  `[verificar]` cómo exponer el status del run al page (el reader hoy no lo distingue — puede
  requerir código de error adicional en `OperatorGraderReportError` o lookup del run en la page).
- Copy source: `src/lib/copy/growth.ts` (ids del ledger).
- Access impact: ninguno (superficies ya gateadas).
- GVC markers: reusar `data-capture="composition-shell"` (el panel queda dentro del clip del
  workbench de los scenarios existentes) + marker propio `data-capture="aeo-engine-sov"`.

## GVC Scenario Plan

- Scenario files: reusar `growth-aeo-operator` (desktop) + `growth-aeo-operator-compact` (390) +
  `growth-ai-visibility-client-report` (mockup harness — extender `SAMPLE_CLIENT_REPORT` con el
  desglose para captura determinista).
- Required captures: workbench con el panel per-motor visible (desktop + 390) + estado "sin score"
  (org Berel antes del re-run, o harness).
- Assertions: noLoginRedirect, noErrorBoundary; scroll-width sin overflow horizontal (grid
  `auto-fit` colapsa a 1 columna en 390).
- Reduced motion: sin motion nuevo (barras estáticas).

## Design Decision Log

- Decision: render en el workbench COMPARTIDO (cliente + operador ven el mismo panel) — regla de
  oro EPIC-020: un modelo, renders por disclosure, no una vista operador forkeada.
- Alternatives considered: panel solo-operador (rechazado: el cliente contratado también gana con
  el per-motor; el dato es público-safe); ECharts (rechazado: los paneles hermanos del workbench
  usan barras Box/Recharts — coherencia > wow local).
- Reuse / extend / new primitive: `reuse` total; cero primitive nueva.
- Open risks: shape final del campo (decisión de TASK-1424 Plan Mode); cómo distinguir run en
  vuelo vs terminado-sin-score en el reader (marcado `[verificar]` arriba).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
