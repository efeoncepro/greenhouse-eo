# Ajustes de pago en nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes (TASK-745)
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) (seccion Adjustments)

## Que resuelve

A veces un colaborador no debe recibir el pago calculado automaticamente para un periodo:

- **No trabajo este mes** → no pagar nada (excluir de la nomina).
- **Trabajo a media maquina** → pagar un porcentaje del bruto natural.
- **Tiene un anticipo o prestamo** → descontar un monto fijo del neto.

El modulo de Payroll permite aplicar **ajustes de pago** por periodo, sin romper trazabilidad fiscal (SII honorarios) ni compliance Chile dependiente. Cada ajuste queda en el audit trail con quien, cuando, motivo y nota explicativa.

## Tres tipos de ajuste

| Tipo | Que hace | Caso de uso |
| --- | --- | --- |
| **Excluir** | El bruto y el neto quedan en 0. No se emite boleta SII. No entra al CSV bancario. | Luis no trabajo en mayo: no pagar nada. |
| **Pagar porcentaje** | Multiplica el bruto natural por un factor 0-100%. Las deducciones legales (SII honorarios, AFP/health Chile) se recalculan proporcionalmente. | Pagar 50% del bruto por bajo rendimiento puntual. |
| **Descuento adicional** | Resta un monto absoluto al neto, despues del bruto y deducciones. | Devolucion de anticipo: $200K. |

Los tres tipos son **ortogonales**: se pueden combinar (ej. pagar 70% + descontar $100K).

## Como funciona en el calculo

```
1. Bruto natural = base + bono OTD + bono RpA + teletrabajo + ...
2. Si hay "Pagar porcentaje" → bruto efectivo = bruto natural × factor
3. Calcular SII honorarios (13,5%) sobre bruto efectivo
4. Calcular deducciones Chile dependiente sobre bruto efectivo
5. Si hay "Descuento adicional" → restar del neto
6. Neto final = bruto efectivo − SII − deducciones − descuento
```

Si hay "Excluir", todos los pasos retornan 0 sin tocar las demas reglas.

## Compliance Chile dependiente

Los colaboradores con contrato `indefinido` o `plazo_fijo` en Chile **no se pueden excluir ni llevar a 0%** sin documentar uno de estos motivos legales:

- `licencia_sin_goce` — trabajador con licencia documentada en HR
- `ausencia_injustificada` — falta sin justificar (descuento legal)
- `finiquito_en_curso` — proceso de termino del contrato

Honorarios y trabajadores internacionales/Deel no tienen esta restriccion.

## Maker-checker

Por configuracion del tenant (env `PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL`), los ajustes pueden requerir **aprobacion** por un usuario con permiso `hr.payroll_adjustments_approval` (default: `efeonce_admin`).

- Si la flag esta en `false` (default) → los ajustes nacen activos. No requiere segundo paso.
- Si esta en `true` → los ajustes nacen `pending_approval` y deben ser aprobados antes de impactar el neto.

## Trazabilidad

Cada ajuste:

- Tiene su propio `adjustmentId` y queda inmutable.
- Se puede **revertir** (crea un row con `status='reverted'` + motivo de reversion).
- En **reapertura de periodo** (TASK-409 reliquidacion), los ajustes activos se clonan automaticamente al v2 entry.
- Cada cambio emite un evento al outbox: `payroll.adjustment.created`, `.approved`, `.reverted`. Finance los consume para recompute de gasto de personal.

## Receipts y exportes

| Documento | Comportamiento |
| --- | --- |
| Receipt PDF / Excel del colaborador | Muestra bruto efectivo, descuentos pactados y neto final. |
| CSV bancario | Respeta el neto final. Excluidos no aparecen. |
| Boleta honorarios SII | Se emite por el bruto efectivo (no el natural). |
| Archivo Previred | Excluidos NO aparecen como cotizantes ese mes. |

## Detalle tecnico

- Spec: [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) (seccion Adjustments)
- Tabla canonica: `greenhouse_payroll.payroll_adjustments`
- Computacion: `src/lib/payroll/adjustments/compute-net.ts`
- API: `src/app/api/hr/payroll/entries/[entryId]/adjustments/`
- UI: `PayrollEntryAdjustDialog`, `PayrollAdjustmentHistoryDrawer`
- Eventos outbox: `payroll.adjustment.{created,approved,reverted}`
- Manual operativo: [docs/manual-de-uso/hr/ajustar-pago-de-nomina.md](../../manual-de-uso/hr/ajustar-pago-de-nomina.md)
