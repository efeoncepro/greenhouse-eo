# Operar Workforce, Payroll y Contractors end-to-end

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15
> **Modulo:** HR / Workforce / Payroll / Contractors
> **Rutas en portal:** `/hr/workforce/activation`, `/hr/payroll`, `/hr/contractors`, `/my/contractor`, `/finance/contractor-payments`, `/finance/payment-orders`
> **Documentacion relacionada:** `docs/documentation/hr/people-workforce-payroll-contractors-end-to-end.md`

## Para que sirve

Esta guia ayuda a operar el recorrido completo de personas y pagos laborales en Greenhouse:

- habilitar un colaborador en Workforce Activation;
- preparar y cerrar nomina mensual;
- revisar contractors, entregas y payables;
- derivar pagos a Finance sin duplicar obligaciones;
- manejar salidas y finiquitos sin mezclarlos con contractors ni payroll mensual.

## Antes de empezar

Necesitas acceso HR/Payroll/Finance segun la parte del flujo que vayas a operar.

Antes de tocar datos, identifica que tipo de caso tienes:

| Caso | Ruta inicial | Camino correcto |
|---|---|---|
| Colaborador interno nuevo o incompleto | `/hr/workforce/activation` | Resolver readiness y completar ficha |
| Nomina mensual | `/hr/payroll` | Crear/calcular/aprobar/cerrar periodo |
| Honorarios interno | `/hr/payroll` | Calculo como honorarios, no dependiente |
| Contractor con entregas | `/hr/contractors` o `/my/contractor` | Engagement -> submission -> payable -> Finance |
| Pago a contractor | `/finance/contractor-payments` | Readiness -> obligacion -> payment order |
| Salida laboral | `/hr/offboarding` y finiquito si aplica | Offboarding case -> final settlement |
| Employee to contractor | HR contractors desde offboarding/relacion | Transicion gobernada, no edicion manual de member |

## Habilitar un colaborador

1. Abre `/hr/workforce/activation`.
2. Busca al colaborador.
3. Revisa las lanes de readiness.
4. Corrige los blockers:
   - identidad/acceso;
   - relacion laboral;
   - employment;
   - rol/cargo;
   - compensation;
   - perfil legal;
   - payment profile;
   - onboarding;
   - integraciones operativas.
5. Cuando todas las lanes criticas esten listas, usa la accion de completar ficha/intake.
6. Si el sistema bloquea el cierre, no lo resuelvas por SQL. Corrige el dato faltante o usa override solo si tienes permiso y motivo auditable.

Resultado esperado: el colaborador queda `completed` en Workforce Intake y con onboarding case consistente.

## Preparar un periodo de nomina

1. Abre `/hr/payroll`.
2. Crea o selecciona el periodo correcto.
3. Verifica anio/mes imputable. Recuerda que el pago bancario puede ocurrir al mes siguiente, pero el periodo representa el mes devengado.
4. Revisa readiness antes de calcular.
5. Si hay blockers, corrige primero:
   - falta compensation;
   - falta UF/UTM/tax table;
   - falta KPI cuando el contrato lo requiere;
   - falta attendance cuando corresponde;
   - onboarding o intake incompleto;
   - mismatch de regimen.

No apruebes un periodo solo porque "tiene numeros". Payroll debe estar listo por datos, clasificacion y compliance.

## Calcular nomina

1. En el periodo, ejecuta calcular.
2. Revisa las entradas generadas.
3. Valida por regimen:
   - Chile dependiente: descuentos previsionales, salud, cesantia e impuesto cuando aplica.
   - Honorarios: retencion SII y neto; sin AFP/salud/cesantia/IUSC dependiente.
   - Deel/EOR/internacional: monto operativo; sin descuentos Chile.
   - Internacional interno: politica internacional; sin descuentos Chile por defecto.
4. Revisa ajustes manuales, bonus, KPI, attendance y participation window.
5. Corrige datos fuente si el calculo luce incorrecto. No maquilles el resultado con override si el problema viene de clasificacion o compensation.

## Aprobar y cerrar nomina

1. Confirma que el periodo esta calculado.
2. Revisa warnings y blockers.
3. Aprueba solo si:
   - hay entries;
   - los limites de bonus validan;
   - readiness permite aprobar;
   - las entradas por regimen son coherentes.
4. Cierra/exporta el periodo.
5. Descarga recibos, reporte mensual, Excel y compliance exports cuando corresponda.
6. Si luego aparece una correccion sobre periodo cerrado/exportado, usa reliquidacion o reapertura gobernada. No edites la DB ni crees un egreso paralelo para "arreglar" payroll.

## Reconciliar payroll con Finance

Payroll calcula y documenta la obligacion laboral. Finance controla el pago y banco.

1. Revisa el periodo payroll cerrado.
2. Revisa la obligacion o salida esperada en Finance.
3. Si el sueldo de mayo se paga en junio, no lo trates como gasto nuevo de junio si ya corresponde al periodo mayo.
4. Si existe payment order u obligacion, opera desde esa entidad.
5. Marca pagado solo cuando el pago efectivamente se ejecuto.
6. Conciliacion bancaria se hace contra cartola; pago y conciliacion no son lo mismo.

## Operar contractors desde HR

1. Abre `/hr/contractors`.
2. Revisa el engagement.
3. Confirma estado, terminos, riesgo de clasificacion y payment/tax policy.
4. Si el contractor subio evidencia o boleta/factura, revisa el support document.
5. Revisa la work submission:
   - aprobar si la entrega y soporte estan correctos;
   - observar si falta evidencia;
   - rechazar, disputar o cancelar solo segun el caso.
