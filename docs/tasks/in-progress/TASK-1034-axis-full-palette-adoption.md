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
- [ ] **Slice 3 — Neutrales AXIS (ALTO blast-radius).** Adoptar bg/paper/text/divider de AXIS light+dark
  (cambia el tono de toda la app). **En el MISMO commit:** actualizar `text-*`, `surface*`, `background*`
  en DESIGN.md + tokens doc. GVC sweep de superficies clave; evaluar flag de rollout.
- [ ] **Slice 4 — Migración consumers + docs + drift guard.** Migrar usos de `customColors` legacy a
  tokens AXIS; sincronizar DESIGN.md + `GREENHOUSE_DESIGN_TOKENS_V1.md`; agregar guard de drift
  (snapshot test o ritual de regeneración documentado).
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
