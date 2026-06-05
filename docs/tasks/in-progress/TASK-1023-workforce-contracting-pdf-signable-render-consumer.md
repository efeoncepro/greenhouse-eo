# TASK-1023 — Workforce Contracting Studio: PDF / signable render consumer

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §7, §12.3)
- Created: 2026-06-05

## Delta 2026-06-05 — Arch review (arch-architect): desacople de EPIC-001 489/493 del camino crítico

Revisión arquitectónica con `arch-architect` (overlay Greenhouse) + investigación de la realidad vigente. Hallazgos que ajustan las dependencias:

- **TASK-493 (rendering/template catalog) NO es bloqueante.** EPIC-001 lo difiere explícitamente; el patrón `@react-pdf` canónico ya existe y está probado (`register-fonts.ts` → `ensurePdfFontsRegistered`, `EfeoncePdfFooter`, `EfeonceSloganPdf`, watermark-por-estado del finiquito, `storeSystemGeneratedPrivateAsset`). Esta task los **reutiliza directo**, no espera un catalog genérico.
- **TASK-489 (document registry) NO es bloqueante para renderizar+firmar.** El modelo canónico es el de **finiquito (TASK-863 V1.5.2)** y **payroll receipt (TASK-868)**: el **agregado del dominio es dueño de su `pdf_asset_id` + `content_hash` + auto-regen por estado**; el registry unificado lo superficie luego como `kind='linked'` vía consumer reactivo (late binding). El STUDIO spec ya cita ese patrón TASK-863 para contracting.
- **Ajuste de dependencias**: esta task pasa a depender SOLO de **TASK-1019 (foundation)** + los primitives `@react-pdf` Efeonce existentes + TASK-721 (asset uploader). El `pdf_asset_id` + `signed_pdf_asset_id` (+ `content_hash`, `pdf_template_version`, `pdf_status_at_render`) se agregan como **columnas del agregado** `greenhouse_hr.workforce_contracting_cases` (additive migration de esta task), NO via las `document_versions` genéricas de TASK-489.
- **Registry link diferido**: la fila `documents` (kind='linked', 5º linked aggregate) + bridge `document_workforce_contracting_link` se agrega cuando TASK-489 aterrice (es superficie `/documents`, no bloquea la firma). Mirror exacto de cómo TASK-868 conecta payroll receipts al registry.
- **Arrancable YA** (solo necesita TASK-1019, ya en runtime). Saca ~22-30h (TASK-489) + TASK-493 del camino crítico de firmar.

## Delta 2026-06-05 — Estándar de documento APROBADO por el operador (formato O1 + C2) — baseline vinculante

El operador (Julio) **aprobó los dos formatos** tras el loop GVC + product-design (`modern-ui` + `greenhouse-ux-writing`). El mockup aprobado **es el estándar**: cualquier cambio futuro debe ser **mejora incremental, NUNCA degradación**.

**Baseline visual vinculante** (revisar antes de tocar el render):
- Ruta mockup: `/hr/workforce/contracts/mockup/documents`
- View: `src/views/greenhouse/hr/workforce-contracting/mockup/documents/*` (`document-mock-data.ts`, `DocumentPaper.tsx`, `DocumentParts.tsx`, `OfferLetterDocument.tsx`, `ContractDocument.tsx`, `ContractingDocumentFormatMockupView.tsx`)
- Scenario GVC: `scripts/frontend/scenarios/contracting-document-format-mockup.scenario.ts`
- El mockup consume **la misma forma `localizedDrafts`** (secciones por `sectionCode`, es-CL + en-US) que el render real → cero re-interpretación visual.

### Sistema documental Efeonce (común a carta oferta + contrato)

