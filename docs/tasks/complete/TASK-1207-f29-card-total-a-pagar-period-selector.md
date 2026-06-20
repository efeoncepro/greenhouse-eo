# TASK-1207 — Card F29: total a pagar + selector de período (proyección vs declarado)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1207-f29-card-total-a-pagar-period-selector`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Follow-up `ui-ux` de TASK-1197. El card "Posición F29 del mes" muestra las 3 líneas (IVA/retención/PPM) por separado pero **no muestra el total a pagar** del F29 — el operador/contador tuvo que sumar mentalmente y se confundió (vio el IVA $1.080.406 y no entendía por qué no era el $1.222.308 que se paga). Además el card defaultea al mes en curso (junio, incompleto) sin forma de ver el mes que se declara (mayo, cerrado). Esta task agrega: (1) fila **"Total F29 a pagar"** (suma de las 3 líneas, honesta sobre shadow) y (2) **selector de período** que distingue *mes en curso (proyección)* vs *mes cerrado (a declarar)*. Cliente puro del contrato F29 ya existente — backend impact none.

## Why This Task Exists

El F29 se paga como un **total único** (IVA + retención + PPM = $1.222.308 en mayo 2026), pero el card consolidado solo muestra las 3 líneas sueltas. Eso generó confusión real: el contador vio la línea de IVA ($1.080.406) y no la reconoció como el F29 (que es $1.222.308). El total a pagar es el dato más importante del card y falta.

En paralelo, el operador necesita **dos vistas**: (a) el **mes en curso** (junio) para **proyectar** cuánto pagará de IVA, y (b) el **mes cerrado** (mayo) que está **declarando** (se paga hasta el 20 del mes siguiente). Hoy el card solo muestra el mes en curso sin selector, así que el período declarado queda escondido.

## Goal

- Fila **"Total F29 a pagar"** al pie del card consolidado = IVA + retención + PPM, con formato CLP.
- El total refleja honestamente el estado: **oficial** solo si las 3 líneas están oficiales; **"Provisional (en validación)"** si alguna línea está en shadow; maneja líneas `null` (período sin materializar) sin romper.
- **Selector de período** en el card F29 (year/month) que permite ver cualquier mes (en curso o cerrado), consumiendo el `year/month` que el endpoint ya soporta.
- Etiqueta que distingue **mes en curso (proyección)** vs **mes cerrado (a declarar)** para que el operador entienda qué está mirando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta TASK-1195 compositor F29; Delta TASK-1204 exclusión anulados + tasa PPM)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (la UI es cliente del contrato gobernado)
- `DESIGN.md` + `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** recomputar/reagregar las cifras de línea en el cliente: el total es la **suma simple** de los 3 montos que el VM ya entrega (IVA neto + retención total + PPM monto). No se recalcula ninguna posición.
- **NUNCA** presentar el total como "oficial" si alguna línea está en shadow (`enabledByLine` false). Marcarlo "Provisional (en validación)".
- **SIEMPRE** distinguir mes en curso (proyección) vs cerrado para no inducir a declarar un período incompleto.
- **SIEMPRE** copy es-CL tokenizado (`src/lib/copy/finance.ts`, validar con `greenhouse-ux-writing`); montos con helper CLP canónico, sin `fontSize`/HEX inline.
- Hook UI: diseñar con skills product-design ANTES del JSX + GVC desktop+mobile en loop.

## Normative Docs

- `docs/tasks/complete/TASK-1197-f29-consolidated-monthly-position-ui.md` (card consolidado base).
- `docs/tasks/complete/TASK-1195-f29-consolidated-monthly-position.md` (contrato + endpoint `year/month`).
- `docs/tasks/complete/TASK-1204-f29-annulled-document-exclusion-ppm-rate.md` (números corregidos + el follow-up que originó esta task).

## Dependencies & Impact

### Depends on

- `F29ConsolidatedPositionCard` + `f29-consolidated-position-types.ts` (`src/views/greenhouse/finance/components/`) — complete (TASK-1197).
- `GET /api/finance/f29/monthly-position` — ya soporta `year/month` (route.ts:41-42) — complete (TASK-1195).
- `FinanceDashboardView` (`src/views/greenhouse/finance/`) — montaje + fetch actual (sin year/month → período vigente).

### Blocks / Impacts

- Cierra la confusión "no veo el total del F29" reportada por el contador (2026-06-20).
- Posible mejora futura: mismo total/selector en el card de IVA suelto (fuera de scope).

### Files owned

- `src/views/greenhouse/finance/components/F29ConsolidatedPositionCard.tsx` (total + selector)
- `src/views/greenhouse/finance/components/f29-consolidated-position-types.ts` (si el VM cliente necesita campo nuevo) `[verificar]`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` (fetch con year/month seleccionable)
- `src/lib/copy/finance.ts` (`GH_F29_CONSOLIDATED` — total + selector + etiquetas)
- tests asociados

