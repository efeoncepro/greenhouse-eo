# TASK-510 — Platform-wide Floating UI Migration

## Status

- Lifecycle: `to-do`
- Priority: `P3` (foundation / deuda técnica amable)
- Impact: `Medio` (consistencia de a11y + positioning en todos los popovers)
- Effort: `Medio-Alto`
- Type: `platform` + `refactor`
- Status real: `Backlog estratégico`
- Rank: `Post-TASK-509`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-510-floating-ui-platform-migration`

## Summary

TASK-509 introdujo `@floating-ui/react` como primer consumer en `TotalsLadder`. Esta task extiende la adopción a todo el catálogo de popovers del portal — deprecar `@mui/material/Popper` internamente y unificar el positioning + a11y stack en Floating UI (el estándar 2024-2026 usado por Radix, shadcn, Linear, Stripe).

## Why This Task Exists

MUI Popper (Popper.js v2) es legacy — el sucesor oficial es Floating UI. Mantener dos stacks paralelos fragmenta la DX:

- Anchor management inconsistente (unos via ref, otros via state, otros via virtual element).
- A11y escalada manual en cada popover (aria-haspopup, role, focus return, escape key — hoy lo cosemos a mano popover por popover).
- Positioning middleware: MUI Popper soporta modifiers pero con API más verbosa; Floating UI tiene `offset`, `flip`, `shift`, `size`, `arrow`, `hide` como middleware composable.
- `autoUpdate` de Floating UI recupera cuando el anchor re-renderiza — un valor que Popper.js v2 no trae.

## Goal

Refactorizar todos los popovers / poppers del portal para usar Floating UI:

1. `ContextChip` (picker de contexto chips en Quote Builder y futuro contract builder).
2. `QuoteLineItemsEditor.Ajustes` popover (FTE + tipo de contratación).
3. `QuoteLineItemsEditor.Warning` popover (TASK-508 — warning inline).
4. `AddLineSplitButton` dropdown.
5. `QuoteShortcutPalette` si usa Popper.
6. Cualquier `@mui/material/Popover` o `@mui/material/Popper` que aparezca en grep.

Output: zero imports de `@mui/material/Popper` en `src/`. `@mui/material/Popover` puede convivir (es un primitive modal con backdrop — caso distinto).

## Acceptance Criteria

- [ ] Audit completo: lista de componentes con `Popover`/`Popper` en el repo.
- [ ] Cada uno migra a `useFloating` + `FloatingPortal` + `FloatingFocusManager` o su equivalente funcional.
- [ ] `useDismiss` (escape + outside-click) homogéneo across todos los popovers.
- [ ] `useRole` define el aria-role apropiado (`dialog` / `menu` / `listbox` / `tooltip`).
- [ ] Todos los popovers preservan su estilo visual (Paper MUI + borderRadius tokens).
- [ ] Docs: `GREENHOUSE_UI_PLATFORM_V1.md` agrega sección "Floating UI as default popover stack" + guide de cómo escribir un popover nuevo.
- [ ] Gates: tsc/lint/test/build verdes.
- [ ] Visual regression: smoke staging, cada popover se abre correctamente, escape/outside-click funciona.

## Scope

### Audit — identificar consumidores

Ejecutar:
```bash
grep -rn "from '@mui/material/Popper'\|from '@mui/material/Popover'" src/ | grep -v "spec\|test"
```

Cada hit es un candidato. Clasificar por complejidad (simple tooltip vs rich popover con focus management).

### Refactor guidelines

Para cada componente:
1. Reemplazar `import Popper from '@mui/material/Popper'` con `import { useFloating, FloatingPortal, FloatingFocusManager, ... } from '@floating-ui/react'`.
2. Sustituir state anchor manual por el pattern estándar.
3. Componer interactions: `useClick` (o `useHover` para tooltips), `useDismiss`, `useRole`.
4. Mantener Paper MUI como shell del popover (estilos tokens preservados).
5. Preservar tests unitarios del componente.

### Platform primitive

Crear `src/components/greenhouse/primitives/FloatingPopover.tsx` como wrapper alto-nivel para el caso común (Paper + outside click + escape + focus manager). Consumers menos verbosos.

## Out of Scope

- Migración de `@mui/material/Dialog` (modal, caso distinto).
- Migración de `@mui/material/Tooltip` (tooltip, caso distinto — aunque Floating UI también cubre ese caso, scope ajeno).
- Reemplazar MUI en general.

## Follow-ups

- Si durante el audit aparecen popovers con lógica custom que merece propio primitive (ej. command palette), extraerlo a `primitives/`.
- Considerar `@floating-ui/react-dom` standalone si queremos un subset más ligero (hoy `@floating-ui/react` incluye los hooks + interactions).