- Display **Poppins** (`h1–h4`, títulos/ordinales/headings) + body **Geist** (`ensurePdfFontsRegistered`, cuerpo/labels/montos). Montos/RUT/fechas con `tabular-nums`.
- **Un solo acento**: verde contrast-safe `#2E7D32` (banner de prevalencia ES, título de termscard, ordinales de cláusula, check de pre-estampado).
- **Brand-zone Efeonce** en el masthead: logo Efeonce (`/branding/logo-full.svg`) + eslogan "Empower your Growth" (`EfeonceSlogan`/`EfeonceSloganPdf`) **subordinado** (más chico que el logo), sobre regla horizontal fuerte.
- **Footer institucional** `EfeoncePdfFooter` (entidad · RUT · dirección · `efeoncepro.com` · "Página X de Y").
- **Watermark/badge por `documentStatus`**: `PROYECTO` diagonal tenue (~0.10 opacity, warning) en draft → **desaparece** al firmar → `ANULADO`/`RECHAZADO`/etc. en terminales (matriz patrón finiquito TASK-863).
- **Banner de prevalencia**: ES = "VERSIÓN EN ESPAÑOL · PREVALENTE" (acento verde + `tabler-shield-check`); EN = "ENGLISH VERSION · REFERENCE" (neutral gris + `tabler-language`).
- **Firma**: representante legal **pre-estampado** (`@/lib/legal-signatures` PNG); trabajador vía ZapSign; ministro de fe (solo contrato). Columnas con **simetría vertical** (altura reservada arriba de la línea de firma — invariante TASK-863 B-4).

### Carta Oferta — formato O1 (carta ejecutiva, bilingüe secuencial)

Masthead → banner prevalencia ES → lugar/fecha → título (Poppins, uppercase) → saludo cálido + intro → **termscard "Resumen de la oferta"** (grid 2-col, labels uppercase gris + valores `tabular-nums`) → secciones (rol/condiciones · próximos pasos · aceptación) → **firma de aceptación del trabajador** (1 columna) → footer. Luego **salto** → **espejo EN completo**. Registro cálido-profesional (es una propuesta a una persona) pero preciso en términos.

### Contrato de Trabajo — formato C2 (instrumento es-CL prevalente + espejo en-US)

Masthead → banner prevalencia ES → título "CONTRATO INDIVIDUAL DE TRABAJO" + lugar/fecha → **comparecencia** (partes, prosa) → **cláusulas numeradas** (PRIMERO→… con ordinal en acento verde + cuerpo **justificado**) → **bloque de firma 3 columnas** (empleador pre-estampado · trabajador · ministro de fe) → footer. Luego **salto** → **espejo EN completo** (FIRST→…) con su bloque de firma. Es **un solo PDF firmado** (ES + EN en un archivo). Registro formal-legal, ancho completo para legibilidad del texto denso.

### ⚠️ Reglas duras (anti-degradación — el estándar aprobado es el piso, no el techo)

- **NUNCA** renderizar bilingüe **lado a lado por cláusula**. La decisión canónica aprobada es **secuencial** (ES prevalente completo → espejo EN completo) para ambos documentos. El lado-a-lado pelea el ancho A4 + se rompe con cláusulas ES/EN de distinto largo. (Esto **ajusta** el hint "lado a lado" del STUDIO §7 — ver Delta arch review.)
- **NUNCA** concatenar texto ad hoc. El render consume `localizedDrafts` (secciones por `sectionCode`); el orden + alineación ES/EN se preservan por `sectionCode`.
- **NUNCA** quitar ni degradar ninguno de estos elementos del estándar: masthead Efeonce (logo + eslogan subordinado), banner de prevalencia ES/EN, watermark por `documentStatus` (que desaparece al firmar), footer institucional `EfeoncePdfFooter`, bloque de firma con simetría vertical, el acento único `#2E7D32`, las familias Poppins (display) + Geist (body), la termscard (oferta). Quitar cualquiera = degradación = rechazado.
- **NUNCA** usar logo Greenhouse (app) — es documento **institucional Efeonce**. NUNCA monospace para montos/IDs (usar Geist `tabular-nums`).
- **NUNCA** mezclar datos de partes distintas en una misma columna (Semantic Column Invariants TASK-863). El bloque de firma y la comparecencia lo respetan.
- **NUNCA** partir una cláusula legal entre páginas: `wrap={false}` por sección/cláusula.
- **NUNCA** el watermark `PROYECTO` debe persistir en estado firmado; **SIEMPRE** la matriz watermark/badge sigue `documentStatus` (regen al transicionar, patrón TASK-863 V1.5.2 + signal `pdf_status_drift`).
- **SIEMPRE** que se proponga un cambio visual, debe ser **mejora incremental** (kerning, paginación, micro-spacing, refinamiento de jerarquía) **sin perder** ninguno de los elementos del estándar. Validar con `fe:capture:diff` mockup↔runtime antes de cerrar.
- **SIEMPRE** el render real reproduce visualmente el mockup aprobado (`contracting-document-format-mockup` scenario) — paridad estructural por copy-and-patch + `fe:capture:diff`; toda desviación visual requiere re-aprobación del operador.

