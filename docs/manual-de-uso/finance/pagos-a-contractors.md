# Manual de uso — Pagos a Contractors (Finanzas)

> **Para:** operador de Finanzas
> **Ruta:** Finanzas › Tesorería › Pagos a contractors (`/finance/contractor-payments`)
> **Creado:** 2026-05-31 (TASK-974)
> **Ultima actualizacion:** 2026-06-02 — flujo end-to-end validado desde envio aprobado hasta orden de pago y pago

## Para qué sirve

Procesar pagos a contractors desde un envio aprobado por HR hasta que Finanzas deja la orden de pago preparada, aprobada, enviada y marcada como pagada por el flujo canonico de tesoreria.

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
  -> Orden de pago se aprueba / programa / envia / marca pagada
  -> Cascade marca el payable como pagado y emite comprobante
  -> Contractor recibe comprobante cuando el payable queda pagado
```

La regla practica:

- Si solo existe un **envio aprobado**, todavia falta crear payable.
- Si existe un payable **Por preparar**, falta revisar readiness y enviarlo.
- Si esta **Listo para Finanzas**, espera bridge/obligacion o prepara corrida mensual segun corresponda.
- Si esta **En orden de pago**, abre la orden en `/finance/payment-orders`.
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
- El perfil de pago activo se resuelve automaticamente desde la ruta canonica del beneficiario. Si acabas de aprobar/activar el perfil, refresca la vista y vuelve a revisar readiness.
- Si aun falta el **perfil de pago** despues de esa evaluacion viva: crea/aprueba el perfil correspondiente. El **Waiver de perfil de pago** es una excepcion auditada (motivo ≥ 10), no el camino normal.
- El flujo puede usar un `member` **existente** como beneficiario de pago cuando el perfil bancario esta registrado ahi. Esto no crea un `member` nuevo ni crea una compensacion de Payroll. Payroll solo liquida si existe una `compensation_version` aplicable; los contractor engagements activos viven en el carril contractor-payable.
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

### 7. Abrir la orden de pago

Despues de la corrida, el payable cambia a **En orden de pago**. Eso significa que ya fue incluido en una orden viva.

1. Cierra el dialog de corrida.
2. Ve a **Finanzas -> Tesoreria -> Ordenes de pago** (`/finance/payment-orders`).
3. Abre la pestaña **Ordenes**.
4. Busca la orden creada por la corrida. El titulo suele tener la forma `Corrida contractors <mes> <año> · <moneda>`.
5. Abre el detalle y revisa:
   - contractor / beneficiario correcto;
   - moneda correcta;
   - neto a pagar;
   - lineas incluidas;
   - fecha comprometida;
   - metodo / processor / instrumento de salida cuando aplique.

Para Valentina, el chequeo esperado era:

- Contractor: **Valentina Hoyos**.
- Payable: `EO-CPAY-0001`.
- Neto al banco: **CLP 600.000**.
- Retencion SII separada: aprox. **CLP 107.965**.

### 8. Aprobar la orden de pago

La corrida deja la orden normalmente en **Pendiente aprobacion**.

1. Pide que un usuario distinto al creador abra la orden.
2. Ese usuario hace click en **Aprobar**.
3. Si aparece el bloqueo maker-checker, no es error: el creador no puede aprobar su propia orden.

La aprobacion no paga todavia. Solo deja la orden lista para programar o enviar.

### 9. Programar o enviar la orden

Segun el proceso de tesoreria:

1. Si quieres registrar una fecha de ejecucion, usa **Programar**.
2. Cuando el pago se suba al banco/processor, usa **Marcar enviada**.
3. Si tienes referencia externa del banco, registrala en ese paso.

**Marcar enviada** significa que la operacion fue instruida. Todavia no es confirmacion bancaria.

### 10. Marcar pagada

Cuando el banco confirme el pago:

1. Abre la orden.
2. Click en **Marcar pagada**.
3. El sistema marca la orden como pagada.
4. Las obligaciones vinculadas pasan a `paid`.
5. El cascade reactivo marca el contractor payable como **Pagado**.
6. Se emite el evento que habilita el comprobante individual y el email al contractor.

Desde este punto:

- el KPI **Pagados este mes** puede sumar el payable;
- el comprobante individual queda disponible;
- el reporte de contractors puede mostrar el numero `EO-RA` si ya fue emitido;
- la conciliacion bancaria sigue en el modulo de Conciliacion.

### 11. Conciliar contra banco

Marcar pagada no reemplaza la conciliacion.

1. Ve a **Finanzas -> Conciliacion**.
2. Cruza el pago contra el extracto bancario.
3. Si la orden corresponde a una transferencia real, el banco debe explicar el neto pagado.
4. La retencion SII no se concilia contra ese pago al contractor: se remesa al SII por separado.

### 12. Ver comprobante

Cuando el payable queda **Pagado**, el comprobante individual se puede ver desde HR/Finance y desde la experiencia del contractor.

El comprobante:

- confirma el pago ejecutado;
- referencia la boleta/invoice del contractor;
- muestra bruto, retencion y neto;
- no reemplaza la boleta ni la declaracion F29/F50.

## Orden de pago: resumen rapido

| Estado de la orden | Qué significa | Qué haces |
|---|---|---|
| Pendiente aprobacion | La corrida creo la orden; falta checker | Otro usuario la aprueba |
| Aprobada | Lista para calendarizar o enviar | Programar o enviar |
| Programada | Tiene fecha de ejecucion | Esperar fecha o enviar |
| Enviada | Pago instruido al banco/processor | Esperar confirmacion bancaria |
| Pagada | Banco confirmo; cascade puede marcar payable paid | Revisar comprobante y conciliar |
| Conciliada | Cruzada contra extracto | Cierre operativo |

## Qué pasa despues de Enviar a Finanzas

| Paso | Objeto que cambia | Estado esperado | Es pago? |
|---|---|---|---|
| Enviar a Finanzas | Contractor payable | `ready_for_finance` | No |
| Bridge | Payment obligation | `generated` / obligation creada | No |
| Corrida mensual | Payment order + payable | orden `pending_approval`, payable `payment_order_created` | No |
| Aprobar orden | Payment order | `approved` | No |
| Enviar al banco | Payment order | `submitted` / enviada | No confirmado |
| Marcar pagada | Payment order + obligation + payable | `paid` | Si, segun confirmacion bancaria |
| Conciliar | Expense payment / bank statement | reconciled | Confirmacion contable-operativa |

## Qué significan los estados

| Chip | Significado | Qué haces |
|---|---|---|
| Por preparar | Payable creado, todavia no enviado al puente financiero | Revisa readiness y presiona **Enviar a Finanzas** si no hay bloqueos |
| Bloqueado | Fallo un chequeo de readiness | Mira los bloqueos y resuelve / waiver / override |
| Listo para Finanzas | Payable en `ready_for_finance`; el bridge puede generar obligacion | Espera la obligacion o corre el siguiente paso si ya esta disponible |
| Obligacion creada | Ya existe obligacion financiera | Incluyelo en la corrida mensual cuando corresponda |
| En orden de pago | Ya fue incluido en una orden de pago | Abre `/finance/payment-orders`, aprueba/envia/marca pagada |
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
| Member usado como beneficiario | Identity/HR Core | Identidad existente que tiene perfil bancario activo | No crea ni activa una liquidacion Payroll |
| Comprobante | Contractor remittance | Evidencia de pago ya ejecutado | No reemplaza la boleta del contractor |

## Descargar la nómina del período (PDF / Excel)

1. Click en **"Descargar nómina"** (header).
2. Elige **mes** y **año** (mes operativo).
3. Click en **"Descargar PDF"** o **"Descargar Excel"** — el archivo se descarga.

El reporte agrupa los pagos por **Honorarios CL** (con retención SII) e **Internacional**, con el desglose **bruto − retención SII = neto**, subtotales separados (retención SII → F29 · neto pagado → banco) y los pagos bloqueados/no listos en una sección "Excluidos". El **neto** es lo pagado al contractor; la **retención SII** se remesa al SII aparte. No reemplaza el comprobante individual.

Criterio de estados del reporte:

- Incluye payables comprometidos del mes operativo: **Listo para Finanzas**, **Obligacion creada**, **En orden de pago** y **Pagado**.
- Muestra bloqueados/no listos como **Excluidos**, fuera de subtotales.
- Omite cancelados.
- El subtotal **Neto** suma lo comprometido/incluido.
- El subtotal **Neto pagado al banco** suma solo payables **Pagados**.
- El numero de comprobante `EO-RA` aparece solo cuando el payable ya esta **Pagado** y el comprobante fue emitido.

Si acabas de correr la corrida y el PDF aun muestra "No hay pagos", refresca la pantalla y vuelve a descargar. Si sigue vacio, revisa que elegiste el mes operativo correcto y que el payable no quedo en otro periodo por `due_date`.

## Qué no hacer

- **No** intentes cambiar el monto acordado desde acá: eso es de HR. Si hay que pagar de más, usa **Override** (queda registrado).
- **No** te bases en un neto "a ojo": el sistema lo calcula del payable. Si un número se ve raro, revisa el engagement, no la pantalla.
- **No** envíes a Finanzas un payable con bloqueos sin resolverlos primero (te devuelve el detalle de qué falta).
- **No** crees un off-cycle si existe un envio aprobado normal: usa **Crear desde envio**.
- **No** interpretes **Aprobado** en HR como **Pagado** o **Listo para Finanzas**.
- **No** crees un `member` solo para desbloquear un pago contractor. Si no existe identidad enrutable, resuelve primero el perfil de pago correcto o usa una excepcion auditada.
- **No** canceles un payable solo porque aun esta **Por preparar**. Si no hay bloqueos, el siguiente paso es **Enviar a Finanzas**.
- **No** ejecutes una corrida mensual sin revisar el preview de totales y moneda.
- **No** marques una orden como pagada sin confirmacion bancaria.
- **No** confundas **En orden de pago** con **Pagado**: todavia falta aprobar/enviar/confirmar.
- **No** trates la retencion SII como pago al contractor: es pasivo a remesar al SII por separado.

## Problemas comunes

- **"Sin payables"**: no hay payables en ese estado todavía. Crea uno desde un envío aprobado.
- **El botón Override / Waiver no aparece**: no tienes la capability. Pídela a un admin.
- **Enviar a Finanzas falla**: refresca el detalle y revisa los bloqueos de readiness. Si el perfil de pago ya esta activo, el panel debe recalcularlo y dejarte enviar sin waiver.
- **La corrida creo ordenes, pero aun no aparece como Pagado**: eso es normal. Debes completar el flujo de Ordenes de pago.
- **El reporte PDF dice que no hay pagos**: confirma mes/año, refresca despues de la corrida y recuerda que el subtotal "pagado al banco" solo suma estados `paid`.

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
