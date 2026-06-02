# Manual de uso — Pagos a Contractors (Finanzas)

> **Para:** operador de Finanzas
> **Ruta:** Finanzas › Tesorería › Pagos a contractors (`/finance/contractor-payments`)
> **Creado:** 2026-05-31 (TASK-974)
> **Ultima actualizacion:** 2026-06-02 — flujo end-to-end desde envio aprobado hasta corrida mensual

## Para qué sirve

Procesar pagos a contractors desde un envio aprobado por HR hasta que Finanzas deja la orden de pago preparada.

Esta pantalla es la frontera entre:

- **HR / contractor:** boleta, evidencia, revision y aprobacion del envio.
- **Finance contractor payable:** calculo del neto, readiness, bloqueos, excepciones y envio al puente financiero.
- **Payment orders / banco:** corrida mensual, aprobacion de orden y liquidacion bancaria.

Un envio aprobado **no es un pago**. Un envio aprobado es el insumo para crear un **payable**. El payable es el objeto que Finanzas prepara y envia al flujo financiero.

## Antes de empezar

- Necesitas rol de Finanzas (`finance_admin` / `finance_analyst`) o `efeonce_admin`.
- El **override** (pagar por encima del monto acordado) y el **waiver** (pagar sin perfil de pago resuelto) requieren capability adicional — si no la tienes, el botón no aparece.
- El monto a pagar lo fija HR en el engagement. Tú no cambias el monto acordado: lo pagas, o autorizas una excepción documentada.
- La boleta/evidencia ya debe estar revisada por HR si vas a crear desde un envio aprobado.
- Para pagos mensuales, usa la **corrida mensual** despues de enviar los payables a Finanzas. Crear el payable no crea por si solo la orden de pago.

## Mapa mental del flujo

```text
Contractor sube boleta/evidencia
  -> HR revisa el envio
  -> HR aprueba el envio
  -> Finanzas crea payable desde el envio aprobado
  -> Finanzas revisa readiness
  -> Finanzas envia el payable a Finanzas (`ready_for_finance`)
  -> Bridge crea la obligacion financiera
  -> Corrida mensual prepara ordenes de pago
  -> Orden de pago se aprueba / liquida por el flujo de pagos
  -> Contractor recibe comprobante cuando el payable queda pagado
```

La regla practica:

- Si solo existe un **envio aprobado**, todavia falta crear payable.
- Si existe un payable **Por preparar**, falta revisar readiness y enviarlo.
- Si esta **Listo para Finanzas**, espera bridge/obligacion o prepara corrida mensual segun corresponda.
- Si esta **En orden de pago**, sigue el flujo normal de payment orders.
- Si esta **Pagado**, ya se puede ver el comprobante.

## Paso a paso

### 1. Ver los payables existentes

Abre la pantalla. Arriba ves 4 indicadores: **Por preparar**, **Bloqueados**, **Listos para Finanzas**, **Pagados este mes**. Abajo, la lista de payables. Filtra por estado con el selector "Todos".

Si el caso no aparece en la tabla pero HR dice que ya aprobo un envio, usa **Crear desde envio**.

### 2. Crear payable desde envio aprobado

1. Click en **Crear desde envio**.
2. Elige el envio aprobado pendiente. La lista muestra contractor, ID de envio, periodo, monto bruto y engagement.
3. Confirma **Crear payable**.
4. La pantalla crea un payable en estado **Por preparar**.

Al crear desde envio:

- El envio queda consumido por ese payable y no deberia volver a aparecer como pendiente.
- El sistema calcula retencion y neto desde el payable, no desde una estimacion visual.
- No se paga nada todavia.

Ejemplo: si HR aprobo `EO-CWS-0003` de Valentina por bruto `$707.965`, Finanzas crea un payable con bruto `$707.965`, retencion SII `$107.965` y neto a pagar `$600.000`.

### 3. Crear payable off-cycle

Usa **Pago off-cycle** para ajustes, bonos, reembolsos o pagos que no nacen de un envio normal.

