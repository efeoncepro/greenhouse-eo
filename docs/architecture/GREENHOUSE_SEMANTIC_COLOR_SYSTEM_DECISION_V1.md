# GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1

> **Status:** Accepted (2026-06-08)
> **Date:** 2026-06-08
> **Owner:** UI Platform / Design System
> **Scope:** Brand color spine, feedback semantics, neutrals, chart categorical palette, dark mode derivation, design-token governance
> **Reversibility:** two-way for runtime adoption (theme value change); one-way for governance once accepted unless superseded by a new ADR
> **Confidence:** high (visually validated by operator across light + dark + charts)
> **Validated as of:** 2026-06-08 against repo runtime + mockup `/admin/design-system/mockup/brand-color-comparison`
> **Living proposal / reasoning:** `docs/operations/proposals/TASK-1053-color-palette-iteration.md`
> **Canonical values:** `docs/tasks/in-progress/TASK-1053-feedback-semantic-color-system-direction-d.md` §"Paleta APROBADA"
> **Implementation task:** `docs/tasks/in-progress/TASK-1053-feedback-semantic-color-system-direction-d.md`
> **Accepted by:** operador (Julio), sesión 2026-06-08 ("me quedé con tu propuesta completa, me encantó").

## Context

El sistema de feedback runtime (AXIS semantic) era vívido pero **no resolvía texto-sobre-blanco AA** (gap documentado en `axis-semantic.ts`: el ramp de error/success "needs a dark step"; parche `#2E7D32` hardcodeado en ~8 sitios, TASK-1048). Una primera propuesta ("dirección D") intentó arreglarlo re-rampando toda la paleta cromática, pero **oscureció el primary** a `#024C8F` y abrió el spine de marca a 5 hues (navy + action + olivo + lima + orange). Evaluado con `modern-ui` + `dataviz-design`:

- El **sistema** (semánticas decopladas fill/ink, 6 sub-valores, tonal-by-default, dot, KPI inline, dual-mode) ya era moderno y correcto.
- La **elección de hues de marca** leía corporativo-pesado, no "agencia de marketing + tecnología moderna": el doble-navy (`#023C70` + `#024C8F` casi idénticos), el olivo muddy, y los charts cayendo sobre el primary oscuro (síntoma reportado por el operador en runtime).

La regla canónica de UI moderna seria (Linear/Stripe/Vercel) es **restraint: un acento confiado sobre un neutral; un segundo acento solo con significado semántico**.

## Decision

El overhaul de color de Greenhouse (TASK-1053) adopta la dirección **Restraint v1**: se conservan los wins (semánticas AA) y se **descarta el oscurecido del primary**. Un solo acento confiado hace el trabajo diario; todo lo demás se subordina.

1. **Accent / primary = `#0375DB`** (vibrante, AA blanco 4.6:1). Es el color de acción (CTA · links · foco · activo · chart single-series). **NO se oscurece** (se descarta `#024C8F`) y **NO se desacopla** en un token `action` separado — el primary, bien elegido, ES el acento.
2. **Navy = `#023C70` = accent-800**: el step oscuro del MISMO azul, solo para shell/header institucional. No es un hue aparte → elimina el crowding de azules.
3. **Un solo verde de marca**: pop `#6EC207` + ink crisp `#4B8405`. El **olivo `#3E7A12` se elimina** (2 verdes, no 3: brand-lime + success-emerald).
4. **Orange `#FF6500` = sub-brand (Reach)**, fuera del UI diario (no warning, no CTA).
5. **Semánticas de feedback intactas** (info `#1F6FD4` · success `#157F47` · warning `#FFB703` · error `#DC2E39`) con sus 6 sub-valores (`fill`/`onFill`/`ink`/`tint`/`border`/`dark-fg`), AA en light + dark. Warning = señal de tránsito (texto oscuro).
6. **Neutrales = Greenhouse gray invariante** (`#97939e` family). El slate del mockup NO se adopta.
7. **Charts: paleta categórica vibrante anclada a marca** — light `#0375DB #6EC207 #FF6500 #7C3AED #06B6D4 #EC4899`, dark levantada `#3B8EE8 #7FD42A #FF8A3D #9B6BF0 #22C9E4 #F25BAC`, cashflow pos/neg `#3DBA5D`/`#FF4D49`. Single-series → el acento. **Nunca el navy.** Verificar Coblis + regla color-nunca-solo.
8. **Dark mode = derivación propia** (no invertir el claro): acento → `#6FACF0`, semánticas → su dark-fg, charts → paleta dark levantada, jerarquía bodyBg `#25293C` + paper `#2F3349`.

Valores completos: TASK-1053 §"Paleta APROBADA". Gobernanza: flujo canónico `axis-tokens` (ramps) → `axis-semantic` (roles) → `mergedTheme` (runtime) → `DESIGN.md §Color` → `GREENHOUSE_DESIGN_TOKENS_V1.md §Color`, con **`semantic-color-drift.test.ts` nuevo** + **contrast gate en CI** (light + darkSemi), en paridad de 3 capas. El color pasa a ser capa con guard mecánico (como typography/elevation).

### Decisiones acopladas (resueltas)

- **Reconciliación AXIS (F):** (A) actualizar el AXIS Figma maestro upstream; el operador lo sincroniza **después** (code-first temporal, divergencia gobernada + documentada en el header del SoT). Destino durable: runtime ≡ Figma.
- **3 verdes (G):** refinado a **2** (olivo eliminado).
- **Diferidos a TASK-1048 / task separada:** retiro del `#2E7D32` success-ink + promoción de `greenhouse/no-hardcoded-hex-color` a `error` baseline 0 + adopción de la paleta en **emails** (paleta propia aislada del SoT). Esta task NO los cierra.
- **Foldeado acá:** los one-offs categóricos de TASK-1048 (chart pos/neg + tag-blue surface) entran como paleta de charts.

## Consequences

**Positivas:** look moderno-agencia (un acento confiado + restraint), cierre del gap AA de las semánticas, charts vivos con paleta propia, blast radius del primary eliminado (no cambia de valor), guard mecánico que blinda regresiones futuras.

**Costos / riesgos:** divergencia temporal código↔Figma hasta reconciliar upstream (mitigada por header-note en el SoT + decisión F). El stash parkeado de "dirección D" debe **dropear** sus cambios de oscurecido del primary (reorder de `primaryColorConfig`, `axisRamp.primary`→`#024c8f`, `axisOpacity.primary`) y conservar solo semánticos + secondary. Checks abiertos no bloqueantes: crowding acento `#0375DB` (sólido) vs info `#1F6FD4` (tonal) — el tratamiento difiere; Coblis del chart palette.

## Rollout

Por fases (TASK-1053 §Rollout): Slice 0 (este ADR + DECISIONS_INDEX + reconciliación del stash) → Fase A1a (semánticos + DESIGN.md/V1 + drift-guard + contrast gate, en un PR auto-verificable) → Fase A1b (brand spine + paleta de charts) → Fase B (sub-valores + patrones tonal/dot/KPI/form). Cutover por merge de PR con drift-guard + contrast gate verdes; sin flag runtime.

## Alternatives considered

- **Dirección D (primary oscuro `#024C8F`):** rechazada — leía corporativo-pesado, charts apagados.
- **Desacoplar el CTA del primary con un token `action`:** evaluada y descartada — trataba el síntoma; con el primary vibrante no hace falta.
- **Adoptar el slate del mockup como neutral:** rechazada — neutrales invariantes (decisión operador).
- **Override Greenhouse permanente de semánticos (B) en vez de reconciliar Figma:** rechazada — genera drift permanente; se prefiere (A) upstream.
