# TASK-090 — Receipt Branding Efeonce + PDF Template Versioning

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Domain | HR Payroll, Platform |

## Summary

Rebranding completo de los recibos de nómina (dialog card + PDF) con identidad corporativa Efeonce, identidad legal del empleador vía React context enterprise, y sistema de template versioning con lazy cache invalidation para PDFs almacenados en GCS.

## What Was Implemented

### 1. Receipt Branding Efeonce

- Logo Efeonce (`/branding/logo-full.svg`) reemplaza texto "Greenhouse EO" en Card y PDF
- Paleta de color `#2E7D32` (verde genérico) → `#023c70` (azul corporativo Efeonce)
- Fondos accent `#E8F5E9` → `#E8EFF7` (azul claro)
- PDF: identidad legal completa del empleador (razón social, RUT, dirección legal)
- Card: employer info via prop con fallback a defaults
- Footer PDF: usa `operatingEntity.legalName` dinámicamente

### 2. OperatingEntityContext — Enterprise Identity Hydration

- `OperatingEntityProvider` + `useOperatingEntity()` hook en `src/context/OperatingEntityContext.tsx`
- Hydration server → client: `Providers.tsx` resuelve `getOperatingEntityIdentity()` una vez en el layout, pasa al Provider
- `GET /api/admin/operating-entity` endpoint para consumers no-React (webhooks, integraciones, cron)
- `PayrollReceiptDialog` consume el contexto y pasa `employerInfo` al Card
- Documentado en `GREENHOUSE_ARCHITECTURE_V1.md` sección "Operating Entity Identity"
- Multi-tenant ready: el layout resuelve per-tenant

### 3. PDF Template Versioning + Lazy Cache Invalidation

- `RECEIPT_TEMPLATE_VERSION = '2'` en `generate-payroll-pdf.tsx`
- Columna `template_version` en `payroll_receipts` (migration: `scripts/migrations/add-receipt-template-version.sql`)
- Ambas rutas de recibo (HR + My Payroll) implementan lazy regeneration:
  - Si `storedReceipt.templateVersion === RECEIPT_TEMPLATE_VERSION` → serve from GCS (fast path)
  - Si mismatch o NULL → regenera PDF → sube a GCS → actualiza record → serve fresh
- `updateReceiptAfterRegeneration()` para refresh atómico del cache
- Nuevos receipts generados por batch stamplan la versión actual
- Non-fatal: si el upload/update falla, el PDF se sirve igualmente (regenerado on-demand)

## Files Changed

### New files
- `src/context/OperatingEntityContext.tsx` — Provider + hook
- `src/app/api/admin/operating-entity/route.ts` — API endpoint
- `scripts/migrations/add-receipt-template-version.sql` — DDL migration

### Modified files
- `src/components/Providers.tsx` — wire OperatingEntityProvider
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx` — logo, brand colors, employer info
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx` — consume useOperatingEntity
- `src/lib/payroll/generate-payroll-pdf.tsx` — branding, RECEIPT_TEMPLATE_VERSION
- `src/lib/payroll/payroll-receipts-store.ts` — templateVersion field + updateReceiptAfterRegeneration
- `src/lib/payroll/generate-payroll-receipts.ts` — stamp template version on batch generation
- `src/app/api/hr/payroll/entries/[entryId]/receipt/route.ts` — lazy regeneration
- `src/app/api/my/payroll/entries/[entryId]/receipt/route.ts` — lazy regeneration
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — Operating Entity Identity section

## Dependencies & Impact

### Depends on
- `greenhouse_core.organizations` con `is_operating_entity = TRUE` (ya existe)
- GCS bucket `efeonce-group-greenhouse-media` (ya existe)

### Impacts to
- Todo consumer futuro de identidad del empleador usa `useOperatingEntity()` (client) o `getOperatingEntityIdentity()` (server)
- Cualquier cambio de template PDF requiere bump de `RECEIPT_TEMPLATE_VERSION`
- Finance DTEs, HR contratos, Agency propuestas pueden consumir el contexto

### Operational note
- Migration `add-receipt-template-version.sql` debe correrse en staging/prod para que el lazy refresh actualice el record
- Sin la migration, los PDFs se regeneran on-demand pero no se persiste la nueva versión

## Acceptance Criteria

- [x] Logo Efeonce visible en Card dialog y PDF
- [x] Paleta azul corporativo (#023c70) en ambas superficies
- [x] Razón social, RUT y dirección legal del empleador en Card y PDF
- [x] useOperatingEntity() disponible para cualquier componente del portal
- [x] API endpoint funcional para consumers externos
- [x] PDFs viejos se regeneran automáticamente al siguiente acceso
- [x] Nuevos PDFs se generan con template version stamped
- [x] tsc + eslint clean
- [x] Documentado en arquitectura
