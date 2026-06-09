# TASK-1051 — Migrar primitives Greenhouse restantes a elevation tokens + lint rule

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete (2026-06-07)`
- Rank: `TBD`
- Domain: `ui|platform|design-system|accessibility`
- Blocked by: `none (TASK-1049 SHIPPED — SoT theme.greenhouseElevation existe)`
- Branch: `develop (operador: mantenerse en develop, sin branch)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el follow-up de TASK-1049: migrar las **4 primitives Greenhouse restantes** que todavía usan sombra directa MUI (`elevation={n}` / `theme.shadows[n]`) al SoT semántico `theme.greenhouseElevation.<role>`, y agregar la **lint rule** `greenhouse/no-direct-mui-elevation-in-primitives` (modo `error`, scope `src/components/greenhouse/primitives/**`) que impide la regresión una vez migradas.

## Why This Task Exists

TASK-1049 estableció el SoT semántico de elevación (`theme.greenhouseElevation`) y migró el primer/obligatorio consumidor (`GreenhouseFloatingSurface`). El audit Slice 5 de TASK-1049 clasificó 4 primitives que siguen leyendo sombra directa MUI — quedaron **fuera de scope** a propósito (disciplina anti scope-creep). Esta task cierra esa deuda y añade el guardrail mecánico que TASK-1049 dejó como "posible follow-up" (no se pudo agregar antes porque la lint rule en modo `error` habría roto el build con estos 4 callsites sin migrar).

## Goal

