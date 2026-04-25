# TASK-629 — PDF Cotización Enterprise Redesign

## Lifecycle

complete

## Owner

Julio + Claude (sesión 2026-04-24)

## Origen

[RESEARCH-005 v1.4](../../research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md) Delta — gap PDF genérico identificado en auditoría CPQ vs mercado.

## Que se hizo

Rediseño end-to-end del PDF de cotizaciones siguiendo el contrato visual cerrado en RESEARCH-005 v1.4 (single template con secciones condicionales).

### Arquitectura nueva en `src/lib/finance/pdf/`

- `tokens.ts` — sistema de tokens visual paralelo a `GREENHOUSE_DESIGN_TOKENS_V1`
- `flags.ts` — `computePdfFlags()` decide secciones condicionales por threshold
- `formatters.ts` — currency / fecha DMY / quantity / rate
- `register-fonts.ts` — DM Sans + Poppins lazy registration con fallback
- `qr-verification.ts` — HMAC-SHA256 signed token + content-hash binding
- `rich-html-renderer.tsx` — parser whitelist HTML → React-PDF
- `quotation-pdf-document.tsx` — orquestador (510 → 194 líneas)
- `sections/` — 8 componentes modulares (Cover, Executive Summary, About Efeonce, Scope of Work, Commercial Proposal, Investment Timeline, Terms, Signatures + shared)

### Cambios al route `/api/finance/quotes/[id]/pdf`

- LEFT JOIN al `product_catalog` para `product_code` + `description_rich_html`
- Lookup dinámico de sales rep contra `team_members`
- Lookup dinámico de legal entity contra `greenhouse_core.organizations`
- Generación de QR signed con content hash binding

### Endpoint público

`/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx` — valida el token recomputando hash desde DB; muestra:

- "Documento auténtico" con datos del quote (badge verde) si el token matchea
- "Documento inválido" (badge magenta) si el token no matchea o el contenido cambió

### Pipeline de assets

- `scripts/build-pdf-brand-assets.ts` (sharp) convierte SVGs → PNGs en `public/branding/pdf/`
- 7 archivos: globe-full / wave-full / reach-full + 4 isotipos
- Fonts en `src/assets/fonts/` (6 .ttf de DM Sans + Poppins)

### Tests

- `src/lib/finance/pdf/__tests__/flags.test.ts` (12 specs)
- `src/lib/finance/pdf/__tests__/qr-verification.test.ts` (12 specs)
- `src/lib/finance/pdf/__tests__/formatters.test.ts` (9 specs)
- Total: 33 specs nuevos, 100% verde

### Validación visual

`scripts/render-test-pdf.ts` renderiza ambos modos:

- **Enterprise** (forceEnterprise + total > $50M CLP): 8 páginas, 84 KB
- **Compact** (Wave, $4.76M CLP): 5 páginas, 52 KB — confirma que las secciones condicionales se omiten correctamente

## Validación

- `npx tsc --noEmit` clean
- `pnpm lint` clean (2 warnings pre-existentes ajenos a este trabajo)
- `pnpm test` 2052/2054 passing (33 nuevos + 2019 pre-existentes; 2 skipped pre-existentes)
- `pnpm build` clean
- Render real end-to-end validado en `tmp/`
- Endpoint público de verificación funcional contra DB

## Commits

- `bb3cedf5` — feat(TASK-629): PDF cotización enterprise — single template + secciones condicionales + brand assets reales
- `20eb6ff3` — feat(TASK-629): cierre limitations — fonts DM Sans+Poppins + QR signed real + product_catalog JOIN + sub-brand PNG pipeline

## Follow-ups operativos

1. **CRITICAL**: setear `GREENHOUSE_QUOTE_VERIFICATION_SECRET` en Vercel production con `openssl rand -hex 32`. Sin esta variable el QR se omite gracefully pero el documento pierde verificación legal.
2. Re-ejecutar `pnpm tsx scripts/build-pdf-brand-assets.ts` cuando cambien los SVGs canónicos de sub-brand.
3. Comunicar a sales reps el cambio visible en propuestas nuevas.

## Dependencies & Impact

### Depende de

- `greenhouse_commercial.quotations` schema (existente)
- `greenhouse_commercial.quotation_line_items.product_id` (existente)
- `greenhouse_commercial.product_catalog.description_rich_html` (TASK-603 v2)
- `greenhouse_core.organizations.is_operating_entity` flag (existente)
- `greenhouse.team_members.work_email` + `phone` + `job_title` (existentes)

### Impacta a

- TASK-619 (eSignature DocuSign): el envelope adjuntará este PDF; flujo end-to-end ya está armado
- TASK-620 (Service catalog como bundle CPQ): cuando agregue `bundle_id` a `quotation_line_items`, el PDF mostrará bundles agrupados (gap actual rendea flat)
- TASK-630 (TipTap rich text editor admin UI): poblará `product_catalog.description_rich_html` que el PDF ya renderiza

### Archivos owned

- `src/lib/finance/pdf/**`
- `src/app/api/finance/quotes/[id]/pdf/route.ts`
- `src/app/public/quote/**`
- `src/assets/fonts/`
- `public/branding/pdf/`
- `scripts/build-pdf-brand-assets.ts`
- `scripts/render-test-pdf.ts`
