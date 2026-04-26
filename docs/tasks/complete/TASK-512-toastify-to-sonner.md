# TASK-512 — `react-toastify` → `sonner`

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (UX de toasts + bundle -85%)
- Effort: `Bajo`
- Type: `refactor` + `dependency`
- Status real: `Backlog — Ola 1 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-512-toastify-to-sonner`

## Summary

Reemplazar `react-toastify 11.0.5` por [`sonner`](https://sonner.emilkowal.ski/) — el toast library estándar 2024-2026 usado por Vercel, Linear, Resend, shadcn. Mejor API, mejor stacking, smaller bundle, promise integration, swipe dismiss, built-in a11y.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 1.

## Why This Task Exists

`react-toastify` es de 2017 con API imperativa, stacking visual inferior (toasts se apilan cortando unos a otros) y bundle grande (~30 KB). Sonner trae:
- Stack visual moderno (toasts se apilan con el "pinch" effect de iOS notifications).
- `toast.promise(fn, { loading, success, error })` — integración canónica.
- Swipe dismiss en mobile.
- Keyboard shortcuts built-in (Alt+T para focus).
- Bundle ~4 KB.
- Theme integration con CSS vars (respeta light/dark).

## Goal

1. Instalar `sonner`.
2. Reemplazar `<ToastContainer>` del layout por `<Toaster>` de sonner.
3. Encontrar todos los `toast.success(...)`, `toast.error(...)`, `toast.info(...)` y migrar a la API de sonner (es 95% compatible; diferencias menores en options).
4. Eliminar `react-toastify` de `package.json`.
5. Verificar: theme + i18n + placement consistent con el resto del portal.

## Acceptance Criteria

- [ ] `sonner` instalado; `react-toastify` removido.
- [ ] `<Toaster richColors closeButton />` configurado en el layout root.
- [ ] Todos los consumers migrados (grep `react-toastify` devuelve 0 hits).
- [ ] Tests verdes.
- [ ] Smoke staging: crear quote → toast success aparece. Error case → toast error. Promise case (si aplica) → loading → success.

## Scope

- `src/app/**/layout.tsx` — reemplazar ToastContainer.
- Grep global: `import { toast } from 'react-toastify'` → `import { toast } from 'sonner'`.
- Estilos custom de ToastContainer → reemplazar con `<Toaster>` props o CSS vars.

## Out of Scope

- Crear nuevos patterns de toast (mantenemos los 20+ casos ya implementados).
- Cambiar placement (preservar el actual del portal).

## Follow-ups

- Considerar extender `useSuccessToast` / `useErrorToast` hooks en `src/hooks/` para consistencia.
