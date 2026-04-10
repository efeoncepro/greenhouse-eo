# TASK-321 — Space 360 View: UI/UX polish y eliminacion de jerga tecnica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-321-space-360-ui-ux-polish`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

La vista Space 360 (`/agency/spaces/[id]`) expone jerga tecnica al usuario (nombres de tablas, UUIDs, backticks), tiene cards con formato de dump de datos sin estructura visual, links descontextualizados, mezcla de idiomas y estados vacios con numeros sin significado. Son 24 hallazgos de auditoria UI/UX agrupados en 3 fases por severidad.

## Why This Task Exists

La Space 360 es la vista principal para operar un cliente. Hoy expone lenguaje interno (`serving`, `vinculos canonicos`, `rpa_trend`, `metrics_by_project`, UUIDs, clientIds HubSpot) que confunde al usuario operativo. Varios cards muestran datos en formato raw (listas de `<strong>Label:</strong> N`) que parecen logs de debug. La mezcla de idiomas (EN/ES), la falta de avatar, breadcrumbs redundantes y KPIs no clickeables degradan la experiencia de una vista que deberia ser la mas pulida del portal.

## Goal

- Eliminar toda exposicion de jerga tecnica, IDs internos y nombres de tablas de la UI
- Reestructurar cards ICO y CSC con grillas de KPI consistentes con el resto de la vista
- Unificar idioma a espanol en todos los labels y subheaders
- Mejorar estados vacios, breadcrumb, header y navegabilidad de KPI cards

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- Usar primitivas Vuexy (`CustomChip`, `CustomTabList`, `Card variant='outlined'`)
- Los componentes compartidos (`ExecutiveMiniStatCard`, `EmptyState`, `TeamProgressBar`) no deben cambiar su API publica sin verificar consumidores
- El idioma del portal es espanol; siglas tecnicas aceptadas (ICO, RpA, OTD, FTR, CSC, P&L, CxC, CxP) pero no frases completas en ingles

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerias, patrones de componentes

## Dependencies & Impact

### Depends on

- Ninguna tabla, schema ni API nueva. Todos los cambios son frontend-only sobre archivos existentes.

### Blocks / Impacts

- Ninguna task activa toca estos archivos. Sin colisiones detectadas.

### Files owned

- `src/views/greenhouse/agency/space-360/Space360View.tsx`
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/DeliveryTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/FinanceTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
- `src/views/greenhouse/agency/space-360/shared.ts`

## Current Repo State

### Already exists

- `src/views/greenhouse/agency/space-360/Space360View.tsx` — vista principal con header, 4 KPI cards, 6 tabs
- `src/views/greenhouse/agency/space-360/tabs/` — 6 tab components (Overview, Team, Services, Delivery, Finance, ICO)
- `src/views/greenhouse/agency/space-360/shared.ts` — helpers `formatMoney`, `formatPct`, `formatRatio`, `titleize`
- `src/components/greenhouse/ExecutiveMiniStatCard.tsx` — card de KPI reutilizable
- `src/components/greenhouse/EmptyState.tsx` — componente de estado vacio
- `src/app/(dashboard)/agency/spaces/[id]/page.tsx` — server component que carga `Space360View`
- `src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx` — ruta de placement SI existe (confirmado)

### Gap

- Warning banner de "360 parcial" usa jerga tecnica interna (`serving`, `vinculos canonicos`, `snapshots`, `motores dedicados`)
- DeliveryTab subheaders contienen backticks con nombres de tablas PostgreSQL (`rpa_trend`, `metrics_by_project`)
- IcoTab "Contexto" es un dump de 8 lineas `<strong>Label:</strong> N` sin estructura de grilla
- IcoTab "Pipeline CSC" es una lista de `<Typography>` plain text sin distribucion visual
- Breadcrumb repite nombre cuando organizacion = space name
- KPI cards no navegables (sin click → tab)
- Header sin avatar del cliente
- IDs tecnicos visibles: `hubspot-company-...` y UUID de spaceId
- Skills coverage card: 5 columnas de KPI, estado all-zero sin significado, triple repeticion del mensaje vacio
- FinanceTab CxC/CxP comprimidos en una celda con body2 rompiendo jerarquia
- Mezcla EN/ES en labels de KPI ("Margin", "ICO latest snapshot")
- shared.ts tiene `'use client'` innecesario

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Eliminar jerga tecnica y links descontextualizados (Alta)

- **Space360View.tsx:143** — Cambiar boton "Ver finanzas" de `/finance/intelligence` a `?tab=finance` (navega a la tab Finance del mismo Space)
- **Space360View.tsx:148-150** — Reescribir warning banner de "360 parcial" en lenguaje operativo. Ejemplo: _"Algunos datos de esta vista aun estan incompletos. Las zonas afectadas lo indican."_
- **DeliveryTab.tsx:76** — Cambiar subheader de "Tendencia RpA" de `` `rpa_trend` `` a _"Evolucion del indicador en los ultimos periodos."_
- **DeliveryTab.tsx:120** — Cambiar subheader de "Proyectos del periodo" de `` `metrics_by_project` `` a _"Lectura resumida por proyecto para el periodo activo."_

