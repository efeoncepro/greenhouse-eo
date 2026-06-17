# Instrumentos de pago y Banco

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15 por Codex
> **Modulo:** Finance
> **Rutas en portal:** `/admin/payment-instruments`, `/admin/payment-instruments/[id]`, `/finance/bank`
> **Documentacion relacionada:** [Operacion Finance end-to-end](../../documentation/finance/operacion-finance-end-to-end.md), [Caja, cobros, pagos y liquidaciones](caja-cobros-pagos-y-liquidaciones.md), [Conciliacion bancaria operativa](conciliacion-bancaria-operacion.md)

## Para que sirve

Los instrumentos de pago son la forma gobernada de decir desde donde sale o hacia donde entra el dinero. Incluyen cuentas bancarias, tarjetas, fintechs, payment platforms, payroll processors, cash y cuentas internas como shareholder accounts.

No todo processor es cuenta. No toda cuenta simple es instrumento listo para operar. Y ningun dato sensible debe exponerse sin permiso, motivo y audit log.

## Dos caminos existentes

### Camino gobernado: `/admin/payment-instruments`

Usa este camino para crear y mantener instrumentos reales con governance:

- categoria;
- provider catalogado;
- moneda;
- identificadores enmascarados;
- responsable;
- default routing;
- readiness;
- audit log;
- reveal temporal de datos sensibles con motivo.

Este es el camino recomendado para operacion formal.

### Camino simple/legacy: `/finance/bank` y conciliacion

Algunos drawers de Finance permiten crear una cuenta simple para no bloquear Banco o Conciliacion. Este camino crea datos basicos como nombre, banco, moneda, tipo y saldo inicial.

Usalo solo cuando el flujo operativo lo requiera y luego completa governance en `/admin/payment-instruments` si el instrumento queda vivo.

## Categorias de instrumento

| Categoria | Uso |
|---|---|
| `bank_account` | Cuenta bancaria tradicional |
| `credit_card` | Tarjeta de credito corporativa |
| `fintech` | Cuenta fintech o wallet operativa |
| `payment_platform` | Plataforma de pago o processor con identificador operativo |
| `payroll_processor` | Processor de nomina o remuneraciones |
| `shareholder_account` | Cuenta interna de accionista/CCA |
| `cash` | Caja fisica o equivalente operativo cuando este habilitado |

Las categorias visibles dependen de la configuracion y del catalogo. El backend valida reglas de provider/categoria/moneda.

## Crear instrumento gobernado

1. Abre `/admin/payment-instruments`.
2. Usa **Agregar instrumento**.
3. Selecciona categoria.
4. Informa nombre visible.
5. Selecciona provider desde catalogo cuando aplique.
6. Selecciona moneda soportada.
7. Completa identificador segun categoria:
   - cuenta bancaria: numero de cuenta;
   - tarjeta: red, emisor, ultimos 4 digitos y limite si aplica;
   - fintech: provider, account id o numero;
   - payment platform: merchant id o identificador de plataforma;
   - payroll processor: RUT empresa o identificador operativo.
8. Define responsable si corresponde.
9. Define usos por defecto (`defaultFor`) solo si el instrumento esta listo.
10. Ingresa saldo inicial y fecha si aplica.
11. Agrega notas operativas.
12. Confirma con razon si el flujo la solicita.

El backend crea el instrumento en `greenhouse_finance.accounts` y registra auditoria administrativa. Si el provider no existe en `payment_provider_catalog` o no es compatible con la categoria, el write path debe bloquear.

## Leer readiness

En la lista y detalle veras estados como:

| Estado | Significado |
|---|---|
| `Listo` / `ready` | Tiene datos minimos para operar |
| `Configurar` / `needs_configuration` | Falta provider, identificador, responsable o ruteo |
| `En riesgo` / `at_risk` | Puede afectar pagos, cobros o conciliacion |
| `Inactivo` | No usar en nuevos flujos |

No uses como default un instrumento que esta incompleto. Primero resuelve readiness.

## Administrar detalle

En `/admin/payment-instruments/[id]` puedes revisar:

- configuracion;
- ruteo;
- responsable;
- actividad;
- conciliacion;
- auditoria;
- impacto en income/expense payments, settlements, reconciliation y balances.

Al actualizar secciones, el sistema guarda audit log. No edites identificadores sensibles sin razon operativa.

## Datos sensibles

Los numeros completos de cuenta o identificadores sensibles aparecen enmascarados por defecto. Para revelar:

1. Abre el detalle del instrumento.
2. Usa la accion de reveal del campo.
3. Ingresa motivo.
4. Confirma.

El reveal es temporal y queda auditado. No copies numeros completos en tickets, docs, chats ni prompts de Nexa.

## Usar Banco

`/finance/bank` muestra saldos y coverage por instrumento para un periodo.

La API de Banco:

- lee snapshot materializado;
- calcula KPIs por moneda y CLP consolidado;
- muestra cuentas activas;
- muestra credit cards;
- muestra pagos sin instrumento;
- expone freshness;
- no rematerializa saldos inline.