1. Click en **Pago off-cycle**.
2. Indica engagement, monto bruto y motivo.
3. El motivo debe tener al menos 10 caracteres.
4. Confirma. El payable queda **Por preparar**.

No uses off-cycle para saltarte un envio aprobado normal. Si existe envio aprobado, usa **Crear desde envio**.

### 4. Revisar el detalle del payable

Selecciona un payable en la lista. A la derecha ves:

- **Bruto − Retención = Neto** (el neto, en verde, es lo que va al banco).
- **Readiness**: la lista de bloqueos. Cada uno dice **de quién es** resolverlo (Finanzas / HR / Contractor).
- Metadatos: engagement, moneda, origen y fecha de vencimiento.

### 5. Resolver readiness

- Si esta **listo**, presiona **Enviar a Finanzas**. El payable pasa a `ready_for_finance`; desde ahi el bridge genera la obligacion financiera de forma idempotente.
- Si falta el **perfil de pago** del contractor: **Waiver de perfil de pago** (motivo ≥ 10, queda auditado).
- Si el pago **excede el monto acordado**: **Override de monto acordado** (motivo ≥ 10, queda auditado). Solo Finanzas.
- Si ya no aplica: **Cancelar**.

Enviar a Finanzas no significa "pagado". Significa que el payable esta autorizado para entrar al puente financiero.

### 6. Preparar la corrida mensual

Cuando ya tienes payables enviados a Finanzas y el bridge creo sus obligaciones, usa **Iniciar corrida mensual**.

1. Click en **Iniciar corrida mensual**.
2. Elige el mes operativo.
3. Revisa el preview: cantidad de payables, fecha limite y total neto por moneda.
4. Si el preview esta correcto, confirma **Preparar ordenes**.

La corrida:

- Agrupa obligaciones de contractors por periodo/moneda.
- Prepara ordenes de pago.
- No paga automaticamente.
- No reemplaza aprobaciones ni controles del flujo de payment orders.

### 7. Seguir el flujo de orden de pago

Despues de la corrida, el pago sigue en el modulo de ordenes de pago. Segun el estado, Finance debe aprobar, calendarizar o marcar pagado por el flujo canonico de pagos.

Cuando el payable llega a **Pagado**, el comprobante individual queda disponible para HR/Finance y para el contractor.

## Qué significan los estados

| Chip | Significado | Qué haces |
|---|---|---|
| Por preparar | Payable creado, todavia no enviado al puente financiero | Revisa readiness y presiona **Enviar a Finanzas** si no hay bloqueos |
| Bloqueado | Fallo un chequeo de readiness | Mira los bloqueos y resuelve / waiver / override |
| Listo para Finanzas | Payable en `ready_for_finance`; el bridge puede generar obligacion | Espera la obligacion o corre el siguiente paso si ya esta disponible |
| Obligacion creada | Ya existe obligacion financiera | Incluyelo en la corrida mensual cuando corresponda |
| En orden de pago | Ya fue incluido en una orden de pago | Sigue el flujo de payment orders |
| Pagado | Liquidado al banco | Revisa comprobante de pago |
| Cancelado | Cerrado sin pago | No hacer nada, salvo auditoria |

## Diferencias que suelen confundirse

| Concepto | Dónde vive | Qué significa | Qué NO significa |
|---|---|---|---|
| Boleta/evidencia | `/my/contractor` y `/hr/contractors` | Documento y respaldo que sube el contractor | No crea pago |
| Envio aprobado | HR workbench | HR valido el trabajo/soporte | No existe payable todavia |
| Payable por preparar | Finanzas | Finance ya creo el payable desde el envio | No fue enviado al puente |
| Ready for Finance | Finanzas/backend | El payable paso readiness y entra al bridge | No necesariamente tiene orden de pago |
| Obligacion financiera | Finance bridge | Deuda lista para agruparse en orden | No es pago bancario |
| Orden de pago | Payment orders | Instruccion operativa de pago | No es pago hasta liquidar/mark-paid |
| Comprobante | Contractor remittance | Evidencia de pago ya ejecutado | No reemplaza la boleta del contractor |