## Current Repo State

### Already exists

- Card consolidado con 3 líneas + badges oficial/shadow + degradación honesta (TASK-1197).
- Endpoint con soporte `year/month` (default período vigente).
- Helper CLP canónico + copy `GH_F29_CONSOLIDATED`.

### Gap

- No hay fila de total a pagar en el card.
- No hay selector de período (el card solo muestra el mes en curso).
- No hay distinción visual mes en curso (proyección) vs cerrado.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Finance / contador (roles internos finance).
- Momento del flujo: revisión mensual del F29 — proyectar el mes en curso y validar el mes que se declara.
- Resultado perceptible esperado: ver de un vistazo **cuánto se paga en total** del F29 del período elegido, y poder cambiar de período.
- Friccion que debe reducir: hoy hay que sumar las 3 líneas mentalmente y no se puede ver el mes declarado (solo el en curso).
- No-goals UX: NO editar, NO recalcular, NO enviar el F29 al SII.

### Surface & system decision

- Surface: `F29ConsolidatedPositionCard` en `FinanceDashboardView`.
- Composition Shell: `aplica` — el total y el selector viven dentro del card existente.
- Primitive decision: `reuse|extend` — extender el card existente; selector de período = reusar `GreenhouseDatePicker`/`CustomAutocomplete` (mes/año) según convención `[decidir en Discovery]`. NO inventar selector nuevo.
- Adaptive density / The Seam: `aplica` — total + selector deben colapsar bien en compacto.
- Copy source: `src/lib/copy/finance.ts` (`GH_F29_CONSOLIDATED`).
- Access impact: `none` — read-only sobre endpoint ya gateado; sin routeGroup/view/capability nueva.

### State inventory

- Default: 3 líneas + fila total + selector en el período vigente (proyección).
- Loading: skeleton incluye la fila de total.
- Empty: período sin ninguna línea → total "Sin datos del período"; selector sigue operable.
- Error: fetch falla → estado de error del card (ya existe) + retry.
- Degraded / partial: alguna línea `null` o shadow → total marcado "Provisional (en validación)" + nota de qué línea falta/está en validación.
- Permission denied: `fiscal_entity_unavailable` → estado informativo (ya existe).
- Long content: N/A.
- Mobile / compact: total + selector legibles a 390px sin scroll horizontal.
- Keyboard / focus: selector navegable por teclado; foco no se pierde al cambiar período.
- Reduced motion: sin motion no esencial.

### Interaction contract

- Primary interaction: cambiar período en el selector → refetch del endpoint con `year/month`.
- Hover / focus / active: estados estándar del selector reusado.
- Pending / disabled: durante refetch, loading sin saltar layout.
- Escape / click-away: si el selector es popover, cierra con Escape.
- Focus restore: tras refetch, foco permanece en el selector.
- Latency feedback: skeleton/spinner en el área de cifras durante el fetch.
- Toast / alert behavior: errores como estado in-card, no toast global.

### Motion & microinteractions

- Motion primitive: `CSS|none` (transición suave opcional al cambiar período).
- Reduced-motion fallback: sin animación de conteo si `prefers-reduced-motion`.
- Non-goal motion: nada cinemático.

### Visual verification

- GVC scenario: extender `finance-f29-consolidated` (mostrar el total + selector).
- Viewports: desktop + mobile 390px.
- Required captures: período en curso (proyección, total provisional), período cerrado (mayo, total), estado con línea shadow.
- Required `data-capture` markers: `f29-consolidated-card` (ya existe).
- Scroll-width check: `scrollWidth == clientWidth` desktop + 390px.
- Accessibility/focus checks: total con label textual (no solo color); selector navegable.
- Before/after evidence: card sin total/selector → con total + selector.
- Known visual debt: ninguno.

## Backend/Data Contract

**Backend impact: `none` (rationale).** Cliente puro del contrato gobernado de TASK-1195. El endpoint `GET /api/finance/f29/monthly-position` **ya acepta `year`/`month`** (route.ts:41-42) y devuelve las 3 líneas + `enabledByLine`. El total es la **suma de los 3 montos del VM** en el cliente (no es una posición fiscal nueva ni recálculo). Si durante Discovery se concluyera que el total debe materializarse server-side (p. ej. para Nexa/export), se abre una task `backend-data` separada y esta pasa a `Blocked by`. Sin capability nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Total a pagar + estado honesto

