# TASK-1015 — Onboarding cockpit: enterprise polish (UX-writing + motion + avatar canónico)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (calidad enterprise de la superficie de onboarding ya live)
- Effort: `Bajo-Medio`
- Type: `polish` (UX-writing + microinteracciones + motion + fixes de feedback)
- Epic: `EPIC-CLIENT-360`
- Domain: `commercial|ui`
- Derived from: feedback del operador sobre TASK-1013 (cockpit en staging, 2026-06-05)
- Creada/Completada: 2026-06-05 (local-first en `develop`)

## Summary

Pase de calidad enterprise sobre el cockpit de onboarding (TASK-1013) a partir del feedback del operador viéndolo en staging. Seis fixes + un pase completo de UX-writing + microinteracciones modernas, todo verificado con GVC (incluida la captura de la View Transition).

## Cambios

1. **Link amigable al wizard** — el aviso "no reemplaza el wizard" termina con un link "Ir al asistente de alta →" (flecha), no la URL cruda.
2. **UX-writing enterprise (tuteo, sin jargon)** — pase completo del copy del cockpit: voseo rioplatense → tuteo es-CL (regla CLAUDE.md), "cockpit"/"inbox"/"timeline"/"sin tipear URLs" → lenguaje claro ("vista"/"Casos en curso"/"el detalle"/"el asistente de alta"), KPI fabricado eliminado. Copy en `GH_CLIENT_ONBOARDING.onboardingCases`.
3. **Etiquetas del checklist amigables** — las 10 labels de `standard_onboarding_v1` se sembraron "verbatim" técnicas (`engagement_kind`, `client_team_assignments con FTE`). Migración `20260605053954845` reescribe solo `item_label` (plantilla + items ya materializados) a copy es-CL claro. Los `item_code` (estables) no cambian.
4. **Operador real (#6)** — el rail "Responsable" muestra al usuario de sesión que abre el cockpit (nombre + email + **foto**), no un genérico "Operador interno". Avatar resuelto server-side con el helper canónico `resolveAvatarUrl` (fuente única) y pasado como prop al view.
5. **Ruido "Bloquea el cierre"** — solo se muestra bajo etapas pendientes, no bajo las ya resueltas (completada/omitida/no aplica).
6. **Transición moderna al wizard** — el CTA "Nuevo cliente" (y todas las navegaciones del cockpit/banner/lista) usan el componente canónico `ViewTransitionLink` (TASK-525, `document.startViewTransition` crossfade, preserva prefetch). Nuevo `loading.tsx` del wizard con skeleton del shell (header + stepper + dos paneles) → la transición revela el skeleton al instante (perceived performance). Tap-acknowledgement (`:active` scale) + hover-lift en el CTA.
7. **Microinteracciones ricas** — KPIs con `AnimatedCounter` (primitiva canónica, los números ruedan al entrar, reduced-motion incluido); crossfade sutil al cambiar de caso (`@/libs/FramerMotion` + `useReducedMotion`, gated). `role=status` en el contador de casos ya presente.

## Doctrina canonizada

- **`resolveAvatarUrl` (CLAUDE.md)** — toda foto de usuario pasa por el helper canónico `src/lib/person-360/resolve-avatar.ts` (fuente única; es `server-only` → resolver en server y pasar el avatar resuelto al cliente). Sección nueva en CLAUDE.md.

## Verificación (GVC en loop)

- Cockpit desktop+mobile: copy enterprise, gate "Bloquea el cierre", operador canónico, AnimatedCounter (valores finales 1/1/0/0). Mirados, enterprise.
- **View Transition capturada** — escenario `onboarding-cases-new-client-transition` (interaction V2, frames a 0/140/380/1300 ms): crossfade + **skeleton del wizard** renderizando al instante + reduced-motion frame. Mirado.
- Gates: tsc 0 · eslint full 0 · `pnpm build` exit 0 · reachability gate sin cambios (loading.tsx no es ruta).

## Bug class corregido en el camino

- `loading.tsx` (server component) pasaba `sx={{ border: theme => ... }}` (función) a `<Card>` (client) → "Functions cannot be passed to Client Components" (wizard 500). Fix: tokens estáticos (`borderColor: 'divider'`). **Regla**: en un server component, NUNCA pasar callbacks de `sx` (función `theme =>`) a componentes MUI (client) — usar tokens string.

## Out of Scope (respondido al operador como follow-ups)

- Auto-verificación del estado real de los ítems (Notion provisionado, Nubox billing) → hoy el status del checklist es manual; auto-derivarlo extiende el patrón del preflight TASK-1009 (follow-up).
- "Todo caso debe tener deal" + linkear el deal de Berel al caso → decisión de modelo + backfill (el caso de Berel es `manual` sin deal en la base; el cockpit lo muestra honesto). Follow-up de modelo de onboarding.
