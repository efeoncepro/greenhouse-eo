# TASK-1048 — AXIS semantic color token gaps (contrast-safe success + chart pos/neg + surface)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1048-axis-semantic-color-token-gaps`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra los gaps de token de color que dejó la lint rule `greenhouse/no-hardcoded-hex-color` (9 warnings residuales tras el sweep seguro). El más importante: NO existe un verde "success" AA-safe para **texto sobre blanco** — todo el ramp AXIS success falla 4.5:1 (el más oscuro `success-900 #1e9553` = 3.83:1), por eso `#2E7D32` (5.13:1) está hardcodeado en ~8 lugares (PDFs/Excel `NET_ACCENT` + UI de montos). Agrega los tokens gobernados en la **capa semántica AXIS** + mapea los consumidores, y promueve la rule a `error`.

## Why This Task Exists

El sweep de TASK (commit `b74f73cae`) tokenizó lo exacto-seguro (29 → 9 warnings) pero dejó 9 colores custom que **no mapean a ningún token existente** sin cambiar el color real (regresión visual). Mapearlos a ojo está prohibido (Solution Quality Contract + design-system-governance). Son gaps reales del sistema de tokens:

- **Verde success AA-safe (texto/blanco):** el ramp AXIS `success` topa en `success-900 #1e9553` = **3.83:1** sobre blanco (`success-500 #28c76f` = 2.21:1). Ningún shade llega a 4.5:1 para texto normal. `#2E7D32` (5.13:1 ✅) es AA pero **no pertenece a AXIS** y está hardcodeado en ~8 sitios. Es el **mismo gap ya documentado para error** en `src/@core/theme/axis-semantic.ts` ("the error ramp needs an additional dark step"). El fix canónico es un **step oscuro nuevo reconciliado con AXIS upstream** (`success-1000` ≈ AA), no mapear a un shade que falla.
- **Chart cashflow positive/negative:** `#3DBA5D` (verde "entra") / `#FF4D49` (rojo "sale") en `AccountDetailDrawer` son defaults de chart sin token; distintos del semántico de marca (success lime / error magenta cambiarían el tono). Necesitan tokens de chart + check daltonismo (rojo/verde).
- **Surface tag blue `#eaf3fc` (×2):** fondo de tag repetido literal en varios `GH_COLORS.service[].bg`; falta un token con nombre.
- **One-offs:** `#2d6a4f` (splash de `auth/landing/loading`) y `#666` (texto de link en `ProductCatalogDetailView` → mapear a `text.secondary`, ya gobernado).

Drift detectado de paso (ya corregido): la skill `design-system-governance` afirmaba `customColors.successContrast` como token existente — **no existe** (ni los `customColors.success/warning/error/info/brand` que también listaba; removidos en TASK-1034). Sección 4 de la skill corregida en este ciclo.

## Goal

- Un token semántico canónico para "success ink" AA-safe (texto verde sobre blanco) en la capa AXIS, ≥4.5:1 verificado en light + darkSemi.
- Tokens de chart `positive`/`negative` para cashflow (con check de daltonismo).
- Token de surface para el tag blue `#eaf3fc`.
- Los ~8 consumidores de `#2E7D32` + los 9 warnings residuales mapeados a tokens (web por theme; PDF/Excel por el patrón SSOT + adapter por medio).
- `greenhouse/no-hardcoded-hex-color` promovida a `error` con baseline 0.
- **Los tokens nuevos quedan documentados en la página viva de colores del design-system** (`/admin/design-system` referencia AXIS + `/admin/design-system/semantic-colors`) + DESIGN.md/V1, para no perderlos del mapa.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`
- `DESIGN.md` (raíz, contrato agente, lint-gated TASK-764)

Reglas obligatorias:

- Paridad de 3 capas: DESIGN.md + V1 + `mergedTheme.ts` en el mismo PR (`pnpm design:lint` 0/0).
- Semánticos fluyen del **AXIS SoT** (`axis-tokens.ts` ramp → `axis-semantic.ts`), NO `customColors` ad-hoc (eliminados en TASK-1034) NI `GH_COLORS`.
- Verificar contraste en `light` + `darkSemi` (a11y-architect: texto ≥4.5:1, no color-only).
- Skill que gobierna: `design-system-governance`. Para charts pos/neg coordinar con `dataviz-design` (daltonismo).

## Normative Docs

- `src/@core/theme/axis-tokens.ts` (ramps AXIS) — `axisRamp.success` topa en 900 `#1e9553`.
- `src/@core/theme/axis-semantic.ts` — precedente del gap de error ("needs an additional dark step", `error.main` = error-800 `#cc3d41`).

