# TASK-238 — Agency Workspace & Space 360: Data Storytelling UX

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete` (closed 2026-05-05 — merge commit `27267030` shipped, lifecycle drift)
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency / ui`
- Blocked by: `TASK-236` (error patterns deben existir primero)
- Branch: `task/TASK-238-agency-data-storytelling`
- GitHub Issue: `[pending]`

## Summary

Agency Workspace (Pulse, Spaces, Capacity) y Space 360 (6 tabs) presentan datos operativos como números huérfanos sin contexto comparativo, usan terminología inconsistente (Revenue vs Ingresos, "360 listo" vs "Snapshot"), tienen navegación excesivamente densa con múltiples "Abrir X" por tab, y carecen de data storytelling que guíe al usuario hacia insights accionables.

## Why This Task Exists

**Números huérfanos (violación de la regla de oro de data storytelling):**
- KPIs de Pulse muestran valores absolutos sin trend ni comparativa: "RpA: 1.4" — ¿es bueno? ¿subió? ¿bajó?
- Space 360 KPIs (Revenue, Margin, OTD, RpA, Cobertura) no tienen delta vs período anterior
- Cards de servicios muestran "Costo total: $X" sin contexto de presupuesto o comparativa

**Terminología inconsistente:**
- Space 360 header: "Revenue" (inglés) vs Finance tab: "Ingresos" (español)
- Staff Augmentation tabla: "360 listo" / "Pendiente" — debería ser "Snapshot" con contexto
- Delivery tab: "RpA" sin explicación para usuarios nuevos
- "Abrir economía" vs "Abrir finanzas" vs "Economía" — 3 labels para el mismo destino

**Navegación excesiva:**
- Space 360: header tiene 3 botones ("Volver a Spaces", "Ver organización", "Abrir economía")
- CADA tab tiene su propio "Abrir [sección]" que duplica la navegación del sidebar
- Resultado: 3-5 exit points por tab, el usuario no sabe dónde está ni a dónde va
- Sin breadcrumbs que orienten la jerarquía

**Jerarquía visual débil en Space 360:**
- 5 KPIs en fila con breakpoint `xl:3` + 5 cards = layout 3+2 desbalanceado
- Overview tab: alertas y actividad reciente compiten por atención sin priorización
- Finance tab: composición de costo como lista plana, sin chart visual
- Team tab: cards de miembros con 4×3 grid demasiado denso para datos que suelen ser null

## Goal

- Todos los KPIs de Agency tienen al menos un tipo de contexto (trend, benchmark, threshold o peer)
- Terminología unificada en español conforme a `greenhouse-nomenclature.ts`
- Navegación simplificada: breadcrumbs reemplazan botones "Volver", CTAs de salida reducidos a 1 por tab
- Space 360 KPIs reducidos a 4 con layout balanceado
- Lottie animated EmptyState en empty states primarios de Agency

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` § Animation Architecture

Reglas obligatorias:

- Copy: invocar `greenhouse-ux-writing` para todo label, tooltip, empty state
- Colores: `GH_COLORS` de `greenhouse-nomenclature.ts` — no hardcodear
- KPIs: usar `HorizontalWithSubtitle` con trend props (ya soporta `trend` + `trendNumber`)
- AnimatedCounter: usar para valores numéricos prominentes
- prefers-reduced-motion: respetar via `useReducedMotion`

## Normative Docs

- `src/config/greenhouse-nomenclature.ts` — fuente canónica de labels
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` § Data Storytelling patterns

## Dependencies & Impact

### Depends on

- TASK-236 — error handling patterns deben existir
- `src/components/greenhouse/AnimatedCounter.tsx` — ya implementado (TASK-230)
- `src/components/greenhouse/EmptyState.tsx` — ya soporta `animatedIcon`
- `src/lib/agency/space-360.ts` — data layer (no se modifica, solo presentación)

### Blocks / Impacts

