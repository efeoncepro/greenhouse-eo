# TASK-1023 — Workforce Contracting Studio: PDF / signable render consumer

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §7, §12.3)
- Created: 2026-06-05

## Why

El artefacto firmable es un archivo **renderizado por Greenhouse/EPIC-001** desde el `structuredContent` aprobado (NO concatenación ad hoc), marca **Efeonce institucional**, bilingüe ES+EN con alineación por sección + idioma autoritativo visible. La foundation (TASK-1019) reservó la dimensión `cases.signable_format ∈ {pdf,docx}` + la capability `workforce.contracting.generate_document` pero **no renderiza nada**. Esta task lo implementa.

## Scope

- Consumer que toma un caso aprobado (`status` post-`approveDraft`) + el draft con `structuredContent` bilingüe → renderiza el archivo firmable.
- **Chile V1 = `pdf`** vía `@react-pdf/renderer` reutilizando el pipeline probado: `EfeoncePdfFooter` + `EfeonceSloganPdf` + Geist (`ensurePdfFontsRegistered`) + firma legal del representante (`@/lib/legal-signatures`, TASK-863). `docx` queda disponible por pack (no Chile V1).
- Respetar **Semantic Column Invariants** (TASK-863): layout bilingüe lado a lado sin mezclar datos de partes; ligaduras/page-breaks (`wrap={false}` por cláusula legal); watermark/badge por `documentStatus`.
- Persistir el PDF como **private asset** (TASK-721 uploader) con `content_hash` + `template_version` + jurisdiction pack + render timestamp + `documentStatusAtRender` (patrón TASK-863 V1.5.2: regenerar al transicionar de estado; signal `pdf_status_drift`).
- Activar capability `workforce.contracting.generate_document` (grant `runtime.ts` + guard de cobertura) + emitir `workforce.contracting.ready_for_pdf` (ya en EVENT_CATALOG) y `ready_for_signature`.
- **Real-Artifact Iterative Verification Loop** (greenhouse-dev): emitir 1 caso real → capturar PDF → audit 3-skills (payroll-auditor/UX-writing legal-es-CL/modern-ui) → iterar.
- Registrar `signable_format`/`generate_document` en el Admin Viewer (TASK-1021) desbloqueando la acción `locked`.

## Dependencies & Impact

- **Depende de:** EPIC-001 `TASK-489` (document registry/versioning) + `TASK-493` (rendering/template catalog). TASK-1019 (foundation).
- **Impacta a:** TASK-1024 (firma — sube el PDF a ZapSign), TASK-1021/1022 (desbloquea descarga/compare), TASK-1025 (adjunto del email).
- **Archivos owned:** `src/lib/workforce/contracting/document/*` (render + asset), reliability `contracting-pdf-status-drift.ts`.

## Out of Scope

- Firma ZapSign (TASK-1024). Emails (TASK-1025).

## Acceptance

- Caso aprobado → PDF Efeonce bilingüe persistido como private asset con hash/version/status; regen al cambiar estado.
- Loop de verificación con caso real cerrado (3-skills sin bloqueantes).
- Signal `pdf_status_drift` steady=0; `pnpm test`/`build` verdes.
