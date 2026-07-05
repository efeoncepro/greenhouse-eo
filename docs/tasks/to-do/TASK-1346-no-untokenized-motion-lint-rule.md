# TASK-1346 — Lint rule `greenhouse/no-untokenized-motion` + sweep de motion inline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1346-no-untokenized-motion-lint-rule`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la lint rule `greenhouse/no-untokenized-motion` que detecta valores de motion inline (duraciones literales `ms`/`s`, `cubic-bezier(...)` no derivado de `MOTION_EASE`, `ease-in-out` como default, `transition: all`) en vistas/componentes, y barrer las ~253 violaciones preexistentes hacia los tokens canónicos (`motionCss` / `MOTION_EASE` / CSS vars). Cierra el último gap de enforcement del sistema de motion: hoy sólo `no-direct-gsap-in-views` está mecanizado; los magic numbers de motion en `sx`/CSS sólo los atrapa GVC/review humano.

## Why This Task Exists

El repo tiene un sistema de motion gobernado con SoT de tokens (`src/components/greenhouse/motion/core/tokens.ts`) y parity de 3 capas + drift-guard. La overlay skill `motion-design` (v2.0) declara `NUNCA` tipear una duración cruda o un `cubic-bezier` inline — pero ese `NUNCA` no tiene enforcement mecánico. Discovery 2026-07-05 encontró **~253 violaciones inline preexistentes**: 106 `transition` con `ms/s` literal en `sx`/tsx, 96 `cubic-bezier(...)` fuera de `motion/**`, 48 `ease-in-out`, 3 `transition: all`. Sin regla, cada nueva vista puede reintroducir drift contra el scale y la skill queda como advisory sin diente. Es exactamente el patrón que `no-untokenized-copy` (TASK-265), `no-untokenized-fx-math` y `no-untokenized-expense-type-for-analytics` ya resolvieron para otros dominios: **rule en `warn` → sweep → promoción a `error`**.

## Goal

- `greenhouse/no-untokenized-motion` implementada + tests, registrada en el plugin y en `eslint.config.mjs` en modo `warn` (no rompe build).
- Reporte de inventario de las ~253 violaciones agrupadas por dominio para dirigir el sweep.
- Sweep completo: cada callsite migrado a `motionCss.duration.*` / `motionCss.ease.*` / `MOTION_EASE` / CSS custom properties, con la duración/curva del token más cercano confirmada (no ciega).
- Regla promovida a `error` una vez que el conteo llega a 0, y overlay skill (`§11 enforcement inventory` + `ANTIPATTERNS`) actualizada para citarla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§Motion — contrato de tokens)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón "flag default-OFF + shadow + flip" aplicado como `warn → error`)
- `DESIGN.md` §Motion (línea ~543)

Reglas obligatorias:

- La regla NO puede aplicar a `src/components/greenhouse/motion/**` (SoT + tier GSAP autorizado), ni a los archivos de theme/token que definen los valores, ni a `keyframes` definitions donde los valores son la fuente.
- Espejar las exclusiones del molde `no-untokenized-copy`: `theme/**`, `globals.css`, `emails/**`, `**/pdf/**`, `*.test.*`, `public/**`.
- El fix del sweep elige el **token más cercano** en el scale (75/150/200/300/400/600); cuando un valor cae entre dos tokens (p.ej. `250ms`), es una decisión de diseño, no un codemod ciego — spot-check GVC en superficies visibles.
- NO promover a `error` hasta conteo 0 (rompería el build; ver Risk matrix).

## Normative Docs

- `.claude/skills/motion-design/SKILL.md` (overlay v2.0 — §1 tokens, §11 enforcement, §12 NUNCA)
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` (molde de rule lint+sweep, TASK-265)
- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` (molde de rule con override block documentado)
- `scripts/skills/motion-overlay-guard.mjs` (contrato anti-rot que ya verifica `no-direct-gsap-in-views`)

## Dependencies & Impact

### Depends on

- Sistema de motion canónico ya existente: `src/components/greenhouse/motion/core/tokens.ts` (`MOTION_DURATION_MS`, `MOTION_EASE`, `motionCss`) — sin él no hay destino de sweep. Ya materializado.

### Blocks / Impacts

- Ninguna task bloqueada. Impacta transversalmente a cualquier vista con motion inline (sweep toca muchos archivos UI de forma mecánica/behavior-preserving).
- Complementa `no-direct-gsap-in-views` (ya activa) y la overlay skill `motion-design`.

### Files owned

