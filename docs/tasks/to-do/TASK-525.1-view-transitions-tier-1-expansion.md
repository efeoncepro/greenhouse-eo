# TASK-525.1 — View Transitions Tier 1 expansion (clients, suppliers, campaigns)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (UX enterprise, surfaces de uso diario)
- Effort: `Bajo`
- Type: `ux` + `platform`
- Status real: `Backlog — follow-up directo de TASK-525`
- Rank: `Post-TASK-525`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-525.1-view-transitions-tier-1-expansion`

## Summary

Extiende el rollout de View Transitions API (TASK-525) a los 3 surfaces de uso diario que comparten el mismo patrón list → detail con identidad fuerte: `/finance/clients`, `/finance/suppliers`, `/campanas`. Reutiliza el helper, el hook y el Link drop-in ya canónicos del repo. Cero código nuevo de plataforma — solo wiring + 6 archivos editados.

Parent: `TASK-525` (View Transitions API rollout · Ola 4 motion modernization).

## Why This Task Exists

`TASK-525` validó el patrón en `/finance/quotes`, `/finance/quotes/[id]/edit` y `/people`. La foundation está hecha (helper + hook + ViewTransitionLink + globals.css). Ahora hay 3 surfaces que ven los mismos usuarios todos los días y se beneficiarían del morph sin ningún cambio adicional de plataforma:

1. **`/finance/clients` ↔ `/finance/clients/[id]`** — usuarios de finance entran al detalle de un cliente varias veces por día. La organización es la identidad central; el morph la reafirma. Sinergia directa con `TASK-181 / TASK-191 / TASK-613` (organization workspace convergence).
2. **`/finance/suppliers` ↔ `/finance/suppliers/[id]`** — mismo patrón que clients para el lado proveedor. Ops y finance entran al detalle al cargar gastos.
3. **`/campanas` ↔ `/campanas/[campaignId]`** — surface diario para agency y delivery; campaña + EO-ID + status chip son la identidad.

El gap actual es un cut visual: el row hace router.push y la pantalla se reemplaza sin continuidad. Con el wiring v1 ya canónico, la transición se siente enterprise sin ningún compromiso de bundle.

## Goal

1. Aplicar `viewTransitionName` consistente en row identity y detail header de los 3 surfaces.
2. Cambiar handlers programáticos a `useViewTransitionRouter` y declarativos a `ViewTransitionLink` cuando aplique.
3. Verificar visualmente en staging para los 3 flujos en Chrome y Safari.
4. Confirmar fallback a navegación instantánea en Firefox.
5. Confirmar que `prefers-reduced-motion: reduce` desactiva el morph en los 3 surfaces.

## Acceptance Criteria

- [ ] `/finance/clients` → `/finance/clients/[id]` morphea nombre legal + avatar de organización.
- [ ] `/finance/suppliers` → `/finance/suppliers/[id]` morphea nombre legal + chip de categoría.
- [ ] `/campanas` → `/campanas/[campaignId]` morphea nombre de campaña + EO-ID + status chip.
- [ ] `useViewTransitionRouter` reemplaza `useRouter().push` en los row handlers de los 3 surfaces.
- [ ] `ViewTransitionLink` reemplaza `next/link` en los row links que apuntan al detail (cuando los hay).
- [ ] `pnpm lint`, `pnpm build`, `npx tsc --noEmit` verdes.
- [ ] Smoke staging: los 3 flows muestran morph en Chrome 111+ / Safari 18+.
- [ ] Reduced motion: navegación instantánea sin animación.
- [ ] Firefox: navegación instantánea sin error.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — sección "Navigation transitions con View Transitions API" (Delta 2026-04-25).
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `client` y `provider` extienden `organization`; el `viewTransitionName` debe usar el ID canónico del row (clientId / providerId / campaignId) para que el morph funcione cross-render.
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — los 3 surfaces ya tienen route groups y guards; esta task no los modifica.

## Dependencies & Impact

### Depends on

- `next.config.ts` — flag `experimental.viewTransition: true` (ya activo desde TASK-525).
- `src/lib/motion/view-transition.ts` — helper canónico.
- `src/hooks/useViewTransitionRouter.ts` — hook drop-in.
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` — Link drop-in.
- `src/app/globals.css` — keyframes + reduced-motion guard.

### Blocks / Impacts

- No bloquea ninguna otra task.
- Sinergia con `TASK-613` (Finance Clients → Organization Workspace Convergence): cuando esa task converja `/finance/clients/[id]` al organization workspace, el `viewTransitionName` se mueve sin romper porque la fila ya lo expone con un identificador estable.
- Sinergia con `TASK-606` (Space 360 Motion Consistency): mismo lenguaje de motion, no se cruzan los archivos.

### Files owned

- `src/views/greenhouse/finance/clients/ClientsListView.tsx` (o equivalente — confirmar en Discovery).
- `src/views/greenhouse/finance/clients/ClientDetailView.tsx` (o equivalente).
- `src/views/greenhouse/finance/suppliers/SuppliersListView.tsx` (o equivalente).
- `src/views/greenhouse/finance/suppliers/SupplierDetailView.tsx` (o equivalente).
- `src/views/greenhouse/campaigns/CampaignsListView.tsx` (o equivalente).
- `src/views/greenhouse/campaigns/CampaignDetailView.tsx` (o equivalente).
- `Handoff.md` — bloque de cierre.
- `docs/tasks/README.md` — entry de cierre.

## Current Repo State

### Already exists

