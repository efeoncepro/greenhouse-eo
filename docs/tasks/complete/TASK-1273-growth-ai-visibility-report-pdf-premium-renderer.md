# TASK-1273 — Growth AI Visibility: Report PDF Premium Renderer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|communications`
- Blocked by: `none`
- Branch: `task/TASK-1273-growth-ai-visibility-report-pdf-premium-renderer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa un renderer PDF premium del informe AI Visibility como tercer render adapter del report artifact (junto a web y print-HTML), consumiendo el mismo `ReportArtifactModel`. Es la deuda conocida declarada por TASK-1252: hoy el variant `attachment` es print-HTML estático; falta un PDF real (vectorial, paginado, fuentes embebidas) para el adjunto de TASK-1250.

## Why This Task Exists

TASK-1252 entregó el report artifact design system con dos render adapters: web (`AiVisibilityReportArtifact`) y print/attachment (`AiVisibilityReportPrint`, HTML estático print-safe). El attachment V1 es print-HTML, no un PDF real: no garantiza paginación A4, fuentes embebidas ni fidelidad cross-cliente cuando TASK-1250 lo adjunte por email. El renderer PDF premium cierra esa brecha sin re-decidir el modelo, la disclosure matrix ni el copy (ya canónicos en TASK-1252).

## Goal

- Render PDF real del informe (react-pdf u opción equivalente server-side) consumiendo `ReportArtifactModel` sin recalcular score/gaps/tendencia.
- Paridad de contenido y disclosure con el adapter print-HTML (mismo variant `attachment`: sin trend ni engine snapshot; público-safe).
- Charts estáticos (SVG/imagen) o tablas; documento estático sin JS de runtime ni Recharts vivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 report artifact + Delta 2026-06-27 (Report Artifact Design System).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un modelo, muchos render adapters.

Reglas obligatorias:

- El PDF renderiza exclusivamente desde `ReportArtifactModel` (vía `modelFromPublicReport(report, 'attachment')`); NUNCA desde `GraderReport` interno ni raw provider data.
- Respeta la disclosure matrix del variant `attachment`: sin `trend`, sin `engineSnapshot`; público-safe (sin `providerFindings`/`accuracyFindings`/raw text/IDs internos/claims de ranking garantizado).
- Marca desde `src/config/efeonce-brand.ts`; NUNCA `AxisWordmark` en el artefacto cliente/público/PDF.
- Tipografía/colores vía tokens (no HEX/px crudos); en react-pdf, mapear los tokens a estilos PDF, no hardcodear.

## Normative Docs

- `docs/tasks/complete/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
- `docs/tasks/to-do/TASK-1250-growth-ai-visibility-email-report-delivery.md`
- `src/components/growth/ai-visibility/report-artifact/model.ts`
- `src/components/growth/ai-visibility/report-artifact/print/AiVisibilityReportPrint.tsx`

## Dependencies & Impact

### Depends on

- `TASK-1252` — report MODEL + disclosure matrix + copy + print adapter (completa).
- `@react-pdf/renderer` — ya instalado en el repo (usado por recibos/PDFs institucionales).

### Blocks / Impacts

- Mejora el adjunto de `TASK-1250` (email report delivery): el attachment pasa de print-HTML a PDF real.

### Files owned

- `src/components/growth/ai-visibility/report-artifact/pdf/**` (nuevo)
- `docs/tasks/to-do/TASK-1273-growth-ai-visibility-report-pdf-premium-renderer.md`

## Current Repo State

### Already exists

- `src/components/growth/ai-visibility/report-artifact/model.ts` — `ReportArtifactModel` + adapters + disclosure matrix.
- `src/components/growth/ai-visibility/report-artifact/print/AiVisibilityReportPrint.tsx` — adapter print-HTML estático (referencia de contenido/secciones).
- `@react-pdf/renderer` activo en el repo (recibos payroll / PDFs).

### Gap

