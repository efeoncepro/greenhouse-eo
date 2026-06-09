# TASK-1058 — Elevation/shadow reconciliation: base MUI controls → elevation SoT

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system|accessibility`
- Blocked by: `none`
- Branch: `task/TASK-1058-elevation-shadow-theme-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el último tramo del strangler de elevation (TASK-1049): los **controles MUI base** (empezando por `MuiButton` contained) todavía toman su sombra del sistema **legacy Vuexy `customShadows`** (`var(--mui-customShadows-{tone}-sm)` — un glow teñido de color), no del SoT canónico `theme.greenhouseElevation.*`. Se re-apunta la sombra de esos controles vía override en `mergedTheme.components` (deepmerge gana sobre `@core`, que es read-only), derivando del rol de elevation, + drift-guard que lo pinea, + auditoría documentada de los consumers `theme.shadows[n]`/`customShadows` fuera de primitives.

## Why This Task Exists

La reconciliación theme↔tokens canónicos es un **strangler por concern** (SoT → `mergedTheme` deriva → drift-guard pinea; `@core` nunca se toca). Color y typography están reconciliados; **elevation está medio reconciliado**: TASK-1049 creó el SoT `theme.greenhouseElevation` y TASK-1051/1052 migraron las **primitives** + agregaron la lint rule `greenhouse/no-direct-mui-elevation-in-primitives` (scope `src/components/greenhouse/primitives/**`). Pero los **overrides de componente en `@core/theme/overrides/*`** (button, button-group, menu, popover, dialog, drawer, card, autocomplete, …) siguen emitiendo sombras del sistema legacy `customShadows` para todos los controles MUI base.

Caso fuente concreto (sesión 2026-06-08, `HomeDayActions`): el botón "Cierre Finanzas" usa la primitive canónica `GreenhouseButton`, pero su sombra sigue siendo `var(--mui-customShadows-error-sm)` ([`src/@core/theme/overrides/button.ts:271`](../../../src/@core/theme/overrides/button.ts)) — un glow rojo. Ese glow de color es justo el look *dated* del que se alejó el overhaul de elevation (receta 2026: dos capas suaves neutras + hairline; techo `0 8px 24px rgba(0,0,0,0.1)`; sin tintes). El gap NO se arregla cambiando el componente (toda la app hereda la misma sombra del theme) ni editando `@core` (read-only): se arregla re-apuntando en `mergedTheme`.

## Goal

