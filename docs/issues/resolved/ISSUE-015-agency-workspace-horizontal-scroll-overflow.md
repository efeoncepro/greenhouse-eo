# ISSUE-015 — Scroll horizontal en AgencyWorkspace (CustomTabList sin wrapper overflow)

## Ambiente

staging

## Detectado

2026-04-05, reporte visual del usuario en `/agency/team`

## Sintoma

La vista de Equipo (`/agency/team`) presentaba un scroll horizontal a nivel de pagina. El contenido desbordaba el viewport horizontalmente.

## Causa raiz

`CustomTabList` con `variant='scrollable'` dentro de un `Stack` (flex container) sin el wrapper protector `<Box sx={{ minWidth: 0, overflow: 'hidden' }}>`.

MUI TabList con `variant='scrollable'` calcula el ancho de sus tabs internamente. Cuando el componente es hijo directo de un flex container (`Stack`, `Box display='flex'`), el flex item hereda un `min-width: auto` por defecto del spec CSS Flexbox. Esto permite que el TabList empuje al parent mas alla del viewport, generando scroll horizontal en toda la pagina.

### Por que `minWidth: 0` resuelve el problema

En CSS Flexbox, los flex items tienen `min-width: auto` por defecto, lo que significa que no pueden ser mas pequenos que su contenido. Cuando el TabList calcula un ancho interno mayor al container disponible, el flex item se expande para acomodarlo. `minWidth: 0` rompe esa restriccion y permite que el flex item se encoja. `overflow: hidden` actua como segunda barrera para evitar que contenido desbordante sea visible.

### Regresion recurrente

Este es el **mismo bug** que se resolvio en `PersonTabs` (ver changelog: "People detail overflow — local regression fix in tab strip"). En ese caso la causa fue doble:
1. `aria-live` region con `sx={{ width: 1, height: 1 }}` que MUI interpreta como `100%` en vez de `1px` (corregido a `visuallyHiddenSx`)
2. `CustomTabList variant='scrollable'` sin wrapper `minWidth: 0` + `overflow: hidden`

En `AgencyWorkspace` el `aria-live` ya usaba `visuallyHiddenSx` correctamente, pero faltaba el wrapper del `CustomTabList`.

## Impacto

Visual. Scroll horizontal innecesario en todas las tabs del workspace de agencia (Pulse, Spaces, Capacidad, ICO Engine). No afecta funcionalidad ni datos.

## Solucion

Envolver `CustomTabList` en `<Box sx={{ minWidth: 0, overflow: 'hidden' }}>` en `AgencyWorkspace.tsx`, mismo patron que `PersonTabs.tsx`.

```tsx
// Antes (vulnerable)
<CustomTabList variant='scrollable' ...>
  {tabs}
</CustomTabList>

// Despues (protegido)
<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
  <CustomTabList variant='scrollable' ...>
    {tabs}
  </CustomTabList>
</Box>
```

## Verificacion

- Deploy a staging, verificar que `/agency/team` no presenta scroll horizontal
- `npx tsc --noEmit` — OK
- Verificacion visual en desktop (~1400px viewport)

## Estado

resolved

## Regla preventiva

**Todo `CustomTabList` con `variant='scrollable'` dentro de un flex container (`Stack`, `Box display='flex'`, `Grid`) DEBE estar envuelto en `<Box sx={{ minWidth: 0, overflow: 'hidden' }}>`.**

Vistas que ya tienen el wrapper:
- `PersonTabs.tsx` (fix anterior)
- `AgencyWorkspace.tsx` (este fix)

Vistas potencialmente vulnerables (tienen `variant='scrollable'` — verificar si estan en flex context):
- `Space360View.tsx`
- `GreenhouseAdminTenantDetail.tsx`
- `GreenhouseAdminUserDetail.tsx`
- `GreenhouseClientCampaignDetail.tsx`
- `ClientDetailView.tsx`
- `FinanceIntelligenceView.tsx`
- `CostAllocationsView.tsx`
- `AiToolingDashboard.tsx`
- `HrLeaveView.tsx`
- `PayrollDashboard.tsx`
- `CampaignDetailView.tsx`
- `TenantCrmPanel.tsx`

## Relacionado

- Commit: `dcc86b18` — `fix(agency): wrap scrollable CustomTabList to prevent horizontal overflow`
- Archivo modificado: `src/views/agency/AgencyWorkspace.tsx`
- Changelog: "People detail overflow — local regression fix in tab strip" (PersonTabs, bug identico)
- `src/components/greenhouse/accessibility.ts` — `visuallyHiddenSx` (patron correcto para aria-live oculto)
