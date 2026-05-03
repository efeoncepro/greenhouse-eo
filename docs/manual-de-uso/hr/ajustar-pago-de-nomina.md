# Manual: Ajustar el pago de un colaborador en una nomina

## Para que sirve

Cuando un colaborador no debe recibir el pago calculado automaticamente — porque no trabajo, trabajo menos, o tiene un anticipo a recuperar — usas el flujo de **Ajustes de pago**. Aplica al periodo activo (estado `calculado` o `reabierto`) y queda con audit trail completo.

## Antes de empezar

- Necesitas permiso `hr.payroll_adjustments` (defaults: `efeonce_admin` y `hr_payroll`).
- El periodo debe estar en estado **calculado** o **reabierto**. En `aprobado` o `exportado` no se puede aplicar.
- Si tu tenant tiene la flag `PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL` activa, los ajustes nacen pendientes y necesitan aprobacion (`hr.payroll_adjustments_approval`).

## Paso a paso

1. Anda a **HR → Nomina → Periodo actual**.
2. Localiza al colaborador en la tabla.
3. En la columna de acciones (derecha), click en **"Ajustar pago"** (icono `tabler-adjustments-dollar`).
4. En el dialogo:
   - Elige el modo:
     - **Pagar normal** — sin cambio.
     - **Pagar un porcentaje** — slider 0-100%.
     - **Excluir de la nomina** — no se le paga.
   - Opcional: ingresa un **descuento adicional** (CLP) si corresponde un anticipo o ajuste fijo.
   - Selecciona el **motivo** del dropdown.
   - Escribe una **nota explicativa** (min 5 caracteres). Queda en el audit trail.
5. Revisa el preview de neto en vivo en la parte inferior.
6. Click **"Guardar ajuste"**.
7. Recalcula la nomina (boton **"Recalcular"** del periodo). El neto del colaborador refleja el ajuste.

## Que significan los estados de un ajuste

| Estado | Significado |
| --- | --- |
| `pending_approval` | Esperando aprobacion (solo si la flag de tenant la requiere). |
| `active` | Aplicado al calculo. Impacta neto y outbox a Finance. |
| `reverted` | Revertido. Ya no impacta. Queda en historial. |
| `superseded` | Reemplazado por una version nueva. Queda en historial. |

## Casos canonicos

### A) "Luis no trabajo este mes — no pagar nada"

- Modo: **Excluir de la nomina**.
- Descuento adicional: vacio.
- Motivo: **"Sin actividad este periodo"**.
- Nota: ej. "Acuerdo verbal con Luis el 28-abr. No facturo mayo."
- Resultado: Bruto = 0, Neto = 0. No se emite boleta SII. No aparece en CSV bancario.

### B) "Pagar 50% por bajo rendimiento"

- Modo: **Pagar un porcentaje** → slider 50%.
- Motivo: **"Bajo rendimiento"**.
- Nota: contexto operativo.
- Resultado: bruto y SII proporcionales al 50%. Neto del colaborador es ~50% del normal.

### C) "Descontar $200K de anticipo"

- Modo: **Pagar normal** (sin cambio en bruto).
- Descuento adicional: **200000**.
- Motivo: **"Devolucion de anticipo"**.
- Nota: referencia al anticipo original (fecha, monto).
- Resultado: bruto y SII intactos; neto reducido en $200K.

### D) Combinado: 70% + descuento $100K

- Modo: **Pagar un porcentaje** → 70%.
- Descuento adicional: **100000**.
- Motivos: el principal explica el 70%; la nota describe ambos.

## Que no hacer

- **No aplicar exclusiones a colaboradores Chile dependientes** (`indefinido`, `plazo_fijo`) sin uno de estos motivos legales: `Licencia sin goce`, `Ausencia injustificada`, `Finiquito en curso`. El sistema bloquea el guardado.
- **No usar el override manual de neto legacy** para los casos cubiertos por estos 3 modos. El override queda solo para escenarios excepcionales V0 que no encajan.
- **No olvidar recalcular** despues de guardar el ajuste. El bruto/neto de la tabla se actualiza al recalcular el periodo.

## Revertir un ajuste

1. Click en **"Ver ajustes"** en la fila del colaborador (icono `tabler-list-details`).
2. En el drawer del historial, encuentra el ajuste activo.
3. Click **"Revertir"**.
4. Indica el motivo (min 5 caracteres).
5. Confirma. El ajuste queda en estado `reverted` con el motivo registrado.
6. Recalcula el periodo para que el neto vuelva al valor sin ajuste.

## Aprobar un ajuste pendiente (solo `efeonce_admin`)

1. Click en **"Ver ajustes"** en la fila del colaborador.
2. Encuentra el ajuste en `pending_approval`.
3. Click **"Aprobar"**.
4. El ajuste pasa a `active` y aplica al neto.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
| --- | --- | --- |
| El boton "Ajustar pago" no aparece | Periodo no esta editable (estado `aprobado`/`exportado`). | Reabrir el periodo si tienes permiso (`efeonce_admin`). |
| Mensaje "Chile dependent payroll cannot be excluded..." | Intentas excluir a alguien con contrato indefinido sin reason legal. | Cambia el motivo a `Licencia sin goce`, `Ausencia injustificada` o `Finiquito en curso`. |
| El neto no cambia despues de guardar | No recalculaste el periodo. | Boton "Recalcular" en el header del periodo. |
| El ajuste aparece pendiente | La flag `PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL` esta activa. | Pedir a un admin que apruebe. |

## Referencias

- Doc funcional: [docs/documentation/hr/ajustes-de-pago-en-nomina.md](../../documentation/hr/ajustes-de-pago-en-nomina.md)
- Spec tecnica: [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- API: `POST /api/hr/payroll/entries/[entryId]/adjustments`
- UI: `src/views/greenhouse/payroll/PayrollEntryAdjustDialog.tsx`
