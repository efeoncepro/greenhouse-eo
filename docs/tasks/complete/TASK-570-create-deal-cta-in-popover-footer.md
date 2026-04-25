# TASK-570 — Move "Crear deal nuevo" CTA into Deal Chip Popover Footer

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (UX refinement en flujo diario de cotización)
- Effort: `Bajo` (~2 horas)
- Type: `implementation`
- Epic: `[optional — hermano de TASK-564]`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `ui` + `crm`
- Blocked by: `none`
- Branch: `task/TASK-570-create-deal-cta-in-popover-footer`

## Summary

Actualmente en `/finance/quotes/new` el botón "+ Crear deal nuevo" vive **flotando debajo del strip** (`QuoteBuilderShell.tsx:1562-1574`) — desconectado visualmente del chip Deal HubSpot que está en estado blocking-empty. Esto viola proximity + crea un duplicate affordance (el chip orange ya es la llamada a crear/vincular deal, el botón debajo es redundante). Mover el CTA al **footer del popover del chip Deal** via el slot `popoverNotice.actionLabel + onAction` del primitive `ContextChip` (la slot ya existe, solo hay que conectarla). Remover el botón flotante.

## Why This Task Exists

Audit UX/UI con skills `modern-ui`, `greenhouse-ux`, `microinteractions-auditor`, `greenhouse-microinteractions-auditor`:

- **Proximity Gestalt violada**: el botón "Crear deal" está visualmente separado del chip Deal HubSpot con el Tier 2 de tokens inline intermediando. El ojo tiene que saltar entre orange-chip-con-tensión y link azul debajo.
- **Duplicate affordance**: el chip blocking-empty ya es la llamada accionable ("Vincular deal"). El botón flotante dice lo mismo, crea ambiguity sobre cuál es la CTA principal.
- **Fitts's Law degradado**: target text-link chico + distancia extra = acción rezagada.
- **Visual rhythm quebrado**: el link flotando rompe la grid del strip (Tier 1 → flotando → Tier 2). Strip se ve "unpolished".

Patrón correcto (Linear, Notion, GitHub, Figma): acciones "crear nuevo" dentro de selectors van **en el footer del menu/popover** donde el usuario ya está mirando. Reemplaza 2 CTAs (chip + botón) por 1 path claro (chip → popover → crear si no hay).

El primitive `ContextChip` ya soporta esto: `ContextChipPopoverNotice` tiene `actionLabel` + `onAction` que renderizan un botón en el footer del popover. Solo falta wire up.

## Goal

- Remover el botón flotante "+ Crear deal nuevo" de `QuoteBuilderShell.tsx`.
- Pasar el handler `setCreateDealDrawerOpen(true)` al `QuoteContextStrip` via prop `onCreateDeal`.
- `QuoteContextStrip` pasa el handler al chip Deal HubSpot via `popoverNotice.onAction`.
- Popover del chip Deal muestra footer "Crear deal nuevo" cuando `organizationId && !hubspotDealId` (sin deal seleccionado todavía).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §10.1 (interaction cost: ≤2 clicks)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (contexto TASK-539 Fase E)
- Parent program: `TASK-534` (Commercial Party Lifecycle)
- Hermano: `TASK-564` (gate deal creation + link fallback) — misma superficie, scope disjunto

Reglas obligatorias:

- **No cambiar el handler de creación de deal** ni el drawer — solo mover el trigger.
- **No agregar nuevo drawer/componente** — reusar `CreateDealDrawer` existente de TASK-539.
- Cumplir interaction cost cap: ≤2 clicks (chip open + action click). Hoy con el botón flotante es 1 click, pero el trade-off por discoverability + cleaner UI es aceptable.

## Normative Docs

- `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md` (parent feature del CreateDealDrawer)
- `docs/tasks/to-do/TASK-564-quote-builder-deal-creation-hubspot-link-gating.md` (hermano, gate semantics)

## Dependencies & Impact

### Depends on

- Ninguna dependencia bloqueante. El código que se toca está listo.

### Blocks / Impacts

