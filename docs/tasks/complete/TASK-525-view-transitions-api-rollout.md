# TASK-525 — View Transitions API rollout (navegación animada nativa)

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio` (UX enterprise de navegación, 0 bundle cost)
- Effort: `Medio`
- Type: `ux` + `platform`
- Status real: `Backlog — Ola 4 motion modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-525-view-transitions-api`

## Summary

Adoptar la **View Transitions API** nativa del browser (Chrome 111+, Safari 18+, Firefox en progreso) para transiciones de ruta y state-swap en el portal. Cero bundle — es API del browser. Es el estándar 2024-2026 usado por Vercel Geist, Astro, Next docs, GitHub Issues redesign.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4 motion additions.

## Why This Task Exists

Hoy la navegación entre `/finance/quotes` → `/finance/quotes/:id`, `/people` → `/people/:memberId`, `/finance/quotes/new` → `/finance/quotes/:id/edit` es un "cut" instantáneo. Enterprise 2026:
- **List → Detail**: el ítem clickeado se expande hacia el detalle (morph del avatar/título).
- **Modal/drawer open**: slide from edge con correspondence.
- **Cross-document navigation**: smooth fade con shared element continuity.

Todo esto el browser lo soporta nativo sin librería. La alternativa (framer-motion layoutId) funciona pero requiere orchestration manual, está limitada a same-document, y pesa.

## Goal

1. **Activar CSS View Transitions** en Next 16 App Router vía `experimental.viewTransition: true` en `next.config.mjs` (Next 15+ feature).
2. **Helper canónico** `src/lib/motion/view-transition.ts` con wrapper de `document.startViewTransition(...)` + fallback si no soportado.
3. **3 patterns implementados como showcase**:
   - **List → Detail morph** en Finance (`/finance/quotes` → `/finance/quotes/:id`): nombre + status chip viajan.
   - **People detail**: avatar + nombre.
   - **Edit mode entry**: transición suave del header al abrir `/edit`.
4. **CSS**: `view-transition-name` scoped por elemento + `::view-transition-old/new` keyframes canónicos.
5. **Reduced-motion fallback**: respeto automático de `prefers-reduced-motion: reduce` (el browser ya lo maneja; documentar el contrato).
6. **Docs** `GREENHOUSE_UI_PLATFORM_V1.md` — sección "Navigation transitions with View Transitions API".

## Acceptance Criteria

- [ ] `experimental.viewTransition: true` en `next.config.mjs`.
- [ ] `src/lib/motion/view-transition.ts` con helper + feature detection.
- [ ] 3 patterns funcionando en las rutas listed.
- [ ] Reduced-motion respetado (verificar con DevTools forced media).
- [ ] Fallback gracioso en Firefox (browser sin soporte aún): navegación instantánea sin error.
- [ ] Docs actualizados.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: flows de Finance / People se ven con transición suave.

## Scope

### Setup
- `next.config.mjs`: enable view transitions.
- Helper: `motion/view-transition.ts` con signature `startViewTransition(update: () => void | Promise<void>): Promise<void>`.

### CSS patterns (en `src/app/globals.css` o equivalente)
- Morph name: `.identity-morph-target { view-transition-name: quote-identity-{id} }`.
- Keyframes default: fade 250ms ease-out para `::view-transition-new(*)`.

### React integration
- Hook `useViewTransitionNavigation()` que wrappea `router.push` dentro de `startViewTransition`.
- Progressive enhancement: si no soportado, cae a `router.push` directo.

### Routes target v1
- `/finance/quotes` → `/finance/quotes/:id`.
- `/people` → `/people/:memberId`.
- Quote detail header → `/edit` mode.

## Out of Scope

- Cross-document transitions (Multi-Page App style) — las SPAs del portal son same-document, el same-doc flavor de View Transitions cubre.
- View transitions en cada click del portal (scope es patterns clave, no global).

## Follow-ups

- Agregar shared-element morph en dashboards (MRR/ARR → contract detail).
- Integrar con framer-motion layout animations si se descubre caso que necesite control fino.
