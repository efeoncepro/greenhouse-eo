# TASK-236 — Agency: Resilience & Feedback Patterns

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
- Domain: `agency / ui`
- Blocked by: `none`
- Branch: `task/TASK-236-agency-resilience-feedback`
- GitHub Issue: `[pending]`

## Summary

Agency tiene fallos sistémicos de feedback al usuario: fetch errors silenciosos que dejan el spinner girando infinitamente, empty states ausentes en tablas, updates sin confirmación, y ningún botón de refresh manual. Esto hace que el módulo se sienta roto cuando hay cualquier problema de red o datos.

## Why This Task Exists

En 8 de 8 vistas client-side del módulo Agency, los fetch errors se capturan con `catch` silencioso que setea `data = null`, dejando un `CircularProgress` rotando para siempre. El usuario no puede distinguir entre "cargando" y "falló". Además:

- `StaffAugmentationListView` no tiene empty state cuando la tabla está vacía
- `PlacementDetailView` muta items de onboarding sin confirmación ni feedback de error
- Ninguna vista tiene botón de refresh manual
- `ServicesListView` computa KPIs sobre la página visible, no sobre el total del dataset
- Los loading states usan `CircularProgress` genérico sin texto contextual

## Goal

- Toda vista Agency muestra un error accionable cuando un fetch falla (nunca spinner infinito)
- Toda tabla vacía muestra un `EmptyState` apropiado (no tabla vacía silenciosa)
- Mutations (onboarding update, placement create) muestran toast de confirmación o error
- Al menos las 4 tabs del workspace tienen botón de refresh manual
- Loading states muestran texto descriptivo ("Cargando spaces...", "Calculando ICO...")

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- EmptyState centralizado: `src/components/greenhouse/EmptyState.tsx` (37 consumers)
- Toast via `react-toastify` (patron existente en 17 archivos)
- Error boundaries: `SectionErrorBoundary` ya usado en ICO tab
- Loading text en español (nomenclatura de `greenhouse-ux-writing`)

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/EmptyState.tsx` — componente centralizado
- `react-toastify` — ya instalado y usado

### Blocks / Impacts

- Todas las vistas Agency se benefician
- Patron replicable a otros modulos (Finance, People, HR)

### Files owned

- `src/views/greenhouse/agency/services/ServicesListView.tsx` (error state, empty state)
- `src/views/greenhouse/agency/services/ServiceDetailView.tsx` (error state, refresh)
- `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx` (error state, empty state)
- `src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx` (mutation feedback)
- `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx` (success toast)
- `src/views/agency/AgencyWorkspace.tsx` (refresh buttons, loading text)
- `src/views/agency/AgencyIcoEngineView.tsx` (error state)

## Current Repo State

### Already exists

- `EmptyState` component con `animatedIcon` prop — `src/components/greenhouse/EmptyState.tsx`
- `SectionErrorBoundary` — `src/components/greenhouse/SectionErrorBoundary.tsx`
- `react-toastify` activo en 17 archivos — patron de toast establecido
- `AgencyWorkspace` ya usa `SectionErrorBoundary` en tabs Spaces, Capacity, ICO
- Skeleton stacks ya existen para lazy tabs en AgencyWorkspace

### Gap

- 0 de 8 vistas muestran error accionable al fallar fetch
- 1 de 4 tablas (StaffAugmentation) no tiene empty state
- 0 de 3 mutations muestran toast de confirmación
- 0 de 8 vistas tienen botón de refresh
- 0 de 8 vistas tienen loading text contextual (solo CircularProgress genérico)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Error states para fetch failures

- En cada vista que hace `fetch()` client-side, reemplazar el `catch` silencioso por un estado `error` con mensaje
- Renderizar `EmptyState` con `icon='tabler-cloud-off'`, título descriptivo y botón "Reintentar"
- Vistas afectadas: ServicesListView, ServiceDetailView, StaffAugListView, PlacementDetailView, AgencyWorkspace (3 lazy tabs)

### Slice 2 — Empty states para tablas vacías

- `StaffAugmentationListView`: agregar EmptyState cuando `items.length === 0 && !loading`
- `ServicesListView`: verificar que el empty state existente usa el componente correcto (hoy es Typography plana)
- Usar animated EmptyState (`animatedIcon`) donde sea apropiado

### Slice 3 — Mutation feedback (toasts)

- `PlacementDetailView.updateOnboardingItem`: toast success "Item actualizado" o toast error "No se pudo actualizar. Intenta de nuevo."
- `CreatePlacementDialog`: toast success "Placement creado" después de `onCreated()`
- Usar `toast.success()` / `toast.error()` del patron existente

### Slice 4 — Refresh manual + loading text

- Agregar icono `tabler-refresh` como `CustomIconButton` en el header de cada lazy tab (Spaces, Capacity, ICO)
- Reemplazar `CircularProgress` genérico por versión con texto: "Cargando spaces...", "Calculando KPIs...", etc.
- El refresh debe invalidar el cache local y re-fetch

## Out of Scope

- Rediseño visual de layout, jerarquía o charts — eso es TASK-237 y TASK-238
- Patrón de retry automático (exponential backoff) — follow-up si se necesita
- Loading skeletons granulares por sección — el CircularProgress con texto es suficiente por ahora
- Error boundaries nuevos — los que existen (`SectionErrorBoundary`) son suficientes

## Acceptance Criteria

- [ ] Toda vista Agency muestra error con botón "Reintentar" cuando un fetch falla (verificar desconectando red en DevTools)
- [ ] `StaffAugmentationListView` muestra EmptyState cuando no hay placements
- [ ] Onboarding item update muestra toast success/error
- [ ] Create placement muestra toast success
- [ ] Las 3 lazy tabs del workspace tienen botón de refresh funcional
- [ ] Loading states muestran texto en español ("Cargando...", no solo spinner)
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan sin errores nuevos

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- DevTools Network → throttle Offline → verificar error states
- Click refresh → verificar que datos se recargan

## Closing Protocol

- [ ] Documentar patrón de error handling en `GREENHOUSE_UI_PLATFORM_V1.md` para adopción en otros módulos

## Follow-ups

- Adopción del patrón de error/refresh en Finance, People, HR
- Considerar retry automático con backoff para fetch failures
- Considerar skeletons granulares por sección (en vez de CircularProgress)
