> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-05-31 por Claude (TASK-974)
> **Ultima actualizacion:** 2026-06-02 por Codex — flujo completo validado hasta payment orders / paid
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

# Pagos a Contractors — Workbench de Finanzas

## Para qué sirve

Es la pantalla donde **Finanzas prepara, revisa y autoriza los pagos a contractors** antes de que se conviertan en una orden de pago al banco. Vive en **Finanzas › Tesorería › Pagos a contractors** (`/finance/contractor-payments`).

Hasta antes de esta pantalla, un pago a contractor solo se podía crear por API o script. Ahora Finanzas tiene una superficie propia para hacerlo end-to-end.

## Cómo se conecta con el resto

El pago a un contractor nace en HR y termina en el banco. Esta pantalla es la **estación de Finanzas** en ese camino:

1. **HR** crea el engagement y fija el **monto acordado** (lo que se pagará).
2. El **contractor** cobra: envía su trabajo / boleta (work submission).
3. **Finanzas** (esta pantalla) crea el *payable*, calcula el **neto** y autoriza el paso a Finance.
4. El payable listo genera una **obligación**.
5. La **corrida mensual** agrupa obligaciones contractor por moneda y crea **órdenes de pago**.
6. **Órdenes de pago** ejecuta maker-checker, programación, envío y marca pagada.
7. Cuando la orden queda `paid`, el cascade marca el payable `paid` y habilita el comprobante individual.

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

## ¿Cuándo se paga? — el compromiso de 5 días hábiles

Efeonce se compromete a pagar a sus contractors (igual que a sus colaboradores) **dentro de los primeros 5 días hábiles posteriores al cierre del mes**. Por eso, cuando se crea un payable, su **fecha límite de pago (`due_date`) se calcula automáticamente**: último día hábil del mes operativo **+ 5 días hábiles** (usando el mismo calendario de feriados y la misma zona horaria que la nómina).

- Si alguien ya escribió una fecha límite a mano, **esa fecha manda** — el cálculo automático solo aplica cuando no se indicó ninguna.
- Una señal de salud (`SLA de pago a contractors`) vigila el compromiso: si un pago **comprometido** queda **vencido** contra esa fecha, aparece en amarillo (≤10 días de atraso) o rojo (>10 días) en el panel de operaciones. **No bloquea nada** — solo avisa.
- **Ojo**: este plazo mide el **pago neto al contractor**. La **retención SII** (honorarios CL) se le paga al **SII** en su propio plazo (F29, día 12/20 del mes siguiente) — es otra obligación, con otro destinatario, y no se mezcla con este compromiso.

## La corrida mensual

En vez de armar las órdenes de pago de a una, Finanzas puede **preparar todas juntas** con el botón **"Iniciar corrida mensual"** (arriba a la derecha).

Cómo funciona:

1. Eliges el **mes** (por defecto el mes operativo vigente).
2. La pantalla te muestra un **previo**: cuántos pagos entran y el total neto por moneda. Si no hay nada pendiente, lo dice ("Nada por preparar").
3. Al confirmar **"Preparar órdenes"**, junta todos los pagos comprometidos del período y crea las **órdenes de pago agrupadas por moneda**.

> **Prepara — no paga.** Las órdenes quedan en **«pendiente de aprobación»**. La aprobación (doble firma) y el pago al banco siguen siendo manuales. Es solo el barrido masivo que antes había que hacer a mano.

- **Es idempotente**: si la corres dos veces, no duplica nada (la segunda vez no encuentra pagos nuevos y te avisa "ya estaba preparada").
- **Prioriza lo más vencido**: ordena por la fecha de pago comprometida (los más atrasados contra el plazo de 5 días primero), e incluye cualquier pago de meses anteriores que se haya quedado sin preparar.
- Una señal de salud (`obligaciones de contractor vencidas sin batchear`) avisa en el panel de operaciones si quedaron pagos vencidos sin preparar — la acción es justamente correr la corrida.

## Flujo end-to-end validado

El camino completo es:

```text
work_submission approved
  -> contractor_payable pending_readiness
  -> readiness live OK
  -> contractor_payable ready_for_finance
  -> payment_obligation provider_payroll
  -> monthly run
  -> payment_order pending_approval
  -> approved / scheduled / submitted
  -> payment_order paid
  -> contractor_payable paid
  -> remittance advice EO-RA + email
```

Contratos relevantes:

- **Enviar a Finanzas** no crea pago bancario; solo autoriza la obligacion.
- **Iniciar corrida mensual** no paga; crea ordenes `pending_approval`.
- **Payment Orders** es el dueño de aprobacion, envio, pago y conciliacion.
- El payable solo llega a **Pagado** despues de `finance.payment_order.paid` y el cascade reactivo.
- El comprobante individual requiere `payable.status='paid'`.

## Descargar la nómina de contractors (PDF / Excel)

El botón **"Descargar nómina"** (arriba a la derecha) genera el **reporte del período** de pagos a contractors, en **PDF** o **Excel**, igual que el reporte mensual de nómina.

- Eliges el **mes** y el **año** (mes operativo) y descargas en el formato que prefieras.
- El reporte lista los pagos del período **agrupados por régimen**: **Honorarios CL** (con retención SII) e **Internacional** (sin retención chilena). Cada fila muestra el desglose **bruto − retención SII = neto**, el estado y, si ya se pagó, el número de **comprobante** (EO-RA).
- Los **subtotales son separados**: el total de **retención SII** (que se remesa al SII vía F29) nunca se mezcla con el **neto pagado** (que reconcilia el banco). Las monedas (CLP / USD) también van separadas.
- Los pagos **bloqueados o no listos** del período aparecen en una sección de "Excluidos" — visibles, pero fuera de los subtotales.
- Los pagos **Listo para Finanzas**, **Obligación creada**, **En orden de pago** y **Pagado** aparecen como incluidos del período. El subtotal de neto pagado al banco suma solo `paid`; por eso una fila en orden de pago puede aparecer sin aumentar el subtotal pagado.

> **Importante**: el reporte muestra el **neto pagado al contractor**. La **retención SII** es un pasivo que Efeonce le remesa al SII por separado (F29), no se le paga al contractor. El reporte lo dice explícitamente y **no reemplaza** ni el comprobante individual ni la declaración de remesa.

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
