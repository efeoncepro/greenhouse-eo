# TASK-415 — Space 360 Motion Consistency & Empty State Normalization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-415-space-360-motion-consistency-empty-state`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Follow-on de `TASK-321`. Normalizar microinteracciones y estados vacios en Space 360: listas secundarias de `DeliveryTab`, `FinanceTab` y `ServicesTab` sin `AnimatePresence`/stagger, empty states heterogeneos (unos `EmptyState`, otros `Typography color='text.secondary'` plano), falta de `aria-label` en KPI cards del shell y sin `<figcaption>` visible bajo el donut de Finance. La vista ya tiene el patron canonico en `NexaInsightsBlock.tsx` y `Space360View.tsx` shell — se propaga a las tabs que quedan.

## Why This Task Exists

La auditoria UI/UX del 2026-04-16 detecto que el ritmo de microinteracciones no es parejo entre tabs. El shell (KPI cards con `AnimatedCounter`) y `OverviewTab` (via `NexaInsightsBlock`) respetan el playbook del portal, pero `DeliveryTab`, `FinanceTab` y `ServicesTab` renderizan listas sin motion gated por `useReducedMotion` y tratan estados vacios con `Typography color='text.secondary'` en lugar de `EmptyState`. Esto rompe la expectativa visual de una vista ejecutiva y degrada lectura por screen reader. `TASK-321` concentra los 24 hallazgos principales (jerga tecnica, jerarquia, KPI clickeables, idioma); esta task cierra el tail de 3 hallazgos (18, 19, 20 del reporte) que son microinteraccion pura y requieren otra skill mental — se separa para no inflar `TASK-321` y permitir ejecucion paralela o secuencial.

## Goal