## Dependencies & Impact

### Depends on

- Reconciliación con AXIS Figma upstream (fileKey `yyMksCoijfMaIoYplXKZaR`) para el step oscuro nuevo de success (out-of-band, ver abajo).

### Blocks / Impacts

- Promoción de `greenhouse/no-hardcoded-hex-color` a `error` (hoy `warn`).
- Consumidores de `#2E7D32`: `RemittanceAdviceViewer`, `NotionConnectPanel`, `ContractorPaymentsWorkbenchView`, `generate-contractor-remittance-pdf`, `generate-contractor-run-pdf`, `generate-contractor-run-excel`, `contracting-document-pdf`, `generate-payroll-excel`, mockup `SemanticColorsMockupView`.

### Files owned

- `src/@core/theme/axis-tokens.ts` (si se agrega step nuevo al ramp)
- `src/@core/theme/axis-semantic.ts`
- `src/components/theme/mergedTheme.ts`
- `DESIGN.md` + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `eslint.config.mjs` (promover rule a error)
- `src/config/greenhouse-nomenclature.ts` (token `GH_COLORS.surface.tagBlue` / chart pos-neg, si aplica)
- `src/views/greenhouse/admin/design-system/DesignSystemView.tsx` + `src/views/greenhouse/admin/semantic-colors/mockup/SemanticColorsMockupView.tsx` (documentar tokens en el mapa de colores)
- `.claude/skills/design-system-governance/SKILL.md` (sección 4, cuando el token exista)
- los consumidores listados arriba

## Current Repo State

### Already exists

- Lint rule `greenhouse/no-hardcoded-hex-color` (warn) + tests + allowlists (commit `7098b1e66`).
- Sweep seguro de 20 hex → tokens exactos (commit `b74f73cae`), 29 → 9 warnings.
- Capa AXIS semántica con precedente de "dark step" para error (`axis-semantic.ts`).
- `GH_COLORS.brand.midnightNavyHover` agregado en el sweep.

### Gap

- No hay token success AA-safe para texto sobre blanco (ramp topa en 3.83:1).
- No hay tokens chart positive/negative ni surface tag-blue.
- 9 warnings residuales + ~8 hardcodes `#2E7D32`.
- `axis-semantic.ts` no tiene step success-1000 AA.

## Scope

### Slice 1 — Token success-ink AA-safe (AXIS)

- Decidir valor canónico: idealmente `axisRamp.success[1000]` nuevo reconciliado con AXIS (≥4.5:1 sobre blanco); valor interim `#2E7D32` (5.13:1) si AXIS upstream tarda.
- Exponerlo como `theme.palette.success.dark` (o token semántico equivalente) en `axis-semantic.ts` + `mergedTheme.ts`.
- Paridad DESIGN.md + V1 + `design:lint` 0/0. Verificar light + darkSemi.

### Slice 2 — Mapear consumidores web de `#2E7D32`

- `RemittanceAdviceViewer`, `NotionConnectPanel`, `ContractorPaymentsWorkbenchView` → `theme.palette.success.dark`.

### Slice 3 — Adapter PDF/Excel (`NET_ACCENT`)

- Centralizar el verde en el SSOT semántico + adapter por medio (PDF react-pdf, Excel argb). Reemplazar los `NET_ACCENT = '#2E7D32'` y `FF2E7D32` por el token derivado (no re-hardcodear). Converge con TASK-1043 (adapters PDF/email).

### Slice 4 — Chart pos/neg + surface + one-offs

- `#3DBA5D`/`#FF4D49` → tokens chart positive/negative (coordinar dataviz-design, daltonismo).
- `#eaf3fc` → token surface tag-blue.
- `#2d6a4f` (splash) → token o decisión; `#666` → `text.secondary`.

### Slice 5 — Promover rule a error

- `greenhouse/no-hardcoded-hex-color`: `warn` → `error` con baseline 0.