### Slice 2 — Reestructurar cards ICO con formato visual (Alta)

- **IcoTab.tsx:93-107** — Reemplazar dump de 8 lineas `<strong>Label:</strong> N` por una grilla de KPI 4×2 usando `Box` con `gridTemplateColumns` (patron identico al de DeliveryTab y FinanceTab)
- **IcoTab.tsx:78-87** — Reemplazar lista plain text de "Pipeline CSC" por grilla de distribucion. Cada fase en una fila con label, count y barra de progreso proporcional (o al menos chips con porcentaje)
- **IcoTab.tsx:104** — Limpiar caption de engine version: quitar "Engine {version}" y dejar solo fecha de calculo

### Slice 3 — Header, breadcrumb y IDs tecnicos (Media)

- **Space360View.tsx:97-119** — Cuando `organizationName === spaceName || clientName`, colapsar breadcrumb a `Agencia / [nombre]` sin repeticion
- **Space360View.tsx:124-138** — Agregar avatar con iniciales del cliente (`Avatar` MUI con `sx` de 48px) al inicio del header
- **Space360View.tsx:134** — Eliminar `clientId` del subtitle. Mostrar solo business lines + organizacion
- **Space360View.tsx:137** — Eliminar caption con `spaceId` UUID y `organizationPublicId`. Si se necesita para debug, mover a un tooltip o un icono discreto de info

### Slice 4 — KPI cards clickeables y lenguaje unificado (Media)

- **Space360View.tsx:156-167** — Envolver cada `ExecutiveMiniStatCard` en un wrapper clickeable que navega a la tab correspondiente: Ingresos → `?tab=finance`, Margin → `?tab=finance`, OTD → `?tab=delivery`, RpA → `?tab=ico`. Usar `cursor: pointer` y hover sutil
- **Space360View.tsx:157-166** — Unificar labels a espanol: "Margin" → "Margen", subheader "ICO latest snapshot" → "Ultimo snapshot ICO", "Summary Agency" → "Resumen operativo"
- **Space360View.tsx:160** — Detail label de Margin: usar "P&L del Space" o "Resumen operativo" segun fuente, sin mezcla de idiomas

### Slice 5 — Team tab: estados vacios y redundancia (Media)

- **TeamTab.tsx:210-235** — Reducir grilla de skills de 5 a 4 columnas: eliminar "Servicios con requisitos" (dato disponible en "Gaps y recomendaciones" mas abajo)
- **TeamTab.tsx:214-235** — Cuando `requiredSkillCount === 0`, no mostrar la grilla de numeros `0/0/0/—`. Mostrar directamente el Alert info "Todavia no hay requisitos de skills activos"
- **TeamTab.tsx:197-266** — Eliminar triple repeticion: cuando no hay datos, mostrar solo el Alert info. Quitar el chip "Sin cobertura" del header (redundante) y el box "Lectura rapida" (repite el Alert)
- **TeamTab.tsx:351** — Cambiar "Ver payroll" que va a `/hr/payroll` global. Eliminarlo (no hay payroll contextual por miembro) o cambiar label a algo util como "Ver persona" → `/people/[memberId]`

### Slice 6 — Consistencia visual y limpieza menor (Baja)

- **FinanceTab.tsx:110-111** — Separar CxC y CxP en dos celdas de grilla con `h5` cada una, igualando jerarquia con Revenue/Costo/Margen
- **ServicesTab.tsx:58-62** — Cambiar "Mix de etapas" de `body2` a `h5` (o chip summary) para igualar jerarquia
- **OverviewTab.tsx:145** — Cambiar titulo "Proveniencia" a "Fuentes de datos" (mas claro para usuario operativo)
- **shared.ts:1** — Eliminar `'use client'` (no usa hooks ni APIs de browser)
- **Space360View.tsx:156-167** — Agregar `aria-label` descriptivo a cada KPI card wrapper (ej: `"Ingresos: $6.902.000 — ver detalle en Finanzas"`)
- **FinanceTab.tsx:123-135** — Agregar texto alternativo visible como `<figcaption>` debajo del donut chart

## Out of Scope

- No se cambia la estructura de datos de `Space360Detail` ni el backend `getAgencySpace360()`
- No se crean nuevos componentes compartidos — se reutilizan `ExecutiveMiniStatCard`, `EmptyState`, `TeamProgressBar`
- No se cambia la API publica de `ExecutiveMiniStatCard` (si se necesita click, el wrapper va afuera)
- No se toca la logica de calculo de health badges o risk badges
- No se agregan nuevos API routes ni queries
- No se migra a tabla — todo es frontend-only
- No se redisena el layout general de la vista (grid de tabs, orden de secciones)