- No existe un renderer PDF real del informe; el attachment V1 es print-HTML, no garantiza paginación/fuentes embebidas/fidelidad cross-cliente.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: recipient del email (lead público) y cliente que descarga el informe.
- Momento del flujo: cuando TASK-1250 adjunta el informe completo, o cuando un consumer ofrece "Descargar PDF".
- Resultado perceptible esperado: un PDF paginado fiel al Executive Report Atlas aprobado, legible offline e imprimible.
- Friccion que debe reducir: HTML adjunto que se renderiza distinto por cliente; falta de un documento portable real.
- No-goals UX: cambiar el modelo, la disclosure, el copy o la dirección visual aprobada; agregar interacción.

### Surface & system decision

- Surface: render adapter PDF del report artifact (tercer target junto a web y print-HTML).
- Composition Shell: `no aplica` (documento PDF, no surface web).
- Primitive decision: `extend` — tercer adapter del sistema feature-local existente; reusa el modelo + disclosure + copy de TASK-1252.
- Adaptive density / The Seam: `no aplica` (layout PDF fijo paginado).
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: `src/lib/copy/growth.ts` (`GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT`, ya existente).
- Access impact: `none` — acceso/token vive en consumers (TASK-1250).

**Implementation mapping:** secciones del variant `attachment` (verdict, levels, primaryGap, dimensions, aeoSignals, competitiveSov, recommendations, provenance, disclaimer) → componentes react-pdf; charts → SVG/imagen estática o tabla; tokens → estilos PDF.

**GVC scenario plan:** N/A para GVC web (es PDF). Verificación = render del PDF contra fixtures `attachment` (ready + partial) + inspección visual del archivo + paridad de contenido con el print adapter.

**Design decision log:** hereda la dirección aprobada de TASK-1252 (Executive Report Atlas + Print-Native Signal Dossier). No re-decide visual; documenta solo decisiones específicas de react-pdf (fuentes embebidas, paginación, fallback estático de charts).

### State inventory

- Default: informe `ready` completo paginado.
- Degraded / partial: muestra coverage/provenance honesto sin precisión falsa (igual que print adapter).
- Long content: paginación A4 con saltos correctos; recomendaciones/dimensiones no se cortan a mitad de bloque.
- Otros estados (loading/empty/error/permission): los maneja el consumer, no el PDF.

### Interaction contract

- N/A — documento estático sin interacción.

### Motion & microinteractions

- N/A — el adjunto es un documento estático imprimible (sin comportamiento dinámico).

### Visual verification

- Render del PDF contra fixtures `SAMPLE_PUBLIC_REPORT` (variant `attachment`) ready + partial.
- Paridad de contenido con `AiVisibilityReportPrint` (mismas secciones, misma disclosure).
- Inspección de fuentes embebidas + paginación A4 + marca Efeonce desde SSOT.
- No-leak: el PDF no contiene `providerFindings`/`accuracyFindings`/raw text/IDs internos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — PDF renderer base

- Crear `src/components/growth/ai-visibility/report-artifact/pdf/AiVisibilityReportPdf.tsx` con react-pdf (`Document`/`Page`/`View`/`Text`) consumiendo `ReportArtifactModel`.
- Cover standalone (marca Efeonce SSOT + título + organización + fecha/período).
- Mapear tokens de tipografía/color a estilos PDF (helper de estilos, sin HEX crudos).

### Slice 2 — Secciones + charts estáticos

- Renderizar las secciones del variant `attachment` (verdict, levels, primaryGap, dimensions, aeoSignals, competitiveSov, recommendations, provenance, disclaimer) con paridad al print adapter.
- Charts como barras SVG estáticas / tablas dentro de react-pdf; paginación A4 sin cortes a mitad de bloque.

### Slice 3 — Verificación + barrel + no-leak

- Exportar el renderer desde el barrel `report-artifact/index.ts`.
- Test: render del PDF contra fixtures `attachment` (ready + partial), paridad de contenido + no-leak (sin internal-only strings).
- Documentar para TASK-1250 cómo invocar el renderer para el adjunto.

## Out of Scope