### Slice 6 — Documentar los tokens en el mapa de colores (no perderlos)

- Renderizar/documentar los tokens nuevos (success-ink AA, chart positive/negative, surface tag-blue) en la **página viva de colores del design-system**: `/admin/design-system` (referencia AXIS, `DesignSystemView`) + `/admin/design-system/semantic-colors` (`SemanticColorsMockupView` — que además hoy hardcodea `#2E7D32`, así lo consume Y lo documenta).
- Reflejar en `DESIGN.md` (sección color) + `GREENHOUSE_DESIGN_TOKENS_V1.md` el token AA-safe + su uso (texto verde sobre blanco) y el racional del gap.
- Actualizar la skill `design-system-governance` sección 4: pasar `successContrast` de "gap pendiente" a token real con su valor + contraste.

## Out of Scope

- Refactor general de `GH_COLORS` o de la capa AXIS más allá de estos tokens.
- Multi-brand (V1.5).

## Detailed Spec

Contrastes medidos sobre blanco (`#ffffff`): success-500 `#28c76f` 2.21:1 · success-900 `#1e9553` 3.83:1 · `#2E7D32` 5.13:1. Los montos en UI son `h6`/700 a 14px → "texto normal" (el umbral large/bold es ≥18.66px bold), así que requieren 4.5:1 — confirma que ningún shade AXIS actual sirve.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (token) → Slice 2/3/4 (consumidores) → Slice 5 (promote a error). Slice 5 MUST ship al final (con baseline 0) o rompe el build.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambio de tono visual al pasar `#2E7D32` → shade AXIS distinto | UI / PDF | medium | Verificar contraste + GVC en superficies (recibos, finanzas); si el valor canónico difiere de `#2E7D32`, es cambio deliberado documentado | revisión GVC + `design:lint` |
| Chart rojo/verde inaccesible (daltonismo) | UI / dataviz | medium | Coordinar dataviz-design; agregar patrón/ícono no-color-only | revisión a11y |
| Drift 3-capa | design system | low | `design:lint` + drift-guard en el mismo PR | `pnpm design:lint` |

### Feature flags / cutover

- Sin flag — cambio aditivo de tokens + reemplazo de hardcodes. Cutover inmediato por slice.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | revert PR | <5 min | sí |
| Slice 5 | bajar rule a `warn` | <5 min | sí |

### Production verification sequence

1. `design:lint` 0/0 + drift-guard verde local.
2. GVC de las superficies con `#2E7D32` (recibos PDF, finanzas, contractor) light + dark.
3. Deploy staging + revisión visual.
4. Promote rule a error solo con baseline 0.

### Out-of-band coordination required

- **AXIS Figma:** agregar el step oscuro success AA-safe al ramp (mismo pedido pendiente que el de error). Si no se resuelve upstream, usar valor interim `#2E7D32` documentado.

## Acceptance Criteria

- [ ] Token success AA-safe (≥4.5:1 light + darkSemi) en la capa AXIS, con paridad 3-capa + `design:lint` 0/0.
- [ ] Tokens chart positive/negative + surface tag-blue definidos.
- [ ] Los ~8 consumidores de `#2E7D32` + los 9 warnings residuales mapeados a tokens (web + PDF/Excel adapter).
- [ ] `greenhouse/no-hardcoded-hex-color` en `error` con baseline 0.
- [ ] Contraste verificado y evidencia GVC de superficies afectadas.
- [ ] Tokens nuevos documentados en `/admin/design-system` + `/admin/design-system/semantic-colors` + DESIGN.md/V1 (no perderlos del mapa) + skill `design-system-governance` §4 actualizada.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm design:lint`
- `pnpm test:lint-rules`
- GVC de recibos/finanzas/contractor (light + dark)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1043 adapters PDF/email)
- [ ] skill `design-system-governance` actualizada cuando el token exista (reflejar `successContrast` como token real, no gap)

## Follow-ups

- Reconciliar el ramp AXIS upstream (success + error necesitan step oscuro AA) — decisión de diseño con AXIS Figma.

## Open Questions

- ¿El valor canónico del success-ink es el `#2E7D32` actual o un verde AXIS-coherente nuevo (success-1000)? Depende de la reconciliación con AXIS Figma.