## Detailed Spec

### Warning banner — copy operativo

```tsx
// Antes (jerga tecnica):
"Esta 360 ya consume serving y modulos reales, pero sigue parcial en las zonas donde aun faltan vinculos canonicos, snapshots o motores dedicados."

// Despues (lenguaje operativo):
"Algunos datos de esta vista aun estan incompletos. Las secciones afectadas lo indican con su propio aviso."
```

### IcoTab "Contexto" — layout de grilla

Reemplazar el dump raw por una grilla 4×2 con el mismo patron que DeliveryTab y FinanceTab:

```tsx
<Box sx={{
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
  gap: 2
}}>
  <Box>
    <Typography variant='caption' color='text.secondary'>Total</Typography>
    <Typography variant='h5'>{snapshot.context.totalTasks}</Typography>
  </Box>
  <Box>
    <Typography variant='caption' color='text.secondary'>Completadas</Typography>
    <Typography variant='h5'>{snapshot.context.completedTasks}</Typography>
  </Box>
  {/* ... Activas, On-Time, Late Drops, Overdue, Carry-Over, Overdue C/F */}
</Box>
```

### IcoTab "Pipeline CSC" — layout de distribucion

Reemplazar plain text por rows con label + count + porcentaje:

```tsx
<Box sx={{ display: 'grid', gap: 1.5 }}>
  {snapshot.cscDistribution.map(item => (
    <Stack key={item.phase} direction='row' alignItems='center' justifyContent='space-between'>
      <Typography variant='body2' fontWeight={600}>{item.label}</Typography>
      <Stack direction='row' gap={1} alignItems='center'>
        <Typography variant='body2'>{item.count}</Typography>
        <CustomChip round='true' size='small' color='secondary' variant='tonal' label={`${item.pct}%`} />
      </Stack>
    </Stack>
  ))}
</Box>
```

### KPI card click wrapper

No se modifica `ExecutiveMiniStatCard`. Se envuelve externamente:

```tsx
<Grid size={{ xs: 12, sm: 6, md: 3 }}>
  <Box
    onClick={() => handleTabChange(null as any, 'finance')}
    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.92 }, transition: 'opacity 0.15s' }}
    role='link'
    aria-label={`Ingresos: ${formatMoney(detail.kpis.revenueClp)} — ver detalle en Finanzas`}
  >
    <ExecutiveMiniStatCard ... />
  </Box>
</Grid>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La vista Space 360 no muestra ningun nombre de tabla PostgreSQL, UUID ni clientId de HubSpot al usuario
- [ ] El warning banner de "360 parcial" usa lenguaje comprensible para usuario no-tecnico
- [ ] Los subheaders de DeliveryTab no contienen backticks ni nombres de tablas
- [ ] IcoTab "Contexto" usa una grilla de KPI con `caption` + `h5` (no `<strong>` inline)
- [ ] IcoTab "Pipeline CSC" muestra cada fase en una fila con label, count y porcentaje como chip
- [ ] El breadcrumb no repite el mismo nombre cuando organizacion = space
- [ ] El header muestra un avatar con iniciales del cliente
- [ ] Los 4 KPI cards navegan a su tab respectiva al hacer click
- [ ] Todos los labels de KPI estan en espanol (Margen, no Margin; Ultimo snapshot ICO, no ICO latest snapshot)
- [ ] La grilla de skills en TeamTab muestra 4 columnas (sin "Servicios con requisitos")
- [ ] Cuando `requiredSkillCount === 0`, TeamTab muestra solo el Alert info sin grilla de ceros ni triple repeticion
- [ ] FinanceTab separa CxC y CxP en celdas independientes con `h5`
- [ ] shared.ts no tiene `'use client'`
- [ ] No se rompe ningun test existente (`pnpm test`)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Verificacion visual en preview: navegar a `/agency/spaces/hubspot-company-30825221458` y recorrer las 6 tabs
- Verificar breadcrumb con un Space cuyo nombre coincida con su organizacion
- Verificar KPI click → navega a tab correcta

## Closing Protocol

- [ ] Verificar que `ExecutiveMiniStatCard` no cambio su API publica — grep por consumidores en otras vistas
- [ ] Verificar que la vista de lista de Spaces (`/agency?tab=spaces`) no se vio afectada

## Follow-ups

- Considerar agregar mini-charts a los KPI cards (area chart para Ingresos, bars para RpA trend) como mejora visual futura
- Evaluar si "Proveniencia" / "Fuentes de datos" en OverviewTab agrega valor o deberia eliminarse

## Open Questions

- El boton "Ver payroll" en TeamTab member cards: eliminarlo del todo o cambiarlo a "Ver persona" con link a `/people/[memberId]`? (Decisión del usuario — ambas opciones estan en scope)
