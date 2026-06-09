# TASK-1040 — Tipografía PDF: familias Geist SemiBold (600) + ExtraBold (800)

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `refinement`
- Epic: `none`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (local-first, additive)
- Legacy ID: `TASK-1038 FU2`

## Summary

El SoT de tipografía (TASK-1036/1038) usa Geist en pesos 400/500/600/700/800. El web los carga todos (`next/font/google`). Pero el render de **PDF** (`src/lib/finance/pdf/register-fonts.ts`) registra Geist **por nombre de familia** (`Geist`=400 / `Geist Medium`=500 / `Geist Bold`=700) y **le faltan las familias SemiBold(600) y ExtraBold(800)** — así un componente PDF que quiera esos pesos los aproxima con Bold/Medium. Esta task agrega las 2 familias para que el PDF pueda alcanzar paridad de peso con el web.

## Why This Task Exists

Corrige un claim inexacto de TASK-1038: NO es que el PDF "caiga a Helvetica" (eso pasa solo con familias **sin registrar**). El modelo de `register-fonts.ts` es **family-name-based, no weight-based**: un `<Text style={{ fontFamily: 'Geist Bold' }}>` resuelve a la familia registrada con ese nombre. No existe `Geist SemiBold` ni `Geist ExtraBold`, así que los pesos 600/800 del SoT **no tienen familia que referenciar** en PDF → se aproximan con el peso registrado más cercano. Es un **refinamiento de paridad**, no un bug de runtime. El web no tiene gap.

## Goal

- Registrar 2 familias nuevas: `Geist SemiBold` (600) y `Geist ExtraBold` (800).
- Obtener los `.ttf` del mismo origen Google Fonts / gwfh que los actuales (SIL OFL 1.1).
- Dejar disponibles las familias para que una task derivada (o este mismo flujo) migre los componentes PDF que ameriten 600/800 (section-titles, KPI hero, labels).

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` §Typography + "Brand assets — Efeonce"
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 (PDF/email = SSOT semántico + adapter por medio)
- `CLAUDE.md` "Typography System" + "Efeonce brand assets"

Reglas obligatorias:

- El SoT semántico es uno; el PDF es un **adapter** (no redefine la escala, mapea pesos a familias registradas).
- `.ttf` **locales** (no URL remota): el render PDF corre en Cloud Run y debe ser offline-safe. `react-pdf` acepta `Font.register({ src: 'https://…' })` pero introduce dependencia de red por render = riesgo de resiliencia. Local es lo robusto.
- `tryRegister` ya degrada con `console.warn` si un `.ttf` falta — no rompe el PDF.

## Dependencies & Impact

### Depends on

- `src/lib/finance/pdf/register-fonts.ts` (registro canónico)
- `src/assets/fonts/` (Geist-Regular/Medium/Bold.ttf ya presentes)

### Blocks / Impacts

- Habilita migración de componentes PDF a pesos 600/800 (task derivada o slice 2).

### Files owned

- `src/lib/finance/pdf/register-fonts.ts`
- `src/assets/fonts/Geist-SemiBold.ttf` (nuevo)
- `src/assets/fonts/Geist-ExtraBold.ttf` (nuevo)

## Current Repo State

### Already exists

- `register-fonts.ts` registra `Geist` (400), `Geist Medium` (500), `Geist Bold` (700) + Poppins display + DM Sans deprecated.
- `ensurePdfFontsRegistered` (cache + `tryRegister` que swallow-ea fallos).

### Gap

- No hay familias `Geist SemiBold` (600) ni `Geist ExtraBold` (800).
- Los `.ttf` 600/800 no están en `src/assets/fonts/`.

## Scope

### Slice 1 — Registrar las 2 familias

- Obtener `Geist-SemiBold.ttf` (600) + `Geist-ExtraBold.ttf` (800) de Google Fonts (gwfh helper, SIL OFL 1.1).
- Agregar a `src/assets/fonts/`.
- `tryRegister('Geist SemiBold', …)` + `tryRegister('Geist ExtraBold', …)` en `register-fonts.ts`.
- Verificar que un PDF de prueba renderiza con las nuevas familias (visual).

### Slice 2 — (derivada/opcional) Migrar componentes PDF

- Identificar componentes PDF que hoy aproximan 600/800 con Bold/Medium (section-titles, KPI hero).
- Migrar a las nuevas familias donde el SoT lo indique.

## Out of Scope

- El web (no tiene gap — `next/font` carga 400-800).
- Cambiar el modelo family-name-based de `register-fonts.ts`.
- URL remota de fonts (riesgo de resiliencia — local es canónico).

## Rollout Plan & Risk Matrix

N/A — additive change. `tryRegister` degrada graceful si un `.ttf` falta; registrar familias nuevas no afecta los PDFs existentes (siguen referenciando sus familias actuales). Sin flag, immediate cutover. Rollback: revertir el commit (las familias nuevas dejan de registrarse; nadie las referencia aún).

## Acceptance Criteria

- [ ] `Geist-SemiBold.ttf` + `Geist-ExtraBold.ttf` en `src/assets/fonts/`.
- [ ] `register-fonts.ts` registra `Geist SemiBold` + `Geist ExtraBold`.
- [ ] Un PDF de prueba renderiza con las familias nuevas (evidencia visual).
- [ ] `pnpm lint` + `pnpm tsc --noEmit` verdes.

## Verification

- `pnpm tsc --noEmit`
- `pnpm lint`
- Render manual de un PDF que use `fontFamily: 'Geist SemiBold'`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` si aplica

## Follow-ups

- Slice 2 (migrar componentes PDF) puede ser task derivada si el blast-radius lo amerita.
