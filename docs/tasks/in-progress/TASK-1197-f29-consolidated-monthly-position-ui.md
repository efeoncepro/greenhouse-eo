# TASK-1197 — UI Posición F29 mensual consolidada (card/panel)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1197-f29-consolidated-monthly-position-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Follow-up `ui-ux` de TASK-1195. Construye la **superficie visible** de la posición F29 mensual consolidada: un card/panel en el Finance Dashboard que consume el contrato gobernado ya existente (`GET /api/finance/f29/monthly-position`) y muestra de un vistazo las 3 líneas del F29 (IVA neto, retención practicada, PPM) por entidad legal/período, marcando cada línea como oficial o shadow. No agrega backend — es cliente puro del primitive ya construido (Full API Parity).

## Why This Task Exists

TASK-1195 cerró el contrato programático del F29 consolidado (reader + endpoint), pero el contador/operador todavía no tiene dónde verlo en el portal: hoy solo existe el `VatMonthlyPositionCard` (línea IVA suelta). El programa de posiciones fiscales mensuales (IVA TASK-725, retenciones TASK-1188, PPM TASK-1189, consolidado TASK-1195) necesita su vista humana para cerrar el loop. Esta task entrega esa surface, respetando la disciplina backend-data → ui-ux: el contrato ya existe, acá solo se consume.

## Goal

