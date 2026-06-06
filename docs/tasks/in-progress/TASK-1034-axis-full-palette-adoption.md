# TASK-1034 — Adopción completa de la paleta AXIS en el runtime Greenhouse

> **Lifecycle:** in-progress
> **Creado:** 2026-06-06 por Claude (sesión con Julio)
> **Prioridad:** P1
> **Domain:** ui | platform | design-system | accessibility

## Objetivo

Greenhouse debe tener **todos** los colores de AXIS (el Design System de Efeonce), no solo
los `main` semánticos. AXIS = fuente de verdad (Figma `yyMksCoijfMaIoYplXKZaR`, nodos
`11205:5342` light + `11205:6238` dark). El runtime actual ([mergedTheme.ts](../../../src/components/theme/mergedTheme.ts))
solo tiene `main` + algunos `light/dark` + `customColors`; le falta el ramp completo y los
neutrales divergen.

## Decisiones del operador (2026-06-06)

1. **Sincronización:** pipeline desde Figma (re-sincronizable, generado). NO transcripción manual.
2. **Alcance marca:** solo Efeonce/GreenHouse. Kortex/Verk fuera del runtime de Greenhouse.
3. **Huecos a11y:** arreglar en código por ahora (capa semántica, override documentado), reconciliar con AXIS después.

## Drift detectado AXIS vs runtime actual

| Token | AXIS | Runtime actual |
|---|---|---|
| success | `#28c76f` (verde) | `#6EC207` (lime) |
| warning | `#ffb703` (ámbar) | `#FF6500` (naranja) |
| error | `#ff4c51` (coral) | `#BB1954` (crimson) |
| info | `#00bad1` (cyan) | `#0375DB` (= primary) |
| secondary | `#6ec207` (lime ramp) | `#023C70` (navy) |
| text-primary (light) | `#2f2b3de5` | `#1A1A2E` |
| bg / paper (dark) | `#25293c` / `#2f3349` | `#101827` / `#162033` |
| primary | `#0375db` ✅ | `#0375db` ✅ (igual) |

## Huecos de contraste de AXIS tal cual (WCAG 2.2 AA, texto ≥4.5:1)

- `success` e `info`: ni el paso `-900` alcanza 4.5:1 sobre blanco (máx 3.83 y 4.01) → texto chico verde/cyan sobre blanco reprueba. OK para íconos/large (3.0).
- `error` contained con texto blanco = 3.28:1 (borderline texto normal).
- En dark mode los `-500` brillantes dan 5–9:1 → sin problema.

## Arquitectura (3 capas)

```
AXIS (Figma, SoT)
  → Capa 1 primitivos  src/@core/theme/axis-tokens.ts   (espejo 1:1, generado)
  → Capa 2 semántica   axis-semantic.ts                 (ramp → rol por modo + overrides a11y)
  → Capa 3 MUI theme   colorSchemes.light/dark.palette  (palette.<family>[100..900], opacity, customColors)
```

## Slices

- [x] **Slice 0 — Foundation (DONE 2026-06-06).** Extracción AXIS completa (light+dark) →
  `src/@core/theme/axis-tokens.ts` (ramps 100-900 + opacity 8/16/24/32/38 + neutrales por modo +
  `axisMain`). Mockup de paleta completa `/admin/axis-palette/mockup` con anotación WCAG por paso.
  tsc/lint/design:lint verdes. GVC capturado y revisado.
- [x] **Slice 1 — Capa semántica (DONE 2026-06-06).** `axis-semantic.ts`: mapea ramp→rol
  (main=500 / light=400 / dark=600 / contrastText AA) para success/warning/error/info. contrastText:
  success/warning/info = ink `#2f2b3d` (fills brillantes fallan con blanco); error = white (gap, ver 2b).
  `theme.axis` expone los primitivos completos (augmentation en `types.ts`).
- [x] **Slice 2 — Wire semánticos en el theme (DONE 2026-06-06).** `colorSchemes.light/dark.palette`
  consume `axisSemanticPalette` para info/success/warning/error (mains AXIS mode-agnostic). `theme.axis`
  agregado. `primary`/`secondary`/neutrales/`customColors` intactos. DESIGN.md front-matter
  (success/warning/error/info) + chips error/info → text-primary (pasan contrastCheck) +
  `GREENHOUSE_DESIGN_TOKENS_V1.md` §8.1 actualizados en el mismo cambio. `design:lint` 0/0/1 ✅, tsc ✅, lint ✅.
  Verificado con sonda de color computado (success/warning/info AA en filled alerts + contained buttons).
  Preview vivo: `/admin/theme-preview/mockup`.
