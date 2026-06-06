# TASK-1036 — Typography token system + contract↔runtime reconciliation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `none`
- Branch: `task/TASK-1036-typography-token-system-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Resolver la deuda técnica de tipografía caracterizada en
`docs/audits/design-tokens/TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md`:
crear un **SoT de tipografía** (espejo de `axis-tokens.ts` para color), wirearlo en
`mergedTheme` (NO `@core`) — incluyendo una **escala real de control-text/label** que
reemplace los magic numbers dispersos — y **reconciliar el vocabulario** DESIGN.md
(nombres semánticos) ↔ runtime (variantes MUI) con drift-guard en CI. Cierra L1+L2+L3.

## Why This Task Exists

El sistema de tipografía nació de **dos modelos que nunca se reconciliaron**: el contrato
agente (`DESIGN.md`, vocabulario semántico estilo `@google/design.md`) y el runtime (variantes
MUI + overrides per-componente de Vuexy). El audit confirmó que la deuda es **sistémica, no
solo labels**, en 3 capas:

- **L1 divergencia de vocabulario**: 12 de 15 tokens del contrato tienen nombre distinto en
  runtime (`section-title`→`h5`, `label-md`→`button`, `numeric-id`→`monoId`, …). Solo `overline`
  comparte nombre. El agente traduce cada token para aplicarlo → fricción + riesgo de `fontSize`
  inline (rompe token discipline).
- **L2 drift/stubs**: `h5` (=section-title) y `button` (=label-md) **no definen `fontSize`** →
  caen al default MUI/overrides y no coinciden con el contrato. `label-lg`/`label-sm` no existen
  como variante (revertidos de DESIGN.md en TASK-1034 por no tener respaldo). `h6`/`subtitle1`
  son orphans.
- **L3 magic numbers**: tamaños de texto de control hardcodeados per-componente en `@core`
  (Button 14/14/17px, Chip 13/15px, input em), sin token compartido ni ramp. Mismo anti-patrón
  que TASK-1034 Slice 4 cerró para **color** (hex → SoT `axisSemanticHex`), vivo en tipografía.

Lo sano (no es deuda): `lineHeights` (`typography-tokens.ts`) ya está bien tokenizado y los
headlines `h1-h4` mapean limpio — prueba de que el patrón correcto existe; falta extenderlo.

## Goal

- Un SoT de tipografía único del que derivan runtime + DESIGN.md + V1 (cero magic numbers de
  `fontSize`/`fontWeight`/familia fuera del SoT, igual que `lineHeights` hoy).
- Escala canónica de **control-text/label** real, consumida por los overrides de Button/Chip/input
  (vía `mergedTheme`, NO `@core`), que reemplace los magic numbers dispersos.
- Vocabulario contrato↔runtime reconciliado, con **drift-guard en CI** que falle si se desincroniza
  (espejo de `axis-semantic-drift.test.ts`).
- DESIGN.md vuelve a tener la escala `label-lg/md/sm` (y `section-title`) **con respaldo real**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§3 typography, §15.1 mapeo bilateral)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `DESIGN.md` (contrato agente, formato `@google/design.md`)

Reglas obligatorias:

- **NUNCA** modificar `src/@core/theme/*` (Vuexy core, read-only). Todo override va en `mergedTheme`
  (capa userTheme). Regla dura de design-system-governance.
- **NUNCA** crear variantes `theme.typography.label*` paralelas que ningún componente consuma. Si se
  crea una escala de control-text, los overrides de componente DEBEN consumirla (single source).
- **SIEMPRE** mover juntos (parity 3-capas): SoT + runtime + DESIGN.md + V1 + drift-guard test.
- **NUNCA** `fontSize` inline en JSX/`sx` para texto tipográfico canónico — usar variante/token.
- Gate `pnpm design:lint` debe quedar `0/0/1`. `orphanedTokens` prohíbe tokens sin componente en el
  front-matter (los ramps/escala completa que no se referencian van en prosa + `theme.axis`/SoT).

## Normative Docs

- `docs/audits/design-tokens/TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md` — **caracterización
  completa de la deuda + remediación propuesta (§6) + slicing sugerido. Leer primero.**
- `docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md` — audit previo (typography sweep
  post TASK-567).

## Dependencies & Impact

### Depends on

- `src/components/theme/typography-tokens.ts` (namespace `lineHeights` ya canónico — extender o
  hermanar con `fontSize`/`fontWeight`/familia)
- `src/components/theme/mergedTheme.ts` (typography block + override layer)
- Patrón de referencia: TASK-1034 (`axis-tokens.ts` + `axis-semantic.ts` + `axis-semantic-drift.test.ts`)

### Blocks / Impacts

- DESIGN.md robustening continuo (TASK-1034 follow-ups) — la escala `label-*` + `section-title`
  quedan pendientes de respaldo hasta esta task.
- Cualquier UI nueva que use tipografía (blast-radius amplio).

### Files owned

- `src/components/theme/typography-tokens.ts`
- `src/components/theme/mergedTheme.ts` (typography + nuevos overrides de componente)
- `src/components/theme/typography-drift.test.ts` `[verificar — nuevo]`
- `DESIGN.md` (typography front-matter + §15.1 mapping + prosa)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§3, §15.1)

## Current Repo State

### Already exists

- `src/components/theme/typography-tokens.ts` — `lineHeights` namespace canónico (display/heading/
  pageTitle/metadata/body/numericDense), cero magic numbers en line-height.
- `mergedTheme.ts` typography — h1-h6/subtitle1/body1-2/caption/button/overline/monoId/monoAmount/kpiValue.
- DESIGN.md typography — 15 tokens semánticos (post-revert de label-lg/sm en TASK-1034).
- Familias correctas (Poppins display h1-h4 / Geist el resto).
- Patrón espejo color: `axis-tokens.ts` + `axis-semantic-drift.test.ts` (drift-guard de referencia).

### Gap

- Sin SoT de `fontSize`/`fontWeight`/familia (solo line-height tokenizado).
- `h5`/`button` sin `fontSize` (drift vs contrato); `label-lg`/`label-sm`/`section-title` sin variante
  real; `h6`/`subtitle1` orphans.
- Control-text con magic numbers en `@core` overrides (read-only).
- Vocabulario contrato↔runtime divergente, mapeo §15.1 manual y sin verificación en CI.

<!-- ZONE 2 — PLAN MODE: el agente que tome la task ejecuta Discovery. No llenar. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — SoT de tipografía + drift-guard sobre lo que ya matchea

- Extender `typography-tokens.ts` (o hermano `typographyScale`) con la escala canónica completa
  (familia + size + weight + lineHeight + tracking + features) para los tokens que HOY ya coinciden
  (headlines h1-h4, body, numeric, kpi, overline).
- `mergedTheme` consume el SoT para esas variantes (sin cambiar valores → no-op visual).
- `typography-drift.test.ts`: asserta runtime ≡ SoT ≡ DESIGN.md para los tokens cubiertos.

### Slice 1 — Reconciliar L2 stubs (sin renombrar)

- Definir `fontSize` real para `h5` (=section-title) y `button` (=label-md) en `mergedTheme` desde el
  SoT, reconciliando contrato↔runtime (decidir el valor canónico: alinear DESIGN.md al runtime o
  viceversa, documentado).
- Resolver `h6`/`subtitle1`: definir desde SoT o deprecar.

### Slice 2 — Escala real de control-text + overrides vía SoT

- Definir la escala control-text/label (sm/md/lg) en el SoT con valores que reflejen los controles
  reales (~13/14/17px).
- Override de Button/Chip/input en `mergedTheme` (capa userTheme, NO `@core`) que consuma la escala →
  elimina los magic numbers dispersos. Verificar GVC (blast-radius UI amplio).

### Slice 3 — Reconciliación de vocabulario + bridge verificado

- Decidir entre (a) renombrar variantes runtime a nombres semánticos (alto blast-radius) o (b) un
  bridge formal contrato↔runtime verificado en CI. Recomendación del audit: **(b)**.
- Extender el drift-guard para cubrir el bridge completo (falla si se desincroniza).

### Slice 4 — Re-introducir escala completa en DESIGN.md (con respaldo) + cleanup

- Re-agregar `label-lg`/`label-sm` (+ confirmar `section-title`) a DESIGN.md ahora **con respaldo
  runtime real** + nota de mapeo a idiomas MUI (Button size / Chip).
- Sincronizar V1 §3/§15.1. `design:lint` 0/0/1.

## Out of Scope

- Color / paleta AXIS (es TASK-1034 — esta task es SOLO tipografía).
- Cambiar las familias de fuente (Poppins/Geist) o el namespace `lineHeights` (ya canónico).
- Migrar a fluid/responsive type (clamp) — posible follow-up, no acá.
- Reescribir consumidores que usan `<Typography variant="...">` correctamente (el bridge los cubre).

## Detailed Spec

Ver `docs/audits/design-tokens/TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md` §2 (mapeo completo
contrato↔runtime), §3-§5 (las 3 capas con evidencia) y §6 (remediación + slicing). El patrón de
implementación es el mismo que TASK-1034 usó para color: SoT puro → consumido por theme + docs →
drift-guard test que falla en CI ante divergencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (SoT + drift-guard no-op) → Slice 1 (stubs) → Slice 2 (control-text + overrides) →
  Slice 3 (bridge vocabulario) → Slice 4 (DESIGN.md completo + cleanup).
- Slice 0 DEBE shippear primero (establece el SoT); el resto deriva de él.
- Slice 2 (cambia tamaños de control visibles) NO antes que Slice 0/1 (necesita el SoT). Requiere
  GVC sweep antes de merge.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambio de tamaño de control altera densidad/layout en muchas pantallas | UI | medium | GVC sweep multi-superficie + posible flag de rollout (espejo `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED`) + valores reconciliados al runtime real (no inventados) | revisión visual GVC; sin reliability signal (emerge en GVC) |
| Drift contrato↔runtime se reintroduce en el futuro | UI / governance | medium | `typography-drift.test.ts` en CI (falla el build) | test rojo en CI |
| Tocar `@core` por error (read-only) | UI | low | regla dura design-system-governance + override solo en mergedTheme | code review |
| `design:lint` rompe por orphaned/contrast al mover tokens | release (CI gate) | low | validar `design:lint 0/0/1` por slice; ramps en prosa, no front-matter | CI design-contract gate |

### Feature flags / cutover

- Slice 2 (control-text sizes, el de mayor blast-radius visual): evaluar flag de rollout
  `NEXT_PUBLIC_AXIS_TYPOGRAPHY_ENABLED` (default según decisión operador) espejando el patrón de
  neutrales AXIS, o cutover directo si el GVC confirma equivalencia. Slices 0/1/3/4 son aditivos/
  refactor sin flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert PR (no-op visual) | <5 min | sí |
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | flag a `false` (si se usa flag) o revert PR + redeploy | <5 min | sí |
| Slice 3 | revert PR | <5 min | sí |
| Slice 4 | revert PR (doc/contract) | <5 min | sí |

### Production verification sequence

1. Slice 0 merge → `design:lint 0/0/1` + `tsc` + drift-guard verde + GVC no-op (sin cambio visual).
2. Slice 1 → GVC de superficies con section-title/botones; confirmar valores reconciliados.
3. Slice 2 → GVC sweep amplio (cards, tablas, forms, chips, botones) light+dark; si flag, validar ON/OFF.
4. Slice 3 → CI bridge test verde; spot-check de consumidores.
5. Slice 4 → `design:lint 0/0/1`; DESIGN.md + V1 sincronizados.

### Out-of-band coordination required

N/A — repo-only change (sin sistemas externos). Solo revisión visual del operador en GVC para Slice 2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un SoT de tipografía del que derivan runtime + DESIGN.md (no hay `fontSize`/`fontWeight`/
      familia hardcodeados fuera del SoT en `mergedTheme`).
- [ ] `h5`/`button` definen `fontSize` desde el SoT y coinciden con el contrato (sin stubs).
- [ ] La escala de control-text/label es consumida por los overrides de Button/Chip/input (no magic
      numbers nuevos; los de `@core` quedan overrideados desde `mergedTheme`).
- [ ] `typography-drift.test.ts` falla en CI si runtime↔contrato se desincronizan.
- [ ] DESIGN.md tiene `label-lg/md/sm` (+ `section-title`) con respaldo runtime real + nota de mapeo.
- [ ] `pnpm design:lint` = `0/0/1`.
- [ ] `h6`/`subtitle1` definidos o deprecados explícitamente.

## Verification

- `pnpm design:lint`
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm test` (incluye `typography-drift.test.ts`)
- GVC sweep (Slice 2): superficies clave light+dark, mirado y aprobado.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio visible de tipografía)
- [ ] chequeo de impacto cruzado (TASK-1034 follow-ups, DESIGN.md)
- [ ] audit `TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md` anotado como resuelto

## Follow-ups

- Fluid/responsive type (clamp) si emerge necesidad.
- Extender lint para detectar `fontSize` inline en `sx`/JSX (hoy `greenhouse/no-untokenized-copy`
  cubre copy, no tamaños).

## Open Questions

- Slice 1: ¿el valor canónico de `section-title`/`label-md` se reconcilia alineando DESIGN.md al
  runtime (18→20px section, 15→14px label) o el runtime al contrato? Decisión de diseño del operador.
- Slice 3: ¿renombrar variantes runtime a nombres semánticos (alto blast-radius) o bridge verificado?
  El audit recomienda bridge.
- Slice 2: ¿flag de rollout o cutover directo? Depende de cuán visible sea el cambio en GVC.