- TASK-525 dejó `next.config.ts` con `experimental.viewTransition: true`, helper `startViewTransition`, hook `useViewTransitionRouter`, componente `ViewTransitionLink`, keyframes globales con reduced-motion guard. La plataforma está completa.
- Los 3 surfaces target ya tienen list + detail estables; no hay deuda de routing por resolver primero.

### Gap

- Row handlers usan `router.push` directo (sin morph).
- Headers de detail no tienen `viewTransitionName` declarado.
- Algunos rows usan `next/link` y otros `onClick` — toca decidir caso por caso si reemplazar por `ViewTransitionLink` o `useViewTransitionRouter`.

## Scope

### Slice 1 — Finance Clients

- Identificar la list view de `/finance/clients` y la detail view de `/finance/clients/[id]`.
- Aplicar `viewTransitionName: 'client-identity-{clientId}'` al nombre + `client-avatar-{clientId}` al avatar.
- Cambiar handler de navegación por `useViewTransitionRouter` (o `ViewTransitionLink` si la fila es Link).

### Slice 2 — Finance Suppliers

- Mismo patrón sobre `/finance/suppliers` y `/finance/suppliers/[id]`.
- Identidad: `supplier-identity-{supplierId}` en el nombre legal + `supplier-category-{supplierId}` en el chip de categoría si está presente.

### Slice 3 — Campaigns

- `/campanas` y `/campanas/[campaignId]`.
- Identidad: `campaign-identity-{campaignId}` en el nombre + `campaign-eoid-{campaignId}` en el EO-ID + `campaign-status-{campaignId}` en el status chip.

### Slice 4 — Verificación

- `pnpm lint`, `pnpm build`, `npx tsc --noEmit`.
- Smoke staging vía `dev-greenhouse.efeoncepro.com` para los 3 flows.
- DevTools forced media `prefers-reduced-motion: reduce` confirma fallback.
- Firefox confirma fallback instantáneo.

## Out of Scope

- Tab switches dentro de detail views (candidato Tier 2 — abre task aparte si interesa).
- Drawer/modal transitions (CreateDealDrawer y similares — Tier 2).
- Surfaces Tier 2 (`/finance/income`, `/finance/contracts`, `/finance/expenses`, `/agency/organizations`, `/agency/spaces`, `/sprints`, `/proyectos`).
- Surfaces Tier 3 admin (`/admin/tenants`, `/admin/users`, `/admin/accounts`).
- Cualquier cambio al helper, hook, Link o keyframes globales (foundation cerrada en TASK-525).

## Detailed Spec

La regla canónica es: el row identity y el detail header deben compartir `viewTransitionName` único `{kind}-{id}` con el identificador estable del row. El browser hace el morph automáticamente.

Patrón concreto (idéntico al usado en TASK-525):

```tsx
// LIST
<TableRow onClick={() => morphRouter.push(`/finance/clients/${client.clientId}`)}>
  <TableCell>
    <Typography sx={{ viewTransitionName: `client-identity-${client.clientId}` }}>
      {client.legalName}
    </Typography>
  </TableCell>
</TableRow>

// DETAIL
<Typography variant='h5' sx={{ viewTransitionName: `client-identity-${client.clientId}` }}>
  {client.legalName}
</Typography>
```

Reglas:

- `viewTransitionName` único en el documento al momento del snapshot (no aplicar a más de un elemento simultáneamente).
- Identificador estable: usar el ID canónico del row (`clientId`, `providerId`, `campaignId`).
- No animar elementos que no existen en ambos lados (el browser los descarta sin error, pero queda inconsistente).
- Modifier-clicks (cmd/ctrl/shift/middle) caen al comportamiento Link nativo (ya manejado por `ViewTransitionLink`).
- Reduced motion: respetado por la dual guard de TASK-525 (CSS + helper short-circuit). No agregar checks adicionales.

## Verification

- `pnpm lint`
- `pnpm build`
- `npx tsc --noEmit`
- Smoke manual en `dev-greenhouse.efeoncepro.com`:
  - `/finance/clients` → click en una fila → morph del nombre + avatar al header.
  - `/finance/suppliers` → click en una fila → morph del nombre + chip al header.
  - `/campanas` → click en una fila → morph del nombre + EO-ID + status al header.
- DevTools `prefers-reduced-motion: reduce` → navegación instantánea.
- Firefox → navegación instantánea sin error.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] `docs/tasks/README.md` actualizado con entry de cierre.
- [ ] `Handoff.md` actualizado con bloque de sesión.
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` no requiere cambio (la sección Delta 2026-04-25 ya describe el patrón); solo agregar nota breve si emergen reglas nuevas durante implementación.
- [ ] Smoke en staging hecho y documentado en Handoff.

## Follow-ups

- **TASK-525.2 (Tier 2)**: extender a `/finance/income`, `/finance/contracts`, `/finance/expenses`, `/finance/master-agreements`, `/agency/organizations`, `/agency/spaces`, `/sprints`, `/proyectos`. Mismo patrón.
- **TASK-525.3 (Tab transitions)**: envolver `setTab` en `startViewTransition` en QuoteDetailView y otros detail views con tabs para fade global.
- **TASK-525.4 (Back navigation)**: cambiar los botones "back" de los detail views a `useViewTransitionRouter().back()` para activar el morph inverso.
- **TASK-525.5 (Drawer morph)**: cuando aplique, morphear identidad de un row al header de un drawer (ej. `CreateDealDrawer` con contacto pre-seleccionado).
