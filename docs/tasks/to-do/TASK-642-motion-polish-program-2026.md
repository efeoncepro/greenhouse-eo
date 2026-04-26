# TASK-642 — Greenhouse Motion Polish Program 2026 (umbrella)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (percepción visual del portal — primera impresión enterprise)
- Effort: `Medio` (5 sub-tasks de 2-6h cada una; ejecutables incrementalmente)
- Type: `umbrella` + `ux`
- Status real: `Backlog — programa coordinado para subir tier visual a Linear/Stripe-level`
- Rank: `Post-decision motion 2026-04-26`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-642-motion-polish-program` (umbrella; cada sub-task tiene su propia branch)

## Summary

Programa coordinado para llevar las animaciones de Greenhouse de "estáticas con View Transitions cross-page" a "Linear/Stripe-level moderna". 5 sub-tasks ejecutables incrementalmente (sin big-bang), cada una mejora una dimensión visible del portal. El total (~17-25h) usa libs ya instaladas (`framer-motion@12.38`) o adiciones triviales (`@formkit/auto-animate` 2 KB).

## Why This Task Exists

Audit 2026-04-26: Greenhouse hoy tiene infraestructura parcial de motion (View Transitions API rolleadas en TASK-525, Framer Motion instalado pero con 0 uso real en views) pero el portal **se siente estático** porque faltan las dimensiones de motion que las apps modernas (Linear, Vercel, Stripe, Notion) ejecutan a la vez:

| Dimensión | Estado actual |
| --- | --- |
| View Transitions (cross-page) | ✅ TASK-525 cerrada |
| List mutations (add/remove/reorder) | ❌ Saltos instantáneos |
| Microinteractions (hover/focus/press) | ❌ Solo defaults MUI sin spring |
| Page entrance + skeleton cross-fade | ❌ Cut instantáneo |
| KPI counters rolling | ❌ Cifras aparecen instantáneas |
| Scroll-triggered chart entrance + stagger | ❌ Charts estáticos |

Hacer una sola dimensión (ej. solo TASK-526) deja la sensación de "no se nota". Hacer todas en orden coordinado **transforma la percepción del portal** sin reescribir features.

## Goal

- Coordinar la ejecución de las 5 sub-tasks en el orden propuesto.
- Garantizar que cada sub-task aporta valor independiente y se puede mergear sola.
- Mantener convención de timing/easing/duration consistente entre todas (definida en TASK-643).
- Cerrar el programa cuando las 5 sub-tasks estén `complete` y se valide la percepción end-to-end en staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (stack UI, librerías, patrones).
- `src/lib/motion/view-transition.ts` (helper canónico ya existente — referencia del patrón).
- `src/components/greenhouse/motion/` (carpeta canónica para wrappers de motion).
- `src/libs/FramerMotion.tsx` (wrapper canónico ya existente — re-exporta `motion`, `AnimatePresence`, `useInView`, `useSpring`, `useTransform`, `useMotionValue`).

Reglas obligatorias:

- **Reduced motion compliance**: cada sub-task debe respetar `prefers-reduced-motion: reduce` (auto-animate y View Transitions API ya lo hacen nativo; las wrappers de Framer Motion deben implementar opt-out explícito).
- **Timing canónico** (definido en TASK-643): hover 150ms, list mutation 200ms, page entrance 300ms, modal 300ms, counter 800-1200ms.
- **Easing canónico**: `cubic-bezier(0.16, 1, 0.3, 1)` (cubicOut equivalente) para entrances; `cubic-bezier(0.4, 0, 1, 1)` para exits.
- **No reinventar** wrappers — usar `src/components/greenhouse/motion/*` para nuevos componentes y `src/libs/FramerMotion.tsx` para imports.

## Normative Docs

- Skill `greenhouse-microinteractions-auditor` (ya existe en el repo) — lo invoca cada sub-task que toca microinteractions.

## Dependencies & Impact

### Depends on

- `TASK-525` (View Transitions API) — cerrada. Foundation de motion ya está.
- Framer Motion `^12.38` ya instalado.

### Blocks / Impacts

- Percepción visual del portal por stakeholders, clientes Globe, devs nuevos.
- Onboarding visual: la primera impresión sube de "ok, funcional" a "premium enterprise".
- TASK-525.1 (View Transitions Tier 1 expansion) es **complementaria** — debe coordinarse para no chocar timing/easing.
- TASK-641 (ECharts adoption) **se beneficia** — TASK-646 (scroll-triggered chart entrance) extiende su valor visual.

### Files owned

Solo coordinación + convenciones canónicas. Cada sub-task owns sus propios archivos:

- TASK-526 → `src/hooks/useListAnimation.ts` + 5+ vistas con listas.
- TASK-643 → `src/components/greenhouse/motion/microinteractions.ts` + tokens.
- TASK-644 → `src/components/greenhouse/motion/PageEntrance.tsx` + `SkeletonCrossfade.tsx`.
- TASK-645 → `src/components/greenhouse/motion/AnimatedCounter.tsx`.
- TASK-646 → `src/hooks/useScrollReveal.ts` + integraciones en charts.

## Current Repo State

### Already exists

- View Transitions API helper + hook + Link drop-in (`src/lib/motion/view-transition.ts`, `src/hooks/useViewTransitionRouter.ts`, `src/components/greenhouse/motion/ViewTransitionLink.tsx`).
- Framer Motion `^12.38` instalado, wrapper en `src/libs/FramerMotion.tsx`.
- Skill `greenhouse-microinteractions-auditor` para validación.
- TASK-525 cerrada — patrón `view-transition-name` documentado.

### Gap

- 0 uso real de Framer Motion en views (instalado sin consumidores).
- `@formkit/auto-animate` no instalado.
- Sin wrappers canónicos para page entrance, KPI counter, scroll reveal.
- Sin convención de timing/easing escrita en `GREENHOUSE_UI_PLATFORM_V1.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC (umbrella — orquesta sub-tasks)
     ═══════════════════════════════════════════════════════════ -->

## Scope (orden recomendado de ejecución)

### Slice 1 — TASK-643: Microinteractions polish + tokens canónicos

**Por qué primero**: define los tokens (timing, easing, scale factors) que las demás sub-tasks van a consumir. Sin esto, cada sub-task inventa su propio timing y queda inconsistente.

Effort: 4-6h.

### Slice 2 — TASK-526: List motion con auto-animate

**Por qué segundo**: quick win visible inmediatamente en `QuoteLineItemsEditor`, `AddonSuggestionsPanel`, etc. 2 KB de bundle, zero-config, valida que el programa avanza con feedback temprano.

Effort: 2-3h.

### Slice 3 — TASK-644: Page entrance + skeleton crossfade

**Por qué tercero**: convierte cada navegación dentro de la app en un fade-in suave. Wrapper canónico `<GhPageEntrance>` que envuelve cada page; skeleton swap pasa de "instantáneo brusco" a "cross-fade 200ms".

Effort: 4-6h.

### Slice 4 — TASK-645: KPI counter animations

**Por qué cuarto**: alta visibilidad en dashboards (MRR/ARR, Finance, ICO). Wrapper `<AnimatedCounter>` con `useSpring` de Framer Motion. Cifras de KPI cards "ruedan" desde 0 al valor final en 800-1200ms.

Effort: 3-4h.

### Slice 5 — TASK-646: Scroll-triggered chart entrance + stagger

**Por qué quinto**: cierra el programa con el wow factor más alto. Charts de dashboards animan entrada cuando entran al viewport (`useInView`); rows de listas largas entran staggered (delay 30ms entre items). Sinergia directa con TASK-641 (ECharts adoption).

Effort: 4-6h.

## Out of Scope

- Animaciones tipo Rive (TASK-527 cubre esa dimensión separada).
- Reescribir wrappers de View Transitions (TASK-525 los dejó canónicos).
- Cambiar el design system tokens (`GH_COLORS`, tipografía) — esta no es task de rebrand.
- Animaciones gimmicky (parallax exagerado, easter eggs animados, theatrical bouncing).

## Detailed Spec

Cada sub-task tiene su Detailed Spec propia. El umbrella solo coordina:

| Sub-task | Spec file | Owner cuando se tome |
| --- | --- | --- |
| TASK-526 | `to-do/TASK-526-auto-animate-list-motion.md` | TBD |
| TASK-643 | `to-do/TASK-643-microinteractions-polish.md` | TBD |
| TASK-644 | `to-do/TASK-644-page-entrance-skeleton-crossfade.md` | TBD |
| TASK-645 | `to-do/TASK-645-kpi-counter-animations.md` | TBD |
| TASK-646 | `to-do/TASK-646-scroll-triggered-chart-entrance.md` | TBD |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] TASK-643 cerrada (tokens canónicos + microinteractions polish).
- [ ] TASK-526 cerrada (list motion).
- [ ] TASK-644 cerrada (page entrance + skeleton crossfade).
- [ ] TASK-645 cerrada (KPI counter animations).
- [ ] TASK-646 cerrada (scroll-triggered + stagger).
- [ ] Validación end-to-end en staging: navegar `/finance/quotes` → click row → ver morph (TASK-525) → ver page entrance (TASK-644) → ver KPI counters rolling (TASK-645) → scroll y ver charts entrar (TASK-646) → editar line items y ver list mutations (TASK-526) → ver microinteractions consistentes en hover/focus/press (TASK-643).
- [ ] `prefers-reduced-motion: reduce` validado en DevTools — todas las animaciones se desactivan o reducen a fade simple.
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con sección "Motion System V1" (tokens + patrones canónicos).

## Verification

- Validación visual manual end-to-end (descrita arriba).
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes (cada sub-task lo valida en su propio cierre).
- Smoke en preview Vercel para validar performance (motion no debe degradar TTI ni dejar jank visible en mobile).

## Closing Protocol

- [ ] `Lifecycle` umbrella sincronizado.
- [ ] Archivo en `complete/` cuando las 5 sub-tasks cerraron.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` con resumen del programa.
- [ ] `changelog.md` con entry "Motion System V1 shipped".
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` con sección Motion System V1.

## Follow-ups

- TASK futura: revisar performance de motion en mobile bajo carga (Lighthouse, CrUX). Si hay jank, optimizar.
- TASK futura: evaluar TASK-527 (Rive interactive illustrations) como capa siguiente si Motion System V1 deja la barra alta.
- TASK futura: documentar el sistema en Storybook si se adopta (TASK aparte, no este programa).

## Open Questions

- Orden de ejecución: ¿pivote a TASK-526 primero (más rápida, feedback inmediato) y TASK-643 segundo (foundational pero más lenta)? Recomendación actual es TASK-643 primero para tener tokens canónicos antes de animar; pero si querés ver progreso visible en 2-3h, podés invertir el orden.
- ¿Validación con un cliente Globe real (showcase 1:1 con stakeholder) al cerrar el programa para confirmar la percepción "moderna"?