- `eslint-plugins/greenhouse/rules/no-untokenized-motion.mjs` (crear)
- `eslint-plugins/greenhouse/rules/__tests__/no-untokenized-motion.test.mjs` (crear)
- `eslint-plugins/greenhouse/index.mjs` (registrar la rule)
- `eslint.config.mjs` (activar en `warn`, luego `error`; override blocks documentados)
- `.claude/skills/motion-design/SKILL.md` + `.codex/skills/motion-design/SKILL.md` (citar la rule en §11 al promover)
- `scripts/skills/motion-overlay-guard.mjs` (agregar la nueva rule al check de lint-rule registration)
- superficies UI barridas (muchas — enumerar en el reporte de inventario del Slice 1)

## Current Repo State

### Already exists

- Token SoT + `motionCss`/`MOTION_EASE` + drift-guard (`core/tokens.test.ts`).
- Lint plugin `eslint-plugins/greenhouse/` con 3 reglas `no-untokenized-*` como molde probado.
- `no-direct-gsap-in-views` (mecaniza el tier GSAP).
- Overlay skill v2.0 que ya declara el `NUNCA` (falta el diente mecánico).

### Gap

- No hay regla que atrape `transition: '250ms ...'`, `cubic-bezier(...)` inline, `ease-in-out` default ni `transition: all` en `sx`/CSS-in-JS/tsx.
- ~253 violaciones preexistentes sin barrer (106 duración literal + 96 cubic-bezier + 48 ease-in-out + 3 transition:all — conteo Discovery 2026-07-05, `[verificar]` al re-correr el grep al tomar la task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rule + tests + registro en modo `warn` + inventario

- Implementar `no-untokenized-motion.mjs` espejando el AST/regex approach de `no-untokenized-copy`/`no-untokenized-fx-math`. Detectores: (a) duración literal `\d+(ms|s)` dentro de un valor `transition`/`transitionDuration`/`animation`/`animationDuration`; (b) `cubic-bezier(...)` literal fuera de `motion/**`; (c) `ease-in-out` como token de easing; (d) `transition: all` / `transition: 'all ...'`.
- Exclusiones (ver Architecture Alignment). Mensaje del error apunta al token canónico esperado.
- Tests unitarios (`__tests__/`): casos válidos (token import) + inválidos (los 4 detectores) + exclusiones (motion/**, theme, keyframes).
- Registrar en `eslint-plugins/greenhouse/index.mjs` + activar en `eslint.config.mjs` como **`warn`**.
- Generar y commitear un reporte de inventario (`docs/tasks/artifacts/TASK-1346-motion-inventory.md` o similar) agrupando las violaciones por dominio/carpeta para dirigir el Slice 2.
- Agregar la rule al `motion-overlay-guard.mjs` (check de registration).

### Slice 2 — Sweep por dominio (batches committeables)

- Migrar cada callsite a `motionCss.duration.*` / `motionCss.ease.*` / `MOTION_EASE` / CSS vars, eligiendo el token más cercano. Un commit por lote de dominio (finance, payroll, growth, admin, primitives, etc.).
- Para valores entre tokens (`250/350/500`): decidir token vecino + spot-check GVC (`pnpm fe:capture:micro`) en superficies visibles del lote; documentar cualquier cambio de timing perceptible.
- `ease-in-out` → `emphasized` (entrada) / `emphasizedAccelerate` (salida) según el rol del callsite.

### Slice 3 — Promoción a `error` + skill/doc sync

- Cuando el conteo `warn` llegue a 0, flip a `error` en `eslint.config.mjs` (con override blocks documentados para excepciones legítimas, patrón `no-untokenized-fx-math`).
- Actualizar overlay skill `§11` + `ANTIPATTERNS` (global `~/.claude/skills/motion-design/ANTIPATTERNS.md`) para citar la rule; correr `pnpm skills:motion-guard` verde.
- Registrar en `changelog.md` + `Handoff.md`.

## Out of Scope

- NO tocar `src/components/greenhouse/motion/**` (SoT + tier GSAP) ni redefinir el scale de tokens.
- NO migrar animaciones a `<Motion>`/GSAP (eso es refactor de tier, no tokenización) — el sweep sólo reemplaza el **valor** por el token, preservando el mecanismo.
- NO tocar `keyframes` definitions, emails, PDF renderers, `globals.css` token declarations.
- NO cambiar el comportamiento/curva percibido salvo el redondeo inevitable al token vecino (documentado).

## Detailed Spec

Molde canónico: `no-untokenized-copy.mjs` (estructura de rule + meta + exclusiones por path) y `no-untokenized-fx-math.mjs` (override block documentado para promoción a `error`). El destino de tokens es el barrel `@/components/greenhouse/motion` (`motionCss.duration`, `motionCss.ease`, `MOTION_EASE`) o las CSS custom properties emitidas en `globals.css`. La regla es advisory (no runtime), así que su "rollout" es la severidad `warn → error`, gobernada por el conteo de violaciones.

## Rollout Plan & Risk Matrix

Cambio de tooling/CI aditivo — sin runtime de producción, sin flags de env, sin migraciones. El "cutover" es la severidad de la lint rule.

### Slice ordering hard rule

- Slice 1 (rule en `warn` + inventario) → Slice 2 (sweep) → Slice 3 (flip a `error`).
- Slice 3 **NUNCA** antes de que Slice 2 lleve el conteo a 0 — promover a `error` con violaciones abiertas rompe el build de todos los agentes (mismo hazard que meterla en `error` de entrada).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regla en `error` de entrada rompe el build (253 violaciones) | UI / CI | high (si se salta el orden) | Ship en `warn`; flip a `error` sólo con conteo 0 (Slice 3) | `pnpm lint` rojo masivo |
| Falsos positivos del detector (regex sobre `sx`/strings) | UI / CI | medium | Tests unitarios de los 4 detectores + exclusiones; `warn` da margen de calibración antes de `error` | warnings en archivos no-motion |
| Sweep desplaza timing percibido al redondear al token vecino | UI | medium | Spot-check GVC por lote en superficies visibles; documentar cambios perceptibles | revisión GVC desktop+mobile |
| Sweep toca archivo `owned` por otra task activa | UI | low | Batches por dominio + `git status` antes de cada commit (no `git add -A`) | colisión de merge |

### Feature flags / cutover

- Sin flag de env — el graduated rollout es la severidad de la rule (`off` → `warn` → `error`). Revert instantáneo: bajar la severidad en `eslint.config.mjs` + commit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR de la rule (o severidad a `off`) | <5 min | sí |
| Slice 2 | revert del commit de lote (behavior-preserving) | <5 min/lote | sí |
| Slice 3 | severidad `error` → `warn` en `eslint.config.mjs` | <5 min | sí |

### Production verification sequence

Sin producción runtime. Verificación local:
1. Slice 1: `pnpm lint` corre y emite warnings esperados; `pnpm test` de la rule verde; `pnpm skills:motion-guard` verde.
2. Slice 2: por lote, `pnpm local:check` verde + spot-check GVC en superficies visibles del lote.
3. Slice 3: `pnpm lint` verde con la rule en `error` (conteo 0) + `pnpm test` full + `pnpm build`.

### Out-of-band coordination required

N/A — repo-only change. Coordinar sólo con agentes concurrentes (Codex) por colisión de archivos durante el sweep: stagear paths explícitos, nunca `git add -A`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse/no-untokenized-motion` existe con tests que cubren los 4 detectores + exclusiones (motion/**, theme, keyframes, emails, pdf, test).
- [ ] La rule está registrada en `eslint-plugins/greenhouse/index.mjs` y activa en `eslint.config.mjs`.
- [ ] Existe un reporte de inventario que agrupa las violaciones por dominio (Slice 1).
- [ ] El conteo de violaciones llega a 0 tras el sweep; cada valor migrado usa un token del scale (75/150/200/300/400/600) o una curva de `MOTION_EASE`.
- [ ] La rule quedó en `error` sólo después de conteo 0; excepciones legítimas tienen override block documentado con razón.
- [ ] `pnpm skills:motion-guard` verde con la nueva rule incluida en su check de registration.
- [ ] Overlay skill `§11` + `ANTIPATTERNS` citan la rule.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` (full) y `pnpm build` verdes en el commit de cierre.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (incluye el test de la rule + suite full)
- `pnpm build`
- `pnpm skills:motion-guard`
- Spot-check GVC (`pnpm fe:capture:micro`) por lote del sweep en superficies visibles

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (nueva rule + enforcement de motion tokens)
- [ ] chequeo de impacto cruzado sobre tasks `to-do/` que tocan las mismas superficies UI
- [ ] `motion-overlay-guard.mjs` actualizado para verificar la nueva rule
- [ ] overlay skill (Claude + Codex) + `ANTIPATTERNS` global citan la rule

## Follow-ups

- Evaluar un autofix (`--fix`) para el subconjunto de valores que caen exactamente en un token (reduce el costo de sweeps futuros).
- Evaluar extender la rule para detectar `animationDuration` en config de ECharts fuera del cap de 400ms (§9 overlay).

## Open Questions

- ¿El sweep de valores entre tokens (`250/350/500`) redondea siempre al más cercano, o hay superficies donde el diseño pide explícitamente el valor off-scale y debe ir a override block con razón? (Resolver por lote con spot-check GVC — decisión de diseño, no mecánica.)