- Los controles MUI base con sombra "dated" (prioridad: `MuiButton` contained en sus 6 tonos + `MuiButtonGroup`) leen su sombra del SoT `theme.greenhouseElevation.<role>` (o neutra) vía `mergedTheme.components`, sin tocar `@core`.
- Un drift-guard pinea que esas sombras derivan del SoT (rompe CI ante un Vuexy upgrade o un hardcode divergente).
- Inventario documentado + decisión explícita (compat vs migrar) de los ~25 consumers `theme.shadows[n]`/`customShadows` en `src/views`/`src/components` fuera de primitives.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md` — ADR del elevation SoT (TASK-1049, Accepted).
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6 (Elevation) + `DESIGN.md` §Elevation — contrato 3-capas.
- `docs/architecture/ui-platform/PRIMITIVES.md` — roles de elevation por superficie.
- CLAUDE.md §"Patron canonico Elevation / Shadow tokens (TASK-1049)".

Reglas obligatorias:

- **NUNCA** editar `src/@core/theme/**` (Vuexy core, read-only). La reconciliación vive en `mergedTheme.components` (deepmerge gana).
- Mover **juntas** las 3 capas: SoT (`elevation-tokens.ts`) + runtime (`mergedTheme`) + contrato (`DESIGN.md` §Elevation / V1 §6) + drift-guard. Igual que typography/color.
- El rol se elige por **semántica**, no por matchear el número de sombra legacy. Un botón contained es lift local de acción → rol `raised` (o neutra `none` si la dirección Restraint prefiere botones planos). Definir en Plan Mode con `design-system-governance` + `modern-ui`.
- `theme.shadows[n]` / `customShadows` quedan **compat legacy** para Vuexy + código viejo; esta task NO los elimina globalmente, los re-apunta selectivamente en los controles base + audita el resto.
- Cualquier sombra `floating`/`overlay`/`modal` lleva `borderColor` obligatorio (forced-colors + dark) — ya horneado en el SoT.

## Normative Docs

- `src/components/theme/elevation-tokens.ts` — SoT, factory `elevationTokens(mode)`, roles `none|raised|floating|overlay|modal|overflow`.
- `src/components/theme/elevation-drift.test.ts` — drift-guard vigente (runtime ≡ SoT ≡ DESIGN.md ≡ V1 §6).

## Dependencies & Impact

### Depends on

- TASK-1049 (elevation SoT + `theme.greenhouseElevation`) — ✅ complete.
- TASK-1051 / TASK-1052 (primitives migradas + lint rule) — ✅ complete. Esta task es el siguiente anillo (controles base vía theme), NO primitives.

### Blocks / Impacts

- Cambio **app-wide visual**: toda sombra de botón contained del portal cambia. Requiere GVC en superficies clave + revisión visual.
- Cierra el gap destapado en `HomeDayActions` (sesión 2026-06-08) y consistente con la dirección Restraint (TASK-1053).
- Toca el contrato `DESIGN.md` §Elevation / V1 §6 → gate `pnpm design:lint`.

### Files owned

- `src/components/theme/mergedTheme.ts` (extender `components.MuiButton` + agregar overrides de sombra; posible `MuiButtonGroup`)
- `src/components/theme/elevation-drift.test.ts` (o test nuevo) — pin de las sombras reconciliadas
- `DESIGN.md` §Elevation + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6 (si cambia el mapeo de roles a controles)
- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md` (Delta: reconciliación de controles base)
- `docs/audits/design-system/ELEVATION_SHADOW_LEGACY_CONSUMERS_2026-06-XX.md` (nuevo — inventario del audit)

## Current Repo State

### Already exists

- SoT `theme.greenhouseElevation.<role>` mode-aware + drift-guard ([`elevation-tokens.ts`](../../../src/components/theme/elevation-tokens.ts), [`elevation-drift.test.ts`](../../../src/components/theme/elevation-drift.test.ts)).
- `mergedTheme.components.MuiButton` ya existe como hook de override ([`mergedTheme.ts:187`](../../../src/components/theme/mergedTheme.ts)) — hoy solo setea `sizeLarge.fontSize`. Precedente de re-pointing canónico: `MuiTab`, `MuiDialogTitle` derivan del SoT de typography en el mismo bloque.
- Lint rule `greenhouse/no-direct-mui-elevation-in-primitives` (scope primitives, TASK-1051/1052).

### Gap

- `MuiButton` contained (6 tonos) + `MuiButtonGroup` toman sombra de `var(--mui-customShadows-{tone}-sm)` desde `@core/theme/overrides/{button,button-group}.ts` (glow teñido, legacy). No derivan del SoT.
- ~19 archivos `@core/theme/overrides/*` setean `customShadows`/`boxShadow` para controles base (menu, popover, dialog, drawer, card, autocomplete, input, …) — sin reconciliar. Esta task prioriza los de sombra "dated" visible; el resto se clasifica en el audit.
- ~25 archivos en `src/views`/`src/components` (no-primitives) usan `theme.shadows[n]`/`customShadows`/`var(--mui-customShadows-*)` — hoy compat, sin inventario ni decisión documentada.
- No hay drift-guard que pinee las sombras de controles base contra el SoT (un Vuexy upgrade las cambia silenciosamente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Re-point `MuiButton` (+ `MuiButtonGroup`) shadow al SoT en `mergedTheme`

- Decidir con `design-system-governance` + `modern-ui` el rol de elevation para botones contained (probable `raised`, o `none` si Restraint prefiere planos). Documentar la decisión.
- Override en `mergedTheme.components.MuiButton.styleOverrides` (variant contained, los 6 tonos) que setea `boxShadow` desde `theme.greenhouseElevation.<role>.boxShadow` (o `'none'`), reemplazando por deepmerge el `customShadows-{tone}-sm` de `@core`. Idem `:active`/`:hover`/`:focusVisible` si aplica.
- Idem `MuiButtonGroup` si comparte el glow.
- GVC: capturar superficies con botones contained de los 6 tonos (home `data-capture='home-day-actions'`, finance, admin) light + dark; leer frames.

### Slice 2 — Drift-guard de sombras de controles base

- Extender `elevation-drift.test.ts` (o test nuevo `elevation-controls-drift.test.ts`) para assert que el `boxShadow` resuelto de `MuiButton` contained ≡ `elevationTokens(mode)[<role>].boxShadow` en ambos modos. Rompe CI ante drift / Vuexy upgrade.
- Actualizar `DESIGN.md` §Elevation + V1 §6 si el mapeo rol→control entra al contrato; `pnpm design:lint` 0/0.

### Slice 3 — Audit + decisión de consumers legacy fuera de primitives

- Inventariar los ~25 archivos `src/views`/`src/components` (no-primitives) con `theme.shadows[n]`/`customShadows`/`var(--mui-customShadows-*)` en `docs/audits/design-system/ELEVATION_SHADOW_LEGACY_CONSUMERS_2026-06-XX.md`.
- Clasificar cada uno: **(a)** compat legítimo (Vuexy/`card-statistics`/sombra direccional bespoke → dejar), **(b)** debería migrar a un rol del SoT (migrar las wins claras en este slice), **(c)** decisión de política diferida.
- Decidir + documentar si la lint rule se extiende a `views` en modo `warn` para **código nuevo** (governance — hoy CLAUDE.md dice "views/Vuexy/card-statistics quedan compat, no se flaggean"). Si se cambia la política, actualizar CLAUDE.md + el override block del rule. NO auto-migrar masivamente los 25 (blast radius alto, fuera de scope).

## Out of Scope

- Editar `src/@core/theme/**` (read-only — la reconciliación es solo vía `mergedTheme`).
- Migración masiva de los ~25 consumers de `customShadows` en views (solo wins claras + inventario; el resto es follow-up).
- Tocar las primitives (`src/components/greenhouse/primitives/**`) — ya migradas (TASK-1051/1052).
- Cambiar el sistema de color/typography (otros concerns del strangler, ya reconciliados).
- Crear roles de elevation nuevos (el set `none|raised|floating|overlay|modal|overflow` es fijo; `overflow` sigue reservado).

## Detailed Spec

Mecanismo canónico (el mismo que typography usa hoy en `mergedTheme`):

```ts
// mergedTheme.ts — components (deepmerge gana sobre @core, que es read-only)
MuiButton: {
  styleOverrides: {
    sizeLarge: { fontSize: controlText.lg }, // existente
    // NUEVO — re-point del glow legacy customShadows-{tone}-sm al SoT:
    contained: ({ theme }) => ({
      boxShadow: theme.greenhouseElevation.raised.boxShadow, // o 'none' (decidir en S1)
      '&:hover': { boxShadow: theme.greenhouseElevation.raised.boxShadow }
      // tonos: el override root contained aplica a los 6 tonos;
      // verificar que pisa los `variants` por-tono de @core (deepmerge / especificidad)
    })
  }
}
```

Nota de mecánica: `@core/theme/overrides/button.ts` aplica la sombra vía `variants: [{ props: { variant:'contained', color:'error' }, style:{ boxShadow: '...' } }]`. Para garantizar que `mergedTheme` gana, evaluar en Plan Mode si basta el override `root`/`contained` o si hay que espejar los `variants` por-tono. Verificar el resultado real con GVC (no asumir precedencia).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (re-point en `mergedTheme`) → Slice 2 (drift-guard que pinea lo de S1). S2 no puede pinear algo que S1 no definió.
- Slice 3 (audit) es independiente — puede correr en paralelo o después; NO bloquea S1/S2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión visual: botones contained cambian de sombra en toda la app | UI | high (es el objetivo — cambio intencional) | GVC light+dark en superficies clave (6 tonos) + revisión visual antes de merge | no signal — visual, atrapado por GVC |
| El override de `mergedTheme` no pisa los `variants` por-tono de `@core` (precedencia) | UI | medium | verificar en GVC que el glow desapareció en los 6 tonos; espejar `variants` si hace falta | no signal — visual |
| Vuexy upgrade re-introduce el glow legacy silenciosamente | UI / design-system | low | drift-guard (Slice 2) rompe CI | CI test fail |
| Romper el contrato `DESIGN.md` §Elevation / V1 §6 | design-system | low | `pnpm design:lint` 0/0 antes de merge | `design:lint` fail |

### Feature flags / cutover

Sin flag — additive theme change, immediate cutover. Es un cambio puramente visual en el theme (no data, no runtime de negocio). Revert = revert PR + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (override en `mergedTheme`) + redeploy | <10 min | sí |
| Slice 2 | revert del test | <5 min | sí |
| Slice 3 | revert PR (doc + migraciones puntuales de views) + redeploy | <10 min | sí |

### Production verification sequence

1. Slice 1 en local: `pnpm dev` + GVC `--route` sobre superficies con botones contained de los 6 tonos, light+dark → leer frames, confirmar glow neutro/ausente.
2. `pnpm tsc --noEmit` + `pnpm lint` + `pnpm design:lint` 0/0 + `pnpm test` (drift-guard verde).
3. `pnpm build` (Turbopack) — cambio de theme, verificar build.
4. Deploy a staging → GVC `--env=staging` en las mismas superficies → revisión visual del operador.
5. Merge a `develop` → verificar el portal real (home, finance, admin) light+dark.
6. Promoción a prod por el control plane de release habitual.

### Out-of-band coordination required

N/A — repo-only change. Es ajuste de theme; no toca Azure/GCP/HubSpot/secrets. Recomendable visto bueno visual del operador (Julio) por ser cambio estético app-wide.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `MuiButton` contained (los 6 tonos) ya NO usa `var(--mui-customShadows-{tone}-sm)`; su sombra deriva de `theme.greenhouseElevation.<role>` vía `mergedTheme` (verificado en GVC, glow de color ausente light+dark).
- [ ] `src/@core/theme/**` NO fue modificado (la reconciliación vive solo en `mergedTheme`).
- [ ] Existe un drift-guard que falla si la sombra resuelta de `MuiButton` contained diverge del SoT en cualquier modo.
- [ ] `DESIGN.md` §Elevation + V1 §6 reflejan el mapeo rol→control (si entró al contrato); `pnpm design:lint` 0/0.
- [ ] Existe `docs/audits/design-system/ELEVATION_SHADOW_LEGACY_CONSUMERS_*.md` con los ~25 consumers clasificados (a/b/c) + decisión de política para views documentada.
- [ ] GVC desktop+mobile, light+dark, mirado en al menos 3 superficies con botones contained.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (incluye drift-guard de elevation)
- `pnpm design:lint`
- `pnpm build`
- GVC: `pnpm fe:capture --route=/home --env=local` + superficies finance/admin, light+dark.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio visual app-wide)
- [ ] chequeo de impacto cruzado (TASK-1049/1051/1052/1053 — strangler de elevation/color)
- [ ] CLAUDE.md actualizado si cambia la política de `customShadows` en views o el pin de elevation

## Follow-ups

- Migración masiva de los consumers clase (b) en views (si el audit la justifica) — task derivada por blast radius.
- Reconciliar los demás controles base con sombra legacy (menu/popover/dialog/drawer/card) si el audit los prioriza.
- TASK-1057 (email palette) es un strangler hermano (color por medio); no se mezcla aquí.

## Open Questions

- Rol de elevation para botones contained: `raised` (lift sutil) vs `none` (plano, dirección Restraint). Decidir en Plan Mode con `design-system-governance` + `modern-ui` + GVC.
- ¿Se extiende la lint rule a `views` en `warn` para código nuevo, o se mantiene la política actual ("views compat, no se flaggean")? Decisión de governance en Slice 3.
