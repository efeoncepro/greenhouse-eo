# TASK-097 - Payroll Export Artifact Persistence and Resend

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Implementado`
- Rank: `6`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Persistir los artefactos de exportación de Payroll en un bucket de GCS y habilitar reenvío de la notificación de cierre sin volver a cerrar el período. El objetivo es desacoplar el cierre canónico del delivery del paquete documental.

## Implementation

- Se creó `greenhouse_payroll.payroll_export_packages` para persistir PDF/CSV y metadata de delivery.
- Las rutas de PDF, CSV y `export` ahora leen desde artefactos persistidos con fallback a regeneración.
- Se añadió `POST /api/hr/payroll/periods/[periodId]/resend-export-ready` para reenviar el mail sin reabrir ni recerrar el período.
- `PayrollPeriodTab` expone `Reenviar correo` cuando el período ya está exportado.
- La arquitectura de Payroll, el catálogo de emails y el playbook reactivo quedaron alineados con el nuevo contrato.

## Why This Task Exists

Hoy `Payroll` puede cerrar el período y enviar el correo downstream, pero el paquete de PDF/CSV se genera al vuelo y no queda garantizado como artefacto reutilizable para descargas posteriores o reenvíos. Eso deja al usuario atado a un único momento de envío y dificulta reentregar la información a Finance/HR sin regenerar todo.

## Goal

- Guardar PDF y CSV del período exportado en un bucket canónico.
- Persistir metadata de delivery para soportar reenvío y descargas posteriores.
- Exponer una acción de `Reenviar correo` sin volver a ejecutar el cierre.
- Mantener `exported` como cierre canónico y no como consecuencia del reenvío.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_STORAGE_ARCHITECTURE_V1.md` si se formaliza la política de bucket

Reglas obligatorias:

- el cierre canónico sigue siendo `payroll_period.exported`
- el reenvío de mail no debe volver a cerrar ni reexportar el período
- el PDF/CSV deben poder descargarse sin depender de regeneración en cada click
- si no existe un artefacto persistido, se permite fallback on-demand solo como respaldo

## Dependencies & Impact

### Depends on

- `TASK-094` - separación entre close y CSV download

### Related / Future follow-up

- `TASK-095` - capa centralizada de delivery de emails

### Impacts to

- `src/lib/payroll/send-payroll-export-ready.ts`
- `src/lib/payroll/generate-payroll-receipts.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/lib/payroll/export-payroll.ts`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx`
- `src/views/greenhouse/my/MyPayrollView.tsx`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`

### Files owned

- helpers de persistencia de artefactos Payroll
- route(s) de descarga o reenvío de export package
- metadata store para URLs/paths de PDF y CSV
- tests de reenvío, idempotencia y descarga

## Current Repo State

### Ya existe

- `payroll_period.exported` como evento canónico de cierre
- mail downstream de cierre via Resend
- recibos de remuneraciones persistidos en GCS como patrón de referencia
- routes separadas para `close` y `csv`

### Gap actual

- el paquete de exportación de Payroll sigue dependiendo demasiado del momento de cierre
- el correo no deja un artefacto persistido reutilizable para reenvío o descarga posterior
- el usuario no tiene una acción explícita de `Reenviar correo` sobre un período ya exportado

## Scope

### Slice 1 - Persistencia de artefactos

- generar PDF y CSV al exportar
- persistir ambos en GCS con nombres canónicos por período
- guardar metadata mínima en la capa transaccional para resolver URLs/paths

### Slice 2 - Reenvío de correo

- exponer una acción para reenviar el mail de cierre
- reutilizar los artefactos persistidos
- no cambiar el estado del período

### Slice 3 - Descargas

- descargar PDF/CSV desde archivos persistidos
- fallback on-demand solo si el artefacto no existe
- copy claro para HR y Finance

## Out of Scope

- redefinir el lifecycle de nómina
- reemplazar Resend
- cambiar la lógica de aprobación o cierre
- introducir un sistema documental completo ajeno a Payroll

## Acceptance Criteria

- [ ] Al cerrar un período se persisten PDF y CSV en GCS.
- [ ] El cierre no depende de la descarga manual para considerarse final.
- [ ] Existe una acción de reenvío del correo sin volver a cerrar.
- [ ] Los artefactos se pueden descargar desde el período exportado.
- [ ] El flujo es idempotente y no reenvía ni reescribe sin necesidad.

## Verification

- `pnpm exec vitest run <tests asociados>`
- `pnpm exec eslint <archivos tocados>`
- `pnpm build`
- smoke manual de cierre, reenvío y descarga sobre un período exportado
