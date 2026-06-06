# TASK-1038 — Typography scale redesign (modular ladder, fix hierarchy inversion)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete — escala shipped + pusheada; los 4 follow-ups cerrados (TASK-1039/1040/1041/1042)`

## Resolution (2026-06-06)

Core (rediseño de escala) shipped + pusheado a develop. Los 4 follow-ups se spun out a tasks propias y **todos cerraron**:

- **TASK-1039** (peso 500) — evaluado y **descartado** (won't-do): imperceptible a 14px + ya rinde vía Vuexy; récord en el mockup.
- **TASK-1040** (PDF Geist 600/800) — familias `SemiBold`/`ExtraBold` registradas (corrigió el claim "cae a Helvetica" → es family-name-based, aproxima con Bold/Medium). Migrar componentes PDF queda como slice opcional.
- **TASK-1041** (charts) — los 43 charts consumen tipografía del **SoT desde un solo lugar** vía los wrappers `AppReactApexCharts`+`AppRecharts` (no el sweep de 47). Helper `getChartTypographyFromTheme` para ECharts canvas.
- **TASK-1042** (drift-guard) — el guard se extendió a la **prosa de DESIGN.md + tabla V1 §15.1** (antes solo front-matter); todo `Npx`/`Nrem` debe ser un tamaño vigente del SoT.

Consolidación final: lint rule `no-fontsize-inline-typography` + rule-tests en CI; DESIGN.md/V1/skills sincronizados (fix de drift en §15.1 que estaba entera pre-rediseño); prosa de DESIGN.md `px→rem` (es agent-facing); `letter-spacing` del SoT `px→em` (escala con la fuente). Sistema de unidades coherente: font-size rem · line-height unitless · letter-spacing em · borders px.
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `TASK-1036` (la fundación SoT + drift-guard + bridge)
- Branch: `develop` (local-first, sin push hasta confirmación)
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-06-06 — IMPLEMENTADO local (TO-BE aprobado)

El operador aprobó el TO-BE tras ver el impacto en `/admin/design-system/typography/mockup`. Implementado directo (sin flag — aprobado + GVC local), local-first, sin push.

- **SoT flip** (`typography-tokens.ts`): page-title 16→**20**, section-title 18→**16**, subheader 15→**14**, label-md 15→**14**; `controlText.md` 15→14, `controlText.lg` 17→**16**. Ladder 11→**8** tamaños. 0 nuevos, 0 renombrados.
- **subtitle2** (13/400, ~267 consumidores) traída al SoT vía `body-sm` en `SECONDARY_VARIANT_TOKENS` (NO label-sm 13/600 — corrección del completeness pass) + override en `mergedTheme`.
- **Tab** 18px hardcoded → `controlText.md` 14 (override `MuiTab`). **Dialog title** h6 → `section-title` 16/600 (override `MuiDialogTitle`).
- **drift-guard** actualizado (pins + controlText): **37 tests verde**. **DESIGN.md** front-matter (page-title 1.25rem / section-title 1rem / label-md 0.875rem) + **V1 §3.2** + **Delta v1.7** synced (parity 3 capas). `design:lint` **0/0/1**, tsc 0, lint 0.
- **GVC** `/admin/design-system` (light): page-title domina como título, section-titles subordinadas — inversión arreglada, sin breakage.
- **Canonización**: pointer en `CLAUDE.md` (sección "Typography System") + políticas transversales (i18n/fluid/display/PDF-email/truncation/charts/measure).

### Follow-ups

**✓ Cerrados en este flip (2026-06-06):**

- **Lint rule** `greenhouse/no-fontsize-inline-typography` (warn) — scopeada a `<Typography>` (resuelve icon-vs-text sin heurística fuzzy: Typography = siempre texto; íconos nunca son Typography → cero falsos positivos). 168 captures legacy = el inventario a migrar. Off en theme/pdf/mockup. Tests + registrada en `index.mjs` v1.11.0 + config. Commit `b7875842d`.
- **Rule-test coverage en CI** — los `.test.mjs` de `eslint-plugins/greenhouse/` no estaban en NINGÚN runner (el `include` de vitest solo escanea src/scripts/services); el de `no-cross-domain` estaba **roto** (usaba `import type` sin parser TS) sin que nadie lo viera. Fix: `pnpm test:lint-rules` (`node --test` con glob → auto-descubre rules nuevos) + step en `ci.yml` + parser TS en el RuleTester roto. 13/13 verde. Commit `f33265e95`.
- **Cleanup mockup cap 5** — relabel "Propuesta TO-BE / no aplicado" (warning) → "Rediseño TASK-1038 — aplicado" (success); el AS-IS↔TO-BE se conserva como **registro** del rediseño.

**Abiertos (ejecutables — orden + spec):**

- **FU1 — rol semántico peso 500** (énfasis medio: nav/tabla/labels sutiles). El peso **500 ya está cargado** (Geist + Poppins). Falta darle un **rol** en el SoT. Plan: agregar token(s) en `typographyScale` (p.ej. `labelMdMedium` / `navItem` 14/500) + consumir en los overrides de componente que hoy usan 600 donde corresponda 500 (Tab, nav items, table-header secundario). **⚠️ Cambio visual cross-surface → requiere GVC + aprobación del operador ANTES del flip** (mismo protocolo que la escala: mostrar impacto, aprobar). NO flipear unilateral.
- **FU2 — adapter PDF Geist 600/800.** Corrección del claim previo: `register-fonts.ts` registra **por nombre de familia** (`Geist`=400 / `Geist Medium`=500 / `Geist Bold`=700), **no por peso** — un componente PDF que quiera 600/800 hoy aproxima con Bold/Medium (NO "cae a Helvetica"; eso es solo para familias sin registrar). Es **refinamiento de paridad**, no bug. El **web no tiene gap** (next/font carga 400-800). Cerrarlo = (a) obtener `Geist-SemiBold.ttf`(600)+`Geist-ExtraBold.ttf`(800) del mismo origen Google Fonts/gwfh que las actuales, (b) `tryRegister('Geist SemiBold'…)`/`tryRegister('Geist ExtraBold'…)`, (c) migrar los componentes PDF que ameriten esos pesos. **Nota Google Fonts (op. 2026-06-06):** react-pdf SÍ acepta `Font.register({ src: 'https://…' })` (URL remota), pero el patrón existente usa **.ttf locales a propósito** (render PDF offline-safe en Cloud Run); URL remota = dependencia de red en cada render (riesgo de resiliencia). Robusto = local.
- **FU3 — adapter de charts desde el SoT** (~47 archivos ECharts/Apex/Recharts). Hoy cada chart define tamaños de texto inline. Plan: un helper `getChartTypographyFromTheme(theme)` que derive `fontFamily`/`fontSize` de axis/legend/tooltip/label desde el SoT, y migrar los wrappers de chart a consumirlo. **Sweep de ~47 archivos** — task derivada propia.

## Summary

La escala de tipografía actual no fue **diseñada** como escala: se acumuló de los defaults
de Vuexy + los nombres de la spec `@google/design.md` pegados encima. TASK-1036 la **gobernó**
(SoT `typographyScale` + drift-guard + bridge) pero deliberadamente mantuvo los valores **no-op**.
El resultado es una **escala mala bien gobernada** — y ponerla toda en una vista
(`/admin/design-system/typography/mockup`) volvió los defectos estructurales imposibles de no ver.
Esta task **rediseña los valores** sobre una escala modular, arregla la inversión de jerarquía y
elimina los pasos no perceptibles, **sin agregar ni renombrar tokens**. Es un cambio visual real →
flag + GVC + aprobación del operador.

## Why This Task Exists

Diagnóstico (con skills `modern-ui` + `design-system-governance`, 2026-06-06), 3 defectos:

1. **🔴 Inversión de jerarquía:** `page-title` (h4, **16px**) es **más chico** que `section-title`
   (h5, **18px**) e **igual** que `body-lg` (16). El título más importante de la pantalla es el más
   chico; solo lo salva Poppins + peso 600. La jerarquía debe leerse en **tamaño** primero.
2. **🔴 Goteo de 1px:** 7 tamaños (12·13·14·15·16·17·18) en una banda de **6px**. Un paso de 1px está
   por debajo del umbral perceptible — 14/15/16 son indistinguibles. Sin razón modular (los saltos
   de abajo son ~1.07, lineal).
3. **🟡 Sobre-granularidad:** 15, 16 y 17 vivos a la vez (3 tamaños en 2px, incluido el `17px`
   bespoke de `control-lg`). El eje de tamaño casi no transporta jerarquía; todo lo hace el peso.

Lo que **NO** es deuda (no tocar): dos familias (Poppins/Geist), tabular-nums, cero monospace, y el
patrón legítimo "mismo tamaño + peso distinto" para pares label/body. Las colisiones *per se* no son
fatales (Material 3 también reusa 16 en Title-M y Body-L); las fatales son la **inversión** y el
**goteo de 1px**.

## Goal

- Una escala con **razón modular** y **pasos perceptibles** (≥2px en el extremo chico).
- **Arreglar la inversión:** `page-title` ≥ `section-title` y claramente > body.
- **Reducir** de 11 a ~8 tamaños distintos eliminando los no-steps (15, 17).
- **Cero tokens nuevos, cero renombrados** — solo cambian VALORES (mínimo blast-radius de migración).
- Implementación detrás de **flag** + **GVC sweep** + aprobación visual; el drift-guard y el mockup
  de TASK-1036 confirman el resultado al instante (cambiar valores en UN lugar: `typographyScale`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `DESIGN.md` (contrato agente) + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.2 (type scale)
- `src/components/theme/typography-tokens.ts` (`typographyScale` + `controlText` — SoT de TASK-1036)
- `src/components/theme/typography-drift.test.ts` (drift-guard — se actualiza con los nuevos valores)

Reglas obligatorias:

- **NUNCA** modificar `src/@core/theme/*` (Vuexy core). Los valores nuevos van en `typographyScale`
  (SoT) consumido por `mergedTheme` — la fundación de TASK-1036.
- **SIEMPRE** mover juntos (parity 3-capas): SoT + `mergedTheme` (deriva solo) + DESIGN.md + V1 §3.2
  + drift-guard + mockup. `design:lint` 0/0/1.
- **NUNCA** `fontSize` inline — el rediseño cambia el token, no los consumidores.
- Cambio visible → **flag de rollout** (espejo de `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED`, build-time,
  default OFF) + GVC light+dark antes del flip.

## Normative Docs

- Mockup AS-IS vs TO-BE (artefacto de aprobación): `/admin/design-system/typography/mockup`
  (`src/views/greenhouse/admin/design-system/typography/mockup/TypographyReferenceMockupView.tsx`).
- Audit fuente de la deuda: `docs/audits/design-tokens/TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md`.
- TASK-1036 (fundación): `docs/tasks/in-progress/TASK-1036-typography-token-system-reconciliation.md`.

## Dependencies & Impact

### Depends on

- **TASK-1036** — sin el SoT + drift-guard + bridge, este rediseño sería un sweep de magic numbers.
  Con ellos, es cambiar 4 valores en un archivo y el guard confirma la paridad.

### Blocks / Impacts

- Blast-radius visual **amplio** (cada pantalla con títulos de página, botones, subheaders). Por eso
  flag + GVC + aprobación.

### Files owned

- `src/components/theme/typography-tokens.ts` (valores de `typographyScale` + `controlText`)
- `src/components/theme/typography-drift.test.ts` (pins actualizados)
- `DESIGN.md` (§Typography front-matter + prosa) + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.2
- (flag) `src/components/theme/*` o `@core/theme/axis-*`-style flag module

## Current Repo State

### Already exists

- TASK-1036: SoT `typographyScale`, `TYPOGRAPHY_VARIANT_BRIDGE`, `controlText`, drift-guard, mockup
  de referencia con comparación AS-IS vs TO-BE ya embebida.

### Gap

- Los valores son los AS-IS (no-op de TASK-1036). Falta aplicar el TO-BE + flag + GVC + sync docs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec — propuesta TO-BE

**Ladder AS-IS (11 distintos):** 12 · 13 · 14 · 15 · 16 · 17 · 18 · 20 · 24 · 28 · 32
**Ladder TO-BE (8 distintos):** 12 · 13 · 14 · 16 · 20 · 24 · 28 · 32 (se eliminan 15, 17, 18)

| Token (contrato) | variant MUI | AS-IS px | TO-BE px | Δ | Argumento |
|---|---|---|---|---|---|
| headline-display | h1 | 32 | 32 | — | hero, sin cambio |
| headline-lg | h2 | 24 | 24 | — | sin cambio |
| headline-md | h3 | 20 | 20 | — | sin cambio (raro en producto; colisiona con page-title 20 — aceptable, ver Open Q) |
| **page-title** | **h4** | **16** | **20** | **+4** | **arregla la inversión**: título de página ≥ section-title y > body |
| **section-title** | **h5** | **18** | **16** | **−2** | subhead bajo page-title; se distingue del body por peso (600 vs 400) |
| **subheader** | **subtitle1** | **15** | **14** | **−1** | elimina el paso 15 (no perceptible); = body-md |
| label-lg | (token SoT) | 16 | 16 | — | sin cambio |
| **label-md** | **button** | **15** | **14** | **−1** | elimina el paso 15; botones a 14px (Material Label-L / Stripe) |
| label-sm | (token SoT) | 13 | 13 | — | sin cambio (metadata/label chico) |
| body-lg | body1 | 16 | 16 | — | sin cambio |
| body-md | body2 | 14 | 14 | — | sin cambio (default denso) |
| body-sm | caption | 13 | 13 | — | sin cambio (metadata) |
| overline | overline | 12 | 12 | — | sin cambio |
| numeric-id | monoId | 14 | 14 | — | sin cambio |
| numeric-amount | monoAmount | 13 | 13 | — | sin cambio |
| kpi-value | kpiValue | 28 | 28 | — | sin cambio |
| control-md | `<Button medium>` | 15 | 14 | −1 | = label-md, elimina el 15 |
| **control-lg** | `<Button large>` | **17** | **16** | **−1** | saca el **17px bespoke** (único en el sistema); snap a 16 (= label-lg) |

**Net:** 4 tokens de `typographyScale` cambian valor (`page-title`, `section-title`, `subheader`,
`label-md`) + 2 de `controlText` (`md`, `lg`). **0 tokens nuevos, 0 renombrados.** Razón de la
elección de "resize, no add": agregar tokens **empeoraría** la proliferación; el fix correcto es
**menos pasos, más distintos** (modern-ui §1 restraint + §type-ramp). Line-heights ya están sanos
(namespace TASK-566 v1.3) — no se tocan.

**Jerarquía resultante (tamaño):** display 32 > h2 24 > h3/page-title 20 > section-title 16 (=
body-lg, distinto por peso) > body-md 14 > metadata 13 > overline 12. Sin inversiones.

## Scope

### Slice 0 — Aplicar TO-BE al SoT detrás de flag + actualizar drift-guard

- Cambiar los 4 valores de `typographyScale` + 2 de `controlText`, gated por flag (default OFF → AS-IS
  bit-for-bit). Actualizar los pins del `typography-drift.test.ts` para el set TO-BE (cuando flag ON).
- Mockup ya muestra AS-IS vs TO-BE (TASK-1036) — verificar que refleja el flip.

### Slice 1 — GVC sweep light+dark + aprobación visual

- Superficies clave: dashboards (page-title), cards/drawers (section-title), botones (label-md,
  control-lg), forms (subheader). Light + dark. Aprobación del operador.

### Slice 2 — Sync docs + flip

- DESIGN.md §Typography front-matter (valores) + prosa, V1 §3.2 (tabla), Delta de versión. `design:lint`
  0/0/1. Flip del flag (o cutover directo si el GVC confirma) + redeploy.

## Out of Scope

- Renombrar variantes MUI o tokens de contrato (el bridge de TASK-1036 los mantiene estables).
- Cambiar familias (Poppins/Geist) o el namespace `lineHeights`.
- Fluid/responsive type (clamp) — follow-up.
- Normalizar el root 13.125px de Vuexy — se evalúa aparte (ver Open Q).

## Rollout Plan & Risk Matrix

| Riesgo | Probabilidad | Mitigation | Señal |
|---|---|---|---|
| Cambio de tamaño altera densidad/layout en muchas pantallas | alta (es el punto) | flag + GVC sweep multi-superficie light+dark + aprobación operador | revisión visual GVC |
| page-title 20 = h3 20 (colisión Poppins) | media | h3 es raro en producto; opción h3→22 si molesta (Open Q) | GVC |
| Drift-guard rojo al cambiar pins | baja | actualizar pins + DESIGN.md + V1 en el mismo PR (parity 3-capas) | test/CI |

### Rollback

- Flag a OFF (AS-IS bit-for-bit) o revert PR + redeploy. <5 min, reversible.

## Acceptance Criteria

- [ ] `page-title` ≥ `section-title` y > body (inversión resuelta).
- [ ] Ladder reducido a 8 tamaños distintos (sin 15/17/18).
- [ ] 0 tokens nuevos, 0 renombrados; solo cambian los 4+2 valores.
- [ ] `typography-drift.test.ts` verde con los nuevos pins; runtime ≡ SoT ≡ DESIGN.md.
- [ ] `pnpm design:lint` 0/0/1.
- [ ] GVC light+dark mirado y aprobado por el operador.

## Verification

- `pnpm vitest run src/components/theme/typography-drift.test.ts`
- `pnpm design:lint` · `pnpm local:check`
- GVC: `/admin/design-system/typography/mockup` (flag ON/OFF) + superficies clave light+dark.

## Open Questions

- ¿`page-title` a **20** (propuesta, fija la inversión con mínimo churn de section-title) o subir más
  (22/24) y bajar section-title? La propuesta minimiza el churn.
- ¿`headline-md` (h3) sube a 22 para no colisionar con page-title 20, o se acepta (h3 es raro)?
- ¿`label-md`/botones a **14** (Material/Stripe) o mantener 15? 14 elimina el no-step pero achica
  texto de botón 1px en todo el portal.
- ¿`body-sm`/`caption` 13 y `body-md` 14 (1px de diferencia) se colapsan a 12·14 (Material) en una
  segunda pasada, o se mantiene 13 como tier de metadata? (No incluido en esta propuesta para acotar.)
- ¿Normalizar el root 13.125px de Vuexy a 16px? Fuera de scope; evaluar impacto aparte.
