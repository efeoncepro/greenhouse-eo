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

## Decisiones pre/durante ejecución (2026-06-06)

- **Derivación SoT sin copiar px del web** (Open Question resuelta): el SoT aporta el **set de roles + `fontWeight` + familia (display/text)**; el adapter posee su **rampa de tamaños** (`pt` PDF). NO se copian los px del web — la jerarquía de un doc legal denso (title/body ≈ 2.5x) no es proporcional a la del web (1.43x); un factor lineal regresaría los docs. El test pinea la derivación (peso + family-intent desde el SoT). Es exactamente la política canonizada "el SoT define los roles; cada adapter elige el tamaño apropiado a su medio".
- **Email DESCOPEADO por el operador**: Geist no renderiza confiable en clientes de mail (solo Apple Mail; Gmail/Outlook/Yahoo caen al fallback). El operador decidió **dejar los emails como están** ("se ven bien, me da miedo tocarlos"). Además la familia de email ya estaba centralizada (`src/emails/constants.ts` `EMAIL_FONTS` + `EmailLayout`), así que el gap de gobernanza ahí ya era marginal. No se creó `getEmailTypography()` ni se tocó ningún email.
- **Rol `titleLg`**: los docs financieros sobrios (comprobante, reporte) usan título en **Geist Bold** (familia text), NO el flourish Poppins de `pageTitle`/`display`. Se agregó el rol `titleLg` (text + bold, derivado de `fontWeights.bold`) para gobernarlos sin forzar cambio de familia.

## Scope

### Slice 1 — PDF typography adapter — ✅ DONE

- `getPdfTypography()` → roles `{ display, pageTitle, titleLg, sectionTitle, subtitle, label, body, bodyStrong, caption, micro, overline, numericId, numericAmount, kpiValue }` con `{ fontFamily (familia registrada), fontSize (pt), letterSpacing? }`. Peso + familia derivan del SoT; tamaño pt del medio. `pdfFamilyName(intent, weight)` mapea a la familia registrada — consume Geist SemiBold/ExtraBold de TASK-1040 (absorbe su Slice 2).
- 11 tests pinean la derivación del SoT. Archivo: `src/lib/finance/pdf/pdf-typography.ts`.

### Slice 2 — Migrar comprobante contractor (proof consumer) — ✅ DONE

- `generate-contractor-remittance-pdf.tsx` (TASK-960) consume `getPdfTypography()` (cero `'Geist Bold'` literal). Render real before/after verificado vía Read PDF: layout idéntico, sin reflow, neto levemente más prominente (kpiValue=ExtraBold por canon SoT). `REMITTANCE_TEMPLATE_VERSION` 2→3.

### Slice 3 (REMANENTE) — Migrar PDFs densos/legales/alto-tráfico — ⏳ requiere loop GVC real-case

- `generate-contractor-run-pdf.tsx` (reporte denso, tabla 8pt afinada para columnas A4 → riesgo de reflow), `document-pdf.tsx` (finiquito legal, 29 tamaños fraccionales = densidad fine-tuned), `generate-payroll-pdf.tsx` (recibo nómina, hoy Helvetica → Geist = cambio visible en cada payslip), reportes finance/payroll.
- Cada uno requiere **render con caso real + revisión skills payroll/finance + verificar no-reflow / no-regresión legal** (mirror TASK-863). Mismo posture de riesgo que llevó a dejar los emails intactos. NO migrar sin el loop.

### Slice 4 (DESCOPEADO) — ~~Email typography adapter~~

- Cancelado por decisión del operador (ver Decisiones). Emails quedan como están.

## Out of Scope

- Cambiar `register-fonts.ts` (ya tiene las familias).
- Web/charts (ya gobernados).
- Email (descopeado por el operador — emails intactos).

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| PDF legal se ve distinto post-migración | UI/legal | medium | GVC con caso real ANTES de cerrar (TASK-863 loop); densidad pt preservada | revisión visual + skill payroll/finance |
| Email se rompe en un cliente | UI | medium | inline + fallbacks web-safe; preview endpoint + test en clientes clave | preview QA |

Sin flag — additive (el adapter convive con los componentes no migrados). Rollback: revertir el componente migrado.

## Acceptance Criteria

- [x] `getPdfTypography()` con tests (deriva del SoT). _(email descopeado por operador)_
- [x] ≥1 componente PDF migrado + verificación de render real sin regresión (comprobante contractor).
- [ ] PDFs densos/legales/alto-tráfico migrados + loop GVC real-case _(remanente — Slice 3)_.
- [x] `pnpm tsc --noEmit` verde para los archivos tocados; tests focales verdes.

## Verification

- ✅ `pnpm vitest run src/lib/finance/pdf/pdf-typography.test.ts` (11) + remittance PDF test (5).
- ✅ Render real del comprobante (before/after, Read PDF) — sin reflow, layout idéntico.
- Pendiente (Slice 3): render real de finiquito/recibo/reportes + `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013/finiquito) antes de migrarlos.

## Closing Protocol

- Task queda **in-progress**: foundation (adapter) + proof consumer entregados; migración de PDFs densos/legales remanente (Slice 3) requiere loop real-case.
- [x] `docs/tasks/README.md` + registry sincronizados (in-progress).
- [ ] cerrar TASK-1040 (su Slice 2 — familias 600/800 — ya tiene consumidor canónico vía `pdfFamilyName`; el cierre formal de TASK-1040 puede hacerse ahora).
- [x] `Handoff.md` / `changelog.md`.

## Follow-ups

- **Slice 3**: migrar finiquito + recibo nómina + reporte de corrida + reportes finance al adapter, con loop GVC real-case (render + skills payroll/finance + no-reflow). Promovible a task derivada si el operador prefiere trackearlo aparte.
- Si emergen más medios (export Excel, certificados), reusar el patrón SSOT + adapter.
- Email: si en el futuro se quiere gobernar la escala de email desde el SoT, hacerlo con Poppins (display) + body system-safe (Geist NO en email) — decisión ya tomada, solo falta ejecutar si se reabre.
