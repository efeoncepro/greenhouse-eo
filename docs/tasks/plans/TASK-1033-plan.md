# Plan — TASK-1033 Greenhouse Floating Surface Primitive

## Discovery summary

AUDIT:
- Hook Codex ejecutado: `pnpm codex:task-hook TASK-1033 --prompt-only`; el prompt activo incluye la regla anti-worktree.
- Checkout: `develop`, con ejecucion operator-directed en el checkout actual. No se crea `git worktree`, no se crea folder clon y no se cambia de branch.
- Dirty worktree previo: cambios existentes en hook/docs Codex, `DESIGN.md` y `src/@core/theme/axis-neutrals.ts`. Los cambios AXIS son ajenos a esta task y no se revierten.
- Task movida a `docs/tasks/in-progress/TASK-1033-greenhouse-floating-surface-primitive.md`; `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `DECISIONS_INDEX.md` sincronizados.
- Archivos esperados encontrados: `TotalsLadder.tsx`, `CostProvenancePopover.tsx`, barrel de primitives, tests de primitives, scenario DSL GVC.
- Dependencia confirmada: `@floating-ui/react` `0.27.16` en `package.json`.
- Estado real confirmado: solo hay imports directos de `@floating-ui/react` en infraestructura Vuexy y dos consumers Greenhouse producto (`TotalsLadder`, `CostProvenancePopover`). Este es el gap exacto que debe cerrar la primitive.
- Discrepancias: la branch convention de la task queda reemplazada por instruccion humana de no usar worktree/branch aislada. El campo `Branch` documenta `develop` con excepcion operator-directed.
- Bloqueantes: ninguno para planificar. La ejecucion queda gated por checkpoint humano porque la task es `P1` / `Effort Medio`.
- Solution quality assessment: causa raiz = contrato Floating UI duplicado en consumers producto. La solucion robusta es extraer la primitive compartida con variants/kinds, tests y GVC; no parchear ambos popovers por separado.

## Access model

No toca permisos, menu, rutas nuevas de producto, Home, page guards, tabs ni startup policy.

- `routeGroups`: sin impacto.
- `views` / `authorizedViews`: sin impacto.
- `entitlements`: sin impacto.
- `startup policy`: sin impacto.
- Decision de diseno: el GVC scenario puede usar una ruta existente o mockup interno, pero no introduce surface navegable productiva nueva.

## Architecture decision

- ADR existente: `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`.
- ADR relacionado: `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`.
- ADR nuevo/propuesto: no requerido. La decision de plataforma ya esta aceptada e indexada.
- Status requerido antes de implementar: Accepted.

## Skills

- Slice 1-2: `greenhouse-product-ui-architect` para Primitive + Variants + Kinds y boundary con Adaptive Sidecar.
- Slice 1-3: `greenhouse-ui-orchestrator` y `greenhouse-vuexy-ui-expert` para composicion MUI/Vuexy sin sistema paralelo.
- Slice 2-4: `greenhouse-ux-content-accessibility` para roles, focus, dismiss, aria y copy reusable.
- Slice 4/cierre: `greenhouse-documentation-governor` antes del cierre documental.

## Subagent strategy

`sequential`.

La task toca una primitive compartida y dos consumers piloto con acoplamiento visual/a11y. Conviene que el agente principal mantenga una sola linea de criterio en API, tests, GVC y docs.

## Execution order

1. Baseline local antes de codigo: `pnpm exec tsc --noEmit --pretty false` y lint focal si el repo lo permite sin mezclar fixes ajenos.
2. Crear `floating-surface-controller.ts` con unions de variants/kinds, config por variant y resolver idempotente.
3. Crear `GreenhouseFloatingSurface.tsx` como primitive client-side sobre Floating UI: controlled/uncontrolled open, render props para anchor/content, defaults canonicos, role/dismiss/focus por variant, data hooks GVC y styles MUI coherentes.
4. Agregar tests focales de controller y component: resolver, render props, open/close click, Escape, outside click, aria/data attrs y focus return cuando jsdom lo soporte de forma estable.
5. Migrar `TotalsLadder` para usar `GreenhouseFloatingSurface` manteniendo API publica `addonsSegment`.
6. Migrar `CostProvenancePopover` a `GreenhouseFloatingSurface` como `evidencePeek` / `costProvenance`, manteniendo su trigger default/custom.
7. Agregar scenario GVC `floating-surface` con desktop/mobile y pasos open/close/collision/keyboard factibles sobre una ruta existente o mockup minimo no-productivo si discovery runtime lo exige.
8. Actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con el delta de runtime shipped y la regla de consumo desde primitives.
9. Verificar: tests focales, lint/tsc, `pnpm design:lint`, `pnpm task:lint --changed`, `pnpm fe:capture <scenario> --env=local`, `pnpm docs:closure-check`.
10. Cierre documental si todo pasa: acceptance criteria, task lifecycle, Handoff, changelog si hay cambio visible/contrato, y cierre con evidencia.

## Files to create

- `src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx`
- `src/components/greenhouse/primitives/floating-surface-controller.ts`
- `src/components/greenhouse/primitives/__tests__/GreenhouseFloatingSurface.test.tsx`
- `src/components/greenhouse/primitives/__tests__/floating-surface-controller.test.ts`
- `scripts/frontend/scenarios/floating-surface-primitives.scenario.ts`

## Files to modify

- `src/components/greenhouse/primitives/index.ts` — exportar primitive y tipos.
- `src/components/greenhouse/primitives/TotalsLadder.tsx` — reemplazar Floating UI ad-hoc por primitive.
- `src/components/greenhouse/pricing/CostProvenancePopover.tsx` — reemplazar Floating UI ad-hoc por primitive.
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — delta de runtime y reglas actualizadas.
- `docs/tasks/in-progress/TASK-1033-greenhouse-floating-surface-primitive.md` — lifecycle/verification.
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` — lifecycle.
- `Handoff.md` y `changelog.md` — cierre si hay runtime shipped.

## Files to delete

- Ninguno esperado.

## Risk flags

- `TASK-1028` Adaptive Sidecar esta en progreso; boundary debe quedar explicito para no mezclar lanes full-height con popovers anclados.
- `TASK-1034` AXIS tiene cambios locales ajenos en `DESIGN.md` y neutrales; no tocar esos diffs salvo que `design:lint` exija algo directamente causado por esta task.
- Floating UI en Vuexy menu queda fuera de scope; el gate de imports debe distinguir infraestructura Vuexy vs product views.
- GVC local puede depender de auth/datos de ruta. Si una ruta productiva no es estable, usar mockup/scenario controlado y documentar el limite.

## Open questions

- Checkpoint humano: aprobar este plan antes de escribir codigo de producto, por regla `P1`.
