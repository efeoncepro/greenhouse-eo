# EPIC-004 — Typography Unification: Poppins Display + Inter Product UI

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto` (~4-5 días calendario)
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Owner: `unassigned`
- Branch: `epic/EPIC-004-typography-unification`

## Summary

Unificar el sistema tipográfico de Greenhouse EO a **Poppins** como display controlado (`h1-h4`) + **Inter** como tipografía base del producto (body, forms, tablas, controles, chips, labels, KPIs, metadata). Eliminar **DM Sans** del portal. Eliminar el uso literal de `fontFamily: 'monospace'` y conservar `monoId` / `monoAmount` como variants semánticos respaldados por **Inter + tabular nums**, no por una tercera familia técnica.

## Why This Epic Exists

El programa original quedó redactado sobre una migración a `Geist`, pero el repo hoy sigue usando `DM Sans` y la decisión de producto cambió a **Inter**. Eso obliga a corregir no solo el destino de la migración, sino también los fundamentos del epic:

1. `GREENHOUSE_DESIGN_TOKENS_V1.md` declara una política que el theme actual no cumple: Poppins está restringida en teoría, pero `mergedTheme.ts` la aplica a `h1-h6`, `button`, `overline` y `kpiValue`.
2. El portal mantiene `fontFamily: 'monospace'` en `monoId` / `monoAmount` y en componentes sueltos, contradiciendo el propio contrato de tokens.
3. La migración a `Inter` deja un sistema más simple y gobernable que el draft `Geist`:
   - evita una tercera familia adicional para IDs/montos
   - conserva mejor el principio operativo de “máximo dos familias activas por surface”
   - facilita consistencia entre portal, email, PDF, Figma y skills
   - se alinea con una tipografía de producto más flexible y ubicua para un runtime enterprise de largo plazo

## Outcome

- Poppins aparece exclusivamente en `h1-h4` y momentos display realmente intencionales.
- Inter reemplaza a DM Sans como base del producto autenticado.
- `monoId` y `monoAmount` sobreviven como variants semánticos, pero usando Inter con `fontVariantNumeric: 'tabular-nums'` y ajustes de tracking/peso, no una familia monospace separada.
- `fontFamily: 'monospace'` queda prohibido en theme, componentes, emails y PDFs.
- Emails y PDFs convergen a la misma dupla `Inter + Poppins`.
- Skills, docs y librería de diseño dejan de empujar `DM Sans` o el draft `Geist`.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`

Reglas transversales:

- Poppins solo en `h1-h4`, salvo excepciones explícitas y documentadas.
- Inter es el default implícito del producto; no debería hardcodearse inline.
- `monoId` / `monoAmount` siguen siendo la API canónica para IDs y montos, pero sin depender de monospace.
- `src/@core/theme/*` no se toca; el override vive en `src/components/theme/mergedTheme.ts`.

## Child Tasks

- `TASK-566` — foundation del cambio: `layout.tsx`, `mergedTheme.ts`, tokens doc y decisión base Inter.
- `TASK-567` — sweep de overrides hardcodeados + regla ESLint para prevenir drift futuro.
- `TASK-568` — surfaces de delivery: emails, PDFs y assets tipográficos hoy existentes en el repo.
- `TASK-569` — validación final: regresión visual, Figma, skills, docs y cierre del programa.

## Existing Related Work

- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` queda parcialmente supersedida por `TASK-567`.
- `src/app/layout.tsx` hoy carga `DM Sans + Poppins`.
- `src/components/theme/mergedTheme.ts` hoy usa `DM Sans`, Poppins excesiva y variants `mono*` con monospace.
- `src/lib/finance/pdf/register-fonts.ts` y `src/lib/finance/pdf/tokens.ts` ya existen y deben reutilizarse, no reemplazarse por un helper inventado en paralelo.
- `.claude/skills/modern-ui/SKILL.md` hoy fija explícitamente “no Inter”; debe corregirse en `TASK-569`.

## Exit Criteria

- [ ] `src/app/layout.tsx` carga `Inter + Poppins` y elimina `DM Sans`
- [ ] `src/components/theme/mergedTheme.ts` usa Inter como base y restringe Poppins a `h1-h4`
- [ ] `monoId` / `monoAmount` ya no usan `fontFamily: 'monospace'`
- [ ] `GREENHOUSE_DESIGN_TOKENS_V1.md §3` refleja la política `Poppins + Inter`
- [ ] `src/emails/**` y `src/lib/finance/pdf/**` convergen a la nueva política
- [ ] La rule ESLint bloquea hardcodes nuevos de `fontFamily` y el uso literal de monospace
- [ ] Figma, skills y docs dejan de mencionar `DM Sans` como baseline y dejan de empujar `Geist` como destino

## Non-goals

- No eliminar Poppins por completo.
- No introducir una tercera familia nueva para “mono” salvo que discovery pruebe que Inter no cubre el caso.
- No rediseñar componentes o cambiar spacing/color/radius fuera de lo necesario para absorber el cambio tipográfico.
- No tocar branding de logos, isotipos o piezas externas fuera del portal, email y PDF.

## Risk Inventory

| Riesgo | Mitigación |
|---|---|
| Wrap/overflow distinto entre Inter y DM Sans | `TASK-569` con Playwright + sweep manual |
| Drift entre portal y PDF/email | `TASK-568` usa los artefactos reales ya presentes (`register-fonts.ts`, `tokens.ts`, `src/emails/**`) |
| Futuros agentes siguen empujando DM Sans o “no Inter” | `TASK-569` actualiza skills y docs operativas |
| `monoId` / `monoAmount` pierden legibilidad al dejar monospace | validar con tabular nums, peso y spacing antes de introducir otra familia |

## Delta 2026-05-01

- El epic fue realineado desde el draft `Geist` hacia `Inter` por decisión explícita del usuario.
- Se corrigió el contrato para trabajar con los artefactos reales del repo y preservar un sistema de dos familias (`Poppins + Inter`) salvo hallazgo técnico fuerte en discovery.
