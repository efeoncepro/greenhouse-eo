# TASK-509 — Floating UI en TotalsLadder (addons primitive self-contained)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (cierra el bug del popover top-left + foundation para migración platform-wide)
- Effort: `Medio-Bajo`
- Type: `fix` + `platform` + `refactor`
- Status real: `En implementación`
- Rank: `Post-TASK-508`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-509-floating-ui-addons`

## Summary

El popover de addons aparece en el top-left del viewport en vez de anclado al segmento inline del `TotalsLadder`. Es un bug, no diseño: el anchor se captura en el dock (`event.currentTarget`) pero el `<button>` anchor vive dentro del primitive `TotalsLadder`. Cuando el primitive re-renderiza (cambio de `count`/`amount` al tildar un addon), el cached DOM node puede quedar stale → MUI Popper fallback a viewport `0,0`.

Fix robusto + escalable: **encapsular el popover dentro del primitive usando [Floating UI](https://floating-ui.com/)** (`@floating-ui/react`) — el sucesor oficial de popper.js y el stack de posicionamiento que usan Linear, Stripe, Vercel, Radix, shadcn en 2024-2026.

## Why This Task Exists

Audit identificó dos problemas convergentes:

1. **Stale anchor**: MUI Popper lee `anchorEl` del state del dock; no detecta cuando el DOM node del button cambia identidad o contexto. `autoUpdate` de Floating UI monitorea el reference element con ResizeObserver + IntersectionObserver y recupera.
2. **State leak cross-component**: el anchor vive en el dock pero el button vive en el primitive. Cualquier re-render o re-conciliation puede romper el vínculo. Encapsular el popover DENTRO del primitive elimina el boundary.

Adicional: Floating UI resuelve otras carencias conocidas de MUI Popper:
- Auto-flip/shift cuando el popover se va a salir del viewport (Popper lo soporta pero con middleware manual).
- `useDismiss` hook: outside-click + escape + blur out-of-the-box.
- `useRole` hook: `aria-haspopup`/`role="dialog"` automático.
- `FloatingFocusManager`: manejo de focus trap / return focus al dismiss.
- `FloatingPortal`: render al document.body con z-index apropiado, sin conflictos de stacking context.

Esta task es el primer consumidor de Floating UI en el repo. TASK-510 (platform-wide migration) la adoptará en ContextChip, Ajustes popover, Warning popover.

## Goal

1. Instalar `@floating-ui/react` como dependencia.
2. Refactorizar `TotalsLadder` primitive: encapsula el `<Popper>` internamente; acepta `addonsSegment.content: ReactNode` en vez de `onClick`.
3. Reemplazar MUI `<Popper>` + `ClickAwayListener` + `Paper` por `useFloating` + `FloatingPortal` + `FloatingFocusManager`.
4. Dock (`QuoteSummaryDock.tsx`) elimina state `addonAnchor` / `addonsOpen` / `handleAddonsToggle` / `handleAddonsClose`. Pasa al primitive el `AddonSuggestionsPanel` como `content`.

## Acceptance Criteria

- [ ] `@floating-ui/react` instalado en `package.json`.
- [ ] `TotalsLadder` primitive maneja internamente el popover via Floating UI:
  - `useFloating` con `placement: 'top-start'` + `middleware: [offset(8), flip(), shift({ padding: 16 })]` + `whileElementsMounted: autoUpdate`.
  - `useInteractions([useClick, useDismiss, useRole])` para behaviors.
  - `FloatingPortal` + `FloatingFocusManager` con `modal={false}` (popover, no modal).
- [ ] Dock no tiene más `addonAnchor` / `addonsOpen` state. 6 líneas de state + handlers eliminadas.
- [ ] Popper/ClickAwayListener/Paper imports del dock removidos.
- [ ] Click en segmento inline → popover se abre anclado correctamente.
- [ ] Escape cierra. Click afuera cierra. Popover NO se queda stuck en top-left.
- [ ] Auto-flip cerca del borde del viewport (e.g. si el dock está cerca del bottom y el popover `top-start` no cabe, flip a `bottom-start`).
- [ ] Focus management: al abrir, el focus va al primer elemento interactivo del panel. Al cerrar con escape, el focus vuelve al segmento inline.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: popover aparece encima del segmento, no top-left.

## Scope

### Dependency
```bash
pnpm add @floating-ui/react
```

### Primitive `TotalsLadder` refactor

API contractual:
```ts
export interface TotalsLadderAddonsSegment {
  count: number
  amount: number
  content: ReactNode   // ← nuevo: el AddonSuggestionsPanel
}
```

(Remueve `onClick` y `ariaExpanded` del contrato — el primitive los gestiona.)

Implementación:
- Hooks de Floating UI como arriba.
- Reference: el `<button>` inline se hace `ref={refs.setReference}` + `{...getReferenceProps()}`.
- Floating: `<FloatingPortal>` + `<FloatingFocusManager>` + `<Paper ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>`.
- Preserva estilos MUI (`Paper` sigue dando el elevation + radius + border).

### Dock

- Remueve imports: `Popper`, `Paper`, `ClickAwayListener`, `MouseEvent as ReactMouseEvent`, `useState`.
- Remueve state: `addonAnchor`, `handleAddonsToggle`, `handleAddonsClose`, `addonsOpen`.
- Remueve el JSX del `<Popper>` (sibling del Grid).
- Pasa `content: addonContent` al `TotalsLadder` dentro de `addonsSegment`.

## Out of Scope

- Migración platform-wide a Floating UI (ContextChip, Ajustes, Warning popovers) — TASK-510.
- Cambio de estilos del popover (sigue usando Paper con Tailwind/MUI classes).
- Migrar `@mui/material/Popper` de otros popovers del módulo.

## Follow-ups

- **TASK-510** — Platform-wide Floating UI migration. Refactor: ContextChip, Ajustes popover, Warning popover (TASK-508), y cualquier otro popover en finance / hr / people. Deprecate `@mui/material/Popper` internamente. Sin deadline fijo; se arma cuando aparezca friction real en otro popover.
