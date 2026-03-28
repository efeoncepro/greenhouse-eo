# TASK-104: Payroll Export Email Redesign

## Objetivo

Redisenar el email de notificacion `Payroll exportado` que se envia a Finance y HR al cerrar una nomina, mejorando jerarquia de informacion, copy en espanol unificado, desglose multi-moneda claro, y plain text de calidad profesional.

## Estado: Complete (2026-03-28)

## Contexto

El email anterior tenia estos problemas:
- **Subject spanglish**: "Payroll exportado" mezclaba ingles con espanol
- **"Mixto" críptico**: `Mixto (US$2696.27 / $832.121)` obligaba a Finance a parsear mentalmente la moneda
- **Sin contexto de adjuntos**: el body decia "disponibles en el modulo" pero los adjuntos ya estaban en el email
- **Plain text pobre**: el fallback era la version que algunos clientes mostraban
- **Sin metadata operativa**: faltaba timestamp de exportacion

## Cambios implementados

### 1. Email template (`src/emails/PayrollExportReadyEmail.tsx`)

**Nueva interfaz `CurrencyBreakdown`** (exportada):
- `currency`, `regimeLabel`, `grossTotal`, `netTotal`, `entryCount`
- Permite desglose por regimen en lugar del resumen "Mixto"

**Estructura rediseñada**:
- Overline: `NOMINA · MARZO 2026`
- Heading: "Nomina cerrada y lista para revision"
- Body con headcount explicito
- Summary card con breakdowns por regimen (Chile CLP / Internacional USD)
- Hero box "Neto total a pagar" con display combinado
- Seccion "Adjuntos incluidos" con descripcion de cada archivo
- Metadata: quien exporto + cuando

### 2. Sending logic (`src/lib/payroll/payroll-export-packages.ts`)

- **Subject**: `Nomina cerrada — Marzo 2026 · 4 colaboradores` (100% espanol)
- **`buildBreakdowns()`**: reemplaza `summarizeCurrency()` — agrupa entries por moneda/regimen
- **`buildNetTotalDisplay()`**: concatena netos con `+`
- **`exportedAt`**: timestamp formateado en es-CL
- **Plain text profesional**: header, desglose por regimen, seccion ADJUNTOS, metadata, link al portal

### 3. Tests

- `PayrollExportReadyEmail.test.tsx`: 3 tests (multi-moneda, single-moneda, adjuntos)
- `payroll-export-packages.test.ts`: validacion de nuevo subject, plain text con breakdowns

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/emails/PayrollExportReadyEmail.tsx` | Template rediseñado con CurrencyBreakdown |
| `src/lib/payroll/payroll-export-packages.ts` | Subject, buildBreakdowns, plain text, exportedAt |
| `src/emails/PayrollExportReadyEmail.test.tsx` | 3 tests nuevos |
| `src/lib/payroll/payroll-export-packages.test.ts` | Assertions actualizadas |

## Dependencies & Impact

- **Depende de:** Resend SDK, react-email, EmailLayout, payroll close flow
- **Impacta a:** TASK-095 (centralized email delivery layer) — el template ahora exporta `CurrencyBreakdown` como tipo reutilizable
- **Archivos owned:** `PayrollExportReadyEmail.tsx`, seccion de email en `payroll-export-packages.ts`
