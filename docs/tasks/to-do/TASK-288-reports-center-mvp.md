## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task ahora debe consumir esa capa al implementar la página.

- **View code:** `cliente.reportes`
- **Capability:** `client_portal.reports`
- **Actions requeridas:** `view`, `export`
- **Scope:** `organization`
- **Guard de página:** combinar `hasAuthorizedViewCode(tenant, 'cliente.reportes')` + `can(tenant, 'client_portal.reports', 'view', 'organization')`.
- **Guard de export:** los endpoints de export deben chequear `can(tenant, 'client_portal.reports', 'export', 'organization')`. Un rol con solo `view` ve la página pero los botones de export quedan disabled.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-288 — Reports Center MVP

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `4`
- Domain: `platform`
- Blocked by: `TASK-286` (view code + capability con actions `view` y `export` + binding + role defaults)
- Branch: `task/TASK-288-reports-center-mvp`

## Summary

Crear la primera version del Reports Center: exportar datos del portal cliente en PDF ejecutivo y CSV de metricas. Sin export, los datos quedan atrapados en el portal. Un VP Marketing de banco necesita adjuntar datos a sus presentaciones internas y reportes de procurement.

## Why This Task Exists

Enterprise marketing teams necesitan llevar datos fuera del portal: board decks, reportes a procurement, emails a stakeholders internos. Hoy no hay ninguna funcionalidad de export. Los clientes terminan sacando screenshots — eso no es experiencia enterprise.

## Goal

- Pagina `/reports` con centro de exportacion
- PDF ejecutivo con KPIs del periodo (template basico)
- CSV export de metricas de delivery
- Historial de reportes generados

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V7
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- Usar `@react-pdf/renderer` (ya instalado, patron en payroll receipts)
- Branding Efeonce en PDFs (patron en `src/lib/payroll/generate-payroll-pdf.tsx`)
- Los reportes solo contienen datos que el usuario ya puede ver — no exponer datos internos

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.reportes` registrado)
- `@react-pdf/renderer` v4.3.2 (instalado)
- Patron de PDF en `src/lib/payroll/generate-payroll-pdf.tsx`
- Patron de Excel en `src/lib/payroll/generate-payroll-excel.ts`
- Notification category `report_ready` en `src/config/notification-categories.ts`

### Blocks / Impacts

- TASK-298 (QBR) — reutilizara el template PDF

### Files owned

- `src/app/(dashboard)/reports/page.tsx`
- `src/app/api/reports/executive-pdf/route.ts`
- `src/app/api/reports/metrics-csv/route.ts`
- `src/views/greenhouse/GreenhouseReportsCenter.tsx`
- `src/lib/reports/generate-executive-pdf.tsx`
- `src/lib/reports/generate-metrics-csv.ts`

## Current Repo State

### Already exists

- `@react-pdf/renderer` v4.3.2 instalado y probado
- `src/lib/payroll/generate-payroll-pdf.tsx` — patron de generacion PDF con branding
- `src/lib/payroll/generate-payroll-excel.ts` — patron de generacion Excel
- Notification category `report_ready` (in_app + email channels)
- Patron de download en payroll API routes

### Gap

- No hay pagina de Reports Center
- No hay templates de PDF para reportes cliente
- No hay CSV export de metricas de delivery
- No hay historial de reportes generados
- No hay programacion de envio periodico (fuera de scope MVP)

## Scope

### Slice 1 — CSV export de metricas

- Crear `/api/reports/metrics-csv/route.ts`
- Guard: `requireClientTenantContext()`
- Query de metricas ICO del tenant (OTD%, RpA, FTR, throughput, cycle time) por mes
- Response: CSV descargable con headers, formato compatible con Excel

### Slice 2 — PDF ejecutivo basico

- Crear `src/lib/reports/generate-executive-pdf.tsx` con `@react-pdf/renderer`
- Template: logo Efeonce, nombre del cliente, periodo, KPIs top-line (OTD%, RpA, throughput), portfolio health, equipo
- Crear `/api/reports/executive-pdf/route.ts`
- Response: PDF descargable

### Slice 3 — Pagina Reports Center

- Crear pagina y view component
- Lista de reportes disponibles (PDF ejecutivo, CSV metricas)
- Botones de descarga por cada tipo
- Historial basico (ultimos 10 exports con fecha y tipo) — persistir en PG o in-memory MVP

## Out of Scope

- Programacion de envio periodico (follow-up)
- Template PDF de QBR completo (eso es TASK-298)
- Template PDF de pipeline (follow-up)
- Deck templates / PowerPoint export

## Acceptance Criteria

- [ ] Pagina `/reports` muestra opciones de export
- [ ] Boton "Descargar PDF" genera y descarga un PDF ejecutivo con KPIs
- [ ] Boton "Descargar CSV" genera y descarga CSV con metricas mensuales
- [ ] PDF tiene branding Efeonce (logo, colores)
- [ ] CSV es compatible con Excel (headers, separadores correctos)
- [ ] Solo datos que el cliente ya puede ver — no datos internos
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Descargar PDF y abrir en viewer
- Descargar CSV y abrir en Excel

## Closing Protocol

- [ ] Actualizar §14.1 V7 readiness

## Follow-ups

- TASK-298: QBR PDF completo
- Programacion de envio periodico (task futura)
- Template PDF de pipeline status
