> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-31 por Claude (TASK-974)
> **Ultima actualizacion:** 2026-05-31 por Claude (TASK-974)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

# Pagos a Contractors — Workbench de Finanzas

## Para qué sirve

Es la pantalla donde **Finanzas prepara, revisa y autoriza los pagos a contractors** antes de que se conviertan en una orden de pago al banco. Vive en **Finanzas › Tesorería › Pagos a contractors** (`/finance/contractor-payments`).

Hasta antes de esta pantalla, un pago a contractor solo se podía crear por API o script. Ahora Finanzas tiene una superficie propia para hacerlo end-to-end.

## Cómo se conecta con el resto

El pago a un contractor nace en HR y termina en el banco. Esta pantalla es la **estación de Finanzas** en ese camino:

1. **HR** crea el engagement y fija el **monto acordado** (lo que se pagará).
2. El **contractor** cobra: envía su trabajo / boleta (work submission).
3. **Finanzas** (esta pantalla) crea el *payable*, calcula el **neto** y autoriza el pago.
4. El payable listo genera una **obligación** → **orden de pago** → **banco** (automático, reactivo).

> Separación de funciones (SoD): quien **fija** el monto (HR) no es quien **paga** (Finanzas). Por eso el override de un pago que excede el monto acordado se autoriza **solo desde Finanzas**, no desde HR.

## Qué muestra

- **4 KPIs**: Por preparar · Bloqueados · Listos para Finanzas · Pagados este mes (cada uno con cantidad + monto neto).
- **Lista de payables** filtrable por estado.
- **Detalle del payable** con:
  - **Desglose Bruto − Retención SII = Neto** (el neto, en verde, es lo que va al banco).
  - **Nota contable**: el neto va al banco; la **retención** se remesa al SII por separado (F29). El gasto se reconoce por el **bruto**.
  - **Readiness**: la lista de bloqueos que impiden pagar, cada uno con su **responsable** (Finanzas / HR / Contractor).
  - **Acciones de gobernanza** (ver abajo).

## Los montos NUNCA se recalculan acá

El bruto, la retención y el neto se leen **tal cual vienen del payable**. La tasa de retención (honorarios CL) viene congelada del engagement (lo que estaba vigente cuando se firmó). La pantalla nunca inventa ni recalcula un número.

## Estados de un payable

| Estado | Qué significa |
|---|---|
| **Por preparar** (`pending_readiness`) | Recién creado, falta validar readiness. |
| **Bloqueado** (`blocked`) | Falló un chequeo de readiness — ver los bloqueos. |
| **Listo para Finanzas** (`ready_for_finance`) | Enviado al puente que genera la obligación. |
| **En curso** (`obligation_created` / `payment_order_created`) | El puente lo está procesando (solo lectura). |
| **Pagado** (`paid`) | Liquidado al banco — link al comprobante de pago. |
| **Cancelado** (`cancelled`) | Cerrado sin pago. |

## Acciones de gobernanza

- **Crear desde envío**: toma un work submission aprobado y calcula el neto.
- **Crear off-cycle**: ajuste / bono / reembolso (bruto + moneda + motivo).
- **Enviar a Finanzas**: marca el payable `ready_for_finance` (solo si pasa readiness).
- **Cancelar**: cierra el payable.
- **Waiver de perfil de pago**: cuando falta el perfil de pago del contractor pero igual se autoriza (queda auditado).
- **Override de monto acordado**: autoriza pagar por encima de lo acordado (capability de admin, motivo obligatorio, queda auditado). **Solo Finanzas.**

## Quién puede entrar

Roles con acceso a Finanzas: `finance_admin`, `finance_analyst` y `efeonce_admin`. El override y el waiver requieren capabilities adicionales.

> Detalle técnico: superficie `src/views/greenhouse/finance/contractor-payments/ContractorPaymentsWorkbenchView.tsx`; reader `src/lib/finance/contractor-payments/workbench-reader.ts`; endpoints `/api/finance/contractor-payables/**`. Spec del dominio: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md).