- Migrar los 4 callsites de sombra directa en primitives Greenhouse al rol semántico correcto.
- Verificar visualmente (GVC) que cada primitive conserva su jerarquía/separación tras la migración.
- Agregar la lint rule `greenhouse/no-direct-mui-elevation-in-primitives` (modo `error`) con override block para callsites legítimos (si alguno queda justificado).
- Cero regresión visual ni de comportamiento en las 4 primitives.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md` (ADR Accepted — contrato de roles)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6 (tabla de roles semánticos)
- `DESIGN.md` §Elevation & Depth
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `src/components/theme/elevation-tokens.ts` (SoT — los 6 roles disponibles)
- CLAUDE.md → "Patron canonico Elevation / Shadow tokens (TASK-1049)"

Reglas obligatorias:

- NO introducir `boxShadow` literal ni `theme.shadows[n]` nuevo en primitives. Usar `theme.greenhouseElevation.<role>`.
- El rol se elige por **semántica del componente**, no por matchear el número viejo (no asumir `shadows[6]` → `floating` mecánicamente; razonar el rol).
- Si una primitive necesita un rol que el SoT no expone (ej. emerge una necesidad real de `overflow`), proponer extender el SoT (con DESIGN.md §Elevation + V1 §6 + drift-guard en el mismo PR) en vez de inventar sombra local.
- La lint rule pasa a `error` SOLO después de migrar los 4 callsites (sino rompe el build).

## Normative Docs

- `docs/tasks/complete/TASK-1049-greenhouse-elevation-shadow-token-system.md` (Slice 5 audit — clasificación de estos 4 callsites)
- `docs/tasks/TASK_PROCESS.md`
- `eslint-plugins/greenhouse/rules/` (patrón de lint rules custom + RuleTester) [verificar path exacto]
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1049 SHIPPED (SoT `theme.greenhouseElevation` + augmentation + drift-guard). ✓ ya en develop.

### Blocks / Impacts

- Cierra la deuda de elevación directa en primitives Greenhouse.
- Habilita el guardrail mecánico (lint rule) que evita regresión futura.
- Toca primitives compartidas (blast radius: cualquier view que las consuma) — solo cambio visual de sombra, sin cambio de API.

### Files owned

- `src/components/greenhouse/primitives/InlineNumericEditor.tsx`
- `src/components/greenhouse/primitives/ContextChip.tsx`
- `src/components/greenhouse/primitives/MetricTrendCard.tsx`
- `src/components/greenhouse/primitives/ContextualSidecar.tsx`
- `eslint-plugins/greenhouse/rules/no-direct-mui-elevation-in-primitives.mjs` (nuevo) [verificar dir]
- `eslint-plugins/greenhouse/rules/__tests__/no-direct-mui-elevation-in-primitives.test.mjs` (nuevo) [verificar dir]
- `eslint.config.mjs` (registrar rule + override block si aplica)
- tests focales de las primitives migradas (si existen) [verificar]
- `Handoff.md` + `changelog.md` al cierre

## Current Repo State

### Already exists

- SoT `src/components/theme/elevation-tokens.ts` con 6 roles + `theme.greenhouseElevation` (TASK-1049).
- `GreenhouseFloatingSurface` ya migrado (referencia del patrón: `elevation={0}` + `theme.greenhouseElevation.floating`).
- Drift-guard `src/components/theme/elevation-drift.test.ts`.
- Lint rules custom en `eslint-plugins/greenhouse/rules/` (patrón a espejar; ej. `no-direct-gsap-in-views`, `no-direct-floating-ui-in-views`).

### Gap

- `InlineNumericEditor.tsx` usa `elevation={6}` (popover de editor numérico).
- `ContextChip.tsx` usa `theme.shadows[6]` (×2 — hover/popover).
- `MetricTrendCard.tsx` usa `theme.shadows[4]` (hover lift).
- `ContextualSidecar.tsx` usa `theme.shadows[2]` (sombra mobile del sidecar).
- No existe lint rule que impida sombra directa MUI en primitives.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migrar las 4 primitives a roles semánticos

Por cada primitive, razonar el rol correcto (NO matchear el número viejo):

- `InlineNumericEditor.tsx` (`elevation={6}`) → candidato **`floating`** (es un editor anclado/transitorio, hermano semántico de FloatingSurface). `elevation={0}` + `theme.greenhouseElevation.floating`.
- `ContextChip.tsx` (`theme.shadows[6]` ×2) → evaluar **`floating`** (si es popover anclado) o **`raised`** (si es solo hover-lift del chip). Decidir por comportamiento real observado.
- `MetricTrendCard.tsx` (`theme.shadows[4]`) → candidato **`raised`** (hover lift de card interactiva).
- `ContextualSidecar.tsx` (`theme.shadows[2]`, mobile) → evaluar **`floating`**/**`overlay`** (el sidecar mobile es un Drawer temporal). Coordinar con el contrato Adaptive Sidecar (TASK-1028) — mobile = Drawer temporal.

Cada migración: preservar API pública + comportamiento; solo cambia el chrome de sombra. Actualizar tests focales si pinean la sombra.

### Slice 2 — GVC visual por primitive migrada

- Capturar cada primitive en su lab/surface con `pnpm fe:capture` (scenario existente o `--route`).
- Verificar manualmente: la separación/jerarquía se conserva (no queda "demasiado plana" ni pierde el hover-lift); light + dark; near-edge donde aplique.
- Ajustar el rol elegido si la evidencia muestra que otro rol calza mejor.

### Slice 3 — Lint rule `greenhouse/no-direct-mui-elevation-in-primitives`

- Crear la rule (espejo de `no-direct-gsap-in-views` / `no-direct-floating-ui-in-views`): detecta en `src/components/greenhouse/primitives/**` los patrones `elevation={<n>}` con n>0, `theme.shadows[` y `boxShadow:` con literal/`theme.shadows`.
- Override block en `eslint.config.mjs` para callsites legítimos que queden justificados (con comentario de razón).
- Tests RuleTester (valid + invalid) ANTES de pasar a `error`.
- Pasar a modo `error` SOLO cuando los 4 callsites estén migrados (Slice 1 verde).

### Slice 4 — Docs

- `Handoff.md` + `changelog.md`: cierre.
- CLAUDE.md: actualizar el bullet de elevación si la lint rule cambia de "evaluar" a "activa".
- `docs/tasks/complete/TASK-1049-...`: marcar el follow-up como cerrado (Delta).

## Out of Scope

- Tocar `src/@core/**` (Vuexy read-only — ej. `customizer/index.tsx` con `elevation={6}` queda como legacy permitido).
- Migrar usos de `theme.shadows[n]` fuera de `src/components/greenhouse/primitives/**` (views de producto, cards Vuexy) — eso es barrido aparte si emerge.
- Extender el SoT con roles nuevos salvo que una primitive lo requiera con evidencia.
- Cambiar valores del SoT `elevation-tokens.ts` (eso es recalibración, no migración).

## Detailed Spec

### Patrón de migración (referencia: GreenhouseFloatingSurface TASK-1049)

```tsx
// ANTES
<Paper elevation={6} sx={{ /* ... */ }} />
// o
sx={theme => ({ boxShadow: theme.shadows[6] })}

