# TASK-094 - Payroll Close and CSV Download Separation

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementado` |
| Rank | `6` |
| Domain | `hr` |
| GitHub Project | `Greenhouse Delivery` |

## Result

- Se separó el cierre canónico del período de Payroll de la descarga del CSV.
- `POST /api/hr/payroll/periods/[periodId]/close` marca el período como `exported` sin depender del archivo.
- `GET /api/hr/payroll/periods/[periodId]/csv` y el route legacy `export` quedan como descarga de artefacto.
- La notificación downstream a Finance/HR sale desde `payroll_period.exported` con Resend y adjuntos PDF/CSV.
- La arquitectura y el catálogo de emails quedaron alineados con el nuevo contrato.

## Summary

Separar en Payroll la accion de cerrar/exportar un periodo de la descarga del CSV.
Hoy la UI llama `Descargar CSV` pero ese flujo tambien muta el estado del periodo a `exported`,
lo que hace parecer que el cierre depende de bajar un archivo.
El contrato objetivo es que `exported` represente el cierre canonico, y que el CSV/PDF sean artefactos
de entrega posteriores o paralelos, no el motivo del cierre.

## Why This Task Exists

El contrato actual mezcla dos cosas distintas:

- cierre operativo del periodo
- descarga de un artefacto CSV

En la practica, el usuario puede creer que el periodo no queda cerrado si no descarga el archivo,
y la interfaz tampoco deja claro si esta ejecutando una mutacion de negocio o solo una entrega de archivo.
Ademas, Finance y HR necesitan una notificacion clara cuando el cierre se completa, idealmente con
los artefactos adjuntos o enlazados, sin obligar a nadie a "exportar" manualmente solo para cerrar.

## Goal

- Introducir una accion explicita para cerrar/exportar el periodo sin depender de la descarga del CSV.
- Mantener la descarga del CSV como artefacto opcional y separado.
- Hacer que la UI y los labels reflejen esa separacion con claridad.
- Preservar la semantica canonica `approved -> exported` y los efectos reactivos asociados al cierre.
- Definir el cierre como evento de negocio que dispare notificaciones y downstream delivery.
- Dejar claro que el artefacto descargable es opcional; el cierre debe poder completarse sin descargar nada.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

Reglas obligatorias:

- el cierre del periodo es una mutacion de negocio, no una consecuencia de descargar un archivo
- la descarga del CSV es opcional y no debe bloquear el cierre
- `exported` sigue siendo el estado final canonico del periodo
- cualquier evento o outbox asociado al cierre debe dispararse por la mutacion de estado, no por la entrega del archivo
- el cierre canónico puede disparar un correo de notificacion a Finance/HR con CSV y PDF adjuntos o enlaces
- los consumers reactivos deben reaccionar al evento `payroll_period.exported`, no al gesto de descarga

## Dependencies & Impact

### Depends on

- `TASK-087` - invariants de lifecycle y readiness de Payroll ya establecen el contrato `approved -> exported`
- `TASK-091` - calendario operativo y policy temporal de cierre
- `TASK-092` - semantica de periodo actual e historial
- `TASK-077` - recibos y delivery downstream ya existen como precedent operativo para adjuntos y batch delivery

### Impacts to

- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollHistoryTab.tsx`
- `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`
- `src/lib/payroll/export-payroll.ts`
- `src/lib/sync/projections/payroll-receipts.ts`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- posiblemente un nuevo route o helper dedicado a cierre explicito

### Files owned

- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollHistoryTab.tsx`
- `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`
- `src/lib/payroll/export-payroll.ts`
- `src/lib/payroll/close-payroll-period.ts` o el helper equivalente que se cree para cerrar el periodo
- `src/lib/payroll/payroll-export-notify.ts` o el helper equivalente para notificar cierre a Finance/HR

## Current Repo State

### Ya existe

- `handleExport` en `PayrollPeriodTab` hace `fetch` al route de export, descarga el CSV en el cliente y luego refresca la vista.
- `exportPayrollCsv()` en `src/lib/payroll/export-payroll.ts` valida el periodo, genera las filas CSV y marca `approved -> exported`.
- `export` hoy es un nombre ambiguo: en el runtime significa descarga del archivo y cambio de estado al mismo tiempo.

### Gap actual

- no existe una accion de negocio separada para cerrar el periodo sin hablar de descarga de archivo
- la etiqueta `Descargar CSV` mezcla artifact delivery con lifecycle closure
- no hay un contrato UI/API claro que deje obvio que el CSV es opcional
- no existe una notificacion canonica de cierre para Finance/HR que se dispare al `exported`
- no esta claro si la notificacion debe adjuntar CSV y PDF o solo enlazarlos desde el portal

## Scope

### Slice 1 - Cierre explicito

- definir una mutacion clara para llevar el periodo de `approved` a `exported`
- preservar idempotencia y validaciones de estado
- mantener los efectos de outbox o downstream delivery donde correspondan
- emitir el evento canónico `payroll_period.exported` solo cuando la mutacion realmente avance el periodo

### Slice 2 - Notificacion de cierre

- definir un email downstream para Finance/HR al cerrar/exportar
- decidir si el correo adjunta CSV y PDF o si adjunta solo enlaces seguros al portal/GCS
- reutilizar el contrato de email catalog existente o crear una variante especifica para payroll close ready
- hacer que el envio sea consecuencia del evento `payroll_period.exported`, no del click de descarga

### Slice 3 - Descarga del CSV

- separar la entrega del CSV del cierre operativo
- permitir descargar el CSV de un periodo ya cerrado o aprobado sin implicar una nueva mutacion
- mantener el artefacto con nombre estable y comportamiento predecible

### Slice 4 - UI y copy

- reemplazar el copy ambiguo de `Descargar CSV` por acciones separadas si aplica
- dejar claro cuando el usuario esta cerrando el periodo y cuando solo esta descargando el archivo
- revisar historial y acciones disponibles para periodos `approved` y `exported`
- si aplica, ofrecer una accion explicita de `Cerrar periodo y notificar` y otra de `Descargar CSV`

## Out of Scope

- recibos PDF
- Excel o cualquier otro artefacto adicional
- motor de calculo de Payroll
- selector de periodo actual
- calendario operativo
- redisenar el pipeline de receipts ya existente salvo lo necesario para alinear el delivery downstream

## Acceptance Criteria

- [ ] Un periodo puede quedar `exported` sin que el usuario tenga que considerar la descarga del CSV como parte del cierre.
- [ ] La descarga del CSV queda disponible como accion separada y opcional.
- [ ] La UI deja de sugerir que `Descargar CSV` es sinónimo de cerrar el periodo.
- [ ] El flujo sigue siendo idempotente para periodos ya exportados.
- [ ] Los efectos downstream siguen reaccionando al cierre real del periodo, no a la descarga del artefacto.
- [ ] Finance/HR reciben una notificacion de cierre cuando `payroll_period.exported` se publica.
- [ ] La notificacion downstream no depende de que el usuario descargue el CSV.

## Open Questions

- ¿La accion canónica de cierre debe seguir llamandose `export` o conviene renombrarla a `close` en UI/API?
- ¿El email a Finance/HR debe adjuntar CSV y PDF, o solo enlazarlos?
- ¿`payroll_export_ready` se reutiliza como tipo de email, o conviene un nuevo template mas explicito para cierre de periodo?

## Proposed Flow

1. HR aprueba el periodo y este queda `approved`.
2. HR ejecuta una accion explicita de cierre/exportacion.
3. El backend avanza a `exported` y publica `payroll_period.exported`.
4. Un consumidor downstream prepara y envía el correo de cierre a Finance/HR.
5. La descarga del CSV queda disponible como artefacto separado, sin ser el paso que define el cierre.

## Rollout Notes

- Si el cambio se implementa en dos pasos, primero separar el cierre de la descarga en backend y luego ajustar copy/UI.
- Si el correo downstream necesita adjuntos pesados, evaluar si conviene adjuntar CSV/PDF o solo enlazarlos con URLs seguras.
- Mantener el path existente de exportación para no romper integraciones, pero redefinirlo internamente como cierre canónico + artefacto opcional.

## Verification

- tests unitarios para el helper o route de cierre explicito
- tests de UI para el copy y las acciones separadas en Payroll
- `pnpm exec vitest run ...`
- `pnpm exec eslint ...`
- `pnpm build`