6. Aprobar una entrega no paga. Solo habilita el siguiente tramo financiero.

## Crear o avanzar payable de contractor

1. Desde HR o Finance, identifica la submission aprobada.
2. Crea o revisa el contractor payable.
3. Verifica:
   - gross amount;
   - withholding;
   - net amount;
   - moneda;
   - tax owner;
   - payment route/profile;
   - due date;
   - readiness.
4. Si falta payment profile, resuelvelo antes de marcar listo.
5. Cuando todo esta correcto, marca `ready_for_finance`.

Resultado esperado: el payable queda listo para crear/usar obligacion financiera. No significa que el banco ya pago.

## Pagar contractors desde Finance

1. Abre `/finance/contractor-payments`.
2. Filtra payables pendientes o listos.
3. Si corresponde corrida mensual, ejecuta la corrida para preparar ordenes elegibles.
4. Revisa la payment order creada:
   - beneficiario;
   - monto neto;
   - retencion;
   - moneda;
   - instrumento/cuenta de pago;
   - fecha programada;
   - aprobadores.
5. Aprueba la orden segun SoD.
6. Programa/envia la orden.
7. Marca pagada solo con evidencia de ejecucion.
8. Conciliacion bancaria se confirma en modulo Banco/Conciliacion.
9. Emite o revisa remittance/comprobante cuando corresponda.

## Manejar employee to contractor

No cambies manualmente `contract_type` ni `pay_regime` de un member para transformarlo en contractor.

Camino correcto:

1. Cierra o ejecuta el offboarding laboral segun corresponda.
2. Si es Chile dependiente, revisa si requiere finiquito.
3. Usa el flujo de contractor onboarding o transition-from-offboarding.
4. Crea el contractor engagement con trazabilidad a la relacion anterior.
5. Valida riesgo de clasificacion.
6. Desde ese momento, las entregas y pagos viven en Contractors/Finance, no en payroll dependiente.

## Manejar salidas y finiquitos

1. Abre el caso en `/hr/offboarding`.
2. Identifica lane:
   - `internal_payroll`;
   - `external_payroll`;
   - `non_payroll`;
   - `identity_only`.
3. Si aplica finiquito Chile, usa el modulo de Finiquitos.
4. Revisa documentos, version, aprobacion y estado.
5. No uses un payroll adjustment mensual como sustituto de finiquito.
6. No cierres acceso/SCIM como si fuera salida laboral completa.

## Que significan los estados mas importantes

| Estado | Donde aparece | Significado operativo |
|---|---|---|
| `pending_intake` | Workforce | Falta completar ficha o readiness |
| `in_review` | Workforce | Hay datos en revision |
| `completed` | Workforce | Ficha cerrada, colaborador habilitado |
| `calculated` | Payroll period | Periodo calculado, aun no aprobado/cerrado |
| `approved` | Payroll period | Puede cerrarse/exportarse |
| `exported` | Payroll period | Periodo cerrado con outputs generados |
| `active` | Contractor engagement | Engagement vigente |
| `approved` | Work submission | HR aprobo entrega; no es pago |
| `ready_for_finance` | Contractor payable | Puede pasar a obligacion/orden |
| `payment_order_created` | Contractor payable | Ya existe orden de pago asociada |
| `paid` | Payable/order | Pago marcado ejecutado; revisar conciliacion aparte |

## Que no hacer

- No editar DB para completar intake.
- No tratar honorarios como dependiente Chile.
- No meter contractors al payroll mensual para pagar mas rapido.
- No crear egresos u ordenes duplicadas si ya existe contractor payable/payment order.
- No asumir que aprobar una submission contractor paga.
- No asumir que marcar pagado concilia Banco.
- No mezclar finiquito con payroll adjustment.
- No exponer RUT, datos bancarios completos o payment profile en respuestas de Nexa.

## Problemas comunes

### "No puedo completar la ficha"

Revisa Workforce Activation. El sistema debe indicar lane bloqueada. Corrige el dato fuente: compensation, legal profile, payment profile, rol o onboarding.

### "Payroll no deja aprobar"

Revisa readiness. Los blockers tipicos son tax table/UF/UTM, KPI faltante, attendance faltante, compensation incompleta o mismatch de regimen.

### "Honorarios aparece con descuentos de dependiente"

Es una senal de clasificacion incorrecta o drift de datos. Honorarios debe calcular retencion SII, no AFP/salud/cesantia/IUSC dependiente.

### "El contractor aprobo su entrega pero no se pago"

Correcto: aprobacion HR no es pago. Revisa payable, readiness, obligacion y payment order en Finance.

### "El banco muestra pago en otro mes"

Puede ser normal. Payroll se imputa por periodo devengado; el banco puede moverse al mes siguiente. Conciliacion debe mapear el movimiento real sin duplicar el gasto.

## Referencias tecnicas

- `src/lib/workforce/activation/readiness.ts`
- `src/lib/workforce/intake/complete-intake.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/close-payroll-period.ts`
- `src/lib/contractor-engagements/store.ts`
- `src/lib/contractor-engagements/work-submissions/store.ts`
- `src/lib/contractor-engagements/payables/store.ts`
- `src/lib/contractor-engagements/payables/monthly-run.ts`
- `docs/documentation/hr/people-workforce-payroll-contractors-end-to-end.md`