- [x] **Slice 2b — Fix AA del error fill (DONE 2026-06-06).** En vez de override de componente (riesgo de
  clobber con overrides Vuexy vía deepmerge), se mapeó `error.main = AXIS error-800 #CC3D41` (blanco 4.87:1 ✅),
  `error.light = #FF4C51` (vibrante para bordes/íconos/tints), `error.dark = #BF393D` (hover 5.43:1). Sin tocar
  overrides core. DESIGN.md error→#CC3D41 + status-chip-error→on-primary; tokens doc §8.1 actualizado. Verificado
  por sonda de color real: btn/alert/chip error contained = 4.87:1 AA. Desviación a11y deliberada (decision #3),
  documentada para reconciliar con AXIS. gate ✅ tsc ✅ GVC ✅.
- [x] **Slice 3 — Neutrales AXIS (ALTO blast-radius) (CÓDIGO DONE 2026-06-06, ship dormant).**
  Adopta bg/paper/text/customColors de AXIS light+dark vía `src/@core/theme/axis-neutrals.ts`
  (dos fragmentos: `legacyNeutrals` bit-for-bit + `axisNeutrals` desde `axisNeutral` SoT).
  `mergedTheme.ts` consume `resolveNeutralFragments()`. Brand customColors
  (midnight/deepAzure/royalBlue/coreBlue/neonLime/sunsetOrange/crimson/lightAlloy) + `inputBorder`
  INTACTOS (Slice 4). `divider` lo deja el core (ya === AXIS `#2f2b3d1f` vía channels).
  Superficies Vuexy dark alineadas a AXIS (chatBg `#202534`, greyLightBg `#353A52`, trackBg `#3A3F57`,
  tableHeader/tooltip `#2f3349`) para no chocar de hue contra el nuevo bg púrpura-navy.
  - **Flag de rollout (decisión operador):** `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED` (build-time, **default OFF**).
    Desviación deliberada del `home_rollout_flags` (DB): el theme MUI se construye sincrónico en cada
    render (SSR+cliente) sin DB alcanzable y es global → flag build-time es el mecanismo correcto
    (clase `themeConfig.mode`/`primaryColor`). Flip por env var en Vercel + redeploy.
  - **Verificado:** tsc/lint/design:lint verdes (DESIGN.md sin tocar = consistente con runtime live OFF).
    GVC light+dark (flag ON) en /home, /people, /finance/expenses, /admin/operations: dark navy→púrpura-navy
    AXIS coherente, cero regresión. Sonda de color computado dark AA con margen: heading 9.14:1,
    form-label 7.98:1, body 6.11:1, table-cell 5.47:1.
  - **PENDIENTE al flip (NO en este commit):** actualizar DESIGN.md `neutral`/`surface*`/`background-dark`/
    `text-*` + `GREENHOUSE_DESIGN_TOKENS_V1.md` §8.1 a los neutrales AXIS, en el MISMO commit que flipea
    el flag a ON (mantiene contract==runtime; text con alpha → sólido representativo para el contrastCheck).
- [x] **Slice 4 — Migración consumers + drift guard (DONE 2026-06-06).** Audit reveló que el "~41
  archivos" estaba inflado: el token `customColors.{neonLime,sunsetOrange,crimson}` tenía **cero
  consumers reales** (solo type decl + test mock); el drift real eran ~hex legacy hardcodeados en
  config/PDF/charts.
  - **SoT semántico:** `axisSemanticHex` en `axis-semantic.ts` (success `#28c76f`, warning `#ffb703`,
    error `#cc3d41` [error-800 AA, no el #ff4c51], info `#00bad1`), derivado de `axisSemanticPalette`
    (mismo origen que el theme) → un solo SoT para consumers non-MUI.
  - **Token muerto REMOVIDO** (veredicto skills `design-system-governance` + `arch-architect`: cero
    consumers ⇒ grace-period nulo; footgun de misuse; two-way door reversible). Quitado de
    `mergedTheme.ts` (light+dark) + `types.ts` + `test/render.tsx`. `efeonce-crimson` primary NO tocado.
  - **Consumers semánticos migrados al SoT:** `lib/finance/pdf/tokens.ts` (success/warning),
    `config/greenhouse-nomenclature.ts` (`semaphore`/`semantic`/`chart` semantic roles; bg→`axisOpacity[8]`),
    `lib/ai/image-generator.ts` (prompt). Categóricos de dominio (cscPhase/service/categories/subBrand)
    **NO migrados** (paleta de categorías deliberada, decisión operador).
  - **Drift guard:** `axis-semantic-drift.test.ts` (7 tests) asserta theme ≡ nomenclature ≡ PDF ≡
    `axisSemanticHex` + que ningún hex legacy sobreviva. Falla CI ante cualquier drift futuro.
  - **V1 §8.1** sincronizado (tokens marcados REMOVIDO + apuntan al SoT; corregido stale error #FF4C51→#CC3D41).
    DESIGN.md sin cambios (los semánticos ya eran AXIS desde Slice 2; Slice 4 solo alinea consumers).
  - Verificado: tsc/lint/design:lint(0/0/1) verdes · 154 tests consumers + 7 drift · GVC OTD% trend card
    = verde AXIS `#28c76f` coherente (antes lime legacy).
- [ ] **Slice 5 — Shadows/elevación (diferido del scope de color).** Tokens de sombra AXIS sm/md/lg light+dark.

## Archivos (Slice 0)

- `src/@core/theme/axis-tokens.ts` — primitivos AXIS (SoT en código)
- `src/app/(dashboard)/admin/axis-palette/mockup/page.tsx`
- `src/views/greenhouse/admin/axis-palette/mockup/AxisPaletteMockupView.tsx`
- `scripts/frontend/scenarios/axis-palette-mockup.scenario.ts`

## Notas

- AXIS bindea `action-hover` al mismo `#e1def50f` en ambos modos; en light es casi invisible —
  probable gap de autoría de AXIS, espejado verbatim + flag para reconciliar upstream.
- El nombre canónico del DS (AXIS) quedó registrado en DESIGN.md (commit `8dee9e5f`) + memoria.