Si el snapshot esta stale, no asumas que el banco esta mal. Revisa freshness y usa el proceso canonico de rematerializacion o espera el job correspondiente.

## Asignar pagos sin instrumento

1. Abre `/finance/bank`.
2. Revisa coverage.
3. Si hay movimientos sin instrumento, abre asignacion.
4. Elige instrumento.
5. Selecciona pagos/cobros.
6. Confirma.

Esto corrige el ruteo de ledger existente. No crea pagos nuevos.

## Transferencias internas

Usa transferencia interna para mover dinero entre instrumentos propios.

Greenhouse crea settlement legs y rematerializa saldos desde la fecha. No crea ingreso ni egreso.

Si hay moneda distinta, el flujo puede agregar legs de FX conversion. El FX override requiere evidencia; no lo uses para "hacer calzar" saldos.

## Processor vs source account

Ejemplo correcto:

```text
Processor: Deel
Source account: Santander Corp CLP
Resultado: el pago se ejecuta por Deel, pero el saldo baja en Santander.
```

Ejemplo incorrecto:

```text
Processor: Deel
Source account: Deel
Resultado declarado: baja saldo Deel aunque Deel no mantiene fondos propios.
```

Payment Orders, cash-out y settlement deben distinguir:

- `processor_slug`: rail o plataforma;
- `payment_method`: metodo visible;
- `source_account_id` o funding instrument: instrumento real que financia;
- settlement leg: explicacion del camino del dinero.

## Instrumentos y conciliacion

La conciliacion depende del instrumento para evitar matches cruzados. Un extracto Santander no debe matchearse contra un pago de otra cuenta salvo que exista settlement/funding que explique el recorrido.

Antes de aceptar un match, revisa:

- instrumento;
- provider;
- moneda;
- fecha;
- monto;
- settlement leg si hay intermediario;
- si el payment esta reconciliado en otro periodo.

## Instrumentos y Payment Orders

Payment Orders puede resolver rutas desde perfiles de pago, pero la salida real debe tener fuente de fondos.

Antes de aprobar o marcar pagada una orden, revisa:

- beneficiario;
- moneda;
- perfil activo;
- processor;
- source account;
- policy processor/source;
- evidencia de envio/pago.

Marcar una orden como pagada no equivale a conciliar banco.

## Que hace automatico Greenhouse

- Valida categoria contra catalogo y reglas.
- Valida provider canonico.
- Enmascara identificadores sensibles.
- Calcula readiness.
- Registra auditoria administrativa.
- Calcula impacto del instrumento en payments, settlements, reconciliations y balances.
- Muestra chips/logos desde catalogo cuando existen.
- Lee saldos materializados para Banco.

## Que decide el operador

- Si el instrumento debe existir.
- Que categoria y provider corresponden.
- Que responsable lo gobierna.
- Si puede ser default para un flujo.
- Si el saldo inicial y fecha tienen evidencia.
- Que pagos historicos se asignan al instrumento.
- Si un reveal sensible esta justificado.

## Problemas comunes

### "No aparece el provider"

No escribas texto libre en un campo gobernado. Falta provider en catalogo o la categoria no lo permite. Abre task/cambio de catalogo.

### "La cuenta esta en Banco pero no en admin"

Puede venir del camino simple/legacy. Completa governance en `/admin/payment-instruments` si va a seguir usandose.

### "El saldo no se actualizo al registrar un pago"

Revisa si el payment tiene instrumento, si se creo settlement leg y si el snapshot de Banco esta fresco.

### "Quiero borrar un instrumento"

No borres si tiene impacto historico. Inactivalo o usa el flujo admin permitido. El helper de impacto cuenta pagos, settlement, reconciliation y balances.

### "Nexa me pregunta por cuenta completa"

No debe responder con datos sensibles. Debe explicar el proceso de reveal auditado y pedir operar desde el portal con permisos.

## Que no hacer

- No usar processor como banco por comodidad.
- No dejar instrumentos default con readiness incompleta.
- No pegar numeros completos de cuenta en docs o chats.
- No crear instrumentos duplicados para resolver un match.
- No editar saldos materializados a mano.
- No mezclar cuentas personales, internas y bancarias sin categoria correcta.

## Referencias tecnicas utiles

- `src/app/api/admin/payment-instruments/route.ts`
- `src/app/api/admin/payment-instruments/[id]/route.ts`
- `src/app/api/admin/payment-instruments/[id]/reveal-sensitive/route.ts`
- `src/app/api/admin/payment-instruments/responsibles/route.ts`
- `src/app/api/finance/accounts/route.ts`
- `src/app/api/finance/bank/route.ts`
- `src/app/api/finance/bank/transfer/route.ts`
- `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView.tsx`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/views/greenhouse/finance/drawers/CreateAccountDrawer.tsx`
- `src/lib/finance/payment-instruments/store.ts`