- TASK-235 (LLM Insights) — depende del layout que resulte de este trabajo
- Space 360 tabs consumen datos que ya existen — solo cambia presentación
- Pulse tab comparte algunos KPIs con ICO (TASK-237)

### Files owned

- `src/views/agency/AgencyWorkspace.tsx` (header, tab labels)
- `src/views/agency/AgencyPulseView.tsx` [verificar path exacto]
- `src/components/agency/PulseGlobalKpis.tsx` (trends)
- `src/components/agency/PulseGlobalCharts.tsx` (data storytelling)
- `src/components/agency/SpaceCard.tsx` (terminology)
- `src/components/agency/SpaceHealthTable.tsx` (terminology)
- `src/views/greenhouse/agency/space-360/Space360View.tsx` (KPIs, navigation)
- `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` (hierarchy)
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` (card density)
- `src/views/greenhouse/agency/space-360/tabs/FinanceTab.tsx` (terminology, chart)
- `src/views/greenhouse/agency/space-360/tabs/DeliveryTab.tsx` (terminology)
- `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` (terminology)
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx` (terminology)
- `src/views/greenhouse/agency/space-360/shared.ts` (helpers)
- `src/views/greenhouse/agency/services/ServicesListView.tsx` (KPI fix)
- `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx` (labels)
- `src/config/greenhouse-nomenclature.ts` (nuevos labels de Agency)

## Current Repo State

### Already exists

- `HorizontalWithSubtitle` ya soporta `trend` + `trendNumber` props
- `AnimatedCounter` con `formatter` prop (TASK-230)
- EmptyState con `animatedIcon` (TASK-230)
- `GH_AGENCY` namespace en `greenhouse-nomenclature.ts` (labels parciales del ICO tab)
- Pulse KPIs ya tienen algo de contexto (`lastSyncedAt`)
- Space 360 tiene `dataStatus` awareness (partial/ready/missing)

### Gap

- 0 de 10+ KPIs tienen trend vs período anterior
- Terminología inconsistente en 7+ archivos (Revenue/Ingresos, 360 listo/Snapshot, economía/finanzas)
- 3-5 botones de navegación por tab en Space 360 (exceso)
- Sin breadcrumbs en ninguna vista de Agency
- ServicesListView computa KPIs client-side sobre items paginados (engañoso)
- Space 360 KPIs en layout 5-cards desbalanceado
- Finance tab sin visualización de composición de costo (solo lista de texto)
- Team tab con 4×3 grid denso que suele mostrar 50% null values

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Nomenclatura y terminología unificada

- Auditar y corregir toda inconsistencia terminológica en archivos owned:
  - "Revenue" → "Ingresos" (o usar `GH_LABELS.finance.revenue` si existe)
  - "360 listo" / "Pendiente" → "Snapshot activo" / "Sin snapshot"
  - "Abrir economía" / "Abrir finanzas" → unificar a "Ver finanzas"
  - "RpA" → agregar tooltip "Ratio de productividad por activo"
  - "OTD" → agregar tooltip "On-Time Delivery — entrega a tiempo"
  - "FTR" → agregar tooltip "First Time Right — a la primera"
- Agregar labels nuevos a `GH_AGENCY` en `greenhouse-nomenclature.ts`
- Invocar `greenhouse-ux-writing` para revisar todo el copy resultante

### Slice 2 — KPIs con contexto (trends + AnimatedCounter)

- Pulse KPIs: agregar trend delta vs período anterior (requiere data del API — si no existe, mostrar "Primer período")
- Space 360 KPIs: reducir de 5 a 4 (Revenue, Margin, OTD, RpA) — Cobertura va al Team tab header
- Space 360 KPIs: agregar `AnimatedCounter` + trend props donde haya delta disponible
- ServicesListView KPIs: computar desde `summary` del API response (no de items paginados)
- StaffAugListView KPIs: verificar que ya usan `summary` del API (parece correcto)

### Slice 3 — Navegación simplificada

