# TASK-1033 — Greenhouse Floating Surface Primitive

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: ``
- Status real: `Complete`
- Rank: `TBD`
- Domain: `ui|platform|accessibility`
- Blocked by: `none`
- Branch: `develop` (operator-directed no-worktree/current-checkout execution)
- Legacy ID: ``
- GitHub Issue: ``

## Summary

Construir una primitive reusable **Greenhouse Floating Surface** sobre `@floating-ui/react` para popovers, menús, rich tooltips, evidence peeks, inline editors, validation bubbles y command previews. La primitive debe evitar uso ad-hoc de Floating UI en views de producto y complementar, no reemplazar, `AdaptiveSidecar`.

## Why This Task Exists

Greenhouse ya tiene Floating UI instalada y usada en menús Vuexy, `CostProvenancePopover` y `TotalsLadder`, pero no existe una capa de plataforma que gobierne posicionamiento, foco, dismissal, variants, copy, collision y GVC. Sin primitive compartida, cada dominio tenderá a crear popovers/menus propios con comportamiento inconsistente.

## Goal

- Crear una primitive `GreenhouseFloatingSurface` exportada desde `@/components/greenhouse/primitives`.
- Definir variants funcionales oficiales (`richTooltip`, `actionMenu`, `evidencePeek`, `inlineEditor`, `validationBubble`, `commandPreview`) y resolver `kind` semántico a variant.
- Migrar o adaptar dos consumers piloto (`TotalsLadder` y `CostProvenancePopover`) sin regresión visual ni accesible.
- Crear escenarios GVC que validen open/close, keyboard, collision, scroll containment y mobile behavior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Floating UI es el engine de posicionamiento; Greenhouse owns la primitive pública.
- Views de producto no deben importar `@floating-ui/react` directamente salvo que sean primitives o infraestructura Vuexy existente.
- No usar Floating Surface para workflows largos, sidecars full-height, navegación principal nueva, ni decisiones destructivas/legales/financieras.
- Todo copy reusable debe vivir en `src/lib/copy/*`.
- UI visible debe pasar por skills de Product Design aplicables + GVC en loop.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- `@floating-ui/react` `0.27.16` en `package.json`.
- `src/components/greenhouse/primitives/TotalsLadder.tsx`
- `src/components/greenhouse/pricing/CostProvenancePopover.tsx`
- Vuexy menu usage remains legacy/infrastructure, not migrated in this task.

### Blocks / Impacts

- Futuras action menus de tablas operativas.
- Evidence/provenance peeks en finance, payroll, workforce, delivery e AI surfaces.
- Inline editing y validation bubbles en workbenches densos.

### Files owned

- `src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx`
- `src/components/greenhouse/primitives/floating-surface-controller.ts`
- `src/components/greenhouse/primitives/__tests__/*FloatingSurface*`
- `src/components/greenhouse/primitives/TotalsLadder.tsx`
- `src/components/greenhouse/pricing/CostProvenancePopover.tsx`
- `scripts/frontend/scenarios/*floating-surface*`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Current Repo State

### Already exists

- Floating UI dependencies in `package.json`.
- Vuexy menu infrastructure uses Floating UI.
- `TotalsLadder` and `CostProvenancePopover` already implement a strong local pattern: `autoUpdate + offset + flip + shift + FloatingPortal + FloatingFocusManager modal={false}`.
- Primitive + Variants + Kinds methodology is accepted.
- Adaptive Sidecar handles full-height contextual lanes.

### Gap

- No platform primitive wrapper for anchored surfaces.
- No official Floating Surface variants or kind resolver.
- No GVC scenario specifically testing anchored collision/focus across product surfaces.
- Product code could drift into direct Floating UI imports and inconsistent popover behavior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md segun TASK_PROCESS.md.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Primitive foundation

- Crear `GreenhouseFloatingSurface` con controlled/uncontrolled open support.
- Implementar `floating-surface-controller` con `GreenhouseFloatingSurfaceVariant`, `GreenhouseFloatingSurfaceKind` y resolver idempotente.
- Definir defaults: `autoUpdate`, `offset(8)`, `flip({ fallbackAxisSideDirection: 'end' })`, `shift({ padding: 16 })`, `FloatingPortal`, `FloatingFocusManager modal={false}`.
- Exponer render props o slots para anchor/content/actions sin amarrar a un dominio.