- Cambiar `ReportArtifactModel`, la disclosure matrix, el copy o la dirección visual aprobada (TASK-1252).
- Implementar el email delivery / attachment wiring de TASK-1250 (esta task entrega el renderer; TASK-1250 lo invoca).
- Render web (ya existe `AiVisibilityReportArtifact`).
- Variants `publicWeb`/`clientPortal`/`adminPreview` (son render web).

## Detailed Spec

El PDF es el tercer render adapter del report artifact (web · print-HTML · PDF), todos sobre el mismo `ReportArtifactModel`. Reusa el contenido/secciones del print adapter (`AiVisibilityReportPrint`) pero con react-pdf primitives para obtener un documento vectorial paginado real con fuentes embebidas. La disclosure del variant `attachment` ya está en el modelo (`reportSectionVisible('attachment', ...)`): el renderer solo itera las secciones visibles. El copy y la severidad nombrada salen de `GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT` + `GH_GROWTH_AI_VISIBILITY`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (renderer base) -> Slice 2 (secciones/charts) -> Slice 3 (verificación/barrel/no-leak). No exportar el renderer ni ofrecerlo a TASK-1250 antes del no-leak test verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El PDF filtra data internal-only | privacy | low | Consume solo `modelFromPublicReport(..., 'attachment')`; no-leak test sobre el render PDF | test rojo en CI |
| react-pdf no soporta un patrón visual del web | UI | medium | Degradar a tabla/barra estática; el contenido manda sobre el lujo visual | inspección del PDF |
| Fuentes no embebidas → fallback feo cross-visor | UI | low | Registrar fuentes en react-pdf (`Font.register`) como en los PDFs existentes | inspección del PDF |

### Feature flags / cutover

- Sin flag — additive: nuevo render adapter aislado, no toca runtime existente. TASK-1250 decide cuándo invocarlo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | si |
| Slice 2 | revert PR | <5 min | si |
| Slice 3 | revert PR | <5 min | si |

### Production verification sequence

1. Render del PDF contra fixtures `attachment` (ready + partial) en local + inspección visual.
2. No-leak test verde en CI.
3. TASK-1250 integra el renderer en el adjunto y verifica el email real con el PDF.

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe `AiVisibilityReportPdf` que renderiza un PDF real desde `ReportArtifactModel` (variant `attachment`).
- [x] El PDF tiene cover standalone con marca Efeonce desde el SSOT (sin `AxisWordmark`).
- [x] Paridad de secciones y disclosure con el print adapter (sin trend ni engine snapshot crudo; público-safe). Nota: la presencia por motor (engineSnapshot, conteos + logos) SÍ es pública en attachment per disclosure matrix; lo internal-only es la narrativa cruda.
- [x] Charts vectoriales (`<Svg><Path>` gauge + barras `View`); documento sin JS runtime ni comportamiento dinámico.
- [x] Paginación A4 (4 páginas) sin cortes a mitad de bloque; fuentes embebidas (`ensurePdfFontsRegistered`).
- [x] No-leak test verde sobre el render PDF (sin `providerFindings`/`accuracyFindings`/raw text/IDs internos) + render smoke `%PDF-`.
- [x] El renderer se exporta desde el barrel `report-artifact/index.ts` (`AiVisibilityReportPdf` + `renderAiVisibilityReportPdf`).
- [x] TASK-1250 queda documentada sobre cómo invocar el renderer para el adjunto (Delta en su spec con snippet).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Inspección manual del PDF generado contra fixtures ready + partial.

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] `EPIC-020` y `TASK-1250` sincronizados como consumer del renderer (Delta en TASK-1250)
- [x] chequeo de impacto cruzado ejecutado (TASK-1250 consumer + TASK-1252 deuda cerrada)

## Follow-ups

- Si el PDF necesita variantes por audiencia (cliente vs público) más allá de `attachment`, evaluarlo cuando TASK-1248/1250 lo requieran.

## Open Questions

1. ¿El adjunto V1 de TASK-1250 usa este PDF directamente o mantiene el print-HTML como fallback hasta validar fidelidad cross-cliente? Decisión técnica de TASK-1250.