## Descargar la nómina del período (PDF / Excel)

1. Click en **"Descargar nómina"** (header).
2. Elige **mes** y **año** (mes operativo).
3. Click en **"Descargar PDF"** o **"Descargar Excel"** — el archivo se descarga.

El reporte agrupa los pagos por **Honorarios CL** (con retención SII) e **Internacional**, con el desglose **bruto − retención SII = neto**, subtotales separados (retención SII → F29 · neto pagado → banco) y los pagos bloqueados/no listos en una sección "Excluidos". El **neto** es lo pagado al contractor; la **retención SII** se remesa al SII aparte. No reemplaza el comprobante individual.

## Qué no hacer

- **No** intentes cambiar el monto acordado desde acá: eso es de HR. Si hay que pagar de más, usa **Override** (queda registrado).
- **No** te bases en un neto "a ojo": el sistema lo calcula del payable. Si un número se ve raro, revisa el engagement, no la pantalla.
- **No** envíes a Finanzas un payable con bloqueos sin resolverlos primero (te devuelve el detalle de qué falta).
- **No** crees un off-cycle si existe un envio aprobado normal: usa **Crear desde envio**.
- **No** interpretes **Aprobado** en HR como **Pagado** o **Listo para Finanzas**.
- **No** canceles un payable solo porque aun esta **Por preparar**. Si no hay bloqueos, el siguiente paso es **Enviar a Finanzas**.
- **No** ejecutes una corrida mensual sin revisar el preview de totales y moneda.
- **No** trates la retencion SII como pago al contractor: es pasivo a remesar al SII por separado.

## Problemas comunes

- **"Sin payables"**: no hay payables en ese estado todavía. Crea uno desde un envío aprobado.
- **El botón Override / Waiver no aparece**: no tienes la capability. Pídela a un admin.
- **Enviar a Finanzas falla**: el payable aún tiene bloqueos — el detalle de readiness te dice cuáles.

### HR dice que aprobo el envio, pero no veo pago

Eso es normal. Primero crea el payable desde **Crear desde envio**. Aprobar en HR no crea orden de pago.

### El envio aprobado no aparece en "Crear desde envio"

Revisa:

1. Que HR realmente haya aprobado el envio.
2. Que el envio no haya sido consumido por un payable anterior.
3. Que estes en Finanzas con permiso de crear contractor payable.
4. Que no estes buscando un envio rechazado, disputado o cancelado.

### El payable muestra "Por preparar" y readiness OK

Presiona **Enviar a Finanzas**. Ese es el paso correcto; no lo canceles.

### La corrida mensual dice "Nada por preparar"

Puede pasar si:

- No hay payables en estado listo/obligacion creada para ese periodo.
- Elegiste el mes operativo equivocado.
- El bridge aun no genero la obligacion; espera o refresca.
- El payable ya fue incluido en una orden anterior.

### El neto no coincide con el bruto de la boleta

Para honorarios Chile, el neto descuenta retencion SII. Ejemplo: bruto `$707.965`, retencion `$107.965`, neto `$600.000`. El contractor recibe el neto; Efeonce remesa la retencion al SII.

### Ya cree el payable equivocado

No edites datos por fuera. Si el payable no aplica y aun no avanzo, usa **Cancelar payable** con motivo. Si ya genero obligacion u orden, revisa el flujo de anulacion/cancelacion del estado correspondiente.

## Referencias técnicas

- Doc funcional: [pagos-a-contractors.md](../../documentation/finance/pagos-a-contractors.md)
- Spec del dominio: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- Comprobante de pago (paso siguiente): [contratistas-comprobante-de-pago.md](../hr/contratistas-comprobante-de-pago.md)
- HR / self-service previo al payable: [Contratistas — Self-Service y revision HR](../hr/contratistas.md)