### Slice 2 — Variants and accessibility

- Implementar variants oficiales:
  - `richTooltip`
  - `actionMenu`
  - `evidencePeek`
  - `inlineEditor`
  - `validationBubble`
  - `commandPreview`
- Cada variant declara role, dismissal, focus behavior, density, motion y action placement.
- Agregar tests para keyboard open/close, Escape, outside click, focus return y reduced-motion guardrails.

### Slice 3 — Pilot migrations

- Migrar `TotalsLadder` para consumir la primitive sin cambiar su API pública.
- Migrar o adaptar `CostProvenancePopover` como consumer piloto de `evidencePeek` o `richTooltip` según discovery.
- Mantener backward compatibility y visual parity.

### Slice 4 — GVC and documentation

- Crear scenario GVC repetible para:
  - open/close desktop
  - keyboard path
  - collision near viewport edge
  - scroll/clipped container
  - mobile fallback/behavior
- Actualizar `GREENHOUSE_UI_PLATFORM_V1.md`, product UI operating model y skills UI si emerge hard rule nueva.
- Correr `pnpm docs:closure-check`.

## Out of Scope

- Migrar Vuexy navigation menus.
- Reemplazar `AdaptiveSidecar`.
- Crear workflows multi-step o modales destructivos.
- Cambiar dependencies de Floating UI.
- Crear API/backend nuevo.

## Detailed Spec

### Public API target

```tsx
<GreenhouseFloatingSurface
  variant='evidencePeek'
  kind='costProvenance'
  placement='bottom-start'
  open={open}
  onOpenChange={setOpen}
  anchor={anchorProps => <Button {...anchorProps}>Ver evidencia</Button>}
  content={contentProps => <EvidenceContent {...contentProps} />}
/>
```

The implementation may adjust naming during Slice 1, but it must preserve:

- official `variant`
- semantic `kind`
- slot/render-prop model
- stable GVC hooks
- no domain business logic inside the primitive

### Variant boundaries

- `richTooltip`: read-only, short copy, optional link, no form controls.
- `actionMenu`: menu semantics, roving/keyboard support, action list.
- `evidencePeek`: compact source/provenance/freshness/quality preview with a single open-deeper affordance.
- `inlineEditor`: low-risk edit, explicit apply/cancel, dirty-state contained locally.
- `validationBubble`: anchored error/guidance, non-modal, tied to control aria.
- `commandPreview`: read-only preview tied to command/search result focus.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (foundation) -> Slice 2 (variants/a11y) -> Slice 3 (pilot migrations) -> Slice 4 (GVC/docs).
- Do not migrate pilots before role/focus/dismissal contracts are covered by tests.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Popover queda inaccesible por foco/dismissal inconsistente | UI / accessibility | medium | `FloatingFocusManager`, `useDismiss`, tests keyboard + GVC | test failure / GVC dossier |
| Direct imports de Floating UI proliferan fuera de primitives | UI platform | medium | docs + optional lint follow-up if drift appears | code review / `rg @floating-ui/react src/views` |
| Menús/popovers compiten con Adaptive Sidecar o Dialog | UI / shell | low | boundary docs + variant rules | GVC overlap/collision |
| Migration changes visual behavior of existing consumers | UI | medium | pilot one-by-one + visual parity capture | GVC diff / user review |

### Feature flags / cutover

Sin flag para la primitive foundation. Pilot migrations are additive and local; if visual behavior regresses, revert the pilot migration while keeping the primitive.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert primitive files/barrel export | <30 min | si |
| Slice 2 | Revert variant extensions/tests | <30 min | si |
| Slice 3 | Revert each pilot consumer to previous local Floating UI implementation | <1 h | si |
| Slice 4 | Revert scenario/docs if needed | <30 min | si |

### Production verification sequence

1. `pnpm vitest run` focal primitive tests.
2. `pnpm exec tsc --noEmit --pretty false`.
3. `pnpm lint`.
4. `pnpm fe:capture <floating-surface-scenario> --env=local`.
5. Inspect GVC frames for collision, focus and polish.
6. `pnpm docs:closure-check`.