- **No afecta otros tasks** — scope quirúrgico en `QuoteBuilderShell` + `QuoteContextStrip` + nomenclature.
- **Precede a TASK-564** pero no lo bloquea — TASK-564 puede seguir shipping normalmente.
- **Preserva la lógica de blocking-empty** de TASK-565 intacta.

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (remover botón flotante, pasar handler a strip)
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (aceptar prop `onCreateDeal`, wire popoverNotice)
- `src/config/greenhouse-nomenclature.ts` (agregar `deal.createNewLabel`)

## Current Repo State

### Already exists

- `ContextChip` primitive soporta `popoverNotice` con `tone + message + actionLabel + onAction` (implementado en TASK-565)
- `CreateDealDrawer` component (TASK-539)
- `setCreateDealDrawerOpen` state en `QuoteBuilderShell.tsx:363`
- Botón flotante en `QuoteBuilderShell.tsx:1562-1574`:
  ```tsx
  {organizationId && !hubspotDealId ? (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
      <Button ... onClick={() => setCreateDealDrawerOpen(true)}>
        Crear deal nuevo
      </Button>
    </Box>
  ) : null}
  ```
- `QuoteContextStrip` Deal HubSpot chip ya pasa `popoverNotice` con `tone + message` (sin action todavía):
  ```tsx
  popoverNotice={
    dealStatus === 'blocking-empty' && dealOptions.length === 0
      ? { tone: 'warning', message: GH_PRICING.contextChips.deal.emptyHelper }
      : undefined
  }
  ```

### Gap

- `QuoteContextStrip` no tiene prop `onCreateDeal`
- `popoverNotice` del Deal chip no pasa `actionLabel + onAction`
- Botón flotante en `QuoteBuilderShell` sigue existiendo
- Nomenclature no tiene `deal.createNewLabel`

## Scope

### Slice 1 — Nomenclature + Strip prop + popover wire

- `src/config/greenhouse-nomenclature.ts` — agregar `GH_PRICING.contextChips.deal.createNewLabel: 'Crear deal nuevo'`
- `QuoteContextStrip.tsx`:
  - Agregar `onCreateDeal?: () => void` al interface `QuoteContextStripHandlers` (opcional por safety backwards-compat)
  - Ajustar `popoverNotice` del chip Deal HubSpot para incluir `actionLabel` + `onAction` cuando corresponda:
    - Mostrar si `values.organizationId && !values.hubspotDealId && onCreateDeal`
    - tone: `'warning'` si `dealOptions.length === 0`, `'info'` si hay opciones pero user puede querer crear nueva
    - message: `GH_PRICING.contextChips.deal.empty` (caso sin opciones) o `GH_PRICING.contextChips.deal.emptyHelper` (caso con opciones — helper "crea una nueva si no encuentras")
    - actionLabel: `GH_PRICING.contextChips.deal.createNewLabel`
    - onAction: `onCreateDeal`

### Slice 2 — QuoteBuilderShell cleanup

- Remover el `Box` con el Button flotante (`QuoteBuilderShell.tsx:1562-1574`)
- Pasar `onCreateDeal={() => setCreateDealDrawerOpen(true)}` al `<QuoteContextStrip>`
- `CreateDealDrawer` component sigue montado igual — solo cambia el trigger

## Out of Scope

- **No modificar `CreateDealDrawer`** ni su lógica de submit
- **No tocar `useCreateDeal` hook**
- **No cambiar el command `createDealFromQuoteContext`** ni el endpoint
- **No tocar otros chips** del strip (Organización, Contacto, Business line, etc.)
- **No rediseñar el popover** del ContextChip — usar el slot existente
- **No cambiar la logic de blocking-empty status** del Deal chip (sigue funcionando igual)
- **No integrar con TASK-564** (link-to-company flow) — solo mover CTA de crear

## Detailed Spec

### Nomenclature (src/config/greenhouse-nomenclature.ts)

