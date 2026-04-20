# TASK-521 — `classnames` → `clsx` + `tailwind-merge`

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo` (DX + bundle -1 KB)
- Effort: `Bajo`
- Type: `dependency` + `refactor`
- Status real: `Backlog — Ola 4 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-521-classnames-to-clsx`

## Summary

Reemplazar `classnames 2.5.1` por `clsx` (API equivalente, bundle -80%). Agregar `tailwind-merge` para resolver conflictos de classes Tailwind (`p-2 p-4` → `p-4`), útil con Tailwind 4 y composición de variants.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4.

## Why This Task Exists

`classnames` es el lib de 2015 de facto, pero `clsx` es drop-in replacement con mejor performance (200 bytes vs 1.1 KB). Y `tailwind-merge` resuelve un problema real que `classnames` no: cuando componentes aceptan `className` prop y hacemos `clsx(baseClasses, userClassName)` pero user pasa clase que conflicta → tailwind-merge hace overrides determinístico.

Pattern shadcn + Linear + Vercel:
```ts
import { cva } from 'class-variance-authority' // opcional
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

export const cn = (...inputs) => twMerge(clsx(inputs))
```

## Goal

1. Instalar `clsx` + `tailwind-merge`.
2. Crear `src/lib/cn.ts` con helper `cn()`.
3. Grep `import classNames from 'classnames'` → `import { cn } from '@/lib/cn'` (o directo `clsx`).
4. Remover `classnames` del `package.json`.

## Acceptance Criteria

- [ ] `clsx` + `tailwind-merge` instalados; `classnames` removido.
- [ ] `src/lib/cn.ts` exporta `cn()` helper canonical.
- [ ] Grep `'classnames'` devuelve 0 hits.
- [ ] Gates tsc/lint/test/build verdes.

## Scope

- Instalar deps.
- Crear helper `cn()`.
- Find/replace en src/.

## Out of Scope

- `class-variance-authority` (CVA) — sería una decisión aparte si vamos hacia variants-as-code tipo shadcn. Por ahora MUI cubre variants.

## Follow-ups

- Evaluar `class-variance-authority` si abrimos path shadcn.