## Why

El artefacto firmable es un archivo **renderizado por Greenhouse/EPIC-001** desde el `structuredContent` aprobado (NO concatenación ad hoc), marca **Efeonce institucional**, bilingüe ES+EN con alineación por sección + idioma autoritativo visible. La foundation (TASK-1019) reservó la dimensión `cases.signable_format ∈ {pdf,docx}` + la capability `workforce.contracting.generate_document` pero **no renderiza nada**. Esta task lo implementa.

## Scope

- Consumer que toma un caso aprobado (`status` post-`approveDraft`) + el draft con `structuredContent` bilingüe → renderiza el archivo firmable.
- **Chile V1 = `pdf`** vía `@react-pdf/renderer` reutilizando el pipeline probado: `EfeoncePdfFooter` + `EfeonceSloganPdf` + Geist (`ensurePdfFontsRegistered`) + firma legal del representante (`@/lib/legal-signatures`, TASK-863). `docx` queda disponible por pack (no Chile V1).
- Layout bilingüe **secuencial** (formatos aprobados O1/C2 — ver Delta "Estándar de documento APROBADO"; NUNCA lado a lado por cláusula). Respetar **Semantic Column Invariants** (TASK-863): no mezclar datos de partes; ligaduras/page-breaks (`wrap={false}` por cláusula legal); watermark/badge por `documentStatus`.
- Persistir el PDF como **private asset** (TASK-721 uploader) con `content_hash` + `template_version` + jurisdiction pack + render timestamp + `documentStatusAtRender` (patrón TASK-863 V1.5.2: regenerar al transicionar de estado; signal `pdf_status_drift`).
- Activar capability `workforce.contracting.generate_document` (grant `runtime.ts` + guard de cobertura) + emitir `workforce.contracting.ready_for_pdf` (ya en EVENT_CATALOG) y `ready_for_signature`.
- **Real-Artifact Iterative Verification Loop** (greenhouse-dev): emitir 1 caso real → capturar PDF → audit 3-skills (payroll-auditor/UX-writing legal-es-CL/modern-ui) → iterar.
- Registrar `signable_format`/`generate_document` en el Admin Viewer (TASK-1021) desbloqueando la acción `locked`.

## Dependencies & Impact

- **Depende de:** TASK-1019 (foundation, ya en runtime) + primitives `@react-pdf` Efeonce existentes (`register-fonts.ts`, `EfeoncePdfFooter`, `EfeonceSloganPdf`) + TASK-721 (asset uploader) + `@/lib/legal-signatures` (TASK-863). **NO depende de TASK-489 ni TASK-493** (ver Delta 2026-06-05 arriba).
- **Impacta a:** TASK-1024 (firma — sube el PDF a ZapSign), TASK-1021/1022 (desbloquea descarga/compare), TASK-1025 (adjunto del email). Cuando TASK-489 aterrice, agrega el linked-surface (kind='linked' + bridge).
- **Archivos owned:** `src/lib/workforce/contracting/document/*` (render + asset), migración additive de columnas PDF en `workforce_contracting_cases`, reliability `contracting-pdf-status-drift.ts`.

## Out of Scope

- Firma ZapSign (TASK-1024). Emails (TASK-1025).

## Acceptance

- Caso aprobado → PDF Efeonce bilingüe persistido como private asset con hash/version/status; regen al cambiar estado.
- **Paridad con el mockup aprobado** (O1 + C2): `fe:capture:diff` mockup↔runtime sin pérdida de ningún elemento del estándar (masthead, banner prevalencia, watermark-por-estado, footer, firma simétrica, termscard, Poppins/Geist, acento único).
- Loop de verificación con caso real cerrado (3-skills sin bloqueantes).
- Signal `pdf_status_drift` steady=0; `pnpm test`/`build` verdes.
