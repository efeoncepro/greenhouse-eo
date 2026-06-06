# TASK-1042 — Extender el drift-guard de tipografía a la prosa de DESIGN.md + tabla V1 §15.1

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `hardening`
- Epic: `none`
- Status real: `Complete — guard extendido a prosa + V1 §15.1, verificado contra drift inyectado`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (local-first)
- Legacy ID: `TASK-1038 follow-up`

## Summary

El drift-guard de tipografía (`typography-drift.test.ts`) hoy solo pinea el **front-matter** de DESIGN.md contra el SoT. La **prosa** de DESIGN.md §Typography y la **tabla §15.1 del V1** quedan fuera de CI → pueden quedar viejas sin que nadie lo detecte (pasó: durante TASK-1038 el front-matter + §3.2 se actualizaron, pero la prosa quedó con "15px/17px" y la tabla §15.1 del V1 quedó **entera** pre-rediseño). Esta task cierra ese agujero: extiende el guard para validar ambas capas.

## Why This Task Exists

La paridad de 3 capas (DESIGN.md ↔ V1 ↔ runtime) es el contrato del design system, pero solo una porción (front-matter) está protegida por test. Las superficies no-guardadas acumularon drift silencioso (detectado al consolidar manualmente en 2026-06-06). El fix es estructural: lo que tiene valores numéricos de tipografía debe ser machine-checkable contra el SoT.

## Goal

- Guard que valida la **tabla §15.1 del V1** (cada fila: rem ≡ `typographyScale[token]`).
- Guard que valida las **sizes de la prosa §Typography de DESIGN.md** (cada `Npx`/`Nrem` ∈ el set de valores reales del SoT).
- Rewrite mínimo de la prosa size-bearing a `Npx` explícito por número, para que sea checkable.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§15.1 + Delta) + `DESIGN.md` §Typography
- Skill `design-system-governance` (3-layer parity)
- Patrón fuente: el propio `typography-drift.test.ts` (front-matter guard) + `axis-semantic-drift.test.ts`

Reglas:

- El SoT (`typographyScale` + primitivos) es la fuente; los guards derivan de él, no hardcodean el set esperado.
- No parsear prosa free-form arbitraria (frágil): validar solo `Npx`/`Nrem` explícitos contra el set de valores válidos del SoT (font sizes ∪ letter-spacings).

## Files owned

- `src/components/theme/typography-drift.test.ts` (extender)
- `DESIGN.md` (rewrite mínimo prosa size-bearing a px explícito)

## Scope

### Slice 1 — V1 §15.1 table guard

- Leer `GREENHOUSE_DESIGN_TOKENS_V1.md`, extraer la tabla §15.1, parsear el rem de cada fila, mapear contract token → SoT, assert ≡.

### Slice 2 — DESIGN.md prose guard

- Rewrite de la prosa §Typography size-bearing a `Npx` explícito por número.
- Guard: extraer todo `Npx`/`Nrem` de la sección §Typography (excluyendo front-matter), normalizar a px, assert cada uno ∈ `VALID_TYPOGRAPHY_SIZES` (derivado del SoT: font sizes px ∪ letter-spacings px).

## Out of Scope

- Validar line-heights de prosa (unitless, bajo riesgo).
- Cambiar el front-matter guard (ya funciona).

## Rollout Plan & Risk Matrix

N/A — test + doc, additive. Rollback: revertir el commit. Sin runtime impact.

## Acceptance Criteria

- [ ] Guard V1 §15.1 (falla si una fila diverge del SoT).
- [ ] Guard prosa §Typography (falla con un `Npx` stale).
- [ ] Verificado: inyectar un valor stale temporal hace fallar el test.
- [ ] `pnpm test src/components/theme/typography-drift` verde con el estado consolidado.
- [ ] `pnpm design:lint` 0/0.

## Verification

- `pnpm test src/components/theme/typography-drift`
- `pnpm design:lint`
- `pnpm tsc --noEmit`

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + registry sincronizados
- [ ] `Handoff.md` / `changelog.md` si aplica
