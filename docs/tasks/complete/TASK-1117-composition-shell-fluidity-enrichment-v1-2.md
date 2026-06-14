# TASK-1117 — Composition Shell fluidity enrichment V1.2 (rich choreography)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `TASK-1114 Slice 4 (cutover del piloto) / TASK-1110` — el enriquecimiento se hace CON un consumer real que lo ejerza, no en abstracto
- Branch: `task/TASK-1117-composition-shell-fluidity-enrichment-v1-2`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva el Composition Shell del **piso de fluidez V1** (morph estructural + condense) al **techo cinemático**: morph interrumpible buttery (framer-motion `layout`), promoción shared-element (card → `lead`), entrada orquestada con stagger, y drawer temporal real para `split` en compact. Gated al piloto real (Knowledge) para enriquecer con un consumer que lo ejerce.

## Why This Task Exists

V1 (TASK-1114) entregó un morph fluido pero sobrio: View Transitions estructural + condense por opacidad. Falta la coreografía rica que separa "se ve bien" de "se siente vivo": el límite VT salta-y-reinicia (no buttery), la promoción shared-element no está cableada en vivo, no hay stagger del contenido que entra, y `split` en compact apila en vez de drawer temporal. Hacerlo sin un consumer real = sobre-ingeniería; por eso se gatea al piloto.

## Goal

- Morph interrumpible buttery (cambiar de idea a media animación sin saltar).
- Card que **crece** a `lead` (continuidad del objeto, shared-element).
- Contenido que entra con beat/stagger (no pop).
- `split` en compact = drawer temporal real (no apilado).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` (§Delta tradeoff interrumpibilidad) + `_UI_PLATFORM_V1.md` §5 (contrato de fluidez A)
- Precedentes: `startViewTransition` (TASK-525/1102) · motion tokens (`motion/core/tokens.ts`) · framer-motion 12.38 (dep existente) · `AdaptiveSidecarLayout` (drawer temporal `temporary` mode)

Reglas obligatorias:
- Consumir motion tokens + `startViewTransition` + framer-motion `layout` (no fork, no librería nueva).
- `prefers-reduced-motion` horneado; never-hidden; degradación honesta.
- No cambiar el contrato público del substrato; el enriquecimiento es interno + opt-in.

## Dependencies & Impact

### Depends on
- TASK-1114 (substrato) + su Slice 4 (cutover del piloto / coordinación TASK-1110) — para ejercer el enriquecimiento con datos reales.

### Blocks / Impacts
- La calidad "wow" de cualquier consumer del substrato (Nexa moment, sidecar, workspace).

### Files owned
- `src/components/greenhouse/primitives/composition-shell/**`
- (posible) `src/components/greenhouse/motion/**` si emerge un helper de stagger reusable

## Current Repo State

### Already exists
- Morph estructural VT + condense (TASK-1114). framer-motion como dep. AdaptiveSidecar `temporary` mode (precedente del drawer).

### Gap
- Interrumpibilidad buttery, shared-element promotion, stagger de entrada, drawer temporal en compact split.

## Scope

### Slice 1 — Morph interrumpible (framer-motion layout)
- Capa framer-motion `layout` para los casos que VT no puede redirigir (drag, cambio a media animación). VT sigue para el morph estructural; framer-motion para lo interrumpible. Coexisten.

### Slice 2 — Promoción shared-element (card → lead)
- Handoff del `view-transition-name` de `lead` a la card promovida → la card crece hasta liderar. Demo viva en el Lab.

### Slice 3 — Entrada orquestada (stagger)
- El contenido que entra (lead, cards) revela con beat/stagger usando motion tokens. Reduced-motion → instantáneo.

### Slice 4 — Drawer temporal real en compact split
- `split` en compact (hoy apila) → `aside` como drawer temporal (delegar/componer con `AdaptiveSidecarLayout` `temporary`). Semántica modal + focus trap en mobile.

## Out of Scope
- Hardening/gobernanza → TASK-1119.
- Cross-route → TASK-1118.
- Adaptive Card → TASK-1115.

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Coreografía "juguete" / lenta | UI | medium | motion tokens cortos + reduced-motion + GVC mirado | GVC baseline diff |
| framer-motion + VT pelean (doble animación) | UI | medium | frontera clara: VT estructural, framer-motion interrumpible; nunca ambos sobre el mismo morph | tests + GVC |
| Drawer temporal rompe a11y en mobile | UI/a11y | medium | reusar AdaptiveSidecar `temporary` (focus trap probado) | `quality.keyboard` GVC |

Feature: enriquecimiento interno detrás del flag del piloto (default OFF) hasta GVC verde.

## Verification
- `pnpm local:check:ui` + GVC desktop+mobile mirado (morph buttery + shared-element + stagger + drawer).
- Baseline GVC (de TASK-1119) actualizado intencionalmente con `--promote`.
- `greenhouse-documentation-governor` al cierre.

## Cierre 2026-06-14 — COMPLETE

**Construido (código real, opt-in `fluidity='rich'`, default `baseline` byte-idéntico a V1):**
- Slice 1 — morph interrumpible: `morphStrategy='interruptible'` (framer-motion `layout` vía `Box component={motion.div}`). Coexiste con VT; frontera dura (nunca la misma propiedad sobre el mismo nodo). `composition-shell-motion.ts` `compositionInterruptibleLayoutTransition`.
- Slice 2 — promoción shared-element (card → lead): demo viva en el Lab (`SHARED_PROMOTE_NAME`, un nombre por snapshot → ≤1 elemento → el browser morfea la card creciendo al lead).
- Slice 3 — entrada orquestada con stagger: `compositionRegionReveal` (motion tokens: stagger 60 ms, ease emphasized, 200 ms; reduced-motion → instantáneo, never-hidden).
- Slice 4 — drawer temporal real en compact `split`: `aside` → MUI `Drawer` temporary (focus trap + aria-modal + Esc) con disclosure local (mecanismo, no dominio). Materializa el `asideAsDrawer` que el controller ya señalaba.

**Decisión re-confirmada:** consumir el módulo motion canónico + `startViewTransition` + framer-motion `layout` (no fork, no librería nueva). El piloto Knowledge (TASK-1110, lane Codex) ejercerá el enriquecimiento con datos reales; el consumer que lo demuestra hoy es el Lab (specimen canónico). `prefers-reduced-motion` horneado vía `useReducedMotion`; compositor-only (transform/opacity).

**Evidencia:** módulo motion con tests puros + GVC desktop+mobile mirado (single/leadPlusContext con condense, split lanes, drawer compact, telemetry contando compose/settle en vivo) → baseline promovido. tsc 0 · `pnpm build` (Turbopack) verde.

**Estado de rollout:** code-complete + operativamente completo (substrato UI opt-in; sin flags/env/migraciones/integración externa). Commits locales en `develop` (sin push — multi-agente). NO se tocaron README/TASK_ID_REGISTRY/Handoff/changelog (WIP entangled EPIC-019 por instrucción del operador).