- Space 360: reemplazar botones "Volver a Spaces" por breadcrumb: `Agencia > Spaces > [Space Name]`
- Space 360 tabs: reducir "Abrir X" a máximo 1 CTA contextual por tab (no duplicar sidebar nav)
- ServiceDetail / PlacementDetail: agregar breadcrumbs consistentes
- Usar componente de breadcrumb de MUI (`Breadcrumbs` component)

### Slice 4 — Jerarquía visual Space 360

- Overview tab: priorizar alertas (si hay alertas críticas, card con borde rojo accent-left). Actividad reciente en Accordion colapsable.
- Finance tab: reemplazar lista de composición de costo por donut chart (ApexCharts, mismo patrón que Vuexy "Leads by Source")
- Team tab: simplificar cards de miembros — esconder campos null, mostrar solo datos con valor
- KPIs layout: 4 cards en `xs=12 sm=6 md=3` (layout 4×1 balanceado)

### Slice 5 — Animated EmptyState en Agency

- Reemplazar EmptyState estáticos en Agency por `animatedIcon` donde aplique:
  - Space 360: "Space no encontrado" → `animatedIcon='/animations/empty-inbox.json'`
  - ICO tab empty: usar animación existente
  - Delivery tab empty: usar animación existente
  - Finance tab "Sin ingresos/egresos": usar animación existente
- Crear 1 Lottie asset adicional si se necesita para Agency-specific empty states

## Out of Scope

- ICO Engine tab redesign — eso es TASK-237
- Backend API changes — solo cambia presentación
- Patrón de retry/refresh — eso es TASK-236
- Nuevas métricas o signals — solo las existentes
- Rediseño de ServicesListView o StaffAugmentationListView — solo corregir KPIs y labels
- Localización i18n — seguimos en español-only

## Acceptance Criteria

- [ ] Cero instancias de "Revenue" en español en la UI — unificado a "Ingresos"
- [ ] Cero instancias de "360 listo" — reemplazado por "Snapshot activo"
- [ ] Todos los KPIs primarios de Agency tienen al menos 1 tipo de contexto (trend, threshold o tooltip)
- [ ] Space 360 tiene breadcrumbs funcionales
- [ ] Máximo 1 CTA de salida por tab en Space 360
- [ ] Space 360 KPIs en layout 4-columns balanceado
- [ ] AnimatedCounter en KPIs de Space 360 y Pulse
- [ ] Finance tab tiene donut chart para composición de costo
- [ ] Team tab esconde campos null en member cards
- [ ] Empty states animados en al menos 4 puntos de Agency
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- Grep "Revenue" en archivos owned → 0 hits
- Grep "360 listo" en archivos owned → 0 hits
- Preview visual de Space 360 con datos reales
- Preview visual de Pulse con datos reales
- Verificar breadcrumbs en 3+ vistas de detalle
- `prefers-reduced-motion` → AnimatedCounter renderiza estático

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con patrón de breadcrumbs
- [ ] Verificar que TASK-235 y TASK-237 siguen alineadas

## Follow-ups

- Convergir patrones de data storytelling a Finance, People, HR
- Evaluar breadcrumbs como patrón global del portal (no solo Agency)
- Evaluar donut chart de composición de costo como componente reutilizable
- Evaluar cards de member con expand/collapse para detalle (en vez de grid fijo)

## Open Questions

- Pulse KPIs: ¿el API ya devuelve datos del período anterior para calcular trend? Si no, ¿es viable agregar un `previousPeriod` al response? Verificar en `src/lib/agency/` durante Discovery.
- Space 360 KPIs: ¿consolidar Revenue + Margin en 1 card (Revenue con Margin como subtitle), dejando 3 cards? O mantener 4 separadas. Recomendación: 4 separadas por claridad.
- Breadcrumbs: ¿usar componente MUI Breadcrumbs nativo o crear wrapper Greenhouse? Recomendación: MUI nativo, no necesita wrapper.