// DESPUÉS
<Paper elevation={0} sx={theme => ({
  boxShadow: theme.greenhouseElevation.floating.boxShadow,
  border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`
})} />
```

El borde es parte del token en floating/overlay/modal (separación forced-colors). Para `raised` el border es opcional (lift local).

### Decisión de rol por primitive

Documentar en el PR la decisión `componente → rol + razón` (igual que TASK-1049 reportó la decisión antes de codear).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (migrar) → Slice 2 (GVC) → Slice 3 (lint rule a `error`, solo tras Slice 1 verde) → Slice 4 (docs). La lint rule NO pasa a `error` antes de migrar los 4 callsites (rompería el build).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un rol queda demasiado plano y la primitive pierde separación | UI / a11y | medium | GVC light+dark por primitive; elegir rol por semántica + evidencia | revisión visual GVC |
| El rol elegido cambia el look de una primitive muy desplegada | UI | medium | GVC + revert PR; cambio acotado a sombra | revisión visual |
| Lint rule a `error` rompe build por callsite no migrado | CI | low | pasar a `error` solo tras Slice 1 verde + tests RuleTester | `pnpm lint` |
| Falso positivo de la lint rule en callsite legítimo | DX | low | override block en eslint.config.mjs con razón | code review |

### Feature flags / cutover

- Sin feature flag — cambio visual acotado a primitives compartidas, reversible por PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir diff de la primitive al `theme.shadows[n]` previo | <5 min | sí |
| Slice 2 | N/A (solo evidencia) | N/A | sí |
| Slice 3 | bajar la rule a `warn` o revertir el registro | <5 min | sí |
| Slice 4 | revertir docs | <5 min | sí |

### Production verification sequence

1. Local: tests focales de las primitives migradas + `pnpm test` de theme (drift-guard sigue verde).
2. Local: `pnpm lint` (con la rule en `error`) + `pnpm tsc --noEmit`.
3. Local: `pnpm test:lint-rules` (RuleTester de la rule nueva) [verificar script].
4. Local GVC por primitive; leer frames; ajustar.
5. `pnpm build`.

### Out-of-band coordination required

- Aprobación visual del operador del before/after de cada primitive.
- Sin GCP/Azure/Vercel/secrets.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 4 primitives (`InlineNumericEditor`, `ContextChip`, `MetricTrendCard`, `ContextualSidecar`) ya no usan `elevation={n}>0` ni `theme.shadows[n]`; consumen `theme.greenhouseElevation.<role>`.
- [ ] El rol elegido por primitive está documentado con razón en el PR.
- [ ] GVC light+dark revisado por primitive; separación/hover-lift conservados.
- [ ] Lint rule `greenhouse/no-direct-mui-elevation-in-primitives` existe, en modo `error`, scope `src/components/greenhouse/primitives/**`, con tests RuleTester (valid+invalid).
- [ ] `pnpm lint` verde con la rule activa (cero callsites prohibidos restantes en primitives, salvo override justificado).
- [ ] Drift-guard de elevación sigue verde (sin cambios al SoT).
- [ ] Docs sincronizadas (Handoff, changelog, CLAUDE.md bullet, Delta en TASK-1049).

## Verification

- `pnpm ops:lint --changed`
- `pnpm task:lint --task TASK-1051`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/components/theme` (drift-guard)
- tests focales de las primitives migradas
- `pnpm test:lint-rules` (RuleTester) [verificar script]
- `pnpm fe:capture` por primitive migrada
- `pnpm build`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real.
- [ ] Archivo movido a `complete/` si corresponde.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] Delta en `docs/tasks/complete/TASK-1049-...` marcando el follow-up cerrado.
- [ ] CLAUDE.md bullet de elevación actualizado (lint rule activa).

## Follow-ups

- **✅ Tier 1 CERRADO por TASK-1052 (2026-06-07)**: los chart-card primitives (`customShadows-sm/md`) migrados a `floating`/`raised` + lint rule extendida a `customShadows` en primitives. La capa primitive queda 100% en roles.
- Barrido opcional de `theme.shadows[n]`/`customShadows` en **views de producto / cards Vuexy** (fuera de primitives) — **Tier 2, oportunista** (al tocar) o warn-rule scopeada a views; **Tier 3** (mockups + Vuexy `card-statistics`) no tocar hasta promoción a runtime.
- Captura GVC dark mode explícita del lab de elevación (heredado de TASK-1049, pendiente menor).

## Open Questions

- ¿`ContextChip` usa sombra como popover anclado (`floating`) o como hover-lift del chip (`raised`)? Resolver en Discovery observando el comportamiento real.
- ¿`ContextualSidecar` mobile debe ser `floating` u `overlay`? Coordinar con el contrato Adaptive Sidecar (mobile = Drawer temporal); resolver en Discovery.
- ¿El path de las lint rules custom es `eslint-plugins/greenhouse/rules/`? `[verificar]` durante Discovery.