## Acceptance Criteria

- [x] `GreenhouseFloatingSurface` existe, se exporta desde `@/components/greenhouse/primitives` y centraliza defaults de Floating UI.
- [x] Variants oficiales (`richTooltip`, `actionMenu`, `evidencePeek`, `inlineEditor`, `validationBubble`, `commandPreview`) tienen resolver `kind -> variant` y contrato accesible documentado/testeado.
- [x] `TotalsLadder` y `CostProvenancePopover` consumen la primitive sin cambiar su API publica ni degradar visual/focus behavior.
- [x] Tests focales cubren resolver, open/close, Escape/outside dismiss, aria/data hooks y focus return cuando aplique.
- [x] Scenario GVC repetible captura desktop/mobile y al menos un estado open de surface anclada.
- [x] Docs UI platform y lifecycle de task quedan sincronizados al cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Verification

Evidencia recogida 2026-06-07:

- **Tests focales** — 19 pasan (`floating-surface-controller.test.ts` resolver/contrato + `GreenhouseFloatingSurface.test.tsx` open/close/Escape/outside/focus/controlled/role/inline-editor-dirty).
- **tsc** — `pnpm exec tsc --noEmit --pretty false` limpio (0 errores).
- **lint** — `pnpm lint` 0 errores (162 warnings pre-existentes `no-fontsize-inline-typography` ajenos; 1 en `CostProvenancePopover` preservado verbatim por paridad visual).
- **GVC** — `pnpm fe:capture floating-surface-primitives --env=local` OK: 2 variants (desktop 1280×900 + mobile iPhone 13), 8 frames. Estados capturados y revisados visualmente: galería de variants, `evidencePeek` (role dialog) abierto, `richTooltip` abierto por foco de teclado, `commandPreview` (right-start) reubicado por flip/shift cerca del borde derecho. Evidencia: `.captures/2026-06-07T01-43-23_floating-surface-primitives`.
- **Migración de pilotos** — `CostProvenancePopover` y `TotalsLadder` ya NO importan `@floating-ui/react`; API pública intacta; paridad visual/focus preservada.

## Closing Protocol

- [x] Ejecutar verification completo y registrar evidencia.
- [x] Marcar acceptance criteria completados o documentar pendiente bloqueante.
- [x] Mover task a `docs/tasks/complete/` solo cuando runtime, GVC y docs esten cerrados.
- [x] Sincronizar `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md` y docs de arquitectura afectadas.
- [x] Ejecutar `pnpm docs:closure-check`.

## Closure Notes

- **Shipped**: `GreenhouseFloatingSurface` + `floating-surface-controller` (`@/components/greenhouse/primitives`), 6 variants oficiales con contrato a11y por variant y resolver idempotente `kind→variant`. 2 pilotos migrados. Lab interno `/admin/design-system/floating-surfaces` + scenario GVC.
- **Sin migración / backend / capability nuevos**: el lab reusa el viewCode `administracion.design_system`. No toca permisos, rutas de producto, outbox, ni reliability signals.
- **Regla canónica nueva** (documentada en `GREENHOUSE_UI_PLATFORM_V1` Delta 2026-06-06 + CLAUDE.md "Patron canonico Floating Surface"): los views de producto NO importan `@floating-ui/react`; consumen la primitive. Excepción: primitives + infra Vuexy menu. **Enforced mecánicamente** por la lint rule `greenhouse/no-direct-floating-ui-in-views` (modo `error`, cubre static/`import()`/`require()`; RuleTester verde; `pnpm lint` 0 errores) — convierte la regla de convención en gate.
- **Follow-up (no bloqueante)**: `GreenhouseFieldProvenancePeek` sigue usando Floating UI ad-hoc (es primitive/infra, exenta por path del lint gate, no view de producto) — candidato a adoptar la primitive. La skill local `greenhouse-dev` tiene una línea desactualizada ("@floating-ui NOT to use — MUI Popper covers this") que el ADR `GREENHOUSE_FLOATING_SURFACE_DECISION_V1` (Accepted 2026-06-06) supersede; reconciliar la skill cuando se toque.