- Fila "Total F29 a pagar" en `F29ConsolidatedPositionCard` = suma de IVA + retención + PPM (montos del VM). Estado: oficial si las 3 líneas oficiales; "Provisional (en validación)" si alguna shadow; maneja `null`. Copy en `GH_F29_CONSOLIDATED`. Tests del cálculo del total + estado.

### Slice 2 — Selector de período + proyección vs declarado + GVC

- Selector year/month en el card (reusa primitive canónica), fetch con `year/month`, etiqueta "mes en curso (proyección)" vs "cerrado (a declarar)". GVC desktop+mobile en loop. Closing.

## Out of Scope

- Cualquier cambio backend (el endpoint ya soporta `year/month`).
- Materializar el total server-side (follow-up si Nexa/export lo necesita).
- El mismo total/selector en el card de IVA suelto (`VatMonthlyPositionCard`) — follow-up.
- Oficialización / flip de flags (TASK-1203).
- Export del F29 (PDF/CSV).

## Detailed Spec

El card ya consume `{ enabledByLine, vat, retention, ppm, periodId, year, month, legalEntity }`. Agregar:

```text
Total F29 a pagar = (vat?.netVatPositionClp ?? 0) + (retention?.totalRetentionAmountClp ?? 0) + (ppm?.ppmAmountClp ?? 0)
Estado del total:
  · todas las líneas con datos y enabled=true  → "Oficial"
  · alguna línea enabled=false (shadow)         → "Provisional (en validación)" + nota
  · alguna línea null (sin materializar)        → excluida de la suma + nota "incompleto"
```

Selector: dropdown/datepicker mes-año → setea `year/month` en el fetch (`/api/finance/f29/monthly-position?year=&month=`). Default: período vigente (proyección). Etiqueta: si `(year,month)` == período vigente → "mes en curso · proyección"; si es anterior → "cerrado · a declarar".

Ejemplo real (mayo 2026): IVA 1.080.405 + retención 134.653 + PPM 7.250 = **Total 1.222.308**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (total) → Slice 2 (selector). El selector reusa la misma vista del total.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Presentar un total provisional como oficial | UI / finance | medium | estado del total derivado de `enabledByLine`; "Provisional" si alguna shadow | revisión GVC + code review |
| Sumar una línea `null` como 0 y confundir | UI / finance | low | excluir null de la suma + nota "incompleto" | GVC |
| Inducir a declarar el mes en curso (incompleto) | UI / finance | medium | etiqueta "proyección" vs "a declarar"; default vigente claramente marcado | revisión GVC |
| Scroll horizontal mobile con total+selector | UI | low | density auto + check scrollWidth | GVC mobile |

### Feature flags / cutover

Sin flag nuevo. El estado oficial/shadow del total lo hereda de `enabledByLine` (flags backend existentes). Additive, immediate cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR / quitar selector | <5 min | sí |

### Production verification sequence

1. Local: `pnpm dev` + GVC del card con total + selector (desktop+mobile), revisar frames.
2. Staging: deploy + verificar total mayo = 1.222.308 (provisional/oficial según flags) y cambio de período funciona.
3. Prod: deploy + smoke visual.

### Out-of-band coordination required

Cambio repo-only sobre un card que consume un contrato ya existente; no requiere acción en Azure/Nubox/SII/HubSpot. La validación contable de las cifras subyacentes ya ocurrió (TASK-1204).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El card muestra "Total F29 a pagar" = suma de las 3 líneas del VM (test del cálculo).
- [x] El total es "Provisional (en validación)" si alguna línea está en shadow; "Oficial" solo si las 3 oficiales (test).
- [x] Líneas `null` se excluyen de la suma con nota de incompleto, sin romper.
- [x] Selector de período cambia `year/month` y refetch; default = período vigente.
- [x] Etiqueta distingue mes en curso (proyección) vs cerrado (a declarar).
- [x] Copy es-CL tokenizado en `GH_F29_CONSOLIDATED`.
- [x] GVC desktop + mobile mirado; `scrollWidth == clientWidth`.
- [x] `Backend impact: none` (no se tocó endpoint/reader).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture finance-f29-consolidated` (con total + selector, desktop+mobile)

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] doc funcional `libro-iva-posicion-mensual.md` actualizado (total a pagar + selector)
- [x] chequeo de impacto cruzado: nota en TASK-1197 (card extendido)
- [x] evidencia GVC adjunta

## Follow-ups

- Mismo total/selector en el card de IVA suelto si el operador lo pide.
- Export del F29 (PDF/CSV) con el total.
- Materializar el total server-side si Nexa/export lo requieren.

## Open Questions

- El selector de período: ¿dropdown mes-año simple o `GreenhouseDatePicker` con granularidad de mes? Resolver en Discovery según la convención vigente y qué se ve mejor.