- Listas secundarias en Delivery/Finance/Services usan `AnimatePresence` + `motion.div` con stagger, gated por `useReducedMotion`, siguiendo patron canonico de `NexaInsightsBlock.tsx`
- Estados vacios secundarios (tendencias, stuck assets, proyectos, donut sin costos, CSC distribution, contexto ICO) usan `EmptyState` uniforme en lugar de `Typography` plano
- KPI cards del shell tienen `aria-label` descriptivo ("Ingresos: $6.902.000 — ver detalle en Finanzas") incluso si no se vuelven clickeables
- Donut de Finance tiene `<figcaption>` visible con breakdown textual debajo del chart

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, libs, patrones
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` — baseline UX
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — reglas a11y

Reglas obligatorias:

- Motion imports **solo** desde `@/libs/FramerMotion` — nunca desde `framer-motion` directo
- `useReducedMotion` desde `@/hooks/useReducedMotion`
- Patron canonico a copiar: `src/components/greenhouse/NexaInsightsBlock.tsx` (staggered list con AnimatePresence)
- `EmptyState` desde `@/components/greenhouse` — reutilizar sin modificar API publica
- `animatedIcon` de `EmptyState` solo en first-use o no-results, no en errores

## Normative Docs

- `.claude/skills/greenhouse-microinteractions-auditor/skill.md` — auditor playbook
- `.claude/skills/greenhouse-microinteractions-auditor/references/microinteraction-playbook.md` — timing, easing, inventario

## Dependencies & Impact

### Depends on

- Ninguna. Es frontend-only sobre archivos existentes.

### Blocks / Impacts

- Complementa `TASK-321`. No colisiona — `TASK-321` toca las mismas tabs pero para otros hallazgos (jerga, jerarquia, idioma, KPI click). Si `TASK-321` se ejecuta primero, esta task se aplica sobre la estructura ya limpia. Si se ejecuta en paralelo, coordinar merge manual.

### Files owned

- `src/views/greenhouse/agency/space-360/tabs/DeliveryTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/FinanceTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx`
- `src/views/greenhouse/agency/space-360/Space360View.tsx` (solo `aria-label` en KPIs)

## Current Repo State

### Already exists

- `src/components/greenhouse/NexaInsightsBlock.tsx` — patron canonico de staggered list con `AnimatePresence` + `useReducedMotion`
- `src/components/greenhouse/EmptyState.tsx` — componente uniforme con `icon`, `animatedIcon`, `title`, `description`, `action`
- `@/libs/FramerMotion` — re-export de motion primitives con platform rules
- `@/hooks/useReducedMotion` — hook canonico para gating

### Gap

- `DeliveryTab.tsx:83-101` (tendencias RpA): cuando vacio, cae a `<Typography variant='body2' color='text.secondary'>` en lugar de `EmptyState`
- `DeliveryTab.tsx:108-125` (stuck assets): mismo patron inconsistente
- `DeliveryTab.tsx:132-150` (proyectos del periodo): igual
- `FinanceTab.tsx:137-145` (donut vacio): cae a `Typography` plain, no `<figcaption>`
- `IcoTab.tsx:78-87` (Pipeline CSC vacio) y `IcoTab.tsx:93-107` (Contexto): plain text; si `TASK-321` los reestructura con widgets, esta task valida que el empty state post-reestructuracion sea `EmptyState`
- Listas en `DeliveryTab`, `FinanceTab.recentIncome`, `FinanceTab.recentExpenses`, `ServicesTab.items` renderizan `Stack spacing={2}` + `.map()` sin `AnimatePresence`
- `Space360View.tsx:156-167` KPI cards (`ExecutiveMiniStatCard`) sin `aria-label` descriptivo a nivel del wrapper `Grid`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Staggered lists en tabs secundarias

- `DeliveryTab.tsx` — envolver las 3 listas (`trends`, `stuckAssets`, `projectMetrics`) con `AnimatePresence` + `motion.div`, usando el mismo stagger que `NexaInsightsBlock`
- `FinanceTab.tsx` — envolver `recentIncome` y `recentExpenses` con el mismo patron
- `ServicesTab.tsx` — envolver `items` (detalle de servicios) con el mismo patron
- Todas las motion deben estar gated por `useReducedMotion`; cuando `reducedMotion === true`, renderizar sin wrappers de motion (fallback a `Stack` plano)

### Slice 2 — Normalizar empty states secundarios

- `DeliveryTab.tsx:83-101, 108-125, 132-150` — reemplazar `Typography color='text.secondary'` por `EmptyState` con `icon` (sin `animatedIcon` en vacios secundarios, solo en principales), `title` y `description`. Sin `action` cuando no hay CTA util
- `FinanceTab.tsx:137-145` (donut sin costos) — usar `EmptyState` con `minHeight` alineado al espacio del chart
- `IcoTab.tsx:78-87, 93-107` — si `TASK-321` reestructura estas secciones, validar que su empty state sea `EmptyState` con icon consistente (`tabler-chart-off` o `tabler-list-details-off`)

### Slice 3 — A11y en KPI shell y Finance donut

- `Space360View.tsx:156-167` — agregar `aria-label` descriptivo al `Grid` wrapper de cada `ExecutiveMiniStatCard`. Ejemplo: `aria-label={\`Ingresos: \${formatMoney(detail.kpis.revenueClp)}\`}`. Si `TASK-321` convierte los KPIs en clickeables, extender a `"\${label}: \${value} — ver detalle en \${tabLabel}"`
- `FinanceTab.tsx:123-135` — debajo del `AppReactApexCharts` donut, agregar `<figcaption>` visible con breakdown textual: `Payroll $X · Tooling $Y · CxC $Z · CxP $W`. Estilo discreto (`Typography variant='caption' color='text.secondary'`, `mt: 2`). Mantener el `aria-label` de la `figure` que ya existe.

## Out of Scope

- Todo lo cubierto en `TASK-321` (24 hallazgos): jerga tecnica, reestructurar ICO, breadcrumb, header, KPI clickeables, idioma, skills coverage, CxC/CxP separados, etc.
- No cambiar API publica de `EmptyState`, `NexaInsightsBlock` ni `ExecutiveMiniStatCard`
- No introducir nuevas dependencias de motion (ya esta todo en `@/libs/FramerMotion`)
- No tocar `Space360Detail` ni backend `getAgencySpace360()`
- No agregar skeletons — la vista es server-rendered y no hay loading client-side

## Detailed Spec

### Patron canonico a copiar (desde `NexaInsightsBlock.tsx`)

```tsx
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

const reducedMotion = useReducedMotion()

// Si reducedMotion: renderizar items sin motion wrapper
// Si no: usar AnimatePresence + motion.div con stagger

<AnimatePresence initial={false}>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18, delay: reducedMotion ? 0 : i * 0.03, ease: 'easeOut' }}
    >
      {/* contenido del item */}
    </motion.div>
  ))}
</AnimatePresence>
```

Duracion 180ms + stagger 30ms entre items respeta la ventana 70–300ms del playbook.

### EmptyState secundario vs principal

- **Principal** (toda la seccion vacia): `animatedIcon='/animations/empty-chart.json'` + `action` con CTA
- **Secundario** (subseccion vacia dentro de una card ya poblada): solo `icon` Tabler, sin `animatedIcon`, `minHeight` chico (140-160), sin `action`

### Finance donut figcaption

```tsx
<figure role='img' aria-label={...} style={{ margin: 0 }}>
  <AppReactApexCharts ... />
  {costEntries.length > 0 ? (
    <Typography component='figcaption' variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
      {costEntries.map(e => `${e.label}: ${formatMoney(e.value)}`).join(' · ')}
    </Typography>
  ) : null}
</figure>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `DeliveryTab`, `FinanceTab` y `ServicesTab` usan `AnimatePresence` + `motion.div` en sus listas, importados desde `@/libs/FramerMotion`
- [ ] Toda motion esta gated por `useReducedMotion` con fallback a render sin wrappers
- [ ] Estados vacios secundarios en las mismas tabs usan `EmptyState` (sin `animatedIcon`) en lugar de `Typography color='text.secondary'`
- [ ] KPI cards del shell tienen `aria-label` descriptivo en el `Grid` wrapper
- [ ] Donut de Finance tiene `<figcaption>` visible con breakdown textual
- [ ] No se importa `framer-motion` ni `lottie-react` directamente
- [ ] `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan
- [ ] Verificacion manual con `prefers-reduced-motion: reduce` activa en DevTools: todas las animaciones se suprimen

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test` — incluyendo `Space360View.test.tsx` si se tocaron handlers
- Verificacion visual en preview: navegar a `/agency/spaces/hubspot-company-30825221458`, recorrer tabs y comprobar stagger
- Verificacion reduced-motion: DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` → motion suprimido

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes
- [ ] `changelog.md` actualizado si hay cambio visible
- [ ] Chequeo de impacto cruzado sobre `TASK-321` — confirmar que no colisionaron o que se rebaseo limpio

## Follow-ups

- Evaluar si conviene extender el mismo patron de motion a `Person 360` y `Organization Detail` para consistencia 360 cross-module
- Considerar un hook `use360ListMotion()` si el patron se repite en 3+ vistas 360
