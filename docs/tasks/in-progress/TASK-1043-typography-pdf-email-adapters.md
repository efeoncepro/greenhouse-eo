# TASK-1043 — Adapters de tipografía PDF + email (un SSOT semántico + adapter por medio)

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1043-typography-pdf-email-adapters`
- Legacy ID: `TASK-1038 FU2 (PDF) + nuevo (email)`

## Summary

Realiza la política canonizada **"PDF/email = un SSOT semántico + adapter por medio"**: hoy el web (variantes MUI) y los charts (wrappers) consumen el SoT, pero **PDF y email hardcodean sus tamaños** (PDF: familias centralizadas en `register-fonts.ts` pero `fontSize` por componente; email: estilos inline, nada deriva del SoT). Esta task construye un **adapter de tipografía PDF** + un **adapter de tipografía email** que derivan la escala de roles del SoT, y migra los componentes clave a consumirlos. Cierra el último medio sin gobernanza desde la fuente única. Absorbe el Slice 2 pendiente de TASK-1040 (usar las familias `Geist SemiBold`/`ExtraBold` ya registradas).

## Why This Task Exists

El SoT (`typographyScale`) gobierna web + charts. PDF/email son el 3er y 4to "medio" sin adapter → cuando la escala cambia, no se actualizan. NO tienen cascada CSS (react-pdf `StyleSheet`, email inline), así que la gobernanza es un **adapter opt-in** (no enforced), y los **tamaños difieren por medio** (PDF en `pt` para docs legales densos; email en `px` con fallbacks web-safe). El SoT define los **roles semánticos**; cada adapter elige el tamaño apropiado a su medio.

## Goal

- `getPdfTypography()` — react-pdf styles por rol semántico (display/page-title/section-title/body/caption/numeric), en `pt`, familias registradas (incl. SemiBold/ExtraBold de TASK-1040).
- `getEmailTypography()` — objetos de estilo inline por rol, en `px` + fallbacks web-safe.
- Migrar los componentes clave: PDF (finiquito, recibo de nómina, comprobante contractor, reportes) + emails transaccionales.
- Ambos derivan la escala de roles del SoT (cero re-hardcode); cuando cambia el SoT, se regenera el adapter.

## Architecture Alignment

- `DESIGN.md` §Typography ("PDF + email = one semantic SSOT + adapter per medium") + V1 §3
- `CLAUDE.md` "Typography System" + "Efeonce brand assets" (footer/slogan PDF) + "AI providers — texto/LLM" (N/A)
- Patrón fuente: el charts helper `getChartTypographyFromTheme` (single-source JS) + `register-fonts.ts` (familias) + el precedente de color `axisSemanticHex` (SSOT + adapter por medio)

Reglas:

- El SoT define los roles; el adapter PDF elige `pt`, el email `px`. NO copiar los px del web.
- PDF: usar las familias registradas por nombre (`Geist`, `Geist SemiBold`, `Geist Bold`, `Geist ExtraBold`, Poppins display) — no `fontWeight` numérico.
- Email: inline styles + fallbacks web-safe (Arial/Helvetica) porque los clientes no cargan fuentes custom de forma fiable; rem NO es confiable en email → px.
- Reusar el footer/slogan PDF canónicos (`EfeoncePdfFooter`, `EfeonceSloganPdf`).

## Dependencies & Impact

### Depends on

- `src/components/theme/typography-tokens.ts` (SoT — roles)
- `src/lib/finance/pdf/register-fonts.ts` (familias, incl. SemiBold/ExtraBold de TASK-1040)
- Componentes PDF: `src/lib/payroll/final-settlement/document-pdf.tsx`, `generate-payroll-pdf.tsx`, `generate-contractor-remittance-pdf.tsx`, reportes finance/payroll
- Emails: `src/views/emails/*` (templates transaccionales)

### Blocks / Impacts

- Cierra TASK-1040 Slice 2 (migración de componentes PDF).
- Completa "todo desde una sola fuente" (web ✓ / charts ✓ / PDF / email).

### Files owned

- `src/lib/finance/pdf/pdf-typography.ts` (nuevo — adapter PDF)
- `src/lib/email/email-typography.ts` (nuevo — adapter email)
- Componentes PDF + email migrados

## Current Repo State

### Already exists

- SoT de tipografía (TASK-1036/1038), familias PDF registradas (TASK-1040 incl. 600/800).
- Footer/slogan PDF canónicos (`EfeoncePdfFooter`, `EfeonceSloganPdf`).
- `register-fonts.ts` (family-name-based).

### Gap

- No hay adapter de escala de roles para PDF ni email.
- Componentes PDF/email hardcodean `fontSize`.

## Scope

### Slice 1 — PDF typography adapter

- `getPdfTypography()` → `{ display, pageTitle, sectionTitle, body, caption, numeric, … }` con `{ fontSize (pt), fontFamily (familia registrada), fontWeight, … }` derivados del SoT (mapeo rem→pt para densidad de doc).
- Tests (deriva del SoT, no hardcodea).

### Slice 2 — Migrar componentes PDF

- Finiquito, recibo de nómina, comprobante contractor, reportes → consumir `getPdfTypography()`. Cierra TASK-1040 Slice 2 (familias 600/800).
- GVC/visual review de cada PDF (loop con caso real, mirror TASK-863).

### Slice 3 — Email typography adapter + migración

- `getEmailTypography()` → objetos de estilo inline por rol (`px` + fallback). Migrar emails transaccionales. Preview endpoint para QA.

## Out of Scope

- Cambiar `register-fonts.ts` (ya tiene las familias).
- Web/charts (ya gobernados).

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| PDF legal se ve distinto post-migración | UI/legal | medium | GVC con caso real ANTES de cerrar (TASK-863 loop); densidad pt preservada | revisión visual + skill payroll/finance |
| Email se rompe en un cliente | UI | medium | inline + fallbacks web-safe; preview endpoint + test en clientes clave | preview QA |

Sin flag — additive (el adapter convive con los componentes no migrados). Rollback: revertir el componente migrado.

## Acceptance Criteria

- [ ] `getPdfTypography()` + `getEmailTypography()` con tests (derivan del SoT).
- [ ] Componentes PDF clave migrados + GVC con caso real sin regresión.
- [ ] Emails transaccionales clave migrados + preview QA.
- [ ] `pnpm test` + `pnpm tsc --noEmit` + `pnpm build` verdes.

## Verification

- `pnpm test src/lib/finance/pdf src/lib/email`
- Render real de PDFs (finiquito, recibo, comprobante) + preview de emails
- `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013/finiquito)

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + registry sincronizados
- [ ] cerrar TASK-1040 (su Slice 2 queda absorbido aquí)
- [ ] `Handoff.md` / `changelog.md`

## Follow-ups

- Si emergen más medios (export Excel, certificados), reusar el patrón SSOT + adapter.