```ts
deal: {
  label: 'Deal HubSpot',
  placeholder: 'Vincular deal',
  icon: 'tabler-briefcase-2',
  hint: '...',
  noOrgFirst: 'Selecciona una organización primero',
  loading: 'Cargando deals…',
  empty: 'Sin deals disponibles para esta organización',
  emptyHelper: 'Vincula una Company HubSpot o crea un deal nuevo',
  createNewLabel: 'Crear deal nuevo' // NEW
}
```

### QuoteContextStrip handler interface update

```ts
export interface QuoteContextStripHandlers {
  ...
  onCreateDeal?: () => void // NEW — optional, trigger CreateDealDrawer
}
```

### QuoteContextStrip popoverNotice en Deal chip

```tsx
popoverNotice={
  values.organizationId && !values.hubspotDealId && onCreateDeal
    ? {
        tone: dealOptions.length === 0 ? 'warning' : 'info',
        message:
          dealOptions.length === 0
            ? GH_PRICING.contextChips.deal.emptyHelper
            : '¿No encontrás el deal que buscás?',
        actionLabel: GH_PRICING.contextChips.deal.createNewLabel,
        onAction: onCreateDeal
      }
    : undefined
}
```

Nota: cuando hay opciones disponibles, el tone cambia a `info` y el message es una invitación suave. Cuando no hay, tone es `warning` reinforzando la tensión.

### QuoteBuilderShell wire-up

Remover:
```tsx
{organizationId && !hubspotDealId ? (
  <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
    <Button ... onClick={() => setCreateDealDrawerOpen(true)}>
      Crear deal nuevo
    </Button>
  </Box>
) : null}
```

Agregar (al pasar props a `<QuoteContextStrip>`):
```tsx
<QuoteContextStrip
  ...
  onCreateDeal={() => setCreateDealDrawerOpen(true)}
/>
```

## Acceptance Criteria

- [ ] Botón flotante "+ Crear deal nuevo" removido de `QuoteBuilderShell.tsx`
- [ ] `QuoteContextStrip` acepta prop `onCreateDeal?: () => void`
- [ ] `QuoteBuilderShell` pasa `onCreateDeal={() => setCreateDealDrawerOpen(true)}` al strip
- [ ] Popover del chip Deal HubSpot muestra botón "Crear deal nuevo" en el footer cuando `organizationId && !hubspotDealId`
- [ ] Click en el botón del popover dispara apertura del `CreateDealDrawer` (mismo comportamiento que el botón flotante anterior)
- [ ] `GH_PRICING.contextChips.deal.createNewLabel` existe con valor `'Crear deal nuevo'`
- [ ] Cuando `dealOptions.length === 0`: tone warning + message empty
- [ ] Cuando hay opciones pero no se eligió: tone info + message helper
- [ ] Si no hay organización seleccionada: no se muestra popoverNotice action (chip está disabled)
- [ ] Tests existentes pasan (`pnpm test`)
- [ ] Lint + tsc + build verdes
- [ ] Verificación manual en staging: click Deal chip → popover muestra "Crear deal nuevo" → click → drawer abre

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual staging: `/finance/quotes/new` → seleccionar organización sin deals → click chip Deal HubSpot → confirmar que el footer del popover tiene "Crear deal nuevo" → click → drawer abre correctamente

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] Archivo en `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `changelog.md` actualizado
- [ ] `Handoff.md` actualizado

- [ ] Verificación visual confirmada post-deploy

## Follow-ups

- Si telemetría muestra que >30% de usuarios no descubren el CTA dentro del popover, considerar empty-state ilustrado más prominente (Opción 4 del análisis UX).
- Si TASK-564 (link-to-company) se implementa, coordinar el orden de acciones dentro del popover: primero "Vincular Company HubSpot" (si aplica), después "Crear deal nuevo".

## Open Questions

- ¿El tone `info` para caso con opciones disponibles es correcto o preferís `default`? **Default assumed**: `info` para hacer visible la invitación sin generar tensión (warning). Ajustable en visual review.
- ¿Message para caso con opciones: "¿No encontrás el deal que buscás?" o otra microcopy? Coordinar con `greenhouse-ux-writing` si se quiere refinar. **Default assumed**: la propuesta arriba.
