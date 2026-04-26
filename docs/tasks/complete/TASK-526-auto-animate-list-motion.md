# TASK-526 — `@formkit/auto-animate` para list motion zero-config

## Delta 2026-04-26

Esta task ahora es **Slice 2 del programa TASK-642 "Greenhouse Motion Polish Program 2026"**. Se mantiene como spec independiente (ejecutable sola), pero su valor pleno se materializa cuando se ejecuta dentro del programa coordinado:

- Slice 1: TASK-643 (microinteractions polish + tokens canónicos) — define los tokens de duration/easing que TASK-526 debe consumir en lugar de hardcodear `duration: 200, easing: 'ease-out'`.
- Slice 3: TASK-644 (page entrance + skeleton crossfade).
- Slice 4: TASK-645 (KPI counter animations).
- Slice 5: TASK-646 (scroll-triggered + stagger).

Si se ejecuta TASK-526 antes que TASK-643, los timings inline deben ser temporales y refactorizar a tokens cuando TASK-643 cierre.

Priority degradada a `P2` (era P3) — sube por estar dentro del programa coordinado de motion polish.

## Status

- Lifecycle: `complete`
- Completed: `2026-04-26`
- Priority: `P2`
- Impact: `Bajo-Medio` (micro-polish visible en cada lista mutable)
- Effort: `Bajo` (real: ~1.5h)
- Resolution: `@formkit/auto-animate@^0.x instalado, hook canónico useListAnimation creado, 5 listas wireadas (QuoteLineItemsEditor x2, AddonSuggestionsPanel, QuotesListView, PeopleListTable, ContextChipStrip). Slice 2 del programa TASK-642 cerrado.`
- Type: `dependency` + `ux`
- Status real: `Backlog — Ola 4 motion modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-526-auto-animate`

## Summary

Instalar [`@formkit/auto-animate`](https://auto-animate.formkit.com/) (2 KB, zero-config). Drop-in para animar add/remove/reorder en listas mutables. Patrón de una línea — ningún config boilerplate. Respeta `prefers-reduced-motion` nativo.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4 motion additions.

## Why This Task Exists

Hoy cuando tildas un addon, agregas una línea, removes un ítem, la lista "salta" — la nueva row aparece instantáneamente, la removida desaparece sin feedback. No es bloqueador pero rompe el flow enterprise (Linear / Notion / Stripe rows animan suave).

Framer Motion puede hacer esto pero requiere `<AnimatePresence>` + `layout` prop + `layoutId` per item + orchestration. Para 5-8 listas mutables del portal, auto-animate lo logra con un `useAutoAnimate()` ref por lista.

## Goal

1. Instalar `@formkit/auto-animate` + `@formkit/auto-animate/react` (hooks).
2. Identificar listas mutables clave y aplicar `const [parent] = useAutoAnimate()` + `ref={parent}`.
3. Listas prioritarias:
   - `QuoteLineItemsEditor` — tbody (add/remove de line items).
   - `AddonSuggestionsPanel` — stack de checkboxes (cuando entries cambian).
   - `QuoteContextChipStrip` — cuando chips se agregan/quitan.
   - `/people` y `/agency` — list views con filter changes.
   - `hr/team` roster.
   - Notification center list.
4. **Respeto de `prefers-reduced-motion`**: auto-animate ya lo respeta nativamente, verificar.

## Acceptance Criteria

- [ ] `@formkit/auto-animate` instalado.
- [ ] 5+ listas con animation wired.
- [ ] Reduced-motion → no-op (verificar con DevTools).
- [ ] Smoke staging: add/remove/reorder animations se ven suaves, no theatrical.
- [ ] Gates tsc/lint/test/build verdes.

## Scope

### Install + helper
- `pnpm add @formkit/auto-animate`.
- (Opcional) `src/hooks/useListAnimation.ts` wrapper si queremos custom timing.

### Integrate
Per lista mutable:
```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react'

const [parent] = useAutoAnimate({ duration: 200, easing: 'ease-out' })
return <tbody ref={parent}>{...}</tbody>
```

### Timing convention
- Duration 200 ms (consistente con el motion scale del portal: hover 150, menu 200, modal 300).
- Easing `ease-out` para entries, `ease-in` para exits (auto-animate maneja ambos).

## Out of Scope

- Animaciones orchestradas con stagger específico (para eso, framer-motion).
- Animaciones custom per-row (ej. "shake" en error).

## Follow-ups

- Evaluar si algún Q4 caso complejo justifica mover a framer-motion; mantener auto-animate como default.