- Card/panel "Posición F29 (mensual)" en el Finance Dashboard que renderiza las 3 líneas (IVA débito/crédito/neto, retención total, PPM base/tasa/monto) + selector de período.
- Cada línea muestra visiblemente su estado **oficial vs shadow** (de `enabledByLine`); una línea `enabled:false` NUNCA se presenta como cifra F29 oficial (badge/disclaimer "en validación").
- Degradación honesta: línea `null` (sin posición materializada del período) se muestra como "sin datos del período", no como `$0`.
- Estados loading/empty/error/permission cubiertos; copy es-CL tokenizado; GVC desktop + mobile mirado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 TASK-1195 — compositor F29; Deltas de las 3 líneas TASK-725/1188/1189)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (la UI es cliente del contrato gobernado, no segunda implementación)
- `DESIGN.md` + `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** recomputar ni reagregar las cifras en el cliente: la UI consume el VM tal cual lo entrega `GET /api/finance/f29/monthly-position` (IVA neto, retención total, PPM monto ya vienen calculados).
- **NUNCA** presentar como F29 oficial una línea con `enabled:false`: respetar `enabledByLine` con un affordance visible (badge "Shadow"/"En validación").
- **NUNCA** mostrar `$0` cuando la línea es `null` (sin materializar): degradación honesta = "sin datos del período".
- **SIEMPRE** copy visible desde `src/lib/copy/*` (es-CL tuteo, validar con `greenhouse-ux-writing`); montos con el helper canónico de formato CLP, sin `fontSize`/HEX inline.
- Hook obligatorio de diseño UI: diseñar con las skills product-design ANTES del JSX y verificar con GVC en loop (desktop + mobile) hasta enterprise.

## Normative Docs

- `docs/tasks/complete/TASK-1195-f29-consolidated-monthly-position.md` (contrato consumido: reader + endpoint + shape del VM).
- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (patrón del `VatMonthlyPositionCard`).

## Dependencies & Impact

### Depends on

- `GET /api/finance/f29/monthly-position` (`src/app/api/finance/f29/monthly-position/route.ts`) — complete (TASK-1195).
- `getF29ConsolidatedMonthlyPosition` + tipos (`src/lib/finance/f29-consolidated.ts`) — complete (TASK-1195).
- `VatMonthlyPositionCard` (`src/views/greenhouse/finance/components/VatMonthlyPositionCard.tsx`) — patrón a reusar/extender `[verificar reuso vs extracción de primitive compartido]`.
- `FinanceDashboardView` (`src/views/greenhouse/finance/FinanceDashboardView.tsx`) — surface de montaje.

### Blocks / Impacts

- Cierra la capa de visibilidad humana del programa de posiciones fiscales mensuales (umbrella TASK-1186, alcance mensual).
- Posible follow-up: export consolidado (PDF/CSV) del F29 completo si el contador lo pide (TASK-1195 § Follow-ups).

### Files owned

- `src/views/greenhouse/finance/components/F29ConsolidatedPositionCard.tsx` (nuevo) `[verificar nombre]`
- `src/views/greenhouse/finance/components/f29-consolidated-position-types.ts` (nuevo, VM cliente) `[verificar nombre]`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` (montaje del card)
- `src/lib/copy/finance.ts` (copy del card)
- tests asociados

## Current Repo State

### Already exists

- Contrato gobernado completo del F29 consolidado (reader + endpoint, TASK-1195).
- `VatMonthlyPositionCard` (línea IVA suelta) montado en `FinanceDashboardView` — referencia de patrón visual.
- Selector de período fiscal + helper `getFinanceCurrentPeriod`.

### Gap

- No existe surface visible que muestre las 3 líneas del F29 consolidadas (oficial vs shadow) en el portal.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Finance / contador (roles internos `finance_admin`/`finance_analyst`/`efeonce_admin`) `[verificar gating real del dashboard]`.
- Momento del flujo: revisión mensual de la posición fiscal antes de declarar el F29 al SII.
- Resultado perceptible esperado: ver las 3 líneas del F29 del período de un vistazo, sabiendo cuáles son oficiales y cuáles están en validación (shadow).
- Friccion que debe reducir: hoy hay que mirar 3 endpoints/cards separados (o ninguno) para armar la foto del F29 mensual.
- No-goals UX: NO editar, NO recalcular, NO enviar el F29 al SII desde acá (read-only).

### Surface & system decision

- Surface: card/panel dentro de `FinanceDashboardView` (o sección fiscal si existe agrupación) `[verificar ubicación exacta]`.
- Composition Shell: `aplica` — el card nace adaptable a su ancho (density auto), mirror del resto del dashboard.
- Primitive decision: `reuse|extend` — evaluar extraer un primitive compartido `FiscalPositionLineRow`/`FiscalPositionCard` desde el patrón de `VatMonthlyPositionCard` antes de duplicar `[decidir en Discovery]`.
- Adaptive density / The Seam: `aplica` — 3 líneas + estado por línea deben colapsar bien en compacto.
- Copy source: `src/lib/copy/finance.ts` (extender; nada inline reusable).
- Access impact: `none` — el dashboard ya gatea por su access actual; esta task no agrega routeGroup/view/capability (read-only sobre un endpoint ya gateado por `requireFinanceTenantContext`).

### State inventory

- Default: 3 líneas con cifras del período; cada una con badge oficial/shadow.
- Loading: skeleton dimensionado a las 3 filas (no spinner suelto).
- Empty: período sin ninguna línea materializada → "sin datos del período" + CTA suave (cambiar período).
- Error: fetch falla → mensaje es-CL accionable (reintentar) sin prosa cruda del backend.
- Degraded / partial: alguna línea `null` mientras otras tienen datos → fila "sin datos" honesta, no `$0`.
- Permission denied: `fiscal_entity_unavailable` (no hay entidad legal) → estado informativo, no error rojo.
- Long content: N/A (3 líneas fijas).
- Mobile / compact: las 3 líneas + badges legibles a 390px sin scroll horizontal.
- Keyboard / focus: selector de período y CTA reintentar navegables por teclado.
- Reduced motion: sin motion no esencial; respetar `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: seleccionar período (year/month) → refetch del endpoint.
- Hover / focus / active: estados estándar de los controles reusados.
- Pending / disabled: durante refetch, el card muestra loading sin saltar layout.
- Escape / click-away: N/A (no overlay) salvo que el selector sea popover.
- Focus restore: tras refetch, foco no se pierde del selector.
- Latency feedback: skeleton/spinner en el área de cifras durante el fetch.
- Toast / alert behavior: errores como estado in-card, no toast global.

### Motion & microinteractions

- Motion primitive: `CSS|none` (transición suave de cifras al cambiar período, opcional).
- Enter / exit: fade/render estándar del dashboard.
- Layout morph: N/A.
- Stagger: opcional al revelar las 3 líneas.
- Timing / easing token: tokens de motion canónicos, sin ms crudos.
- Reduced-motion fallback: sin animación de conteo si `prefers-reduced-motion`.
- Non-goal motion: nada cinemático; es un panel de datos fiscales.

### Visual verification

- GVC scenario: nuevo scenario del Finance Dashboard con el card F29 visible `[crear en scripts/frontend/scenarios]`.
- Viewports: desktop + mobile 390px.
- Required captures: default (con datos), empty (período sin materializar), línea shadow visible.
- Required `data-capture` markers: `data-capture="f29-consolidated-card"`.
- Scroll-width check: `scrollWidth == clientWidth` en desktop y 390px.
- Accessibility/focus checks: badges oficial/shadow con texto (no solo color); selector navegable.
- Before/after evidence: dashboard sin card F29 → con card F29.
- Known visual debt: ninguno declarado.

## Backend/Data Contract

**Backend impact: `none` (rationale).** Esta task es **cliente puro** del contrato gobernado ya construido en TASK-1195 — no crea ni modifica reader/endpoint/schema/migración/command/signal. Por **Full API Parity**, el primitive (`getF29ConsolidatedMonthlyPosition` + `GET /api/finance/f29/monthly-position`) ya existe y es el único source of truth; la UI lo consume igual que Nexa/MCP, sin segunda implementación ni lógica de negocio en el componente.

- Source of truth consumido: `GET /api/finance/f29/monthly-position` (TASK-1195, ya gateado por `requireFinanceTenantContext` + scope operating entity).
- Si durante Discovery emerge la necesidad de un campo nuevo en el VM (p. ej. arrastre IVA del período anterior, total agregado), **NO** se agrega inline en el cliente: se abre una task `backend-data` separada que extienda el reader/endpoint canónico, y esta task pasa a `Blocked by` esa.
- Sin capability nueva: read-only sobre un endpoint existente. No aplica el Capability Definition of Done (no hay write/acción de negocio nueva).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — VM cliente + fetch

- Tipo VM cliente + hook/fetch de `GET /api/finance/f29/monthly-position` (mapeo del response a la forma que el card consume), con manejo de loading/error/empty. Tests del mapeo.

### Slice 2 — Card + estados + montaje + GVC

- `F29ConsolidatedPositionCard` (3 líneas + badges oficial/shadow + selector período + estados) `[verificar reuso de primitive]`, montado en `FinanceDashboardView`, copy en `src/lib/copy/finance.ts`. GVC desktop + mobile en loop hasta enterprise. Closing.

## Out of Scope

- Cualquier cambio backend (reader/endpoint ya existen — TASK-1195). Si emerge necesidad de un campo nuevo en el contrato, abrir task backend-data separada.
- Export consolidado (PDF/CSV) del F29 — follow-up aparte si el contador lo pide.
- F22 anual (TASK-1196) y multi-entidad (child D de TASK-1186).
- Edición, recálculo o envío del F29 al SII.

## Detailed Spec

El card consume el VM de `GET /api/finance/f29/monthly-position`:

```text
{ enabledByLine: { vat, retention, ppm }, vat, retention, ppm, periodId, year, month, legalEntity }
```

Render por línea:

```text
F29 — <legalEntity.legalName> · <periodId>
  · IVA        débito / crédito / NETO       [Oficial]            (vat null → "sin datos del período")
  · Retención  total practicada              [Shadow/En validación si enabledByLine.retention=false]
  · PPM        base × tasa = monto           [Shadow/En validación si enabledByLine.ppm=false]
```

Reglas de presentación: cifras tal cual el VM (no reagregar); badge por línea desde `enabledByLine`; línea `null` = estado "sin datos", no `$0`; montos vía helper CLP canónico.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (VM + fetch) → Slice 2 (card + montaje + GVC). El card depende del VM tipado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Presentar una línea shadow como F29 oficial | UI / finance | medium | badge oficial/shadow desde `enabledByLine`; no totalizar líneas shadow | revisión GVC + code review |
| Mostrar `$0` en vez de "sin datos" para línea `null` | UI / finance | medium | estado empty honesto por línea | revisión GVC |
| Recomputar/reagregar cifras en el cliente | UI / finance | low | consumir el VM tal cual; test del mapeo no recalcula | code review |
| Scroll horizontal en mobile 390px | UI | low | density auto + check scrollWidth | GVC mobile |

### Feature flags / cutover

Sin flag propio de UI. La visibilidad oficial/shadow de cada línea la hereda de `enabledByLine` (flags backend `RETENTION_POSITION_ENABLED`/`PPM_POSITION_ENABLED` de TASK-1188/1189). Additive, immediate cutover del card.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR / desmontar card del dashboard | <5 min | sí |

### Production verification sequence

1. Local: `pnpm dev` + GVC del Finance Dashboard con el card visible (desktop + mobile), revisar frames.
2. Staging (post-deploy): el card muestra IVA oficial + retención/PPM con badge shadow (flags OFF en staging) sin presentar cifra como oficial.
3. Prod: deploy + smoke visual del dashboard.

### Out-of-band coordination required

N/A — repo-only change. Las cifras subyacentes ya tienen sus gates contables en TASK-1188/1189; el flip a oficial es decisión del contador en esas tasks, no en esta UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El card consume `GET /api/finance/f29/monthly-position` y NO recomputa cifras (test del mapeo lo verifica).
- [ ] Cada línea muestra oficial vs shadow desde `enabledByLine`; una línea `enabled:false` no se presenta como cifra F29 oficial.
- [ ] Línea `null` se muestra como "sin datos del período", nunca `$0`.
- [ ] Estados loading/empty/error/permission cubiertos.
- [ ] Copy visible es-CL tokenizado en `src/lib/copy/*` (validado con `greenhouse-ux-writing`).
- [ ] GVC desktop + mobile 390px capturado y mirado; `scrollWidth == clientWidth` en ambos.
- [ ] `Backend impact: none` se mantiene (no se tocó reader/endpoint); si se necesitó un campo nuevo, se abrió task backend-data separada.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture` (Finance Dashboard con card F29, desktop + mobile)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] doc funcional/manual si cambia comportamiento visible (`docs/documentation/finance/` + `docs/manual-de-uso/finance/`)
- [ ] chequeo de impacto cruzado: marcar en TASK-1186 (umbrella) que la capa de visibilidad mensual quedó cerrada
- [ ] evidencia GVC adjunta en el cierre

## Follow-ups

- Export consolidado (PDF/CSV) del F29 completo si el contador lo pide.
- Integrar el card como tool/surface de Nexa (ya consumible por construcción vía el contrato gobernado).

## Open Questions

- ¿El card vive suelto en `FinanceDashboardView` o en una sección/sub-ruta fiscal agrupando IVA/retención/PPM/F29? Resolver en Discovery según la IA actual del dashboard.
- ¿Se extrae un primitive compartido `FiscalPositionCard` reusando `VatMonthlyPositionCard`, o el F29 consolidado lo absorbe? Decidir en Discovery (evitar duplicar el patrón).
